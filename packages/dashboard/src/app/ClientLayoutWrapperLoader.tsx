"use client";

import ClientLayoutWrapper from "./ClientLayoutWrapper";

export default function ClientLayoutWrapperLoader({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClientLayoutWrapper>{children}</ClientLayoutWrapper>;
}
