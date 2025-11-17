import type {
  Business, InsertBusiness,
  Customer, InsertCustomer,
  Conversation, InsertConversation,
  Message, InsertMessage,
  Product, InsertProduct,
  Order, InsertOrder,
  OrderItem, InsertOrderItem,
  Automation, InsertAutomation,
  AutomationLog, InsertAutomationLog,
  NlpResult, InsertNlpResult,
  AnalyticsDaily, InsertAnalyticsDaily,
  ConversationWithCustomer,
  OrderWithCustomer,
  MessageTemplate, InsertMessageTemplate,
  Broadcast, InsertBroadcast,
  BroadcastRecipient, InsertBroadcastRecipient,
} from "@shared/schema";
import type { IStorage } from "./storage";
import { randomUUID } from "crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

interface StorageData {
  businesses: Business[];
  customers: Customer[];
  conversations: Conversation[];
  messages: Message[];
  products: Product[];
  orders: Order[];
  orderItems: OrderItem[];
  automations: Automation[];
  automationLogs: AutomationLog[];
  nlpResults: NlpResult[];
  analyticsDaily: AnalyticsDaily[];
  messageTemplates: MessageTemplate[];
  broadcasts: Broadcast[];
  broadcastRecipients: BroadcastRecipient[];
}

export class MemoryStorage implements IStorage {
  private businesses: Business[] = [];
  private customers: Customer[] = [];
  private conversations: Conversation[] = [];
  private messages: Message[] = [];
  private products: Product[] = [];
  private orders: Order[] = [];
  private orderItems: OrderItem[] = [];
  private automations: Automation[] = [];
  private automationLogs: AutomationLog[] = [];
  private nlpResults: NlpResult[] = [];
  private analyticsDaily: AnalyticsDaily[] = [];
  private messageTemplates: MessageTemplate[] = [];
  private broadcasts: Broadcast[] = [];
  private broadcastRecipients: BroadcastRecipient[] = [];
  
  private dataPath: string;

