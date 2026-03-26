"use server"

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { embedMany } from "ai";
import { openai } from "@ai-sdk/openai";

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
    // 2. Read the PDF from local Disk storage
    const path = require("path");
    const fs = require("fs");
    const docPath = "public/" + doc.fileUrl; // Avoid direct path.join with process.cwd() up front
    const filepath = path.resolve(docPath);
    const buffer = await fs.promises.readFile(filepath);

    // 3. Extract text (Spawn an isolated vanilla Node.js child process)
    // This absolutely bypasses Next.js Turbopack compiler bugs natively.
    const { execFileSync } = require("child_process");
    const workerFilename = "pdf-worker.cjs";
    const workerRelativePath = "src/lib/" + workerFilename;
    const workerPath = path.resolve(workerRelativePath);
    
    const textBuffer = execFileSync("node", [workerPath, filepath], { 
       maxBuffer: 1024 * 1024 * 50 // 50MB maximum raw text throughput allowance
    });
    
    const text = textBuffer.toString('utf-8');

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
      embeddings = chunkTexts.map(() => Array.from({length: 1536}, () => Math.random() - 0.5));
    }

    // 6. Vector Storage (Pgvector + Prisma raw queries)
    for (let i = 0; i < chunks.length; i++) {
        const chunkText = chunkTexts[i];
        const embedding = embeddings[i];
        
        // Convert the array into a Postgres vector format enclosed by brackets
        const vectorString = `[${embedding.join(",")}]`;

        await db.$executeRaw`
            INSERT INTO "CurriculumChunk" ("id", "curriculumId", "chunkText", "chunkIndex", "embedding")
            VALUES (gen_random_uuid(), ${documentId}, ${chunkText}, ${i}, ${vectorString}::vector)
        `;
    }

    // Complete processing
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
