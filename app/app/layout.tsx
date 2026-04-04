import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Oply — Autonomous Software Delivery Platform",
  description:
    "AI-powered CI/CD platform that intelligently manages build, test, deploy, monitoring, rollback, and optimization. Zero-YAML. Fully autonomous.",
  keywords: ["CI/CD", "DevOps", "AI", "Kubernetes", "Pipeline", "Deployment", "Automation"],
  openGraph: {
    title: "Oply — Autonomous Software Delivery Platform",
    description: "AI-powered CI/CD that replaces YAML with intelligence.",
    type: "website",
    siteName: "Oply",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
