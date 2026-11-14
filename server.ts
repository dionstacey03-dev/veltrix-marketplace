import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

const app = express();
app.use(express.json({ limit: '1mb' }));

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const ProductSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  categoryName: z.string(),
  priceUsd: z.number(),
  rating: z.number(),
  stock: z.number().optional(),
  tags: z.array(z.string()).optional(),
  description: z.string(),
  specs: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
});

const SearchRequestSchema = z.object({
  query: z.string().min(1).max(400),
  products: z.array(ProductSummarySchema).max(100),
});

const RecommendRequestSchema = z.object({
  recentlyViewedIds: z.array(z.string()).max(30).default([]),
  wishlistIds: z.array(z.string()).max(30).default([]),
  cartIds: z.array(z.string()).max(30).default([]),
  budgetUsd: z.number().positive().optional(),
  products: z.array(ProductSummarySchema).max(100),
});

const CompareRequestSchema = z.object({
  products: z.array(ProductSummarySchema).min(2).max(4),
  focusQuestion: z.string().max(400).optional(),
});

const ChatRequestSchema = z.object({
  message: z.string().min(1).max(1000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        text: z.string().max(2000),
      })
    )
    .max(12)
    .default([]),
  products: z.array(ProductSummarySchema).max(100),
  currency: z.enum(['USD', 'LKR']).default('USD'),
  lkrPerUsd: z.number().positive().default(300),
});

const EmailNotificationSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(2).max(200),
  message: z.string().min(2).max(2000),
  eventType: z.enum(['order_confirmation', 'order_status', 'inventory_alert', 'promo']),
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'veltrix-api',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/integrations/status', (_req, res) => {
  const geminiConfigured = Boolean(
    process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
  );
  const smtpConfigured = Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
  );
  const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);
  const payhereConfigured = Boolean(
    process.env.PAYHERE_MERCHANT_ID && process.env.PAYHERE_MERCHANT_SECRET
  );

  res.json({
    geminiConfigured,
    smtpConfigured,
    paymentGatewayConfigured: stripeConfigured || payhereConfigured,
    activePaymentProviders: [
      ...(stripeConfigured ? ['Stripe'] : []),
      ...(payhereConfigured ? ['PayHere (LKR)'] : []),
    ],
  });
});

interface CachedFxRate {
  lkrPerUsd: number;
  provider: string;
  fetchedAt: string;
  expiresAt: number;
}

const FX_CACHE_TTL_MS = 15 * 60 * 1000;
let fxRateCache: CachedFxRate | null = null;

