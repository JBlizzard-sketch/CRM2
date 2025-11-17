import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { analyzeMessageSentiment } from "./groq-client";
import { calculateRFMScore, evaluateSegmentCriteria } from "./segmentation-engine";
import {
  insertCustomerSchema,
  insertConversationSchema,
  insertMessageSchema,
  insertProductSchema,
  insertOrderSchema,
  insertAutomationSchema,
  insertAnalyticsDailySchema,
  insertAutomationLogSchema,
  insertNlpResultSchema,
  insertCustomerSegmentSchema,
  insertCustomerSegmentMembershipSchema,
  insertMessageTemplateSchema,
  insertBroadcastSchema,
  insertBroadcastRecipientSchema,
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Businesses
  app.get("/api/businesses", async (req, res) => {
    try {
      const businesses = await storage.getBusinesses();
      res.json(businesses);
    } catch (error) {
      console.error("Error fetching businesses:", error);
      res.status(500).json({ error: "Failed to fetch businesses" });
    }
  });

  app.get("/api/businesses/:id", async (req, res) => {
    try {
      const business = await storage.getBusiness(req.params.id);
      if (!business) {
        return res.status(404).json({ error: "Business not found" });
      }
      res.json(business);
    } catch (error) {
      console.error("Error fetching business:", error);
      res.status(500).json({ error: "Failed to fetch business" });
    }
  });

  // Customers
  app.get("/api/customers/:businessId", async (req, res) => {
    try {
      const customers = await storage.getCustomers(req.params.businessId);
      const orders = await storage.getOrders(req.params.businessId);
      
      // Calculate CLV for each customer
      const customersWithCLV = customers.map(customer => {
        const customerOrders = orders.filter(o => o.customerId === customer.id);
        const lifetimeValue = customerOrders
          .filter(o => o.status === 'delivered')
          .reduce((sum, order) => sum + order.total, 0);
        
        return {
          ...customer,
          lifetimeValue
        };
      });
      
      res.json(customersWithCLV);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  app.post("/api/customers", async (req, res) => {
    try {
      const validated = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(validated);
      
      // Trigger new_customer automation event
      const { triggerAutomationEvent } = await import('./automation-engine');
      await triggerAutomationEvent({
        type: 'new_customer',
        data: {
          customerId: customer.id,
          businessId: customer.businessId,
        },
      });
      
      res.status(201).json(customer);
    } catch (error) {
      console.error("Error creating customer:", error);
      res.status(400).json({ error: "Invalid customer data" });
    }
  });

  app.patch("/api/customers/:id", async (req, res) => {
    try {
      const customer = await storage.updateCustomer(req.params.id, req.body);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      console.error("Error updating customer:", error);
      res.status(500).json({ error: "Failed to update customer" });
    }
  });

  // Conversations
  app.get("/api/conversations/:businessId", async (req, res) => {
    try {
      const conversations = await storage.getConversations(req.params.businessId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.post("/api/conversations", async (req, res) => {
    try {
      const validated = insertConversationSchema.parse(req.body);
      const conversation = await storage.createConversation(validated);
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(400).json({ error: "Invalid conversation data" });
    }
  });

  app.patch("/api/conversations/:id", async (req, res) => {
    try {
      const conversation = await storage.updateConversation(req.params.id, req.body);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      res.json(conversation);
    } catch (error) {
      console.error("Error updating conversation:", error);
      res.status(500).json({ error: "Failed to update conversation" });
    }
  });

  // Messages
  app.get("/api/messages/:conversationId", async (req, res) => {
    try {
      const messages = await storage.getMessages(req.params.conversationId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const validated = insertMessageSchema.parse(req.body);
      const message = await storage.createMessage(validated);

      // Send via Twilio if outbound and WhatsApp/SMS
      if (validated.direction === 'outbound' && (validated.channel === 'whatsapp' || validated.channel === 'sms')) {
        try {
          const { getTwilioClient, getTwilioPhoneNumber } = await import('./twilio-client');
          const client = await getTwilioClient();
          const fromNumber = await getTwilioPhoneNumber();

          const conversation = await storage.getConversation(validated.conversationId);
          if (conversation) {
            const customer = await storage.getCustomer(conversation.customerId);
            if (customer) {
              const to = validated.channel === 'whatsapp' 
                ? `whatsapp:${customer.phone}`
                : customer.phone;

              await client.messages.create({
                from: fromNumber,
                to,
                body: validated.content,
              });

              console.log(`Sent ${validated.channel} message to ${customer.phone}`);
            }
          }
        } catch (twilioError) {
          console.error("Error sending Twilio message:", twilioError);
        }
      }

      // Optionally analyze sentiment with Groq
      if (validated.direction === 'inbound') {
        const sentiment = await analyzeMessageSentiment(validated.content);
        if (sentiment) {
          try {
            await storage.createNlpResult({
              messageId: message.id,
              businessId: validated.businessId,
              sentiment: sentiment.sentiment,
              confidence: sentiment.confidence,
              intent: sentiment.intent || null,
              metadata: null,
            });
          } catch (nlpError) {
            console.error("Error creating NLP result:", nlpError);
          }
        }
      }

      res.status(201).json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(400).json({ error: "Invalid message data" });
    }
  });

  // NLP Results
  app.get("/api/nlp-results/:conversationId", async (req, res) => {
    try {
      const nlpResults = await storage.getNlpResultsByConversation(req.params.conversationId);
      res.json(nlpResults);
    } catch (error) {
      console.error("Error fetching NLP results:", error);
      res.status(500).json({ error: "Failed to fetch NLP results" });
    }
  });

  app.get("/api/nlp-results/message/:messageId", async (req, res) => {
    try {
      const nlpResult = await storage.getNlpResultByMessage(req.params.messageId);
      res.json(nlpResult || null);
    } catch (error) {
      console.error("Error fetching NLP result:", error);
      res.status(500).json({ error: "Failed to fetch NLP result" });
    }
  });

  // Products
  app.get("/api/products/:businessId", async (req, res) => {
    try {
      const products = await storage.getProducts(req.params.businessId);
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      const validated = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(validated);
      res.status(201).json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(400).json({ error: "Invalid product data" });
    }
  });

  app.patch("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.updateProduct(req.params.id, req.body);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ error: "Failed to update product" });
    }
  });

  // Orders
  app.get("/api/orders/:businessId", async (req, res) => {
    try {
      const orders = await storage.getOrders(req.params.businessId);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const validated = insertOrderSchema.parse(req.body);
      const order = await storage.createOrder(validated);
      
      // Trigger order_placed automation event
      const { triggerAutomationEvent } = await import('./automation-engine');
      await triggerAutomationEvent({
        type: 'order_placed',
        data: {
          orderId: order.id,
          customerId: order.customerId,
          businessId: order.businessId,
          total: order.total,
        },
      });
      
      res.status(201).json(order);
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(400).json({ error: "Invalid order data" });
    }
  });

  app.patch("/api/orders/:id", async (req, res) => {
    try {
      const order = await storage.updateOrder(req.params.id, req.body);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      // Trigger order_status_changed automation event if status changed
      if (req.body.status) {
        const { triggerAutomationEvent } = await import('./automation-engine');
        await triggerAutomationEvent({
          type: 'order_status_changed',
          data: {
            orderId: order.id,
            customerId: order.customerId,
            businessId: order.businessId,
            status: req.body.status,
          },
        });
      }
      
      res.json(order);
    } catch (error) {
      console.error("Error updating order:", error);
      res.status(500).json({ error: "Failed to update order" });
    }
  });

  // Order Items
  app.get("/api/order-items/:orderId", async (req, res) => {
    try {
      const items = await storage.getOrderItems(req.params.orderId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching order items:", error);
      res.status(500).json({ error: "Failed to fetch order items" });
    }
  });

  // Automations
  app.get("/api/automations/:businessId", async (req, res) => {
    try {
      const automations = await storage.getAutomations(req.params.businessId);
      res.json(automations);
    } catch (error) {
      console.error("Error fetching automations:", error);
      res.status(500).json({ error: "Failed to fetch automations" });
    }
  });

  app.post("/api/automations", async (req, res) => {
    try {
      const validated = insertAutomationSchema.parse(req.body);
      const automation = await storage.createAutomation(validated);
      res.status(201).json(automation);
    } catch (error) {
      console.error("Error creating automation:", error);
      res.status(400).json({ error: "Invalid automation data" });
    }
  });

  app.patch("/api/automations/:id", async (req, res) => {
    try {
      const automation = await storage.updateAutomation(req.params.id, req.body);
      if (!automation) {
        return res.status(404).json({ error: "Automation not found" });
      }
      res.json(automation);
    } catch (error) {
      console.error("Error updating automation:", error);
      res.status(500).json({ error: "Failed to update automation" });
    }
  });

  app.post("/api/automations/:id/trigger", async (req, res) => {
    try {
      const automation = await storage.getAutomation(req.params.id);
      if (!automation) {
        return res.status(404).json({ error: "Automation not found" });
      }

      if (automation.status === 'inactive') {
        return res.status(400).json({ error: "Automation is inactive" });
      }

      // Log the execution
      const log = await storage.createAutomationLog({
        automationId: automation.id,
        businessId: automation.businessId,
        status: 'success',
        metadata: { triggered_at: new Date().toISOString(), manual: true },
      });

      res.json({ message: "Automation triggered successfully", log });
    } catch (error) {
      console.error("Error triggering automation:", error);
      res.status(500).json({ error: "Failed to trigger automation" });
    }
  });

  // Automation Logs
  app.get("/api/automation-logs/:automationId", async (req, res) => {
    try {
      const logs = await storage.getAutomationLogs(req.params.automationId);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching automation logs:", error);
      res.status(500).json({ error: "Failed to fetch automation logs" });
    }
  });

  // Analytics
  app.get("/api/analytics/:businessId", async (req, res) => {
    try {
      const { start, end } = req.query;
      const analytics = await storage.getAnalytics(
        req.params.businessId,
        start as string | undefined,
        end as string | undefined
      );
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // Twilio Webhook Handler
  app.post("/api/webhooks/twilio", async (req, res) => {
    try {
      // Validate Twilio signature for security
      const { getTwilioAuthToken } = await import('./twilio-client');
      
      try {
        const twilioAuthToken = await getTwilioAuthToken();
        const twilioModule = await import('twilio');
        const signature = req.headers['x-twilio-signature'] as string;
        const url = `https://${req.headers.host}${req.url}`;
        
        const isValid = twilioModule.default.validateRequest(
          twilioAuthToken,
          signature,
          url,
          req.body
        );
        
        if (!isValid) {
          console.error("Invalid Twilio webhook signature");
          return res.status(403).json({ error: "Invalid signature" });
        }
        
        console.log("Twilio webhook signature validated successfully");
      } catch (validationError) {
        console.error("Error validating Twilio webhook signature:", validationError);
        return res.status(500).json({ error: "Signature validation failed" });
      }

      const { From, To, Body, MessageSid } = req.body;
      const cleanFrom = From.replace('whatsapp:', '');

      console.log("Received Twilio webhook:", { From: cleanFrom, To, Body, MessageSid });

      // Get the first business (in production, you'd match by phone number)
      const businesses = await storage.getBusinesses();
      if (businesses.length === 0) {
        console.warn("No businesses found for incoming webhook");
        return res.status(200).send("OK");
      }
      const business = businesses[0];

      // Find or create customer using helper method
      let customer = await storage.findCustomerByPhone(business.id, cleanFrom);
      
      const isNewCustomer = !customer;
      if (!customer) {
        customer = await storage.createCustomer({
          businessId: business.id,
          name: cleanFrom,
          phone: cleanFrom,
        });
        console.log("Created new customer:", customer.id);
        
        // Trigger new_customer automation event
        const { triggerAutomationEvent: triggerEvent } = await import('./automation-engine');
        await triggerEvent({
          type: 'new_customer',
          data: {
            customerId: customer.id,
            businessId: business.id,
          },
        });
      }

      // Find or create conversation using helper method
      let conversation = await storage.findConversationByCustomerAndChannel(customer.id, 'whatsapp');
      
      if (!conversation) {
        conversation = await storage.createConversation({
          businessId: business.id,
          customerId: customer.id,
          channel: 'whatsapp',
          status: 'open',
        });
        console.log("Created new conversation:", conversation.id);
      }

      // Update conversation's last message time
      await storage.updateConversation(conversation.id, {
        lastMessageAt: new Date(),
      });

      // Create message
      const message = await storage.createMessage({
        businessId: business.id,
        conversationId: conversation.id,
        direction: 'inbound',
        content: Body || '',
        channel: 'whatsapp',
        metadata: { messageSid: MessageSid },
      });

      console.log("Created message:", message.id);

      // Trigger automation events
      const { triggerAutomationEvent } = await import('./automation-engine');
      
      // Trigger new_message event
      await triggerAutomationEvent({
        type: 'new_message',
        data: {
          messageId: message.id,
          customerId: customer.id,
          businessId: business.id,
          content: Body || '',
        },
      });

      // Generate AI response suggestion (doesn't send automatically)
      try {
        const { generateAIResponse } = await import('./ai-message-handler');
        const products = await storage.getProducts(business.id);
        const previousMessages = await storage.getMessages(conversation.id);
        
        const aiResponse = await generateAIResponse(Body || '', {
          customer,
          previousMessages: previousMessages.slice(-10),
          products: products.slice(0, 20),
          businessName: business.name,
        });

        if (aiResponse) {
          console.log(`AI Suggestion: "${aiResponse.suggestedReply}" (Intent: ${aiResponse.intent}, Confidence: ${aiResponse.confidence})`);
          // Store AI metadata with the message for later retrieval
          await storage.createMessage({
            businessId: business.id,
            conversationId: conversation.id,
            direction: 'outbound',
            content: aiResponse.suggestedReply,
            channel: 'whatsapp',
            metadata: { 
              aiGenerated: true,
              intent: aiResponse.intent,
              confidence: aiResponse.confidence,
              autoSend: false, // Don't auto-send, just provide suggestion
            },
          });
        }
      } catch (aiError) {
        console.error("Error generating AI response:", aiError);
        // Continue without AI - graceful degradation
      }

      res.status(200).send("OK");
    } catch (error) {
      console.error("Error handling Twilio webhook:", error);
      res.status(500).json({ error: "Failed to process webhook" });
    }
  });

  // Customer Segments
  app.get("/api/segments/:businessId", async (req, res) => {
    try {
      const segments = await storage.getSegments(req.params.businessId);
      res.json(segments);
    } catch (error) {
      console.error("Error fetching segments:", error);
      res.status(500).json({ error: "Failed to fetch segments" });
    }
  });

  app.post("/api/segments", async (req, res) => {
    try {
      const validated = insertCustomerSegmentSchema.parse(req.body);
      const segment = await storage.createSegment(validated);
      res.status(201).json(segment);
    } catch (error) {
      console.error("Error creating segment:", error);
      res.status(400).json({ error: "Invalid segment data" });
    }
  });

  app.get("/api/segments/single/:id", async (req, res) => {
    try {
      const segment = await storage.getSegment(req.params.id);
      if (!segment) {
        return res.status(404).json({ error: "Segment not found" });
      }
      res.json(segment);
    } catch (error) {
      console.error("Error fetching segment:", error);
      res.status(500).json({ error: "Failed to fetch segment" });
    }
  });

  app.patch("/api/segments/:id", async (req, res) => {
    try {
      const validated = insertCustomerSegmentSchema.partial().parse(req.body);
      const segment = await storage.updateSegment(req.params.id, validated);
      if (!segment) {
        return res.status(404).json({ error: "Segment not found" });
      }
      res.json(segment);
    } catch (error) {
      console.error("Error updating segment:", error);
      if (error instanceof Error && error.message.includes('parse')) {
        return res.status(400).json({ error: "Invalid segment data" });
      }
      res.status(500).json({ error: "Failed to update segment" });
    }
  });

  app.delete("/api/segments/:id", async (req, res) => {
    try {
      const success = await storage.deleteSegment(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Segment not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting segment:", error);
      res.status(500).json({ error: "Failed to delete segment" });
    }
  });

  app.get("/api/segments/:id/customers", async (req, res) => {
    try {
      const memberships = await storage.getSegmentMemberships(req.params.id);
      const membershipMap = new Map(memberships.map(m => [m.customerId, m]));
      
      const segment = await storage.getSegment(req.params.id);
      if (!segment) {
        return res.status(404).json({ error: "Segment not found" });
      }
      
      const allCustomers = await storage.getCustomers(segment.businessId);
      const customersInSegment = allCustomers
        .filter(c => membershipMap.has(c.id))
        .map(customer => {
          const membership = membershipMap.get(customer.id)!;
          return {
            ...customer,
            rfmScore: membership.rfmScore,
            joinedAt: membership.joinedAt,
          };
        });
      
      res.json(customersInSegment);
    } catch (error) {
      console.error("Error fetching segment customers:", error);
      res.status(500).json({ error: "Failed to fetch segment customers" });
    }
  });

  app.post("/api/segments/:id/refresh", async (req, res) => {
    try {
      const segment = await storage.getSegment(req.params.id);
      if (!segment) {
        return res.status(404).json({ error: "Segment not found" });
      }

      const customers = await storage.getCustomers(segment.businessId);
      const orders = await storage.getOrders(segment.businessId);

      const eligibleCustomers = [];
      
      for (const customer of customers) {
        const customerOrders = orders.filter(o => o.customerId === customer.id);
        const isEligible = evaluateSegmentCriteria(customer, customerOrders, segment.criteria || {});
        
        if (isEligible) {
          eligibleCustomers.push(customer);
        }
      }

      // Clear existing memberships and add new ones
      const existingMemberships = await storage.getSegmentMemberships(segment.id);
      for (const membership of existingMemberships) {
        await storage.removeCustomerFromSegment(membership.customerId, segment.id);
      }

      for (const customer of eligibleCustomers) {
        const customerOrders = orders.filter(o => o.customerId === customer.id);
        const totalSpent = customerOrders.reduce((sum, order) => sum + order.total, 0);
        const orderCount = customerOrders.length;
        const lastOrderDate = customerOrders.length > 0
          ? new Date(Math.max(...customerOrders.map(o => new Date(o.createdAt || 0).getTime())))
          : null;
        
        const rfmScore = calculateRFMScore(lastOrderDate, orderCount, totalSpent);
        
        await storage.addCustomerToSegment({
          customerId: customer.id,
          segmentId: segment.id,
          rfmScore,
        });
      }

      res.json({ 
        success: true, 
        customerCount: eligibleCustomers.length,
        message: `Segment refreshed with ${eligibleCustomers.length} customers`
      });
    } catch (error) {
      console.error("Error refreshing segment:", error);
      res.status(500).json({ error: "Failed to refresh segment" });
    }
  });

  app.post("/api/segments/:id/add-customer", async (req, res) => {
    try {
      const { customerId } = req.body;
      if (!customerId) {
        return res.status(400).json({ error: "customerId is required" });
      }

      const segment = await storage.getSegment(req.params.id);
      if (!segment) {
        return res.status(404).json({ error: "Segment not found" });
      }

      const allCustomers = await storage.getCustomers(segment.businessId);
      const customer = allCustomers.find(c => c.id === customerId);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }

      const orders = await storage.getOrders(segment.businessId);
      const customerOrders = orders.filter(o => o.customerId === customerId);
      const totalSpent = customerOrders.reduce((sum, order) => sum + order.total, 0);
      const orderCount = customerOrders.length;
      const lastOrderDate = customerOrders.length > 0
        ? new Date(Math.max(...customerOrders.map(o => new Date(o.createdAt || 0).getTime())))
        : null;
      
      const rfmScore = calculateRFMScore(lastOrderDate, orderCount, totalSpent);

      const membership = await storage.addCustomerToSegment({
        customerId,
        segmentId: req.params.id,
        rfmScore,
      });

      res.status(201).json(membership);
    } catch (error) {
      console.error("Error adding customer to segment:", error);
      res.status(500).json({ error: "Failed to add customer to segment" });
    }
  });

  app.delete("/api/segments/:segmentId/remove-customer/:customerId", async (req, res) => {
    try {
      const memberships = await storage.getSegmentMemberships(req.params.segmentId);
      const membership = memberships.find(m => m.customerId === req.params.customerId);
      
      if (!membership) {
        return res.status(404).json({ error: "Customer not in segment" });
      }

      const success = await storage.removeCustomerFromSegment(req.params.customerId, req.params.segmentId);
      res.json({ success });
    } catch (error) {
      console.error("Error removing customer from segment:", error);
      res.status(500).json({ error: "Failed to remove customer from segment" });
    }
  });

  // Export endpoints
  // NOTE: In production, these should be protected with authentication/authorization
  // For demo purposes, they validate business existence but don't enforce user ownership
  app.get("/api/export/customers/:businessId/:format", async (req, res) => {
    try {
      const { businessId, format } = req.params;
      
      // Validate input parameters
      if (!businessId || !['csv', 'excel', 'pdf'].includes(format)) {
        return res.status(400).json({ error: 'Invalid businessId or format' });
      }

      // Validate business exists (in production, also check user has access)
      const business = await storage.getBusiness(businessId);
      if (!business) {
        return res.status(404).json({ error: 'Business not found' });
      }

      // TODO: Add rate limiting and user authentication in production

      const { ExportService } = await import("./export-service");
      const exportService = new ExportService();
      const customers = await storage.getCustomers(businessId);
      const prepared = exportService.prepareCustomersForExport(customers);
      const filename = `customers-${Date.now()}`;
      
      if (format === 'csv') {
        const buffer = await exportService.exportToCSV(prepared, filename);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
        res.send(buffer);
      } else if (format === 'excel') {
        const buffer = await exportService.exportToExcel([{ name: 'Customers', data: prepared }], filename);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
        res.send(buffer);
      } else if (format === 'pdf') {
        const headers = Object.keys(prepared[0] || {});
        const data = prepared.map(row => Object.values(row));
        const buffer = await exportService.exportToPDF('Customers Report', headers, data, filename);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
        res.send(buffer);
      } else {
        res.status(400).json({ error: 'Invalid format' });
      }
    } catch (error) {
      console.error("Error exporting customers:", error);
      res.status(500).json({ error: "Failed to export customers" });
    }
  });

  app.get("/api/export/orders/:businessId/:format", async (req, res) => {
    try {
      const { businessId, format } = req.params;
      
      if (!businessId || !['csv', 'excel', 'pdf'].includes(format)) {
        return res.status(400).json({ error: 'Invalid businessId or format' });
      }

      const business = await storage.getBusiness(businessId);
      if (!business) {
        return res.status(404).json({ error: 'Business not found' });
      }

      const { ExportService } = await import("./export-service");
      const exportService = new ExportService();
      const orders = await storage.getOrders(businessId);
      const prepared = exportService.prepareOrdersForExport(orders);
      const filename = `orders-${Date.now()}`;
      
      if (format === 'csv') {
        const buffer = await exportService.exportToCSV(prepared, filename);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
        res.send(buffer);
      } else if (format === 'excel') {
        const buffer = await exportService.exportToExcel([{ name: 'Orders', data: prepared }], filename);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
        res.send(buffer);
      } else if (format === 'pdf') {
        const headers = Object.keys(prepared[0] || {});
        const data = prepared.map(row => Object.values(row));
        const buffer = await exportService.exportToPDF('Orders Report', headers, data, filename);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
        res.send(buffer);
      } else {
        res.status(400).json({ error: 'Invalid format' });
      }
    } catch (error) {
      console.error("Error exporting orders:", error);
      res.status(500).json({ error: "Failed to export orders" });
    }
  });

  app.get("/api/export/analytics/:businessId/:format", async (req, res) => {
    try {
      const { businessId, format } = req.params;
      
      if (!businessId || !['csv', 'excel', 'pdf'].includes(format)) {
        return res.status(400).json({ error: 'Invalid businessId or format' });
      }

      const business = await storage.getBusiness(businessId);
      if (!business) {
        return res.status(404).json({ error: 'Business not found' });
      }

      const { ExportService } = await import("./export-service");
      const exportService = new ExportService();
      const analytics = await storage.getAnalytics(businessId);
      const prepared = exportService.prepareAnalyticsForExport(analytics);
      const filename = `analytics-${Date.now()}`;
      
      if (format === 'csv') {
        const buffer = await exportService.exportToCSV(prepared, filename);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
        res.send(buffer);
      } else if (format === 'excel') {
        const buffer = await exportService.exportToExcel([{ name: 'Analytics', data: prepared }], filename);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
        res.send(buffer);
      } else if (format === 'pdf') {
        const headers = Object.keys(prepared[0] || {});
        const data = prepared.map(row => Object.values(row));
        const buffer = await exportService.exportToPDF('Analytics Report', headers, data, filename);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
        res.send(buffer);
      } else {
        res.status(400).json({ error: 'Invalid format' });
      }
    } catch (error) {
      console.error("Error exporting analytics:", error);
      res.status(500).json({ error: "Failed to export analytics" });
    }
  });

  // Enhanced NLP endpoint
  app.post("/api/nlp/analyze", async (req, res) => {
    try {
      const { enhancedMessageAnalysis } = await import("./nlp-enhanced");
      const { message, context } = req.body;
      const result = await enhancedMessageAnalysis(message, context);
      res.json(result);
    } catch (error) {
      console.error("Error analyzing message:", error);
      res.status(500).json({ error: "Failed to analyze message" });
    }
  });

  // AI Message Suggestion endpoint
  app.post("/api/ai/suggest-reply", async (req, res) => {
    try {
      const { generateAIResponse } = await import('./ai-message-handler');
      const { message, conversationId, businessId } = req.body;

      if (!message || !conversationId || !businessId) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      const customer = await storage.getCustomer(conversation.customerId);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }

      const business = await storage.getBusiness(businessId);
      const products = await storage.getProducts(businessId);
      const previousMessages = await storage.getMessages(conversationId);

      const aiResponse = await generateAIResponse(message, {
        customer,
        previousMessages: previousMessages.slice(-10),
        products: products.slice(0, 20),
        businessName: business?.name || 'Business',
      });

      res.json(aiResponse || { 
        suggestedReply: 'Thank you for your message!',
        intent: 'general',
        keywordsDetected: [],
        shouldAutoRespond: false,
        sentiment: 'neutral',
        confidence: 0.5,
        extractedEntities: {},
      });
    } catch (error) {
      console.error("Error generating AI suggestion:", error);
      res.status(500).json({ error: "Failed to generate AI suggestion" });
    }
  });

  // Workflow Execution
  // Workflow CRUD routes
  app.get("/api/workflows", async (req, res) => {
    try {
      const { businessId, id } = req.query;
      
      if (id && typeof id === 'string') {
        // Get single workflow by ID
        const workflow = await storage.getWorkflow(id);
        if (!workflow) {
          return res.status(404).json({ error: "Workflow not found" });
        }
        return res.json(workflow);
      }
      
      if (businessId && typeof businessId === 'string') {
        // Get all workflows for business
        const workflows = await storage.getWorkflows(businessId);
        return res.json(workflows);
      }
      
      return res.status(400).json({ error: "Missing businessId or id parameter" });
    } catch (error) {
      console.error("Error fetching workflows:", error);
      res.status(500).json({ error: "Failed to fetch workflows" });
    }
  });

  app.post("/api/workflows", async (req, res) => {
    try {
      const workflow = await storage.createWorkflow(req.body);
      res.status(201).json(workflow);
    } catch (error) {
      console.error("Error creating workflow:", error);
      res.status(500).json({ error: "Failed to create workflow" });
    }
  });

  app.patch("/api/workflows/:id", async (req, res) => {
    try {
      const workflow = await storage.updateWorkflow(req.params.id, req.body);
      if (!workflow) {
        return res.status(404).json({ error: "Workflow not found" });
      }
      res.json(workflow);
    } catch (error) {
      console.error("Error updating workflow:", error);
      res.status(500).json({ error: "Failed to update workflow" });
    }
  });

  app.delete("/api/workflows/:id", async (req, res) => {
    try {
      const success = await storage.deleteWorkflow(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Workflow not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting workflow:", error);
      res.status(500).json({ error: "Failed to delete workflow" });
    }
  });

  app.post("/api/workflows/:id/execute", async (req, res) => {
    try {
      const { WorkflowEngine } = await import("./workflow-engine");
      const engine = new WorkflowEngine(storage);
      
      const execution = await engine.executeWorkflow(req.params.id, req.body.context || {});
      res.status(201).json(execution);
    } catch (error: any) {
      console.error("Error executing workflow:", error);
      res.status(500).json({ error: error.message || "Failed to execute workflow" });
    }
  });

  // Webhook Test
  app.post("/api/webhooks/:id/test", async (req, res) => {
    try {
      const webhook = await storage.getWebhook(req.params.id);
      if (!webhook) {
        return res.status(404).json({ error: "Webhook not found" });
      }

      const { WebhookDispatcher } = await import("./webhook-dispatcher");
      const dispatcher = new WebhookDispatcher(storage);
      
      const testData = req.body.testData || { test: true };
      await dispatcher.dispatch('message.received', webhook.businessId, testData);
      
      res.json({ message: "Test webhook dispatched successfully" });
    } catch (error) {
      console.error("Error testing webhook:", error);
      res.status(500).json({ error: "Failed to test webhook" });
    }
  });

  // Demo Data Generator
  app.post("/api/demo/generate", async (req, res) => {
    try {
      const { generateDemoData } = await import("./demo-data-generator");
      await generateDemoData();
      res.json({ message: "Demo data generated successfully" });
    } catch (error) {
      console.error("Error generating demo data:", error);
      res.status(500).json({ error: "Failed to generate demo data" });
    }
  });

  // Message Templates
  app.get("/api/templates/:businessId", async (req, res) => {
    try {
      const templates = await storage.getTemplates(req.params.businessId);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  app.post("/api/templates/:businessId", async (req, res) => {
    try {
      const { businessId } = req.params;
      const validated = insertMessageTemplateSchema.parse(req.body);
      
      // Ensure the businessId in path matches payload to prevent cross-business creation
      if (validated.businessId !== businessId) {
        return res.status(403).json({ error: "businessId mismatch" });
      }
      
      const template = await storage.createTemplate(validated);
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating template:", error);
      res.status(400).json({ error: "Invalid template data" });
    }
  });

  app.get("/api/templates/single/:id", async (req, res) => {
    try {
      const template = await storage.getTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error fetching template:", error);
      res.status(500).json({ error: "Failed to fetch template" });
    }
  });

  app.put("/api/templates/single/:id", async (req, res) => {
    try {
      const { id } = req.params;
      // Require businessId from request to verify ownership
      const requestBusinessId = req.body._businessId || req.query.businessId;
      if (!requestBusinessId) {
        return res.status(400).json({ error: "businessId required for verification" });
      }
      
      // Fetch existing template first to verify ownership
      const existing = await storage.getTemplate(id);
      if (!existing) {
        return res.status(404).json({ error: "Template not found" });
      }
      
      // ALWAYS verify ownership - prevent modifying templates from other businesses
      if (existing.businessId !== requestBusinessId) {
        return res.status(403).json({ error: "Cannot modify templates from other businesses" });
      }
      
      // Parse and validate with strict whitelisting - strips unknown keys
      const payload = insertMessageTemplateSchema
        .pick({ 
          name: true, 
          category: true, 
          content: true, 
          language: true, 
          variables: true, 
          whatsappTemplateId: true, 
          metadata: true 
        })
        .partial()
        .strict()  // strips unknown keys
        .parse(req.body);

      // Build update data from validated payload
      const updateData: Partial<InsertMessageTemplate> = {};
      const fields: (keyof typeof payload)[] = ['name', 'category', 'content', 'language', 'variables', 'whatsappTemplateId', 'metadata'];
      for (const field of fields) {
        if (payload[field] !== undefined) {
          updateData[field] = payload[field];
        }
      }
      
      const template = await storage.updateTemplate(id, updateData);
      
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      
      res.json(template);
    } catch (error) {
      console.error("Error updating template:", error);
      if (error instanceof Error && error.message.includes('parse')) {
        return res.status(400).json({ error: "Invalid template data" });
      }
      res.status(500).json({ error: "Failed to update template" });
    }
  });

  app.delete("/api/templates/single/:id", async (req, res) => {
    try {
      const { id } = req.params;
      // Require businessId from request to verify ownership
      const requestBusinessId = req.body.businessId || req.query.businessId;
      if (!requestBusinessId) {
        return res.status(400).json({ error: "businessId required for verification" });
      }
      
      // Fetch existing template first to verify ownership
      const existing = await storage.getTemplate(id);
      if (!existing) {
        return res.status(404).json({ error: "Template not found" });
      }
      
      // ALWAYS verify ownership - prevent deleting templates from other businesses
      if (existing.businessId !== requestBusinessId) {
        return res.status(403).json({ error: "Cannot delete templates from other businesses" });
      }
      
      const success = await storage.deleteTemplate(id);
      if (!success) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting template:", error);
      res.status(500).json({ error: "Failed to delete template" });
    }
  });

  // Broadcasts
  app.get("/api/broadcasts/:businessId", async (req, res) => {
    try {
      const broadcasts = await storage.getBroadcasts(req.params.businessId);
      res.json(broadcasts);
    } catch (error) {
      console.error("Error fetching broadcasts:", error);
      res.status(500).json({ error: "Failed to fetch broadcasts" });
    }
  });

  app.post("/api/broadcasts/:businessId", async (req, res) => {
    try {
      const { businessId } = req.params;
      const validated = insertBroadcastSchema.parse(req.body);
      
      // Ensure the businessId in path matches payload to prevent cross-business creation
      if (validated.businessId !== businessId) {
        return res.status(403).json({ error: "businessId mismatch" });
      }
      
      const broadcast = await storage.createBroadcast(validated);
      res.status(201).json(broadcast);
    } catch (error) {
      console.error("Error creating broadcast:", error);
      res.status(400).json({ error: "Invalid broadcast data" });
    }
  });

  app.get("/api/broadcasts/single/:id", async (req, res) => {
    try {
      const broadcast = await storage.getBroadcast(req.params.id);
      if (!broadcast) {
        return res.status(404).json({ error: "Broadcast not found" });
      }
      res.json(broadcast);
    } catch (error) {
      console.error("Error fetching broadcast:", error);
      res.status(500).json({ error: "Failed to fetch broadcast" });
    }
  });

  app.put("/api/broadcasts/single/:id", async (req, res) => {
    try {
      const { id } = req.params;
      // Require businessId from request to verify ownership
      const requestBusinessId = req.body._businessId || req.query.businessId;
      if (!requestBusinessId) {
        return res.status(400).json({ error: "businessId required for verification" });
      }
      
      // Fetch existing broadcast first to verify ownership
      const existing = await storage.getBroadcast(id);
      if (!existing) {
        return res.status(404).json({ error: "Broadcast not found" });
      }
      
      // ALWAYS verify ownership - prevent modifying broadcasts from other businesses
      if (existing.businessId !== requestBusinessId) {
        return res.status(403).json({ error: "Cannot modify broadcasts from other businesses" });
      }
      
      // Parse and validate with strict whitelisting - strips unknown keys
      const payload = insertBroadcastSchema
        .pick({ 
          name: true, 
          templateId: true, 
          segmentId: true, 
          scheduledFor: true, 
          metadata: true 
        })
        .partial()
        .strict()  // strips unknown keys
        .parse(req.body);

      // Build update data from validated payload
      const updateData: Partial<InsertBroadcast> = {};
      const fields: (keyof typeof payload)[] = ['name', 'templateId', 'segmentId', 'scheduledFor', 'metadata'];
      for (const field of fields) {
        if (payload[field] !== undefined) {
          updateData[field] = payload[field];
        }
      }
      
      const broadcast = await storage.updateBroadcast(id, updateData);
      
      if (!broadcast) {
        return res.status(404).json({ error: "Broadcast not found" });
      }
      
      res.json(broadcast);
    } catch (error) {
      console.error("Error updating broadcast:", error);
      if (error instanceof Error && error.message.includes('parse')) {
        return res.status(400).json({ error: "Invalid broadcast data" });
      }
      res.status(500).json({ error: "Failed to update broadcast" });
    }
  });

  app.delete("/api/broadcasts/single/:id", async (req, res) => {
    try {
      const { id } = req.params;
      // Require businessId from request to verify ownership
      const requestBusinessId = req.body.businessId || req.query.businessId;
      if (!requestBusinessId) {
        return res.status(400).json({ error: "businessId required for verification" });
      }
      
      // Fetch existing broadcast first to verify ownership
      const existing = await storage.getBroadcast(id);
      if (!existing) {
        return res.status(404).json({ error: "Broadcast not found" });
      }
      
      // ALWAYS verify ownership - prevent deleting broadcasts from other businesses
      if (existing.businessId !== requestBusinessId) {
        return res.status(403).json({ error: "Cannot delete broadcasts from other businesses" });
      }
      
      const success = await storage.deleteBroadcast(id);
      if (!success) {
        return res.status(404).json({ error: "Broadcast not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting broadcast:", error);
      res.status(500).json({ error: "Failed to delete broadcast" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
