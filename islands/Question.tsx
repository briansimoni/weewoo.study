import { useEffect, useState } from "preact/hooks";
import { Question } from "../lib/question_store.ts";
import { IS_BROWSER } from "fresh/runtime";
import { setDisplayedStreak } from "./StreakIndicator.tsx";
import { QuestionPostResponse } from "../routes/api/question.ts";
import { ThumbsDown, ThumbsUp } from "lucide-preact";
import { Button } from "../components/ui/Button.tsx";
import { Card } from "../components/ui/Card.tsx";
import { Modal } from "../components/ui/Modal.tsx";
import { showToast } from "../components/ui/toast.ts";

interface QuestionPageProps {
  onQuestionCompleted?: () => unknown;
}

export default function QuestionPage(props: QuestionPageProps) {
  const [question, setQuestion] = useState<
    Question & { timestamp_started: string } | undefined
  >();
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
    props.onQuestionCompleted?.();
  }

  useEffect(() => {
    async function checkAnswer() {
      const res = await fetch("/api/question", {
        method: "POST",
        body: JSON.stringify({
          questionId: question?.id,
          answer: selectedAnswer,
          timestamp_started: question?.timestamp_started,
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
      <Card class="max-w-md mx-auto" bodyClass="items-center">
        <div class="loading loading-spinner"></div>
      </Card>
    );
  }

  return (
    <Card class="max-w-md mx-auto">
      <h1 class="text-primary text-2xl font-bold mb-4">
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
    </Card>
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

      {!answered && <Button type="submit" loading={submitted}>Submit</Button>}
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
  const color = correct ? "text-success" : "text-error";
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [feedbackType, setFeedbackType] = useState<"up" | "down" | null>(null);
  const [feedbackReason, setFeedbackReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFeedback = (type: "up" | "down") => {
    setFeedbackType(type);
    setFeedbackReason(""); // Reset reason when opening modal
    setShowReasonModal(true);
  };

  const closeModal = () => {
    setShowReasonModal(false);
  };

  const submitFeedback = async () => {
    // Submit stays disabled until there's a reason
    if (!feedbackType || !feedbackReason.trim() || loading) {
      return;
    }

    setLoading(true);

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
      setLoading(false);
    } catch (error) {
      setLoading(false);
      console.error("Failed to submit feedback:", error);
      showToast("Couldn't send your feedback. Please try again later.", {
        tone: "error",
      });
    }
  };

  return (
    <div class="mt-6">
      <p class={`font-bold text-xl ${color}`}>
        {correct ? "🎉 Correct! Great job!" : "💩 Keep practicing!"}
      </p>
      <div class="mt-4">
        <p class="text-lg mb-4">
          <strong>Explanation:</strong> {explanation}
        </p>

        {/* Question Rating */}
        <div class="flex items-center gap-4 my-4">
          <div class="flex gap-3">
            <Button
              variant="neutral"
              size="sm"
              shape="circle"
              onClick={() => handleFeedback("up")}
              disabled={feedbackGiven}
              aria-label="Thumbs up"
            >
              <ThumbsUp class="h-5 w-5" />
            </Button>
            <Button
              variant="neutral"
              size="sm"
              shape="circle"
              onClick={() => handleFeedback("down")}
              disabled={feedbackGiven}
              aria-label="Thumbs down"
            >
              <ThumbsDown class="h-5 w-5" />
            </Button>
          </div>
          {feedbackGiven && (
            <span class="text-sm text-success">
              Thanks for your feedback!
            </span>
          )}
        </div>

        <Modal
          open={showReasonModal}
          onClose={closeModal}
          title={feedbackType === "up"
            ? "What did you like about this question?"
            : "What issues did you find with this question?"}
          actions={
            <>
              <Button variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button
                loading={loading}
                disabled={!feedbackReason.trim()}
                onClick={submitFeedback}
              >
                Submit
              </Button>
            </>
          }
        >
          <textarea
            class="textarea textarea-bordered w-full h-32 my-4"
            aria-label="Feedback"
            placeholder="Please provide details..."
            value={feedbackReason}
            onInput={(e) => setFeedbackReason(e.currentTarget.value)}
          >
          </textarea>
        </Modal>

        <Button size="lg" onClick={nextQuestion}>
          Next Question →
        </Button>
      </div>
    </div>
  );
}
