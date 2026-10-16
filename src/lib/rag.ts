import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { embed } from "ai";
import { openai } from "@ai-sdk/openai";

export async function retrieveContext(query: string, k = 5, filters?: { grade?: string, subject?: string, tenantId?: string, grades?: string[] }) {
  try {
    // Generate embedding for the user query
    const { embedding } = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: query,
    });

    const vectorString = `[${embedding.join(",")}]`;

    // Perform semantic search using pgvector's cosine distance operator (<=>)
    // We calculate similarity as 1 - cosine distance
    // If filters are provided, we dynamically build a strict WHERE-clause joined search
    let results: any[] = [];

    // Pass 1: Priority filtered search (by Grade & Subject)
    if (filters?.grade && filters?.subject) {
      results = await db.$queryRaw`
        SELECT c."chunkText", c."pageNumber", c."curriculumId",
               1 - (c."embedding" <=> ${vectorString}::vector) as similarity
        FROM "CurriculumChunk" c
        JOIN "CurriculumDocument" d ON c."curriculumId" = d."id"
        WHERE d."gradeLevel" = ${filters.grade}
          AND d."subject" = ${filters.subject}
          AND (d."tenantId" = ${filters.tenantId} OR d."tenantId" IS NULL)
        ORDER BY c."embedding" <=> ${vectorString}::vector
        LIMIT ${k}
      `;
    }

    // Pass 2: broad search, only when no class was given. With a grade and learning area we never
    // pad the results with another class's curriculum: it reads as plausible but is wrong.
    // `grades` narrows it to the classes the teacher teaches.
    if (!(filters?.grade && filters?.subject)) {
      const inGrades = filters?.grades?.length ? Prisma.sql`AND d."gradeLevel" = ANY(${filters.grades})` : Prisma.empty;
      results = await db.$queryRaw`
        SELECT c."chunkText", c."pageNumber", c."curriculumId",
               1 - (c."embedding" <=> ${vectorString}::vector) as similarity
        FROM "CurriculumChunk" c
        JOIN "CurriculumDocument" d ON c."curriculumId" = d."id"
        WHERE (d."tenantId" = ${filters?.tenantId ?? null} OR d."tenantId" IS NULL)
          ${inGrades}
        ORDER BY c."embedding" <=> ${vectorString}::vector
        LIMIT ${k}
      `;
    }

    return results.map(r => ({
      chunkText: r.chunkText,
      pageNumber: r.pageNumber,
      curriculumId: r.curriculumId,
      similarity: Number(r.similarity)
    }));
  } catch (error) {
    console.error("Error retrieving context:", error);
    return [];
  }
}
