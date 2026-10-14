import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import multer from 'multer';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { connectToDatabase, isUsingMemoryStore } from './db.js';
import {
  requireAdminAuth,
  generateAdminToken,
  comparePassword,
  hashPassword,
  verifySetupSecret,
  verifyAdminToken,
  memoryAdmins,
  seedDefaultAdminIfEmpty,
} from './auth.js';
import { Admin } from './models/Admin.js';
import {
  getPublishedAssessments,
  savePublishedAssessment,
  updatePublishedAssessment,
  deletePublishedAssessment,
} from './publishedStore.js';
import { extractAssessmentFromPdf } from './geminiService.js';
import { sanitizeAndValidateAssessment } from './validation.js';
import { ExtractionErrorResponse, ExtractionSuccessResponse } from './types.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE_BYTES || '25165824', 10); // 24MB default

// Security & Cross-Origin Middleware
app.use(helmet());
app.use(cors({ origin: '*' }));

// Raw binary body support
app.use(
  express.raw({
    type: ['application/pdf', 'application/octet-stream'],
    limit: '50mb',
  })
);

// JSON and URL-encoded body parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Multer memory storage configured with upload.any() to accept ANY field name
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

/**
 * Health Check & System Status
 */
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    geminiKeyConfigured: Boolean(
      process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY'
    ),
    database: isUsingMemoryStore() ? 'in-memory-resilient' : 'mongodb-connected',
    maxUploadSizeBytes: MAX_FILE_SIZE,
  });
});

/**
 * PUBLIC / USER ENDPOINT:
 * GET /api/assessments?updatedSince=...
 * Fetch published assessments from MongoDB for sync & offline caching.
 */
app.get('/api/assessments', async (req: Request, res: Response): Promise<void> => {
  try {
    const { updatedSince } = req.query;
    let sinceDate: Date | undefined;
    if (updatedSince && typeof updatedSince === 'string') {
      const parsed = new Date(updatedSince);
      if (!isNaN(parsed.getTime())) {
        sinceDate = parsed;
      }
    }

    const { assessments, deletedIds } = await getPublishedAssessments(sinceDate);

    res.json({
      success: true,
      count: assessments.length,
      deletedCount: deletedIds.length,
      syncedAt: new Date().toISOString(),
      assessments,
      deletedIds,
    });
  } catch (err: any) {
    console.error('[Error] Fetching published assessments:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve published assessments from database.',
    });
  }
});

/**
 * PUBLISH TO MONGODB ENDPOINT:
 * POST /api/assessments
 * Stores an assessment in MongoDB (or resilient published store) and returns the saved document.
 * If an admin JWT Bearer token is provided, attributes publication to the admin.
 */
app.post('/api/assessments', async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    let publisher = 'admin';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = verifyAdminToken(token);
      if (decoded && decoded.username) {
        publisher = decoded.username;
      }
    }

    const validated = sanitizeAndValidateAssessment(req.body);

    console.log(`[Database] Storing published assessment to MongoDB via POST /api/assessments: "${validated.title}" by ${publisher}`);

    const saved = await savePublishedAssessment(validated, publisher);

    res.status(201).json({
      success: true,
      message: 'Assessment successfully published and saved to MongoDB!',
      assessment: saved,
    });
  } catch (err: any) {
    console.error('[Error] POST /api/assessments failed:', err);
    res.status(400).json({
      success: false,
      message: err.message || 'Validation failed for storing assessment in database.',
    });
  }
});

/**
 * ADMIN PROVISIONING ENDPOINT (One-time Setup):
 * POST /api/admin/setup
 * Protected by server-side setup secret (ADMIN_SETUP_SECRET)
 */
