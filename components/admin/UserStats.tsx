"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Shield,
  ShieldAlert,
  Crown,
  CreditCard,
} from "lucide-react";

interface UserStatsProps {
  stats: {
    totalUsers: number;
    pendingUsers: number;
    approvedUsers: number;
    rejectedUsers: number;
    restrictedUsers: number;
    adminUsers: number;
    regularUsers: number;
    usersWithFines: number;
  };
}

export const UserStats: React.FC<UserStatsProps> = ({ stats }) => {
  const statCards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Approved Users",
      value: stats.approvedUsers,
      icon: UserCheck,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Pending Approval",
      value: stats.pendingUsers,
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
    },
    {
      title: "Rejected Users",
      value: stats.rejectedUsers,
      icon: UserX,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      title: "Restricted Users",
      value: stats.restrictedUsers,
      icon: ShieldAlert,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "Admin Users",
      value: stats.adminUsers,
      icon: Crown,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Regular Users",
      value: stats.regularUsers,
      icon: Shield,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
    {
      title: "Users with Fines",
      value: stats.usersWithFines,
      icon: CreditCard,
      color: "text-pink-600",
      bgColor: "bg-pink-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="border-l-4 border-l-gray-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-full ${stat.bgColor}`}>
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stat.value.toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {stat.title === "Total Users" && "All registered users"}
                {stat.title === "Approved Users" && "Active library members"}
                {stat.title === "Pending Approval" && "Awaiting verification"}
                {stat.title === "Rejected Users" && "Account requests denied"}
                {stat.title === "Restricted Users" && "Limited access"}
                {stat.title === "Admin Users" && "System administrators"}
                {stat.title === "Regular Users" && "Standard members"}
                {stat.title === "Users with Fines" && "Outstanding payments"}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
