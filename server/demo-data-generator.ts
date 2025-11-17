import { storage } from "./storage";
import type {
  InsertBusiness,
  InsertCustomer,
  InsertConversation,
  InsertMessage,
  InsertProduct,
  InsertOrder,
  InsertOrderItem,
  InsertAutomation,
  InsertAutomationLog,
  InsertAnalyticsDaily,
  InsertMessageTemplate,
  InsertBroadcast,
} from "@shared/schema";

const businessNames = [
  { name: "Glam Beauty KE", slug: "glambeauty" },
  { name: "Nairobi Skincare Co", slug: "nairobiskincare" },
  { name: "Shades & Wigs Boutique", slug: "shadeswigs" },
  { name: "Chic Fashion Kenya", slug: "chicfashion" },
];

const kenyanFirstNames = ["Akinyi", "Wanjiru", "Mumbi", "Njeri", "Wambui", "Nyambura", "Muthoni", "Wairimu", "Njoki", "Wanjiku",
  "Kamau", "Mwangi", "Kariuki", "Njoroge", "Omondi", "Otieno", "Kipchoge", "Kiprotich", "Juma", "Hassan",
  "Faith", "Grace", "Mercy", "Joy", "Blessing", "Christine", "Mary", "Jane", "Lucy", "Agnes",
  "Brian", "Kevin", "Dennis", "Collins", "Victor", "David", "John", "Peter", "James", "Paul"];

const kenyanLastNames = ["Odhiambo", "Wanjala", "Njoroge", "Kamau", "Mwangi", "Otieno", "Wafula", "Maina", "Mutua", "Kiplagat",
  "Chebet", "Jeptoo", "Kimani", "Mugo", "Wamuyu", "Gitau", "Korir", "Rotich", "Wekesa", "Masai"];

const productCategories = {
  glambeauty: [
    { name: "Fenty Foundation", price: 3500 },
    { name: "MAC Ruby Woo Lipstick", price: 2800 },
    { name: "Maybelline Mascara", price: 1200 },
    { name: "NYX Eyeshadow Palette", price: 2500 },
    { name: "Setting Spray", price: 1500 },
    { name: "Makeup Brushes Set", price: 3200 },
    { name: "Concealer Duo", price: 1800 },
    { name: "Blush & Highlighter", price: 2200 },
    { name: "Lip Gloss Set", price: 1600 },
    { name: "False Lashes", price: 800 },
  ],
  nairobiskincare: [
    { name: "Vitamin C Serum", price: 2500 },
    { name: "Hyaluronic Acid Moisturizer", price: 3200 },
    { name: "Niacinamide Face Wash", price: 1800 },
    { name: "Retinol Night Cream", price: 3500 },
    { name: "Sunscreen SPF 50", price: 2200 },
    { name: "Clay Face Mask", price: 1500 },
    { name: "Glycolic Acid Toner", price: 2000 },
    { name: "Eye Cream", price: 2800 },
    { name: "Lip Balm Set", price: 900 },
    { name: "Body Scrub", price: 1700 },
  ],
  shadeswigs: [
    { name: "Brazilian Lace Front Wig", price: 12000 },
    { name: "Bob Cut Wig", price: 8500 },
    { name: "Curly Hair Bundle", price: 15000 },
    { name: "Straight Hair Weave", price: 9000 },
    { name: "Colored Wig - Burgundy", price: 10500 },
    { name: "Closure 4x4", price: 5500 },
    { name: "HD Lace Frontal", price: 7000 },
    { name: "Wig Cap & Glue Set", price: 1200 },
    { name: "Edge Control", price: 800 },
    { name: "Hair Oil Treatment", price: 1500 },
  ],
  chicfashion: [
    { name: "Ankara Dress", price: 3500 },
    { name: "Denim Jeans", price: 2800 },
    { name: "Crop Top", price: 1200 },
    { name: "Maxi Skirt", price: 2500 },
    { name: "Blazer", price: 4500 },
    { name: "Summer Dress", price: 3200 },
    { name: "Jumpsuit", price: 4000 },
    { name: "Leather Jacket", price: 6500 },
    { name: "Handbag", price: 2500 },
    { name: "Heels", price: 3500 },
  ],
};

