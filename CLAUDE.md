# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

Job Search Organizer is a full-stack web application designed to help users manage their job search activities, including contact management, application tracking, task management, and analytics.

## Architecture

- **Frontend**: Single Page Application using React + TypeScript + Vite
- **Backend**: REST API using Express + TypeScript + Prisma
- **Database**: PostgreSQL (containerized with Docker)
- **State Management**: Zustand (client state) + TanStack Query (server state)
- **Authentication**: JWT-based authentication

## Key Commands

```bash
# Install all dependencies (root, backend, and frontend)
npm run install:all

# Start everything (DB + Backend + Frontend)
npm run dev

# Individual services
npm run dev:db       # PostgreSQL only
npm run dev:backend  # Express API only
npm run dev:frontend # React app only

# Database management
cd backend && npm run prisma:migrate  # Run migrations
cd backend && npm run prisma:studio   # Open Prisma Studio
cd backend && npm run prisma:generate # Generate Prisma client

# Code quality
npm run lint      # Run ESLint on both projects
npm run typecheck # TypeScript type checking
```

## Development Workflow

1. **Database changes**: Edit `backend/prisma/schema.prisma`, then run migrations
2. **API development**: Add routes in `backend/src/routes/`, use Prisma for DB access
3. **Frontend development**: Components in `frontend/src/components/`, pages in `frontend/src/pages/`
4. **Authentication**: JWT tokens stored in Zustand, automatically attached to API requests

## Key Design Patterns

- **API Structure**: RESTful endpoints with `/api` prefix
- **Error Handling**: Centralized error middleware with custom AppError class
- **Validation**: Zod schemas for request validation
- **State Management**: Zustand stores for client state, TanStack Query for server state
- **Type Safety**: Shared types between frontend and backend (consider adding a shared types package)

## Important Files

- `backend/prisma/schema.prisma` - Database schema definition
- `backend/src/middleware/auth.ts` - JWT authentication middleware
- `frontend/src/lib/api.ts` - Axios instance with interceptors
- `frontend/src/lib/store.ts` - Zustand auth store
- `docker-compose.yml` - PostgreSQL container configuration

## Environment Variables

Backend requires `.env` file with:
- DATABASE_URL
- JWT_SECRET
- JWT_EXPIRES_IN
- FRONTEND_URL

## Common Tasks

### Adding a new API endpoint
1. Create route file in `backend/src/routes/`
2. Add validation schema with Zod
3. Implement Prisma queries in route handlers
4. Register route in `backend/src/index.ts`

### Adding a new frontend page
1. Create component in `frontend/src/pages/`
2. Add route in `frontend/src/App.tsx`
3. Use TanStack Query for data fetching
4. Use React Hook Form for forms

### Modifying the database schema
1. Edit `backend/prisma/schema.prisma`
2. Run `cd backend && npm run prisma:migrate dev`
3. Update TypeScript types will be auto-generated

## Git & PR Management

### Replying to PR Review Comments
When addressing PR feedback, reply directly to existing comment threads rather than creating new comments:

```bash
# Reply to a specific review comment thread
gh api repos/owner/repo/pulls/PR_NUMBER/comments/COMMENT_ID/replies -X POST -f body="Your reply text"
```

**Important Notes:**
- Use the exact comment ID from the original review comment
- This creates proper threaded replies (with `in_reply_to_id` field)
- Standard `gh pr comment` creates new standalone comments, not replies
- Always address all PR feedback with direct replies for proper audit trail

### Commit Message Format
Follow the established pattern for commit messages:
```
Brief summary of changes

## Detailed Description
- List major changes
- Include technical details
- Reference any breaking changes

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

## Notes

- Frontend proxies `/api` requests to backend (configured in Vite)
- Authentication required for all routes except `/api/auth/*`
- File uploads stored locally in development (add S3 for production)
- Use Prisma Studio to view/edit database during development