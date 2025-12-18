import { GoogleGenAI, Modality } from "@google/genai";
import { Dialect, CharacterAction, AspectRatio, VideoAspectRatio, VoiceName } from "../types";

// Helper for Base64 conversion
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      resolve(base64String.split(',')[1]); 
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const getAiClient = () => {
  // Always create a new instance to pick up the most up-to-date process.env.API_KEY
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// Helper: Add WAV Header to raw PCM data
const addWavHeader = (pcmData: Uint8Array, sampleRate: number = 24000, numChannels: number = 1): ArrayBuffer => {
  const headerLength = 44;
  const dataLength = pcmData.length;
  const buffer = new ArrayBuffer(headerLength + dataLength);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  const uint8View = new Uint8Array(buffer);
  uint8View.set(pcmData, 44);

  return buffer;
};

const writeString = (view: DataView, offset: number, string: string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

// 1. Generate Script with Thinking Mode (Gemini 3 Pro)
export const generateDialectScript = async (
  originalText: string,
  dialect: Dialect
): Promise<string> => {
  const ai = getAiClient();
  const prompt = `
    Analyze the linguistic nuances of the ${dialect} dialect. 
    Then, rewrite the following text to sound 100% natural and authentic for a native speaker of that region.
    Maintain the original meaning but change vocabulary, grammar, and expressions as needed.
    
    Text: "${originalText}"
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      thinkingConfig: { thinkingBudget: 32768 },
    }
  });

  return response.text || originalText;
};

// 2. Generate Speech (TTS)
export const generateSpeech = async (text: string, voiceName: VoiceName): Promise<string> => {
  const ai = getAiClient();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voiceName }, 
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("No audio generated");

  const binaryString = window.atob(base64Audio);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const wavBuffer = addWavHeader(bytes, 24000, 1);
  return URL.createObjectURL(new Blob([wavBuffer], { type: 'audio/wav' }));
};

// 3. Edit Image (Gemini 2.5 Flash Image)
export const editCharacterImage = async (
  base64Image: string,
  editPrompt: string
): Promise<string> => {
  const ai = getAiClient();
  
  // Use a more descriptive and natural prompt for better model adherence
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/png', data: base64Image } },
        { text: `Por favor, genera una nueva versión de esta imagen aplicando los siguientes cambios: "${editPrompt}". Asegúrate de mantener la esencia del personaje original pero con las modificaciones solicitadas.` }
      ]
    }
  });

  if (!response.candidates || response.candidates.length === 0) {
    throw new Error("El modelo no devolvió ninguna respuesta. Puede deberse a filtros de seguridad o un problema de conexión.");
  }

  let textReason = "";
  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData?.data) {
        return part.inlineData.data;
      }
      if (part.text) {
        textReason += part.text;
      }
    }
  }

  // If we reached here, no image data was found in the parts
  throw new Error(textReason 
    ? `No se pudo editar la imagen. El modelo respondió: "${textReason}"` 
    : "No se encontró una imagen en la respuesta del modelo. Intenta con un prompt de edición diferente.");
};

// 4. Generate New Image (Gemini 3 Pro Image)
export const generateCharacterImage = async (
  prompt: string,
  aspectRatio: AspectRatio
): Promise<string> => {
  const ai = getAiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: { parts: [{ text: prompt }] },
    config: {
      imageConfig: { aspectRatio, imageSize: "1K" }
    }
  });

  if (!response.candidates || response.candidates.length === 0) {
    throw new Error("No se pudo generar la imagen.");
  }

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData?.data) {
      return part.inlineData.data;
    }
  }
  throw new Error("No se encontró la imagen en la respuesta.");
};

// 5. Generate Character Video (Veo)
export const generateCharacterVideo = async (
  base64Image: string,
  actions: CharacterAction[],
  dialect: Dialect,
  aspectRatio: VideoAspectRatio
): Promise<string> => {
  const ai = getAiClient();
  const actionsStr = actions.join(", ");
  
  // Improved prompt for multitasking behavior
  const prompt = `Un video cinemático de alta definición y fotorrealista del personaje de la imagen realizando SIMULTÁNEAMENTE las siguientes acciones: ${actionsStr}. 
  Es CRÍTICO que los movimientos se mezclen de forma natural y orgánica (por ejemplo, el personaje puede asentir o gesticular con las manos MIENTRAS habla). 
  Si 'Hablar' está seleccionado, la sincronía labial debe ser perfecta y coherente con un acento de ${dialect}. 
  Mantén consistencia visual absoluta con la ropa, rasgos faciales y fondo de la imagen original.`;

  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: prompt,
    image: {
      imageBytes: base64Image,
      mimeType: 'image/png',
    },
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: aspectRatio
    }
  });

  // Polling loop to wait for video generation to complete
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    // Always create a new client to ensure we use the current API key
    const pollAi = getAiClient();
    operation = await pollAi.operations.getVideosOperation({operation: operation});
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) throw new Error("No se pudo obtener el enlace de descarga del video.");

  // Fetch the MP4 bytes using the provided URI and the API key as required
  const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};