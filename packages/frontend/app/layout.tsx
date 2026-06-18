import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import AppLayout from "@/components/layout/AppLayout";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const jetBrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "ForwarderOS",
  description: "Sistema operativo para Freight Forwarders y Logística",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.variable} ${jetBrainsMono.variable} font-sans antialiased text-gray-100 bg-[#0A0A0B]`}>
        <AppLayout>
          {children}
        </AppLayout>
      </body>
    </html>
  );
}
