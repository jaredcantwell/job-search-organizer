import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateCompanies() {
  console.log('🚀 Starting company data migration...');

  try {
    // Step 1: Get all unique company names from applications and contacts
    console.log('📊 Analyzing existing company data...');
    
    const applicationCompanies = await prisma.application.findMany({
      where: {
        companyId: null, // Only migrate records that haven't been migrated yet
      },
      select: {
        userId: true,
        company: true,
      },
    });

    const contactCompanies = await prisma.contact.findMany({
      where: {
        companyId: null, // Only migrate records that haven't been migrated yet
      },
      select: {
        userId: true,
        company: true,
      },
    });

    // Combine and deduplicate
    const allCompanyData = new Map<string, Set<string>>();
    
    applicationCompanies.forEach(app => {
      if (app.company && app.company.trim()) {
        if (!allCompanyData.has(app.userId)) {
          allCompanyData.set(app.userId, new Set());
        }
        allCompanyData.get(app.userId)!.add(app.company.trim());
      }
    });

    contactCompanies.forEach(contact => {
      if (contact.company && contact.company.trim()) {
        if (!allCompanyData.has(contact.userId)) {
          allCompanyData.set(contact.userId, new Set());
        }
        allCompanyData.get(contact.userId)!.add(contact.company.trim());
      }
    });

    console.log(`📈 Found ${Array.from(allCompanyData.values()).reduce((total, set) => total + set.size, 0)} unique companies across ${allCompanyData.size} users`);

    // Step 2: Create Company records
    console.log('🏢 Creating Company records...');
    
    const companyMap = new Map<string, string>(); // key: userId:companyName, value: companyId
    
    for (const [userId, companyNames] of allCompanyData) {
      for (const companyName of companyNames) {
        try {
          const existingCompany = await prisma.company.findFirst({
            where: {
              userId,
              name: companyName,
            },
          });

          let companyId: string;
          
          if (existingCompany) {
            companyId = existingCompany.id;
            console.log(`✅ Found existing company: ${companyName} for user ${userId}`);
          } else {
            const newCompany = await prisma.company.create({
              data: {
                userId,
                name: companyName,
              },
            });
            companyId = newCompany.id;
            console.log(`✨ Created new company: ${companyName} for user ${userId}`);
          }
          
          companyMap.set(`${userId}:${companyName}`, companyId);
        } catch (error) {
          console.error(`❌ Error creating company ${companyName} for user ${userId}:`, error);
        }
      }
    }

    // Step 3: Update Applications
    console.log('📋 Updating Application records...');
    
    const applicationsToUpdate = await prisma.application.findMany({
      where: {
        companyId: null,
      },
    });

    let applicationUpdateCount = 0;
    for (const app of applicationsToUpdate) {
      if (app.company && app.company.trim()) {
        const companyKey = `${app.userId}:${app.company.trim()}`;
        const companyId = companyMap.get(companyKey);
        
        if (companyId) {
          try {
            await prisma.application.update({
              where: { id: app.id },
              data: { companyId },
            });
            applicationUpdateCount++;
          } catch (error) {
            console.error(`❌ Error updating application ${app.id}:`, error);
          }
        } else {
          console.warn(`⚠️ No company found for application ${app.id} with company "${app.company}"`);
        }
      }
    }

    console.log(`✅ Updated ${applicationUpdateCount} applications`);

    // Step 4: Update Contacts
    console.log('👥 Updating Contact records...');
    
    const contactsToUpdate = await prisma.contact.findMany({
      where: {
        companyId: null,
      },
    });

    let contactUpdateCount = 0;
    for (const contact of contactsToUpdate) {
      if (contact.company && contact.company.trim()) {
        const companyKey = `${contact.userId}:${contact.company.trim()}`;
        const companyId = companyMap.get(companyKey);
        
        if (companyId) {
          try {
            await prisma.contact.update({
              where: { id: contact.id },
              data: { companyId },
            });
            contactUpdateCount++;
          } catch (error) {
            console.error(`❌ Error updating contact ${contact.id}:`, error);
          }
        } else {
          console.warn(`⚠️ No company found for contact ${contact.id} with company "${contact.company}"`);
        }
      }
    }

    console.log(`✅ Updated ${contactUpdateCount} contacts`);

    // Step 5: Summary
    console.log('\n🎉 Migration completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Companies created: ${companyMap.size}`);
    console.log(`   - Applications updated: ${applicationUpdateCount}`);
    console.log(`   - Contacts updated: ${contactUpdateCount}`);
    
    console.log('\n🔍 Next steps:');
    console.log('   1. Test the application to ensure everything works');
    console.log('   2. Once satisfied, you can remove the old "company" string fields');
    console.log('   3. Update frontend to use the new Company system');

  } catch (error) {
    console.error('💥 Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
if (require.main === module) {
  migrateCompanies()
    .then(() => {
      console.log('✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

export { migrateCompanies };