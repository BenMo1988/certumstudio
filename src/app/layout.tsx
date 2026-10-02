import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { StudioHeader } from "@/components/studio/StudioHeader";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Certum Studio",
  description:
    "Interne cockpit van Bureau Certum voor het ontwikkelen van trainingen en praktijksimulaties.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="nl"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <StudioHeader />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
