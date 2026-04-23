/**
 * STEP-BY-STEP IMPLEMENTATION CHECKLIST
 * =====================================
 * 
 * Follow these steps in order to integrate the validation engine
 * and error handling into your API routes
 */

export const IMPLEMENTATION_CHECKLIST = {
  
  // ============================================================
  // PHASE 1: VERIFICATION (5 minutes)
  // ============================================================
  
  phase1_Verification: {
    title: 'Phase 1: Verify All Files Exist',
    steps: [
      {
        number: 1,
        task: 'Check validationEngine.ts exists',
        file: 'src/utils/validationEngine.ts',
        verify: 'File contains: validateFile, validateHeaders, validateRow, detectDuplicates, buildLookupMaps',
        status: '☐'
      },
      {
        number: 2,
        task: 'Check errorResponse.ts exists',
        file: 'src/utils/errorResponse.ts',
        verify: 'File contains: createErrorResponse, createValidationErrorResponse, createSuccessResponse, ApiErrorResponse type',
        status: '☐'
      },
      {
        number: 3,
        task: 'Check excelImportParser.ts exists',
        file: 'src/utils/excelImportParser.ts',
        verify: 'File exports parseExcelFile function',
        status: '☐'
      },
      {
        number: 4,
        task: 'Check inventoryImportService.ts exists',
        file: 'src/services/inventoryImportService.ts',
        verify: 'File exports: uploadAndValidateExcel, createImportBatch, confirmAndProcessImport',
        status: '☐'
      },
      {
        number: 5,
        task: 'Check database migration was run',
        command: 'Check Supabase dashboard for import_batches and import_records tables',
        verify: 'Tables exist with RLS policies',
        status: '☐'
      }
    ],
    timeEstimate: '5 minutes',
    nextPhase: 'phase2_UploadRoute'
  },

  // ============================================================
  // PHASE 2: UPLOAD ROUTE INTEGRATION (30 minutes)
  // ============================================================
  
  phase2_UploadRoute: {
    title: 'Phase 2: Integrate Validation into Upload Route',
    file: 'src/app/api/inventory/import/upload/route.ts',
    steps: [
      {
        number: 1,
        task: 'Add imports at top of file',
        code: `
          import { createErrorResponse, createSuccessResponse } from '@/utils/errorResponse';
          import { validateFile, validateHeaders } from '@/utils/validationEngine';
          import { parseExcelFile } from '@/utils/excelImportParser';
        `,
        status: '☐'
      },
      {
        number: 2,
        task: 'Add requestId generation at start of POST handler',
        code: `
          const requestId = \`req_\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}\`;
        `,
        location: 'Inside try block, first line',
        status: '☐'
      },
      {
        number: 3,
        task: 'Replace file type check with validateFile()',
        before: `
          if (file.type !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
            return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
          }
        `,
        after: `
          const fileValidation = validateFile(file);
          if (!fileValidation.isValid) {
            return NextResponse.json(
              createErrorResponse(
                fileValidation.errors[0].code,
                fileValidation.errors[0].message,
                'CLIENT_ERROR',
                { fileName: file.name, fileType: file.type },
                { endpoint: '/api/inventory/import/upload' },
                requestId
              ),
              { status: 400 }
            );
          }
        `,
        status: '☐'
      },
      {
        number: 4,
        task: 'Replace header validation with validateHeaders()',
        before: `
          const expectedHeaders = ['Item Code', 'Item Name', 'System Code', ...];
          if (!arraysEqual(headers, expectedHeaders)) {
            return NextResponse.json({ error: 'Header mismatch' }, { status: 400 });
          }
        `,
        after: `
          const headerValidation = validateHeaders(headers);
          if (!headerValidation.isValid) {
            return NextResponse.json(
              createErrorResponse(
                headerValidation.errors[0].code,
                headerValidation.errors[0].message,
                'CLIENT_ERROR',
                headerValidation.errors[0].details,
                { endpoint: '/api/inventory/import/upload' },
                requestId
              ),
              { status: 400 }
            );
          }
        `,
        status: '☐'
      },
      {
        number: 5,
        task: 'Update success response to use createSuccessResponse()',
        before: `
          return NextResponse.json({
            success: true,
            data: { fileHash, totalRows, preview }
          });
        `,
        after: `
          return NextResponse.json(
            createSuccessResponse(
              {
                fileHash: uploadResult.fileHash,
                totalRows: uploadResult.rowCount,
                preview: { first5Rows: uploadResult.preview }
              },
              Date.now() - parseInt(requestId.split('_')[1]),
              organizationId!,
              undefined
            ),
            { status: 200 }
          );
        `,
        status: '☐'
      },
      {
        number: 6,
        task: 'Update error catch block to use createErrorResponse()',
        before: `
          } catch (error) {
            return NextResponse.json(
              { error: 'Upload failed', details: error.message },
              { status: 500 }
            );
          }
        `,
        after: `
          } catch (error) {
            console.error('Upload error:', error);
            return NextResponse.json(
              createErrorResponse(
                'INTERNAL_ERROR',
                'An unexpected error occurred during file upload',
                'SERVER_ERROR',
                { error: error instanceof Error ? error.message : 'Unknown' },
                { endpoint: '/api/inventory/import/upload' },
                requestId
              ),
              { status: 500 }
            );
          }
        `,
        status: '☐'
      },
      {
        number: 7,
        task: 'Test upload route with valid Excel file',
        command: 'POST /api/inventory/import/upload with valid .xlsx file',
        expectedResult: 'HTTP 200 with fileHash and preview',
        status: '☐'
      },
      {
        number: 8,
        task: 'Test upload route with invalid file type',
        command: 'POST /api/inventory/import/upload with .csv file',
        expectedResult: 'HTTP 400 with FILE_INVALID_TYPE error code',
        status: '☐'
      },
      {
        number: 9,
        task: 'Test upload route with header mismatch',
        command: 'POST /api/inventory/import/upload with wrong column order',
        expectedResult: 'HTTP 400 with HEADER_COLUMN_ORDER_MISMATCH error code',
        status: '☐'
      }
    ],
    timeEstimate: '30 minutes',
    nextPhase: 'phase3_ValidateRoute'
  },

  // ============================================================
  // PHASE 3: VALIDATE ROUTE INTEGRATION (45 minutes)
  // ============================================================
  
  phase3_ValidateRoute: {
    title: 'Phase 3: Integrate Validation into Validate Route',
    file: 'src/app/api/inventory/import/validate/route.ts',
    steps: [
      {
        number: 1,
        task: 'Add imports at top of file',
        code: `
          import { 
            createErrorResponse, 
            createValidationErrorResponse, 
            createSuccessResponse 
          } from '@/utils/errorResponse';
          import { 
            validateRow, 
            detectDuplicates, 
            buildLookupMaps 
          } from '@/utils/validationEngine';
        `,
        status: '☐'
      },
      {
        number: 2,
        task: 'Add requestId generation',
        code: `
          const requestId = \`req_\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}\`;
        `,
        location: 'Inside try block, first line',
        status: '☐'
      },
      {
        number: 3,
        task: 'Add buildLookupMaps call for performance',
        code: `
          const lookupMaps = await buildLookupMaps(organizationId!);
        `,
        location: 'After getting fileHash from request',
        note: 'This does one database query returning all items and systems at once',
        status: '☐'
      },
      {
        number: 4,
        task: 'Replace row validation loop with validateRow()',
        before: `
          const errors = [];
          preview.forEach((row, index) => {
            // manual validation logic
          });
        `,
        after: `
          const rowValidations = preview.map((row, index) =>
            validateRow(row, index + 2, lookupMaps) // +2 for header and 1-based
          );
          
          const allErrors = rowValidations.flatMap(rv => rv.errors);
          const allWarnings = rowValidations.flatMap(rv => rv.warnings);
        `,
        note: 'validateRow returns RowValidationResult with errors and warnings arrays',
        status: '☐'
      },
      {
        number: 5,
        task: 'Add duplicate detection',
        code: `
          const duplicates = detectDuplicates(rowValidations);
          const hasBlockingErrors = allErrors.length > 0 || duplicates.length > 0;
        `,
        location: 'After validating all rows',
        status: '☐'
      },
      {
        number: 6,
        task: 'Replace blocking error response with ValidationErrorResponse',
        before: `
          if (errors.length > 0) {
            return NextResponse.json({ success: false, errors }, { status: 400 });
          }
        `,
        after: `
          if (hasBlockingErrors) {
            return NextResponse.json(
              createValidationErrorResponse(
                allErrors,
                allWarnings,
                duplicates,
                requestId
              ),
              { status: 400, headers: { 'X-Validation-Status': 'FAILED' } }
            );
          }
        `,
        status: '☐'
      },
      {
        number: 7,
        task: 'Add batch creation',
        code: `
          const batchResult = await inventoryImportService.createImportBatch(
            fileHash,
            rowValidations,
            organizationId!
          );
        `,
        location: 'After duplicate check, before success response',
        status: '☐'
      },
      {
        number: 8,
        task: 'Update success response (with warnings case)',
        code: `
          if (allWarnings.length > 0) {
            return NextResponse.json(
              {
                success: true,
                error: {
                  code: 'VALIDATION_WITH_WARNINGS',
                  message: \`Validation passed with \${allWarnings.length} warning(s)\`,
                  severity: 'warning',
                  httpStatus: 200,
                  timestamp: new Date().toISOString(),
                  requestId
                },
                validationErrors: [],
                validationWarnings: allWarnings,
                summary: { totalErrors: 0, totalWarnings: allWarnings.length, totalDuplicates: 0 },
                data: { batchId: batchResult.batchId, fileHash }
              },
              { status: 200, headers: { 'X-Validation-Status': 'PASSED_WITH_WARNINGS' } }
            );
          }
        `,
        status: '☐'
      },
      {
        number: 9,
        task: 'Update success response (pure success case)',
        code: `
          return NextResponse.json(
            createSuccessResponse(
              {
                batchId: batchResult.batchId,
                fileHash,
                validationReport: {
                  totalRows: preview.length,
                  validRows: preview.length,
                  warningRows: 0,
                  errorRows: 0,
                  duplicateRows: 0
                }
              },
              Date.now() - parseInt(requestId.split('_')[1]),
              organizationId!,
              batchResult.batchId
            ),
            { status: 200, headers: { 'X-Validation-Status': 'PASSED' } }
          );
        `,
        status: '☐'
      },
      {
        number: 10,
        task: 'Update error catch block',
        before: `
          } catch (error) {
            return NextResponse.json(
              { error: 'Validation failed' },
              { status: 500 }
            );
          }
        `,
        after: `
          } catch (error) {
            console.error('Validation error:', error);
            return NextResponse.json(
              createErrorResponse(
                'VALIDATION_PROCESSING_ERROR',
                'An error occurred while validating the import',
                'SERVER_ERROR',
                { error: error instanceof Error ? error.message : 'Unknown' },
                { endpoint: '/api/inventory/import/validate' },
                requestId
              ),
              { status: 500 }
            );
          }
        `,
        status: '☐'
      },
      {
        number: 11,
        task: 'Test validate route with all valid data',
        command: 'POST /api/inventory/import/validate with valid preview',
        expectedResult: 'HTTP 200 with batchId',
        status: '☐'
      },
      {
        number: 12,
        task: 'Test validate route with validation errors',
        command: 'POST /api/inventory/import/validate with invalid item code',
        expectedResult: 'HTTP 400 with validation errors',
        status: '☐'
      },
      {
        number: 13,
        task: 'Test validate route with warnings',
        command: 'POST /api/inventory/import/validate with stock mismatch',
        expectedResult: 'HTTP 200 with warnings in response',
        status: '☐'
      },
      {
        number: 14,
        task: 'Test validate route with duplicates',
        command: 'POST /api/inventory/import/validate with duplicate Item+System codes',
        expectedResult: 'HTTP 400 with duplicate groups in response',
        status: '☐'
      }
    ],
    timeEstimate: '45 minutes',
    nextPhase: 'phase4_ConfirmRoute'
  },

  // ============================================================
  // PHASE 4: CONFIRM ROUTE INTEGRATION (30 minutes)
  // ============================================================
  
  phase4_ConfirmRoute: {
    title: 'Phase 4: Enhance Error Handling in Confirm Route',
    file: 'src/app/api/inventory/import/confirm/route.ts',
    steps: [
      {
        number: 1,
        task: 'Add imports',
        code: `
          import { 
            createErrorResponse, 
            createSuccessResponse 
          } from '@/utils/errorResponse';
        `,
        status: '☐'
      },
      {
        number: 2,
        task: 'Add requestId generation',
        code: `
          const requestId = \`req_\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}\`;
        `,
        location: 'Inside try block, first line',
        status: '☐'
      },
      {
        number: 3,
        task: 'Wrap service call in try-catch for specific errors',
        before: `
          const result = await inventoryImportService.confirmAndProcessImport(batchId, organizationId!);
        `,
        after: `
          try {
            const result = await inventoryImportService.confirmAndProcessImport(
              batchId,
              organizationId!,
              skipWarnings
            );
            
            return NextResponse.json(
              createSuccessResponse(
                {
                  batchId: result.batchId,
                  status: result.status,
                  summary: result.summary,
                  stockMovement: result.stockMovement,
                  systemImpact: result.systemImpact,
                  audit: result.audit,
                  nextSteps: result.nextSteps
                },
                Date.now() - parseInt(requestId.split('_')[1]),
                organizationId!,
                batchId
              ),
              { status: 200 }
            );
          } catch (serviceError) {
            // Handle specific service errors
            const error = serviceError as any;
            
            if (error.code === 'TRANSACTION_FAILED') {
              return NextResponse.json(
                createErrorResponse(
                  'TRANSACTION_FAILED',
                  'Import transaction failed. All changes have been rolled back.',
                  'SERVER_ERROR',
                  { 
                    batchId,
                    processedRows: error.processedRows,
                    failedAtRow: error.failedAtRow,
                    failureReason: error.reason
                  },
                  { endpoint: '/api/inventory/import/confirm' },
                  requestId
                ),
                { status: 500 }
              );
            }
            
            if (error.code === 'DATABASE_ERROR') {
              return NextResponse.json(
                createErrorResponse(
                  'DATABASE_ERROR',
                  'Failed to connect to database. Please try again in a moment.',
                  'SERVER_ERROR',
                  {
                    operation: error.operation,
                    retryAttempt: error.retryAttempt || 1
                  },
                  { endpoint: '/api/inventory/import/confirm' },
                  requestId
                ),
                { status: 500 }
              );
            }
            
            throw error;
          }
        `,
        status: '☐'
      },
      {
        number: 4,
        task: 'Update outer catch block',
        before: `
          } catch (error) {
            return NextResponse.json(
              { error: 'Confirm failed' },
              { status: 500 }
            );
          }
        `,
        after: `
          } catch (error) {
            console.error('Confirm error:', error);
            return NextResponse.json(
              createErrorResponse(
                'INTERNAL_ERROR',
                'An unexpected error occurred during import confirmation',
                'SERVER_ERROR',
                { error: error instanceof Error ? error.message : 'Unknown' },
                { endpoint: '/api/inventory/import/confirm' },
                requestId
              ),
              { status: 500 }
            );
          }
        `,
        status: '☐'
      },
      {
        number: 5,
        task: 'Test confirm route with valid batch',
        command: 'POST /api/inventory/import/confirm with valid batchId',
        expectedResult: 'HTTP 200 with import summary',
        status: '☐'
      },
      {
        number: 6,
        task: 'Test confirm route with warnings (skipWarnings=false)',
        command: 'POST /api/inventory/import/confirm with batch containing warnings',
        expectedResult: 'HTTP 400 or 409 requesting acknowledgment',
        status: '☐'
      },
      {
        number: 7,
        task: 'Test confirm route with transaction failure',
        command: 'Manually trigger constraint violation in service',
        expectedResult: 'HTTP 500 with TRANSACTION_FAILED, changes rolled back',
        status: '☐'
      }
    ],
    timeEstimate: '30 minutes',
    nextPhase: 'phase5_Testing'
  },

  // ============================================================
  // PHASE 5: COMPREHENSIVE TESTING (1 hour)
  // ============================================================
  
  phase5_Testing: {
    title: 'Phase 5: Test All Scenarios',
    steps: [
      {
        scenario: 'VALID IMPORT',
        description: 'File with all correct data',
        commands: [
          '1. Upload valid Excel file',
          '2. Validate should return 200 with batchId',
          '3. Confirm should return 200 with summary'
        ],
        expectedResults: [
          'Stock updated in database',
          'Import batch marked completed',
          'Audit log created'
        ],
        status: '☐'
      },
      {
        scenario: 'INVALID FILE TYPE',
        description: 'Upload CSV instead of Excel',
        commands: [
          '1. Upload .csv file',
          '2. Upload should return 400'
        ],
        expectedResults: [
          'Error code: FILE_INVALID_TYPE',
          'Suggested action shown to user'
        ],
        status: '☐'
      },
      {
        scenario: 'HEADER MISMATCH',
        description: 'Excel with wrong column order',
        commands: [
          '1. Upload Excel with columns in wrong order',
          '2. Upload should return 400'
        ],
        expectedResults: [
          'Error code: HEADER_COLUMN_ORDER_MISMATCH',
          'Expected and provided columns shown'
        ],
        status: '☐'
      },
      {
        scenario: 'ITEM NOT FOUND',
        description: 'Item Code that does not exist',
        commands: [
          '1. Upload valid file with invalid Item Code',
          '2. Validate should return 400'
        ],
        expectedResults: [
          'Error code: ITEM_NOT_FOUND',
          'Row number shown',
          'Invalid code value shown'
        ],
        status: '☐'
      },
      {
        scenario: 'NUMERIC VALIDATION',
        description: 'Negative quantities',
        commands: [
          '1. Upload file with negative Issued Qty',
          '2. Validate should return 400'
        ],
        expectedResults: [
          'Error code: ISSUED_QTY_NEGATIVE',
          'Row highlighted for user'
        ],
        status: '☐'
      },
      {
        scenario: 'DUPLICATE ROWS',
        description: 'Same Item Code + System Code twice',
        commands: [
          '1. Upload file with duplicate combinations',
          '2. Validate should return 400'
        ],
        expectedResults: [
          'Error code: DUPLICATE_COMBINATION',
          'All duplicate row numbers listed'
        ],
        status: '☐'
      },
      {
        scenario: 'WARNINGS - STOCK MISMATCH',
        description: 'Current Stock differs from DB',
        commands: [
          '1. Upload file with stock mismatch',
          '2. Validate should return 200 with warning'
        ],
        expectedResults: [
          'Success with warning in error field',
          'DB value and file value shown',
          'User can proceed'
        ],
        status: '☐'
      },
      {
        scenario: 'WARNINGS - ZERO STOCK',
        description: 'Closing Stock will be zero',
        commands: [
          '1. Upload file where closing = 0',
          '2. Validate should return 200 with warning'
        ],
        expectedResults: [
          'Warning shown to user',
          'User can proceed with acknowledgment'
        ],
        status: '☐'
      },
      {
        scenario: 'DATABASE ERROR',
        description: 'Database connection fails during validation',
        commands: [
          '1. Simulate database unavailable',
          '2. Call validate endpoint',
          '3. Should return 500 with DATABASE_ERROR'
        ],
        expectedResults: [
          'Error code: DATABASE_ERROR',
          'Retryable: true',
          'User shown retry guidance'
        ],
        status: '☐'
      },
      {
        scenario: 'TRANSACTION ROLLBACK',
        description: 'Transaction fails during confirm',
        commands: [
          '1. Trigger constraint violation in confirm',
          '2. Should return 500 with TRANSACTION_FAILED'
        ],
        expectedResults: [
          'Error code: TRANSACTION_FAILED',
          'All changes rolled back',
          'Database consistent state',
          'User can retry'
        ],
        status: '☐'
      }
    ],
    timeEstimate: '1 hour',
    nextPhase: 'phase6_Deployment'
  },

  // ============================================================
  // PHASE 6: PRE-DEPLOYMENT CHECKS (30 minutes)
  // ============================================================
  
  phase6_PreDeploymentChecks: {
    title: 'Phase 6: Pre-Deployment Verification',
    checks: [
      {
        category: 'Code Quality',
        items: [
          '☐ All console.error logs in place for debugging',
          '☐ RequestId generated on every request',
          '☐ All error codes defined in VALIDATION_CODES',
          '☐ No TODO or FIXME comments left',
          '☐ TypeScript strict mode passes (npm run type-check)',
          '☐ ESLint passes (npm run lint)'
        ]
      },
      {
        category: 'Error Handling',
        items: [
          '☐ All API routes have proper error responses',
          '☐ All 5xx errors are marked retryable',
          '☐ All 4xx errors provide suggestedAction',
          '☐ RequestId included in all responses',
          '☐ Details field populated with context'
        ]
      },
      {
        category: 'Performance',
        items: [
          '☐ buildLookupMaps is called once per request',
          '☐ No N+1 database queries',
          '☐ Batch operations used where possible',
          '☐ Request processing time < 30 seconds for 10k rows'
        ]
      },
      {
        category: 'Security',
        items: [
          '☐ OrganizationId validated on every request',
          '☐ RLS policies enforced on database',
          '☐ File upload size limited',
          '☐ No sensitive data in error messages'
        ]
      },
      {
        category: 'Logging',
        items: [
          '☐ All errors logged with console.error',
          '☐ RequestId included in logs',
          '☐ SQL queries logged (if applicable)',
          '☐ Processing times tracked'
        ]
      }
    ],
    timeEstimate: '30 minutes'
  },

  // ============================================================
  // PHASE 7: DEPLOYMENT
  // ============================================================
  
  phase7_Deployment: {
    title: 'Phase 7: Deploy to Production',
    steps: [
      {
        number: 1,
        task: 'Create git branch',
        command: 'git checkout -b feature/excel-import-validation',
        status: '☐'
      },
      {
        number: 2,
        task: 'Commit validation engine and error response',
        command: 'git add src/utils/validationEngine.ts src/utils/errorResponse.ts',
        status: '☐'
      },
      {
        number: 3,
        task: 'Commit updated API routes',
        command: 'git add src/app/api/inventory/import/**',
        status: '☐'
      },
      {
        number: 4,
        task: 'Commit updated service',
        command: 'git add src/services/inventoryImportService.ts',
        status: '☐'
      },
      {
        number: 5,
        task: 'Push to GitHub',
        command: 'git push origin feature/excel-import-validation',
        status: '☐'
      },
      {
        number: 6,
        task: 'Create pull request',
        command: 'Create PR with test results and checklist',
        status: '☐'
      },
      {
        number: 7,
        task: 'Deploy to staging',
        command: 'Follow your deployment process',
        status: '☐'
      },
      {
        number: 8,
        task: 'Run smoke tests in staging',
        command: 'Upload test file, validate, confirm',
        expectedResult: 'All three steps complete successfully',
        status: '☐'
      },
      {
        number: 9,
        task: 'Deploy to production',
        command: 'Execute production deployment',
        status: '☐'
      },
      {
        number: 10,
        task: 'Monitor logs for 24 hours',
        command: 'Watch for errors and performance issues',
        status: '☐'
      }
    ],
    timeEstimate: '1 hour'
  },

  // ============================================================
  // SUMMARY
  // ============================================================
  
  summary: {
    totalTimeEstimate: '4 hours',
    breakdown: [
      'Phase 1 (Verification): 5 min',
      'Phase 2 (Upload Route): 30 min',
      'Phase 3 (Validate Route): 45 min',
      'Phase 4 (Confirm Route): 30 min',
      'Phase 5 (Testing): 60 min',
      'Phase 6 (Pre-Deployment): 30 min',
      'Phase 7 (Deployment): 60 min'
    ],
    totalTimeWithAll: '4 hours',
    note: 'Actual time may vary based on testing complexity and deployment process'
  }
};

/**
 * TEST DATA TEMPLATES
 */
export const TEST_TEMPLATES = {
  validExcelData: [
    {
      'Item Code': 'PANEL-001',
      'Item Name': 'Solar Panel 400W',
      'System Code': 'SYS-A',
      'System Name': 'System A - 10kW',
      'Current Stock': 100,
      'Issued Qty': 10,
      'Closing Stock': 90,
      'Unit Cost': 250
    }
  ],

  invalidFileType: {
    description: 'Test with CSV file instead of Excel',
    file: 'data.csv',
    expectedError: 'FILE_INVALID_TYPE'
  },

  headerMismatch: {
    description: 'Wrong column order',
    headers: ['Item Code', 'Item Name', 'System Code', 'System Name', 'Current Stock', 'Issue Qty', 'Closing Stock', 'Unit Cost'],
    expectedError: 'HEADER_COLUMN_NAME_MISMATCH',
    mismatchPosition: 6
  },

  validationError: {
    description: 'Invalid Item Code',
    data: {
      'Item Code': 'INVALID-999',
      'Item Name': 'Unknown Item',
      'System Code': 'SYS-A'
    },
    expectedError: 'ITEM_NOT_FOUND'
  }
};

export default IMPLEMENTATION_CHECKLIST;
