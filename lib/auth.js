// lib/auth.js — CofiBakuPromo
// NextAuth.js configuration with Google OAuth provider.
// Each Google user gets an isolated dashboard space in Upstash Redis.

import GoogleProvider from "next-auth/providers/google";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        token.sub = profile?.sub || token.sub;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.sub;
      return session;
    },
  },
  pages: { signIn: "/" },
};
