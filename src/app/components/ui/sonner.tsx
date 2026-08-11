"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"

/**
 * The neobrutalist toast.
 *
 * IMPORTANT for feature agents: import `Toaster` from HERE, not from `sonner`
 * directly. A bare `<Toaster />` from the package renders sonner's own rounded,
 * soft-shadowed default and looks like it belongs to a different app.
 * `toast()` itself still comes from `sonner`.
 *
 * The legacy version read `useTheme()` from `next-themes`. There is no
 * ThemeProvider anywhere in this tree and nothing ever adds `.dark`, so that
 * call was a hook dependency for a value that was always the default. It is
 * gone; when a real theme toggle lands, wire `theme` through from there.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      style={{ fontFamily: "inherit", overflowWrap: "anywhere" }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "bg-secondary-background text-foreground border-border border-2 font-heading shadow-shadow rounded-base text-[13px] flex items-center gap-2.5 p-4 w-[356px] [&:has(button)]:justify-between",
          description: "font-base text-foreground",
          actionButton:
            "font-base border-2 text-[12px] h-6 px-2 bg-main text-main-foreground border-border rounded-base shrink-0",
          cancelButton:
            "font-base border-2 text-[12px] h-6 px-2 bg-background text-foreground border-border rounded-base shrink-0",
          success: "bg-green-background text-black",
          warning: "bg-chart-3 text-black",
          error: "bg-error text-black",
          loading:
            "[&[data-sonner-toast]_[data-icon]]:flex [&[data-sonner-toast]_[data-icon]]:size-4 [&[data-sonner-toast]_[data-icon]]:relative [&[data-sonner-toast]_[data-icon]]:justify-start [&[data-sonner-toast]_[data-icon]]:items-center [&[data-sonner-toast]_[data-icon]]:flex-shrink-0",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
