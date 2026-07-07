"use client";

import Providers from "./providers";
import { AuthProvider } from "@/components/AuthProvider";

export default function ClientLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <Providers>{children}</Providers>
    </AuthProvider>
  );
}
