#!/usr/bin/env -S deno run --allow-read --allow-write

import { readJsonFile, writeJsonFile } from "./shared/utils.ts";
import {
  DBQuestion,
  DBQuestionSchema,
  DifficultyResult,
  GeneratedQuestion,
  SimilarityResult,
} from "./shared/types.ts";
import { z } from "zod";
import "$std/dotenv/load.ts";

interface GeneratedQuestionsFile {
  generated_at: string;
  questions: GeneratedQuestion[];
  [key: string]: any;
}

interface SimilarityFile {
  similarity_results: SimilarityResult[];
  [key: string]: any;
}

interface DifficultyFile {
  difficulty_results: DifficultyResult[];
  [key: string]: any;
}

interface Config {
  generated_questions_file: string;
  similarity_scores_file: string;
  difficulty_scores_file: string;
  output_file: string;
  scope: "emt" | "advanced" | "medic";
  max_similarity_threshold: number;
  min_difficulty: number;
  max_difficulty: number;
  include_similarity_metadata: boolean;
  include_difficulty_metadata: boolean;
}

async function main() {
  const configPath = "./config/format_config.json";
  let config: Config;

  try {
    config = await readJsonFile<Config>(configPath);
  } catch {
    config = {
      generated_questions_file: "./generated_questions.json",
      similarity_scores_file: "./similarity_scores.json",
      difficulty_scores_file: "./difficulty_scores.json",
      output_file: "./db_ready_questions.json",
      scope: "emt",
      max_similarity_threshold: 7,
      min_difficulty: 1,
      max_difficulty: 10,
      include_similarity_metadata: true,
      include_difficulty_metadata: true,
    };
    console.log("No format config file found, using defaults");
  }

  console.log("🔄 Starting database formatting process...");

  // Load all the data files
  const generatedFile = await readJsonFile<GeneratedQuestionsFile>(
    config.generated_questions_file,
  );
  const generatedQuestions = generatedFile.questions;
  console.log(`📚 Loaded ${generatedQuestions.length} generated questions`);

  let similarityResults: SimilarityResult[] = [];
  try {
    const similarityFile = await readJsonFile<SimilarityFile>(
      config.similarity_scores_file,
    );
    similarityResults = similarityFile.similarity_results;
    console.log(
      `🔍 Loaded similarity scores for ${similarityResults.length} questions`,
    );
  } catch (error) {
    console.warn("⚠️  Could not load similarity scores:", error);
  }

  let difficultyResults: DifficultyResult[] = [];
  try {
    const difficultyFile = await readJsonFile<DifficultyFile>(
      config.difficulty_scores_file,
    );
    difficultyResults = difficultyFile.difficulty_results;
    console.log(
      `🎯 Loaded difficulty scores for ${difficultyResults.length} questions`,
    );
  } catch (error) {
    console.warn("⚠️  Could not load difficulty scores:", error);
  }

  // Create lookup maps for efficient data merging
  const similarityMap = new Map<number, SimilarityResult>();
  for (const result of similarityResults) {
    similarityMap.set(result.question_index, result);
  }

  const difficultyMap = new Map<number, DifficultyResult>();
  for (const result of difficultyResults) {
    difficultyMap.set(result.question_index, result);
  }

  console.log("🛠️  Processing and validating questions...");

  const dbReadyQuestions: DBQuestion[] = [];
  const filteredQuestions: Array<
    { question: GeneratedQuestion; index: number; reason: string }
  > = [];
  const validationErrors: Array<{ index: number; errors: string[] }> = [];

  for (let i = 0; i < generatedQuestions.length; i++) {
    const question = generatedQuestions[i];
    const similarity = similarityMap.get(i);
    const difficulty = difficultyMap.get(i);

    // Apply filtering based on similarity threshold
    if (
      similarity && similarity.max_similarity > config.max_similarity_threshold
    ) {
      filteredQuestions.push({
        question,
        index: i,
        reason:
          `High similarity score: ${similarity.max_similarity} (threshold: ${config.max_similarity_threshold})`,
      });
      continue;
    }

    // Apply difficulty filtering
    if (difficulty) {
      if (
        difficulty.difficulty_score < config.min_difficulty ||
        difficulty.difficulty_score > config.max_difficulty
      ) {
        filteredQuestions.push({
          question,
          index: i,
          reason:
            `Difficulty score ${difficulty.difficulty_score} outside range ${config.min_difficulty}-${config.max_difficulty}`,
        });
        continue;
      }
    }

    // Create the DB-ready question object with only the core question fields
    const dbQuestion: DBQuestion = {
      question: question.question,
      choices: question.choices,
      correct_answer: question.correct_answer,
      explanation: question.explanation,
      category: question.category,
    };

    // Validate the question against the schema
    try {
      const validatedQuestion = DBQuestionSchema.parse(dbQuestion);
      dbReadyQuestions.push(validatedQuestion);

      // Log metadata separately for debugging/tracking
      if (config.include_difficulty_metadata && difficulty) {
        console.log(
          `Question ${i + 1} difficulty: ${difficulty.difficulty_score}`,
        );
      }
      if (config.include_similarity_metadata && similarity) {
        console.log(
          `Question ${i + 1} max similarity: ${similarity.max_similarity}`,
        );
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        validationErrors.push({
          index: i,
          errors: error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
        });
      } else {
        validationErrors.push({
          index: i,
          errors: [String(error)],
        });
      }
    }
  }

  console.log(
    `✅ Successfully formatted ${dbReadyQuestions.length} questions for database`,
  );
  console.log(`🚫 Filtered out ${filteredQuestions.length} questions`);
  console.log(`❌ ${validationErrors.length} questions failed validation`);

  // Generate quality metrics
  const qualityMetrics = {
    total_generated: generatedQuestions.length,
    passed_filters: dbReadyQuestions.length,
    filtered_by_similarity:
      filteredQuestions.filter((f) => f.reason.includes("similarity")).length,
    filtered_by_difficulty:
      filteredQuestions.filter((f) => f.reason.includes("Difficulty")).length,
    validation_failures: validationErrors.length,
    success_rate: (dbReadyQuestions.length / generatedQuestions.length * 100)
      .toFixed(2),
    average_difficulty: difficultyResults.length > 0
      ? (difficultyResults.reduce((sum, r) => sum + r.difficulty_score, 0) /
        difficultyResults.length).toFixed(2)
      : "N/A",
    average_similarity: similarityResults.length > 0
      ? (similarityResults.reduce((sum, r) => sum + r.max_similarity, 0) /
        similarityResults.length).toFixed(2)
      : "N/A",
  };

  // Create category breakdown
  const categoryBreakdown = dbReadyQuestions.reduce((acc, question) => {
    acc[question.category] = (acc[question.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Save the final output
  const output = {
    created_at: new Date().toISOString(),
    config: config,
    source_files: {
      generated_questions: config.generated_questions_file,
      similarity_scores: config.similarity_scores_file,
      difficulty_scores: config.difficulty_scores_file,
    },
    quality_metrics: qualityMetrics,
    category_breakdown: categoryBreakdown,
    questions: dbReadyQuestions,
    metadata: {
      filtered_questions: filteredQuestions.map((f) => ({
        index: f.index,
        reason: f.reason,
        question: f.question.question.substring(0, 100) + "...",
      })),
      validation_errors: validationErrors,
    },
  };

  await writeJsonFile(config.output_file, output);

  console.log(
    `🎉 Database formatting complete! Output saved to ${config.output_file}`,
  );
  console.log(`📊 Quality Metrics:`);
  console.log(`  - Success rate: ${qualityMetrics.success_rate}%`);
  console.log(`  - Questions ready for DB: ${dbReadyQuestions.length}`);
  console.log(`  - Average difficulty: ${qualityMetrics.average_difficulty}`);
  console.log(`  - Average similarity: ${qualityMetrics.average_similarity}`);

  console.log(`📋 Category Distribution:`);
  for (const [category, count] of Object.entries(categoryBreakdown)) {
    console.log(`  - ${category}: ${count} questions`);
  }

  if (dbReadyQuestions.length < generatedQuestions.length * 0.7) {
    console.warn(
      `⚠️  Warning: Only ${qualityMetrics.success_rate}% of questions passed filtering. Consider adjusting thresholds or improving generation.`,
    );
  }

  if (validationErrors.length > 0) {
    console.warn(
      `⚠️  Warning: ${validationErrors.length} questions failed validation. Check the metadata for details.`,
    );
  }
}

if (import.meta.main) {
  main().catch(console.error);
}
