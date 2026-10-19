// Shape of LessonPlan.content as written by LessonPlanSchema (src/lib/actions/generation.ts).
// Every field is optional because older plans may be missing parts.
export type LessonActivity = {
  activityName?: string;
  duration?: number;
  grouping?: string;
  teacherActions?: string[];
  learnerActions?: string[];
  /** Core competencies, values or PCIs this step develops (plans from October 2026 on). */
  integration?: string;
  formativeAssessment?: string;
};

export type LessonContent = {
  topic?: string;
  strand?: string;
  subStrand?: string;
  specificLearningOutcomes?: string[];
  keyInquiryQuestions?: string[];
  learningResources?: string[];
  organisationOfLearning?: string;
  coreCompetencies?: { competency?: string; howDeveloped?: string }[];
  values?: { value?: string; howDemonstrated?: string }[];
  pertinentIssues?: { issue?: string; howAddressed?: string }[];
  linksToOtherLearningAreas?: { learningArea?: string; link?: string }[];
  lessonStructure?: {
    introduction?: {
      duration?: number;
      recap?: string;
      connectionToLearnersLives?: string;
      learningIntentions?: string;
      successCriteria?: string;
    };
    mainActivities?: LessonActivity[];
    differentiation?: {
      learnersNeedingSupport?: string;
      averageLearners?: string;
      advancedLearners?: string;
    };
    conclusion?: {
      duration?: number;
      summary?: string;
      assessmentOfLearning?: string;
      exitTicket?: string;
      previewNextLesson?: string;
      /** Older plans only; newer ones use extendedActivity. */
      homework?: string;
    };
  };
  extendedActivity?: string;
  /** Written by the teacher after teaching. */
  reflection?: string;
  assessmentRubric?: {
    criteria?: string;
    exceeding?: string;
    meeting?: string;
    approaching?: string;
    below?: string;
  };
  /** Older plans only. */
  multimediaSuggestions?: {
    type?: string;
    description?: string;
    purpose?: string;
    suggestedSource?: string;
  }[];
};
