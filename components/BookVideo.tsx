"use client";
import React from "react";
import { IKVideo, ImageKitProvider } from "imagekitio-next";
import config from "@/lib/config";

interface BookVideoProps {
  videoUrl?: string | null;
  youtubeUrl?: string | null;
}

// Function to extract YouTube video ID from various YouTube URL formats
const extractYouTubeId = (url: string): string | null => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

const BookVideo = ({ videoUrl, youtubeUrl }: BookVideoProps) => {
  // If YouTube URL is provided, use it
  if (youtubeUrl && youtubeUrl.trim()) {
    const videoId = extractYouTubeId(youtubeUrl);
    if (videoId) {
      return (
        <div className="w-full aspect-video">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            title="Book Trailer"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full rounded-xl"
          />
        </div>
      );
    }
  }

  // If ImageKit video URL is provided, use it
  if (videoUrl && videoUrl.trim()) {
    return (
      <ImageKitProvider
        publicKey={config.env.imagekit.publicKey}
        urlEndpoint={config.env.imagekit.urlEndpoint}
      >
        <IKVideo
          path={videoUrl}
          controls={true}
          className="w-full rounded-xl"
        />
      </ImageKitProvider>
    );
  }

  // If no video is provided, return null (don't show anything)
  return null;
};

export default BookVideo;
