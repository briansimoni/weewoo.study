#!/usr/bin/env -S deno run --allow-env --allow-read --allow-write
import { Question, QuestionStore } from "../lib/question_store.ts";
import { QuestionStore2 } from "../lib/question_store2.ts";
import { getKv } from "../lib/kv.ts";
import "$std/dotenv/load.ts";

/**
 * This script migrates all questions from QuestionStore1 to QuestionStore2.
 * It handles the conversion between the different schema formats.
 */
async function migrateQuestions() {
  console.log("Starting migration from QuestionStore1 to QuestionStore2...");

  // Open a single KV instance that will be shared by both stores
  const kv = await getKv();

  try {
    // Create both stores
    const store1 = await QuestionStore.make(kv);
    // Default scope is "medic", but you can change it as needed
    const scope = "emt";
    const store2 = await QuestionStore2.make(kv, scope);

    // Get all questions from store1
    console.log("Fetching questions from QuestionStore1...");
    const questions = await store1.listQuestions();
    console.log(`Found ${questions.length} questions to migrate.`);

    // Stats tracking
    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ id: string; error: string }> = [];

    // Process each question
    for (const oldQuestion of questions) {
      try {
        // Convert the question format
        const newQuestion = convertQuestionFormat(oldQuestion);

        // Add to store2
        await store2.add(newQuestion);

        console.log(`✅ Migrated question ID ${oldQuestion.id} successfully.`);
        successCount++;
      } catch (error) {
        const errorMessage = error instanceof Error
          ? error.message
          : String(error);
        console.error(
          `❌ Failed to migrate question ID ${oldQuestion.id}: ${errorMessage}`,
        );
        errors.push({ id: oldQuestion.id, error: errorMessage });
        errorCount++;
      }
    }

    // Print summary
    console.log("\n--- Migration Summary ---");
    console.log(`Total questions: ${questions.length}`);
    console.log(`Successfully migrated: ${successCount}`);
    console.log(`Failed to migrate: ${errorCount}`);

    if (errors.length > 0) {
      console.log("\nErrors:");
      for (const { id, error } of errors) {
        console.log(`- Question ID ${id}: ${error}`);
      }
    }
  } catch (error) {
    console.error("Migration failed with error:", error);
  } finally {
    // Close KV connection
    kv.close();
  }
}

/**
 * Converts a question from QuestionStore1 format to QuestionStore2 format
 */
function convertQuestionFormat(oldQuestion: Question) {
  // We need to ensure we have exactly 4 choices for QuestionStore2
  // If there are fewer, we'll pad with empty strings
  // If there are more, we'll truncate to 4
  const choicesPadded = [...oldQuestion.choices];
  while (choicesPadded.length < 4) {
    choicesPadded.push(""); // Pad with empty choices
  }

  // In QuestionStore1, correct_answer is the actual correct answer string
  // In QuestionStore2, correct_answer is a number index (0, 1, 2, 3)
  // Find the index of the correct answer in the choices array
  const correctAnswerIndex = choicesPadded.findIndex(
    (choice) => choice === oldQuestion.correct_answer,
  );

  const category = oldQuestion.category;
  if (!category) {
    throw new Error("Question category is missing");
  }

  if (correctAnswerIndex === -1) {
    // If we can't find the answer, check if it's already provided as a valid index
    if (!isNaN(Number(oldQuestion.correct_answer))) {
      const numAnswer = Number(oldQuestion.correct_answer);
      if (numAnswer >= 0 && numAnswer < choicesPadded.length) {
        return {
          question: oldQuestion.question,
          choices: choicesPadded.slice(0, 4),
          correct_answer: numAnswer,
          explanation: oldQuestion.explanation,
          category,
        };
      }
    }

    throw new Error(
      `Cannot find "${oldQuestion.correct_answer}" in choices: ${
        JSON.stringify(choicesPadded)
      }`,
    );
  }

  return {
    question: oldQuestion.question,
    choices: choicesPadded.slice(0, 4),
    correct_answer: correctAnswerIndex,
    explanation: oldQuestion.explanation,
    category,
  };
}

// Run the migration
migrateQuestions();
