"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/sonner";
import { LogMatchProvider } from "@/contexts/log-match-context";
import { type ReactNode } from "react";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <LogMatchProvider>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#0a0a0a",
              border: "1px solid #262626",
              color: "#ffffff",
            },
          }}
        />
      </LogMatchProvider>
    </SessionProvider>
  );
}
