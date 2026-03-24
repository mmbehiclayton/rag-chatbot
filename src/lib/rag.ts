import { db } from "@/lib/db";
import { embed } from "ai";
import { openai } from "@ai-sdk/openai";

export async function retrieveContext(query: string, k = 5, filters?: { grade?: string, subject?: string }) {
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
    if (filters?.grade && filters?.subject) {
      results = await db.$queryRaw`
        SELECT c."chunkText", c."pageNumber", c."curriculumId",
               1 - (c."embedding" <=> ${vectorString}::vector) as similarity
        FROM "CurriculumChunk" c
        JOIN "CurriculumDocument" d ON c."curriculumId" = d."id"
        WHERE d."gradeLevel" = ${filters.grade} AND d."subject" = ${filters.subject}
        ORDER BY c."embedding" <=> ${vectorString}::vector
        LIMIT ${k}
      `;
    } else {
      // Fallback to global search if no strict filters applied
      results = await db.$queryRaw`
        SELECT "chunkText", "pageNumber", "curriculumId",
               1 - ("embedding" <=> ${vectorString}::vector) as similarity
        FROM "CurriculumChunk"
        ORDER BY "embedding" <=> ${vectorString}::vector
        LIMIT ${k}
      `;
    }

    return results as Array<{
      chunkText: string;
      pageNumber: number | null;
      curriculumId: string;
      similarity: number;
    }>;

    return results;
  } catch (error) {
    console.error("Error retrieving context:", error);
    return [];
  }
}
