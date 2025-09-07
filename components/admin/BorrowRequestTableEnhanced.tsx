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
  approveBorrowRequest,
  rejectBorrowRequest,
} from "@/lib/actions/borrow-request";
import { formatDistanceToNow } from "date-fns";
import { Check, X, Clock, User, Book, Search, Filter } from "lucide-react";
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
  };
}

interface BorrowRequestTableEnhancedProps {
  requests: BorrowRequest[];
  adminId: string;
}

export const BorrowRequestTableEnhanced: React.FC<
  BorrowRequestTableEnhancedProps
> = ({ requests, adminId }) => {
  const router = useRouter();
  const [selectedRequest, setSelectedRequest] = useState<BorrowRequest | null>(
    null
  );
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBy, setFilterBy] = useState("all");

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
      const result = await approveBorrowRequest({
        requestId: selectedRequest.request.id,
        adminId: adminId,
        adminNotes: adminNotes || undefined,
      });

      if (result.success) {
        toast({
          title: "Success",
          description:
            "Borrow request approved successfully. User has been notified via email.",
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
        adminId: adminId,
        adminNotes: adminNotes || undefined,
      });

      if (result.success) {
        toast({
          title: "Success",
          description:
            "Borrow request rejected. User has been notified via email.",
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Book className="w-5 h-5" />
              Borrow Requests
              <span className="ml-2 px-2 py-1 text-sm bg-blue-100 text-blue-700 rounded-full">
                {filteredRequests.length}
              </span>
              {filteredRequests.length > 0 && (
                <span className="ml-2 px-2 py-1 text-sm bg-orange-100 text-orange-700 rounded-full animate-pulse">
                  Action Required
                </span>
              )}
            </h2>

            {/* Search and Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-2">
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
                          {request.user.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm">
                      {request.user.universityId}
                    </span>
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
                <div className="space-y-3 mt-2">
                  <p>
                    Approve borrow request for{" "}
                    <strong>"{selectedRequest.book.title}"</strong> by{" "}
                    <strong>{selectedRequest.user.fullName}</strong>?
                  </p>
                  <div className="bg-blue-50 p-3 rounded-md">
                    <h4 className="font-medium text-blue-900">
                      What happens next:
                    </h4>
                    <ul className="text-sm text-blue-800 mt-1 space-y-1">
                      <li>• 7-day borrowing period will start</li>
                      <li>• User will receive approval email with due date</li>
                      <li>• Book inventory will be updated</li>
                      <li>• Borrow record will be created</li>
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
                <div className="space-y-3 mt-2">
                  <p>
                    Reject borrow request for{" "}
                    <strong>"{selectedRequest.book.title}"</strong> by{" "}
                    <strong>{selectedRequest.user.fullName}</strong>?
                  </p>
                  <div className="bg-red-50 p-3 rounded-md">
                    <h4 className="font-medium text-red-900">
                      What happens next:
                    </h4>
                    <ul className="text-sm text-red-800 mt-1 space-y-1">
                      <li>• Request will be marked as rejected</li>
                      <li>• User will receive notification email</li>
                      <li>• Book will become available for other users</li>
                      <li>• User can submit a new request later</li>
                    </ul>
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4">
            <Textarea
              placeholder="Reason for rejection (will be included in email)..."
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
