"use server";

import { openai } from "@ai-sdk/openai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { embedMany } from "ai";
import { extractText, getDocumentProxy } from "unpdf";
import { explainAIErrorForStaff } from "@/lib/ai-errors";
import { noteAIFailure } from "@/lib/ai-health";
import { auth } from "@/lib/auth";
import { MISSING_FILE, readCurriculumFile } from "@/lib/curriculum-files";
import { db } from "@/lib/db";
import { draftMapAfterUpload } from "@/lib/map-drafting";

export async function processPDF(documentId: string) {
  const { userId, role } = await auth();
  if (!userId || role !== "SUPERADMIN") throw new Error("Unauthorized");

  const doc = await db.curriculumDocument.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      fileUrl: true,
      status: true,
      _count: { select: { chunks: true } },
    },
  });

  if (!doc) throw new Error("Document not found");
  if (doc.status === "processing") {
    return { success: false, message: "This design is already being read." };
  }
  // A design that's already indexed keeps its old sections until the new ones are ready.
  const hadChunks = doc._count.chunks > 0;

  await db.curriculumDocument.update({
    where: { id: documentId },
    data: { status: "processing", errorMessage: null },
  });

  try {
    // 1. Get the PDF (UploadThing for new uploads, local disk for old local ones)
    const buffer = await readCurriculumFile(doc.fileUrl);
    if (!buffer) throw new Error(MISSING_FILE);

    // 2. Extract the text one page at a time. unpdf is a pdfjs build made for servers.
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text: pages } = await extractText(pdf, { mergePages: false });
    // One line per page, so each chunk's starting line is its page number.
    const text = pages.map((p) => p.replace(/\s*\n\s*/g, " ")).join("\n");
    if (!text.trim())
      throw new Error(
        "No text found in this PDF. It may be a scan. Upload a PDF with selectable text.",
      );

    // 3. Chunking Strategy (KICD size constraints)
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 800,
      chunkOverlap: 150,
    });

    const chunks = await splitter.createDocuments([text]);
    const chunkTexts = chunks.map((chunk) => chunk.pageContent);
    const chunkPages = chunks.map(
      (chunk) => Number(chunk.metadata?.loc?.lines?.from) || null,
    );

    // 4. Generate Vectors (1536 dimensions)
    let embeddings: number[][] = [];
    if (process.env.OPENAI_API_KEY) {
      const res = await embedMany({
        model: openai.embedding("text-embedding-3-small"),
        values: chunkTexts,
      });
      embeddings = res.embeddings;
    } else {
      console.warn(
        "No OPENAI_API_KEY found! Generating dummy embeddings for extraction testing.",
      );
      embeddings = chunkTexts.map(() =>
        Array.from({ length: 1536 }, () => Math.random() - 0.5),
      );
    }

    // 5. Swap the old sections for the new ones (pgvector + Prisma raw queries)
    await db.curriculumChunk.deleteMany({
      where: { curriculumId: documentId },
    });
    for (let i = 0; i < chunks.length; i++) {
      const vectorString = `[${embeddings[i].join(",")}]`;
      await db.$executeRaw`
        INSERT INTO "CurriculumChunk" ("id", "curriculumId", "chunkText", "chunkIndex", "pageNumber", "embedding")
        VALUES (gen_random_uuid(), ${documentId}, ${chunkTexts[i]}, ${i}, ${chunkPages[i]}, ${vectorString}::vector)
      `;
    }

    await db.curriculumDocument.update({
      where: { id: documentId },
      data: { status: "completed", errorMessage: null },
    });

    console.log(
      `[PDF Extraction & Vectors] Completed for ${documentId}. Inserted ${chunks.length} chunks.`,
    );

    // Next step of the pipeline: draft the class's curriculum map for curators to check.
    await draftMapAfterUpload(documentId).catch((e) =>
      console.error("[map draft] failed after upload:", e),
    );
    return { success: true, chunksCount: chunks.length };
  } catch (error: unknown) {
    console.error("[PDF Extraction Error]", error);
    const stillHasChunks =
      hadChunks &&
      (await db.curriculumChunk.count({
        where: { curriculumId: documentId },
      })) > 0;
    const message = explainAIErrorForStaff(error);
    await noteAIFailure(error);
    await db.curriculumDocument.update({
      where: { id: documentId },
      data: {
        // If the old sections are still there, the design stays usable.
        status: stillHasChunks ? "completed" : "error",
        errorMessage: message,
      },
    });
    return { success: false, error: "Extraction or Embedding failed" };
  }
}
