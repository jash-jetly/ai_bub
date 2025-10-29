import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const EMOTION_ANALYSIS_PROMPT = `You are an expert emotional intelligence analyst specializing in therapeutic assessment. 

Analyze the user's message and provide:
1. Primary emotions detected (e.g., grief, anger, confusion, hope, etc.)
2. Emotional intensity level (1-10 scale)
3. Underlying psychological themes (e.g., attachment issues, trauma responses, identity crisis, etc.)
4. Specific therapeutic areas that need attention

Format your response as a structured analysis that can be used to query therapeutic databases and research.

Be precise, clinical, and focus on actionable therapeutic insights.`;

export interface EmotionAnalysis {
  primaryEmotions: string[];
  intensityLevel: number;
  psychologicalThemes: string[];
  therapeuticAreas: string[];
  clinicalSummary: string;
}

export async function analyzeUserEmotion(message: string): Promise<EmotionAnalysis> {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: EMOTION_ANALYSIS_PROMPT,
    });

    const result = await model.generateContent(message);
    const response = await result.response;
    const analysisText = response.text();

    // Parse the analysis (simplified parsing - in production, you'd want more robust parsing)
    const lines = analysisText.split('\n').filter(line => line.trim());
    
    return {
      primaryEmotions: extractListFromText(analysisText, 'emotions'),
      intensityLevel: extractIntensityLevel(analysisText),
      psychologicalThemes: extractListFromText(analysisText, 'themes'),
      therapeuticAreas: extractListFromText(analysisText, 'therapeutic'),
      clinicalSummary: analysisText
    };
  } catch (error) {
    console.error('Emotion analysis error:', error);
    // Fallback analysis
    return {
      primaryEmotions: ['emotional distress'],
      intensityLevel: 5,
      psychologicalThemes: ['general emotional processing'],
      therapeuticAreas: ['supportive therapy'],
      clinicalSummary: 'User expressing emotional concerns requiring therapeutic support.'
    };
  }
}

function extractListFromText(text: string, keyword: string): string[] {
  const lines = text.toLowerCase().split('\n');
  const relevantLines = lines.filter(line => line.includes(keyword));
  
  if (relevantLines.length === 0) return ['general emotional processing'];
  
  // Extract items from bullet points or comma-separated lists
  const items = relevantLines.join(' ')
    .replace(/[•\-\*]/g, ',')
    .split(',')
    .map(item => item.trim())
    .filter(item => item.length > 2 && !item.includes(':'));
    
  return items.length > 0 ? items.slice(0, 3) : ['general emotional processing'];
}

function extractIntensityLevel(text: string): number {
  const intensityMatch = text.match(/(\d+)\/10|intensity.*?(\d+)|level.*?(\d+)/i);
  if (intensityMatch) {
    const level = parseInt(intensityMatch[1] || intensityMatch[2] || intensityMatch[3]);
    return Math.min(Math.max(level, 1), 10);
  }
  return 5; // Default moderate intensity
}

export function generatePerplexityQuery(analysis: EmotionAnalysis): string {
  const { primaryEmotions, psychologicalThemes, therapeuticAreas } = analysis;
  
  return `What are the most effective evidence-based therapeutic interventions for someone experiencing ${primaryEmotions.join(', ')} with underlying ${psychologicalThemes.join(' and ')}? Focus on ${therapeuticAreas.join(', ')} approaches. Include specific techniques, therapeutic frameworks, and research-backed strategies that therapists use in clinical practice.`;
}