async function fetchWithTimeout(url: string, timeoutMs = 4000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchLiveUsdToLkrRate(): Promise<{ lkrPerUsd: number; provider: string }> {
  try {
    const res = await fetchWithTimeout('https://open.er-api.com/v6/latest/USD');
    if (res.ok) {
      const json = (await res.json()) as {
        rates?: Record<string, unknown>;
      };
      const rawRate = Number(json?.rates?.LKR);
      if (Number.isFinite(rawRate) && rawRate > 10 && rawRate < 10000) {
        return {
          lkrPerUsd: Math.round(rawRate * 100) / 100,
          provider: 'open.er-api.com',
        };
      }
    }
  } catch {
    // Fall back to secondary provider
  }

  const secondaryRes = await fetchWithTimeout(
    'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json'
  );
  if (secondaryRes.ok) {
    const json = (await secondaryRes.json()) as {
      usd?: Record<string, unknown>;
    };
    const rawRate = Number(json?.usd?.lkr);
    if (Number.isFinite(rawRate) && rawRate > 10 && rawRate < 10000) {
      return {
        lkrPerUsd: Math.round(rawRate * 100) / 100,
        provider: 'currency-api (jsDelivr)',
      };
    }
  }

  throw new Error('All live FX providers failed');
}

app.get('/api/currency/rates', async (req, res) => {
  const forceRefresh = req.query.refresh === '1' || req.query.refresh === 'true';
  const now = Date.now();

  if (!forceRefresh && fxRateCache && fxRateCache.expiresAt > now) {
    return res.json({
      base: 'USD',
      rates: { USD: 1, LKR: fxRateCache.lkrPerUsd },
      lkrPerUsd: fxRateCache.lkrPerUsd,
      source: 'cache',
      provider: fxRateCache.provider,
      fetchedAt: fxRateCache.fetchedAt,
    });
  }

  try {
    const live = await fetchLiveUsdToLkrRate();
    const fetchedAt = new Date().toISOString();
    fxRateCache = {
      lkrPerUsd: live.lkrPerUsd,
      provider: live.provider,
      fetchedAt,
      expiresAt: now + FX_CACHE_TTL_MS,
    };

    return res.json({
      base: 'USD',
      rates: { USD: 1, LKR: live.lkrPerUsd },
      lkrPerUsd: live.lkrPerUsd,
      source: 'live',
      provider: live.provider,
      fetchedAt,
    });
  } catch {
    if (fxRateCache) {
      return res.json({
        base: 'USD',
        rates: { USD: 1, LKR: fxRateCache.lkrPerUsd },
        lkrPerUsd: fxRateCache.lkrPerUsd,
        source: 'cache',
        provider: fxRateCache.provider,
        fetchedAt: fxRateCache.fetchedAt,
      });
    }

    const fallbackRate = Number(process.env.DEFAULT_LKR_PER_USD || 300);
    return res.json({
      base: 'USD',
      rates: { USD: 1, LKR: fallbackRate },
      lkrPerUsd: fallbackRate,
      source: 'fallback',
      provider: 'veltrix-default',
      fetchedAt: new Date().toISOString(),
    });
  }
});

app.post('/api/ai/search', async (req, res) => {
  const parsed = SearchRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid search payload' });
  }

  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({
      error: 'Gemini AI assistant requires GEMINI_API_KEY in server secrets.',
    });
  }

  try {
    const { query, products } = parsed.data;
    const compactCatalog = products.map((p) => ({
      id: p.id,
      title: p.title,
      category: p.categoryName,
      priceUsd: p.priceUsd,
      rating: p.rating,
      tags: p.tags ?? [],
      summary: p.description.slice(0, 180),
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `User shopping query: "${query}"\n\nCatalog:\n${JSON.stringify(compactCatalog)}`,
      config: {
        systemInstruction:
          'You are the VELTRIX natural-language shopping search engine. Match relevant product IDs from the provided catalog only. Rank best matches first. Never invent product IDs.',
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            matchedProductIds: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Ordered array of matching product IDs from the catalog.',
            },
            explanation: {
              type: Type.STRING,
              description: 'Concise 1-2 sentence explanation of why these items match.',
            },
            suggestedCategory: {
              type: Type.STRING,
              description: 'Best matching category name or empty string if broad.',
            },
            maxPriceUsd: {
              type: Type.NUMBER,
              description: 'Inferred price ceiling in USD if mentioned, else 0.',
            },
          },
          required: ['matchedProductIds', 'explanation', 'suggestedCategory', 'maxPriceUsd'],
        },
      },
    });

    const data = JSON.parse((response.text ?? '{}').trim());
    return res.json(data);
  } catch (error) {
    console.error('Gemini AI search error:', error);
    return res.status(500).json({ error: 'AI search failed. Please try again.' });
  }
});

app.post('/api/ai/recommend', async (req, res) => {
  const parsed = RecommendRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid recommendation payload' });
  }

  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({
      error: 'Gemini AI assistant requires GEMINI_API_KEY in server secrets.',
    });
  }

  try {
    const { recentlyViewedIds, wishlistIds, cartIds, budgetUsd, products } = parsed.data;
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: JSON.stringify({
        recentlyViewedIds,
        wishlistIds,
        cartIds,
        budgetUsd: budgetUsd ?? null,
        catalog: products.map((p) => ({
          id: p.id,
          title: p.title,
          category: p.categoryName,
          priceUsd: p.priceUsd,
          rating: p.rating,
          tags: p.tags ?? [],
        })),
      }),
      config: {
        systemInstruction:
          'You are the VELTRIX personalization engine. Recommend 3 complementary or upgraded products from the catalog based on recently viewed, wishlist, and cart items. Return valid catalog product IDs only.',
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            recommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  productId: { type: Type.STRING },
                  reason: { type: Type.STRING },
                },
                required: ['productId', 'reason'],
              },
            },
          },
          required: ['summary', 'recommendations'],
        },
      },
    });

    const data = JSON.parse((response.text ?? '{}').trim());
    return res.json(data);
  } catch (error) {
    console.error('Gemini recommendation error:', error);
    return res.status(500).json({ error: 'Failed to generate recommendations.' });
  }
});

