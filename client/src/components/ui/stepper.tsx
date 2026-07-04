import * as React from "react"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

interface StepperProps {
  steps: {
    title: string;
    description?: string;
  }[];
  currentStep: number;
  className?: string;
  onStepClick?: (step: number) => void;
}

export function Stepper({ steps, currentStep, className, onStepClick }: StepperProps) {
  return (
    <div className={cn("w-full py-4", className)} dir="rtl">
      <div className="flex items-center justify-between w-full relative">
        {/* Progress Line - Background */}
        <div className="absolute top-4 left-0 w-full h-0.5 bg-gray-200 -z-10" />

        {/* Progress Line - Active */}
        <div
          className="absolute top-4 right-0 h-0.5 bg-primary -z-10 transition-all duration-300 ease-in-out"
          style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
        />

        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isClickable = onStepClick && (isCompleted || isCurrent);

          return (
            <div
              key={index}
              className={cn(
                "flex flex-col items-center relative bg-transparent px-2",
                isClickable && "cursor-pointer"
              )}
              onClick={() => isClickable && onStepClick(index)}
            >
              {/* Step Circle */}
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 z-10 bg-white",
                  isCompleted ? "bg-primary border-primary text-primary-foreground" :
                  isCurrent ? "border-primary text-primary ring-4 ring-blue-50" :
                  "border-gray-300 text-gray-400"
                )}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </div>

              {/* Step Title & Description */}
              <div className="absolute top-10 w-32 text-center left-1/2 transform -translate-x-1/2">
                <p className={cn(
                  "text-xs font-medium mt-2 transition-colors duration-300",
                  isCurrent ? "text-primary" : "text-gray-500"
                )}>
                  {step.title}
                </p>
                {step.description && (
                  <p className="text-[10px] text-gray-400 mt-1 hidden md:block">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
      {/* Spacer for titles */}
      <div className="h-20" />
    </div>
  )
}
