export function renderDashboard(): string {
  return `<!doctype html>
<html lang="pt">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>MegaBrain</title>
<style>
  :root {
    --bg: #0a0806;
    --paper: #14100c;
    --ink: #f3ece3;
    --muted: #a89a8a;
    --border: #2a221a;
    --orange: #e0651a;
    --orange-dim: #8a3d10;
    --amber: #f2ac2b;
    --glow: rgba(224, 101, 26, 0.35);
  }
  [data-theme="light"] {
    --bg: #faf3e8;
    --paper: #fffaf2;
    --ink: #201509;
    --muted: #7a6a56;
    --border: #ecdcc4;
    --orange: #c2410c;
    --orange-dim: #f4b98a;
    --amber: #b5750f;
    --glow: rgba(194, 65, 12, 0.18);
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    background: var(--bg);
    color: var(--ink);
    font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
    transition: background 0.4s ease, color 0.4s ease;
    overflow-x: hidden;
  }
  .glow {
    position: fixed;
    inset: -20% -10% auto -10%;
    height: 60vh;
    background: radial-gradient(ellipse at top, var(--glow), transparent 70%);
    pointer-events: none;
    z-index: 0;
    animation: pulse 6s ease-in-out infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 0.7; transform: translateY(0); }
    50% { opacity: 1; transform: translateY(10px); }
  }
  header {
    position: relative;
    z-index: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 28px 40px;
    border-bottom: 1px solid var(--border);
  }
  .brand { display: flex; align-items: center; gap: 12px; }
  .brand-mark {
    width: 38px; height: 38px; border-radius: 10px;
    background: linear-gradient(135deg, var(--orange), var(--amber));
    box-shadow: 0 0 24px var(--glow);
    animation: spin 12s linear infinite;
  }
  @keyframes spin { from { filter: hue-rotate(0deg); } to { filter: hue-rotate(20deg); } }
  .brand h1 { margin: 0; font-size: 22px; letter-spacing: 0.5px; }
  .brand span { color: var(--muted); font-size: 13px; display: block; margin-top: 2px; }
  .controls { display: flex; gap: 10px; }
  .pill {
    border: 1px solid var(--border);
    background: var(--paper);
    color: var(--ink);
    padding: 8px 16px;
    border-radius: 999px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    transition: transform 0.15s ease, border-color 0.2s ease;
  }
  .pill:hover { border-color: var(--orange); transform: translateY(-1px); }
  main {
    position: relative;
    z-index: 1;
    max-width: 980px;
    margin: 0 auto;
    padding: 48px 24px 80px;
  }
  .hero { text-align: center; margin-bottom: 48px; opacity: 0; animation: rise 0.7s ease forwards; }
  @keyframes rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
  .hero h2 { font-size: 32px; margin: 0 0 10px; }
  .hero p { color: var(--muted); max-width: 560px; margin: 0 auto; line-height: 1.6; }
  .accent { background: linear-gradient(90deg, var(--orange), var(--amber)); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 18px; margin-bottom: 40px; }
  .card {
    background: var(--paper);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 22px;
    opacity: 0; transform: translateY(16px);
    animation: rise 0.6s ease forwards;
  }
  .card:nth-child(1) { animation-delay: 0.05s; }
  .card:nth-child(2) { animation-delay: 0.15s; }
  .card:nth-child(3) { animation-delay: 0.25s; }
  .card:nth-child(4) { animation-delay: 0.35s; }
  .card .label { color: var(--muted); font-size: 13px; text-transform: uppercase; letter-spacing: 0.6px; }
  .card .value { font-size: 34px; font-weight: 700; margin-top: 8px; color: var(--orange); }
  .panel {
    background: var(--paper);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 26px;
    opacity: 0; animation: rise 0.6s ease 0.4s forwards;
  }
  .panel h3 { margin-top: 0; }
  .bar-row { display: flex; align-items: center; gap: 12px; margin: 14px 0; }
  .bar-row .tag { width: 90px; font-size: 13px; color: var(--muted); text-transform: capitalize; }
  .bar-track { flex: 1; height: 10px; background: var(--border); border-radius: 6px; overflow: hidden; }
  .bar-fill { height: 100%; width: 0%; border-radius: 6px; background: linear-gradient(90deg, var(--orange), var(--amber)); transition: width 0.6s ease; }
  .bar-row .count { width: 36px; text-align: right; font-size: 13px; color: var(--muted); }
  footer {
    position: relative; z-index: 1;
    text-align: center; padding: 30px 24px 50px;
    color: var(--muted); font-size: 13px;
  }
  footer a { color: var(--orange); text-decoration: none; font-weight: 600; }
  footer a:hover { text-decoration: underline; }
</style>
</head>
<body>
  <div class="glow"></div>
  <header>
    <div class="brand">
      <div class="brand-mark"></div>
      <div>
        <h1>MegaBrain</h1>
        <span data-i18n="tagline">A poupar tokens desde já</span>
      </div>
    </div>
    <div class="controls">
      <button class="pill" id="lang-toggle">PT / EN</button>
      <button class="pill" id="theme-toggle">☀ / ☾</button>
    </div>
  </header>

  <main>
    <section class="hero">
      <h2><span class="accent" data-i18n="heroTitle">Cada token poupado conta</span></h2>
      <p data-i18n="heroSubtitle">Cache semântico, roteamento por tier e um proxy compatível com OpenAI/Anthropic — a decidir se vale a pena chamar um modelo antes de gastares um único token.</p>
    </section>

    <section class="grid">
      <div class="card">
        <div class="label" data-i18n="totalRequests">Pedidos totais</div>
        <div class="value" id="stat-total">0</div>
      </div>
      <div class="card">
        <div class="label" data-i18n="cacheHits">Cache hits</div>
        <div class="value" id="stat-hits">0</div>
      </div>
      <div class="card">
        <div class="label" data-i18n="hitRate">Taxa de acerto</div>
        <div class="value" id="stat-rate">0%</div>
      </div>
      <div class="card">
        <div class="label" data-i18n="tokensSaved">Tokens poupados</div>
        <div class="value" id="stat-tokens">0</div>
      </div>
    </section>

    <section class="panel">
      <h3 data-i18n="tierTitle">Distribuição por tier</h3>
      <div class="bar-row">
        <div class="tag">local</div>
        <div class="bar-track"><div class="bar-fill" id="bar-local"></div></div>
        <div class="count" id="count-local">0</div>
      </div>
      <div class="bar-row">
        <div class="tag">mid</div>
        <div class="bar-track"><div class="bar-fill" id="bar-mid"></div></div>
        <div class="count" id="count-mid">0</div>
      </div>
      <div class="bar-row">
        <div class="tag">premium</div>
        <div class="bar-track"><div class="bar-fill" id="bar-premium"></div></div>
        <div class="count" id="count-premium">0</div>
      </div>
    </section>
  </main>

  <footer>
    <div data-i18n="footerCredit">Developed by David Arsénio Martins</div>
    <div style="margin-top:6px;">
      <a href="https://ividi.dev/" target="_blank" rel="noopener">ividi.dev</a>
      &nbsp;·&nbsp;
      <a href="https://github.com/VidiPT89/" target="_blank" rel="noopener">github.com/VidiPT89</a>
    </div>
  </footer>

<script>
  const dict = {
    pt: {
      tagline: "A poupar tokens desde já",
      heroTitle: "Cada token poupado conta",
      heroSubtitle: "Cache semântico, roteamento por tier e um proxy compatível com OpenAI/Anthropic — a decidir se vale a pena chamar um modelo antes de gastares um único token.",
      totalRequests: "Pedidos totais",
      cacheHits: "Cache hits",
      hitRate: "Taxa de acerto",
      tokensSaved: "Tokens poupados",
      tierTitle: "Distribuição por tier",
      footerCredit: "Developed by David Arsénio Martins",
    },
    en: {
      tagline: "Saving tokens as we speak",
      heroTitle: "Every saved token counts",
      heroSubtitle: "Semantic cache, tier routing and a drop-in OpenAI/Anthropic-compatible proxy — deciding if a model call is worth it before you spend a single token.",
      totalRequests: "Total requests",
      cacheHits: "Cache hits",
      hitRate: "Hit rate",
      tokensSaved: "Tokens saved",
      tierTitle: "Tier distribution",
      footerCredit: "Developed by David Arsénio Martins",
    },
  };

  let lang = localStorage.getItem("megabrain-lang") || "pt";
  let theme = localStorage.getItem("megabrain-theme") || "dark";

  function applyLang() {
    document.documentElement.lang = lang === "pt" ? "pt-PT" : "en";
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (dict[lang][key]) el.textContent = dict[lang][key];
    });
  }

  function applyTheme() {
    if (theme === "light") document.documentElement.setAttribute("data-theme", "light");
    else document.documentElement.removeAttribute("data-theme");
  }

  document.getElementById("lang-toggle").addEventListener("click", () => {
    lang = lang === "pt" ? "en" : "pt";
    localStorage.setItem("megabrain-lang", lang);
    applyLang();
  });

  document.getElementById("theme-toggle").addEventListener("click", () => {
    theme = theme === "dark" ? "light" : "dark";
    localStorage.setItem("megabrain-theme", theme);
    applyTheme();
  });

  applyLang();
  applyTheme();

  function animateNumber(el, target) {
    const start = Number(el.dataset.value || 0);
    const duration = 500;
    const startTime = performance.now();
    function step(now) {
      const progress = Math.min(1, (now - startTime) / duration);
      const value = Math.round(start + (target - start) * progress);
      el.textContent = value.toLocaleString();
      if (progress < 1) requestAnimationFrame(step);
      else el.dataset.value = target;
    }
    requestAnimationFrame(step);
  }

  async function refresh() {
    try {
      const res = await fetch("/api/stats");
      const data = await res.json();
      const total = data.totalRequests || 0;
      const hits = data.cacheHits || 0;
      const rate = total > 0 ? Math.round((hits / total) * 100) : 0;
      const tokens = data.tokensSavedEstimate || 0;
      const tiers = data.tierCounts || { local: 0, mid: 0, premium: 0 };
      const maxTier = Math.max(1, tiers.local || 0, tiers.mid || 0, tiers.premium || 0);

      animateNumber(document.getElementById("stat-total"), total);
      animateNumber(document.getElementById("stat-hits"), hits);
      document.getElementById("stat-rate").textContent = rate + "%";
      animateNumber(document.getElementById("stat-tokens"), tokens);

      document.getElementById("bar-local").style.width = ((tiers.local || 0) / maxTier) * 100 + "%";
      document.getElementById("bar-mid").style.width = ((tiers.mid || 0) / maxTier) * 100 + "%";
      document.getElementById("bar-premium").style.width = ((tiers.premium || 0) / maxTier) * 100 + "%";
      document.getElementById("count-local").textContent = tiers.local || 0;
      document.getElementById("count-mid").textContent = tiers.mid || 0;
      document.getElementById("count-premium").textContent = tiers.premium || 0;
    } catch (err) {
      console.error("megabrain dashboard fetch failed", err);
    }
  }

  refresh();
  setInterval(refresh, 3000);
</script>
</body>
</html>`;
}
