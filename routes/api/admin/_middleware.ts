import { adminApiMiddleware } from "../../../lib/admin_only_middleware.ts";
import { AppHandler } from "../../_middleware.ts";

export const handler: AppHandler[] = [
  adminApiMiddleware,
];
