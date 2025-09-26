"use client";

import type { CSSProperties } from "react";
import { useTheme } from "next-themes";
import {
  Toaster as Sonner,
  type ToasterProps,
  type ToastClassnames,
} from "sonner";

import { cn } from "@/lib/utils";

const baseStyle = {
  "--normal-bg": "hsl(var(--popover))",
  "--normal-text": "hsl(var(--popover-foreground))",
  "--normal-border": "hsl(var(--border))",
  "--success-bg": "hsl(var(--primary) / 0.12)",
  "--success-text": "hsl(var(--primary))",
  "--success-border": "hsl(var(--primary) / 0.4)",
  "--info-bg": "hsl(var(--secondary))",
  "--info-text": "hsl(var(--secondary-foreground))",
  "--info-border": "hsl(var(--border))",
  "--warning-bg": "hsl(var(--accent))",
  "--warning-text": "hsl(var(--accent-foreground))",
  "--warning-border": "hsl(var(--accent-foreground) / 0.4)",
  "--error-bg": "hsl(var(--destructive) / 0.12)",
  "--error-text": "hsl(var(--destructive))",
  "--error-border": "hsl(var(--destructive) / 0.4)",
  "--toast-border-radius": "calc(var(--radius) + 4px)",
} satisfies CSSProperties;

const defaultToastClassNames: Partial<ToastClassnames> = {
  toast:
    "rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--popover))] text-[hsl(var(--popover-foreground))] shadow-lg shadow-black/20 backdrop-blur-md",
  title:
    "text-base font-semibold capitalize tracking-wide text-[hsl(var(--popover-foreground))]",
  description: "text-sm capitalize text-[hsl(var(--muted-foreground))]",
  content: "flex flex-col gap-1",
  closeButton:
    "text-[hsl(var(--popover-foreground))]/70 transition-colors hover:text-[hsl(var(--popover-foreground))]",
};

const Toaster = ({
  toastOptions,
  className,
  style,
  ...props
}: ToasterProps) => {
  const { theme = "system" } = useTheme();

  const mergedToastOptions: ToasterProps["toastOptions"] = {
    ...toastOptions,
    className: cn(
      "px-5 py-4",
      defaultToastClassNames.toast,
      toastOptions?.className
    ),
    classNames: {
      ...defaultToastClassNames,
      ...toastOptions?.classNames,
      toast: cn(defaultToastClassNames.toast, toastOptions?.classNames?.toast),
      title: cn(defaultToastClassNames.title, toastOptions?.classNames?.title),
      description: cn(
        defaultToastClassNames.description,
        toastOptions?.classNames?.description
      ),
      content: cn(
        defaultToastClassNames.content,
        toastOptions?.classNames?.content
      ),
      closeButton: cn(
        defaultToastClassNames.closeButton,
        toastOptions?.classNames?.closeButton
      ),
    },
    style: {
      background: "hsl(var(--popover))",
      borderColor: "hsl(var(--border))",
      color: "hsl(var(--popover-foreground))",
      ...toastOptions?.style,
    },
  };

  const mergedStyle = {
    ...baseStyle,
    ...style,
  };

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      toastOptions={mergedToastOptions}
      className={cn("toaster group", className)}
      style={mergedStyle}
      {...props}
    />
  );
};

export { Toaster };
