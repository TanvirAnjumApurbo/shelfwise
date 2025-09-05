/**
 * Utility functions for handling ImageKit URLs
 */

/**
 * Converts a relative image path to a full ImageKit URL
 * @param imagePath - The image path (can be relative or absolute)
 * @returns Full ImageKit URL or null if invalid
 */
export const getImageKitUrl = (
  imagePath: string | null | undefined
): string | null => {
  if (!imagePath || typeof imagePath !== "string") return null;

  const trimmedPath = imagePath.trim();
  if (!trimmedPath) return null;

  // If it's already a full URL, return as is
  if (trimmedPath.startsWith("http://") || trimmedPath.startsWith("https://")) {
    return trimmedPath;
  }

  // Get ImageKit endpoint from environment variables
  const imageKitEndpoint =
    process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT ||
    "https://ik.imagekit.io/TanvirAP";

  // Remove leading slash if present
  const cleanPath = trimmedPath.startsWith("/")
    ? trimmedPath.slice(1)
    : trimmedPath;

  return `${imageKitEndpoint}/${cleanPath}`;
};

/**
 * Checks if a URL is a valid ImageKit URL
 * @param url - The URL to check
 * @returns True if it's a valid ImageKit URL
 */
export const isImageKitUrl = (url: string): boolean => {
  return url.includes("ik.imagekit.io") || url.includes("imagekit.io");
};

/**
 * Gets a fallback image URL for book covers
 * @param title - Book title for generating placeholder
 * @returns A placeholder image URL or null
 */
export const getBookCoverFallback = (title: string): string | null => {
  // You can customize this to return a default book cover image
  // For now, we'll return null to use the letter placeholder
  return null;
};
