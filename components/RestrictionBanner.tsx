"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

interface RestrictionBannerProps {
  isRestricted: boolean;
  restrictionReason?: string;
  showDemo?: boolean; // For demonstration purposes
}

const RestrictionBanner = ({
  isRestricted,
  restrictionReason,
  showDemo = false,
}: RestrictionBannerProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  // Show demo if requested
  const shouldShow = showDemo || isRestricted;

  useEffect(() => {
    if (!shouldShow) return;

    // Create blinking effect
    const interval = setInterval(() => {
      setIsVisible((prev) => !prev);
    }, 1000);

    return () => clearInterval(interval);
  }, [shouldShow]);

  if (!shouldShow || isDismissed) return null;

  const displayReason =
    restrictionReason ||
    "Outstanding library fines of $25.00. Please clear your dues at the library front desk or contact library@university.edu for payment arrangements.";

  return (
    <div
      className={`w-full bg-red-600 border-b border-red-700 transition-opacity duration-300 relative ${
        isVisible ? "opacity-100" : "opacity-70"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 py-3">
        <div className="flex items-center justify-center gap-3 text-white relative">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <div className="text-center flex-1">
            <p className="font-semibold flex items-center justify-center gap-2">
              <span className="animate-pulse">⚠️</span>
              Your account is currently restricted
              <span className="animate-pulse">⚠️</span>
            </p>
            <p className="text-sm mt-1">{displayReason}</p>
            <p className="text-xs mt-1 opacity-90">
              📧 Contact: library@university.edu | 📞 Phone: (555) 123-4567 | 🏢
              Visit: Library Front Desk
            </p>
          </div>
          {showDemo && (
            <button
              onClick={() => setIsDismissed(true)}
              className="absolute right-0 top-0 p-1 hover:bg-red-700 rounded"
              title="Dismiss demo banner"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RestrictionBanner;
