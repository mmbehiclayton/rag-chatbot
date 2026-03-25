import "dotenv/config";
import { PrismaClient } from "@prisma/client";

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL is not defined in the environment.");
  process.exit(1);
}

const db = new PrismaClient();

console.log("🔍 Database URL loaded (length):", process.env.DATABASE_URL.length);
console.log("🔍 Available models on prisma client:", Object.keys(db).filter(k => !k.startsWith("_")));
if (!('curriculumLevel' in db)) {
  console.error("❌ curriculumLevel model not found on Prisma Client. Please run 'npx prisma generate' again.");
  process.exit(1);
}

const CBC_STRUCTURE = [
  {
    level: "Pre-Primary",
    order: 1,
    grades: [
      { name: "PP1", order: 1 },
      { name: "PP2", order: 2 },
    ],
    learningAreas: [
      "Language Activities",
      "Mathematical Activities",
      "Environmental Activities",
      "Creative Activities",
      "Religious Activities",
      "Pastoral Programme of Instruction (PPI)",
    ],
  },
  {
    level: "Lower Primary",
    order: 2,
    grades: [
      { name: "Grade 1", order: 3 },
      { name: "Grade 2", order: 4 },
      { name: "Grade 3", order: 5 },
    ],
    learningAreas: [
      "English",
      "Kiswahili",
      "Indigenous Language",
      "Mathematics",
      "Environmental Activities",
      "Religious Education",
      "Creative Activities",
    ],
  },
  {
    level: "Upper Primary",
    order: 3,
    grades: [
      { name: "Grade 4", order: 6 },
      { name: "Grade 5", order: 7 },
      { name: "Grade 6", order: 8 },
    ],
    learningAreas: [
      "English",
      "Kiswahili",
      "Mathematics",
      "Science and Technology",
      "Social Studies",
      "Agriculture and Nutrition",
      "Religious Education",
      "Creative Arts",
      "Home Science",
      "Physical & Health Education",
    ],
  },
  {
    level: "Junior Secondary",
    order: 4,
    grades: [
      { name: "Grade 7", order: 9 },
      { name: "Grade 8", order: 10 },
      { name: "Grade 9", order: 11 },
    ],
    learningAreas: [
      "English",
      "Kiswahili",
      "Mathematics",
      "Integrated Science",
      "Social Studies",
      "Religious Education",
      "Creative Arts and Sports",
      "Pre-Technical Studies",
      "Agriculture",
    ],
  },
  {
    level: "Senior Secondary",
    order: 5,
    grades: [
      { name: "Grade 10", order: 12 },
      { name: "Grade 11", order: 13 },
      { name: "Grade 12", order: 14 },
    ],
    learningAreas: [
      "English",
      "Kiswahili",
      "Physical Education",
      "Community Service Learning",
      // STEM
      "Mathematics",
      "Physics",
      "Chemistry",
      "Biology",
      "ICT",
      "Engineering and Technical Studies",
      // Social Sciences
      "Business Studies",
      "History",
      "Geography",
      // Arts & Sports
      "Music",
      "Dance",
      "Theatre",
      "Sports Science",
    ],
  },
];

async function seedCBC() {
  console.log("🌱 Seeding CBC curriculum structure...");

  // Collect all unique learning area names first
  const allAreaNames = new Set<string>();
  for (const lvl of CBC_STRUCTURE) {
    for (const a of lvl.learningAreas) allAreaNames.add(a);
  }

  // Upsert all LearningAreas
  const areaMap = new Map<string, string>(); // name → id
  let areaOrder = 1;
  for (const name of allAreaNames) {
    const area = await db.learningArea.upsert({
      where: { name },
      update: {},
      create: { name, order: areaOrder++ },
    });
    areaMap.set(name, area.id);
  }

  // Upsert Levels, Grades, and junctions
  for (const lvlData of CBC_STRUCTURE) {
    const level = await db.curriculumLevel.upsert({
      where: { name: lvlData.level },
      update: { order: lvlData.order },
      create: { name: lvlData.level, order: lvlData.order },
    });

    for (const gradeData of lvlData.grades) {
      const grade = await db.gradeLevel.upsert({
        where: { name: gradeData.name },
        update: { order: gradeData.order, levelId: level.id },
        create: { name: gradeData.name, order: gradeData.order, levelId: level.id },
      });

      // Upsert junctions
      for (const areaName of lvlData.learningAreas) {
        const areaId = areaMap.get(areaName)!;
        await db.levelLearningArea.upsert({
          where: { gradeId_learningAreaId: { gradeId: grade.id, learningAreaId: areaId } },
          update: {},
          create: { gradeId: grade.id, learningAreaId: areaId },
        });
      }
    }
  }

  const gradeCount = await db.gradeLevel.count();
  const areaCount = await db.learningArea.count();
  const junctionCount = await db.levelLearningArea.count();
  console.log(`✅ Seeded: ${gradeCount} grades, ${areaCount} learning areas, ${junctionCount} combinations`);
}

seedCBC()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
