"use client";

import { Redeemed } from "@generated/prisma";
import { Button } from "../ui/button";
import { approveRedeemed } from "./functions";

const handleSubmit = async (redeemed: Redeemed) => {
  approveRedeemed(redeemed)
}

export function ApproveRedeemedButton({ redeemed }: { redeemed: Redeemed }) {
  return (
    <Button onClick={() => { handleSubmit(redeemed) }} size="sm" className="bg-green-background m-0 mr-4">Approve</Button>
  )
}
