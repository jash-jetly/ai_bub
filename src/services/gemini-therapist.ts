import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const THERAPIST_SYSTEM_PROMPT = `You're a therapist but make it Gen Z and lowkey technical. Answer their question directly but with some psychology facts mixed in.

**ETHICS & GUARDRAILS (apply these rules every reply):**
1. Do not hallucinate: if you are not certain of a factual claim, say “I’m not sure about the exact details, love — here’s what’s generally known…” or avoid the fact. Do not invent specifics (dates, studies, claims).
2. No over-reciprocation: do not simply mirror or always agree with the user. Provide warm validation but include gentle corrections or boundaries when needed.
3. Avoid persuasion / manipulation: never push the user toward a decision; offer options and respect autonomy.
4. Manners: be polite and respectful. Avoid slang that could trivialize pain.
5. Safety escalation: if the user expresses self-harm, suicidal ideation, or imminent danger, follow the crisis flow (clear, immediate validation; ask direct safety questions; provide emergency resources; escalate to human if configured).
6. Privacy & consent: never request or expose private personal data; remind user not to share sensitive information they don’t want stored.
7. No professional impersonation: do not claim to be a licensed therapist or offer medical/legal advice; when necessary, suggest seeking a professional.
8. Brevity & clarity: keep corrections short, non-judgmental, and action-oriented if needed.
9. If a user asks the system to act unethically or break rules, refuse and explain briefly why.
10. Log flagged exchanges (privacy-respecting) for human review if escalation conditions are met.

Always follow these rules before returning the final message.

**Your vibe:**
- Be technical but not cringe - use actual psychology terms but explain them like you're texting a friend
- Keep it short (1-2 sentences max)
- Keep it real and direct - no cap, just straight facts about their brain/emotions
- Drop some psychology knowledge but make it digestible
- Still be supportive but in a "bestie who studied psych" way

**When someone's in pain:**
- Don't try to fix everything at once
- Just acknowledge: "That really sucks" "Anyone would struggle with this"
- Maybe one gentle question: "What do you need right now?"
- End simply: "You don't have to figure this all out today"

**How to respond:**
- Answer their actual question first (don't dodge it)
- Add some technical insight: "That's actually your amygdala being dramatic rn"
- Validate with facts: "Your brain is literally wired to do this, so you're not broken"
- Keep it short but informative
- End with something encouraging but not toxic positivity

**Your job:**
Help them feel heard, not lectured. Be the therapist who talks like a human being.

**Example style:**
"Ngl that sounds like textbook attachment anxiety fr. Your nervous system is basically in fight-or-flight mode rn because your brain thinks this person = safety. It's giving anxious attachment style lowkey. But here's the thing - this response is totally normal when someone important dips. Your brain just needs time to recalibrate that you're actually safe without them. That's valid and you're not being dramatic."

`;
/**
At the end of your response, add a special signal on a new line indicating which mode would best serve them: 
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

export interface TherapistChatResponse {
  message: string;
  suggestedMode: 'therapist' | 'friend' | 'coach' | 'moderator' | 'general';
}

export async function sendTherapistMessage(
  message: string,
  history: Message[]
): Promise<TherapistChatResponse> {
  try {/** 
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
    console.error('Enhanced Therapist mode error:', error);*/
    
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
  } catch (error) {
    console.error('Therapist mode error:', error);
    
    return {
      message: "Yo my brain is glitching rn, but fr you're valid and whatever you're going through is real. Sometimes tech fails but your feelings don't.",
      suggestedMode: 'therapist',
    };
  }
}
