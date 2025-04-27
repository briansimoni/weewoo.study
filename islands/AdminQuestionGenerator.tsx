import { useState, useEffect } from "preact/hooks";
import { AdminCreateQuestionResponse } from "../routes/api/admin/question.ts";

interface Chapter {
  id: string;
  filename: string;
  title: string;
}

const defaultPrompt =
  `Generate a multiple choice question for the NREMT Basic exam. Please provide Format as JSON. Please do not provide any additional text as this will go into a database. Do not wrap the response in markdown. The question should comply with the following zod schema:
Zod.object({
  question: Zod.string().min(1),
  choices: Zod.array(Zod.string().min(1)),
  correct_answer: Zod.string().min(1),
  explanation: Zod.string().min(1),
  category: Zod.string(
    Zod.enum([
      "EMS Systems",
      "Workforce Safety and Wellness",
      "Medical, Legal, and Ethical Issues",
      "Communications and Documentation",
      "Medical Terminology",
      "The Human Body",
      "Life Span Development",
      "Lifting and Moving Patients",
      "The Team Approach to Health Care",
      "Patient Assessment",
      "Airway Management",
      "Principles of Pharmacology",
      "Shock",
      "BLS Resuscitation",
      "Medical Overview",
      "Respiratory Emergencies",
      "Cardiovascular Emergencies",
      "Neurologic Emergencies",
      "Gastrointestinal and Urologic Emergencies",
      "Endocrine and Hematologic Emergencies",
      "Allergy and Anaphylaxis",
      "Toxicology",
      "Behavioral Health Emergencies",
      "Gynecologic Emergencies",
      "Trauma Overview",
      "Bleeding",
      "Soft-Tissue Injuries",
      "Face and Neck Injuries",
      "Head and Spine Injuries",
      "Chest Injuries",
      "Abdominal and Genitourinary Injuries",
      "Orthopaedic Injuries",
      "Environmental Emergencies",
      "Obstetrics and Neonatal Care",
      "Pediatric Emergencies",
      "Geriatric Emergencies",
      "Patients With Special Challenges",
      "Transport Operations",
      "Vehicle Extrication and Special Rescue",
      "Incident Management",
      "Terrorism Response and Disaster Management",
    ]),
  ),
});


`;

export default function AdminQuestionGenerator() {
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [question, setQuestion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<string>("");
  const [loadingChapters, setLoadingChapters] = useState(false);

  // Load chapters on component mount
  useEffect(() => {
    loadChapters();
  }, []);

  const loadChapters = async () => {
    setLoadingChapters(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/chapters');
      if (!response.ok) throw new Error("Failed to load chapters");
      const data = await response.json();
      setChapters(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load chapters");
    } finally {
      setLoadingChapters(false);
    }
  };

  const handleGenerate = async () => {
    setLoadingGenerate(true);
    setError(null);
    setQuestion("");

    try {
      // Build URL with parameters
      const params = new URLSearchParams();
      params.append('prompt', prompt);
      
      if (selectedChapter) {
        params.append('chapterId', selectedChapter);
      }
      
      const response = await fetch(
        `/api/admin/question?${params.toString()}`,
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
        {/* Chapter Selection */}
        <div className="form-control">
          <label className="label">
            <span className="label-text text-xl font-semibold">Select Chapter Reference</span>
          </label>
          <div className="flex items-center gap-4">
            <select 
              className="select select-bordered w-full rounded-lg shadow-md"
              value={selectedChapter}
              onChange={(e) => setSelectedChapter((e.target as HTMLSelectElement).value)}
              disabled={loadingChapters}
            >
              <option value="">No chapter reference (use general knowledge)</option>
              {chapters.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  Chapter {chapter.id}: {chapter.title}
                </option>
              ))}
            </select>
            {loadingChapters && (
              <span className="loading loading-spinner loading-md"></span>
            )}
          </div>
          <div className="mt-2 text-sm">
            {selectedChapter ? (
              <span className="text-success">Questions will be generated using content from Chapter {selectedChapter}</span>
            ) : (
              <span className="text-info">No specific chapter selected. Questions will be based on general knowledge.</span>
            )}
          </div>
        </div>
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
          type="button"
          className={`btn btn-primary btn-lg ${
            loadingGenerate ? "loading" : ""
          }`}
          onClick={handleGenerate}
          disabled={loadingGenerate || !prompt}
        >
          Generate
        </button>
        <button
          type="button"
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
