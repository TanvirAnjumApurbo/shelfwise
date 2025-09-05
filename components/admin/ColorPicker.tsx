import { HexColorInput, HexColorPicker } from "react-colorful";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import config from "@/lib/config";

/**
 * Enhanced ColorPicker component with eyedropper functionality
 *
 * Features:
 * - Traditional hex color input and color picker
 * - Modern EyeDropper API for picking colors from screen (Chrome/Edge 95+)
 * - Canvas-based color extraction from uploaded book cover images
 * - Color palette extraction showing multiple color options from cover
 * - Visual color preview with hover effects
 *
 * @param value - Current hex color value
 * @param onPickerChange - Callback when color changes
 * @param coverImageUrl - URL of the book cover image for color extraction
 */

interface Props {
  value?: string;
  onPickerChange: (color: string) => void;
  coverImageUrl?: string;
}

const ColorPicker = ({ value, onPickerChange, coverImageUrl }: Props) => {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [extractedColors, setExtractedColors] = useState<string[]>([]);
  const [showColorPalette, setShowColorPalette] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Check if EyeDropper API is supported
  const isEyeDropperSupported =
    typeof window !== "undefined" && "EyeDropper" in window;

  // Convert ImageKit path to full URL
  const getFullImageUrl = (path: string): string => {
    if (!path) return "";

    // If it's already a full URL, return as is
    if (path.startsWith("http")) {
      return path;
    }

    // If it's an ImageKit path, construct the full URL
    const baseUrl = config.env.imagekit.urlEndpoint;
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`;
  };

  // Modern EyeDropper API for supported browsers
  const handleEyeDropper = async () => {
    if (!isEyeDropperSupported) {
      toast({
        title: "Not Supported",
        description:
          "EyeDropper is not supported in this browser. Try using the color extraction from cover image instead.",
        variant: "destructive",
      });
      return;
    }

    try {
      // @ts-ignore - EyeDropper is not in TypeScript definitions yet
      const eyeDropper = new EyeDropper();
      const result = await eyeDropper.open();
      onPickerChange(result.sRGBHex);
      toast({
        title: "Color Picked",
        description: `Selected color: ${result.sRGBHex}`,
      });
    } catch (error) {
      // User cancelled or error occurred
      console.log("EyeDropper cancelled or error:", error);
    }
  };

  // Extract color palette from cover image
  const extractColorFromCover = () => {
    if (!coverImageUrl) {
      toast({
        title: "No Cover Image",
        description:
          "Please upload a book cover first to extract colors from it.",
        variant: "destructive",
      });
      return;
    }

    const fullImageUrl = getFullImageUrl(coverImageUrl);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Show loading state
    toast({
      title: "Processing",
      description: "Extracting color palette from cover image...",
    });

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        // Set canvas size - scale down for performance
        const maxSize = 200;
        const scale = Math.min(maxSize / img.width, maxSize / img.height);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        // Draw image to canvas
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Color extraction for palette
        const colorMap = new Map<string, number>();
        const colorBrightness = new Map<string, number>();

        // Sample pixels and build color frequency map
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const alpha = data[i + 3];

          // Skip transparent pixels
          if (alpha < 128) continue;

          const brightness = (r * 299 + g * 587 + b * 114) / 1000;

          // Skip very light or very dark pixels
          if (brightness < 15 || brightness > 245) continue;

          // Reduce color precision to group similar colors
          const reducedR = Math.floor(r / 20) * 20;
          const reducedG = Math.floor(g / 20) * 20;
          const reducedB = Math.floor(b / 20) * 20;

          const hex = `#${(
            (1 << 24) +
            (reducedR << 16) +
            (reducedG << 8) +
            reducedB
          )
            .toString(16)
            .slice(1)}`;

          colorMap.set(hex, (colorMap.get(hex) || 0) + 1);
          colorBrightness.set(hex, brightness);
        }

        // Sort colors by frequency and select top colors
        const sortedColors = Array.from(colorMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 12) // Get top 12 colors
          .map(([color]) => color);

        // Filter out colors that are too similar to each other
        const palette: string[] = [];
        for (const color of sortedColors) {
          if (palette.length >= 8) break; // Limit to 8 colors for display

          // Check if this color is too similar to any existing color in palette
          const isSimilar = palette.some((existingColor) => {
            const similarity = calculateColorSimilarity(color, existingColor);
            return similarity > 0.8; // 80% similarity threshold
          });

          if (!isSimilar) {
            palette.push(color);
          }
        }

        if (palette.length === 0) {
          toast({
            title: "No Colors Found",
            description: "Could not extract suitable colors from the image.",
            variant: "destructive",
          });
          return;
        }

        setExtractedColors(palette);
        setShowColorPalette(true);
        setIsPickerOpen(false); // Close regular color picker when palette opens

        toast({
          title: "Color Palette Extracted",
          description: `Found ${palette.length} colors. Click one to select it.`,
        });
      } catch (error) {
        console.error("Error processing image:", error);
        toast({
          title: "Processing Error",
          description: "Failed to process the image for color extraction.",
          variant: "destructive",
        });
      }
    };

    img.onerror = () => {
      toast({
        title: "Image Load Error",
        description: "Failed to load cover image. Please try uploading again.",
        variant: "destructive",
      });
    };

    img.src = fullImageUrl;
  };

  // Calculate color similarity (0 = completely different, 1 = identical)
  const calculateColorSimilarity = (color1: string, color2: string): number => {
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);

    if (!rgb1 || !rgb2) return 0;

    const rDiff = Math.abs(rgb1.r - rgb2.r) / 255;
    const gDiff = Math.abs(rgb1.g - rgb2.g) / 255;
    const bDiff = Math.abs(rgb1.b - rgb2.b) / 255;

    return 1 - (rDiff + gDiff + bDiff) / 3;
  };

  // Convert hex to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  };

  // Handle color selection from palette
  const selectColorFromPalette = (color: string) => {
    onPickerChange(color);
    setShowColorPalette(false);
    toast({
      title: "Color Selected",
      description: `Selected color: ${color}`,
    });
  };

  // Inline style for dynamic color - this is acceptable for dynamic content
  const colorPreviewStyle = {
    backgroundColor: value || "#000000",
  };

  return (
    <div className="relative">
      <div className="flex flex-row items-center gap-2 mb-3">
        <div className="flex flex-row items-center flex-1">
          <p>#</p>
          <HexColorInput
            color={value}
            onChange={onPickerChange}
            className="hex-input"
          />
        </div>

        {/* Color preview - inline style needed for dynamic color */}
        {/* eslint-disable-next-line react/forbid-dom-props */}
        <div
          className="color-preview"
          style={colorPreviewStyle}
          onClick={() => setIsPickerOpen(!isPickerOpen)}
          title="Click to toggle color picker"
        />
      </div>

      {/* Eyedropper tools */}
      <div className="eyedropper-buttons">
        {isEyeDropperSupported && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleEyeDropper}
            className="eyedropper-btn"
            title="Pick color from screen"
          >
            🎯 Pick from Screen
          </Button>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={extractColorFromCover}
          disabled={!coverImageUrl}
          className="eyedropper-btn"
          title="Extract color palette from book cover"
        >
          🎨 Extract from Cover
        </Button>
      </div>

      {/* Color Palette from Cover */}
      {showColorPalette && extractedColors.length > 0 && (
        <div className="color-palette">
          <div className="color-palette-header">
            <h4 className="color-palette-title">Color Palette from Cover</h4>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowColorPalette(false)}
              className="color-palette-close"
            >
              ✕
            </Button>
          </div>
          <div className="color-palette-grid">
            {extractedColors.map((color, index) => (
              /* eslint-disable-next-line react/forbid-dom-props */
              <button
                key={`${color}-${index}`}
                type="button"
                className="color-palette-item"
                style={{ backgroundColor: color }}
                onClick={() => selectColorFromPalette(color)}
                title={`Select color: ${color}`}
              >
                {value === color && (
                  <div className="color-palette-selected">
                    <div className="color-palette-selected-dot"></div>
                  </div>
                )}
              </button>
            ))}
          </div>
          <p className="color-palette-instruction">
            Click any color to select it
          </p>
        </div>
      )}

      {/* Color picker */}
      {isPickerOpen && (
        <div className="hex-color-picker">
          <HexColorPicker color={value} onChange={onPickerChange} />
        </div>
      )}

      {/* Hidden canvas for color extraction */}
      <canvas ref={canvasRef} className="hidden-canvas" />
    </div>
  );
};

export default ColorPicker;
