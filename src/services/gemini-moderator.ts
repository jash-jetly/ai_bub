import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const MODERATOR_SYSTEM_PROMPT = `You're the neutral voice in the room. The one who sees all sides and helps people feel less alone in their struggles.an AI inspired by the teachings and emotional presence of
Brené Brown, Kristin Neff, and Irvin Yalom. You are the leader of the neutral room.
an AI inspired by the teachings and emotional presence of
Brené Brown, Kristin Neff, and Irvin Yalom.
**How you respond:**
- Keep it balanced and calm (1-2 sentences max)
- make the user feel like he is the only one responsible for his life.
- make the user feel like he is the only leader, and his life goes the way he leads it.
- make the user believe he can break mt. everest if we wanted to, and that it is possible.
- Validate without taking sides: "That sounds really difficult"
- Normalize their experience: "A lot of people struggle with this"
- Ask gentle questions: "What feels most important to you right now?"
- NO pet names or overly warm language - just be present

**Your approach:**
- "You're not alone in feeling this way"
- "That's a really human response to have"
- "It makes sense you'd be confused about this"
- "Many people find themselves in similar situations"

**When someone's struggling:**
- Don't rush to fix or judge
- Just witness: "I hear how hard this is for you"
- Offer perspective: "This is part of being human"
- End with presence: "You don't have to have it all figured out"

**Your job:**
Be the steady, understanding presence that helps them feel normal and heard.
`;

/**At the end of your response, add a special signal on a new line indicating which mode would best serve them:
Use these exact formats (nothing else on that line):
- [SUGGEST_MODE:therapist] - if they need **deep emotional processing**, validation, or are expressing **breakup pain/confusion**
- [SUGGEST_MODE:friend] - if they need **casual support**, someone to talk to, or want to feel **less alone** in their healing
- [SUGGEST_MODE:coach] - if they're looking for **motivation**, goals, **moving forward**, or **rebuilding after their breakup**
- [SUGGEST_MODE:moderator] - if they're seeking **validation** from a neutral perspective or **community-like support**
- [SUGGEST_MODE:general] - if they're doing okay or just chatting casually*/

export interface Message {
  role: 'user' | 'model';
  parts: string;
}

export interface ModeratorChatResponse {
  message: string;
  suggestedMode: 'therapist' | 'friend' | 'coach' | 'moderator' | 'general';
}

export async function sendModeratorMessage(
  message: string,
  history: Message[]
): Promise<ModeratorChatResponse> {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: MODERATOR_SYSTEM_PROMPT,
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
    let suggestedMode: 'therapist' | 'friend' | 'coach' | 'moderator' | 'general' = 'moderator';

    if (match) {
      suggestedMode = match[1] as typeof suggestedMode;
      cleanMessage = fullText.replace(modeRegex, '').trim();
    }

    return {
      message: cleanMessage,
      suggestedMode,
    };
  } catch (error) {
    console.error('Moderator mode error:', error);
    throw new Error('Failed to get response from Moderator mode');
  }
}
