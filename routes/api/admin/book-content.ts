import { AppHandlers } from "../../_middleware.ts";

export const handler: AppHandlers = {
  async GET(_req, _ctx) {
    try {
      // Read the book.txt file
      const content = await Deno.readTextFile("./book.txt");
      return new Response(content, {
        status: 200,
        headers: {
          "Content-Type": "text/plain",
        },
      });
    } catch (error) {
      console.error("Error reading book.txt:", error);
      return new Response(
        JSON.stringify({ error: "Failed to read book content" }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }
  },
};
