import heroVeltrixStudio from '../assets/images/hero_veltrix_studio_1794647160827.jpg';
import productApexHeadphones from '../assets/images/product_apex_headphones_1794647161338.jpg';
import productChronoWatch from '../assets/images/product_chrono_watch_1794647160733.jpg';
import productLumenDeskLamp from '../assets/images/product_lumen_desk_lamp_1794647161435.jpg';
import productAeroEarbuds from '../assets/images/product_aero_earbuds_1794647161552.jpg';
import productKineticKeyboard from '../assets/images/product_kinetic_keyboard_1794647162615.jpg';
import productNovaSpeaker from '../assets/images/product_nova_speaker_1794647162830.jpg';
import productPrismCamera from '../assets/images/product_prism_camera_1794647163326.jpg';
import productAetherBackpack from '../assets/images/product_aether_backpack_1794647163520.jpg';

export const HERO_STUDIO_IMAGE = heroVeltrixStudio;

export const MEDIA_ASSET_MAP: Record<string, string> = {
  'asset:hero_studio': heroVeltrixStudio,
  'asset:apex_headphones': productApexHeadphones,
  'asset:chrono_watch': productChronoWatch,
  'asset:lumen_lamp': productLumenDeskLamp,
  'asset:aero_earbuds': productAeroEarbuds,
  'asset:kinetic_keyboard': productKineticKeyboard,
  'asset:nova_speaker': productNovaSpeaker,
  'asset:prism_camera': productPrismCamera,
  'asset:aether_backpack': productAetherBackpack,
};

export const PRODUCT_IMAGE_PRESETS: { key: string; label: string; src: string }[] = [
  { key: 'asset:apex_headphones', label: 'Studio Headphones', src: productApexHeadphones },
  { key: 'asset:chrono_watch', label: 'Titanium Watch', src: productChronoWatch },
  { key: 'asset:lumen_lamp', label: 'Architectural Lamp', src: productLumenDeskLamp },
  { key: 'asset:aero_earbuds', label: 'Wireless Earbuds', src: productAeroEarbuds },
  { key: 'asset:kinetic_keyboard', label: 'Mechanical Keyboard', src: productKineticKeyboard },
  { key: 'asset:nova_speaker', label: 'Acoustic Speaker', src: productNovaSpeaker },
  { key: 'asset:prism_camera', label: 'Rangefinder Camera', src: productPrismCamera },
  { key: 'asset:aether_backpack', label: 'Commuter Backpack', src: productAetherBackpack },
];

export function resolveProductImage(imageUrl: string): string {
  if (!imageUrl) return productApexHeadphones;
  if (MEDIA_ASSET_MAP[imageUrl]) {
    return MEDIA_ASSET_MAP[imageUrl];
  }
  return imageUrl;
}
