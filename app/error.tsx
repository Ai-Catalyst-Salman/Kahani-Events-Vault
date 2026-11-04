"use client";

import { useEffect } from "react";
import { VaultStatusScreen } from "@/components/VaultStatusScreen";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <VaultStatusScreen
      variant="error"
      onRetry={reset}
      reference={error.digest}
    />
  );
}
