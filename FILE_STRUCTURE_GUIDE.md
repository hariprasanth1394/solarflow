# Excel Import Module - File Structure & Navigation Guide

## 📁 Complete File Structure

```
solarflow/
├─ supabase/
│  └─ migrations/
│     └─ 202603080001_excel_import_module.sql ⭐ DATABASE SCHEMA
│
├─ src/
│  ├─ utils/
│  │  ├─ excelImportParser.ts ⭐ EXCEL PARSING & VALIDATION
│  │  └─ systemAvailabilityCalculator.ts ⭐ SYSTEM AVAILABILITY LOGIC
│  │
│  ├─ services/
│  │  └─ inventoryImportService.ts ⭐ BUSINESS LOGIC SERVICE
│  │
│  ├─ app/
│  │  └─ api/
│  │     └─ inventory/
│  │        └─ import/
│  │           ├─ upload/
│  │           │  └─ route.ts ⭐ UPLOAD ENDPOINT
│  │           ├─ validate/
│  │           │  └─ route.ts ⭐ VALIDATION ENDPOINT
│  │           └─ confirm/
│  │              └─ route.ts ⭐ CONFIRM & PROCESS ENDPOINT
│  │
│  └─ modules/
│     └─ inventory/
│        ├─ InventoryImportPage.tsx ⭐ MAIN UI COMPONENT
│        └─ SystemAvailabilityDashboard.tsx ⭐ IMPACT DISPLAY
│
├─ EXCEL_IMPORT_MODULE.md ⭐ COMPLETE DOCUMENTATION
├─ EXCEL_IMPORT_SUMMARY.md ⭐ EXECUTIVE SUMMARY
├─ EXCEL_IMPORT_QUICK_REFERENCE.ts ⭐ QUICK LOOKUP
└─ FILE_STRUCTURE.md (This file)
```

---

## 🗂️ File Organization Guide

### By Purpose

#### **Database Layer**
- `202603080001_excel_import_module.sql` - All DB schema, functions, policies

#### **Backend Services**
- `inventoryImportService.ts` - Orchestrates entire workflow
- `excelImportParser.ts` - File parsing and validation
- `systemAvailabilityCalculator.ts` - BOM-based calculations

#### **API Endpoints**
- `upload/route.ts` - Step 1: Parse Excel
- `validate/route.ts` - Step 2: Database validation
- `confirm/route.ts` - Step 3: Process import

#### **Frontend UI**
- `InventoryImportPage.tsx` - Complete import workflow
- `SystemAvailabilityDashboard.tsx` - Results visualization

#### **Documentation**
- `EXCEL_IMPORT_MODULE.md` - Full technical docs
- `EXCEL_IMPORT_SUMMARY.md` - High-level overview
- `EXCEL_IMPORT_QUICK_REFERENCE.ts` - Code examples & quick lookup

---

## 📖 Where to Find Things

### "I need to understand the import workflow"
→ Read: `EXCEL_IMPORT_MODULE.md` (Sections 1-5)

### "I need to integrate this into my app"
→ Read: `EXCEL_IMPORT_SUMMARY.md` (Integration Steps section)

### "I need to debug a validation error"
→ Check: `EXCEL_IMPORT_QUICK_REFERENCE.ts` (ERROR_CODES section)

### "I need to modify validation rules"
→ Edit: `src/utils/excelImportParser.ts` (validateBusinessLogic function)

### "I need to change the UI"
→ Edit: `src/modules/inventory/InventoryImportPage.tsx`

### "I need to understand API responses"
→ Check: `EXCEL_IMPORT_QUICK_REFERENCE.ts` (API_EXAMPLES) or `EXCEL_IMPORT_MODULE.md` (API Endpoints)

### "I need system availability calculation logic"
→ Read: `src/utils/systemAvailabilityCalculator.ts` and `systemAvailabilityfDashboard.tsx`

### "I need to run database migration"
→ Use: `supabase/migrations/202603080001_excel_import_module.sql`

### "I need role-based access control"
→ Check: `EXCEL_IMPORT_MODULE.md` (Security Features section)

