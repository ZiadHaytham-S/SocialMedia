import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import { AppSessionProvider } from "@/components/providers/session-provider";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
});

export const metadata: Metadata = {
  title: "شبكة اجتماعية",
  description: "تطبيق شبكة اجتماعية مبني بـ Next.js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning className={`${cairo.variable} h-full antialiased`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('app-theme');var d=t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark')}catch(e){}})();",
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <AppSessionProvider>{children}</AppSessionProvider>
      </body>
    </html>
  );
}
