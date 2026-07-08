import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva("", {
  variants: {
    variant: {
      accent: "accent-button",
      ghost: "ghost-button",
      text: "text-button",
      destructive: "accent-button danger-button",
      icon: "icon-button",
      outline: "ghost-button",
    },
    size: {
      default: "",
      sm: "",
      lg: "",
      icon: "icon-button",
    },
  },
  defaultVariants: {
    variant: "accent",
    size: "default",
  },
});

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