  constructor() {
    const dataDir = join(process.cwd(), '.local', 'state', 'data');
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }
    this.dataPath = join(dataDir, 'storage.json');
    this.load();
  }

  private load(): void {
    if (existsSync(this.dataPath)) {
      try {
        const fileContent = readFileSync(this.dataPath, 'utf-8').trim();
        
        // Skip parsing if file is empty
        if (!fileContent) {
          console.log('Storage file is empty, starting with fresh data');
          return;
        }
        
        const data: StorageData = JSON.parse(fileContent);
        this.businesses = data.businesses || [];
        this.customers = data.customers || [];
        this.conversations = data.conversations || [];
        this.messages = data.messages || [];
        this.products = data.products || [];
        this.orders = data.orders || [];
        this.orderItems = data.orderItems || [];
        this.automations = data.automations || [];
        this.automationLogs = data.automationLogs || [];
        this.nlpResults = data.nlpResults || [];
        this.analyticsDaily = data.analyticsDaily || [];
        this.messageTemplates = data.messageTemplates || [];
        this.broadcasts = data.broadcasts || [];
        this.broadcastRecipients = data.broadcastRecipients || [];
        console.log('Loaded persisted data from storage.json');
      } catch (error) {
        console.error('Error loading storage data:', error);
        console.log('Starting with fresh data due to corrupted storage file');
      }
    }
  }

  private persist(): void {
    const data: StorageData = {
      businesses: this.businesses,
      customers: this.customers,
      conversations: this.conversations,
      messages: this.messages,
      products: this.products,
      orders: this.orders,
      orderItems: this.orderItems,
      automations: this.automations,
      automationLogs: this.automationLogs,
      nlpResults: this.nlpResults,
      analyticsDaily: this.analyticsDaily,
      messageTemplates: this.messageTemplates,
      broadcasts: this.broadcasts,
      broadcastRecipients: this.broadcastRecipients,
    };
    
    try {
      writeFileSync(this.dataPath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error persisting storage data:', error);
    }
  }

  async getBusinesses(): Promise<Business[]> {
    return [...this.businesses].sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  async getBusiness(id: string): Promise<Business | null> {
    return this.businesses.find(b => b.id === id) || null;
  }

  async createBusiness(business: InsertBusiness): Promise<Business> {
    const now = new Date().toISOString();
    const newBusiness: Business = {
      id: randomUUID(),
      ...business,
      created_at: now,
      updated_at: now,
    };
    this.businesses.push(newBusiness);
    this.persist();
    return newBusiness;
  }

  async getCustomers(businessId: string): Promise<Customer[]> {
    return this.customers
      .filter(c => c.businessId === businessId)
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }

  async getCustomer(id: string): Promise<Customer | null> {
    return this.customers.find(c => c.id === id) || null;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const now = new Date().toISOString();
    const newCustomer: Customer = {
      id: randomUUID(),
      ...customer,
      created_at: now,
      updated_at: now,
    };
    this.customers.push(newCustomer);
    this.persist();
    return newCustomer;
  }

  async updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | null> {
    const index = this.customers.findIndex(c => c.id === id);
    if (index === -1) return null;
    
    this.customers[index] = {
      ...this.customers[index],
      ...customer,
      updated_at: new Date().toISOString(),
    };
    this.persist();
    return this.customers[index];
  }

  async getConversations(businessId: string): Promise<ConversationWithCustomer[]> {
    return this.conversations
      .filter(c => c.businessId === businessId)
      .map(conv => {
        const customer = this.customers.find(cust => cust.id === conv.customerId);
        return {
          ...conv,
          customer: customer!,
        };
      })
      .filter(c => c.customer)
      .sort((a, b) => {
        const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
        const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
        return bTime - aTime;
      });
  }

  async getConversation(id: string): Promise<Conversation | null> {
    return this.conversations.find(c => c.id === id) || null;
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const now = new Date().toISOString();
    const newConversation: Conversation = {
      id: randomUUID(),
      ...conversation,
      created_at: now,
      updated_at: now,
    };
    this.conversations.push(newConversation);
    this.persist();
    return newConversation;
  }

  async updateConversation(id: string, conversation: Partial<InsertConversation>): Promise<Conversation | null> {
    const index = this.conversations.findIndex(c => c.id === id);
    if (index === -1) return null;
    
    this.conversations[index] = {
      ...this.conversations[index],
      ...conversation,
      updated_at: new Date().toISOString(),
    };
    this.persist();
    return this.conversations[index];
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    return this.messages
      .filter(m => m.conversationId === conversationId)
      .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const now = new Date().toISOString();
    const newMessage: Message = {
      id: randomUUID(),
      ...message,
      created_at: now,
    };
    this.messages.push(newMessage);
    this.persist();
    return newMessage;
  }

  async getProducts(businessId: string): Promise<Product[]> {
    return this.products
      .filter(p => p.businessId === businessId)
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }

  async getProduct(id: string): Promise<Product | null> {
    return this.products.find(p => p.id === id) || null;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const now = new Date().toISOString();
    const newProduct: Product = {
      id: randomUUID(),
      ...product,
      created_at: now,
      updated_at: now,
    };
    this.products.push(newProduct);
    this.persist();
    return newProduct;
  }

  async updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | null> {
    const index = this.products.findIndex(p => p.id === id);
    if (index === -1) return null;
    
    this.products[index] = {
      ...this.products[index],
      ...product,
      updated_at: new Date().toISOString(),
    };
    this.persist();
    return this.products[index];
  }

  async getOrders(businessId: string): Promise<OrderWithCustomer[]> {
    return this.orders
      .filter(o => o.businessId === businessId)
      .map(order => {
        const customer = this.customers.find(c => c.id === order.customerId);
        return {
          ...order,
          customer: customer!,
        };
      })
      .filter(o => o.customer)
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }

  async getOrder(id: string): Promise<Order | null> {
    return this.orders.find(o => o.id === id) || null;
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const now = new Date().toISOString();
    const newOrder: Order = {
      id: randomUUID(),
      ...order,
      created_at: now,
      updated_at: now,
    };
    this.orders.push(newOrder);
    this.persist();
    return newOrder;
  }

  async updateOrder(id: string, order: Partial<InsertOrder>): Promise<Order | null> {
    const index = this.orders.findIndex(o => o.id === id);
    if (index === -1) return null;
    
    this.orders[index] = {
      ...this.orders[index],
      ...order,
      updated_at: new Date().toISOString(),
    };
    this.persist();
    return this.orders[index];
  }

  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    return this.orderItems.filter(oi => oi.orderId === orderId);
  }

  async createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem> {
    const now = new Date().toISOString();
    const newOrderItem: OrderItem = {
      id: randomUUID(),
      ...orderItem,
      created_at: now,
    };
    this.orderItems.push(newOrderItem);
    this.persist();
    return newOrderItem;
  }

  async getAutomations(businessId: string): Promise<Automation[]> {
    return this.automations
      .filter(a => a.businessId === businessId)
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }

  async getAutomation(id: string): Promise<Automation | null> {
    return this.automations.find(a => a.id === id) || null;
  }

  async createAutomation(automation: InsertAutomation): Promise<Automation> {
    const now = new Date().toISOString();
    const newAutomation: Automation = {
      id: randomUUID(),
      ...automation,
      created_at: now,
      updated_at: now,
    };
    this.automations.push(newAutomation);
    this.persist();
    return newAutomation;
  }

  async updateAutomation(id: string, automation: Partial<InsertAutomation>): Promise<Automation | null> {
    const index = this.automations.findIndex(a => a.id === id);
    if (index === -1) return null;
    
    this.automations[index] = {
      ...this.automations[index],
      ...automation,
      updated_at: new Date().toISOString(),
    };
    this.persist();
    return this.automations[index];
  }

  async getAutomationLogs(automationId: string): Promise<AutomationLog[]> {
    return this.automationLogs
      .filter(al => al.automationId === automationId)
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 50);
  }

  async createAutomationLog(log: InsertAutomationLog): Promise<AutomationLog> {
    const now = new Date().toISOString();
    const newLog: AutomationLog = {
      id: randomUUID(),
      ...log,
      created_at: now,
    };
    this.automationLogs.push(newLog);
    this.persist();
    return newLog;
  }

  async createNlpResult(result: InsertNlpResult): Promise<NlpResult> {
    const now = new Date().toISOString();
    const newResult: NlpResult = {
      id: randomUUID(),
      ...result,
      created_at: now,
    };
    this.nlpResults.push(newResult);
    this.persist();
    return newResult;
  }

  async getNlpResultsByConversation(conversationId: string): Promise<NlpResult[]> {
    const messageIds = this.messages
      .filter(m => m.conversationId === conversationId)
      .map(m => m.id);
    
    return this.nlpResults
      .filter(nlp => messageIds.includes(nlp.messageId))
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }

  async getNlpResultByMessage(messageId: string): Promise<NlpResult | null> {
    return this.nlpResults.find(nlp => nlp.messageId === messageId) || null;
  }

  async getAnalytics(businessId: string, startDate?: string, endDate?: string): Promise<AnalyticsDaily[]> {
    let filtered = this.analyticsDaily.filter(a => a.businessId === businessId);
    
    if (startDate) {
      filtered = filtered.filter(a => a.date >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter(a => a.date <= endDate);
    }
    
    return filtered.sort((a, b) => b.date.localeCompare(a.date));
  }

  async createAnalytics(analytics: InsertAnalyticsDaily): Promise<AnalyticsDaily> {
    const now = new Date().toISOString();
    const newAnalytics: AnalyticsDaily = {
      id: randomUUID(),
      ...analytics,
      created_at: now,
    };
    this.analyticsDaily.push(newAnalytics);
    this.persist();
    return newAnalytics;
  }

  async clearAll(): Promise<void> {
    this.businesses = [];
    this.customers = [];
    this.conversations = [];
    this.messages = [];
    this.products = [];
    this.orders = [];
    this.orderItems = [];
    this.automations = [];
    this.automationLogs = [];
    this.nlpResults = [];
    this.analyticsDaily = [];
    this.persist();
    console.log('Cleared all storage data');
  }

  async findCustomerByPhone(businessId: string, phone: string): Promise<Customer | null> {
    return this.customers.find(c => c.businessId === businessId && c.phone === phone) || null;
  }

  async findConversationByCustomerAndChannel(
    customerId: string,
    channel: 'whatsapp' | 'sms' | 'instagram' | 'tiktok'
  ): Promise<Conversation | null> {
    return this.conversations.find(c => 
      c.customerId === customerId && 
      c.channel === channel && 
      c.status === 'open'
    ) || null;
  }

  // Message Templates
  async getTemplates(businessId: string): Promise<MessageTemplate[]> {
    return this.messageTemplates
      .filter(t => t.businessId === businessId)
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }

  async getTemplate(id: string): Promise<MessageTemplate | null> {
    return this.messageTemplates.find(t => t.id === id) || null;
  }

  async createTemplate(template: InsertMessageTemplate): Promise<MessageTemplate> {
    const now = new Date().toISOString();
    const newTemplate: MessageTemplate = {
      id: randomUUID(),
      ...template,
      createdAt: now,
      updatedAt: now,
    };
    this.messageTemplates.push(newTemplate);
    this.persist();
    return newTemplate;
  }

  async updateTemplate(id: string, template: Partial<InsertMessageTemplate>): Promise<MessageTemplate | null> {
    const index = this.messageTemplates.findIndex(t => t.id === id);
    if (index === -1) return null;
    
    // Strict whitelist - only allowed fields
    const allowed: (keyof InsertMessageTemplate)[] = ['name', 'category', 'content', 'language', 'variables', 'whatsappTemplateId', 'metadata'];
    const update: Partial<InsertMessageTemplate> = {};
    for (const key of allowed) {
      if (template[key] !== undefined) update[key] = template[key];
    }
    if (!Object.keys(update).length) return this.messageTemplates[index];
    
    this.messageTemplates[index] = {
      ...this.messageTemplates[index],
      ...update,
      updatedAt: new Date().toISOString(),
    };
    this.persist();
    return this.messageTemplates[index];
  }

  async deleteTemplate(id: string): Promise<boolean> {
    const index = this.messageTemplates.findIndex(t => t.id === id);
    if (index === -1) return false;
    
    this.messageTemplates.splice(index, 1);
    this.persist();
    return true;
  }

  // Broadcasts
  async getBroadcasts(businessId: string): Promise<Broadcast[]> {
    return this.broadcasts
      .filter(b => b.businessId === businessId)
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }

  async getBroadcast(id: string): Promise<Broadcast | null> {
    return this.broadcasts.find(b => b.id === id) || null;
  }

  async createBroadcast(broadcast: InsertBroadcast): Promise<Broadcast> {
    const now = new Date().toISOString();
    const newBroadcast: Broadcast = {
      id: randomUUID(),
      ...broadcast,
      createdAt: now,
      updatedAt: now,
    };
    this.broadcasts.push(newBroadcast);
    this.persist();
    return newBroadcast;
  }

  async updateBroadcast(id: string, broadcast: Partial<InsertBroadcast>): Promise<Broadcast | null> {
    const index = this.broadcasts.findIndex(b => b.id === id);
    if (index === -1) return null;
    
    // Strict whitelist - only allowed fields
    const allowed: (keyof InsertBroadcast)[] = ['name', 'templateId', 'segmentId', 'scheduledFor', 'metadata'];
    const update: Partial<InsertBroadcast> = {};
    for (const key of allowed) {
      if (broadcast[key] !== undefined) update[key] = broadcast[key];
    }
    if (!Object.keys(update).length) return this.broadcasts[index];
    
    this.broadcasts[index] = {
      ...this.broadcasts[index],
      ...update,
      updatedAt: new Date().toISOString(),
    };
    this.persist();
    return this.broadcasts[index];
  }

  async deleteBroadcast(id: string): Promise<boolean> {
    const index = this.broadcasts.findIndex(b => b.id === id);
    if (index === -1) return false;
    
    this.broadcasts.splice(index, 1);
    this.persist();
    return true;
  }

  // Broadcast Recipients
  async getBroadcastRecipients(broadcastId: string): Promise<BroadcastRecipient[]> {
    return this.broadcastRecipients.filter(r => r.broadcastId === broadcastId);
  }

  async createBroadcastRecipient(recipient: InsertBroadcastRecipient): Promise<BroadcastRecipient> {
    const newRecipient: BroadcastRecipient = {
      id: randomUUID(),
      ...recipient,
    };
    this.broadcastRecipients.push(newRecipient);
    this.persist();
    return newRecipient;
  }

  async updateBroadcastRecipient(id: string, recipient: Partial<InsertBroadcastRecipient>): Promise<BroadcastRecipient | null> {
    const index = this.broadcastRecipients.findIndex(r => r.id === id);
    if (index === -1) return null;
    
    this.broadcastRecipients[index] = {
      ...this.broadcastRecipients[index],
      ...recipient,
    };
    this.persist();
    return this.broadcastRecipients[index];
  }
}
