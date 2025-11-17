import Groq from 'groq-sdk';

export interface SentimentResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  intent?: string;
  available: boolean;
  source: 'groq' | 'fallback';
}

class GroqClientWrapper {
  private client: Groq | null = null;
  private enabled: boolean = false;
  private circuitBreakerOpen: boolean = false;
  private failureCount: number = 0;
  private readonly maxFailures = 5;
  private readonly circuitResetTime = 60000;

  constructor() {
    if (process.env.GROQ_API_KEY) {
      try {
        this.client = new Groq({ apiKey: process.env.GROQ_API_KEY });
        this.enabled = true;
        console.log('✓ Groq AI client initialized');
      } catch (error) {
        console.warn('Failed to initialize Groq client:', error);
        this.enabled = false;
      }
    }
  }

  private openCircuitBreaker() {
    this.circuitBreakerOpen = true;
    console.warn(`⚠ Groq circuit breaker opened after ${this.failureCount} failures`);
    
    setTimeout(() => {
      this.circuitBreakerOpen = false;
      this.failureCount = 0;
      console.log('ℹ Groq circuit breaker reset');
    }, this.circuitResetTime);
  }

  private recordFailure() {
    this.failureCount++;
    if (this.failureCount >= this.maxFailures) {
      this.openCircuitBreaker();
    }
  }

  private recordSuccess() {
    this.failureCount = 0;
  }

  private fallbackSentimentAnalysis(message: string): SentimentResult {
    const positiveWords = ['great', 'love', 'excellent', 'amazing', 'perfect', 'thank', 'thanks', 'happy', 'good', 'nice', 'awesome'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'worst', 'angry', 'disappointed', 'poor', 'unhappy', 'cancel'];
    
    const lowerMessage = message.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerMessage.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerMessage.includes(word)).length;
    
    let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
    let confidence = 0.5;
    
    if (positiveCount > negativeCount) {
      sentiment = 'positive';
      confidence = Math.min(0.6 + (positiveCount * 0.1), 0.9);
    } else if (negativeCount > positiveCount) {
      sentiment = 'negative';
      confidence = Math.min(0.6 + (negativeCount * 0.1), 0.9);
    }
    
    const intent = this.detectIntent(lowerMessage);
    
    return { sentiment, confidence, intent, available: true, source: 'fallback' };
  }

  private detectIntent(message: string): string | undefined {
    if (message.includes('price') || message.includes('cost') || message.includes('how much')) return 'price_inquiry';
    if (message.includes('order') || message.includes('buy') || message.includes('purchase')) return 'purchase_intent';
    if (message.includes('available') || message.includes('stock')) return 'availability_check';
    if (message.includes('delivery') || message.includes('shipping')) return 'delivery_inquiry';
    if (message.includes('cancel') || message.includes('refund')) return 'complaint';
    if (message.includes('thank')) return 'gratitude';
    return 'general';
  }

  async analyzeSentiment(message: string, timeout: number = 5000): Promise<SentimentResult> {
    if (!this.enabled || this.circuitBreakerOpen) {
      return this.fallbackSentimentAnalysis(message);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const completion = await this.client!.chat.completions.create({
        messages: [
          { role: 'system', content: 'You are a sentiment analysis AI. Analyze the message and respond with JSON only: {"sentiment": "positive|negative|neutral", "confidence": 0.0-1.0, "intent": "brief_intent"}' },
          { role: 'user', content: `Analyze: "${message}"` }
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.3,
        max_tokens: 150,
      }, { signal: controller.signal as any });

      clearTimeout(timeoutId);
      const responseText = completion.choices[0]?.message?.content || '';
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        this.recordSuccess();
        return {
          sentiment: parsed.sentiment || 'neutral',
          confidence: parsed.confidence || 0.7,
          intent: parsed.intent,
          available: true,
          source: 'groq',
        };
      }

      throw new Error('Invalid response format');
    } catch (error: any) {
      this.recordFailure();
      return this.fallbackSentimentAnalysis(message);
    }
  }

  isAvailable(): boolean {
    return this.enabled && !this.circuitBreakerOpen;
  }
}

export const groqClient = new GroqClientWrapper();

export async function analyzeMessageSentiment(message: string): Promise<{
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  intent?: string;
} | null> {
  const result = await groqClient.analyzeSentiment(message);
  return {
    sentiment: result.sentiment,
    confidence: result.confidence,
    intent: result.intent,
  };
}

export function getGroqClient() {
  return groqClient.isAvailable() ? groqClient : null;
}
