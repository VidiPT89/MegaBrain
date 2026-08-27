import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-8 px-6 py-24 text-center">
      <div className="space-y-4 max-w-xl">
        <h1 className="text-4xl font-bold">
          <span className="mb-accent">MegaBrain</span>
        </h1>
        <p className="text-lg opacity-90">
          Cuts your LLM token spend. Bring your own OpenAI or Anthropic key, get a drop-in proxy with semantic
          cache and tier routing, and watch your savings live.
        </p>
      </div>

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

      <p className="text-sm opacity-60 max-w-md">
        Your API key is encrypted at rest and never leaves your account. MegaBrain only decides whether a
        call is worth making — it never stores your provider's raw responses beyond what's needed to serve
        cache hits.
      </p>
    </main>
  );
}
