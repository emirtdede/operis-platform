import type { Metadata } from "next";
import "@/src/styles/tokens.css";
import { LivingBackground } from "@/src/components/ui/living-background";

export const metadata: Metadata = {
  title: "Operis",
  description: "Modern Tech & Software Convergent Talent Platform",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.png", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="tr"
      dir="ltr"
      className="scroll-smooth md:snap-y md:snap-proximity"
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('fp_theme')||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t);if(t==='dark'||t==='black'){document.documentElement.classList.add('dark');}else{document.documentElement.classList.remove('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="relative min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] antialiased transition-colors selection:bg-blue-500/20 selection:text-blue-500 overflow-x-hidden">
        <LivingBackground />
        <div className="relative z-10 flex min-h-screen flex-col">{children}</div>
      </body>
    </html>
  );
}
