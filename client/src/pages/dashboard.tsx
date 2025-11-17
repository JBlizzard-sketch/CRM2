import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Users, ShoppingCart, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import type { AnalyticsDaily } from "@shared/schema";

interface DashboardProps {
  businessId: string;
}

export default function Dashboard({ businessId }: DashboardProps) {
  const { data: analytics, isLoading, isError, error } = useQuery<AnalyticsDaily[]>({
    queryKey: ["/api/analytics", businessId],
    enabled: !!businessId,
  });

  const todayStats = analytics?.[0];
  const yesterdayStats = analytics?.[1];

  const calculateChange = (today: number | undefined, yesterday: number | undefined) => {
    if (!today || !yesterday || yesterday === 0) return 0;
    return ((today - yesterday) / yesterday) * 100;
  };

  const stats = [
    {
      title: "Messages Today",
      value: (todayStats?.messagesSent || 0) + (todayStats?.messagesReceived || 0),
      change: calculateChange(
        (todayStats?.messagesSent || 0) + (todayStats?.messagesReceived || 0),
        (yesterdayStats?.messagesSent || 0) + (yesterdayStats?.messagesReceived || 0)
      ),
      icon: MessageSquare,
      color: "text-blue-500",
    },
    {
      title: "New Customers",
      value: todayStats?.newCustomers || 0,
      change: calculateChange(todayStats?.newCustomers, yesterdayStats?.newCustomers),
      icon: Users,
      color: "text-green-500",
    },
    {
      title: "Orders Today",
      value: todayStats?.ordersCount || 0,
      change: calculateChange(todayStats?.ordersCount, yesterdayStats?.ordersCount),
      icon: ShoppingCart,
      color: "text-purple-500",
    },
    {
      title: "Revenue Today",
      value: `KES ${(todayStats?.revenue || 0).toFixed(2)}`,
      change: calculateChange(todayStats?.revenue, yesterdayStats?.revenue),
      icon: DollarSign,
      color: "text-orange-500",
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your business metrics</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-3 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!businessId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Select a Business</h2>
          <p className="text-muted-foreground">
            Choose a business from the dropdown above to view the dashboard
          </p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-xl font-semibold mb-2">Error Loading Dashboard</h2>
          <p className="text-muted-foreground">
            {error?.message || "Failed to load dashboard analytics. Please try again."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold mb-2" data-testid="text-page-title">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your business metrics</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const isPositive = stat.change > 0;
          const ChangeIcon = isPositive ? TrendingUp : TrendingDown;

          return (
            <Card key={stat.title} data-testid={`card-stat-${stat.title.toLowerCase().replace(/ /g, '-')}`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid={`text-stat-value-${stat.title.toLowerCase().replace(/ /g, '-')}`}>
                  {stat.value}
                </div>
                {stat.change !== 0 && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <ChangeIcon className={`h-3 w-3 ${isPositive ? 'text-green-500' : 'text-red-500'}`} />
                    <span className={isPositive ? 'text-green-500' : 'text-red-500'}>
                      {Math.abs(stat.change).toFixed(1)}%
                    </span>
                    <span>from yesterday</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {analytics && analytics.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.slice(0, 7).map((day) => (
                <div key={day.date} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div className="flex-1">
                    <div className="font-medium">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</div>
                    <div className="text-sm text-muted-foreground">
                      {day.messagesSent + day.messagesReceived} messages · {day.ordersCount} orders · {day.newCustomers} new customers
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">KES {day.revenue.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">revenue</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
