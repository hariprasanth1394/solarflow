/**
 * FRONTEND-TO-BACKEND INTEGRATION GUIDE
 * ======================================
 * 
 * API contracts, request/response formats, and integration patterns
 */

# Integration Guide: Frontend UI with Backend APIs

## 🔌 API Endpoints

### 1. Upload File
**Endpoint:** `POST /api/inventory/import/upload`

**Request:**
```typescript
const formData = new FormData()
formData.append('file', file) // File object from input
formData.append('organizationId', orgId)

const response = await fetch('/api/inventory/import/upload', {
  method: 'POST',
  body: formData,
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
```

**Response (Success 200):**
```json
{
  "success": true,
  "data": {
    "batchId": "08f7c3a2-1b4e-4f6e-9c8d-5e2a7f1b3c4d",
    "fileHash": "a1b2c3d4e5f6g7h8",
    "totalRows": 150,
    "headers": ["Item Code", "System Code", "Issued Qty", "Closing Stock"],
    "preview": [
      {
        "rowNumber": 1,
        "itemCode": "SOL-PV-100",
        "systemCode": "SYS-01",
        "issuedQty": 5,
        "closingStock": 95
      }
    ],
    "uploadedAt": "2024-04-13T10:45:00Z"
  }
}
```

**Response (Error 400):**
```json
{
  "success": false,
  "error": {
    "code": "FILE_INVALID_TYPE",
    "message": "Only Excel files (.xlsx) are accepted",
    "details": {
      "receivedType": "application/pdf",
      "acceptedTypes": ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]
    }
  }
}
```

---

### 2. Validate File
**Endpoint:** `POST /api/inventory/import/validate`

**Request:**
```typescript
const response = await fetch('/api/inventory/import/validate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    batchId: batchId,
    rows: [
      {
        rowNumber: 1,
        itemCode: "SOL-PV-100",
        systemCode: "SYS-01",
        issuedQty: 5,
        closingStock: 95
      },
      // ... more rows
    ]
  })
})
```

**Response (Success 200):**
```json
{
  "success": true,
  "data": {
    "batchId": "08f7c3a2-1b4e-4f6e-9c8d-5e2a7f1b3c4d",
    "validationReport": {
      "totalRows": 150,
      "validRows": 145,
      "errorCount": 3,
      "warningCount": 2,
      "duplicateCount": 5
    },
    "rows": [
      {
        "rowNumber": 1,
        "status": "valid",
        "errors": [],
        "warnings": [],
        "itemId": "item-001",
        "systemId": "system-001",
        "issuedQty": 5,
        "closingStock": 95
      },
      {
        "rowNumber": 2,
        "status": "error",
        "errors": [
          {
            "code": "ISSUED_EXCEEDS_CURRENT",
            "field": "issuedQty",
            "message": "Issued quantity cannot exceed current stock",
            "value": "120",
            "currentStock": "95"
          }
        ],
        "warnings": []
      },
      {
        "rowNumber": 5,
        "status": "warning",
        "errors": [],
        "warnings": [
          {
            "code": "CLOSING_STOCK_BELOW_MIN",
            "field": "closingStock",
            "message": "Closing stock below minimum recommended level",
            "value": "5",
            "minimumStock": "10"
          }
        ]
      }
    ]
  }
}
```

