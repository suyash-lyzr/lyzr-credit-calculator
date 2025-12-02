# Lyzr HR Helpdesk Boilerplate

## Overview
This is a Next.js 15 application with TypeScript, Tailwind CSS 4, and shadcn/ui components. It's a boilerplate for building HR helpdesk applications with Lyzr AI.

**Current State:** Fully configured and running on Replit
**Last Updated:** December 2, 2025

## Project Architecture

### Technology Stack
- **Framework:** Next.js 15.5.0 with App Router
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 4 with tw-animate-css
- **UI Components:** shadcn/ui with Radix UI primitives
- **Icons:** Lucide React, Tabler Icons
- **Charts:** Recharts
- **Forms:** React Hook Form with Zod validation
- **Tables:** TanStack React Table
- **Drag & Drop:** dnd-kit

### Project Structure
```
lyzr-boilerplate/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── dashboard/          # Dashboard page
│   │   ├── design-guidelines/  # Design guidelines pages
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Home page
│   ├── components/             # React components
│   │   ├── ui/                 # shadcn/ui components
│   │   └── [custom components]
│   ├── hooks/                  # Custom React hooks
│   └── lib/                    # Utility functions
├── public/                     # Static assets
└── [config files]
```

## Recent Changes
- **2025-12-02:** Initial Replit setup
  - Installed Node.js dependencies
  - Configured Next.js to work with Replit proxy (allowedOrigins: '*')
  - Set up dev workflow on port 5000 with host 0.0.0.0
  - Created .gitignore for Node.js project
  - Configured deployment for autoscale with build and start commands

## Development

### Local Development
The dev server runs on port 5000 (required for Replit):
```bash
cd lyzr-boilerplate
npm run dev -- -p 5000 -H 0.0.0.0
```

### Building for Production
```bash
cd lyzr-boilerplate
npm run build
```

### Running Production Build
```bash
cd lyzr-boilerplate
npm start -- -p 5000 -H 0.0.0.0
```

## Replit Configuration

### Workflow
- **Name:** Next.js Dev Server
- **Command:** `cd lyzr-boilerplate && npm run dev -- -p 5000 -H 0.0.0.0`
- **Port:** 5000
- **Output:** Webview

### Deployment
- **Type:** Autoscale (stateless web application)
- **Build:** `cd lyzr-boilerplate && npm run build`
- **Run:** `cd lyzr-boilerplate && npm start -- -p 5000 -H 0.0.0.0`

## Available Routes
- `/` - Home page with Next.js welcome screen
- `/dashboard` - Dashboard page
- `/design-guidelines` - Design guidelines page
- `/design-guidelines/dashboard` - Dashboard design guidelines

## Dependencies
All dependencies are managed via npm and defined in `lyzr-boilerplate/package.json`. Key dependencies include:
- Next.js 15.5.0
- React 19.1.0
- TypeScript 5
- Tailwind CSS 4
- shadcn/ui components (Radix UI based)
- Form handling (React Hook Form + Zod)
- Data tables (TanStack React Table)
- Charts (Recharts)

## User Preferences
None specified yet.
