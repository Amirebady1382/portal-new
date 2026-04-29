import { useState, useEffect } from "react";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import MobileSidebar from "@/components/layout/mobile-sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { 
  Activity, 
  Database, 
  Server, 
  Wifi, 
  HardDrive, 
  MemoryStick, 
  FileText,
  RefreshCw,
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle
} from "lucide-react";

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: HealthCheck;
    cache: HealthCheck;
    socket: HealthCheck;
    filesystem: HealthCheck;
    externalServices: HealthCheck;
    memory: HealthCheck;
    logging: HealthCheck;
  };
  metrics: SystemMetrics;
}

interface HealthCheck {
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  message?: string;
  details?: Record<string, any>;
  lastCheck: string;
}

interface SystemMetrics {
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  activeConnections: number;
  cacheStats: {
    size: number;
  };
  logStats: {
    total: number;
    errorRate: number;
    byLevel: Record<string, number>;
  };
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  source: string;
  category?: string;
}

export default function SystemHealth() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  const fetchHealthStatus = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.log("No auth token for health status");
        return;
      }
      
      const response = await fetch('/api/health/detailed', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          toast({
            title: "خطا",
            description: "لطفاً دوباره وارد سامانه شوید",
            variant: "destructive"
          });
          return;
        }
        throw new Error('Failed to fetch health status');
      }
      
      const result = await response.json();
      setHealthStatus(result.data || result);
    } catch (error) {
      console.error('Error fetching health status:', error);
      toast({
        title: "خطا",
        description: "خطا در دریافت وضعیت سلامت سیستم",
        variant: "destructive"
      });
    }
  };

  const fetchLogs = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.log("No auth token for logs");
        return;
      }
      
      const response = await fetch('/api/health/logs?limit=50', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          console.log("Unauthorized for logs");
          return;
        }
        throw new Error('Failed to fetch logs');
      }
      
      const result = await response.json();
      setLogs(result.data?.logs || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
      setLogs([]);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await Promise.all([fetchHealthStatus(), fetchLogs()]);
    setRefreshing(false);
  };

  const clearLogs = async () => {
    try {
      const response = await fetch('/api/health/logs', { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to clear logs');
      
      setLogs([]);
      toast({
        title: "موفقیت",
        description: "لاگ‌های سیستم پاک شدند"
      });
    } catch (error) {
      toast({
        title: "خطا",
        description: "خطا در پاک کردن لاگ‌ها",
        variant: "destructive"
      });
    }
  };

  const clearCache = async () => {
    try {
      const response = await fetch('/api/health/cache', { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to clear cache');
      
      toast({
        title: "موفقیت",
        description: "کش سیستم پاک شد"
      });
      
      // Refresh health status
      await fetchHealthStatus();
    } catch (error) {
      toast({
        title: "خطا",
        description: "خطا در پاک کردن کش",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchHealthStatus(), fetchLogs()]);
      setLoading(false);
    };

    loadData();

    // Auto refresh every 30 seconds
    const interval = setInterval(fetchHealthStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'up':
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'down':
      case 'unhealthy':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variant = status === 'up' || status === 'healthy' ? 'default' : 
                   status === 'degraded' ? 'secondary' : 'destructive';
    
    const text = status === 'up' ? 'سالم' :
                 status === 'healthy' ? 'سالم' :
                 status === 'degraded' ? 'کاهش عملکرد' :
                 status === 'down' ? 'خراب' :
                 status === 'unhealthy' ? 'ناسالم' : status;
    
    return <Badge variant={variant}>{text}</Badge>;
  };

  const formatUptime = (uptime: number) => {
    const hours = Math.floor(uptime / (1000 * 60 * 60));
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours} ساعت و ${minutes} دقیقه`;
  };

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error': return 'text-red-500';
      case 'warn': return 'text-yellow-500';
      case 'info': return 'text-blue-500';
      case 'debug': return 'text-gray-500';
      default: return 'text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        <Header />
        <MobileSidebar />
        <div className="flex pt-16">
          <Sidebar />
          <main className="flex-1 md:mr-64 p-4 md:p-6">
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin" />
              <span className="mr-2">در حال بارگیری وضعیت سیستم...</span>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!healthStatus) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        <Header />
        <MobileSidebar />
        <div className="flex pt-16">
          <Sidebar />
          <main className="flex-1 md:mr-64 p-4 md:p-6">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                خطا در دریافت وضعیت سلامت سیستم
              </AlertDescription>
            </Alert>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header />
      <MobileSidebar />
      <div className="flex pt-16">
        <Sidebar />
        <main className="flex-1 md:mr-64 p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">وضعیت سلامت سیستم</h1>
          <p className="text-gray-600">
            نظارت بر عملکرد و سلامت اجزای سیستم
          </p>
        </div>
        <div className="flex items-center gap-2">
          {getStatusIcon(healthStatus.status)}
          {getStatusBadge(healthStatus.status)}
          <Button 
            onClick={refreshData} 
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            {refreshing ? (
              <RefreshCw className="h-4 w-4 animate-spin ml-2" />
            ) : (
              <RefreshCw className="h-4 w-4 ml-2" />
            )}
            بروزرسانی
          </Button>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">زمان فعالیت</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatUptime(healthStatus.uptime)}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">نسخه سیستم</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{healthStatus.version}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">اتصالات فعال</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{healthStatus.metrics.activeConnections}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">استفاده از حافظه</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{healthStatus.metrics.memoryUsage.percentage}%</p>
            <Progress value={healthStatus.metrics.memoryUsage.percentage} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Detailed Status */}
      <Tabs defaultValue="services" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="services">سرویس‌ها</TabsTrigger>
          <TabsTrigger value="metrics">آمار سیستم</TabsTrigger>
          <TabsTrigger value="logs">لاگ‌ها</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Database */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  دیتابیس
                  {getStatusBadge(healthStatus.checks.database.status)}
                </CardTitle>
                <CardDescription>
                  {healthStatus.checks.database.message}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>زمان پاسخ:</span>
                    <span>{healthStatus.checks.database.responseTime}ms</span>
                  </div>
                  {healthStatus.checks.database.details && (
                    <>
                      <div className="flex justify-between">
                        <span>تعداد کاربران:</span>
                        <span>{healthStatus.checks.database.details.userCount}</span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Cache */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MemoryStick className="h-5 w-5" />
                  کش
                  {getStatusBadge(healthStatus.checks.cache.status)}
                </CardTitle>
                <CardDescription>
                  {healthStatus.checks.cache.message}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>اندازه کش:</span>
                    <span>{healthStatus.metrics.cacheStats.size} آیتم</span>
                  </div>
                  <Button onClick={clearCache} variant="outline" size="sm">
                    <Trash2 className="h-4 w-4 ml-2" />
                    پاک کردن کش
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Socket */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wifi className="h-5 w-5" />
                  Socket.io
                  {getStatusBadge(healthStatus.checks.socket.status)}
                </CardTitle>
                <CardDescription>
                  {healthStatus.checks.socket.message}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>کاربران آنلاین:</span>
                    <span>{healthStatus.checks.socket.details?.onlineUsers || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Filesystem */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5" />
                  فایل سیستم
                  {getStatusBadge(healthStatus.checks.filesystem.status)}
                </CardTitle>
                <CardDescription>
                  {healthStatus.checks.filesystem.message}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>زمان پاسخ:</span>
                    <span>{healthStatus.checks.filesystem.responseTime}ms</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* External Services */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  سرویس‌های خارجی
                  {getStatusBadge(healthStatus.checks.externalServices.status)}
                </CardTitle>
                <CardDescription>
                  {healthStatus.checks.externalServices.message}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {healthStatus.checks.externalServices.details && (
                    <>
                      <div className="flex justify-between">
                        <span>SMS:</span>
                        <span>{healthStatus.checks.externalServices.details.sms?.configured ? '✅' : '❌'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Rasmio:</span>
                        <span>{healthStatus.checks.externalServices.details.rasmio?.isOnline ? '✅' : '❌'}</span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Memory */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MemoryStick className="h-5 w-5" />
                  حافظه
                  {getStatusBadge(healthStatus.checks.memory.status)}
                </CardTitle>
                <CardDescription>
                  {healthStatus.checks.memory.message}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {healthStatus.checks.memory.details && (
                    <>
                      <div className="flex justify-between">
                        <span>استفاده شده:</span>
                        <span>{healthStatus.checks.memory.details.heapUsed} MB</span>
                      </div>
                      <div className="flex justify-between">
                        <span>کل:</span>
                        <span>{healthStatus.checks.memory.details.heapTotal} MB</span>
                      </div>
                      <Progress value={healthStatus.checks.memory.details.percentage} className="mt-2" />
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>آمار لاگ‌ها</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>کل لاگ‌ها:</span>
                    <span>{healthStatus.metrics.logStats.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>نرخ خطا:</span>
                    <span>{healthStatus.metrics.logStats.errorRate}%</span>
                  </div>
                  <Progress value={healthStatus.metrics.logStats.errorRate} className="mt-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>آمار حافظه</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>استفاده شده:</span>
                    <span>{healthStatus.metrics.memoryUsage.used} MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span>کل:</span>
                    <span>{healthStatus.metrics.memoryUsage.total} MB</span>
                  </div>
                  <Progress value={healthStatus.metrics.memoryUsage.percentage} className="mt-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">لاگ‌های اخیر سیستم</h3>
            <Button onClick={clearLogs} variant="outline" size="sm">
              <Trash2 className="h-4 w-4 ml-2" />
              پاک کردن لاگ‌ها
            </Button>
          </div>
          
          <Card>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                {logs.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    لاگی یافت نشد
                  </div>
                ) : (
                  <div className="divide-y">
                    {logs.map((log, index) => (
                      <div key={index} className="p-3 hover:bg-gray-50">
                        <div className="flex items-start gap-3">
                          <Badge variant="outline" className={getLevelColor(log.level)}>
                            {log.level}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{log.message}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(log.timestamp).toLocaleString('fa-IR')} - {log.source}
                              {log.category && ` - ${log.category}`}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
        </main>
      </div>
    </div>
  );
}
