import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { Footer } from "@/components/layout/footer";
import { Nav } from "@/components/layout/nav";
import { CommandPaletteProvider } from "@/components/providers/palette-provider";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3210"),
  title: { default: "Computational Lab", template: "%s · Computational Lab" },
  description:
    "An interactive computational laboratory: explore algorithms, mathematics, physics, and numerical methods through live, operable simulations.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Computational Lab",
    title: "Computational Lab",
    description:
      "Interactive experiments in algorithms, mathematics, physics, and numerical science. Every figure is computed live; every control changes the system it names.",
  },
};

/* Applies the stored (or system) theme before first paint so neither theme flashes. */
const themeScript = `(function(){try{var k="computational-lab-theme";var s=localStorage.getItem(k);var t=(s==="light"||s==="dark")?s:(window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");var d=document.documentElement;d.dataset.theme=t;var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",t==="light"?"#faf9f7":"#0b0b0d")}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} h-full`}
    >
      <head>
        <meta name="theme-color" content="#0b0b0d" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <CommandPaletteProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[500] focus:rounded-sm focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-accent-contrast"
          >
            Skip to content
          </a>
          <Nav />
          <main id="main" className="flex-1 pt-16">
            {children}
          </main>
          <Footer />
        </CommandPaletteProvider>
      </body>
    </html>
  );
}
