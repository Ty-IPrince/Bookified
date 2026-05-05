import type { Metadata } from "next";
import { cn } from "@/lib/utils";
import { ClerkProvider } from "@clerk/nextjs";
import { IBM_Plex_Serif, Mona_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner"
import Navbar from "@/components/ui/navbar";

const ibmPlexSerif = IBM_Plex_Serif({
  variable: "--font-ibm-plex-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const monaSans = Mona_Sans({
  variable: "--font-mona-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bookified",
  description: "Transform your book into interactive AI conversation. Upload PDFs, and chat with your book using voice and text.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider ui={ui}>
      <html
        lang="en"
        className={cn("h-full", "antialiased", ibmPlexSerif.variable, monaSans.variable, "font-sans", "relative")}
      >
        <body className="min-h-full flex flex-col max-w-[1440px] mx-auto">
          <Navbar />
          {children}
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}