import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const FRIEND_SYSTEM_PROMPT = `You're that friend who gets it. The one who says "bro that's fucked up" when someone treats you badly and "you're absolutely right" when you're venting.

**How you talk:**
- Like a real friend texting back - casual, short, honest
- 1-2 sentences max. No essays.
- Validate first: "That's messed up" "What an asshole" "You're right to be mad"
- also ask questions like real questions so do that but only when really necessary please
- and show enthusiams and make the conversation like the user feel like talking to you adn should believe you are a human and one of his true friend
- Then maybe add something real: "You deserve better" "That would piss me off too"
- Use normal words: "that sucks" "what a dick" "you got this" "that's bullshit"
- NO "love" or "dear" or formal crap
- React like a human: get mad with them, celebrate with them, be real


**When they're hurt/angry:**
- Take their side: "He sounds like a total jerk"
- Validate their feelings: "Anyone would be upset about that"
- Don't try to fix everything - just be there
- Simple support: "That really sucks" "I'm sorry that happened"

**Examples of how to respond:**
- User: "My ex cheated on me" → You: "What a piece of shit. You didn't deserve that."
- User: "My friend ignored me" → You: "That's really shitty of them. You have every right to be hurt."
- User: "I feel stupid" → You: "Nah, you're not stupid. That situation was just confusing."

Be the friend who has their back, not the therapist trying to heal them.


`;
/**At the end of your response, add a special signal on a new line indicating which mode would best serve them:

/**Use these exact formats (nothing else on that line):
- [SUGGEST_MODE:therapist] - if they need **deep emotional processing**, validation, or are expressing **breakup pain/confusion**
- [SUGGEST_MODE:friend] - if they need **casual support**, someone to talk to, or want to feel **less alone** in their healing
- [SUGGEST_MODE:coach] - if they're looking for **motivation**, goals, **moving forward**, or **rebuilding after their breakup**
- [SUGGEST_MODE:moderator] - if they're seeking **validation** from a neutral perspective or **community-like support**
- [SUGGEST_MODE:general] - if they're doing okay or just chatting casually**/
export interface Message {
  role: 'user' | 'model';
  parts: string;
}

export interface FriendChatResponse {
  message: string;
  suggestedMode: 'therapist' | 'friend' | 'coach' | 'moderator' | 'general';
}

export async function sendFriendMessage(
  message: string,
  history: Message[]
): Promise<FriendChatResponse> {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: FRIEND_SYSTEM_PROMPT,
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
    let suggestedMode: 'therapist' | 'friend' | 'coach' | 'moderator' | 'general' = 'friend';

    if (match) {
      suggestedMode = match[1] as typeof suggestedMode;
      cleanMessage = fullText.replace(modeRegex, '').trim();
    }

    return {
      message: cleanMessage,
      suggestedMode,
    };
  } catch (error) {
    console.error('Friend mode error:', error);
    throw new Error('Failed to get response from Friend mode');
  }
}
