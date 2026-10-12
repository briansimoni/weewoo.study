import Zod from "zod";
import { QUESTION_STATUSES, SCOPES } from "./question_store.ts";

/**
 * A status change, with optional review metadata recorded in the same write.
 * POST api/admin/questions/status takes this; review scripts send it.
 */
export const statusChangeSchema = Zod.object({
  questionId: Zod.string().min(1),
  scope: Zod.enum(SCOPES).default("emt"),
  status: Zod.enum(QUESTION_STATUSES),
  review: Zod.object({
    author: Zod.enum(["ai", "human"]).optional(),
    difficulty: Zod.number().int().min(1).max(10).optional(),
    tags: Zod.array(Zod.string().min(1)).optional(),
    references: Zod.array(Zod.string().min(1)).optional(),
    explanation_per_choice: Zod.array(Zod.string().min(1)).optional(),
    reviewed_by: Zod.string().min(1).optional(),
    reviewed_at: Zod.string().datetime().optional(),
  }).strict().default({}),
});
