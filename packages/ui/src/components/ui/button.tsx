import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-sm text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 outline-none focus-visible:ring-[3px] focus-visible:ring-accent-outline-soft",
  {
    variants: {
      variant: {
        accent:
          "bg-accent text-foreground font-semibold hover:bg-accent-dark hover:shadow-[0_4px_14px_var(--color-accent-glow)]",
        ghost:
          "border border-border-strong bg-transparent text-foreground font-medium hover:bg-accent-soft hover:border-accent-outline-muted",
        text: "bg-transparent text-foreground font-medium hover:bg-accent-soft px-2 py-1.5",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-border-strong bg-card text-foreground hover:bg-accent-soft hover:border-accent-outline-muted",
        icon: "size-6 rounded text-muted-foreground hover:text-foreground hover:bg-border",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-sm px-3 text-xs",
        lg: "h-10 rounded-sm px-6",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "accent",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
