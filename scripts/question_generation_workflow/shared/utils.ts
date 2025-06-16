import { OpenAI } from "jsr:@openai/openai";
import { S3Client, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";
import {
  DifficultyResult,
  GeneratedQuestion,
  OptimizationResult,
  SimilarityResult,
  EMT_CATEGORIES,
} from "./types.ts";

// Load environment variables from .env file (relative to project root)
const env = await load({ envPath: "../../../.env" });

// Validate required environment variables
export function validateEnvironment(): void {
  const apiKey = env.CHAT_GPT_KEY || env.OPENAI_API_KEY || Deno.env.get("CHAT_GPT_KEY") || Deno.env.get("OPENAI_API_KEY");
  
  if (!apiKey) {
    console.error("❌ Error: Missing OpenAI API key!");
    console.error("   Set CHAT_GPT_KEY in your .env file or environment variables");
    console.error("   Example: CHAT_GPT_KEY=sk-your-key-here");
    Deno.exit(1);
  }
}

// S3 configuration
const S3_BUCKET_NAME = env.S3_BUCKET_NAME || Deno.env.get("S3_BUCKET_NAME") || "ems-questions-static-assets";
const S3_PREFIX_KEY = env.S3_PREFIX_KEY || Deno.env.get("S3_PREFIX_KEY") || "emt-book/";
const s3Client = new S3Client({
  region: env.AWS_REGION || Deno.env.get("AWS_REGION") || "us-east-1",
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID || Deno.env.get("AWS_ACCESS_KEY_ID") || "",
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY || Deno.env.get("AWS_SECRET_ACCESS_KEY") || "",
  },
});

export class OpenAIClient {
  private client: OpenAI;

  constructor(apiKey?: string) {
    const finalApiKey = apiKey || env.CHAT_GPT_KEY || env.OPENAI_API_KEY || Deno.env.get("CHAT_GPT_KEY") || Deno.env.get("OPENAI_API_KEY");
    
    if (!finalApiKey) {
      throw new Error("OpenAI API key is required but not provided");
    }
    
    this.client = new OpenAI({
      apiKey: finalApiKey,
    });
  }

  /**
   * Extracts JSON from OpenAI response, handling both raw JSON and markdown-wrapped JSON
   */
  private extractJson(content: string): unknown {
    if (!content) throw new Error("No content to parse");

    // Try parsing as raw JSON first
    try {
      return JSON.parse(content);
    } catch {
      // If that fails, try extracting from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[1].trim());
        } catch (error) {
          throw new Error(`Failed to parse JSON from markdown block: ${error}`);
        }
      }
      
