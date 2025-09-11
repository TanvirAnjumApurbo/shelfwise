"use client";

import React, { useState } from "react";
import BookCover from "@/components/BookCover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  approveBorrowRequest,
  rejectBorrowRequest,
} from "@/lib/actions/borrow-request";
import { formatDistanceToNow } from "date-fns";
import { Check, X, Clock, User, Book } from "lucide-react";
import { useRouter } from "next/navigation";

interface BorrowRequest {
  request: {
    id: string;
    status: string;
    requestedAt: Date;
    adminNotes?: string | null;
  };
  user: {
    id: string;
    fullName: string;
    email: string;
    universityId: number;
  };
  book: {
    id: string;
    title: string;
    author: string;
    coverUrl: string;
    coverColor: string;
  };
}

interface BorrowRequestTableProps {
  requests: BorrowRequest[];
  adminId: string;
}

export const BorrowRequestTable: React.FC<BorrowRequestTableProps> = ({
  requests,
  adminId,
}) => {
  const router = useRouter();
  const [selectedRequest, setSelectedRequest] = useState<BorrowRequest | null>(
    null
  );
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  const handleApprove = async () => {
    if (!selectedRequest) return;

    setProcessing(true);
    try {
      const result = await approveBorrowRequest({
        requestId: selectedRequest.request.id,
        adminId,
        adminNotes: adminNotes || undefined,
      });

      if (result.success) {
        toast({
          title: "Success",
          description: "Borrow request approved successfully",
        });
        router.refresh();
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
        description: "Failed to approve request",
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
      const result = await rejectBorrowRequest({
        requestId: selectedRequest.request.id,
        adminId,
        adminNotes: adminNotes || undefined,
      });

      if (result.success) {
        toast({
          title: "Success",
          description: "Borrow request rejected",
        });
        router.refresh();
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
        description: "Failed to reject request",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
      setShowRejectDialog(false);
      setSelectedRequest(null);
      setAdminNotes("");
    }
  };

  if (!requests || requests.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Book className="w-5 h-5" />
          Borrow Requests
        </h2>
        <p className="text-gray-500 text-center py-8">
          No pending borrow requests
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Book className="w-5 h-5" />
            Borrow Requests
            <span className="ml-2 px-2 py-1 text-sm bg-blue-100 text-blue-700 rounded-full">
              {requests.length}
            </span>
          </h2>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Book</TableHead>
                <TableHead>User</TableHead>
                <TableHead>University ID</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.request.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-15">
                        <BookCover
                          coverColor={request.book.coverColor}
                          coverImage={request.book.coverUrl}
                          variant="extraSmall"
                        />
                      </div>
                      <div>
                        <p className="font-medium">{request.book.title}</p>
                        <p className="text-sm text-gray-500">
                          {request.book.author}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="font-medium">{request.user.fullName}</p>
                        <p className="text-sm text-gray-500">
                          {request.user.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{request.user.universityId}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">
                        {formatDistanceToNow(
                          new Date(request.request.requestedAt),
                          {
                            addSuffix: true,
                          }
                        )}
                      </span>
                    </div>
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
      </div>

      {/* Approve Dialog */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Borrow Request</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedRequest && (
                <div className="space-y-2 mt-2">
                  <p>
                    Approve borrow request for{" "}
                    <strong>{selectedRequest.book.title}</strong> by{" "}
                    <strong>{selectedRequest.user.fullName}</strong>?
                  </p>
                  <p className="text-sm">
                    This will create a 7-day borrow period and send a
                    confirmation email to the user.
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4">
            <Textarea
              placeholder="Optional admin notes..."
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
            <AlertDialogAction onClick={handleApprove} disabled={processing}>
              {processing ? "Processing..." : "Approve Request"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Borrow Request</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedRequest && (
                <div className="space-y-2 mt-2">
                  <p>
                    Reject borrow request for{" "}
                    <strong>{selectedRequest.book.title}</strong> by{" "}
                    <strong>{selectedRequest.user.fullName}</strong>?
                  </p>
                  <p className="text-sm">
                    The book will become available again and the user will be
                    notified.
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4">
            <Textarea
              placeholder="Reason for rejection (optional)..."
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
              {processing ? "Processing..." : "Reject Request"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
