"use server"

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import fs from "fs/promises";
import path from "path";
import { processPDF } from "./pdf";

export async function ingestCurriculum(formData: FormData) {
  try {
    const { userId, role } = await auth();
    if (!userId || role !== "SUPERADMIN") throw new Error("Unauthorized");

    const title = formData.get("title") as string;
    const gradeLevel = formData.get("gradeLevel") as string;
    const subject = formData.get("subject") as string;
    const file = formData.get("file") as File;

    if (!file || !title || !gradeLevel || !subject) {
      return { success: false, error: "Missing required configuration fields." };
    }

    const overwrite = formData.get("overwrite") === "true";

    // 1. Check duplicate vector domain
    const existingDoc = await db.curriculumDocument.findFirst({
      where: { gradeLevel, subject },
      include: { _count: { select: { chunks: true } } }
    });

    if (existingDoc && !overwrite) {
      return { 
        success: false, 
        duplicate: true, 
        existingDoc: {
          id: existingDoc.id,
          uploadDate: existingDoc.uploadDate,
          chunks: existingDoc._count.chunks
        },
        error: `A Curriculum Design for ${gradeLevel} ${subject} already exists.` 
      };
    }

    if (existingDoc && overwrite) {
      // Delete old doc (cascades to chunks)
      await db.curriculumDocument.delete({ where: { id: existingDoc.id } });
    }

    // 2. Buffer conversion and physical storage (Local for immediate demo sync)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });

    // Sanitize filename
    const filename = `${gradeLevel}-${subject}-${Date.now()}.pdf`.replace(/\s+/g, '-').toLowerCase();
    const filepath = path.join(uploadsDir, filename);
    await fs.writeFile(filepath, buffer);

    const relativeUrl = `/uploads/${filename}`;

    // 3. Register standard database node
    const doc = await db.curriculumDocument.create({
      data: {
        title,
        gradeLevel,
        subject,
        fileUrl: relativeUrl, // Store relative URL
        uploadedBy: userId,
        status: "pending",
      }
    });

    // 4. Abstractly trigger the heavy Langchain extraction asynchronously
    // Background execution pattern
    processPDF(doc.id).catch(err => console.error("Background PDF processing failed:", err));

    revalidatePath("/dashboard/knowledge");
    return { success: true };
  } catch (err: any) {
    console.error("[Upload Error]", err);
    return { success: false, error: err.message || "Failed to parse system upload." };
  }
}

export async function checkCurriculumCoverage(grade: string, subject: string) {
  const session = await auth();
  if (!session?.userId) throw new Error("Unauthorized");

  const doc = await db.curriculumDocument.findFirst({
    where: {
      gradeLevel: grade,
      subject,
      OR: [{ tenantId: session.tenantId }, { tenantId: null }],
    },
    include: { _count: { select: { chunks: true } } },
  });

  return {
    hasCurriculum: !!doc,
    status: doc?.status ?? null,
    chunkCount: doc?._count.chunks ?? 0,
  };
}

export async function deleteCurriculum(documentId: string) {
  try {
    const { userId, role } = await auth();
    if (!userId || role !== "SUPERADMIN") throw new Error("Unauthorized");

    // This cascades and removes all related chunks due to the Prisma schema onDelete: Cascade
    await db.curriculumDocument.delete({
      where: { id: documentId }
    });

    revalidatePath("/dashboard/knowledge");
    return { success: true };
  } catch (err: any) {
    console.error("[Delete Error]", err);
    return { success: false, error: err.message || "Failed to delete curriculum." };
  }
}

export async function retryCurriculum(documentId: string) {
  try {
    const { userId, role } = await auth();
    if (!userId || role !== "SUPERADMIN") throw new Error("Unauthorized");

    // Purge any partial chunks from the failed attempt before re-ingesting
    await db.curriculumChunk.deleteMany({ where: { curriculumId: documentId } });

    await db.curriculumDocument.update({
      where: { id: documentId },
      data: { status: "pending", errorMessage: null },
    });

    processPDF(documentId).catch((err) =>
      console.error("Background PDF re-processing failed:", err)
    );

    revalidatePath("/dashboard/knowledge");
    return { success: true };
  } catch (err: any) {
    console.error("[Retry Error]", err);
    return { success: false, error: err.message || "Failed to retry ingestion." };
  }
}
