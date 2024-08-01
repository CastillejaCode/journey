import "@/app/globals.css";
import Header from "@/components/general/Header";
import { Toaster } from "@/components/ui/toaster";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Metadata } from "next";
import { vollkorn, workSans } from "./fonts";

export const metadata: Metadata = {
  title: "roam",
  description: "Plan your next roadtrip adventure.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${vollkorn.variable} ${workSans.variable}`}>
      <body className="relative flex min-h-screen flex-col bg-slate-100">
        <Header />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
