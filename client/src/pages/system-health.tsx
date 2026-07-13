import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import MobileSidebar from "@/components/layout/mobile-sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Activity, 
  Server, 
  Database, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Cpu, 
  HardDrive, 
  Network,
  RefreshCw,
  Search,
  ExternalLink,
  Brain,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { toPersianNumber } from "@/lib/persian-utils";
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  uptime: number;
  environment: string;
  services: {
    database: ServiceStatus;
    rasmio: ServiceStatus;
    sms: ServiceStatus;
    bale: ServiceStatus;
    ai: {
      claude: ServiceStatus;
      gapgpt: ServiceStatus;
      perplexity: ServiceStatus;
    };
  };
  system: {
    cpu: number;
    memory: {
      total: number;
      used: number;
      free: number;
      percentage: number;
    };
    storage: {
      total: number;
      used: number;
      free: number;
      percentage: number;
    };
  };
}

interface ServiceStatus {
  status: 'up' | 'down' | 'unknown';
  latency?: number;
  message?: string;
  lastChecked: string;
}

export default function SystemHealth() {
  const [refreshInterval, setRefreshInterval] = useState<number>(30000); // 30 seconds

  const { data: health, isLoading, refetch, isFetching } = useQuery<HealthStatus>({
    queryKey: ['/api/health/detailed'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/health/detailed');
      return res as HealthStatus;
    },
    refetchInterval: refreshInterval
  });

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${toPersianNumber(d)} روز و ${toPersianNumber(h)} ساعت و ${toPersianNumber(m)} دقیقه`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'up':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'unhealthy':
      case 'down':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'up':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'degraded':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'unhealthy':
      case 'down':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/30" dir="rtl">
      <Header />
      
      <div className="flex pt-16">
        <Sidebar />
        <MobileSidebar />
        
        <main className="flex-1 md:mr-72 p-4 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                <Activity className="w-8 h-8 text-primary" />
                وضعیت سلامت سیستم
              </h1>
              <p className="text-gray-600">
                پایش لحظه‌ای زیرساخت، پایگاه داده و سرویس‌های جانبی
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Select value={refreshInterval.toString()} onValueChange={(v) => setRefreshInterval(parseInt(v))}>
                <SelectTrigger className="w-[180px] bg-white">
                  <Clock className="w-4 h-4 ml-2" />
                  بروزرسانی: {toPersianNumber(refreshInterval / 1000)} ثانیه
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10000">۱۰ ثانیه</SelectItem>
                  <SelectItem value="30000">۳۰ ثانیه</SelectItem>
                  <SelectItem value="60000">۱ دقیقه</SelectItem>
                  <SelectItem value="0">غیرفعال</SelectItem>
                </SelectContent>
              </Select>
              
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => refetch()}
                className={isFetching ? "animate-spin" : ""}
                disabled={isFetching}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <Card key={i} className="animate-pulse h-32"></Card>
              ))}
            </div>
          ) : !health ? (
            <div className="p-12 text-center bg-white rounded-xl border border-dashed border-gray-300">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">خطا در دریافت وضعیت سلامت</h2>
              <p className="text-gray-500 mb-6">سرور وضعیت سلامت در دسترس نیست.</p>
              <Button onClick={() => refetch()}>تلاش مجدد</Button>
            </div>
          ) : (
            <div className="space-y-8">
              {/* خلاصه وضعیت */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-r-4 border-r-primary">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-500 text-sm">وضعیت کلی</span>
                      <ShieldCheck className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`px-2 py-0.5 rounded-full text-xs font-bold ${getStatusColor(health.status)}`}>
                        {health.status === 'healthy' ? 'سالم' : health.status === 'degraded' ? 'دارای اختلال جزئی' : 'نامساعد'}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-500 text-sm">مدت زمان فعالیت</span>
                      <Clock className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="text-sm font-bold">
                      {formatUptime(health.uptime)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-500 text-sm">نسخه سیستم</span>
                      <Server className="w-5 h-5 text-gray-500" />
                    </div>
                    <div className="text-lg font-bold">
                      v{toPersianNumber(health.version)}
                    </div>
                    <div className="text-xs text-gray-400">
                      محیط: {health.environment === 'production' ? 'عملیاتی' : 'توسعه'}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-500 text-sm">آخرین بروزرسانی</span>
                      <RefreshCw className="w-5 h-5 text-green-500" />
                    </div>
                    <div className="text-sm font-bold">
                      {toPersianNumber(new Date(health.timestamp).toLocaleTimeString('fa-IR'))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* منابع سیستم */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Cpu className="w-5 h-5 text-blue-500" />
                      پردازشگر (CPU)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between mb-2 text-sm">
                      <span>استفاده</span>
                      <span className="font-bold">{toPersianNumber(health.system.cpu.toFixed(1))}%</span>
                    </div>
                    <Progress value={health.system.cpu} className="h-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <HardDrive className="w-5 h-5 text-purple-500" />
                      حافظه (RAM)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between mb-2 text-sm">
                      <span>{toPersianNumber((health.system.memory.used / 1024 / 1024 / 1024).toFixed(1))}GB از {toPersianNumber((health.system.memory.total / 1024 / 1024 / 1024).toFixed(1))}GB</span>
                      <span className="font-bold">{toPersianNumber(health.system.memory.percentage.toFixed(1))}%</span>
                    </div>
                    <Progress value={health.system.memory.percentage} className="h-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Network className="w-5 h-5 text-orange-500" />
                      فضای دیسک
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between mb-2 text-sm">
                      <span>استفاده شده</span>
                      <span className="font-bold">{toPersianNumber(health.system.storage.percentage.toFixed(1))}%</span>
                    </div>
                    <Progress value={health.system.storage.percentage} className="h-2" />
                  </CardContent>
                </Card>
              </div>

              <Tabs defaultValue="external" className="w-full">
                <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0 mb-6">
                  <TabsTrigger value="external" className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none px-6 pb-2">سرویس‌های خارجی</TabsTrigger>
                  <TabsTrigger value="infrastructure" className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none px-6 pb-2">زیرساخت داخلی</TabsTrigger>
                </TabsList>

                <TabsContent value="external" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <ServiceCard title="سرویس رسمیو (API)" data={health.services.rasmio} />
                    <ServiceCard title="سرویس پیامک (SMS.ir)" data={health.services.sms} />
                    <ServiceCard title="سرویس پیام‌رسان بله" data={health.services.bale} />
                  </div>
                  
                  <div className="mt-8">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <Brain className="w-6 h-6 text-purple-600" />
                      سرویس‌های هوش مصنوعی
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <ServiceCard title="Claude AI (Anthropic)" data={health.services.ai.claude} />
                      <ServiceCard title="GapGPT AI" data={health.services.ai.gapgpt} />
                      <ServiceCard title="Perplexity AI" data={health.services.ai.perplexity} />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="infrastructure">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <ServiceCard 
                      title="پایگاه داده (PostgreSQL)" 
                      data={health.services.database} 
                      icon={<Database className="w-5 h-5" />}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function ServiceCard({ title, data, icon }: { title: string, data: ServiceStatus, icon?: React.ReactNode }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'up': return 'bg-green-100 text-green-700 border-green-200';
      case 'down': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'up': return 'متصل';
      case 'down': return 'قطع';
      default: return 'نامشخص';
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {icon || <Server className="w-4 h-4 text-gray-400" />}
            <h4 className="font-bold text-sm">{title}</h4>
          </div>
          <Badge className={`text-[10px] px-1.5 py-0 ${getStatusColor(data.status)}`}>
            {getStatusText(data.status)}
          </Badge>
        </div>
        
        <div className="space-y-2">
          {data.latency !== undefined && (
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">تأخیر پاسخ:</span>
              <span className="font-mono text-blue-600">{toPersianNumber(data.latency)}ms</span>
            </div>
          )}
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">آخرین بررسی:</span>
            <span>{toPersianNumber(new Date(data.lastChecked).toLocaleTimeString('fa-IR'))}</span>
          </div>
          {data.message && (
            <div className="mt-2 text-[10px] p-1.5 bg-gray-50 rounded text-gray-500 break-words">
              {data.message}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
