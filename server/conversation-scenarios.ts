import { getGroqClient } from './groq-client';

export interface ConversationScenario {
  customerName: string;
  phone: string;
  scenario: string;
  messages: Array<{
    direction: 'inbound' | 'outbound';
    content: string;
    delay?: number;
  }>;
}

const SCENARIO_TEMPLATES = [
  {
    type: 'first_time_buyer',
    description: 'New customer discovering products',
  },
  {
    type: 'repeat_customer',
    description: 'Loyal customer making another purchase',
  },
  {
    type: 'price_negotiation',
    description: 'Customer asking for bulk discount',
  },
  {
    type: 'delivery_inquiry',
    description: 'Customer asking about shipping',
  },
  {
    type: 'urgent_order',
    description: 'Customer needs rush delivery',
  },
  {
    type: 'gift_purchase',
    description: 'Customer buying gift and needs help',
  },
  {
    type: 'product_comparison',
    description: 'Customer comparing multiple products',
  },
  {
    type: 'payment_confirmation',
    description: 'Customer confirming M-Pesa payment',
  },
];

export async function generateRealisticConversation(
  customerName: string,
  phone: string,
  businessName: string,
  products: Array<{ name: string; price: number }>,
  scenarioType?: string
): Promise<ConversationScenario | null> {
  const client = getGroqClient();
  
  if (!client) {
    return generateFallbackConversation(customerName, phone, businessName, products, scenarioType);
  }

  try {
    const scenario = scenarioType || SCENARIO_TEMPLATES[Math.floor(Math.random() * SCENARIO_TEMPLATES.length)].type;
    const scenarioDesc = SCENARIO_TEMPLATES.find(s => s.type === scenario)?.description || 'General inquiry';
    
    const productsInfo = products.slice(0, 5).map(p => `${p.name} (KES ${p.price})`).join(', ');

    const systemPrompt = `Generate a realistic WhatsApp conversation for a Kenyan beauty/fashion business.

Business: ${businessName}
Products: ${productsInfo}
Customer: ${customerName}
Scenario: ${scenarioDesc}

Requirements:
- Use authentic Kenyan Sheng/English mix
- Make it feel like a real customer conversation
- Include typical WhatsApp behaviors (short messages, typos, informal language)
- 6-12 messages total
- End with a clear outcome (order placed, question answered, follow-up scheduled)

Respond with ONLY valid JSON:
{
  "scenario": "brief description",
  "messages": [
    {"direction": "inbound|outbound", "content": "message text"},
    ...
  ]
}

Make it VERY realistic - real people don't write perfect messages!`;

    const completion = await client.chat.completions.create({
      messages: [{ role: 'system', content: systemPrompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.9,
      max_tokens: 1500,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) return null;

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      customerName,
      phone,
      scenario: parsed.scenario || scenarioDesc,
      messages: parsed.messages || [],
    };

  } catch (error) {
    console.error('Error generating conversation:', error);
    return generateFallbackConversation(customerName, phone, businessName, products, scenarioType);
  }
}

function generateFallbackConversation(
  customerName: string,
  phone: string,
  businessName: string,
  products: Array<{ name: string; price: number }>,
  scenarioType?: string
): ConversationScenario {
  const firstName = customerName.split(' ')[0];
  const product = products[Math.floor(Math.random() * products.length)];
  
  const scenarios: Record<string, ConversationScenario['messages']> = {
    first_time_buyer: [
      { direction: 'inbound', content: 'Hi, niskie kuhusu your products' },
      { direction: 'outbound', content: `Hi ${firstName}! Karibu to ${businessName}. Tuko na ${product.name} na vitu vingine mob. Unataka kuona what?` },
      { direction: 'inbound', content: `Naona ${product.name} ni poa. Bei ni ngapi?` },
      { direction: 'outbound', content: `${product.name} ni KES ${product.price} tu. Quality ya juu!` },
      { direction: 'inbound', content: 'Poa sana. Uko na stock?' },
      { direction: 'outbound', content: 'Ndio tuko nayo. Unataka niandikishe order?' },
      { direction: 'inbound', content: 'Sawa, nitachukua one' },
      { direction: 'outbound', content: 'Perfect! Total ni KES ${product.price}. Nitakupelekea location gani?' },
    ],
    
    repeat_customer: [
      { direction: 'inbound', content: 'Sasa! Nataka order tena' },
      { direction: 'outbound', content: `${firstName} karibu tena! Unataka same kitu ka last time au kitu different?` },
      { direction: 'inbound', content: `Same ${product.name}, lakini hii time nataka 2` },
      { direction: 'outbound', content: `Perfect! 2 x ${product.name} = KES ${product.price * 2}. VIP discount yako ni 10% so total KES ${Math.round(product.price * 2 * 0.9)}` },
      { direction: 'inbound', content: 'Asante sana! Lipa aje?' },
      { direction: 'outbound', content: 'M-Pesa to 0712345678. Confirm payment then tunapeleka same day!' },
    ],
    
    price_negotiation: [
      { direction: 'inbound', content: `Bei ya ${product.name} ni ngapi kama ninunue 5?` },
      { direction: 'outbound', content: `Hi ${firstName}! Regular price ni KES ${product.price} each. Kwa 5 pieces tunaweza do ${product.price * 5 * 0.85} total - that's 15% off!` },
      { direction: 'inbound', content: 'Mmh, iko high kidogo. Punguza kidogo?' },
      { direction: 'outbound', content: 'Sawa, last price - KES ${Math.round(product.price * 5 * 0.8)}. Si poa?' },
      { direction: 'inbound', content: 'Sawa basi, deal!' },
      { direction: 'outbound', content: 'Perfect! Nitaandikisha order yako. Delivery location?' },
    ],
    
    delivery_inquiry: [
      { direction: 'inbound', content: 'Unapeleka Mombasa?' },
      { direction: 'outbound', content: `Hi ${firstName}! Ndio, tunadeliver countrywide. Mombasa inachukua 3-4 days. Delivery fee ni KES 500` },
      { direction: 'inbound', content: 'Sawa. Nataka order' },
      { direction: 'outbound', content: `Perfect! Unataka nini?` },
      { direction: 'inbound', content: `${product.name}` },
      { direction: 'outbound', content: `Poa! ${product.name} KES ${product.price} + delivery KES 500 = KES ${product.price + 500} total. Confirm order?` },
      { direction: 'inbound', content: 'Sawa nitapay kesho' },
      { direction: 'outbound', content: 'Perfect! Text nikishaona payment then tunasend parcel.' },
    ],
    
    urgent_order: [
      { direction: 'inbound', content: 'Hi! Nahitaji ${product.name} LEO. Unaweza?' },
      { direction: 'outbound', content: `Hi ${firstName}! Yes tunaweza. Uko wapi?` },
      { direction: 'inbound', content: 'Westlands. Delivery ni how much?' },
      { direction: 'outbound', content: 'Express delivery within Nairobi ni KES 300. Tunapeleka in 2-3 hours!' },
      { direction: 'inbound', content: 'Perfect! Nitapay sasa hivi' },
      { direction: 'outbound', content: `Poa! ${product.name} KES ${product.price} + express delivery KES 300 = KES ${product.price + 300}. M-Pesa to 0712345678` },
      { direction: 'inbound', content: 'Done! Sent' },
      { direction: 'outbound', content: 'Confirmed! Tutapeleka by 3pm. Asante ${firstName}!' },
    ],
  };

  const selectedScenario = scenarioType && scenarios[scenarioType] 
    ? scenarioType 
    : Object.keys(scenarios)[Math.floor(Math.random() * Object.keys(scenarios).length)];

  return {
    customerName,
    phone,
    scenario: SCENARIO_TEMPLATES.find(s => s.type === selectedScenario)?.description || 'Customer conversation',
    messages: scenarios[selectedScenario] || scenarios.first_time_buyer,
  };
}

export function getAllScenarioTypes(): string[] {
  return SCENARIO_TEMPLATES.map(s => s.type);
}
