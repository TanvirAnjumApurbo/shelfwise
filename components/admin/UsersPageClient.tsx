"use client";

import React, { useState, useEffect } from "react";
import { UserStats } from "@/components/admin/UserStats";
import { UserFilters } from "@/components/admin/UserFilters";
import { UsersTable } from "@/components/admin/UsersTable";
import { Pagination } from "@/components/admin/Pagination";
import { getAllUsers, getUserStatistics } from "@/lib/admin/actions/user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface UsersPageClientProps {
  adminId: string;
  initialUsersData: any;
  initialStats: any;
}

export const UsersPageClient: React.FC<UsersPageClientProps> = ({
  adminId,
  initialUsersData,
  initialStats,
}) => {
  const [usersData, setUsersData] = useState(initialUsersData);
  const [stats, setStats] = useState(initialStats);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter states
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [role, setRole] = useState("ALL");
  const [isRestricted, setIsRestricted] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  const fetchUsers = async (page = 1, showLoading = true) => {
    if (showLoading) setIsLoading(true);

    try {
      const restrictedValue =
        isRestricted === "ALL" ? ("ALL" as const) : isRestricted === "true";

      const params = {
        page,
        limit: 20,
        search: search.trim(),
        status: status === "ALL" ? undefined : (status as any),
        role: role === "ALL" ? undefined : (role as any),
        isRestricted: restrictedValue,
      };

      const result = await getAllUsers(params);

      if (result.success) {
        setUsersData(result.data);
        setCurrentPage(page);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch users",
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
      if (showLoading) setIsLoading(false);
    }
  };

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      // Fetch both users and stats
      const restrictedValue =
        isRestricted === "ALL" ? ("ALL" as const) : isRestricted === "true";

      const [usersResult, statsResult] = await Promise.all([
        getAllUsers({
          page: currentPage,
          limit: 20,
          search: search.trim(),
          status: status === "ALL" ? undefined : (status as any),
          role: role === "ALL" ? undefined : (role as any),
          isRestricted: restrictedValue,
        }),
        getUserStatistics(),
      ]);

      if (usersResult.success) {
        setUsersData(usersResult.data);
      }

      if (statsResult.success) {
        setStats(statsResult.data);
      }

      toast({
        title: "Success",
        description: "Data refreshed successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh data",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchUsers(1);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [search, status, role, isRestricted]);

  const handlePageChange = (page: number) => {
    fetchUsers(page);
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("ALL");
    setRole("ALL");
    setIsRestricted("ALL");
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">All Users</h2>
          <p className="text-gray-600">
            Manage all users, their status, and restrictions
          </p>
        </div>
        <Button
          onClick={refreshData}
          disabled={isRefreshing}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw
            className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {/* Statistics Cards */}
      <UserStats stats={stats} />

      {/* Users Table Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Users ({usersData.pagination.totalCount})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <UserFilters
            search={search}
            status={status}
            role={role}
            isRestricted={isRestricted}
            onSearchChange={setSearch}
            onStatusChange={setStatus}
            onRoleChange={setRole}
            onRestrictionChange={setIsRestricted}
            onClearFilters={clearFilters}
          />

          {/* Loading State */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              {/* Users Table */}
              <UsersTable users={usersData.users} adminId={adminId} />

              {/* Pagination */}
              <Pagination
                currentPage={usersData.pagination.currentPage}
                totalPages={usersData.pagination.totalPages}
                totalCount={usersData.pagination.totalCount}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
