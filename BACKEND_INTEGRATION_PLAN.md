/**
 * BACKEND INTEGRATION PLAN - PHASE 3
 * ==================================
 * 
 * Detailed implementation plan for frontend-backend integration
 */

# Phase 3: Backend Integration Plan

## 🎯 Objectives
1. ✅ Create 6 API endpoints (3 exist, 3 need creation)
2. ✅ Implement system availability calculation endpoint
3. ✅ Implement batch logs endpoints
4. ✅ Update existing endpoints to match API contract
5. ✅ Ensure error handling and validation
6. ✅ Test end-to-end workflow

## 📊 API Endpoints Implementation Status

### Existing Routes (Need Updates)
| Endpoint | Status | Work Required |
|----------|--------|---|
| POST /api/inventory/import/upload | ⚠️ Skeleton | Update response format, add file validation |
| POST /api/inventory/import/validate | ⚠️ Skeleton | Update request/response format, fix auth |
| POST /api/inventory/import/confirm | ⚠️ Skeleton | Update response format, add impact data |

### Missing Routes (Need Creation)
| Endpoint | Status | Implementation |
|----------|--------|---|
| POST /api/inventory/import/system-availability | ❌ Missing | Create new route, integrate calculator |
| GET /api/inventory/import/logs | ❌ Missing | Create new route, implement pagination |
| GET /api/inventory/import/logs/:batchId | ❌ Missing | Create new route, implement details |

## 🔧 Implementation Details

### 1. POST /api/inventory/import/upload (UPDATE)

**Current Issues:**
- Response format doesn't match integration spec
- Missing preview data structure
- No proper error categorization

**Updates Needed:**
```typescript
Response format should be:
{
  success: true,
  data: {
    batchId: string,
    fileHash: string,
    totalRows: number,
    headers: string[],
    preview: ImportRow[],  // First 5 rows
    uploadedAt: string
  }
}
```

**Changes:**
- Add response formatting
- Return proper preview data
- Add header validation
- Ensure batchId is created or returned

---

### 2. POST /api/inventory/import/validate (UPDATE)

**Current Issues:**
- Auth handling is broken (parsing body twice)
- Response format doesn't match spec
- Missing validation report structure

**Updates Needed:**
```typescript
Request:
{
  batchId: string,
  rows: ImportRow[]
}

Response:
{
  success: true,
  data: {
    batchId: string,
    validationReport: {
      totalRows: number,
      validRows: number,
      errorCount: number,
      warningCount: number,
      duplicateCount: number
    },
    rows: ValidatedRow[]
  }
}
```

**Changes:**
- Fix auth middleware
- Get user from middleware context
- Return complete validation report
- Return validated rows with status

---

### 3. POST /api/inventory/import/confirm (UPDATE)

**Current Issues:**
- Response format doesn't match integration spec
- Missing system impact data
- Missing stock movement summary

**Updates Needed:**
```typescript
Response:
{
  success: true,
  data: {
    batchId: string,
    status: "completed|failed",
    summary: {
      totalRows: number,
      successCount: number,
      errorCount: number,
      processingTime: string,
      completedAt: string
    },
    stockMovement: {
      itemsAffected: number,
      totalQtyIssued: number,
      totalValueIssued: number
    },
    systemImpact: {
      systemsAffected: number,
      availabilityReduction: object,
      newShortages: string[]
    }
  }
}
```

**Changes:**
- Return formatted summary
- Calculate stock movement metrics
- Return system impact data
- Include processing time

---

### 4. POST /api/inventory/import/system-availability (CREATE NEW)

**Purpose:** Calculate system availability before/after import

**Implementation:**
```typescript
// src/app/api/inventory/import/system-availability/route.ts

Endpoint: POST /api/inventory/import/system-availability
Authentication: Bearer token
Organization Context: Auto-extracted from middleware

Request:
{
  batchId: string,
  organizationId: string,
  includeImpactAnalysis: boolean
}

Response:
{
  success: true,
  data: {
    before: SystemAvailability[],  // Before import
    after: SystemAvailability[],   // After import
    impact: {
      systemsAffected: number,
      systemsImproved: number,
      systemsWorsened: number,
      newShortages: number,
      summary: string
    }
  }
}

Where SystemAvailability = {
  systemId: string,
  systemName: string,
  canBuild: number,
  status: "available|limited|unavailable",
  limitingFactor: string,
  missingComponents: MissingComponent[]
}
```

**Implementation Steps:**
1. Fetch import records for batchId
2. Get current system BOMs
3. Calculate availability with current stock
4. Apply stock changes from import
5. Recalculate availability
6. Compare and generate impact
7. Return formatted response

---

### 5. GET /api/inventory/import/logs (CREATE NEW)

**Purpose:** List all import batches with pagination and filtering

**Implementation:**
```typescript
// src/app/api/inventory/import/logs/route.ts

Endpoint: GET /api/inventory/import/logs?status=all&limit=20&offset=0
Authentication: Bearer token
Organization Context: Auto-extracted

Query Parameters:
- status: "all|completed|failed|pending" (default: "all")
- limit: number (default: 20, max: 100)
- offset: number (default: 0)

Response:
{
  success: true,
  data: {
    total: number,
    batches: BatchSummary[]
  }
}

Where BatchSummary = {
  batchId: string,
  filename: string,
  status: string,
  uploadedBy: string,
  uploadedAt: string,
  completedAt?: string,
  processingTime: number,
  totalRows: number,
  successCount: number,
  errorCount: number,
  warningCount: number,
  successRate: number
}
```

