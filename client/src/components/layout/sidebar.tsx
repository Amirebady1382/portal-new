import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";
import { logger } from "@/lib/logger";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Building,
  UserPlus,
  TrendingUp,
  Settings as SettingsIcon,
  FolderOpen,
  Download,
  MessageSquare,
  Send,
  BarChart3,
  Bot,
  Users,
  Bell,
  FileText,
  Upload,
  Zap,
  Brain,
  Activity,
  Package,
  ClipboardList,
  Database,
  Sparkles
} from "lucide-react";

interface SidebarItem {
  id: string;
  label: string;
  icon: any;
  path: string;
  badge?: number;
  roles?: string[];
  department?: string[];
}

const sidebarItems: SidebarItem[] = [
  {
    id: "dashboard",
    label: "داشبورد",
    icon: LayoutDashboard,
    path: "",
    roles: ["admin", "ceo", "employee", "customer"],
  },
  // Customer specific items
  {
    id: "customer-services",
    label: "خدمات من",
    icon: Package,
    path: "/services",
    roles: ["customer"],
  },
  {
    id: "customer-profile",
    label: "پروفایل شرکت",
    icon: Building,
    path: "/profile",
    roles: ["customer"],
  },
  {
    id: "customer-tax-declaration",
    label: "اظهارنامه یا گزارش حسابرسی",
    icon: FileText,
    path: "/tax-declaration",
    roles: ["customer"],
  },
  {
    id: "my-documents",
    label: "اسناد من",
    icon: FolderOpen,
    path: "/documents",
    roles: ["customer"],
  },
  // Admin, CEO and Employee items
  {
    id: "companies",
    label: "لیست شرکت‌ها",
    icon: Building,
    path: "/companies",
    roles: ["admin", "ceo", "employee"],
  },
  {
    id: "requests",
    label: "درخواست‌های جدید",
    icon: UserPlus,
    path: "/requests",
    roles: ["admin", "ceo", "employee"],
  },
  {
    id: "investment",
    label: "واحد سرمایه‌گذاری",
    icon: TrendingUp,
    path: "/investment",
    roles: ["admin", "ceo", "employee"],
    department: ["investment"],
  },
  {
    id: "administrative",
    label: "واحد اداری",
    icon: SettingsIcon,
    path: "/administrative",
    roles: ["admin", "ceo", "employee"],
    department: ["administrative"],
  },
  {
    id: "documents",
    label: "تمامی اسناد",
    icon: FolderOpen,
    path: "/documents",
    roles: ["admin", "ceo", "employee"],
  },
  {
    id: "document-requirements",
    label: "مدیریت فرم‌ها",
    icon: FileText,
    path: "/document-requirements",
    roles: ["admin", "employee"], // ادمین و کارمندان
  },
  {
    id: "services-management",
    label: "مدیریت خدمات",
    icon: Package,
    path: "/services-management",
    roles: ["admin", "employee"], // ادمین و کارمندان
  },
  {
    id: "service-requests-workflow",
    label: "گردش کار درخواست‌ها",
    icon: ClipboardList,
    path: "/service-requests-workflow",
    roles: ["admin", "employee", "ceo"],
  },

  {
    id: "contract-templates",
    label: "قالب‌های قرارداد",
    icon: Upload,
    path: "/contract-templates",
    roles: ["admin", "employee"], // CEO دسترسی ندارد - عملیاتی است
    department: ["administrative"],
  },
  {
    id: "flexible-contract-generator",
    label: "تولید قرارداد هوشمند",
    icon: Zap,
    path: "/flexible-contract-generator",
    roles: ["admin", "employee"], // CEO دسترسی ندارد
    department: ["administrative"],
  },
  {
    id: "ai-variable-manager",
    label: "متغیربندی هوشمند",
    icon: Brain,
    path: "/ai-variable-manager",
    roles: ["admin"], // فقط Admin
    department: ["administrative"],
  },
  {
    id: "contract-variables",
    label: "مدیریت متغیرها",
    icon: Database,
    path: "/contract-variables",
    roles: ["admin"], // فقط Admin
    department: ["administrative"],
  },
  {
    id: "bulk-download",
    label: "دانلود گروهی",
    icon: Download,
    path: "/bulk-download",
    roles: ["admin", "ceo", "employee"],
  },
  {
    id: "tickets",
    label: "تیکت‌ها",
    icon: MessageSquare,
    path: "/messages",
    roles: ["admin", "ceo", "employee", "customer"],
  },
  {
    id: "bale-chat",
    label: "چت آنلاین",
    icon: Send,
    path: "/bale-chat",
    roles: ["admin", "ceo", "employee", "customer"],
  },
  {
    id: "notifications",
    label: "اعلان‌های بله",
    icon: Bell,
    path: "/notifications",
    roles: ["admin", "ceo", "employee"],
  },
  {
    id: "reports",
    label: "گزارشات",
    icon: BarChart3,
    path: "/reports",
    roles: ["admin", "ceo", "employee"],
  },
  {
    id: "ai-analysis",
    label: "تحلیل‌های هوش مصنوعی",
    icon: Bot,
    path: "/ai-analysis",
    roles: ["admin", "ceo", "employee"],
  },
  {
    id: "investment-report-generator",
    label: "گزارش ارزیابی AI",
    icon: Sparkles,
    path: "/investment-report-generator",
    roles: ["admin", "employee", "ceo"],
  },
  {
    id: "users",
    label: "مدیریت کاربران",
    icon: Users,
    path: "/users",
    roles: ["admin"],
  },
  {
    id: "system-settings",
    label: "تنظیمات سیستم",
    icon: SettingsIcon,
    path: "/settings",
    roles: ["admin"],
  },
  {
    id: "system-health",
    label: "وضعیت سلامت سیستم",
    icon: Activity,
    path: "/system-health",
    roles: ["admin"],
  },
  {
    id: "contract-management",
    label: "تنظیمات متغیرها",
    icon: SettingsIcon,
    path: "/contract-management",
    roles: ["admin"], // فقط ادمین دسترسی دارد
  },
  {
    id: "profile",
    label: "پروفایل شرکت",
    icon: Building,
    path: "/profile",
    roles: ["customer"],
  },
  {
    id: "company-status",
    label: "وضعیت شرکت",
    icon: BarChart3,
    path: "/company-status",
    roles: ["ceo", "employee"], // CEO هم به این دسترسی دارد
  },
];

