import { useEffect, useState } from "preact/hooks";
import { Question } from "../lib/question_store.ts";
import { IS_BROWSER } from "$fresh/runtime.ts";
import { setDisplayedStreak } from "./StreakIndicator.tsx";
import { QuestionPostResponse } from "../routes/api/question.ts";

export default function QuestionPage() {
  const [question, setQuestion] = useState<Question | undefined>();
  const [correct, setCorrect] = useState<boolean | undefined>();
  const [submitted, setSubmitted] = useState<boolean | undefined>();
  const [selectedAnswer, setSelectedAnswer] = useState<number | undefined>();
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
    // Convert string to number for API consumption
    const answerIndex = parseInt(answer, 10);
    setSelectedAnswer(answerIndex);
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
            questionId={question.id}
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
    selectedAnswer?: number;
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
        {question.choices.map((choice: string, i: number) => {
          const isSelected = selectedAnswer === i;
          const isDisabled = answered;

          return (
            <div class="form-control w-full">
              <label class="label cursor-pointer flex gap-2 items-start w-full">
                <input
                  type="radio"
                  class="radio mt-1"
                  value={i}
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
  { questionId, correct, explanation, nextQuestion }: {
    questionId: string;
    correct: boolean;
    explanation: string;
    nextQuestion: () => void;
  },
) {
  const color = correct ? "text-green-600" : "text-red-600";
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [feedbackType, setFeedbackType] = useState<"up" | "down" | null>(null);
  const [feedbackReason, setFeedbackReason] = useState("");

  const handleFeedback = (type: "up" | "down") => {
    setFeedbackType(type);
    setFeedbackReason(""); // Reset reason when opening modal
    setShowReasonModal(true);
  };

  const closeModal = () => {
    setShowReasonModal(false);
  };

  const submitFeedback = async () => {
    // Don't submit if we don't have a feedback type or if the reason is empty
    if (!feedbackType || !feedbackReason.trim()) {
      alert("Please provide a reason for your feedback");
      return;
    }

    try {
      const response = await fetch(`/api/question/reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          questionId: questionId,
          thumbs: feedbackType,
          reason: feedbackReason.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      // Feedback submitted successfully
      setFeedbackGiven(true);
      setShowReasonModal(false);
    } catch (error) {
      console.error("Failed to submit feedback:", error);
      alert("Failed to submit feedback. Please try again later.");
    }
  };

  return (
    <div class="mt-6">
      <p class={`font-bold text-xl ${color}`}>
        {correct ? "🎉 Correct! Great job!" : "🙃 Keep practicing!"}
      </p>
      <div class="mt-4">
        <p class="text-lg mb-4">
          <strong>Explanation:</strong> {explanation}
        </p>

        {/* Question Rating */}
        <div class="flex items-center gap-4 my-4">
          <div class="flex gap-3">
            <button
              type="button"
              onClick={() => handleFeedback("up")}
              disabled={feedbackGiven}
              class={`btn btn-circle btn-sm ${
                feedbackGiven ? "btn-disabled" : ""
              }`}
              aria-label="Thumbs up"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => handleFeedback("down")}
              disabled={feedbackGiven}
              class={`btn btn-circle btn-sm ${
                feedbackGiven ? "btn-disabled" : ""
              }`}
              aria-label="Thumbs down"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"
                />
              </svg>
            </button>
          </div>
          {feedbackGiven && (
            <span class="text-sm text-green-600">
              Thanks for your feedback!
            </span>
          )}
        </div>

        {/* Feedback Modal using DaisyUI */}
        <dialog
          id="question_feedback_modal"
          class={`modal ${showReasonModal ? "modal-open" : ""}`}
        >
          <div class="modal-box">
            <h3 class="font-bold text-lg">
              {feedbackType === "up"
                ? "What did you like about this question?"
                : "What issues did you find with this question?"}
            </h3>
            <textarea
              id="feedback_reason"
              class="textarea textarea-bordered w-full h-32 my-4"
              placeholder="Please provide details..."
              value={feedbackReason}
              onChange={(e) =>
                setFeedbackReason((e.target as HTMLTextAreaElement).value)}
            >
            </textarea>
            <div class="modal-action">
              <button
                type="button"
                class="btn btn-outline"
                onClick={closeModal}
              >
                Cancel
              </button>
              <button
                type="button"
                class="btn btn-primary"
                onClick={submitFeedback}
              >
                Submit
              </button>
            </div>
          </div>
          <form method="dialog" class="modal-backdrop">
            <button type="button" onClick={closeModal}>Close</button>
          </form>
        </dialog>

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
