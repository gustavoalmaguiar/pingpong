import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { seedAchievements } from "@/actions/achievements";

export async function POST() {
  const session = await auth();

  // Only allow admins to seed
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await seedAchievements();
    return NextResponse.json({ success: true, message: "Achievements seeded!" });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: "Failed to seed" }, { status: 500 });
  }
}
