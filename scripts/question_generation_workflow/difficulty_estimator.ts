#!/usr/bin/env -S deno run --allow-net --allow-read --allow-write --allow-env

import { OpenAIClient, readJsonFile, writeJsonFile } from "./shared/utils.ts";
import { DifficultyResult, GeneratedQuestion } from "./shared/types.ts";
import "$std/dotenv/load.ts";

interface GeneratedQuestionsFile {
  generated_at: string;
  questions: GeneratedQuestion[];
  [key: string]: any;
}

interface Config {
  generated_questions_file: string;
  output_file: string;
  batch_size: number;
}

async function main() {
  const configPath = "./config/difficulty_config.json";
  let config: Config;

  try {
    config = await readJsonFile<Config>(configPath);
  } catch {
    config = {
      generated_questions_file: "./generated_questions.json",
      output_file: "./difficulty_scores.json",
      batch_size: 5, // Process in smaller batches to avoid token limits
    };
    console.log("No difficulty config file found, using defaults");
  }

  console.log("🎯 Starting difficulty analysis...");

  // Load generated questions
  const generatedFile = await readJsonFile<GeneratedQuestionsFile>(
    config.generated_questions_file,
  );
  const generatedQuestions = generatedFile.questions;
  console.log(`📚 Loaded ${generatedQuestions.length} generated questions`);

  // Initialize OpenAI client
  const client = new OpenAIClient();

  console.log(`🤖 Analyzing question difficulty using O3 model...`);
  console.log(`📊 Processing in batches of ${config.batch_size} questions`);

  try {
    const difficultyResults: DifficultyResult[] = [];
    const batchCount = Math.ceil(generatedQuestions.length / config.batch_size);

    for (let batchIndex = 0; batchIndex < batchCount; batchIndex++) {
      const startIndex = batchIndex * config.batch_size;
      const endIndex = Math.min(
        startIndex + config.batch_size,
        generatedQuestions.length,
      );
      const batch = generatedQuestions.slice(startIndex, endIndex);

      console.log(
        `🔄 Processing batch ${batchIndex + 1}/${batchCount} (questions ${
          startIndex + 1
        }-${endIndex})`,
      );

      // Process each question in the batch
      const batchResults = await client.rateDifficulty(batch);

      // Adjust indices to match the original array
      for (const result of batchResults) {
        result.question_index += startIndex;
        difficultyResults.push(result);
      }

      // Add a small delay between batches to be respectful to the API
      if (batchIndex < batchCount - 1) {
        console.log("⏱️  Waiting 2 seconds before next batch...");
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    console.log(
      `✅ Analyzed ${difficultyResults.length} questions for difficulty`,
    );

    // Generate summary statistics
    const difficultyScores = difficultyResults.map((r) => r.difficulty_score);
    const averageDifficulty = difficultyScores.reduce((sum, score) =>
      sum + score, 0) / difficultyScores.length;
    const minDifficulty = Math.min(...difficultyScores);
    const maxDifficulty = Math.max(...difficultyScores);

    // Categorize by difficulty ranges
    const easyQuestions = difficultyResults.filter((r) =>
      r.difficulty_score <= 3
    );
    const moderateQuestions = difficultyResults.filter((r) =>
      r.difficulty_score >= 4 && r.difficulty_score <= 6
    );
    const hardQuestions = difficultyResults.filter((r) =>
      r.difficulty_score >= 7 && r.difficulty_score <= 8
    );
    const expertQuestions = difficultyResults.filter((r) =>
      r.difficulty_score >= 9
    );

    console.log(`📊 Difficulty Analysis Summary:`);
    console.log(`  - Average difficulty: ${averageDifficulty.toFixed(2)}`);
    console.log(`  - Range: ${minDifficulty} - ${maxDifficulty}`);
    console.log(`  - Easy (1-3): ${easyQuestions.length} questions`);
    console.log(`  - Moderate (4-6): ${moderateQuestions.length} questions`);
    console.log(`  - Hard (7-8): ${hardQuestions.length} questions`);
    console.log(`  - Expert (9-10): ${expertQuestions.length} questions`);

    // Calculate difficulty distribution by category
    const categoryDifficulty = new Map<string, number[]>();
    for (const result of difficultyResults) {
      const question = generatedQuestions[result.question_index];
      if (!categoryDifficulty.has(question.category)) {
        categoryDifficulty.set(question.category, []);
      }
      categoryDifficulty.get(question.category)!.push(result.difficulty_score);
    }

    const categoryStats = Array.from(categoryDifficulty.entries()).map((
      [category, scores],
    ) => ({
      category,
      count: scores.length,
      average_difficulty: scores.reduce((sum, score) =>
        sum + score, 0) / scores.length,
      min_difficulty: Math.min(...scores),
      max_difficulty: Math.max(...scores),
    }));

    // Save results
    const output = {
      analysis_date: new Date().toISOString(),
      config: config,
      generated_questions_file: config.generated_questions_file,
      questions_analyzed: generatedQuestions.length,
      summary: {
        average_difficulty: averageDifficulty,
        min_difficulty: minDifficulty,
        max_difficulty: maxDifficulty,
        distribution: {
          easy: easyQuestions.length,
          moderate: moderateQuestions.length,
          hard: hardQuestions.length,
          expert: expertQuestions.length,
        },
        category_breakdown: categoryStats,
      },
      difficulty_results: difficultyResults,
      recommendations: {
        well_balanced: averageDifficulty >= 4.5 && averageDifficulty <= 6.5,
        too_easy: averageDifficulty < 4.5,
        too_hard: averageDifficulty > 6.5,
        suggested_actions: generateRecommendations(
          averageDifficulty,
          difficultyResults,
        ),
      },
    };

    await writeJsonFile(config.output_file, output);

    console.log(
      `🎉 Difficulty analysis complete! Results saved to ${config.output_file}`,
    );

    // Provide actionable feedback
    if (averageDifficulty < 4.5) {
      console.warn(
        `⚠️  Warning: Questions may be too easy (avg: ${
          averageDifficulty.toFixed(2)
        }). Consider adding more complex scenarios.`,
      );
    } else if (averageDifficulty > 6.5) {
      console.warn(
        `⚠️  Warning: Questions may be too difficult (avg: ${
          averageDifficulty.toFixed(2)
        }). Consider simplifying some scenarios.`,
      );
    } else {
      console.log(
        `✅ Good difficulty balance (avg: ${averageDifficulty.toFixed(2)})`,
      );
    }

    if (expertQuestions.length > generatedQuestions.length * 0.2) {
      console.warn(
        `⚠️  Warning: ${expertQuestions.length} expert-level questions (${
          Math.round(expertQuestions.length / generatedQuestions.length * 100)
        }%) may be too many for EMT level.`,
      );
    }
  } catch (error) {
    console.error("❌ Failed to analyze difficulty:", error);
    Deno.exit(1);
  }
}

function generateRecommendations(
  averageDifficulty: number,
  results: DifficultyResult[],
): string[] {
  const recommendations: string[] = [];

  if (averageDifficulty < 4.5) {
    recommendations.push(
      "Consider adding more scenario-based questions requiring critical thinking",
    );
    recommendations.push(
      "Increase complexity by adding multiple variables or complications",
    );
    recommendations.push(
      "Focus on application and analysis rather than simple recall",
    );
  } else if (averageDifficulty > 6.5) {
    recommendations.push(
      "Simplify some scenarios to focus on core EMT competencies",
    );
    recommendations.push("Reduce the number of variables in complex questions");
    recommendations.push("Ensure questions match EMT scope of practice");
  } else {
    recommendations.push("Good difficulty balance maintained");
    recommendations.push(
      "Consider slight adjustments to individual outlier questions",
    );
  }

  const expertCount = results.filter((r) => r.difficulty_score >= 9).length;
  if (expertCount > results.length * 0.15) {
    recommendations.push(
      `Reduce expert-level questions (${expertCount} found) to better match EMT level`,
    );
  }

  const easyCount = results.filter((r) => r.difficulty_score <= 2).length;
  if (easyCount > results.length * 0.2) {
    recommendations.push(
      `Consider elevating ${easyCount} very easy questions to require more analysis`,
    );
  }

  return recommendations;
}

if (import.meta.main) {
  main().catch(console.error);
}
