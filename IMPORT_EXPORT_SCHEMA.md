# Job Search Organizer - Import/Export Schema Documentation

## Overview

The Job Search Organizer supports importing and exporting user data in JSON format. This document describes the schema for the data format used in import/export operations.

## Export Format

When exporting data, the system generates a JSON file with the following structure:

```json
{
  "exportedAt": "2025-01-12T10:30:00.000Z",
  "version": "1.0",
  "data": {
    "contacts": [...],
    "tasks": [...],
    "jobApplications": [...]
  }
}
```

## Import Format

When importing data, the system expects a JSON file with the following structure:

```json
{
  "contacts": [...],
  "tasks": [...]
}
```

Note: Job applications import is not currently implemented.

## Schema Details

### Contact Object

```typescript
{
  "name": string,                    // Required - Contact's full name
  "company": string | null,          // Optional - Company name
  "position": string | null,         // Optional - Job title/position
  "linkedinUrl": string | null,      // Optional - LinkedIn profile URL
  "notes": string | null,            // Optional - Free-form notes about the contact
  "communications": [...]            // Optional - Array of communication objects
}
```

### Communication Object

```typescript
{
  "type": "EMAIL" | "PHONE" | "LINKEDIN" | "TEXT" | "MEETING" | "OTHER",  // Required
  "subject": string | null,          // Optional - Subject/title of the communication
  "content": string | null,          // Optional - Content/notes from the communication
  "date": string,                    // Required - ISO 8601 date string (e.g., "2025-01-15T10:00:00.000Z")
  "duration": number | null,         // Optional - Duration in minutes (mainly for meetings/calls)
  "location": string | null,         // Optional - Location (mainly for meetings)
  "followUpActions": [...]           // Optional - Array of follow-up action objects
}
```

### Follow-Up Action Object

```typescript
{
  "description": string,             // Required - Description of the action
  "dueDate": string | null,          // Optional - ISO 8601 date string for due date
  "priority": "LOW" | "MEDIUM" | "HIGH",  // Optional - Defaults to "MEDIUM"
  "completed": boolean               // Optional - Defaults to false
}
```

### Task Object

```typescript
{
  "title": string,                   // Required - Task title
  "description": string | null,      // Optional - Detailed task description
  "priority": "LOW" | "MEDIUM" | "HIGH",  // Optional - Defaults to "MEDIUM"
  "category": "APPLICATION" | "FOLLOW_UP" | "INTERVIEW_PREP" | "NETWORKING" | "RESUME" | "OTHER",  // Optional - Defaults to "OTHER"
  "dueDate": string | null,          // Optional - ISO 8601 date string for due date
  "completed": boolean,              // Optional - Defaults to false
  "contactName": string | null       // Optional - Links task to a contact by name (must match exactly)
}
```

## Complete Example

```json
{
  "contacts": [
    {
      "name": "Sarah Chen",
      "company": "TechFlow Innovations",
      "position": "Senior Engineering Manager",
      "linkedinUrl": "https://linkedin.com/in/sarahchen",
      "notes": "Met at Bay Area Tech Meetup. Expanding platform team.",
      "communications": [
        {
          "type": "MEETING",
          "subject": "Coffee chat about opportunities",
          "content": "Discussed engineering culture and growth plans.",
          "date": "2025-01-05T15:00:00.000Z",
          "duration": 45,
          "location": "Blue Bottle Coffee, SOMA",
          "followUpActions": [
            {
              "description": "Send resume and portfolio",
              "dueDate": "2025-01-06T09:00:00.000Z",
              "priority": "HIGH",
              "completed": true
            }
          ]
        }
      ]
    }
  ],
  "tasks": [
    {
      "title": "Update portfolio with latest projects",
      "description": "Add React dashboard and Node.js microservice",
      "priority": "HIGH",
      "category": "RESUME",
      "dueDate": "2025-01-06T17:00:00.000Z",
      "completed": false
    },
    {
      "title": "Research TechFlow's products",
      "description": "Study their API platform for interview",
      "priority": "HIGH",
      "category": "INTERVIEW_PREP",
      "dueDate": "2025-01-12T09:00:00.000Z",
      "completed": false,
      "contactName": "Sarah Chen"
    }
  ]
}
```

## Import Behavior

### Contact Matching
- Contacts are created as new entries (no deduplication)
- Task-to-contact linking is done by exact name match

### Data Validation
- All required fields must be present
- Enum values must match exactly (case-sensitive)
- Dates must be valid ISO 8601 format
- Invalid data will cause the entire import to fail

### Atomic Transactions
- Import operations are atomic - either all data is imported successfully or none is
- If any validation error occurs, no data will be imported

### User Association
- All imported data is associated with the authenticated user
- Existing user data is not affected (import is additive only)

## API Endpoints

### Import
- **POST** `/api/import`
- **Auth**: Required (JWT token)
- **Body**: JSON matching the import schema
- **Response**: 
  ```json
  {
    "success": true,
    "message": "Data imported successfully",
    "summary": {
      "contactsCreated": 6,
      "communicationsCreated": 8,
      "followUpActionsCreated": 10,
      "tasksCreated": 8
    }
  }
  ```

### Export
- **GET** `/api/export/user-data`
- **Auth**: Required (JWT token)
- **Response**: JSON file download with complete user data

## Version History

- **v1.0** (2025-01-12): Initial schema version
  - Support for contacts, communications, follow-up actions, and tasks
  - Contact name-based task linking
  - Atomic import transactions

## Notes

1. **Date Format**: All dates must be in ISO 8601 format (e.g., "2025-01-15T10:00:00.000Z")
2. **Null vs Undefined**: Optional fields can be `null` or omitted entirely
3. **Case Sensitivity**: All enum values (type, priority, category) are case-sensitive
4. **Contact Linking**: Tasks can reference contacts by name, but the name must match exactly
5. **No Updates**: Import always creates new records; it never updates existing ones