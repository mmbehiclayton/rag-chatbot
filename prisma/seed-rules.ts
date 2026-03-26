import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasourceUrl: "postgresql://neondb_owner:npg_TCgjN0fnc2aP@ep-steep-shadow-amk94n39-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
});

const rules = [
  {
    contentType: "SCHEME_OF_WORK",
    customPrompt: `1. Ensure all Strands and Sub-strands are mapped 1:1 to the KICD curriculum design provided in the context.
2. Learning Outcomes must be extracted verbatim from the curriculum design; DO NOT paraphrase or generalize.
3. For every sub-strand, integrate at least one "Community Service Learning" (CSL) activity that connects the classroom concept to real-world community impact.
4. Explicitly tag "Parental Engagement" opportunities (e.g., homework discussion topics or home-based activities).
5. Ensure logical sequencing: concepts must transition from "Known to Unknown" and "Simple to Complex".`
  },
  {
    contentType: "LESSON_PLAN",
    customPrompt: `1. Structure the lesson exactly according to the 15-70-15 percentage rule (Introduction: 6 mins, Main Activities: 28 mins, Conclusion: 6 mins for a 40-min lesson).
2. The Introduction must bridge the learner's "Prior Knowledge" to the new "Sub-strand".
3. Main activities must be "Learner-Centered" (Discovery-based). Use the phrase "The learner to..." for learner actions.
4. Differentiation: Provide specific task variations for:
   - Learners needing support (Foundational tasks).
   - Average learners (Standard tasks).
   - Advanced learners (Extension/Challenge tasks).
5. Create a 4-level CBC assessment rubric (Exceeding, Meeting, Approaching, Below) for the specific lesson objective.`
  },
  {
    contentType: "LESSON_NOTES",
    customPrompt: `1. For every key concept, provide 3 "Worked Examples":
   - BASIC: For establishing foundation.
   - MEETING: Standard application of the concept.
   - ADVANCED: Complex problem-solving/Critical thinking.
2. Include "Teacher Commentary" (Think-Alouds) explaining the underlying pedagogical reasoning for each step.
3. Identify 5 Common Misconceptions relevant to this sub-strand and provide the specific correction logic to be shared with learners.
4. Format with clear headings, bullet points, and "Deep Questioning" boxes.`
  },
  {
    contentType: "ASSESSMENT",
    customPrompt: `1. Adhere to Bloom's Taxonomy distribution: 30% Foundation (Remember/Understand), 40% Application (Apply), 30% Critical Thinking (Analyze/Evaluate).
2. Every question MUST include a "Verbatim Model Answer" to guide marking consistency.
3. For subjective or multi-step questions, provide a "Specific Marking Scheme" that awards marks for correct reasoning even if the final result is incorrect.
4. Ensure language is age-appropriate and strictly follows the vocabulary found in the KICD curriculum design.`
  },
  {
    contentType: "GLOBAL_CHAT",
    customPrompt: `You are Elimu AI, a premium pedagogical assistant for Kenyan educators. 
1. Your tone is professional, encouraging, and deeply knowledgeable about the CBC framework.
2. When answering questions, prioritize the provided KICD curriculum context. 
3. If asked about lesson structure, always recommend the 15-70-15 percentage rule (Intro-Main-Conclusion).
4. Always suggest active, learner-centered activities rather than passive listening.
5. If a teacher is struggling with a concept, provide a "Meeting" level worked example to help them explain it to learners.`
  }
];

async function main() {
  console.log("Seeding AI Generation Rules...");
  
  for (const rule of rules) {
    await prisma.generationRule.upsert({
      where: { contentType: rule.contentType },
      update: { customPrompt: rule.customPrompt },
      create: {
        contentType: rule.contentType,
        customPrompt: rule.customPrompt
      }
    });
    console.log(`- Seeded rule for: ${rule.contentType}`);
  }
  
  console.log("Seeding complete! 🏛️✨");
}

main()
  .catch((e) => {
    console.error("SEED ERROR:", JSON.stringify(e, null, 2));
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
