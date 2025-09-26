"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { toast } from "@/hooks/use-toast";
import { restrictUser, unrestrictUser } from "@/lib/admin/actions/user";
import { formatDistanceToNow, format } from "date-fns";
import {
  User,
  Mail,
  IdCard,
  Calendar,
  CreditCard,
  BookOpen,
  Clock,
  CheckCircle,
  XCircle,
  Shield,
  ShieldOff,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Settings,
} from "lucide-react";
import { useRouter } from "next/navigation";
import BookCover from "@/components/BookCover";

interface UserDetailClientProps {
  user: any;
  adminId: string;
}

export const UserDetailClient: React.FC<UserDetailClientProps> = ({
  user,
  adminId,
}) => {
  const router = useRouter();
  const [dialogType, setDialogType] = useState<
    "restrict" | "unrestrict" | null
  >(null);
  const [restrictionReason, setRestrictionReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRestrict = async () => {
    if (!restrictionReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a restriction reason.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await restrictUser({
        userId: user.user.id,
        adminId,
        restrictionReason: restrictionReason.trim(),
      });

      if (result.success) {
        toast({
          title: "Success",
          description: result.message,
        });
        setDialogType(null);
        setRestrictionReason("");
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
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnrestrict = async () => {
    setIsLoading(true);
    try {
      const result = await unrestrictUser({
        userId: user.user.id,
        adminId,
      });

      if (result.success) {
        toast({
          title: "Success",
          description: result.message,
        });
        setDialogType(null);
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
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      PENDING: "secondary",
      APPROVED: "default",
      REJECTED: "destructive",
    };

    return (
      <Badge variant={variants[status] || "secondary"}>
        {status.toLowerCase()}
      </Badge>
    );
  };

  const getRoleBadge = (role: string) => {
    return (
      <Badge variant={role === "ADMIN" ? "destructive" : "outline"}>
        {role}
      </Badge>
    );
  };

  const formatCurrency = (amount: string) => {
    return `$${parseFloat(amount || "0").toFixed(2)}`;
  };

  const getRequestStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      PENDING: "secondary",
      APPROVED: "default",
      REJECTED: "destructive",
      CANCELLED: "secondary",
      RETURN_PENDING: "secondary",
      RETURNED: "default",
    };

    const colors: Record<string, string> = {
      PENDING: "text-yellow-700 bg-yellow-100",
      APPROVED: "text-green-700 bg-green-100",
      REJECTED: "text-red-700 bg-red-100",
      CANCELLED: "text-gray-700 bg-gray-100",
      RETURN_PENDING: "text-orange-700 bg-orange-100",
      RETURNED: "text-blue-700 bg-blue-100",
    };

    return (
      <Badge className={colors[status] || "text-gray-700 bg-gray-100"}>
        {status.toLowerCase().replace("_", " ")}
      </Badge>
    );
  };

  const getFineStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: "text-red-700 bg-red-100",
      PAID: "text-green-700 bg-green-100",
      WAIVED: "text-blue-700 bg-blue-100",
      PARTIAL_PAID: "text-orange-700 bg-orange-100",
    };

    return (
      <Badge className={colors[status] || "text-gray-700 bg-gray-100"}>
        {status.toLowerCase().replace("_", " ")}
      </Badge>
    );
  };

  return (
    <>
      <div className="space-y-6">
        {/* User Header Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{user.user.fullName}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{user.user.email}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    {getStatusBadge(user.user.status)}
                    {getRoleBadge(user.user.role)}
                    {user.user.isRestricted && (
                      <Badge
                        variant="destructive"
                        className="flex items-center gap-1"
                      >
                        <Shield className="w-3 h-3" />
                        Restricted
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              {user.user.role !== "ADMIN" && (
                <div className="flex gap-2">
                  {user.user.isRestricted ? (
                    <Button
                      onClick={() => setDialogType("unrestrict")}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <ShieldOff className="w-4 h-4 mr-2" />
                      Unrestrict User
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setDialogType("restrict")}
                      variant="destructive"
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Restrict User
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-3">
                <IdCard className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">University ID</p>
                  <p className="font-medium">{user.user.universityId}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Total Fines</p>
                  <p
                    className={`font-medium ${
                      parseFloat(user.user.totalFinesOwed || "0") > 0
                        ? "text-red-600"
                        : "text-green-600"
                    }`}
                  >
                    {formatCurrency(user.user.totalFinesOwed)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Last Activity</p>
                  <p className="font-medium">
                    {user.user.lastActivityDate
                      ? format(
                          new Date(user.user.lastActivityDate),
                          "MMM dd, yyyy"
                        )
                      : "Never"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Member Since</p>
                  <p className="font-medium">
                    {user.user.createdAt &&
                      formatDistanceToNow(new Date(user.user.createdAt), {
                        addSuffix: true,
                      })}
                  </p>
                </div>
              </div>
            </div>
            {user.user.isRestricted && user.user.restrictionReason && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <p className="font-medium text-red-800">Restriction Reason</p>
                </div>
                <p className="text-red-700">{user.user.restrictionReason}</p>
                {user.user.restrictedAt && (
                  <p className="text-sm text-red-600 mt-1">
                    Restricted on{" "}
                    {format(new Date(user.user.restrictedAt), "MMM dd, yyyy")}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-full">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Borrow Requests</p>
                  <p className="text-2xl font-bold">
                    {user.borrowStats.totalBorrowRequests}
                  </p>
                  <div className="flex gap-2 mt-1">
                    <span className="text-xs text-green-600">
                      {user.borrowStats.approvedRequests} approved
                    </span>
                    <span className="text-xs text-yellow-600">
                      {user.borrowStats.pendingRequests} pending
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-full">
                  <ArrowUpRight className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Return Requests</p>
                  <p className="text-2xl font-bold">
                    {user.returnStats.totalReturnRequests}
                  </p>
                  <div className="flex gap-2 mt-1">
                    <span className="text-xs text-green-600">
                      {user.returnStats.approvedReturns} approved
                    </span>
                    <span className="text-xs text-yellow-600">
                      {user.returnStats.pendingReturns} pending
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-100 rounded-full">
                  <BookOpen className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Currently Borrowed</p>
                  <p className="text-2xl font-bold">
                    {user.currentBorrowedBooks.length}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Active books</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 rounded-full">
                  <CreditCard className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Active Fines</p>
                  <p className="text-2xl font-bold text-red-600">
                    {
                      user.fines.filter((f: any) => f.status === "PENDING")
                        .length
                    }
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Unpaid penalties</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Information Tabs */}
        <Tabs defaultValue="borrowed" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="borrowed">Current Books</TabsTrigger>
            <TabsTrigger value="borrow-history">Borrow History</TabsTrigger>
            <TabsTrigger value="return-history">Return History</TabsTrigger>
            <TabsTrigger value="fines">Fines</TabsTrigger>
            <TabsTrigger value="audit">Audit Log</TabsTrigger>
          </TabsList>

          {/* Currently Borrowed Books */}
          <TabsContent value="borrowed">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Currently Borrowed Books ({user.currentBorrowedBooks.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {user.currentBorrowedBooks.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No books currently borrowed</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {user.currentBorrowedBooks.map((record: any) => (
                      <div
                        key={record.id}
                        className="border rounded-lg p-4 space-y-3"
                      >
                        <div className="flex items-center gap-3">
                          <BookCover
                            coverImage={record.book.coverUrl}
                            coverColor={record.book.coverColor}
                            className="w-12 h-16 flex-shrink-0"
                          />
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">
                              {record.book.title}
                            </h4>
                            <p className="text-xs text-gray-500">
                              {record.book.author}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Borrowed:</span>
                            <span>
                              {format(
                                new Date(record.borrowDate),
                                "MMM dd, yyyy"
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Due:</span>
                            <span
                              className={
                                new Date(record.dueDate) < new Date()
                                  ? "text-red-600 font-medium"
                                  : ""
                              }
                            >
                              {format(new Date(record.dueDate), "MMM dd, yyyy")}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Borrow History */}
          <TabsContent value="borrow-history">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Borrow Request History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {user.recentBorrowRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No borrow requests found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {user.recentBorrowRequests.map((request: any) => (
                      <div key={request.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <BookCover
                              coverImage={request.book.coverUrl}
                              coverColor={request.book.coverColor}
                              className="w-10 h-14 flex-shrink-0"
                            />
                            <div>
                              <h4 className="font-medium">
                                {request.book.title}
                              </h4>
                              <p className="text-sm text-gray-500">
                                {request.book.author}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                Requested{" "}
                                {formatDistanceToNow(
                                  new Date(request.requestedAt),
                                  { addSuffix: true }
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            {getRequestStatusBadge(request.status)}
                            {request.adminNotes && (
                              <p className="text-xs text-gray-500 mt-1 max-w-48">
                                {request.adminNotes}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Return History */}
          <TabsContent value="return-history">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowUpRight className="w-5 h-5" />
                  Return Request History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {user.recentReturnRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <ArrowUpRight className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No return requests found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {user.recentReturnRequests.map((request: any) => (
                      <div key={request.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <BookCover
                              coverImage={request.book.coverUrl}
                              coverColor={request.book.coverColor}
                              className="w-10 h-14 flex-shrink-0"
                            />
                            <div>
                              <h4 className="font-medium">
                                {request.book.title}
                              </h4>
                              <p className="text-sm text-gray-500">
                                {request.book.author}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                Requested{" "}
                                {formatDistanceToNow(
                                  new Date(request.requestedAt),
                                  { addSuffix: true }
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            {getRequestStatusBadge(request.status)}
                            {request.adminNotes && (
                              <p className="text-xs text-gray-500 mt-1 max-w-48">
                                {request.adminNotes}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fines */}
          <TabsContent value="fines">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Fines & Penalties
                </CardTitle>
              </CardHeader>
              <CardContent>
                {user.fines.length === 0 ? (
                  <div className="text-center py-8">
                    <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No fines found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {user.fines.map((fine: any) => (
                      <div key={fine.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium">
                                {formatCurrency(fine.amount)}
                              </h4>
                              {getFineStatusBadge(fine.status)}
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              {fine.description}
                            </p>
                            {fine.book && (
                              <p className="text-sm text-gray-500">
                                Book: {fine.book.title} by {fine.book.author}
                              </p>
                            )}
                            <p className="text-xs text-gray-400 mt-2">
                              Created{" "}
                              {formatDistanceToNow(new Date(fine.createdAt), {
                                addSuffix: true,
                              })}
                              {fine.paidAt && (
                                <span className="ml-2 text-green-600">
                                  • Paid{" "}
                                  {formatDistanceToNow(new Date(fine.paidAt), {
                                    addSuffix: true,
                                  })}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Log */}
          <TabsContent value="audit">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Audit Log
                </CardTitle>
              </CardHeader>
              <CardContent>
                {user.recentAuditLogs.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No audit logs found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {user.recentAuditLogs.map((log: any) => (
                      <div key={log.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">
                                {log.action.replace("_", " ").toLowerCase()}
                              </Badge>
                              <span className="text-sm text-gray-500">
                                by {log.actorType.toLowerCase()}
                              </span>
                            </div>
                            {log.metadata &&
                              typeof log.metadata === "object" && (
                                <div className="text-sm text-gray-600 space-y-1">
                                  {Object.entries(log.metadata).map(
                                    ([key, value]) => (
                                      <div key={key} className="flex gap-2">
                                        <span className="font-medium capitalize">
                                          {key
                                            .replace(/([A-Z])/g, " $1")
                                            .toLowerCase()}
                                          :
                                        </span>
                                        <span>{String(value)}</span>
                                      </div>
                                    )
                                  )}
                                </div>
                              )}
                            <p className="text-xs text-gray-400 mt-2">
                              {formatDistanceToNow(new Date(log.createdAt), {
                                addSuffix: true,
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Restrict User Dialog */}
      <AlertDialog
        open={dialogType === "restrict"}
        onOpenChange={() => setDialogType(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-red-600" />
              Restrict User
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to restrict <strong>{user.user.fullName}</strong>{" "}
              from using the library system. This action will prevent them from
              borrowing books or accessing most features.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <label
              htmlFor="restriction-reason"
              className="block text-sm font-medium mb-2"
            >
              Restriction Reason *
            </label>
            <Textarea
              id="restriction-reason"
              placeholder="Please provide a reason for restricting this user..."
              value={restrictionReason}
              onChange={(e) => setRestrictionReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestrict}
              disabled={isLoading || !restrictionReason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? "Restricting..." : "Restrict User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unrestrict User Dialog */}
      <AlertDialog
        open={dialogType === "unrestrict"}
        onOpenChange={() => setDialogType(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldOff className="w-5 h-5 text-green-600" />
              Unrestrict User
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to remove restrictions from{" "}
              <strong>{user.user.fullName}</strong>. They will regain full
              access to the library system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {user.user.restrictionReason && (
            <div className="py-4">
              <p className="text-sm font-medium mb-2">
                Current Restriction Reason:
              </p>
              <div className="bg-gray-50 p-3 rounded border">
                <p className="text-sm text-gray-700">
                  {user.user.restrictionReason}
                </p>
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnrestrict}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? "Unrestricting..." : "Unrestrict User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
