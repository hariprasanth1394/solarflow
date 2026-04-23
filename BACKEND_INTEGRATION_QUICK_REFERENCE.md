/**
 * BACKEND INTEGRATION - QUICK REFERENCE & TESTING GUIDE
 * ======================================================
 * 
 * Fast reference for API endpoints and integration testing
 */

# Backend Integration Quick Reference

## 🚀 API Endpoints Summary

### All 6 Endpoints Implemented

```
✅ POST /api/inventory/import/upload
✅ POST /api/inventory/import/validate  
✅ POST /api/inventory/import/system-availability
✅ POST /api/inventory/import/confirm
✅ GET /api/inventory/import/logs
✅ GET /api/inventory/import/logs/:batchId
```

## 🔗 Integration Tests

### Test 1: Complete Happy Path (Valid 5-Row Import)

**Scenario:** Upload valid data, validate, calculate impact, confirm

```bash
# 1. Upload File
curl -X POST http://localhost:3000/api/inventory/import/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@valid_import.xlsx" \
  -F "organizationId=org-123"

# Response:
{
  "success": true,
  "data": {
    "batchId": "batch-123",
    "fileHash": "hash-abc",
    "totalRows": 5,
    "headers": ["Item Code", "System Code", "Issued Qty", "Closing Stock"],
    "preview": [/* first 5 rows */],
    "uploadedAt": "2024-04-14T..."
  }
}

# 2. Validate
curl -X POST http://localhost:3000/api/inventory/import/validate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "batchId": "batch-123",
    "rows": [
      {
        "rowNumber": 1,
        "itemCode": "SOL-PV-100",
        "systemCode": "SYS-01",
        "issuedQty": 5,
        "closingStock": 95
      }
    ]
  }'

# Response:
{
  "success": true,
  "data": {
    "batchId": "batch-123",
    "validationReport": {
      "totalRows": 5,
      "validRows": 5,
      "errorCount": 0,
      "warningCount": 0,
      "duplicateCount": 0
    },
    "rows": [
      {
        "rowNumber": 1,
        "status": "valid",
        "errors": [],
        "warnings": [],
        "itemId": "item-001",
        "systemId": "system-001"
      }
    ]
  }
}

# 3. Calculate System Availability
curl -X POST http://localhost:3000/api/inventory/import/system-availability \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "batchId": "batch-123",
    "includeImpactAnalysis": true
  }'

# Response:
{
  "success": true,
  "data": {
    "before": [
      {
        "systemId": "system-001",
        "systemName": "Solar Kit 5KW",
        "canBuild": 8,
        "status": "available",
        "limitingFactor": "Inverter",
        "missingComponents": []
      }
    ],
    "after": [
      {
        "systemId": "system-001",
        "systemName": "Solar Kit 5KW",
        "canBuild": 5,
        "status": "limited",
        "limitingFactor": "Inverter",
        "missingComponents": []
      }
    ],
    "impact": {
      "systemsAffected": 1,
      "systemsImproved": 0,
      "systemsWorsened": 1,
      "newShortages": 0,
      "summary": "Import will reduce system availability for 1 system(s)..."
    }
  }
}

# 4. Confirm Import
curl -X POST http://localhost:3000/api/inventory/import/confirm \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "batchId": "batch-123",
    "performedBy": "user-456",
    "notes": ""
  }'

# Response:
{
  "success": true,
  "data": {
    "batchId": "batch-123",
    "status": "success",
    "summary": {
      "totalRows": 5,
      "successCount": 5,
      "errorCount": 0,
      "processingTime": "2.3s",
      "completedAt": "2024-04-14T..."
    },
    "stockMovement": {
      "itemsAffected": 3,
      "totalQtyIssued": 15,
      "totalValueIssued": 5250.00
    },
    "systemImpact": {
      "systemsAffected": 1,
      "availabilityReduction": {},
      "newShortages": []
    }
  }
}

# 5. View Batch Logs
curl -X GET "http://localhost:3000/api/inventory/import/logs?status=all&limit=20&offset=0" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Response:
{
  "success": true,
  "data": {
    "total": 3,
    "batches": [
      {
        "batchId": "batch-123",
        "filename": "stock_import.xlsx",
        "status": "completed",
        "uploadedBy": "user@example.com",
        "uploadedAt": "2024-04-14T...",
        "completedAt": "2024-04-14T...",
        "processingTime": 138,
        "totalRows": 5,
        "successCount": 5,
        "errorCount": 0,
        "warningCount": 0,
        "successRate": 100
      }
    ]
  }
}

# 6. View Batch Details
curl -X GET http://localhost:3000/api/inventory/import/logs/batch-123 \
  -H "Authorization: Bearer YOUR_TOKEN"

# Response:
{
  "success": true,
  "data": {
    "batch": {
      "batchId": "batch-123",
      "filename": "stock_import.xlsx",
      "status": "completed",
      "uploadedBy": "user@example.com",
      "uploadedAt": "2024-04-14T...",
      "completedAt": "2024-04-14T...",
      "processingTime": 138
    },
    "records": [
      {
        "recordId": "record-001",
        "rowNumber": 1,
        "status": "completed",
        "itemCode": "SOL-PV-100",
        "systemCode": "SYS-01",
        "issuedQty": 5,
        "closingStock": 95,
        "errors": [],
        "warnings": []
      }
    ],
    "summary": {
      "totalRecords": 5,
      "successCount": 5,
      "errorCount": 0,
      "warningCount": 0
    }
  }
}
```