**Response (Error - Validation Failed 422):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Import file contains errors that must be fixed",
    "details": {
      "totalErrors": 3,
      "failRows": [2, 6, 12]
    }
  }
}
```

---

### 3. System Availability Impact
**Endpoint:** `POST /api/inventory/import/system-availability` (NEW)

**Request:**
```typescript
const response = await fetch('/api/inventory/import/system-availability', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    batchId: batchId,
    organizationId: orgId,
    includeImpactAnalysis: true
  })
})
```

**Response (Success 200):**
```json
{
  "success": true,
  "data": {
    "before": [
      {
        "systemId": "system-001",
        "systemName": "Solar Kit A 5KW",
        "canBuild": 8,
        "status": "available",
        "limitingFactor": "Inverter 5KW",
        "missingComponents": []
      },
      {
        "systemId": "system-002",
        "systemName": "Solar Kit B 10KW",
        "canBuild": 2,
        "status": "limited",
        "limitingFactor": "DC Breaker 63A",
        "missingComponents": [
          {
            "itemId": "item-045",
            "itemCode": "SOL-BREAKER-63A",
            "itemName": "DC Breaker 63A",
            "required": 2,
            "available": 1,
            "shortage": 1
          }
        ]
      }
    ],
    "after": [
      {
        "systemId": "system-001",
        "systemName": "Solar Kit A 5KW",
        "canBuild": 5,
        "status": "limited"
      },
      {
        "systemId": "system-002",
        "systemName": "Solar Kit B 10KW",
        "canBuild": 1,
        "status": "unavailable"
      }
    ],
    "impact": {
      "systemsAffected": 2,
      "systemsImproved": 0,
      "systemsWorsened": 2,
      "newShortages": 3,
      "summary": "Import will reduce system availability. Review shortages before confirming."
    }
  }
}
```

---

### 4. Confirm Import
**Endpoint:** `POST /api/inventory/import/confirm`

**Request:**
```typescript
const response = await fetch('/api/inventory/import/confirm', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    batchId: batchId,
    performedBy: userId,
    notes: "Monthly stock audit reconciliation"
  })
})
```

**Response (Success 200):**
```json
{
  "success": true,
  "data": {
    "batchId": "08f7c3a2-1b4e-4f6e-9c8d-5e2a7f1b3c4d",
    "status": "completed",
    "summary": {
      "totalRows": 150,
      "successCount": 150,
      "errorCount": 0,
      "processingTime": "8.2s",
      "completedAt": "2024-04-13T10:53:42Z"
    },
    "stockMovement": {
      "itemsAffected": 47,
      "totalQtyIssued": 1250,
      "totalValueIssued": 125000.50
    },
    "systemImpact": {
      "systemsAffected": 5,
      "availabilityReduction": {
        "SYS-01": { before: 8, after: 5 },
        "SYS-02": { before: 2, after: 1 }
      },
      "newShortages": ["SYS-03", "SYS-05"]
    }
  ]
}
```

**Response (Error - Transaction Failed 500):**
```json
{
  "success": false,
  "error": {
    "code": "TRANSACTION_FAILED",
    "message": "Import transaction rolled back due to constraint violation",
    "details": {
      "failedRow": 45,
      "constraint": "stock_cannot_go_negative",
      "reason": "Stock change would violate minimum stock constraint"
    }
  }
}
```

---

### 5. Get Batch Logs
**Endpoint:** `GET /api/inventory/import/logs?status=all&limit=20&offset=0`

**Request:**
```typescript
const response = await fetch(
  '/api/inventory/import/logs?status=all&limit=20&offset=0',
  {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
)
```

**Response (Success 200):**
```json
{
  "success": true,
  "data": {
    "total": 47,
    "batches": [
      {
        "batchId": "08f7c3a2-1b4e-4f6e-9c8d-5e2a7f1b3c4d",
        "filename": "stock_import_2024_04_13.xlsx",
        "status": "completed",
        "uploadedBy": "john.doe@company.com",
        "uploadedAt": "2024-04-13T10:45:00Z",
        "completedAt": "2024-04-13T10:53:42Z",
        "processingTime": 512,
        "totalRows": 150,
        "successCount": 150,
        "errorCount": 0,
        "warningCount": 0,
        "successRate": 100
      },
      {
        "batchId": "abcd1234-efgh5678-ijkl9012",
        "filename": "stock_import_2024_04_12.xlsx",
        "status": "failed",
        "uploadedBy": "jane.smith@company.com",
        "uploadedAt": "2024-04-12T14:30:00Z",
        "completedAt": "2024-04-12T14:31:05Z",
        "processingTime": 65,
        "totalRows": 200,
        "successCount": 150,
        "errorCount": 50,
        "warningCount": 10,
        "successRate": 75
      }
    ]
  }
}
```

---

### 6. Get Batch Details
**Endpoint:** `GET /api/inventory/import/logs/:batchId`

**Request:**
```typescript
const response = await fetch(
  `/api/inventory/import/logs/${batchId}`,
  {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
)
```

**Response (Success 200):**
```json
{
  "success": true,
  "data": {
    "batch": {
      "batchId": "08f7c3a2-1b4e-4f6e-9c8d-5e2a7f1b3c4d",
      "filename": "stock_import_2024_04_13.xlsx",
      "status": "completed",
      "uploadedBy": "john.doe@company.com",
      "uploadedAt": "2024-04-13T10:45:00Z",
      "completedAt": "2024-04-13T10:53:42Z",
      "processingTime": 512
    },
    "records": [
      {
        "recordId": "rec-001",
        "rowNumber": 1,
        "status": "success",
        "itemCode": "SOL-PV-100",
        "systemCode": "SYS-01",
        "issuedQty": 5,
        "closingStock": 95,
        "errors": [],
        "warnings": []
      },
      {
        "recordId": "rec-002",
        "rowNumber": 2,
        "status": "success",
        "itemCode": "SOL-INV-5K",
        "systemCode": "SYS-01",
        "issuedQty": 1,
        "closingStock": 9,
        "errors": [],
        "warnings": [
          {
            "code": "CLOSING_STOCK_BELOW_MIN",
            "message": "Stock below minimum recommendation"
          }
        ]
      }
    ],
    "summary": {
      "totalRecords": 150,
      "successCount": 150,
      "errorCount": 0,
      "warningCount": 5
    }
  }
}
```

---

## 🔗 Code Integration Examples

### Complete Upload Flow
```typescript
// src/modules/inventory/InventoryImportPageV2.tsx

async function handleFileUpload(file: File) {
  try {
    setStatus('uploading')
    
    const formData = new FormData()
    formData.append('file', file)
    formData.append('organizationId', orgId)
    
    const response = await fetch('/api/inventory/import/upload', {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error.message)
    }
    
    const result = await response.json()
    
    setBatchId(result.data.batchId)
    setFileHash(result.data.fileHash)
    setRows(result.data.preview.map((row, idx) => ({
      ...row,
      rowNumber: idx + 1,
      status: 'pending' as const,
      errors: [],
      warnings: []
    })))
    
    setScreen('preview')
    setStatus('ready')
  } catch (error) {
    setError(error.message)
    setStatus('error')
  }
}
```

### Validation Flow
```typescript
async function handleValidate() {
  try {
    setStatus('validating')
    
    const response = await fetch('/api/inventory/import/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        batchId,
        rows: rows.map(r => ({
          rowNumber: r.rowNumber,
          itemCode: r.itemCode,
          systemCode: r.systemCode,
          issuedQty: r.issuedQty,
          closingStock: r.closingStock
        }))
      })
    })
    
    const result = await response.json()
    
    if (!result.success) {
      setErrorData(result.error)
      setScreen('error')
      return
    }
    
    // Update rows with validation results
    const validatedRows = result.data.rows.map(vr => ({
      ...rows.find(r => r.rowNumber === vr.rowNumber),
      status: vr.status,
      errors: vr.errors,
      warnings: vr.warnings
    }))
    
    setRows(validatedRows)
    setScreen('impact')
    setStatus('ready')
  } catch (error) {
    setError(error.message)
    setStatus('error')
  }
}
```

### System Availability Impact
```typescript
async function handleCalculateAvailability() {
  try {
    setStatus('calculating')
    
    const response = await fetch('/api/inventory/import/system-availability', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        batchId,
        organizationId: orgId,
        includeImpactAnalysis: true
      })
    })
    
    const result = await response.json()
    
    if (!result.success) {
      setError(result.error.message)
      return
    }
    
    setSystemAvailability({
      before: result.data.before,
      after: result.data.after,
      impact: result.data.impact
    })
    
    setStatus('ready')
  } catch (error) {
    setError(error.message)
  }
}
```

### Confirm Import
```typescript
async function handleConfirmImport() {
  try {
    setStatus('confirming')
    
    const response = await fetch('/api/inventory/import/confirm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        batchId,
        performedBy: userId,
        notes: ''
      })
    })
    
    const result = await response.json()
    
    if (!result.success) {
      setError(result.error.message)
      setScreen('error')
      return
    }
    
    setSummary(result.data)
    setScreen('success')
    setStatus('ready')
  } catch (error) {
    setError(error.message)
    setScreen('error')
  }
}
```

### Fetch Logs
```typescript
async function loadImportLogs(status = 'all', limit = 20, offset = 0) {
  try {
    const query = new URLSearchParams({
      status,
      limit: limit.toString(),
      offset: offset.toString()
    })
    
    const response = await fetch(
      `/api/inventory/import/logs?${query}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    )
    
    const result = await response.json()
    setLogs(result.data.batches)
    setLogsTotal(result.data.total)
  } catch (error) {
    setError(error.message)
  }
}
```

---

## 🛠️ Backend Implementation Checklist

### Required Database Tables
- [ ] `import_batches` - Track import sessions
- [ ] `import_records` - Store individual row data
- [ ] `stock_transactions` - Audit trail
- [ ] `system_boms` - System component requirements
- [ ] `spare_items` - Component master data

### Required API Routes
- [ ] `POST /api/inventory/import/upload`
- [ ] `POST /api/inventory/import/validate`
- [ ] `POST /api/inventory/import/system-availability` (NEW)
- [ ] `POST /api/inventory/import/confirm`
- [ ] `GET /api/inventory/import/logs`
- [ ] `GET /api/inventory/import/logs/:batchId`

### Required Services
- [ ] `inventoryImportService` - Orchestration
- [ ] `validationEngine` - Row validation
- [ ] `systemAvailabilityService` - Availability calculation
- [ ] `auditLogService` - Transaction tracking

### Required Utils
- [ ] `systemAvailabilityCalculator.ts` - BOM calculation
- [ ] `errorResponse.ts` - Standardized responses
- [ ] `validateUUID.ts` - Input validation

---

## 🔐 Security Considerations

### Authentication
- All endpoints require Bearer token in Authorization header
- Token validated at middleware level
- User context attached to request

### Authorization
- User can only view/edit within their organization
- `organizationId` enforced in all queries
- Row-level security for sensitive data

### Input Validation
- File type checked (must be .xlsx)
- All numeric inputs validated (no negatives)
- Strings checked for length and characters
- Foreign key lookups performed safely

### Transaction Safety
- All import operations in database transaction
- Rollback on any error
- Audit trail created for all changes

---

## 📊 Error Handling Strategy

### Validation Errors (422)
- **Trigger:** Validation failed, user action required
- **Response:** Detailed error list with code and location
- **UI Action:** Show ErrorScreen with fix options
- **User Action:** Edit data or upload different file

### Business Logic Errors (400)
- **Trigger:** Invalid file, header mismatch, etc
- **Response:** Single error with context
- **UI Action:** Show error message with guidance
- **User Action:** Fix and retry

### Transaction Errors (500)
- **Trigger:** Database constraint violation during confirm
- **Response:** Transaction rolled back, detailed reason
- **UI Action:** Show error with failed row
- **User Action:** Edit row and retry

---

## 📈 Monitoring & Logging

### Metrics to Track
- Import success rate
- Average rows per import
- Processing time distribution
- Error rate by error code
- System availability impact distribution

### Logs to Maintain
- All API requests/responses
- Validation results
- Transaction details
- System availability calculations
- Error events with context

---

**Integration Status:** Ready for Backend Implementation
**Framework:** Next.js API Routes with TypeScript
**Version:** 1.0
