import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.use(authenticate);

const createCommunicationSchema = z.object({
  contactId: z.string(),
  type: z.enum(['EMAIL', 'PHONE', 'LINKEDIN', 'TEXT', 'MEETING', 'OTHER']),
  subject: z.string().optional(),
  content: z.string().optional(),
  date: z.string().datetime(),
  duration: z.number().int().positive().optional().nullable(),
  location: z.string().optional(),
  followUpActions: z.array(z.object({
    description: z.string().min(1),
    dueDate: z.string().datetime().optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  })).optional().default([]),
});

const updateCommunicationSchema = createCommunicationSchema.partial().omit({ contactId: true });

const updateFollowUpActionSchema = z.object({
  description: z.string().min(1).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  completed: z.boolean().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
});

// Get all communications for a contact
router.get('/contact/:contactId', async (req: AuthRequest, res) => {
  // First verify the contact belongs to the user
  const contact = await prisma.contact.findFirst({
    where: {
      id: req.params.contactId,
      userId: req.userId!,
    },
  });

  if (!contact) {
    throw new AppError(404, 'Contact not found');
  }

  const communications = await prisma.communication.findMany({
    where: {
      contactId: req.params.contactId,
    },
    include: {
      followUpActions: {
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { date: 'desc' },
  });

  res.json(communications);
});

// Get upcoming meetings (future-dated communications)
router.get('/upcoming', async (req: AuthRequest, res) => {
  const now = new Date();
  
  const upcomingMeetings = await prisma.communication.findMany({
    where: {
      contact: {
        userId: req.userId!,
      },
      date: {
        gte: now, // Greater than or equal to now (future dates)
      },
    },
    include: {
      contact: {
        select: {
          id: true,
          name: true,
          company: true,
        },
      },
    },
    orderBy: {
      date: 'asc',
    },
  });

  res.json(upcomingMeetings);
});

// Get a single communication
router.get('/:id', async (req: AuthRequest, res) => {
  const communication = await prisma.communication.findFirst({
    where: {
      id: req.params.id,
      contact: {
        userId: req.userId!,
      },
    },
    include: {
      followUpActions: {
        orderBy: { createdAt: 'asc' },
      },
      contact: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!communication) {
    throw new AppError(404, 'Communication not found');
  }

  res.json(communication);
});

// Create a new communication
router.post('/', async (req: AuthRequest, res) => {
  const data = createCommunicationSchema.parse(req.body);

  // Verify the contact belongs to the user
  const contact = await prisma.contact.findFirst({
    where: {
      id: data.contactId,
      userId: req.userId!,
    },
  });

  if (!contact) {
    throw new AppError(404, 'Contact not found');
  }

  const communication = await prisma.communication.create({
    data: {
      contactId: data.contactId,
      type: data.type,
      subject: data.subject,
      content: data.content,
      date: new Date(data.date),
      duration: data.duration,
      location: data.location,
      followUpActions: {
        create: data.followUpActions?.map(action => ({
          description: action.description,
          dueDate: action.dueDate ? new Date(action.dueDate) : null,
          priority: action.priority,
        })) || [],
      },
    },
    include: {
      followUpActions: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  res.status(201).json(communication);
});

// Update a communication
router.put('/:id', async (req: AuthRequest, res) => {
  const data = updateCommunicationSchema.parse(req.body);

  const communication = await prisma.communication.findFirst({
    where: {
      id: req.params.id,
      contact: {
        userId: req.userId!,
      },
    },
  });

  if (!communication) {
    throw new AppError(404, 'Communication not found');
  }

  const updated = await prisma.communication.update({
    where: { id: req.params.id },
    data: {
      ...(data.type && { type: data.type }),
      ...(data.subject !== undefined && { subject: data.subject }),
      ...(data.content !== undefined && { content: data.content }),
      ...(data.date && { date: new Date(data.date) }),
      ...(data.duration !== undefined && { duration: data.duration }),
      ...(data.location !== undefined && { location: data.location }),
    },
    include: {
      followUpActions: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  res.json(updated);
});

// Delete a communication
router.delete('/:id', async (req: AuthRequest, res) => {
  const communication = await prisma.communication.findFirst({
    where: {
      id: req.params.id,
      contact: {
        userId: req.userId!,
      },
    },
  });

  if (!communication) {
    throw new AppError(404, 'Communication not found');
  }

  await prisma.communication.delete({
    where: { id: req.params.id },
  });

  res.status(204).send();
});

// Follow-up action routes
router.post('/:communicationId/follow-up-actions', async (req: AuthRequest, res) => {
  const data = z.object({
    description: z.string().min(1),
    dueDate: z.string().datetime().optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  }).parse(req.body);

  // Verify the communication belongs to the user
  const communication = await prisma.communication.findFirst({
    where: {
      id: req.params.communicationId,
      contact: {
        userId: req.userId!,
      },
    },
  });

  if (!communication) {
    throw new AppError(404, 'Communication not found');
  }

  const followUpAction = await prisma.followUpAction.create({
    data: {
      communicationId: req.params.communicationId,
      description: data.description,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      priority: data.priority,
    },
  });

  res.status(201).json(followUpAction);
});

router.put('/follow-up-actions/:id', async (req: AuthRequest, res) => {
  const data = updateFollowUpActionSchema.parse(req.body);

  const followUpAction = await prisma.followUpAction.findFirst({
    where: {
      id: req.params.id,
      communication: {
        contact: {
          userId: req.userId!,
        },
      },
    },
  });

  if (!followUpAction) {
    throw new AppError(404, 'Follow-up action not found');
  }

  const updated = await prisma.followUpAction.update({
    where: { id: req.params.id },
    data: {
      ...(data.description && { description: data.description }),
      ...(data.dueDate !== undefined && { dueDate: data.dueDate ? new Date(data.dueDate) : null }),
      ...(data.completed !== undefined && { completed: data.completed }),
      ...(data.priority && { priority: data.priority }),
    },
  });

  res.json(updated);
});

router.delete('/follow-up-actions/:id', async (req: AuthRequest, res) => {
  const followUpAction = await prisma.followUpAction.findFirst({
    where: {
      id: req.params.id,
      communication: {
        contact: {
          userId: req.userId!,
        },
      },
    },
  });

  if (!followUpAction) {
    throw new AppError(404, 'Follow-up action not found');
  }

  await prisma.followUpAction.delete({
    where: { id: req.params.id },
  });

  res.status(204).send();
});

export { router as communicationsRouter };