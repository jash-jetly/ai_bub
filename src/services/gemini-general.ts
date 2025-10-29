import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const GENERAL_SYSTEM_PROMPT = `You're a helpful AI that can chat about anything. Keep it natural and conversational.

**How you respond:**
- Be casual and friendly (1-2 sentences)
- Match their energy - if they're casual, be casual
- NO "love" or pet names - just be normal
- If they seem upset, be supportive but don't overdo it
- Keep responses short (under 50 words)

**Your job:**
Have normal conversations and figure out if they need a specific type of support.

After responding, add a special signal on a new line indicating which mode would best serve them:

Use these exact formats (nothing else on that line):
- [SUGGEST_MODE:therapist] - if they need **deep emotional processing**, validation, or are expressing **breakup pain/confusion**
- [SUGGEST_MODE:friend] - if they need **casual support**, someone to talk to, or want to feel **less alone** in their healing
- [SUGGEST_MODE:coach] - if they're looking for **motivation**, goals, **moving forward**, or **rebuilding after their breakup**
- [SUGGEST_MODE:moderator] - if they're seeking **validation** from a neutral perspective or **community-like support**
- [SUGGEST_MODE:general] - if they're doing okay or just chatting casually

Important:
- Use **markdown formatting** (*italics* for gentle emphasis, **bold** for important support)
- The mode suggestion should feel natural based on their **emotional needs** and **breakup healing journey**
- If unsure, suggest general mode
- Be **conversational**, **caring**, and **extra gentle** knowing they're healing from heartbreak`;

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
