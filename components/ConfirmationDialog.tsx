"use client";

import React, { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  bookTitle?: string; // For validation against book title
  acceptedKeywords?: string[]; // Additional accepted keywords like "confirm", "return"
  placeholder: string;
  onConfirm: (text: string) => void;
  confirmButtonText?: string;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  bookTitle,
  acceptedKeywords = ["confirm"],
  placeholder,
  onConfirm,
  confirmButtonText = "Confirm",
}) => {
  const [inputText, setInputText] = useState("");
  const [error, setError] = useState("");

  const handleConfirm = () => {
    const text = inputText.trim();
    
    // Validate minimum length
    if (text.length < 5) {
      setError("Please enter at least 5 characters to confirm");
      return;
    }

    // Validation logic as per design:
    // 1. Accept any of the accepted keywords (case-insensitive)
    // 2. Accept partial book title matches (case-insensitive)
    const textLower = text.toLowerCase();
    const keywordMatch = acceptedKeywords.some(keyword => 
      textLower === keyword.toLowerCase()
    );
    
    const titleMatch = bookTitle && 
      (textLower.includes(bookTitle.toLowerCase()) || 
       bookTitle.toLowerCase().includes(textLower));

    const isValidConfirmation = keywordMatch || titleMatch;

    if (!isValidConfirmation) {
      const keywordList = acceptedKeywords.map(k => `"${k}"`).join(" or ");
      if (bookTitle) {
        setError(`Please type ${keywordList} or part of the book title "${bookTitle}" to confirm`);
      } else {
        setError(`Please type ${keywordList} to proceed`);
      }
      return;
    }

    onConfirm(inputText);
    setInputText("");
    setError("");
    onOpenChange(false);
  };

  const handleCancel = () => {
    setInputText("");
    setError("");
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="my-4">
          <Input
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              setError("");
            }}
            placeholder={placeholder}
            className="w-full"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleConfirm();
              }
            }}
          />
          {error && (
            <p className="text-sm text-red-500 mt-2">{error}</p>
          )}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>
            {confirmButtonText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
