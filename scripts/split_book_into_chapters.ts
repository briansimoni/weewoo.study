/**
 * Script to split book.txt into separate chapter files
 * Usage: deno run --allow-read --allow-write scripts/split_book_into_chapters.ts
 */

// Regex pattern to identify chapter headings
// Based on exact "Chapter N" format (with possible whitespace)
const CHAPTER_PATTERN = /^Chapter\s+(\d+)\s*$/;

async function splitBookIntoChapters() {
  try {
    // Read the book file
    const bookContent = await Deno.readTextFile("./book.txt");
    
    // Split the book by lines
    const lines = bookContent.split("\n");
    
    let currentChapterNum = 0;
    let currentChapterTitle = "";
    let lookingForTitle = false;
    let currentChapterContent: string[] = [];
    const chapters: { num: number; title: string; content: string }[] = [];
    
    // Process each line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if the line is a chapter heading
      const match = line.match(CHAPTER_PATTERN);
      
      if (match) {
        // If we already have a chapter in progress, save it
        if (currentChapterNum > 0) {
          chapters.push({
            num: currentChapterNum,
            title: currentChapterTitle,
            content: currentChapterContent.join("\n"),
          });
          // Reset content array for next chapter
          currentChapterContent = [];
        }
        
        // Start a new chapter
        currentChapterNum = parseInt(match[1]);
        lookingForTitle = true;
        
        // Add the chapter heading to the content
        currentChapterContent.push(line);
      } else if (lookingForTitle && line.trim() !== "") {
        // This is the first non-empty line after the chapter heading - it's the title
        currentChapterTitle = line.trim();
        lookingForTitle = false;
        currentChapterContent.push(line);
      } else if (currentChapterNum > 0) {
        // Add the line to the current chapter
        currentChapterContent.push(line);
      }
    }
    
    // Don't forget to add the last chapter
    if (currentChapterNum > 0 && currentChapterContent.length > 0) {
      chapters.push({
        num: currentChapterNum,
        title: currentChapterTitle,
        content: currentChapterContent.join("\n"),
      });
    }
    
    // Create chapters directory if it doesn't exist
    try {
      await Deno.mkdir("./book_chapters", { recursive: true });
    } catch (error: unknown) {
      if (error instanceof Error && !(error instanceof Deno.errors.AlreadyExists)) {
        throw error;
      }
    }
    
    // Save each chapter as a separate file
    let savedCount = 0;
    for (const chapter of chapters) {
      const filename = `./book_chapters/${chapter.num.toString().padStart(2, '0')} - ${chapter.title.replace(/[<>:"/\\|?*]/g, "_")}.txt`;
      await Deno.writeTextFile(filename, chapter.content);
      savedCount++;
      console.log(`Saved: ${filename}`);
    }
    
    console.log(`\nSplit complete! Saved ${savedCount} chapters.`);
    
    if (savedCount === 0) {
      console.warn("\nWARNING: No chapters were detected. You may need to adjust the CHAPTER_PATTERN regex to match your book's format.");
      console.log("Current pattern:", CHAPTER_PATTERN);
      
      // Print some debug information to help identify chapter patterns
      console.log("\nSearching for 'Chapter' in the book:");
      const chapterLines = [];
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes("Chapter")) {
          chapterLines.push({ lineNumber: i + 1, content: lines[i] });
          if (chapterLines.length >= 10) break; // Only show first 10 matches
        }
      }
      
      if (chapterLines.length > 0) {
        console.log("Found lines containing 'Chapter':")
        chapterLines.forEach(line => console.log(`Line ${line.lineNumber}: "${line.content}"`));
      } else {
        console.log("No lines containing 'Chapter' were found.");
        console.log("\nHere are the first 10 lines of your book for reference:");
        console.log(lines.slice(0, 10).join("\n"));
      }
    }
    
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error:", error.message);
      if (error.message.includes("No such file or directory")) {
        console.error("Could not find book.txt file. Make sure it exists in the root directory.");
      }
    } else {
      console.error("An unknown error occurred:", error);
    }
  }
}

// Run the function
splitBookIntoChapters();
