import React, { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Send, Paperclip, Smile } from "lucide-react";

interface MessageInputProps {
  conversationId: number;
}

export default function MessageInput({ conversationId }: MessageInputProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  
  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      console.log("🔄 Sending message:", { conversationId, content });
      const response = await apiRequest("POST", `/api/bale/conversations/${conversationId}/messages`, {
        content,
        messageType: "text",
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }
      
      const result = await response.json();
      console.log("✅ Message sent successfully:", result);
      return result;
    },
    onSuccess: (data) => {
      console.log("📨 Message creation successful:", data);
      setMessage("");
      // Refetch messages
      queryClient.invalidateQueries({ 
        queryKey: [`/api/bale/conversations/${conversationId}/messages`] 
      });
      // Refetch conversations to update last message
      queryClient.invalidateQueries({ 
        queryKey: ["/api/bale/conversations"] 
      });
      
      toast({
        title: "پیام ارسال شد",
        description: "پیام شما با موفقیت ارسال شد",
      });
    },
    onError: (error: any) => {
      console.error("❌ Message send error:", error);
      toast({
        title: "خطا در ارسال پیام",
        description: error.message || "خطایی رخ داده است",
        variant: "destructive",
      });
    },
  });

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      console.log("⚠️ Empty message, not sending");
      return;
    }
    
    if (!conversationId) {
      console.error("❌ No conversation ID provided");
      toast({
        title: "خطا",
        description: "شناسه مکالمه یافت نشد",
        variant: "destructive",
      });
      return;
    }
    
    console.log("🚀 Attempting to send message:", { conversationId, message: trimmedMessage });
    sendMessageMutation.mutate(trimmedMessage);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      // TODO: Emit typing event via Socket.io
      
      // Stop typing after 3 seconds
      setTimeout(() => {
        setIsTyping(false);
        // TODO: Emit stop typing event
      }, 3000);
    }
  };

  return (
    <div className="border-t p-4">
      <div className="flex items-end gap-2">
        {/* Attachment Button */}
        <Button
          variant="ghost"
          size="icon"
          className="text-gray-500 hover:text-gray-700"
          disabled={sendMessageMutation.isPending}
        >
          <Paperclip className="h-5 w-5" />
        </Button>

        {/* Message Input */}
        <div className="flex-1">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              handleTyping();
            }}
            onKeyDown={handleKeyPress}
            placeholder={sendMessageMutation.isPending ? "در حال ارسال..." : "پیام خود را بنویسید..."}
            className="min-h-[60px] max-h-[200px] resize-none"
            disabled={sendMessageMutation.isPending}
          />
        </div>

        {/* Emoji Button */}
        <Button
          variant="ghost"
          size="icon"
          className="text-gray-500 hover:text-gray-700"
          disabled={sendMessageMutation.isPending}
        >
          <Smile className="h-5 w-5" />
        </Button>

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={!message.trim() || sendMessageMutation.isPending || !conversationId}
          size="icon"
          className={!conversationId ? "opacity-50 cursor-not-allowed" : ""}
        >
          {sendMessageMutation.isPending ? (
            <div className="loading-spinner h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Character Count and Status */}
      <div className="mt-2 flex justify-between items-center text-xs text-gray-500">
        <div>
          {!conversationId && (
            <span className="text-orange-600">در انتظار آماده‌سازی گفتگو...</span>
          )}
          {sendMessageMutation.isPending && (
            <span className="text-blue-600">در حال ارسال پیام...</span>
          )}
        </div>
        <div>
          {message.length > 0 && `${message.length} کاراکتر`}
        </div>
      </div>
    </div>
  );
} 