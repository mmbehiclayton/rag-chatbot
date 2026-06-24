"use server"

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { embedMany } from "ai";
import { openai } from "@ai-sdk/openai";
import path from "path";
import fs from "fs";
import { pathToFileURL } from "url";

export async function processPDF(documentId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // 1. Fetch document from DB
  const doc = await db.curriculumDocument.findUnique({
    where: { id: documentId }
  });

  if (!doc) throw new Error("Document not found");
  if (doc.status === "processing" || doc.status === "completed") {
    return { success: false, message: "Document already processed or processing." };
  }

  // Set status
  await db.curriculumDocument.update({
    where: { id: documentId },
    data: { status: "processing" }
  });

  try {
    // 2. Read the PDF from local disk storage
    const docPath = path.resolve(process.cwd(), "public", doc.fileUrl.replace(/^\//, ""));
    const buffer = await fs.promises.readFile(docPath);

    // 3. Extract text using pdfjs-dist
    // pdfjs-dist is in serverExternalPackages (not bundled), so its internal
    // dynamic import for the worker resolves correctly via Node.js module resolution.
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

    // Point pdfjs to the actual worker file in node_modules so its fake-worker
    // dynamic import doesn't try to load a non-existent bundled chunk.
    const workerPath = path.resolve(
      process.cwd(),
      "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"
    );
    pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;

    const data = new Uint8Array(buffer);
    const loadingTask = pdfjs.getDocument({ data });
    const pdfDocument = await loadingTask.promise;

    let text = "";
    for (let i = 1; i <= pdfDocument.numPages; i++) {
      const page = await pdfDocument.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: any) => item.str)
        .join(" ");
      text += pageText + "\n";
    }

    // 4. Chunking Strategy (KICD size constraints)
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 800,
      chunkOverlap: 150,
    });

    const chunks = await splitter.createDocuments([text]);
    const chunkTexts = chunks.map(chunk => chunk.pageContent);

    // 5. Generate Vectors (1536 dimensions)
    let embeddings: number[][] = [];
    if (process.env.OPENAI_API_KEY) {
      const res = await embedMany({
        model: openai.embedding("text-embedding-3-small"),
        values: chunkTexts,
      });
      embeddings = res.embeddings;
    } else {
      console.warn("No OPENAI_API_KEY found! Generating dummy embeddings for extraction testing.");
      embeddings = chunkTexts.map(() => Array.from({ length: 1536 }, () => Math.random() - 0.5));
    }

    // 6. Vector Storage (pgvector + Prisma raw queries)
    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunkTexts[i];
      const embedding = embeddings[i];
      const vectorString = `[${embedding.join(",")}]`;

      await db.$executeRaw`
        INSERT INTO "CurriculumChunk" ("id", "curriculumId", "chunkText", "chunkIndex", "embedding")
        VALUES (gen_random_uuid(), ${documentId}, ${chunkText}, ${i}, ${vectorString}::vector)
      `;
    }

    await db.curriculumDocument.update({
      where: { id: documentId },
      data: { status: "completed" }
    });

    console.log(`[PDF Extraction & Vectors] Completed for ${documentId}. Inserted ${chunks.length} chunks.`);
    return { success: true, chunksCount: chunks.length };
  } catch (error: any) {
    console.error("[PDF Extraction Error]", error);
    await db.curriculumDocument.update({
      where: { id: documentId },
      data: {
        status: "error",
        errorMessage: error.message || "Unknown PDF parsing error."
      }
    });
    return { success: false, error: "Extraction or Embedding failed" };
  }
}
