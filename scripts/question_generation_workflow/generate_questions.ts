#!/usr/bin/env -S deno run --allow-net --allow-read --allow-write --allow-env

import {
  downloadTextbookChapter,
  OpenAIClient,
  readJsonFile,
  validateEnvironment,
  writeJsonFile,
} from "./shared/utils.ts";
import { GeneratedQuestion, GeneratedQuestionSchema, EMT_CATEGORIES } from "./shared/types.ts";
import { z } from "zod";
import "$std/dotenv/load.ts";

interface Config {
  chapter_ids?: string[];
  textbook_files?: string[];
  sample_questions_file?: string;
  num_questions?: number;
  scope?: string;
  output_file?: string;
  s3_config?: {
    bucket_name?: string;
    prefix_key?: string;
    region?: string;
  };
}

async function main() {
  // Validate environment before starting
  validateEnvironment();

  const configPath = "./config/config.json";
  let config: Config;

  try {
    config = await readJsonFile<Config>(configPath);
  } catch {
    // Default configuration if no config file exists
    config = {
      num_questions: 10,
      output_file: "./output/generated_questions.json",
    };
    console.log("No config file found, using defaults");
  }

  console.log("🚀 Starting question generation...");

  // Read sample questions to understand format and style
  const sampleQuestionsFile = config.sample_questions_file ||
    "./nremt_samples.json";
  const sampleQuestions = await readJsonFile<GeneratedQuestion[]>(
    sampleQuestionsFile,
  );
  console.log(`📚 Loaded ${sampleQuestions.length} sample questions`);

  // Load textbook content
  let textbookContext = "";

  if (config.chapter_ids && config.chapter_ids.length > 0) {
    console.log(
      `📖 Downloading ${config.chapter_ids.length} chapters from S3...`,
    );
    for (const chapterId of config.chapter_ids) {
      try {
        const chapterContent = await downloadTextbookChapter(chapterId);
        textbookContext += chapterContent + "\n\n";
        console.log(`✅ Downloaded chapter ${chapterId} from S3`);
      } catch (error) {
        console.error(`❌ Failed to download chapter ${chapterId}:`, error);
      }
    }
  } else if (config.textbook_files && config.textbook_files.length > 0) {
    console.log("📖 Loading local textbook files...");
    for (const filePath of config.textbook_files) {
      try {
        const chapterContent = await Deno.readTextFile(filePath);
        textbookContext += chapterContent + "\n\n";
        console.log(`✅ Loaded chapter from ${filePath}`);
      } catch (error) {
        console.error(`❌ Failed to load ${filePath}:`, error);
      }
    }
  } else {
    console.log(
      "⚠️  No textbook content specified. Using sample questions only.",
    );
    textbookContext =
      "Generate questions based on general EMT knowledge and the provided sample questions.";
  }

  if (textbookContext.length > 50000) {
    console.log(`📝 Chapter content is ${textbookContext.length} characters, splitting into chunks...`);
    
    // Split content into manageable chunks
    const maxChunkSize = 45000; // Leave room for prompt overhead
    const chunks: string[] = [];
    
    for (let i = 0; i < textbookContext.length; i += maxChunkSize) {
      const chunk = textbookContext.substring(i, i + maxChunkSize);
      chunks.push(chunk);
    }
    
    console.log(`📚 Processing ${chunks.length} chunks of chapter content`);
    
    // Generate questions from each chunk
    const allGeneratedQuestions: GeneratedQuestion[] = [];
    const questionsPerChunk = Math.ceil((config.num_questions || 10) / chunks.length);
    
    for (let i = 0; i < chunks.length; i++) {
      console.log(`🔄 Processing chunk ${i + 1}/${chunks.length} (${questionsPerChunk} questions)...`);
      
      try {
        const client = new OpenAIClient();
        const chunkQuestions = await client.generateQuestions(
          chunks[i],
          JSON.stringify(sampleQuestions, null, 2),
          questionsPerChunk,
        );
        
        allGeneratedQuestions.push(...chunkQuestions);
        console.log(`✅ Generated ${chunkQuestions.length} questions from chunk ${i + 1}`);
        
        // Brief pause between requests to avoid rate limiting
        if (i < chunks.length - 1) {
          console.log("⏱️  Waiting 2 seconds before next chunk...");
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.warn(`⚠️  Failed to generate questions from chunk ${i + 1}:`, error);
      }
    }
    
    console.log(`✅ Generated ${allGeneratedQuestions.length} questions from all chunks`);
    
    // Validate and filter questions
    const validQuestions = allGeneratedQuestions.filter((q) => {
      if (!q.question || !q.choices || !q.explanation || !q.category) {
        return false;
      }
      if (!Array.isArray(q.choices) || q.choices.length < 2) {
        return false;
      }
      if (typeof q.correct_answer !== "number" || q.correct_answer < 0 || q.correct_answer >= q.choices.length) {
        return false;
      }
      if (!EMT_CATEGORIES.includes(q.category)) {
        return false;
      }
      return true;
    });

    console.log(`✅ ${validQuestions.length} valid questions after validation`);

    // Trim to requested count if we have more than needed
    const finalQuestions = validQuestions.length > (config.num_questions || 10) 
      ? validQuestions.slice(0, config.num_questions || 10)
      : validQuestions;

    await writeJsonFile(config.output_file || "./output/generated_questions.json", {
      created_at: new Date().toISOString(),
      config: config,
      questions: finalQuestions,
      metadata: {
        total_chunks_processed: chunks.length,
        questions_per_chunk: questionsPerChunk,
        raw_generated_count: allGeneratedQuestions.length,
        valid_after_filtering: validQuestions.length,
        final_question_count: finalQuestions.length,
      },
    });

    console.log(
      `Successfully wrote data to ${config.output_file || "./output/generated_questions.json"}`,
    );
    console.log(
      `🎉 Question generation complete! Output saved to ${config.output_file || "./output/generated_questions.json"}`,
    );
    
    return; // Exit early since we handled everything here
  }

  // Initialize OpenAI client
  const client = new OpenAIClient();

  const questionCount = config.num_questions || 10;
  console.log(`🤖 Generating ${questionCount} questions...`);

  try {
    const generatedQuestions = await client.generateQuestions(
      textbookContext,
      JSON.stringify(sampleQuestions, null, 2),
      questionCount,
    );

    console.log(`✅ Generated ${generatedQuestions.length} questions`);

    // Validate questions
    const validQuestions: GeneratedQuestion[] = [];
    const errors: string[] = [];

    for (let i = 0; i < generatedQuestions.length; i++) {
      try {
        const validQuestion = GeneratedQuestionSchema.parse(
          generatedQuestions[i],
        );
        validQuestions.push(validQuestion);
      } catch (error) {
        if (error instanceof z.ZodError) {
          errors.push(
            `Question ${i + 1}: ${
              error.errors.map((e) => e.message).join(", ")
            }`,
          );
        } else {
          errors.push(`Question ${i + 1}: ${error}`);
        }
      }
    }

    if (errors.length > 0) {
      console.warn("⚠️  Validation errors found:");
      errors.forEach((error) => console.warn(`  - ${error}`));
    }

    console.log(`✅ ${validQuestions.length} valid questions after validation`);

    // Save generated questions
    await writeJsonFile(
      config.output_file || "./output/generated_questions.json",
      {
        generated_at: new Date().toISOString(),
        textbook_sources: config.chapter_ids || config.textbook_files || [],
        sample_questions_used: sampleQuestions.length,
        requested_count: questionCount,
        generated_count: generatedQuestions.length,
        valid_count: validQuestions.length,
        validation_errors: errors,
        questions: validQuestions,
      },
    );

    console.log(
      `🎉 Question generation complete! Output saved to ${
        config.output_file || "./output/generated_questions.json"
      }`,
    );

    if (validQuestions.length < questionCount * 0.8) {
      console.warn(
        "⚠️  Warning: Generated fewer than 80% of requested questions. Consider adjusting prompts or input content.",
      );
    }
  } catch (error) {
    console.error("❌ Failed to generate questions:", error);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main().catch(console.error);
}
