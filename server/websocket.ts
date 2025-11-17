import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';

interface ClientConnection {
  ws: WebSocket;
  businessId: string;
  userId?: string;
}

export class RealtimeEventSystem {
  private wss: WebSocketServer;
  private clients: Map<string, ClientConnection> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws'
    });

    this.wss.on('connection', (ws: WebSocket, req) => {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const businessId = url.searchParams.get('businessId');
      const userId = url.searchParams.get('userId');

      if (!businessId) {
        ws.close(1008, 'businessId is required');
        return;
      }

      const clientId = `${businessId}-${userId || Date.now()}`;
      this.clients.set(clientId, { ws, businessId, userId: userId || undefined });

      console.log(`WebSocket client connected: ${clientId}`);

      ws.on('message', (message: Buffer) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleClientMessage(clientId, data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        this.clients.delete(clientId);
        console.log(`WebSocket client disconnected: ${clientId}`);
      });

      ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
      });

      ws.send(JSON.stringify({ 
        type: 'connected',
        clientId,
        timestamp: new Date().toISOString()
      }));
    });
  }

  private handleClientMessage(clientId: string, data: any): void {
    if (data.type === 'ping') {
      const client = this.clients.get(clientId);
      if (client) {
        client.ws.send(JSON.stringify({
          type: 'pong',
          timestamp: new Date().toISOString()
        }));
      }
    }
  }

  broadcast(businessId: string, event: string, data: any): void {
    const message = JSON.stringify({
      type: 'event',
      event,
      data,
      timestamp: new Date().toISOString()
    });

    this.clients.forEach((client, clientId) => {
      if (client.businessId === businessId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    });
  }

  broadcastToAll(event: string, data: any): void {
    const message = JSON.stringify({
      type: 'event',
      event,
      data,
      timestamp: new Date().toISOString()
    });

    this.clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    });
  }

  sendToClient(businessId: string, userId: string, event: string, data: any): void {
    const message = JSON.stringify({
      type: 'event',
      event,
      data,
      timestamp: new Date().toISOString()
    });

    this.clients.forEach((client, clientId) => {
      if (
        client.businessId === businessId &&
        client.userId === userId &&
        client.ws.readyState === WebSocket.OPEN
      ) {
        client.ws.send(message);
      }
    });
  }

  getConnectedClients(businessId: string): number {
    let count = 0;
    this.clients.forEach((client) => {
      if (client.businessId === businessId) {
        count++;
      }
    });
    return count;
  }
}
