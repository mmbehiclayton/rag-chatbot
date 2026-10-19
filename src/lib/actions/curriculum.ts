"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { auth } from "@/lib/auth";
import {
  curriculumFileExists,
  isStoredUploadUrl,
  MISSING_FILE,
} from "@/lib/curriculum-files";
import { db } from "@/lib/db";
import { processPDF } from "./pdf";

/**
 * Registers a design whose PDF the browser has already sent to UploadThing, then reads it
 * in the background. (Files don't go through our server: Vercel caps requests at 4.5 MB.)
 */
export async function ingestCurriculum(input: {
  gradeLevel: string;
  subject: string;
  fileUrl: string;
  overwrite?: boolean;
}) {
  try {
    const { userId, role } = await auth();
    if (!userId || role !== "SUPERADMIN") throw new Error("Unauthorized");

    const { gradeLevel, subject, fileUrl, overwrite } = input;
    if (!gradeLevel || !subject || !fileUrl) {
      return {
        success: false,
        error: "Choose the PDF, the grade and the learning area.",
      };
    }
    if (!isStoredUploadUrl(fileUrl))
      return {
        success: false,
        error: "The PDF didn't upload properly. Try again.",
      };

    const existingDoc = await db.curriculumDocument.findFirst({
      where: { gradeLevel, subject },
      include: { _count: { select: { chunks: true } } },
    });

    if (existingDoc && !overwrite) {
      return {
        success: false,
        duplicate: true,
        existingDoc: {
          id: existingDoc.id,
          uploadDate: existingDoc.uploadDate,
          chunks: existingDoc._count.chunks,
        },
        error: `A design for ${gradeLevel} ${subject} is already uploaded.`,
      };
    }

    // Replacing keeps the same record (so schemes and maps linked to it stay linked) and
    // its old sections until the new PDF has been read.
    const doc = existingDoc
      ? await db.curriculumDocument.update({
          where: { id: existingDoc.id },
          data: {
            fileUrl,
            uploadedBy: userId,
            uploadDate: new Date(),
            status: "pending",
            errorMessage: null,
          },
        })
      : await db.curriculumDocument.create({
          data: {
            title: `${gradeLevel} - ${subject}`,
            gradeLevel,
            subject,
            fileUrl,
            uploadedBy: userId,
            status: "pending",
          },
        });

    // Index the design and draft its map after the response, so the upload returns quickly.
    // `after` keeps the work alive on serverless hosts, up to the page's maxDuration.
    after(() =>
      processPDF(doc.id).catch((err) =>
        console.error("Background PDF processing failed:", err),
      ),
    );

    revalidatePath("/dashboard/knowledge");
    return { success: true };
  } catch (err: unknown) {
    console.error("[Upload Error]", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Couldn't save the design.",
    };
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
      where: { id: documentId },
    });

    revalidatePath("/dashboard/knowledge");
    return { success: true };
  } catch (err: unknown) {
    console.error("[Delete Error]", err);
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Failed to delete curriculum.",
    };
  }
}

export async function retryCurriculum(documentId: string) {
  try {
    const { userId, role } = await auth();
    if (!userId || role !== "SUPERADMIN") throw new Error("Unauthorized");

    const doc = await db.curriculumDocument.findUnique({
      where: { id: documentId },
      select: { fileUrl: true },
    });
    if (!doc)
      return { success: false, error: "That design couldn't be found." };
    // Check the PDF is still there before touching anything. Old sections are only
    // replaced once the new ones are ready (see processPDF).
    if (!(await curriculumFileExists(doc.fileUrl))) {
      await db.curriculumDocument.update({
        where: { id: documentId },
        data: { errorMessage: MISSING_FILE },
      });
      revalidatePath("/dashboard/knowledge");
      return { success: false, error: MISSING_FILE };
    }

    await db.curriculumDocument.update({
      where: { id: documentId },
      data: { status: "pending", errorMessage: null },
    });

    after(() =>
      processPDF(documentId).catch((err) =>
        console.error("Background PDF re-processing failed:", err),
      ),
    );

    revalidatePath("/dashboard/knowledge");
    return { success: true };
  } catch (err: unknown) {
    console.error("[Retry Error]", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to retry ingestion.",
    };
  }
}

/** How many failed designs one press of "Try all again" reads, so the work fits in one request. */
const RETRY_BATCH = 6;

/** Reads every failed design again, a few at a time. Used after an outage such as OpenAI running out of credit. */
export async function retryFailedCurricula(): Promise<
  | { success: true; started: number; left: number }
  | { success: false; error: string }
> {
  try {
    const { userId, role } = await auth();
    if (!userId || role !== "SUPERADMIN") throw new Error("Unauthorized");

    const failed = await db.curriculumDocument.findMany({
      where: { status: "error" },
      orderBy: { uploadDate: "desc" },
      select: { id: true, fileUrl: true },
    });
    const batch: string[] = [];
    for (const doc of failed) {
      if (batch.length === RETRY_BATCH) break;
      // A design whose PDF is gone can't be read again; it keeps its message.
      if (await curriculumFileExists(doc.fileUrl)) batch.push(doc.id);
    }
    if (batch.length === 0)
      return {
        success: false,
        error:
          "None of the failed designs can be read again. Upload them again.",
      };

    await db.curriculumDocument.updateMany({
      where: { id: { in: batch } },
      data: { status: "pending", errorMessage: null },
    });

    // Two at a time, so OpenAI's rate limit isn't hit while reading them.
    after(async () => {
      const queue = [...batch];
      const worker = async () => {
        for (let id = queue.shift(); id; id = queue.shift())
          await processPDF(id).catch((err) =>
            console.error("Background PDF re-processing failed:", err),
          );
      };
      await Promise.all([worker(), worker()]);
    });

    revalidatePath("/dashboard/knowledge");
    return {
      success: true,
      started: batch.length,
      left: failed.length - batch.length,
    };
  } catch (err: unknown) {
    console.error("[Retry All Error]", err);
    return {
      success: false,
      error: "Couldn't start reading the designs again.",
    };
  }
}
