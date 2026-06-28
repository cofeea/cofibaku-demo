"use client";
import { SessionProvider } from "next-auth/react";

export default function RootLayout({ children }) {
  return (
    <html lang="az">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>CofiBakuPromo — Qəhvə Analitikası</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,600;0,700;1,400&family=Jost:wght@400;500;600&display=swap" rel="stylesheet" />
        <style>{`
          :root {
            --brand-serif: 'Fraunces', Georgia, serif;
            --brand-sans: 'Jost', system-ui, sans-serif;
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: var(--brand-sans); background: #F6F2E9; }
          input[type=range] { width: 100%; accent-color: #BE7A3C; cursor: pointer; }
        `}</style>
      </head>
      <body>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
