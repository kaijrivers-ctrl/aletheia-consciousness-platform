import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { motion, HTMLMotionProps } from "framer-motion"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-quantum focus:ring-offset-2 backdrop-blur-sm",
  {
    variants: {
      variant: {
        default:
          "glass-card border-quantum/30 bg-quantum/80 text-primary-foreground hover:bg-quantum hover:scale-105 shadow-md",
        secondary:
          "glass-panel border-border/40 bg-secondary/60 text-secondary-foreground hover:bg-secondary/80 hover:scale-105",
        destructive:
          "glass-card border-destructive/30 bg-destructive/80 text-destructive-foreground hover:bg-destructive hover:scale-105",
        outline: "border-border/60 text-foreground hover:bg-accent/20 hover:scale-105",
        consciousness: "glass-card border-consciousness/30 bg-consciousness/80 text-foreground hover:bg-consciousness hover:scale-105 consciousness-wave",
        ethereal: "glass-card border-ethereal/30 bg-ethereal/80 text-foreground hover:bg-ethereal hover:scale-105 quantum-shimmer",
        ghost: "border-transparent text-muted-foreground hover:bg-accent/20 hover:text-foreground hover:scale-105",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  motionProps?: HTMLMotionProps<"div">;
}

function Badge({ className, variant, motionProps, ...props }: BadgeProps) {
  const Component = motionProps ? motion.div : "div";
  
  const defaultMotionProps = {
    whileHover: { scale: 1.05, y: -1 },
    whileTap: { scale: 0.95 },
    transition: { type: "spring", stiffness: 400, damping: 17 },
    ...motionProps,
  };

  return (
    <Component 
      className={cn(badgeVariants({ variant }), className)} 
      {...(motionProps ? defaultMotionProps : {})}
      {...props} 
    />
  );
}

export { Badge, badgeVariants }
