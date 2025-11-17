import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Zap, Play, ChevronDown, ChevronRight, CheckCircle2, XCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Automation, AutomationLog } from "@shared/schema";

interface AutomationsProps {
  businessId: string;
}

export default function Automations({ businessId }: AutomationsProps) {
  const [expandedAutomations, setExpandedAutomations] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const { data: automations, isLoading, isError, error } = useQuery<Automation[]>({
    queryKey: ["/api/automations", businessId],
    enabled: !!businessId,
  });

  const triggerMutation = useMutation({
    mutationFn: async (automationId: string) => {
      return apiRequest('POST', `/api/automations/${automationId}/trigger`, {});
    },
    onSuccess: (_data, automationId) => {
      toast({
        title: "Automation Triggered",
        description: "The automation has been executed successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/automations", businessId] });
      queryClient.invalidateQueries({ queryKey: ["/api/automation-logs", automationId] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to trigger automation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const toggleAutomation = (automationId: string) => {
    setExpandedAutomations((prev) => {
      const next = new Set(prev);
      if (next.has(automationId)) {
        next.delete(automationId);
      } else {
        next.add(automationId);
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
          <Zap className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Select a Business</h2>
          <p className="text-muted-foreground">
            Choose a business to view automations
          </p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Zap className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-xl font-semibold mb-2">Error Loading Automations</h2>
          <p className="text-muted-foreground">
            {error?.message || "Failed to load automations. Please try again."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold mb-2" data-testid="text-page-title">Automations</h1>
          <p className="text-muted-foreground">Manage automated workflows and triggers</p>
        </div>
        <div className="text-sm text-muted-foreground">
          {automations?.length || 0} automations
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {automations && automations.length > 0 ? (
                automations.map((automation) => {
                  const isExpanded = expandedAutomations.has(automation.id);

                  return (
                    <Collapsible
                      key={automation.id}
                      open={isExpanded}
                      onOpenChange={() => toggleAutomation(automation.id)}
                      asChild
                    >
                      <>
                        <TableRow data-testid={`row-automation-${automation.id}`}>
                          <TableCell>
                            <CollapsibleTrigger asChild>
                              <button className="hover-elevate active-elevate-2 rounded p-1">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </button>
                            </CollapsibleTrigger>
                          </TableCell>
                          <TableCell className="font-medium">
                            {automation.name}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{automation.trigger}</Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {automation.action}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={automation.status === 'active' ? 'default' : 'secondary'}>
                              {automation.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => triggerMutation.mutate(automation.id)}
                              disabled={automation.status === 'inactive' || triggerMutation.isPending}
                              data-testid={`button-trigger-${automation.id}`}
                            >
                              <Play className="h-3 w-3 mr-2" />
                              Trigger
                            </Button>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell colSpan={6} className="p-0">
                            <CollapsibleContent>
                              <AutomationLogs automationId={automation.id} />
                            </CollapsibleContent>
                          </TableCell>
                        </TableRow>
                      </>
                    </Collapsible>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <Zap className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No automations configured</p>
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

function AutomationLogs({ automationId }: { automationId: string }) {
  const { data: logs, isLoading } = useQuery<AutomationLog[]>({
    queryKey: ["/api/automation-logs", automationId],
  });

  if (isLoading) {
    return (
      <div className="bg-muted/50 p-4">
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="bg-muted/50 p-4 text-center text-sm text-muted-foreground">
        No execution logs yet
      </div>
    );
  }

  return (
    <div className="bg-muted/50 p-4">
      <h4 className="text-sm font-medium mb-3">Execution Logs</h4>
      <div className="space-y-2">
        {logs.slice(0, 5).map((log) => (
          <div
            key={log.id}
            className="flex items-center justify-between bg-background rounded p-3"
          >
            <div className="flex items-center gap-3">
              {log.status === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <div>
                <div className="text-sm font-medium capitalize">{log.status}</div>
                <div className="text-xs text-muted-foreground">
                  {log.createdAt
                    ? new Date(log.createdAt).toLocaleString()
                    : 'Unknown time'}
                </div>
              </div>
            </div>
            {log.metadata && (
              <div className="text-xs text-muted-foreground">
                {JSON.stringify(log.metadata).slice(0, 50)}...
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
