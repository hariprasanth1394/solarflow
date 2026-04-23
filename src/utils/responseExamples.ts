/**
 * Excel Import - API Response Examples
 * Real-world JSON examples for all scenarios
 */

// ============================================================
// SUCCESS RESPONSES
// ============================================================

export const RESPONSE_EXAMPLES = {
  // ============================================================
  // 1. UPLOAD SUCCESS (File parsed successfully)
  // ============================================================
  uploadSuccess: {
    success: true,
    data: {
      fileHash: 'sha256_7a8f2c1b9e4d5f3a6c8e2b1f7a9d4c5e',
      totalRows: 150,
      preview: {
        first5Rows: [
          {
            itemCode: 'PANEL-001',
            itemName: 'Solar Panel 400W',
            systemCode: 'SYS-A',
            systemName: 'System A - 10kW',
            currentStock: 100,
            issuedQty: 10,
            closingStock: 90,
            unitCost: 250
          },
          {
            itemCode: 'INV-001',
            itemName: 'Inverter 8kW',
            systemCode: 'SYS-A',
            systemName: 'System A - 10kW',
            currentStock: 50,
            issuedQty: 5,
            closingStock: 45,
            unitCost: 1500
          }
        ]
      }
    },
    metadata: {
      processingTimeMs: 1200,
      fileName: 'stock_import_2024-04-13.xlsx'
    }
  },

  // ============================================================
  // 2. VALIDATION SUCCESS (All rows valid)
  // ============================================================
  validationSuccess: {
    success: true,
    data: {
      batchId: '08f7c3a2-1b4e-4f6e-9c8d-5e2a7f1b3c4d',
      fileHash: 'sha256_7a8f2c1b9e4d5f3a6c8e2b1f7a9d4c5e',
      validationReport: {
        totalRows: 150,
        validRows: 150,
        warningRows: 3,
        errorRows: 0,
        duplicateRows: 0
      },
      warnings: [
        {
          rowNumber: 23,
          field: 'Current Stock',
          code: 'CURRENT_STOCK_MISMATCH',
          message: 'Current Stock in file differs from database (DB: 95, File: 100)',
          severity: 'warning',
          details: {
            dbStock: 95,
            fileStock: 100,
            difference: 5
          }
        },
        {
          rowNumber: 45,
          field: 'Closing Stock',
          code: 'CLOSING_STOCK_REACHES_ZERO',
          message: 'Item will be out of stock after import',
          severity: 'warning'
        },
        {
          rowNumber: 67,
          field: 'Issued Qty',
          code: 'LARGE_QUANTITY_CHANGE',
          message: 'Unusually large quantity change detected: 75.0% reduction',
          severity: 'warning',
          details: {
            percentage: '75.0'
          }
        }
      ]
    },
    metadata: {
      processingTimeMs: 3500,
      batchId: '08f7c3a2-1b4e-4f6e-9c8d-5e2a7f1b3c4d'
    }
  },

  // ============================================================
  // 3. CONFIRMATION & IMPACT PREVIEW
  // ============================================================
  confirmationSuccess: {
    success: true,
    data: {
      batchId: '08f7c3a2-1b4e-4f6e-9c8d-5e2a7f1b3c4d',
      impact: {
        summary: {
          totalAffected: 150,
          totalIssuedQuantity: 1250,
          itemsAtZeroStock: 3,
          itemsAboveMinimum: 147
        },
        affectedItems: [
          {
            itemCode: 'PANEL-001',
            itemName: 'Solar Panel 400W',
            currentStock: 100,
            issuedQty: 10,
            closingStock: 90,
            willBeAtZeroStock: false,
            willBeBelowMinimum: false
          },
          {
            itemCode: 'CONNECTOR-001',
            itemName: 'Connector Set',
            currentStock: 25,
            issuedQty: 25,
            closingStock: 0,
            willBeAtZeroStock: true,
            willBeBelowMinimum: false,
            minStock: 20
          }
        ],
        systemAvailabilityBefore: [
          {
            systemId: 'sys-1',
            systemName: 'System A - 10kW',
            canBuild: 20,
            status: 'available'
          },
          {
            systemId: 'sys-2',
            systemName: 'System B - 8kW',
            canBuild: 5,
            status: 'limited'
          }
        ],
        systemAvailabilityAfter: [
          {
            systemId: 'sys-1',
            systemName: 'System A - 10kW',
            canBuild: 15,
            status: 'limited',
            shortageDetected: false
          },
          {
            systemId: 'sys-2',
            systemName: 'System B - 8kW',
            canBuild: 0,
            status: 'unavailable',
            shortageDetected: true,
            missingComponents: [
              {
                spareName: 'Connector Set',
                required: 5,
                available: 0,
                shortage: 5
              }
            ]
          }
        ]
      }
    },
    metadata: {
      processingTimeMs: 2800,
      batchId: '08f7c3a2-1b4e-4f6e-9c8d-5e2a7f1b3c4d'
    }
  },

  // ============================================================
  // 4. IMPORT COMPLETION SUCCESS
  // ============================================================
  importSuccess: {
    success: true,
    data: {
      batchId: '08f7c3a2-1b4e-4f6e-9c8d-5e2a7f1b3c4d',
      status: 'completed',
      summary: {
        totalRows: 150,
        successfulRows: 150,
        failedRows: 0,
        timestamp: '2024-04-13T10:45:30.123Z',
        processingTimeMs: 5234
      },
      stockMovement: {
        totalItemsAffected: 150,
        totalQuantityIssued: 1250,
        totalValueIssued: 312500,
        transactionCount: 150
      },
      systemImpact: {
        systemsAffected: ['sys-1', 'sys-2'],
        availabilityReduction: [
          {
            systemId: 'sys-1',
            systemName: 'System A - 10kW',
            beforeAvailable: 20,
            afterAvailable: 15,
            reduction: 5
          },
          {
            systemId: 'sys-2',
            systemName: 'System B - 8kW',
            beforeAvailable: 5,
            afterAvailable: 0,
            reduction: 5
          }
        ]
      },
      audit: {
        uploadedBy: 'john.doe@company.com',
        uploadedAt: '2024-04-13T10:40:00Z',
        completedAt: '2024-04-13T10:45:30Z',
        batchId: '08f7c3a2-1b4e-4f6e-9c8d-5e2a7f1b3c4d'
      },
      nextSteps: [
        'Review system availability impact',
        'Plan procurement for items at zero stock',
        'Monitor low stock alerts'
      ]
    },
    metadata: {
      processingTimeMs: 5234,
      organizationId: 'org-123',
      batchId: '08f7c3a2-1b4e-4f6e-9c8d-5e2a7f1b3c4d'
    }
  },

  // ============================================================
  // ERROR RESPONSES
  // ============================================================

  // ============================================================
  // 1. INVALID FILE TYPE
  // ============================================================
  errorInvalidFileType: {
    success: false,
    error: {
      code: 'FILE_INVALID_TYPE',
      message: 'Only .xlsx files are supported',
      severity: 'error',
      httpStatus: 400,
      timestamp: '2024-04-13T10:45:30.123Z',
      requestId: 'req_1713011130123_a7f3c2b1',
      details: {
        fileName: 'stock_import.csv',
        expectedType: '.xlsx',
        providedType: '.csv'
      }
    },
    retryable: false,
    suggestedAction: 'Convert the file to .xlsx format and upload again'
  },

  // ============================================================
  // 2. HEADER MISMATCH ERROR
  // ============================================================
  errorHeaderMismatch: {
    success: false,
    error: {
      code: 'HEADER_COLUMN_NAME_MISMATCH',
      message: 'Column 6: expected "Issued Qty", found "Issue Qty"',
      severity: 'error',
      httpStatus: 400,
      timestamp: '2024-04-13T10:45:30.123Z',
      requestId: 'req_1713011130123_a7f3c2b1',
      context: {
        fileName: 'stock_import.xlsx'
      },
      details: {
        position: 6,
        expected: 'Issued Qty',
        found: 'Issue Qty',
        expectedColumns: [
          'Item Code',
          'Item Name',
          'System Code',
          'System Name',
          'Current Stock',
          'Issued Qty',
          'Closing Stock',
          'Unit Cost'
        ],
        providedColumns: [
          'Item Code',
          'Item Name',
          'System Code',
          'System Name',
          'Current Stock',
          'Issue Qty',
          'Closing Stock',
          'Unit Cost'
        ]
      }
    },
    retryable: false,
    suggestedAction: 'Download the correct template and use it for your import'
  },

  // ============================================================
  // 3. VALIDATION FAILED WITH ERRORS & DUPLICATES
  // ============================================================
  errorValidationFailed: {
    success: false,
    error: {
      code: 'VALIDATION_FAILED',
      message: 'Validation failed: 8 error(s), 12 warning(s), 2 duplicate(s)',
      severity: 'error',
      httpStatus: 400,
      timestamp: '2024-04-13T10:45:30.123Z',
      requestId: 'req_1713011130123_a7f3c2b1'
    },
    validationErrors: [
      {
        rowNumber: 5,
        field: 'Item Code',
        code: 'ITEM_NOT_FOUND',
        message: 'Item Code does not exist in inventory: "PANEL-999"',
        severity: 'error',
        value: 'PANEL-999'
      },
      {
        rowNumber: 12,
        field: 'System Code',
        code: 'SYSTEM_NOT_FOUND',
        message: 'System Code does not exist: "SYS-Z"',
        severity: 'error',
        value: 'SYS-Z'
      },
      {
        rowNumber: 23,
        field: 'Issued Qty',
        code: 'ISSUED_QTY_NEGATIVE',
        message: 'Issued Qty cannot be negative',
        severity: 'error',
        value: -10
      },
      {
        rowNumber: 34,
        field: 'Closing Stock',
        code: 'CLOSING_EXCEEDS_CURRENT',
        message: 'Closing Stock cannot exceed Current Stock',
        severity: 'error',
        details: {
          current: 100,
          closing: 150
        }
      },
      {
        rowNumber: 45,
        field: 'Issued Qty',
        code: 'ISSUED_EXCEEDS_CURRENT',
        message: 'Issued Qty cannot exceed Current Stock',
        severity: 'error',
        details: {
          current: 50,
          issued: 75
        }
      },
      {
        rowNumber: 56,
        field: 'Closing Stock',
        code: 'MANDATORY_FIELD_MISSING',
        message: 'Neither Issued Qty nor Closing Stock provided',
        severity: 'error'
      },
      {
        rowNumber: 67,
        field: 'Item Code',
        code: 'ITEM_CODE_INVALID_FORMAT',
        message: 'Item Code contains invalid characters: "PANEL@001"',
        severity: 'error',
        value: 'PANEL@001'
      },
      {
        rowNumber: 78,
        field: 'Closing Stock',
        code: 'STOCK_CALCULATION_MISMATCH',
        message: 'Closing Stock does not match formula: Current Stock - Issued Qty',
        severity: 'error',
        details: {
          expected: 85,
          provided: 80,
          formula: '100 - 15'
        }
      }
    ],
    validationWarnings: [
      {
        rowNumber: 8,
        field: 'Current Stock',
        code: 'CURRENT_STOCK_MISMATCH',
        message: 'Current Stock in file differs from database (DB: 95, File: 100)',
        severity: 'warning',
        details: {
          dbStock: 95,
          fileStock: 100,
          difference: 5
        }
      },
      {
        rowNumber: 15,
        field: 'Closing Stock',
        code: 'CLOSING_STOCK_REACHES_ZERO',
        message: 'Item will be out of stock after import',
        severity: 'warning'
      },
      {
        rowNumber: 28,
        field: 'Closing Stock',
        code: 'CLOSING_STOCK_BELOW_MIN',
        message: 'Closing Stock will be below minimum threshold (Min: 20)',
        severity: 'warning',
        details: {
          closing: 15,
          minimum: 20
        }
      }
    ],
    duplicates: [
      {
        itemCode: 'PANEL-001',
        systemCode: 'SYS-A',
        rows: [10, 25, 42]
      },
      {
        itemCode: 'INV-001',
        systemCode: 'SYS-B',
        rows: [33, 61]
      }
    ],
    summary: {
      totalErrors: 8,
      totalWarnings: 12,
      totalDuplicates: 5,
      blockingErrors: true
    },
    retryable: false,
    suggestedAction: 'Review error details, fix the data, and resubmit. Download error report for reference.'
  },

  // ============================================================
  // 4. VALIDATION PASSED WITH WARNINGS
  // ============================================================
  warningValidationPassed: {
    success: true,
    error: {
      code: 'VALIDATION_WITH_WARNINGS',
      message: 'Validation passed with 5 warning(s)',
      severity: 'warning',
      httpStatus: 200,
      timestamp: '2024-04-13T10:45:30.123Z',
      requestId: 'req_1713011130123_a7f3c2b1'
    },
    validationErrors: [],
    validationWarnings: [
      {
        rowNumber: 8,
        field: 'Current Stock',
        code: 'CURRENT_STOCK_MISMATCH',
        message: 'Current Stock in file differs from database (DB: 95, File: 100)',
        severity: 'warning',
        details: {
          dbStock: 95,
          fileStock: 100,
          difference: 5
        }
      },
      {
        rowNumber: 15,
        field: 'Closing Stock',
        code: 'CLOSING_STOCK_REACHES_ZERO',
        message: 'Item will be out of stock after import',
        severity: 'warning',
        value: 0
      },
      {
        rowNumber: 28,
        field: 'Closing Stock',
        code: 'CLOSING_STOCK_BELOW_MIN',
        message: 'Closing Stock will be below minimum threshold (Min: 20)',
        severity: 'warning',
        details: {
          closing: 15,
          minimum: 20
        }
      },
      {
        rowNumber: 42,
        field: 'Issued Qty',
        code: 'LARGE_QUANTITY_CHANGE',
        message: 'Unusually large quantity change detected: 65.5% reduction',
        severity: 'warning',
        details: {
          percentage: '65.5'
        }
      }
    ],
    summary: {
      totalErrors: 0,
      totalWarnings: 5,
      totalDuplicates: 0,
      blockingErrors: false
    },
    retryable: false,
    suggestedAction: 'Review warnings and confirm import to proceed'
  },

  // ============================================================
  // 5. DATABASE ERROR (RETRYABLE)
  // ============================================================
  errorDatabase: {
    success: false,
    error: {
      code: 'DATABASE_ERROR',
      message: 'Failed to connect to database. Please try again in a moment.',
      severity: 'error',
      httpStatus: 500,
      timestamp: '2024-04-13T10:45:30.123Z',
      requestId: 'req_1713011130123_a7f3c2b1',
      details: {
        operation: 'fetch_items_and_systems',
        retryAttempt: 1
      }
    },
    retryable: true,
    suggestedAction: 'Wait a moment and try again. Contact support if the issue persists.'
  },

  // ============================================================
  // 6. TRANSACTION FAILURE (ROLLBACK)
  // ============================================================
  errorTransactionFailed: {
    success: false,
    error: {
      code: 'TRANSACTION_FAILED',
      message: 'Import transaction failed. All changes have been rolled back.',
      severity: 'error',
      httpStatus: 500,
      timestamp: '2024-04-13T10:45:30.123Z',
      requestId: 'req_1713011130123_a7f3c2b1',
      details: {
        batchId: '08f7c3a2-1b4e-4f6e-9c8d-5e2a7f1b3c4d',
        processedRows: 45,
        failedAtRow: 46,
        failureReason: 'Constraint violation: duplicate spare_id in same batch'
      }
    },
    retryable: true,
    suggestedAction: 'Fix any duplicate entries and retry the import'
  },

  // ============================================================
  // 7. AUTHORIZATION ERROR
  // ============================================================
  errorUnauthorized: {
    success: false,
    error: {
      code: 'UNAUTHORIZED',
      message: 'User is not authenticated',
      severity: 'error',
      httpStatus: 401,
      timestamp: '2024-04-13T10:45:30.123Z',
      requestId: 'req_1713011130123_a7f3c2b1'
    },
    retryable: false,
    suggestedAction: 'Please log in again and retry'
  },

  // ============================================================
  // 8. FORBIDDEN ERROR (INSUFFICIENT PERMISSIONS)
  // ============================================================
  errorForbidden: {
    success: false,
    error: {
      code: 'FORBIDDEN',
      message: 'You do not have permission to import stock',
      severity: 'error',
      httpStatus: 403,
      timestamp: '2024-04-13T10:45:30.123Z',
      requestId: 'req_1713011130123_a7f3c2b1',
      details: {
        requiredRole: 'Inventory Manager',
        userRole: 'Employee'
      }
    },
    retryable: false,
    suggestedAction: 'Contact your administrator to request Inventory Manager role'
  }
}

