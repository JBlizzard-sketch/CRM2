import { useState, useCallback, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Play, Save, Plus, Zap, Clock, GitBranch, Send, Webhook, Users } from 'lucide-react';

const nodeTypes = {
  trigger: { icon: Zap, label: 'Trigger', color: 'bg-purple-500' },
  delay: { icon: Clock, label: 'Delay', color: 'bg-blue-500' },
  condition: { icon: GitBranch, label: 'Condition', color: 'bg-yellow-500' },
  send_message: { icon: Send, label: 'Send Message', color: 'bg-green-500' },
  webhook: { icon: Webhook, label: 'Webhook', color: 'bg-orange-500' },
  segment_check: { icon: Users, label: 'Segment Check', color: 'bg-pink-500' },
};

interface WorkflowBuilderProps {
  businessId: string;
}

export default function WorkflowBuilder({ businessId: propBusinessId }: WorkflowBuilderProps) {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [workflowName, setWorkflowName] = useState('');
  const [workflowDescription, setWorkflowDescription] = useState('');

  const { data: workflow, isLoading } = useQuery<any>({
    queryKey: [`/api/workflows?id=${id}`],
    enabled: !!id,
  });

  const currentBusinessId = workflow?.businessId || propBusinessId;

  useEffect(() => {
    if (workflow) {
      setWorkflowName(workflow.name || '');
      setWorkflowDescription(workflow.description || '');
      
      const parsedNodes = typeof workflow.nodes === 'string' 
        ? JSON.parse(workflow.nodes) 
        : workflow.nodes;
      const parsedEdges = typeof workflow.edges === 'string' 
        ? JSON.parse(workflow.edges) 
        : workflow.edges;
        
      setNodes(parsedNodes || []);
      setEdges(parsedEdges || []);
    }
  }, [workflow, setNodes, setEdges]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!currentBusinessId) {
        throw new Error('No business selected');
      }
      
      const data = {
        businessId: currentBusinessId,
        name: workflowName,
        description: workflowDescription,
        trigger: (nodes as Node[]).find((n: Node) => n.type === 'trigger')?.data || {},
        nodes: JSON.parse(JSON.stringify(nodes)),
        edges: JSON.parse(JSON.stringify(edges)),
        status: 'draft',
      };

      if (id) {
        return apiRequest(`/api/workflows/${id}`, 'PATCH', data);
      } else {
        return apiRequest('/api/workflows', 'POST', data);
      }
    },
    onSuccess: (data: any) => {
      toast({
        title: 'Workflow saved',
        description: 'Your workflow has been saved successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/workflows'] });
      if (!id && data?.id) {
        navigate(`/workflow-builder/${data.id}`);
      }
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to save workflow.',
        variant: 'destructive',
      });
    },
  });

  const executeMutation = useMutation({
    mutationFn: () => apiRequest(`/api/workflows/${id}/execute`, 'POST', { context: {} }),
    onSuccess: () => {
      toast({
        title: 'Workflow executed',
        description: 'Your workflow is being executed.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to execute workflow.',
        variant: 'destructive',
      });
    },
  });

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const addNode = (type: string) => {
    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type,
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: {
        label: nodeTypes[type as keyof typeof nodeTypes]?.label || type,
      },
    };
    setNodes((nds: Node[]) => [...nds, newNode]);
  };

  const onNodeClick = useCallback((_event: any, node: Node) => {
    setSelectedNode(node);
    setIsConfigDialogOpen(true);
  }, []);

  const updateNodeData = (nodeId: string, newData: any) => {
    setNodes((nds: Node[]) =>
      nds.map((node: Node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...newData } } : node
      )
    );
  };

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b flex items-center justify-between gap-4">
        <div className="flex-1">
          <Input
            data-testid="input-workflow-name"
            placeholder="Workflow name"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="max-w-md"
          />
        </div>
        <div className="flex gap-2">
          <Button
            data-testid="button-save-workflow"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
          {id && (
            <Button
              data-testid="button-execute-workflow"
              onClick={() => executeMutation.mutate()}
              disabled={executeMutation.isPending}
              variant="default"
            >
              <Play className="w-4 h-4 mr-2" />
              Test Run
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 flex">
        <div className="w-64 border-r p-4 space-y-2">
          <h3 className="font-semibold mb-4">Node Palette</h3>
          {Object.entries(nodeTypes).map(([type, config]) => (
            <Button
              key={type}
              data-testid={`button-add-${type}`}
              variant="outline"
              className="w-full justify-start"
              onClick={() => addNode(type)}
            >
              <config.icon className="w-4 h-4 mr-2" />
              {config.label}
            </Button>
          ))}
        </div>

        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>
      </div>

      <NodeConfigDialog
        node={selectedNode}
        isOpen={isConfigDialogOpen}
        onClose={() => setIsConfigDialogOpen(false)}
        onSave={(data) => {
          if (selectedNode) {
            updateNodeData(selectedNode.id, data);
          }
          setIsConfigDialogOpen(false);
        }}
      />
    </div>
  );
}

