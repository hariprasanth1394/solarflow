/**
 * Excel Import - Error Handling Strategy Guide
 * Frontend implementation patterns and error recovery strategies
 */

export const ERROR_HANDLING_STRATEGY = {
  // ============================================================
  // 1. ERROR CLASSIFICATION & HANDLING
  // ============================================================

  errorClassification: {
    // Client errors - user's responsibility to fix
    CLIENT_ERRORS: {
      statusCode: 400,
      retryable: false,
      userControlled: true,
      examples: [
        'FILE_INVALID_TYPE',
        'HEADER_COLUMN_ORDER_MISMATCH',
        'ITEM_NOT_FOUND',
        'ISSUED_QTY_NEGATIVE'
      ],
      handling: 'Display error details, guide user to correct data'
    },

    // Authentication errors - user needs to re-authenticate
    AUTH_ERRORS: {
      statusCode: 401,
      retryable: false,
      userControlled: true,
      examples: ['UNAUTHORIZED'],
      handling: 'Redirect to login, preserve upload for retry after auth'
    },

    // Permission errors - user needs elevated permissions
    PERMISSION_ERRORS: {
      statusCode: 403,
      retryable: false,
      userControlled: false,
      examples: ['FORBIDDEN'],
      handling: 'Alert user, suggest contacting admin'
    },

    // Server errors - automatic retry with backoff
    SERVER_ERRORS: {
      statusCode: 500,
      retryable: true,
      userControlled: false,
      examples: [
        'DATABASE_ERROR',
        'TRANSACTION_FAILED'
      ],
      handling: 'Auto-retry with exponential backoff, inform user of retry attempts'
    }
  },

  // ============================================================
  // 2. RESPONSE HANDLING LAYER
  // ============================================================

  responseHandler: {
    pattern: `
      // Pattern for handling API responses
      
      export async function handleImportResponse(response: ApiResponse) {
        // Check overall success flag first
        if (!response.success) {
          const error = response.error;
          
          // Route to appropriate error handler
          switch (error.code) {
            case 'FILE_INVALID_TYPE':
              return handleClientError(error, 'format');
            
            case 'HEADER_COLUMN_NAME_MISMATCH':
              return handleClientError(error, 'structure');
            
            case 'VALIDATION_FAILED':
              return handleValidationError(response.validationErrors);
            
            case 'UNAUTHORIZED':
              return handleAuthError();
            
            case 'FORBIDDEN':
              return handlePermissionError();
            
            case 'DATABASE_ERROR':
            case 'TRANSACTION_FAILED':
              return handleRetryableError(error, response.requestId);
            
            default:
              return handleUnknownError(error);
          }
        }
        
        // Process success response
        return processSuccessResponse(response.data);
      }
    `
  },

  // ============================================================
  // 3. ERROR DISPLAY HIERARCHY
  // ============================================================

  errorDisplay: {
    hierarchy: [
      {
        level: 1,
        type: 'BLOCKING_ERRORS',
        display: 'Error Banner',
        color: 'error',
        dismissible: false,
        example: 'FILE_INVALID_TYPE',
        message: 'This prevents the import from proceeding',
        action: 'Required action displayed below banner'
      },
      {
        level: 2,
        type: 'FIELD_ERRORS',
        display: 'Inline in spreadsheet preview',
        color: 'error',
        dismissible: false,
        example: 'ITEM_NOT_FOUND',
        message: 'Shown with row number and field highlighted',
        action: 'User must fix in file or manually correct'
      },
      {
        level: 3,
        type: 'WARNINGS',
        display: 'Warning badges in preview',
        color: 'warning',
        dismissible: true,
        example: 'CURRENT_STOCK_MISMATCH',
        message: 'Shown for information only, import can proceed',
        action: 'Optional acknowledgment required'
      },
      {
        level: 4,
        type: 'INFO_MESSAGES',
        display: 'Toast/notification',
        color: 'info',
        dismissible: true,
        example: 'Processing import...',
        message: 'Status and progress',
        action: 'No action needed'
      }
    ],

    implementation: `
      // Example error display implementation
      
      export function displayErrorHierarchy(response: ApiResponse) {
        // Blocking errors - show banner
        if (response.error?.severity === 'error' && isBlockingError(response.error.code)) {
          showErrorBanner({
            title: 'Import Failed',
            message: response.error.message,
            action: response.suggestedAction,
            details: response.error.details
          });
          return;
        }
        
        // Field errors - inline in preview
        response.validationErrors?.forEach(error => {
          highlightRowError(error.rowNumber, error.field, {
            message: error.message,
            code: error.code,
            value: error.value
          });
        });
        
        // Warnings - badges
        response.validationWarnings?.forEach(warning => {
          addWarningBadge(warning.rowNumber, {
            message: warning.message,
            type: warning.code
          });
        });
      }
    `
  },

  // ============================================================
  // 4. RETRY STRATEGY
  // ============================================================

  retryStrategy: {
    policy: {
      maxAttempts: 3,
      initialDelayMs: 1000,
      maxDelayMs: 30000,
      backoffFactor: 2
    },

    implementation: `
      // Exponential backoff retry implementation
      
      export async function retryWithBackoff(
        apiFn: () => Promise<Response>,
        maxAttempts: number = 3
      ): Promise<Response> {
        let lastError: Error | null = null;
        let delayMs = 1000;
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            // Attempt the API call
            const response = await apiFn();
            
            // Check if response indicates a retryable error
            if (response.success === false && response.error?.code === 'DATABASE_ERROR') {
              if (attempt < maxAttempts) {
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, delayMs));
                
                // Show user feedback
                showRetryNotification(attempt, maxAttempts, delayMs);
                
                // Increase delay for next attempt
                delayMs = Math.min(delayMs * 2, 30000);
                continue;
              }
            }
            
            return response;
          } catch (error) {
            lastError = error;
            
            if (attempt < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, delayMs));
              delayMs = Math.min(delayMs * 2, 30000);
            }
          }
        }
        
        throw lastError || new Error('Max retry attempts exceeded');
      }
    `
  },

  // ============================================================
  // 5. STATE PRESERVATION DURING RETRY
  // ============================================================

  statePreservation: {
    pattern: `
      // Preserve user state across retries
      
      export function preserveImportState(uploadData: UploadData) {
        // Save to SessionStorage before API call
        sessionStorage.setItem('pendingImport', JSON.stringify({
          fileHash: uploadData.fileHash,
          fileName: uploadData.fileName,
          timestamp: Date.now(),
          blob: uploadData.blob // For retry without re-upload
        }));
      }
      
      export function restoreImportState(): UploadData | null {
        const saved = sessionStorage.getItem('pendingImport');
        return saved ? JSON.parse(saved) : null;
      }
      
      // Usage: On page load, check for pending import
      useEffect(() => {
        const pending = restoreImportState();
        if (pending && isStillValid(pending.timestamp)) {
          showResume: {
            message: 'Resume previous import?',
            onResume: () => continueWithRestored(pending),
            onNew: () => clearState()
          }
        }
      }, []);
    `
  },

  // ============================================================
  // 6. VALIDATION ERROR HANDLING
  // ============================================================

  validationErrorHandling: {
    approach: 'Categorized, Actionable, Row-Linked',

    example: `
      // Display validation errors by category
      
      export function groupValidationErrors(errors: ValidationError[]) {
        const grouped = {
          mandatory: [],
          lookup: [],
          numeric: [],
          businessLogic: [],
          duplicates: []
        };
        
        errors.forEach(error => {
          switch (error.category) {
            case 'MANDATORY_FIELD_MISSING':
              grouped.mandatory.push(error);
              break;
            case 'ITEM_NOT_FOUND':
            case 'SYSTEM_NOT_FOUND':
              grouped.lookup.push(error);
              break;
            case 'ISSUED_QTY_NEGATIVE':
            case 'INVALID_FORMAT':
              grouped.numeric.push(error);
              break;
            case 'CLOSING_EXCEEDS_CURRENT':
            case 'ISSUED_EXCEEDS_CURRENT':
              grouped.businessLogic.push(error);
              break;
          }
        });
        
        return grouped;
      }
      
      // Display with action items
      export function renderErrorPanel(grouped: GroupedErrors) {
        return (
          <div className="error-panel">
            {grouped.mandatory.length > 0 && (
              <ErrorSection
                title="Missing Required Fields"
                count={grouped.mandatory.length}
                action="Add values to highlighted cells"
                errors={grouped.mandatory}
              />
            )}
            
            {grouped.lookup.length > 0 && (
              <ErrorSection
                title="Items Not Found"
                count={grouped.lookup.length}
                action="Create missing items or correct codes"
                errors={grouped.lookup}
              />
            )}
            
            {/* ... other sections ... */}
          </div>
        );
      }
    `
  },

  // ============================================================
  // 7. WARNING HANDLING
  // ============================================================

  warningHandling: {
    policy: {
      nonBlocking: true,
      requiresAcknowledgment: true,
      displayStyle: 'warning-badge'
    },

    types: [
      {
        code: 'CURRENT_STOCK_MISMATCH',
        severity: 'warning',
        userAction: 'Review difference, proceed if intentional',
        display: 'Show DB vs File values side-by-side'
      },
      {
        code: 'CLOSING_STOCK_REACHES_ZERO',
        severity: 'warning',
        userAction: 'Plan procurement for affected item',
        display: 'Highlight item will be at zero'
      },
      {
        code: 'CLOSING_STOCK_BELOW_MIN',
        severity: 'warning',
        userAction: 'Create reorder alert',
        display: 'Show minimum threshold vs closing'
      },
      {
        code: 'LARGE_QUANTITY_CHANGE',
        severity: 'warning',
        userAction: 'Verify unusual movement',
        display: 'Show percentage change'
      }
    ],

    checklistRequired: true
  },

  // ============================================================
  // 8. INTEGER VALIDATION ERROR CODES (For Reference)
  // ============================================================

  responseCodeMap: {
    // Success codes
    '200-UPLOAD_SUCCESS': 'File parsed, ready for validation',
    '200-VALIDATION_SUCCESS': 'All validations passed',
    '200-IMPORT_SUCCESS': 'Import completed successfully',

    // Client error codes
    '400-FILE_INVALID_TYPE': 'Only .xlsx files accepted',
    '400-FILE_EMPTY': 'Excel file has no data',
    '400-HEADER_MISMATCH': 'Column names/order incorrect',
    '400-ITEM_NOT_FOUND': 'Item Code does not exist',
    '400-SYSTEM_NOT_FOUND': 'System Code does not exist',
    '400-VALIDATION_FAILED': 'Multiple validation errors',
    '400-DUPLICATE_ROWS': 'Duplicate Item+System combinations',

    // Auth codes
    '401-UNAUTHORIZED': 'User not authenticated',

    // Permission codes
    '403-FORBIDDEN': 'User lacks required role',

    // Server error codes
    '500-DATABASE_ERROR': 'Cannot connect to database (RETRYABLE)',
    '500-TRANSACTION_FAILED': 'Import rolled back (RETRYABLE)'
  },

  // ============================================================
  // 9. REQUEST ID LOGGING
  // ============================================================

  requestIdTracking: `
    // Use requestId for end-to-end troubleshooting
    
    export function logRequestError(error: ApiError, context: string) {
      console.error({
        timestamp: new Date().toISOString(),
        requestId: error.requestId,
        code: error.code,
        message: error.message,
        context,
        severity: error.severity,
        httpStatus: error.httpStatus
      });
      
      // Send to error tracking service
      errorTracker.captureError({
        requestId: error.requestId,
        code: error.code,
        severity: error.severity,
        context
      });
      
      // Show support info to user
      showSupportInfo({
        requestId: error.requestId,
        message: 'Contact support with this ID if problem persists'
      });
    }
  `,

  // ============================================================
  // 10. COMPLETE WORKFLOW EXAMPLE
  // ============================================================

  completeWorkflow: `
    // Full error handling workflow
    
    export async function handleImportFlow(file: File) {
      try {
        // Step 1: Upload
        showLoading('Analyzing file...');
        const uploadRes = await uploadFile(file);
        
        if (!uploadRes.success) {
          return handleError(uploadRes.error, 'UPLOAD_FAILED');
        }
        
        preserveImportState(uploadRes.data);
        
        // Step 2: Validate
        showLoading('Validating data...');
        const validateRes = await validateImport(uploadRes.data.fileHash);
        
        if (!validateRes.success) {
          // Handle validation failure
          const grouped = groupValidationErrors(validateRes.validationErrors);
          
          if (hasBlockingErrors(grouped)) {
            showErrorPanel(grouped, 'Cannot proceed with import');
            return;
          }
          
          // Offer to proceed with warnings
          return showWarningDialog(grouped, async () => {
            await confirmAndProcess(validateRes.data.batchId);
          });
        }
        
        // Step 3: Show confirmation with impact
        const impactRes = await getImpactPreview(validateRes.data.batchId);
        
        showConfirmationDialog({
          data: impactRes.data.impact,
          onConfirm: async () => {
            await confirmAndProcess(validateRes.data.batchId);
          }
        });
        
      } catch (error) {
        handleUnexpectedError(error);
      }
    }
    
    async function handleError(error: ApiError, context: string) {
      logRequestError(error, context);
      
      if (error.httpStatus === 401) {
        return redirectToLogin();
      }
      
      if (error.httpStatus === 403) {
        return showPermissionError(error);
      }
      
      if ([500, 502, 503].includes(error.httpStatus) && error.retryable) {
        return showRetryDialog(async () => {
          // Retry logic
        });
      }
      
      showErrorBanner({
        title: getErrorTitle(error.code),
        message: error.message,
        action: error.suggestedAction,
        details: error.details
      });
    }
  `
}

