import { useEffect, useState } from "preact/hooks";
import QuestionPage from "./Question.tsx";

interface TrialQuestionsProps {
  trial_questions_completed: boolean;
}

export default function TrialQuestions(props: TrialQuestionsProps) {
  const [questionsCompleted, setQuestionsCompleted] = useState(0);
  const [trialQuestionsCompleted, setTrialQuestionsCompleted] = useState(
    props.trial_questions_completed,
  );
  useEffect(() => {
    if (questionsCompleted >= 5) {
      fetch("/api/preferences", {
        method: "POST",
        body: JSON.stringify({
          trial_questions_completed: true,
        }),
      });
      setTrialQuestionsCompleted(true);
    }
  }, [questionsCompleted]);

  if (questionsCompleted >= 900 || trialQuestionsCompleted) {
    return (
      <div className="flex items-center justify-center px-4">
        <div className="card w-full max-w-md bg-base-100 shadow-xl p-6">
          <div className="card-body items-center">
            <h2 className="card-title text-2xl font-bold mb-2">
              Thanks for trying it out! 🎉
            </h2>
            <p className="mb-6 text-base-content/80">
              You've completed your trial questions. Log in to get unlimited
              practice questions.
              <span className="block mt-1 font-medium">It's always free!</span>
            </p>
            <div className="card-actions">
              <a
                href="/auth/login"
                className="btn btn-primary btn-wide text-lg"
              >
                Continue with Login
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <QuestionPage
      onQuestionCompleted={() => setQuestionsCompleted(questionsCompleted + 1)}
    />
  );
}
