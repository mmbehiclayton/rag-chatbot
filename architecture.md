CONTENT GENERATION RULES & GUIDELINES - KICD CBC COMPLIANT

================================================================================
SECTION 1: WHY RULES ARE CRITICAL
================================================================================

WITHOUT RULES, AI WILL:
✗ Generate inconsistent formats across teachers
✗ Miss mandatory KICD CBC components
✗ Create unrealistic time allocations
✗ Ignore competency-based approach
✗ Produce generic content not aligned to curriculum
✗ Skip critical assessment rubrics
✗ Fail to integrate core competencies and values

WITH RULES, AI WILL:
✓ Maintain KICD format consistency
✓ Include all mandatory sections
✓ Respect realistic lesson durations
✓ Follow CBC pedagogy
✓ Align perfectly with curriculum learning outcomes
✓ Include proper assessment criteria
✓ Integrate 7 core competencies and values


================================================================================
SECTION 2: SCHEME OF WORK GENERATION RULES
================================================================================

2.1 MANDATORY COMPONENTS
-------------------------

A scheme of work MUST contain:

1. HEADER INFORMATION
   □ School name (user input)
   □ Grade/Class
   □ Subject/Learning Area
   □ Term (1, 2, or 3)
   □ Academic Year
   □ Teacher's name
   □ Number of lessons per week
   □ Lesson duration (minutes)

2. WEEKLY BREAKDOWN TABLE
   Columns (MANDATORY):
   □ Week Number (1-14 for most terms)
   □ Strand
   □ Sub-strand
   □ Specific Learning Outcomes (from curriculum)
   □ Key Inquiry Questions
   □ Learning Experiences (Activities)
   □ Learning Resources
   □ Assessment Methods
   □ Reflection/Remarks

3. TERMLY OVERVIEW
   □ Total number of lessons
   □ Strands to be covered
   □ Integration opportunities (cross-subject)
   □ Community Service Learning activities
   □ Parental Engagement strategies


2.2 GENERATION RULES FROM CURRICULUM DESIGN
--------------------------------------------

RULE 1: STRAND SEQUENCING
- Extract all strands from curriculum design for the term
- Follow KICD's recommended sequence (usually in order they appear)
- Never skip strands listed in curriculum
- Distribute strands proportionally across term weeks

RULE 2: TIME ALLOCATION
- Count total lessons available in term:
  Formula: (Number of weeks - holidays/events) × lessons per week
  Example: (14 weeks - 2 weeks holidays) × 5 lessons = 60 lessons
  
- Allocate lessons per strand based on:
  • Strand complexity (from curriculum)
  • Number of sub-strands
  • Learning outcomes count
  • KICD suggested time allocation

RULE 3: LEARNING OUTCOMES MAPPING
- Extract EXACT learning outcomes from curriculum design
- DO NOT paraphrase or modify them
- One or more outcomes per week
- Ensure all curriculum outcomes covered by term end
- Cross-reference: If curriculum has 45 outcomes, scheme must address all 45

RULE 4: PROGRESSION PRINCIPLE
- Move from simple to complex concepts
- Build on previous knowledge
- Consider cognitive development for grade level
- Example: Grade 1 - concrete before abstract
- Example: Grade 7 - can handle more abstract concepts

RULE 5: INTEGRATION REQUIREMENTS
- Identify natural cross-subject connections
- Include at least 2 integration opportunities per term
- Example: Math + Science (measurements in experiments)
- Example: English + Social Studies (reading comprehension on Kenya history)

RULE 6: CORE COMPETENCIES INTEGRATION
Every scheme must show how these 7 CBC core competencies are developed:
1. Communication and Collaboration
2. Critical Thinking and Problem Solving
3. Creativity and Imagination
4. Citizenship
5. Digital Literacy
6. Learning to Learn
7. Self-Efficacy

Tag activities with competencies developed


2.3 SCHEME OF WORK TEMPLATE STRUCTURE
--------------------------------------

```
SCHEME OF WORK

School: ________________________     Grade: _______
Subject: ___________________          Term: ________
Year: ______                          Teacher: _______________
Lessons per week: ____               Lesson duration: ____ mins

┌─────┬─────────┬───────────┬──────────────┬─────────────┬──────────────┬─────────────┬─────────────┬──────────┐
│Week │ Strand  │Sub-strand │ Specific     │Key Inquiry  │Learning      │Learning     │Assessment   │Reflection│
│ No. │         │           │Learning      │Questions    │Experiences   │Resources    │Methods      │          │
│     │         │           │Outcomes      │             │              │             │             │          │
├─────┼─────────┼───────────┼──────────────┼─────────────┼──────────────┼─────────────┼─────────────┼──────────┤
│  1  │Listening│Listening  │By end of     │1. What      │- Teacher     │- Chart      │- Observation│          │
│     │and      │Skills     │sub-strand,   │sounds do we │  reads story │  paper      │- Oral       │          │
│     │Speaking │           │learner should│hear around  │  aloud       │- Picture    │  questions  │          │
│     │         │           │be able to    │us?          │- Learners    │  cards      │- Listening  │          │
│     │         │           │listen and    │2. How do we │  identify    │- Audio      │  comprehens-│          │
│     │         │           │identify      │show we are  │  sounds      │  recorder   │  ion checklist         │
│     │         │           │different     │listening?   │- Sound games │             │             │          │
│     │         │           │sounds        │             │              │             │             │          │
│     │         │           │              │             │Core Comp:    │             │             │          │
│     │         │           │              │             │Communication,│             │             │          │
│     │         │           │              │             │Learning to   │             │             │          │
│     │         │           │              │             │Learn         │             │             │          │
└─────┴─────────┴───────────┴──────────────┴─────────────┴──────────────┴─────────────┴─────────────┴──────────┘

[Table continues for 12-14 weeks]

COMMUNITY SERVICE LEARNING:
Week 5: Learners visit elderly home and practice greetings (Citizenship)

PARENTAL ENGAGEMENT:
Week 3: Parents to practice letter sounds at home
Week 8: Parents attend storytelling session

CROSS-CURRICULAR INTEGRATION:
Week 4: English + Math - Counting objects in story
Week 9: English + Social Studies - Story about Kenyan culture
```


2.4 VALIDATION CHECKLIST FOR SCHEMES
--------------------------------------

Before finalizing, AI must verify:

□ All strands from curriculum are included
□ Number of weeks matches term length
□ Total lessons calculated correctly
□ All learning outcomes from curriculum covered
□ Resources are age-appropriate and available
□ Assessment methods are varied (not just tests)
□ Core competencies tagged in activities
□ At least one community service activity
□ At least one parental engagement activity
□ Progression is logical (simple → complex)
□ No week is overloaded (max 2-3 sub-strands per week)
□ Language appropriate for grade level
□ Inquiry questions are open-ended and thought-provoking


