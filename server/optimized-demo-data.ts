import { storage } from "./storage";
import { generateRealisticConversation, getAllScenarioTypes } from "./conversation-scenarios";
import type {
  InsertBusiness,
  InsertCustomer,
  InsertConversation,
  InsertProduct,
  InsertOrder,
  InsertOrderItem,
  InsertAutomation,
  InsertMessageTemplate,
} from "@shared/schema";

// Only 3 businesses for quick loading
const BUSINESSES = [
  { 
    name: "Glam Beauty KE", 
    slug: "glambeauty",
    category: "beauty",
    products: [
      { name: "Fenty Foundation", price: 3500 },
      { name: "MAC Ruby Woo Lipstick", price: 2800 },
      { name: "Maybelline Mascara", price: 1200 },
      { name: "NYX Eyeshadow Palette", price: 2500 },
      { name: "Setting Spray", price: 1500 },
    ],
  },
  { 
    name: "Shades & Wigs Boutique", 
    slug: "shadeswigs",
    category: "hair",
    products: [
      { name: "Brazilian Lace Front Wig", price: 12000 },
      { name: "Bob Cut Wig", price: 8500 },
      { name: "Curly Hair Bundle", price: 15000 },
      { name: "Straight Hair Weave", price: 9000 },
      { name: "Colored Wig - Burgundy", price: 10500 },
    ],
  },
  { 
    name: "Chic Fashion Kenya", 
    slug: "chicfashion",
    category: "fashion",
    products: [
      { name: "Ankara Dress", price: 3500 },
      { name: "Denim Jeans", price: 2800 },
      { name: "Maxi Skirt", price: 2500 },
      { name: "Blazer", price: 4500 },
      { name: "Leather Jacket", price: 6500 },
    ],
  },
];

const KENYAN_NAMES = [
  "Akinyi Odhiambo", "Wanjiru Kamau", "Faith Mutua", "Brian Mwangi", "Grace Kimani",
  "Kevin Otieno", "Mercy Chebet", "Dennis Wafula", "Lucy Wamuyu", "Collins Kiplagat",
  "Joy Njeri", "Victor Korir", "Agnes Wambui", "Peter Rotich", "Mary Maina",
];

function randomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePhone(): string {
  const operators = ["701", "702", "703", "710", "712", "722", "723", "724", "728", "729", "740", "741", "746", "757", "768", "790", "791", "792", "797", "798", "799"];
  return `+254${randomItem(operators)}${randomInt(100000, 999999)}`;
}

