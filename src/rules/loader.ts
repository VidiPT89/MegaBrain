import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Regras: ao contrário das skills (que só carregam por trigger), as regras
 * ficam sempre ativas e são sempre incluídas no prompt do agente.
 */
export function loadRules(rulesDir: string): string[] {
  if (!existsDir(rulesDir)) return [];
  return readdirSync(rulesDir)
    .filter((f) => f.endsWith(".md"))
    .map((file) => readFileSync(join(rulesDir, file), "utf-8").trim())
    .filter((content) => content.length > 0);
}

function existsDir(path: string): boolean {
  try {
    readdirSync(path);
    return true;
  } catch {
    return false;
  }
}