2.5 AI PROMPT TEMPLATE FOR SCHEME GENERATION
----------------------------------------------

```
You are an expert KICD curriculum specialist. Generate a Scheme of Work with these specifications:

INPUT DATA:
- Curriculum Design: [FULL TEXT OF CURRICULUM PDF]
- Grade Level: {grade}
- Subject: {subject}
- Term: {term_number}
- Academic Year: {year}
- Term Start Date: {start_date}
- Term End Date: {end_date}
- Lessons per week: {lessons_per_week}
- Lesson duration: {duration_minutes} minutes
- School holidays: {holiday_dates}

MANDATORY REQUIREMENTS:
1. Extract ALL strands and sub-strands from the provided curriculum
2. Extract EXACT learning outcomes (do not paraphrase)
3. Calculate total available lessons: (weeks - holidays) × lessons per week
4. Distribute lessons proportionally across strands
5. Ensure weekly progression from simple to complex
6. Include all 7 CBC core competencies across activities
7. Add at least 2 community service learning activities
8. Add at least 2 parental engagement opportunities
9. Include diverse assessment methods (observation, oral, practical, written)
10. Use age-appropriate language for Grade {grade}

OUTPUT FORMAT:
Follow the exact table structure provided in the template.
Each week must have: Strand, Sub-strand, Learning Outcomes, Key Inquiry Questions, 
Learning Experiences, Resources, Assessment Methods.

VALIDATION:
After generation, verify:
- All curriculum learning outcomes are addressed
- Total lessons match calculated available lessons
- No strand is omitted
- Competencies are balanced across weeks
- Resources are realistic and locally available

Generate the complete Scheme of Work now.
```


================================================================================
SECTION 3: LESSON PLAN GENERATION RULES
================================================================================

3.1 MANDATORY COMPONENTS
-------------------------

A lesson plan MUST contain:

1. HEADER
   □ School name
   □ Grade/Class
   □ Subject
   □ Date
   □ Duration
   □ Teacher's name
   □ Number of learners

2. CONTENT SECTION
   □ Strand
   □ Sub-strand
   □ Specific learning outcomes
   □ Key inquiry question(s)

3. LEARNING RESOURCES
   □ Materials needed
   □ Reference materials

4. LESSON STRUCTURE (3-Part Format)
   
   A. INTRODUCTION (10-15% of time)
      □ Recap previous lesson
      □ Connection to learners' experiences
      □ Learning intentions shared
      □ Success criteria explained
   
   B. MAIN ACTIVITY (70-80% of time)
      □ Teacher-led instruction
      □ Guided practice
      □ Independent/group activities
      □ Differentiation strategies
      □ Formative assessment checkpoints
   
   C. CONCLUSION (10-15% of time)
      □ Summary of key points
      □ Assessment of learning
      □ Preview next lesson
      □ Homework/extension

5. ASSESSMENT
   □ Formative assessment strategies
   □ Assessment rubric (4-level CBC rubric)
   □ Success criteria

6. REFLECTION
   □ What worked well
   □ What needs improvement
   □ Learner participation notes
   □ Follow-up actions


3.2 GENERATION RULES FROM SCHEME OF WORK
------------------------------------------

RULE 1: DIRECT EXTRACTION
- Identify specific week in scheme of work
- Extract: Strand, Sub-strand, Learning Outcomes
- Use same Key Inquiry Questions
- Expand Learning Experiences into detailed activities
- Include all listed resources

RULE 2: TIME BREAKDOWN
For a 40-minute lesson (Grade 1-3):
- Introduction: 5 minutes
- Main Activity: 30 minutes
- Conclusion: 5 minutes

For a 60-minute lesson (Grade 4-6):
- Introduction: 8 minutes
- Main Activity: 45 minutes
- Conclusion: 7 minutes

For an 80-minute lesson (Junior Secondary):
- Introduction: 10 minutes
- Main Activity: 60 minutes
- Conclusion: 10 minutes

RULE 3: ACTIVITY DETAIL LEVEL
- Break down each activity into specific steps
- Include teacher dialogue examples
- Specify grouping (individual/pairs/groups/whole class)
- State exact instructions for learners
- Include time allocation per activity

Example (WRONG):
"Learners practice addition"

Example (CORRECT):
"Activity 1: Concrete Addition (12 minutes)
1. Teacher distributes 10 counters to each learner
2. Teacher says: 'Take 3 counters in your left hand'
3. Teacher says: 'Now take 2 more counters in your right hand'
4. Teacher asks: 'How many counters do you have altogether?'
5. Learners count and respond chorally
6. Repeat with different numbers (4+1, 2+3, 5+2)
7. Individual assessment: Each learner solves 3+4 with counters"

RULE 4: DIFFERENTIATION (MANDATORY)
Every lesson must include differentiation for:

- LEARNERS WHO NEED SUPPORT
  Example: "Provide number line, use smaller numbers (1-5)"
  
- AVERAGE LEARNERS
  Example: "Standard activity with numbers 1-10"
  
- ADVANCED LEARNERS
  Example: "Challenge with larger numbers (10-20), word problems"

RULE 5: CBC ASSESSMENT RUBRIC
Every lesson must include 4-level rubric:

Exceeding Expectations: [Specific observable behavior]
Meeting Expectations: [Specific observable behavior]
Approaching Expectations: [Specific observable behavior]
Below Expectations: [Specific observable behavior]

Example for "Identifying sounds" (Grade 1):
- Exceeding: Identifies all sounds correctly AND can produce them
- Meeting: Identifies 4-5 sounds correctly
- Approaching: Identifies 2-3 sounds with prompting
- Below: Identifies 0-1 sounds even with support

RULE 6: CORE COMPETENCIES TAGGING
Identify which of the 7 competencies are developed in the lesson
Explain HOW each tagged competency is developed

Example:
"Communication: Developed through pair discussions and oral responses
 Critical Thinking: Developed through solving word problems
 Collaboration: Developed through group counting activities"


3.3 LESSON PLAN TEMPLATE STRUCTURE
------------------------------------

