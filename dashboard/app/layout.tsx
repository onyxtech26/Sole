import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sole — Sun Tours Travels",
  description: "Reservation and daily schedule dashboard for Sun Tours Travels.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
