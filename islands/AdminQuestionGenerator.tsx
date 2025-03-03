import { useState } from "preact/hooks";
import { AdminCreateQuestionResponse } from "../routes/api/admin/question.ts";

const defaultPrompt =
  `Generate a a multiple choice question for the NREMT Basic exam. Please provide Format as JSON. Please do not provide any additional text as this will go into a database. Do not wrap the response in markdown. The question should comply with the following zod schema:
Zod.object({
  question: Zod.string().min(1),
  choices: Zod.array(Zod.string().min(1)),
  correct_answer: Zod.string().min(1),
  explanation: Zod.string().min(1),
  category: Zod.string(
    Zod.enum([
      "Airway management",
      "Oxygenation",
      "Ventilation",
      "Respiratory emergencies",
      "Basic cardiac life support (BLS)",
      "Automated External Defibrillator (AED) use",
      "Cardiac emergencies",
      "Bleeding control",
      "Shock management",
      "Soft tissue injuries",
      "Musculoskeletal injuries",
      "Head, neck, and spinal injuries",
      "Neurological emergencies (e.g., strokes, seizures)",
      "Endocrine disorders (e.g., diabetes emergencies)",
      "Toxicology (e.g., overdoses, poisoning)",
      "Abdominal and gastrointestinal emergencies",
      "Allergic reactions and anaphylaxis",
      "Obstetrics and childbirth emergencies",
      "Scene safety and management",
      "Mass casualty incidents (MCI) and triage",
      "Ambulance operations",
      "Hazardous materials (HAZMAT) awareness",
    ]),
  ),
});


`;
// "You are an expert EMT instructor. Generate a multiple-choice questions for the NREMT exam. The question should have a question, four answer choices, a correct answer, and an explanation, and category ('Airway, Respiration, and Ventilation', 'Cardiology and Resuscitation', 'Trauma', 'Medical and Obstetrics/Gynecology', 'EMS Operations'). Format as JSON. The choices should be in an array. Please do not provide any additional text as this will go into a database. Do not wrap the response in markdown.";

export default function AdminQuestionGenerator() {
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [question, setQuestion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);

  const handleGenerate = async () => {
    setLoadingGenerate(true);
    setError(null);
    setQuestion("");

    try {
      const encodedPrompt = encodeURIComponent(prompt);
      const response = await fetch(
        `/api/admin/question?prompt=${encodedPrompt}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        },
      );
      if (!response.ok) throw new Error("Failed to generate response");
      const data = await response.json();
      setQuestion(JSON.stringify(data, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoadingGenerate(false);
    }
  };

  const handleSave = async () => {
    setLoadingSave(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: question,
      });
      if (!response.ok) throw new Error("Failed to save question");
      const data = await response.json() as AdminCreateQuestionResponse;
      alert("Question saved successfully: " + JSON.stringify(data));
      setQuestion("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoadingSave(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl mb-25">
      <h1 className="text-4xl font-bold mb-8 text-center text-primary">
        Admin Question Generator
      </h1>

      <div className="grid gap-6 grid-cols-1">
        {/* Prompt Input */}
        <div className="form-control">
          <label className="label">
            <span className="label-text text-xl font-semibold">Prompt</span>
          </label>
          <textarea
            className="textarea textarea-bordered textarea-lg h-40 w-full rounded-lg shadow-md resize-y"
            placeholder="Enter your AI prompt here..."
            value={prompt}
            onInput={(e) => setPrompt((e.target as HTMLTextAreaElement).value)}
          />
        </div>

        {/* Output Display */}
        <div className="form-control">
          <label className="label">
            <span className="label-text text-xl font-semibold">AI Output</span>
          </label>
          <textarea
            className="textarea textarea-bordered textarea-lg h-40 w-full rounded-lg shadow-md font-mono text-sm resize-y"
            value={question}
            onInput={(e) =>
              setQuestion((e.target as HTMLTextAreaElement).value)}
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="alert alert-error mt-6 shadow-lg">
          <span>{error}</span>
        </div>
      )}

      {/* Buttons */}
      <div className="mt-6 flex justify-end gap-4">
        <button
          className={`btn btn-primary btn-lg ${
            loadingGenerate ? "loading" : ""
          }`}
          onClick={handleGenerate}
          disabled={loadingGenerate || !prompt}
        >
          Generate
        </button>
        <button
          className={`btn btn-success btn-lg ${loadingSave ? "loading" : ""}`}
          onClick={handleSave}
          disabled={loadingSave || !question}
        >
          Save
        </button>
      </div>
    </div>
  );
}
