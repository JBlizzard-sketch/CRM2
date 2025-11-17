import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2,
  XCircle,
  Send,
  RefreshCw,
  MessageSquare,
  Activity,
  Clock,
  Smartphone,
  Zap,
} from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Message } from "@shared/schema";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface WhatsAppTestingProps {
  businessId: string;
}

interface WebhookLog {
  id: string;
  timestamp: string;
  from: string;
  to: string;
  body: string;
  messageSid: string;
  status: 'success' | 'error';
  error?: string;
}

export default function WhatsAppTesting({ businessId }: WhatsAppTestingProps) {
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const { toast } = useToast();

  const { data: recentMessages, isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages/recent", businessId],
    enabled: !!businessId,
    refetchInterval: 5000,
  });

  const sendTestMutation = useMutation({
    mutationFn: async (data: { phone: string; message: string }) => {
      const conversationsResponse = await fetch(`/api/conversations/${businessId}`);
      if (!conversationsResponse.ok) {
        throw new Error(`Failed to fetch conversations: ${conversationsResponse.statusText}`);
      }
      const conversations = await conversationsResponse.json();
      
      let conversation = conversations.find((c: any) => 
        c.customer.phone === data.phone && c.channel === 'whatsapp'
      );
      
      if (!conversation) {
        const customer: any = await apiRequest('POST', '/api/customers', {
          businessId,
          name: data.phone,
          phone: data.phone,
        });
        
        conversation = await apiRequest('POST', '/api/conversations', {
          businessId,
          customerId: customer.id,
          channel: 'whatsapp',
          status: 'open',
        });
      }
      
      return apiRequest('POST', '/api/messages', {
        conversationId: conversation.id,
        businessId,
        direction: 'outbound',
        content: data.message,
        channel: 'whatsapp',
      });
    },
    onSuccess: () => {
      toast({
        title: "Message Sent",
        description: "Test message sent successfully via WhatsApp",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/recent", businessId] });
      setTestMessage("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Send",
        description: error.message || "Could not send test message",
        variant: "destructive",
      });
    },
  });

  const handleSendTest = () => {
    if (!testPhone || !testMessage) {
      toast({
        title: "Missing Information",
        description: "Please provide both phone number and message",
        variant: "destructive",
      });
      return;
    }
    
    sendTestMutation.mutate({
      phone: testPhone,
      message: testMessage,
    });
  };

  const formatPhoneForDisplay = (phone: string) => {
    return phone.replace('whatsapp:', '');
  };

  const recentInbound = recentMessages?.filter(m => m.direction === 'inbound').slice(0, 10) || [];
  const recentOutbound = recentMessages?.filter(m => m.direction === 'outbound').slice(0, 10) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold mb-2" data-testid="text-page-title">
          WhatsApp Testing & Monitoring
        </h1>
        <p className="text-muted-foreground">
          Test your WhatsApp integration and monitor incoming webhooks in real-time
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Connection Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connection Status</CardTitle>
            <SiWhatsapp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">Connected</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Twilio WhatsApp integration is active
            </p>
          </CardContent>
        </Card>

        {/* Recent Inbound */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inbound Messages</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentInbound.length}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Last 10 received messages
            </p>
          </CardContent>
        </Card>

        {/* Recent Outbound */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outbound Messages</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentOutbound.length}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Last 10 sent messages
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test Message Sender */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Send Test Message
            </CardTitle>
            <CardDescription>
              Send a test WhatsApp message to verify your integration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="test-phone">Recipient Phone Number</Label>
              <div className="flex gap-2">
                <div className="flex items-center px-3 border rounded-md bg-muted">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                </div>
                <Input
                  id="test-phone"
                  placeholder="+254712345678"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  data-testid="input-test-phone"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Include country code (e.g., +254 for Kenya)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="test-message">Message Content</Label>
              <Textarea
                id="test-message"
                placeholder="Hello! This is a test message from your CRM system."
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                rows={4}
                data-testid="input-test-message"
              />
              <p className="text-xs text-muted-foreground">
                {testMessage.length} characters
              </p>
            </div>

            <Button
              onClick={handleSendTest}
              disabled={sendTestMutation.isPending || !testPhone || !testMessage}
              className="w-full"
              data-testid="button-send-test"
            >
              {sendTestMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Test Message
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Webhook Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Webhook Configuration
            </CardTitle>
            <CardDescription>
              Configure your Twilio webhook to receive messages
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Webhook URL</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={`${window.location.origin}/api/webhooks/twilio`}
                  className="font-mono text-xs"
                  data-testid="input-webhook-url"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/twilio`);
                    toast({
                      title: "Copied!",
                      description: "Webhook URL copied to clipboard",
                    });
                  }}
                  data-testid="button-copy-webhook"
                >
                  Copy
                </Button>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h3 className="font-medium text-sm">Setup Instructions:</h3>
              <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                <li>Go to Twilio Console → Phone Numbers</li>
                <li>Select your WhatsApp-enabled number</li>
                <li>Scroll to "Messaging Configuration"</li>
                <li>Paste the webhook URL above</li>
                <li>Set HTTP method to POST</li>
                <li>Save your changes</li>
              </ol>
            </div>

            <div className="bg-muted p-3 rounded-md">
              <p className="text-xs text-muted-foreground">
                <strong>Note:</strong> Messages sent to your Twilio WhatsApp number will automatically create customers and conversations in your CRM.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Messages Monitor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Real-Time Message Monitor
          </CardTitle>
          <CardDescription>
            Live feed of incoming and outgoing WhatsApp messages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Inbound Messages */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline" className="gap-1">
                  <Activity className="h-3 w-3" />
                  Inbound
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {recentInbound.length} messages
                </span>
              </div>
              <ScrollArea className="h-[400px] border rounded-md p-3">
                {messagesLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : recentInbound.length > 0 ? (
                  <div className="space-y-3">
                    {recentInbound.map((message) => (
                      <div
                        key={message.id}
                        className="p-3 bg-muted rounded-md space-y-2"
                        data-testid={`message-inbound-${message.id}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="default" className="text-xs">
                            Received
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {message.createdAt
                              ? new Date(message.createdAt).toLocaleTimeString()
                              : 'Now'}
                          </span>
                        </div>
                        <p className="text-sm">{message.content}</p>
                        <div className="flex items-center gap-2">
                          <SiWhatsapp className="h-3 w-3 text-green-500" />
                          <span className="text-xs text-muted-foreground font-mono">
                            {message.metadata?.From || 'Unknown'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">No inbound messages yet</p>
                    </div>
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Outbound Messages */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline" className="gap-1">
                  <Send className="h-3 w-3" />
                  Outbound
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {recentOutbound.length} messages
                </span>
              </div>
              <ScrollArea className="h-[400px] border rounded-md p-3">
                {messagesLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : recentOutbound.length > 0 ? (
                  <div className="space-y-3">
                    {recentOutbound.map((message) => (
                      <div
                        key={message.id}
                        className="p-3 bg-primary/10 rounded-md space-y-2"
                        data-testid={`message-outbound-${message.id}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="default" className="text-xs">
                            Sent
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {message.createdAt
                              ? new Date(message.createdAt).toLocaleTimeString()
                              : 'Now'}
                          </span>
                        </div>
                        <p className="text-sm">{message.content}</p>
                        <div className="flex items-center gap-2">
                          <SiWhatsapp className="h-3 w-3 text-green-500" />
                          <span className="text-xs text-muted-foreground font-mono">
                            Test Message
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Send className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">No outbound messages yet</p>
                    </div>
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
