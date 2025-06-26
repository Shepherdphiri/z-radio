# StreamCast - Live Audio Broadcasting Platform

## Overview

StreamCast is a professional browser-based live audio broadcasting platform built with WebRTC technology. It allows users to broadcast live audio streams with minimal latency and provides listeners with real-time access to these broadcasts. The application is designed as a full-stack solution with a React frontend, Express.js backend, and PostgreSQL database. Features custom developer branding in the footer with a link to Shepherd Zisper Phiri's portfolio.

## System Architecture

### Full-Stack Architecture
The application follows a modern full-stack architecture pattern:
- **Frontend**: React with TypeScript, built with Vite
- **Backend**: Express.js server with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Real-time Communication**: WebSocket + WebRTC for low-latency audio streaming
- **UI Framework**: shadcn/ui components with Radix UI primitives and Tailwind CSS

### Monorepo Structure
The codebase is organized as a monorepo with shared types and schemas:
- `client/` - React frontend application
- `server/` - Express.js backend server
- `shared/` - Common TypeScript types and database schemas
- `migrations/` - Database migration files

## Key Components

### Frontend Architecture
- **Component Library**: Built on shadcn/ui with Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens
- **State Management**: React Query for server state, React hooks for local state
- **Routing**: Wouter for lightweight client-side routing
- **Real-time Features**: Custom WebSocket and WebRTC hooks

### Backend Architecture
- **API Layer**: RESTful endpoints for broadcast management
- **WebSocket Server**: Real-time communication for signaling and room management
- **Database Layer**: Drizzle ORM with type-safe database operations
- **Storage Interface**: Abstracted storage layer supporting both memory and database storage

### Database Schema
- **Broadcasts Table**: Stores broadcast metadata (room ID, title, status, audio quality)
- **Listeners Table**: Tracks active listeners per broadcast session
- **Type Safety**: Zod schemas for runtime validation and TypeScript types

## Data Flow

### Broadcasting Flow
1. User creates a broadcast through the BroadcasterPanel
2. Server creates a database record and generates a unique room ID
3. WebSocket connection established for real-time signaling
4. WebRTC peer connection initiated for audio streaming
5. Audio captured from user's microphone and streamed to listeners

### Listening Flow
1. User joins a broadcast using a shared room URL
2. Server validates broadcast existence and active status
3. WebSocket connection established for receiving audio stream
4. WebRTC peer connection receives audio data
5. Audio playback through browser's audio system

### Real-time Updates
- WebSocket messages handle room management and listener counts
- Server broadcasts updates to all connected clients
- Component state synchronized with server state via React Query

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **drizzle-orm**: Type-safe database ORM with PostgreSQL dialect
- **ws**: WebSocket server implementation
- **@tanstack/react-query**: Server state management
- **wouter**: Lightweight React router

### UI Dependencies
- **@radix-ui/***: Accessible UI component primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Type-safe variant styling
- **lucide-react**: Icon library

### Development Dependencies
- **vite**: Fast build tool and development server
- **typescript**: Type safety and development experience
- **tsx**: TypeScript execution for server development

## Deployment Strategy

### Replit Configuration
- **Platform**: Configured for Replit with Node.js 20 and PostgreSQL 16
- **Build Process**: Vite builds frontend to `dist/public`, esbuild bundles server
- **Port Configuration**: Server runs on port 5000, exposed as port 80
- **Environment**: Development and production modes supported

### Production Build
1. Frontend assets built and optimized by Vite
2. Server code bundled with esbuild for Node.js deployment
3. Database migrations applied using Drizzle Kit
4. Static assets served from Express server

### Development Workflow
- Hot module replacement for frontend development
- TypeScript compilation and type checking
- Database schema synchronization with `db:push` command

## Changelog

```
Changelog:
- June 26, 2025. Initial setup with broadcasting platform
- June 26, 2025. Added custom developer branding footer with portfolio link
- June 26, 2025. Fixed TypeScript errors and Select component value props
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```