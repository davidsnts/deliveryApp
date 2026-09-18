import { NextResponse } from "next/server";
import { initDb } from "@/app/lib/db";
import { DeliverySettings } from "@/app/types";

export async function GET() {
  try {
    const db = await initDb();
    const result = await db.execute("SELECT * FROM delivery_settings WHERE id = 'default' LIMIT 1");

    if (result.rows.length === 0) {
      // Fallback padrão se não encontrar registro
      const defaultSettings: DeliverySettings = {
        id: "default",
        raioMaximoKm: 10.0,
        taxaBase: 5.0,
        kmBase: 2.0,
        valorKmAte5Km: 1.5,
        valorKmAte10Km: 1.8,
        updatedAt: new Date().toISOString(),
      };
      return NextResponse.json(defaultSettings);
    }

    const row = result.rows[0];
    const settings: DeliverySettings = {
      id: String(row.id),
      raioMaximoKm: Number(row.raio_maximo_km),
      taxaBase: Number(row.taxa_base),
      kmBase: Number(row.km_base),
      valorKmAte5Km: Number(row.valor_km_ate_5km),
      valorKmAte10Km: Number(row.valor_km_ate_10km),
      updatedAt: String(row.updated_at),
    };

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Erro ao buscar configurações de frete:", error);
    return NextResponse.json(
      { error: "Erro interno ao buscar configurações de frete" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    const raioMaximoKm = Math.max(1, Number(body.raioMaximoKm) || 10);
    const taxaBase = Math.max(0, Number(body.taxaBase) || 0);
    const kmBase = Math.max(0.1, Number(body.kmBase) || 2);
    const valorKmAte5Km = Math.max(0, Number(body.valorKmAte5Km) || 0);
    const valorKmAte10Km = Math.max(0, Number(body.valorKmAte10Km) || 0);
    const now = new Date().toISOString();

    const db = await initDb();

    await db.execute({
      sql: `INSERT INTO delivery_settings (id, raio_maximo_km, taxa_base, km_base, valor_km_ate_5km, valor_km_ate_10km, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              raio_maximo_km = excluded.raio_maximo_km,
              taxa_base = excluded.taxa_base,
              km_base = excluded.km_base,
              valor_km_ate_5km = excluded.valor_km_ate_5km,
              valor_km_ate_10km = excluded.valor_km_ate_10km,
              updated_at = excluded.updated_at;`,
      args: ["default", raioMaximoKm, taxaBase, kmBase, valorKmAte5Km, valorKmAte10Km, now],
    });

    const updatedSettings: DeliverySettings = {
      id: "default",
      raioMaximoKm,
      taxaBase,
      kmBase,
      valorKmAte5Km,
      valorKmAte10Km,
      updatedAt: now,
    };

    return NextResponse.json(updatedSettings);
  } catch (error) {
    console.error("Erro ao atualizar configurações de frete:", error);
    return NextResponse.json(
      { error: "Erro interno ao salvar configurações de frete" },
      { status: 500 }
    );
  }
}
