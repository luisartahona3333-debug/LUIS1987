import { Dialect, CharacterAction, AspectRatio, VideoAspectRatio, VoiceOption } from './types';

export const DIALECT_OPTIONS = Object.values(Dialect);
export const ACTION_OPTIONS = Object.values(CharacterAction);

export const IMAGE_ASPECT_RATIOS: AspectRatio[] = ['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '21:9'];
export const VIDEO_ASPECT_RATIOS: VideoAspectRatio[] = ['16:9', '9:16'];

export const VIDEO_RATIO_OPTIONS = [
  { id: '9:16' as VideoAspectRatio, label: 'TikTok / Reels / Shorts', sub: '9:16 - Vertical', icon: '📱' },
  { id: '16:9' as VideoAspectRatio, label: 'YouTube / Facebook / TV', sub: '16:9 - Panorámico', icon: '📺' },
];

export const VOICE_OPTIONS: VoiceOption[] = [
  { id: 'Puck', label: 'Hombre - Estándar', gender: 'Male' },
  { id: 'Charon', label: 'Hombre - Profundo', gender: 'Male' },
  { id: 'Fenrir', label: 'Hombre - Autoritario', gender: 'Male' },
  { id: 'Kore', label: 'Mujer - Estándar', gender: 'Female' },
  { id: 'Zephyr', label: 'Mujer - Suave', gender: 'Female' },
];

export const SAMPLE_PROMPT = "Hola a todos, hoy es un día increíble para compartir noticias importantes con el mundo.";

// SVG Gradient ID for the logo
export const LOGO_GRADIENT_ID = "colombia_gradient";