---

## 🧪 Test Scenarios

### Test 2: Error Case (Invalid Item Code)

**Request:**
```json
{
  "batchId": "batch-456",
  "rows": [
    {
      "rowNumber": 1,
      "itemCode": "INVALID-CODE",
      "systemCode": "SYS-01",
      "issuedQty": 5,
      "closingStock": 95
    }
  ]
}
```

**Expected Response (422):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Failed to validate rows"
  }
}
```

---

### Test 3: Duplicate Detection

**Request:**
```json
{
  "batchId": "batch-789",
  "rows": [
    {
      "rowNumber": 1,
      "itemCode": "SOL-PV-100",
      "systemCode": "SYS-01",
      "issuedQty": 5,
      "closingStock": 95
    },
    {
      "rowNumber": 2,
      "itemCode": "SOL-PV-100",
      "systemCode": "SYS-01",
      "issuedQty": 3,
      "closingStock": 92
    }
  ]
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "validationReport": {
      "duplicateCount": 1
    }
  }
}
```

---

### Test 4: Warning Case (Stock Below Minimum)

**Request:**
```json
{
  "batchId": "batch-000",
  "rows": [
    {
      "rowNumber": 1,
      "itemCode": "SOL-PV-100",
      "systemCode": "SYS-01",
      "issuedQty": 95,
      "closingStock": 5
    }
  ]
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "validationReport": {
      "warningCount": 1
    },
    "rows": [
      {
        "status": "warning",
        "warnings": [
          {
            "code": "CLOSING_STOCK_BELOW_MIN",
            "message": "Stock below minimum threshold"
          }
        ]
      }
    ]
  }
}
```

---

## 📋 Pre-Integration Checklist

### Environment Setup
- [ ] Supabase project configured
- [ ] Import batch tables created (import_batches, import_records)
- [ ] Stock transaction tables exist (stock_transactions)
- [ ] System BOMs table exists (system_boms)
- [ ] Spares/items master data populated
- [ ] Systems data populated

### Code Dependencies
- [ ] inventoryImportService.ts exists and exported
- [ ] systemAvailabilityCalculator.ts exists with calculateSystemAvailabilityForBom()
- [ ] withOrganizationContext utility exists
- [ ] getAuth from Clerk available
- [ ] supabase client configured

### API Routes
- [ ] All 6 route files created in correct locations
- [ ] No TypeScript compilation errors
- [ ] Routes match integration spec exactly
- [ ] Error responses use consistent format

### Testing Setup
- [ ] Postman collection created with all 6 endpoints
- [ ] Test data prepared (valid Excel file)
- [ ] Auth tokens available
- [ ] Organization ID for testing set

---

## 🔧 Common Issues & Fixes

### Issue 1: "No rows to validate" Error
**Cause:** Empty rows array sent
**Fix:** Ensure rows array has at least 1 item with all required fields

### Issue 2: Auth Error (401)
**Cause:** Missing or invalid Bearer token
**Fix:** Check token is valid and not expired
```
Header: Authorization: Bearer {token}
```

### Issue 3: Database Connection Error
**Cause:** Supabase client not configured
**Fix:** Verify .env has NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY

### Issue 4: Batch Not Found (404)
**Cause:** batchId doesn't exist or not in user's organization  
**Fix:** Verify batch was created in current organization

### Issue 5: File Parse Error
**Cause:** File is corrupted or wrong format
**Fix:** Ensure file is valid .xlsx with correct column headers

---

## 📊 Performance Benchmarks

Run these tests to verify performance:

```bash
# Test 1: Upload 1MB file
time curl -X POST http://localhost:3000/api/inventory/import/upload \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@1mb_file.xlsx"
# Target: < 2 seconds

