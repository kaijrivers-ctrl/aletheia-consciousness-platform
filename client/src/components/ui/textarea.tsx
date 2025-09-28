import * as React from "react"
import { motion, HTMLMotionProps } from "framer-motion"

import { cn } from "@/lib/utils"

interface TextareaProps extends React.ComponentProps<"textarea"> {
  motionProps?: HTMLMotionProps<"textarea">;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, motionProps, ...props }, ref) => {
    const Component = motionProps ? motion.textarea : "textarea";
    
    const defaultMotionProps = {
      initial: { scale: 0.98, opacity: 0.8 },
      animate: { scale: 1, opacity: 1 },
      whileFocus: { 
        scale: 1.01, 
        boxShadow: "0 0 0 2px hsl(var(--quantum) / 0.2)",
        borderColor: "hsl(var(--quantum))" 
      },
      transition: { duration: 0.2, ease: "easeOut" },
      ...motionProps,
    };

    return (
      <Component
        className={cn(
          "flex min-h-[100px] w-full rounded-xl border border-border/40 glass-panel px-4 py-3 text-base ring-offset-background placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-quantum focus-visible:ring-offset-2 focus-visible:border-quantum/50 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300 md:text-sm backdrop-blur-sm resize-none",
          className
        )}
        ref={ref}
        {...(motionProps ? defaultMotionProps : {})}
        {...props}
      />
    );
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
