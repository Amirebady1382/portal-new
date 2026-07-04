import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import MobileSidebar from "@/components/layout/mobile-sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, Send, MessageCircle, AlertTriangle, CheckCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSocket } from "@/hooks/use-socket";
import { useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { faIR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Notifications() {
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const { toast } = useToast();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res: any = await apiRequest('GET', '/api/notifications');
      return res;
    }
  });

  const markAsRead = useMutation({
    mutationFn: async (id: number) => {
      const res: any = await apiRequest('PUT', `/api/notifications/read/${id}`);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const res: any = await apiRequest('PUT', `/api/notifications/read-all`);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({ title: "موفق", description: "همه اعلان‌ها خوانده شدند" });
    }
  });

  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notification: any) => {
      queryClient.setQueryData(['notifications'], (old: any[] = []) => {
         if (!Array.isArray(old)) return [notification];
         return [notification, ...old];
      });
    };

    socket.on('new_notification', handleNewNotification);

    return () => {
      socket.off('new_notification', handleNewNotification);
    };
  }, [socket, queryClient]);

  const unreadCount = Array.isArray(notifications) ? notifications.filter((n: any) => !n.isRead).length : 0;

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header />
      <MobileSidebar />
      
      <div className="flex pt-16">
        <Sidebar />
        
        <main className="flex-1 md:mr-72 p-4 md:p-6 fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">اعلان‌های سیستم</h1>
                <p className="text-muted-foreground">مدیریت اعلان‌ها و پیام‌های سیستم</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => markAllAsRead.mutate()}
                  disabled={unreadCount === 0 || markAllAsRead.isPending}
                >
                  <CheckCircle className="w-4 h-4 ml-2" />
                  خواندن همه ({unreadCount})
                </Button>
              </div>
            </div>

            <div className="grid gap-4 mt-8">
              {isLoading ? (
                <p>در حال بارگذاری...</p>
              ) : !Array.isArray(notifications) || notifications.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <Bell className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">اعلان جدیدی وجود ندارد</h3>
                    <p className="text-gray-600">تمام اعلان‌ها در اینجا نمایش داده خواهد شد</p>
                  </CardContent>
                </Card>
              ) : notifications.map((notification: any) => (
                <Card key={notification.id} className={`${!notification.isRead ? 'border-primary/50 bg-primary/5' : ''}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          notification.type === 'info' ? 'bg-blue-100 text-blue-600' :
                          notification.type === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                          notification.type === 'success' ? 'bg-green-100 text-green-600' :
                          'bg-red-100 text-red-600'
                        }`}>
                          {notification.type === 'info' ? <MessageCircle className="w-4 h-4" /> :
                           notification.type === 'warning' ? <AlertTriangle className="w-4 h-4" /> :
                           <Bell className="w-4 h-4" />}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{notification.title}</CardTitle>
                          <CardDescription className="text-sm text-muted-foreground">
                            {notification.createdAt ? formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: faIR }) : ''}
                          </CardDescription>
                        </div>
                      </div>
                      {!notification.isRead && (
                        <Badge variant="default" className="text-xs">
                          جدید
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-3">{notification.message}</p>
                    <div className="flex gap-2">
                      {!notification.isRead && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => markAsRead.mutate(notification.id)}
                          disabled={markAsRead.isPending}
                        >
                          علامت‌گذاری به عنوان خوانده شده
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
        </main>
      </div>
    </div>
  );
}
