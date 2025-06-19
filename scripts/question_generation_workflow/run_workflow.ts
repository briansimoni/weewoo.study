#!/usr/bin/env -S deno run --allow-net --allow-read --allow-write --allow-env

import { writeJsonFile } from "./shared/utils.ts";
import "$std/dotenv/load.ts";

interface WorkflowConfig {
  textbook_urls?: string[];
  textbook_chapters?: string[];
  question_count: number;
  scope: "emt" | "advanced" | "medic";
  similarity_threshold: number;
  max_similarity_for_db: number;
  min_difficulty: number;
  max_difficulty: number;
  batch_size: number;
}

async function main() {
  const args = Deno.args;
  const command = args[0];

  if (!command || command === "help") {
    printHelp();
    return;
  }

  switch (command) {
    case "init":
      await initializeWorkflow();
      break;
    case "generate":
      await runStep("generate");
      break;
    case "optimize":
      await runStep("optimize");
      break;
    case "similarity":
      await runStep("similarity");
      break;
    case "difficulty":
      await runStep("difficulty");
      break;
    case "format":
      await runStep("format");
      break;
    case "upload":
      await runStep("upload");
      break;
    case "full":
      await runFullWorkflow();
      break;
    case "status":
      await checkStatus();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      Deno.exit(1);
  }
}

function printHelp() {
  console.log(`
🧠 Question Generation Workflow

Usage: deno run --allow-all run_workflow.ts <command>

Commands:
  init        - Initialize workflow with default configuration files
  generate    - Generate new questions from textbook content
  optimize    - Optimize questions using O3 for NREMT alignment
  similarity  - Check similarity of optimized questions
  difficulty  - Rate difficulty of questions using O3 model
  format      - Format questions for database insertion
  upload      - Upload formatted questions to database
  full        - Run complete workflow (generate → optimize → similarity → difficulty → format → upload)
  status      - Check status of workflow files
  help        - Show this help message

Configuration:
  The workflow uses JSON config files that are created by 'init' command:
  - config/config.json (generation settings)
  - config/optimize_config.json (optimization settings)
  - config/similarity_config.json (similarity checking settings)
  - config/difficulty_config.json (difficulty rating settings)
  - config/format_config.json (database formatting settings)
  - config/upload_config.json (database upload settings)

Environment:
  Set CHAT_GPT_KEY environment variable before running.
  (Or add it to your .env file in the project root)

Examples:
  deno run --allow-all run_workflow.ts init
  deno run --allow-all run_workflow.ts full
  deno run --allow-all run_workflow.ts generate
`);
}

async function initializeWorkflow() {
  console.log("🚀 Initializing question generation workflow...");

  const defaultConfig = {
    question_count: 10,
    scope: "emt" as const,
    batch_size: 5,
    similarity_threshold: 5,
    max_similarity_for_db: 6,
    min_difficulty: 3,
    max_difficulty: 8,
  };

  // Generation config
  await writeJsonFile("./config/config.json", {
    chapter_ids: [],
    textbook_urls: [],
    textbook_files: [],
    sample_questions_file: "./nremt_samples.json",
    num_questions: defaultConfig.question_count,
    scope: defaultConfig.scope,
    output_file: "./output/generated_questions.json",
  });

  // Optimization config
  await writeJsonFile("./config/optimize_config.json", {
    generated_questions_file: "./output/generated_questions.json",
    output_file: "./output/optimized_questions.json",
    batch_size: 3,
    minimum_improvement_threshold: 3,
  });

  // Similarity config
  await writeJsonFile("./config/similarity_config.json", {
    generated_questions_file: "./output/optimized_questions.json",
    output_file: "./output/similarity_scores.json",
    scope: defaultConfig.scope,
    similarity_threshold: defaultConfig.similarity_threshold,
  });

  // Difficulty config
  await writeJsonFile("./config/difficulty_config.json", {
    generated_questions_file: "./output/optimized_questions.json",
    output_file: "./output/difficulty_scores.json",
    batch_size: defaultConfig.batch_size,
  });

  // Format config
  await writeJsonFile("./config/format_config.json", {
    generated_questions_file: "./output/optimized_questions.json",
    similarity_scores_file: "./output/similarity_scores.json",
    difficulty_scores_file: "./output/difficulty_scores.json",
    output_file: "./output/db_ready_questions.json",
    scope: defaultConfig.scope,
    max_similarity_threshold: defaultConfig.max_similarity_for_db,
    min_difficulty: defaultConfig.min_difficulty,
    max_difficulty: defaultConfig.max_difficulty,
    include_similarity_metadata: true,
    include_difficulty_metadata: true,
  });

  // Upload config
  await writeJsonFile(
    "./config/upload_config.json",
    {
      db_ready_questions_file: "./output/db_ready_questions.json",
      scope: "emt",
      batch_size: 10,
      skip_duplicates: true,
      max_retries: 3,
    },
  );

  console.log("✅ Configuration files created!");
  console.log("📝 Edit the config files to customize your workflow:");
  console.log("  - config/config.json: Add textbook URLs or file paths");
  console.log(
    "  - config/optimize_config.json: Configure question optimization",
  );
  console.log(
    "  - config/similarity_config.json: Adjust similarity thresholds",
  );
  console.log(
    "  - config/difficulty_config.json: Configure difficulty analysis",
  );
  console.log("  - config/format_config.json: Set database formatting options");
  console.log("  - config/upload_config.json: Configure database upload");
}