```
LESSON PLAN

School: _______________________        Date: ___________
Grade: ________                        Duration: _______ minutes
Subject: ___________________           No. of Learners: _______
Teacher: ___________________

STRAND: _________________________________
SUB-STRAND: _____________________________

SPECIFIC LEARNING OUTCOMES:
By the end of the lesson, the learner should be able to:
1. ___________________________________________
2. ___________________________________________

KEY INQUIRY QUESTION(S):
1. ___________________________________________
2. ___________________________________________

LEARNING RESOURCES:
- _______________
- _______________
- _______________

CORE COMPETENCIES:
□ Communication and Collaboration - [How developed]
□ Critical Thinking - [How developed]
□ Creativity and Imagination - [How developed]

VALUES:
□ Respect - [How demonstrated]
□ Unity - [How demonstrated]

---

INTRODUCTION (_____ minutes)

RECAP OF PREVIOUS LESSON:
[Brief review connecting to today's topic]

CONNECTION TO LEARNERS' LIVES:
[Real-world relevance - make it relatable]

SHARING LEARNING INTENTIONS:
"Today we will learn to _________________"

SUCCESS CRITERIA:
"You will know you have succeeded when you can _______________"

---

MAIN ACTIVITY (_____ minutes)

ACTIVITY 1: [Name] (_____ minutes) - [Whole Class/Groups/Pairs/Individual]

Teacher Actions:
1. [Specific step-by-step instructions]
2. [Include questions to ask]
3. [Demonstration details]

Learner Actions:
1. [What learners do]
2. [Expected responses]

Formative Assessment:
[Quick check - observation/questioning]

---

ACTIVITY 2: [Name] (_____ minutes) - [Grouping]

[Same detailed structure as Activity 1]

---

DIFFERENTIATION:

Learners needing support:
[Specific strategies and modifications]

Average learners:
[Standard activity level]

Advanced learners:
[Extension activities and challenges]

---

CONCLUSION (_____ minutes)

SUMMARY:
[Key points to recap - use learner responses]

ASSESSMENT OF LEARNING:
[Quick check activity or questions to verify understanding]

EXIT TICKET:
[One quick task/question every learner completes before leaving]

PREVIEW OF NEXT LESSON:
"In our next lesson, we will ___________________"

HOMEWORK/EXTENSION:
[Optional task for practice or preparation]

---

ASSESSMENT RUBRIC:

Exceeding Expectations:
[Observable behaviors indicating mastery beyond expected level]

Meeting Expectations:
[Observable behaviors indicating achievement of learning outcomes]

Approaching Expectations:
[Observable behaviors indicating partial achievement with support]

Below Expectations:
[Observable behaviors indicating significant support needed]

---

REFLECTION (To be completed after lesson):

What worked well:


What needs improvement:


Learner engagement level: □ High  □ Medium  □ Low

Follow-up actions needed:


Notes on individual learners:

```


3.4 VALIDATION CHECKLIST FOR LESSON PLANS
-------------------------------------------

□ Learning outcomes match scheme of work
□ Time allocations add up to total lesson duration
□ Introduction is 10-15% of time
□ Main activity is 70-80% of time
□ Conclusion is 10-15% of time
□ At least 2-3 distinct activities in main section
□ Differentiation included for all learner levels
□ Assessment rubric has all 4 CBC levels
□ Core competencies identified and explained
□ Resources are specific and realistic
□ Activities are age-appropriate
□ Teacher and learner actions are clear
□ Formative assessment checkpoints included
□ Success criteria are measurable
□ Inquiry questions are open-ended
□ Language is clear and professional


3.5 AI PROMPT TEMPLATE FOR LESSON PLAN GENERATION
---------------------------------------------------

```
You are an expert KICD-trained teacher. Generate a detailed lesson plan.

INPUT DATA:
- Scheme of Work Week: {week_number}
- Strand: {strand_name}
- Sub-strand: {sub_strand_name}
- Learning Outcomes: {outcomes_from_scheme}
- Key Inquiry Questions: {questions_from_scheme}
- Learning Experiences: {activities_from_scheme}
- Resources: {resources_from_scheme}
- Grade Level: {grade}
- Subject: {subject}
- Lesson Duration: {duration_minutes} minutes
- Number of Learners: {learner_count}

MANDATORY REQUIREMENTS:
1. Follow the 3-part lesson structure (Introduction/Main/Conclusion)
2. Break down time as: 10-15% intro, 70-80% main, 10-15% conclusion
3. Expand scheme activities into step-by-step detailed activities
4. Include specific teacher dialogue and questions
5. Specify groupings for each activity
6. Include differentiation for 3 levels: support/average/advanced
7. Create 4-level CBC assessment rubric with observable behaviors
8. Tag core competencies and explain how they're developed
9. Include formative assessment checkpoints
10. Make activities age-appropriate for Grade {grade}
11. Include an exit ticket or final check
12. Ensure all resources from scheme are utilized

TIME ALLOCATION EXAMPLE (for {duration_minutes} minute lesson):
- Introduction: {duration * 0.12} minutes
- Main Activity: {duration * 0.75} minutes
- Conclusion: {duration * 0.13} minutes

ACTIVITY DETAIL REQUIREMENT:
Each activity must include:
- Activity name and duration
- Grouping (whole class/groups/pairs/individual)
- Step-by-step teacher actions with dialogue examples
- Step-by-step learner actions with expected responses
- Materials used
- Formative assessment checkpoint

DIFFERENTIATION REQUIREMENT:
Provide specific modifications for:
- Learners who need extra support (concrete examples, scaffolding)
- Average learners (standard activity)
- Advanced learners (extension, higher-order thinking)

OUTPUT FORMAT:
Follow the exact lesson plan template structure provided.

Generate the complete lesson plan now.
```


================================================================================
SECTION 4: LESSON NOTES GENERATION RULES
================================================================================

4.1 WHAT ARE LESSON NOTES?
---------------------------

Lesson notes are the TEACHER'S DETAILED GUIDE for delivering the lesson.
They are more detailed than the lesson plan and include:
- Expanded explanations of concepts
- Examples and illustrations
- Common misconceptions to address
- Question prompts and expected answers
- Detailed marking guides
- Student worksheet templates
- Additional practice materials

Think of it as: Lesson Plan = What to teach, Lesson Notes = How to teach it


4.2 MANDATORY COMPONENTS
-------------------------

1. CONCEPT EXPLANATION SECTION
   □ Detailed breakdown of the concept
   □ Multiple examples
   □ Step-by-step procedures
   □ Visual aids descriptions
   □ Demonstrations outline

2. TEACHING POINTS
   □ Key points to emphasize
   □ Common student errors
   □ Misconceptions to address
   □ Memory aids/mnemonics
   □ Connections to previous learning

3. QUESTIONING GUIDE
   □ Starter questions (recall)
   □ Main questions (understanding/application)
   □ Extension questions (analysis/evaluation)
   □ Expected answers
   □ Follow-up questions based on responses

4. ACTIVITY MATERIALS
   □ Worksheets (with answers)
   □ Practice exercises
   □ Group task cards
   □ Assessment items
   □ Homework assignments

