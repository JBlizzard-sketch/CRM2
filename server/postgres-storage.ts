import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import ws from 'ws';
import * as schema from '@shared/schema';
import type { IStorage } from './storage';
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
  CustomerSegment, InsertCustomerSegment,
  CustomerSegmentMembership, InsertCustomerSegmentMembership,
  WorkflowDefinition, InsertWorkflowDefinition,
  WorkflowExecution, InsertWorkflowExecution,
  Webhook, InsertWebhook,
  WebhookLog, InsertWebhookLog,
  CustomDashboard, InsertCustomDashboard,
  ScheduledReport, InsertScheduledReport,
  MessageTemplate, InsertMessageTemplate,
  Broadcast, InsertBroadcast,
  BroadcastRecipient, InsertBroadcastRecipient,
} from '@shared/schema';

neonConfig.webSocketConstructor = ws;

function sanitizeUpdate<T extends Record<string, any>>(update: T): T {
  const sanitized = { ...update };
  Object.keys(sanitized).forEach((key) => {
    if (sanitized[key] === undefined) {
      delete sanitized[key];
    }
  });
  return sanitized;
}

export class PostgresStorage implements IStorage {
  private db: ReturnType<typeof drizzle>;

  constructor(connectionString: string) {
    const pool = new Pool({ connectionString });
    this.db = drizzle(pool, { schema });
  }

  async getBusinesses(): Promise<Business[]> {
    const results = await this.db
      .select()
      .from(schema.businesses)
      .orderBy(desc(schema.businesses.createdAt));
    
    return results;
  }

  async getBusiness(id: string): Promise<Business | null> {
    const results = await this.db
      .select()
      .from(schema.businesses)
      .where(eq(schema.businesses.id, id))
      .limit(1);
    
    return results.length > 0 ? results[0] : null;
  }

  async createBusiness(business: InsertBusiness): Promise<Business> {
    const results = await this.db
      .insert(schema.businesses)
      .values(business)
      .returning();
    
    return results[0];
  }

  async getCustomers(businessId: string): Promise<Customer[]> {
    const results = await this.db
      .select()
      .from(schema.customers)
      .where(eq(schema.customers.businessId, businessId))
      .orderBy(desc(schema.customers.createdAt));
    
    return results;
  }

  async getCustomer(id: string): Promise<Customer | null> {
    const results = await this.db
      .select()
      .from(schema.customers)
      .where(eq(schema.customers.id, id))
      .limit(1);
    
    return results.length > 0 ? results[0] : null;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const results = await this.db
      .insert(schema.customers)
      .values(customer)
      .returning();
    
    return results[0];
  }

  async updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | null> {
    const results = await this.db
      .update(schema.customers)
      .set({ ...sanitizeUpdate(customer), updatedAt: new Date() })
      .where(eq(schema.customers.id, id))
      .returning();
    
    return results.length > 0 ? results[0] : null;
  }

  async getConversations(businessId: string): Promise<ConversationWithCustomer[]> {
    const results = await this.db
      .select({
        conversation: schema.conversations,
        customer: schema.customers,
      })
      .from(schema.conversations)
      .innerJoin(schema.customers, eq(schema.conversations.customerId, schema.customers.id))
      .where(eq(schema.conversations.businessId, businessId))
      .orderBy(desc(schema.conversations.lastMessageAt));
    
    return results.map(row => ({
      ...row.conversation,
      customer: row.customer,
    }));
  }

  async getConversation(id: string): Promise<Conversation | null> {
    const results = await this.db
      .select()
      .from(schema.conversations)
      .where(eq(schema.conversations.id, id))
      .limit(1);
    
    return results.length > 0 ? results[0] : null;
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const results = await this.db
      .insert(schema.conversations)
      .values(conversation)
      .returning();
    
    return results[0];
  }

  async updateConversation(id: string, conversation: Partial<InsertConversation>): Promise<Conversation | null> {
    const results = await this.db
      .update(schema.conversations)
      .set({ ...sanitizeUpdate(conversation), updatedAt: new Date() })
      .where(eq(schema.conversations.id, id))
      .returning();
    
    return results.length > 0 ? results[0] : null;
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    const results = await this.db
      .select()
      .from(schema.messages)
      .where(eq(schema.messages.conversationId, conversationId))
      .orderBy(schema.messages.createdAt);
    
    return results;
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const results = await this.db
      .insert(schema.messages)
      .values(message)
      .returning();
    
    await this.db
      .update(schema.conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(schema.conversations.id, message.conversationId));
    
    return results[0];
  }

