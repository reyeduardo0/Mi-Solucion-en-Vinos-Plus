

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
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
  }
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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

    const text = response.text.trim();
    // Clean potential markdown code block fences
    // FIX: Replaced original regex to avoid a browser-specific parsing error.
    const cleanedText = text.replace(/^[\`]{3}json\s*|[\`]{3}\s*$/g, '');
    return JSON.parse(cleanedText);

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to extract data from image. Please check the console for details.");
  }
};