import { Platform } from 'react-native';
import { ExtractedAssessmentData, Assessment, AdminUser } from '../types/index';

// Sensible default backend URL based on platform
export const DEFAULT_BACKEND_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:4000' // Android emulator loopback
    : 'http://localhost:4000'; // iOS Simulator & Web

export interface ExtractPdfOptions {
  fileUri: string;
  fileName: string;
  fileSize?: number;
  rawFile?: any;
  preferredSubject?: string;
  backendBaseUrl?: string;
}

export interface ApiExtractionResult {
  success: boolean;
  assessment?: ExtractedAssessmentData;
  sourceFilename?: string;
  modelUsed?: string;
  isMockFallback?: boolean;
  error?: string;
  errorCode?: string;
}

/**
 * Uploads a local PDF to the secure backend for Gemini extraction.
 */
export async function uploadPdfForExtraction({
  fileUri,
  fileName,
  fileSize,
  rawFile,
  preferredSubject,
  backendBaseUrl = DEFAULT_BACKEND_URL,
}: ExtractPdfOptions): Promise<ApiExtractionResult> {
  const endpoint = `${backendBaseUrl}/api/assessments/extract-pdf`;
  const formData = new FormData();

  if (preferredSubject) {
    formData.append('preferredSubject', preferredSubject);
  }

  if (Platform.OS === 'web') {
    let uploadBlob: any = null;
    if (rawFile && typeof Blob !== 'undefined' && rawFile instanceof Blob) {
      uploadBlob = rawFile;
    } else if (fileUri && (fileUri.startsWith('blob:') || fileUri.startsWith('data:'))) {
      try {
        const resp = await fetch(fileUri);
        uploadBlob = await resp.blob();
      } catch (e) {
        console.warn('[uploadPdf] Could not fetch blob from URI on web:', e);
      }
    }

    if (uploadBlob) {
      formData.append('file', uploadBlob, fileName || 'assessment.pdf');
    } else {
      formData.append('filePath', fileUri);
      formData.append('file', fileUri);
    }
  } else {
    // React Native Mobile (iOS / Android)
    const filePayload: any = {
      uri: fileUri,
      name: fileName || 'assessment.pdf',
      type: 'application/pdf',
    };
    formData.append('file', filePayload);
  }

  // Also append filePath if it is a local filesystem path (not a blob)
  if (fileUri && !fileUri.startsWith('blob:') && !fileUri.startsWith('data:')) {
    formData.append('filePath', fileUri);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.message || `Server returned error (${response.status})`,
        errorCode: data.errorCode || 'SERVER_ERROR',
      };
    }

    return {
      success: true,
      assessment: data.assessment,
      sourceFilename: data.sourceFilename,
      modelUsed: data.metadata?.modelUsed,
      isMockFallback: data.metadata?.isMockFallback,
    };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return {
        success: false,
        error: 'The extraction request timed out. Please check your network.',
        errorCode: 'TIMEOUT',
      };
    }

    return {
      success: false,
      error:
        error.message ||
        'Could not connect to backend server at ' + backendBaseUrl,
      errorCode: 'NETWORK_ERROR',
    };
  }
}

/**
 * Fetch latest published assessments from MongoDB
 */
