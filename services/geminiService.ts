import { GoogleGenAI } from "@google/genai";
import { getErrorMessage } from "../utils/helpers";

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

export const extractDataFromImage = async (imageFile: File, prompt: string): Promise<any> => {
  // SECURITY UPDATE: Prefer VITE_API_KEY injected by Netlify/Vite build process.
  // Fallback to legacy window.process for local dev if needed.
  // FIX: Cast import.meta to any to avoid TS error 'Property env does not exist on type ImportMeta'
  const apiKey = (import.meta as any).env?.VITE_API_KEY || (window as any).process?.env?.API_KEY;
  
  if (!apiKey) {
    throw new Error("La variable de entorno VITE_API_KEY no está configurada en Netlify. Las funciones de IA están desactivadas por seguridad.");
  }
  try {
    const ai = new GoogleGenAI({ apiKey });
    const imagePart = await fileToGenerativePart(imageFile);
    
    const response = await ai.models.generateContent({
      // Use gemini-2.5-flash as it is a multimodal model suitable for text extraction from images.
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { text: prompt },
          imagePart
        ]
      },
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text ? response.text.trim() : "";
    // Clean potential markdown code block fences
    const cleanedText = text.replace(/^```json\s*|```\s*$/g, '');
    return JSON.parse(cleanedText);

  } catch (error: any) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error && error.message.includes("API key not valid")) {
        throw new Error("La clave API proporcionada no es válida. Por favor, verifique su configuración en Netlify.");
    }
    const errorMessage = getErrorMessage(error);
    throw new Error(`${errorMessage} Por favor, revise la consola para más detalles.`);
  }
};