import { createServer } from "node:http";
import { join } from "node:path";
import { homedir } from "node:os";
import { StatsTracker } from "../stats/tracker.js";
import { renderDashboard } from "./page.js";

export function startDashboard(port: number) {
  const stats = new StatsTracker(join(homedir(), ".megabrain", "stats.json"));
  const html = renderDashboard();

  const server = createServer((req, res) => {
    if (req.url === "/api/stats") {
      const body = JSON.stringify(stats.snapshot());
      res.writeHead(200, { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) });
      res.end(body);
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
  });

  server.listen(port, () => {
    console.log(`MegaBrain dashboard: http://localhost:${port}`);
  });

  return server;
}