app.post('/api/admin/setup', async (req: Request, res: Response): Promise<void> => {
  try {
    const setupSecret =
      (req.headers['x-admin-setup-secret'] as string) || req.body?.setupSecret;

    if (!verifySetupSecret(setupSecret)) {
      res.status(403).json({
        success: false,
        message: 'Invalid setup secret. Admin provisioning rejected.',
      });
      return;
    }

    const { username, email, password } = req.body || {};
    if (!username || !email || !password || password.length < 6) {
      res.status(400).json({
        success: false,
        message: 'Username, valid email, and password (min 6 characters) are required.',
      });
      return;
    }

    const passwordHash = await hashPassword(password);

    if (isUsingMemoryStore()) {
      const id = `mem-admin-${Date.now()}`;
      memoryAdmins.set(email.toLowerCase(), {
        id,
        username,
        email: email.toLowerCase(),
        passwordHash,
        role: 'superadmin',
      });
    } else {
      const existing = await Admin.findOne({
        $or: [{ email: email.toLowerCase() }, { username }],
      });
      if (existing) {
        res.status(409).json({
          success: false,
          message: 'An admin with that email or username already exists.',
        });
        return;
      }

      await Admin.create({
        username,
        email: email.toLowerCase(),
        passwordHash,
        role: 'superadmin',
      });
    }

    res.status(201).json({
      success: true,
      message: `Admin account "${username}" provisioned successfully. You may now sign in.`,
    });
  } catch (err: any) {
    console.error('[Error] Admin setup error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * ADMIN LOGIN:
 * POST /api/admin/login
 * Body: { email, password } or { username, password }
 * Returns: JWT session token
 */
app.post('/api/admin/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, username, identifier: rawId, password } = req.body || {};
    const identifier = (rawId || email || username || '').toLowerCase().trim();

    if (!identifier || !password) {
      res.status(400).json({
        success: false,
        message: 'Identifier (email or username) and password are required.',
      });
      return;
    }

    let foundAdmin: any = null;

    if (isUsingMemoryStore()) {
      for (const admin of memoryAdmins.values()) {
        if (admin.email === identifier || admin.username.toLowerCase() === identifier) {
          foundAdmin = admin;
          break;
        }
      }
    } else {
      foundAdmin = await Admin.findOne({
        $or: [{ email: identifier }, { username: identifier }],
      });
      if (!foundAdmin) {
        for (const admin of memoryAdmins.values()) {
          if (admin.email === identifier || admin.username.toLowerCase() === identifier) {
            foundAdmin = admin;
            break;
          }
        }
      }
    }

    if (!foundAdmin) {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials. Admin account not found.',
      });
      return;
    }

    const validPassword = await comparePassword(password, foundAdmin.passwordHash);
    if (!validPassword) {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials. Password incorrect.',
      });
      return;
    }

    const token = generateAdminToken({
      adminId: foundAdmin.id || foundAdmin._id.toString(),
      username: foundAdmin.username,
      email: foundAdmin.email,
      role: foundAdmin.role,
    });

    console.log(`[Auth] Admin signed in successfully: ${foundAdmin.username} (${foundAdmin.email})`);

    res.json({
      success: true,
      token,
      admin: {
        id: foundAdmin.id || foundAdmin._id.toString(),
        username: foundAdmin.username,
        email: foundAdmin.email,
        role: foundAdmin.role,
      },
    });
  } catch (err: any) {
    console.error('[Error] Admin login:', err);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

/**
 * Helper to extract PDF buffer from multipart, filePath, base64, or raw body
 */
function resolvePdfBufferFromRequest(req: Request): {
  buffer: Buffer | null;
  filename: string;
} {
  let pdfBuffer: Buffer | null = null;
  let filename = 'assessment.pdf';

  // 1. Check Multer parsed files
  if (req.files && Array.isArray(req.files) && req.files.length > 0) {
    const found =
      req.files.find(
        (f) =>
          f.mimetype === 'application/pdf' ||
          f.originalname?.toLowerCase().endsWith('.pdf')
      ) || req.files[0];
    if (found && found.buffer && found.buffer.length > 0) {
      pdfBuffer = found.buffer;
      filename = found.originalname || filename;
    }
  } else if (req.file && req.file.buffer && req.file.buffer.length > 0) {
    pdfBuffer = req.file.buffer;
    filename = req.file.originalname || filename;
  }

  // 2. Check File path on disk (from req.body.filePath, req.body.file, req.body.fileUri, req.body.path, or query)
  if (!pdfBuffer && req.body) {
    const possiblePaths = [
      req.body.filePath,
      req.body.file,
      req.body.fileUri,
      req.body.path,
      req.body.uri,
      (req.query?.filePath as string),
      (req.query?.path as string),
    ].filter(
      (p): p is string =>
        typeof p === 'string' &&
        p.trim().length > 0 &&
        !p.startsWith('[object ') &&
        !p.startsWith('blob:') &&
        !p.startsWith('data:')
    );

    for (const rawPath of possiblePaths) {
      const cleanPath = rawPath.replace(/^file:\/\//, '').trim();
      if (fs.existsSync(cleanPath)) {
        try {
          const stats = fs.statSync(cleanPath);
          if (stats.isFile()) {
            pdfBuffer = fs.readFileSync(cleanPath);
            filename = path.basename(cleanPath);
            console.log(
              `[PDF Resolver] Loaded PDF from local file: "${cleanPath}" (${(pdfBuffer.length / 1024).toFixed(1)} KB)`
            );
            break;
          }
        } catch (e) {
          console.warn(`[PDF Resolver] Could not read file at "${cleanPath}":`, e);
        }
      }
    }
  }

  // 3. Check Base64 payloads (req.body.fileBase64, req.body.base64, or base64 string in req.body.file)
  if (!pdfBuffer && req.body) {
    const possibleB64 = [
      req.body.fileBase64,
      req.body.pdfBase64,
      req.body.base64,
      req.body.data,
      typeof req.body.file === 'string' && req.body.file.length > 100 ? req.body.file : undefined,
    ].find((b) => typeof b === 'string' && b.trim().length > 50 && !b.startsWith('[object '));

    if (possibleB64) {
      try {
        const cleanB64 = possibleB64.replace(/^data:application\/pdf;base64,/, '').trim();
        pdfBuffer = Buffer.from(cleanB64, 'base64');
        filename = req.body.filename || req.body.fileName || 'uploaded_document.pdf';
        console.log(`[PDF Resolver] Decoded PDF from base64 payload (${(pdfBuffer.length / 1024).toFixed(1)} KB)`);
      } catch (e) {
        console.warn('[PDF Resolver] Base64 decode failed:', e);
      }
    }
  }

  // 4. Check Raw Buffer body (application/pdf, octet-stream)
  if (!pdfBuffer && Buffer.isBuffer(req.body) && req.body.length > 0) {
    pdfBuffer = req.body;
    filename = (req.headers['x-filename'] as string) || 'binary_upload.pdf';
  }

  return { buffer: pdfBuffer, filename };
}

/**
 * ADMIN ONLY: Request PDF extraction draft
 * POST /api/admin/assessments/parse-pdf
 * Requires Admin Bearer Token
 */
app.post(
  '/api/admin/assessments/parse-pdf',
  requireAdminAuth,
  upload.any(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { buffer, filename } = resolvePdfBufferFromRequest(req);
      if (!buffer) {
        res.status(400).json({
          success: false,
          errorCode: 'NO_FILE_PROVIDED',
          message: 'No PDF provided. Upload a file or provide filePath / fileBase64.',
        });
        return;
      }

      const { preferredSubject } = req.body || {};
      const result = await extractAssessmentFromPdf(buffer, filename, preferredSubject);

      res.json({
        success: true,
        sourceFilename: filename,
        assessment: result.assessment,
        metadata: {
          modelUsed: result.modelUsed,
          extractedAt: new Date().toISOString(),
          isMockFallback: result.isMockFallback,
          adminUser: req.admin?.username,
        },
      });
    } catch (err: any) {
      console.error('[Admin PDF Extract Error]:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

/**
 * ADMIN ONLY: Publish an assessment to MongoDB
 * POST /api/admin/assessments
 * Requires Admin Bearer Token
 */
app.post(
  '/api/admin/assessments',
  requireAdminAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const validated = sanitizeAndValidateAssessment(req.body);
      const adminUsername = req.admin?.username || 'admin';

      console.log(`[Admin] Publishing assessment to MongoDB: "${validated.title}" by ${adminUsername}`);

      const saved = await savePublishedAssessment(validated, adminUsername);

      res.status(201).json({
        success: true,
        message: 'Assessment successfully published to shared database!',
        assessment: saved,
      });
    } catch (err: any) {
      console.error('[Publish Error]:', err);
      res.status(400).json({
        success: false,
        message: err.message || 'Validation failed for assessment publishing.',
      });
    }
  }
);

/**
 * ADMIN ONLY: Update a published assessment in MongoDB
 * PUT /api/assessments/:id and PUT /api/admin/assessments/:id
 * Only authenticated administrators can edit published shared assessments.
 */
const handleUpdatePublishedAssessment = async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(403).json({
        success: false,
        message: 'Permission denied: Only authenticated administrators can edit shared assessments.',
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAdminToken(token);
    if (!decoded || !decoded.username) {
      res.status(403).json({
        success: false,
        message: 'Invalid or expired admin session token.',
      });
      return;
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
    const validated = sanitizeAndValidateAssessment(req.body);

    console.log(`[Admin] Updating published assessment ${id}: "${validated.title}" by ${decoded.username}`);

    const updated = await updatePublishedAssessment(id, validated, decoded.username);
    if (!updated) {
      res.status(404).json({
        success: false,
        message: 'Assessment not found or has been deleted.',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Assessment updated successfully in MongoDB!',
      assessment: updated,
    });
  } catch (err: any) {
    console.error('[Update Error]:', err);
    res.status(400).json({
      success: false,
      message: err.message || 'Validation failed during assessment update.',
    });
  }
};

app.put('/api/assessments/:id', handleUpdatePublishedAssessment);
app.put('/api/admin/assessments/:id', handleUpdatePublishedAssessment);

/**
 * ADMIN ONLY: Delete a published assessment by recording a tombstone
 * DELETE /api/assessments/:id and DELETE /api/admin/assessments/:id
 * Only authenticated administrators can delete shared assessments.
 */
const handleDeletePublishedAssessment = async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(403).json({
        success: false,
        message: 'Permission denied: Only authenticated administrators can delete shared assessments.',
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAdminToken(token);
    if (!decoded || !decoded.username) {
      res.status(403).json({
        success: false,
        message: 'Invalid or expired admin session token.',
      });
      return;
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);

    console.log(`[Admin] Recording deletion tombstone for assessment ${id} by ${decoded.username}`);

    const deleted = await deletePublishedAssessment(id, decoded.username);
    if (!deleted) {
      res.status(404).json({
        success: false,
        message: 'Assessment not found or could not be marked as deleted.',
      });
      return;
    }

    res.json({
      success: true,
      message: `Assessment ${id} marked as deleted (tombstone recorded) in MongoDB.`,
      deletedId: id,
    });
  } catch (err: any) {
    console.error('[Delete Tombstone Error]:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

app.delete('/api/assessments/:id', handleDeletePublishedAssessment);
app.delete('/api/admin/assessments/:id', handleDeletePublishedAssessment);

/**
 * USER / REGULAR PDF EXTRACTION ENDPOINT
 * POST /api/assessments/extract-pdf
 * Used by standard users to convert PDFs into structured questions for local device storage.
 * Does NOT require authentication and does NOT publish to MongoDB.
 */
app.post(
  '/api/assessments/extract-pdf',
  upload.any(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { buffer, filename } = resolvePdfBufferFromRequest(req);
      const { preferredSubject } = req.body || {};

      if (!buffer || buffer.length === 0) {
        res.status(400).json({
          success: false,
          errorCode: 'NO_FILE_PROVIDED',
          message: 'No PDF file was provided in the request payload.',
          details: {
            formats: [
              'Multipart form-data with any key (file, pdf, document, etc.)',
              'JSON payload with {"filePath": "/Users/om/Desktop/CTET/Paper.pdf"}',
              'JSON payload with {"fileBase64": "..."}',
            ],
          },
        });
        return;
      }

      console.log(`[User Upload] Processing PDF: "${filename}" (${(buffer.length / 1024).toFixed(1)} KB)`);

      const extractionResult = await extractAssessmentFromPdf(
        buffer,
        filename,
        preferredSubject
      );

      const successRes: ExtractionSuccessResponse = {
        success: true,
        sourceFilename: filename,
        assessment: extractionResult.assessment,
        metadata: {
          modelUsed: extractionResult.modelUsed,
          extractedAt: new Date().toISOString(),
          isMockFallback: extractionResult.isMockFallback,
        },
      };

      res.status(200).json(successRes);
    } catch (err: any) {
      console.error('[Error] Extraction error:', err);
      res.status(500).json({
        success: false,
        message: err.message || 'An unexpected error occurred while processing the PDF.',
      });
    }
  }
);

// Start Database & Express Server
connectToDatabase()
  .then(async () => {
    await seedDefaultAdminIfEmpty();
  })
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`\n🚀 Gemini Assessment Backend running at http://localhost:${PORT}`);
      console.log(`📡 Health Check: GET http://localhost:${PORT}/api/health`);
      console.log(`☁️ Published Sync: GET http://localhost:${PORT}/api/assessments`);
      console.log(`💾 Publish to DB: POST http://localhost:${PORT}/api/assessments`);
      console.log(`🔐 Admin Auth: POST http://localhost:${PORT}/api/admin/login`);
      console.log(`📄 PDF Parsing: POST http://localhost:${PORT}/api/assessments/extract-pdf\n`);
    });
  });
