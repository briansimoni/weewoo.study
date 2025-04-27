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
      "EMS Systems",
      "Workforce Safety and Wellness",
      "Medical, Legal, and Ethical Issues",
      "Communications and Documentation",
      "Medical Terminology",
      "The Human Body",
      "Life Span Development",
      "Lifting and Moving Patients",
      "The Team Approach to Health Care",
      "Patient Assessment",
      "Airway Management",
      "Principles of Pharmacology",
      "Shock",
      "BLS Resuscitation",
      "Medical Overview",
      "Respiratory Emergencies",
      "Cardiovascular Emergencies",
      "Neurologic Emergencies",
      "Gastrointestinal and Urologic Emergencies",
      "Endocrine and Hematologic Emergencies",
      "Allergy and Anaphylaxis",
      "Toxicology",
      "Behavioral Health Emergencies",
      "Gynecologic Emergencies",
      "Trauma Overview",
      "Bleeding",
      "Soft-Tissue Injuries",
      "Face and Neck Injuries",
      "Head and Spine Injuries",
      "Chest Injuries",
      "Abdominal and Genitourinary Injuries",
      "Orthopaedic Injuries",
      "Environmental Emergencies",
      "Obstetrics and Neonatal Care",
      "Pediatric Emergencies",
      "Geriatric Emergencies",
      "Patients With Special Challenges",
      "Transport Operations",
      "Vehicle Extrication and Special Rescue",
      "Incident Management",
      "Terrorism Response and Disaster Management",
    ]),
  ).min(1),
});

export type AdminCreateQuestionResponse = typeof createQuestionSchema._type;

export const handler: AppHandlers = {
  async GET(req, _ctx) {
    const url = new URL(req.url);
    const prompt = url.searchParams.get("prompt");
    const chapterId = url.searchParams.get("chapterId");
    
    if (!prompt) {
      throw new Error("Missing prompt parameter.");
    }
    if (!CHAT_GPT_KEY) {
      throw new Error("Missing CHAT_GPT_KEY environment variable.");
    }
    
    let chapterContent = "";
    if (chapterId) {
      try {
        // Find the chapter file that starts with the provided chapterId
        const chaptersDir = await Deno.readDir("./book_chapters");
        let chapterFilename = "";
        
        for await (const entry of chaptersDir) {
          if (entry.isFile && entry.name.startsWith(`${chapterId.padStart(2, '0')} -`)) {
            chapterFilename = entry.name;
            break;
          }
        }
        
        if (chapterFilename) {
          chapterContent = await Deno.readTextFile(`./book_chapters/${chapterFilename}`);
        }
      } catch (error) {
        console.error("Error reading chapter content:", error);
      }
    }
    
    const question = await generateQuestion(prompt, chapterContent);
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
async function generateQuestion(prompt: string, chapterContent = "") {
  // Build messages array
  const messages = [];
  
  if (chapterContent) {
    // If chapter content is provided, use it as a reference
    // First message is the user's original prompt which contains their specific instructions
    messages.push({
      role: "system",
      content: prompt
    });
    
    // Add a second system message that instructs to use the chapter content
    messages.push({
      role: "system",
      content: "Use ONLY the provided reference material to create questions. Do not include any information that is not in the reference material."
    });
    
    // Add chapter content as reference material
    messages.push({
      role: "user",
      content: `Reference material:\n\n${chapterContent}\n\nBased on my previous instructions and ONLY using this reference material, generate a multiple choice question.`
    });
  } else {
    // Use the standard prompt without chapter reference
    messages.push({
      role: "system",
      content: prompt,
    });
  }
  
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CHAT_GPT_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      store: true,
      messages: messages,
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
