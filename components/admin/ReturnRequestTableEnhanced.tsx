"use client";

import React, { useState } from "react";
import Image from "next/image";
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
  approveReturnRequest,
  rejectReturnRequest,
} from "@/lib/actions/return-request-enhanced";
import { formatDistanceToNow, format } from "date-fns";
import {
  Check,
  X,
  Clock,
  User,
  BookOpen,
  Calendar,
  Search,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface ReturnRequest {
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
  };
  borrowRecord: {
    borrowDate: Date;
    dueDate: string;
  };
}

interface ReturnRequestTableEnhancedProps {
  requests: ReturnRequest[];
  adminId: string;
}

export const ReturnRequestTableEnhanced: React.FC<
  ReturnRequestTableEnhancedProps
> = ({ requests, adminId }) => {
  const router = useRouter();
  const [selectedRequest, setSelectedRequest] = useState<ReturnRequest | null>(
    null
  );
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Filter and search functionality
  const filteredRequests = requests.filter((request) => {
    const matchesSearch =
      searchTerm === "" ||
      request.user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.user.universityId.toString().includes(searchTerm);

    return matchesSearch;
  });

  const handleApprove = async () => {
    if (!selectedRequest) return;

    setProcessing(true);
    try {
      const result = await approveReturnRequest({
        requestId: selectedRequest.request.id,
        adminId: adminId,
        adminNotes: adminNotes || undefined,
      });

      if (result.success) {
        toast({
          title: "Success",
          description:
            "Return request approved successfully. Book has been marked as returned and inventory updated.",
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
        description: "Failed to approve return request",
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
    if (!selectedRequest || !adminNotes.trim()) return;

    setProcessing(true);
    try {
      const result = await rejectReturnRequest({
        requestId: selectedRequest.request.id,
        adminId: adminId,
        adminNotes: adminNotes,
      });

      if (result.success) {
        toast({
          title: "Success",
          description:
            "Return request rejected. User has been notified to visit the library.",
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
        description: "Failed to reject return request",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
      setShowRejectDialog(false);
      setSelectedRequest(null);
      setAdminNotes("");
    }
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  if (!requests || requests.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Return Requests
        </h2>
        <p className="text-gray-500 text-center py-8">
          No pending return requests
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Return Requests
              <span className="ml-2 px-2 py-1 text-sm bg-green-100 text-green-700 rounded-full">
                {filteredRequests.length}
              </span>
            </h2>

            {/* Search Controls */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by user, book, or university ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full sm:w-64"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Book</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Borrow Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Return Requested</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.map((request) => (
                <TableRow key={request.request.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Image
                        src={request.book.coverUrl}
                        alt={request.book.title}
                        width={40}
                        height={60}
                        className="rounded object-cover"
                      />
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
                          ID: {request.user.universityId}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">
                        {format(
                          new Date(request.borrowRecord.borrowDate),
                          "MMM dd, yyyy"
                        )}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span
                        className={`text-sm ${
                          isOverdue(request.borrowRecord.dueDate)
                            ? "text-red-600 font-semibold"
                            : ""
                        }`}
                      >
                        {format(
                          new Date(request.borrowRecord.dueDate),
                          "MMM dd, yyyy"
                        )}
                        {isOverdue(request.borrowRecord.dueDate) && (
                          <span className="ml-1 px-1 py-0.5 text-xs bg-red-100 text-red-700 rounded">
                            OVERDUE
                          </span>
                        )}
                      </span>
                    </div>
                  </TableCell>
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
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Confirm Return
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
            <AlertDialogTitle>Confirm Book Return</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedRequest && (
                <div className="space-y-3 mt-2">
                  <p>
                    Confirm return of{" "}
                    <strong>"{selectedRequest.book.title}"</strong> by{" "}
                    <strong>{selectedRequest.user.fullName}</strong>?
                  </p>
                  <div className="bg-green-50 p-3 rounded-md">
                    <h4 className="font-medium text-green-900">
                      What happens next:
                    </h4>
                    <ul className="text-sm text-green-800 mt-1 space-y-1">
                      <li>• Book will be marked as returned</li>
                      <li>• Available inventory will be increased</li>
                      <li>• User will receive confirmation email</li>
                      <li>• Borrow countdown will stop</li>
                    </ul>
                  </div>
                  {selectedRequest.borrowRecord.dueDate &&
                    isOverdue(selectedRequest.borrowRecord.dueDate) && (
                      <div className="bg-yellow-50 p-3 rounded-md">
                        <p className="text-sm text-yellow-800">
                          <strong>Note:</strong> This book was overdue (Due:{" "}
                          {format(
                            new Date(selectedRequest.borrowRecord.dueDate),
                            "MMM dd, yyyy"
                          )}
                          ). Consider any applicable late fees or penalties.
                        </p>
                      </div>
                    )}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4">
            <Textarea
              placeholder="Optional admin notes (will be included in confirmation email)..."
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
              {processing ? "Processing..." : "Confirm Return"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Return Request</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedRequest && (
                <div className="space-y-3 mt-2">
                  <p>
                    Reject return request for{" "}
                    <strong>"{selectedRequest.book.title}"</strong> by{" "}
                    <strong>{selectedRequest.user.fullName}</strong>?
                  </p>
                  <div className="bg-red-50 p-3 rounded-md">
                    <h4 className="font-medium text-red-900">
                      What happens next:
                    </h4>
                    <ul className="text-sm text-red-800 mt-1 space-y-1">
                      <li>• Book will remain borrowed</li>
                      <li>• User will be notified to visit library</li>
                      <li>• Return countdown continues</li>
                      <li>• Physical inspection may be required</li>
                    </ul>
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4">
            <Textarea
              placeholder="Reason for rejection (required - will be included in email)..."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className="w-full"
              rows={3}
              required
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
              disabled={processing || !adminNotes.trim()}
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