const messageTemplates = {
  inbound: [
    "Hi, niko interested na hii product",
    "Uko na hii stock?",
    "Delivery ni how long?",
    "Unaweza nipea discount kama ninunue mingi?",
    "Nataka kuorder",
    "Hii ni quality?",
    "Unaship Mombasa?",
    "Unapokea M-Pesa?",
    "Bei yake ni ngapi?",
    "Nina maswali kuhusu yangu order",
    "Poa sana, asante!",
    "Natafuta gift kwa mtu",
    "Kuna offer this week?",
    "Unapokea nini kwa payment?",
    "Nisaidie kuchagua",
  ],
  outbound: [
    "Hello! Karibu, nisaidie aje leo?",
    "Ndio, tuko nayo stock. Unataka niandikishe order?",
    "Delivery inachukua siku 2-3 Nairobi",
    "Kwa bulk orders, tunaweza negotiate bei",
    "Sawa! Nitakusaidia na order yako",
    "Kabisa! Hii ni quality ya juu",
    "Ndio, tunadeliver countrywide",
    "Tunapokea M-Pesa, card, na cash on delivery",
    "Bei ni KES [amount] tu",
    "Ngoja nicheck hiyo",
    "You're welcome! Tuko hapa ukihitaji chochote",
    "Nina recommendations poa kwako!",
    "Tuko na sale hii week - 20% off!",
    "Tunapokea M-Pesa na cards",
    "Nitakuguide vizuri!",
  ],
};

const automationTemplates = [
  { name: "Welcome Message", trigger: "new_customer", action: "send_welcome_sms" },
  { name: "Order Confirmation", trigger: "order_placed", action: "send_confirmation" },
  { name: "Abandoned Cart", trigger: "cart_inactive_24h", action: "send_reminder" },
  { name: "Follow-up Message", trigger: "order_delivered", action: "request_feedback" },
  { name: "Upsell Campaign", trigger: "high_value_customer", action: "send_offer" },
  { name: "Re-engagement", trigger: "inactive_30_days", action: "send_discount" },
  { name: "Birthday Greeting", trigger: "customer_birthday", action: "send_birthday_message" },
  { name: "Stock Alert", trigger: "product_restocked", action: "notify_waitlist" },
  { name: "Payment Reminder", trigger: "payment_pending", action: "send_payment_link" },
  { name: "Shipping Update", trigger: "order_shipped", action: "send_tracking_info" },
  { name: "Low Stock Alert", trigger: "product_low_stock", action: "notify_admin" },
  { name: "VIP Customer Reward", trigger: "vip_status_achieved", action: "send_reward" },
  { name: "Product Review Request", trigger: "order_completed_7_days", action: "request_review" },
  { name: "Flash Sale Notification", trigger: "flash_sale_start", action: "notify_subscribers" },
  { name: "Cart Recovery", trigger: "cart_abandoned_1h", action: "send_discount_code" },
  { name: "Referral Reward", trigger: "successful_referral", action: "send_reward_points" },
  { name: "Order Cancellation", trigger: "order_cancelled", action: "send_cancellation_confirmation" },
  { name: "Newsletter Signup", trigger: "newsletter_subscribe", action: "send_welcome_email" },
  { name: "Win-back Campaign", trigger: "inactive_90_days", action: "send_special_offer" },
  { name: "Delivery Confirmation", trigger: "order_delivered", action: "send_delivery_confirmation" },
];

