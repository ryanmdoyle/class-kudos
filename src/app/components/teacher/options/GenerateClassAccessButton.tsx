"use client";

import { Button } from "../../ui/button";
import { createAccessCodesForUsers } from "./functions"
import { RefreshCw } from "lucide-react";

export function GenerateClassAccessButton({ userIds }: { userIds: string[] }) {

  const handleClick = async () => {
    try {
      const result = await createAccessCodesForUsers(userIds);
    } catch (error) {
      console.error('Failed to generate access codes:', error);
    }
  };

  return (
    <Button onClick={handleClick} size="smIcon" className="my-auto" variant="noShadowNeutral">
      <RefreshCw />
    </Button>
  )
}