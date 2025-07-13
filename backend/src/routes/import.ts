import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.use(authenticate);

// Schema for import data validation
const importSchema = z.object({
  companies: z.array(z.object({
    name: z.string(),
    website: z.string().nullable().optional(),
    industry: z.string().nullable().optional(),
    size: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    founded: z.number().nullable().optional(),
    research: z.array(z.object({
      title: z.string(),
      content: z.string(),
      source: z.string().nullable().optional(),
      tags: z.array(z.string()).optional().default([]),
      date: z.string(),
    })).optional().default([]),
  })).optional().default([]),
  contacts: z.array(z.object({
    name: z.string(),
    email: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    company: z.string().nullable().optional(), // Legacy field
    companyName: z.string().nullable().optional(), // New field to link to Company
    position: z.string().nullable().optional(),
    linkedinUrl: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    type: z.enum(['RECRUITER', 'HIRING_MANAGER', 'REFERRAL', 'COLLEAGUE', 'OTHER']).default('OTHER'),
    communications: z.array(z.object({
      type: z.enum(['EMAIL', 'PHONE', 'LINKEDIN', 'TEXT', 'MEETING', 'OTHER']),
      subject: z.string().nullable().optional(),
      content: z.string().nullable().optional(),
      date: z.string(),
      duration: z.number().nullable().optional(),
      location: z.string().nullable().optional(),
      followUpActions: z.array(z.object({
        description: z.string(),
        dueDate: z.string().nullable().optional(),
        priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
        completed: z.boolean().default(false),
      })).optional().default([]),
    })).optional().default([]),
  })),
  tasks: z.array(z.object({
    title: z.string(),
    description: z.string().nullable().optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
    category: z.enum(['APPLICATION', 'FOLLOW_UP', 'INTERVIEW_PREP', 'NETWORKING', 'RESUME', 'OTHER']).default('OTHER'),
    dueDate: z.string().nullable().optional(),
    completed: z.boolean().default(false),
    contactName: z.string().nullable().optional(), // Link to contact by name
  })).optional().default([]),
});

// Import user data
router.post('/', async (req: AuthRequest, res) => {
  const data = importSchema.parse(req.body);

  // Use a transaction to ensure all data is imported atomically
  const result = await prisma.$transaction(async (tx) => {
    const contactMap = new Map<string, string>(); // name -> id mapping
    const companyMap = new Map<string, string>(); // name -> id mapping
    const createdCompanies = [];
    const createdResearch = [];
    const createdContacts = [];
    const createdCommunications = [];
    const createdTasks = [];
    const createdFollowUpActions = [];

    // 1. Create companies first
    for (const companyData of data.companies || []) {
      const company = await tx.company.create({
        data: {
          userId: req.userId!,
          name: companyData.name,
          website: companyData.website || null,
          industry: companyData.industry || null,
          size: companyData.size || null,
          location: companyData.location || null,
          description: companyData.description || null,
          notes: companyData.notes || null,
          founded: companyData.founded || null,
        },
      });
      
      companyMap.set(companyData.name, company.id);
      createdCompanies.push(company);

      // Create research for this company
      for (const researchData of companyData.research || []) {
        const research = await tx.research.create({
          data: {
            userId: req.userId!,
            companyId: company.id,
            title: researchData.title,
            content: researchData.content,
            source: researchData.source || null,
            tags: researchData.tags || [],
            date: new Date(researchData.date),
          },
        });
        
        createdResearch.push(research);
      }
    }

    // 2. Create contacts
    for (const contactData of data.contacts) {
      let companyId = null;
      
      // Try to link to company if specified
      if (contactData.companyName && companyMap.has(contactData.companyName)) {
        companyId = companyMap.get(contactData.companyName)!;
      }

      const contact = await tx.contact.create({
        data: {
          userId: req.userId!,
          name: contactData.name,
          email: contactData.email || null,
          phone: contactData.phone || null,
          company: contactData.company || null, // Legacy field
          companyId: companyId,
          position: contactData.position || null,
          linkedinUrl: contactData.linkedinUrl || null,
          notes: contactData.notes || null,
          type: contactData.type || 'OTHER',
        },
      });
      
      contactMap.set(contactData.name, contact.id);
      createdContacts.push(contact);

      // 3. Create communications for this contact
      for (const commData of contactData.communications || []) {
        const communication = await tx.communication.create({
          data: {
            contactId: contact.id,
            type: commData.type,
            subject: commData.subject || null,
            content: commData.content || null,
            date: new Date(commData.date),
            duration: commData.duration || null,
            location: commData.location || null,
          },
        });
        
        createdCommunications.push(communication);

        // 4. Create follow-up actions for this communication
        for (const actionData of commData.followUpActions || []) {
          const followUpAction = await tx.followUpAction.create({
            data: {
              communicationId: communication.id,
              description: actionData.description,
              dueDate: actionData.dueDate ? new Date(actionData.dueDate) : null,
              priority: actionData.priority,
              completed: actionData.completed,
            },
          });
          
          createdFollowUpActions.push(followUpAction);
        }
      }
    }

    // 5. Create standalone tasks
    for (const taskData of data.tasks || []) {
      let contactId = null;
      
      // Try to link task to contact by name if provided
      if (taskData.contactName && contactMap.has(taskData.contactName)) {
        contactId = contactMap.get(taskData.contactName)!;
      }

      const task = await tx.task.create({
        data: {
          userId: req.userId!,
          contactId,
          title: taskData.title,
          description: taskData.description || null,
          priority: taskData.priority,
          category: taskData.category,
          dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
          completed: taskData.completed,
        },
      });
      
      createdTasks.push(task);
    }

    return {
      companiesCreated: createdCompanies.length,
      researchCreated: createdResearch.length,
      contactsCreated: createdContacts.length,
      communicationsCreated: createdCommunications.length,
      followUpActionsCreated: createdFollowUpActions.length,
      tasksCreated: createdTasks.length,
    };
  });

  res.json({
    success: true,
    message: 'Data imported successfully',
    summary: result,
  });
});

export { router as importRouter };