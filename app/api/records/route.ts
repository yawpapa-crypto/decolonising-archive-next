import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

export async function GET() {
  const records = await prisma.record.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(records);
}
