import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.use(authenticate);

// Validation schemas
const companySchema = z.object({
  name: z.string().min(1),
  website: z.string().url().optional(),
  industry: z.string().optional(),
  size: z.enum(['STARTUP', 'SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE', 'UNKNOWN']).optional(),
  location: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  founded: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  status: z.enum(['OPPORTUNITY', 'TARGET', 'RESEARCH', 'WATCHING', 'ARCHIVED']).optional(),
});

// Get all companies for user
router.get('/', async (req: AuthRequest, res) => {
  const { search, industry, size, status } = req.query;
  
  const where: any = {
    userId: req.userId!,
  };
  
  if (search) {
    where.OR = [
      { name: { contains: search as string, mode: 'insensitive' } },
      { description: { contains: search as string, mode: 'insensitive' } },
    ];
  }
  
  if (industry) where.industry = industry;
  if (size) where.size = size;
  if (status) where.status = status;

  const companies = await prisma.company.findMany({
    where,
    include: {
      _count: {
        select: {
          applications: true,
          contacts: true,
        },
      },
    },
    orderBy: [
      {
        status: 'asc', // Order by status priority: OPPORTUNITY, TARGET, RESEARCH, WATCHING, ARCHIVED
      },
      {
        name: 'asc',
      },
    ],
  });

  res.json(companies);
});

// Get company by ID
router.get('/:id', async (req: AuthRequest, res) => {
  const company = await prisma.company.findFirst({
    where: {
      id: req.params.id,
      userId: req.userId!,
    },
    include: {
      applications: {
        include: {
          contact: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      contacts: {
        orderBy: { name: 'asc' },
      },
      _count: {
        select: {
          applications: true,
          contacts: true,
        },
      },
    },
  });

  if (!company) {
    throw new AppError(404, 'Company not found');
  }

  res.json(company);
});

// Create company
router.post('/', async (req: AuthRequest, res) => {
  const data = companySchema.parse(req.body);
  
  // Check if company with this name already exists for this user
  const existing = await prisma.company.findFirst({
    where: {
      userId: req.userId!,
      name: data.name,
    },
  });

  if (existing) {
    throw new AppError(400, 'Company with this name already exists');
  }
  
  const company = await prisma.company.create({
    data: {
      ...data,
      userId: req.userId!,
    },
    include: {
      _count: {
        select: {
          applications: true,
          contacts: true,
        },
      },
    },
  });

  res.status(201).json(company);
});

// Update company
router.put('/:id', async (req: AuthRequest, res) => {
  const data = companySchema.partial().parse(req.body);
  
  const existing = await prisma.company.findFirst({
    where: {
      id: req.params.id,
      userId: req.userId!,
    },
  });

  if (!existing) {
    throw new AppError(404, 'Company not found');
  }

  // Check for name conflicts if name is being updated
  if (data.name && data.name !== existing.name) {
    const nameConflict = await prisma.company.findFirst({
      where: {
        userId: req.userId!,
        name: data.name,
        id: { not: req.params.id },
      },
    });

    if (nameConflict) {
      throw new AppError(400, 'Company with this name already exists');
    }
  }

  const company = await prisma.company.update({
    where: { id: req.params.id },
    data,
    include: {
      _count: {
        select: {
          applications: true,
          contacts: true,
        },
      },
    },
  });

  res.json(company);
});

// Delete company
router.delete('/:id', async (req: AuthRequest, res) => {
  const existing = await prisma.company.findFirst({
    where: {
      id: req.params.id,
      userId: req.userId!,
    },
    include: {
      _count: {
        select: {
          applications: true,
          contacts: true,
        },
      },
    },
  });

  if (!existing) {
    throw new AppError(404, 'Company not found');
  }

  if (existing._count.applications > 0 || existing._count.contacts > 0) {
    throw new AppError(400, 'Cannot delete company with existing applications or contacts');
  }

  await prisma.company.delete({
    where: { id: req.params.id },
  });

  res.status(204).send();
});

// Get company research
router.get('/:id/research', async (req: AuthRequest, res) => {
  const company = await prisma.company.findFirst({
    where: {
      id: req.params.id,
      userId: req.userId!,
    },
  });

  if (!company) {
    throw new AppError(404, 'Company not found');
  }

  const research = await prisma.research.findMany({
    where: {
      userId: req.userId!,
      targetId: req.params.id,
      targetType: 'COMPANY',
    },
    include: {
      links: true,
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });

  res.json(research);
});

// Find or create company by name (helper endpoint for migration)
router.post('/find-or-create', async (req: AuthRequest, res) => {
  const { name } = z.object({ name: z.string().min(1) }).parse(req.body);
  
  let company = await prisma.company.findFirst({
    where: {
      userId: req.userId!,
      name,
    },
  });

  if (!company) {
    company = await prisma.company.create({
      data: {
        name,
        userId: req.userId!,
      },
    });
  }

  res.json(company);
});

export { router as companiesRouter };