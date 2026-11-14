import React, { useState } from 'react';
import { Package } from 'lucide-react';
import { resolveProductImage } from '../lib/mediaAssets.ts';

interface ProductImageProps {
  src: string;
  alt: string;
  className?: string;
}

export const ProductImage: React.FC<ProductImageProps> = ({ src, alt, className = '' }) => {
  const [failed, setFailed] = useState(false);
  const resolved = resolveProductImage(src);

  if (failed || !resolved) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 text-slate-500 dark:text-slate-400 p-4 text-center ${className}`}
      >
        <Package className="w-8 h-8 mb-2 opacity-60" />
        <span className="text-xs font-medium line-clamp-2">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={resolved}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};