export async function fetchPublishedAssessmentsFromCloud(
  backendBaseUrl = DEFAULT_BACKEND_URL,
  updatedSince?: string
): Promise<{
  success: boolean;
  assessments: Assessment[];
  deletedIds?: string[];
  syncedAt?: string;
  error?: string;
}> {
  try {
    let url = `${backendBaseUrl}/api/assessments`;
    if (updatedSince) {
      url += `?updatedSince=${encodeURIComponent(updatedSince)}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        assessments: [],
        deletedIds: [],
        error: data.message || `Failed to fetch published assessments (${response.status})`,
      };
    }

    // Map to local Assessment schema with scope: 'published'
    const mapped: Assessment[] = (data.assessments || []).map((item: any) => ({
      id: item.id || item._id,
      scope: 'published' as const,
      title: item.title,
      subject: item.subject,
      durationMinutes: item.durationMinutes || 15,
      totalQuestions: item.totalQuestions || (item.questions ? item.questions.length : 0),
      questions: item.questions || [],
      sourcePdfName: item.sourcePdfName,
      createdAt: item.publishedAt || item.createdAt || new Date().toISOString(),
      updatedAt: item.updatedAt || new Date().toISOString(),
      publishedBy: item.publishedBy || 'Admin',
      extractionNotes: item.extractionNotes,
    }));

    return {
      success: true,
      assessments: mapped,
      deletedIds: (data.deletedIds || []).map(String),
      syncedAt: data.syncedAt || new Date().toISOString(),
    };
  } catch (err: any) {
    return {
      success: false,
      assessments: [],
      deletedIds: [],
      error: err.message || 'Network error fetching published assessments',
    };
  }
}

/**
 * Admin Login endpoint
 */
export async function loginAdminApi(
  identifier: string,
  pass: string,
  backendBaseUrl = DEFAULT_BACKEND_URL
): Promise<{ success: boolean; token?: string; admin?: AdminUser; error?: string }> {
  try {
    const response = await fetch(`${backendBaseUrl}/api/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        email: identifier,
        username: identifier,
        password: pass,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.message || 'Invalid admin credentials.',
      };
    }

    return {
      success: true,
      token: data.token,
      admin: data.admin,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Network error connecting to auth service.',
    };
  }
}

/**
 * Publish Assessment to MongoDB:
 * Calls POST /api/assessments with assessment payload to store directly in DB.
 */
export async function publishAssessmentToCloud(
  assessmentPayload: any,
  adminToken?: string,
  backendBaseUrl = DEFAULT_BACKEND_URL
): Promise<{ success: boolean; assessment?: any; message?: string; error?: string }> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (adminToken) {
      headers['Authorization'] = `Bearer ${adminToken}`;
    }

    const response = await fetch(`${backendBaseUrl}/api/assessments`, {
      method: 'POST',
      headers,
      body: JSON.stringify(assessmentPayload),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.message || `Failed to publish assessment (${response.status})`,
      };
    }

    return {
      success: true,
      assessment: data.assessment,
      message: data.message,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Network error publishing assessment to MongoDB.',
    };
  }
}

/**
 * Admin Update Assessment in MongoDB
 * Calls PUT /api/assessments/:id with Bearer Admin Token
 */
export async function updatePublishedAssessmentApi(
  id: string,
  assessmentPayload: any,
  adminToken: string,
  backendBaseUrl = DEFAULT_BACKEND_URL
): Promise<{ success: boolean; assessment?: any; message?: string; error?: string }> {
  try {
    const response = await fetch(`${backendBaseUrl}/api/assessments/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
        Accept: 'application/json',
      },
      body: JSON.stringify(assessmentPayload),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.message || `Failed to update assessment (${response.status})`,
      };
    }

    return {
      success: true,
      assessment: data.assessment,
      message: data.message,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Network error updating shared assessment.',
    };
  }
}

/**
 * Admin Delete Assessment in MongoDB (Records Tombstone)
 * Calls DELETE /api/assessments/:id with Bearer Admin Token
 */
export async function deletePublishedAssessmentApi(
  id: string,
  adminToken: string,
  backendBaseUrl = DEFAULT_BACKEND_URL
): Promise<{ success: boolean; deletedId?: string; message?: string; error?: string }> {
  try {
    const response = await fetch(`${backendBaseUrl}/api/assessments/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        Accept: 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.message || `Failed to delete assessment (${response.status})`,
      };
    }

    return {
      success: true,
      deletedId: data.deletedId || id,
      message: data.message,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Network error deleting shared assessment from MongoDB.',
    };
  }
}
