"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { syncOuraNow } from "@/actions/integrations";

export function OuraSyncButton() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="flex items-center gap-3">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() => {
          setMessage(null);
          startTransition(async () => {
            const result = await syncOuraNow();
            if (result.synced) {
              setMessage(`Synced ${result.daysWritten} day(s).`);
            } else {
              setMessage(`Sync failed: ${result.error}`);
            }
            router.refresh();
          });
        }}
      >
        {isPending ? "Syncing…" : "Sync now"}
      </Button>
      {message ? <span className="text-xs text-neutral-500">{message}</span> : null}
    </div>
  );
}
