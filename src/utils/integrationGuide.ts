/**
 * Excel Import - Integration Guide
 * How to integrate validation engine and error handling into API routes
 */

export const INTEGRATION_GUIDE = {
  // ============================================================
  // MODULE DEPENDENCIES
  // ============================================================
  
  dependencies: {
    required: [
      'validationEngine.ts - Comprehensive row/file/header validation',
      'errorResponse.ts - Standardized error response factory',
      'excelImportParser.ts - Excel file parsing',
      'inventoryImportService.ts - Import workflow orchestration',
      'errorHandlingStrategy.ts - Frontend error handling patterns',
      'responseExamples.ts - Example responses'
    ],
    
    order: `
      Import order for TypeScript files:
      1. errorResponse.ts (types + factory functions)
      2. validationEngine.ts (uses errorResponse types)
      3. excelImportParser.ts (uses validation functions)
      4. API routes (uses all above)
    `
  },

  // ============================================================
  // STEP 1: UPDATE UPLOAD ROUTE
  // ============================================================
  
  uploadRoute: {
    filePath: 'src/app/api/inventory/import/upload/route.ts',
    
    changes: `
      import { NextRequest, NextResponse } from 'next/server';
      import { createErrorResponse, createSuccessResponse } from '@/utils/errorResponse';
      import { validateFile, validateHeaders } from '@/utils/validationEngine';
      import { parseExcelFile } from '@/utils/excelImportParser';
      import { inventoryImportService } from '@/services/inventoryImportService';
      
      export async function POST(request: NextRequest) {
        const requestId = \`req_\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}\`;
        
        try {
          // Get request data
          const formData = await request.formData();
          const file = formData.get('file') as File;
          const organizationId = request.headers.get('X-Organization-Id');
          
          // Validation: File present
          if (!file) {
            return NextResponse.json(
              createErrorResponse(
                'MISSING_FILE',
                'No file provided',
                'CLIENT_ERROR',
                { field: 'file' },
                { endpoint: '/api/inventory/import/upload' },
                requestId
              ),
              { status: 400 }
            );
          }
          
          // Validation: File type and size
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
          
          // Parse Excel file
          const parseResult = await parseExcelFile(file);
          if (!parseResult.success) {
            return NextResponse.json(
              createErrorResponse(
                'PARSE_FAILED',
                parseResult.error,
                'CLIENT_ERROR',
                { fileName: file.name },
                { endpoint: '/api/inventory/import/upload' },
                requestId
              ),
              { status: 400 }
            );
          }
          
          // Validate headers
          const headerValidation = validateHeaders(parseResult.headers);
          if (!headerValidation.isValid) {
            return NextResponse.json(
              createErrorResponse(
                headerValidation.errors[0].code,
                headerValidation.errors[0].message,
                'CLIENT_ERROR',
                {
                  expectedColumns: ['Item Code', 'Item Name', 'System Code', ...],
                  providedColumns: headerValidation.errors[0].details?.providedColumns,
                  mismatchPosition: headerValidation.errors[0].details?.position
                },
                { endpoint: '/api/inventory/import/upload' },
                requestId
              ),
              { status: 400 }
            );
          }
          
          // Service: Upload and cache file
          const uploadResult = await inventoryImportService.uploadAndValidateExcel(
            file,
            parseResult.data,
            organizationId!
          );
          
          // Success response
          return NextResponse.json(
            createSuccessResponse(
              {
                fileHash: uploadResult.fileHash,
                totalRows: uploadResult.rowCount,
                preview: {
                  first5Rows: uploadResult.preview
                }
              },
              Date.now() - parseInt(requestId.split('_')[1]),
              organizationId!,
              undefined
            ),
            { status: 200 }
          );
          
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
      }
    `
  },

  // ============================================================
  // STEP 2: UPDATE VALIDATE ROUTE
  // ============================================================
  
  validateRoute: {
    filePath: 'src/app/api/inventory/import/validate/route.ts',
    
    changes: `
      import { NextRequest, NextResponse } from 'next/server';
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
      import { inventoryImportService } from '@/services/inventoryImportService';
      
      export async function POST(request: NextRequest) {
        const requestId = \`req_\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}\`;
        
        try {
          const { fileHash, preview } = await request.json();
          const organizationId = request.headers.get('X-Organization-Id');
          
          // Validate inputs
          if (!fileHash || !preview) {
            return NextResponse.json(
              createErrorResponse(
                'MISSING_PARAMETERS',
                'fileHash and preview are required',
                'CLIENT_ERROR',
                { required: ['fileHash', 'preview'] },
                { endpoint: '/api/inventory/import/validate' },
                requestId
              ),
              { status: 400 }
            );
          }
          
          // Build lookup maps for validation (performance optimization)
          const lookupMaps = await buildLookupMaps(organizationId!);
          
          // Validate each row
          const rowValidations = preview.map((row: any, index: number) =>
            validateRow(row, index + 2, lookupMaps) // +2 for header row and 1-based
          );
          
          // Extract errors and warnings
          const allErrors = rowValidations.flatMap(rv => rv.errors);
          const allWarnings = rowValidations.flatMap(rv => rv.warnings);
          
          // Detect duplicates
          const duplicates = detectDuplicates(rowValidations);
          
          // Check if there are blocking errors
          const hasBlockingErrors = allErrors.length > 0 || duplicates.length > 0;
          
          // Prepare response based on validation result
          if (hasBlockingErrors) {
            return NextResponse.json(
              createValidationErrorResponse(
                allErrors,
                allWarnings,
                duplicates,
                requestId
              ),
              { 
                status: 400,
                headers: { 'X-Validation-Status': 'FAILED' }
              }
            );
          }
          
          // No blocking errors - create batch for confirmed import
          const batchResult = await inventoryImportService.createImportBatch(
            fileHash,
            rowValidations,
            organizationId!
          );
          
          // Success response with warnings if any
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
                summary: {
                  totalErrors: 0,
                  totalWarnings: allWarnings.length,
                  totalDuplicates: 0,
                  blockingErrors: false
                },
                data: {
                  batchId: batchResult.batchId,
                  fileHash: fileHash,
                  validationReport: {
                    totalRows: preview.length,
                    validRows: preview.length,
                    warningRows: allWarnings.length,
                    errorRows: 0,
                    duplicateRows: 0
                  }
                }
              },
              { 
                status: 200,
                headers: { 'X-Validation-Status': 'PASSED_WITH_WARNINGS' }
              }
            );
          }
          
          // Pure success - no errors or warnings
          return NextResponse.json(
            createSuccessResponse(
              {
                batchId: batchResult.batchId,
                fileHash: fileHash,
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
            { 
              status: 200,
              headers: { 'X-Validation-Status': 'PASSED' }
            }
          );
          
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
      }
    `
  },

  // ============================================================
  // STEP 3: UPDATE CONFIRM ROUTE
  // ============================================================
  
  confirmRoute: {
    filePath: 'src/app/api/inventory/import/confirm/route.ts',
    
    changes: `
      import { NextRequest, NextResponse } from 'next/server';
      import { 
        createErrorResponse, 
        createSuccessResponse 
      } from '@/utils/errorResponse';
      import { inventoryImportService } from '@/services/inventoryImportService';
      
      export async function POST(request: NextRequest) {
        const requestId = \`req_\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}\`;
        
        try {
          const { batchId, skipWarnings } = await request.json();
          const organizationId = request.headers.get('X-Organization-Id');
          
          // Validate inputs
          if (!batchId) {
            return NextResponse.json(
              createErrorResponse(
                'MISSING_BATCH_ID',
                'batchId is required',
                'CLIENT_ERROR',
                { required: ['batchId'] },
                { endpoint: '/api/inventory/import/confirm' },
                requestId
              ),
              { status: 400 }
            );
          }
          
          try {
            // Service: Execute transaction
            const result = await inventoryImportService.confirmAndProcessImport(
              batchId,
              organizationId!,
              skipWarnings
            );
            
            // Success response
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
            // Check for specific service errors
            const error = serviceError as any;
            
            // Transaction failure - RETRYABLE
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
            
            // Database error - RETRYABLE
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
            
            // Unknown service error
            throw error;
          }
          
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
      }
    `
  },

  // ============================================================
  // STEP 4: SERVICE LAYER UPDATE
  // ============================================================
  
  serviceUpdates: {
    filePath: 'src/services/inventoryImportService.ts',
    
    updates: `
      // Update service to use validation results from engine
      
      export async function createImportBatch(
        fileHash: string,
        rowValidations: RowValidationResult[],
        organizationId: string
      ) {
        // Store batch with validation metadata
        const batch = await db.insert(importBatches).values({
          id: generateUUID(),
          organizationId,
          status: 'validated',
          totalRows: rowValidations.length,
          validRows: rowValidations.filter(r => r.errors.length === 0).length,
          warningRows: rowValidations.filter(r => r.warnings.length > 0).length,
          fileHash,
          createdAt: new Date()
        }).returning();
        
        // Store row validations
        const records = rowValidations.map((rv, idx) => ({
          batchId: batch[0].id,
          rowNumber: idx + 2, // Account for header
          data: rv.rawRow,
          errors: rv.errors,
          warnings: rv.warnings,
          status: rv.errors.length === 0 ? 'valid' : 'invalid'
        }));
        
        await db.insert(importRecords).values(records);
        
        return { batchId: batch[0].id };
      }
      
      // Enhanced error handling with rollback
      export async function confirmAndProcessImport(
        batchId: string,
        organizationId: string,
        skipWarnings: boolean = false
      ) {
        const client = await supabase.client.initClient();
        
        try {
          // Start transaction
          await client.query('BEGIN');
          
          // Get batch and records
          const batch = await getBatch(batchId);
          const records = await getValidRecords(batchId);
          
          // Check for blocking warnings
          if (!skipWarnings && batch.warningRows > 0) {
            throw new Error('Fix warnings before proceeding');
          }
          
          // Process stock updates
          let processedRows = 0;
          for (const record of records) {
            try {
              await updateStockTransaction(record, organizationId);
              processedRows++;
            } catch (error) {
              // Rollback on error
              await client.query('ROLLBACK');
              throw {
                code: 'TRANSACTION_FAILED',
                processedRows,
                failedAtRow: record.rowNumber,
                reason: error instanceof Error ? error.message : 'Unknown'
              };
            }
          }
          
          // Commit transaction
          await client.query('COMMIT');
          
          // Update batch status
          await db.update(importBatches)
            .set({ status: 'completed', completedAt: new Date() })
            .where(eq(importBatches.id, batchId));
          
          return {
            batchId,
            status: 'completed',
            summary: {
              totalRows: records.length,
              successfulRows: processedRows,
              failedRows: 0
            }
          };
          
        } catch (error) {
          // Ensure rollback
          try {
            await client.query('ROLLBACK');
          } catch (e) {
            // Ignore
          }
          throw error;
        }
      }
    `
  },

  // ============================================================
  // STEP 5: INTEGRATION CHECKLIST
  // ============================================================
  
  checklist: [
    '☐ Import validationEngine.ts in all API routes',
    '☐ Import errorResponse.ts for response creation',
    '☐ Generate unique requestId for each request',
    '☐ Call validateFile() on upload route',
    '☐ Call validateHeaders() on upload route',
    '☐ Call buildLookupMaps() before row validation',
    '☐ Call validateRow() for each data row in validate route',
    '☐ Call detectDuplicates() in validate route',
    '☐ Use createErrorResponse() for all errors',
    '☐ Use createValidationErrorResponse() for validation errors',
    '☐ Use createSuccessResponse() for success',
    '☐ Test with valid Excel file',
    '☐ Test with invalid file type',
    '☐ Test with header mismatch',
    '☐ Test with validation errors (item not found, etc)',
    '☐ Test with warnings (stock mismatch, etc)',
    '☐ Test with duplicate rows',
    '☐ Test with missing optional fields',
    '☐ Verify transaction rollback on error',
    '☐ Check error codes match validationEngine',
    '☐ Validate all error paths return correct HTTP status',
    '☐ Verify requestId is passed to frontend',
    '☐ Test retry scenarios with database errors'
  ],

  // ============================================================
  // TYPE DEFINITIONS ALIGNMENT
  // ============================================================
  
  typeAlignment: `
    // Ensure types align across modules
    
    // From errorResponse.ts
    export interface ApiErrorResponse {
      code: string;
      message: string;
      severity: 'error' | 'warning' | 'info';
      httpStatus: number;
      timestamp: string;
      requestId: string;
      details?: Record<string, any>;
      context?: Record<string, any>;
    }
    
    // From validationEngine.ts - must match
    export interface ValidationMessage {
      code: string;
      message: string;
      severity: 'error' | 'warning';
      details?: Record<string, any>;
    }
    
    // API response must wrap validation errors
    export interface ApiValidationResponse {
      success: false;
      error: ApiErrorResponse;
      validationErrors: ValidationError[];
      validationWarnings: ValidationWarning[];
      duplicates?: DuplicateGroup[];
      summary: {
        totalErrors: number;
        totalWarnings: number;
        totalDuplicates: number;
        blockingErrors: boolean;
      };
    }
  `
}

/**
 * QUICK REFERENCE - Copy/Paste snippets
 */

export const QUICK_REFERENCE = {
  // Generate unique request ID
  generateRequestId: () => `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  
  // Error response with all fields
  errorTemplate: {
    code: 'ERROR_CODE',
    message: 'User-friendly error message',
    severity: 'error',
    httpStatus: 400,
    timestamp: new Date().toISOString(),
    requestId: 'req_xxx',
    details: { /* context-specific */ },
    context: { endpoint: '/api/...' }
  },
  
  // Check if error is retryable
  isRetryable: (statusCode: number) => [500, 502, 503].includes(statusCode),
  
  // Map validation code to HTTP status
  getHttpStatus: (code: string) => {
    if (code.startsWith('UNAUTHORIZED')) return 401;
    if (code.startsWith('FORBIDDEN')) return 403;
    if (code.startsWith('NOT_FOUND')) return 404;
    if (code.startsWith('VALIDATION') || code.startsWith('HEADER')) return 400;
    return 500;
  }
}
