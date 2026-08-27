import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { sql } from "./lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub],
  callbacks: {
    async jwt({ token, profile }) {
      if (profile) {
        token.userId = String(profile.id);
        token.login = (profile as { login?: string }).login;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.userId as string;
      }
      return session;
    },
    async signIn({ profile }) {
      if (!profile) return false;
      const db = sql();
      const githubProfile = profile as unknown as { id: number; login: string; name?: string; email?: string };
      await db`
        INSERT INTO users (id, github_login, name, email)
        VALUES (${String(githubProfile.id)}, ${githubProfile.login}, ${githubProfile.name ?? null}, ${githubProfile.email ?? null})
        ON CONFLICT (id) DO UPDATE SET github_login = ${githubProfile.login}, name = ${githubProfile.name ?? null}
      `;
      return true;
    },
  },
});