function NodeConfigDialog({
  node,
  isOpen,
  onClose,
  onSave,
}: {
  node: Node | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
}) {
  const [config, setConfig] = useState<any>({});

  useEffect(() => {
    if (node) {
      setConfig(node.data || {});
    }
  }, [node]);

  if (!node) return null;

  const renderConfigForm = (): React.ReactNode => {
    switch (node.type) {
      case 'delay':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="delayMs">Delay (milliseconds)</Label>
              <Input
                id="delayMs"
                data-testid="input-delay-ms"
                type="number"
                value={config.delayMs || 0}
                onChange={(e) => setConfig({ ...config, delayMs: parseInt(e.target.value) })}
              />
            </div>
          </div>
        );

      case 'condition':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="field">Field</Label>
              <Input
                id="field"
                data-testid="input-condition-field"
                value={config.field || ''}
                onChange={(e) => setConfig({ ...config, field: e.target.value })}
                placeholder="e.g., customer.lifetimeValue"
              />
            </div>
            <div>
              <Label htmlFor="operator">Operator</Label>
              <Select
                value={config.operator || 'equals'}
                onValueChange={(value) => setConfig({ ...config, operator: value })}
              >
                <SelectTrigger id="operator" data-testid="select-operator">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="equals">Equals</SelectItem>
                  <SelectItem value="not_equals">Not Equals</SelectItem>
                  <SelectItem value="contains">Contains</SelectItem>
                  <SelectItem value="greater_than">Greater Than</SelectItem>
                  <SelectItem value="less_than">Less Than</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="value">Value</Label>
              <Input
                id="value"
                data-testid="input-condition-value"
                value={config.value || ''}
                onChange={(e) => setConfig({ ...config, value: e.target.value })}
              />
            </div>
          </div>
        );

      case 'send_message':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="channel">Channel</Label>
              <Select
                value={config.channel || 'whatsapp'}
                onValueChange={(value) => setConfig({ ...config, channel: value })}
              >
                <SelectTrigger id="channel" data-testid="select-channel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="template">Message Template</Label>
              <Textarea
                id="template"
                data-testid="textarea-message-template"
                value={config.template || ''}
                onChange={(e) => setConfig({ ...config, template: e.target.value })}
                placeholder="Hi {{customer.name}}, your order is ready!"
                rows={4}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use {'{{'} {'}'} for variable interpolation
              </p>
            </div>
          </div>
        );

      case 'webhook':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="url">Webhook URL</Label>
              <Input
                id="url"
                data-testid="input-webhook-url"
                value={config.url || ''}
                onChange={(e) => setConfig({ ...config, url: e.target.value })}
                placeholder="https://example.com/webhook"
              />
            </div>
            <div>
              <Label htmlFor="method">HTTP Method</Label>
              <Select
                value={config.method || 'POST'}
                onValueChange={(value) => setConfig({ ...config, method: value })}
              >
                <SelectTrigger id="method" data-testid="select-http-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="PATCH">PATCH</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      default:
        return (
          <div>
            <p className="text-muted-foreground">No configuration needed for this node type.</p>
          </div>
        ) as React.ReactNode;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent data-testid="dialog-node-config">
        <DialogHeader>
          <DialogTitle>Configure {node.data?.label || node.type}</DialogTitle>
          <DialogDescription>
            Set up the configuration for this workflow node.
          </DialogDescription>
        </DialogHeader>
        {renderConfigForm()}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-config">
            Cancel
          </Button>
          <Button onClick={() => onSave(config)} data-testid="button-save-config">
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
