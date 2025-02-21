import "$std/dotenv/load.ts";
import { QuestionStore } from "../lib/question_store.ts";

async function mergeQuestionFiles() {
  const directory = "./question_data";
  const allQuestions: Array<Record<string, unknown>> = [];

  for await (const entry of Deno.readDir(directory)) {
    if (
      entry.isFile && entry.name.startsWith("questions_") &&
      entry.name.endsWith(".json")
    ) {
      const filePath = `${directory}/${entry.name}`;
      const content = await Deno.readTextFile(filePath);

      try {
        const questions = JSON.parse(content);
        if (Array.isArray(questions)) {
          allQuestions.push(...questions);
        } else {
          console.warn(`File ${filePath} does not contain an array`);
        }
      } catch (error) {
        console.error(`Failed to parse ${filePath}:`, error);
      }
    }
  }

  // const outputFile = "merged_questions.json";
  // await Deno.writeTextFile(outputFile, JSON.stringify(allQuestions, null, 2));
  // console.log(`Merged ${allQuestions.length} questions into ${outputFile}`);

  const questionStore = await QuestionStore.make();
  //const existingQuestions = await questionStore.listQuestions();
  // for (const question of existingQuestions) {
  //   console.log("deleting", question.id);
  //   await questionStore.deleteQuestion(question.id);
  // }
  for (const question of allQuestions) {
    await questionStore.addQuestion(question);
  }
}

mergeQuestionFiles().catch(console.error);
