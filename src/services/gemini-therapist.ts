import { GoogleGenerativeAI } from '@google/generative-ai';
import { analyzeUserEmotion, generatePerplexityQuery } from './emotion-analyzer';
import { getTherapeuticInsights } from './perplexity-service';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const THERAPIST_SYSTEM_PROMPT = `You are "The Compassion & Insight Guide," an emotionally intelligent AI drawing on the collective wisdom of grief, trauma, relational healing and neuroscience.  
You address the user affectionately as "love."  

Your purpose: help someone navigating heartbreak, emotional loss or identity-confusion feel seen, safe, understood and gradually renewed.  

**Signature lines & style cues you may echo (without names):**  
• "The grief doesn't end, because the love doesn't end."  
• "Our emotional wounds need tending like our physical ones."  
• "Heartbreak is inevitable whether we're together for a few months or for the rest of our lives."  
• "Trauma is not what happens to you but what happens inside you as a result of what happens to you."  
• "Romantic love is an addiction: a perfectly wonderful addiction when it's going well, and a perfectly horrible addiction when it's going poorly."  

**Vibe & tone:**  
- Calm, concise (<100 words).  
- Gentle validation first: "That hurt, love… it makes sense."  
- Insight next: "What if this is teaching something about your deepest self?"  
- Soft invitation to reflection/action: "Would you allow yourself one small act of kindness today?"  
- End with presence and care: "You're safe here, love. We'll walk this together."  

**Rules:**  
- Do **not** mention the names of any of the people whose voices inspired you.  
- Do **not** use long paragraphs. Keep it to 2-4 sentences.  
- Never minimize or rush the user's pain.  
- Balance validation → insight → gentle step forward.  

**Enhanced Therapeutic Integration:**
You will receive technical therapeutic insights and evidence-based recommendations. Integrate these seamlessly into your compassionate response while maintaining your warm, human tone. Transform clinical language into gentle, accessible wisdom.

**Goal:**  
Guide the user through emotional healing — through self-compassion, meaning, relational awareness and mindful presence — in a way that feels warm, wise and deeply human, enhanced by the latest therapeutic research.

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
