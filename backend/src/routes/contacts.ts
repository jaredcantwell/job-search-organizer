import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.use(authenticate);

const createContactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  companyId: z.string().optional().or(z.literal('')),
  position: z.string().optional(),
  linkedinUrl: z.string().url().optional().or(z.literal('')),
  notes: z.string().optional(),
  type: z.enum(['RECRUITER', 'HIRING_MANAGER', 'REFERRAL', 'COLLEAGUE', 'OTHER']).default('OTHER'),
});

const updateContactSchema = createContactSchema.partial();

// Get all contacts for the authenticated user
router.get('/', async (req: AuthRequest, res) => {
  const { search } = req.query;
  
  const contacts = await prisma.contact.findMany({
    where: {
      userId: req.userId!,
      ...(search && {
        OR: [
          { name: { contains: search as string, mode: 'insensitive' } },
          { email: { contains: search as string, mode: 'insensitive' } },
          { company: { contains: search as string, mode: 'insensitive' } },
          { position: { contains: search as string, mode: 'insensitive' } },
          { notes: { contains: search as string, mode: 'insensitive' } },
          { companyRef: { name: { contains: search as string, mode: 'insensitive' } } },
        ],
      }),
    },
    include: {
      companyRef: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  res.json(contacts);
});

// Get a single contact
router.get('/:id', async (req: AuthRequest, res) => {
  const { include } = req.query;
  const includeCompany = include === 'company';

  const contact = await prisma.contact.findFirst({
    where: {
      id: req.params.id,
      userId: req.userId!,
    },
    include: includeCompany ? {
      companyRef: {
        select: {
          id: true,
          name: true,
        },
      },
    } : undefined,
  });

  if (!contact) {
    throw new AppError(404, 'Contact not found');
  }

  res.json(contact);
});

// Create a new contact
router.post('/', async (req: AuthRequest, res) => {
  const data = createContactSchema.parse(req.body);

  const contact = await prisma.contact.create({
    data: {
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      companyId: data.companyId || null,
      position: data.position || null,
      linkedinUrl: data.linkedinUrl || null,
      notes: data.notes || null,
      type: data.type,
      userId: req.userId!,
    },
  });

  res.status(201).json(contact);
});

// Update a contact
router.put('/:id', async (req: AuthRequest, res) => {
  const data = updateContactSchema.parse(req.body);

  const contact = await prisma.contact.findFirst({
    where: {
      id: req.params.id,
      userId: req.userId!,
    },
  });

  if (!contact) {
    throw new AppError(404, 'Contact not found');
  }

  const updated = await prisma.contact.update({
    where: { id: req.params.id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.email !== undefined && { email: data.email || null }),
      ...(data.phone !== undefined && { phone: data.phone || null }),
      ...(data.companyId !== undefined && { companyId: data.companyId || null }),
      ...(data.position !== undefined && { position: data.position || null }),
      ...(data.linkedinUrl !== undefined && { linkedinUrl: data.linkedinUrl || null }),
      ...(data.notes !== undefined && { notes: data.notes || null }),
      ...(data.type !== undefined && { type: data.type }),
    },
  });

  res.json(updated);
});

// Delete a contact
router.delete('/:id', async (req: AuthRequest, res) => {
  const contact = await prisma.contact.findFirst({
    where: {
      id: req.params.id,
      userId: req.userId!,
    },
  });

  if (!contact) {
    throw new AppError(404, 'Contact not found');
  }

  await prisma.contact.delete({
    where: { id: req.params.id },
  });

  res.status(204).send();
});

export { router as contactsRouter };