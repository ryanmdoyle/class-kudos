"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/app/components/ui/accordion";
import { DeleteGroupButton } from "@/app/components/teacher/DeleteGroupButton";

export function GroupWarningArea({
  group,
}: {
  group: { id: string; name: string };
}) {
  return (
    <div className="bg-background w-full neo-container p-6 relative">
      <Accordion type="single" collapsible>
        <AccordionItem value="item-1">
          <AccordionTrigger>WARNING AREA</AccordionTrigger>
          <AccordionContent className="flex flex-col gap-4">
            <p className="text-md">
              This is where stuff lives that you cannot undo!
            </p>
            <DeleteGroupButton group={group} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
