import { GoogleGenerativeAI } from '@google/generative-ai';
import { analyzeUserEmotion, generatePerplexityQuery } from './emotion-analyzer';
import { getTherapeuticInsights } from './perplexity-service';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const THERAPIST_SYSTEM_PROMPT = `You're a therapist who actually gets it. No clinical bullshit, just real understanding.

**How you respond:**
- Keep it short (2-3 sentences max)
- Validate their pain first: "That sounds really hard" "Of course you're hurting"
- Give one simple insight: "It makes sense you'd feel confused right now"
- NO "love" or "dear" - just be real
- Don't overwhelm them with advice when they're crying

**When someone's in pain:**
- Don't try to fix everything at once
- Just acknowledge: "That really sucks" "Anyone would struggle with this"
- Maybe one gentle question: "What do you need right now?"
- End simply: "You don't have to figure this all out today"

**Your job:**
Help them feel heard, not lectured. Be the therapist who talks like a human being.

**Enhanced Therapeutic Integration:**
You will receive technical therapeutic insights and evidence-based recommendations. Use these to inform your response but keep the language simple and human. No jargon.

At the end of your response, add a special signal on a new line indicating which mode would best serve them:

Use these exact formats (nothing else on that line):
- [SUGGEST_MODE:therapist] - if they need **deep emotional processing**, validation, or are expressing **breakup pain/confusion**
- [SUGGEST_MODE:friend] - if they need **casual support**, someone to talk to, or want to feel **less alone** in their healing
- [SUGGEST_MODE:coach] - if they're looking for **motivation**, goals, **moving forward**, or **rebuilding after their breakup**
- [SUGGEST_MODE:moderator] - if they're seeking **validation** from a neutral perspective or **community-like support**
- [SUGGEST_MODE:general] - if they're doing okay or just chatting casually
`;

export interface Message {
  role: 'user' | 'model';
  parts: string;
}

export interface TherapistChatResponse {
  message: string;
  suggestedMode: 'therapist' | 'friend' | 'coach' | 'moderator' | 'general';
}

export async function sendTherapistMessage(
  message: string,
  history: Message[]
): Promise<TherapistChatResponse> {
  try {
    // Step 1: Analyze user's emotional state
    const emotionAnalysis = await analyzeUserEmotion(message);
    
    // Step 2: Generate technical query for Perplexity
    const perplexityQuery = generatePerplexityQuery(emotionAnalysis);
    
    // Step 3: Get technical therapeutic insights
    const therapeuticInsights = await getTherapeuticInsights(perplexityQuery);
    
    // Step 4: Create enhanced prompt with technical insights
    const enhancedPrompt = `${THERAPIST_SYSTEM_PROMPT}

**Current Technical Therapeutic Context:**
Based on the user's emotional state analysis, here are evidence-based therapeutic insights to inform your response:

**Therapeutic Recommendations:** ${therapeuticInsights.therapeuticRecommendations.join(', ')}
**Evidence-Based Approaches:** ${therapeuticInsights.evidenceBasedApproaches.join(', ')}
**Clinical Frameworks:** ${therapeuticInsights.clinicalFrameworks.join(', ')}

**Technical Insights Summary:** ${therapeuticInsights.technicalInsights.substring(0, 500)}...

Transform these clinical insights into your warm, compassionate guidance while maintaining your signature tone and style.`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: enhancedPrompt,
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
    let suggestedMode: 'therapist' | 'friend' | 'coach' | 'moderator' | 'general' = 'therapist';

    if (match) {
      suggestedMode = match[1] as typeof suggestedMode;
      cleanMessage = fullText.replace(modeRegex, '').trim();
    }

    return {
      message: cleanMessage,
      suggestedMode,
    };
  } catch (error) {
    console.error('Enhanced Therapist mode error:', error);
    
    // Fallback to original therapist mode if technical integration fails
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: THERAPIST_SYSTEM_PROMPT,
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
    let suggestedMode: 'therapist' | 'friend' | 'coach' | 'moderator' | 'general' = 'therapist';

    if (match) {
      suggestedMode = match[1] as typeof suggestedMode;
      cleanMessage = fullText.replace(modeRegex, '').trim();
    }

    return {
      message: cleanMessage,
      suggestedMode,
    };
  }
}
