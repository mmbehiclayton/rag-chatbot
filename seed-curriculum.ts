import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.curriculumDocument.findFirst({
    where: { gradeLevel: "Grade 4", subject: "Mathematics" }
  });

  if (!existing) {
    await prisma.curriculumDocument.create({
      data: {
        title: "Grade 4 Mathematics KICD Design",
        gradeLevel: "Grade 4",
        subject: "Mathematics",
        term: "Term 1",
        fileUrl: "https://example.com/mock.pdf",
        status: "completed",
        uploadedBy: "system"
      }
    });
    console.log("Mock Grade 4 Mathematics curriculum inserted!");
  } else {
    console.log("Curriculum already exists.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