// ============================================================
// ERROR SCENARIO GUIDE
// ============================================================

export const ERROR_HANDLING_GUIDE = {
  'File format error': {
    statusCode: 400,
    retryable: false,
    action: 'Fix file and retry',
    example: RESPONSE_EXAMPLES.errorInvalidFileType
  },
  'Header mismatch': {
    statusCode: 400,
    retryable: false,
    action: 'Download correct template',
    example: RESPONSE_EXAMPLES.errorHeaderMismatch
  },
  'Validation errors': {
    statusCode: 400,
    retryable: false,
    action: 'Fix data errors and retry',
    example: RESPONSE_EXAMPLES.errorValidationFailed
  },
  'Database error': {
    statusCode: 500,
    retryable: true,
    action: 'Wait 30 seconds and retry',
    example: RESPONSE_EXAMPLES.errorDatabase
  },
  'Transaction failure': {
    statusCode: 500,
    retryable: true,
    action: 'Fix conflicts and retry',
    example: RESPONSE_EXAMPLES.errorTransactionFailed
  },
  'Unauthorized': {
    statusCode: 401,
    retryable: false,
    action: 'Login and retry',
    example: RESPONSE_EXAMPLES.errorUnauthorized
  },
  'Forbidden': {
    statusCode: 403,
    retryable: false,
    action: 'Request permission',
    example: RESPONSE_EXAMPLES.errorForbidden
  }
}
