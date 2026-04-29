import { storage } from "../storage";
import fs from "fs/promises";
import path from "path";
import archiver from "archiver";
import { logger, PerformanceTimer } from "../utils/logger";

export interface Document {
  id: number;
  companyId: number;
  uploadedById: number;
  filename: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  category: string;
  description: string;
  filePath: string;
  status: string;
  version: number;
  metadata: any;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDocumentData {
  companyId: number;
  uploadedById: number;
  filename: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  category?: string;
  description?: string;
  filePath: string;
  status?: string;
  version?: number;
  metadata?: any;
}

export interface DocumentFilters {
  department?: string;
}

export class DocumentsService {
  /**
   * Get documents by company ID
   */
  async getDocumentsByCompany(companyId: number): Promise<Document[]> {
    return await storage.getDocumentsByCompany(companyId);
  }

  /**
   * Get documents by IDs
   */
  async getDocumentsByIds(documentIds: number[]): Promise<Document[]> {
    return await storage.getDocumentsByIds(documentIds);
  }

  /**
   * Get single document by ID
   */
  async getDocument(documentId: number): Promise<Document | null> {
    return await storage.getDocument(documentId);
  }

  /**
   * Get all documents (admin/employee view)
   */
  async getDocuments(filters: DocumentFilters): Promise<Document[]> {
    return await storage.getDocuments(filters);
  }

  /**
   * Create new document
   */
  async createDocument(documentData: CreateDocumentData): Promise<Document> {
    const docData = {
      ...documentData,
      category: documentData.category || "other",
      description: documentData.description || "",
      status: documentData.status || "pending",
      version: documentData.version || 1,
      metadata: documentData.metadata || null
    };

    return await storage.createDocument(docData);
  }

  /**
   * Update document
   */
  async updateDocument(documentId: number, updateData: { status?: string }): Promise<Document | null> {
    return await storage.updateDocument(documentId, updateData);
  }

  /**
   * Delete document
   */
  async deleteDocument(documentId: number): Promise<boolean> {
    const document = await this.getDocument(documentId);
    if (!document) {
      return false;
    }

    // Delete the physical file
    try {
      await fs.unlink(document.filePath);
    } catch (error) {
      logger.error("Error deleting physical file", "documents", error instanceof Error ? error : new Error(String(error)));
      // Continue even if file deletion fails
    }

    // Delete from database
    return await storage.deleteDocument(documentId);
  }

  /**
   * Check if user has access to company's documents
   */
  async userHasAccessToCompany(userId: number, companyId: number): Promise<boolean> {
    return await storage.userHasAccessToCompany(userId, companyId);
  }

  /**
   * Get documents accessible to a customer (OPTIMIZED - no N+1)
   */
  async getDocumentsForCustomer(userId: number): Promise<Document[]> {
    // Single query with JOIN - much more efficient than N+1
    return await storage.getAllDocumentsOptimized({
      userId,
      role: 'customer'
    });
  }

  /**
   * Get documents accessible to admin/employee (OPTIMIZED - no N+1)
   */
  async getDocumentsForStaff(): Promise<Document[]> {
    // Single query with JOIN - returns all documents with related data
    return await storage.getAllDocumentsOptimized();
  }

  /**
   * Create ZIP archive of documents
   */
  async createDocumentZip(companyId: number, documentIds?: number[]): Promise<{ 
    zipName: string, 
    createZipStream: (res: any) => Promise<void> 
  }> {
    const company = await storage.getCompany(companyId);
    const zipName = `${company?.name || 'Company'}_${new Date().toISOString().split('T')[0]}_Documents.zip`;
    
    let documents: Document[];
    if (documentIds && documentIds.length > 0) {
      const allDocuments = await this.getDocumentsByIds(documentIds);
      // Filter to only include documents from the specified company
      documents = allDocuments.filter(doc => {
        const docCompanyId = (doc as any).companyId || (doc as any).company_id;
        return docCompanyId === companyId;
      });
    } else {
      documents = await this.getDocumentsByCompany(companyId);
    }

    if (documents.length === 0) {
      throw new Error("هیچ فایلی برای دانلود یافت نشد");
    }

    const createZipStream = async (res: any): Promise<void> => {
      const timer = new PerformanceTimer('zipGeneration');
      const archive = archiver("zip", { zlib: { level: 9 } });

      archive.on('finish', () => {
        timer.end(true, { fileCount: documents.length, bytes: archive.pointer() });
      });

      archive.on('error', (err) => {
        logger.error('Archive error', 'documents', err);
        timer.end(false, { error: err.message });
      });

      archive.pipe(res);

      for (const document of documents) {
        try {
          // Handle both camelCase and snake_case
          const docFilePath = (document as any).filePath || (document as any).file_path;
          const docOriginalName = (document as any).originalName || (document as any).original_name;
          
          if (!docFilePath) {
            logger.warn(`Document ${(document as any).id} has no file path`, 'documents');
            continue;
          }
          
          await fs.access(docFilePath);
          archive.file(docFilePath, { name: docOriginalName || `document_${(document as any).id}` });
        } catch (error) {
          logger.warn(`File not found: ${(document as any).filePath || (document as any).file_path}`, 'documents');
        }
      }

      await archive.finalize();
    };

    return { zipName, createZipStream };
  }

  /**
   * Check if file exists
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file info for download
   */
  async getFileForDownload(documentId: number): Promise<{
    filePath: string;
    originalName: string;
    mimeType: string;
  } | null> {
    const document = await this.getDocument(documentId);
    if (!document) {
      return null;
    }

    // Handle both camelCase and snake_case
    const docFilePath = (document as any).filePath || (document as any).file_path;
    const docOriginalName = (document as any).originalName || (document as any).original_name;
    const docMimeType = (document as any).mimeType || (document as any).mime_type;

    if (!docFilePath) {
      logger.error("Document filePath is missing", "documents", undefined, undefined, { document });
      return null;
    }

    const filePath = path.resolve(docFilePath);
    
    // Check if file exists
    const exists = await this.fileExists(filePath);
    if (!exists) {
      logger.error("File not found at path", "documents", undefined, undefined, { filePath });
      return null;
    }

    return {
      filePath,
      originalName: docOriginalName || 'document',
      mimeType: docMimeType || "application/octet-stream"
    };
  }
}

export const documentsService = new DocumentsService();
