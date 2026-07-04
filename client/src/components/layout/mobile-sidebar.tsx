import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { SidebarContent } from "./sidebar";

export default function MobileSidebar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="md:hidden">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="p-2 text-muted-foreground hover:text-primary fixed top-4 right-4 z-50 bg-background/80 backdrop-blur-sm border border-border shadow-sm rounded-md"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-72 p-0 border-l border-border bg-background" dir="rtl">
          <div className="h-full overflow-y-auto">
            <SidebarContent onItemClick={() => setIsOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}