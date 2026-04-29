import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useOperationErrorHandler } from "@/hooks/use-error-handler";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { toPersianNumber } from "@/lib/persian-utils";
import { 
  Send, 
  Paperclip, 
  MoreVertical,
  Phone,
  Video,
  Info
} from "lucide-react";

interface ChatProps {
  conversationId: number;
  conversation?: any;
}

export default function Chat({ conversationId, conversation }: ChatProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { createMutationErrorHandler } = useOperationErrorHandler("ارسال پیام");
  const [newMessage, setNewMessage] = useState("");
  const [isAITyping, setIsAITyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: [`/api/conversations/${conversationId}/messages`],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/conversations/${conversationId}/messages`) as Response;
      return response.json();
    },
    enabled: !!conversationId,
    refetchInterval: 2000, // Faster polling for new messages (2 seconds)
    staleTime: 0, // Always refetch to get latest messages
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: { content: string }) => {
      const response = await apiRequest("POST", `/api/conversations/${conversationId}/messages`, {
        content: messageData.content,
        messageType: "text",
      }) as Response;
      return response.json();
    },
    onSuccess: () => {
      setNewMessage("");
      
      // If user is a customer, show AI typing indicator
      if (user?.role === "customer") {
        setIsAITyping(true);
        // Hide typing indicator after 10 seconds (AI should respond by then)
        setTimeout(() => setIsAITyping(false), 10000);
      }
      
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${conversationId}/messages`] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
    onError: (error: any) => {
      setIsAITyping(false);
      createMutationErrorHandler()(error);
    },
  });

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    
    sendMessageMutation.mutate({ content: newMessage });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    
    // Debug: Log messages
    if (messages && Array.isArray(messages)) {
      console.log('📨 Messages received:', messages.length);
      messages.forEach((msg, index) => {
        console.log(`Message ${index + 1}:`, {
          id: msg.id,
          senderId: msg.senderId,
          messageType: msg.messageType,
          content: msg.content?.substring(0, 50) + '...'
        });
      });
    }
    
    // Hide AI typing indicator when new messages arrive
    if (isAITyping && messages && Array.isArray(messages) && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      // If the last message is from system (AI), hide typing indicator
      if (lastMessage?.messageType === "system" || lastMessage?.senderId === 1) {
        console.log('🤖 AI message detected, hiding typing indicator');
        setIsAITyping(false);
      }
    }
  }, [messages, isAITyping]);

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString("fa-IR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      return date.toLocaleDateString("fa-IR", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  };

  const getMessageStatus = (message: any) => {
    if (message.senderId !== user?.id) return null;
    
    switch (message.status) {
      case "sent":
        return "✓";
      case "delivered":
        return "✓✓";
      case "read":
        return "✓✓";
      default:
        return "";
    }
  };

  const getMessageStatusColor = (message: any) => {
    if (message.senderId !== user?.id) return "";
    
    switch (message.status) {
      case "read":
        return "text-blue-400";
      case "delivered":
        return "text-gray-400";
      default:
        return "text-gray-300";
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-text-secondary">در حال بارگذاری پیام‌ها...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center ml-3">
            <span className="text-white font-bold text-sm">
              {conversation?.company?.name?.charAt(0) || "ش"}
            </span>
          </div>
          <div>
            <p className="font-medium text-text-primary">
              {conversation?.company?.name || "گفتگو"}
            </p>
            <div className="flex items-center space-x-2 space-x-reverse">
              <Badge 
                variant="outline" 
                className={`text-xs ${
                  conversation?.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                }`}
              >
                {conversation?.status === "active" ? "فعال" : "غیرفعال"}
              </Badge>
              {user?.role === "customer" && conversation?.employee && (
                <span className="text-xs text-text-secondary">
                  کارشناس: {conversation.employee.fullName}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 space-x-reverse">
          <Button variant="ghost" size="sm" className="text-text-secondary hover:text-primary">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-text-secondary hover:text-primary">
            <Video className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-text-secondary hover:text-primary">
            <Info className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-text-secondary hover:text-primary">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-text-secondary">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-lg font-medium mb-2">هنوز پیامی رد و بدل نشده</p>
            <p className="text-sm">اولین پیام خود را ارسال کنید تا گفتگو شروع شود</p>
          </div>
        ) : (
          messages.map((message: any, index: number) => {
            const isMyMessage = message.senderId === user?.id;
            const showSender = index === 0 || messages[index - 1].senderId !== message.senderId;
            
            return (
              <div key={message.id} className={`flex ${isMyMessage ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-xs lg:max-w-md ${isMyMessage ? "order-2" : "order-1"}`}>
                  {showSender && !isMyMessage && (
                    <p className="text-xs text-text-secondary mb-1 px-3">
                      {message.messageType === "system" || message.senderId === 1 
                        ? "🤖 هوش مصنوعی" 
                        : (message.sender?.fullName || "کاربر")
                      }
                    </p>
                  )}
                  <div
                    className={`message-bubble rounded-lg p-3 shadow-sm ${
                      isMyMessage
                        ? "bg-primary text-primary-foreground"
                        : message.messageType === "system" || message.senderId === 1
                        ? "bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 text-text-primary"
                        : "bg-white border border-gray-200 text-text-primary"
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </p>
                    
                    {/* Message metadata */}
                    <div className="flex items-center justify-between mt-2 space-x-2 space-x-reverse">
                      <span className={`text-xs ${
                        isMyMessage ? "text-primary-foreground/75" : "text-text-secondary"
                      }`}>
                        {toPersianNumber(formatMessageTime(message.createdAt))}
                      </span>
                      
                      {isMyMessage && (
                        <span className={`text-xs ${getMessageStatusColor(message)}`}>
                          {getMessageStatus(message)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        
        {/* AI Typing Indicator */}
        {isAITyping && user?.role === "customer" && (
          <div className="flex justify-start">
            <div className="max-w-xs lg:max-w-md">
              <p className="text-xs text-text-secondary mb-1 px-3">
                هوش مصنوعی
              </p>
              <div className="bg-white border border-gray-200 text-text-primary rounded-lg p-3 shadow-sm">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <div className="flex space-x-1 space-x-reverse">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                  <span className="text-xs text-text-secondary">در حال تایپ...</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex items-end space-x-3 space-x-reverse">
          <Button
            variant="ghost"
            size="sm"
            className="text-text-secondary hover:text-primary p-2 rounded-lg hover:bg-gray-100 transition-all"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          
          <div className="flex-1">
            <Input
              placeholder="پیام خود را بنویسید..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={sendMessageMutation.isPending}
              className="border-gray-300 focus:border-primary focus:ring-primary"
            />
          </div>
          
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sendMessageMutation.isPending}
            className="btn-hover"
          >
            {sendMessageMutation.isPending ? (
              <div className="loading-spinner h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        {/* Typing indicator placeholder */}
        <div className="mt-2 h-4">
          {/* Add typing indicator here if needed */}
        </div>
      </div>
    </div>
  );
}
