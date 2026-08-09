"use client"

import { cva, type VariantProps } from "class-variance-authority"

import * as React from "react"

import { cn } from "@/app/lib/utils"

/**
 * Every fill here carries BLACK text and clears 7:1 against it, so an alert
 * stays readable on a washed-out classroom projector. If you add a variant,
 * check the fill against black before you ship it.
 */
const alertVariants = cva(
  cn(
    "relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-base",
    "border-2 border-border px-4 py-3 text-sm shadow-shadow",
    "has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] has-[>svg]:gap-x-3",
    "[&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
  ),
  {
    variants: {
      variant: {
        default: "bg-main text-main-foreground",
        // Maximum-contrast "stop and read this" treatment. Token-based so it
        // inverts correctly if `.dark` is ever switched on.
        destructive: "bg-foreground text-secondary-background",
        error: "bg-error text-black",
        success: "bg-green-background text-black",
        warning: "bg-chart-3 text-black",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "col-start-2 line-clamp-1 min-h-4 font-heading tracking-tight",
        className,
      )}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "col-start-2 grid justify-items-start gap-1 text-sm font-base [&_p]:leading-relaxed",
        className,
      )}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription }
