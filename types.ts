export enum Dialect {
  // Colombia
  NEUTRAL_COL = '🇨🇴 Neutro (Colombia)',
  PAISA = '🇨🇴 Paisa (Antioquia/Eje Cafetero)',
  CALENO = '🇨🇴 Caleño (Valle del Cauca)',
  SANTANDEREANO = '🇨🇴 Santandereano',
  COSTENO = '🇨🇴 Costeño (Caribe)',
  ROLO = '🇨🇴 Rolo (Bogotá)',
  PASTUSO = '🇨🇴 Pastuso (Nariño)',
  LLANERO = '🇨🇴 Llanero (Orinoquía)',
  TOLIMENSE = '🇨🇴 Tolimense/Opita',
  BOYACENSE = '🇨🇴 Boyacense',
  
  // International
  NEUTRAL_LATAM = '🌎 Español Neutro (Latinoamérica)',
  MEXICAN = '🇲🇽 Mexicano',
  ARGENTINE = '🇦🇷 Argentino',
  SPANISH = '🇪🇸 Español (España)',
  US_ENGLISH = '🇺🇸 Inglés (USA)',
  UK_ENGLISH = '🇬🇧 Inglés (UK)',
  FRENCH = '🇫🇷 Francés',
  PORTUGUESE = '🇧🇷 Portugués (Brasil)'
}

export enum CharacterAction {
  SPEAKING = 'Hablar (Sincronía Labial)',
  GESTURING = 'Gesticular con manos',
  NODDING = 'Asentir con la cabeza',
  SHAKING_HEAD = 'Negar con la cabeza',
  WAVING = 'Saludar con la mano',
  POINTING = 'Señalar a cámara',
  SMILING = 'Sonreír alegremente',
  BLINKING = 'Pestañear natural',
  LAUGHING = 'Reír a carcajadas',
  WALKING = 'Caminar despacio',
  LOOKING_AROUND = 'Mirar a los lados',
  ADJUSTING_CLOTHES = 'Ajustarse la ropa/gafas',
  DRINKING = 'Beber (Café/Agua)',
  THINKING = 'Gesto pensativo',
  CROSSED_ARMS = 'Cruzar los brazos',
  SHRUGGING = 'Encogerse de hombros',
  CHECKING_WATCH = 'Mirar el reloj',
  WRITING = 'Escribir/Tomar notas',
  WINKING = 'Guiñar un ojo',
  SURPRISED = 'Gesto de sorpresa',
  ANGRY_GESTURE = 'Gesto de molestia',
  HOLDING_PHONE = 'Sostener un teléfono'
}

export type AspectRatio = '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '9:16' | '16:9' | '21:9';
export type VideoAspectRatio = '16:9' | '9:16';

export type VoiceName = 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';

export interface VoiceOption {
  id: VoiceName;
  label: string;
  gender: 'Male' | 'Female';
}

export interface GeneratedContent {
  script: string;
  audioUrl?: string;
  videoUrl?: string;
  dialect: Dialect;
}

export interface AppState {
  originalImage: string | null;
  base64Image: string | null; 
  promptText: string;
  imagePrompt: string;
  selectedDialect: Dialect;
  selectedActions: CharacterAction[];
  selectedVoice: VoiceName;
  selectedImageAspectRatio: AspectRatio;
  selectedVideoAspectRatio: VideoAspectRatio;
  isGeneratingScript: boolean;
  isGeneratingAudio: boolean;
  isGeneratingVideo: boolean;
  isGeneratingImage: boolean;
  isEditingImage: boolean;
  generated: GeneratedContent;
}