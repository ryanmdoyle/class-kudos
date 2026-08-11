"use client";

import { useState } from "react";

import { Button } from "@/app/components/ui/button";
import { approveRedeemed } from "@/app/components/teacher/functions";

/**
 * Takes only the redemption ID. The server resolves which group it belongs to
 * and asserts ownership from that — passing the whole row from the client would
 * let a crafted request name someone else's group.
 */
export function ApproveRedeemedButton({ redeemedId }: { redeemedId: string }) {
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    if (busy) return;
    setBusy(true);
    const result = await approveRedeemed(redeemedId);
    if (result.success) {
      window.location.reload();
      return;
    }
    setBusy(false);
  };

  return (
    <Button
      onClick={handleClick}
      disabled={busy}
      size="sm"
      className="bg-green-background m-0 mr-4"
    >
      Approve
    </Button>
  );
}
