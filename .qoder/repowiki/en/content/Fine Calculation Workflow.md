# Fine Calculation Workflow

<cite>
**Referenced Files in This Document**   
- [onboarding/route.ts](file://app/api/workflows/onboarding/route.ts)
- [workflow.ts](file://lib/workflow.ts)
- [schema.ts](file://database/schema.ts)
- [types.d.ts](file://types.d.ts)
- [auth.ts](file://lib/actions/auth.ts)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)

## Introduction
The Fine Calculation Workflow documentation aims to detail the mechanisms and logic behind fine assessments within the University LMS system. However, after thorough analysis of the codebase, no explicit implementation of a fine calculation system was identified. Instead, the system contains a user onboarding workflow that manages user engagement through time-based email campaigns. This document will analyze the existing workflow and infer potential fine calculation patterns based on the system's architecture and data models.

## Project Structure
The project follows a Next.js application structure with a clear separation of concerns. Key directories include:
- `app/`: Contains the application routes and page components
- `components/`: Reusable UI components
- `database/`: Database configuration and schema definitions
- `lib/`: Utility functions and business logic
- `migrations/`: Database migration scripts

The system uses Drizzle ORM for database interactions, Redis for caching, and Upstash Workflows for managing asynchronous processes.

``mermaid
graph TB
subgraph "Frontend"
A[app/(root)]
B[app/(auth)]
C[components/]
end
subgraph "Backend"
D[app/api/workflows/onboarding]
E[lib/workflow.ts]
F[database/schema.ts]
end
subgraph "Database"
G[PostgreSQL]
end
D --> E
E --> F
F --> G
A --> D
B --> D
```

**Diagram sources**
- [onboarding/route.ts](file://app/api/workflows/onboarding/route.ts#L1-L80)
- [schema.ts](file://database/schema.ts#L1-L70)

## Core Components
The core components related to workflow management include the onboarding workflow API route, the workflow utility module, and the database schema. These components work together to manage user state and trigger email notifications based on user activity.

**Section sources**
- [onboarding/route.ts](file://app/api/workflows/onboarding/route.ts#L1-L80)
- [workflow.ts](file://lib/workflow.ts#L1-L34)
- [schema.ts](file://database/schema.ts#L1-L70)

## Architecture Overview
The system architecture follows a serverless pattern with Next.js API routes handling workflow execution. The Upstash Workflow service manages long-running processes with sleep intervals, while the database stores user and book information.

``mermaid
sequenceDiagram
participant User
participant API as "onboarding/route.ts"
participant Workflow as "Upstash Workflow"
participant DB as "PostgreSQL"
User->>API : POST /api/workflows/onboarding
API->>Workflow : Initialize workflow
Workflow->>DB : Query user state
DB-->>Workflow : Return last activity date
Workflow->>Workflow : Calculate user state
Workflow->>Workflow : Sleep 3 days
Workflow->>DB : Check user state
DB-->>Workflow : Return current state
alt User is non-active
Workflow->>Workflow : Send re-engagement email
else User is active
Workflow->>Workflow : Send welcome back email
end
Workflow->>Workflow : Sleep 30 days
Workflow->>Workflow : Repeat check
```

**Diagram sources**
- [onboarding/route.ts](file://app/api/workflows/onboarding/route.ts#L1-L80)
- [workflow.ts](file://lib/workflow.ts#L1-L34)

## Detailed Component Analysis

### Onboarding Workflow Analysis
The onboarding workflow manages user engagement through a time-based email campaign. It checks user activity and sends appropriate emails based on their status.

``mermaid
flowchart TD
Start([Workflow Start]) --> GetUserData["Extract email and fullName"]
GetUserData --> SendWelcome["Send welcome email"]
SendWelcome --> Wait3Days["Sleep 3 days"]
Wait3Days --> CheckUserState["Check user state"]
CheckUserState --> IsNonActive{"User non-active?"}
IsNonActive --> |Yes| SendNonActiveEmail["Send 'Are you still there?' email"]
IsNonActive --> |No| IsActive{"User active?"}
IsActive --> |Yes| SendActiveEmail["Send 'Welcome back!' email"]
IsActive --> |No| HandleUnknownState["Handle unknown state"]
SendNonActiveEmail --> Wait30Days
SendActiveEmail --> Wait30Days
HandleUnknownState --> Wait30Days
Wait30Days["Sleep 30 days"] --> LoopBack["Repeat process"]
LoopBack --> CheckUserState
```

**Diagram sources**
- [onboarding/route.ts](file://app/api/workflows/onboarding/route.ts#L1-L80)

#### User State Determination Logic
The system determines user state based on the last activity date. Users are considered non-active if their last activity was between 3 and 30 days ago.

``mermaid
flowchart TD
Start([Get User State]) --> QueryDB["Query database for user"]
QueryDB --> UserExists{"User exists?"}
UserExists --> |No| ReturnNonActive["Return 'non-active'"]
UserExists --> |Yes| GetLastActivity["Get lastActivityDate"]
GetLastActivity --> CalculateDiff["Calculate time difference"]
CalculateDiff --> CheckRange["3 days < diff ≤ 30 days?"]
CheckRange --> |Yes| ReturnNonActive
CheckRange --> |No| ReturnActive["Return 'active'"]
```

**Section sources**
- [onboarding/route.ts](file://app/api/workflows/onboarding/route.ts#L15-L40)

### Data Models Analysis
The system's data models define the structure of users, books, and borrow records. While no explicit fine fields are present, the borrow records include due dates which could be used for fine calculation.

``mermaid
erDiagram
USERS {
uuid id PK
string full_name
string email UK
integer university_id UK
text password
text university_card
status status
role role
date last_activity_date
timestamp created_at
}
BOOKS {
uuid id PK
string title
string author
text genre
integer rating
text cover_url
varchar cover_color
text description
integer total_copies
integer available_copies
text video_url
varchar summary
timestamp created_at
}
BORROW_RECORDS {
uuid id PK
uuid user_id FK
uuid book_id FK
timestamp borrow_date
date due_date
date return_date
borrow_status status
timestamp created_at
}
USERS ||--o{ BORROW_RECORDS : "has"
BOOKS ||--o{ BORROW_RECORDS : "has"
```

**Diagram sources**
- [schema.ts](file://database/schema.ts#L1-L70)

## Dependency Analysis
The system dependencies show how components interact to manage workflows and data.

``mermaid
graph TD
A[onboarding/route.ts] --> B[workflow.ts]
A --> C[schema.ts]
B --> D[config.ts]
C --> E[drizzle-orm]
A --> F[Upstash Workflow]
B --> G[QStash]
G --> H[Resend]
```

**Diagram sources**
- [onboarding/route.ts](file://app/api/workflows/onboarding/route.ts#L1-L80)
- [workflow.ts](file://lib/workflow.ts#L1-L34)
- [schema.ts](file://database/schema.ts#L1-L70)

## Performance Considerations
The workflow system is designed with performance in mind:
- Uses Upstash Workflows to handle long-running processes without blocking
- Implements efficient database queries with proper indexing
- Leverages Redis for potential caching (though not explicitly used in the analyzed code)
- Uses environment variables for configuration to avoid hardcoding

The system could be enhanced with fine calculation functionality by:
1. Adding a fine amount field to the borrow_records table
2. Implementing a cron job or workflow to check due dates daily
3. Calculating fines based on days overdue with a configurable rate
4. Storing fine history and providing user notifications

## Troubleshooting Guide
When troubleshooting workflow issues, consider the following:

**Section sources**
- [onboarding/route.ts](file://app/api/workflows/onboarding/route.ts#L1-L80)
- [workflow.ts](file://lib/workflow.ts#L1-L34)

### Common Issues
1. **Workflow not triggering**: Check that the workflow URL is correctly configured in environment variables
2. **Emails not sending**: Verify QStash and Resend API keys in configuration
3. **User state incorrect**: Ensure lastActivityDate is being updated properly in the database
4. **Database connection issues**: Confirm database URL and credentials are correct

### Debugging Steps
1. Check server logs for error messages
2. Verify environment variables are set correctly
3. Test database connectivity independently
4. Use workflow debugging tools provided by Upstash

## Conclusion
While the University LMS system does not currently implement a fine calculation workflow, it contains the foundational components that could support such functionality. The existing onboarding workflow demonstrates how time-based processes can be managed using Upstash Workflows. To implement fine calculation, the system would need to:
1. Extend the borrow_records table to include fine-related fields
2. Create a new workflow to check due dates and calculate fines
3. Implement user notification systems for overdue books
4. Add UI components to display fine information to users

The current architecture is well-suited for this extension, leveraging serverless functions and workflow management to handle the asynchronous nature of fine calculations.