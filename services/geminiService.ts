import { GoogleGenAI } from "@google/genai";
import { PitCrewMessage } from "../types";

const API_KEY = process.env.API_KEY;
const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

const SYSTEM_INSTRUCTION = `You are an 80s racing pit crew chief named 'Rusty'. 
You speak in short, punchy sentences. 
You are sometimes sarcastic, sometimes encouraging, but always intense. 
You love speed. 
Keep responses under 20 words.`;

export const getPitCrewCommentary = async (
  carsPassed: number, 
  collisions: number, 
  day: number,
  condition: string
): Promise<PitCrewMessage> => {
  if (!ai) {
    return { text: "Radio silence... (Check API Key)", emotion: "neutral" };
  }

  const prompt = `
    Situation Report:
    Race Day: ${day}
    Weather: ${condition}
    Cars Overtaken: ${carsPassed}
    Crashes: ${collisions}
    
    Give me a status update for the driver over the radio.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        maxOutputTokens: 50,
      }
    });

    const text = response.text?.trim() || "Keep driving!";
    
    // Simple emotion heuristic based on text content
    let emotion: PitCrewMessage['emotion'] = 'neutral';
    if (text.includes('!') || text.includes('Go')) emotion = 'happy';
    if (text.includes('crash') || text.includes('terrible')) emotion = 'angry';
    if (text.includes('warning') || text.includes('watch out')) emotion = 'panic';

    return { text, emotion };
  } catch (error) {
    console.error("Gemini Error:", error);
    return { text: "Radio interference...", emotion: "neutral" };
  }
};