### "I need error handling examples"
→ Check: `EXCEL_IMPORT_QUICK_REFERENCE.ts` (ERROR_CODES and TROUBLESHOOTING)

---

## 🔄 Data Flow Map

```
User Upload
    ↓
[upload/route.ts]
    → excelImportParser.ts (parseExcelFile)
    └→ Response with parsed rows
       ↓
User Reviews & Edits
    ↓
[validate/route.ts]
    → inventoryImportService.ts (validateRowsAgainstDatabase)
    → createImportBatch()
    └→ Response with batchId
       ↓
User Confirms
    ↓
[confirm/route.ts]
    → inventoryImportService.ts (confirmAndProcessImport)
    → systemAvailabilityCalculator.ts (calculateImportImpact)
    → Database Transactions (stock_transactions, spares)
    └→ Success Response with report
       ↓
UI Displays Results
    ↓
[InventoryImportPage.tsx] Shows completion
[SystemAvailabilityDashboard.tsx] Shows impact
```

---

## 🏗️ Architecture Layer Map

### Layer 1: Database (PostgreSQL/Supabase)
```
202603080001_excel_import_module.sql
  ├─ import_batches (table)
  ├─ import_records (table)
  ├─ calculate_system_availability() (function)
  ├─ log_import_activity() (function)
  └─ RLS Policies
```

### Layer 2: Backend Services (Node.js/TypeScript)
```
inventoryImportService.ts
  ├─ uploadAndValidateExcel()
  ├─ validateRowsAgainstDatabase()
  ├─ createImportBatch()
  ├─ calculateImportImpact()
  └─ confirmAndProcessImport()

excelImportParser.ts
  ├─ parseExcelFile()
  ├─ validateExcelHeaders()
  ├─ parseRow()
  └─ validateAgainstDatabase()

systemAvailabilityCalculator.ts
  ├─ calculateSystemAvailability()
  └─ calculateImportImpact()
```

### Layer 3: API Routes (Next.js)
```
/api/inventory/import/
  ├─ upload/route.ts
  ├─ validate/route.ts
  └─ confirm/route.ts
```

### Layer 4: UI Components (React)
```
InventoryImportPage.tsx
  ├─ Upload Section
  ├─ Validation Status
  ├─ Preview Grid (editable)
  ├─ Summary Panel
  └─ Confirmation Screen

SystemAvailabilityDashboard.tsx
  ├─ System Cards
  ├─ Low Stock Alerts
  └─ Shortage Table
```

---

## 🔑 Key Components Reference

### Database Tables
| Table | Rows | Purpose |
|-------|------|---------|
| `import_batches` | One per upload | Track import sessions |
| `import_records` | One per data row | Track individual rows |
| Enhanced `stock_transactions` | Linked to batch | Audit trail |

### Core Functions
| Function | File | Purpose |
|----------|------|---------|
| `parseExcelFile()` | excelImportParser.ts | Parse & validate Excel |
| `uploadAndValidateExcel()` | inventoryImportService.ts | Orchestrate upload |
| `validateRowsAgainstDatabase()` | inventoryImportService.ts | DB validation |
| `createImportBatch()` | inventoryImportService.ts | Store batch |
| `confirmAndProcessImport()` | inventoryImportService.ts | Execute transactions |
| `calculateSystemAvailability()` | systemAvailabilityCalculator.ts | BOM analysis |
| `calculateImportImpact()` | systemAvailabilityCalculator.ts | Before/after impact |

### React Components
| Component | File | Purpose |
|-----------|------|---------|
| `InventoryImportPage` | InventoryImportPage.tsx | Main import UI |
| `SystemAvailabilityDashboard` | SystemAvailabilityDashboard.tsx | Impact display |

### API Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/inventory/import/upload` | POST | Upload & parse |
| `/api/inventory/import/validate` | POST | Validate & batch |
| `/api/inventory/import/confirm` | POST | Process transactions |

---

## 📋 Code Reading Order

For first-time understanding, read in this order:

1. **Overview** (5 min)
   - EXCEL_IMPORT_SUMMARY.md

2. **Workflow** (10 min)
   - EXCEL_IMPORT_MODULE.md (Sections 1-8)

3. **Implementation** (15 min)
   - EXCEL_IMPORT_MODULE.md (Database Schema + API Endpoints)

4. **Backend Logic** (20 min)
   - excelImportParser.ts (validation rules)
   - inventoryImportService.ts (orchestration)
   - systemAvailabilityCalculator.ts (availability logic)

5. **Frontend UI** (15 min)
   - InventoryImportPage.tsx
   - SystemAvailabilityDashboard.tsx

6. **Integration** (10 min)
   - EXCEL_IMPORT_SUMMARY.md (Integration Steps)

---

## 🔗 Inter-file Dependencies

```
InventoryImportPage.tsx
  └─ (calls) → /api/inventory/import/upload
  └─ (calls) → /api/inventory/import/validate
  └─ (calls) → /api/inventory/import/confirm

upload/route.ts
  └─ (uses) → excelImportParser.ts

validate/route.ts
  └─ (uses) → inventoryImportService.ts
  └─ (calls) → createImportBatch()

confirm/route.ts
  └─ (uses) → inventoryImportService.ts
  └─ (calls) → confirmAndProcessImport()
  └─ (calls) → calculateImportImpact()

inventoryImportService.ts
  └─ (uses) → excelImportParser.ts
  └─ (uses) → systemAvailabilityCalculator.ts
  └─ (calls) → Database functions/tables

systemAvailabilityCalculator.ts
  └─ (queries) → Supabase (systems, system_components, spares)

202603080001_excel_import_module.sql
  └─ (provides) → Tables, functions, policies used by all services
```

---

## 🚀 Quick Navigation

### Want to...

**Add a new validation rule?**
→ Edit: `excelImportParser.ts` → function `validateBusinessLogic()`

**Change the Excel template?**
→ Update: `EXCEL_CONFIG` in `excelImportParser.ts`
→ Update: Database validation in `inventoryImportService.ts`

**Modify the UI layout?**
→ Edit: `InventoryImportPage.tsx` → JSX sections

**Add new error type?**
→ Add: Error code to `VALIDATION_RULES` in `excelImportParser.ts`
→ Add: Handler in `parseRow()` function

**Customize system availability calculation?**
→ Edit: `systemAvailabilityCalculator.ts` → `calculateSystemAvailability()`

**Add pre-import checks?**
→ Add: Logic in `uploadAndValidateExcel()` before parsing

**Change transaction logic?**
→ Edit: `confirmAndProcessImport()` in `inventoryImportService.ts`

---

## 📊 Statistics

- **Total Lines of Code:** ~2,500
- **Database Schema:** 2 tables + functions + policies
- **API Endpoints:** 3
- **React Components:** 2 major + utility functions
- **Utility Functions:** 20+
- **Validation Rules:** 15+
- **Error Types:** 10+

---

## ✅ Checklist for New Developers

- [ ] Read EXCEL_IMPORT_SUMMARY.md
- [ ] Read EXCEL_IMPORT_MODULE.md
- [ ] Review database schema (202603080001_excel_import_module.sql)
- [ ] Understand excelImportParser.ts validation logic
- [ ] Understand inventoryImportService.ts workflow
- [ ] Review InventoryImportPage.tsx UI flow
- [ ] Test with sample Excel file
- [ ] Run all validations
- [ ] Verify transactions work
- [ ] Check audit logs

---

## 🎯 Documentation Hierarchy

```
Level 1: EXCEL_IMPORT_SUMMARY.md
  → High-level overview for decision makers

Level 2: EXCEL_IMPORT_MODULE.md
  → Complete technical documentation

Level 3: Code Comments & Type Definitions
  → Implementation-level details

Level 4: EXCEL_IMPORT_QUICK_REFERENCE.ts
  → Code examples & quick lookup
```

---

**Document Version:** 1.0
**Last Updated:** April 13, 2024
**Maintainer:** SolarFlow Development Team