      // If no markdown blocks, try to find JSON-like content
      const jsonStart = content.indexOf('[');
      const jsonEnd = content.lastIndexOf(']');
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        try {
          return JSON.parse(content.slice(jsonStart, jsonEnd + 1));
        } catch (error) {
          throw new Error(`Failed to parse extracted JSON array: ${error}`);
        }
      }

      const objStart = content.indexOf('{');
      const objEnd = content.lastIndexOf('}');
      if (objStart !== -1 && objEnd !== -1 && objEnd > objStart) {
        try {
          return JSON.parse(content.slice(objStart, objEnd + 1));
        } catch (error) {
          throw new Error(`Failed to parse extracted JSON object: ${error}`);
        }
      }

      throw new Error(`Could not extract valid JSON from response: ${content.substring(0, 200)}...`);
    }
  }

  async generateQuestions(
    textbookContext: string,
    sampleQuestions: string,
    count: number = 10,
  ): Promise<GeneratedQuestion[]> {
    const prompt =
      `You are an expert EMT test question generator. Based on the provided textbook content and sample NREMT questions, generate ${count} new test questions that match the style and difficulty of the samples.

TEXTBOOK CONTENT:
${textbookContext}

SAMPLE QUESTIONS FORMAT:
${sampleQuestions}

Requirements:
1. Questions should test practical EMT knowledge and decision-making
2. Each question should have 4 multiple choice answers
3. **CRITICAL: The correct_answer field must be 0-based indexed (0, 1, 2, or 3) where 0 = first choice, 1 = second choice, etc.**
4. Include clear explanations for the correct answers
5. Use only these categories: ${EMT_CATEGORIES.map((cat) => `"${cat}"`).join(", ")}
6. Vary difficulty appropriately for EMT-level knowledge
7. Focus on real-world scenarios EMTs encounter
8. Ensure questions are clear and unambiguous

**IMPORTANT: The correct_answer must be 0-indexed (not 1-indexed). For example:**
- If the correct choice is the first option, use: "correct_answer": 0
- If the correct choice is the second option, use: "correct_answer": 1
- If the correct choice is the third option, use: "correct_answer": 2
- If the correct choice is the fourth option, use: "correct_answer": 3

Return a JSON array in this exact format:
[{
"category": "string", 
"question": "string", 
"choices": ["string", "string", "string", "string"],
"correct_answer": 0,
"explanation": "string"
}]`;

    const response = await this.client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 4000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No response from OpenAI");

    try {
      return this.extractJson(content) as GeneratedQuestion[];
    } catch (error) {
      throw new Error(`Failed to parse OpenAI response: ${error}`);
    }
  }

  async checkSimilarity(
    newQuestions: GeneratedQuestion[],
    existingQuestions: GeneratedQuestion[],
  ): Promise<SimilarityResult[]> {
    const results: SimilarityResult[] = [];

    for (let i = 0; i < newQuestions.length; i++) {
      const newQ = newQuestions[i];
      const prompt =
        `You are an expert at detecting similarity between test questions. Rate the similarity between the following question and a set of existing questions on a scale of 1-10 where:

1-2: Completely different topics
3-4: Related topics but different focus
5-6: Same topic, different scenarios/approach
7-8: Very similar content or scenarios
9-10: Essentially the same question

TARGET QUESTION:
"${newQ.question}"

EXISTING QUESTIONS TO COMPARE:
${existingQuestions.map((q, idx) => `${idx}: "${q.question}"`).join("\n")}

${
          newQuestions.filter((_, idx) => idx !== i).map((q, idx) =>
            `NEW_${idx < i ? idx : idx + 1}: "${q.question}"`
          ).join("\n")
        }

Return your analysis as JSON in this format:
{
  "similar_questions": [
    {
      "source": "existing" | "generated",
      "index": number,
      "question_text": "string",
      "similarity_score": number
    }
  ]
}

Only include questions with similarity score >= 5.`;

      const response = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) continue;

      try {
        // Extract JSON from potential code blocks or explanatory text
        let jsonContent = content.trim();
        
        // Remove markdown code blocks if present
        const jsonMatch = jsonContent.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
        if (jsonMatch) {
          jsonContent = jsonMatch[1];
        } else {
          // Try to find JSON object in the content
          const jsonStart = jsonContent.indexOf('{');
          const jsonEnd = jsonContent.lastIndexOf('}');
          if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
            jsonContent = jsonContent.slice(jsonStart, jsonEnd + 1);
          }
        }

        const analysis = JSON.parse(jsonContent) as {
          similar_questions: Array<{
            source: "generated" | "existing";
            index?: number;
            question_id?: string;
            question_text: string;
            similarity_score: number;
          }>;
        };
        
        // Validate the response structure
        if (!analysis.similar_questions || !Array.isArray(analysis.similar_questions)) {
          throw new Error("Invalid response structure: missing similar_questions array");
        }
        
        const maxSimilarity = Math.max(
          ...analysis.similar_questions.map((sq) => sq.similarity_score),
          1,
        );

        results.push({
          question_index: i,
          question_text: newQ.question,
          similar_questions: analysis.similar_questions,
          max_similarity: maxSimilarity,
        });
      } catch (_error) {
        console.warn(
          `⚠️  Failed to parse similarity analysis for question ${i}, using fallback. Content: "${content?.slice(0, 100)}..."`
        );
        results.push({
          question_index: i,
          question_text: newQ.question,
          similar_questions: [],
          max_similarity: 1,
        });
      }
    }

    return results;
  }

  async rateDifficulty(
    questions: GeneratedQuestion[],
  ): Promise<DifficultyResult[]> {
    const results: DifficultyResult[] = [];

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const prompt =
        `You are an expert EMT educator. Rate the difficulty of the following EMT test question on a scale of 1-10 where:

1-2: Basic recall/recognition (memorized facts)
3-4: Simple application (straightforward protocols)
5-6: Moderate analysis (requires connecting concepts)
7-8: Complex synthesis (multiple factors to consider)
9-10: Expert-level critical thinking (advanced scenarios)

Consider:
- Knowledge level required
- Clinical reasoning complexity  
- Number of variables to consider
- Likelihood of confusion with similar concepts
- Real-world application difficulty

QUESTION:
Category: ${question.category}
Question: "${question.question}"
Choices: ${
          question.choices.map((c, idx) =>
            `${String.fromCharCode(65 + idx)}) ${c}`
          ).join(", ")
        }
Correct Answer: ${String.fromCharCode(65 + question.correct_answer)}) ${
          question.choices[question.correct_answer]
        }

Provide your rating as JSON:
{
  "difficulty_score": number,
  "reasoning": "detailed explanation of rating"
}`;

      const response = await this.client.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 1000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) continue;

      try {
        // Extract JSON from potential code blocks or explanatory text
        let jsonContent = content.trim();
        
        // Remove markdown code blocks if present
        const jsonMatch = jsonContent.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
        if (jsonMatch) {
          jsonContent = jsonMatch[1];
        } else {
          // Try to find JSON object in the content
          const jsonStart = jsonContent.indexOf('{');
          const jsonEnd = jsonContent.lastIndexOf('}');
          if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
            jsonContent = jsonContent.slice(jsonStart, jsonEnd + 1);
          }
        }

        const analysis = JSON.parse(jsonContent);
        
        // Validate the response structure
        if (typeof analysis.difficulty_score !== 'number' || !analysis.reasoning) {
          throw new Error("Invalid response structure: missing difficulty_score or reasoning");
        }
        
        results.push({
          question_index: i,
          question_text: question.question,
          difficulty_score: analysis.difficulty_score,
          reasoning: analysis.reasoning,
        });
      } catch (_error) {
        console.warn(
          `⚠️  Failed to parse difficulty analysis for question ${i}, using fallback. Content: "${content?.slice(0, 100)}..."`
        );
        results.push({
          question_index: i,
          question_text: question.question,
          difficulty_score: 5,
          reasoning: "Unable to analyze - assigned default difficulty",
        });
      }
    }

    return results;
  }

  async optimizeQuestions(
    questions: GeneratedQuestion[],
  ): Promise<OptimizationResult[]> {
    const results: OptimizationResult[] = [];

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const prompt =
        `You are an expert EMT test question writer and NREMT exam specialist. Your task is to optimize the following EMT test question to make it more realistic, clear, and aligned with NREMT standards.

ORIGINAL QUESTION:
Category: ${question.category}
Question: "${question.question}"
Choices: ${
        question.choices.map((c, idx) =>
          `${idx + 1}. ${c}`
        ).join("\n")
      }
Correct Answer: Choice ${question.correct_answer + 1} (${question.choices[question.correct_answer]})
Explanation: ${question.explanation}

OPTIMIZATION GUIDELINES:
1. Improve clarity and specificity of the question scenario
2. Make distractors (wrong answers) more plausible but clearly incorrect
3. Ensure the question tests critical EMT knowledge and decision-making
4. Use realistic, scenario-based language that EMTs encounter
5. Ensure the correct answer is definitively the best choice
6. **CRITICAL: Maintain 0-based indexing for correct_answer (0, 1, 2, or 3)**
7. Use only these categories: ${EMT_CATEGORIES.map((cat) => `"${cat}"`).join(", ")}
8. Keep explanations concise but complete

**IMPORTANT: The correct_answer field must remain 0-based indexed:**
- 0 = first choice, 1 = second choice, 2 = third choice, 3 = fourth choice

Provide your response as JSON in this format:
{
  "optimized_question": {
    "category": "string",
    "question": "string", 
    "choices": ["string", "string", "string", "string"],
    "correct_answer": 0,
    "explanation": "string"
  },
  "changes_made": ["list of specific improvements"],
  "optimization_reasoning": "explanation of why changes improve the question",
  "improvement_score": 1-5
}`;

      const response = await this.client.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) continue;

      try {
        const parsedContent = this.extractJson(content);
        
        if (typeof parsedContent === 'object' && parsedContent !== null && 
            'optimized_question' in parsedContent) {
          const optimization = parsedContent as {
            optimized_question: GeneratedQuestion;
            changes_made: string[];
            optimization_reasoning: string;
            improvement_score: number;
          };
          
          results.push({
            question_index: i,
            original_question: {
              category: question.category,
              question: question.question,
              choices: question.choices,
              correct_answer: question.correct_answer,
              explanation: question.explanation,
            },
            optimized_question: optimization.optimized_question,
            changes_made: optimization.changes_made,
            optimization_reasoning: optimization.optimization_reasoning,
            improvement_score: optimization.improvement_score,
          });
        } else {
          console.warn(`Unexpected optimization response format for question ${i + 1}, using fallback`);
          results.push({
            question_index: i,
            original_question: {
              category: question.category,
              question: question.question,
              choices: question.choices,
              correct_answer: question.correct_answer,
              explanation: question.explanation,
            },
            optimized_question: {
              category: question.category,
              question: question.question,
              choices: question.choices,
              correct_answer: question.correct_answer,
              explanation: question.explanation,
            },
            changes_made: [],
            optimization_reasoning:
              "Optimization failed - returned original question",
            improvement_score: 1,
          });
        }
      } catch (error) {
        console.warn(`Failed to parse optimization for question ${i + 1}:`, error);
        
        results.push({
          question_index: i,
          original_question: {
            category: question.category,
            question: question.question,
            choices: question.choices,
            correct_answer: question.correct_answer,
            explanation: question.explanation,
          },
          optimized_question: {
            category: question.category,
            question: question.question,
            choices: question.choices,
            correct_answer: question.correct_answer,
            explanation: question.explanation,
          },
          changes_made: [],
          optimization_reasoning:
            "Optimization failed - returned original question",
          improvement_score: 1,
        });
      }
    }

    return results;
  }
}

