import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  MessageSquare,
  Send,
  CheckCircle2,
  Circle,
  MessageCircle,
  SmilePlus,
  Frown,
  Meh,
  Sparkles,
} from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ConversationWithCustomer, Message, NlpResult } from "@shared/schema";
import { cn } from "@/lib/utils";

interface ConversationsProps {
  businessId: string;
}

// This CRM is focused on WhatsApp conversations
const channelIcons = {
  whatsapp: SiWhatsapp,
  sms: SiWhatsapp,
  instagram: SiWhatsapp,
  tiktok: SiWhatsapp,
};

const channelColors = {
  whatsapp: "text-green-500",
  sms: "text-green-500",
  instagram: "text-green-500",
  tiktok: "text-green-500",
};

export default function Conversations({ businessId }: ConversationsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");

  const { data: conversations, isLoading: conversationsLoading, isError: conversationsError, error: conversationsErrorMsg } = useQuery<ConversationWithCustomer[]>({
    queryKey: ["/api/conversations", businessId],
    enabled: !!businessId,
  });

  const { data: messages, isLoading: messagesLoading, isError: messagesError, error: messagesErrorMsg } = useQuery<Message[]>({
    queryKey: ["/api/messages", selectedConversationId],
    enabled: !!selectedConversationId,
  });

  const { data: nlpResults } = useQuery<NlpResult[]>({
    queryKey: ["/api/nlp-results", selectedConversationId],
    enabled: !!selectedConversationId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'open' | 'closed' }) => {
      return apiRequest('PATCH', `/api/conversations/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", businessId] });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: { 
      conversationId: string; 
      businessId: string; 
      direction: 'outbound'; 
      content: string; 
      channel: 'whatsapp' | 'sms' | 'instagram' | 'tiktok';
    }) => {
      return apiRequest('POST', '/api/messages', messageData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages", selectedConversationId] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", businessId] });
      setMessageInput("");
    },
    onError: (error) => {
      console.error("Failed to send message:", error);
    },
  });

  const filteredConversations = conversations?.filter((conv) => {
    const searchLower = searchTerm.toLowerCase();
    return conv.customer.name.toLowerCase().includes(searchLower) ||
           conv.customer.phone.includes(searchTerm);
  });

  const selectedConversation = conversations?.find((c) => c.id === selectedConversationId);

  const toggleStatus = () => {
    if (selectedConversation) {
      updateStatusMutation.mutate({
        id: selectedConversation.id,
        status: selectedConversation.status === 'open' ? 'closed' : 'open',
      });
    }
  };

  const handleSendMessage = () => {
    if (!selectedConversation || !messageInput.trim()) return;

    sendMessageMutation.mutate({
      conversationId: selectedConversation.id,
      businessId: businessId,
      direction: 'outbound',
      content: messageInput.trim(),
      channel: selectedConversation.channel,
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const characterCount = messageInput.length;
  const isSms = selectedConversation?.channel === 'sms';
  const smsLimit = 160;
  const isOverLimit = isSms && characterCount > smsLimit;

  const getSentimentDisplay = (messageId: string) => {
    const nlp = nlpResults?.find(n => n.messageId === messageId);
    if (!nlp) return null;

    const sentimentConfig = {
      positive: {
        icon: SmilePlus,
        color: "text-green-500",
        bg: "bg-green-500/10",
        label: "Positive",
      },
      negative: {
        icon: Frown,
        color: "text-red-500",
        bg: "bg-red-500/10",
        label: "Negative",
      },
      neutral: {
        icon: Meh,
        color: "text-yellow-500",
        bg: "bg-yellow-500/10",
        label: "Neutral",
      },
    };

    const config = sentimentConfig[nlp.sentiment];
    const Icon = config.icon;
    const confidencePercent = Math.round(nlp.confidence * 100);

    return (
      <div className="flex items-center gap-2 mt-1">
        <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded-md", config.bg)}>
          <Icon className={cn("h-3 w-3", config.color)} />
          <span className={cn("text-xs font-medium", config.color)}>
            {config.label}
          </span>
          <span className="text-xs text-muted-foreground">
            {confidencePercent}%
          </span>
        </div>
        {nlp.intent && (
          <Badge variant="outline" className="gap-1 text-xs">
            <Sparkles className="h-3 w-3" />
            {nlp.intent}
          </Badge>
        )}
      </div>
    );
  };

  if (!businessId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Select a Business</h2>
          <p className="text-muted-foreground">
            Choose a business to view conversations
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold mb-2" data-testid="text-page-title">Conversations</h1>
        <p className="text-muted-foreground">Manage customer conversations across all channels</p>
      </div>

      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-12rem)]">
        {/* Conversations List */}
        <Card className="col-span-4">
          <CardContent className="p-0 h-full flex flex-col">
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-conversations"
                />
              </div>
            </div>

            <ScrollArea className="flex-1">
              {conversationsLoading ? (
                <div className="p-4 space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : conversationsError ? (
                <div className="p-8 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-destructive" />
                  <p className="text-sm text-destructive font-medium mb-2">Error Loading Conversations</p>
                  <p className="text-xs text-muted-foreground">
                    {conversationsErrorMsg?.message || "Failed to load conversations"}
                  </p>
                </div>
              ) : filteredConversations && filteredConversations.length > 0 ? (
                <div className="divide-y">
                  {filteredConversations.map((conversation) => {
                    const ChannelIcon = channelIcons[conversation.channel];
                    const isSelected = conversation.id === selectedConversationId;

                    return (
                      <button
                        key={conversation.id}
                        onClick={() => setSelectedConversationId(conversation.id)}
                        className={cn(
                          "w-full p-4 text-left hover-elevate active-elevate-2 transition-colors",
                          isSelected && "bg-muted"
                        )}
                        data-testid={`button-conversation-${conversation.id}`}
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="text-sm">
                              {conversation.customer.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="font-medium truncate">
                                {conversation.customer.name}
                              </span>
                              <ChannelIcon className={cn("h-4 w-4 flex-shrink-0", channelColors[conversation.channel])} />
                            </div>
                            <div className="flex items-center gap-2">
                              {conversation.status === 'open' ? (
                                <Circle className="h-3 w-3 text-green-500 fill-green-500" />
                              ) : (
                                <CheckCircle2 className="h-3 w-3 text-muted-foreground" />
                              )}
                              <span className="text-xs text-muted-foreground">
                                {conversation.status}
                              </span>
                              {conversation.lastMessageAt && (
                                <>
                                  <span className="text-xs text-muted-foreground">·</span>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(conversation.lastMessageAt).toLocaleDateString()}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No conversations found</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Message Thread */}
        <Card className="col-span-8">
          <CardContent className="p-0 h-full flex flex-col">
            {selectedConversation ? (
              <>
                {/* Header */}
                <div className="p-4 border-b flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {selectedConversation.customer.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{selectedConversation.customer.name}</div>
                      <div className="text-sm text-muted-foreground font-mono">
                        {selectedConversation.customer.phone}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant={selectedConversation.status === 'open' ? 'default' : 'outline'}
                    size="sm"
                    onClick={toggleStatus}
                    data-testid="button-toggle-status"
                  >
                    {selectedConversation.status === 'open' ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Mark Closed
                      </>
                    ) : (
                      <>
                        <Circle className="h-4 w-4 mr-2" />
                        Reopen
                      </>
                    )}
                  </Button>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  {messagesLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-16 w-3/4" />
                      ))}
                    </div>
                  ) : messages && messages.length > 0 ? (
                    <div className="space-y-4">
                      {messages.map((message) => {
                        const isInbound = message.direction === 'inbound';
                        const ChannelIcon = channelIcons[message.channel];

                        return (
                          <div
                            key={message.id}
                            className={cn(
                              "flex",
                              isInbound ? "justify-start" : "justify-end"
                            )}
                            data-testid={`message-${message.id}`}
                          >
                            <div
                              className={cn(
                                "max-w-[70%] rounded-lg p-3",
                                isInbound
                                  ? "bg-muted"
                                  : "bg-primary text-primary-foreground"
                              )}
                            >
                              <p className="text-sm">{message.content}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <ChannelIcon className={cn("h-3 w-3", isInbound ? channelColors[message.channel] : "opacity-70")} />
                                <span className={cn("text-xs", isInbound ? "text-muted-foreground" : "opacity-70")}>
                                  {message.createdAt
                                    ? new Date(message.createdAt).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })
                                    : 'Now'}
                                </span>
                              </div>
                              {isInbound && getSentimentDisplay(message.id)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">No messages yet</p>
                      </div>
                    </div>
                  )}
                </ScrollArea>

                {/* Message Input */}
                <div className="p-4 border-t">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder={`Type a message via ${selectedConversation.channel}...`}
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={handleKeyPress}
                      disabled={sendMessageMutation.isPending}
                      data-testid="input-message"
                    />
                    <Button 
                      size="icon" 
                      onClick={handleSendMessage}
                      disabled={!messageInput.trim() || sendMessageMutation.isPending || isOverLimit}
                      data-testid="button-send-message"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  {isSms && (
                    <p className={cn(
                      "text-xs mt-2",
                      isOverLimit ? "text-destructive font-medium" : "text-muted-foreground"
                    )}>
                      {characterCount}/{smsLimit} characters {isOverLimit && "(Exceeds SMS limit)"}
                    </p>
                  )}
                  {!isSms && characterCount > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {characterCount} characters
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-medium mb-2">Select a Conversation</h3>
                  <p className="text-sm text-muted-foreground">
                    Choose a conversation from the list to view messages
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
