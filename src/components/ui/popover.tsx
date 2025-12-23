"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

import { cn } from "@/lib/utils";

const Popover = PopoverPrimitive.Root;

const PopoverTrigger = PopoverPrimitive.Trigger;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> & {
    disableAutoFocus?: boolean;
  }
>(
  (
    {
      className,
      align = "start",
      sideOffset = 8,
      disableAutoFocus = false,
      onOpenAutoFocus,
      ...props
    },
    ref,
  ) => (
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      onOpenAutoFocus={(event) => {
        if (disableAutoFocus) event.preventDefault();
        onOpenAutoFocus?.(event);
      }}
      className={cn(
        "z-50 w-72 rounded-lg border border-white/15 bg-slate-900 p-3 text-white shadow-xl shadow-indigo-900/20 outline-none animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
        className,
      )}
      {...props}
    />
  ),
);
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverContent, PopoverTrigger };
