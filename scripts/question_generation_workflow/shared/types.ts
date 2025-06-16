import { z } from "zod";

// Official EMT Categories (matches admin API createQuestionSchema)
export const EMT_CATEGORIES = [
  "EMS Systems",
  "Workforce Safety and Wellness", 
  "Medical, Legal, and Ethical Issues",
  "Communications and Documentation",
  "Medical Terminology",
  "The Human Body",
  "Life Span Development",
  "Lifting and Moving Patients",
  "The Team Approach to Health Care",
  "Patient Assessment",
  "Airway Management",
  "Principles of Pharmacology",
  "Shock",
  "BLS Resuscitation",
  "Medical Overview",
  "Respiratory Emergencies",
  "Cardiovascular Emergencies",
  "Neurologic Emergencies",
  "Gastrointestinal and Urologic Emergencies",
  "Endocrine and Hematologic Emergencies",
  "Allergy and Anaphylaxis",
  "Toxicology",
  "Behavioral Health Emergencies",
  "Gynecologic Emergencies",
  "Trauma Overview",
  "Bleeding",
  "Soft-Tissue Injuries",
  "Face and Neck Injuries",
  "Head and Spine Injuries",
  "Chest Injuries",
  "Abdominal and Genitourinary Injuries",
  "Orthopaedic Injuries",
  "Environmental Emergencies",
  "Obstetrics and Neonatal Care",
  "Pediatric Emergencies",
  "Geriatric Emergencies",
  "Patients With Special Challenges",
  "Transport Operations",
  "Vehicle Extrication and Special Rescue",
  "Incident Management",
  "Terrorism Response and Disaster Management",
] as const;

export type EMTCategory = typeof EMT_CATEGORIES[number];

// Schema for generated questions (before DB formatting)
export const GeneratedQuestionSchema = z.object({
  category: z.enum(EMT_CATEGORIES),
  question: z.string(),
  choices: z.array(z.string()).min(2).max(6),
  correct_answer: z.number().min(0),
  explanation: z.string(),
  difficulty: z.number().min(1).max(10).optional(),
  similarity_score: z.number().min(1).max(10).optional(),
});

export type GeneratedQuestion = z.infer<typeof GeneratedQuestionSchema>;

// Schema for similarity results
export const SimilarityResultSchema = z.object({
  question_index: z.number(),
  question_text: z.string(),
  similar_questions: z.array(z.object({
    source: z.enum(["generated", "existing"]),
    index: z.number().optional(),
    question_id: z.string().optional(),
    question_text: z.string(),
    similarity_score: z.number().min(1).max(10),
  })),
  max_similarity: z.number().min(1).max(10),
});

export type SimilarityResult = z.infer<typeof SimilarityResultSchema>;

// Schema for difficulty results
export const DifficultyResultSchema = z.object({
  question_index: z.number(),
  question_text: z.string(),
  difficulty_score: z.number().min(1).max(10),
  reasoning: z.string(),
});

export type DifficultyResult = z.infer<typeof DifficultyResultSchema>;

// Schema for optimization results
export const OptimizationResultSchema = z.object({
  question_index: z.number(),
  original_question: z.object({
    category: z.enum(EMT_CATEGORIES),
    question: z.string(),
    choices: z.array(z.string()),
    correct_answer: z.number(),
    explanation: z.string(),
  }),
  optimized_question: z.object({
    category: z.enum(EMT_CATEGORIES),
    question: z.string(),
    choices: z.array(z.string()),
    correct_answer: z.number(),
    explanation: z.string(),
  }),
  changes_made: z.array(z.string()),
  optimization_reasoning: z.string(),
  improvement_score: z.number().min(1).max(10),
});

export type OptimizationResult = z.infer<typeof OptimizationResultSchema>;

// Final DB-ready question schema - matches QuestionStore.add input
export const DBQuestionSchema = z.object({
  question: z.string(),
  choices: z.array(z.string()).min(2).max(6),
  correct_answer: z.number().min(0),
  explanation: z.string(),
  category: z.enum(EMT_CATEGORIES),
});

export type DBQuestion = z.infer<typeof DBQuestionSchema>;
