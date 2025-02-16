//api.openai.com/v1/chat/completions \
// -H "Content-Type: application/json" \
// -H "Authorization: Bearer asdf \
// -d '{    "model": "gpt-4o-mini",    "store": true,    "messages": [      {"role": "user", "content": "write a haiku about ai"}    ]  }

// generate_emttest_questions.ts

// OpenAI API endpoint and key

import "$std/dotenv/load.ts";
import { join } from "https://deno.land/std@0.224.0/path/mod.ts";
import { getKv } from "../lib/kv.ts";
import { Question, QuestionStore } from "../lib/question_store.ts";

const API_URL = "https://api.openai.com/v1/chat/completions";
const CHAT_GPT_KEY = Deno.env.get("CHAT_GPT_KEY");

if (!CHAT_GPT_KEY) {
  throw new Error("Missing CHAT_GPT_KEY environment variable.");
}

// Generate EMT exam questions
async function generateQuestions() {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CHAT_GPT_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      store: true,
      messages: [
        {
          role: "system",
          content:
            "You are an expert EMT instructor. Generate three multiple-choice questions for the NREMT exam. Each question should have a question, four answer choices, a correct answer, and an explanation, and category ('Airway, Respiration, and Ventilation', 'Cardiology and Resuscitation', 'Trauma', 'Medical and Obstetrics/Gynecology', 'EMS Operations'). Format as JSON. The choices should be in an array. Please do not provide any additional text as this will go into a database. Do not wrap the response in markdown.",
        },
      ],
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to generate questions: ${errorText}`);
  }

  const result = await response.json();

  // Extract and parse JSON from model's response
  const content = result.choices[0].message.content;

  try {
    console.log(content);
    const questions = JSON.parse(content);
    return questions;
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error:", error.message);
    } else {
      console.error("unknown error", error);
    }
  }
}

async function saveToFile(questions: string) {
  const file = join(Deno.cwd(), `questions_${Date.now()}.json`);
  await Deno.writeFile(file, new TextEncoder().encode(questions));
}

// Save questions to Deno KV
async function saveToKv(question: Partial<Question>) {
  // Convert the questions object to a JSON string
  const questionsString = JSON.stringify(question);

  // Generate a SHA-256 hash of the questions
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(questionsString),
  );

  // Convert hash buffer to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  question.hash = hashHex;
  const kv = await getKv();
  const questionStore = new QuestionStore(kv);
  questionStore.addQuestion(question);
}

// Main function
async function main() {
  try {
    const questions = await generateQuestions();
    for (const question of questions) {
      await saveToKv(question);
    }
    saveToFile(JSON.stringify(questions));
    console.log("Questions generated and stored successfully!");
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error:", error?.message);
    } else {
      console.error("unknown error", error);
    }
  }
}

await main();