  async getProducts(businessId: string): Promise<Product[]> {
    const results = await this.db
      .select()
      .from(schema.products)
      .where(eq(schema.products.businessId, businessId))
      .orderBy(desc(schema.products.createdAt));
    
    return results;
  }

  async getProduct(id: string): Promise<Product | null> {
    const results = await this.db
      .select()
      .from(schema.products)
      .where(eq(schema.products.id, id))
      .limit(1);
    
    return results.length > 0 ? results[0] : null;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const results = await this.db
      .insert(schema.products)
      .values(product)
      .returning();
    
    return results[0];
  }

  async updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | null> {
    const results = await this.db
      .update(schema.products)
      .set({ ...sanitizeUpdate(product), updatedAt: new Date() })
      .where(eq(schema.products.id, id))
      .returning();
    
    return results.length > 0 ? results[0] : null;
  }

  async getOrders(businessId: string): Promise<OrderWithCustomer[]> {
    const results = await this.db
      .select({
        order: schema.orders,
        customer: schema.customers,
      })
      .from(schema.orders)
      .innerJoin(schema.customers, eq(schema.orders.customerId, schema.customers.id))
      .where(eq(schema.orders.businessId, businessId))
      .orderBy(desc(schema.orders.createdAt));
    
    return results.map(row => ({
      ...row.order,
      customer: row.customer,
    }));
  }

