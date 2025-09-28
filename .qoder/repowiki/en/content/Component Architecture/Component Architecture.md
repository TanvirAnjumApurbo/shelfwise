# Component Architecture

<cite>
**Referenced Files in This Document**   
- [BookOverview.tsx](file://components/BookOverview.tsx#L1-L73)
- [BookList.tsx](file://components/BookList.tsx#L1-L24)
- [BookCard.tsx](file://components/BookCard.tsx#L1-L48)
- [BookCover.tsx](file://components/BookCover.tsx#L1-L52)
- [AuthForm.tsx](file://components/AuthForm.tsx#L1-L94)
- [Header.tsx](file://components/Header.tsx#L1-L36)
- [types.d.ts](file://types.d.ts#L1-L41)
- [page.tsx](file://app/(root)/page.tsx#L1-L15)
- [sign-in/page.tsx](file://app/(auth)/sign-in/page.tsx)
- [sign-up/page.tsx](file://app/(auth)/sign-up/page.tsx)
- [admin/Header.tsx](file://components/admin/Header.tsx) - *Updated in commit 9f66a96f23eb6fe57f7f868b28cf224b6ef1dd95*
- [admin/UserProfile.tsx](file://components/admin/UserProfile.tsx) - *Added in commit 9f66a96f23eb6fe57f7f868b28cf224b6ef1dd95*
- [admin/BooksTable.tsx](file://components/admin/BooksTable.tsx) - *Added in commit ee597f70db024d60c7473e9b70d0e4a7c795e55e*
- [app/admin/books/page.tsx](file://app/admin/books/page.tsx) - *Updated in commit ee597f70db024d60c7473e9b70d0e4a7c795e55e*
</cite>

## Update Summary
- Added new section on **Admin Interface Components** to document the recently added `AdminUserProfile` and `BooksTable` components
- Updated **Component Hierarchy and Composition Patterns** section to include admin-specific components
- Added new section on **Admin Header and Navigation** to document the admin-specific header implementation
- Updated **Best Practices for Component Creation and Extension** with new patterns observed in admin components
- Added references to new and updated files from recent commits

## Table of Contents
1. [Component Hierarchy and Composition Patterns](#component-hierarchy-and-composition-patterns)
2. [Container-Presentational Pattern](#container-presentational-pattern)
3. [Reusable AuthForm Component](#reusable-authform-component)
4. [Header Navigation and Active Route Detection](#header-navigation-and-active-route-detection)
5. [Admin Interface Components](#admin-interface-components)
6. [Admin Header and Navigation](#admin-header-and-navigation)
7. [Best Practices for Component Creation and Extension](#best-practices-for-component-creation-and-extension)

## Component Hierarchy and Composition Patterns

The university_lms application employs a clear component hierarchy that promotes reusability, maintainability, and scalability. The architecture follows a compositional design where high-level components are built by combining lower-level, more specialized components.

At the top of the hierarchy is the **BookOverview** component, which serves as a detailed view for a single book. This component composes several lower-level components including **BookCover** for visual representation and standard UI elements like **Button** for user interaction. The **BookOverview** renders comprehensive book information such as title, author, genre, rating, availability, and description, while also displaying an interactive book cover visualization.

``mermaid
graph TD
BookOverview --> BookCover
BookOverview --> Button
BookOverview --> Image
BookList --> BookCard
BookCard --> BookCover
BookCard --> Link
BookCard --> Button
BookCard --> Image
BookCover --> BookCoverSvg
BookCover --> Image
AdminHeader --> AdminUserProfile
AdminUserProfile --> Avatar
AdminUserProfile --> DropdownMenu
BooksTable --> Button
BooksTable --> Input
BooksTable --> AlertDialog
BooksTable --> DropdownMenu
```

**Diagram sources**
- [BookOverview.tsx](file://components/BookOverview.tsx#L1-L73)
- [BookList.tsx](file://components/BookList.tsx#L1-L24)
- [BookCard.tsx](file://components/BookCard.tsx#L1-L48)
- [BookCover.tsx](file://components/BookCover.tsx#L1-L52)
- [admin/Header.tsx](file://components/admin/Header.tsx)
- [admin/UserProfile.tsx](file://components/admin/UserProfile.tsx)
- [admin/BooksTable.tsx](file://components/admin/BooksTable.tsx)

The **BookList** component represents an intermediate level in the hierarchy, responsible for displaying a collection of books. It accepts a list of book objects and maps over them to render multiple **BookCard** components. This pattern enables consistent presentation of book collections throughout the application.

The **BookCard** component is a foundational building block that displays a compact representation of a book, including its cover, title, and genre. It can be configured with the `isLoanedBook` prop to display additional information such as return deadlines and receipt download options for books currently on loan.

All these components rely on the **BookCover** component, which abstracts the visual representation of a book cover into a reusable element. The **BookCover** component supports different size variants through the `variant` prop and accepts customization via `coverColor` and `coverImage` props, making it flexible for use in different contexts.

**Section sources**
- [BookOverview.tsx](file://components/BookOverview.tsx#L1-L73)
- [BookList.tsx](file://components/BookList.tsx#L1-L24)
- [BookCard.tsx](file://components/BookCard.tsx#L1-L48)
- [BookCover.tsx](file://components/BookCover.tsx#L1-L52)

## Container-Presentational Pattern

The application implements the container-presentational pattern to separate data handling logic from UI rendering concerns. This architectural pattern enhances component reusability and testability by clearly defining responsibilities.

The **BookOverview** and **BookList** components exemplify presentational components that focus solely on rendering UI based on the props they receive. These components are unaware of data fetching mechanisms or state management, making them pure functions of their input props.

``mermaid
classDiagram
class BookOverview {
+title : string
+author : string
+genre : string
+rating : number
+total_copies : number
+available_copies : number
+description : string
+color : string
+cover : string
+id : number
}
class BookList {
+title : string
+books : Book[]
+containerClassName? : string
}
class BookCard {
+id : number
+title : string
+genre : string
+color : string
+cover : string
+isLoanedBook : boolean
}
class Book {
+id : string
+title : string
+author : string
+genre : string
+rating : number
+totalCopies : number
+availableCopies : number
+description : string
+coverColor : string
+coverUrl : string
+videoUrl : string | null
+youtubeUrl : string | null
+summary : string
+publisher : string | null
+publicationDate : Date | null
+edition : string | null
+language : string | null
+printLength : number | null
+bookType : string | null
+isbn : string | null
+itemWeight : number | null
+dimensions : string | null
+aboutAuthor : string | null
+price : number | null
+createdAt : Date | null
}
BookOverview --> Book : "receives props"
BookList --> Book : "contains multiple"
BookCard --> Book : "represents single"
```

**Diagram sources**
- [BookOverview.tsx](file://components/BookOverview.tsx#L1-L73)
- [BookList.tsx](file://components/BookList.tsx#L1-L24)
- [BookCard.tsx](file://components/BookCard.tsx#L1-L48)
- [types.d.ts](file://types.d.ts#L1-L27)

The root page at `app/(root)/page.tsx` serves as a container component that orchestrates the composition of presentational components. It imports sample data from the constants directory and passes it down to **BookOverview** and **BookList** components:

```tsx
const Home = () => (
  <>
    <BookOverview {...sampleBooks[0]} />
    <BookList
      title="Latest Books"
      books={sampleBooks}
      containerClassName="mt-28"
    />
  </>
);
```

This separation allows the presentational components to remain agnostic of data sources, making them reusable in different contexts with different data providers. The **Book** interface defined in `types.d.ts` ensures type safety across the component hierarchy, guaranteeing that all components receive the expected data structure.

**Section sources**
- [page.tsx](file://app/(root)/page.tsx#L1-L15)
- [types.d.ts](file://types.d.ts#L1-L27)

## Reusable AuthForm Component

The **AuthForm** component demonstrates a sophisticated approach to component reusability by serving both sign-in and sign-up flows through prop configuration. This component leverages React's generic types and the react-hook-form library to create a flexible authentication form that adapts its behavior based on the provided props.

``mermaid
sequenceDiagram
participant Page as "Sign-in/Sign-up Page"
participant AuthForm as "AuthForm Component"
participant Form as "react-hook-form"
participant Validation as "Zod Resolver"
Page->>AuthForm : Pass schema, defaultValues, onSubmit, type
AuthForm->>Form : Initialize useForm with schema and defaults
Form->>Validation : Validate input against Zod schema
Validation-->>Form : Validation results
Form->>AuthForm : Form state and handlers
AuthForm->>Page : Render form with dynamic content based on type
User->>AuthForm : Fill and submit form
AuthForm->>Form : Handle submission
Form->>Page : Call onSubmit callback with form data
```

**Diagram sources**
- [AuthForm.tsx](file://components/AuthForm.tsx#L1-L94)

The component accepts four key props:
- **schema**: A Zod validation schema that defines the form field requirements
- **defaultValues**: Initial values for the form fields
- **onSubmit**: A callback function to handle form submission
- **type**: An enum ("SIGN_IN" | "SIGN_UP") that determines the form's appearance and behavior

Based on the `type` prop, the component dynamically renders different headings, descriptions, and navigation links:

```tsx
<h1 className="text-2xl font-semibold text-white">
  {isSignIn ? "Welcome back to ShelfWise" : "Create your library account"}
</h1>
<p className="text-light-100">
  {isSignIn
    ? "Access the vast collection of resources, and stay updated"
    : "Please complete all fields and upload a valid university ID to gain access to the library"}
</p>
```

The form structure itself is defined using the react-hook-form and ShadCN UI components, creating a consistent user experience across both authentication flows. The component currently includes a username field with placeholder text, though additional fields would likely be added in a complete implementation.

The navigation link at the bottom of the form also adapts based on the `type` prop, guiding users to the complementary authentication flow:

```tsx
<p className="text-center text-base font-medium">
  {isSignIn ? "New to BookWise? " : "Already have an account? "}

  <Link
    href={isSignIn ? "/sign-up" : "/sign-in"}
    className="font-bold text-primary"
  >
    {isSignIn ? "Create an account" : "Sign in"}
  </Link>
</p>
```

This approach eliminates code duplication between sign-in and sign-up pages while maintaining flexibility to customize each flow as needed.

**Section sources**
- [AuthForm.tsx](file://components/AuthForm.tsx#L1-L94)

## Header Navigation and Active Route Detection

The **Header** component implements navigation functionality with active route detection using Next.js's `usePathname()` hook. This component provides a consistent navigation experience across the application while visually indicating the user's current location.

``mermaid
flowchart TD
A["Header Component Mounts"] --> B["usePathname() returns current route"]
B --> C{"Current route == '/library'?"}
C --> |Yes| D["Apply active state styling to Library link"]
C --> |No| E["Apply inactive state styling to Library link"]
D --> F["Render Header with active Library link"]
E --> F
```

**Diagram sources**
- [Header.tsx](file://components/Header.tsx#L1-L36)

The component uses the `usePathname()` hook from `next/navigation` to obtain the current URL path, which it then compares to determine the active state of navigation links:

```tsx
const Header = async () => {
  const session = await auth();
  const pathname = usePathname();
  return (
    <header className="my-10 flex justify-between gap-5">
      <Link href="/">
        <Image src="/icons/logo.svg" alt="logo" width={40} height={40} />
      </Link>

      <ul className="flex flex-row items-center gap-8">
        {session?.user && (
          <>
            <li>
              <nav className="flex items-center gap-6">
                <Link
                  href="/books"
                  className="text-white/80 hover:text-white transition-colors duration-200 font-medium hover:border-b-2 hover:border-purple-500 pb-1"
                >
                  All Books
                </Link>
                <Link
                  href="/my-books"
                  className="text-white/80 hover:text-white transition-colors duration-200 font-medium hover:border-b-2 hover:border-purple-500 pb-1"
                >
                  Borrowed Books
                </Link>
              </nav>
            </li>
            <li>
              <UserProfile
                user={{
                  id: session.user.id!,
                  name: session.user.name!,
                  email: session.user.email!,
                }}
              />
            </li>
          </>
        )}
      </ul>
    </header>
  );
};
```

The `cn()` utility function from `@/lib/utils` is used to conditionally apply CSS classes based on the route comparison. When the current pathname matches "/library", the link receives the "text-light-200" class for active state styling; otherwise, it uses "text-light-100" for inactive state styling.

Currently, the header includes navigation elements for the logo, All Books, Borrowed Books, and user profile. The component is designed to be extensible, with the list structure allowing for additional navigation items to be added as the application grows.

The use of client-side navigation through Next.js's `Link` component ensures smooth transitions between pages without full page reloads, enhancing the user experience. The header's styling uses Tailwind CSS classes for responsive design, with appropriate spacing and alignment properties.

**Section sources**
- [Header.tsx](file://components/Header.tsx#L1-L36)

## Admin Interface Components

The admin interface introduces several new components that extend the application's architecture with specialized functionality for administrative tasks. These components follow the same design principles as the main application but are tailored for management workflows.

The **BooksTable** component is a comprehensive data display component that allows administrators to view, filter, sort, and manage all books in the system. It accepts a list of book objects and renders them in a tabular format with extensive filtering capabilities:

``mermaid
classDiagram
class BooksTable {
+books : Book[]
+searchTerm : string
+selectedGenre : string
+selectedBookType : string
+selectedAvailability : string
+selectedLanguage : string
+ratingFilter : string
+sortBy : string
+sortOrder : "asc" | "desc"
+currentPage : number
}
class Book {
+id : string
+title : string
+author : string
+genre : string
+rating : number
+totalCopies : number
+availableCopies : number
+description : string
+coverColor : string
+coverUrl : string
+publisher : string | null
+publicationDate : Date | null
+edition : string | null
+language : string | null
+printLength : number | null
+bookType : string | null
+isbn : string | null
+itemWeight : number | null
+dimensions : string | null
+aboutAuthor : string | null
+price : number | null
+createdAt : Date | null
}
BooksTable --> Book : "displays multiple"
BooksTable --> Button : "edit/delete actions"
BooksTable --> Input : "search functionality"
BooksTable --> DropdownMenu : "filter options"
BooksTable --> AlertDialog : "delete confirmation"
```

**Diagram sources**
- [admin/BooksTable.tsx](file://components/admin/BooksTable.tsx)
- [types.d.ts](file://types.d.ts#L1-L27)

The component implements a sophisticated filtering system with dropdown menus for genre, book type, availability, language, and rating. It also supports sorting by various fields including title, author, rating, available copies, and creation date. The table includes pagination with a maximum of 10 books per page.

Each row in the table provides edit and delete actions. The delete functionality includes a safety confirmation dialog that requires the administrator to type "DELETE [book title]" to confirm the deletion, preventing accidental data loss.

The **AdminUserProfile** component provides authentication management for administrators, including a logout confirmation dialog:

```tsx
const AdminUserProfile = ({ user }: AdminUserProfileProps) => {
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/sign-in" });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-full" aria-label="Admin user menu">
            <Avatar className="h-10 w-10 cursor-pointer hover:opacity-80 transition-opacity">
              <AvatarImage src="" alt={user.name} />
              <AvatarFallback className="bg-blue-600 text-white font-semibold">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 bg-white border-gray-200 shadow-lg">
          <DropdownMenuLabel className="pb-2">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src="" alt={user.name} />
                <AvatarFallback className="bg-blue-600 text-white font-semibold text-xs">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none truncate text-gray-900">
                  {user.name}
                </p>
                <p className="text-xs leading-none text-gray-500 truncate">
                  {user.email}
                </p>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-gray-200" />
          <DropdownMenuItem
            className="text-gray-700 hover:bg-gray-100 hover:text-gray-900 cursor-pointer flex items-center gap-2 py-2"
            onClick={() => {
              console.log("Admin manage account clicked - to be implemented");
            }}
          >
            <Settings className="h-4 w-4" />
            Manage account
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setShowLogoutDialog(true)}
            className="text-gray-700 hover:bg-gray-100 hover:text-gray-900 cursor-pointer flex items-center gap-2 py-2"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure you want to logout?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will end your current admin session and you'll need to sign
              in again to access the admin panel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowLogoutDialog(false)}>
              No, Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700"
            >
              Yes, Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
```

**Section sources**
- [admin/BooksTable.tsx](file://components/admin/BooksTable.tsx)
- [admin/UserProfile.tsx](file://components/admin/UserProfile.tsx)

## Admin Header and Navigation

The admin interface features a dedicated **Header** component that provides a tailored experience for administrators. Unlike the main application header, this component is designed specifically for the administrative dashboard with relevant information and navigation.

``mermaid
flowchart TD
A["AdminHeader Component Mounts"] --> B["Receive session prop"]
B --> C["Display welcome message with admin name"]
C --> D["Render AdminUserProfile component"]
D --> E["Handle logout through confirmation dialog"]
```

**Diagram sources**
- [admin/Header.tsx](file://components/admin/Header.tsx)

The admin header displays a personalized welcome message and a brief description of the admin dashboard's purpose:

```tsx
const Header = ({ session }: { session: Session }) => {
  return (
    <header className="admin-header">
      <div>
        <h2 className="text-2xl font-semibold text-dark-400">
          Welcome, {session?.user?.name}
        </h2>
        <p className="text-base text-slate-500">
          Monitor all of your users and books here
        </p>
      </div>

      <div className="flex items-center">
        <AdminUserProfile
          user={{
            id: session?.user?.id!,
            name: session?.user?.name!,
            email: session?.user?.email!,
          }}
        />
      </div>
    </header>
  );
};
```

The component receives the session as a prop from the parent page, unlike the main application header which fetches the session asynchronously. This design choice reflects the different data flow patterns between the main application and admin interface.

The header integrates the **AdminUserProfile** component, which provides avatar display and logout functionality. The logout process includes a confirmation dialog to prevent accidental sign-out from the admin panel.

**Section sources**
- [admin/Header.tsx](file://components/admin/Header.tsx)
- [admin/UserProfile.tsx](file://components/admin/UserProfile.tsx)

## Best Practices for Component Creation and Extension

The university_lms application demonstrates several best practices for component creation and extension that contribute to a maintainable and scalable codebase.

### Type Safety and Interface Definition
The application establishes a strong foundation for type safety through the **Book** interface defined in `types.d.ts`. This interface ensures consistency across components that handle book data:

```typescript
interface Book {
  id: string;
  title: string;
  author: string;
  genre: string;
  rating: number;
  totalCopies: number;
  availableCopies: number;
  description: string;
  coverColor: string;
  coverUrl: string;
  videoUrl: string | null;
  youtubeUrl: string | null;
  summary: string;
  publisher: string | null;
  publicationDate: Date | null;
  edition: string | null;
  language: string | null;
  printLength: number | null;
  bookType: string | null;
  isbn: string | null;
  itemWeight: number | null;
  dimensions: string | null;
  aboutAuthor: string | null;
  price: number | null;
  createdAt: Date | null;
}
```

All components that receive book data as props can extend this interface, guaranteeing that they work with a consistent data structure.

### Component Reusability Through Props
Components are designed to be highly reusable through thoughtful prop design. The **BookCover** component exemplifies this with its variant system:

```typescript
type BookCoverVariant = "extraSmall" | "small" | "medium" | "regular" | "wide";

const variantStyles: Record<BookCoverVariant, string> = {
  extraSmall: "book-cover_extra_small",
  small: "book-cover_small",
  medium: "book-cover_medium",
  regular: "book-cover_regular",
  wide: "book-cover_wide",
};
```

This approach allows the same component to be used in different contexts (e.g., thumbnail vs. detailed view) without code duplication.

### Conditional Rendering Patterns
The application uses clean conditional rendering patterns to handle different states. The **BookCard** component demonstrates this with the `isLoanedBook` prop:

```tsx
{isLoanedBook && (
  <div className="mt-3 w-full">
    <div className="book-loaned">
      <Image
        src="/icons/calendar.svg"
        alt="calendar"
        width={18}
        height={18}
        className="object-contain"
      />
      <p className="text-light-100">11 days left to return</p>
    </div>

    <Button className="book-btn">Download receipt</Button>
  </div>
)}
```

This pattern keeps the component flexible while maintaining readability.

### Composition Over Inheritance
The architecture favors composition over inheritance, allowing components to be combined in various ways to create complex UIs. The root page demonstrates this by composing **BookOverview** and **BookList** components:

```tsx
const Home = () => (
  <>
    <BookOverview {...sampleBooks[0]} />
    <BookList
      title="Latest Books"
      books={sampleBooks}
      containerClassName="mt-28"
    />
  </>
);
```

### Separation of Concerns
The application maintains a clear separation of concerns:
- **UI Components**: Handle visual presentation
- **Form Logic**: Managed by react-hook-form and Zod
- **Navigation**: Handled by Next.js routing
- **Styling**: Managed by Tailwind CSS and utility functions

### Admin-Specific Patterns
The admin interface introduces additional best practices:
- **Data Table Patterns**: The **BooksTable** component implements comprehensive filtering, sorting, and pagination
- **Safety Confirmations**: Critical actions like deletion require explicit confirmation with text input
- **Role-Specific Components**: Separate components for admin and regular users maintain clear separation of functionality
- **Prop-Driven Session Management**: Admin components receive session data as props, enabling better control over data flow

These patterns ensure that the admin interface is both powerful and safe, preventing accidental data loss while providing comprehensive management capabilities.

**Section sources**
- [types.d.ts](file://types.d.ts#L1-L41)
- [BookCover.tsx](file://components/BookCover.tsx#L1-L52)
- [BookCard.tsx](file://components/BookCard.tsx#L1-L48)
- [page.tsx](file://app/(root)/page.tsx#L1-L15)
- [admin/BooksTable.tsx](file://components/admin/BooksTable.tsx)
- [admin/UserProfile.tsx](file://components/admin/UserProfile.tsx)
- [admin/Header.tsx](file://components/admin/Header.tsx)