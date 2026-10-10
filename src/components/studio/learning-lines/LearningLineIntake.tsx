"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { startLearningLineAction } from "@/app/learning-lines/workflow/actions";
import { SYNTHETIC_DATA_ATTESTATION } from "@/modules/governance";
import { learningLineError } from "./messages";

/*
 * Eén prompt → leerlijn. Mobiel bruikbaar: één groot veld, één bevestiging, één knop. De server voert de Privacy
 * Preflight en de synthetic_only-regel uit (geen hashing in de browser nodig, dus ook bruikbaar via het lokale netwerk).
 */

const EXAMPLE = "Ontwikkel een leerlijn voor jeugd- en gezinsprofessionals over professioneel begrenzen onder druk.";

export function LearningLineIntake() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [attested, setAttested] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () =>
    startTransition(async () => {
      setError(null);
      const result = await startLearningLineAction(prompt, attested);
      if (result.status === "created") {
        router.push(`/learning-lines/${result.learningLineId}`);
        return;
      }
      setError(learningLineError(result));
    });

  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-sm font-medium text-petrol-600">Leerlijn Engine</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Nieuwe leerlijn</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-muted">
        Beschrijf in één zin voor wie en waarover. Certum ontwerpt exact zes modules volgens de Certum-methodiek, met
        oplopende moeilijkheid. Daarna beoordeel je het ontwerp (Gate 1).
      </p>

      <label htmlFor="learning-line-prompt" className="mt-8 block text-sm font-medium text-ink">
        Leerlijnprompt
      </label>
      <textarea
        id="learning-line-prompt"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        maxLength={4000}
        rows={6}
        placeholder={EXAMPLE}
        className="mt-2 w-full rounded-md border border-line bg-canvas px-3 py-3 text-base text-ink focus:border-petrol-600 focus:outline-none"
      />

      <label className="mt-4 flex items-start gap-3 text-sm text-ink">
        <input type="checkbox" checked={attested} onChange={(e) => setAttested(e.target.checked)} className="mt-1 size-5 shrink-0" />
        <span>{SYNTHETIC_DATA_ATTESTATION}</span>
      </label>

      {error && (
        <p role="alert" className="mt-4 whitespace-pre-line rounded-md border border-danger/30 bg-danger-50 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={pending || !prompt.trim() || !attested}
        className="mt-6 h-12 w-full rounded-md bg-petrol-700 px-4 text-base font-medium text-white hover:bg-petrol-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {pending ? "Leerlijn wordt ontworpen…" : "Leerlijn ontwikkelen"}
      </button>
    </div>
  );
}
