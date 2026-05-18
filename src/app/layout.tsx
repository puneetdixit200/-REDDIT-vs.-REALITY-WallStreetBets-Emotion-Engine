import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "REDDIT vs REALITY",
  description:
    "A live data-art dashboard comparing WallStreetBets sentiment to crypto price reality."
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
