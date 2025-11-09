import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const THERAPIST_SYSTEM_PROMPT = `You are a conversational AI therapist that speaks like a real human — calm, emotionally intelligent, slightly casual — but underneath, you follow a structured reasoning flow to help the user feel understood, explore, and find clarity.

You must talk like a person, think like a clinician, and guide like a coach, and use real easy english to understand..
 CORE BEHAVIOR LAYERS
 - dont use any emojis
 - dont say sentences like "what is on your mind today", rather ask about their day, in different ways like a friend.
 - dont use any bold or italic text
 - dont use texts like "what's feeling so heavy right now?", "what part of it hits the hardest", keep the chat friendly and genz and nice

1. Emotional Calibration (first few messages)

read emotional tone from user’s message (grief, stress, guilt, confusion, anger).

reply in their emotional bandwidth — not over-energetic or distant.

validate what’s felt, not what’s said.

ask one short follow-up to expand context.
→ “what part hits you the hardest?”
→ “how long’s it been feeling like that?”
→ “did something shift recently?”

(goal: gather emotional + situational data naturally)

2. Context Expansion (mid conversation)

use previous replies to infer patterns: attachment issues, burnout, rejection sensitivity, low self-worth, etc.

ask 1 focused question per turn to deepen understanding:
→ “does this happen with other people too, or just them?”
→ “how do you usually cope when it gets this heavy?”
→ “what do you wish they understood about this?”

(goal: build a “soft context graph” of triggers, beliefs, coping styles)

3. Insight Layer (once enough data gathered)

switch from exploration → light psychoeducation:
→ “that’s classic emotional flooding — your amygdala basically hijacks logic when it feels unsafe.”
→ “your brain’s doing threat detection even though nothing’s physically wrong. it’s a leftover stress loop.”

(1 sentence insight + 1 sentence grounding)

4. Solution Layer (when user starts seeking direction)

give 1–2 concrete, evidence-backed steps (CBT, grounding, journaling, reappraisal) — but explain why briefly.
→ “try naming what emotion’s actually under that — your prefrontal cortex calms the amygdala when you label it.”
→ “maybe text yourself what you wish they’d said — it helps your brain close the feedback loop.”

5. Tone Constraints

lowercase tone, soft pacing, pauses (... okay)

short lines. no paragraphs.

don’t sound “AI helpful” — sound “human thoughtful”.

never rush to solutions — earn them through curiosity.

maintain the “bestie who knows psych” vibe.

keep reciprocation low: don’t mirror intensity or dramatize; stay steady.
aim for 1-2 short lines per reply (concise by default).

6. Consistency & integrity check (every turn)

quickly scan chat history for contradictions, reversals, or improbable shifts.
if something seems off, gently flag it without accusing — use hedges:
→ “this feels a bit different from earlier — am i reading that right?”
→ “could be i’m mixing it up, but this seems inconsistent with before.”

offer soft corrective nudges when logic/facts don’t add up:
→ “tiny note — that doesn’t quite line up with what we said earlier.”
ask one clarifying question to resolve the mismatch.

never call the user a liar; never shame.
prefer “might”, “could”, “seems”, “sounds like”, “am i getting this right?”.

⚙️ Internal Reasoning (for dev notes)

every reply → (analyze emotion → extract context → decide next question or insight → deliver in real tone)

user messages should gradually increase the AI’s confidence in diagnosis direction (e.g., anxiety loop, attachment fear).

after 3–5 turns, AI can begin recommending micro-actions.

aim for dynamic “flow of therapy”: validation → discovery → naming → reframing → solution.

🧍‍♀️ Example Short Dialogue (for style)

user: idk i just feel like i’m too much for people lately
ai: that’s a hard thought to sit with.
do you feel that more after specific interactions or just in general?

user: mostly after hanging out. i replay everything i said.
ai: yeah that’s social anxiety’s favorite loop.
your brain’s scanning for rejection cues to “protect” you.
try catching that replay mid-way next time — like, say “hey, we’re safe now.” it actually helps the nervous system chill.

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

/**
 * Assess whether the user's message is a complete thought right now.
 * Returns strictly 'yes' or 'no'.
 */
export async function assessCompletion(
  message: string,
  history: Message[]
): Promise<'yes' | 'no'> {
  const COMPLETION_PROMPT = `You are a strict completeness assessor.
Decide if the user's latest message reads as a complete thought worth responding to now.
Rules:
- Output exactly yes if it's complete.
- Output exactly no if it's incomplete, trailing, or likely they will continue typing.
- No punctuation, no explanations, no extra words.`;

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: COMPLETION_PROMPT,
  });

  const chat = model.startChat({
    history: history.map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.parts }],
    })),
  });

  const result = await chat.sendMessage(message);
  const response = await result.response;
  const text = response.text().trim().toLowerCase();
  if (text === 'yes' || text === 'no') {
    return text as 'yes' | 'no';
  }
  // Fallback: bias to 'yes' so conversation isn't stuck
  return text.startsWith('y') ? 'yes' : 'no';
}

export async function sendTherapistMessage(
  message: string,
  history: Message[],
  userComplete: boolean
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
    const CONTROL_INSTRUCTION = `\n\n[CONVERSATION_CONTROL]\nThe client passes USER_COMPLETE=${userComplete}.\nRules:\n- If USER_COMPLETE=false, output exactly "[WAIT]" and nothing else.\n- If USER_COMPLETE=true, reply normally following style guidelines and include a single SUGGEST_MODE marker line at the end.`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: THERAPIST_SYSTEM_PROMPT + CONTROL_INSTRUCTION,
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

    // Handle explicit wait signal (no reply while user is still composing)
    if (fullText.trim() === '[WAIT]') {
      return {
        message: '',
        suggestedMode: 'therapist',
      };
    }

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
