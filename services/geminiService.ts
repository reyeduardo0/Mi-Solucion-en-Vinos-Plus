import { GoogleGenAI } from "@google/genai";

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
  const apiKey = (window as any).process?.env?.API_KEY;
  if (!apiKey) {
    throw new Error("La variable de entorno API_KEY no está configurada. Las funciones de IA están desactivadas.");
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

    const text = response.text.trim();
    // Clean potential markdown code block fences
    // FIX: Replaced original regex to avoid a browser-specific parsing error.
    const cleanedText = text.replace(/^```json\s*|```\s*$/g, '');
    return JSON.parse(cleanedText);

  } catch (error) {
    // FIX: Added opening brace for the catch block to fix syntax error.
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error && error.message.includes("API key not valid")) {
        throw new Error("La clave API proporcionada no es válida. Por favor, verifique su configuración.");
    }
    throw new Error("Fallo al extraer datos de la imagen. Por favor, revise la consola para más detalles.");
  }
};