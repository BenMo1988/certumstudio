import { readFileSync, readdirSync } from "node:fs";

/** Evalsets en hun id-prefix. Tests lezen de exacte input uit case.md, zodat tests en evals niet uiteenlopen. */
const EVAL_DIRS: Record<string, string> = {
  CA: "evals/training-analysis/cases",
  PP: "evals/privacy-preflight/cases",
};

export function evalInput(id: string): string {
  const dir = EVAL_DIRS[id.slice(0, 2)];
  if (!dir) throw new Error(`Onbekende evalset voor ${id}`);
  const caseDir = readdirSync(dir).find((d) => d.startsWith(id + "-"));
  if (!caseDir) throw new Error(`Eval ${id} niet gevonden in ${dir}`);
  const md = readFileSync(`${dir}/${caseDir}/case.md`, "utf8").replace(/\r\n/g, "\n");
  const match = md.match(/```text\n([\s\S]*?)\n```/);
  if (!match) throw new Error(`Geen input-blok in ${id}`);
  return match[1];
}
