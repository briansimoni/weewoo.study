import { getKv } from "../lib/kv.ts";
import "$std/dotenv/load.ts";
import { QuestionStore } from "../lib/question_store.ts";

async function deleteKey() {
  const kv = await getKv();
  const questionStore = new QuestionStore(kv);
  const questions = await questionStore.listQuestions();
  for (const question of questions) {
    await questionStore.deleteQuestion(question.id);
  }

  await kv.delete(["emt", "question_count"]);
}

async function main() {
  deleteKey();
}
main();
