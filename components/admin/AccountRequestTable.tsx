"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Check, X, Eye, Clock, User } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  approveAccountRequest,
  rejectAccountRequest,
} from "@/lib/actions/account-request";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import config from "@/lib/config";

interface AccountRequest {
  id: string;
  fullName: string;
  email: string;
  universityId: number;
  universityCard: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: Date | null;
}

// Utility function to construct proper ImageKit URL
const getImageUrl = (path: string): string => {
  // If it's already a full URL, return as is
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  // If it's an ImageKit path, construct the full URL
  if (path.startsWith("/")) {
    const urlEndpoint = config.env.imagekit.urlEndpoint;
    return `${urlEndpoint}${path}`;
  }

  // If it's a relative path without leading slash, add it
  const urlEndpoint = config.env.imagekit.urlEndpoint;
  return `${urlEndpoint}/${path}`;
};

// Custom image component with fallback
const ImageWithFallback = ({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className: string;
}) => {
  const [imageError, setImageError] = useState(false);
  const [loading, setLoading] = useState(true);

  // Get the proper ImageKit URL
  const imageUrl = getImageUrl(src);

  const handleImageError = () => {
    console.log("Image failed to load:", imageUrl);
    setImageError(true);
    setLoading(false);
  };

  const handleImageLoad = () => {
    console.log("Image loaded successfully:", imageUrl);
    setLoading(false);
  };

  if (imageError) {
    return (
      <div
        className={`${className} bg-gray-100 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center`}
      >
        <div className="text-center p-8">
          <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-sm text-gray-500 mb-2">University ID Card</p>
          <p className="text-xs text-gray-400">Image not available</p>
          <p className="text-xs text-gray-400 mt-2 break-all">
            Original path: {src}
          </p>
          <p className="text-xs text-gray-400 mt-1 break-all">
            Constructed URL: {imageUrl}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {loading && (
        <div
          className={`${className} bg-gray-100 border animate-pulse flex items-center justify-center`}
        >
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-sm text-gray-500 mt-2">Loading...</p>
          </div>
        </div>
      )}
      <img
        src={imageUrl}
        alt={alt}
        className={`${className} ${loading ? "hidden" : "block"}`}
        onLoad={handleImageLoad}
        onError={handleImageError}
      />
    </div>
  );
};

interface Props {
  requests: AccountRequest[];
  adminId: string;
}

export const AccountRequestTable: React.FC<Props> = ({ requests, adminId }) => {
  const router = useRouter();
  const [selectedRequest, setSelectedRequest] = useState<AccountRequest | null>(
    null
  );
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showIdCardDialog, setShowIdCardDialog] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  const handleApprove = async () => {
    if (!selectedRequest) return;

    setProcessing(true);
    try {
      const result = await approveAccountRequest({
        userId: selectedRequest.id,
        adminId,
        adminNotes: adminNotes || undefined,
      });

      if (result.success) {
        toast({
          title: "Success",
          description:
            "Account request approved successfully. User has been notified via email.",
        });

        // Auto-refresh the page to show updated data
        setTimeout(() => {
          router.refresh();
        }, 1000);
      } else {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve account request",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
      setShowApproveDialog(false);
      setSelectedRequest(null);
      setAdminNotes("");
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    setProcessing(true);
    try {
      const result = await rejectAccountRequest({
        userId: selectedRequest.id,
        adminId,
        adminNotes: adminNotes || undefined,
      });

      if (result.success) {
        toast({
          title: "Success",
          description:
            "Account request rejected successfully. User has been notified via email.",
        });

        // Auto-refresh the page to show updated data
        setTimeout(() => {
          router.refresh();
        }, 1000);
      } else {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject account request",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
      setShowRejectDialog(false);
      setSelectedRequest(null);
      setAdminNotes("");
    }
  };

  const openIdCardDialog = (request: AccountRequest) => {
    setSelectedRequest(request);
    setShowIdCardDialog(true);
  };

  if (!requests || requests.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="max-w-sm mx-auto">
          <div className="bg-gray-100 rounded-full p-6 mx-auto w-16 h-16 flex items-center justify-center mb-4">
            <User className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Pending Account Requests
          </h3>
          <p className="text-gray-500">
            All account registration requests have been processed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User Information</TableHead>
              <TableHead>University ID</TableHead>
              <TableHead>ID Card</TableHead>
              <TableHead>Requested</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">{request.fullName}</p>
                      <p className="text-sm text-gray-500">{request.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                    {request.universityId}
                  </span>
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openIdCardDialog(request)}
                    className="flex items-center gap-1"
                  >
                    <Eye className="w-4 h-4" />
                    View ID Card
                  </Button>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">
                      {request.createdAt
                        ? formatDistanceToNow(new Date(request.createdAt), {
                            addSuffix: true,
                          })
                        : "Unknown"}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      request.status === "APPROVED"
                        ? "default"
                        : request.status === "REJECTED"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {request.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowApproveDialog(true);
                      }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowRejectDialog(true);
                      }}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* ID Card View Dialog */}
      <Dialog open={showIdCardDialog} onOpenChange={setShowIdCardDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>University ID Card</DialogTitle>
            <DialogDescription>
              {selectedRequest && (
                <div className="space-y-2">
                  <p>
                    <strong>Name:</strong> {selectedRequest.fullName}
                  </p>
                  <p>
                    <strong>Email:</strong> {selectedRequest.email}
                  </p>
                  <p>
                    <strong>University ID:</strong>{" "}
                    {selectedRequest.universityId}
                  </p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {selectedRequest && (
              <div className="relative bg-gray-50 p-4 rounded-lg">
                <ImageWithFallback
                  src={selectedRequest.universityCard}
                  alt={`${selectedRequest.fullName} University ID Card`}
                  className="w-full h-auto max-h-[60vh] object-contain rounded-lg border bg-white"
                />
                <div className="mt-2 text-center">
                  <p className="text-sm text-gray-500">
                    Database Path:{" "}
                    <span className="break-all">
                      {selectedRequest.universityCard}
                    </span>
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Full ImageKit URL:{" "}
                    <span className="break-all">
                      {getImageUrl(selectedRequest.universityCard)}
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Account Request</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedRequest && (
                <div className="space-y-3 mt-2">
                  <p>
                    Are you sure you want to approve the account request for{" "}
                    <strong>{selectedRequest.fullName}</strong> (
                    {selectedRequest.email})?
                  </p>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">
                      What happens next:
                    </h4>
                    <ul className="text-sm text-blue-800 mt-1 space-y-1">
                      <li>• User account will be activated</li>
                      <li>• User will receive approval email</li>
                      <li>• User can now access the library system</li>
                      <li>• User can borrow books and use all features</li>
                    </ul>
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4">
            <Textarea
              placeholder="Optional admin notes (will be included in email)..."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className="w-full"
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setAdminNotes("");
                setSelectedRequest(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprove}
              disabled={processing}
              className="bg-green-600 hover:bg-green-700"
            >
              {processing ? "Approving..." : "Approve Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Account Request</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedRequest && (
                <div className="space-y-3 mt-2">
                  <p>
                    Are you sure you want to reject the account request for{" "}
                    <strong>{selectedRequest.fullName}</strong> (
                    {selectedRequest.email})?
                  </p>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <h4 className="font-medium text-red-900 mb-2">
                      What happens next:
                    </h4>
                    <ul className="text-sm text-red-800 mt-1 space-y-1">
                      <li>• User account will be marked as rejected</li>
                      <li>• User will receive rejection email</li>
                      <li>• User cannot access the library system</li>
                      <li>• User may reapply with correct information</li>
                    </ul>
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4">
            <Textarea
              placeholder="Please provide a reason for rejection (will be included in email)..."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className="w-full"
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setAdminNotes("");
                setSelectedRequest(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={processing}
              className="bg-red-600 hover:bg-red-700"
            >
              {processing ? "Rejecting..." : "Reject Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
