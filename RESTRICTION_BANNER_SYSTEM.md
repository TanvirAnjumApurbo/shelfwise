# User Account Restriction System

## Overview

The ShelfWise library management system includes a comprehensive user account restriction system that prevents restricted users from borrowing books while clearly communicating their account status.

## Features

### 🔴 Visual Restriction Banner

When a user account is restricted, a prominent red banner appears below the navigation bar with:

- **Blinking animation** to draw attention
- **Clear restriction message** explaining the account status
- **Specific reason** for the restriction (e.g., outstanding fines, violations)
- **Contact information** for resolution:
  - Email: library@university.edu
  - Phone: (555) 123-4567
  - In-person: Library Front Desk

### 📱 Responsive Design

- Works on all device sizes (mobile, tablet, desktop)
- Dismissible in demo mode for testing purposes
- Smooth opacity transitions for the blinking effect

### 🛡️ Database Integration

The system uses the following database fields in the `users` table:

- `isRestricted` (boolean): Whether the user is currently restricted
- `restrictionReason` (text): Specific reason for the restriction
- `restrictedAt` (timestamp): When the restriction was applied
- `restrictedBy` (uuid): ID of the admin who applied the restriction

## Admin Management

### Restricting a User

Admins can restrict users through the admin panel with:

```typescript
restrictUser({
  userId: "user-uuid",
  adminId: "admin-uuid",
  restrictionReason: "Outstanding fines of $25.00",
});
```

### Unrestricting a User

Admins can remove restrictions with:

```typescript
unrestrictUser({
  userId: "user-uuid",
  adminId: "admin-uuid",
});
```

### Audit Trail

All restriction/unrestriction actions are logged in the audit system for accountability.

## Implementation Details

### Components

- `RestrictionBanner.tsx`: Main banner component with blinking animation
- Integrated into the root layout (`app/(root)/layout.tsx`)
- Fetches user restriction status from the database on each page load

### Admin Actions

- Located in `lib/admin/actions/user.ts`
- Includes `restrictUser()` and `unrestrictUser()` functions
- Full validation and error handling
- Audit logging for all actions

### Demo Mode

Visit `/demo/restriction` to see the restriction banner in action without needing to restrict an actual user account.

## Example Use Cases

1. **Outstanding Fines**: Users with unpaid library fines
2. **Policy Violations**: Users who have violated library policies
3. **Damaged Books**: Users responsible for damaged or lost books
4. **Pending Requirements**: Users who need to complete registration requirements

## Testing

1. **Demo Page**: Visit `/demo/restriction` to see the banner
2. **Admin Restriction**: Use the admin panel to restrict/unrestrict test users
3. **Live Testing**: Sign in as a restricted user to see the real banner

## Contact Information Display

The banner shows multiple contact methods to help users resolve their restrictions:

- 📧 **Email**: Direct link to library support
- 📞 **Phone**: Immediate assistance hotline
- 🏢 **In-Person**: Library front desk for immediate resolution

This ensures users have clear pathways to resolve their account restrictions and resume library services.
