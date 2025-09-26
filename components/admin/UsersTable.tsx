"use client";

import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Calendar,
  Shield,
  ShieldOff,
  CreditCard,
  IdCard,
  MoreVertical,
  Eye,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";

interface UserData {
  id: string;
  fullName: string;
  email: string;
  universityId: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  role: "USER" | "ADMIN";
  totalFinesOwed: string;
  isRestricted: boolean;
  restrictionReason: string | null;
  restrictedAt: string | null;
  lastActivityDate: string | null;
  createdAt: string | null;
}

interface UsersTableProps {
  users: UserData[];
  adminId: string;
}

export const UsersTable: React.FC<UsersTableProps> = ({ users, adminId }) => {
  const router = useRouter();
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [dialogType, setDialogType] = useState<
    "restrict" | "unrestrict" | null
  >(null);
  const [restrictionReason, setRestrictionReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRestrict = async () => {
    if (!selectedUser || !restrictionReason.trim()) {
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
        userId: selectedUser.id,
        adminId,
        restrictionReason: restrictionReason.trim(),
      });

      if (result.success) {
        toast({
          title: "Success",
          description: result.message,
        });
        setDialogType(null);
        setSelectedUser(null);
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
    if (!selectedUser) return;

    setIsLoading(true);
    try {
      const result = await unrestrictUser({
        userId: selectedUser.id,
        adminId,
      });

      if (result.success) {
        toast({
          title: "Success",
          description: result.message,
        });
        setDialogType(null);
        setSelectedUser(null);
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

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User Information</TableHead>
              <TableHead>University ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Fines Owed</TableHead>
              <TableHead>Restriction Status</TableHead>
              <TableHead>Last Activity</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <User className="w-8 h-8 text-gray-400" />
                    <p className="text-gray-500">No users found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">{user.fullName}</p>
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Mail className="w-3 h-3" />
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <IdCard className="w-4 h-4 text-gray-400" />
                      {user.universityId}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(user.status)}</TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <CreditCard className="w-4 h-4 text-gray-400" />
                      <span
                        className={
                          parseFloat(user.totalFinesOwed || "0") > 0
                            ? "text-red-600 font-medium"
                            : ""
                        }
                      >
                        {formatCurrency(user.totalFinesOwed)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.isRestricted ? (
                      <div className="flex flex-col gap-1">
                        <Badge variant="destructive" className="w-fit">
                          <Shield className="w-3 h-3 mr-1" />
                          Restricted
                        </Badge>
                        {user.restrictionReason && (
                          <p
                            className="text-xs text-gray-500 max-w-32 truncate"
                            title={user.restrictionReason}
                          >
                            {user.restrictionReason}
                          </p>
                        )}
                      </div>
                    ) : (
                      <Badge variant="outline" className="w-fit">
                        <ShieldOff className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.lastActivityDate ? (
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Calendar className="w-3 h-3" />
                        {format(
                          new Date(user.lastActivityDate),
                          "MMM dd, yyyy"
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">Never</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.createdAt && (
                      <div className="text-sm text-gray-500">
                        {formatDistanceToNow(new Date(user.createdAt), {
                          addSuffix: true,
                        })}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            router.push(`/admin/users/${user.id}`);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        {user.role !== "ADMIN" && (
                          <>
                            {user.isRestricted ? (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUser(user);
                                  setDialogType("unrestrict");
                                }}
                                className="text-green-600"
                              >
                                <ShieldOff className="w-4 h-4 mr-2" />
                                Unrestrict User
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUser(user);
                                  setDialogType("restrict");
                                }}
                                className="text-red-600"
                              >
                                <Shield className="w-4 h-4 mr-2" />
                                Restrict User
                              </DropdownMenuItem>
                            )}
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
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
              You are about to restrict{" "}
              <strong>{selectedUser?.fullName}</strong> from using the library
              system. This action will prevent them from borrowing books or
              accessing most features.
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
              <strong>{selectedUser?.fullName}</strong>. They will regain full
              access to the library system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {selectedUser?.restrictionReason && (
            <div className="py-4">
              <p className="text-sm font-medium mb-2">
                Current Restriction Reason:
              </p>
              <div className="bg-gray-50 p-3 rounded border">
                <p className="text-sm text-gray-700">
                  {selectedUser.restrictionReason}
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
