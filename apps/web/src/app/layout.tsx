import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@xyflow/react/dist/style.css";
import "./globals.css";
import { AppHeader } from "@/components/app-header";
import { PromptInput } from "@/components/prompt-input";
import { PostHogProvider } from "@/components/providers/posthog-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chorus",
  description: "many agents, one coordinated output.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      lang="en"
    >
      <body className="flex h-screen flex-col overflow-hidden">
        <PostHogProvider>
          <AppHeader />
          <div className="flex-1 overflow-hidden pt-12">{children}</div>
          <PromptInput />
        </PostHogProvider>
      </body>
    </html>
  );
}
