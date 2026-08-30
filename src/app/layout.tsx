import * as React from "react";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#141416] text-zinc-100 antialiased overflow-hidden select-none">
      {children}
    </div>
  );
}
