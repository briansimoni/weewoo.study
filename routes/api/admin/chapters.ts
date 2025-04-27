import { AppHandlers } from "../../_middleware.ts";

export const handler: AppHandlers = {
  async GET(_req, _ctx) {
    try {
      // Get list of chapter files
      const chaptersDir = await Deno.readDir("./book_chapters");
      const chapters = [];
      
      for await (const entry of chaptersDir) {
        if (entry.isFile && entry.name.endsWith(".txt")) {
          // Extract chapter number and title from filename
          // Format: "01 - EMS Systems.txt"
          const match = entry.name.match(/^(\d+)\s*-\s*(.+)\.txt$/);
          if (match) {
            chapters.push({
              id: match[1],
              filename: entry.name,
              title: match[2].trim(),
            });
          }
        }
      }
      
      // Sort chapters by their number
      chapters.sort((a, b) => parseInt(a.id) - parseInt(b.id));
      
      return new Response(JSON.stringify(chapters), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.error("Error reading chapters:", error);
      return new Response(
        JSON.stringify({ error: "Failed to read chapters" }),
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
