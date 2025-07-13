import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../utils/prisma';

const router = Router();

router.use(authenticate);

// Export all user data
router.get('/user-data', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;

    // Get user profile (excluding password)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get all companies with their research
    const companies = await prisma.company.findMany({
      where: { userId },
      include: {
        research: {
          orderBy: { date: 'desc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Get all contacts with their communications and follow-up actions
    const contacts = await prisma.contact.findMany({
      where: { userId },
      include: {
        communications: {
          include: {
            followUpActions: {
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { date: 'desc' },
        },
        companyRef: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Get all applications with their interviews
    const applications = await prisma.application.findMany({
      where: { userId },
      include: {
        interviews: {
          orderBy: { scheduledAt: 'asc' },
        },
        contact: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Get all tasks (both general and application-specific)
    const tasks = await prisma.task.findMany({
      where: { userId },
      include: {
        application: {
          select: {
            id: true,
            company: true,
            position: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Get all documents (both general and application-specific)
    const documents = await prisma.document.findMany({
      where: { userId },
      include: {
        application: {
          select: {
            id: true,
            company: true,
            position: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Calculate statistics
    const totalCommunications = contacts.reduce((sum, contact) => sum + contact.communications.length, 0);
    const totalFollowUpActions = contacts.reduce((sum, contact) => 
      sum + contact.communications.reduce((commSum, comm) => commSum + comm.followUpActions.length, 0), 0
    );
    const totalInterviews = applications.reduce((sum, app) => sum + app.interviews.length, 0);
    const totalResearch = companies.reduce((sum, company) => sum + company.research.length, 0);

    // Build export data structure
    const exportData = {
      exportMetadata: {
        exportedAt: new Date().toISOString(),
        schemaVersion: '1.0',
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        totalRecords: {
          companies: companies.length,
          contacts: contacts.length,
          applications: applications.length,
          communications: totalCommunications,
          followUpActions: totalFollowUpActions,
          interviews: totalInterviews,
          research: totalResearch,
          tasks: tasks.length,
          documents: documents.length,
        },
      },
      userData: {
        profile: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        companies: companies.map(company => ({
          id: company.id,
          name: company.name,
          website: company.website,
          industry: company.industry,
          size: company.size,
          location: company.location,
          description: company.description,
          notes: company.notes,
          founded: company.founded,
          createdAt: company.createdAt,
          updatedAt: company.updatedAt,
          research: company.research.map(research => ({
            id: research.id,
            title: research.title,
            content: research.content,
            source: research.source,
            tags: research.tags,
            date: research.date,
            createdAt: research.createdAt,
            updatedAt: research.updatedAt,
          })),
        })),
        contacts: contacts.map(contact => ({
          id: contact.id,
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
          company: contact.company,
          companyId: contact.companyId,
          companyRef: contact.companyRef,
          position: contact.position,
          linkedinUrl: contact.linkedinUrl,
          type: contact.type,
          notes: contact.notes,
          lastContact: contact.lastContact,
          nextContact: contact.nextContact,
          createdAt: contact.createdAt,
          updatedAt: contact.updatedAt,
          communications: contact.communications.map(comm => ({
            id: comm.id,
            type: comm.type,
            subject: comm.subject,
            content: comm.content,
            date: comm.date,
            duration: comm.duration,
            location: comm.location,
            createdAt: comm.createdAt,
            updatedAt: comm.updatedAt,
            followUpActions: comm.followUpActions.map(action => ({
              id: action.id,
              description: action.description,
              dueDate: action.dueDate,
              completed: action.completed,
              priority: action.priority,
              createdAt: action.createdAt,
              updatedAt: action.updatedAt,
            })),
          })),
        })),
        applications: applications.map(app => ({
          id: app.id,
          company: app.company,
          position: app.position,
          location: app.location,
          salary: app.salary,
          jobUrl: app.jobUrl,
          description: app.description,
          status: app.status,
          appliedDate: app.appliedDate,
          notes: app.notes,
          contactId: app.contactId,
          contact: app.contact,
          createdAt: app.createdAt,
          updatedAt: app.updatedAt,
          interviews: app.interviews.map(interview => ({
            id: interview.id,
            type: interview.type,
            scheduledAt: interview.scheduledAt,
            duration: interview.duration,
            location: interview.location,
            interviewers: interview.interviewers,
            notes: interview.notes,
            outcome: interview.outcome,
            createdAt: interview.createdAt,
            updatedAt: interview.updatedAt,
          })),
        })),
        tasks: tasks.map(task => ({
          id: task.id,
          title: task.title,
          description: task.description,
          dueDate: task.dueDate,
          completed: task.completed,
          priority: task.priority,
          category: task.category,
          applicationId: task.applicationId,
          application: task.application,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
        })),
        documents: documents.map(doc => ({
          id: doc.id,
          type: doc.type,
          name: doc.name,
          url: doc.url,
          version: doc.version,
          applicationId: doc.applicationId,
          application: doc.application,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        })),
      },
    };

    // Set appropriate headers for file download
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const filename = `job-search-data-${timestamp}.json`;
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    res.json(exportData);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export user data' });
  }
});

export { router as exportRouter };