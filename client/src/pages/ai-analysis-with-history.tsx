import { apiRequest } from "@/lib/queryClient";
import { useState, useEffect, useRef } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { 
  Brain, 
  Send, 
  Building, 
  Upload, 
  MessageCircle, 
  Sparkles, 
  FileText,
  User,
  Bot,
  RefreshCw,
  AlertCircle,
  Trash2,
  History,
  Plus,
  Edit3,
  Calendar,
  Clock,
  BarChart2,
  FileText as FileIcon
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toPersianNumber } from "@/lib/persian-utils";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from 'recharts';

// ============================
// TYPES & INTERFACES
// ============================

interface Company {
  id: number;
  name: string;
  nationalId: string;
  status: string;
}

interface ChatMessage {
  id: number;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  attachments?: string[];
}

interface ChatSession {
  id: number;
  userId: number;
  companyId: number;
  title: string;
  companyName: string;
  messageCount: number;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
  messages?: ChatMessage[];
}

interface ActiveChatSession {
  session: ChatSession;
  messages: ChatMessage[];
  isAnalyzing: boolean;
}

export default function AIAnalysisWithHistory() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State management
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [activeChatSession, setActiveChatSession] = useState<ActiveChatSession | null>(null);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [editingSessionTitle, setEditingSessionTitle] = useState<{ id: number; title: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"new" | "history" | "pitch-deck">("new");
  const [pitchDeckAnalysis, setPitchDeckAnalysis] = useState<any>(null);
  const [isAnalyzingPitchDeck, setIsAnalyzingPitchDeck] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pitchDeckInputRef = useRef<HTMLInputElement>(null);

  // ============================
  // DATA FETCHING
  // ============================

  // Fetch companies for selection
  const { data: companies = [], isLoading: companiesLoading } = useQuery({
    queryKey: ['/api/companies'],
    queryFn: async () => {
      const data: any = await apiRequest("GET", '/api/companies');
      return data || [];
    }
  });

  // Fetch company services when a company is selected
  const { data: companyServices = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['/api/companies', selectedCompanyId, 'services'],
    queryFn: async () => {
      if (!selectedCompanyId) return [];
      console.log('🔍 Fetching services for company:', selectedCompanyId);
      
      const data: any = await apiRequest("GET", `/api/companies/${selectedCompanyId}/services`);
      
      console.log('✅ Raw services data:', data);
      
      // Normalize: تبدیل به format قابل استفاده
      const services = (data.services || []).map((cs: any) => ({
        id: cs.serviceId,           // استفاده از serviceId به عنوان id
        title: cs.serviceTitle,      // استفاده از serviceTitle به عنوان title
        description: cs.serviceDescription,
        department: cs.serviceDepartment,
        category: cs.category || cs.serviceCategory,
        icon: cs.serviceIcon,
        estimatedDays: cs.estimatedDays,
        mappingId: cs.id,           // نگه داشتن mapping ID
        isActive: cs.isActive,
        activatedAt: cs.activatedAt
      }));
      
      console.log('✅ Normalized services:', services);
      return services;
    },
    enabled: !!selectedCompanyId
  });

  // Fetch chat sessions history
  const { data: chatSessions = [], isLoading: sessionsLoading, refetch: refetchSessions } = useQuery({
    queryKey: ['/api/ai-chat-sessions'],
    queryFn: async () => {
      const data: any = await apiRequest("GET", '/api/ai-chat-sessions');
      return data.sessions || [];
    }
  });

  // ============================
  // EFFECTS
  // ============================

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeChatSession?.messages]);

  // ============================
  // SESSION MANAGEMENT
  // ============================

  // Start new chat analysis
  const startNewAnalysis = async () => {
    if (!selectedCompanyId) {
      toast({
        title: "خطا",
        description: "لطفاً یک شرکت انتخاب کنید",
        variant: "destructive"
      });
      return;
    }

    const selectedCompany = companies.find((c: Company) => c.id === selectedCompanyId);
    if (!selectedCompany) return;

    // Get selected service info if exists
    const selectedService = selectedServiceId 
      ? companyServices.find((s: any) => s.id === selectedServiceId)
      : null;

    const sessionTitle = selectedService 
      ? `تحلیل ${selectedCompany.name} - ${selectedService.title}`
      : `تحلیل ${selectedCompany.name}`;

    // Create initial active session
    const newActiveSession: ActiveChatSession = {
      session: {
        id: 0, // Will be updated after server response
        userId: 0,
        companyId: selectedCompanyId,
        title: sessionTitle,
        companyName: selectedCompany.name,
        messageCount: 0,
        lastMessageAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      messages: [],
      isAnalyzing: true
    };

    setActiveChatSession(newActiveSession);
    setActiveTab("new");

    try {
      const analysisMessage = selectedService
        ? `لطفاً تحلیل کاملی از این شرکت با تمرکز بر خدمت "${selectedService.title}" ارائه دهید`
        : "لطفاً تحلیل کاملی از این شرکت ارائه دهید";

      // Get initial AI analysis
      const result: any = await apiRequest("POST", `/api/companies/${selectedCompanyId}/ai-chat`, { 
        message: analysisMessage, 
        serviceId: selectedService?.id,
        isInitial: true
      });

      const aiMessage: ChatMessage = {
        id: Date.now(),
        type: 'ai',
        content: result.response,
        timestamp: new Date()
      };

      setActiveChatSession(prev => prev ? {
        ...prev,
        session: { ...prev.session, id: result.sessionId },
        messages: [aiMessage],
        isAnalyzing: false
      } : null);

      // Refetch sessions to update history
      refetchSessions();

      toast({
        title: "✅ تحلیل آماده شد",
        description: `تحلیل شرکت ${selectedCompany.name} دریافت شد`
      });

    } catch (error) {
      console.error('Error starting analysis:', error);
      setActiveChatSession(prev => prev ? { ...prev, isAnalyzing: false } : null);
      toast({
        title: "خطا",
        description: "متأسفانه در شروع تحلیل خطایی رخ داد",
        variant: "destructive"
      });
    }
  };

  // Load existing chat session
  const loadChatSession = async (sessionId: number) => {
    try {
      const data: any = await apiRequest("GET", `/api/ai-chat-sessions/${sessionId}`);

      const session = data.session;

      const activeSession: ActiveChatSession = {
        session: session,
        messages: session.messages || [],
        isAnalyzing: false
      };

      setActiveChatSession(activeSession);
      
      // Restore serviceId from session
      if (session.serviceId) {
        setSelectedServiceId(session.serviceId);
        console.log(`🎯 Restored service ${session.serviceId} from session`);
      } else {
        setSelectedServiceId(null);
      }
      
      // Set company ID for loading services
      if (session.companyId) {
        setSelectedCompanyId(session.companyId);
      }
      
      setActiveTab("new");

      toast({
        title: "✅ جلسه بارگیری شد",
        description: `جلسه ${session.title} بارگیری شد`
      });

    } catch (error) {
      console.error('Error loading chat session:', error);
      toast({
        title: "خطا",
        description: "متأسفانه در بارگیری جلسه خطایی رخ داد",
        variant: "destructive"
      });
    }
  };

  // Delete chat session
  const deleteSession = async (sessionId: number) => {
    try {
      await apiRequest("DELETE", `/api/ai-chat-sessions/${sessionId}`);

      // Close active session if it's the deleted one
      if (activeChatSession?.session.id === sessionId) {
        setActiveChatSession(null);
      }

      // Refetch sessions
      refetchSessions();

      toast({
        title: "✅ جلسه حذف شد",
        description: "جلسه چت با موفقیت حذف شد"
      });

    } catch (error) {
      console.error('Error deleting session:', error);
      toast({
        title: "خطا",
        description: "متأسفانه در حذف جلسه خطایی رخ داد",
        variant: "destructive"
      });
    }
  };

  // Update session title
  const updateSessionTitle = async (sessionId: number, newTitle: string) => {
    try {
      await apiRequest("PUT", `/api/ai-chat-sessions/${sessionId}`, { title: newTitle });

      // Update active session if it's the updated one
      if (activeChatSession?.session.id === sessionId) {
        setActiveChatSession(prev => prev ? {
          ...prev,
          session: { ...prev.session, title: newTitle }
        } : null);
      }

      // Refetch sessions
      refetchSessions();
      setEditingSessionTitle(null);

      toast({
        title: "✅ عنوان به‌روزرسانی شد",
        description: "عنوان جلسه با موفقیت تغییر کرد"
      });

    } catch (error) {
      console.error('Error updating session title:', error);
      toast({
        title: "خطا",
        description: "متأسفانه در به‌روزرسانی عنوان خطایی رخ داد",
        variant: "destructive"
      });
    }
  };

  // ============================
  // CHAT FUNCTIONALITY
  // ============================

  // Send message to AI
  const sendMessage = async (deepAnalysis: boolean = false) => {
    if (!currentMessage.trim() || !activeChatSession) return;

    const userMessage: ChatMessage = {
      id: Date.now(),
      type: 'user',
      content: currentMessage,
      timestamp: new Date()
    };

    // Add user message and set analyzing state
    setActiveChatSession(prev => prev ? {
      ...prev,
      messages: [...prev.messages, userMessage],
      isAnalyzing: true
    } : null);

    const userMsgContent = currentMessage;
    setCurrentMessage("");

    try {
      const result: any = await apiRequest("POST", `/api/companies/${activeChatSession.session.companyId}/ai-chat`, {
        message: userMsgContent,
        sessionId: activeChatSession.session.id,
        deepAnalysis
      });

      const aiMessage: ChatMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: result.response,
        timestamp: new Date()
      };

      setActiveChatSession(prev => prev ? {
        ...prev,
        messages: [...prev.messages, aiMessage],
        isAnalyzing: false
      } : null);

      // Refetch sessions to update history tab
      refetchSessions();

    } catch (error) {
      console.error('Error sending message:', error);
      setActiveChatSession(prev => prev ? { ...prev, isAnalyzing: false } : null);
      toast({
        title: "خطا",
        description: "متأسفانه در ارسال پیام خطایی رخ داد",
        variant: "destructive"
      });
    }
  };

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !activeChatSession) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('companyId', activeChatSession.session.companyId.toString());

      const uploadResult: any = await apiRequest("POST", '/api/upload-document', formData);

      // دریافت اطلاعات فایل آپلود شده
      console.log('📤 نتیجه آپلود:', uploadResult);
      
      // استفاده از filename واقعی که سرور برمی‌گردونه (نام تصادفی)
      const actualFilename = uploadResult.filename || uploadResult.filePath || file.name;
      console.log('📁 نام واقعی فایل در سرور:', actualFilename);

      // Add user message about file upload
      const userMessage: ChatMessage = {
        id: Date.now(),
        type: 'user',
        content: `فایل ${file.name} آپلود شد. لطفاً این فایل را بررسی کنید و نظر خود را ارائه دهید.`,
        timestamp: new Date(),
        attachments: [file.name]
      };

      setActiveChatSession(prev => prev ? {
        ...prev,
        messages: [...prev.messages, userMessage],
        isAnalyzing: true
      } : null);

      // Send to AI for analysis - استفاده از نام واقعی فایل
      const aiResult: any = await apiRequest("POST", `/api/companies/${activeChatSession.session.companyId}/ai-chat`, {
        message: userMessage.content,
        uploadedFile: actualFilename,
        sessionId: activeChatSession.session.id
      });

      const aiMessage: ChatMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: aiResult.response,
        timestamp: new Date()
      };

      setActiveChatSession(prev => prev ? {
        ...prev,
        messages: [...prev.messages, aiMessage],
        isAnalyzing: false
      } : null);

      toast({
        title: "✅ فایل آپلود شد",
        description: `فایل ${file.name} با موفقیت آپلود و تحلیل شد`
      });

    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "خطا",
        description: "متأسفانه در آپلود فایل خطایی رخ داد",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Pitch Deck upload and analysis
  const handlePitchDeckUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedCompanyId) {
      toast({
        title: "خطا",
        description: "لطفاً ابتدا یک شرکت انتخاب کنید",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzingPitchDeck(true);
    setPitchDeckAnalysis(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Call the specialized endpoint
      const result: any = await apiRequest("POST", `/api/companies/${selectedCompanyId}/pitch-deck-analysis`, formData);

      setPitchDeckAnalysis(result);

      toast({
        title: "✅ تحلیل انجام شد",
        description: `تحلیل پیچ دک ${file.name} با موفقیت انجام شد`
      });

    } catch (error: any) {
      console.error('Error analyzing pitch deck:', error);
      toast({
        title: "خطا",
        description: error.message || "متأسفانه در تحلیل پیچ دک خطایی رخ داد",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzingPitchDeck(false);
      // Reset input
      if (pitchDeckInputRef.current) {
        pitchDeckInputRef.current.value = "";
      }
    }
  };

  // ============================
  // HELPER FUNCTIONS
  // ============================

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fa-IR', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getRelativeTime = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'کمتر از یک ساعت پیش';
    if (diffInHours < 24) return `${toPersianNumber(diffInHours)} ساعت پیش`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${toPersianNumber(diffInDays)} روز پیش`;
    
    return formatDate(dateString);
  };

  // ============================
  // RENDER COMPONENTS
  // ============================

  const renderChatMessage = (message: ChatMessage) => {
    const isUser = message.type === 'user';
    
    return (
      <div
        key={message.id}
        className={`flex w-full gap-3 ${isUser ? 'justify-start flex-row-reverse' : 'justify-start'}`}
      >
        <div className="flex-shrink-0 flex items-end">
          {isUser ? (
            <div className="bg-blue-100 p-2 rounded-full">
              <User className="w-5 h-5 text-blue-600" />
            </div>
          ) : (
            <div className="bg-emerald-100 p-2 rounded-full">
              <Bot className="w-5 h-5 text-emerald-600" />
            </div>
          )}
        </div>
        <div 
          className={`flex flex-col gap-1 max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}
        >
          <div className={`flex items-center gap-2 px-1 ${isUser ? 'flex-row-reverse' : ''}`}>
            <span className="font-semibold text-xs text-gray-500">
              {isUser ? 'شما' : 'مشاور هوشمند'}
            </span>
            <span className="text-[10px] text-gray-400">
              {formatDate(message.timestamp.toISOString())}
            </span>
          </div>
          <div 
            className={`p-4 shadow-sm dir-rtl text-right ${
              isUser 
                ? 'bg-blue-600 text-white rounded-2xl rounded-br-none' 
                : 'bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-tr-none'
            }`}
            dir="rtl"
          >
            <div className={`prose prose-sm max-w-none text-right ${isUser ? 'prose-invert text-white' : ''}`}>
              <p className="whitespace-pre-wrap leading-relaxed m-0 text-sm">
                {message.content}
              </p>
            </div>
            {message.attachments && message.attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-white/20">
                {message.attachments.map((filename, idx) => (
                  <Badge key={idx} variant={isUser ? "secondary" : "outline"} className="text-[10px] py-0.5">
                    <FileText className="w-3 h-3 ml-1" />
                    {filename}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ============================
  // MAIN RENDER
  // ============================

  // ============================
  // MAIN RENDER
  // ============================

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Brain className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">مشاور هوش مصنوعی</h1>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              🚀 Claude 4 Sonnet
            </Badge>
          </div>
          <p className="text-gray-600 text-lg">
            تحلیل هوشمند و مشاوره تخصصی برای شرکت‌های شما با قابلیت ذخیره تاریخچه چت‌ها
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 lg:grid-cols-3">
            <TabsTrigger value="new" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              چت جدید
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              تاریخچه چت‌ها ({toPersianNumber(chatSessions.length)})
            </TabsTrigger>
            <TabsTrigger value="pitch-deck" className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4" />
              تحلیل پیچ دک
            </TabsTrigger>
          </TabsList>

          {/* NEW CHAT TAB */}
          <TabsContent value="new" className="space-y-6">
            {!activeChatSession ? (
              // Company Selection
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="w-5 h-5" />
                    انتخاب شرکت برای تحلیل
                  </CardTitle>
                  <CardDescription>
                    ابتدا شرکتی را که می‌خواهید تحلیل کنید انتخاب کنید
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="company-select">انتخاب شرکت</Label>
                    <Select
                      value={selectedCompanyId?.toString() || ""}
                      onValueChange={(value) => {
                        setSelectedCompanyId(parseInt(value));
                        setSelectedServiceId(null); // Reset service when company changes
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="یک شرکت انتخاب کنید..." />
                      </SelectTrigger>
                      <SelectContent>
                        {companiesLoading ? (
                          <SelectItem value="loading" disabled>
                            <div className="flex items-center gap-2">
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              در حال بارگیری...
                            </div>
                          </SelectItem>
                        ) : companies.length > 0 ? (
                          companies.map((company: Company) => (
                            <SelectItem key={company.id} value={company.id.toString()}>
                              <div className="flex items-center justify-between w-full">
                                <span>{company.name}</span>
                                <Badge variant={company.status === 'active' ? 'default' : 'secondary'} className="mr-2">
                                  {company.status === 'active' ? 'فعال' : company.status}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="empty" disabled>
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4" />
                              شرکتی یافت نشد
                            </div>
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Service Selection - Optional */}
                  {selectedCompanyId && (
                    <div className="space-y-2">
                      <Label htmlFor="service-select">
                        انتخاب خدمت (اختیاری)
                        <span className="text-xs text-gray-500 mr-2">
                          برای تحلیل متمرکز بر یک خدمت خاص
                        </span>
                      </Label>
                      <Select
                        value={selectedServiceId?.toString() || "none"}
                        onValueChange={(value) => setSelectedServiceId(value === "none" ? null : parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="تحلیل کلی شرکت (بدون تمرکز بر خدمت خاص)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4" />
                              تحلیل کلی شرکت (همه خدمات)
                            </div>
                          </SelectItem>
                          {servicesLoading ? (
                            <SelectItem value="loading" disabled>
                              <div className="flex items-center gap-2">
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                در حال بارگیری خدمات...
                              </div>
                            </SelectItem>
                          ) : companyServices.length > 0 ? (
                            companyServices.map((service: any) => (
                              <SelectItem key={service.id} value={service.id.toString()}>
                                <div className="flex items-center gap-2">
                                  <span>{service.title}</span>
                                  {service.category && (
                                    <Badge variant="outline" className="text-xs">
                                      {service.category}
                                    </Badge>
                                  )}
                                </div>
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-services" disabled>
                              <div className="flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                خدمتی برای این شرکت فعال نشده
                              </div>
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <Button 
                    onClick={startNewAnalysis} 
                    className="w-full"
                    disabled={!selectedCompanyId || companiesLoading}
                  >
                    <Sparkles className="w-4 h-4 ml-2" />
                    {selectedServiceId ? 'شروع تحلیل متمرکز' : 'شروع تحلیل هوشمند'}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              // Active Chat Session
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Chat Area */}
                <div className="lg:col-span-3">
                  <Card className="h-[700px] flex flex-col">
                    <CardHeader className="border-b">
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <MessageCircle className="w-5 h-5" />
                          {activeChatSession.session.title}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {activeChatSession.session.companyName}
                          </Badge>
                          {activeChatSession.isAnalyzing && (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                              <RefreshCw className="w-3 h-3 animate-spin ml-1" />
                              در حال تحلیل...
                            </Badge>
                          )}
                        </div>
                      </CardTitle>
                    </CardHeader>
                    
                    <CardContent className="flex-1 flex flex-col p-0">
                      {/* Messages */}
                      <ScrollArea className="flex-1 p-4">
                        <div className="space-y-4">
                          {activeChatSession.messages.map(renderChatMessage)}
                          <div ref={messagesEndRef} />
                        </div>
                      </ScrollArea>
                      
                      {/* Input Area */}
                      <div className="border-t p-4 space-y-3">
                        <div className="flex gap-2">
                          <Textarea
                            value={currentMessage}
                            onChange={(e) => setCurrentMessage(e.target.value)}
                            placeholder="سوال یا درخواست خود را بنویسید..."
                            className="min-h-[80px] resize-none"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                sendMessage();
                              }
                            }}
                            disabled={activeChatSession.isAnalyzing}
                          />
                          <div className="flex flex-col gap-2">
                            <Button
                              onClick={() => sendMessage(false)}
                              disabled={!currentMessage.trim() || activeChatSession.isAnalyzing}
                              size="sm"
                              title="ارسال سریع"
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => sendMessage(true)}
                              disabled={!currentMessage.trim() || activeChatSession.isAnalyzing}
                              size="sm"
                              variant="secondary"
                              title="تحلیل عمیق اسناد (کندتر اما دقیق‌تر)"
                              className="bg-purple-600 hover:bg-purple-700 text-white"
                            >
                              <Sparkles className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={activeChatSession.isAnalyzing || isUploading}
                              title="آپلود فایل"
                            >
                              {isUploading ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <Upload className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                        
                        <div className="text-xs text-gray-500 flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Send className="w-3 h-3" />
                            ارسال سریع (بدون خواندن PDFها)
                          </span>
                          <span className="flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            تحلیل عمیق (خواندن کامل همه اسناد)
                          </span>
                          <span className="flex items-center gap-1">
                            <Upload className="w-3 h-3" />
                            آپلود فایل جدید
                          </span>
                        </div>
                        
                        <input
                          ref={fileInputRef}
                          type="file"
                          className="hidden"
                          accept=".pdf,.doc,.docx,.txt"
                          onChange={handleFileUpload}
                        />
                        
                        <div className="text-xs text-gray-500">
                          Enter برای ارسال، Shift+Enter برای خط جدید
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Session Info Sidebar */}
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">اطلاعات جلسه</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-1">
                        <div className="text-xs text-gray-500">شرکت</div>
                        <div className="font-medium text-sm">{activeChatSession.session.companyName}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-gray-500">تعداد پیام‌ها</div>
                        <div className="font-medium text-sm">{toPersianNumber(activeChatSession.messages.length)}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-gray-500">ایجاد شده</div>
                        <div className="font-medium text-sm">{formatDate(activeChatSession.session.createdAt)}</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setActiveChatSession(null)}
                  >
                    <Plus className="w-4 h-4 ml-2" />
                    چت جدید
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* HISTORY TAB */}
          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  تاریخچه چت‌ها
                </CardTitle>
                <CardDescription>
                  مشاهده و مدیریت چت‌های قبلی شما
                </CardDescription>
              </CardHeader>
              <CardContent>
                {sessionsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin ml-2" />
                    در حال بارگیری...
                  </div>
                ) : chatSessions.length > 0 ? (
                  <div className="space-y-3">
                    {chatSessions.map((session: ChatSession) => (
                      <div
                        key={session.id}
                        className="p-4 border rounded-lg hover:bg-gray-50/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              {editingSessionTitle?.id === session.id ? (
                                <div className="flex items-center gap-2 flex-1">
                                  <Input
                                    value={editingSessionTitle.title}
                                    onChange={(e) => setEditingSessionTitle({
                                      id: session.id,
                                      title: e.target.value
                                    })}
                                    className="text-sm"
                                    onKeyPress={(e) => {
                                      if (e.key === 'Enter') {
                                        updateSessionTitle(session.id, editingSessionTitle.title);
                                      }
                                    }}
                                  />
                                  <Button
                                    size="sm"
                                    onClick={() => updateSessionTitle(session.id, editingSessionTitle.title)}
                                  >
                                    ✓
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditingSessionTitle(null)}
                                  >
                                    ✕
                                  </Button>
                                </div>
                              ) : (
                                <>
                                  <h3 className="font-medium text-sm flex-1">{session.title}</h3>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditingSessionTitle({
                                      id: session.id,
                                      title: session.title
                                    })}
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </Button>
                                </>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <div className="flex items-center gap-1">
                                <Building className="w-3 h-3" />
                                {session.companyName}
                              </div>
                              <div className="flex items-center gap-1">
                                <MessageCircle className="w-3 h-3" />
                                {toPersianNumber(session.messageCount)} پیام
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {getRelativeTime(session.updatedAt)}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => loadChatSession(session.id)}
                            >
                              <MessageCircle className="w-3 h-3 ml-1" />
                              بازکردن
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>حذف جلسه چت</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    آیا مطمئن هستید که می‌خواهید این جلسه چت را حذف کنید؟ 
                                    این عمل قابل بازگشت نیست و تمام پیام‌ها حذف خواهند شد.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>انصراف</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteSession(session.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    حذف
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      هنوز چت‌ای ندارید
                    </h3>
                    <p className="text-gray-500 mb-4">
                      اولین چت خود را با انتخاب یک شرکت شروع کنید
                    </p>
                    <Button onClick={() => setActiveTab("new")}>
                      <Plus className="w-4 h-4 ml-2" />
                      شروع چت جدید
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* PITCH DECK ANALYSIS TAB */}
          <TabsContent value="pitch-deck" className="space-y-6">
            {!selectedCompanyId ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="w-5 h-5" />
                    انتخاب شرکت
                  </CardTitle>
                  <CardDescription>
                    لطفاً برای تحلیل پیچ دک، ابتدا یک شرکت را از تب "چت جدید" انتخاب کنید.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => setActiveTab("new")}>
                    رفتن به انتخاب شرکت
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Upload Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Upload className="w-5 h-5" />
                      آپلود پیچ دک (Pitch Deck)
                    </CardTitle>
                    <CardDescription>
                      فایل PDF پیچ دک شرکت {companies.find((c: any) => c.id === selectedCompanyId)?.name} را آپلود کنید تا تحلیل تخصصی دریافت کنید.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-10 hover:bg-gray-50 transition-colors cursor-pointer"
                         onClick={() => pitchDeckInputRef.current?.click()}>
                      {isAnalyzingPitchDeck ? (
                        <div className="flex flex-col items-center gap-4">
                          <RefreshCw className="w-10 h-10 text-blue-500 animate-spin" />
                          <p className="text-lg font-medium text-blue-600">در حال تحلیل هوشمند پیچ دک...</p>
                          <p className="text-sm text-gray-500">لطفاً صبر کنید، این فرآیند ممکن است تا یک دقیقه طول بکشد.</p>
                        </div>
                      ) : (
                        <>
                          <FileIcon className="w-12 h-12 text-gray-400 mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">برای آپلود کلیک کنید</h3>
                          <p className="text-sm text-gray-500 mb-4">پشتیبانی از فایل‌های PDF (حداکثر 30 مگابایت)</p>
                          <Button variant="outline">انتخاب فایل</Button>
                        </>
                      )}
                      <input
                        ref={pitchDeckInputRef}
                        type="file"
                        className="hidden"
                        accept=".pdf"
                        onChange={handlePitchDeckUpload}
                        disabled={isAnalyzingPitchDeck}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Results Section */}
                {pitchDeckAnalysis && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Radar Chart */}
                    <Card className="lg:col-span-2">
                      <CardHeader>
                        <CardTitle>نمودار راداری تحلیل</CardTitle>
                        <CardDescription>امتیازدهی هوش مصنوعی به بخش‌های کلیدی پیچ دک</CardDescription>
                      </CardHeader>
                      <CardContent className="h-[400px] flex justify-center" dir="ltr">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[
                            { subject: 'تیم (Team)', A: pitchDeckAnalysis.teamAnalysis.score, fullMark: 10 },
                            { subject: 'بازار (Market)', A: pitchDeckAnalysis.marketAnalysis.score, fullMark: 10 },
                            { subject: 'محصول (PMF)', A: pitchDeckAnalysis.productAnalysis.score, fullMark: 10 },
                            { subject: 'مدل درآمدی', A: pitchDeckAnalysis.financialAnalysis.score, fullMark: 10 },
                            { subject: 'ریسک', A: pitchDeckAnalysis.riskAnalysis?.score || 5, fullMark: 10 },
                          ]}>
                            <PolarGrid />
                            <PolarAngleAxis dataKey="subject" />
                            <PolarRadiusAxis angle={30} domain={[0, 10]} />
                            <Radar name="امتیاز" dataKey="A" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                            <Legend />
                          </RadarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* Detailed Breakdown */}
                    {/* Team */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>تحلیل تیم (Team)</span>
                          <Badge variant={pitchDeckAnalysis.teamAnalysis.score >= 7 ? "default" : "secondary"}>
                            {toPersianNumber(pitchDeckAnalysis.teamAnalysis.score)}/10
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-gray-700">{pitchDeckAnalysis.teamAnalysis.summary}</p>
                        <div>
                          <h4 className="text-xs font-bold text-green-600 mb-1">نقاط قوت:</h4>
                          <ul className="list-disc list-inside text-xs text-gray-600">
                            {pitchDeckAnalysis.teamAnalysis.strengths.map((s: string, i: number) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-red-600 mb-1">نقاط ضعف:</h4>
                          <ul className="list-disc list-inside text-xs text-gray-600">
                            {pitchDeckAnalysis.teamAnalysis.weaknesses.map((w: string, i: number) => (
                              <li key={i}>{w}</li>
                            ))}
                          </ul>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Market */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>تحلیل بازار (Market)</span>
                          <Badge variant={pitchDeckAnalysis.marketAnalysis.score >= 7 ? "default" : "secondary"}>
                            {toPersianNumber(pitchDeckAnalysis.marketAnalysis.score)}/10
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-gray-700">{pitchDeckAnalysis.marketAnalysis.summary}</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-gray-50 p-2 rounded">
                            <span className="block font-bold text-gray-500">اندازه بازار:</span>
                            {pitchDeckAnalysis.marketAnalysis.marketSize}
                          </div>
                          <div className="bg-gray-50 p-2 rounded">
                            <span className="block font-bold text-gray-500">رقابت:</span>
                            {pitchDeckAnalysis.marketAnalysis.competition}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Product (PMF) */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>تناسب محصول با بازار (PMF)</span>
                          <Badge variant={pitchDeckAnalysis.productAnalysis.score >= 7 ? "default" : "secondary"}>
                            {toPersianNumber(pitchDeckAnalysis.productAnalysis.score)}/10
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-gray-700">{pitchDeckAnalysis.productAnalysis.summary}</p>
                        <div className="bg-blue-50 p-3 rounded text-xs text-blue-800">
                          <strong>مزیت رقابتی:</strong> {pitchDeckAnalysis.productAnalysis.competitiveAdvantage}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Financial (Revenue Model) */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>مدل درآمدی و مالی</span>
                          <Badge variant={pitchDeckAnalysis.financialAnalysis.score >= 7 ? "default" : "secondary"}>
                            {toPersianNumber(pitchDeckAnalysis.financialAnalysis.score)}/10
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-gray-700">{pitchDeckAnalysis.financialAnalysis.summary}</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-gray-50 p-2 rounded">
                            <span className="block font-bold text-gray-500">ساختار سرمایه:</span>
                            {pitchDeckAnalysis.financialAnalysis.capitalStructure}
                          </div>
                          <div className="bg-gray-50 p-2 rounded">
                            <span className="block font-bold text-gray-500">پتانسیل رشد:</span>
                            {pitchDeckAnalysis.financialAnalysis.growthPotential}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Overall Recommendation */}
                    <Card className="lg:col-span-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-blue-600" />
                          توصیه نهایی هوش مصنوعی
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-lg font-medium text-gray-900 leading-relaxed">
                          {pitchDeckAnalysis.overallRecommendation.reasoning}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-4">
                          {pitchDeckAnalysis.overallRecommendation.nextSteps.map((step: string, i: number) => (
                            <Badge key={i} variant="outline" className="bg-white text-blue-700 border-blue-200">
                              {step}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

