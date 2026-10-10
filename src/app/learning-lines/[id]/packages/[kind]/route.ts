import { connection } from "next/server";
import { StorageError, getDb } from "@/services/storage";
import { loadLearningLinePackages } from "../../../workflow/learning-lines";

/**
 * De afgeleide pakketten van een leerlijn als JSON: `certum`, `tom` of `skj`. Altijd uit de opgeslagen stand,
 * deterministisch; niets wordt opgeslagen of gelogd. Geen export of koppeling: alleen bekijken of bewaren.
 */
export async function GET(_request: Request, ctx: RouteContext<"/learning-lines/[id]/packages/[kind]">) {
  await connection();
  const { id, kind } = await ctx.params;
  if (kind !== "certum" && kind !== "tom" && kind !== "skj") return Response.json({ error: "unknown_package" }, { status: 404 });
  try {
    const packages = await loadLearningLinePackages(getDb(), id);
    if (!packages) return Response.json({ error: "not_found" }, { status: 404 });
    return Response.json(packages[kind], { headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof StorageError) return Response.json({ error: "persistence_error" }, { status: 503 });
    throw error;
  }
}
