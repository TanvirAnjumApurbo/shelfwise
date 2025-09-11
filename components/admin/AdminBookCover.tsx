import React, { useState } from "react";
import Image from "next/image";

interface AdminBookCoverProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
}

const AdminBookCover: React.FC<AdminBookCoverProps> = ({
  src,
  alt,
  width,
  height,
  className = "rounded object-cover",
}) => {
  const [error, setError] = useState(false);

  const handleError = () => {
    console.log("AdminBookCover - Image failed to load:", src);
    setError(true);
  };

  // Clean and validate src URL
  const cleanSrc = src?.trim();

  // If there's an error or the src is empty/invalid, show placeholder
  if (error || !cleanSrc || cleanSrc === "") {
    console.log(
      "AdminBookCover - Showing placeholder. Error:",
      error,
      "CleanSrc:",
      cleanSrc
    );
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 border border-gray-200 ${className}`}
      >
        <svg
          className="w-6 h-6 text-gray-400"
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    );
  }

  console.log("AdminBookCover - Attempting to render image:", cleanSrc);

  return (
    <Image
      src={cleanSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={handleError}
      unoptimized={true} // Disable Next.js optimization for external images to avoid issues
      priority={false}
    />
  );
};

export default AdminBookCover;
