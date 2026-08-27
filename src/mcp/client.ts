import { spawn, ChildProcessWithoutNullStreams } from "node:child_process";

export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: unknown;
}

interface JsonRpcResponse {
  id: number;
  result?: unknown;
  error?: { message: string };
}

/**
 * Cliente MCP mínimo, transporte stdio (spawn de processo local), sem SDK
 * externo. Implementa só o essencial: initialize, tools/list, tools/call.
 * Servidores MCP reais (ex. servidores oficiais em Node/Python) que falem
 * JSON-RPC 2.0 por linha em stdout funcionam com isto.
 */
export class McpClient {
  private process: ChildProcessWithoutNullStreams;
  private nextId = 1;
  private pending = new Map<number, (res: JsonRpcResponse) => void>();
  private buffer = "";

  private constructor(process: ChildProcessWithoutNullStreams) {
    this.process = process;
    this.process.stdout.on("data", (chunk: Buffer) => this.onData(chunk));
  }

  static async connect(command: string, args: string[] = []): Promise<McpClient> {
    const child = spawn(command, args, { stdio: ["pipe", "pipe", "pipe"] });
    const client = new McpClient(child);
    await client.request("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "megabrain", version: "0.1.0" },
    });
    return client;
  }

  private onData(chunk: Buffer): void {
    this.buffer += chunk.toString("utf-8");
    let newlineIndex: number;
    while ((newlineIndex = this.buffer.indexOf("\n")) !== -1) {
      const line = this.buffer.slice(0, newlineIndex).trim();
      this.buffer = this.buffer.slice(newlineIndex + 1);
      if (!line) continue;
      try {
        const message = JSON.parse(line) as JsonRpcResponse;
        this.pending.get(message.id)?.(message);
        this.pending.delete(message.id);
      } catch {
        // linha não-JSON (logs do servidor) — ignora
      }
    }
  }

  private request(method: string, params: unknown): Promise<unknown> {
    const id = this.nextId++;
    const payload = JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n";
    return new Promise((resolve, reject) => {
      this.pending.set(id, (res) => {
        if (res.error) reject(new Error(res.error.message));
        else resolve(res.result);
      });
      this.process.stdin.write(payload);
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`MCP request "${method}" excedeu o tempo limite`));
        }
      }, 10000);
    });
  }

  async listTools(): Promise<McpTool[]> {
    const result = (await this.request("tools/list", {})) as { tools?: McpTool[] };
    return result.tools ?? [];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<string> {
    const result = (await this.request("tools/call", { name, arguments: args })) as {
      content?: { type: string; text?: string }[];
    };
    return (result.content ?? [])
      .filter((block) => block.type === "text" && block.text)
      .map((block) => block.text)
      .join("\n");
  }

  close(): void {
    this.process.kill();
  }
}

/** Lê MEGABRAIN_MCP_SERVERS=nome1:comando arg1 arg2;nome2:comando ... e liga a cada servidor. */
export async function connectConfiguredMcpServers(): Promise<{ name: string; client: McpClient }[]> {
  const spec = process.env.MEGABRAIN_MCP_SERVERS;
  if (!spec) return [];

  const connections: { name: string; client: McpClient }[] = [];
  for (const entry of spec.split(";").map((s) => s.trim()).filter(Boolean)) {
    const [name, commandLine] = entry.split(":").map((s) => s.trim());
    const [command, ...args] = commandLine.split(/\s+/);
    try {
      const client = await McpClient.connect(command, args);
      connections.push({ name, client });
    } catch (err) {
      console.warn(`MCP: falha ao ligar a "${name}": ${(err as Error).message}`);
    }
  }
  return connections;
}
