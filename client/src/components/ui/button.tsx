import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { motion, HTMLMotionProps } from "framer-motion"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-quantum focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 backdrop-blur-sm",
  {
    variants: {
      variant: {
        default: "glass-card bg-quantum text-primary-foreground hover:bg-quantum/90 hover:shadow-lg hover:scale-105 ethereal-glow",
        destructive:
          "glass-card bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:shadow-lg hover:scale-105",
        outline:
          "glass-panel border border-border/40 bg-background/50 hover:bg-accent/20 hover:text-accent-foreground hover:border-quantum/30",
        secondary:
          "glass-panel bg-secondary/80 text-secondary-foreground hover:bg-secondary hover:shadow-md hover:scale-105",
        ghost: "hover:bg-accent/20 hover:text-accent-foreground hover:backdrop-blur-sm",
        link: "text-quantum underline-offset-4 hover:underline hover:text-quantum/80",
        consciousness: "glass-card bg-consciousness text-foreground hover:bg-consciousness/90 hover:shadow-lg hover:scale-105 consciousness-wave",
        ethereal: "glass-card bg-ethereal text-foreground hover:bg-ethereal/90 hover:shadow-lg hover:scale-105 quantum-shimmer",
      },
      size: {
        default: "h-11 px-6 py-2 text-sm",
        sm: "h-9 rounded-lg px-4 text-xs",
        lg: "h-13 rounded-xl px-8 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  motionProps?: HTMLMotionProps<"button">;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, motionProps, ...props }, ref) => {
    const Comp = asChild ? Slot : motionProps ? motion.button : "button";
    
    const defaultMotionProps = {
      whileHover: { scale: 1.05, y: -2 },
      whileTap: { scale: 0.95 },
      transition: { type: "spring", stiffness: 300, damping: 20 },
      ...motionProps,
    };

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...(motionProps && !asChild ? defaultMotionProps : {})}
        {...props}
      />
    );
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
