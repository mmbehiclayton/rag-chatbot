import type { Experimental_GeneratedImage } from "ai";
import NextImage from "next/image";
import { cn } from "@/lib/utils";

export type ImageProps = Experimental_GeneratedImage & {
  className?: string;
  alt?: string;
};

export const GeneratedImage = ({
  base64,
  uint8Array: _uint8Array,
  mediaType,
  alt,
  className,
  ...props
}: ImageProps) => (
  <NextImage
    {...props}
    alt={alt ?? "Image"}
    className={cn("h-auto max-w-full overflow-hidden rounded-md", className)}
    height={1024}
    src={`data:${mediaType};base64,${base64}`}
    unoptimized
    width={1024}
  />
);
