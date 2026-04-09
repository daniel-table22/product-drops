import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-3 text-size-2 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-8 disabled:pointer-events-none disabled:opacity-40 select-none",
  {
    variants: {
      variant: {
        solid: "bg-accent-9 text-white hover:bg-accent-10 active:bg-accent-11",
        soft: "bg-accent-3 text-accent-11 hover:bg-accent-4 active:bg-accent-5",
        outline:
          "border border-neutral-7 text-neutral-12 hover:bg-neutral-3 active:bg-neutral-4",
        ghost:
          "text-neutral-11 hover:bg-neutral-3 hover:text-neutral-12 active:bg-neutral-4",
        destructive:
          "bg-error-9 text-white hover:bg-error-10 active:bg-error-11",
      },
      size: {
        sm: "h-7 px-3 text-size-1",
        md: "h-9 px-4",
        lg: "h-11 px-6 text-size-3",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "solid",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
