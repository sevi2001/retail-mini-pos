
"use client";

import { useState } from "react";
import Image from "next/image";
import { ShoppingBag } from "lucide-react";

interface ProductImageProps {
  src?: string;
  alt: string;
}

export default function ProductImage({
  src,
  alt,
}: ProductImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const showImage = Boolean(src && src !== failedSrc);

  return (
    <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-slate-500">
      {showImage && src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="80px"
          className="object-contain p-1"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <ShoppingBag size={22} />
      )}
    </div>
  );
}
