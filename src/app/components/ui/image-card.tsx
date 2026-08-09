"use client"

import { cn } from "@/app/lib/utils"

type Props = {
  imageUrl: string
  caption: string
  /** Alt text. Defaults to the caption, which is almost always what you want. */
  alt?: string
  className?: string
}

export default function ImageCard({ imageUrl, caption, alt, className }: Props) {
  return (
    <figure
      className={cn(
        "w-[250px] overflow-hidden rounded-base border-2 border-border bg-main font-base shadow-shadow",
        className,
      )}
    >
      <img className="aspect-4/3 w-full" src={imageUrl} alt={alt ?? caption} />
      <figcaption className="border-t-2 border-border p-4 text-main-foreground">
        {caption}
      </figcaption>
    </figure>
  )
}
