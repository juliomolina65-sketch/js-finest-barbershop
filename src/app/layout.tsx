import type { Metadata, Viewport } from "next";
import Image from "next/image";
import { Cinzel, Montserrat } from "next/font/google";
import InstallPrompt from "@/components/InstallPrompt";
import { getDict, getLocale } from "@/lib/i18n";
import "./globals.css";

const cinzel = Cinzel({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
});

const montserrat = Montserrat({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "J's Finest Barbershop — Clean Cuts. Sharp Style. Finest You.",
  description:
    "J's Finest Barbershop — premium cuts, fades, beard trims, and hot towel shaves. Book your appointment online.",
  appleWebApp: {
    capable: true,
    title: "J's Finest",
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0d1a12",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const installLabels = (await getDict()).installPrompt;
  return (
    <html
      lang={locale}
      className={`${cinzel.variable} ${montserrat.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-white">
        {/* Shop photo behind the entire site. A fixed element rather than
            background-attachment: fixed, which iOS Safari ignores. */}
        <div aria-hidden className="fixed inset-0 z-0 pointer-events-none">
          <Image
            src="/shop-interior.webp"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          {/* Holds contrast for body copy over the bright ceiling lights. */}
          <div className="absolute inset-0 bg-black/72" />
        </div>

        <div className="relative z-10 flex-1 flex flex-col min-h-full">
          {children}
        </div>
        <InstallPrompt labels={installLabels} />
      </body>
    </html>
  );
}
