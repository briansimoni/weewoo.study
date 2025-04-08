import { AppHandlers } from "./_middleware.ts";

// Get the current stage from environment variables
const stage = Deno.env.get("STAGE");

export const handler: AppHandlers = {
  GET: (_req) => {
    // Allow indexing if stage is empty or undefined (production)
    // Disallow indexing for any other stage (TEST, DEV, etc.)
    const robotsTxt = stage === undefined || stage === "" || stage === "PROD"
      ? `# Allow all search engines to index the site
User-agent: *
Allow: /
`
      : `# Disallow all search engines from indexing non-production environments
User-agent: *
Disallow: /
`;

    return new Response(robotsTxt, {
      headers: {
        "content-type": "text/plain",
      },
    });
  },
};
