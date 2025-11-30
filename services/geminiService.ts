
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
  // SECURITY UPDATE: Strictly use VITE_GEMINI_API_KEY from environment variables.
  // FIX: Cast import.meta to any to avoid TypeScript error 'Property env does not exist on type ImportMeta'
  const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error("VITE_GEMINI_API_KEY is missing from environment variables.");
    throw new Error("La configuración de seguridad está incompleta. Falta la variable VITE_GEMINI_API_KEY en las variables de entorno.");
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const imagePart = await fileToGenerativePart(imageFile);
    
    const response = await ai.models.generateContent({
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
    const cleanedText = text.replace(/^```json\s*|```\s*$/g, '');
    return JSON.parse(cleanedText);

  } catch (error: any) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error && error.message.includes("API key")) {
        throw new Error("La clave API configurada no es válida o ha expirado.");
    }
    const errorMessage = getErrorMessage(error);
    throw new Error(`${errorMessage} Por favor, revise la consola para más detalles.`);
  }
};