/**
 * Export commonly-referenced values for frontend implementation
 */
export const FRONTEND_REFERENCE = {
  RETRYABLE_ERRORS: [
    'DATABASE_ERROR',
    'TRANSACTION_FAILED'
  ],
  
  BLOCKING_ERRORS: [
    'FILE_INVALID_TYPE',
    'FILE_EMPTY',
    'HEADER_COLUMN_ORDER_MISMATCH',
    'VALIDATION_FAILED'
  ],
  
  TRANSIENT_ERRORS: [
    'DATABASE_ERROR'
  ],
  
  AUTO_RETRY_CONFIG: {
    maxAttempts: 3,
    initialDelayMs: 1000,
    backoffMultiplier: 2,
    maxDelayMs: 30000
  },
  
  ERROR_CATEGORIES: {
    FILE_FORMAT: ['FILE_INVALID_TYPE', 'FILE_EMPTY', 'SHEET_NOT_FOUND'],
    STRUCTURE: ['HEADER_COLUMN_ORDER_MISMATCH', 'HEADER_COLUMN_NAME_MISMATCH'],
    MANDATORY_FIELDS: ['ITEM_CODE_MISSING', 'SYSTEM_CODE_MISSING', 'MANDATORY_FIELD_MISSING'],
    LOOKUPS: ['ITEM_NOT_FOUND', 'SYSTEM_NOT_FOUND'],
    VALIDATION: ['ISSUED_QTY_NEGATIVE', 'CLOSING_EXCEEDS_CURRENT', 'ISSUED_EXCEEDS_CURRENT'],
    DUPLICATES: ['DUPLICATE_COMBINATION']
  }
}
