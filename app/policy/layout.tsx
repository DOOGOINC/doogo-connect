import React from "react";
import { PolicyTabs } from "./_components/PolicyTabs";

export default function PolicyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white pt-24 pb-20">
      <div className="mx-auto max-w-4xl px-6">
        <PolicyTabs />
        {children}
      </div>
    </div>
  );
}
