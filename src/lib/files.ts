import { mkdir, writeFile, readFile } from "fs/promises";
import path from "path";
import { prisma } from "./db";
import type { DocumentCategory } from "@prisma/client";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

export async function saveUploadedFile(
  file: File,
  options: {
    userId: string;
    category: DocumentCategory;
    propertyId?: string;
    unitId?: string;
    tenantId?: string;
    notes?: string;
  }
) {
  const allowedTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/jpg",
    "image/heic",
  ];

  if (!allowedTypes.includes(file.type)) {
    throw new Error("File type not allowed. Use PDF, JPG, or PNG.");
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error("File must be under 10MB.");
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const uniqueName = `${Date.now()}-${safeName}`;
  const userDir = path.join(process.cwd(), UPLOAD_DIR, options.userId);
  await mkdir(userDir, { recursive: true });

  const filePath = path.join(userDir, uniqueName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  const document = await prisma.document.create({
    data: {
      userId: options.userId,
      propertyId: options.propertyId,
      unitId: options.unitId,
      tenantId: options.tenantId,
      category: options.category,
      fileName: file.name,
      filePath: path.join(UPLOAD_DIR, options.userId, uniqueName),
      fileMimeType: file.type,
      fileSizeBytes: file.size,
      notes: options.notes,
    },
  });

  return document;
}

export async function readDocumentFile(filePath: string) {
  const absolutePath = path.join(process.cwd(), filePath);
  return readFile(absolutePath);
}
