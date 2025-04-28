// Define all possible categories for question tracking
export const CATEGORIES = [
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

// TypeScript type for category strings
export type Category = typeof CATEGORIES[number];

// Helper function to check if a string is a valid category
export function isValidCategory(category: string): category is Category {
  return CATEGORIES.includes(category as Category);
}

// Interface for category-specific stats
export interface CategoryStats {
  questions_answered: number;
  questions_correct: number;
}

// Type for storing stats by category
export type CategoryStatsMap = Record<Category, CategoryStats>;
