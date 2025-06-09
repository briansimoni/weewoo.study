import { useSignal } from "preact/signals";
import { Question } from "../lib/question_store.ts";
import * as Icons from "../icons/index.ts";
import { useEffect } from "preact/hooks";

interface QuestionEditorProps {
  question: Question;
}

export default function QuestionEditor({ question }: QuestionEditorProps) {
  const showEditModal = useSignal(false);
  const isLoading = useSignal(false);
  const updateError = useSignal<string | null>(null);
  const updateSuccess = useSignal(false);

  // Form state
  const formData = useSignal<{
    question: string;
    choices: string[];
    correct_answer: number;
    explanation: string;
    category: string;
  }>({
    question: question.question,
    choices: [...question.choices],
    correct_answer: question.correct_answer,
    explanation: question.explanation,
    category: question.category,
  });

  // Close modal and reset states
  const closeModal = () => {
    showEditModal.value = false;
    updateError.value = null;
    updateSuccess.value = false;
  };

  // Handle form input changes
  const updateFormField = (field: string, value: string | number) => {
    formData.value = {
      ...formData.value,
      [field]: value,
    };
  };

  // Handle choice update
  const updateChoice = (index: number, value: string) => {
    const newChoices = [...formData.value.choices];
    newChoices[index] = value;
    formData.value = {
      ...formData.value,
      choices: newChoices,
    };
  };

  // Submit question update
  const handleSubmit = async (e: Event) => {
    e.preventDefault();

    try {
      isLoading.value = true;
      updateError.value = null;
      updateSuccess.value = false;

      const response = await fetch(`/api/admin/questions/${question.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: formData.value.question,
          choices: formData.value.choices,
          correct_answer: formData.value.correct_answer,
          explanation: formData.value.explanation,
          category: formData.value.category,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        updateError.value = result.error || "Failed to update question";
        return;
      }

      updateSuccess.value = true;
      
      // Get the updated question ID from the response
      const updatedQuestionId = result.id || question.id;
      
      // Redirect to the new question page after a short delay 
      // This handles cases where the question ID changes due to text modifications
      setTimeout(() => {
        globalThis.location.href = `/admin/questions/${updatedQuestionId}`;
      }, 1500);
    } catch (err) {
      updateError.value = err instanceof Error
        ? err.message
        : "An unexpected error occurred";
    } finally {
      isLoading.value = false;
    }
  };

  // Initialize event listener for the edit button
  useEffect(() => {
    const openEditModalBtn = document.getElementById("openEditModalBtn");
    if (openEditModalBtn) {
      openEditModalBtn.addEventListener("click", () => {
        showEditModal.value = true;
      });
    }

    return () => {
      if (openEditModalBtn) {
        openEditModalBtn.removeEventListener("click", () => {
          showEditModal.value = true;
        });
      }
    };
  }, []);

  return (
    <>
      {/* Edit Question Modal */}
      {showEditModal.value && (
        <div class="modal modal-open">
          <div class="modal-box max-w-3xl">
            <h3 class="font-bold text-lg flex items-center gap-2">
              <Icons.Edit className="w-5 h-5" />
              Edit Question
            </h3>

            {updateSuccess.value
              ? (
                <div class="alert alert-success mt-4">
                  <Icons.CheckCircle className="w-5 h-5" />
                  <span>Question updated successfully! Refreshing...</span>
                </div>
              )
              : (
                <form onSubmit={handleSubmit} class="mt-4">
                  {updateError.value && (
                    <div class="alert alert-error mb-4">
                      <Icons.AlertCircle className="w-5 h-5" />
                      <span>{updateError.value}</span>
                    </div>
                  )}

                  {/* Question Text */}
                  <div class="form-control mb-4">
                    <label class="label">
                      <span class="label-text font-medium">Question Text</span>
                    </label>
                    <textarea
                      class="textarea textarea-bordered h-24"
                      value={formData.value.question}
                      onInput={(e) =>
                        updateFormField(
                          "question",
                          (e.target as HTMLTextAreaElement).value,
                        )}
                      required
                    />
                  </div>

                  {/* Category */}
                  <div class="form-control mb-4">
                    <label class="label">
                      <span class="label-text font-medium">Category</span>
                    </label>
                    <input
                      type="text"
                      class="input input-bordered"
                      value={formData.value.category}
                      onInput={(e) =>
                        updateFormField(
                          "category",
                          (e.target as HTMLInputElement).value,
                        )}
                      required
                    />
                  </div>

                  {/* Answer Choices */}
                  <div class="mb-4">
                    <label class="label">
                      <span class="label-text font-medium">Answer Choices</span>
                    </label>

                    {formData.value.choices.map((
                      choice: string,
                      index: number,
                    ) => (
                      <div key={index} class="flex items-center gap-2 mb-2">
                        <div class="form-control">
                          <label class="label cursor-pointer">
                            <input
                              type="radio"
                              class="radio radio-primary"
                              name="correct_answer"
                              checked={formData.value.correct_answer === index}
                              onChange={() =>
                                updateFormField("correct_answer", index)}
                            />
                          </label>
                        </div>
                        <div class="badge badge-lg badge-outline">
                          {String.fromCharCode(65 + index)}
                        </div>
                        <input
                          type="text"
                          class="input input-bordered flex-1"
                          value={choice}
                          onInput={(e) =>
                            updateChoice(
                              index,
                              (e.target as HTMLInputElement).value,
                            )}
                          required
                        />
                      </div>
                    ))}

                    <div class="text-xs text-base-content/70 mt-1">
                      Select the radio button next to the correct answer.
                    </div>
                  </div>

                  {/* Explanation */}
                  <div class="form-control mb-4">
                    <label class="label">
                      <span class="label-text font-medium">Explanation</span>
                    </label>
                    <textarea
                      class="textarea textarea-bordered h-24"
                      value={formData.value.explanation}
                      onInput={(e) =>
                        updateFormField(
                          "explanation",
                          (e.target as HTMLTextAreaElement).value,
                        )}
                      required
                    />
                  </div>

                  <div class="modal-action">
                    <button
                      type="button"
                      class="btn btn-ghost"
                      onClick={closeModal}
                      disabled={isLoading.value}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      class={`btn btn-primary ${
                        isLoading.value ? "loading" : ""
                      }`}
                      disabled={isLoading.value}
                    >
                      {isLoading.value ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              )}
          </div>
          <div class="modal-backdrop" onClick={closeModal}></div>
        </div>
      )}
    </>
  );
}