export async function generateOptimizedDemoData() {
  console.log("Starting optimized demo data generation (3 businesses)...");

  try {
    const scenarioTypes = getAllScenarioTypes();
    
    for (const biz of BUSINESSES) {
      console.log(`Creating ${biz.name}...`);
      
      // Create business
      const business = await storage.createBusiness({ 
        name: biz.name, 
        slug: biz.slug 
      } as InsertBusiness);

      // Create products quickly
      const products = [];
      for (const prod of biz.products) {
        const product = await storage.createProduct({
          businessId: business.id,
          name: prod.name,
          description: `Premium ${prod.name} - Quality guaranteed!`,
          price: prod.price,
          stock: randomInt(20, 100),
          attributes: { category: biz.category, featured: Math.random() > 0.6 },
        });
        products.push(product);
      }

      // Create 8-12 customers with realistic conversations
      const numCustomers = randomInt(8, 12);
      for (let i = 0; i < numCustomers; i++) {
        const customerName = randomItem(KENYAN_NAMES);
        const phone = generatePhone();
        
        // Create customer
        const customer = await storage.createCustomer({
          businessId: business.id,
          name: customerName,
          phone: phone,
          email: Math.random() > 0.5 ? `${customerName.toLowerCase().replace(' ', '.')}@gmail.com` : null,
          tags: Math.random() > 0.7 ? ["VIP"] : null,
          metadata: null,
        });

        // Generate realistic WhatsApp conversation using AI
        const scenarioType = randomItem(scenarioTypes);
        const conversationScenario = await generateRealisticConversation(
          customerName,
          phone,
          business.name,
          products.map(p => ({ name: p.name, price: p.price })),
          scenarioType
        );

        if (conversationScenario && conversationScenario.messages.length > 0) {
          // Create conversation
          const conversation = await storage.createConversation({
            businessId: business.id,
            customerId: customer.id,
            channel: 'whatsapp',
            status: Math.random() > 0.3 ? 'closed' : 'open',
            lastMessageAt: new Date(),
          });

          // Create all messages from the scenario
          for (const msg of conversationScenario.messages) {
            await storage.createMessage({
              conversationId: conversation.id,
              businessId: business.id,
              direction: msg.direction,
              content: msg.content,
              channel: 'whatsapp',
              metadata: null,
            });
          }

          // Create order if the conversation led to a sale (60% chance)
          if (Math.random() > 0.4 && conversationScenario.messages.some(m => 
            m.content.toLowerCase().includes('order') || 
            m.content.toLowerCase().includes('confirm') ||
            m.content.toLowerCase().includes('deal')
          )) {
            const numItems = randomInt(1, 3);
            const orderProducts = [];
            let total = 0;

            for (let j = 0; j < numItems; j++) {
              const product = randomItem(products);
              const quantity = randomInt(1, 2);
              const price = product.price;
              orderProducts.push({ product, quantity, price });
              total += price * quantity;
            }

            const order = await storage.createOrder({
              businessId: business.id,
              customerId: customer.id,
              status: randomItem(['confirmed', 'shipped', 'delivered'] as const),
              total,
            });

            for (const { product, quantity, price } of orderProducts) {
              await storage.createOrderItem({
                orderId: order.id,
                productId: product.id,
                quantity,
                price,
              });
            }
          }
        }
      }

      // Create 3 active automations
      const automations = [
        { name: "Welcome Message", trigger: "new_customer", action: "send_welcome_sms" },
        { name: "Order Confirmation", trigger: "order_placed", action: "send_confirmation" },
        { name: "Follow-up Message", trigger: "order_delivered", action: "request_feedback" },
      ];

      for (const auto of automations) {
        await storage.createAutomation({
          businessId: business.id,
          name: auto.name,
          trigger: auto.trigger,
          action: auto.action,
          status: "active",
          config: { enabled: true, delay_minutes: 0 },
        });
      }

      // Create 5 approved message templates
      const templates = [
        {
          name: "Welcome New Customer",
          category: "marketing" as const,
          content: "Hi {{name}}! Welcome to {{business_name}}. We're excited to have you! Browse our latest products and enjoy 10% off your first order with code: WELCOME10",
          variables: ["name", "business_name"],
        },
        {
          name: "Order Confirmation",
          category: "utility" as const,
          content: "Hi {{name}}, your order #{{order_id}} has been confirmed! Total: KES {{amount}}. Expected delivery: {{delivery_date}}. Thank you!",
          variables: ["name", "order_id", "amount", "delivery_date"],
        },
        {
          name: "Shipping Notification",
          category: "utility" as const,
          content: "Good news {{name}}! Your order #{{order_id}} has been shipped. Track it here: {{tracking_link}}",
          variables: ["name", "order_id", "tracking_link"],
        },
        {
          name: "Flash Sale Alert",
          category: "marketing" as const,
          content: "FLASH SALE! {{name}}, hurry! {{product_name}} is {{discount}}% OFF for the next {{hours}} hours only!",
          variables: ["name", "product_name", "discount", "hours"],
        },
        {
          name: "Payment Received",
          category: "utility" as const,
          content: "Payment confirmed! Hi {{name}}, we've received your payment of KES {{amount}} for order #{{order_id}}.",
          variables: ["name", "amount", "order_id"],
        },
      ];

      for (const template of templates) {
        await storage.createTemplate({
          businessId: business.id,
          name: template.name,
          category: template.category,
          content: template.content,
          language: "en",
          variables: template.variables,
          status: "approved",
          whatsappTemplateId: `wa_${randomInt(10000, 99999)}`,
          metadata: { created_by: "system" },
        });
      }

      // Create analytics data for today (to populate dashboard)
      const today = new Date().toISOString().split('T')[0];
      const customers = await storage.getCustomers(business.id);
      const orders = await storage.getOrders(business.id);
      
      const todayOrders = orders.filter(o => {
        if (!o.createdAt) return false;
        const orderDate = new Date(o.createdAt).toISOString().split('T')[0];
        return orderDate === today;
      });
      
      const todayRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0);
      const todayCustomers = customers.filter(c => {
        if (!c.createdAt) return false;
        const customerDate = new Date(c.createdAt).toISOString().split('T')[0];
        return customerDate === today;
      }).length;

      await storage.createAnalytics({
        businessId: business.id,
        date: today,
        messagesSent: randomInt(15, 40),
        messagesReceived: randomInt(20, 50),
        ordersCount: todayOrders.length,
        revenue: todayRevenue,
        newCustomers: todayCustomers,
        metadata: { generated: true },
      });

      console.log(`✓ ${business.name} setup complete`);
    }

    console.log("✓ All demo data generated successfully!");
    console.log(`Created ${BUSINESSES.length} businesses with realistic conversations`);
    
  } catch (error) {
    console.error("Error generating optimized demo data:", error);
    throw error;
  }
}
