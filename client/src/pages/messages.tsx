import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import MobileSidebar from "@/components/layout/mobile-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { formatPersianRelativeTime } from "@/lib/persian-utils";
import { 
  MessageCircle, 
  Send, 
  Plus,
  Search,
  Clock,
  CheckCircle,
  User,
  Bot,
  UserCog
} from "lucide-react";

export default function Messages() {
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isNewConversationOpen, setIsNewConversationOpen] = useState(false);
  const [newConversationTitle, setNewConversationTitle] = useState("");
  const [newConversationParticipant, setNewConversationParticipant] = useState("");
  const [newConversationInitialMessage, setNewConversationInitialMessage] = useState("");
  const [newConversationCompany, setNewConversationCompany] = useState("");
  const [newConversationSubject, setNewConversationSubject] = useState("");
  const [newConversationDepartment, setNewConversationDepartment] = useState("");
  const [newConversationPriority, setNewConversationPriority] = useState("medium");
  const [newConversationCategory, setNewConversationCategory] = useState("general");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  
  // قالب‌های آماده تیکت
  const ticketTemplates = [
    {
      id: "technical_support",
      title: "پشتیبانی فنی",
      category: "technical",
      priority: "medium",
      department: "investment",
      subject: "درخواست پشتیبانی فنی",
      content: "لطفاً مشکل فنی خود را به طور دقیق شرح دهید:\n\n- نوع مشکل:\n- زمان بروز مشکل:\n- مراحل انجام شده:\n- پیام‌های خطا (در صورت وجود):"
    },
    {
      id: "document_inquiry",
      title: "پرسش در مورد مدارک",
      category: "administrative", 
      priority: "low",
      department: "administrative",
      subject: "سوال در مورد مدارک مورد نیاز",
      content: "سلام، سوال من در مورد مدارک به شرح زیر است:\n\n- نوع مدرک مورد نظر:\n- هدف از ارسال مدرک:\n- سوال خاص:"
    },
    {
      id: "financial_inquiry",
      title: "پرسش مالی",
      category: "financial",
      priority: "high", 
      department: "investment",
      subject: "درخواست اطلاعات مالی",
      content: "درخواست اطلاعات یا راهنمایی در زمینه مالی:\n\n- موضوع مالی:\n- جزئیات درخواست:\n- مدارک پیوست (در صورت وجود):"
    },
    {
      id: "general_inquiry",
      title: "پرسش عمومی",
      category: "general",
      priority: "medium",
      department: "",
      subject: "درخواست اطلاعات",
      content: "سلام، لطفاً در مورد موضوع زیر راهنمایی فرمایید:\n\n- موضوع درخواست:\n- شرح کامل:"
    }
  ];
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: conversations = [] } = useQuery({
    queryKey: ["/api/conversations"],
  });

  const { data: rawMessages = [] } = useQuery<any[]>({
    queryKey: [`/api/conversations/${selectedConversationId}/messages`],
    enabled: selectedConversationId !== null,
    queryFn: async () => {
      if (selectedConversationId === null) return [];
      const response = await apiRequest("GET", `/api/conversations/${selectedConversationId}/messages`) as Response;
      return response.json();
    },
    refetchInterval: 2000, // Poll every 2 seconds for new messages
    staleTime: 0,
  });

  const messages = (rawMessages as any[]).map((m) => ({
    ...m,
    createdAt: m.createdAt ?? m.created_at,
    senderId: m.senderId ?? m.sender_id,
    status: m.status,
  }));

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
    enabled: user?.role === "admin" || user?.role === "employee",
  });

  const { data: allCompanies = [] } = useQuery<any[]>({
    queryKey: ["/api/companies"],
    enabled: user?.role === "admin" || user?.role === "employee",
  });

  // Helper function to get sender info
  const getSenderInfo = (message: any) => {
    if (message.messageType === "system" || message.senderId === 1) {
      return {
        name: "دستیار هوشمند",
        type: "ai",
        initials: "AI",
        isCurrentUser: false
      };
    }
    
    if (message.senderId === user?.id) {
      return {
        name: user?.fullName || "شما",
        type: "current_user",
        initials: getUserInitials(user?.fullName || "کاربر"),
        isCurrentUser: true
      };
    }
    
    // Find sender in users list
    const sender = users.find((u: any) => u.id === message.senderId);
    if (sender) {
      return {
        name: sender.fullName,
        type: sender.role === "employee" ? "employee" : "customer",
        initials: getUserInitials(sender.fullName),
        isCurrentUser: false
      };
    }
    
    return {
      name: "کاربر ناشناس",
      type: "unknown",
      initials: "؟",
      isCurrentUser: false
    };
  };

  // Helper function to get message styling
  const getMessageStyle = (senderType: string, isCurrentUser: boolean) => {
    if (isCurrentUser) {
      return {
        container: "justify-end",
        bubble: "bg-blue-500 text-white",
        textColor: "text-blue-100",
        avatarBg: "bg-blue-600"
      };
    }
    
    switch (senderType) {
      case "ai":
        return {
          container: "justify-start",
          bubble: "bg-gradient-to-r from-purple-100 to-blue-100 text-gray-800 border border-purple-200",
          textColor: "text-purple-600",
          avatarBg: "bg-gradient-to-r from-purple-500 to-blue-500"
        };
      case "employee":
        return {
          container: "justify-start", 
          bubble: "bg-orange-50 text-gray-800 border border-orange-200",
          textColor: "text-orange-600",
          avatarBg: "bg-orange-500"
        };
      default:
        return {
          container: "justify-start",
          bubble: "bg-gray-100 text-gray-800",
          textColor: "text-gray-500",
          avatarBg: "bg-gray-500"
        };
    }
  };

  // Helper function to get message icon
  const getMessageIcon = (senderType: string) => {
    switch (senderType) {
      case "ai":
        return <Bot className="h-3 w-3" />;
      case "employee":
        return <UserCog className="h-3 w-3" />;
      default:
        return <User className="h-3 w-3" />;
    }
  };

  // Helper function to get priority badge
  const getPriorityBadge = (priority: string) => {
    const styles = {
      low: "bg-green-100 text-green-800",
      medium: "bg-yellow-100 text-yellow-800", 
      high: "bg-orange-100 text-orange-800",
      urgent: "bg-red-100 text-red-800"
    };
    
    const labels = {
      low: "کم",
      medium: "متوسط",
      high: "بالا", 
      urgent: "بحرانی"
    };
    
    return (
      <Badge className={`${styles[priority as keyof typeof styles] || styles.medium} text-xs`}>
        {labels[priority as keyof typeof labels] || priority}
      </Badge>
    );
  };

  // Helper function to get category badge
  const getCategoryBadge = (category: string) => {
    const styles = {
      general: "bg-gray-100 text-gray-800",
      technical: "bg-blue-100 text-blue-800",
      financial: "bg-purple-100 text-purple-800", 
      administrative: "bg-indigo-100 text-indigo-800"
    };
    
    const labels = {
      general: "عمومی",
      technical: "فنی",
      financial: "مالی",
      administrative: "اداری"
    };
    
    return (
      <Badge className={`${styles[category as keyof typeof styles] || styles.general} text-xs`}>
        {labels[category as keyof typeof labels] || category}
      </Badge>
    );
  };

  // Helper function to calculate response time
  const getResponseTimeStatus = (conversation: any) => {
    if (conversation.status === "closed" || !conversation.createdAt) return null;
    
    const createdAt = new Date(conversation.createdAt);
    const now = new Date();
    const hoursElapsed = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60));
    
    // SLA targets based on priority
    const slaHours = {
      urgent: 2,
      high: 8, 
      medium: 24,
      low: 48
    };
    
    const targetHours = slaHours[conversation.priority as keyof typeof slaHours] || 24;
    const isOverdue = hoursElapsed > targetHours;
    
    if (isOverdue) {
      return (
        <Badge className="bg-red-100 text-red-800 text-xs">
          {hoursElapsed}ساعت (تاخیر)
        </Badge>
      );
    } else {
      const remainingHours = targetHours - hoursElapsed;
      return (
        <Badge className="bg-green-100 text-green-800 text-xs">
          {remainingHours}ساعت باقی‌مانده
        </Badge>
      );
    }
  };

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: { conversationId: number; content: string }) => {
      return apiRequest("POST", `/api/conversations/${messageData.conversationId}/messages`, {
        content: messageData.content
      });
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${selectedConversationId}/messages`] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
    onError: (error: any) => {
      toast({
        title: "خطا در ارسال پیام",
        description: error.message || "پیام ارسال نشد",
        variant: "destructive",
      });
    },
  });

  const closeConversationMutation = useMutation({
    mutationFn: async (conversationId: number) => {
      return apiRequest("PATCH", `/api/conversations/${conversationId}`, { status: "closed" });
    },
    onSuccess: () => {
      toast({ title: "تیکت بسته شد" });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
    onError: (error: any) => {
      toast({ title: "خطا در بستن تیکت", description: error.message || "عملیات ناموفق بود", variant: "destructive" });
    },
  });

  const createConversationMutation = useMutation({
    mutationFn: async (conversationData: { 
      title: string; 
      participantId?: number; 
      companyId?: number; 
      subject: string; 
      department: string;
      priority: string;
      category: string;
    }) => {
      const res = await apiRequest("POST", "/api/conversations", conversationData) as Response;
      return await res.json();
    },
    onSuccess: async (conversation: any) => {
      if (newConversationInitialMessage.trim()) {
        await apiRequest("POST", `/api/conversations/${conversation.id}/messages`, {
          content: newConversationInitialMessage.trim(),
        });
      }

      toast({
        title: "تیکت ایجاد شد",
        description: "گفتگو با موفقیت ایجاد شد",
      });

      setIsNewConversationOpen(false);
      setNewConversationTitle("");
      setNewConversationParticipant("");
      setNewConversationInitialMessage("");
      setNewConversationCompany("");
      setNewConversationSubject("");
      setNewConversationDepartment("");
      setNewConversationPriority("medium");
      setNewConversationCategory("general");
      setSelectedTemplate("");
      setSelectedConversationId(conversation.id);
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
    onError: (error: any) => {
      toast({
        title: "خطا در ایجاد تیکت",
        description: error.message || "ایجاد تیکت ناموفق بود",
        variant: "destructive",
      });
    },
  });

  // Claim ticket by employee
  const claimConversationMutation = useMutation({
    mutationFn: async (conversationId: number) => {
      return apiRequest("PATCH", `/api/conversations/${conversationId}`, { employeeId: user?.id });
    },
    onSuccess: () => {
      toast({ title: "تیکت به شما اختصاص یافت" });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${selectedConversationId}/messages`] });
    },
    onError: (error: any) => {
      toast({ title: "خطا در اختصاص تیکت", description: error.message || "عملیات ناموفق بود", variant: "destructive" });
    },
  });

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversationId) return;
    
    sendMessageMutation.mutate({
      conversationId: selectedConversationId,
      content: newMessage.trim()
    });
  };

  const handleCreateConversation = () => {
    if (!newConversationTitle.trim()) {
      toast({
        title: "عنوان الزامی",
        description: "لطفاً عنوان گفتگو را وارد کنید",
        variant: "destructive",
      });
      return;
    }

    const participantId = newConversationParticipant ? parseInt(newConversationParticipant) : undefined;
    const companyId = newConversationCompany ? parseInt(newConversationCompany) : undefined;

    createConversationMutation.mutate({
      title: newConversationTitle.trim(),
      participantId,
      companyId,
      subject: newConversationSubject.trim(),
      department: newConversationDepartment.trim(),
      priority: newConversationPriority,
      category: newConversationCategory,
    });
  };

  const handleCloseConversation = (id: number) => {
    closeConversationMutation.mutate(id);
  };

  const handleClaimConversation = (id: number) => {
    claimConversationMutation.mutate(id);
  };

  const handleTemplateSelection = (templateId: string) => {
    const template = ticketTemplates.find(t => t.id === templateId);
    if (template) {
      setNewConversationTitle(template.subject);
      setNewConversationSubject(template.subject);
      setNewConversationCategory(template.category);
      setNewConversationPriority(template.priority);
      setNewConversationDepartment(template.department);
      setNewConversationInitialMessage(template.content);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const normalizeConversation = (conv: any) => {
    return {
      ...conv,
      title: conv.title ?? conv.subject ?? "بدون عنوان",
      updatedAt: conv.updatedAt ?? conv.updated_at ?? conv.lastMessageAt ?? conv.last_message_at ?? conv.createdAt ?? conv.created_at,
      lastMessage: conv.lastMessage ?? conv.last_message,
      unreadCount: conv.unreadCount ?? conv.unread_count ?? 0,
      status: conv.status,
      employeeId: conv.employeeId ?? conv.employee_id,
    };
  };

  const normalizedConversations = (conversations as any[]).map(normalizeConversation);

  const filteredConversations = normalizedConversations.filter((conv: any) =>
    conv.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedConversation = normalizedConversations.find((conv: any) => conv.id === selectedConversationId);

  const getMessageStatusIcon = (status: string) => {
    switch (status) {
      case "read":
        return <CheckCircle className="h-3 w-3 text-blue-500" />;
      case "delivered":
        return <CheckCircle className="h-3 w-3 text-gray-500" />;
      default:
        return <Clock className="h-3 w-3 text-gray-400" />;
    }
  };

  const getUserInitials = (fullName: string) => {
    return fullName
      .split(" ")
      .map(name => name.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header />
      <MobileSidebar />
      
      <div className="flex pt-16">
        <Sidebar />
        
        <main className="flex-1 md:mr-64 p-4 md:p-6 fade-in">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              تیکت‌ها
            </h1>
            <p className="text-text-secondary">
              لیست درخواست‌های پشتیبانی شما
            </p>
          </div>

          <div className="grid grid-cols-12 gap-6 h-[calc(100vh-200px)]">
            {/* Conversations List */}
            <div className="col-span-4">
              <Card className="h-full flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">تیکت‌ها</CardTitle>
                    <Button
                      size="sm"
                      onClick={() => setIsNewConversationOpen(true)}
                      className="btn-hover"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="جستجو در تیکت‌ها..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pr-10"
                    />
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-0">
                  <div className="space-y-1">
                    {filteredConversations.length === 0 ? (
                      <div className="text-center py-8 px-4">
                        <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-text-secondary">تیکتی یافت نشد</p>
                      </div>
                    ) : (
                      filteredConversations.map((conversation: any) => (
                        <div
                          key={conversation.id}
                          onClick={() => setSelectedConversationId(conversation.id)}
                          className={`p-4 cursor-pointer hover:bg-gray-50 border-r-2 transition-colors ${
                            selectedConversationId === conversation.id
                              ? "bg-blue-50 border-r-primary"
                              : "border-r-transparent"
                          }`}
                        >
                          <div className="flex items-start space-x-3 space-x-reverse">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-primary text-white text-sm">
                                {getUserInitials(conversation.title)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start mb-1">
                                <h3 className="font-medium text-sm truncate">{conversation.title}</h3>
                                <span className="text-xs text-text-secondary">
                                  {formatPersianRelativeTime(conversation.updatedAt)}
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                {conversation.priority && getPriorityBadge(conversation.priority)}
                                {conversation.category && getCategoryBadge(conversation.category)}
                                {getResponseTimeStatus(conversation)}
                                {conversation.status === "closed" && (
                                  <Badge className="bg-gray-100 text-gray-800 text-xs">بسته شده</Badge>
                                )}
                              </div>
                              
                              {conversation.lastMessage && (
                                <p className="text-sm text-text-secondary truncate mt-1">
                                  {conversation.lastMessage}
                                </p>
                              )}
                              {conversation.unreadCount > 0 && (
                                <Badge className="bg-primary text-white text-xs mt-1">
                                  {conversation.unreadCount}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Messages Area */}
            <div className="col-span-8">
              <Card className="h-full flex flex-col">
                {selectedConversation ? (
                  <>
                    {/* Chat Header */}
                    <CardHeader className="pb-3 border-b">
                      <div className="flex items-center space-x-3 space-x-reverse">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary text-white">
                            {getUserInitials(selectedConversation.title)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col md:flex-row md:items-center md:space-x-4 md:space-x-reverse">
                          <div className="mb-2 md:mb-0">
                            <h3 className="font-bold">{selectedConversation.title}</h3>
                            <p className="text-sm text-text-secondary">
                              {selectedConversation.status === "closed" ? "بسته شده" : "در حال بررسی"}
                            </p>
                          </div>
                          {/* Claim button for employees */}
                          {user?.role === "employee" && (!selectedConversation.employeeId || selectedConversation.employeeId !== user.id) && selectedConversation.status !== "closed" && (
                            <Button size="sm" variant="default" onClick={() => handleClaimConversation(selectedConversation.id)} disabled={claimConversationMutation.isPending}>
                              دریافت تیکت
                            </Button>
                          )}

                          {/* Close button for assigned employee or admin */}
                          {selectedConversation.status !== "closed" && (user?.role === "admin" || (user?.role === "employee" && selectedConversation.employeeId === user.id)) && (
                            <Button size="sm" variant="outline" onClick={() => handleCloseConversation(selectedConversation.id)} disabled={closeConversationMutation.isPending}>
                              بستن تیکت
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    {/* Messages */}
                    <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                      {messages.length === 0 ? (
                        <div className="text-center py-8">
                          <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-text-secondary">هنوز پیامی ارسال نشده</p>
                        </div>
                      ) : (
                        messages.map((message: any) => {
                          const { name, type, initials, isCurrentUser } = getSenderInfo(message);
                          const { container, bubble, textColor, avatarBg } = getMessageStyle(type, isCurrentUser);
                          return (
                            <div
                              key={message.id}
                              className={`flex ${container} mb-4`}
                            >
                              {!isCurrentUser && (
                                <div className="flex flex-col items-center ml-2 space-y-1">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback className={`${avatarBg} text-white text-xs`}>
                                      {initials}
                                    </AvatarFallback>
                                  </Avatar>
                                  {getMessageIcon(type)}
                                </div>
                              )}
                              
                              <div className="flex flex-col">
                                {!isCurrentUser && (
                                  <div className="mb-1 mr-2">
                                    <span className={`text-xs font-medium ${textColor}`}>
                                      {name}
                                    </span>
                                  </div>
                                )}
                                
                                <div
                                  className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${bubble} shadow-sm`}
                                >
                                  <p className="text-sm">{message.content}</p>
                                  <div className={`flex items-center justify-between mt-2 ${
                                    isCurrentUser ? "text-blue-100" : "text-gray-500"
                                  }`}>
                                    <span className="text-xs">
                                      {(() => {
                                        const d = new Date(message.createdAt);
                                        return isNaN(d.getTime()) ? "--" : d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
                                      })()}
                                    </span>
                                    {isCurrentUser && (
                                      <div className="flex items-center space-x-1 space-x-reverse">
                                        {getMessageStatusIcon(message.status)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              {isCurrentUser && (
                                <div className="flex flex-col items-center mr-2 space-y-1">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback className={`${avatarBg} text-white text-xs`}>
                                      {initials}
                                    </AvatarFallback>
                                  </Avatar>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </CardContent>

                    {/* Message Input */}
                    <div className="p-4 border-t">
                      <div className="flex space-x-2 space-x-reverse">
                        <Input
                          placeholder="پیام خود را بنویسید..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                          className="flex-1"
                        />
                        <Button
                          onClick={handleSendMessage}
                          disabled={!newMessage.trim() || sendMessageMutation.isPending}
                          className="btn-hover"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <MessageCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        تیکتی انتخاب نشده
                      </h3>
                      <p className="text-gray-600 mb-6">
                        برای شروع، یکی از تیکت‌ها را انتخاب کنید یا تیکت جدید بسازید
                      </p>
                      <Button
                        onClick={() => setIsNewConversationOpen(true)}
                        className="btn-hover"
                      >
                        <Plus className="h-4 w-4 ml-1" />
                        تیکت جدید
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>

          {/* New Conversation Dialog */}
          {isNewConversationOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <Card className="w-full max-w-md mx-4">
                <CardHeader>
                  <CardTitle>تیکت جدید</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">قالب آماده (اختیاری)</label>
                    <select
                      value={selectedTemplate}
                      onChange={(e) => {
                        setSelectedTemplate(e.target.value);
                        if (e.target.value) {
                          handleTemplateSelection(e.target.value);
                        }
                      }}
                      className="w-full p-2 border rounded-md mb-4"
                    >
                      <option value="">انتخاب قالب آماده</option>
                      {ticketTemplates.map(template => (
                        <option key={template.id} value={template.id}>
                          {template.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">نام درخواست</label>
                    <Input
                      placeholder="نام درخواست را وارد کنید"
                      value={newConversationTitle}
                      onChange={(e) => setNewConversationTitle(e.target.value)}
                    />
                  </div>
                  
                  {(user?.role === "admin" || user?.role === "employee") && (
                    <div>
                      <label className="block text-sm font-medium mb-1">شرکت کننده (اختیاری)</label>
                      <select
                        value={newConversationParticipant}
                        onChange={(e) => setNewConversationParticipant(e.target.value)}
                        className="w-full p-2 border rounded-md"
                      >
                        <option value="">انتخاب کنید</option>
                        {users.map((u: any) => (
                          <option key={u.id} value={u.id}>
                            {u.fullName} ({u.role})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  {(user?.role === "admin" || user?.role === "employee") && (
                    <div>
                      <label className="block text-sm font-medium mb-1">شرکت *</label>
                      <select
                        value={newConversationCompany}
                        onChange={(e) => setNewConversationCompany(e.target.value)}
                        className="w-full p-2 border rounded-md"
                      >
                        <option value="">انتخاب کنید</option>
                        {allCompanies.map((c: any) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">موضوع</label>
                    <Input
                      placeholder="موضوع را وارد کنید"
                      value={newConversationSubject}
                      onChange={(e) => setNewConversationSubject(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">واحد رسیدگی</label>
                    <select
                      value={newConversationDepartment}
                      onChange={(e) => setNewConversationDepartment(e.target.value)}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="">انتخاب کنید</option>
                      <option value="investment">واحد سرمایه‌گذاری</option>
                      <option value="administrative">واحد اداری</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">اولویت</label>
                      <select
                        value={newConversationPriority}
                        onChange={(e) => setNewConversationPriority(e.target.value)}
                        className="w-full p-2 border rounded-md"
                      >
                        <option value="low">کم</option>
                        <option value="medium">متوسط</option>
                        <option value="high">بالا</option>
                        <option value="urgent">بحرانی</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">دسته‌بندی</label>
                      <select
                        value={newConversationCategory}
                        onChange={(e) => setNewConversationCategory(e.target.value)}
                        className="w-full p-2 border rounded-md"
                      >
                        <option value="general">عمومی</option>
                        <option value="technical">فنی</option>
                        <option value="financial">مالی</option>
                        <option value="administrative">اداری</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">شرح درخواست</label>
                    <Textarea
                      placeholder="شرح درخواست خود را وارد کنید..."
                      value={newConversationInitialMessage}
                      onChange={(e) => setNewConversationInitialMessage(e.target.value)}
                      rows={4}
                    />
                  </div>

                  <div className="flex justify-end space-x-2 space-x-reverse pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setIsNewConversationOpen(false)}
                    >
                      انصراف
                    </Button>
                    <Button
                      onClick={handleCreateConversation}
                      disabled={createConversationMutation.isPending}
                    >
                      {createConversationMutation.isPending ? "در حال ایجاد..." : "ایجاد"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}