#!/usr/bin/env -S deno run --allow-net --allow-read --allow-write --allow-env

import { OpenAIClient, readJsonFile, writeJsonFile } from "./shared/utils.ts";
import { GeneratedQuestion, OptimizationResult } from "./shared/types.ts";
import "$std/dotenv/load.ts";

interface GeneratedQuestionsFile {
  generated_at: string;
  questions: GeneratedQuestion[];
  [key: string]: unknown;
}

interface Config {
  generated_questions_file: string;
  output_file: string;
  batch_size: number;
  minimum_improvement_threshold: number;
}

async function main() {
  const configPath = "./config/optimize_config.json";
  let config: Config;

  try {
    config = await readJsonFile<Config>(configPath);
  } catch {
    config = {
      generated_questions_file: "./generated_questions.json",
      output_file: "./optimized_questions.json",
      batch_size: 3, // Smaller batches for O3 to avoid token limits
      minimum_improvement_threshold: 3, // Only keep questions with improvement score >= 3
    };
    console.log("No optimization config file found, using defaults");
  }

  console.log("✨ Starting question optimization...");

  // Load generated questions
  const generatedFile = await readJsonFile<GeneratedQuestionsFile>(
    config.generated_questions_file,
  );
  const generatedQuestions = generatedFile.questions;
  console.log(`📚 Loaded ${generatedQuestions.length} generated questions`);

  // Initialize OpenAI client
  const client = new OpenAIClient();

  console.log(`🤖 Optimizing questions using O3 model for NREMT alignment...`);
  console.log(`📊 Processing in batches of ${config.batch_size} questions`);

  try {
    const optimizationResults: OptimizationResult[] = [];
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
      const batchResults = await client.optimizeQuestions(batch);

      // Adjust indices to match the original array
      for (const result of batchResults) {
        result.question_index += startIndex;
        optimizationResults.push(result);
      }

      // Add a longer delay between batches since O3 is expensive
      if (batchIndex < batchCount - 1) {
        console.log("⏱️  Waiting 5 seconds before next batch...");
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }

    console.log(`✅ Optimized ${optimizationResults.length} questions`);

    // Generate summary statistics
    const improvementScores = optimizationResults.map((r) =>
      r.improvement_score
    );
    const averageImprovement = improvementScores.reduce((sum, score) =>
      sum + score, 0) / improvementScores.length;
    const minImprovement = Math.min(...improvementScores);
    const maxImprovement = Math.max(...improvementScores);

    // Categorize by improvement level
    const highlyImproved = optimizationResults.filter((r) =>
      r.improvement_score >= 7
    );
    const moderatelyImproved = optimizationResults.filter((r) =>
      r.improvement_score >= 4 && r.improvement_score < 7
    );
    const minimallyImproved = optimizationResults.filter((r) =>
      r.improvement_score >= 2 && r.improvement_score < 4
    );
    const unchanged = optimizationResults.filter((r) =>
      r.improvement_score < 2
    );

    console.log(`📊 Optimization Summary:`);
    console.log(`  - Average improvement: ${averageImprovement.toFixed(2)}`);
    console.log(`  - Range: ${minImprovement} - ${maxImprovement}`);
    console.log(
      `  - Highly improved (7-10): ${highlyImproved.length} questions`,
    );
    console.log(
      `  - Moderately improved (4-6): ${moderatelyImproved.length} questions`,
    );
    console.log(
      `  - Minimally improved (2-3): ${minimallyImproved.length} questions`,
    );
    console.log(`  - Unchanged (1): ${unchanged.length} questions`);

    // Track common improvement types
    const improvementTypes = new Map<string, number>();
    for (const result of optimizationResults) {
      for (const change of result.changes_made) {
        const changeType = categorizeChange(change);
        improvementTypes.set(
          changeType,
          (improvementTypes.get(changeType) || 0) + 1,
        );
      }
    }

    // Create final output with optimized questions
    const finalQuestions: GeneratedQuestion[] = [];
    const rejectedQuestions: Array<
      { question: GeneratedQuestion; reason: string }
    > = [];

    for (const result of optimizationResults) {
      if (result.improvement_score >= config.minimum_improvement_threshold) {
        finalQuestions.push(result.optimized_question);
      } else {
        rejectedQuestions.push({
          question: result.original_question,
          reason:
            `Low improvement score: ${result.improvement_score} (threshold: ${config.minimum_improvement_threshold})`,
        });
      }
    }

    console.log(
      `✅ ${finalQuestions.length} questions meet improvement threshold`,
    );
    console.log(
      `🚫 ${rejectedQuestions.length} questions rejected for low improvement`,
    );

    // Save results
    const output = {
      optimization_date: new Date().toISOString(),
      config: config,
      source_file: config.generated_questions_file,
      questions_processed: generatedQuestions.length,
      summary: {
        average_improvement: averageImprovement,
        min_improvement: minImprovement,
        max_improvement: maxImprovement,
        improvement_distribution: {
          highly_improved: highlyImproved.length,
          moderately_improved: moderatelyImproved.length,
          minimally_improved: minimallyImproved.length,
          unchanged: unchanged.length,
        },
        common_improvements: Array.from(improvementTypes.entries())
          .sort((a, b) =>
            b[1] - a[1]
          )
          .slice(0, 10)
          .map(([type, count]) => ({ type, count })),
        questions_accepted: finalQuestions.length,
        questions_rejected: rejectedQuestions.length,
      },
      optimization_results: optimizationResults,
      final_questions: finalQuestions,
      rejected_questions: rejectedQuestions.map((r) => ({
        reason: r.reason,
        question_preview: r.question.question.substring(0, 100) + "...",
      })),
      recommendations: generateOptimizationRecommendations(optimizationResults),
    };

    await writeJsonFile(config.output_file, output);

    console.log(
      `🎉 Question optimization complete! Results saved to ${config.output_file}`,
    );

    // Provide actionable feedback
    if (averageImprovement < 3.0) {
      console.warn(
        `⚠️  Warning: Low average improvement (${
          averageImprovement.toFixed(2)
        }). Original questions may already be well-crafted.`,
      );
    } else if (averageImprovement > 6.0) {
      console.log(
        `🌟 Excellent optimization results (avg: ${
          averageImprovement.toFixed(2)
        })! Questions significantly improved.`,
      );
    } else {
      console.log(
        `✅ Good optimization results (avg: ${averageImprovement.toFixed(2)})`,
      );
    }

    if (rejectedQuestions.length > generatedQuestions.length * 0.3) {
      console.warn(
        `⚠️  Warning: ${
          Math.round(rejectedQuestions.length / generatedQuestions.length * 100)
        }% of questions rejected. Consider lowering improvement threshold.`,
      );
    }

    // Show most common improvements
    const topImprovements = Array.from(improvementTypes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    if (topImprovements.length > 0) {
      console.log(`🔧 Most common improvements:`);
      for (const [type, count] of topImprovements) {
        console.log(`  - ${type}: ${count} questions`);
      }
    }
  } catch (error) {
    console.error("❌ Failed to optimize questions:", error);
    Deno.exit(1);
  }
}

function categorizeChange(change: string): string {
  const changeText = change.toLowerCase();

  if (
    changeText.includes("terminology") || changeText.includes("medical term")
  ) {
    return "Medical terminology";
  } else if (
    changeText.includes("scenario") || changeText.includes("realistic")
  ) {
    return "Scenario realism";
  } else if (
    changeText.includes("clarity") || changeText.includes("clear") ||
    changeText.includes("ambiguous")
  ) {
    return "Question clarity";
  } else if (
    changeText.includes("distractor") || changeText.includes("choice") ||
    changeText.includes("option")
  ) {
    return "Answer choices";
  } else if (
    changeText.includes("explanation") || changeText.includes("rationale")
  ) {
    return "Explanation improvement";
  } else if (changeText.includes("vital") || changeText.includes("clinical")) {
    return "Clinical details";
  } else if (
    changeText.includes("bias") || changeText.includes("cultural") ||
    changeText.includes("sensitive")
  ) {
    return "Bias/sensitivity";
  } else if (changeText.includes("nremt") || changeText.includes("standard")) {
    return "NREMT alignment";
  } else {
    return "General improvement";
  }
}

function generateOptimizationRecommendations(
  results: OptimizationResult[],
): string[] {
  const recommendations: string[] = [];

  const averageImprovement =
    results.reduce((sum, r) => sum + r.improvement_score, 0) / results.length;
  const highImprovementCount =
    results.filter((r) => r.improvement_score >= 7).length;
  const lowImprovementCount =
    results.filter((r) => r.improvement_score <= 2).length;

  if (averageImprovement >= 5) {
    recommendations.push(
      "Questions showed significant improvement - original generation may need refinement",
    );
    recommendations.push(
      "Consider updating generation prompts based on optimization patterns",
    );
  } else {
    recommendations.push(
      "Questions were already well-crafted - maintain current generation quality",
    );
  }

  if (highImprovementCount > results.length * 0.3) {
    recommendations.push(
      `${highImprovementCount} questions significantly improved - review generation process`,
    );
  }

  if (lowImprovementCount > results.length * 0.4) {
    recommendations.push(
      "Many questions required minimal changes - good baseline quality",
    );
  }

  recommendations.push(
    "Use optimized questions for subsequent similarity and difficulty analysis",
  );
  recommendations.push(
    "Review rejected questions to understand improvement patterns",
  );

  return recommendations;
}

if (import.meta.main) {
  main().catch(console.error);
}
