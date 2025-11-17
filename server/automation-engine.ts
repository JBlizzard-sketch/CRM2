import type { IStorage } from "./storage";
import type { Automation, AutomationLog } from "@shared/schema";
import EventEmitter from "events";

export type AutomationEvent = 
  | { type: 'new_message'; data: { messageId: string; customerId: string; businessId: string; content: string } }
  | { type: 'new_customer'; data: { customerId: string; businessId: string } }
  | { type: 'order_placed'; data: { orderId: string; customerId: string; businessId: string; total: number } }
  | { type: 'order_status_changed'; data: { orderId: string; customerId: string; businessId: string; status: string } }
  | { type: 'keyword_detected'; data: { messageId: string; customerId: string; businessId: string; keyword: string } };

class AutomationEngine extends EventEmitter {
  private storage: IStorage;
  private executionCache = new Map<string, number>();

  constructor(storage: IStorage) {
    super();
    this.storage = storage;
  }

  async processEvent(event: AutomationEvent) {
    try {
      console.log(`[AutomationEngine] Processing event: ${event.type}`, event.data);
      
      const { businessId } = event.data;
      const automations = await this.storage.getAutomations(businessId);
      const activeAutomations = automations.filter(a => a.status === 'active');

      for (const automation of activeAutomations) {
        if (this.shouldTrigger(automation, event)) {
          await this.executeAutomation(automation, event);
        }
      }
    } catch (error) {
      console.error('[AutomationEngine] Error processing event:', error);
    }
  }

  private shouldTrigger(automation: Automation, event: AutomationEvent): boolean {
    switch (automation.trigger) {
      case 'new_message_received':
        return event.type === 'new_message';
      
      case 'new_customer':
        return event.type === 'new_customer';
      
      case 'order_placed':
        return event.type === 'order_placed';
      
      case 'order_status_changed':
        return event.type === 'order_status_changed';
      
      case 'keyword_detected':
        if (event.type === 'new_message' && automation.config?.keywords) {
          const keywords = automation.config.keywords as string[];
          const content = event.data.content.toLowerCase();
          return keywords.some(kw => content.includes(kw.toLowerCase()));
        }
        return false;
      
      default:
        return false;
    }
  }

  private async executeAutomation(automation: Automation, event: AutomationEvent) {
    const executionKey = `${automation.id}-${JSON.stringify(event.data)}`;
    
    if (this.executionCache.has(executionKey)) {
      const lastExecution = this.executionCache.get(executionKey)!;
      if (Date.now() - lastExecution < 5000) {
        console.log(`[AutomationEngine] Skipping duplicate execution for automation ${automation.id}`);
        return;
      }
    }

    this.executionCache.set(executionKey, Date.now());

    try {
      console.log(`[AutomationEngine] Executing automation: ${automation.name} (${automation.id})`);
      
      await this.performAction(automation, event);

      await this.storage.createAutomationLog({
        automationId: automation.id,
        businessId: automation.businessId,
        status: 'success',
        metadata: {
          event: event.type,
          eventData: event.data,
          executedAt: new Date().toISOString(),
        },
      });

      console.log(`[AutomationEngine] ✓ Automation executed successfully: ${automation.name}`);
    } catch (error) {
      console.error(`[AutomationEngine] ✗ Automation execution failed: ${automation.name}`, error);
      
      await this.storage.createAutomationLog({
        automationId: automation.id,
        businessId: automation.businessId,
        status: 'failed',
        metadata: {
          event: event.type,
          eventData: event.data,
          error: error instanceof Error ? error.message : String(error),
          executedAt: new Date().toISOString(),
        },
      });
    }
  }

  private async performAction(automation: Automation, event: AutomationEvent) {
    switch (automation.action) {
      case 'send_message':
        await this.sendAutomatedMessage(automation, event);
        break;
      
      case 'assign_tag':
        await this.assignTag(automation, event);
        break;
      
      case 'create_task':
        console.log(`[AutomationEngine] Task creation not yet implemented`);
        break;
      
      case 'update_customer':
        await this.updateCustomer(automation, event);
        break;
      
      default:
        throw new Error(`Unknown automation action: ${automation.action}`);
    }
  }

  private async sendAutomatedMessage(automation: Automation, event: AutomationEvent) {
    const { customerId, businessId } = event.data;
    const messageTemplate = automation.config?.messageTemplate as string;
    
    if (!messageTemplate) {
      throw new Error('Message template not configured');
    }

    const message = this.replaceVariables(messageTemplate, event);

    const customer = await this.storage.getCustomer(customerId);
    if (!customer) {
      throw new Error(`Customer ${customerId} not found`);
    }

    const conversations = await this.storage.getConversations(businessId);
    const customerConversation = conversations.find(c => c.customerId === customerId);
    
    if (!customerConversation) {
      console.warn(`[AutomationEngine] No conversation found for customer ${customerId}, skipping message`);
      return;
    }

    await this.storage.createMessage({
      conversationId: customerConversation.id, 
      businessId,
      channel: 'whatsapp',
      direction: 'outbound',
      content: message,
      metadata: {
        automationId: automation.id,
        automationName: automation.name,
        automated: true,
      },
    });

    console.log(`[AutomationEngine] Sent automated message to customer ${customerId}`);
  }

  private async assignTag(automation: Automation, event: AutomationEvent) {
    const { customerId } = event.data;
    const tag = automation.config?.tag as string;
    
    if (!tag) {
      throw new Error('Tag not configured');
    }

    const customer = await this.storage.getCustomer(customerId);
    if (!customer) {
      throw new Error(`Customer ${customerId} not found`);
    }

    const existingTags = (customer.tags as string[]) || [];
    if (!existingTags.includes(tag)) {
      await this.storage.updateCustomer(customerId, {
        tags: [...existingTags, tag],
      });
      console.log(`[AutomationEngine] Added tag "${tag}" to customer ${customerId}`);
    }
  }

  private async updateCustomer(automation: Automation, event: AutomationEvent) {
    const { customerId } = event.data;
    const updates = automation.config?.updates as Record<string, any>;
    
    if (!updates) {
      throw new Error('Customer updates not configured');
    }

    await this.storage.updateCustomer(customerId, updates);
    console.log(`[AutomationEngine] Updated customer ${customerId}`, updates);
  }

  private replaceVariables(template: string, event: AutomationEvent): string {
    let result = template;
    
    Object.entries(event.data).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    });
    
    result = result.replace(/{{date}}/g, new Date().toLocaleDateString());
    result = result.replace(/{{time}}/g, new Date().toLocaleTimeString());
    
    return result;
  }

  clearExecutionCache() {
    this.executionCache.clear();
  }
}

let engineInstance: AutomationEngine | null = null;

export function initializeAutomationEngine(storage: IStorage): AutomationEngine {
  if (!engineInstance) {
    engineInstance = new AutomationEngine(storage);
    console.log('[AutomationEngine] Initialized');
  }
  return engineInstance;
}

export function getAutomationEngine(): AutomationEngine | null {
  return engineInstance;
}

export async function triggerAutomationEvent(event: AutomationEvent) {
  const engine = getAutomationEngine();
  if (engine) {
    await engine.processEvent(event);
  } else {
    console.warn('[AutomationEngine] Engine not initialized, event ignored:', event.type);
  }
}
