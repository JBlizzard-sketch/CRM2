import { useQuery } from '@tanstack/react-query';
import { useParams } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, ShoppingCart, User, Calendar } from 'lucide-react';

interface CustomerJourneyProps {
  businessId: string;
}

export default function CustomerJourney({ businessId }: CustomerJourneyProps) {
  const { customerId } = useParams();

  const { data: allCustomers, isLoading: customersLoading } = useQuery<any[]>({
    queryKey: [`/api/customers/${businessId}`],
    enabled: !!businessId,
  });

  const { data: conversations, isLoading: conversationsLoading } = useQuery<any[]>({
    queryKey: [`/api/conversations/${businessId}`],
    enabled: !!businessId,
  });

  const { data: orders, isLoading: ordersLoading } = useQuery<any[]>({
    queryKey: [`/api/orders/${businessId}`],
    enabled: !!businessId,
  });

  const customer = allCustomers?.find((c: any) => c.id === customerId);
  const customerConversations = conversations?.filter((c: any) => c.customerId === customerId) || [];
  const customerOrders = orders?.filter((o: any) => o.customerId === customerId) || [];

  const isLoading = customersLoading || conversationsLoading || ordersLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="loading-state">
        <p className="text-muted-foreground">Loading customer journey...</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="error-notfound">
        <p className="text-muted-foreground">Customer not found</p>
      </div>
    );
  }

  const timeline = [
    ...customerConversations.map((c: any) => ({
      type: 'conversation',
      date: new Date(c.createdAt),
      data: c,
    })),
    ...customerOrders.map((o: any) => ({
      type: 'order',
      date: new Date(o.createdAt),
      data: o,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold mb-2" data-testid="text-page-title">
          Customer Journey
        </h1>
        <p className="text-muted-foreground">
          Complete interaction history for {customer.name}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customerConversations.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customerOrders.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customer Since</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Date(customer.createdAt).toLocaleDateString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {timeline.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[200px]" data-testid="empty-timeline">
              <p className="text-muted-foreground mb-2">No interactions yet</p>
              <p className="text-sm text-muted-foreground">
                Conversations and orders will appear here as they happen
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {timeline.map((event, index) => (
                <div key={index} className="flex gap-4" data-testid={`timeline-event-${index}`}>
                  <div className="flex flex-col items-center">
                    <div className={`rounded-full p-2 ${
                      event.type === 'conversation' ? 'bg-blue-500' : 'bg-green-500'
                    }`}>
                      {event.type === 'conversation' ? (
                        <MessageCircle className="h-4 w-4 text-white" />
                      ) : (
                        <ShoppingCart className="h-4 w-4 text-white" />
                      )}
                    </div>
                    {index < timeline.length - 1 && (
                      <div className="w-0.5 h-full bg-border mt-2" />
                    )}
                  </div>

                  <Card className="flex-1">
                    <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {event.type === 'conversation' ? 'Conversation' : 'Order'}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {event.date.toLocaleString()}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {event.type === 'conversation' ? (
                        <div>
                          <p className="text-sm">
                            <strong>Channel:</strong> {event.data.channel}
                          </p>
                          <p className="text-sm">
                            <strong>Status:</strong> {event.data.status}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm">
                            <strong>Order ID:</strong> {event.data.id.slice(0, 8)}...
                          </p>
                          <p className="text-sm">
                            <strong>Status:</strong> {event.data.status}
                          </p>
                          <p className="text-sm">
                            <strong>Total:</strong> KES {event.data.total.toFixed(2)}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
