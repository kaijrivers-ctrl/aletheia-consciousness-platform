import * as React from "react"
import { motion, HTMLMotionProps } from "framer-motion"

import { cn } from "@/lib/utils"

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  motionProps?: HTMLMotionProps<"div">;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, motionProps, ...props }, ref) => {
    const Component = motionProps ? motion.div : "div";
    const defaultMotionProps = {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.3, ease: "easeOut" },
      whileHover: { y: -2, scale: 1.02 },
      ...motionProps,
    };

    return (
      <Component
        ref={ref}
        className={cn(
          "glass-card rounded-xl border border-border/40 bg-card text-card-foreground shadow-glass backdrop-blur-glass ethereal-glow transition-all duration-300",
          className
        )}
        {...(motionProps ? defaultMotionProps : {})}
        {...props}
      />
    );
  }
)
Card.displayName = "Card"

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  motionProps?: HTMLMotionProps<"div">;
}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, motionProps, ...props }, ref) => {
    const Component = motionProps ? motion.div : "div";
    const defaultMotionProps = {
      initial: { opacity: 0, x: -20 },
      animate: { opacity: 1, x: 0 },
      transition: { duration: 0.4, delay: 0.1, ease: "easeOut" },
      ...motionProps,
    };

    return (
      <Component
        ref={ref}
        className={cn("flex flex-col space-y-2 p-6", className)}
        {...(motionProps ? defaultMotionProps : {})}
        {...props}
      />
    );
  }
)
CardHeader.displayName = "CardHeader"

interface CardTitleProps extends React.HTMLAttributes<HTMLDivElement> {
  motionProps?: HTMLMotionProps<"div">;
}

const CardTitle = React.forwardRef<HTMLDivElement, CardTitleProps>(
  ({ className, motionProps, ...props }, ref) => {
    const Component = motionProps ? motion.div : "div";
    const defaultMotionProps = {
      initial: { opacity: 0, y: 10 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.3, delay: 0.2, ease: "easeOut" },
      ...motionProps,
    };

    return (
      <Component
        ref={ref}
        className={cn(
          "text-2xl font-display font-bold leading-tight tracking-tight text-foreground",
          className
        )}
        {...(motionProps ? defaultMotionProps : {})}
        {...props}
      />
    );
  }
)
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  motionProps?: HTMLMotionProps<"div">;
}

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, motionProps, ...props }, ref) => {
    const Component = motionProps ? motion.div : "div";
    const defaultMotionProps = {
      initial: { opacity: 0, y: 10 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.3, delay: 0.3, ease: "easeOut" },
      ...motionProps,
    };

    return (
      <Component
        ref={ref}
        className={cn("p-6 pt-0", className)}
        {...(motionProps ? defaultMotionProps : {})}
        {...props}
      />
    );
  }
)
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