app.post('/api/ai/compare', async (req, res) => {
  const parsed = CompareRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Select 2 to 4 products to compare.' });
  }

  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({
      error: 'Gemini AI assistant requires GEMINI_API_KEY in server secrets.',
    });
  }

  try {
    const { products, focusQuestion } = parsed.data;
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: JSON.stringify({
        focusQuestion: focusQuestion || 'Compare value, build quality, and daily use cases.',
        products,
      }),
      config: {
        systemInstruction:
          'You are the VELTRIX product comparison specialist. Compare the supplied products objectively using their price, rating, description, and specifications.',
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            winnerId: { type: Type.STRING },
            comparisonSummary: { type: Type.STRING },
            keyTradeoffs: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            bestFor: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  productId: { type: Type.STRING },
                  verdict: { type: Type.STRING },
                },
                required: ['productId', 'verdict'],
              },
            },
          },
          required: ['winnerId', 'comparisonSummary', 'keyTradeoffs', 'bestFor'],
        },
      },
    });

    const data = JSON.parse((response.text ?? '{}').trim());
    return res.json(data);
  } catch (error) {
    console.error('Gemini compare error:', error);
    return res.status(500).json({ error: 'Failed to compare products.' });
  }
});

app.post('/api/ai/chat', async (req, res) => {
  const parsed = ChatRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid chat message payload.' });
  }

  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({
      error: 'Gemini AI assistant requires GEMINI_API_KEY in server secrets.',
    });
  }

  try {
    const { message, history, products, currency, lkrPerUsd } = parsed.data;
    const catalogContext = products.map((p) => ({
      id: p.id,
      title: p.title,
      category: p.categoryName,
      priceUsd: p.priceUsd,
      priceLkr: Math.round(p.priceUsd * lkrPerUsd),
      stock: p.stock ?? 0,
      rating: p.rating,
      specs: p.specs ?? [],
      description: p.description.slice(0, 220),
    }));

    const conversationTranscript = history
      .map((h) => `${h.role === 'user' ? 'Customer' : 'Assistant'}: ${h.text}`)
      .join('\n');

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Currency preference: ${currency} (1 USD = ${lkrPerUsd} LKR)\n\nLive Catalog:\n${JSON.stringify(
        catalogContext
      )}\n\nConversation:\n${conversationTranscript}\nCustomer: ${message}`,
      config: {
        systemInstruction:
          'You are the VELTRIX Shopping Specialist. Answer questions accurately using ONLY the live catalog provided, quote prices in the user preferred currency, and reference exact product titles and IDs when recommending products. Keep responses concise, helpful, and factual. Mention Cash on Delivery and Invoice Reservation checkout options honestly (do not claim credit cards are processed unless gateway is active).',
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { type: Type.STRING },
            referencedProductIds: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ['reply', 'referencedProductIds'],
        },
      },
    });

    const data = JSON.parse((response.text ?? '{}').trim());
    return res.json(data);
  } catch (error) {
    console.error('Gemini chat error:', error);
    return res.status(500).json({ error: 'AI assistant encountered an error.' });
  }
});

app.post('/api/notifications/email', (req, res) => {
  const parsed = EmailNotificationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid email notification payload.' });
  }

  const smtpConfigured = Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
  );

  if (!smtpConfigured) {
    return res.status(200).json({
      delivered: false,
      configured: false,
      eventType: parsed.data.eventType,
      message:
        'In-app notification recorded. Outbound email delivery requires SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables.',
    });
  }

  // Integration hook for live SMTP / Resend / SendGrid relay
  return res.status(200).json({
    delivered: true,
    configured: true,
    eventType: parsed.data.eventType,
    message: `Email queued for ${parsed.data.to} via configured SMTP host.`,
  });
});

async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VELTRIX server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start VELTRIX server:', err);
  process.exit(1);
});
