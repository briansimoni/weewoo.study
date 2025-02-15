function handler(_req: Request): Response {
  return new Response("what is this?!");
}
Deno.serve(handler);
