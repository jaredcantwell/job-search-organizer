# Job Search Organizer

> [!WARNING]
> This project is a 100% Claude Code project, as a personal experiment. Use at your own risk.

A modern web application for managing your job search process, tracking contacts, scheduling meetings, and organizing follow-up tasks.

## Features

### 📋 Contact Management
- Track professional contacts with company and role information
- Add notes and context about each connection
- Sort by name, company, or last interaction date
- Visual indicators for pending tasks and follow-ups

### 💬 Interaction Tracking
- Log meetings, calls, emails, LinkedIn messages, and texts
- Record details like date, duration, and key discussion points
- Attach follow-up actions to any interaction
- View complete history with each contact

### ✅ Smart Task Management
- Create standalone tasks or follow-ups from interactions
- Set priorities (High/Medium/Low) and due dates
- Unified task view shows everything in one place
- Tasks linked to interactions are clickable for context

### 📅 Meeting Management
- Schedule future interactions as upcoming meetings
- View all upcoming meetings organized by date
- Dashboard widget shows your next 5 meetings
- Never miss a follow-up or scheduled call

### 💾 Data Portability
- Export all your data as JSON for backup
- Full ownership of your information
- Easy to import into other tools

## Screenshots

![Dashboard](screenshots/dashboard.png)
*Dashboard with quick stats and upcoming items*

![Contacts](screenshots/contacts.png)
*Contact list with visual indicators*

## Tech Stack

- **Frontend**: React + TypeScript + Vite + TailwindCSS
- **Backend**: Node.js + Express + TypeScript + Prisma
- **Database**: PostgreSQL (Docker)
- **Authentication**: JWT tokens

## Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- Git

## Quick Start

1. **Clone and setup**
   ```bash
   git clone <repository-url>
   cd job-search-organizer
   ```

2. **Start the database**
   ```bash
   docker-compose up -d
   ```

3. **Install and run backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env     # Configure environment
   npx prisma db push        # Setup database
   npm run dev               # Start server (port 3001)
   ```

4. **Install and run frontend** (new terminal)
   ```bash
   cd frontend
   npm install
   npm run dev               # Start app (port 5173)
   ```

5. **Start organizing!**
   - Open http://localhost:5173
   - Create an account
   - Begin tracking your job search

## Usage Guide

### Getting Started
1. **Create an account** - Sign up with email and password
2. **Add contacts** - Start with key people in your network
3. **Log interactions** - Record meetings, calls, and messages
4. **Set follow-ups** - Never forget to circle back
5. **Track progress** - Use the dashboard to stay on top of tasks

### Key Workflows

**After a networking call:**
1. Go to the contact's page
2. Click "Add Interaction"
3. Select "Phone" and add notes
4. Add follow-up actions (e.g., "Send thank you email", "Connect on LinkedIn")
5. These appear in your Tasks automatically

**Scheduling a meeting:**
1. Add an interaction with a future date
2. It appears in Upcoming Meetings
3. Get reminded on your dashboard

**Weekly review:**
1. Check Tasks for overdue items
2. Review Upcoming Meetings
3. Export your data for backup

## Configuration

The only required configuration is creating `backend/.env` from the example:

```bash
cd backend
cp .env.example .env
```

Default settings work for local development. For production deployment, update:
- `JWT_SECRET` - Use a secure random string
- `DATABASE_URL` - Point to your production database

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Development setup
- Code style guidelines  
- Pull request process
- Project structure details

## Support

- **Issues**: [GitHub Issues](https://github.com/YOUR_USERNAME/job-search-organizer/issues)
- **Discussions**: [GitHub Discussions](https://github.com/YOUR_USERNAME/job-search-organizer/discussions)

## License

[Choose appropriate license]

## Acknowledgments

Built with modern web technologies to make job searching more organized and less stressful.