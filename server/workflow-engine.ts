import type { IStorage } from './storage';
import type { WorkflowDefinition, WorkflowExecution } from '@shared/schema';
import { getTwilioClient, getTwilioPhoneNumber } from './twilio-client';

interface WorkflowNode {
  id: string;
  type: 'trigger' | 'delay' | 'condition' | 'send_message' | 'webhook' | 'segment_check' | 'end';
  data: Record<string, any>;
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export class WorkflowEngine {
  constructor(private storage: IStorage) {}

  async executeWorkflow(
    workflowId: string,
    triggerContext: Record<string, any>
  ): Promise<WorkflowExecution> {
    const workflow = await this.storage.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    if (workflow.status !== 'active') {
      throw new Error(`Workflow ${workflowId} is not active`);
    }

    const execution = await this.storage.createWorkflowExecution({
      workflowId: workflow.id,
      businessId: workflow.businessId,
      status: 'running',
      context: triggerContext,
    });

    try {
      await this.processWorkflow(workflow, execution, triggerContext);
      
      await this.storage.updateWorkflowExecution(execution.id, {
        status: 'completed',
        completedAt: new Date(),
      });

      return await this.storage.getWorkflowExecution(execution.id) as WorkflowExecution;
    } catch (error: any) {
      await this.storage.updateWorkflowExecution(execution.id, {
        status: 'failed',
        error: error.message,
        completedAt: new Date(),
      });
      throw error;
    }
  }

  private async processWorkflow(
    workflow: WorkflowDefinition,
    execution: WorkflowExecution,
    context: Record<string, any>
  ): Promise<void> {
    const nodes = (typeof workflow.nodes === 'string' 
      ? JSON.parse(workflow.nodes) 
      : workflow.nodes) as WorkflowNode[];
    const edges = (typeof workflow.edges === 'string' 
      ? JSON.parse(workflow.edges) 
      : workflow.edges) as WorkflowEdge[];

    const triggerNode = nodes.find(n => n.type === 'trigger');
    if (!triggerNode) {
      throw new Error('No trigger node found in workflow');
    }

    let currentNodeId = triggerNode.id;
    const visitedNodes = new Set<string>();
    const maxIterations = 100;
    let iterations = 0;

    while (currentNodeId && iterations < maxIterations) {
      iterations++;

      if (visitedNodes.has(currentNodeId)) {
        throw new Error(`Circular reference detected at node ${currentNodeId}`);
      }
      visitedNodes.add(currentNodeId);

      const currentNode = nodes.find(n => n.id === currentNodeId);
      if (!currentNode) {
        throw new Error(`Node ${currentNodeId} not found`);
      }

      await this.storage.updateWorkflowExecution(execution.id, {
        currentNodeId: currentNodeId || undefined,
      });

      if (currentNode.type === 'end') {
        break;
      }

      const nextNodeId = await this.executeNode(currentNode, edges, context, workflow.businessId);
      currentNodeId = nextNodeId || '';
    }

    if (iterations >= maxIterations) {
      throw new Error('Workflow exceeded maximum iterations');
    }
  }

  private async executeNode(
    node: WorkflowNode,
    edges: WorkflowEdge[],
    context: Record<string, any>,
    businessId: string
  ): Promise<string | null> {
    switch (node.type) {
      case 'trigger':
        return this.getNextNode(node.id, edges);

      case 'delay':
        await this.executeDelay(node);
        return this.getNextNode(node.id, edges);

      case 'condition':
        return await this.executeCondition(node, edges, context);

      case 'send_message':
        await this.executeSendMessage(node, context, businessId);
        return this.getNextNode(node.id, edges);

      case 'webhook':
        await this.executeWebhook(node, context);
        return this.getNextNode(node.id, edges);

      case 'segment_check':
        return await this.executeSegmentCheck(node, edges, context, businessId);

      default:
        throw new Error(`Unknown node type: ${node.type}`);
    }
  }

  private async executeDelay(node: WorkflowNode): Promise<void> {
    const delayMs = node.data.delayMs || 0;
    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  private async executeCondition(
    node: WorkflowNode,
    edges: WorkflowEdge[],
    context: Record<string, any>
  ): Promise<string | null> {
    const { field, operator, value } = node.data;
    const contextValue = this.getNestedValue(context, field);

    let conditionMet = false;

    switch (operator) {
      case 'equals':
        conditionMet = contextValue === value;
        break;
      case 'not_equals':
        conditionMet = contextValue !== value;
        break;
      case 'contains':
        conditionMet = String(contextValue).includes(String(value));
        break;
      case 'greater_than':
        conditionMet = Number(contextValue) > Number(value);
        break;
      case 'less_than':
        conditionMet = Number(contextValue) < Number(value);
        break;
      default:
        conditionMet = false;
    }

    const outgoingEdges = edges.filter(e => e.source === node.id);
    const targetEdge = conditionMet
      ? outgoingEdges.find(e => e.label === 'true' || e.label === 'yes')
      : outgoingEdges.find(e => e.label === 'false' || e.label === 'no');

    return targetEdge?.target || null;
  }

  private async executeSendMessage(
    node: WorkflowNode,
    context: Record<string, any>,
    businessId: string
  ): Promise<void> {
    const { channel, template, customerId, conversationId } = node.data;
    
    const message = this.interpolateTemplate(template, context);

    if (conversationId || context.conversationId) {
      const convId = conversationId || context.conversationId;
      
      await this.storage.createMessage({
        conversationId: convId,
        businessId,
        direction: 'outbound',
        content: message,
        channel: channel || 'whatsapp',
      });

      if (channel === 'whatsapp' || channel === 'sms') {
        try {
          const conversation = await this.storage.getConversation(convId);
          if (conversation) {
            const customer = await this.storage.getCustomer(conversation.customerId);
            if (customer) {
              const client = await getTwilioClient();
              const fromNumber = await getTwilioPhoneNumber();
              const to = channel === 'whatsapp' 
                ? `whatsapp:${customer.phone}`
                : customer.phone;

              await client.messages.create({
                from: fromNumber,
                to,
                body: message,
              });
            }
          }
        } catch (error) {
          console.error('Error sending message via Twilio:', error);
        }
      }
    } else if (customerId || context.customerId) {
      const custId = customerId || context.customerId;
      const customer = await this.storage.getCustomer(custId);
      
      if (customer) {
        let conversation = await this.storage.findConversationByCustomerAndChannel(
          custId,
          channel || 'whatsapp'
        );

        if (!conversation) {
          conversation = await this.storage.createConversation({
            businessId,
            customerId: custId,
            channel: channel || 'whatsapp',
            status: 'open',
          });
        }

        await this.storage.createMessage({
          conversationId: conversation.id,
          businessId,
          direction: 'outbound',
          content: message,
          channel: channel || 'whatsapp',
        });

        if (channel === 'whatsapp' || channel === 'sms') {
          try {
            const client = await getTwilioClient();
            const fromNumber = await getTwilioPhoneNumber();
            const to = channel === 'whatsapp' 
              ? `whatsapp:${customer.phone}`
              : customer.phone;

            await client.messages.create({
              from: fromNumber,
              to,
              body: message,
            });
          } catch (error) {
            console.error('Error sending message via Twilio:', error);
          }
        }
      }
    }
  }

  private async executeWebhook(
    node: WorkflowNode,
    context: Record<string, any>
  ): Promise<void> {
    const { url, method, headers, body } = node.data;

    const payload = typeof body === 'string' 
      ? this.interpolateTemplate(body, context)
      : JSON.stringify(body);

    await fetch(url, {
      method: method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: payload,
    });
  }

  private async executeSegmentCheck(
    node: WorkflowNode,
    edges: WorkflowEdge[],
    context: Record<string, any>,
    businessId: string
  ): Promise<string | null> {
    const { segmentId } = node.data;
    const customerId = context.customerId || context.customer?.id;

    if (!customerId) {
      const outgoingEdges = edges.filter(e => e.source === node.id);
      const targetEdge = outgoingEdges.find(e => e.label === 'false' || e.label === 'no');
      return targetEdge?.target || null;
    }

    const segment = await this.storage.getSegment(segmentId);
    if (!segment) {
      throw new Error(`Segment ${segmentId} not found`);
    }

    const memberships = await this.storage.getSegmentMemberships(segmentId);
    const isInSegment = memberships.some((m: any) => m.customerId === customerId);

    const outgoingEdges = edges.filter(e => e.source === node.id);
    const targetEdge = isInSegment
      ? outgoingEdges.find(e => e.label === 'true' || e.label === 'yes')
      : outgoingEdges.find(e => e.label === 'false' || e.label === 'no');

    return targetEdge?.target || null;
  }

  private getNextNode(currentNodeId: string, edges: WorkflowEdge[]): string | null {
    const edge = edges.find(e => e.source === currentNodeId);
    return edge?.target || null;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private interpolateTemplate(template: string, context: Record<string, any>): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const value = this.getNestedValue(context, key.trim());
      return value !== undefined ? String(value) : match;
    });
  }
}
