"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { addReview } from "@/lib/actions/book";
import { toast } from "sonner";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

interface Review {
  review: {
    id: string;
    rating: number;
    comment: string;
    createdAt: Date | null;
  };
  user: {
    fullName: string;
    universityId: number;
  };
}

interface BookReviewsProps {
  bookId: string;
  userId?: string;
  reviews: Review[];
  userReview?: {
    id: string;
    rating: number;
    comment: string;
    createdAt: Date | null;
  } | null;
}

const StarRating = ({
  rating,
  onRatingChange,
  readonly = false,
}: {
  rating: number;
  onRatingChange?: (rating: number) => void;
  readonly?: boolean;
}) => {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => !readonly && onRatingChange?.(star)}
          className={`text-2xl transition-colors ${
            star <= rating ? "text-yellow-400" : "text-gray-300"
          } ${
            !readonly
              ? "hover:text-yellow-300 cursor-pointer"
              : "cursor-default"
          }`}
          disabled={readonly}
        >
          ★
        </button>
      ))}
    </div>
  );
};

const BookReviews = ({
  bookId,
  userId,
  reviews,
  userReview,
}: BookReviewsProps) => {
  const [isWritingReview, setIsWritingReview] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitReview = async () => {
    if (!userId) {
      toast.error("Please log in to write a review");
      return;
    }

    if (comment.trim().length < 5) {
      toast.error("Review must be at least 5 characters long");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await addReview({
        userId,
        bookId,
        rating,
        comment: comment.trim(),
      });

      if (result.success) {
        toast.success("Review added successfully!");
        setIsWritingReview(false);
        setComment("");
        setRating(5);
        // The page will revalidate automatically due to revalidatePath in the action
        window.location.reload();
      } else {
        toast.error(result.error || "Failed to add review");
      }
    } catch (error) {
      toast.error("An error occurred while adding the review");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimeAgo = (date: Date | null) => {
    if (!date) return "Unknown time";
    return dayjs(date).fromNow();
  };

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.review.rating, 0) /
        reviews.length
      : 0;

  return (
    <section className="flex flex-col gap-7 mt-10">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-3">
          Reviews
          {reviews.length > 0 && (
            <span className="text-light-400 text-lg">
              ({reviews.length} {reviews.length === 1 ? "review" : "reviews"})
            </span>
          )}
        </h3>

        {userId && !userReview && !isWritingReview && (
          <Button
            onClick={() => setIsWritingReview(true)}
            className="bg-primary-500 hover:bg-primary-600"
          >
            Write a Review
          </Button>
        )}
      </div>

      {reviews.length > 0 && (
        <div className="flex items-center gap-4 p-4 bg-gray-900 rounded-lg">
          <div className="flex items-center gap-2">
            <StarRating rating={Math.round(averageRating)} readonly />
            <span className="text-xl font-semibold text-light-100">
              {averageRating.toFixed(1)}
            </span>
          </div>
          <span className="text-light-400">
            Average rating from {reviews.length}{" "}
            {reviews.length === 1 ? "review" : "reviews"}
          </span>
        </div>
      )}

      {/* User's existing review */}
      {userReview && (
        <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-blue-400 font-medium">Your Review</span>
            <span className="text-light-400 text-sm">
              {formatTimeAgo(userReview.createdAt)}
            </span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <StarRating rating={userReview.rating} readonly />
          </div>
          <p className="text-light-100">{userReview.comment}</p>
        </div>
      )}

      {/* Write new review form */}
      {isWritingReview && (
        <div className="p-6 bg-gray-900 rounded-lg border border-gray-700">
          <h4 className="text-xl font-semibold mb-4 text-light-100">
            Write a Review
          </h4>

          <div className="space-y-4">
            <div>
              <Label className="text-light-200">Rating</Label>
              <div className="mt-1">
                <StarRating rating={rating} onRatingChange={setRating} />
              </div>
            </div>

            <div>
              <Label htmlFor="review-comment" className="text-light-200">
                Your Review
              </Label>
              <Textarea
                id="review-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your thoughts about this book..."
                className="mt-1 min-h-[120px] bg-gray-800 border-gray-600 text-light-100"
                maxLength={1000}
              />
              <div className="text-right text-sm text-light-400 mt-1">
                {comment.length}/1000
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleSubmitReview}
                disabled={isSubmitting || comment.trim().length < 5}
                className="bg-primary-500 hover:bg-primary-600"
              >
                {isSubmitting ? "Submitting..." : "Submit Review"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsWritingReview(false);
                  setComment("");
                  setRating(5);
                }}
                className="border-gray-600 text-light-200 hover:bg-gray-800"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reviews list */}
      <div className="space-y-6">
        {reviews.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-light-400 text-lg">No reviews yet</p>
            <p className="text-light-500 mt-2">
              Be the first to share your thoughts about this book!
            </p>
          </div>
        ) : (
          reviews.map((reviewData) => (
            <div
              key={reviewData.review.id}
              className="p-6 bg-gray-900 rounded-lg border border-gray-700"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h5 className="font-semibold text-light-100">
                    {reviewData.user.fullName}
                  </h5>
                  <p className="text-light-400 text-sm">
                    University ID: {reviewData.user.universityId}
                  </p>
                </div>
                <span className="text-light-400 text-sm">
                  {formatTimeAgo(reviewData.review.createdAt)}
                </span>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <StarRating rating={reviewData.review.rating} readonly />
              </div>

              <p className="text-light-100 leading-relaxed">
                {reviewData.review.comment}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
};

export default BookReviews;
