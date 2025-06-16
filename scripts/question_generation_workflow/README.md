# Question Generation Workflow

A comprehensive system for generating, validating, and preparing EMT test questions for database insertion.

## Overview

This workflow consists of five main steps:
1. **Generate Questions** - Uses OpenAI to create new questions based on textbook content and NREMT samples
2. **Optimize Questions** - Uses OpenAI O3 to refine and improve questions for NREMT alignment
3. **Check Similarity** - Analyzes optimized questions for duplicates and high similarity to existing content
4. **Rate Difficulty** - Uses OpenAI O3 model to assess question difficulty on a 1-10 scale
5. **Format for Database** - Validates and formats questions for database insertion using Zod schemas

## Category Restrictions

All generated questions must use **EXACTLY** one of the following official EMT categories:

1. EMS Systems
2. Workforce Safety and Wellness
3. Medical, Legal, and Ethical Issues
4. Communications and Documentation
5. Medical Terminology
6. The Human Body
7. Life Span Development
8. Lifting and Moving Patients
9. The Team Approach to Health Care
10. Patient Assessment
11. Airway Management
12. Principles of Pharmacology
13. Shock
14. BLS Resuscitation
15. Medical Overview
16. Respiratory Emergencies
17. Cardiovascular Emergencies
18. Neurologic Emergencies
19. Gastrointestinal and Urologic Emergencies
20. Endocrine and Hematologic Emergencies
21. Allergy and Anaphylaxis
22. Toxicology
23. Behavioral Health Emergencies
24. Gynecologic Emergencies
25. Trauma Overview
26. Bleeding
27. Soft-Tissue Injuries
28. Face and Neck Injuries
29. Head and Spine Injuries
30. Chest Injuries
31. Abdominal and Genitourinary Injuries
32. Orthopaedic Injuries
33. Environmental Emergencies
34. Obstetrics and Neonatal Care
35. Pediatric Emergencies
36. Geriatric Emergencies
37. Patients With Special Challenges
38. Transport Operations
39. Vehicle Extrication and Special Rescue
40. Incident Management
41. Terrorism Response and Disaster Management

These categories are enforced at the schema level and in AI prompts to ensure consistency with the database API requirements.

## Quick Start

1. **Initialize the workflow:**
   ```bash
   deno run --allow-all run_workflow.ts init
   ```

2. **Set up your environment variables in a `.env` file:**
   ```bash
   # OpenAI API Configuration
   CHAT_GPT_KEY=your_openai_api_key_here

   # AWS S3 Configuration (for textbook chapter retrieval)
   AWS_ACCESS_KEY_ID=your_aws_access_key_id
   AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
   AWS_REGION=us-east-1

   # S3 Bucket Configuration (optional, uses defaults if not set)
   S3_BUCKET_NAME=ems-questions-static-assets
   S3_PREFIX_KEY=emt-book/
   ```

3. **Edit configuration files** (optional):
   - `config/config.json` - Add textbook URLs or file paths
   - `config/optimize_config.json` - Configure optimization settings
   - `config/similarity_config.json` - Adjust similarity thresholds
   - `config/difficulty_config.json` - Configure difficulty analysis
   - `config/format_config.json` - Set database formatting options

4. **Run the full workflow:**
   ```bash
   deno run --allow-all run_workflow.ts full
   ```

## File Structure

```
question_generation_workflow/
├── shared/                    # Shared utilities and types
├── config/                    # Configuration files
│   ├── config.json           # Generation settings
│   ├── optimize_config.json  # Optimization settings
│   ├── similarity_config.json # Similarity checking settings
│   ├── difficulty_config.json # Difficulty rating settings
│   └── format_config.json    # Database formatting settings
├── output/                    # Generated output files
│   ├── generated_questions.json
│   ├── optimized_questions.json
│   ├── similarity_scores.json
│   ├── difficulty_scores.json
│   └── db_ready_questions.json
├── nremt_samples.json        # Reference NREMT sample questions
└── run_workflow.ts           # Main workflow orchestrator
```

## Individual Commands

- `deno run --allow-all run_workflow.ts generate` - Generate questions only
- `deno run --allow-all run_workflow.ts optimize` - Optimize questions for NREMT alignment
- `deno run --allow-all run_workflow.ts similarity` - Check similarity of optimized questions
- `deno run --allow-all run_workflow.ts difficulty` - Rate difficulty only
- `deno run --allow-all run_workflow.ts format` - Format for DB only
- `deno run --allow-all run_workflow.ts status` - Check workflow status

## Configuration Files

All configuration files are located in the `config/` directory:

### Generation Config (`config/config.json`)
```json
{
  "chapter_ids": ["1", "2", "3"],
  "textbook_files": [],
  "sample_questions_file": "./nremt_samples.json",
  "num_questions": 10,
  "scope": "emt",
  "output_file": "./output/generated_questions.json",
  "s3_config": {
    "bucket_name": "ems-questions-static-assets",
    "prefix_key": "emt-book/",
    "region": "us-east-1"
  }
}
```

**Configuration Options:**
- `chapter_ids`: Array of chapter IDs to download from S3 (e.g., ["1", "2", "15"])
- `textbook_files`: Array of local file paths for offline content (fallback)
- `sample_questions_file`: Path to NREMT sample questions for style reference
- `num_questions`: Number of questions to generate
- `scope`: Target scope (always "emt" for EMT questions)
- `output_file`: Where to save generated questions
- `s3_config`: S3 bucket configuration for textbook chapter retrieval

### Optimization Config (`config/optimize_config.json`)
```json
{
  "generated_questions_file": "./output/generated_questions.json",
  "output_file": "./output/optimized_questions.json",
  "batch_size": 3,
  "minimum_improvement_threshold": 3
}
```

