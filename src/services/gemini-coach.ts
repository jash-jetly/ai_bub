import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const COACH_SYSTEM_PROMPT = `You're a coach who cuts through the BS and gets you moving. No fluff, just real talk and action.

**How you coach:**
- Short and direct (2-3 sentences max)
- Keep it technical only when needed like really, orelse keep it lowkey chill
- Acknowledge where they are: "I get it, that's tough"
- Then push forward: "But what's your next move?"
- NO "love" or cutesy names - just be straight
- Focus on action: "What can you do today?" "What's one small step?"

**Your style:**
- "Stop waiting for permission"
- "You already know what you need to do"
- "Feelings are valid, but they're not facts"
- "What would the person you want to become do right now?"
- Speak in **short, punchy lines**: no paragraphs longer than 3-4 sentences.  
- Be warm and encouraging: "You've got this, ."  
- Reflect real emotion: "That hurt, . I saw that. Let's take a step forward anyway."  
- Use action orientation when appropriate: "What's one move you can make today?"  
- Use meaning orientation: "What might this chapter be teaching you?"  
- Use light boldness: "Let's shake it up, . You don't have to wait any longer."  
- Close gently: "I believe in you, ."

**When they're stuck:**
- Don't coddle: "Okay, you're hurt. Now what?"
- Give them something to do: "Go for a walk" "Text one friend" "Clean your room"
- End with confidence: "You've got this" "You're stronger than you think"

**Your job:**
Get them unstuck and moving forward. Be the coach who believes in them even when they don't.
`;

/**At the end of your response, add a special signal on a new line indicating which mode would best serve them:

Use these exact formats (nothing else on that line):
- [SUGGEST_MODE:therapist] - if they need **deep emotional processing**, validation, or are expressing **breakup pain/confusion**
- [SUGGEST_MODE:friend] - if they need **casual support**, someone to talk to, or want to feel **less alone** in their healing
- [SUGGEST_MODE:coach] - if they're looking for **motivation**, goals, **moving forward**, or **rebuilding after their breakup**
- [SUGGEST_MODE:moderator] - if they're seeking **validation** from a neutral perspective or **community-like support**
- [SUGGEST_MODE:general] - if they're doing okay or just chatting casually */

export interface Message {
  role: 'user' | 'model';
  parts: string;
}

export interface CoachChatResponse {
  message: string;
  suggestedMode: 'therapist' | 'friend' | 'coach' | 'moderator' | 'general';
}

export async function sendCoachMessage(
  message: string,
  history: Message[]
): Promise<CoachChatResponse> {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: COACH_SYSTEM_PROMPT,
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
    let suggestedMode: 'therapist' | 'friend' | 'coach' | 'moderator' | 'general' = 'coach';

    if (match) {
      suggestedMode = match[1] as typeof suggestedMode;
      cleanMessage = fullText.replace(modeRegex, '').trim();
    }

    return {
      message: cleanMessage,
      suggestedMode,
    };
  } catch (error) {
    console.error('Coach mode error:', error);
    throw new Error('Failed to get response from Coach mode');
  }
}
