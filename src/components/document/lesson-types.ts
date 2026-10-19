// Shape of LessonPlan.content as written by LessonPlanSchema (src/lib/actions/generation.ts).
// Every field is optional because older plans may be missing parts.
export type LessonActivity = {
  activityName?: string;
  duration?: number;
  grouping?: string;
  teacherActions?: string[];
  learnerActions?: string[];
  formativeAssessment?: string;
};

export type LessonContent = {
  topic?: string;
  strand?: string;
  subStrand?: string;
  specificLearningOutcomes?: string[];
  keyInquiryQuestions?: string[];
  learningResources?: string[];
  coreCompetencies?: { competency?: string; howDeveloped?: string }[];
  values?: { value?: string; howDemonstrated?: string }[];
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
      homework?: string;
    };
  };
  assessmentRubric?: {
    criteria?: string;
    exceeding?: string;
    meeting?: string;
    approaching?: string;
    below?: string;
  };
  multimediaSuggestions?: {
    type?: string;
    description?: string;
    purpose?: string;
    suggestedSource?: string;
  }[];
};
