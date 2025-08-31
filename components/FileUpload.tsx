"use client";

import { IKImage, ImageKitProvider, IKUpload, IKVideo } from "imagekitio-next";
import React, { useRef, useState } from "react";
import Image from "next/image";
import config from "@/lib/config";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const {
  env: {
    imagekit: { publicKey, urlEndpoint },
  },
} = config;

const authenticator = async () => {
  try {
    const response = await fetch(`${config.env.apiEndpoint}/api/auth/imagekit`);

    if (!response.ok) {
      const errorText = await response.text();

      throw new Error(
        `Request failed with status ${response.status}: ${errorText}`
      );
    }

    const data = await response.json();

    const { signature, expire, token } = data;

    return { token, expire, signature };
  } catch (error: any) {
    throw new Error(`Authentication request failed: ${error.message}`);
  }
};

interface Props {
  type: "image" | "video";
  accept: string;
  placeholder: string;
  folder: string;
  variant: "dark" | "light";
  onFileChange: (filePath: string) => void;
  value?: string; // existing stored path (e.g. from form default values)
}

const FileUpload = ({
  type,
  accept,
  placeholder,
  folder,
  variant,
  onFileChange,
  value,
}: Props) => {
  const ikUploadRef = useRef(null);

  // We store the canonical ImageKit file path (relative path, no domain)
  const [file, setFile] = useState<{ filePath: string } | null>(
    value ? { filePath: value } : null
  );

  const styles = {
    button:
      variant === "dark"
        ? "bg-dark-300"
        : "bg-light-600 border-gray-100 border",
    placeholder: variant === "dark" ? "text-light-100" : "text-slate-500",
    text: variant === "dark" ? "text-light-100" : "text-dark-400",
  };

  const onError = (error: any) => {
    console.log(error);

    toast.error(`${type} upload failed`, {
      description: `Your ${type} could not be uploaded. Please try again.`,
    });
  };

  const onSuccess = (res: any) => {
    // ImageKit returns 'filePath' (camelCase). Old code used 'filepath' which is undefined.
    let rawPath: string | undefined = res.filePath || res.filepath || res?.path;

    if (!rawPath && res?.url) {
      // Derive path from full URL if only url was returned.
      try {
        const u = new URL(res.url);
        rawPath = u.pathname; // includes leading '/'
      } catch (e) {
        // ignore
      }
    }

    if (!rawPath) {
      toast.error("Upload succeeded but path missing", {
        description: "Could not determine uploaded file path.",
      });
      return;
    }

    // Normalize to no leading slash for ImageKit 'path' prop OR keep as-is? ImageKit's 'path' expects filePath without domain; leading slash is accepted. Ensure single leading slash.
    const normalizedPath = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;

    setFile({ filePath: normalizedPath });
    onFileChange(normalizedPath);

    toast.success(`${type} uploaded successfully`, {
      description: `${normalizedPath} uploaded successfully!`,
    });
  };

  const onValidate = (file: File) => {
    if (type === "image") {
      if (file.size > 20 * 1024 * 1024) {
        toast.error("File size too large", {
          description: "Please upload a file that is less than 20MB in size",
        });

        return false;
      }
    } else if (type === "video") {
      if (file.size > 50 * 1024 * 1024) {
        toast.error("File size too large", {
          description: "Please upload a file that is less than 50MB in size",
        });
        return false;
      }
    }

    return true;
  };

  return (
    <ImageKitProvider
      publicKey={publicKey}
      urlEndpoint={urlEndpoint}
      authenticator={authenticator}
    >
      <IKUpload
        ref={ikUploadRef}
        onError={onError}
        onSuccess={onSuccess}
        useUniqueFileName={true}
        validateFile={onValidate}
        // onUploadStart={() => setProgress(0)}
        // onUploadProgress={({ loaded, total }) => {
        //   const percent = Math.round((loaded / total) * 100);

        //   setProgress(percent);
        // }}
        folder={folder}
        accept={accept}
        className="hidden"
      />

      <button
        className={cn("upload-btn", styles.button)}
        onClick={(e) => {
          e.preventDefault();

          if (ikUploadRef.current) {
            // @ts-ignore
            ikUploadRef.current?.click();
          }
        }}
      >
        <Image
          src="/icons/upload.svg"
          alt="upload-icon"
          width={20}
          height={20}
          className="object-contain"
        />

        <p className={cn("text-base", styles.placeholder)}>{placeholder}</p>

        {file && (
          <p className={cn("upload-filename", styles.text)}>{file.filePath}</p>
        )}
      </button>
      {/* {progress > 0 && progress !== 100 && (
        <div className="w-full rounded-full bg-green-200">
          <div className="progress" style={{ width: `${progress}%` }}>
            {progress}%
          </div>
        </div>
      )} */}
      {file &&
        (type === "image" ? (
          <IKImage
            alt={file.filePath}
            path={file.filePath}
            width={500}
            height={300}
            className="w-full h-auto rounded-xl object-cover"
          />
        ) : type === "video" ? (
          <IKVideo
            path={file.filePath}
            controls={true}
            className="h-96 w-full rounded-xl"
          />
        ) : null)}
    </ImageKitProvider>
  );
};

// const FileUpload = () => {
//   return <div>FileUpload</div>;
// };

export default FileUpload;
