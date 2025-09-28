# Routing and Navigation

<cite>
**Referenced Files in This Document**  
- [layout.tsx](file://app/(auth)/layout.tsx) - *Updated in commit 9f66a96*
- [layout.tsx](file://app/(root)/layout.tsx) - *Updated in commit 9f66a96*
- [layout.tsx](file://app/layout.tsx) - *Modified in recent changes*
- [Header.tsx](file://components/Header.tsx) - *Updated in commit 9f66a96*
- [page.tsx](file://app/(auth)/sign-in/page.tsx)
- [page.tsx](file://app/(root)/page.tsx)
- [admin/layout.tsx](file://app/admin/layout.tsx) - *Added in commit ee597f7*
- [admin/Header.tsx](file://components/admin/Header.tsx) - *Added in commit 9f66a96*
- [admin/UserProfile.tsx](file://components/admin/UserProfile.tsx) - *Added in commit 9f66a96*
- [admin/books/page.tsx](file://app/admin/books/page.tsx) - *Added in commit ee597f7*
- [admin/books/[id]/edit/page.tsx](file://app/admin/books/[id]/edit/page.tsx) - *Added in commit ee597f7*
- [constants/index.ts](file://constants/index.ts) - *Contains admin sidebar links*
</cite>

## Update Summary
**Changes Made**  
- Updated documentation to reflect new admin navigation features including user profile dropdown and logout functionality
- Added new section on Admin Layout and Navigation to document the admin-specific routing and UI components
- Updated URL routing table to include new admin routes for books management
- Enhanced Header component documentation with details about user profile integration
- Added diagram showing admin interface structure
- Updated section sources to reflect new and modified files

## Table of Contents
1. [Introduction](#introduction)  
2. [Project Structure and Route Groups](#project-structure-and-route-groups)  
3. [Layout System and Shared UI](#layout-system-and-shared-ui)  
4. [RootLayout and AuthLayout Implementation](#rootlayout-and-authlayout-implementation)  
5. [Header Component and Active Route Highlighting](#header-component-and-active-route-highlighting)  
6. [Admin Layout and Navigation](#admin-layout-and-navigation)  
7. [URL Routing and File Structure Mapping](#url-routing-and-file-structure-mapping)  
8. [Best Practices for Adding New Routes](#best-practices-for-adding-new-routes)  

## Introduction
This document provides a comprehensive overview of the routing and navigation system in the **university_lms** application, built using the Next.js App Router. It explains how route groups organize authentication and main application routes, how layout components provide shared UI elements, and how navigation is implemented with dynamic route highlighting. The goal is to offer both technical depth and accessibility for developers at all levels.

## Project Structure and Route Groups
The application uses the Next.js App Router with **route groups** to logically separate different sections of the app. Route groups are denoted by parentheses in directory names and do not affect the URL structure.

Three primary route groups are used:
- `(auth)` – Contains authentication-related routes such as sign-in and sign-up.
- `(root)` – Contains the main application routes accessible after authentication.
- `admin` – Contains administrative routes for managing books, users, and requests.

This grouping allows for distinct layout structures and shared components without polluting the URL namespace.

``mermaid
graph TD
A[App Directory] --> B[(auth) Group]
A --> C[(root) Group]
A --> D[Admin Group]
A --> E[Root Layout]
B --> F[sign-in/page.tsx]
B --> G[sign-up/page.tsx]
B --> H[layout.tsx - AuthLayout]
C --> I[page.tsx - Home]
C --> J[books/page.tsx]
C --> K[my-books/page.tsx]
C --> L[layout.tsx - RootLayout]
D --> M[books/page.tsx]
D --> N[books/[id]/edit/page.tsx]
D --> O[book-requests/page.tsx]
D --> P[layout.tsx - AdminLayout]
E --> Q[layout.tsx - RootLayout]
```

**Diagram sources**  
- [app/(auth)/layout.tsx](file://app/(auth)/layout.tsx#L1-L34)  
- [app/(root)/layout.tsx](file://app/(root)/layout.tsx#L1-L17)  
- [app/admin/layout.tsx](file://app/admin/layout.tsx#L1-L38)  
- [app/layout.tsx](file://app/layout.tsx#L1-L47)  

**Section sources**  
- [app/(auth)/layout.tsx](file://app/(auth)/layout.tsx#L1-L34)  
- [app/(root)/layout.tsx](file://app/(root)/layout.tsx#L1-L17)  
- [app/admin/layout.tsx](file://app/admin/layout.tsx#L1-L38)  

## Layout System and Shared UI
Next.js App Router uses `layout.tsx` files to define shared UI that persists across multiple pages within a route segment. These layouts are rendered outside the page content and support nested structures.

The university_lms application implements a three-tier layout system:
1. **Root Layout** (`app/layout.tsx`) – Wraps the entire app with HTML, fonts, and global styles.
2. **Route Group Layouts** – Provide distinct UI for `(auth)`, `(root)`, and `admin` sections.
3. **Page Content** – Unique content for each route.

This structure ensures consistent theming, typography, and structural layout while allowing flexibility for different app sections.

## RootLayout and AuthLayout Implementation

### AuthLayout (`app/(auth)/layout.tsx`)
The `AuthLayout` is used for authentication pages and features a split-screen design:
- Left side: Authentication form with logo and input fields.
- Right side: Decorative illustration.

It does not include the main navigation header, as users are expected to be unauthenticated.

```tsx
<main className="auth-container">
  <section className="auth-form">
    <div className="auth-box">
      <div className="flex flex-row gap-3">
        <Image src="/icons/logo.svg" alt="logo" width={37} height={37} />
        <h1 className="text-2xl font-semibold text-white">ShelfWise</h1>
      </div>
      <div>{children}</div>
    </div>
  </section>
  <section className="auth-illustration">
    <Image src="/images/auth-illustration.png" alt="auth illustration" height={1000} width={1000} className="size-full object-cover" />
  </section>
</main>
```

**Section sources**  
- [app/(auth)/layout.tsx](file://app/(auth)/layout.tsx#L1-L34)  

### RootLayout (`app/(root)/layout.tsx`)
The `RootLayout` wraps all authenticated routes and includes:
- A container with maximum width (`max-w-7xl`).
- The `Header` component for navigation.
- A margin-top spacer (`mt-20`) for content below the header.

```tsx
<main className="root-container">
  <div className="mx-auto max-w-7xl">
    <Header />
    <div className="mt-20 pb-20">{children}</div>
  </div>
</main>
```

This layout ensures consistent spacing and navigation across all authenticated pages.

**Section sources**  
- [app/(root)/layout.tsx](file://app/(root)/layout.tsx#L1-L17)  

### Root HTML Layout (`app/layout.tsx`)
This is the top-level layout that defines the HTML document structure, including:
- Language attribute (`lang="en"`).
- Custom fonts (IBM Plex Sans and Bebas Neue).
- Global CSS.
- Metadata (title and description).

It serves as the foundation for all pages, regardless of route group.

**Section sources**  
- [app/layout.tsx](file://app/layout.tsx#L1-L47)  

## Header Component and Active Route Highlighting
The `Header` component (`components/Header.tsx`) provides the main navigation menu and uses the `usePathname()` hook from `next/navigation` to determine the active route.

### Key Features:
- **Logo Link**: Clickable logo that navigates to the home page (`/`).
- **Navigation Links**: Two primary links: "All Books" and "Borrowed Books".
- **User Profile Integration**: Displays user avatar with dropdown menu for account actions.
- **Active Route Highlighting**: Uses conditional CSS classes based on the current pathname.

```tsx
const session = await auth();

<Link
  href="/books"
  className="text-white/80 hover:text-white transition-colors duration-200 font-medium hover:border-b-2 hover:border-purple-500 pb-1"
>
  All Books
</Link>
```

The header conditionally renders navigation links only when a user session exists. The active state is indicated by a purple bottom border on hover, providing visual feedback to users.

**Section sources**  
- [components/Header.tsx](file://components/Header.tsx#L1-L51)  

## Admin Layout and Navigation
The admin section has a dedicated layout and navigation system for administrative users.

### AdminLayout (`app/admin/layout.tsx`)
The `AdminLayout` provides a sidebar-based interface for administrative functions:
- **Sidebar Navigation**: Contains links to admin sections (books, book requests, return requests).
- **Header Component**: Displays welcome message and user profile.
- **Role Verification**: Checks if the user has ADMIN role before granting access.

```tsx
<main className="flex min-h-screen w-full flex-row">
  <Sidebar session={session} />
  <div className="admin-container">
    <Header session={session} />
    {children}
  </div>
</main>
```

The layout includes server-side authentication and role verification to ensure only authorized users can access admin functionality.

**Section sources**  
- [app/admin/layout.tsx](file://app/admin/layout.tsx#L1-L38)  

### Admin Header and User Profile
The admin header (`components/admin/Header.tsx`) displays:
- Welcome message with user's name
- User profile avatar with dropdown menu
- Logout confirmation dialog

The `AdminUserProfile` component implements:
- Dropdown menu with "Manage account" and "Sign out" options
- Confirmation dialog for logout action
- Visual distinction from regular user profile (blue color scheme)

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <button aria-label="Admin user menu">
      <Avatar className="h-10 w-10 cursor-pointer hover:opacity-80 transition-opacity">
        <AvatarFallback className="bg-blue-600 text-white font-semibold">
          {getInitials(user.name)}
        </AvatarFallback>
      </Avatar>
    </button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" className="w-64 bg-white border-gray-200 shadow-lg">
    <DropdownMenuItem onClick={() => setShowLogoutDialog(true)}>
      <LogOut className="h-4 w-4" />
      Sign out
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

**Section sources**  
- [components/admin/Header.tsx](file://components/admin/Header.tsx#L1-L28)  
- [components/admin/UserProfile.tsx](file://components/admin/UserProfile.tsx#L1-L130)  
- [constants/index.ts](file://constants/index.ts) - *Contains adminSideBarLinks*  

## URL Routing and File Structure Mapping
Next.js automatically maps the file structure inside the `app` directory to URL routes. Route groups in parentheses do not appear in the URL.

### Practical Examples:
| File Path | URL Route | Description |
|---------|----------|-------------|
| `app/(auth)/sign-in/page.tsx` | `/sign-in` | Sign-in page with AuthLayout |
| `app/(auth)/sign-up/page.tsx` | `/sign-up` | Sign-up page with AuthLayout |
| `app/(root)/page.tsx` | `/` | Home page with RootLayout and Header |
| `app/(root)/books/page.tsx` | `/books` | Books catalog with navigation highlight |
| `app/(root)/my-books/page.tsx` | `/my-books` | User's borrowed books list |
| `app/admin/page.tsx` | `/admin` | Admin dashboard with role verification |
| `app/admin/books/page.tsx` | `/admin/books` | Admin books management table |
| `app/admin/books/[id]/edit/page.tsx` | `/admin/books/[id]/edit` | Book editing form with pre-filled data |

This mapping allows developers to organize files logically while maintaining clean URLs.

**Section sources**  
- [app/(auth)/sign-in/page.tsx](file://app/(auth)/sign-in/page.tsx#L1-L21)  
- [app/(root)/page.tsx](file://app/(root)/page.tsx#L1-L16)  
- [app/admin/books/page.tsx](file://app/admin/books/page.tsx#L1-L34)  
- [app/admin/books/[id]/edit/page.tsx](file://app/admin/books/[id]/edit/page.tsx#L1-L38)  

## Best Practices for Adding New Routes
To maintain consistency and scalability when adding new routes:

1. **Choose the Correct Route Group**:
   - Use `(auth)` for login, registration, or password reset.
   - Use `(root)` for authenticated user features.
   - Use `admin` for administrative functionality requiring role verification.

2. **Leverage Existing Layouts**:
   - New pages in `(root)` will automatically inherit the `Header` and spacing.
   - New pages in `(auth)` will use the split-screen authentication layout.
   - New pages in `admin` will inherit the sidebar and admin header.

3. **Update Navigation**:
   - Add new links to the appropriate `Header` component based on user role.
   - Update `adminSideBarLinks` in `constants/index.ts` for admin navigation.
   - Use `usePathname()` to ensure active state highlighting.

4. **Follow Naming Conventions**:
   - Use lowercase, hyphenated route names (e.g., `course-materials`).
   - Place nested routes in subdirectories (e.g., `books/[id]/edit/page.tsx`).
   - Use descriptive names that reflect the page's purpose.

5. **Implement Proper Authentication**:
   - For admin routes, include role verification in the layout.
   - Redirect unauthorized users to appropriate pages.
   - Use server-side authentication checks when possible.

6. **Test Layout Inheritance**:
   - Verify that new pages render with the correct layout and shared UI.
   - Test navigation highlighting for active routes.
   - Ensure responsive behavior across different screen sizes.

By following these practices, the application maintains a consistent user experience and scalable architecture.

**Section sources**  
- [components/Header.tsx](file://components/Header.tsx#L1-L51)  
- [app/(root)/layout.tsx](file://app/(root)/layout.tsx#L1-L17)  
- [app/admin/layout.tsx](file://app/admin/layout.tsx#L1-L38)  
- [constants/index.ts](file://constants/index.ts)