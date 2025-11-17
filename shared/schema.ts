import { pgTable, varchar, text, timestamp, integer, real, jsonb, index, unique, uuid as pgUuid } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const businesses = pgTable("businesses", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  email: varchar("email", { length: 255 }),
  tags: jsonb("tags").$type<string[]>(),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  businessIdIdx: index("customers_business_id_idx").on(table.businessId),
  phoneIdx: index("customers_phone_idx").on(table.phone),
}));

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  channel: varchar("channel", { length: 50 }).notNull().$type<'whatsapp' | 'sms' | 'instagram' | 'tiktok'>(),
  status: varchar("status", { length: 20 }).notNull().$type<'open' | 'closed'>().default('open'),
  lastMessageAt: timestamp("last_message_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  businessIdIdx: index("conversations_business_id_idx").on(table.businessId),
  customerIdIdx: index("conversations_customer_id_idx").on(table.customerId),
}));

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  direction: varchar("direction", { length: 20 }).notNull().$type<'inbound' | 'outbound'>(),
  content: text("content").notNull(),
  channel: varchar("channel", { length: 50 }).notNull().$type<'whatsapp' | 'sms' | 'instagram' | 'tiktok'>(),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  conversationIdIdx: index("messages_conversation_id_idx").on(table.conversationId),
  businessIdIdx: index("messages_business_id_idx").on(table.businessId),
}));

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: real("price").notNull(),
  stock: integer("stock").notNull().default(0),
  attributes: jsonb("attributes").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  businessIdIdx: index("products_business_id_idx").on(table.businessId),
}));

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).notNull().$type<'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'>().default('pending'),
  total: real("total").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  businessIdIdx: index("orders_business_id_idx").on(table.businessId),
  customerIdIdx: index("orders_customer_id_idx").on(table.customerId),
}));

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull(),
  price: real("price").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  orderIdIdx: index("order_items_order_id_idx").on(table.orderId),
}));

export const automations = pgTable("automations", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  trigger: varchar("trigger", { length: 255 }).notNull(),
  action: varchar("action", { length: 255 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().$type<'active' | 'inactive'>().default('active'),
  config: jsonb("config").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  businessIdIdx: index("automations_business_id_idx").on(table.businessId),
}));

export const automationLogs = pgTable("automation_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  automationId: uuid("automation_id").notNull().references(() => automations.id, { onDelete: "cascade" }),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).notNull().$type<'success' | 'failed'>(),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  automationIdIdx: index("automation_logs_automation_id_idx").on(table.automationId),
}));

export const nlpResults = pgTable("nlp_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  messageId: uuid("message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  sentiment: varchar("sentiment", { length: 20 }).notNull().$type<'positive' | 'negative' | 'neutral'>(),
  confidence: real("confidence").notNull(),
  intent: varchar("intent", { length: 255 }),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  messageIdIdx: index("nlp_results_message_id_idx").on(table.messageId),
}));

export const analyticsDaily = pgTable("analytics_daily", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  date: varchar("date", { length: 10 }).notNull(),
  messagesSent: integer("messages_sent").notNull().default(0),
  messagesReceived: integer("messages_received").notNull().default(0),
  ordersCount: integer("orders_count").notNull().default(0),
  revenue: real("revenue").notNull().default(0),
  newCustomers: integer("new_customers").notNull().default(0),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  businessIdIdx: index("analytics_daily_business_id_idx").on(table.businessId),
  dateIdx: index("analytics_daily_date_idx").on(table.date),
}));

export const messageTemplates = pgTable("message_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 50 }).notNull().$type<'marketing' | 'utility' | 'authentication' | 'service'>(),
  content: text("content").notNull(),
  language: varchar("language", { length: 10 }).notNull().default('en'),
  variables: jsonb("variables").$type<string[]>(),
  status: varchar("status", { length: 20 }).notNull().$type<'draft' | 'pending_approval' | 'approved' | 'rejected'>().default('draft'),
  whatsappTemplateId: varchar("whatsapp_template_id", { length: 255 }),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  businessIdIdx: index("message_templates_business_id_idx").on(table.businessId),
  categoryIdx: index("message_templates_category_idx").on(table.category),
  statusIdx: index("message_templates_status_idx").on(table.status),
}));

