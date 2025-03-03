import Zod from "zod";
import { AppHandler, AppHandlers } from "../../_middleware.ts";
import { QuestionStore } from "../../../lib/question_store.ts";

const API_URL = "https://api.openai.com/v1/chat/completions";
const CHAT_GPT_KEY = Deno.env.get("CHAT_GPT_KEY");

const createQuestionSchema = Zod.object({
  question: Zod.string().min(1),
  choices: Zod.array(Zod.string().min(1)),
  correct_answer: Zod.string().min(1),
  explanation: Zod.string().min(1),
  category: Zod.string(
    Zod.enum([
      "Airway management",
      "Oxygenation",
      "Ventilation",
      "Respiratory emergencies",
      "Basic cardiac life support (BLS)",
      "Automated External Defibrillator (AED) use",
      "Cardiac emergencies",
      "Bleeding control",
      "Shock management",
      "Soft tissue injuries",
      "Musculoskeletal injuries",
      "Head, neck, and spinal injuries",
      "Neurological emergencies (e.g., strokes, seizures)",
      "Endocrine disorders (e.g., diabetes emergencies)",
      "Toxicology (e.g., overdoses, poisoning)",
      "Abdominal and gastrointestinal emergencies",
      "Allergic reactions and anaphylaxis",
      "Obstetrics and childbirth emergencies",
      "Scene safety and management",
      "Mass casualty incidents (MCI) and triage",
      "Ambulance operations",
      "Hazardous materials (HAZMAT) awareness",
    ]),
  ).min(1),
});

export type AdminCreateQuestionResponse = typeof createQuestionSchema._type;

export const handler: AppHandlers = {
  async GET(req, _ctx) {
    const prompt = new URL(req.url).searchParams.get("prompt");
    if (!prompt) {
      throw new Error("Missing prompt parameter.");
    }
    if (!CHAT_GPT_KEY) {
      throw new Error("Missing CHAT_GPT_KEY environment variable.");
    }
    const question = await generateQuestion(prompt);
    return new Response(JSON.stringify(question), { status: 200 });
  },

  async POST(req, _ctx) {
    const body = await req.json();
    const question = createQuestionSchema.parse(body);
    const questionStore = await QuestionStore.make();
    await questionStore.addQuestion(question);
    return new Response(JSON.stringify(question), { status: 200 });
  },
};

// Generate EMT exam questions
async function generateQuestion(prompt: string) {
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
          content: prompt,
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
