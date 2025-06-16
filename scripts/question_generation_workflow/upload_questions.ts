import { readJsonFile } from "./shared/utils.ts";
import { QuestionStore } from "../../lib/question_store.ts";
import { getKv } from "../../lib/kv.ts";

interface Config {
  db_ready_questions_file: string;
  scope: "emt" | "advanced" | "medic";
  batch_size: number;
  skip_duplicates: boolean;
  max_retries: number;
}

interface DBReadyQuestionsFile {
  created_at: string;
  config: Record<string, unknown>;
  questions: {
    question: string;
    choices: string[];
    correct_answer: number;
    explanation: string;
    category: string;
  }[];
  metadata?: {
    filtered_questions?: unknown[];
    validation_errors?: unknown[];
  };
}

interface UploadResult {
  total_questions: number;
  successful_uploads: number;
  failed_uploads: number;
  skipped_duplicates: number;
  errors: Array<{
    question_index: number;
    question_preview: string;
    error: string;
  }>;
}

async function main() {
  const configPath = "./config/upload_config.json";
  let config: Config;

  try {
    config = await readJsonFile<Config>(configPath);
  } catch {
    config = {
      db_ready_questions_file: "./output/db_ready_questions.json",
      scope: "emt",
      batch_size: 10,
      skip_duplicates: true,
      max_retries: 3,
    };
    console.log("No upload config file found, using defaults");
  }

  console.log("📤 Starting question upload to database...");

  try {
    // Load database-ready questions
    const questionsFile = await readJsonFile<DBReadyQuestionsFile>(
      config.db_ready_questions_file,
    );

    if (!questionsFile.questions || questionsFile.questions.length === 0) {
      console.warn("⚠️  No questions found in file to upload");
      return;
    }

    console.log(`📚 Found ${questionsFile.questions.length} questions to upload`);

    // Initialize database connection
    const kv = await getKv();
    const questionStore = await QuestionStore.make(kv, config.scope);

    const result: UploadResult = {
      total_questions: questionsFile.questions.length,
      successful_uploads: 0,
      failed_uploads: 0,
      skipped_duplicates: 0,
      errors: [],
    };

    // Process questions in batches to avoid overwhelming the database
    const batchSize = config.batch_size;
    for (let i = 0; i < questionsFile.questions.length; i += batchSize) {
      const batch = questionsFile.questions.slice(i, i + batchSize);
      console.log(
        `🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${
          Math.ceil(questionsFile.questions.length / batchSize)
        } (${batch.length} questions)`,
      );

      for (let j = 0; j < batch.length; j++) {
        const questionIndex = i + j;
        const question = batch[j];
        const questionPreview = question.question.length > 60
          ? `${question.question.substring(0, 60)}...`
          : question.question;

        try {
          // Attempt to add the question to the database
          await questionStore.add({
            question: question.question,
            choices: question.choices,
            correct_answer: question.correct_answer,
            explanation: question.explanation,
            category: question.category,
          });

          result.successful_uploads++;
          console.log(`✅ Question ${questionIndex + 1}: "${questionPreview}"`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          
          if (errorMessage.includes("Question already exists")) {
            if (config.skip_duplicates) {
              result.skipped_duplicates++;
              console.log(`⏭️  Question ${questionIndex + 1}: Skipped (duplicate) - "${questionPreview}"`);
              continue;
            } else {
              result.failed_uploads++;
              result.errors.push({
                question_index: questionIndex,
                question_preview: questionPreview,
                error: "Question already exists (duplicates not skipped)",
              });
              console.error(`❌ Question ${questionIndex + 1}: Duplicate - "${questionPreview}"`);
              continue;
            }
          }

          // For other errors, attempt retries
          let _retrySuccessful = false;
          for (let retryCount = 1; retryCount <= config.max_retries; retryCount++) {
            try {
              console.log(`🔄 Retry ${retryCount}/${config.max_retries} for question ${questionIndex + 1}`);
              await new Promise(resolve => setTimeout(resolve, retryCount * 1000)); // Exponential backoff
              
              await questionStore.add({
                question: question.question,
                choices: question.choices,
                correct_answer: question.correct_answer,
                explanation: question.explanation,
                category: question.category,
              });

              result.successful_uploads++;
              console.log(`✅ Question ${questionIndex + 1}: "${questionPreview}" (retry ${retryCount})`);
              _retrySuccessful = true;
              break;
            } catch (retryError) {
              const retryErrorMessage = retryError instanceof Error ? retryError.message : String(retryError);
              if (retryCount === config.max_retries) {
                result.failed_uploads++;
                result.errors.push({
                  question_index: questionIndex,
                  question_preview: questionPreview,
                  error: `Failed after ${config.max_retries} retries: ${retryErrorMessage}`,
                });
                console.error(`❌ Question ${questionIndex + 1}: Failed after retries - "${questionPreview}"`);
              }
            }
          }
        }
      }

      // Brief pause between batches
      if (i + batchSize < questionsFile.questions.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Save upload results
    const outputPath = config.db_ready_questions_file.replace('.json', '_upload_results.json');
    await Deno.writeTextFile(
      outputPath,
      JSON.stringify({
        upload_date: new Date().toISOString(),
        config: config,
        source_file: config.db_ready_questions_file,
        result: result,
      }, null, 2),
    );

    console.log("\n📊 Upload Results:");
    console.log(`✅ Successfully uploaded: ${result.successful_uploads} questions`);
    console.log(`⏭️  Skipped duplicates: ${result.skipped_duplicates} questions`);
    console.log(`❌ Failed uploads: ${result.failed_uploads} questions`);
    console.log(`📈 Success rate: ${((result.successful_uploads / result.total_questions) * 100).toFixed(2)}%`);

    if (result.errors.length > 0) {
      console.log("\n🚨 Errors encountered:");
      result.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. Question ${error.question_index + 1}: ${error.error}`);
        console.log(`     "${error.question_preview}"`);
      });
    }

    console.log(`\n💾 Upload results saved to: ${outputPath}`);

    if (result.failed_uploads > 0) {
      console.warn(`\n⚠️  Warning: ${result.failed_uploads} questions failed to upload. Check the errors above.`);
    }

    if (result.successful_uploads === 0) {
      console.error("\n❌ No questions were uploaded successfully!");
      Deno.exit(1);
    } else {
      console.log(`\n🎉 Upload complete! ${result.successful_uploads} questions added to the database.`);
    }

  } catch (error) {
    console.error("❌ Failed to upload questions:", error);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main().catch(console.error);
}
