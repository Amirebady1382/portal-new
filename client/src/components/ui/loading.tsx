import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LoadingProps {
  size?: "sm" | "md" | "lg" | "xl";
  text?: string;
  className?: string;
  variant?: "spinner" | "dots" | "pulse";
  fullScreen?: boolean;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6", 
  lg: "h-8 w-8",
  xl: "h-12 w-12"
};

const textSizeClasses = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-xl"
};

export function LoadingSpinner({ 
  size = "md", 
  text,
  className,
  fullScreen = false 
}: LoadingProps) {
  const content = (
    <div className={cn(
      "flex items-center justify-center gap-3",
      fullScreen && "min-h-screen bg-background",
      className
    )}>
      <Loader2 className={cn(
        "animate-spin text-primary",
        sizeClasses[size]
      )} />
      {text && (
        <span className={cn(
          "text-muted-foreground font-medium",
          textSizeClasses[size]
        )}>
          {text}
        </span>
      )}
    </div>
  );

  return fullScreen ? (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      {content}
    </div>
  ) : content;
}

export function LoadingDots({ 
  size = "md", 
  text,
  className 
}: LoadingProps) {
  return (
    <div className={cn("flex items-center justify-center gap-3", className)}>
      <div className="flex space-x-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              "bg-primary rounded-full animate-pulse",
              size === "sm" && "h-1.5 w-1.5",
              size === "md" && "h-2 w-2", 
              size === "lg" && "h-3 w-3",
              size === "xl" && "h-4 w-4"
            )}
            style={{
              animationDelay: `${i * 0.2}s`,
              animationDuration: "1.4s"
            }}
          />
        ))}
      </div>
      {text && (
        <span className={cn(
          "text-muted-foreground font-medium",
          textSizeClasses[size]
        )}>
          {text}
        </span>
      )}
    </div>
  );
}

export function LoadingPulse({ 
  size = "md",
  text,
  className 
}: LoadingProps) {
  return (
    <div className={cn("flex items-center justify-center gap-3", className)}>
      <div className={cn(
        "bg-primary rounded-full animate-pulse",
        sizeClasses[size]
      )} />
      {text && (
        <span className={cn(
          "text-muted-foreground font-medium animate-pulse",
          textSizeClasses[size]
        )}>
          {text}
        </span>
      )}
    </div>
  );
}

// Loading Skeleton برای محتوا
export function LoadingSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn(
      "animate-pulse bg-muted rounded-md",
      className
    )} />
  );
}

// Loading برای جداول
export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <>
      {Array.from({ length: 3 }).map((_, rowIndex) => (
        <tr key={rowIndex}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <td key={colIndex} className="p-4">
              <LoadingSkeleton className="h-4 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// Loading برای کارت‌ها
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("p-6 border border-border rounded-lg space-y-4", className)}>
      <LoadingSkeleton className="h-6 w-3/4" />
      <LoadingSkeleton className="h-4 w-full" />
      <LoadingSkeleton className="h-4 w-2/3" />
      <div className="flex gap-2 pt-2">
        <LoadingSkeleton className="h-8 w-20" />
        <LoadingSkeleton className="h-8 w-16" />
      </div>
    </div>
  );
}

// Loading برای فرم‌ها
export function FormSkeleton({ fields = 3 }: { fields?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} className="space-y-2">
          <LoadingSkeleton className="h-4 w-24" />
          <LoadingSkeleton className="h-10 w-full" />
        </div>
      ))}
      <div className="flex gap-2 pt-4">
        <LoadingSkeleton className="h-10 w-24" />
        <LoadingSkeleton className="h-10 w-20" />
      </div>
    </div>
  );
}

// Component اصلی که همه variants را در بر می‌گیرد
export function Loading({ variant = "spinner", ...props }: LoadingProps) {
  switch (variant) {
    case "dots":
      return <LoadingDots {...props} />;
    case "pulse":
      return <LoadingPulse {...props} />;
    default:
      return <LoadingSpinner {...props} />;
  }
}
