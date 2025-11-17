import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Radio, Plus, Calendar as CalendarIcon, Send } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertBroadcastSchema, type Broadcast, type MessageTemplate, type CustomerSegment } from "@shared/schema";
import { cn } from "@/lib/utils";

interface BroadcastsProps {
  businessId: string;
}

const broadcastFormSchema = insertBroadcastSchema.extend({});

type BroadcastFormValues = z.infer<typeof broadcastFormSchema>;

export default function Broadcasts({ businessId }: BroadcastsProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedBroadcast, setSelectedBroadcast] = useState<Broadcast | null>(null);
  const { toast } = useToast();

  const { data: broadcasts, isLoading, isError, error } = useQuery<Broadcast[]>({
    queryKey: ["/api/broadcasts", businessId],
    enabled: !!businessId,
  });

  const { data: templates } = useQuery<MessageTemplate[]>({
    queryKey: ["/api/templates", businessId],
    enabled: !!businessId,
  });

  const { data: segments } = useQuery<CustomerSegment[]>({
    queryKey: ["/api/segments", businessId],
    enabled: !!businessId,
  });

  const createForm = useForm<BroadcastFormValues>({
    resolver: zodResolver(broadcastFormSchema),
    defaultValues: {
      businessId: businessId,
      name: "",
      templateId: null,
      segmentId: null,
      status: "draft",
      scheduledFor: null,
      totalRecipients: 0,
      sentCount: 0,
      deliveredCount: 0,
      failedCount: 0,
      readCount: 0,
      metadata: null,
    },
  });

  const editForm = useForm<BroadcastFormValues>({
    resolver: zodResolver(broadcastFormSchema),
  });

  const createMutation = useMutation({
    mutationFn: async (data: BroadcastFormValues) => {
      return apiRequest('POST', `/api/broadcasts/${businessId}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Broadcast Created",
        description: "The broadcast has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/broadcasts", businessId] });
      setCreateDialogOpen(false);
      createForm.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create broadcast. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<BroadcastFormValues> }) => {
      return apiRequest('PUT', `/api/broadcasts/single/${id}`, { ...data, _businessId: businessId });
    },
    onSuccess: () => {
      toast({
        title: "Broadcast Updated",
        description: "The broadcast has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/broadcasts", businessId] });
      setEditDialogOpen(false);
      setSelectedBroadcast(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update broadcast. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateSubmit = (data: BroadcastFormValues) => {
    createMutation.mutate(data);
  };

  const handleEditSubmit = (data: BroadcastFormValues) => {
    if (selectedBroadcast) {
      updateMutation.mutate({ id: selectedBroadcast.id, data });
    }
  };

  const openEditDialog = (broadcast: Broadcast) => {
    setSelectedBroadcast(broadcast);
    editForm.reset({
      businessId: broadcast.businessId,
      name: broadcast.name,
      templateId: broadcast.templateId,
      segmentId: broadcast.segmentId,
      status: broadcast.status,
      scheduledFor: broadcast.scheduledFor ? new Date(broadcast.scheduledFor) : null,
      totalRecipients: broadcast.totalRecipients,
      sentCount: broadcast.sentCount,
      deliveredCount: broadcast.deliveredCount,
      failedCount: broadcast.failedCount,
      readCount: broadcast.readCount,
      metadata: broadcast.metadata || null,
    });
    setEditDialogOpen(true);
  };

  const getStatusBadge = (status: Broadcast['status']) => {
    const variants: Record<Broadcast['status'], { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      draft: { variant: "secondary", label: "Draft" },
      scheduled: { variant: "outline", label: "Scheduled" },
      sending: { variant: "default", label: "Sending" },
      completed: { variant: "default", label: "Completed" },
      failed: { variant: "destructive", label: "Failed" },
    };
    const config = variants[status];
    return <Badge variant={config.variant} data-testid={`badge-status-${status}`}>{config.label}</Badge>;
  };

  const calculateDeliveryRate = (broadcast: Broadcast) => {
    if (broadcast.totalRecipients === 0) return 0;
    return (broadcast.deliveredCount / broadcast.totalRecipients) * 100;
  };

  const calculateReadRate = (broadcast: Broadcast) => {
    if (broadcast.deliveredCount === 0) return 0;
    return (broadcast.readCount / broadcast.deliveredCount) * 100;
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
          <Radio className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Select a Business</h2>
          <p className="text-muted-foreground">
            Choose a business to view broadcasts
          </p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Radio className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-xl font-semibold mb-2">Error Loading Broadcasts</h2>
          <p className="text-muted-foreground">
            {error?.message || "Failed to load broadcasts. Please try again."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold mb-2" data-testid="text-page-title">Broadcasts</h1>
          <p className="text-muted-foreground">Send targeted messages to customer segments</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-broadcast">
          <Plus className="h-4 w-4 mr-2" />
          Create Broadcast
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Recipients</TableHead>
                <TableHead>Delivery Rate</TableHead>
                <TableHead>Read Rate</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {broadcasts && broadcasts.length > 0 ? (
                broadcasts.map((broadcast) => (
                  <TableRow key={broadcast.id} data-testid={`row-broadcast-${broadcast.id}`}>
                    <TableCell className="font-medium">{broadcast.name}</TableCell>
                    <TableCell>{getStatusBadge(broadcast.status)}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm">
                          {broadcast.sentCount} / {broadcast.totalRecipients}
                        </div>
                        <Progress value={(broadcast.sentCount / (broadcast.totalRecipients || 1)) * 100} className="h-1" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{calculateDeliveryRate(broadcast).toFixed(1)}%</span>
                        <Badge variant="outline" className="text-xs">
                          {broadcast.deliveredCount}/{broadcast.sentCount}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{calculateReadRate(broadcast).toFixed(1)}%</span>
                        <Badge variant="outline" className="text-xs">
                          {broadcast.readCount}/{broadcast.deliveredCount}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {broadcast.scheduledFor ? (
                        <span className="text-sm">
                          {format(new Date(broadcast.scheduledFor), "MMM d, yyyy HH:mm")}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Not scheduled</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditDialog(broadcast)}
                        data-testid={`button-edit-${broadcast.id}`}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Radio className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">No broadcasts found. Create your first broadcast to get started.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Broadcast Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Broadcast</DialogTitle>
            <DialogDescription>
              Create a new broadcast campaign to reach your customers
            </DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
              <FormField
                control={createForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Broadcast Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Summer Sale Campaign" {...field} data-testid="input-broadcast-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="templateId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message Template</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value || null)}
                      value={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-template">
                          <SelectValue placeholder="Select a template" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {templates && templates.length > 0 ? (
                          templates
                            .filter(t => t.status === 'approved')
                            .map((template) => (
                              <SelectItem key={template.id} value={template.id}>
                                {template.name}
                              </SelectItem>
                            ))
                        ) : (
                          <div className="p-2 text-sm text-muted-foreground">
                            No approved templates available
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select an approved template for this broadcast
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="segmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Segment (Optional)</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value || null)}
                      value={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-segment">
                          <SelectValue placeholder="All customers" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">All customers</SelectItem>
                        {segments && segments.length > 0 ? (
                          segments.map((segment) => (
                            <SelectItem key={segment.id} value={segment.id}>
                              {segment.name}
                            </SelectItem>
                          ))
                        ) : null}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Target specific customer segments or send to all customers
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="scheduledFor"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Schedule (Optional)</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            data-testid="button-schedule-date"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(new Date(field.value), "PPP HH:mm") : "Send now"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) => field.onChange(date || null)}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      Schedule the broadcast for later or send immediately
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-create">
                  {createMutation.isPending ? "Creating..." : "Create Broadcast"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Broadcast Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Broadcast Details</DialogTitle>
            <DialogDescription>
              View and update broadcast information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Recipients
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{selectedBroadcast?.totalRecipients || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Sent
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{selectedBroadcast?.sentCount || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Delivered
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{selectedBroadcast?.deliveredCount || 0}</div>
                  <Progress
                    value={selectedBroadcast ? calculateDeliveryRate(selectedBroadcast) : 0}
                    className="mt-2 h-2"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Read
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{selectedBroadcast?.readCount || 0}</div>
                  <Progress
                    value={selectedBroadcast ? calculateReadRate(selectedBroadcast) : 0}
                    className="mt-2 h-2"
                  />
                </CardContent>
              </Card>
            </div>

            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-status">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="scheduled">Scheduled</SelectItem>
                          <SelectItem value="sending">Sending</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="failed">Failed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                    Close
                  </Button>
                  <Button type="submit" disabled={updateMutation.isPending} data-testid="button-submit-edit">
                    {updateMutation.isPending ? "Updating..." : "Update Broadcast"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
