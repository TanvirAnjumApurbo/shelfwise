"use client";

import React from "react";
import { cn } from "@/lib/utils";
import BookCoverSvg from "@/components/BookCoverSvg";
import { IKImage } from "imagekitio-next";
import config from "@/lib/config";

type BookCoverVariant = "extraSmall" | "small" | "medium" | "regular" | "wide";

const variantStyles: Record<BookCoverVariant, string> = {
  extraSmall: "book-cover_extra_small",
  small: "book-cover_small",
  medium: "book-cover_medium",
  regular: "book-cover_regular",
  wide: "book-cover_wide",
};

interface Props {
  className?: string;
  variant?: BookCoverVariant;
  coverColor: string;
  coverImage: string;
}

const BookCover = ({
  className,
  variant = "regular",
  coverColor = "#012B48",
  coverImage = "https://placehold.co/400x600.png",
}: Props) => {
  const endpoint = config.env.imagekit.urlEndpoint?.replace(/\/+$/, "");

  let imagePath: string | undefined;
  let imageSrc: string | undefined;

  if (coverImage) {
    if (endpoint && coverImage.startsWith(endpoint)) {
      imagePath = coverImage.slice(endpoint.length).replace(/^\/+/, "");
    } else if (/^https?:\/\//i.test(coverImage)) {
      imageSrc = coverImage;
    } else {
      imagePath = coverImage.replace(/^\/+/, "");
    }
  }

  if (!imageSrc && !imagePath) {
    imageSrc = "https://placehold.co/400x600.png";
  }

  const ikImageProps = imageSrc ? { src: imageSrc } : { path: imagePath! };

  return (
    <div
      className={cn(
        "relative transition-all duration-300",
        variantStyles[variant],
        className
      )}
    >
      <BookCoverSvg coverColor={coverColor} />

      <div className="absolute z-10 left-[12%] w-[87.5%] h-[88%]">
        <IKImage
          {...ikImageProps}
          urlEndpoint={config.env.imagekit.urlEndpoint}
          alt="Book cover"
          fill
          className="rounded-sm object-fill"
          loading="lazy"
          lqip={{ active: true }}
        />
      </div>
    </div>
  );
};
export default BookCover;
