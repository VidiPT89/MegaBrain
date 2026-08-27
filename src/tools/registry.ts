import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export interface Tool {
  name: string;
  description: string;
  run: (args: Record<string, unknown>) => Promise<string>;
}

const MAX_OUTPUT = 4000;

function truncate(text: string): string {
  return text.length > MAX_OUTPUT ? text.slice(0, MAX_OUTPUT) + "\n...(truncado)" : text;
}

/** Ferramentas locais embutidas. Escrita e shell ficam dentro do diretório onde o comando corre. */
export function builtinTools(): Tool[] {
  const tools: Tool[] = [
    {
      name: "read_file",
      description: "Lê o conteúdo de um ficheiro de texto. Args: { path: string }",
      run: async (args) => {
        const path = resolve(String(args.path ?? ""));
        return truncate(readFileSync(path, "utf-8"));
      },
    },
    {
      name: "write_file",
      description: "Escreve texto num ficheiro (cria ou substitui). Args: { path: string, content: string }",
      run: async (args) => {
        const path = resolve(String(args.path ?? ""));
        writeFileSync(path, String(args.content ?? ""));
        return `Escrito em ${path}`;
      },
    },
    {
      name: "list_dir",
      description: "Lista ficheiros e pastas num diretório. Args: { path: string }",
      run: async (args) => {
        const path = resolve(String(args.path ?? "."));
        const entries = readdirSync(path).map((name) => {
          const isDir = statSync(resolve(path, name)).isDirectory();
          return isDir ? `${name}/` : name;
        });
        return truncate(entries.join("\n"));
      },
    },
  ];

  if (process.env.MEGABRAIN_ALLOW_SHELL === "true") {
    tools.push({
      name: "run_shell",
      description: "Corre um comando de shell local e devolve o output. Args: { command: string }",
      run: async (args) => {
        const { stdout, stderr } = await execAsync(String(args.command ?? ""), { timeout: 15000 });
        return truncate(stdout || stderr || "(sem output)");
      },
    });
  }

  return tools;
}

export function describeTools(tools: Tool[]): string {
  return tools.map((t) => `- ${t.name}: ${t.description}`).join("\n");
}

export function findTool(tools: Tool[], name: string): Tool | undefined {
  return tools.find((t) => t.name === name);
}
