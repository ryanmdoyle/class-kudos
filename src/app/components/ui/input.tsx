"use client"

import * as React from "react"

import { cn, focusRing } from "@/app/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-10 w-full rounded-base border-2 border-border bg-secondary-background px-3 py-2",
        "text-sm font-base text-foreground",
        "selection:bg-main selection:text-main-foreground",
        "file:border-0 file:bg-transparent file:text-sm file:font-heading file:text-foreground",
        // `--muted-foreground` clears 4.5:1 on white; the old `foreground/50`
        // resolved to ~#808080 and vanished on a projector.
        "placeholder:text-muted-foreground",
        "aria-invalid:border-error aria-invalid:outline-error",
        "disabled:cursor-not-allowed disabled:opacity-50",
        focusRing,
        className,
      )}
      {...props}
    />
  )
}

export { Input }
