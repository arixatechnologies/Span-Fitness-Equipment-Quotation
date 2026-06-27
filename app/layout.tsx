import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Span Fitness Quotation",
  description: "Quotation management system for Span Fitness Equipments"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