5. ASSESSMENT GUIDANCE
   □ Detailed marking scheme
   □ Sample student work (good/average/needs support)
   □ Intervention strategies
   □ Enrichment activities


4.3 GENERATION RULES FROM LESSON PLAN
---------------------------------------

RULE 1: EXPAND EVERY ACTIVITY
For each activity in lesson plan, provide:
- Detailed concept explanation
- 3-5 worked examples
- Anticipated student questions and answers
- Alternative explanations if students don't understand

RULE 2: QUESTIONING DEPTH
Expand simple lesson plan questions into full questioning sequences

Lesson Plan says: "Ask learners to identify sounds"

Lesson Notes expands to:
```
QUESTIONING SEQUENCE:

Initial Question: "What sounds can you hear in the word 'cat'?"
- Expected answer: /k/ /a/ /t/
- If correct: "Excellent! Let's try another word"
- If incorrect: "Let's say the word slowly together: c-a-t"

Follow-up: "Which sound comes first?"
- Expected answer: /k/
- Reinforce: "Yes, the /k/ sound. Show me how your mouth looks when you say /k/"

Challenge Question: "Can you think of another word that starts with /k/?"
- Possible answers: kite, key, king
- Extension: "Great! Can you use that word in a sentence?"
```

RULE 3: WORKED EXAMPLES
For every concept, provide:
- At least 3 worked examples at different difficulty levels
- Think-aloud commentary (teacher's thought process)
- Common mistakes to avoid

Example - Teaching Addition:
```
WORKED EXAMPLE 1 (Simple): 3 + 2 = ?

Teacher says: "I have 3 apples [show 3 counters]. 
My friend gives me 2 more [add 2 counters].
Now I count all: 1, 2, 3, 4, 5.
So 3 + 2 = 5"

WORKED EXAMPLE 2 (Medium): 7 + 4 = ?

Teacher says: "This is a bigger number. I can use my fingers.
I start with 7 in my head [point to head].
Then count on: 8 [one finger], 9 [two fingers], 10 [three fingers], 11 [four fingers].
So 7 + 4 = 11"

WORKED EXAMPLE 3 (Challenge): 8 + 5 = ?

Teacher says: "Here's a trick! I can break 5 into 2 + 3.
First: 8 + 2 = 10 (I make ten!)
Then: 10 + 3 = 13
So 8 + 5 = 13"
```

RULE 4: MISCONCEPTIONS LIBRARY
Include common errors and corrections

Example - Teaching Plural Forms:
```
COMMON MISCONCEPTIONS:

Misconception 1: Adding 's' to all words
Wrong: "I have two childs"
Correction: "The word 'child' is special. It becomes 'children', not 'childs'"
Practice: child→children, man→men, woman→women

Misconception 2: Pronouncing silent letters
Wrong: Saying the 'k' in 'knife'
Correction: "Some letters are shy! They don't make a sound. 
The 'k' in 'knife' is silent. We say 'nife' not 'k-nife'"
Practice: knife, know, knee, knock
```

RULE 5: DIFFERENTIATION MATERIALS
Create actual worksheets/materials for each level

For Average Learners:
[Worksheet with 10 standard problems]

For Learners Needing Support:
[Worksheet with 5 problems, visual aids, sentence frames]

For Advanced Learners:
[Worksheet with 5 challenging problems, word problems, extensions]


4.4 LESSON NOTES TEMPLATE STRUCTURE
-------------------------------------

```
LESSON NOTES

School: _____________________    Grade: _______
Subject: ____________________    Date: _________
Strand: ____________________     Duration: ______
Sub-strand: _________________

Teacher: _____________________

---

CONCEPT OVERVIEW
----------------

What learners need to know:
[Detailed explanation of the concept in teacher-friendly language]

Why this is important:
[Connection to curriculum progression and real life]

Prerequisites:
[What learners should already know before this lesson]

---

DETAILED TEACHING SEQUENCE
---------------------------

INTRODUCTION (_____ minutes)

Recap Activity:
[Specific questions or activity to review previous lesson]

Sample Questions:
Q1: [Question]
   Expected Answer: [Answer]
   If struggling: [Scaffolding prompt]

Q2: [Question]
   Expected Answer: [Answer]
   Follow-up: [Extension question]

Connection to Life:
[Story, scenario, or example from learner's daily experience]

Learning Intention Sharing:
"Today we are learning to [outcome]. This will help you [real-world application]"

Success Criteria:
"You will be successful when you can [measurable criteria]"

---

MAIN ACTIVITIES

ACTIVITY 1: [Name] (_____ minutes)

Concept Explanation:
[Step-by-step breakdown of the concept]

Worked Examples:

Example 1 (Basic):
Problem: [Problem]
Solution: [Step-by-step with think-aloud]

Example 2 (Medium):
Problem: [Problem]
Solution: [Step-by-step with think-aloud]

Example 3 (Advanced):
Problem: [Problem]
Solution: [Step-by-step with think-aloud]

Guided Practice:
[3-4 problems to solve together with class]

Problem 1: [Problem]
Guide: [Questions to ask, prompts to give]
Answer: [Correct answer with explanation]

Independent/Group Practice:
[Instructions for learner activity]

Questions to Circulate and Ask:
1. [Question to check understanding]
2. [Question to extend thinking]
3. [Question to identify misconceptions]

Common Errors to Watch For:
❌ Error 1: [Common mistake]
   ✓ Correction: [How to address it]
❌ Error 2: [Common mistake]
   ✓ Correction: [How to address it]

---

ACTIVITY 2: [Name] (_____ minutes)

[Same detailed structure as Activity 1]

---

DIFFERENTIATION MATERIALS

FOR LEARNERS NEEDING SUPPORT:

Strategy 1: [Specific support strategy]
Example: Use manipulatives, provide sentence starters

Adapted Worksheet:
[Actual worksheet content with scaffolding]

Questions for These Learners:
[Simpler, more guided questions]

---

FOR AVERAGE LEARNERS:

Standard Worksheet:
[Worksheet at expected level]

Questions:
[Standard level questions]

---

FOR ADVANCED LEARNERS:

Extension Activities:
[Challenging tasks]

Challenge Worksheet:
[Advanced problems, word problems, applications]

Enrichment Questions:
[Higher-order thinking questions]

---

CONCLUSION (_____ minutes)

Summary Questions:
Q: "What did we learn today?"
Expected: [Key concepts in learner language]

Q: "Why is this important?"
Expected: [Real-world application]

Q: "Can someone explain [concept] to a friend?"
Expected: [Peer teaching opportunity]

Exit Ticket:
[Specific task every learner completes]

Example:
"On your mini whiteboard, solve: 6 + 7 = ?"
Rubric: 
- Correct answer with working = Exceeding
- Correct answer = Meeting
- Attempted with errors = Approaching
- Blank or way off = Below

Preview Next Lesson:
"Tomorrow we will learn about [topic]. To prepare, you can [optional prep]"

Homework:
[Specific assignment with clear instructions]

---

ASSESSMENT TOOLS

OBSERVATION CHECKLIST:

During lesson, observe and note:

Learner Name | Participation | Understanding | Support Needed | Notes
─────────────┼──────────────┼───────────────┼────────────────┼──────
[Name]       | ☐ High       | ☐ Exceeding   | ☐ None         | 
             | ☐ Medium     | ☐ Meeting     | ☐ Some         |
             | ☐ Low        | ☐ Approaching | ☐ Significant  |
             |              | ☐ Below       |                |

MARKING GUIDE FOR CLASSWORK:

Question/Task | Marks | What to Look For
──────────────┼───────┼─────────────────────────────────────
Q1            |  2    | ✓ Correct answer (1 mark)
              |       | ✓ Correct working shown (1 mark)
Q2            |  3    | ✓ Identified the problem (1 mark)
              |       | ✓ Correct method (1 mark)
              |       | ✓ Correct answer (1 mark)

SAMPLE STUDENT WORK:

Exceeding Expectations Example:
[Show what exceeding work looks like - annotated]

Meeting Expectations Example:
[Show what meeting work looks like - annotated]

Approaching Expectations Example:
[Show what approaching work looks like - annotated]
[Note common errors and how to address them]

Below Expectations Example:
[Show what below work looks like - annotated]
[Note intervention needed]

---

INTERVENTION STRATEGIES

For learners who didn't grasp the concept:

Strategy 1: [Specific intervention]
Example: "Re-teach using concrete materials in small group"

Strategy 2: [Alternative approach]
Example: "Use visual aids and graphic organizers"

Strategy 3: [Peer support]
Example: "Pair with a buddy who can explain in simpler terms"

---

ENRICHMENT RESOURCES

For fast finishers or advanced learners:

Activity 1: [Extension task]
Activity 2: [Real-world application project]
Activity 3: [Creative challenge]

---

REFLECTION PROMPTS (Post-Lesson)

□ Did learners achieve the learning outcomes? Evidence:

□ Which activities were most effective? Why?

□ Which learners need follow-up support?

□ What would I change next time?

□ What resources do I need to prepare better?

□ Time management - Did I stick to the plan?

□ Unexpected issues that arose:

□ Positive surprises:
```


4.5 VALIDATION CHECKLIST FOR LESSON NOTES
-------------------------------------------

□ All lesson plan activities are expanded in detail
□ At least 3 worked examples per concept
□ Common misconceptions identified and addressed
□ Questioning sequences include expected answers
□ Differentiated materials (worksheets) are actually created
□ Marking guide is specific and detailed
□ Intervention strategies are practical and specific
□ Sample student work shown for all rubric levels
□ Observation checklist is usable
□ Resources are ready-to-use (not just listed)
□ Language is teacher-friendly and practical
□ Extensions for advanced learners are challenging
□ All potential student questions anticipated


4.6 AI PROMPT TEMPLATE FOR LESSON NOTES GENERATION
----------------------------------------------------

```
You are an experienced teacher creating detailed lesson notes for classroom delivery.

INPUT DATA:
- Lesson Plan: {full_lesson_plan_content}
- Grade Level: {grade}
- Subject: {subject}
- Strand: {strand}
- Sub-strand: {sub_strand}
- Learning Outcomes: {outcomes}
- Activities from Lesson Plan: {activities}

MANDATORY REQUIREMENTS:

1. EXPAND EVERY ACTIVITY
   For each activity in the lesson plan:
   - Provide detailed concept explanation
   - Create 3 worked examples (basic, medium, advanced)
   - Include teacher think-aloud commentary
   - List common misconceptions and corrections
   - Provide questioning sequences with expected answers

2. CREATE ACTUAL MATERIALS
   Generate ready-to-use content:
   - Worksheets for each differentiation level (support/average/advanced)
   - Assessment items with marking schemes
   - Homework assignments
   - Exit ticket tasks

3. ANTICIPATE STUDENT RESPONSES
   For every question, include:
   - Expected correct answer
   - Common incorrect answers
   - Follow-up questions for different scenarios

4. PROVIDE PRACTICAL GUIDANCE
   - Classroom management tips
   - Time-saving strategies
   - What to do if activity finishes early
   - What to do if running out of time

5. COMMON ERRORS LIBRARY
   For the concept being taught, list:
   - At least 5 common student errors
   - Why students make each error
   - How to correct each error
   - Practice to prevent each error

6. OBSERVATION TOOLS
   Create:
   - Observation checklist for formative assessment
   - Detailed marking guide with point allocation
   - Sample student work for all 4 rubric levels (with annotations)

7. INTERVENTION & ENRICHMENT
   Provide:
   - 3 specific intervention strategies for struggling learners
   - 3 enrichment activities for advanced learners
   - Peer support pairing suggestions

OUTPUT FORMAT:
Follow the detailed lesson notes template structure.
Make everything READY TO USE - teacher should be able to print and teach.

AGE APPROPRIATENESS:
Ensure all language, examples, and activities are suitable for Grade {grade}.

Generate the complete lesson notes now.
```


================================================================================
SECTION 5: ASSESSMENT GENERATION RULES
================================================================================

5.1 ASSESSMENT TYPES & RULES
------------------------------

CBC recognizes 3 main assessment types:

1. FORMATIVE ASSESSMENT (Ongoing)
   Purpose: Monitor learning progress
   Frequency: Daily/Weekly
   Methods: Observation, questioning, quizzes, exit tickets
   
2. SUMMATIVE ASSESSMENT (End of topic/strand)
   Purpose: Evaluate learning achievement
   Frequency: End of strand/term
   Methods: Tests, projects, presentations
   
3. DIAGNOSTIC ASSESSMENT (Pre-instruction)
   Purpose: Identify learner readiness
   Frequency: Beginning of topic
   Methods: Pre-tests, KWL charts, discussions


5.2 QUESTION GENERATION RULES
-------------------------------

RULE 1: BLOOM'S TAXONOMY DISTRIBUTION

For balanced assessment, use this distribution:

Grade 1-3:
- Remember: 40%
- Understand: 35%
- Apply: 20%
- Analyze: 5%

Grade 4-6:
- Remember: 25%
- Understand: 30%
- Apply: 25%
- Analyze: 15%
- Evaluate: 5%

Grade 7-9:
- Remember: 15%
- Understand: 20%
- Apply: 25%
- Analyze: 20%
- Evaluate: 15%
- Create: 5%

RULE 2: QUESTION TYPE MIX

Varied question types ensure comprehensive assessment:

For Lower Primary (Grade 1-3):
- Oral questions: 30%
- Practical/Hands-on: 40%
- Written (simple): 20%
- Observation-based: 10%

For Upper Primary (Grade 4-6):
- Multiple Choice: 20%
- Short Answer: 30%
- Long Answer/Essay: 20%
- Practical: 20%
- Project: 10%

For Junior Secondary (Grade 7-9):
- Multiple Choice: 15%
- Short Answer: 25%
- Essay: 25%
- Practical: 20%
- Project: 15%

RULE 3: LEARNING OUTCOME ALIGNMENT

EVERY question MUST:
- Map to a specific learning outcome
- Test what was taught (curriculum validity)
- Match the cognitive level of the outcome
- Use age-appropriate language

Example:
Learning Outcome: "Learner should be able to identify different sounds"
✓ Good Question: "Circle the word that starts with /b/ sound: cat, ball, sun"
✗ Bad Question: "Write a story using words with /b/ sound" (too advanced)

RULE 4: DIFFICULTY PROGRESSION

Arrange questions from easy to difficult:
- Start with recall/recognition
- Move to application
- End with analysis/evaluation

RULE 5: CLEAR INSTRUCTIONS

Every question section must have:
- Clear directive verbs (List, Explain, Calculate, Draw, etc.)
- Mark allocation shown
- Time suggestion (for timed assessments)
- Space provided for answer

Example:
❌ "What is photosynthesis?" (vague)
✓ "Define the term 'photosynthesis'. (2 marks)"


5.3 MARKING SCHEME RULES
--------------------------

RULE 1: DETAILED POINT ALLOCATION

For every question, specify exactly how marks are awarded

Example:
Question: "Explain the process of photosynthesis. (5 marks)"

Marking Scheme:
- Definition of photosynthesis (1 mark)
- Mention of chlorophyll/green pigment (1 mark)
- Mention of sunlight as energy source (1 mark)
- Products: glucose and oxygen (1 mark)
- Balanced chemical equation (1 mark)
OR
- Any 5 valid points about photosynthesis (1 mark each)

RULE 2: ALTERNATIVE ANSWERS

Acknowledge multiple correct approaches

Example:
Question: "Calculate: 15% of 80"

Marking Scheme:
Method 1: 15/100 × 80 = 12 (2 marks)
Method 2: 0.15 × 80 = 12 (2 marks)
Method 3: 10% = 8, 5% = 4, so 15% = 12 (2 marks)
Award full marks for any correct method with correct answer.

RULE 3: PARTIAL CREDIT

Define what earns partial marks

Example:
Question: "Solve for x: 2x + 5 = 13" (3 marks)

Marking Scheme:
- Correct working: 2x = 13 - 5 (1 mark)
- Simplification: 2x = 8 (1 mark)
- Final answer: x = 4 (1 mark)
- Correct answer without working: (2 marks only)
- Wrong answer but correct method: (2 marks)


5.4 ASSESSMENT PAPER STRUCTURE
--------------------------------

STANDARD FORMAT FOR CBC ASSESSMENTS:

```
[SCHOOL LETTERHEAD/NAME]

GRADE: _______          SUBJECT: ____________
ASSESSMENT TYPE: ___________   TERM: ________
DATE: __________         TIME: _______ minutes
TOTAL MARKS: _______

LEARNER'S NAME: _______________________


INSTRUCTIONS TO LEARNERS:
1. Write your name in the space provided
2. Read all questions carefully
3. Answer all questions in the spaces provided
4. All working must be shown clearly
5. Ensure your work is neat and legible

───────────────────────────────────────────────────────────

SECTION A: [Question Type] (_____ marks)
[Clear instructions for this section]

Question 1: [Question text]                          (__ marks)
[Answer space]

Question 2: [Question text]                          (__ marks)
[Answer space]

───────────────────────────────────────────────────────────

SECTION B: [Question Type] (_____ marks)
[Clear instructions for this section]

[Questions continue]

───────────────────────────────────────────────────────────

END OF ASSESSMENT

MARKING SUMMARY (For teacher use):

Section A: _______ / _______
Section B: _______ / _______
Section C: _______ / _______

TOTAL:    _______ / _______

PERCENTAGE: _______  %

GRADE: ________

TEACHER'S SIGNATURE: ____________  DATE: _______
```


5.5 STRAND-BASED ASSESSMENT RULES
-----------------------------------

RULE 1: SINGLE-STRAND ASSESSMENT

When assessing one strand:
- Cover all sub-strands proportionally
- Test all learning outcomes in the strand
- Question distribution matches sub-strand weighting

Example: English Grade 3, Strand "Reading" (50 marks, 60 mins)

Sub-strand 1: Pre-reading Skills (30% of strand)
- Questions 1-5: 15 marks

Sub-strand 2: Reading Skills (40% of strand)
- Questions 6-11: 20 marks

Sub-strand 3: Reading Comprehension (30% of strand)
- Questions 12-16: 15 marks

RULE 2: MULTI-STRAND ASSESSMENT

When assessing multiple strands:
- Weight each strand according to curriculum emphasis
- Ensure all strands from the period are represented
- Balance question types across strands

Example: Mathematics Grade 5 End of Term (100 marks, 120 mins)

Strand 1: Numbers (35% as per curriculum)
- Questions 1-15: 35 marks

Strand 2: Measurement (25%)
- Questions 16-25: 25 marks

Strand 3: Geometry (20%)
- Questions 26-32: 20 marks

Strand 4: Data Handling (20%)
- Questions 33-40: 20 marks


5.6 CBC ASSESSMENT RUBRIC GENERATION
--------------------------------------

For project-based and performance tasks, create detailed rubrics:

```
ASSESSMENT RUBRIC FOR: [Task Name]

Criteria: [Criterion 1]

Exceeding Expectations (4):
[Specific, observable descriptors]

Meeting Expectations (3):
[Specific, observable descriptors]

Approaching Expectations (2):
[Specific, observable descriptors]

Below Expectations (1):
[Specific, observable descriptors]

---

Criteria: [Criterion 2]

[Same 4-level structure]

---

TOTAL SCORE: _____ / _____ (sum of all criteria scores)

OVERALL PERFORMANCE LEVEL:
Exceeding: Total score = 90-100%
Meeting: Total score = 70-89%
Approaching: Total score = 50-69%
Below: Total score = Below 50%
```

Example - Oral Presentation Rubric (Grade 6):

Criteria: Content Knowledge

Exceeding (4): Demonstrates deep understanding, provides detailed 
explanations beyond required, uses subject-specific vocabulary correctly, 
makes connections to other concepts.

Meeting (3): Demonstrates good understanding, covers all required points, 
uses most subject vocabulary correctly.

Approaching (2): Demonstrates basic understanding, covers most required 
points with some prompting, uses simple vocabulary.

Below (1): Demonstrates limited understanding, covers few points even with 
support, struggles with vocabulary.


5.7 AI PROMPT TEMPLATE FOR ASSESSMENT GENERATION
--------------------------------------------------

```
You are an expert assessment designer following KICD CBC guidelines.

INPUT DATA:
- Grade Level: {grade}
- Subject: {subject}
- Assessment Type: {formative/summative/diagnostic}
- Strand(s): {strand_names}
- Sub-strands: {sub_strand_names}
- Learning Outcomes to Assess: {outcomes}
- Total Marks: {total_marks}
- Duration: {duration_minutes} minutes
- Difficulty Distribution: {easy/medium/hard percentages}
- Bloom's Distribution: {bloom_percentages}

MANDATORY REQUIREMENTS:

1. QUESTION GENERATION
   - Generate questions covering ALL specified learning outcomes
   - Follow Bloom's taxonomy distribution for Grade {grade}
   - Use appropriate question type mix for Grade {grade}
   - Ensure difficulty progression (easy → medium → hard)
   - Make all instructions crystal clear
   - Show mark allocation for each question
   - Provide adequate answer space

2. STRAND COVERAGE
   - Distribute marks proportionally across strands
   - If single strand: cover all sub-strands
   - If multi-strand: weight as per curriculum emphasis

3. QUESTION QUALITY
   - Age-appropriate language for Grade {grade}
   - Clear directive verbs (list, explain, calculate, draw)
   - No ambiguous wording
   - Culturally relevant contexts (Kenyan examples)
   - Avoid gender/regional bias

4. MARKING SCHEME
   - Detailed point allocation for every question
   - Accept alternative correct methods
   - Specify partial credit criteria
   - Provide sample answers where applicable
   - Include common errors to watch for

5. ASSESSMENT PAPER FORMAT
   - Professional header with school name field
   - Clear learner instructions
   - Organized sections
   - Adequate spacing
   - Marking summary box

6. RUBRIC (if performance/project assessment)
   - Create 4-level CBC rubric
   - Specific observable descriptors for each level
   - Clear criteria (3-5 criteria)
   - Aligned to learning outcomes

BLOOM'S TAXONOMY KEYWORDS BY LEVEL:
- Remember: List, Name, Identify, State, Define, Label
- Understand: Explain, Describe, Summarize, Give examples
- Apply: Calculate, Solve, Demonstrate, Use, Apply
- Analyze: Compare, Contrast, Categorize, Examine, Analyze
- Evaluate: Justify, Assess, Critique, Judge, Evaluate
- Create: Design, Construct, Create, Develop, Formulate

QUALITY CHECKS:
□ All learning outcomes assessed
□ Appropriate distribution of cognitive levels
□ Questions progress from easy to difficult
□ Instructions are clear
□ Marking scheme is detailed and fair
□ Time allocation is realistic
□ Assessment is valid (tests what was taught)
□ Assessment is reliable (consistent results)

Generate the complete assessment paper with marking scheme now.
```


================================================================================
SECTION 6: IMPLEMENTATION IN THE PLATFORM
================================================================================

6.1 STORAGE OF GENERATION RULES
---------------------------------

Option 1: Store as System Prompts in Database

generation_rules
├── id
├── rule_type (scheme/lesson_plan/lesson_notes/assessment)
├── grade_range (1-3, 4-6, 7-9)
├── subject_specific (boolean)
├── subject (if specific)
├── rule_content (full prompt template)
├── validation_checklist (JSON)
├── version
└── last_updated

Option 2: Configuration Files
Store as JSON/YAML templates in codebase

Option 3: Hybrid Approach (Recommended)
- Core rules in codebase (version controlled)
- School-specific adaptations in database
- User preferences layer


6.2 RULE APPLICATION WORKFLOW
-------------------------------

USER REQUEST:
"Generate scheme of work for Grade 3 English Term 1"

SYSTEM WORKFLOW:

1. RETRIEVE BASE RULES
   - Fetch scheme generation rules
   - Load Grade 3 specific modifications
   - Load English subject requirements

2. GATHER CONTEXT
   - Fetch curriculum design (vectorized chunks)
   - Retrieve term dates from school calendar
   - Get teacher preferences (if any)
   - Load previous scheme (if updating)

3. CONSTRUCT PROMPT
   Base Prompt +
   Grade-specific rules +
   Subject-specific rules +
   Curriculum content +
   School context +
   User preferences
   = Final Generation Prompt

4. GENERATE WITH AI
   - Send to OpenAI API
   - Include validation rules in system prompt
   - Request structured JSON output

5. VALIDATE OUTPUT
   Run generated content through validation checklist:
   □ All mandatory components present
   □ Format matches template
   □ Content aligns with curriculum
   □ Time allocations realistic
   □ Etc.

6. HUMAN REVIEW OPTION
   - Show generated content to user
   - Highlight any validation warnings
   - Allow editing before saving
   - Option to regenerate with modifications

7. SAVE AS TEMPLATE
   - Store in master templates (if verified)
   - Or save as personal version (if customized)


6.3 VALIDATION ENGINE
-----------------------

content_validator_service
├── validate_scheme_of_work()
├── validate_lesson_plan()
├── validate_lesson_notes()
├── validate_assessment()
└── validate_against_curriculum()

VALIDATION FUNCTIONS:

```python
def validate_scheme_of_work(scheme_data, curriculum_data):
    """
    Validates generated scheme against rules and curriculum
    Returns: (is_valid: bool, warnings: list, errors: list)
    """
    warnings = []
    errors = []
    
    # Check mandatory components
    if not scheme_data.get('header'):
        errors.append("Missing header information")
    
    # Validate strand coverage
    curriculum_strands = set(curriculum_data['strands'])
    scheme_strands = set([week['strand'] for week in scheme_data['weeks']])
    
    missing_strands = curriculum_strands - scheme_strands
    if missing_strands:
        errors.append(f"Missing strands: {missing_strands}")
    
    # Validate time allocation
    total_lessons = calculate_available_lessons(scheme_data)
    allocated_lessons = sum([week.get('lessons', 0) for week in scheme_data['weeks']])
    
    if allocated_lessons > total_lessons * 1.1:  # 10% tolerance
        warnings.append(f"Over-allocated: {allocated_lessons} lessons planned, only {total_lessons} available")
    
    # Validate learning outcomes coverage
    curriculum_outcomes = set(curriculum_data['learning_outcomes'])
    scheme_outcomes = set()
    for week in scheme_data['weeks']:
        scheme_outcomes.update(week.get('learning_outcomes', []))
    
    missing_outcomes = curriculum_outcomes - scheme_outcomes
    if len(missing_outcomes) > 0:
        errors.append(f"Missing {len(missing_outcomes)} learning outcomes from curriculum")
    
    # Check core competencies
    competency_count = count_competencies(scheme_data)
    if any(count < 2 for count in competency_count.values()):
        warnings.append("Some core competencies underrepresented")
    
    is_valid = len(errors) == 0
    return is_valid, warnings, errors
```


6.4 CONTINUOUS IMPROVEMENT OF RULES
-------------------------------------

FEEDBACK LOOP:

1. TRACK GENERATION SUCCESS
   - Which generations needed heavy editing?
   - What validation errors occur most?
   - User satisfaction ratings

generation_analytics
├── generation_id
├── content_type
├── validation_errors (JSON)
├── user_edits_made (count)
├── user_rating (1-5)
├── time_to_finalize (minutes)
└── reported_issues (JSON)

2. IDENTIFY RULE GAPS
   - If many users edit the same section → rule is inadequate
   - If validation catches same error repeatedly → strengthen rule
   - If users rate low → review prompt quality

3. UPDATE RULES
   - Version control for rule changes
   - A/B test new vs old rules
   - Gradual rollout of improvements

4. EXPERT REVIEW CYCLE
   - Quarterly review by education experts
   - Align with any KICD curriculum updates
   - Incorporate teacher feedback


================================================================================
SECTION 7: EXAMPLE COMPLETE FLOW
================================================================================

USER ACTION:
Teacher clicks "Generate Scheme of Work"
Selects: Grade 4, Mathematics, Term 2

SYSTEM EXECUTION:

STEP 1: Load Rules
```python
rules = get_generation_rules(
    content_type='scheme_of_work',
    grade=4,
    subject='Mathematics'
)
```

STEP 2: Retrieve Curriculum
```python
curriculum = get_curriculum_design(
    grade=4,
    subject='Mathematics',
    term=2
)
# Returns: Full PDF content + vectorized chunks
```

STEP 3: Get School Context
```python
school_context = {
    'term_start': '2024-05-06',
    'term_end': '2024-08-09',
    'holidays': ['2024-06-10 to 2024-06-14'],  # Mid-term
    'lessons_per_week': 5,
    'lesson_duration': 60
}
```

STEP 4: Construct AI Prompt
```python
prompt = f"""
{rules.system_prompt}

CURRICULUM CONTENT:
{curriculum.full_text}

SCHOOL CONTEXT:
- Term: {school_context.term_start} to {school_context.term_end}
- Holidays: {school_context.holidays}
- Lessons/week: {school_context.lessons_per_week}
- Duration: {school_context.lesson_duration} minutes

REQUIREMENTS:
{rules.mandatory_requirements}

VALIDATION CRITERIA:
{rules.validation_checklist}

OUTPUT FORMAT:
Return as structured JSON following this schema:
{rules.output_schema}
"""
```

STEP 5: Generate
```python
response = openai.ChatCompletion.create(
    model="gpt-4-turbo",
    messages=[
        {"role": "system", "content": rules.system_prompt},
        {"role": "user", "content": prompt}
    ],
    response_format={"type": "json_object"}
)

generated_scheme = json.loads(response.choices[0].message.content)
```

STEP 6: Validate
```python
is_valid, warnings, errors = validate_scheme_of_work(
    scheme_data=generated_scheme,
    curriculum_data=curriculum
)

if not is_valid:
    # Show errors to user, offer to regenerate
    return {
        'status': 'validation_failed',
        'errors': errors,
        'warnings': warnings,
        'generated_content': generated_scheme
    }
```

STEP 7: Present to User
```python
# Show in editable interface
# Highlight warnings (if any)
# Allow customization
# Offer to save or regenerate
```

STEP 8: Save
```python
if user_approves:
    save_scheme_of_work(
        teacher_id=current_user.id,
        scheme_data=generated_scheme,
        is_master_template=False,  # Personal version
        share_level='private'
    )
```


================================================================================
SECTION 8: QUALITY ASSURANCE CHECKLIST
================================================================================

BEFORE LAUNCH, ENSURE:

□ All generation rules documented
□ Validation functions implemented
□ Rules version controlled
□ Expert educators reviewed rules
□ Sample outputs tested against real curricula
□ Validation catches common errors
□ Generation time is acceptable (<30 seconds)
□ User can easily edit generated content
□ Regeneration option available
□ Feedback mechanism in place
□ Analytics tracking set up
□ Rules can be updated without code deploy
□ Multi-grade/subject rules tested
□ Edge cases handled (missing data, malformed curriculum)
□ Error messages are helpful, not technical


================================================================================
FINAL RECOMMENDATIONS
================================================================================

1. START WITH ONE CONTENT TYPE
   Perfect scheme of work generation first
   Then expand to lesson plans, notes, assessments

2. INVOLVE TEACHERS EARLY
   Beta test with real teachers
   Gather feedback on quality
   Iterate on rules based on real usage

3. BUILD RULE LIBRARY INCREMENTALLY
   Start with most common grade/subject combinations
   Grade 1-3 English, Math, Science first
   Expand based on user demand

4. VERSION CONTROL IS CRITICAL
   Track which rule version generated which content
   Allows rollback if new rules cause issues
   Enables A/B testing of improvements

5. BALANCE AI GENERATION & HUMAN TOUCH
   AI generates 80% of the work
   Teacher personalizes 20%
   Never claim "100% ready to use" - always "Review and customize"

6. COMPLIANCE OVER CREATIVITY
   KICD compliance is non-negotiable
   Stick to proven formats
   Prioritize accuracy over fanciness

7. CONTINUOUS LEARNING SYSTEM
   Every generation is a learning opportunity
   Track what works, what doesn't
   Improve rules monthly based on data


================================================================================
CONCLUSION
================================================================================

Rules and guidelines are the FOUNDATION of quality AI-generated educational content.

Without them: Chaos, inconsistency, non-compliance
With them: Reliable, standards-aligned, professional outputs

These rules transform your platform from:
"AI that generates random lesson plans" 
to
"KICD-compliant professional development tool trusted by teachers"

The time invested in crafting and maintaining these rules will determine the 
success and adoption of your platform.

Make them comprehensive. Make them clear. Make them enforceable.

Your teachers and their learners are counting on it.