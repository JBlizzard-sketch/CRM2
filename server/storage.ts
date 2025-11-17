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
} from "@shared/schema";

export interface IStorage {
  // Businesses
  getBusinesses(): Promise<Business[]>;
  getBusiness(id: string): Promise<Business | null>;
  createBusiness(business: InsertBusiness): Promise<Business>;

  // Customers
  getCustomers(businessId: string): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | null>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | null>;

  // Conversations
  getConversations(businessId: string): Promise<ConversationWithCustomer[]>;
  getConversation(id: string): Promise<Conversation | null>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: string, conversation: Partial<InsertConversation>): Promise<Conversation | null>;

  // Messages
  getMessages(conversationId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;

  // Products
  getProducts(businessId: string): Promise<Product[]>;
  getProduct(id: string): Promise<Product | null>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | null>;

  // Orders
  getOrders(businessId: string): Promise<OrderWithCustomer[]>;
  getOrder(id: string): Promise<Order | null>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: string, order: Partial<InsertOrder>): Promise<Order | null>;

  // Order Items
  getOrderItems(orderId: string): Promise<OrderItem[]>;
  createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem>;

  // Automations
  getAutomations(businessId: string): Promise<Automation[]>;
  getAutomation(id: string): Promise<Automation | null>;
  createAutomation(automation: InsertAutomation): Promise<Automation>;
  updateAutomation(id: string, automation: Partial<InsertAutomation>): Promise<Automation | null>;

  // Automation Logs
  getAutomationLogs(automationId: string): Promise<AutomationLog[]>;
  createAutomationLog(log: InsertAutomationLog): Promise<AutomationLog>;

  // NLP Results
  createNlpResult(result: InsertNlpResult): Promise<NlpResult>;
  getNlpResultsByConversation(conversationId: string): Promise<NlpResult[]>;
  getNlpResultByMessage(messageId: string): Promise<NlpResult | null>;

  // Analytics
  getAnalytics(businessId: string, startDate?: string, endDate?: string): Promise<AnalyticsDaily[]>;
  createAnalytics(analytics: InsertAnalyticsDaily): Promise<AnalyticsDaily>;

  // Message Templates
  getTemplates(businessId: string): Promise<MessageTemplate[]>;
  getTemplate(id: string): Promise<MessageTemplate | null>;
  createTemplate(template: InsertMessageTemplate): Promise<MessageTemplate>;
  updateTemplate(id: string, template: Partial<InsertMessageTemplate>): Promise<MessageTemplate | null>;
  deleteTemplate(id: string): Promise<boolean>;

  // Broadcasts
  getBroadcasts(businessId: string): Promise<Broadcast[]>;
  getBroadcast(id: string): Promise<Broadcast | null>;
  createBroadcast(broadcast: InsertBroadcast): Promise<Broadcast>;
  updateBroadcast(id: string, broadcast: Partial<InsertBroadcast>): Promise<Broadcast | null>;
  deleteBroadcast(id: string): Promise<boolean>;

  // Broadcast Recipients
  getBroadcastRecipients(broadcastId: string): Promise<BroadcastRecipient[]>;
  createBroadcastRecipient(recipient: InsertBroadcastRecipient): Promise<BroadcastRecipient>;
  updateBroadcastRecipient(id: string, recipient: Partial<InsertBroadcastRecipient>): Promise<BroadcastRecipient | null>;

  // Customer Segments
  getSegments(businessId: string): Promise<CustomerSegment[]>;
  getSegment(id: string): Promise<CustomerSegment | null>;
  createSegment(segment: InsertCustomerSegment): Promise<CustomerSegment>;
  updateSegment(id: string, segment: Partial<InsertCustomerSegment>): Promise<CustomerSegment | null>;
  deleteSegment(id: string): Promise<boolean>;

  // Customer Segment Memberships
  getSegmentMemberships(segmentId: string): Promise<CustomerSegmentMembership[]>;
  getCustomerSegments(customerId: string): Promise<CustomerSegmentMembership[]>;
  addCustomerToSegment(membership: InsertCustomerSegmentMembership): Promise<CustomerSegmentMembership>;
  removeCustomerFromSegment(customerId: string, segmentId: string): Promise<boolean>;

  // Workflow Definitions
  getWorkflows(businessId: string): Promise<WorkflowDefinition[]>;
  getWorkflow(id: string): Promise<WorkflowDefinition | null>;
  createWorkflow(workflow: InsertWorkflowDefinition): Promise<WorkflowDefinition>;
  updateWorkflow(id: string, workflow: Partial<InsertWorkflowDefinition>): Promise<WorkflowDefinition | null>;
  deleteWorkflow(id: string): Promise<boolean>;

  // Workflow Executions
  getWorkflowExecutions(workflowId: string): Promise<WorkflowExecution[]>;
  getWorkflowExecution(id: string): Promise<WorkflowExecution | null>;
  createWorkflowExecution(execution: InsertWorkflowExecution): Promise<WorkflowExecution>;
  updateWorkflowExecution(id: string, execution: Partial<InsertWorkflowExecution>): Promise<WorkflowExecution | null>;

  // Webhooks
  getWebhooks(businessId: string): Promise<Webhook[]>;
  getWebhook(id: string): Promise<Webhook | null>;
  createWebhook(webhook: InsertWebhook): Promise<Webhook>;
  updateWebhook(id: string, webhook: Partial<InsertWebhook>): Promise<Webhook | null>;
  deleteWebhook(id: string): Promise<boolean>;

  // Webhook Logs
  getWebhookLogs(webhookId: string): Promise<WebhookLog[]>;
  createWebhookLog(log: InsertWebhookLog): Promise<WebhookLog>;

  // Custom Dashboards
  getDashboards(businessId: string): Promise<CustomDashboard[]>;
  getDashboard(id: string): Promise<CustomDashboard | null>;
  createDashboard(dashboard: InsertCustomDashboard): Promise<CustomDashboard>;
  updateDashboard(id: string, dashboard: Partial<InsertCustomDashboard>): Promise<CustomDashboard | null>;
  deleteDashboard(id: string): Promise<boolean>;

  // Scheduled Reports
  getScheduledReports(businessId: string): Promise<ScheduledReport[]>;
  getScheduledReport(id: string): Promise<ScheduledReport | null>;
  createScheduledReport(report: InsertScheduledReport): Promise<ScheduledReport>;
  updateScheduledReport(id: string, report: Partial<InsertScheduledReport>): Promise<ScheduledReport | null>;
  deleteScheduledReport(id: string): Promise<boolean>;

  // Utility
  clearAll(): Promise<void>;
  findCustomerByPhone(businessId: string, phone: string): Promise<Customer | null>;
  findConversationByCustomerAndChannel(customerId: string, channel: 'whatsapp' | 'sms' | 'instagram' | 'tiktok'): Promise<Conversation | null>;
}

import { PostgresStorage } from './postgres-storage';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

export const storage: IStorage = new PostgresStorage(process.env.DATABASE_URL);