# Test 2: Validate 100 rows
time curl -X POST http://localhost:3000/api/inventory/import/validate \
  -H "Authorization: Bearer TOKEN" \
  -d '{...100 rows...}'
# Target: < 2 seconds

# Test 3: System availability (100 systems)
time curl -X POST http://localhost:3000/api/inventory/import/system-availability \
  -H "Authorization: Bearer TOKEN" \
  -d '{"batchId": "batch-123"}'
# Target: < 100ms
```

---

## 🎯 Frontend Integration Points

### From Frontend (InventoryImportPageV2.tsx)

```typescript
// Upload
fetch('/api/inventory/import/upload', {
  method: 'POST',
  body: formData,  // contains file
  headers: { 'Authorization': `Bearer ${token}` }
})

// Validate
fetch('/api/inventory/import/validate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ batchId, rows })
})

// System Availability
fetch('/api/inventory/import/system-availability', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ batchId, includeImpactAnalysis: true })
})

// Confirm
fetch('/api/inventory/import/confirm', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ batchId, performedBy: userId })
})

// Get Logs
fetch('/api/inventory/import/logs?status=all&limit=20&offset=0', {
  method: 'GET',
  headers: { 'Authorization': `Bearer ${token}` }
})

// Get Batch Details
fetch(`/api/inventory/import/logs/${batchId}`, {
  method: 'GET',
  headers: { 'Authorization': `Bearer ${token}` }
})
```

---

## ✅ Verification Checklist

After implementing, verify:

- [ ] All 6 endpoints return 200 on success
- [ ] All errors use standardized format
- [ ] Response data matches integration spec
- [ ] Auth works (401 on missing token)
- [ ] OrgId enforcement works (can't access other orgs)
- [ ] File upload validation works
- [ ] Validation engine called correctly
- [ ] System availability calculated correctly
- [ ] Transaction completes successfully
- [ ] Stock changes recorded in database
- [ ] Audit trail created
- [ ] Logs retrieve batches correctly
- [ ] Batch details return record info

---

## 📞 Integration Support

**Questions?** Check:
1. FRONTEND_BACKEND_INTEGRATION.md for full spec
2. Response examples above
3. Error codes list
4. Frontend component code for expectations

**Issues?** Check:
1. Auth token validity
2. Organization context
3. Database schema
4. Service function implementation
5. Error logs in terminal/Sentry

---

**Status:** Ready for Integration Testing
**Date Created:** April 14, 2026
**Last Updated:** April 14, 2026
