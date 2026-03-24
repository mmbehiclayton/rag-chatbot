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

    // 1. Check duplicate vector domain
    const existingDoc = await db.curriculumDocument.findFirst({
      where: { gradeLevel, subject }
    });

    if (existingDoc) {
      return { success: false, error: `A Curriculum Design for ${gradeLevel} ${subject} already exists! Delete the older dataset before injecting a replacement.` };
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
