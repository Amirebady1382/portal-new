import React, { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { toPersianNumber } from "@/lib/persian-utils";
import { Bot, User } from "lucide-react";

interface Message {
  id: number;
  conversationId: number;
  content: string;
  messageType: string;
  platform: string;
  senderType: string;
  baleUserId?: number;
  isDelivered: boolean;
  sentAt: string;
}

interface MessageListProps {
  conversationId: number;
}

export default function MessageList({ conversationId }: MessageListProps) {
  const { user } = useAuth();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch messages
  const { data: messages = [], isLoading } = useQuery({
    queryKey: [`/api/bale/conversations/${conversationId}/messages`],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/bale/conversations/${conversationId}/messages`);
      return response.json() as Promise<Message[]>;
    },
    enabled: !!conversationId,
    refetchInterval: 2000, // Poll every 2 seconds for new messages
  });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const formatTime = (dateString: string) => {
    if (!dateString) return "";
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return toPersianNumber(`${hours}:${minutes}`);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    
    const now = new Date();
    
    // Check if it's today
    if (date.toDateString() === now.toDateString()) {
      return "امروز";
    }
    
    // Check if it's yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return "دیروز";
    }
    
    // Otherwise show the date in Persian
    try {
      return date.toLocaleDateString("fa-IR", {
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      return date.toLocaleDateString();
    }
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups: { [key: string]: Message[] }, message) => {
    if (!message.sentAt) return groups;
    
    const date = new Date(message.sentAt);
    if (isNaN(date.getTime())) return groups;
    
    const dateKey = date.toDateString();
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(message);
    return groups;
  }, {});

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500">در حال بارگذاری پیام‌ها...</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-500">
          <p>هنوز پیامی ارسال نشده است</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedMessages).map(([date, dateMessages]) => (
            <div key={date}>
              {/* Date Separator */}
              <div className="flex items-center justify-center my-4">
                <div className="bg-gray-100 px-3 py-1 rounded-full text-sm text-gray-600">
                  {formatDate(dateMessages[0].sentAt)}
                </div>
              </div>

              {/* Messages */}
              {dateMessages.map((message) => {
                const isCustomer = message.senderType === "customer";
                const isMyMessage = user?.role === "customer" ? isCustomer : !isCustomer;

                return (
                  <div
                    key={message.id}
                    className={`flex items-start gap-3 ${
                      isMyMessage ? "flex-row-reverse" : ""
                    }`}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {isCustomer ? (
                          <User className="h-4 w-4" />
                        ) : (
                          <Bot className="h-4 w-4" />
                        )}
                      </AvatarFallback>
                    </Avatar>

                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        isMyMessage
                          ? "bg-primary text-primary-foreground"
                          : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      
                      <div className={`flex items-center gap-2 mt-1 ${
                        isMyMessage ? "justify-end" : ""
                      }`}>
                        <span className={`text-xs ${
                          isMyMessage ? "text-primary-foreground/70" : "text-gray-500"
                        }`}>
                          {formatTime(message.sentAt)}
                        </span>
                        
                        {message.platform === "bale" && (
                          <Badge variant="outline" className="text-xs py-0 px-1">
                            بله
                          </Badge>
                        )}
                        
                        {isMyMessage && message.isDelivered && (
                          <span className="text-xs">✓✓</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
      <div ref={messagesEndRef} />
    </ScrollArea>
  );
} 