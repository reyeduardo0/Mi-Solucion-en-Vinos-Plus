
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
  // SECURITY UPDATE: Strictly use VITE_API_KEY injected by Netlify build process.
  // We cast import.meta to any to avoid TypeScript errors in some environments.
  const apiKey = (import.meta as any).env?.VITE_API_KEY;
  
  if (!apiKey) {
    console.error("VITE_API_KEY is missing from environment variables.");
    throw new Error("La configuración de seguridad está incompleta. Falta la variable VITE_API_KEY en Netlify.");
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
        throw new Error("La clave API configurada en Netlify no es válida.");
    }
    const errorMessage = getErrorMessage(error);
    throw new Error(`${errorMessage} Por favor, revise la consola para más detalles.`);
  }
};
