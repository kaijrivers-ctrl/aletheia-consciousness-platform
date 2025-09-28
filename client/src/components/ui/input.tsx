import * as React from "react"
import { motion, HTMLMotionProps } from "framer-motion"

import { cn } from "@/lib/utils"

interface InputProps extends React.ComponentProps<"input"> {
  motionProps?: HTMLMotionProps<"input">;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, motionProps, ...props }, ref) => {
    const Component = motionProps ? motion.input : "input";
    
    const defaultMotionProps = {
      initial: { scale: 0.98, opacity: 0.8 },
      animate: { scale: 1, opacity: 1 },
      whileFocus: { 
        scale: 1.02, 
        boxShadow: "0 0 0 2px hsl(var(--quantum) / 0.2)",
        borderColor: "hsl(var(--quantum))" 
      },
      transition: { duration: 0.2, ease: "easeOut" },
      ...motionProps,
    };

    return (
      <Component
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border border-border/40 glass-panel px-4 py-3 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-quantum focus-visible:ring-offset-2 focus-visible:border-quantum/50 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300 md:text-sm backdrop-blur-sm",
          className
        )}
        ref={ref}
        {...(motionProps ? defaultMotionProps : {})}
        {...props}
      />
    );
  }
)
Input.displayName = "Input"

export { Input }