export const broadcasts = pgTable("broadcasts", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  templateId: uuid("template_id").references(() => messageTemplates.id, { onDelete: "set null" }),
  name: varchar("name", { length: 255 }).notNull(),
  segmentId: uuid("segment_id").references(() => customerSegments.id, { onDelete: "set null" }),
  status: varchar("status", { length: 20 }).notNull().$type<'draft' | 'scheduled' | 'sending' | 'completed' | 'failed'>().default('draft'),
  scheduledFor: timestamp("scheduled_for"),
  totalRecipients: integer("total_recipients").notNull().default(0),
  sentCount: integer("sent_count").notNull().default(0),
  deliveredCount: integer("delivered_count").notNull().default(0),
  failedCount: integer("failed_count").notNull().default(0),
  readCount: integer("read_count").notNull().default(0),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
}, (table) => ({
  businessIdIdx: index("broadcasts_business_id_idx").on(table.businessId),
  statusIdx: index("broadcasts_status_idx").on(table.status),
  scheduledForIdx: index("broadcasts_scheduled_for_idx").on(table.scheduledFor),
}));

export const broadcastRecipients = pgTable("broadcast_recipients", {
  id: uuid("id").primaryKey().defaultRandom(),
  broadcastId: uuid("broadcast_id").notNull().references(() => broadcasts.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).notNull().$type<'pending' | 'sent' | 'delivered' | 'read' | 'failed'>().default('pending'),
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  readAt: timestamp("read_at"),
  failedAt: timestamp("failed_at"),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
}, (table) => ({
  broadcastIdIdx: index("broadcast_recipients_broadcast_id_idx").on(table.broadcastId),
  customerIdIdx: index("broadcast_recipients_customer_id_idx").on(table.customerId),
  statusIdx: index("broadcast_recipients_status_idx").on(table.status),
}));

export const customerSegments = pgTable("customer_segments", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 50 }).notNull().$type<'rfm' | 'behavioral' | 'custom' | 'smart'>(),
  criteria: jsonb("criteria").$type<Record<string, any>>().notNull(),
  isAutomatic: integer("is_automatic").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  businessIdIdx: index("customer_segments_business_id_idx").on(table.businessId),
}));

export const customerSegmentMemberships = pgTable("customer_segment_memberships", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  segmentId: uuid("segment_id").notNull().references(() => customerSegments.id, { onDelete: "cascade" }),
  rfmScore: jsonb("rfm_score").$type<{ recency: number; frequency: number; monetary: number }>(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
}, (table) => ({
  customerIdIdx: index("customer_segment_memberships_customer_id_idx").on(table.customerId),
  segmentIdIdx: index("customer_segment_memberships_segment_id_idx").on(table.segmentId),
  uniqueMembership: unique("customer_segment_memberships_unique_idx").on(table.customerId, table.segmentId),
}));

export const workflowDefinitions = pgTable("workflow_definitions", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 20 }).notNull().$type<'active' | 'inactive' | 'draft'>().default('draft'),
  trigger: jsonb("trigger").$type<Record<string, any>>().notNull(),
  nodes: jsonb("nodes").$type<Array<any>>().notNull(),
  edges: jsonb("edges").$type<Array<any>>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  businessIdIdx: index("workflow_definitions_business_id_idx").on(table.businessId),
  statusIdx: index("workflow_definitions_status_idx").on(table.status, table.businessId),
}));

export const workflowExecutions = pgTable("workflow_executions", {
  id: uuid("id").primaryKey().defaultRandom(),
  workflowId: uuid("workflow_id").notNull().references(() => workflowDefinitions.id, { onDelete: "cascade" }),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).notNull().$type<'running' | 'completed' | 'failed' | 'cancelled'>(),
  context: jsonb("context").$type<Record<string, any>>(),
  currentNodeId: varchar("current_node_id", { length: 255 }),
  error: text("error"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
}, (table) => ({
  workflowIdIdx: index("workflow_executions_workflow_id_idx").on(table.workflowId),
}));

