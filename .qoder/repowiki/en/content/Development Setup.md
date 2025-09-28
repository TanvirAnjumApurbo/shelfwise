# Development Setup

<cite>
**Referenced Files in This Document**   
- [package.json](file://package.json)
- [package-lock.json](file://package-lock.json)
- [tsconfig.json](file://tsconfig.json)
- [next.config.ts](file://next.config.ts)
- [tailwind.config.ts](file://tailwind.config.ts)
- [eslint.config.mjs](file://eslint.config.mjs)
- [postcss.config.mjs](file://postcss.config.mjs)
</cite>

## Table of Contents
1. [Development Setup](#development-setup)
2. [Environment Configuration](#environment-configuration)
3. [Node.js Version Requirements](#nodejs-version-requirements)
4. [Dependency Installation](#dependency-installation)
5. [Development Commands](#development-commands)
6. [Configuration Files](#configuration-files)
7. [Starting the Development Server](#starting-the-development-server)
8. [Running Tests](#running-tests)
9. [Common Setup Issues and Solutions](#common-setup-issues-and-solutions)
10. [Code Structure Conventions](#code-structure-conventions)
11. [Development Workflow Best Practices](#development-workflow-best-practices)

## Environment Configuration

To set up the development environment for the university_lms application, you need to ensure that your system meets the required software dependencies. The primary requirement is Node.js, which serves as the runtime environment for executing JavaScript and TypeScript code. Additionally, npm (Node Package Manager) is used for managing project dependencies.

The project is built using Next.js, a React framework that enables server-side rendering and static site generation. It also uses TypeScript for type safety and Tailwind CSS for styling. These tools are configured through specific configuration files in the project root.

Before proceeding with installation, verify that your development machine has the correct version of Node.js installed, as specified in the next section.

**Section sources**
- [package.json](file://package.json)
- [package-lock.json](file://package-lock.json)

## Node.js Version Requirements

Based on the `package-lock.json` file, the university_lms application requires a compatible version of Node.js to run properly. The `engines` field in the `next` package entry specifies the supported Node.js versions:

```json
"engines": {
  "node": "^18.18.0 || ^19.8.0 || >= 20.0.0"
}
```

This means the application is designed to work with:
- Node.js 18.18.0 or higher (but less than 19.0.0)
- Node.js 19.8.0 or higher (but less than 20.0.0)
- Node.js 20.0.0 or higher

It is recommended to use **Node.js 18.18.0 or later** for optimal compatibility and performance. You can check your current Node.js version by running:

```bash
node --version
```

If your version does not meet these requirements, download and install an appropriate version from [nodejs.org](https://nodejs.org).

**Section sources**
- [package-lock.json](file://package-lock.json#L4591-L4631)

## Dependency Installation

Once the correct version of Node.js is installed, navigate to the project root directory (``) and install the required dependencies using npm:

```bash
cd 
npm install
```

This command reads the `package.json` file and installs all listed dependencies into the `node_modules` directory. The exact versions are locked in `package-lock.json` to ensure consistent installations across different environments.

Key dependencies include:
- `next`: The core Next.js framework
- `react` and `react-dom`: UI rendering libraries
- `typescript`: For type checking
- `tailwindcss`, `postcss`, and `autoprefixer`: For styling
- `eslint` and related plugins: For code linting

After installation completes, you can verify that all dependencies are correctly installed by checking the `node_modules` folder or running:

```bash
npm list
```

**Section sources**
- [package.json](file://package.json)
- [package-lock.json](file://package-lock.json)

## Development Commands

The `package.json` file defines several npm scripts for common development tasks. These commands are executed using `npm run <command>`.

### Available Scripts

| Command | Description |
|--------|-------------|
| `dev` | Starts the development server with hot reloading |
| `build` | Compiles the application for production |
| `start` | Runs the production build locally |
| `lint` | Analyzes code for potential errors and style issues |

#### dev
Starts the development server:
```bash
npm run dev
```
This launches the application at `http://localhost:3000` with live reloading enabled.

#### build
Prepares the application for deployment:
```bash
npm run build
```
This command compiles and optimizes the code, generating static files in the `.next` directory.

#### start
Runs the production build locally:
```bash
npm run build
npm run start
```
Useful for testing the production version before deployment.

#### lint
Checks code quality:
```bash
npm run lint
```
Uses ESLint to identify potential bugs, formatting issues, and code smells.

**Section sources**
- [package.json](file://package.json)

## Configuration Files

Several configuration files control the behavior of the development environment and build process.

### tsconfig.json

The `tsconfig.json` file configures the TypeScript compiler. It specifies:
- Target JavaScript version (`es2022`)
- Module system (`es2020`)
- JSX transformation (`preserve`)
- Strict type checking options
- Path aliases for easier imports

Example snippet:
```json
{
  "compilerOptions": {
    "target": "es2022",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": [
    "node_modules"
  ]
}
```

**Section sources**
- [tsconfig.json](file://tsconfig.json)

### next.config.ts

The `next.config.ts` file customizes Next.js behavior. It may include:
- Environment variables
- Webpack configuration overrides
- Image optimization settings
- Middleware configuration
- API route settings

While the exact content is not available, typical configurations include:
```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Additional custom configurations
};

export default nextConfig;
```

**Section sources**
- [next.config.ts](file://next.config.ts)

### tailwind.config.ts

The `tailwind.config.ts` file configures Tailwind CSS. It defines:
- Design tokens (colors, spacing, typography)
- Responsive breakpoints
- Plugins
- Content sources for purge

Example structure:
```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
```

**Section sources**
- [tailwind.config.ts](file://tailwind.config.ts)

### Other Configuration Files

- `eslint.config.mjs`: Defines linting rules using the modern flat config format
- `postcss.config.mjs`: Configures PostCSS for Tailwind processing

**Section sources**
- [eslint.config.mjs](file://eslint.config.mjs)
- [postcss.config.mjs](file://postcss.config.mjs)

## Starting the Development Server

To begin development, start the server using the `dev` script:

```bash
npm run dev
```

The output will display:
```
ready - started server on 0.0.0.0:3000, url: http://localhost:3000
```

Navigate to `http://localhost:3000` in your browser to view the application. The development server supports:
- Hot Module Replacement (HMR): Updates the browser without full reload
- Error overlay: Displays errors directly in the browser
- Fast refresh: Preserves component state during edits

Any changes to source files will automatically trigger a rebuild and browser update.

**Section sources**
- [package.json](file://package.json)

## Running Tests

Although no explicit test scripts are defined in `package.json`, the presence of development dependencies suggests testing capabilities may be available. If test files exist (e.g., `*.test.tsx`), you can add a test script to `package.json`:

```json
"scripts": {
  "test": "jest"
}
```

Then run:
```bash
npm run test
```

Alternatively, if using Next.js testing utilities:
```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom
```

Create test files alongside components and run them using Jest or Vitest.

**Section sources**
- [package.json](file://package.json)

## Common Setup Issues and Solutions

### 1. Node.js Version Mismatch
**Issue**: `error:0308010C:digital envelope routines::unsupported`
**Solution**: Downgrade to Node.js 17+ or set legacy OpenSSL provider:
```bash
export NODE_OPTIONS=--openssl-legacy-provider
```

### 2. Missing Dependencies
**Issue**: Module not found errors
**Solution**: Clear npm cache and reinstall:
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### 3. Port Already in Use
**Issue**: `Error: listen EADDRINUSE: address already in use :::3000`
**Solution**: Change port:
```bash
npm run dev -- -p 3001
```

### 4. TypeScript Errors
**Issue**: Type errors during development
**Solution**: Ensure `tsconfig.json` is properly configured and restart the dev server.

### 5. ESLint Configuration Issues
**Issue**: Linting errors or warnings
**Solution**: Verify `eslint.config.mjs` is correctly formatted and dependencies are installed.

**Section sources**
- [package.json](file://package.json)
- [tsconfig.json](file://tsconfig.json)
- [package-lock.json](file://package-lock.json)

## Code Structure Conventions

The project follows a structured organization:

- `app/`: Next.js App Router pages and layouts
  - `(auth)/`: Authentication routes
  - `(root)/`: Main application routes
- `components/`: Reusable UI components
  - `ui/`: Shadcn-style primitive components
- `lib/`: Utility functions and business logic
- `constants/`: Application constants
- `public/`: Static assets

File naming uses PascalCase for React components (e.g., `Button.tsx`) and camelCase for utilities (e.g., `formatDate.ts`).

TypeScript interfaces and types are defined at the top of files or in separate `.d.ts` files when shared.

**Section sources**
- [project_structure](file://project_structure)

## Development Workflow Best Practices

1. **Use Feature Branches**: Create branches for new features or bug fixes
2. **Commit Frequently**: Small, focused commits with descriptive messages
3. **Run Linters**: Always run `npm run lint` before committing
4. **Test Changes**: Verify functionality in the browser after changes
5. **Update Dependencies**: Regularly update packages (with caution)
6. **Document Code**: Add comments for complex logic
7. **Follow TypeScript**: Use types consistently throughout the codebase
8. **Use Environment Variables**: Store configuration in `.env.local`
9. **Optimize Images**: Compress and format images before adding to `public/`
10. **Review Build Output**: Check `npm run build` output for errors before deployment

Adhering to these practices ensures a maintainable and scalable codebase.

**Section sources**
- [package.json](file://package.json)
- [tsconfig.json](file://tsconfig.json)
- [next.config.ts](file://next.config.ts)