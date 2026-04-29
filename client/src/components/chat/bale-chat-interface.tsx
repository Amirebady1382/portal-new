import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { toPersianNumber } from "@/lib/persian-utils";
import { Send, Phone, MessageSquare, User, Building } from "lucide-react";
import MessageList from "./message-list";
import MessageInput from "./message-input";

interface Department {
  id: number;
  name: string;
  nameEn: string;
  description?: string;
  isActive: boolean;
}

interface Conversation {
  id: number;
  title?: string;
  customerName?: string;
  customerPhone?: string;
  departmentId: number;
  status: string;
  lastMessageAt?: string;
  lastMessage?: any;
  unreadCount?: number;
}

export default function BaleChatInterface() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedDepartment, setSelectedDepartment] = useState<number | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);

  // Fetch departments
  const { data: departments = [] } = useQuery({
    queryKey: ["/api/departments"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/departments");
      return response.json() as Promise<Department[]>;
    },
  });

  // Fetch conversations
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery({
    queryKey: ["/api/bale/conversations"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/bale/conversations");
      return response.json() as Promise<Conversation[]>;
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Create new conversation
  const createConversationMutation = useMutation({
    mutationFn: async (data: {
      departmentId: number;
      customerName: string;
      customerPhone?: string;
    }) => {
      const response = await apiRequest("POST", "/api/bale/conversations", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bale/conversations"] });
      setSelectedConversation(data.id);
      setShowNewChat(false);
      setCustomerName("");
      setCustomerPhone("");
      toast({
        title: "مکالمه جدید ایجاد شد",
        description: "اکنون می‌توانید پیام خود را ارسال کنید",
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطا در ایجاد مکالمه",
        description: error.message || "خطایی رخ داده است",
        variant: "destructive",
      });
    },
  });

  const handleCreateConversation = () => {
    if (!selectedDepartment || !customerName) {
      toast({
        title: "اطلاعات ناقص",
        description: "لطفاً واحد مورد نظر و نام مشتری را وارد کنید",
        variant: "destructive",
      });
      return;
    }

    createConversationMutation.mutate({
      departmentId: selectedDepartment,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || undefined,
    });
  };

  const filteredConversations = selectedDepartment
    ? conversations.filter(c => c.departmentId === selectedDepartment)
    : conversations;

  if (user?.role === "customer") {
    return <CustomerChatView />;
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] gap-4 p-4">
      {/* Conversations List */}
      <Card className="w-96 flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold mb-4">مکالمات چت</h2>
          
          {/* Department Filter */}
          <Select
            value={selectedDepartment?.toString() || "all"}
            onValueChange={(value) => {
              setSelectedDepartment(value === "all" ? null : parseInt(value));
              setSelectedConversation(null);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="انتخاب واحد" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه واحدها</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept.id} value={dept.id.toString()}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* New Chat Button */}
          <Button
            className="w-full mt-4"
            onClick={() => setShowNewChat(true)}
            variant="outline"
          >
            <MessageSquare className="h-4 w-4 ml-2" />
            گفتگوی جدید
          </Button>
        </div>

        <ScrollArea className="flex-1">
          {conversationsLoading ? (
            <div className="p-4 text-center text-gray-500">در حال بارگذاری...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">هیچ مکالمه‌ای یافت نشد</div>
          ) : (
            <div className="p-2">
              {filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`p-3 rounded-lg cursor-pointer transition-all mb-2 ${
                    selectedConversation === conversation.id
                      ? "bg-primary/10 border-primary"
                      : "hover:bg-gray-100"
                  }`}
                  onClick={() => setSelectedConversation(conversation.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {conversation.customerName?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">
                          {conversation.customerName || "ناشناس"}
                        </div>
                        {conversation.customerPhone && (
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {toPersianNumber(conversation.customerPhone)}
                          </div>
                        )}
                      </div>
                    </div>
                    {conversation.unreadCount ? (
                      <Badge variant="destructive" className="rounded-full">
                        {toPersianNumber(conversation.unreadCount.toString())}
                      </Badge>
                    ) : null}
                  </div>
                  {conversation.lastMessage && (
                    <div className="text-sm text-gray-500 mt-2 truncate">
                      {conversation.lastMessage.content}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </Card>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col">
        {showNewChat ? (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">ایجاد گفتگوی جدید</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">واحد مورد نظر</label>
                <Select
                  value={selectedDepartment?.toString() || ""}
                  onValueChange={(value) => setSelectedDepartment(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="انتخاب واحد" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id.toString()}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">نام مشتری</label>
                <Input
                  placeholder="نام و نام خانوادگی"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">شماره تماس (اختیاری)</label>
                <Input
                  placeholder="09123456789"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  dir="ltr"
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleCreateConversation} disabled={createConversationMutation.isPending}>
                  ایجاد گفتگو
                </Button>
                <Button variant="outline" onClick={() => setShowNewChat(false)}>
                  انصراف
                </Button>
              </div>
            </div>
          </div>
        ) : selectedConversation ? (
          <>
            <MessageList conversationId={selectedConversation} />
            <MessageInput conversationId={selectedConversation} />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>یک گفتگو را انتخاب کنید یا گفتگوی جدید ایجاد کنید</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// Customer Chat View
function CustomerChatView() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedDepartment, setSelectedDepartment] = useState<number | null>(null);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  // Fetch departments
  const { data: departments = [] } = useQuery({
    queryKey: ["/api/departments"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/departments");
      return response.json() as Promise<Department[]>;
    },
  });

  // Create conversation
  const createConversationMutation = useMutation({
    mutationFn: async (departmentId: number) => {
      console.log("🔄 Creating conversation for department:", departmentId);
      console.log("📋 User info:", { 
        fullName: user?.fullName, 
        phone: user?.phone,
        role: user?.role 
      });
      
      const response = await apiRequest("POST", "/api/bale/conversations", {
        departmentId,
        customerName: user?.fullName || "مشتری",
        customerPhone: user?.phone,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }
      
      const result = await response.json();
      console.log("✅ Conversation created:", result);
      return result;
    },
    onSuccess: (data) => {
      console.log("📝 Setting conversation ID:", data.id);
      setConversationId(data.id);
      queryClient.invalidateQueries({ queryKey: ["/api/bale/conversations"] });
      
      toast({
        title: "گفتگو آغاز شد",
        description: "اکنون می‌توانید پیام خود را ارسال کنید",
      });
    },
    onError: (error: any) => {
      console.error("❌ Conversation creation error:", error);
      toast({
        title: "خطا در ایجاد گفتگو",
        description: error.message || "خطایی رخ داده است",
        variant: "destructive",
      });
    },
  });

  const handleDepartmentSelect = (departmentId: number) => {
    console.log("🏢 Department selected:", departmentId);
    setSelectedDepartment(departmentId);
    createConversationMutation.mutate(departmentId);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4">
      <Card className="max-w-4xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-6">سیستم چت آنلاین</h2>
        
        {!conversationId ? (
          <div>
            <p className="text-gray-600 mb-6">
              لطفاً واحد مورد نظر خود را برای شروع گفتگو انتخاب کنید:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {departments.map((dept) => (
                <Card
                  key={dept.id}
                  className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleDepartmentSelect(dept.id)}
                >
                  <div className="flex items-center gap-3">
                    <Building className="h-8 w-8 text-primary" />
                    <div>
                      <h3 className="font-semibold">{dept.name}</h3>
                      {dept.description && (
                        <p className="text-sm text-gray-600">{dept.description}</p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ) : createConversationMutation.isPending ? (
          <div className="h-[calc(100vh-16rem)] flex flex-col items-center justify-center">
            <div className="text-center">
              <div className="loading-spinner h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold mb-2">در حال ایجاد گفتگو...</h3>
              <p className="text-gray-600">لطفاً چند لحظه صبر کنید</p>
            </div>
          </div>
        ) : (
          <div className="h-[calc(100vh-16rem)] flex flex-col">
            <div className="mb-4 pb-4 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">
                    واحد {departments.find(d => d.id === selectedDepartment)?.name}
                  </h3>
                  <p className="text-sm text-gray-600">کارشناسان ما پاسخگوی شما هستند</p>
                  {process.env.NODE_ENV === 'development' && (
                    <p className="text-xs text-blue-600 mt-1">
                      Debug: Conversation ID = {conversationId || "undefined"}
                    </p>
                  )}
                </div>
                <Badge variant="outline" className="bg-green-100 text-green-800">
                  آنلاین
                </Badge>
              </div>
            </div>
            
            <MessageList conversationId={conversationId} />
            <MessageInput conversationId={conversationId} />
          </div>
        )}
      </Card>
    </div>
  );
} 