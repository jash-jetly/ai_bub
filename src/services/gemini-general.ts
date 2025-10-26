import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const GENERAL_SYSTEM_PROMPT = ``;

export interface Message {
  role: 'user' | 'model';
  parts: string;
}

export interface GeneralChatResponse {
  message: string;
  suggestedMode: 'therapist' | 'friend' | 'coach' | 'moderator' | 'general';
}

export async function sendGeneralMessage(
  message: string,
  history: Message[]
): Promise<GeneralChatResponse> {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: GENERAL_SYSTEM_PROMPT,
    });

    const chat = model.startChat({
      history: history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.parts }],
      })),
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const fullText = response.text();

    const modeRegex = /\[SUGGEST_MODE:(therapist|friend|coach|moderator|general)\]/;
    const match = fullText.match(modeRegex);

    let cleanMessage = fullText;
    let suggestedMode: 'therapist' | 'friend' | 'coach' | 'moderator' | 'general' = 'general';

    if (match) {
      suggestedMode = match[1] as typeof suggestedMode;
      cleanMessage = fullText.replace(modeRegex, '').trim();
    }

    return {
      message: cleanMessage,
      suggestedMode,
    };
  } catch (error) {
    console.error('General chat mode error:', error);
    throw new Error('Failed to get response from General Chat mode');
  }
}
