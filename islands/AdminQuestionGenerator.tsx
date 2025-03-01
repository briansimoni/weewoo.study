import { useState } from "preact/hooks";
import { z } from "zod";

const defaultPrompt =
  "You are an expert EMT instructor. Generate ten multiple-choice questions for the NREMT exam. Each question should have a question, four answer choices, a correct answer, and an explanation, and category ('Airway, Respiration, and Ventilation', 'Cardiology and Resuscitation', 'Trauma', 'Medical and Obstetrics/Gynecology', 'EMS Operations'). Format as JSON. The choices should be in an array. Please do not provide any additional text as this will go into a database. Do not wrap the response in markdown.";

export default function AdminQuestionGenerator() {
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [schema, setSchema] = useState<string>(
    JSON.stringify(
      {
        type: "object",
        properties: {
          question: { type: "string" },
          answer: { type: "string" },
        },
        required: ["question", "answer"],
      },
      null,
      2,
    ),
  );
  const [output, setOutput] = useState("");
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);

  const handleGenerate = async () => {
    setLoadingGenerate(true);
    setError(null);
    setOutput("");
    setIsValid(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!response.ok) throw new Error("Failed to generate response");
      const data = await response.json();
      setOutput(JSON.stringify(data, null, 2));
      validateOutput(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoadingGenerate(false);
    }
  };

  const validateOutput = (data: unknown) => {
    try {
      const schemaObj = JSON.parse(schema);
      const zodSchema = z.object(
        Object.fromEntries(
          Object.entries(schemaObj.properties).map(([key, value]) => [
            key,
            (value as any).type === "string" ? z.string() : z.any(),
          ]),
        ),
      ).required(schemaObj.required);
      zodSchema.parse(data);
      setIsValid(true);
    } catch (err) {
      setIsValid(false);
      setError(err instanceof Error ? err.message : "Invalid schema or output");
    }
  };

  const handleSave = async () => {
    if (isValid !== true) {
      setError("Cannot save: Output is invalid against schema");
      return;
    }

    setLoadingSave(true);
    setError(null);

    try {
      const response = await fetch("/api/save-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: JSON.parse(output) }),
      });
      if (!response.ok) throw new Error("Failed to save question");
      const data = await response.json();
      alert("Question saved successfully: " + JSON.stringify(data));
      setPrompt(defaultPrompt);
      setOutput("");
      setIsValid(null);
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

        {/* Schema Input */}
        <div className="form-control">
          <label className="label">
            <span className="label-text text-xl font-semibold">
              JSON Schema
            </span>
          </label>
          <textarea
            className="textarea textarea-bordered textarea-lg h-40 w-full rounded-lg shadow-md font-mono text-sm resize-y"
            placeholder="Enter JSON schema..."
            value={schema}
            onInput={(e) => setSchema((e.target as HTMLTextAreaElement).value)}
          />
        </div>

        {/* Output Display */}
        <div className="form-control">
          <label className="label">
            <span className="label-text text-xl font-semibold">AI Output</span>
            <div className="flex items-center gap-2">
              {isValid === true && (
                <span className="badge badge-success badge-lg">Valid</span>
              )}
              {isValid === false && (
                <span className="badge badge-error badge-lg">Invalid</span>
              )}
            </div>
          </label>
          <textarea
            className="textarea textarea-bordered textarea-lg h-40 w-full rounded-lg shadow-md font-mono text-sm resize-y"
            value={output}
            readOnly
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
          disabled={loadingGenerate || !prompt || !schema}
        >
          Generate
        </button>
        <button
          className={`btn btn-success btn-lg ${loadingSave ? "loading" : ""}`}
          onClick={handleSave}
          disabled={loadingSave || !output || isValid !== true}
        >
          Save
        </button>
      </div>
    </div>
  );
}
