"use client"

import * as React from "react"

import { cn, focusRing } from "@/app/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-[80px] w-full rounded-base border-2 border-border bg-secondary-background px-3 py-2",
        "text-sm font-base text-foreground",
        "selection:bg-main selection:text-main-foreground",
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

export { Textarea }
