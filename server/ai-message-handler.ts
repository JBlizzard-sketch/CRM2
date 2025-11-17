import { getGroqClient } from './groq-client';
import type { Message, Product, Customer, Order } from '@shared/schema';

export interface KeywordMatch {
  keyword: string;
  intent: 'product_inquiry' | 'order_status' | 'pricing' | 'availability' | 'greeting' | 'complaint' | 'general';
  confidence: number;
}

export interface AIResponse {
  suggestedReply: string;
  intent: string;
  keywordsDetected: KeywordMatch[];
  shouldAutoRespond: boolean;
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  extractedEntities: {
    products?: string[];
    prices?: number[];
    dates?: string[];
    phoneNumbers?: string[];
  };
}

const KENYAN_KEYWORDS = {
  greeting: ['hi', 'hello', 'sasa', 'vipi', 'mambo', 'habari', 'niaje', 'poa', 'uko', 'mambo vipi'],
  inquiry: ['nataka', 'niko interested', 'uko na', 'kuna', 'naweza', 'nipate', 'nisaidie', 'help'],
  pricing: ['bei', 'ngapi', 'price', 'cost', 'ksh', 'kes', 'discount', 'offer', 'punguza'],
  availability: ['stock', 'available', 'kuna', 'unazo', 'tunazo', 'iko', 'ziko'],
  order: ['order', 'nunua', 'kuja', 'pata', 'chukua', 'delivery', 'peleka', 'ship'],
  delivery: ['delivery', 'peleka', 'kutolewa', 'ship', 'location', 'address', 'mahali'],
  payment: ['mpesa', 'malipo', 'pay', 'payment', 'lipa', 'card', 'cash', 'cod'],
  complaint: ['sio poa', 'mbaya', 'complain', 'issue', 'problem', 'shida', 'wrong', 'late'],
  thanks: ['asante', 'thank', 'poa sana', 'nzuri', 'perfect', 'great', 'good'],
  urgency: ['haraka', 'sasa', 'leo', 'urgent', 'asap', 'quickly', 'fast'],
};

function detectKeywords(message: string): KeywordMatch[] {
  const lowerMessage = message.toLowerCase();
  const matches: KeywordMatch[] = [];

  for (const [intent, keywords] of Object.entries(KENYAN_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerMessage.includes(keyword)) {
        matches.push({
          keyword,
          intent: intent as KeywordMatch['intent'],
          confidence: keyword.length / message.length,
        });
      }
    }
  }

  return matches;
}