  async getOrder(id: string): Promise<Order | null> {
    const results = await this.db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, id))
      .limit(1);
    
    return results.length > 0 ? results[0] : null;
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const results = await this.db
      .insert(schema.orders)
      .values(order)
      .returning();
    
    return results[0];
  }

  async updateOrder(id: string, order: Partial<InsertOrder>): Promise<Order | null> {
    const results = await this.db
      .update(schema.orders)
      .set({ ...sanitizeUpdate(order), updatedAt: new Date() })
      .where(eq(schema.orders.id, id))
      .returning();
    
    return results.length > 0 ? results[0] : null;
  }

  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    const results = await this.db
      .select()
      .from(schema.orderItems)
      .where(eq(schema.orderItems.orderId, orderId))
      .orderBy(schema.orderItems.createdAt);
    
    return results;
  }

  async createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem> {
    const results = await this.db
      .insert(schema.orderItems)
      .values(orderItem)
      .returning();
    
    return results[0];
  }

  async getAutomations(businessId: string): Promise<Automation[]> {
    const results = await this.db
      .select()
      .from(schema.automations)
      .where(eq(schema.automations.businessId, businessId))
      .orderBy(desc(schema.automations.createdAt));
    
    return results;
  }

  async getAutomation(id: string): Promise<Automation | null> {
    const results = await this.db
      .select()
      .from(schema.automations)
      .where(eq(schema.automations.id, id))
      .limit(1);
    
    return results.length > 0 ? results[0] : null;
  }

  async createAutomation(automation: InsertAutomation): Promise<Automation> {
    const results = await this.db
      .insert(schema.automations)
      .values(automation)
      .returning();
    
    return results[0];
  }

  async updateAutomation(id: string, automation: Partial<InsertAutomation>): Promise<Automation | null> {
    const results = await this.db
      .update(schema.automations)
      .set({ ...sanitizeUpdate(automation), updatedAt: new Date() })
      .where(eq(schema.automations.id, id))
      .returning();
    
    return results.length > 0 ? results[0] : null;
  }

  async getAutomationLogs(automationId: string): Promise<AutomationLog[]> {
    const results = await this.db
      .select()
      .from(schema.automationLogs)
      .where(eq(schema.automationLogs.automationId, automationId))
      .orderBy(desc(schema.automationLogs.createdAt));
    
    return results;
  }

  async createAutomationLog(log: InsertAutomationLog): Promise<AutomationLog> {
    const results = await this.db
      .insert(schema.automationLogs)
      .values(log)
      .returning();
    
    return results[0];
  }

  async createNlpResult(result: InsertNlpResult): Promise<NlpResult> {
    const results = await this.db
      .insert(schema.nlpResults)
      .values(result)
      .returning();
    
    return results[0];
  }

  async getNlpResultsByConversation(conversationId: string): Promise<NlpResult[]> {
    const results = await this.db
      .select({
        id: schema.nlpResults.id,
        messageId: schema.nlpResults.messageId,
        businessId: schema.nlpResults.businessId,
        sentiment: schema.nlpResults.sentiment,
        confidence: schema.nlpResults.confidence,
        intent: schema.nlpResults.intent,
        metadata: schema.nlpResults.metadata,
        createdAt: schema.nlpResults.createdAt,
      })
      .from(schema.nlpResults)
      .innerJoin(schema.messages, eq(schema.nlpResults.messageId, schema.messages.id))
      .where(eq(schema.messages.conversationId, conversationId))
      .orderBy(desc(schema.nlpResults.createdAt));
    
    return results;
  }

  async getNlpResultByMessage(messageId: string): Promise<NlpResult | null> {
    const results = await this.db
      .select()
      .from(schema.nlpResults)
      .where(eq(schema.nlpResults.messageId, messageId))
      .limit(1);
    
    return results.length > 0 ? results[0] : null;
  }

  async getAnalytics(businessId: string, startDate?: string, endDate?: string): Promise<AnalyticsDaily[]> {
    const conditions = [eq(schema.analyticsDaily.businessId, businessId)];
    
    if (startDate) {
      conditions.push(gte(schema.analyticsDaily.date, startDate));
    }
    
    if (endDate) {
      conditions.push(lte(schema.analyticsDaily.date, endDate));
    }
    
    const results = await this.db
      .select()
      .from(schema.analyticsDaily)
      .where(and(...conditions))
      .orderBy(desc(schema.analyticsDaily.date));
    
    return results;
  }

  async createAnalytics(analytics: InsertAnalyticsDaily): Promise<AnalyticsDaily> {
    const results = await this.db
      .insert(schema.analyticsDaily)
      .values(analytics)
      .returning();
    
    return results[0];
  }

  async clearAll(): Promise<void> {
    await this.db.delete(schema.analyticsDaily);
    await this.db.delete(schema.nlpResults);
    await this.db.delete(schema.automationLogs);
    await this.db.delete(schema.automations);
    await this.db.delete(schema.orderItems);
    await this.db.delete(schema.orders);
    await this.db.delete(schema.products);
    await this.db.delete(schema.messages);
    await this.db.delete(schema.conversations);
    await this.db.delete(schema.customers);
    await this.db.delete(schema.businesses);
  }

  async findCustomerByPhone(businessId: string, phone: string): Promise<Customer | null> {
    const results = await this.db
      .select()
      .from(schema.customers)
      .where(and(
        eq(schema.customers.businessId, businessId),
        eq(schema.customers.phone, phone)
      ))
      .limit(1);
    
    return results.length > 0 ? results[0] : null;
  }

  async findConversationByCustomerAndChannel(
    customerId: string,
    channel: 'whatsapp' | 'sms' | 'instagram' | 'tiktok'
  ): Promise<Conversation | null> {
    const results = await this.db
      .select()
      .from(schema.conversations)
      .where(and(
        eq(schema.conversations.customerId, customerId),
        eq(schema.conversations.channel, channel),
        eq(schema.conversations.status, 'open')
      ))
      .limit(1);
    
    return results.length > 0 ? results[0] : null;
  }

  async getSegments(businessId: string): Promise<CustomerSegment[]> {
    const results = await this.db
      .select()
      .from(schema.customerSegments)
      .where(eq(schema.customerSegments.businessId, businessId))
      .orderBy(desc(schema.customerSegments.createdAt));
    return results;
  }

  async getSegment(id: string): Promise<CustomerSegment | null> {
    const results = await this.db
      .select()
      .from(schema.customerSegments)
      .where(eq(schema.customerSegments.id, id))
      .limit(1);
    return results.length > 0 ? results[0] : null;
  }

  async createSegment(segment: InsertCustomerSegment): Promise<CustomerSegment> {
    const results = await this.db
      .insert(schema.customerSegments)
      .values(segment)
      .returning();
    return results[0];
  }

  async updateSegment(id: string, segment: Partial<InsertCustomerSegment>): Promise<CustomerSegment | null> {
    const results = await this.db
      .update(schema.customerSegments)
      .set({ ...sanitizeUpdate(segment), updatedAt: new Date() })
      .where(eq(schema.customerSegments.id, id))
      .returning();
    return results.length > 0 ? results[0] : null;
  }

  async deleteSegment(id: string): Promise<boolean> {
    const results = await this.db
      .delete(schema.customerSegments)
      .where(eq(schema.customerSegments.id, id))
      .returning();
    return results.length > 0;
  }

  async getSegmentMemberships(segmentId: string): Promise<CustomerSegmentMembership[]> {
    const results = await this.db
      .select()
      .from(schema.customerSegmentMemberships)
      .where(eq(schema.customerSegmentMemberships.segmentId, segmentId))
      .orderBy(desc(schema.customerSegmentMemberships.joinedAt));
    return results;
  }

  async getCustomerSegments(customerId: string): Promise<CustomerSegmentMembership[]> {
    const results = await this.db
      .select()
      .from(schema.customerSegmentMemberships)
      .where(eq(schema.customerSegmentMemberships.customerId, customerId));
    return results;
  }

  async addCustomerToSegment(membership: InsertCustomerSegmentMembership): Promise<CustomerSegmentMembership> {
    const results = await this.db
      .insert(schema.customerSegmentMemberships)
      .values(membership)
      .returning();
    return results[0];
  }

  async removeCustomerFromSegment(customerId: string, segmentId: string): Promise<boolean> {
    const results = await this.db
      .delete(schema.customerSegmentMemberships)
      .where(and(
        eq(schema.customerSegmentMemberships.customerId, customerId),
        eq(schema.customerSegmentMemberships.segmentId, segmentId)
      ))
      .returning();
    return results.length > 0;
  }

  async getWorkflows(businessId: string): Promise<WorkflowDefinition[]> {
    const results = await this.db
      .select()
      .from(schema.workflowDefinitions)
      .where(eq(schema.workflowDefinitions.businessId, businessId))
      .orderBy(desc(schema.workflowDefinitions.createdAt));
    return results;
  }

  async getWorkflow(id: string): Promise<WorkflowDefinition | null> {
    const results = await this.db
      .select()
      .from(schema.workflowDefinitions)
      .where(eq(schema.workflowDefinitions.id, id))
      .limit(1);
    return results.length > 0 ? results[0] : null;
  }

  async createWorkflow(workflow: InsertWorkflowDefinition): Promise<WorkflowDefinition> {
    const results = await this.db
      .insert(schema.workflowDefinitions)
      .values(workflow)
      .returning();
    return results[0];
  }

  async updateWorkflow(id: string, workflow: Partial<InsertWorkflowDefinition>): Promise<WorkflowDefinition | null> {
    const results = await this.db
      .update(schema.workflowDefinitions)
      .set({ ...sanitizeUpdate(workflow), updatedAt: new Date() })
      .where(eq(schema.workflowDefinitions.id, id))
      .returning();
    return results.length > 0 ? results[0] : null;
  }

  async deleteWorkflow(id: string): Promise<boolean> {
    const results = await this.db
      .delete(schema.workflowDefinitions)
      .where(eq(schema.workflowDefinitions.id, id))
      .returning();
    return results.length > 0;
  }

  async getWorkflowExecutions(workflowId: string): Promise<WorkflowExecution[]> {
    const results = await this.db
      .select()
      .from(schema.workflowExecutions)
      .where(eq(schema.workflowExecutions.workflowId, workflowId))
      .orderBy(desc(schema.workflowExecutions.startedAt))
      .limit(50);
    return results;
  }

  async getWorkflowExecution(id: string): Promise<WorkflowExecution | null> {
    const results = await this.db
      .select()
      .from(schema.workflowExecutions)
      .where(eq(schema.workflowExecutions.id, id))
      .limit(1);
    return results.length > 0 ? results[0] : null;
  }

  async createWorkflowExecution(execution: InsertWorkflowExecution): Promise<WorkflowExecution> {
    const results = await this.db
      .insert(schema.workflowExecutions)
      .values(execution)
      .returning();
    return results[0];
  }

  async updateWorkflowExecution(id: string, execution: Partial<InsertWorkflowExecution>): Promise<WorkflowExecution | null> {
    const results = await this.db
      .update(schema.workflowExecutions)
      .set(sanitizeUpdate(execution))
      .where(eq(schema.workflowExecutions.id, id))
      .returning();
    return results.length > 0 ? results[0] : null;
  }

  async getWebhooks(businessId: string): Promise<Webhook[]> {
    const results = await this.db
      .select()
      .from(schema.webhooks)
      .where(eq(schema.webhooks.businessId, businessId))
      .orderBy(desc(schema.webhooks.createdAt));
    return results;
  }

  async getWebhook(id: string): Promise<Webhook | null> {
    const results = await this.db
      .select()
      .from(schema.webhooks)
      .where(eq(schema.webhooks.id, id))
      .limit(1);
    return results.length > 0 ? results[0] : null;
  }

  async createWebhook(webhook: InsertWebhook): Promise<Webhook> {
    const results = await this.db
      .insert(schema.webhooks)
      .values(webhook)
      .returning();
    return results[0];
  }

  async updateWebhook(id: string, webhook: Partial<InsertWebhook>): Promise<Webhook | null> {
    const results = await this.db
      .update(schema.webhooks)
      .set({ ...sanitizeUpdate(webhook), updatedAt: new Date() })
      .where(eq(schema.webhooks.id, id))
      .returning();
    return results.length > 0 ? results[0] : null;
  }

  async deleteWebhook(id: string): Promise<boolean> {
    const results = await this.db
      .delete(schema.webhooks)
      .where(eq(schema.webhooks.id, id))
      .returning();
    return results.length > 0;
  }

  async getWebhookLogs(webhookId: string): Promise<WebhookLog[]> {
    const results = await this.db
      .select()
      .from(schema.webhookLogs)
      .where(eq(schema.webhookLogs.webhookId, webhookId))
      .orderBy(desc(schema.webhookLogs.createdAt))
      .limit(100);
    return results;
  }

  async createWebhookLog(log: InsertWebhookLog): Promise<WebhookLog> {
    const results = await this.db
      .insert(schema.webhookLogs)
      .values(log)
      .returning();
    return results[0];
  }

  async getDashboards(businessId: string): Promise<CustomDashboard[]> {
    const results = await this.db
      .select()
      .from(schema.customDashboards)
      .where(eq(schema.customDashboards.businessId, businessId))
      .orderBy(desc(schema.customDashboards.createdAt));
    return results;
  }

  async getDashboard(id: string): Promise<CustomDashboard | null> {
    const results = await this.db
      .select()
      .from(schema.customDashboards)
      .where(eq(schema.customDashboards.id, id))
      .limit(1);
    return results.length > 0 ? results[0] : null;
  }

  async createDashboard(dashboard: InsertCustomDashboard): Promise<CustomDashboard> {
    const results = await this.db
      .insert(schema.customDashboards)
      .values(dashboard)
      .returning();
    return results[0];
  }

  async updateDashboard(id: string, dashboard: Partial<InsertCustomDashboard>): Promise<CustomDashboard | null> {
    const results = await this.db
      .update(schema.customDashboards)
      .set({ ...sanitizeUpdate(dashboard), updatedAt: new Date() })
      .where(eq(schema.customDashboards.id, id))
      .returning();
    return results.length > 0 ? results[0] : null;
  }

  async deleteDashboard(id: string): Promise<boolean> {
    const results = await this.db
      .delete(schema.customDashboards)
      .where(eq(schema.customDashboards.id, id))
      .returning();
    return results.length > 0;
  }

  async getScheduledReports(businessId: string): Promise<ScheduledReport[]> {
    const results = await this.db
      .select()
      .from(schema.scheduledReports)
      .where(eq(schema.scheduledReports.businessId, businessId))
      .orderBy(desc(schema.scheduledReports.createdAt));
    return results;
  }

  async getScheduledReport(id: string): Promise<ScheduledReport | null> {
    const results = await this.db
      .select()
      .from(schema.scheduledReports)
      .where(eq(schema.scheduledReports.id, id))
      .limit(1);
    return results.length > 0 ? results[0] : null;
  }

  async createScheduledReport(report: InsertScheduledReport): Promise<ScheduledReport> {
    const results = await this.db
      .insert(schema.scheduledReports)
      .values(report)
      .returning();
    return results[0];
  }

  async updateScheduledReport(id: string, report: Partial<InsertScheduledReport>): Promise<ScheduledReport | null> {
    const results = await this.db
      .update(schema.scheduledReports)
      .set({ ...sanitizeUpdate(report), updatedAt: new Date() })
      .where(eq(schema.scheduledReports.id, id))
      .returning();
    return results.length > 0 ? results[0] : null;
  }

  async deleteScheduledReport(id: string): Promise<boolean> {
    const results = await this.db
      .delete(schema.scheduledReports)
      .where(eq(schema.scheduledReports.id, id))
      .returning();
    return results.length > 0;
  }

  async getTemplates(businessId: string): Promise<MessageTemplate[]> {
    const results = await this.db
      .select()
      .from(schema.messageTemplates)
      .where(eq(schema.messageTemplates.businessId, businessId))
      .orderBy(desc(schema.messageTemplates.createdAt));
    return results;
  }

  async getTemplate(id: string): Promise<MessageTemplate | null> {
    const results = await this.db
      .select()
      .from(schema.messageTemplates)
      .where(eq(schema.messageTemplates.id, id))
      .limit(1);
    return results.length > 0 ? results[0] : null;
  }

  async createTemplate(template: InsertMessageTemplate): Promise<MessageTemplate> {
    const results = await this.db
      .insert(schema.messageTemplates)
      .values(template)
      .returning();
    return results[0];
  }

  async updateTemplate(id: string, template: Partial<InsertMessageTemplate>): Promise<MessageTemplate | null> {
    // Strict whitelist - only allowed fields
    const allowed = ['name', 'category', 'content', 'language', 'variables', 'whatsappTemplateId', 'metadata'] as const;
    const update = Object.fromEntries(
      allowed.flatMap(key => template[key] === undefined ? [] : [[key, template[key]]])
    ) as Partial<InsertMessageTemplate>;
    
    if (!Object.keys(update).length) {
      const results = await this.db
        .select()
        .from(schema.messageTemplates)
        .where(eq(schema.messageTemplates.id, id))
        .limit(1);
      return results.length > 0 ? results[0] : null;
    }
    
    const results = await this.db
      .update(schema.messageTemplates)
      .set({ ...update, updatedAt: new Date() })
      .where(eq(schema.messageTemplates.id, id))
      .returning();
    return results.length > 0 ? results[0] : null;
  }

  async deleteTemplate(id: string): Promise<boolean> {
    const results = await this.db
      .delete(schema.messageTemplates)
      .where(eq(schema.messageTemplates.id, id))
      .returning();
    return results.length > 0;
  }

  async getBroadcasts(businessId: string): Promise<Broadcast[]> {
    const results = await this.db
      .select()
      .from(schema.broadcasts)
      .where(eq(schema.broadcasts.businessId, businessId))
      .orderBy(desc(schema.broadcasts.createdAt));
    return results;
  }

  async getBroadcast(id: string): Promise<Broadcast | null> {
    const results = await this.db
      .select()
      .from(schema.broadcasts)
      .where(eq(schema.broadcasts.id, id))
      .limit(1);
    return results.length > 0 ? results[0] : null;
  }

  async createBroadcast(broadcast: InsertBroadcast): Promise<Broadcast> {
    const results = await this.db
      .insert(schema.broadcasts)
      .values(broadcast)
      .returning();
    return results[0];
  }

  async updateBroadcast(id: string, broadcast: Partial<InsertBroadcast>): Promise<Broadcast | null> {
    // Strict whitelist - only allowed fields
    const allowed = ['name', 'templateId', 'segmentId', 'scheduledFor', 'metadata'] as const;
    const update = Object.fromEntries(
      allowed.flatMap(key => broadcast[key] === undefined ? [] : [[key, broadcast[key]]])
    ) as Partial<InsertBroadcast>;
    
    if (!Object.keys(update).length) {
      const results = await this.db
        .select()
        .from(schema.broadcasts)
        .where(eq(schema.broadcasts.id, id))
        .limit(1);
      return results.length > 0 ? results[0] : null;
    }
    
    const results = await this.db
      .update(schema.broadcasts)
      .set({ ...update, updatedAt: new Date() })
      .where(eq(schema.broadcasts.id, id))
      .returning();
    return results.length > 0 ? results[0] : null;
  }

  async deleteBroadcast(id: string): Promise<boolean> {
    const results = await this.db
      .delete(schema.broadcasts)
      .where(eq(schema.broadcasts.id, id))
      .returning();
    return results.length > 0;
  }

  async getBroadcastRecipients(broadcastId: string): Promise<BroadcastRecipient[]> {
    const results = await this.db
      .select()
      .from(schema.broadcastRecipients)
      .where(eq(schema.broadcastRecipients.broadcastId, broadcastId));
    return results;
  }

  async createBroadcastRecipient(recipient: InsertBroadcastRecipient): Promise<BroadcastRecipient> {
    const results = await this.db
      .insert(schema.broadcastRecipients)
      .values(recipient)
      .returning();
    return results[0];
  }

  async updateBroadcastRecipient(id: string, recipient: Partial<InsertBroadcastRecipient>): Promise<BroadcastRecipient | null> {
    const results = await this.db
      .update(schema.broadcastRecipients)
      .set(sanitizeUpdate(recipient))
      .where(eq(schema.broadcastRecipients.id, id))
      .returning();
    return results.length > 0 ? results[0] : null;
  }
}
