import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ShoppingCart, ChevronDown, ChevronRight, DollarSign } from "lucide-react";
import type { OrderWithCustomer, OrderItem } from "@shared/schema";

interface OrdersProps {
  businessId: string;
}

const statusColors = {
  pending: "secondary",
  confirmed: "default",
  shipped: "default",
  delivered: "default",
  cancelled: "destructive",
} as const;

export default function Orders({ businessId }: OrdersProps) {
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  const { data: orders, isLoading, isError, error } = useQuery<OrderWithCustomer[]>({
    queryKey: ["/api/orders", businessId],
    enabled: !!businessId,
  });

  const toggleOrder = (orderId: string) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!businessId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Select a Business</h2>
          <p className="text-muted-foreground">
            Choose a business to view orders
          </p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-xl font-semibold mb-2">Error Loading Orders</h2>
          <p className="text-muted-foreground">
            {error?.message || "Failed to load orders. Please try again."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold mb-2" data-testid="text-page-title">Orders</h1>
          <p className="text-muted-foreground">Track and manage customer orders</p>
        </div>
        <div className="text-sm text-muted-foreground">
          {orders?.length || 0} orders
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders && orders.length > 0 ? (
                orders.map((order) => {
                  const isExpanded = expandedOrders.has(order.id);

                  return (
                    <Collapsible
                      key={order.id}
                      open={isExpanded}
                      onOpenChange={() => toggleOrder(order.id)}
                      asChild
                    >
                      <>
                        <TableRow data-testid={`row-order-${order.id}`}>
                          <TableCell>
                            <CollapsibleTrigger asChild>
                              <button 
                                className="hover-elevate active-elevate-2 rounded p-1"
                                data-testid={`button-expand-order-${order.id}`}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </button>
                            </CollapsibleTrigger>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {order.id.slice(0, 8)}...
                          </TableCell>
                          <TableCell className="font-medium">
                            {order.customer.name}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusColors[order.status]}>
                              {order.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 font-semibold">
                              KES {order.total.toFixed(2)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {order.createdAt
                              ? new Date(order.createdAt).toLocaleDateString()
                              : 'N/A'}
                          </TableCell>
                        </TableRow>
                        {order.items && order.items.length > 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="p-0">
                              <CollapsibleContent>
                                <div className="bg-muted/50 p-4">
                                  <h4 className="text-sm font-medium mb-3">Order Items</h4>
                                  <div className="space-y-2">
                                    {order.items.map((item) => (
                                      <div
                                        key={item.id}
                                        className="flex items-center justify-between bg-background rounded p-3"
                                      >
                                        <div className="flex-1">
                                          <div className="font-medium text-sm">
                                            {item.product.name}
                                          </div>
                                          <div className="text-xs text-muted-foreground">
                                            Quantity: {item.quantity}
                                          </div>
                                        </div>
                                        <div className="text-sm font-semibold">
                                          KES {item.price.toFixed(2)}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </CollapsibleContent>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    </Collapsible>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No orders yet</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
