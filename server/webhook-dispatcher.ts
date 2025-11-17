import type { IStorage } from './storage';
import type { Webhook, WebhookLog } from '@shared/schema';

export type WebhookEvent = 
  | 'message.received'
  | 'message.sent'
  | 'order.created'
  | 'order.updated'
  | 'customer.created'
  | 'customer.updated'
  | 'conversation.opened'
  | 'conversation.closed';

interface WebhookPayload {
  event: WebhookEvent;
  businessId: string;
  data: Record<string, any>;
  timestamp: string;
}

export class WebhookDispatcher {
  constructor(private storage: IStorage) {}

  async dispatch(event: WebhookEvent, businessId: string, data: Record<string, any>): Promise<void> {
    const webhooks = await this.storage.getWebhooks(businessId);
    const activeWebhooks = webhooks.filter(
      w => w.status === 'active' && w.events.includes(event)
    );

    const promises = activeWebhooks.map(webhook =>
      this.sendWebhook(webhook, event, businessId, data)
    );

    await Promise.allSettled(promises);
  }

  private async sendWebhook(
    webhook: Webhook,
    event: WebhookEvent,
    businessId: string,
    data: Record<string, any>
  ): Promise<void> {
    const payload: WebhookPayload = {
      event,
      businessId,
      data,
      timestamp: new Date().toISOString(),
    };

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await this.sendRequest(webhook, payload);
        
        await this.storage.createWebhookLog({
          webhookId: webhook.id,
          event,
          payload,
          response: await this.parseResponse(response),
          statusCode: response.status,
          success: response.ok ? 1 : 0,
        });

        if (response.ok) {
          return;
        }

        lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (error: any) {
        lastError = error;
        console.error(`Webhook attempt ${attempt + 1} failed:`, error);

        if (attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    await this.storage.createWebhookLog({
      webhookId: webhook.id,
      event,
      payload,
      statusCode: 0,
      success: 0,
      error: lastError?.message || 'Unknown error',
    });
  }

  private async sendRequest(webhook: Webhook, payload: WebhookPayload): Promise<Response> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'CRM-Platform-Webhook/1.0',
      ...(webhook.headers || {}),
    };

    if (webhook.secret) {
      headers['X-Webhook-Secret'] = webhook.secret;
    }

    const signature = await this.generateSignature(payload, webhook.secret);
    if (signature) {
      headers['X-Webhook-Signature'] = signature;
    }

    return fetch(webhook.url, {
      method: webhook.method || 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000),
    });
  }

  private async generateSignature(payload: WebhookPayload, secret?: string | null): Promise<string | null> {
    if (!secret) return null;

    try {
      const { createHmac } = await import('crypto');
      const hmac = createHmac('sha256', secret);
      hmac.update(JSON.stringify(payload));
      return hmac.digest('hex');
    } catch (error) {
      console.error('Error generating webhook signature:', error);
      return null;
    }
  }

  private async parseResponse(response: Response): Promise<Record<string, any>> {
    try {
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch {
        return { body: text };
      }
    } catch {
      return {};
    }
  }
}
