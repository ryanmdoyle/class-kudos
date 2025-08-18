'use client';

import { Button } from "@/app/components/ui/button";
import { Copy } from "lucide-react";
import { Toaster, toast } from "sonner"


interface CopyUsernamesButtonProps {
  usernames: string[];
}

export function CopyUsernamesButton({ usernames }: CopyUsernamesButtonProps) {

  const handleCopy = async () => {
    try {
      // Create a simple table format
      const tableHeader = 'Username\n';
      const tableSeparator = '--------\n';
      const tableRows = usernames.map(username => `${username}\n`).join('');

      const tableText = tableHeader + tableSeparator + tableRows;

      await navigator.clipboard.writeText(tableText);
      toast.success("Usernames Copied!", {
        className: "bg-green-background shadow-shadow",
      })
    } catch (error) {
    }
  };


  return (
    <div className="flex gap-2">
      <Button
        size="smIcon"
        className="my-auto"
        variant="noShadowNeutral"
        onClick={handleCopy}
      >
        <Copy />
      </Button>
      <Toaster richColors />
    </div>
  );
}