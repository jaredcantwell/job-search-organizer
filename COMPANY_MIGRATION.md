# Company Migration Guide

This guide walks you through migrating from string-based company fields to a proper Company model.

## ✅ What's Been Prepared

1. **Safe Schema Changes**: Added new Company table and optional `companyId` fields
2. **Backwards Compatibility**: Kept existing `company` string fields intact
3. **Data Migration Script**: Automated script to migrate your existing data
4. **API Updates**: Backend now supports both old and new company fields

## 🚀 Migration Steps

### Step 1: Run Database Migration
```bash
cd backend
npm run prisma:migrate dev
```

When prompted for a migration name, enter: `add_company_model`

This will:
- ✅ Create the new `Company` table
- ✅ Add optional `companyId` fields to Contact and Application tables
- ✅ Keep all your existing data intact

### Step 2: Migrate Your Data
```bash
cd backend
npm run migrate:companies
```

This script will:
- 📊 Analyze your existing company names
- 🏢 Create Company records for each unique company
- 🔗 Link your existing Applications and Contacts to the new Company records
- 📈 Show you a summary of what was migrated

### Step 3: Verify Everything Works
1. Start your development server: `npm run dev`
2. Check that your applications and contacts still show company information
3. Test creating new applications/contacts (they'll use the new system)

### Step 4: Future Cleanup (Optional)
Once you're confident everything works, you can:
1. Remove the old `company` string fields from the schema
2. Run another migration to clean up

## 🔄 Rollback Plan

If something goes wrong:
1. The old `company` fields are still there with your original data
2. You can revert the schema changes and run a migration to remove the new fields
3. Your original data will be completely intact

## 📊 What Changes in the UI

- Company selectors instead of text inputs
- Company detail pages showing all related applications/contacts
- Better organization and deduplication of company data
- Enhanced research capabilities per company

## 🆘 If You Need Help

The migration script is safe and preserves all your data. If you encounter any issues:
1. Check the console output for specific error messages
2. Your original data in the `company` string fields remains untouched
3. You can always revert the changes if needed