const messageTemplateData = [
  {
    name: "Welcome New Customer",
    category: "marketing" as const,
    content: "Hi {{name}}! Welcome to {{business_name}}. We're excited to have you! Browse our latest products and enjoy 10% off your first order with code: WELCOME10",
    variables: ["name", "business_name"],
    status: "approved" as const,
  },
  {
    name: "Order Confirmation",
    category: "utility" as const,
    content: "Hi {{name}}, your order #{{order_id}} has been confirmed! Total: KES {{amount}}. Expected delivery: {{delivery_date}}. Thank you for shopping with us!",
    variables: ["name", "order_id", "amount", "delivery_date"],
    status: "approved" as const,
  },
  {
    name: "Shipping Notification",
    category: "utility" as const,
    content: "Good news {{name}}! Your order #{{order_id}} has been shipped. Track it here: {{tracking_link}}. Estimated delivery: {{delivery_date}}",
    variables: ["name", "order_id", "tracking_link", "delivery_date"],
    status: "approved" as const,
  },
  {
    name: "Abandoned Cart Reminder",
    category: "marketing" as const,
    content: "Hi {{name}}, you left items in your cart! Complete your purchase now and get 15% off with code: CART15. Your cart: {{cart_items}}",
    variables: ["name", "cart_items"],
    status: "approved" as const,
  },
  {
    name: "Payment Received",
    category: "utility" as const,
    content: "Payment confirmed! Hi {{name}}, we've received your payment of KES {{amount}} for order #{{order_id}}. Receipt: {{receipt_link}}",
    variables: ["name", "amount", "order_id", "receipt_link"],
    status: "approved" as const,
  },
  {
    name: "Flash Sale Alert",
    category: "marketing" as const,
    content: "FLASH SALE! {{name}}, hurry! {{product_name}} is {{discount}}% OFF for the next {{hours}} hours only! Shop now: {{link}}",
    variables: ["name", "product_name", "discount", "hours", "link"],
    status: "approved" as const,
  },
  {
    name: "Birthday Wishes",
    category: "marketing" as const,
    content: "Happy Birthday {{name}}! Celebrate with us - enjoy 20% off your next purchase! Use code: BDAY20. Valid for 7 days. Have an amazing day!",
    variables: ["name"],
    status: "approved" as const,
  },
  {
    name: "Order Delivered",
    category: "utility" as const,
    content: "Delivered! Hi {{name}}, your order #{{order_id}} has been delivered. Enjoy your purchase! Please rate your experience: {{feedback_link}}",
    variables: ["name", "order_id", "feedback_link"],
    status: "approved" as const,
  },
  {
    name: "Stock Back in Store",
    category: "utility" as const,
    content: "Great news {{name}}! {{product_name}} is back in stock. Don't miss out this time - order now: {{product_link}}",
    variables: ["name", "product_name", "product_link"],
    status: "approved" as const,
  },
  {
    name: "VIP Exclusive Offer",
    category: "marketing" as const,
    content: "VIP EXCLUSIVE! {{name}}, as our valued customer, enjoy early access to our new collection + free shipping on orders over KES 5000!",
    variables: ["name"],
    status: "approved" as const,
  },
  {
    name: "Order Cancellation",
    category: "utility" as const,
    content: "Hi {{name}}, your order #{{order_id}} has been cancelled as requested. Refund of KES {{amount}} will be processed within 3-5 business days.",
    variables: ["name", "order_id", "amount"],
    status: "approved" as const,
  },
  {
    name: "Review Request",
    category: "service" as const,
    content: "Hi {{name}}, how was your recent purchase of {{product_name}}? Share your feedback and help other customers! Review here: {{review_link}}",
    variables: ["name", "product_name", "review_link"],
    status: "approved" as const,
  },
  {
    name: "Low Stock Alert",
    category: "marketing" as const,
    content: "Almost gone! {{name}}, only {{stock_count}} left of {{product_name}}. Order now before it's too late: {{product_link}}",
    variables: ["name", "stock_count", "product_name", "product_link"],
    status: "approved" as const,
  },
  {
    name: "Referral Reward",
    category: "marketing" as const,
    content: "Congrats {{name}}! Your friend {{friend_name}} just made their first purchase. You've earned {{points}} reward points! Refer more friends: {{referral_link}}",
    variables: ["name", "friend_name", "points", "referral_link"],
    status: "approved" as const,
  },
  {
    name: "Win-back Special",
    category: "marketing" as const,
    content: "We miss you {{name}}! It's been a while. Come back and enjoy 25% off your next order with code: COMEBACK25. Valid for 48 hours!",
    variables: ["name"],
    status: "approved" as const,
  },
  {
    name: "Weekly Newsletter",
    category: "marketing" as const,
    content: "Hi {{name}}! This week's highlights: {{highlights}}. Plus, exclusive deals just for you! View all: {{newsletter_link}}",
    variables: ["name", "highlights", "newsletter_link"],
    status: "pending_approval" as const,
  },
  {
    name: "Account Verification",
    category: "authentication" as const,
    content: "Welcome {{name}}! Verify your account with this code: {{verification_code}}. This code expires in 10 minutes.",
    variables: ["name", "verification_code"],
    status: "approved" as const,
  },
  {
    name: "Password Reset",
    category: "authentication" as const,
    content: "Hi {{name}}, reset your password using this link: {{reset_link}}. This link expires in 1 hour. Didn't request this? Ignore this message.",
    variables: ["name", "reset_link"],
    status: "approved" as const,
  },
  {
    name: "New Product Launch",
    category: "marketing" as const,
    content: "NEW ARRIVAL! {{name}}, check out our latest {{product_category}}: {{product_name}}. Be among the first to own it! Shop: {{product_link}}",
    variables: ["name", "product_category", "product_name", "product_link"],
    status: "draft" as const,
  },
  {
    name: "Customer Support Response",
    category: "service" as const,
    content: "Hi {{name}}, thanks for contacting us. {{response_message}}. Need more help? Reply to this message or call {{support_phone}}.",
    variables: ["name", "response_message", "support_phone"],
    status: "approved" as const,
  },
  {
    name: "Seasonal Greetings",
    category: "marketing" as const,
    content: "{{greeting}} {{name}}! Celebrate the season with {{discount}}% off storewide! Use code: {{promo_code}}. Offer ends {{end_date}}.",
    variables: ["greeting", "name", "discount", "promo_code", "end_date"],
    status: "draft" as const,
  },
];

function randomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePhone(): string {
  const operators = ["701", "702", "703", "704", "705", "706", "707", "708", "710", "711", "712", "713", "714", "715", "717", "718", "719", "720", "721", "722", "723", "724", "725", "726", "727", "728", "729", "740", "741", "742", "743", "745", "746", "748", "757", "758", "759", "768", "769", "790", "791", "792", "793", "794", "795", "796", "797", "798", "799"];
  return `+254${randomItem(operators)}${randomInt(100000, 999999)}`;
}

function generateEmail(firstName: string, lastName: string): string {
  const domains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com"];
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${randomItem(domains)}`;
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

export async function generateDemoData() {
  console.log("Starting demo data generation...");

  try {
    const businesses = [];
    for (const biz of businessNames) {
      try {
        const business = await storage.createBusiness(biz as InsertBusiness);
        businesses.push(business);
        console.log(`Created business: ${business.name}`);
      } catch (error) {
        console.error(`Error creating business ${biz.name}:`, error);
      }
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 60);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    for (const business of businesses) {
      console.log(`Generating data for ${business.name}...`);

      const customers = [];
      const numCustomers = randomInt(30, 50);
      for (let i = 0; i < numCustomers; i++) {
        const firstName = randomItem(kenyanFirstNames);
        const lastName = randomItem(kenyanLastNames);
        const tags = [];
        if (Math.random() > 0.7) tags.push("VIP");
        if (Math.random() > 0.8) tags.push("Newsletter");
        if (Math.random() > 0.6) tags.push(randomItem(["New", "Returning", "Loyal"]));

        try {
          const customer = await storage.createCustomer({
            businessId: business.id,
            name: `${firstName} ${lastName}`,
            phone: generatePhone(),
            email: Math.random() > 0.3 ? generateEmail(firstName, lastName) : null,
            tags: tags.length > 0 ? tags : null,
            metadata: null,
          });
          customers.push(customer);
        } catch (error) {
          console.error(`Error creating customer:`, error);
        }
      }

      const products = [];
      const productData = productCategories[business.slug as keyof typeof productCategories] || productCategories.glambeauty;
      for (const prod of productData) {
        try {
          const product = await storage.createProduct({
            businessId: business.id,
            name: prod.name,
            description: `Premium ${prod.name} - Quality guaranteed!`,
            price: prod.price,
            stock: randomInt(5, 150),
            attributes: {
              category: business.slug,
              featured: Math.random() > 0.7,
            },
          });
          products.push(product);
        } catch (error) {
          console.error(`Error creating product:`, error);
        }
      }

      const numConversations = randomInt(80, 120);
      for (let i = 0; i < numConversations; i++) {
        const customer = randomItem(customers);
        const channel = randomItem(["whatsapp", "instagram", "tiktok", "sms"] as const);
        const status = Math.random() > 0.3 ? "closed" : "open";

        try {
          const conversation = await storage.createConversation({
            businessId: business.id,
            customerId: customer.id,
            channel,
            status,
            lastMessageAt: randomDate(startDate, endDate),
          });

          const numMessages = randomInt(5, 20);
          for (let j = 0; j < numMessages; j++) {
            const direction = j % 2 === 0 ? "inbound" : "outbound";
            const content = randomItem(messageTemplates[direction]);

            await storage.createMessage({
              conversationId: conversation.id,
              businessId: business.id,
              direction,
              content,
              channel,
              metadata: null,
            });
          }
        } catch (error) {
          console.error(`Error creating conversation:`, error);
        }
      }

      const numOrders = randomInt(40, 80);
      for (let i = 0; i < numOrders; i++) {
        const customer = randomItem(customers);
        const status = randomItem(["pending", "confirmed", "shipped", "delivered", "cancelled"] as const);
        const numItems = randomInt(1, 5);
        const orderProducts = [];
        let total = 0;

        for (let j = 0; j < numItems; j++) {
          const product = randomItem(products);
          const quantity = randomInt(1, 3);
          const price = product.price;
          orderProducts.push({ product, quantity, price });
          total += price * quantity;
        }

        try {
          const order = await storage.createOrder({
            businessId: business.id,
            customerId: customer.id,
            status,
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
        } catch (error) {
          console.error(`Error creating order:`, error);
        }
      }

      for (const template of automationTemplates) {
        try {
          const automation = await storage.createAutomation({
            businessId: business.id,
            name: template.name,
            trigger: template.trigger,
            action: template.action,
            status: Math.random() > 0.2 ? "active" : "inactive",
            config: {
              enabled: true,
              delay_minutes: randomInt(0, 60),
            },
          });

          const numLogs = randomInt(15, 50);
          for (let i = 0; i < numLogs; i++) {
            await storage.createAutomationLog({
              automationId: automation.id,
              businessId: business.id,
              status: Math.random() > 0.1 ? "success" : "failed",
              metadata: {
                execution_time_ms: randomInt(50, 500),
                timestamp: randomDate(startDate, endDate),
              },
            });
          }
        } catch (error) {
          console.error(`Error creating automation:`, error);
        }
      }

      const createdTemplates = [];
      for (const templateData of messageTemplateData) {
        try {
          const template = await storage.createTemplate({
            businessId: business.id,
            name: templateData.name,
            category: templateData.category,
            content: templateData.content,
            language: "en",
            variables: templateData.variables,
            status: templateData.status,
            whatsappTemplateId: Math.random() > 0.5 ? `wa_${randomInt(10000, 99999)}` : null,
            metadata: {
              created_by: "system",
              template_type: "demo",
            },
          });
          createdTemplates.push(template);
        } catch (error) {
          console.error(`Error creating template:`, error);
        }
      }

      const approvedTemplates = createdTemplates.filter(t => t.status === 'approved');
      
      if (approvedTemplates.length > 0) {
        const broadcastData = [
          {
            name: "Weekend Flash Sale",
            status: "completed" as const,
            totalRecipients: randomInt(150, 300),
            scheduledFor: randomDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), new Date()),
          },
          {
            name: "New Product Launch Announcement",
            status: "completed" as const,
            totalRecipients: randomInt(200, 400),
            scheduledFor: randomDate(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
          },
          {
            name: "Customer Appreciation Week",
            status: "scheduled" as const,
            totalRecipients: randomInt(180, 350),
            scheduledFor: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          },
          {
            name: "Monthly Newsletter - November",
            status: "sending" as const,
            totalRecipients: randomInt(250, 500),
            scheduledFor: new Date(),
          },
          {
            name: "Back in Stock Notification",
            status: "completed" as const,
            totalRecipients: randomInt(80, 150),
            scheduledFor: randomDate(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), new Date()),
          },
          {
            name: "Holiday Special Offers",
            status: "draft" as const,
            totalRecipients: 0,
            scheduledFor: null,
          },
          {
            name: "VIP Customer Exclusive",
            status: "completed" as const,
            totalRecipients: randomInt(50, 100),
            scheduledFor: randomDate(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), new Date()),
          },
          {
            name: "Abandoned Cart Recovery",
            status: "scheduled" as const,
            totalRecipients: randomInt(100, 200),
            scheduledFor: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
          },
          {
            name: "Birthday Greetings Campaign",
            status: "completed" as const,
            totalRecipients: randomInt(30, 60),
            scheduledFor: randomDate(new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), new Date()),
          },
          {
            name: "End of Season Clearance",
            status: "failed" as const,
            totalRecipients: randomInt(200, 350),
            scheduledFor: randomDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), new Date()),
          },
          {
            name: "Product Feedback Request",
            status: "completed" as const,
            totalRecipients: randomInt(120, 250),
            scheduledFor: randomDate(new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), new Date()),
          },
          {
            name: "Black Friday Preview",
            status: "scheduled" as const,
            totalRecipients: randomInt(300, 600),
            scheduledFor: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          },
        ];

        for (const broadcastInfo of broadcastData) {
          try {
            const template = randomItem(approvedTemplates);
            const totalRecipients = broadcastInfo.totalRecipients;
            
            let sentCount = 0;
            let deliveredCount = 0;
            let readCount = 0;
            let failedCount = 0;

            if (broadcastInfo.status === 'completed') {
              sentCount = totalRecipients;
              deliveredCount = Math.floor(totalRecipients * (0.92 + Math.random() * 0.06));
              readCount = Math.floor(deliveredCount * (0.45 + Math.random() * 0.25));
              failedCount = sentCount - deliveredCount;
            } else if (broadcastInfo.status === 'sending') {
              sentCount = Math.floor(totalRecipients * (0.3 + Math.random() * 0.4));
              deliveredCount = Math.floor(sentCount * 0.9);
              readCount = Math.floor(deliveredCount * 0.4);
              failedCount = sentCount - deliveredCount;
            } else if (broadcastInfo.status === 'failed') {
              sentCount = Math.floor(totalRecipients * (0.1 + Math.random() * 0.2));
              deliveredCount = Math.floor(sentCount * 0.5);
              readCount = Math.floor(deliveredCount * 0.2);
              failedCount = totalRecipients - deliveredCount;
            }

            await storage.createBroadcast({
              businessId: business.id,
              name: broadcastInfo.name,
              templateId: template.id,
              segmentId: null,
              status: broadcastInfo.status,
              scheduledFor: broadcastInfo.scheduledFor,
              totalRecipients,
              sentCount,
              deliveredCount,
              failedCount,
              readCount,
              metadata: {
                created_by: "system",
                campaign_type: "demo",
              },
            });
          } catch (error) {
            console.error(`Error creating broadcast:`, error);
          }
        }
      }

      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        try {
          await storage.createAnalytics({
            businessId: business.id,
            date: currentDate.toISOString().split('T')[0],
            messagesSent: randomInt(30, 150),
            messagesReceived: randomInt(50, 200),
            ordersCount: randomInt(10, 40),
            revenue: randomInt(5000, 50000) + Math.random() * 1000,
            newCustomers: randomInt(5, 25),
            metadata: null,
          });
        } catch (error) {
          console.error(`Error creating analytics:`, error);
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      console.log(`Completed data generation for ${business.name}`);
    }

    console.log("Demo data generation completed successfully!");
  } catch (error) {
    console.error("Fatal error during demo data generation:", error);
    throw error;
  }
}
