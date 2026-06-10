import {
  deleteDocumentFile,
  getDocumentPresignedUrl,
  readDocumentFile,
  saveDocumentBuffer,
  validateMagicBytes,
  validateUploadedFile,
} from "./storage";
import type { DocumentCategory } from "@prisma/client";

export { deleteDocumentFile, getDocumentPresignedUrl, readDocumentFile };

export async function saveUploadedFile(
  file: File,
  options: {
    userId: string;
    category: DocumentCategory;
    propertyId?: string;
    unitId?: string;
    tenantId?: string;
    notes?: string;
    tags?: string;
  }
) {
  validateUploadedFile(file);
  const buffer = Buffer.from(await file.arrayBuffer());
  await validateMagicBytes(buffer, file.type);

  return saveDocumentBuffer(buffer, {
    userId: options.userId,
    category: options.category,
    fileName: file.name,
    mimeType: file.type,
    propertyId: options.propertyId,
    unitId: options.unitId,
    tenantId: options.tenantId,
    notes: options.notes,
    tags: options.tags,
  });
}
