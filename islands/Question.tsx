import { useEffect, useState } from "preact/hooks";
import { Question } from "../lib/question_store.ts";
import { IS_BROWSER } from "$fresh/runtime.ts";
import { setDisplayedStreak } from "./StreakIndicator.tsx";
import { QuestionPostResponse } from "../routes/api/question.ts";

export default function QuestionPage() {
  const [question, setQuestion] = useState<Question | undefined>();
  const [correct, setCorrect] = useState<boolean | undefined>();
  const [submitted, setSubmitted] = useState<boolean | undefined>();
  const [selectedAnswer, setSelectedAnswer] = useState<string | undefined>();
  const answered = typeof correct === "boolean";
  const correctAudio = (IS_BROWSER &&
    new Audio("/correct.wav")) as HTMLAudioElement;
  const incorrectAudio = (IS_BROWSER &&
    new Audio("/incorrect.wav")) as HTMLAudioElement;

  async function fetchQuestion() {
    const res = await fetch("/api/question");
    const data = await res.json();
    setQuestion(data);
  }

  useEffect(() => {
    if (!question) {
      fetchQuestion();
    }
  }, [question]);

  function submit(event: SubmitEvent) {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    const answer = formData.get("answer") as string;
    setSelectedAnswer(answer);
    setSubmitted(true);
  }

  useEffect(() => {
    async function checkAnswer() {
      const res = await fetch("/api/question", {
        method: "POST",
        body: JSON.stringify({
          questionId: question?.id,
          answer: selectedAnswer,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      const answerResponse = await res.json() as QuestionPostResponse;
      if (answerResponse.streak) {
        setDisplayedStreak(answerResponse.streak.days);
      }
      setCorrect(answerResponse.correct);
    }
    if (submitted) {
      checkAnswer();
    }
  }, [submitted]);

  useEffect(() => {
    if (correct === true) {
      correctAudio?.play().catch((error) =>
        console.error("Failed to play sound:", error)
      );
    }
    if (correct === false) {
      incorrectAudio?.play().catch((error) =>
        console.error("Failed to play sound:", error)
      );
    }
  });

  function nextQuestion() {
    setCorrect(undefined);
    setSubmitted(undefined);
    setSelectedAnswer(undefined);
    setQuestion(undefined);
  }

  if (!question) {
    return (
      <div>
        <div class="flex justify-center max-w-md mx-auto p-6 border border-gray-300 rounded-lg font-sans">
          <div className="loading loading-spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div class="max-w-md mx-auto p-6 border border-gray-300 rounded-lg font-sans">
        <h1 class="text-center text-blue-500 text-2xl font-bold mb-4">
          {correct === undefined
            ? "Practice Question"
            : correct
            ? "✅ Correct!"
            : "❌ Wrong!"}
        </h1>

        <QuestionForm
          question={question}
          selectedAnswer={selectedAnswer}
          answered={answered}
          submit={submit}
          submitted={submitted}
        />

        {answered && (
          <Feedback
            correct={correct}
            explanation={question.explanation}
            nextQuestion={nextQuestion}
          />
        )}
      </div>
    </div>
  );
}

function QuestionForm(
  { question, selectedAnswer, answered, submit, submitted }: {
    question: Question;
    selectedAnswer?: string;
    answered: boolean;
    submit: (e: SubmitEvent) => void;
    submitted?: boolean;
  },
) {
  return (
    <form onSubmit={submit} class="flex flex-col gap-4">
      <input type="hidden" name="questionId" value={question.id} />
      <div class="text-lg mb-4">{question.question}</div>
      <div class="flex flex-col gap-2 w-full">
        {question.choices.map((choice, i) => {
          const isSelected = selectedAnswer === choice;
          const isDisabled = answered;

          return (
            <div class="form-control w-full">
              <label class="label cursor-pointer flex gap-2 items-start w-full">
                <input
                  type="radio"
                  class="radio mt-1"
                  value={choice}
                  name="answer"
                  required
                  checked={isSelected}
                  disabled={isDisabled}
                />
                <span class="label-text break-words whitespace-normal flex-1">
                  {choice}
                </span>
              </label>
            </div>
          );
        })}
      </div>

      {!answered && (
        <button disabled={submitted} type="submit" class="btn btn-primary">
          {submitted ? <div class="loading loading-spinner"></div> : "Submit"}
        </button>
      )}
    </form>
  );
}

function Feedback(
  { correct, explanation, nextQuestion }: {
    correct: boolean;
    explanation: string;
    nextQuestion: () => void;
  },
) {
  const color = correct ? "text-green-600" : "text-red-600";

  return (
    <div class="mt-6">
      <p class={`font-bold text-xl ${color}`}>
        {correct ? "🎉 Correct! Great job!" : "👎 Keep practicing!"}
      </p>
      <div class="mt-4">
        <p class="text-lg mb-4">
          <strong>Explanation:</strong> {explanation}
        </p>
        <button
          type="button"
          onClick={nextQuestion}
          class="py-3 px-6 bg-blue-700 text-white rounded-lg hover:bg-blue-800 text-xl"
        >
          Next Question →
        </button>
      </div>
    </div>
  );
}
