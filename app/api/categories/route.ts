import { NextResponse } from "next/server";
import { initDb } from "@/app/lib/db";
import { Category } from "@/app/types";

export async function GET() {
  try {
    const db = await initDb();

    const result = await db.execute(`
      SELECT 
        c.id, 
        c.name, 
        c.icon, 
        (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) as count
      FROM categories c
    `);

    const categories: Category[] = result.rows.map((r: any) => ({
      id: String(r.id),
      name: String(r.name),
      icon: String(r.icon),
      count: Number(r.count),
    }));

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

    // Cria as instruções de atualização para executar em lote (batch) no Turso
    const updateStatements = data.map((cat) => ({
      sql: "UPDATE categories SET name = ?, icon = ? WHERE id = ?",
      args: [cat.name.trim(), cat.icon.trim(), cat.id],
    }));

    if (updateStatements.length > 0) {
      await db.batch(updateStatements, "write");
    }

    const result = await db.execute(`
      SELECT 
        c.id, 
        c.name, 
        c.icon, 
        (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) as count
      FROM categories c
    `);

    const categories: Category[] = result.rows.map((r: any) => ({
      id: String(r.id),
      name: String(r.name),
      icon: String(r.icon),
      count: Number(r.count),
    }));

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Erro ao atualizar categorias:", error);
    return NextResponse.json({ error: "Erro ao atualizar categorias" }, { status: 500 });
  }
}