**Implementation Steps:**
1. Build query with organization filter
2. Add status filter if specified
3. Apply limit and offset for pagination
4. Fetch batch metadata
5. Calculate processing time and success rate
6. Return paginated results

---

### 6. GET /api/inventory/import/logs/:batchId (CREATE NEW)

**Purpose:** Get detailed information about a specific import batch

**Implementation:**
```typescript
// src/app/api/inventory/import/logs/[batchId]/route.ts

Endpoint: GET /api/inventory/import/logs/:batchId
Authentication: Bearer token
Organization Context: Auto-extracted

Response:
{
  success: true,
  data: {
    batch: BatchDetail,
    records: ImportRecord[],
    summary: {
      totalRecords: number,
      successCount: number,
      errorCount: number,
      warningCount: number
    }
  }
}

Where BatchDetail = {
  batchId: string,
  filename: string,
  status: string,
  uploadedBy: string,
  uploadedAt: string,
  completedAt?: string,
  processingTime: number
}

Where ImportRecord = {
  recordId: string,
  rowNumber: number,
  status: "success|error|warning",
  itemCode: string,
  systemCode: string,
  issuedQty: number,
  closingStock: number,
  errors: ValidationError[],
  warnings: ValidationWarning[]
}
```

**Implementation Steps:**
1. Fetch batch by batchId with org filter
2. Fetch import records for batch
3. Format records with status and counts
4. Return detailed batch information

---

## 📁 File Changes Summary

### New Files to Create (3)
```
src/app/api/inventory/import/system-availability/route.ts (150 lines)
src/app/api/inventory/import/logs/route.ts (200 lines)
src/app/api/inventory/import/logs/[batchId]/route.ts (150 lines)
src/repositories/importLogsRepository.ts (100 lines)
```

### Files to Update (3)
```
src/app/api/inventory/import/upload/route.ts (50 → 100 lines)
src/app/api/inventory/import/validate/route.ts (70 → 130 lines)
src/app/api/inventory/import/confirm/route.ts (60 → 140 lines)
src/services/inventoryImportService.ts (add helper functions)
```

### Total Changes
- New code: ~600 lines
- Updated code: ~160 lines
- Total effort: Medium (~2-3 hours)

---

## 🛡️ Error Handling

All endpoints must return standardized error responses:

```typescript
{
  success: false,
  error: {
    code: string,      // Error code
    message: string,   // User-friendly message
    details?: object   // Additional context
  }
}
```

**Standard Error Codes:**
- FILE_INVALID_TYPE - File is not .xlsx
- FILE_SIZE_EXCEEDED - File larger than 50MB
- HEADER_COLUMN_ORDER_MISMATCH - Columns in wrong order
- ITEM_NOT_FOUND - Item code not in database
- DUPLICATE_COMBINATION - Item+System duplicate
- ISSUED_EXCEEDS_CURRENT - Quantity validation failed
- VALIDATION_FAILED - Blocking errors found
- TRANSACTION_FAILED - Database transaction error
- NOT_FOUND - Batch not found
- UNAUTHORIZED - Not authenticated

---

## 🔐 Security Checks

Each endpoint must validate:

```typescript
1. ✅ Authentication (Bearer token present)
2. ✅ Authorization (User same organization)
3. ✅ Input validation (Required fields)
4. ✅ Rate limiting (Optional for import endpoints)
5. ✅ SQL injection prevention (Use parameterized queries)
6. ✅ File upload validation (Type, size, content)
7. ✅ Audit logging (Log all operations)
```

---

## 🧪 Testing Strategy

### Unit Tests
- Test each API route independently
- Mock database responses
- Verify error handling

### Integration Tests
- Test full upload → validate → confirm flow
- Test system availability calculation
- Test logs retrieval and filtering

### E2E Tests
- Upload actual Excel file
- Complete full workflow
- Verify database changes
- Check audit trail

### Performance Tests
- Upload 10MB file: <5 seconds
- Validate 10k rows: <15 seconds
- Calculate availability: <100ms
- Confirm transaction: <10 seconds

---

## 📅 Implementation Order

### Phase 3.1 - Update Existing Routes (Week 1)
1. [ ] Fix POST /api/inventory/import/upload
2. [ ] Fix POST /api/inventory/import/validate
3. [ ] Fix POST /api/inventory/import/confirm
4. [ ] Test with frontend

### Phase 3.2 - Create New Routes (Week 2)
1. [ ] Create POST /api/inventory/import/system-availability
2. [ ] Create GET /api/inventory/import/logs
3. [ ] Create GET /api/inventory/import/logs/:batchId
4. [ ] Test all new routes

### Phase 3.3 - Integration & Testing (Week 3)
1. [ ] E2E workflow testing
2. [ ] Performance benchmarking
3. [ ] Security audit
4. [ ] Production deployment

---

## 🚀 Success Criteria

✅ All 6 endpoints implemented and working
✅ Response formats match integration spec
✅ Error handling comprehensive
✅ All validations functional
✅ E2E workflow completes successfully
✅ Performance targets met (<30 seconds for 10k rows)
✅ No security vulnerabilities
✅ Complete audit trail
✅ Documentation complete
✅ Ready for user testing

---

**Status:** Ready for Implementation
**Version:** 1.0
**Target Completion:** April 21, 2026
