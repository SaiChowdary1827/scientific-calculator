import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CalcLab — Scientific Calculator",
  description: "A modern scientific calculator and calculation toolbox."
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}