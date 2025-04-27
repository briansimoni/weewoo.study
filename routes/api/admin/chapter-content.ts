import { AppHandlers } from "../../_middleware.ts";

export const handler: AppHandlers = {
  async GET(req, _ctx) {
    try {
      const url = new URL(req.url);
      const chapterId = url.searchParams.get("chapterId");

      if (!chapterId) {
        return new Response(
          JSON.stringify({ error: "Missing chapterId parameter" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Find the chapter file that starts with the provided chapterId
      const chaptersDir = Deno.readDir("./book_chapters");
      let chapterFilename = "";

      for await (const entry of chaptersDir) {
        if (
          entry.isFile &&
          entry.name.startsWith(`${chapterId.padStart(2, "0")} -`)
        ) {
          chapterFilename = entry.name;
          break;
        }
      }

      if (!chapterFilename) {
        return new Response(
          JSON.stringify({ error: `Chapter ${chapterId} not found` }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Read the chapter content
      const chapterContent = await Deno.readTextFile(
        `./book_chapters/${chapterFilename}`,
      );

      return new Response(chapterContent, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    } catch (error) {
      console.error("Error reading chapter content:", error);
      return new Response(
        JSON.stringify({ error: "Failed to read chapter content" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },
};
