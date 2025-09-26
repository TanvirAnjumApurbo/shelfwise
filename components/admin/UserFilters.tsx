"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Filter, ChevronDown } from "lucide-react";

interface UserFiltersProps {
  search: string;
  status: string;
  role: string;
  isRestricted: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onRoleChange: (value: string) => void;
  onRestrictionChange: (value: string) => void;
  onClearFilters: () => void;
}

const FilterDropdown: React.FC<{
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  className?: string;
}> = ({ value, onChange, options, placeholder, className = "w-32" }) => {
  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={`${className} justify-between`}>
          {selectedOption?.label || placeholder}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const UserFilters: React.FC<UserFiltersProps> = ({
  search,
  status,
  role,
  isRestricted,
  onSearchChange,
  onStatusChange,
  onRoleChange,
  onRestrictionChange,
  onClearFilters,
}) => {
  const hasActiveFilters =
    search || status !== "ALL" || role !== "ALL" || isRestricted !== "ALL";

  const statusOptions = [
    { value: "ALL", label: "All Status" },
    { value: "PENDING", label: "Pending" },
    { value: "APPROVED", label: "Approved" },
    { value: "REJECTED", label: "Rejected" },
  ];

  const roleOptions = [
    { value: "ALL", label: "All Roles" },
    { value: "USER", label: "User" },
    { value: "ADMIN", label: "Admin" },
  ];

  const restrictionOptions = [
    { value: "ALL", label: "All Users" },
    { value: "false", label: "Active Only" },
    { value: "true", label: "Restricted Only" },
  ];

  return (
    <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
      <div className="flex flex-wrap gap-4 items-center flex-1">
        {/* Search Input */}
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by name, email, or university ID..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Status Filter */}
        <FilterDropdown
          value={status}
          onChange={onStatusChange}
          options={statusOptions}
          placeholder="Status"
          className="w-32"
        />

        {/* Role Filter */}
        <FilterDropdown
          value={role}
          onChange={onRoleChange}
          options={roleOptions}
          placeholder="Role"
          className="w-32"
        />

        {/* Restriction Filter */}
        <FilterDropdown
          value={isRestricted}
          onChange={onRestrictionChange}
          options={restrictionOptions}
          placeholder="Restriction"
          className="w-36"
        />

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Clear Filters
          </Button>
        )}
      </div>
    </div>
  );
};