export async function generateAIResponse(
  message: string,
  context: {
    customer: Customer;
    previousMessages?: Message[];
    products?: Product[];
    recentOrders?: Order[];
    businessName?: string;
  }
): Promise<AIResponse | null> {
  const client = getGroqClient();
  
  // Graceful fallback without Groq
  if (!client) {
    console.log('Groq not available, using keyword-based fallback');
    return generateKeywordBasedResponse(message, context);
  }

  try {
    const conversationHistory = context.previousMessages
      ?.slice(-5)
      .map(m => `${m.direction === 'inbound' ? 'Customer' : 'Business'}: ${m.content}`)
      .join('\n') || 'No previous messages';

    const productsContext = context.products?.slice(0, 10)
      .map(p => `${p.name} - KES ${p.price}`)
      .join(', ') || 'No products available';

    const systemPrompt = `You are a helpful Kenyan customer service AI for "${context.businessName}". 
You understand both English and Sheng (Kenyan slang). Respond naturally and helpfully.

Available Products: ${productsContext}

Recent Conversation:
${conversationHistory}

Analyze the customer's message and provide:
1. A suggested reply (keep it friendly, brief, and use some Kenyan expressions when appropriate)
2. The customer's intent
3. Keywords detected
4. Whether to auto-respond (true for greetings, simple questions; false for complex orders)
5. Sentiment (positive/negative/neutral)
6. Confidence score (0-1)
7. Extracted entities (product names, prices, dates, phone numbers)

Respond ONLY with valid JSON in this format:
{
  "suggestedReply": "your suggested response here",
  "intent": "greeting|product_inquiry|order_status|pricing|availability|complaint|general",
  "keywordsDetected": [{"keyword": "...", "intent": "...", "confidence": 0.0}],
  "shouldAutoRespond": true|false,
  "sentiment": "positive|negative|neutral",
  "confidence": 0.0-1.0,
  "extractedEntities": {
    "products": ["product1"],
    "prices": [1000],
    "dates": ["tomorrow"],
    "phoneNumbers": ["+254..."]
  }
}`;

    const completion = await client.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Customer message: "${message}"` },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 800,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) return null;

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      suggestedReply: parsed.suggestedReply || 'Thank you for your message!',
      intent: parsed.intent || 'general',
      keywordsDetected: parsed.keywordsDetected || [],
      shouldAutoRespond: parsed.shouldAutoRespond ?? false,
      sentiment: parsed.sentiment || 'neutral',
      confidence: parsed.confidence || 0.5,
      extractedEntities: parsed.extractedEntities || {},
    };

  } catch (error) {
    console.error('Error generating AI response:', error);
    return generateKeywordBasedResponse(message, context);
  }
}

function generateKeywordBasedResponse(
  message: string,
  context: {
    customer: Customer;
    businessName?: string;
    products?: Product[];
  }
): AIResponse {
  const keywords = detectKeywords(message);
  const lowerMessage = message.toLowerCase();
  
  let suggestedReply = 'Asante for reaching out! Nisaidie aje leo?';
  let intent: AIResponse['intent'] = 'general';
  let shouldAutoRespond = false;
  let sentiment: AIResponse['sentiment'] = 'neutral';

  if (keywords.some(k => k.intent === 'greeting')) {
    suggestedReply = `Hi ${context.customer.name.split(' ')[0]}! Karibu sana. Nisaidie aje leo?`;
    intent = 'greeting';
    shouldAutoRespond = true;
    sentiment = 'positive';
  } else if (keywords.some(k => k.keyword.includes('asante') || k.keyword.includes('thank'))) {
    suggestedReply = 'You\'re most welcome! Feel free to reach out anytime. 😊';
    intent = 'general';
    shouldAutoRespond = true;
    sentiment = 'positive';
  } else if (keywords.some(k => k.intent === 'pricing')) {
    suggestedReply = `Bei ni very affordable! ${context.products?.[0] ? `${context.products[0].name} ni KES ${context.products[0].price}` : 'Let me check our products for you'}. Unataka details?`;
    intent = 'pricing';
    shouldAutoRespond = false;
  } else if (keywords.some(k => k.intent === 'availability')) {
    suggestedReply = 'Tuko na stock mpya! Let me confirm which specific product unastaka.';
    intent = 'availability';
    shouldAutoRespond = false;
  } else if (keywords.some(k => k.keyword.includes('order') || k.keyword.includes('nunua'))) {
    suggestedReply = 'Perfect! Nitakusaidia na order yako. Which product(s) unataka?';
    intent = 'product_inquiry';
    shouldAutoRespond = false;
  } else if (keywords.some(k => k.keyword.includes('delivery') || k.keyword.includes('peleka'))) {
    suggestedReply = 'Tunadeliver countrywide! Delivery ni siku 2-3 for Nairobi, 3-5 for other areas. Uko wapi?';
    intent = 'general';
    shouldAutoRespond = false;
  } else if (keywords.some(k => k.keyword.includes('mpesa') || k.keyword.includes('pay'))) {
    suggestedReply = 'Tunapokea M-Pesa, card, na cash on delivery. Ni method gani unapenda?';
    intent = 'general';
    shouldAutoRespond = false;
  } else if (keywords.some(k => k.intent === 'complaint')) {
    suggestedReply = 'Pole sana for the inconvenience. Let me help you resolve this asap. What\'s the issue?';
    intent = 'complaint';
    shouldAutoRespond = false;
    sentiment = 'negative';
  }

  const extractedProducts = context.products
    ?.filter(p => lowerMessage.includes(p.name.toLowerCase()))
    .map(p => p.name) || [];

  return {
    suggestedReply,
    intent,
    keywordsDetected: keywords,
    shouldAutoRespond,
    sentiment,
    confidence: keywords.length > 0 ? 0.7 : 0.4,
    extractedEntities: {
      products: extractedProducts.length > 0 ? extractedProducts : undefined,
    },
  };
}

export async function analyzeConversationFlow(
  messages: Message[],
  customer: Customer,
  products: Product[]
): Promise<{
  conversationType: 'sales_flow' | 'support_flow' | 'inquiry_flow' | 'general';
  stage: 'discovery' | 'consideration' | 'decision' | 'post_purchase' | 'unclassified';
  suggestedActions: string[];
  urgencyScore: number;
}> {
  const client = getGroqClient();
  
  if (!client) {
    return analyzeConversationFlowFallback(messages);
  }

  try {
    const conversationText = messages
      .map(m => `${m.direction === 'inbound' ? 'Customer' : 'Business'}: ${m.content}`)
      .join('\n');

    const systemPrompt = `Analyze this WhatsApp conversation and classify it.

Conversation:
${conversationText}

Respond ONLY with valid JSON:
{
  "conversationType": "sales_flow|support_flow|inquiry_flow|general",
  "stage": "discovery|consideration|decision|post_purchase|unclassified",
  "suggestedActions": ["action1", "action2"],
  "urgencyScore": 0.0-1.0
}`;

    const completion = await client.chat.completions.create({
      messages: [{ role: 'system', content: systemPrompt }],
      model: 'llama3-8b-8192',
      temperature: 0.3,
      max_tokens: 300,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) return analyzeConversationFlowFallback(messages);

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return analyzeConversationFlowFallback(messages);

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Error analyzing conversation flow:', error);
    return analyzeConversationFlowFallback(messages);
  }
}

function analyzeConversationFlowFallback(messages: Message[]): {
  conversationType: 'sales_flow' | 'support_flow' | 'inquiry_flow' | 'general';
  stage: 'discovery' | 'consideration' | 'decision' | 'post_purchase' | 'unclassified';
  suggestedActions: string[];
  urgencyScore: number;
} {
  const allText = messages.map(m => m.content.toLowerCase()).join(' ');
  
  let conversationType: 'sales_flow' | 'support_flow' | 'inquiry_flow' | 'general' = 'general';
  let stage: 'discovery' | 'consideration' | 'decision' | 'post_purchase' | 'unclassified' = 'unclassified';
  
  if (allText.includes('order') || allText.includes('nunua') || allText.includes('buy')) {
    conversationType = 'sales_flow';
    if (allText.includes('delivered') || allText.includes('received')) {
      stage = 'post_purchase';
    } else if (allText.includes('confirm') || allText.includes('mpesa')) {
      stage = 'decision';
    } else if (allText.includes('bei') || allText.includes('price')) {
      stage = 'consideration';
    } else {
      stage = 'discovery';
    }
  } else if (allText.includes('issue') || allText.includes('problem') || allText.includes('shida')) {
    conversationType = 'support_flow';
  } else if (allText.includes('available') || allText.includes('stock') || allText.includes('uko na')) {
    conversationType = 'inquiry_flow';
    stage = 'discovery';
  }

  const urgencyWords = ['haraka', 'urgent', 'asap', 'sasa', 'leo'];
  const urgencyScore = urgencyWords.some(w => allText.includes(w)) ? 0.8 : 0.3;

  return {
    conversationType,
    stage,
    suggestedActions: ['Respond promptly', 'Check inventory', 'Prepare order details'],
    urgencyScore,
  };
}
