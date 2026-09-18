import { NextResponse } from "next/server";
import { initDb } from "@/app/lib/db";
import { getStoreStatus } from "@/app/lib/storeStatus";
import { StoreStatus } from "@/app/types";

export async function GET() {
  try {
    const status = await getStoreStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error("Erro ao verificar status da loja:", error);
    return NextResponse.json<StoreStatus>({
      isOpen: false,
      reason: "no_schedule",
      message: "Não foi possível verificar o horário da loja. Tente novamente.",
      manualOverride: null,
    });
  }
}

/** PATCH — altera o override manual: body { override: "open" | "closed" | null } */
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const override = body.override ?? null;

    if (override !== null && override !== "open" && override !== "closed") {
      return NextResponse.json({ error: "Valor inválido para override" }, { status: 400 });
    }

    const db = await initDb();
    await db.execute({
      sql: `UPDATE delivery_settings SET manual_override = ?, updated_at = ? WHERE id = 'default'`,
      args: [override, new Date().toISOString()],
    });

    return NextResponse.json({ success: true, manualOverride: override });
  } catch (error) {
    console.error("Erro ao salvar override:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