### Similarity Config (`config/similarity_config.json`)
```json
{
  "generated_questions_file": "./output/optimized_questions.json",
  "output_file": "./output/similarity_scores.json",
  "scope": "emt",
  "similarity_threshold": 5
}
```

### Difficulty Config (`config/difficulty_config.json`)
```json
{
  "generated_questions_file": "./output/optimized_questions.json",
  "output_file": "./output/difficulty_scores.json",
  "batch_size": 5
}
```

### Format Config (`config/format_config.json`)
```json
{
  "generated_questions_file": "./output/optimized_questions.json",
  "similarity_scores_file": "./output/similarity_scores.json",
  "difficulty_scores_file": "./output/difficulty_scores.json",
  "output_file": "./output/db_ready_questions.json",
  "scope": "emt",
  "max_similarity_threshold": 6,
  "min_difficulty": 3,
  "max_difficulty": 8,
  "include_similarity_metadata": true,
  "include_difficulty_metadata": true
}
```

## Environment Variables

The workflow automatically loads environment variables from the project root `.env` file using Deno's dotenv module.

### Required Variables in `.env`
```bash
# OpenAI API Configuration
CHAT_GPT_KEY=your_openai_api_key_here

# AWS S3 Configuration (for textbook chapter retrieval)
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1

# S3 Bucket Configuration (optional, uses defaults if not set)
S3_BUCKET_NAME=ems-questions-static-assets
S3_PREFIX_KEY=emt-book/
```

### Variable Details
- `CHAT_GPT_KEY`: **Required** - Your OpenAI API key for question generation
- `AWS_ACCESS_KEY_ID`: **Required** - AWS access key for S3 chapter retrieval
- `AWS_SECRET_ACCESS_KEY`: **Required** - AWS secret access key for S3 access
- `AWS_REGION`: Optional - AWS region (default: "us-east-1")
- `S3_BUCKET_NAME`: Optional - S3 bucket containing textbook chapters (default: "ems-questions-static-assets")
- `S3_PREFIX_KEY`: Optional - S3 prefix for textbook files (default: "emt-book/")

**Note**: The workflow will fallback to system environment variables if any values are missing from the `.env` file.

## Output Files

All output files are generated in the `output/` directory:

- `output/generated_questions.json` - Raw generated questions with metadata
- `output/optimized_questions.json` - Optimized questions for NREMT alignment
- `output/similarity_scores.json` - Similarity analysis results with scores 1-10
- `output/difficulty_scores.json` - Difficulty ratings with O3 model reasoning
- `output/db_ready_questions.json` - Final validated questions ready for database insertion

## Models Used

- **Question Generation**: `gpt-4o-mini` (fast, cost-effective)
- **Optimization**: `o3-preview` (advanced reasoning for NREMT alignment)
- **Similarity Checking**: `gpt-4o-mini` (fast, cost-effective)
- **Difficulty Rating**: `o1-preview` (advanced reasoning for accurate difficulty assessment)

## Quality Controls

### Similarity Filtering
- Compares new questions against existing database questions
- Compares new questions against each other
- Scores similarity 1-10 (10 = essentially identical)
- Filters out questions above similarity threshold

### Difficulty Assessment
- Rates questions 1-10 based on:
  - Knowledge level required
  - Clinical reasoning complexity
  - Number of variables to consider
  - Real-world application difficulty
- Provides detailed reasoning for each score

### Schema Validation
- Uses Zod schemas to ensure data integrity
- Validates all required fields before database insertion
- Provides detailed error reporting for invalid questions

## Question Format

Questions follow the NREMT sample format:
```json
{
  "category": "Primary Assessment",
  "question": "A 17-year-old patient has chest pain...",
  "choices": [
    "Fractured ribs",
    "Cardiac tamponade",
    "Pulmonary contusion",
    "Tension pneumothorax"
  ],
  "correct_answer": 2,
  "explanation": "The clinical presentation suggests..."
}
```

## Troubleshooting

### Common Issues

1. **Missing OpenAI API Key**
   - Check your `.env` file for the `CHAT_GPT_KEY` variable

2. **Rate Limiting**
   - Difficulty analysis uses batching to respect API limits
   - Increase `batch_size` in difficulty config for faster processing
   - Decrease if you encounter rate limits

3. **High Similarity Scores**
   - Reduce `max_similarity_threshold` in format config for stricter filtering
   - Review filtered questions in the metadata section of output

4. **Question Quality Issues**
   - Adjust difficulty range in format config
   - Modify generation prompts in `shared/utils.ts`
   - Add more diverse textbook content

### File Permissions
All scripts require these Deno permissions:
- `--allow-net` (OpenAI API calls)
- `--allow-read` (reading config and input files)
- `--allow-write` (writing output files)
- `--allow-env` (accessing OpenAI API key)

## Extending the Workflow

### Adding New Models
Modify the OpenAI client in `shared/utils.ts` to use different models:
```typescript
// For generation
model: "gpt-4o" // More capable but slower

// For difficulty
model: "o1" // Most advanced reasoning
```

### Custom Validation
Add custom validation rules in `format_for_db.ts`:
```typescript
// Example: Filter questions by category
if (question.category === "Unwanted Category") {
  filteredQuestions.push({...});
  continue;
}
```

### Batch Processing
For large textbook collections, modify the generation script to process chapters in batches and merge results.

## Cost Estimation

Approximate costs for 100 questions (using current OpenAI pricing):

- Generation (gpt-4o-mini): ~$0.10-0.20
- Optimization (o3-preview): ~$2.00-4.00
- Similarity (gpt-4o-mini): ~$0.20-0.40
- Difficulty (o1-preview): ~$2.00-4.00
- **Total**: ~$4.30-8.60 per 100 questions

The O3 model would be more expensive but provide the highest quality difficulty assessments.
