import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.use(authenticate);

// Schema for import data validation
const importSchema = z.object({
  contacts: z.array(z.object({
    name: z.string(),
    company: z.string().nullable().optional(),
    position: z.string().nullable().optional(),
    linkedinUrl: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
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
    const createdContacts = [];
    const createdCommunications = [];
    const createdTasks = [];
    const createdFollowUpActions = [];

    // 1. Create contacts first
    for (const contactData of data.contacts) {
      const contact = await tx.contact.create({
        data: {
          userId: req.userId!,
          name: contactData.name,
          company: contactData.company || null,
          position: contactData.position || null,
          linkedinUrl: contactData.linkedinUrl || null,
          notes: contactData.notes || null,
        },
      });
      
      contactMap.set(contactData.name, contact.id);
      createdContacts.push(contact);

      // 2. Create communications for this contact
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

        // 3. Create follow-up actions for this communication
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

    // 4. Create standalone tasks
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