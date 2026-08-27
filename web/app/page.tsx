import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";

const FEATURES = [
  { icon: "⚡", title: "Semantic cache", desc: "Repeated questions answer instantly, zero tokens spent." },
  { icon: "◆", title: "Tier routing", desc: "Every prompt classified local/mid/premium before you pay for it." },
  { icon: "◎", title: "Bring your own key", desc: "Gemini, OpenAI or Anthropic — your key, your usage, your bill." },
  { icon: "▤", title: "Live dashboard", desc: "Requests, cache hit rate, tokens saved, all in real time." },
];

export default async function Home() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <main className="flex-1 flex flex-col items-center gap-16 px-6 py-24 text-center">
      <div className="space-y-4 max-w-xl">
        <h1 className="text-4xl font-bold">
          <span className="mb-accent">MegaBrain</span>
        </h1>
        <p className="text-lg opacity-90">
          Cuts your LLM token spend. Bring your own Gemini, OpenAI or Anthropic key — Gemini is free, no credit
          card required — and get a drop-in proxy with semantic cache and tier routing, watching your savings
          live.
        </p>

        <form
          action={async () => {
            "use server";
            await signIn("github", { redirectTo: "/dashboard" });
          }}
        >
          <button type="submit" className="mb-btn">
            Sign in with GitHub
          </button>
        </form>

        <p className="text-sm opacity-60 max-w-md mx-auto">
          Your API key is encrypted at rest and never leaves your account. MegaBrain only decides whether a
          call is worth making — it never stores your provider&apos;s raw responses beyond what&apos;s needed to
          serve cache hits.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl w-full text-left">
        {FEATURES.map((f) => (
          <div key={f.title} className="mb-card p-5">
            <div className="text-xl mb-2" style={{ color: "var(--orange)" }}>
              {f.icon}
            </div>
            <div className="font-semibold text-sm">{f.title}</div>
            <div className="text-sm opacity-60 mt-1">{f.desc}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