export const webhooks = pgTable("webhooks", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  url: text("url").notNull(),
  method: varchar("method", { length: 10 }).notNull().default('POST'),
  headers: jsonb("headers").$type<Record<string, string>>(),
  events: jsonb("events").$type<string[]>().notNull(),
  status: varchar("status", { length: 20 }).notNull().$type<'active' | 'inactive'>().default('active'),
  secret: varchar("secret", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  businessIdIdx: index("webhooks_business_id_idx").on(table.businessId),
  statusIdx: index("webhooks_status_idx").on(table.status, table.businessId),
}));

export const webhookLogs = pgTable("webhook_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  webhookId: uuid("webhook_id").notNull().references(() => webhooks.id, { onDelete: "cascade" }),
  event: varchar("event", { length: 100 }).notNull(),
  payload: jsonb("payload").$type<Record<string, any>>(),
  response: jsonb("response").$type<Record<string, any>>(),
  statusCode: integer("status_code"),
  success: integer("success").notNull(),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  webhookIdIdx: index("webhook_logs_webhook_id_idx").on(table.webhookId),
}));

export const customDashboards = pgTable("custom_dashboards", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  layout: jsonb("layout").$type<Array<any>>().notNull(),
  isDefault: integer("is_default").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  businessIdIdx: index("custom_dashboards_business_id_idx").on(table.businessId),
}));

export const scheduledReports = pgTable("scheduled_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  reportType: varchar("report_type", { length: 50 }).notNull(),
  schedule: varchar("schedule", { length: 50 }).notNull(),
  recipients: jsonb("recipients").$type<Array<{ type: 'email' | 'whatsapp'; value: string }>>().notNull(),
  filters: jsonb("filters").$type<Record<string, any>>(),
  status: varchar("status", { length: 20 }).notNull().$type<'active' | 'inactive'>().default('active'),
  lastSentAt: timestamp("last_sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  businessIdIdx: index("scheduled_reports_business_id_idx").on(table.businessId),
}));

function uuid(name: string) {
  return pgUuid(name);
}

export const businessRelations = relations(businesses, ({ many }) => ({
  customers: many(customers),
  conversations: many(conversations),
  products: many(products),
  orders: many(orders),
  automations: many(automations),
}));

export const customerRelations = relations(customers, ({ one, many }) => ({
  business: one(businesses, {
    fields: [customers.businessId],
    references: [businesses.id],
  }),
  conversations: many(conversations),
  orders: many(orders),
}));

export const conversationRelations = relations(conversations, ({ one, many }) => ({
  business: one(businesses, {
    fields: [conversations.businessId],
    references: [businesses.id],
  }),
  customer: one(customers, {
    fields: [conversations.customerId],
    references: [customers.id],
  }),
  messages: many(messages),
}));

export const messageRelations = relations(messages, ({ one, many }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  business: one(businesses, {
    fields: [messages.businessId],
    references: [businesses.id],
  }),
  nlpResults: many(nlpResults),
}));

export const orderRelations = relations(orders, ({ one, many }) => ({
  business: one(businesses, {
    fields: [orders.businessId],
    references: [businesses.id],
  }),
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  items: many(orderItems),
}));

export const orderItemRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const businessSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export const insertBusinessSchema = businessSchema.omit({ id: true, createdAt: true, updatedAt: true });
export type Business = z.infer<typeof businessSchema>;
export type InsertBusiness = z.infer<typeof insertBusinessSchema>;

