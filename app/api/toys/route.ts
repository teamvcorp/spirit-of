import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { NextResponse } from "next/server";

export async function GET() {
  const toys = await prisma.toy.findMany({ orderBy: { name: "asc" } });
  // Map pointCost → price for client compatibility
  return NextResponse.json({
    toys: toys.map((t) => ({ id: t.id, name: t.name, description: t.description, image: t.image, price: t.pointCost })),
  });
}

export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, description, image, pointCost } = await req.json();
  if (!name || !description || !pointCost) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const toy = await prisma.toy.create({
    data: { name, description, image: image ?? "", pointCost: Number(pointCost) },
  });

  return NextResponse.json({ toy }, { status: 201 });
}
