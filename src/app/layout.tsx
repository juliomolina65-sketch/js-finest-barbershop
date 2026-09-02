import type { Metadata, Viewport } from "next";
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
        {children}
        <InstallPrompt labels={installLabels} />
      </body>
    </html>
  );
}
