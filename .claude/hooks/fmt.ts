// PostToolUse hook (Edit|Write): run `deno fmt` on the file Claude just changed.
// Reads the hook payload from stdin. Never fails the tool call.

const FORMATTABLE = /\.(ts|tsx|js|jsx|json|jsonc|md|css)$/i;

try {
  const payload = JSON.parse(await new Response(Deno.stdin.readable).text());
  const filePath: unknown = payload?.tool_input?.file_path ??
    payload?.tool_response?.filePath;
  if (typeof filePath === "string" && FORMATTABLE.test(filePath)) {
    await new Deno.Command("deno", {
      args: ["fmt", "--quiet", filePath],
      stdout: "null",
      stderr: "null",
    }).output();
  }
} catch {
  // Formatting is best-effort; `deno task verify` is the real gate.
}