const sidebarSections = [
  {
    title: "مدیریت شرکت‌ها",
    items: ["companies", "requests"],
  },
  {
    title: "واحدها و خدمات",
    items: [
      "customer-services",
      "investment",
      "administrative",
    ],
  },
  {
    title: "مدیریت اسناد و خدمات",
    items: ["documents", "document-requirements", "services-management", "service-requests-workflow", "bulk-download"],
  },
  {
    title: "تولید قرارداد",
    items: ["contract-templates", "flexible-contract-generator", "ai-variable-manager", "contract-variables"],
  },
  {
    title: "ارتباطات",
    items: ["tickets", "bale-chat", "notifications"],
  },
  {
    title: "گزارش‌گیری",
    items: ["reports", "ai-analysis", "investment-report-generator", "company-status"],
  },
  {
    title: "مدیریت سیستم",
    items: ["users", "system-settings", "system-health", "contract-management"],
  },
];

export function SidebarContent({ onItemClick }: { onItemClick?: () => void }) {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const navRef = useRef<HTMLElement>(null);

  const isItemVisible = (item: SidebarItem) => {
    // Check role permissions
    if (item.roles && !item.roles.includes(user?.role || "")) {
      return false;
    }

    // Check department permissions - CEO has access to all departments
    if (item.department && user?.role !== "ceo" && user?.department && !item.department.includes(user.department)) {
      return false;
    }

    return true;
  };

  const isItemActive = (item: SidebarItem) => {
    const basePath = getBasePath();
    if (item.path === "") {
      // Dashboard case - check if we're at the root path for the role
      return location === basePath || location === basePath + "/";
    }
    const fullPath = basePath + item.path;
    return location === fullPath || location.startsWith(fullPath + "/");
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

  // Save and restore scroll position
  useEffect(() => {
    const savedScrollTop = localStorage.getItem('sidebar-scroll-position');
    if (savedScrollTop && navRef.current) {
      navRef.current.scrollTop = parseInt(savedScrollTop);
    }

    // Add scroll event listener to save position
    const handleScroll = () => {
      if (navRef.current) {
        localStorage.setItem('sidebar-scroll-position', navRef.current.scrollTop.toString());
      }
    };

    const navElement = navRef.current;
    if (navElement) {
      navElement.addEventListener('scroll', handleScroll, { passive: true });
      return () => navElement.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const handleItemClick = (item: SidebarItem) => {
    // Save current scroll position
    if (navRef.current) {
      localStorage.setItem('sidebar-scroll-position', navRef.current.scrollTop.toString());
    }
    
    const basePath = getBasePath();
    logger.debug("Sidebar navigation:", { itemPath: item.path, basePath, currentLocation: location });
    
    if (item.path === "") {
      // Dashboard case - go to the root path for the role
      logger.navigation(location, basePath);
      setLocation(basePath);
    } else {
      const fullPath = basePath + item.path;
      logger.navigation(location, fullPath);
      setLocation(fullPath);
    }
    
    // Close mobile sidebar after navigation
    onItemClick?.();
    
    // Restore scroll position after a short delay
    setTimeout(() => {
      const savedScrollTop = localStorage.getItem('sidebar-scroll-position');
      if (savedScrollTop && navRef.current) {
        navRef.current.scrollTop = parseInt(savedScrollTop);
      }
    }, 100);
  };

  const visibleItems = sidebarItems.filter(isItemVisible);

  return (
    <nav ref={navRef} className="p-4 space-y-1 h-full overflow-y-auto custom-scrollbar pb-20">
      <AnimatePresence>
        {/* Dashboard - Always first */}
        {visibleItems.find(item => item.id === "dashboard") && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="mb-6"
          >
            <Button
              variant={isItemActive(visibleItems.find(item => item.id === "dashboard")!) ? "default" : "ghost"}
              className={cn(
                "sidebar-item w-full justify-start px-4 py-3 transition-all duration-200 text-sm font-medium rounded-xl",
                isItemActive(visibleItems.find(item => item.id === "dashboard")!)
                  ? "bg-primary text-primary-foreground shadow-soft hover:bg-primary/90"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              data-active={isItemActive(visibleItems.find(item => item.id === "dashboard")!)}
              onClick={() => handleItemClick(visibleItems.find(item => item.id === "dashboard")!)}
            >
              <LayoutDashboard className="h-5 w-5 ml-3 rtl:ml-3 ltr:mr-3" />
              داشبورد
            </Button>
          </motion.div>
        )}

        {/* Sections */}
        {sidebarSections.map((section, sectionIndex) => {
          const sectionItems = section.items
            .map(itemId => visibleItems.find(item => item.id === itemId))
            .filter(Boolean);

          if (sectionItems.length === 0) return null;

          return (
            <motion.div
              key={section.title}
              className="space-y-1 mb-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: sectionIndex * 0.05, duration: 0.3 }}
            >
              <h3 className="px-4 py-2 text-xs font-bold text-muted-foreground/70 uppercase tracking-wider">
                {section.title}
              </h3>
              {sectionItems.map((item) => {
                if (!item) return null;
                
                const Icon = item.icon;
                const isActive = isItemActive(item);

                return (
                  <Button
                    key={item.id}
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "sidebar-item w-full justify-start px-4 py-2.5 transition-all duration-200 text-sm rounded-lg",
                      isActive 
                        ? "bg-secondary text-secondary-foreground font-medium shadow-sm"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground font-normal"
                    )}
                    data-active={isActive}
                    onClick={() => handleItemClick(item)}
                  >
                    <Icon className={cn("h-4 w-4 ml-3 rtl:ml-3 ltr:mr-3 transition-colors", isActive ? "text-primary" : "text-muted-foreground")} />
                    <span className="flex-1 text-right truncate">{item.label}</span>
                    {item.badge && item.badge > 0 && (
                      <Badge 
                        variant={isActive ? "default" : "secondary"}
                        className={cn(
                          "mr-auto text-[10px] px-1.5 py-0.5 h-5 min-w-[20px] flex items-center justify-center rounded-full",
                          isActive 
                            ? "bg-primary text-primary-foreground"
                            : item.id === "requests" || item.id === "tickets"
                              ? "bg-destructive/10 text-destructive border-destructive/20"
                              : "bg-muted text-muted-foreground border-border"
                        )}
                      >
                        <span className="number-font">{item.badge}</span>
                      </Badge>
                    )}
                    {item.id === "ai-analysis" && (
                      <Badge className="mr-auto bg-gradient-to-r from-primary to-secondary text-primary-foreground text-[10px] px-1.5 py-0.5 h-5 border-0 shadow-sm">
                        جدید
                      </Badge>
                    )}
                  </Button>
                );
              })}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </nav>
  );
}

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  // Always render the same sidebar - responsive behavior handled by CSS
  return (
    <aside className="w-72 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-l border-border/60 fixed right-0 top-16 bottom-0 hidden md:block z-30 transition-all duration-300">
      <SidebarContent onItemClick={onClose} />
    </aside>
  );
}
