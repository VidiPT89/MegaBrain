import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface Skill {
  name: string;
  triggers: string[];
  content: string;
  filePath: string;
}

function parseFrontmatter(raw: string): { triggers: string[]; body: string; name: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { triggers: [], body: raw, name: "unnamed" };
  }
  const [, frontmatter, body] = match;
  const nameMatch = frontmatter.match(/name:\s*(.+)/);
  const triggersMatch = frontmatter.match(/triggers:\s*\[(.*)\]/);
  const triggers = triggersMatch
    ? triggersMatch[1].split(",").map((t) => t.trim().replace(/^["']|["']$/g, "")).filter(Boolean)
    : [];
  return {
    name: nameMatch?.[1]?.trim() ?? "unnamed",
    triggers,
    body: body.trim(),
  };
}

/**
 * Carrega apenas os cabeçalhos (nome + triggers) de cada skill em disco,
 * sem ler o corpo todo para memória. O corpo só é lido quando a skill
 * é efetivamente selecionada, para poupar tokens/contexto.
 */
export function listSkills(skillsDir: string): Omit<Skill, "content">[] {
  if (!existsDir(skillsDir)) return [];
  return readdirSync(skillsDir)
    .filter((f) => f.endsWith(".md"))
    .map((file) => {
      const filePath = join(skillsDir, file);
      const raw = readFileSync(filePath, "utf-8");
      const { name, triggers } = parseFrontmatter(raw);
      return { name, triggers, filePath };
    });
}

export function loadSkillContent(filePath: string): string {
  const raw = readFileSync(filePath, "utf-8");
  return parseFrontmatter(raw).body;
}

/** Seleciona as skills cujos triggers aparecem no prompt do utilizador. */
export function matchSkills(skillsDir: string, prompt: string): Skill[] {
  const text = prompt.toLowerCase();
  return listSkills(skillsDir)
    .filter((skill) => skill.triggers.some((t) => text.includes(t.toLowerCase())))
    .map((skill) => ({ ...skill, content: loadSkillContent(skill.filePath) }));
}

function existsDir(path: string): boolean {
  try {
    readdirSync(path);
    return true;
  } catch {
    return false;
  }
}
