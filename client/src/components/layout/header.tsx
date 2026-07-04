import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSocket } from "@/hooks/use-socket";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Building, 
  Bell, 
  User, 
  LogOut, 
  Settings,
  ChevronDown,
  Menu
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Header() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await apiRequest("GET", '/api/notifications');
      if (!res.ok) throw new Error('Failed to fetch notifications');
      const data = {} /* TODO: fix json */;
      return Array.isArray(data) ? data : [];
    },
    enabled: !!user
  });

  useEffect(() => {
    if (!socket || !user) return;

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
  }, [socket, user, queryClient]);

  const unreadCount = Array.isArray(notifications) ? notifications.filter((n: any) => !n.isRead).length : 0;

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case "admin":
        return "مدیر سیستم";
      case "ceo":
        return "مدیرعامل";
      case "employee":
        return "کارشناس";  
      case "customer":
        return "مشتری";
      default:
        return role;
    }
  };

  const getBasePath = () => {
    switch (user?.role) {
      case "admin":
        return "/admin";
      case "ceo":
        return "/ceo";
      case "employee":
        return "/employee";
      case "customer":
        return "/customer";
      default:
        return "";
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60" dir="rtl">
      <div className="container flex h-16 items-center px-4 md:px-6 max-w-full">
        <div className="flex items-center gap-4 flex-1">
          {/* Logo Section */}
          <div className="flex items-center gap-2 md:gap-3 transition-transform hover:scale-[1.02] cursor-pointer" onClick={() => setLocation(getBasePath())}>
            <div className="relative w-10 h-10 md:w-11 md:h-11 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 p-1.5 shadow-sm border border-primary/10">
              <img src="/Logo-Gfund_1750240015251.png" alt="لوگو صندوق گیلان" className="w-full h-full object-contain" />
            </div>
            <div className="hidden md:flex flex-col justify-center">
              <h1 className="text-base md:text-lg font-bold text-foreground leading-tight tracking-tight">
                صندوق پژوهش و فناوری گیلان
              </h1>
              <p className="text-[10px] md:text-xs text-muted-foreground font-medium">
                سامانه جامع خدمات هوشمند
              </p>
            </div>
          </div>
        </div>

        {/* User Actions */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Notifications */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative rounded-full hover:bg-accent/50 text-muted-foreground transition-all duration-200"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 ring-2 ring-background rounded-full animate-pulse"></span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 shadow-lg border-border/60" align="end" dir="rtl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/30">
                <h4 className="font-semibold text-sm">اعلان‌ها</h4>
                <span
                  className="text-xs text-primary cursor-pointer hover:underline"
                  onClick={() => setLocation('/notifications')}
                >
                  مشاهده همه
                </span>
              </div>
              {!Array.isArray(notifications) || notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                    <Bell className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm text-muted-foreground">اعلان جدیدی وجود ندارد</p>
                </div>
              ) : (
                <div className="max-h-[300px] overflow-y-auto">
                  {notifications.slice(0, 5).map((n: any) => (
                    <div
                      key={n.id}
                      className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${!n.isRead ? 'bg-primary/5' : ''}`}
                      onClick={() => setLocation('/notifications')}
                    >
                      <h4 className="text-sm font-semibold mb-1">{n.title}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                    </div>
                  ))}
                  {notifications.length > 5 && (
                    <div
                      className="p-3 text-center text-sm text-primary cursor-pointer hover:underline"
                      onClick={() => setLocation('/notifications')}
                    >
                      مشاهده همه ({notifications.length}) اعلان
                    </div>
                  )}
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="flex items-center gap-2 md:gap-3 pl-2 pr-3 py-1.5 h-auto rounded-full hover:bg-accent/50 border border-transparent hover:border-border/40 transition-all duration-200"
              >
                <Avatar className="h-8 w-8 ring-2 ring-background shadow-sm">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-xs font-bold">
                    {user?.fullName?.split(' ').map(n => n[0]).join('') || user?.username?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:flex flex-col items-start gap-0.5">
                  <span className="text-sm font-semibold text-foreground leading-none">
                    {user?.fullName || user?.username}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium leading-none">
                    {getRoleText(user?.role || "")}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground/70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 p-1 shadow-lg border-border/60 backdrop-blur-sm bg-background/95">
              <DropdownMenuLabel className="font-normal p-3">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.fullName || user?.username}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email || `${getRoleText(user?.role || "")}`}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="cursor-pointer py-2.5 focus:bg-accent/50"
                onClick={() => setLocation(getBasePath() + "/profile")}
              >
                <User className="ml-2 h-4 w-4 text-muted-foreground" />
                <span>پروفایل کاربری</span>
              </DropdownMenuItem>
              {user?.role === "admin" && (
                <DropdownMenuItem 
                  className="cursor-pointer py-2.5 focus:bg-accent/50"
                  onClick={() => setLocation(getBasePath() + "/settings")}
                >
                  <Settings className="ml-2 h-4 w-4 text-muted-foreground" />
                  <span>تنظیمات سیستم</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="cursor-pointer py-2.5 text-rose-600 focus:text-rose-600 focus:bg-rose-50"
                onClick={handleLogout}
              >
                <LogOut className="ml-2 h-4 w-4" />
                <span>خروج از سیستم</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
