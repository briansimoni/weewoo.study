#!/usr/bin/env -S deno run --allow-net --allow-read --allow-write --allow-env

import { OpenAIClient, readJsonFile, writeJsonFile } from "./shared/utils.ts";
import {
  EMT_CATEGORIES,
  type EMTCategory,
  GeneratedQuestion,
  SimilarityResult as _SimilarityResult,
} from "./shared/types.ts";
import { QuestionStore } from "../../lib/question_store.ts";
import { getKv } from "../../lib/kv.ts";
import "$std/dotenv/load.ts";

interface GeneratedQuestionsFile {
  generated_at: string;
  questions: GeneratedQuestion[];
  [key: string]: unknown;
}

interface Config {
  generated_questions_file: string;
  output_file: string;
  scope: "emt" | "advanced" | "medic";
  similarity_threshold: number;
}

async function main() {
  const configPath = "./config/similarity_config.json";
  let config: Config;

  try {
    config = await readJsonFile<Config>(configPath);
  } catch {
    config = {
      generated_questions_file: "./generated_questions.json",
      output_file: "./similarity_scores.json",
      scope: "emt",
      similarity_threshold: 5,
    };
    console.log("No similarity config file found, using defaults");
  }

  console.log("🔍 Starting similarity analysis...");

  // Load generated questions
  const generatedFile = await readJsonFile<GeneratedQuestionsFile>(
    config.generated_questions_file,
  );
  const generatedQuestions = generatedFile.questions;
  console.log(`📚 Loaded ${generatedQuestions.length} generated questions`);

  // Load existing questions from database
  console.log("🗄️  Loading existing questions from database...");
  const kv = await getKv();
  const questionStore = new QuestionStore(kv, config.scope);

  const existingQuestions: GeneratedQuestion[] = [];
  const existingQuestionsData = await questionStore.listQuestions();

  for (const q of existingQuestionsData) {
    // Only include questions with valid EMT categories
    if (EMT_CATEGORIES.includes(q.category as EMTCategory)) {
      existingQuestions.push({
        category: q.category as EMTCategory,
        question: q.question,
        choices: q.choices,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
      });
    } else {
      console.warn(
        `⚠️  Skipping question with invalid category: ${q.category}`,
      );
    }
  }

  console.log(
    `📚 Loaded ${existingQuestions.length} existing questions from database`,
  );

  // Initialize OpenAI client
  const client = new OpenAIClient();

  console.log("🤖 Analyzing question similarity...");

  try {
    const similarityResults = await client.checkSimilarity(
      generatedQuestions,
      existingQuestions,
    );

    console.log(
      `✅ Analyzed ${similarityResults.length} questions for similarity`,
    );

    // Generate summary statistics
    const highSimilarityCount = similarityResults.filter((r) =>
      r.max_similarity >= config.similarity_threshold
    ).length;
    const averageSimilarity = similarityResults.reduce((sum, r) =>
      sum + r.max_similarity, 0) / similarityResults.length;

    const duplicateCandidates = similarityResults.filter((r) =>
      r.max_similarity >= 8
    );
    const moderatelySimilar = similarityResults.filter((r) =>
      r.max_similarity >= 6 && r.max_similarity < 8
    );

    console.log(`📊 Similarity Analysis Summary:`);
    console.log(
      `  - Average similarity score: ${averageSimilarity.toFixed(2)}`,
    );
    console.log(
      `  - Questions above threshold (${config.similarity_threshold}): ${highSimilarityCount}`,
    );
    console.log(`  - Potential duplicates (8+): ${duplicateCandidates.length}`);
    console.log(`  - Moderately similar (6-7): ${moderatelySimilar.length}`);

    // Save results
    const output = {
      analysis_date: new Date().toISOString(),
      config: config,
      generated_questions_file: config.generated_questions_file,
      generated_questions_count: generatedQuestions.length,
      existing_questions_count: existingQuestions.length,
      summary: {
        average_similarity: averageSimilarity,
        high_similarity_count: highSimilarityCount,
        duplicate_candidates: duplicateCandidates.length,
        moderately_similar: moderatelySimilar.length,
        threshold_used: config.similarity_threshold,
      },
      similarity_results: similarityResults,
      recommendations: {
        questions_to_review: duplicateCandidates.map((r) => ({
          question_index: r.question_index,
          question_text: r.question_text.substring(0, 100) + "...",
          max_similarity: r.max_similarity,
          action: "Consider rejecting or heavily modifying",
        })),
        questions_to_modify: moderatelySimilar.map((r) => ({
          question_index: r.question_index,
          question_text: r.question_text.substring(0, 100) + "...",
          max_similarity: r.max_similarity,
          action: "Consider minor modifications",
        })),
      },
    };

    await writeJsonFile(config.output_file, output);

    console.log(
      `🎉 Similarity analysis complete! Results saved to ${config.output_file}`,
    );

    if (duplicateCandidates.length > 0) {
      console.warn(
        `⚠️  Warning: ${duplicateCandidates.length} questions may be duplicates. Review recommended.`,
      );
    }

    if (highSimilarityCount > generatedQuestions.length * 0.3) {
      console.warn(
        `⚠️  Warning: ${
          Math.round(highSimilarityCount / generatedQuestions.length * 100)
        }% of questions exceed similarity threshold. Consider generating more unique content.`,
      );
    }
  } catch (error) {
    console.error("❌ Failed to analyze similarity:", error);
    Deno.exit(1);
  } finally {
    kv.close();
  }
}

if (import.meta.main) {
  main().catch(console.error);
}
