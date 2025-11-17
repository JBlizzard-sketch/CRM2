import Groq from 'groq-sdk';

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export interface EnhancedNLPResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  intent?: string;
  entities?: Array<{
    type: string;
    value: string;
    confidence: number;
  }>;
  keywords?: string[];
  summary?: string;
}

export async function enhancedMessageAnalysis(
  message: string,
  context?: {
    previousMessages?: string[];
    customerName?: string;
    businessContext?: string;
  }
): Promise<EnhancedNLPResult> {
  try {
    const systemPrompt = `You are an AI assistant that analyzes customer messages for a CRM platform. 
Your task is to analyze the message and return structured data about:
1. Sentiment (positive, negative, or neutral) with confidence score
2. Customer intent (what they're trying to accomplish)
3. Named entities (products, prices, dates, locations, etc.)
4. Key keywords
5. A brief summary

Respond ONLY with valid JSON in this exact format:
{
  "sentiment": "positive|negative|neutral",
  "confidence": 0.0-1.0,
  "intent": "brief description of what customer wants",
  "entities": [{"type": "product|price|date|location|person", "value": "extracted value", "confidence": 0.0-1.0}],
  "keywords": ["keyword1", "keyword2"],
  "summary": "one sentence summary"
}`;

    const contextInfo = context ? `
Previous conversation context:
${context.previousMessages?.slice(-3).join('\n') || 'No previous messages'}

Customer: ${context.customerName || 'Unknown'}
Business: ${context.businessContext || 'General retail'}
` : '';

    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `${contextInfo}\n\nAnalyze this message:\n"${message}"` },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content || '{}';
    
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : content;
      const result = JSON.parse(jsonStr);
      
      return {
        sentiment: result.sentiment || 'neutral',
        confidence: result.confidence || 0.5,
        intent: result.intent,
        entities: result.entities || [],
        keywords: result.keywords || [],
        summary: result.summary,
      };
    } catch (parseError) {
      console.error('Error parsing NLP response:', parseError);
      return {
        sentiment: 'neutral',
        confidence: 0.5,
      };
    }
  } catch (error) {
    console.error('Error in enhanced NLP analysis:', error);
    return {
      sentiment: 'neutral',
      confidence: 0.5,
    };
  }
}

export async function extractIntent(message: string): Promise<string> {
  try {
    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You extract customer intent from messages. Respond with ONLY a short intent label like: "order_status", "product_inquiry", "complaint", "price_question", "general_question", etc.',
        },
        { role: 'user', content: message },
      ],
      temperature: 0.2,
      max_tokens: 20,
    });

    return response.choices[0]?.message?.content?.trim() || 'general_question';
  } catch (error) {
    console.error('Error extracting intent:', error);
    return 'general_question';
  }
}

export async function generateSmartReply(
  message: string,
  context?: {
    previousMessages?: Array<{ role: string; content: string }>;
    customerName?: string;
    businessName?: string;
    productContext?: any;
  }
): Promise<string> {
  try {
    const systemPrompt = `You are a helpful customer service assistant for ${context?.businessName || 'our business'}. 
Respond to customer inquiries professionally and helpfully. Keep responses concise and friendly.
If you don't have enough information, ask clarifying questions.`;

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    if (context?.previousMessages) {
      messages.push(...context.previousMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })));
    }

    messages.push({ role: 'user', content: message });

    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.7,
      max_tokens: 200,
    });

    return response.choices[0]?.message?.content?.trim() || 'I apologize, but I need more information to help you properly.';
  } catch (error) {
    console.error('Error generating smart reply:', error);
    return 'Thank you for your message. A team member will get back to you shortly.';
  }
}
