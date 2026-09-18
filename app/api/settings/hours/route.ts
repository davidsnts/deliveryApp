import { NextResponse } from "next/server";
import { initDb } from "@/app/lib/db";
import { StoreHours } from "@/app/types";

const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function rowToStoreHours(row: Record<string, unknown>): StoreHours {
  return {
    dayOfWeek: Number(row.day_of_week),
    isOpen: Number(row.is_open) === 1,
    openTime: String(row.open_time),
    closeTime: String(row.close_time),
  };
}

export async function GET() {
  try {
    const db = await initDb();
    const result = await db.execute("SELECT * FROM store_hours ORDER BY day_of_week ASC");

    const hours: StoreHours[] = result.rows.map((r) =>
      rowToStoreHours(r as Record<string, unknown>)
    );

    // Garante que retorna sempre 7 dias, mesmo se o banco estiver incompleto
    if (hours.length < 7) {
      const existing = new Set(hours.map((h) => h.dayOfWeek));
      for (let d = 0; d < 7; d++) {
        if (!existing.has(d)) {
          hours.push({ dayOfWeek: d, isOpen: d !== 0, openTime: "11:00", closeTime: "22:00" });
        }
      }
      hours.sort((a, b) => a.dayOfWeek - b.dayOfWeek);
    }

    return NextResponse.json(hours);
  } catch (error) {
    console.error("Erro ao buscar horários:", error);
    return NextResponse.json(
      { error: "Erro interno ao buscar horários de funcionamento" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body: StoreHours[] = await request.json();

    if (!Array.isArray(body) || body.length === 0) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const db = await initDb();

    const statements = body.map((h) => ({
      sql: `INSERT INTO store_hours (day_of_week, is_open, open_time, close_time)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(day_of_week) DO UPDATE SET
              is_open = excluded.is_open,
              open_time = excluded.open_time,
              close_time = excluded.close_time`,
      args: [
        h.dayOfWeek,
        h.isOpen ? 1 : 0,
        h.openTime || "11:00",
        h.closeTime || "22:00",
      ],
    }));

    await db.batch(statements, "write");

    // Lê de volta para confirmar
    const updated = await db.execute("SELECT * FROM store_hours ORDER BY day_of_week ASC");
    return NextResponse.json(
      updated.rows.map((r) => rowToStoreHours(r as Record<string, unknown>))
    );
  } catch (error) {
    console.error("Erro ao salvar horários:", error);
    return NextResponse.json(
      { error: "Erro interno ao salvar horários de funcionamento" },
      { status: 500 }
    );
  }
}

// Helper exportado para uso interno
export { DAY_NAMES };
