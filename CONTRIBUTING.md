# Contributing to Job Search Organizer

Thank you for your interest in contributing to Job Search Organizer! This document provides guidelines and information for contributors.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/job-search-organizer.git`
3. Add upstream remote: `git remote add upstream https://github.com/ORIGINAL_OWNER/job-search-organizer.git`
4. Create a feature branch: `git checkout -b feature/your-feature-name`

## Development Setup

Follow the Quick Start guide in the README first, then:

1. **Install development dependencies**
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

2. **Set up your development environment**
   - Copy `backend/.env.example` to `backend/.env`
   - Update JWT_SECRET with a secure value for development

## Project Structure

```
job-search-organizer/
├── backend/              # Express API server
│   ├── src/
│   │   ├── routes/      # API endpoints
│   │   │   ├── auth.ts         # Authentication
│   │   │   ├── contacts.ts     # Contact management
│   │   │   ├── communications.ts # Interactions
│   │   │   ├── tasks.ts        # Task management
│   │   │   └── export.ts       # Data export
│   │   ├── middleware/  # Express middleware
│   │   │   ├── auth.ts         # JWT verification
│   │   │   └── errorHandler.ts # Global error handling
│   │   └── utils/       # Utilities
│   │       └── prisma.ts       # Database client
│   └── prisma/
│       └── schema.prisma # Database schema
├── frontend/             # React application
│   └── src/
│       ├── components/  # Reusable UI components
│       │   ├── Layout.tsx      # App layout
│       │   ├── InteractionForm.tsx # Interaction forms
│       │   └── TaskForm.tsx    # Task forms
│       ├── pages/       # Page components
│       │   ├── Dashboard.tsx   # Home dashboard
│       │   ├── ContactsList.tsx # Contacts view
│       │   └── UpcomingMeetings.tsx # Meetings view
│       └── lib/         # Core utilities
│           ├── api.ts          # API client
│           └── store.ts        # Zustand stores
└── docker-compose.yml   # PostgreSQL container
```

## Development Commands

### Backend Development
```bash
cd backend
npm run dev              # Start with hot reload (port 3001)
npm run build            # TypeScript build
npm run start            # Production mode
npx prisma studio        # Visual database editor
npx prisma db push       # Sync schema changes
npx prisma generate      # Regenerate Prisma client
```

### Frontend Development
```bash
cd frontend
npm run dev              # Start with hot reload (port 5173)
npm run build            # Production build
npm run preview          # Preview production build
npm run type-check       # Run TypeScript checks
```

### Database Management
```bash
# From root directory
docker-compose up -d     # Start PostgreSQL
docker-compose down      # Stop PostgreSQL
docker-compose logs -f   # View database logs
docker-compose exec postgres psql -U postgres jobsearch  # Direct DB access
```

## Code Style Guidelines

### TypeScript
- Use TypeScript for all new code
- Define interfaces for all API responses
- Avoid `any` types - use `unknown` if type is truly unknown
- Export types from a central `types/` directory when shared

### React Components
- Use functional components with hooks
- Keep components focused and under 200 lines
- Extract reusable logic into custom hooks
- Use semantic HTML elements

### API Design
- Follow RESTful conventions
- Use proper HTTP status codes
- Validate all inputs with Zod schemas
- Return consistent error formats

### Database
- Name tables in plural (e.g., `contacts`, `tasks`)
- Use camelCase for column names
- Add appropriate indexes for foreign keys
- Always use transactions for multi-table updates

## Testing

Currently, the project needs test coverage. When adding tests:

- Place tests next to the code they test
- Use `.test.ts` or `.test.tsx` extensions
- Write unit tests for utilities and hooks
- Write integration tests for API endpoints
- Use React Testing Library for components

## Making Changes

1. **Before starting work**
   - Sync with upstream: `git fetch upstream`
   - Update your main branch: `git checkout main && git merge upstream/main`
   - Create a feature branch: `git checkout -b feature/your-feature`

2. **While working**
   - Make atomic commits with clear messages
   - Follow conventional commits format: `type(scope): description`
   - Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
   - Run linting before committing

3. **Commit message examples**
   ```
   feat(contacts): add bulk import functionality
   fix(auth): resolve token expiration issue
   docs(readme): update installation instructions
   refactor(api): simplify error handling middleware
   ```

4. **Before submitting PR**
   - Rebase on latest main: `git rebase upstream/main`
   - Ensure all checks pass
   - Update documentation if needed
   - Test your changes thoroughly

## Pull Request Process

1. **Create Pull Request**
   - Use a descriptive title
   - Reference any related issues
   - Describe what changes you made and why
   - Include screenshots for UI changes

2. **PR Template**
   ```markdown
   ## Description
   Brief description of changes

   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update

   ## Testing
   - [ ] Tested locally
   - [ ] Added/updated tests
   - [ ] All tests pass

   ## Screenshots (if applicable)
   ```

3. **Code Review**
   - Address reviewer feedback promptly
   - Push fixes as new commits (don't force push)
   - Mark conversations as resolved

## API Documentation

### Authentication
All API routes except `/auth/*` require JWT token in Authorization header:
```
Authorization: Bearer <token>
```

### Main Endpoints

**Authentication**
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login

**Contacts**
- `GET /api/contacts` - List contacts with pagination
- `POST /api/contacts` - Create contact
- `PUT /api/contacts/:id` - Update contact
- `DELETE /api/contacts/:id` - Delete contact

**Communications (Interactions)**
- `GET /api/communications/contact/:contactId` - Get interactions
- `POST /api/communications` - Create interaction
- `PUT /api/communications/:id` - Update interaction
- `GET /api/communications/upcoming` - Get future meetings

**Tasks**
- `GET /api/tasks` - List manual tasks
- `POST /api/tasks` - Create task
- `GET /api/tasks/unified` - Get all tasks (manual + follow-ups)

**Export**
- `GET /api/export/user-data` - Export all user data as JSON

## Troubleshooting Development Issues

### Database Issues
```bash
# Reset database completely
docker-compose down -v
docker-compose up -d
cd backend && npx prisma db push

# View Prisma query logs
DEBUG=prisma:query npm run dev
```

### Port Conflicts
```bash
# Find and kill process on port
lsof -ti:3001 | xargs kill -9  # Backend
lsof -ti:5173 | xargs kill -9  # Frontend
lsof -ti:5432 | xargs kill -9  # PostgreSQL
```

### Authentication Issues
- Check JWT_SECRET is set in .env
- Clear localStorage in browser
- Verify token expiration settings

### Build Issues
```bash
# Clear all node_modules and reinstall
rm -rf node_modules package-lock.json
rm -rf backend/node_modules backend/package-lock.json
rm -rf frontend/node_modules frontend/package-lock.json
npm install # from root
```

## Security Considerations

- Never commit `.env` files
- Use parameterized queries (Prisma handles this)
- Validate all user inputs
- Sanitize data before display
- Keep dependencies updated
- Use HTTPS in production

## Questions?

- Open an issue for bugs or feature requests
- Start a discussion for questions
- Tag maintainers for urgent issues

Thank you for contributing! 🎉