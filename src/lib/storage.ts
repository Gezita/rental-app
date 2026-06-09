import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import type { DocumentCategory } from "@prisma/client";
import { prisma } from "./db";

export const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

export const ALLOWED_UPLOAD_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/jpg",
  "image/heic",
] as const;

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function getUserUploadDir(userId: string): string {
  return path.join(process.cwd(), UPLOAD_DIR, userId);
}

export function getRelativeFilePath(userId: string, fileName: string): string {
  return path.join(UPLOAD_DIR, userId, fileName);
}

export async function ensureUserUploadDir(userId: string): Promise<string> {
  const userDir = getUserUploadDir(userId);
  await mkdir(userDir, { recursive: true });
  return userDir;
}

export type SaveDocumentOptions = {
  userId: string;
  category: DocumentCategory;
  fileName: string;
  mimeType: string;
  propertyId?: string;
  unitId?: string;
  tenantId?: string;
  notes?: string;
  tags?: string;
};

export async function saveDocumentBuffer(
  buffer: Buffer | Uint8Array,
  options: SaveDocumentOptions
) {
  const userDir = await ensureUserUploadDir(options.userId);
  const safeName = options.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const uniqueName = `${Date.now()}-${safeName}`;
  const absolutePath = path.join(userDir, uniqueName);
  await writeFile(absolutePath, buffer);

  return prisma.document.create({
    data: {
      userId: options.userId,
      propertyId: options.propertyId,
      unitId: options.unitId,
      tenantId: options.tenantId,
      category: options.category,
      fileName: options.fileName,
      filePath: getRelativeFilePath(options.userId, uniqueName),
      fileMimeType: options.mimeType,
      fileSizeBytes: buffer.length,
      notes: options.notes,
      tags: options.tags,
    },
  });
}

export function validateUploadedFile(file: File) {
  if (!ALLOWED_UPLOAD_MIME_TYPES.includes(file.type as (typeof ALLOWED_UPLOAD_MIME_TYPES)[number])) {
    throw new Error("File type not allowed. Use PDF, JPG, or PNG.");
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("File must be under 10MB.");
  }
}

export async function readDocumentFile(filePath: string) {
  const absolutePath = path.join(process.cwd(), filePath);
  return readFile(absolutePath);
}

export async function deleteDocumentFile(filePath: string) {
  const absolutePath = path.join(process.cwd(), filePath);
  await unlink(absolutePath).catch(() => undefined);
}