/**
 * Get the official EMT categories for use in AI prompts
 */
export function getEMTCategories(): string[] {
  return [...EMT_CATEGORIES];
}

/**
 * Format EMT categories as a string for AI prompts
 */
export function formatCategoriesForPrompt(): string {
  return EMT_CATEGORIES.map((cat, index) => `${index + 1}. ${cat}`).join('\n');
}

export async function readJsonFile<T>(filePath: string): Promise<T> {
  try {
    const content = await Deno.readTextFile(filePath);
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to read JSON file ${filePath}: ${error}`);
  }
}

export async function writeJsonFile<T>(
  filePath: string,
  data: T,
): Promise<void> {
  try {
    const content = JSON.stringify(data, null, 2);
    await Deno.writeTextFile(filePath, content);
    console.log(`Successfully wrote data to ${filePath}`);
  } catch (error) {
    throw new Error(`Failed to write JSON file ${filePath}: ${error}`);
  }
}

export async function downloadTextbookChapter(
  chapterId: string,
): Promise<string> {
  try {
    // List objects in the S3 bucket to find the chapter
    const listCommand = new ListObjectsV2Command({
      Bucket: S3_BUCKET_NAME,
      Prefix: S3_PREFIX_KEY,
    });
    
    const listResponse = await s3Client.send(listCommand);
    let chapterKey = "";
    
    if (listResponse.Contents) {
      // Find the chapter file that starts with the provided chapterId
      for (const object of listResponse.Contents) {
        if (object.Key && object.Key.includes(`${chapterId.padStart(2, "0")} -`)) {
          chapterKey = object.Key;
          break;
        }
      }
    }

    if (!chapterKey) {
      throw new Error(`Chapter ${chapterId} not found in S3 bucket`);
    }

    // Get the chapter content from S3
    const getCommand = new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: chapterKey,
    });
    
    const getResponse = await s3Client.send(getCommand);
    
    if (!getResponse.Body) {
      throw new Error(`Failed to get chapter ${chapterId} content from S3`);
    }
    
    // Convert the response body to a string
    const bodyContents = await getResponse.Body.transformToByteArray();
    const chapterContent = new TextDecoder().decode(bodyContents);

    return chapterContent;
  } catch (error) {
    throw new Error(`Failed to download textbook chapter from S3: ${error}`);
  }
}
