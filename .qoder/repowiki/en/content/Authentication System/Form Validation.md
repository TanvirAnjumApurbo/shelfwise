<docs>
# Form Validation

<cite>
**Referenced Files in This Document**   
- [lib/validations.ts](file://lib\validations.ts) - *Updated in recent commit*
- [components/AuthForm.tsx](file://components\AuthForm.tsx)
- [app/(auth)/sign-in/page.tsx](file://app/(auth)/sign-in/page.tsx)
- [app/(auth)/sign-up/page.tsx](file://app/(auth)/sign-up/page.tsx)
- [types.d.ts](file://types.d.ts)
- [constants/index.ts](file://constants\index.ts)
- [components/ui/form.tsx](file://components/ui/form.tsx)
- [components/admin/forms/BookForm.tsx](file://components\admin\forms\BookForm.tsx) - *Updated in recent commit*
- [database/schema.ts](file://database\schema.ts) - *Updated in recent commit*
</cite>

## Update Summary
**Changes Made**   
- Added new section on Book Form Validation to document the newly added price field validation
- Updated validation schema structure to include bookSchema
- Added information about price field validation rules and business logic
- Updated type alignment section to include Book interface and price field
- Enhanced extensibility considerations with information about penalty calculation usage
- Added new diagram for book form validation schema
- Updated referenced files to include newly relevant components and schema files

## Table of Contents
1. [Introduction](#introduction)
2. [Validation Schema Structure](#validation-schema-structure)
3. [Field-Level Validation Rules](#field-level-validation-rules)
4. [Integration with React Hook Form](#integration-with-react-hook-form)
5. [Schema Reuse Across Authentication Flows](#schema-reuse-across-authentication-flows)
6. [Error Message Handling and UI Feedback](#error-message-handling-and-ui-feedback)
7. [Type Alignment and Data Contracts](#type-alignment-and-data-contracts)
8. [Extensibility Considerations](#extensibility-considerations)
9. [Book Form Validation](#book-form-validation)

## Introduction
This document provides a comprehensive analysis of the form validation system used in the university_lms application for authentication flows. The system leverages Zod for schema definition and integrates with React Hook Form via zodResolver to ensure runtime type safety and seamless validation feedback. The validation logic is centralized in reusable schemas that govern both login and registration forms, ensuring consistency and maintainability. This documentation details the schema definitions, field constraints, integration patterns, error handling mechanisms, and extensibility features of the validation system.

**Section sources**
- [lib/validations.ts](file://lib\validations.ts#L1-L13)
- [components/AuthForm.tsx](file://components\AuthForm.tsx#L0-L119)

## Validation Schema Structure
The validation system is built around multiple Zod schemas defined in `lib/validations.ts`: `signUpSchema`, `signInSchema`, and `bookSchema`. These schemas define the structure and constraints for registration, login, and book management forms respectively. The schemas are exported as constants and consumed by their respective form components, enabling consistent validation logic across the application.

```
classDiagram
class signUpSchema {
+fullName : string (min 3)
+email : string (email format)
+universityId : number
+universityCard : string (required)
+password : string (min 8)
}
class signInSchema {
+email : string (email format)
+password : string (min 8)
}
class bookSchema {
+title : string (min 2, max 150)
+description : string (min 10, max 2000)
+author : string (min 2, max 100)
+genre : enum (BOOK_GENRES)
+rating : number (0.1-5, step 0.1)
+totalCopies : number (positive, int, ≤10000)
+coverUrl : string (required)
+coverColor : string (#RRGGBB format)
+summary : string (min 10, max 1500)
+price : number (positive, optional)
}
signUpSchema <|-- signInSchema : "shares email and password rules"
```

**Diagram sources**
- [lib/validations.ts](file://lib\validations.ts#L69-L114)

**Section sources**
- [lib/validations.ts](file://lib\validations.ts#L69-L114)

## Field-Level Validation Rules
Each field in the forms has specific validation constraints defined through Zod's fluent API. These rules ensure data integrity and provide immediate feedback to users during form interaction.

### Sign-Up Form Rules
The registration form enforces comprehensive validation rules to ensure complete and accurate user information:

- **fullName**: Must be a string with minimum length of 3 characters
- **email**: Must be a valid email format
- **universityId**: Coerced to a number type (accepts string input that converts to number)
- **universityCard**: String value that must not be empty, with custom error message "University Card is required"
- **password**: Minimum 8 characters required

### Sign-In Form Rules
The login form applies essential security-focused validation:

- **email**: Valid email format required
- **password**: Minimum 8 characters required

### Book Form Rules
The book management form includes extensive validation for book details:

- **title**: String with minimum 2 and maximum 150 characters
- **description**: String with minimum 10 and maximum 2000 characters
- **author**: String with minimum 2 and maximum 100 characters
- **genre**: Must be one of the predefined BOOK_GENRES values
- **rating**: Number between 0.1 and 5, with increments of 0.1
- **totalCopies**: Positive integer, maximum 10,000
- **coverUrl**: Non-empty string
- **coverColor**: String in hexadecimal format (#RRGGBB)
- **summary**: String with minimum 10 and maximum 1500 characters
- **price**: Positive number (optional), used for penalty calculations

```
flowchart TD
Start([Field Validation]) --> FullName["fullName: string.min(3)"]
Start --> Email["email: string.email()"]
Start --> UniversityId["universityId: coerce.number()"]
Start --> UniversityCard["universityCard: string.nonempty()"]
Start --> Password["password: string.min(8)"]
Start --> Title["title: string.min(2).max(150)"]
Start --> Genre["genre: enum(BOOK_GENRES)"]
Start --> Rating["rating: number.min(0.1).max(5).multipleOf(0.1)"]
Start --> TotalCopies["totalCopies: number.positive().int().lte(10000)"]
Start --> Price["price: number.positive().optional()"]
Email --> |Success| ValidEmail["Valid Email Format"]
Email --> |Failure| InvalidEmail["Error: Invalid email"]
Password --> |Success| SufficientLength["8+ Characters"]
Password --> |Failure| ShortPassword["Error: Too short"]
UniversityCard --> |Empty| MissingCard["Error: University Card is required"]
Price --> |Valid| ValidPrice["Positive Number"]
Price --> |Invalid| InvalidPrice["Error: Must be positive"]
```

**Diagram sources**
- [lib/validations.ts](file://lib\validations.ts#L69-L114)

**Section sources**
- [lib/validations.ts](file://lib\validations.ts#L69-L114)

## Integration with React Hook Form
The validation schemas are seamlessly integrated with React Hook Form through the `zodResolver` from `@hookform/resolvers/zod`. This integration provides runtime type safety and automatic validation feedback in the UI.

The `AuthForm` component accepts a generic schema and configures the form hook with the resolver:

```typescript
const form: UseFormReturn<T> = useForm({
  resolver: zodResolver(schema),
  defaultValues: defaultValues as DefaultValues<T>,
});
```

This setup enables:
- Automatic field validation on blur and submit
- Type-safe form data handling
- Real-time validation feedback
- Proper error state management

The component uses Radix UI primitives wrapped in custom form components (`FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage`) to render the form fields and display validation messages.

```
sequenceDiagram
participant Form as AuthForm
participant HookForm as React Hook Form
participant Resolver as zodResolver
participant Schema as Validation Schema
participant UI as Form UI
Form->>HookForm : useForm({ resolver, defaultValues })
HookForm->>Resolver : Initialize with schema
Resolver->>Schema : Validate field data
Schema-->>Resolver : Return validation result
Resolver-->>HookForm : Provide validation status
HookForm->>UI : Update field error states
UI->>User : Display validation feedback
```

**Diagram sources**
- [components/AuthForm.tsx](file://components\AuthForm.tsx#L20-L25)
- [lib/validations.ts](file://lib\validations.ts#L1-L13)

**Section sources**
- [components/AuthForm.tsx](file://components\AuthForm.tsx#L15-L30)
- [components/ui/form.tsx](file://components/ui/form.tsx#L0-L166)

## Schema Reuse Across Authentication Flows
The validation system demonstrates effective schema reuse between login and registration flows. Both forms share common validation rules for email and password fields, while the registration form extends these with additional fields.

The sign-in page imports and uses `signInSchema`:

```typescript
<AuthForm
  type="SIGN_IN"
  schema={signInSchema}
  defaultValues={{
    email: "",
    password: "",
  }}
/>
```

The sign-up page imports and uses `signUpSchema`:

```typescript
<AuthForm
  type="SIGN_UP"
  schema={signUpSchema}
  defaultValues={{
    email: "",
    password: "",
    fullName: "",
    universityId: 0,
    universityCard: "",
  }}
/>
```

This approach ensures:
- Consistent validation rules across forms
- Single source of truth for validation logic
- Easy maintenance and updates
- Reduced code duplication

```
graph TB
A[AuthForm] --> B[signInSchema]
A --> C[signUpSchema]
B --> D["email: string.email()"]
B --> E["password: string.min(8)"]
C --> D
C --> E
C --> F["fullName: string.min(3)"]
C --> G["universityId: coerce.number()"]
C --> H["universityCard: string.nonempty()"]
style A fill:#f9f,stroke:#333
style B fill:#bbf,stroke:#333
style C fill:#bbf,stroke:#333
```

**Diagram sources**
- [app/(auth)/sign-in/page.tsx](file://app/(auth)/sign-in/page.tsx#L7-L15)
- [app/(auth)/sign-up/page.tsx](file://app/(auth)/sign-up/page.tsx#L7-L17)
- [lib/validations.ts](file://lib\validations.ts#L1-L13)

**Section sources**
- [app/(auth)/sign-in/page.tsx](file://app/(auth)/sign-in/page.tsx#L7-L15)
- [app/(auth)/sign-up/page.tsx](file://app/(auth)/sign-up/page.tsx#L7-L17)

## Error Message Handling and UI Feedback
The system provides user-friendly validation feedback through a combination of custom error messages and standardized UI components.

### Custom Error Messages
The only explicitly customized error message is for the universityCard field:
```typescript
universityCard: z.string().nonempty("University Card is required")
```

All other fields use Zod's default error messages for their respective validation rules.

### UI Feedback Mechanism
The `FormMessage` component from `components/ui/form.tsx` renders validation errors:

```typescript
function FormMessage({ className, ...props }: React.ComponentProps<"p">) {
  const { error, formMessageId } = useFormField()
  const body = error ? String(error?.message ?? "") : props.children
  // ... renders error message with destructive styling
}
```

Key features of the error display:
- Errors appear below the respective form fields
- Text color is set to destructive (likely red) for visibility
- Messages are displayed in a small font size (text-sm)
- Empty messages are suppressed (return null if no body)

The form labels also respond to error states by changing text color:
```typescript
function FormLabel() {
  const { error, formItemId } = useFormField()
  return (
    <Label
      data-slot="form-label"
      data-error={!!error}
      className={cn("data-[error=true]:text-destructive", className)}
      htmlFor={formItemId}
    />
  )
}
```

**Section sources**
- [lib/validations.ts](file://lib\validations.ts#L7)
- [components/ui/form.tsx](file://components/ui/form.tsx#L124-L166)

## Type Alignment and Data Contracts
The validation system maintains type consistency across the application through well-defined interfaces and data contracts.

### AuthCredentials Interface
The `AuthCredentials` interface in `types.d.ts` defines the expected shape of authentication data:

```typescript
interface AuthCredentials {
  fullName: string;
  email: string;
  password: string;
  universityId: number;
  universityCard: string;
}
```

This interface aligns perfectly with the `signUpSchema` structure, ensuring type safety from form input through to authentication processing.

### Book Interface
The `Book` interface in `types.d.ts` includes the newly added price field:

```typescript
interface Book {
  // ... other fields
  price: number | null; // price for penalty calculations
}
```

### Field Name and Type Mapping
The `constants/index.ts` file provides human-readable labels and input types for form fields:

```typescript
export const FIELD_NAMES = {
  fullName: "Full name",
  email: "Email",
  universityId: "University ID Number",
  password: "Password",
  universityCard: "Upload University ID Card",
};
```

These constants are used in the `AuthForm` component to dynamically generate appropriate labels and input types based on field names.

```
erDiagram
VALIDATION_SCHEMA {
string fullName
string email
number universityId
string universityCard
string password
}
INTERFACE {
string fullName
string email
string password
number universityId
string universityCard
}
CONSTANTS {
string fullName
string email
string universityId
string password
string universityCard
}
VALIDATION_SCHEMA ||--|| INTERFACE : "type alignment"
VALIDATION_SCHEMA }o--|| CONSTANTS : "field configuration"
```

**Diagram sources**
- [types.d.ts](file://types.d.ts#L16-L22)
- [constants/index.ts](file://constants\index.ts#L175-L193)
- [lib/validations.ts](file://lib\validations.ts#L3-L7)

**Section sources**
- [types.d.ts](file://types.d.ts#L16-L22)
- [constants/index.ts](file://constants\index.ts#L175-L193)
- [database/schema.ts](file://database\schema.ts#L76)

## Extensibility Considerations
The current validation system demonstrates good extensibility characteristics while having some limitations for advanced use cases.

### Internationalization (i18n) Support
While the system does not currently implement internationalization, the architecture allows for future i18n integration:

- Custom error messages can be replaced with translation functions
- FIELD_NAMES constants can be replaced with localized strings
- The zod-i18n library could be integrated for translated validation messages

The presence of `language-tags` and related packages in dependencies suggests potential i18n capabilities in the broader system.

### Dynamic Validation Rules
The current implementation uses static validation rules. However, the schema-based approach allows for dynamic rule creation:

```typescript
// Example of potential dynamic schema
const createSignUpSchema = (requireCard: boolean) => z.object({
  // ... other fields
  universityCard: requireCard ? z.string().nonempty() : z.string().optional()
});
```

### Testing Validation Logic
The isolated schema definitions in `lib/validations.ts` make validation logic easy to test:

```typescript
// Example test structure
describe('signUpSchema', () => {
  test('requires valid email', () => {
    expect(signUpSchema.safeParse({ email: 'invalid' })).not.toBeValid();
  });
  
  test('requires minimum password length', () => {
    expect(signUpSchema.safeParse({ password: 'short' })).not.toBeValid();
  });
});
```

The separation of validation logic from component logic enables unit testing of validation rules independent of the UI.

**Section sources**
- [lib/validations.ts](file://lib\validations.ts)
- [package-lock.json](file://package-lock.json#L4346-L4423)

## Book Form Validation
The book management form validation has been enhanced with a new price field that serves as the basis for penalty calculations in the library system.

### Price Field Validation
The price field in the bookSchema is defined with specific constraints:

```typescript
price: z.coerce.number().positive().optional(),
```

This validation ensures that:
- The price is coerced from string input to a number
- The value must be positive (greater than zero)
- The field is optional, allowing books to be added without a price

### Database Schema Alignment
The price field is stored in the database with specific precision:

```sql
ALTER TABLE "books" ADD COLUMN "price" numeric(10, 2);
```

The numeric type with precision 10 and scale 2 allows for prices up to $99,999,999.99 with two decimal places for cents.

### Business Logic Integration
The price field is used for penalty calculations when books are not returned on time:

- The price is displayed in the BookForm with a helper text: "This price will be used for penalty calculations if the book is not returned on time."
- The price value is stored in the books table and can be referenced when calculating late fees
- The field is optional to accommodate books that may not have a defined monetary value

### UI Implementation
The price field is implemented in the BookForm component with appropriate input constraints:

```tsx
<FormField
  control={form.control}
  name={"price"}
  render={({ field }) => (
    <FormItem className="flex flex-col gap-1">
      <FormLabel className="text-base font-normal text-dark-500">
        Price ($)
      </FormLabel>
      <FormControl>
        <Input
          type="number"
          min={0.01}
          step={0.01}
          placeholder="Book price for penalty calculations"
          {...field}
          onChange={(e) => field.onChange(e.target.value)}
          className="book-form_input"
        />
      </FormControl>
      <FormMessage />
      <p className="text-sm text-gray-500">
        This price will be used for penalty calculations if the book
        is not returned on time.
      </p>
    </FormItem>
  )}
/>
```

The input includes:
- Type "number" with min value of 0.01 to ensure positive values
- Step of 0.01 to allow cent-level precision
- Helper text explaining the purpose of the field
- Integration with React Hook Form for validation and state management

```
classDiagram
class bookSchema {
+title: string (min 2, max 150)
+description: string (min 10, max 2000)
+author: string (min 2, max 100)
+genre: enum (BOOK_GENRES)
+rating: number (0.1-5, step 0.1)
+totalCopies: number (positive, int, ≤10000)
+coverUrl: string (required