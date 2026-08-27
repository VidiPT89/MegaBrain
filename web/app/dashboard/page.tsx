import { auth, signOut } from "@/auth";
import Link from "next/link";
import StatsClient from "./StatsClient";

export default async function DashboardPage() {
  const session = await auth();

  return (
    <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12 space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            <span className="mb-accent">MegaBrain</span>
          </h1>
          <p className="text-sm opacity-60">Signed in as {session?.user?.name ?? session?.user?.email}</p>
        </div>
        <div className="flex gap-3 items-center">
          <Link href="/settings" className="mb-pill">
            Settings
          </Link>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button type="submit" className="mb-pill">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <StatsClient />

      <div className="mb-card p-6 text-sm opacity-80 space-y-2">
        <p className="font-semibold opacity-100">Use it from your app</p>
        <p>
          Point your OpenAI or Anthropic SDK's <code>base_url</code> at this endpoint (send your MegaBrain
          session cookie, or use the API from a browser context signed in to this account):
        </p>
        <code className="block mb-card p-3 mt-2" style={{ borderStyle: "solid" }}>
          POST /api/v1/chat/completions · POST /api/v1/messages
        </code>
      </div>
    </main>
  );
}
