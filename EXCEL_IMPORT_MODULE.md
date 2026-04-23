# Excel Import Module - Complete Documentation

## Overview

This is a **production-grade, enterprise-level** Excel import module for managing inventory stock updates in bulk. It implements strict validation, transaction-based processing, and comprehensive audit logging.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
│  InventoryImportPage - File Upload → Validation → Preview   │
└────────────────────────────┬────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  API Routes     │
                    │  /api/inventory/│
                    │  import/*       │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
   ┌────▼─────┐         ┌────▼─────┐        ┌────▼─────┐
   │  Upload  │         │ Validate │        │ Confirm  │
   │  & Parse │         │ & Store  │        │ & Process│
   └────┬─────┘         └────┬─────┘        └────┬─────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                    ┌────────▼────────────┐
                    │  Services Layer     │
                    │  - Import Service   │
                    │  - Validation       │
                    │  - Transactions     │
                    └────────┬────────────┘
                             │
                    ┌────────▼────────────┐
                    │   Database Layer    │
                    │  - import_batches   │
                    │  - import_records   │
                    │  - stock_txn        │
                    │  - spares           │
                    └─────────────────────┘
```

## Database Schema

### import_batches
Tracks each import operation with full audit trail.

```sql
- id (UUID, PK)
- organization_id (FK)
- uploaded_by (FK → users)
- batch_status (pending | validated | processing | completed | failed | rolled_back)
- file_hash (UNIQUE - prevents duplicate uploads)
- file_name
- total_rows
- success_count
- failure_count
- validation_errors (JSONB)
- batch_metadata (JSONB)
- created_at, validated_at, processed_at, completed_at
```

### import_records
Individual rows from import with validation details.

```sql
- id (UUID, PK)
- batch_id (FK)
- organization_id (FK)
- spare_id (FK optional)
- system_id (FK optional)
- row_number
- item_code, system_code
- current_stock_imported, issued_qty, closing_stock
- record_status (pending | validated | processing | completed | error | skipped)
- validation_errors (JSONB)
- validation_warnings (JSONB)
- before_stock, after_stock (for audit)
```

### Enhanced stock_transactions
Extended with batch tracking.

```sql
- batch_id (FK → import_batches)
- import_record_id (FK → import_records)
```

## Workflow Steps

### STEP 1: File Upload & Initial Validation

**Input:** .xlsx file with Stock_Import sheet

**Validation:**
- File type check (.xlsx only)
- Sheet name match (Stock_Import)
- Header validation (exact column order match)

**Output:** Parsed rows with initial validation errors

```
POST /api/inventory/import/upload
Content-Type: multipart/form-data

Response:
{
  "success": true,
  "data": {
    "fileHash": "sha256...",
    "totalRows": 150,
    "validationSummary": {
      "totalRows": 150,
      "validRows": 145,
      "errorRows": 5,
      "warningRows": 3
    },
    "rows": [
      {
        "itemCode": "PANEL-001",
        "itemName": "Solar Panel 400W",
        "systemCode": "SYS-A",
        "systemName": "System A",
        "currentStock": 100,
        "issuedQty": 10,
        "closingStock": 90,
        "unitCost": 250,
        "totalValue": 22500,
        "errors": [],
        "warnings": []
      }
    ]
  }
}
```

### STEP 2: Database Validation

**Run against:** Existing items, systems, and stock

**Checks:**
- Item Code exists in database
- System Code exists
- Current Stock comparison (warning if mismatch)
- Closing Stock <= Current Stock
- Issued Qty <= Current Stock
- Non-negative values
- Item Code + System Code uniqueness

**Output:** Validated rows ready for batch creation

### STEP 3: Create Import Batch

**Database Operations:**
- Create import_batches record (status: VALIDATED)
- Create import_records (one per row)
- Store validation errors/warnings in JSONB

**State:** Batch ready for user review & confirmation

### STEP 4: Preview & User Edits

**UI Features:**
- Interactive preview table
- Inline editing (Issued Qty, Closing Stock)
- Auto re-validation on changes
- Color-coded status (Red/Yellow/Green)
- Summary panel (sticky)
- Row-level error messages

**User Actions:**
- Fix edits
- Correct wrong values
- Review impact summary

### STEP 5: Confirmation & Impact Review

**Show to user:**

```
Impact Summary:
- Total items affected: 145
- Total issued quantity: 1,250 units
- Items at zero stock: 3
- Low stock alerts: 5

System Availability Impact:
┌──────────────┬────────┬────────┬────────┐
│ System       │ Before │ After  │ Status │
├──────────────┼────────┼────────┼────────┤
│ System A     │  20    │  15    │ ⚠️ Reduced
│ System B     │  5     │  0     │ ❌ None available
│ System C     │  50    │  48    │ ✅ OK
└──────────────┴────────┴────────┴────────┘

Missing Items:
- Panel: Need 10, Have 5, Shortage: 5
- Inverter: Need 2, Have 1, Shortage: 1
```

**User confirms:** "Confirm & Update Inventory"

### STEP 6: Backend Processing (TRANSACTION-BASED)

**Database Transactions:**

```sql
BEGIN TRANSACTION;

FOR EACH valid record:
  1. INSERT into stock_transactions
     - type: 'issue'
     - quantity: issued_qty
     - batch_id: <batch_id>
     - import_record_id: <record_id>
  
  2. UPDATE spares
     - stock_quantity = closing_stock
     - WHERE spare_id = record.spare_id
  
  3. UPDATE import_records
     - record_status = 'completed'
     - processed_at = now()

UPDATE import_batches
  - batch_status = 'completed'
  - success_count = <count>
  - processed_at = now()
  - completed_at = now()

COMMIT;
```

**On failure:** ROLLBACK all changes (no partial updates)

### STEP 7: System Availability Recalculation

**Calculate for all systems:**

For each system:
- Get BOM (Bill of Materials)
- Calculate: Can Build = MIN(stock / required) for all components
- Detect bottleneck components
- Identify shortages

**Output:**

```json
{
  "systems": [
    {
      "systemId": "sys-1",
      "systemName": "System A",
      "canBuild": 15,
      "status": "limited",
      "missingComponents": [
        {
          "spareName": "Connector",
          "requiredQty": 5,
          "currentStock": 30,
          "shortageQty": 0
        }
      ]
    }
  ],
  "shortageItems": [
    {
      "spareName": "Panel",
      "requiredQty": 10,
      "availableQty": 8,
      "shortageQty": 2
    }
  ],
  "lowStockAlerts": [
    {
      "spareName": "Inverter",
      "stockLevel": "critical",
      "currentStock": 0,
      "minStock": 5
    }
  ]
}
```

### STEP 8: Success & Reporting

**Success Screen:**
- Total rows processed
- Successful rows
- Failed rows
- Batch ID
- Timestamp
- Download report option
- View transaction log

### STEP 9: Audit & Logging

**Activity Log Entry:**
```json
{
  "action": "import_completed",
  "entity_type": "import_batch",
  "entity_id": "<batch_id>",
  "details": {
    "fileName": "stock_import_2024.xlsx",
    "totalRows": 150,
    "successCount": 145,
    "failureCount": 5
  }
}
```

**Stock Movement Tracking:**
- Before value
- After value
- Issued quantity
- Transaction reference
- Batch ID
- Timestamp

## Excel Template

### Sheet Name: Stock_Import

### Columns (STRICT ORDER):
| # | Column | Type | Editable | Rules |
|---|--------|------|----------|-------|
| 1 | Item Code | Text | ❌ | Mandatory, Must exist in DB |
| 2 | Item Name | Text | ❌ | Read-only reference |
| 3 | System Code | Text | ❌ | Mandatory, Must exist in DB |
| 4 | System Name | Text | ❌ | Read-only reference |
| 5 | Current Stock | Number | ❌ | Read-only, >= 0 |
| 6 | Issued Qty | Number | ✅ | Optional, >= 0, <= Current Stock |
| 7 | Closing Stock | Number | ✅ | Optional, >= 0, auto-calculated |
| 8 | Unit Cost | Number | ❌ | Read-only, >= 0 |
| 9 | Total Value | Number | ❌ | Auto-calculated |

### Validation Rules:
- At least one of (Issued Qty, Closing Stock) must be provided
- If both provided: `Closing Stock = Current Stock - Issued Qty`
- `Closing Stock <= Current Stock`
- `Issued Qty <= Current Stock`
- No negative values
- No duplicate (Item Code + System Code)

## API Endpoints

### 1. Upload & Parse Excel
```
POST /api/inventory/import/upload
Content-Type: multipart/form-data

Body:
{
  "file": <blob>
}

Response:
{
  "success": true,
  "data": {
    "fileHash": "sha256...",
    "totalRows": 150,
    "validationSummary": {...},
    "rows": [...]
  }
}
```

### 2. Validate Against Database
```
POST /api/inventory/import/validate
Content-Type: application/json

Body:
{
  "rows": [...],
  "fileName": "stock_import.xlsx",
  "fileHash": "sha256...",
  "user": { "id": "user-uuid" }
}

Response:
{
  "success": true,
  "data": {
    "batchId": "batch-uuid",
    "totalRows": 150,
    "validRows": 145,
    "errorRows": 5,
    "warningRows": 3
  }
}
```

### 3. Confirm & Process Import
```
POST /api/inventory/import/confirm
Content-Type: application/json

Body:
{
  "batchId": "batch-uuid"
}

Response:
{
  "success": true,
  "data": {
    "batchId": "batch-uuid",
    "status": "success",
    "processedRows": 145,
    "failedRows": 0,
    "timestamp": "2024-04-13T10:30:00Z",
    "impact": {
      "totalAffected": 145,
      "totalIssuedQty": 1250,
      "itemsAtZeroStock": [...],
      "systemAvailabilityImpact": [...]
    }
  }
}
```

## Error Handling

### File-Level Errors (Block Upload)
- Wrong file type
- Sheet name mismatch
- Header mismatch
- Empty file

### Row-Level Errors (Block Row Processing)
- Mandatory fields missing
- Item Code not found
- System Code not found
- Negative values
- Closing Stock exceeds Current Stock
- Invalid numeric format

### Row-Level Warnings (Allow, Show to User)
- Current Stock mismatch (file vs DB)
- Closing Stock formula mismatch
- Low stock after import
- System availability reduction

## Security Features

### Access Control
- Role-based access (Inventory Manager role required)
- Organization-level isolation (RLS policies)
- User attribution (who uploaded)

### Data Integrity
- File hash verification (prevent duplicate uploads)
- Transaction-based processing (atomic, ACID)
- Automatic rollback on errors
- Type validation and sanitization

### Audit Trail
- Every import batch recorded
- Stock movement tracking
- Before/After values stored
- User attribution on all operations
- Full activity log integration

## Performance Considerations

### Optimizations
- Streaming Excel parser (XLSX library)
- Bulk database operations (batch inserts)
- Indexed queries (organization_id, batch_id, status)
- Lazy-loaded components (React)

### Capacity
- Handles 10,000+ row imports
- Bulk transactions (minimize DB round-trips)
- Connection pooling ready
- Async processing for large batches

### Database Indexes
```sql
- idx_import_batches_org
- idx_import_batches_status
- idx_import_batches_created_at
- idx_import_records_batch
- idx_import_records_status
- idx_stock_txn_batch
```

## Testing Checklist

### Unit Tests
- [ ] Excel parsing with valid/invalid files
- [ ] Header validation
- [ ] Row validation (all error types)
- [ ] Numeric calculations
- [ ] Closing stock auto-calculation

### Integration Tests
- [ ] File upload API
- [ ] Database validation
- [ ] Batch creation
- [ ] Transaction processing
- [ ] Rollback on failure

### UI Tests
- [ ] File drop zone
- [ ] Inline editing
- [ ] Re-validation on edit
- [ ] Summary statistics
- [ ] Error display

### User Acceptance
- [ ] Duplicate upload prevention
- [ ] Stock movement accuracy
- [ ] System availability recalculation
- [ ] Audit log completeness
- [ ] Error recovery/retry

## Sample Responses

### Successful Import (145/150 rows)
```json
{
  "success": true,
  "data": {
    "batchId": "08f7c3a2-1b4e-4f6e-9c8d-5e2a7f1b3c4d",
    "status": "success",
    "processedRows": 145,
    "failedRows": 5,
    "timestamp": "2024-04-13T10:30:00Z",
    "impact": {
      "totalAffected": 145,
      "totalIssuedQty": 1250,
      "itemsAtZeroStock": 3,
      "systemAvailabilityImpact": [
        {
          "systemId": "sys-1",
          "systemName": "System A",
          "beforeAvailable": 20,
          "afterAvailable": 15,
          "shortageDetected": false
        }
      ]
    }
  }
}
```

### Validation Errors
```json
{
  "success": false,
  "error": "5 rows contain errors. Please fix them before importing.",
  "data": {
    "totalRows": 150,
    "validRows": 145,
    "errorRows": 5,
    "rows": [
      {
        "rowNumber": 23,
        "itemCode": "PANEL-001",
        "errors": [
          {
            "column": "Item Code",
            "message": "Item Code 'PANEL-999' not found in inventory",
            "errorCode": "ITEM_CODE_NOT_FOUND"
          }
        ]
      }
    ]
  }
}
```

## Future Enhancements

1. **Batch CSV Export** - Download error report as CSV
2. **Scheduled Imports** - Schedule imports for specific times
3. **Template Download** - Generate Excel template from DB
4. **Version Control** - Track import version history
5. **Web Hooks** - Notify external systems on completion
6. **Bulk Corrections** - Auto-fix common errors
7. **Import History** - View past imports and rollback
8. **Multi-sheet** - Handle multiple sheets per file

---

**Last Updated:** April 13, 2024
**Version:** 1.0.0 (Production Ready)