async function runStep(step: string) {
  console.log(`🔄 Running ${step} step...`);

  const scriptMap = {
    generate: "./generate_questions.ts",
    optimize: "./optimize_questions.ts",
    similarity: "./similarity_check.ts",
    difficulty: "./difficulty_estimator.ts",
    format: "./format_for_db.ts",
    upload: "./upload_questions.ts",
  };

  const scriptPath = scriptMap[step as keyof typeof scriptMap];
  if (!scriptPath) {
    console.error(`Unknown step: ${step}`);
    return;
  }

  const command = new Deno.Command("deno", {
    args: ["run", "--allow-all", scriptPath],
    cwd: Deno.cwd(),
    stdout: "inherit", // Stream stdout to console
    stderr: "inherit", // Stream stderr to console
  });

  const { success } = await command.output();

  if (!success) {
    console.error(`❌ Step ${step} failed!`);
    Deno.exit(1);
  }

  console.log(`✅ Step ${step} completed successfully!`);
}

async function runFullWorkflow() {
  console.log("🚀 Starting full question generation workflow...");

  const steps = [
    "generate",
    /*"optimize",*/ "similarity",
    "difficulty",
    "format",
    "upload",
  ];

  for (const step of steps) {
    await runStep(step);
    console.log(""); // Add spacing between steps
  }

  console.log("🎉 Full workflow completed successfully!");
  console.log("📁 Check output/db_ready_questions.json for your final output");
}

async function checkStatus() {
  console.log("📊 Workflow Status Check\n");

  const files = [
    { name: "Configuration", path: "./config/config.json", required: true },
    {
      name: "Generated Questions",
      path: "./output/generated_questions.json",
      required: false,
    },
    {
      name: "Optimized Questions",
      path: "./output/optimized_questions.json",
      required: false,
    },
    {
      name: "Similarity Scores",
      path: "./output/similarity_scores.json",
      required: false,
    },
    {
      name: "Difficulty Scores",
      path: "./output/difficulty_scores.json",
      required: false,
    },
    {
      name: "DB Ready Questions",
      path: "./output/db_ready_questions.json",
      required: false,
    },
  ];

  for (const file of files) {
    try {
      const stat = await Deno.stat(file.path);
      const sizeKB = Math.round(stat.size / 1024);
      const modified = new Date(stat.mtime || 0).toLocaleString();
      console.log(`✅ ${file.name}: ${sizeKB}KB (modified: ${modified})`);
    } catch {
      if (file.required) {
        console.log(`❌ ${file.name}: Missing (run 'init' command)`);
      } else {
        console.log(`⚪ ${file.name}: Not generated yet`);
      }
    }
  }

  // Check environment
  const chatGptKey = Deno.env.get("CHAT_GPT_KEY");
  console.log(`\n🔑 ChatGPT API Key: ${chatGptKey ? "✅ Set" : "❌ Missing"}`);

  if (!chatGptKey) {
    console.log("   Set with: export CHAT_GPT_KEY=your_key_here");
  }
}

if (import.meta.main) {
  main().catch(console.error);
}
