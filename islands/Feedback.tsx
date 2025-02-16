import { IS_BROWSER } from "$fresh/runtime.ts";

export function Feedback(
  { correct, explanation }: { correct: boolean; explanation: string },
) {
  const color = correct ? "text-green-600" : "text-red-600";

  if (IS_BROWSER) {
    if (correct) {
      const audio = new Audio("/correct.wav");
      audio.play().catch((error) =>
        console.error("Failed to play sound:", error)
      );
    }

    if (!correct) {
      const audio = new Audio("/incorrect.wav");
      audio.play().catch((error) =>
        console.error("Failed to play sound:", error)
      );
    }
  }

  return (
    <div class="mt-6">
      <p class={`font-bold text-xl ${color}`}>
        {correct ? "🎉 Correct! Great job!" : "👎 Keep practicing!"}
      </p>
      <div class="mt-4">
        <p class="text-lg mb-4">
          <strong>Explanation:</strong> {explanation}
        </p>
        <a href="/emt/practice">
          <button class="py-3 px-6 bg-blue-700 text-white rounded-lg hover:bg-blue-800 text-xl">
            Next Question →
          </button>
        </a>
      </div>
    </div>
  );
}