export const customerSchema = z.object({
  id: z.string().uuid(),
  businessId: z.string().uuid(),
  name: z.string(),
  phone: z.string(),
  email: z.string().email().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  metadata: z.record(z.any()).nullable().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export const insertCustomerSchema = customerSchema.omit({ id: true, createdAt: true, updatedAt: true });
export type Customer = z.infer<typeof customerSchema>;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

// Customer with computed fields
export type CustomerWithCLV = Customer & {
  lifetimeValue: number;
};

export const conversationSchema = z.object({
  id: z.string().uuid(),
  businessId: z.string().uuid(),
  customerId: z.string().uuid(),
  channel: z.enum(['whatsapp', 'sms', 'instagram', 'tiktok']),
  status: z.enum(['open', 'closed']),
  lastMessageAt: z.coerce.date().nullable().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export const insertConversationSchema = conversationSchema.omit({ id: true, createdAt: true, updatedAt: true });
export type Conversation = z.infer<typeof conversationSchema>;
export type InsertConversation = z.infer<typeof insertConversationSchema>;

export const messageSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  businessId: z.string().uuid(),
  direction: z.enum(['inbound', 'outbound']),
  content: z.string(),
  channel: z.enum(['whatsapp', 'sms', 'instagram', 'tiktok']),
  metadata: z.record(z.any()).nullable().optional(),
  createdAt: z.coerce.date().optional(),
});

export const insertMessageSchema = messageSchema.omit({ id: true, createdAt: true });
export type Message = z.infer<typeof messageSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export const productSchema = z.object({
  id: z.string().uuid(),
  businessId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable().optional(),
  price: z.number(),
  stock: z.number().int(),
  attributes: z.record(z.any()).nullable().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export const insertProductSchema = productSchema.omit({ id: true, createdAt: true, updatedAt: true });
export type Product = z.infer<typeof productSchema>;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export const orderSchema = z.object({
  id: z.string().uuid(),
  businessId: z.string().uuid(),
  customerId: z.string().uuid(),
  status: z.enum(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']),
  total: z.number(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export const insertOrderSchema = orderSchema.omit({ id: true, createdAt: true, updatedAt: true });
export type Order = z.infer<typeof orderSchema>;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export const orderItemSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  productId: z.string().uuid(),
  quantity: z.number().int(),
  price: z.number(),
  createdAt: z.coerce.date().optional(),
});

export const insertOrderItemSchema = orderItemSchema.omit({ id: true, createdAt: true });
export type OrderItem = z.infer<typeof orderItemSchema>;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;

export const automationSchema = z.object({
  id: z.string().uuid(),
  businessId: z.string().uuid(),
  name: z.string(),
  trigger: z.string(),
  action: z.string(),
  status: z.enum(['active', 'inactive']),
  config: z.record(z.any()).nullable().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export const insertAutomationSchema = automationSchema.omit({ id: true, createdAt: true, updatedAt: true });
export type Automation = z.infer<typeof automationSchema>;
export type InsertAutomation = z.infer<typeof insertAutomationSchema>;

export const automationLogSchema = z.object({
  id: z.string().uuid(),
  automationId: z.string().uuid(),
  businessId: z.string().uuid(),
  status: z.enum(['success', 'failed']),
  metadata: z.record(z.any()).nullable().optional(),
  createdAt: z.coerce.date().optional(),
});

export const insertAutomationLogSchema = automationLogSchema.omit({ id: true, createdAt: true });
export type AutomationLog = z.infer<typeof automationLogSchema>;
export type InsertAutomationLog = z.infer<typeof insertAutomationLogSchema>;

export const nlpResultSchema = z.object({
  id: z.string().uuid(),
  messageId: z.string().uuid(),
  businessId: z.string().uuid(),
  sentiment: z.enum(['positive', 'negative', 'neutral']),
  confidence: z.number(),
  intent: z.string().nullable().optional(),
  metadata: z.record(z.any()).nullable().optional(),
  createdAt: z.coerce.date().optional(),
});

export const insertNlpResultSchema = nlpResultSchema.omit({ id: true, createdAt: true });
export type NlpResult = z.infer<typeof nlpResultSchema>;
export type InsertNlpResult = z.infer<typeof insertNlpResultSchema>;

export const analyticsDailySchema = z.object({
  id: z.string().uuid(),
  businessId: z.string().uuid(),
  date: z.string(),
  messagesSent: z.number().int(),
  messagesReceived: z.number().int(),
  ordersCount: z.number().int(),
  revenue: z.number(),
  newCustomers: z.number().int(),
  metadata: z.record(z.any()).nullable().optional(),
  createdAt: z.coerce.date().optional(),
});

export const insertAnalyticsDailySchema = analyticsDailySchema.omit({ id: true, createdAt: true });
export type AnalyticsDaily = z.infer<typeof analyticsDailySchema>;
export type InsertAnalyticsDaily = z.infer<typeof insertAnalyticsDailySchema>;

export const messageTemplateSchema = z.object({
  id: z.string().uuid(),
  businessId: z.string().uuid(),
  name: z.string(),
  category: z.enum(['marketing', 'utility', 'authentication', 'service']),
  content: z.string(),
  language: z.string(),
  variables: z.array(z.string()).nullable().optional(),
  status: z.enum(['draft', 'pending_approval', 'approved', 'rejected']),
  whatsappTemplateId: z.string().nullable().optional(),
  metadata: z.record(z.any()).nullable().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export const insertMessageTemplateSchema = messageTemplateSchema.omit({ id: true, createdAt: true, updatedAt: true });
export type MessageTemplate = z.infer<typeof messageTemplateSchema>;
export type InsertMessageTemplate = z.infer<typeof insertMessageTemplateSchema>;

export const broadcastSchema = z.object({
  id: z.string().uuid(),
  businessId: z.string().uuid(),
  templateId: z.string().uuid().nullable().optional(),
  name: z.string(),
  segmentId: z.string().uuid().nullable().optional(),
  status: z.enum(['draft', 'scheduled', 'sending', 'completed', 'failed']),
  scheduledFor: z.coerce.date().nullable().optional(),
  totalRecipients: z.number().int(),
  sentCount: z.number().int(),
  deliveredCount: z.number().int(),
  failedCount: z.number().int(),
  readCount: z.number().int(),
  metadata: z.record(z.any()).nullable().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  completedAt: z.coerce.date().nullable().optional(),
});

export const insertBroadcastSchema = broadcastSchema.omit({ id: true, createdAt: true, updatedAt: true, completedAt: true });
export type Broadcast = z.infer<typeof broadcastSchema>;
export type InsertBroadcast = z.infer<typeof insertBroadcastSchema>;

export const broadcastRecipientSchema = z.object({
  id: z.string().uuid(),
  broadcastId: z.string().uuid(),
  customerId: z.string().uuid(),
  status: z.enum(['pending', 'sent', 'delivered', 'read', 'failed']),
  sentAt: z.coerce.date().nullable().optional(),
  deliveredAt: z.coerce.date().nullable().optional(),
  readAt: z.coerce.date().nullable().optional(),
  failedAt: z.coerce.date().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  metadata: z.record(z.any()).nullable().optional(),
});

export const insertBroadcastRecipientSchema = broadcastRecipientSchema.omit({ id: true });
export type BroadcastRecipient = z.infer<typeof broadcastRecipientSchema>;
export type InsertBroadcastRecipient = z.infer<typeof insertBroadcastRecipientSchema>;

export type ConversationWithCustomer = Conversation & {
  customer: Customer;
};

export type MessageWithNlp = Message & {
  nlpResult?: NlpResult;
};

export type OrderWithCustomer = Order & {
  customer: Customer;
  items?: OrderItemWithProduct[];
};

export type OrderItemWithProduct = OrderItem & {
  product: Product;
};

export type AutomationWithLogs = Automation & {
  logs?: AutomationLog[];
};

export const customerSegmentSchema = z.object({
  id: z.string().uuid(),
  businessId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable().optional(),
  type: z.enum(['rfm', 'behavioral', 'custom', 'smart']),
  criteria: z.record(z.any()),
  isAutomatic: z.number().int(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export const insertCustomerSegmentSchema = customerSegmentSchema.omit({ id: true, createdAt: true, updatedAt: true });
export type CustomerSegment = z.infer<typeof customerSegmentSchema>;
export type InsertCustomerSegment = z.infer<typeof insertCustomerSegmentSchema>;

export const customerSegmentMembershipSchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid(),
  segmentId: z.string().uuid(),
  rfmScore: z.object({
    recency: z.number(),
    frequency: z.number(),
    monetary: z.number(),
  }).nullable().optional(),
  joinedAt: z.coerce.date().optional(),
});

export const insertCustomerSegmentMembershipSchema = customerSegmentMembershipSchema.omit({ id: true, joinedAt: true });
export type CustomerSegmentMembership = z.infer<typeof customerSegmentMembershipSchema>;
export type InsertCustomerSegmentMembership = z.infer<typeof insertCustomerSegmentMembershipSchema>;

export const workflowDefinitionSchema = z.object({
  id: z.string().uuid(),
  businessId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable().optional(),
  status: z.enum(['active', 'inactive', 'draft']),
  trigger: z.record(z.any()),
  nodes: z.array(z.any()),
  edges: z.array(z.any()),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export const insertWorkflowDefinitionSchema = workflowDefinitionSchema.omit({ id: true, createdAt: true, updatedAt: true });
export type WorkflowDefinition = z.infer<typeof workflowDefinitionSchema>;
export type InsertWorkflowDefinition = z.infer<typeof insertWorkflowDefinitionSchema>;

export const workflowExecutionSchema = z.object({
  id: z.string().uuid(),
  workflowId: z.string().uuid(),
  businessId: z.string().uuid(),
  status: z.enum(['running', 'completed', 'failed', 'cancelled']),
  context: z.record(z.any()).nullable().optional(),
  currentNodeId: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
  startedAt: z.coerce.date().optional(),
  completedAt: z.coerce.date().nullable().optional(),
});

export const insertWorkflowExecutionSchema = workflowExecutionSchema.omit({ id: true, startedAt: true });
export type WorkflowExecution = z.infer<typeof workflowExecutionSchema>;
export type InsertWorkflowExecution = z.infer<typeof insertWorkflowExecutionSchema>;

export const webhookSchema = z.object({
  id: z.string().uuid(),
  businessId: z.string().uuid(),
  name: z.string(),
  url: z.string(),
  method: z.string(),
  headers: z.record(z.string()).nullable().optional(),
  events: z.array(z.string()),
  status: z.enum(['active', 'inactive']),
  secret: z.string().nullable().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export const insertWebhookSchema = webhookSchema.omit({ id: true, createdAt: true, updatedAt: true });
export type Webhook = z.infer<typeof webhookSchema>;
export type InsertWebhook = z.infer<typeof insertWebhookSchema>;

export const webhookLogSchema = z.object({
  id: z.string().uuid(),
  webhookId: z.string().uuid(),
  event: z.string(),
  payload: z.record(z.any()).nullable().optional(),
  response: z.record(z.any()).nullable().optional(),
  statusCode: z.number().int().nullable().optional(),
  success: z.number().int(),
  error: z.string().nullable().optional(),
  createdAt: z.coerce.date().optional(),
});

export const insertWebhookLogSchema = webhookLogSchema.omit({ id: true, createdAt: true });
export type WebhookLog = z.infer<typeof webhookLogSchema>;
export type InsertWebhookLog = z.infer<typeof insertWebhookLogSchema>;

export const customDashboardSchema = z.object({
  id: z.string().uuid(),
  businessId: z.string().uuid(),
  name: z.string(),
  layout: z.array(z.any()),
  isDefault: z.number().int(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export const insertCustomDashboardSchema = customDashboardSchema.omit({ id: true, createdAt: true, updatedAt: true });
export type CustomDashboard = z.infer<typeof customDashboardSchema>;
export type InsertCustomDashboard = z.infer<typeof insertCustomDashboardSchema>;

export const scheduledReportSchema = z.object({
  id: z.string().uuid(),
  businessId: z.string().uuid(),
  name: z.string(),
  reportType: z.string(),
  schedule: z.string(),
  recipients: z.array(z.object({
    type: z.enum(['email', 'whatsapp']),
    value: z.string(),
  })),
  filters: z.record(z.any()).nullable().optional(),
  status: z.enum(['active', 'inactive']),
  lastSentAt: z.coerce.date().nullable().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export const insertScheduledReportSchema = scheduledReportSchema.omit({ id: true, createdAt: true, updatedAt: true });
export type ScheduledReport = z.infer<typeof scheduledReportSchema>;
export type InsertScheduledReport = z.infer<typeof insertScheduledReportSchema>;

export type CustomerWithSegments = Customer & {
  segments?: CustomerSegment[];
  rfmScore?: { recency: number; frequency: number; monetary: number };
};

export type WorkflowDefinitionWithExecutions = WorkflowDefinition & {
  executions?: WorkflowExecution[];
};
