import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.use(authenticate);

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  category: z.enum(['APPLICATION', 'FOLLOW_UP', 'INTERVIEW_PREP', 'NETWORKING', 'RESUME', 'OTHER']).default('OTHER'),
  applicationId: z.string().optional(),
  contactId: z.string().optional(),
});

const updateTaskSchema = createTaskSchema.partial();

// Get all manual tasks for the authenticated user
router.get('/', async (req: AuthRequest, res) => {
  const tasks = await prisma.task.findMany({
    where: {
      userId: req.userId!,
    },
    include: {
      application: {
        select: {
          id: true,
          company: true,
          position: true,
        },
      },
      contact: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [
      { completed: 'asc' },
      { dueDate: 'asc' },
      { priority: 'desc' },
    ],
  });

  res.json(tasks);
});

// Get unified view of tasks and follow-up actions
router.get('/unified', async (req: AuthRequest, res) => {
  const { filter, priority, status } = req.query;

  // Get manual tasks
  const tasksPromise = prisma.task.findMany({
    where: {
      userId: req.userId!,
      ...(priority && { priority: priority as string }),
      ...(status === 'completed' ? { completed: true } : status === 'pending' ? { completed: false } : {}),
    },
    include: {
      application: {
        select: {
          id: true,
          company: true,
          position: true,
        },
      },
      contact: {
        select: {
          id: true,
          name: true,
          company: true,
        },
      },
    },
  });

  // Get follow-up actions from communications
  const followUpActionsPromise = prisma.followUpAction.findMany({
    where: {
      communication: {
        contact: {
          userId: req.userId!,
        },
      },
      ...(priority && { priority: priority as string }),
      ...(status === 'completed' ? { completed: true } : status === 'pending' ? { completed: false } : {}),
    },
    include: {
      communication: {
        select: {
          id: true,
          type: true,
          date: true,
          contact: {
            select: {
              id: true,
              name: true,
              company: true,
            },
          },
        },
      },
    },
  });

  const [tasks, followUpActions] = await Promise.all([tasksPromise, followUpActionsPromise]);

  // Transform and combine into unified format
  const unifiedTasks = [
    ...tasks.map(task => ({
      id: task.id,
      type: 'manual' as const,
      title: task.title,
      description: task.description,
      priority: task.priority,
      dueDate: task.dueDate,
      completed: task.completed,
      category: task.category,
      createdAt: task.createdAt,
      source: task.application ? {
        type: 'application' as const,
        id: task.application.id,
        name: `${task.application.position} at ${task.application.company}`,
      } : task.contact ? {
        type: 'contact' as const,
        id: task.contact.id,
        name: task.contact.name,
      } : null,
    })),
    ...followUpActions.map(action => ({
      id: action.id,
      type: 'followup' as const,
      title: action.description,
      description: null,
      priority: action.priority,
      dueDate: action.dueDate,
      completed: action.completed,
      category: 'FOLLOW_UP' as const,
      createdAt: action.createdAt,
      source: {
        type: 'contact' as const,
        id: action.communication.contact.id,
        name: action.communication.contact.name,
        interactionDate: action.communication.date,
        interactionType: action.communication.type,
      },
    })),
  ];

  // Sort by completion status, due date, and priority
  unifiedTasks.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    if (a.dueDate && !b.dueDate) return -1;
    if (!a.dueDate && b.dueDate) return 1;
    const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });

  // Apply source filter if specified
  let filteredTasks = unifiedTasks;
  if (filter === 'manual') {
    filteredTasks = unifiedTasks.filter(task => task.type === 'manual');
  } else if (filter === 'followup') {
    filteredTasks = unifiedTasks.filter(task => task.type === 'followup');
  }

  res.json(filteredTasks);
});

// Get a single task
router.get('/:id', async (req: AuthRequest, res) => {
  const task = await prisma.task.findFirst({
    where: {
      id: req.params.id,
      userId: req.userId!,
    },
    include: {
      application: true,
      contact: true,
    },
  });

  if (!task) {
    throw new AppError(404, 'Task not found');
  }

  res.json(task);
});

// Create a new task
router.post('/', async (req: AuthRequest, res) => {
  const data = createTaskSchema.parse(req.body);

  const task = await prisma.task.create({
    data: {
      ...data,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      userId: req.userId!,
    },
  });

  res.status(201).json(task);
});

// Update a task
router.put('/:id', async (req: AuthRequest, res) => {
  const data = updateTaskSchema.parse(req.body);

  const task = await prisma.task.findFirst({
    where: {
      id: req.params.id,
      userId: req.userId!,
    },
  });

  if (!task) {
    throw new AppError(404, 'Task not found');
  }

  const updated = await prisma.task.update({
    where: { id: req.params.id },
    data: {
      ...data,
      dueDate: data.dueDate !== undefined ? (data.dueDate ? new Date(data.dueDate) : null) : undefined,
    },
  });

  res.json(updated);
});

// Toggle task completion
router.patch('/:id/toggle', async (req: AuthRequest, res) => {
  const task = await prisma.task.findFirst({
    where: {
      id: req.params.id,
      userId: req.userId!,
    },
  });

  if (!task) {
    throw new AppError(404, 'Task not found');
  }

  const updated = await prisma.task.update({
    where: { id: req.params.id },
    data: {
      completed: !task.completed,
    },
  });

  res.json(updated);
});

// Delete a task
router.delete('/:id', async (req: AuthRequest, res) => {
  const task = await prisma.task.findFirst({
    where: {
      id: req.params.id,
      userId: req.userId!,
    },
  });

  if (!task) {
    throw new AppError(404, 'Task not found');
  }

  await prisma.task.delete({
    where: { id: req.params.id },
  });

  res.status(204).send();
});

// Get tasks for a specific contact
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

  const tasks = await prisma.task.findMany({
    where: {
      contactId: req.params.contactId,
      userId: req.userId!,
    },
    orderBy: [
      { completed: 'asc' },
      { dueDate: 'asc' },
      { priority: 'desc' },
    ],
  });

  res.json(tasks);
});

export { router as tasksRouter };