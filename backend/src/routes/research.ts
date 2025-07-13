import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.use(authenticate);

// Validation schemas
const researchSchema = z.object({
  title: z.string().min(1),
  type: z.enum(['CONTACT', 'COMPANY', 'INDUSTRY', 'COMPETITIVE', 'GENERAL']).default('GENERAL'),
  targetId: z.string().optional(),
  targetType: z.enum(['CONTACT', 'APPLICATION', 'COMPANY']).optional(),
  summary: z.string().optional(),
  findings: z.array(z.string()).default([]),
  notes: z.string().optional(),
  importance: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  tags: z.array(z.string()).default([]),
});

const researchLinkSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  description: z.string().optional(),
  type: z.enum(['ARTICLE', 'VIDEO', 'SOCIAL', 'COMPANY_PAGE', 'NEWS', 'GLASSDOOR', 'LINKEDIN', 'GITHUB', 'OTHER']).default('OTHER'),
});

// Get all research for user
router.get('/', async (req: AuthRequest, res) => {
  const { type, targetType, targetId, tags } = req.query;
  
  const where: any = {
    userId: req.userId!,
  };
  
  if (type) where.type = type;
  if (targetType) where.targetType = targetType;
  if (targetId) where.targetId = targetId;
  if (tags) {
    const tagArray = Array.isArray(tags) ? tags : [tags];
    where.tags = {
      hasSome: tagArray,
    };
  }

  const research = await prisma.research.findMany({
    where,
    include: {
      links: true,
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });

  res.json(research);
});

// Get research by ID
router.get('/:id', async (req: AuthRequest, res) => {
  const research = await prisma.research.findFirst({
    where: {
      id: req.params.id,
      userId: req.userId!,
    },
    include: {
      links: true,
    },
  });

  if (!research) {
    throw new AppError(404, 'Research not found');
  }

  res.json(research);
});

// Create research
router.post('/', async (req: AuthRequest, res) => {
  const data = researchSchema.parse(req.body);
  
  const research = await prisma.research.create({
    data: {
      ...data,
      userId: req.userId!,
    },
    include: {
      links: true,
    },
  });

  res.status(201).json(research);
});

// Update research
router.put('/:id', async (req: AuthRequest, res) => {
  const data = researchSchema.partial().parse(req.body);
  
  const existing = await prisma.research.findFirst({
    where: {
      id: req.params.id,
      userId: req.userId!,
    },
  });

  if (!existing) {
    throw new AppError(404, 'Research not found');
  }

  const research = await prisma.research.update({
    where: { id: req.params.id },
    data,
    include: {
      links: true,
    },
  });

  res.json(research);
});

// Delete research
router.delete('/:id', async (req: AuthRequest, res) => {
  const existing = await prisma.research.findFirst({
    where: {
      id: req.params.id,
      userId: req.userId!,
    },
  });

  if (!existing) {
    throw new AppError(404, 'Research not found');
  }

  await prisma.research.delete({
    where: { id: req.params.id },
  });

  res.status(204).send();
});

// Research Links endpoints

// Add link to research
router.post('/:id/links', async (req: AuthRequest, res) => {
  const linkData = researchLinkSchema.parse(req.body);
  
  const research = await prisma.research.findFirst({
    where: {
      id: req.params.id,
      userId: req.userId!,
    },
  });

  if (!research) {
    throw new AppError(404, 'Research not found');
  }

  const link = await prisma.researchLink.create({
    data: {
      ...linkData,
      researchId: req.params.id,
    },
  });

  res.status(201).json(link);
});

// Update research link
router.put('/:id/links/:linkId', async (req: AuthRequest, res) => {
  const linkData = researchLinkSchema.partial().parse(req.body);
  
  const research = await prisma.research.findFirst({
    where: {
      id: req.params.id,
      userId: req.userId!,
    },
  });

  if (!research) {
    throw new AppError(404, 'Research not found');
  }

  const link = await prisma.researchLink.update({
    where: { id: req.params.linkId },
    data: linkData,
  });

  res.json(link);
});

// Delete research link
router.delete('/:id/links/:linkId', async (req: AuthRequest, res) => {
  const research = await prisma.research.findFirst({
    where: {
      id: req.params.id,
      userId: req.userId!,
    },
  });

  if (!research) {
    throw new AppError(404, 'Research not found');
  }

  await prisma.researchLink.delete({
    where: { id: req.params.linkId },
  });

  res.status(204).send();
});

// Get research for specific contact
router.get('/contact/:contactId', async (req: AuthRequest, res) => {
  const research = await prisma.research.findMany({
    where: {
      userId: req.userId!,
      targetId: req.params.contactId,
      targetType: 'CONTACT',
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

// Get research for specific application
router.get('/application/:applicationId', async (req: AuthRequest, res) => {
  const research = await prisma.research.findMany({
    where: {
      userId: req.userId!,
      targetId: req.params.applicationId,
      targetType: 'APPLICATION',
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

// Get research for specific company
router.get('/company/:companyId', async (req: AuthRequest, res) => {
  const research = await prisma.research.findMany({
    where: {
      userId: req.userId!,
      targetId: req.params.companyId,
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

export { router as researchRouter };