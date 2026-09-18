import { NextResponse } from "next/server";
import { initDb } from "@/app/lib/db";
import { Category } from "@/app/types";

// Função auxiliar para buscar todas as categorias atualizadas do DB
async function getCategoriesFromDb(db: any): Promise<Category[]> {
  const result = await db.execute(`
    SELECT 
      c.id, 
      c.name, 
      c.icon, 
      (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) as count
    FROM categories c
  `);

  return result.rows.map((r: any) => ({
    id: String(r.id),
    name: String(r.name),
    icon: String(r.icon),
    count: Number(r.count),
  }));
}

export async function GET() {
  try {
    const db = await initDb();
    const categories = await getCategoriesFromDb(db);
    return NextResponse.json(categories);
  } catch (error) {
    console.error("Erro ao buscar categorias:", error);
    return NextResponse.json({ error: "Erro ao buscar categorias" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const data: Category[] = await request.json();
    if (!Array.isArray(data)) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const db = await initDb();

    // 1. Inserir ou atualizar (UPSERT) cada categoria recebida
    const upsertStatements = data.map((cat) => ({
      sql: `
        INSERT INTO categories (id, name, icon) 
        VALUES (?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET 
          name = excluded.name, 
          icon = excluded.icon
      `,
      args: [cat.id.trim(), cat.name.trim(), cat.icon.trim()],
    }));

    // 2. Apagar categorias do banco que não estão no array enviado
    const activeIds = data.map((c) => c.id.trim());
    let deleteStatement: { sql: string; args: any[] } | null = null;

    if (activeIds.length > 0) {
      const placeholders = activeIds.map(() => "?").join(",");
      deleteStatement = {
        sql: `DELETE FROM categories WHERE id NOT IN (${placeholders})`,
        args: activeIds,
      };
    }

    // 3. Executar todas as operações em lote (batch) no Turso/SQLite
    const statements = [
      ...upsertStatements,
      ...(deleteStatement ? [deleteStatement] : []),
    ];

    if (statements.length > 0) {
      await db.batch(statements, "write");
    }

    // 4. Retornar a lista completa e atualizada
    const categories = await getCategoriesFromDb(db);
    return NextResponse.json(categories);
  } catch (error) {
    console.error("Erro ao atualizar categorias:", error);
    return NextResponse.json({ error: "Erro ao atualizar categorias" }, { status: 500 });
  }
}