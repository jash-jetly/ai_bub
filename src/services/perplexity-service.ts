import { GoogleGenerativeAI } from '@google/generative-ai';
import { EmotionAnalysis } from './emotion-analyzer';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export interface PerplexityResponse {
  technicalInsights: string;
  therapeuticRecommendations: string[];
  evidenceBasedApproaches: string[];
  clinicalFrameworks: string[];
}

const THERAPEUTIC_RESEARCH_PROMPT = `You are a clinical psychology expert with extensive knowledge of evidence-based therapeutic interventions, research, and clinical frameworks. 

Based on the therapeutic query provided, give detailed, research-backed recommendations including:

1. **Therapeutic Recommendations**: Specific evidence-based interventions and techniques
2. **Clinical Approaches**: Proven therapeutic frameworks and methodologies  
3. **Research Insights**: Current understanding from psychological research
4. **Practical Applications**: How these can be applied in therapeutic settings

Focus on scientifically validated approaches from cognitive-behavioral therapy, dialectical behavior therapy, acceptance and commitment therapy, mindfulness-based interventions, attachment theory, trauma-informed care, and grief processing models.

Provide specific, actionable therapeutic insights that would be used by licensed mental health professionals.`;

export async function getTherapeuticInsights(query: string): Promise<PerplexityResponse> {
  try {
    // Use Gemini as a therapeutic research expert instead of Perplexity to avoid CORS issues
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: THERAPEUTIC_RESEARCH_PROMPT,
    });

    const result = await model.generateContent(`
      Therapeutic Query: ${query}
      
      Please provide evidence-based therapeutic insights and recommendations for this situation. Include specific interventions, frameworks, and clinical approaches that are scientifically validated.
    `);

    const response = await result.response;
    const content = response.text();

    return parseTherapeuticResponse(content);
  } catch (error) {
    console.error('Therapeutic insights error:', error);
    
    // Enhanced fallback response based on common therapeutic approaches
    return generateFallbackInsights(query);
  }
}

function generateFallbackInsights(query: string): PerplexityResponse {
  const lowerQuery = query.toLowerCase();
  
  let recommendations: string[] = [];
  let approaches: string[] = [];
  let frameworks: string[] = [];
  let insights = '';

  // Analyze query for specific therapeutic needs
  if (lowerQuery.includes('grief') || lowerQuery.includes('loss') || lowerQuery.includes('bereavement')) {
    recommendations = [
      'Grief-focused cognitive behavioral therapy',
      'Continuing bonds interventions',
      'Meaning-making therapeutic techniques'
    ];
    approaches = [
      'Worden\'s Four Tasks of Mourning',
      'Dual Process Model of grief',
      'Complicated grief therapy protocols'
    ];
    frameworks = [
      'Attachment-based grief processing',
      'Narrative therapy for loss',
      'Mindfulness-based grief recovery'
    ];
    insights = 'Research shows that healthy grief processing involves oscillating between loss-oriented and restoration-oriented coping. Therapeutic interventions should validate the ongoing nature of grief while supporting adaptive functioning.';
  } else if (lowerQuery.includes('anxiety') || lowerQuery.includes('worry') || lowerQuery.includes('panic')) {
    recommendations = [
      'Cognitive restructuring techniques',
      'Exposure and response prevention',
      'Progressive muscle relaxation'
    ];
    approaches = [
      'Cognitive Behavioral Therapy (CBT)',
      'Acceptance and Commitment Therapy (ACT)',
      'Mindfulness-Based Stress Reduction (MBSR)'
    ];
    frameworks = [
      'Anxiety disorder treatment protocols',
      'Intolerance of uncertainty model',
      'Emotional regulation theory'
    ];
    insights = 'Evidence-based anxiety treatment focuses on breaking the cycle of avoidance and safety behaviors while building distress tolerance and cognitive flexibility.';
  } else if (lowerQuery.includes('depression') || lowerQuery.includes('sadness') || lowerQuery.includes('hopeless')) {
    recommendations = [
      'Behavioral activation techniques',
      'Cognitive restructuring for negative thought patterns',
      'Interpersonal therapy interventions'
    ];
    approaches = [
      'Cognitive Behavioral Therapy (CBT)',
      'Interpersonal Therapy (IPT)',
      'Dialectical Behavior Therapy (DBT) skills'
    ];
    frameworks = [
      'Beck\'s cognitive triad model',
      'Behavioral activation framework',
      'Interpersonal and social rhythm therapy'
    ];
    insights = 'Depression treatment research emphasizes the importance of addressing both cognitive patterns and behavioral activation to restore mood and functioning.';
  } else {
    // General emotional processing
    recommendations = [
      'Emotion regulation strategies',
      'Mindfulness-based interventions',
      'Cognitive restructuring techniques'
    ];
    approaches = [
      'Dialectical Behavior Therapy (DBT) skills',
      'Acceptance and Commitment Therapy (ACT)',
      'Mindfulness-Based Cognitive Therapy (MBCT)'
    ];
    frameworks = [
      'Emotional processing theory',
      'Attachment-based therapeutic models',
      'Resilience and post-traumatic growth frameworks'
    ];
    insights = 'Effective emotional processing involves developing awareness, acceptance, and adaptive coping strategies while building psychological flexibility and resilience.';
  }

  return {
    technicalInsights: insights,
    therapeuticRecommendations: recommendations,
    evidenceBasedApproaches: approaches,
    clinicalFrameworks: frameworks
  };
}

function parseTherapeuticResponse(content: string): PerplexityResponse {
  const lines = content.split('\n').filter(line => line.trim());
  
  const recommendations: string[] = [];
  const approaches: string[] = [];
  const frameworks: string[] = [];
  
  lines.forEach(line => {
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes('therapy') || lowerLine.includes('intervention') || lowerLine.includes('technique')) {
      if (lowerLine.includes('cbt') || lowerLine.includes('cognitive') || lowerLine.includes('behavioral')) {
        recommendations.push('Cognitive Behavioral Therapy techniques');
      }
      if (lowerLine.includes('mindfulness') || lowerLine.includes('meditation')) {
        recommendations.push('Mindfulness-based interventions');
      }
      if (lowerLine.includes('dbt') || lowerLine.includes('dialectical')) {
        approaches.push('Dialectical Behavior Therapy skills');
      }
      if (lowerLine.includes('act') || lowerLine.includes('acceptance')) {
        approaches.push('Acceptance and Commitment Therapy');
      }
      if (lowerLine.includes('attachment') || lowerLine.includes('relationship')) {
        frameworks.push('Attachment-based interventions');
      }
      if (lowerLine.includes('trauma') || lowerLine.includes('ptsd')) {
        frameworks.push('Trauma-informed approaches');
      }
    }
  });

  return {
    technicalInsights: content,
    therapeuticRecommendations: recommendations.length > 0 ? [...new Set(recommendations)] : [
      'Emotion regulation techniques',
      'Cognitive restructuring methods',
      'Behavioral activation strategies'
    ],
    evidenceBasedApproaches: approaches.length > 0 ? [...new Set(approaches)] : [
      'Mindfulness-based stress reduction',
      'Cognitive processing therapy',
      'Interpersonal therapy techniques'
    ],
    clinicalFrameworks: frameworks.length > 0 ? [...new Set(frameworks)] : [
      'Grief and loss processing models',
      'Resilience theory applications',
      'Emotional intelligence frameworks'
    ]
  };
}