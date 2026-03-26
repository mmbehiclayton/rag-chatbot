// src/lib/validation.ts

// KICD Curriculum Mathematics constraints 
export function validateSchemeOfWork(
  schemeData: any, 
  req: { totalWeeks: number, holidays: number, lessonsPerWeek: number }
) {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Structural Checks
  if (!schemeData.termlyOverview) errors.push("CRITICAL: Missing Termly Overview metrics.");
  if (!schemeData.weeks || schemeData.weeks.length === 0) errors.push("CRITICAL: No weekly rows generated.");

  // 2. Mathematical Time Alignment
  const totalAvailableLessons = (req.totalWeeks - req.holidays) * req.lessonsPerWeek;
  
  if (schemeData.termlyOverview?.totalLessons) {
    if (schemeData.termlyOverview.totalLessons > totalAvailableLessons) {
      warnings.push(`OVER-ALLOCATION: The AI planned ${schemeData.termlyOverview.totalLessons} lessons, but only ${totalAvailableLessons} are physically available based on term dates.`);
    } else if (schemeData.termlyOverview.totalLessons < totalAvailableLessons * 0.8) {
      warnings.push(`UNDER-UTILIZATION: The AI planned only ${schemeData.termlyOverview.totalLessons} lessons, leaving >20% of the ${totalAvailableLessons} available block empty.`);
    }
  }

  // 3. CBC Compliance Metrics
  const csl = schemeData.termlyOverview?.communityServiceActivities?.length || 0;
  if (csl < 2) warnings.push(`NON-COMPLIANCE: Only ${csl} Community Service Learning activities mapped. KICD requires minimum 2.`);

  const parents = schemeData.termlyOverview?.parentalEngagementStrategies?.length || 0;
  if (parents < 2) warnings.push(`NON-COMPLIANCE: Only ${parents} Parental Engagement strategies mapped. KICD requires minimum 2.`);

  // 4. Intensity Checks (Max 3 sub-strands per week to avoid overloading)
  schemeData.weeks?.forEach((week: any) => {
    if (week.rows && week.rows.length > 3) {
      warnings.push(`PEDAGOGICAL RISK: Week ${week.weekNumber} is overloaded with ${week.rows.length} sub-strands. KICD recommends max 2-3 per week.`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export function validateAssessment(assessmentData: any, req: { durationMinutes: number, totalMarks: number }) {
  const errors: string[] = [];
  const warnings: string[] = [];

  let allocatedMarks = 0;
  let hasMarkingScheme = false;

  assessmentData.sections?.forEach((sec: any) => {
    allocatedMarks += sec.totalMarks || 0;
    
    // Check if internal points match section total
    const qMarks = sec.questions?.reduce((sum: number, q: any) => sum + (q.marks || 0), 0);
    if (qMarks !== sec.totalMarks) {
      errors.push(`LOGIC ERROR: Section '${sec.sectionName}' states ${sec.totalMarks} marks, but questions sum up to ${qMarks}.`);
    }
  });

  if (allocatedMarks !== req.totalMarks) {
    errors.push(`LOGIC ERROR: The total paper is worth ${req.totalMarks} marks, but the sections sum up to ${allocatedMarks}.`);
  }

  if (assessmentData.markingScheme && assessmentData.markingScheme.length > 0) {
    hasMarkingScheme = true;
  }

  if (!hasMarkingScheme) errors.push("CRITICAL: AI failed to generate a Marking Scheme array.");

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
