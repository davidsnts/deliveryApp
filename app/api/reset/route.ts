import { NextResponse } from "next/server";
import { resetDatabase } from "../../lib/db";

export async function POST() {
  try {
    resetDatabase();
    return NextResponse.json({ success: true, message: "Database reset to factory defaults" });
  } catch (error) {
    console.error("Failed to reset database:", error);
    return NextResponse.json({ error: "Failed to reset database" }, { status: 500 });
  }
}
