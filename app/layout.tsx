import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SessionProvider } from "@/components/SessionProvider";
import { Toaster } from "react-hot-toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Todo List App",
  description: "A simple todo list application with authentication",
  icons: {
    icon: "/todo-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <SessionProvider>
            {children}
            <Toaster
              position="bottom-left"
              toastOptions={{
                duration: 4000,
                style: {
                  background: "var(--card)",
                  color: "var(--card-foreground)",
                  border: "1px solid var(--border)",
                  borderRadius: "0.5rem",
                  padding: "12px 16px",
                  fontSize: "14px",
                  boxShadow:
                    "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: "var(--primary)",
                    secondary: "var(--primary-foreground)",
                  },
                },
                error: {
                  duration: 4000,
                  iconTheme: {
                    primary: "var(--destructive)",
                    secondary: "var(--destructive-foreground)",
                  },
                },
                loading: {
                  iconTheme: {
                    primary: "var(--primary)",
                    secondary: "var(--primary-foreground)",
                  },
                },
              }}
            />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
