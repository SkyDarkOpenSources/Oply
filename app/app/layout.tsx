import Copilot from "@/components/Copilot";
import "./globals.css";
import { Metadata } from "next";

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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        <Copilot />
      </body>
    </html>
  );
}
