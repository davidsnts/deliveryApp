import { NextResponse } from "next/server";
import { initDb } from "@/app/lib/db";
import { OrderStatus } from "@/app/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { status }: { status: OrderStatus } = await request.json();

    if (!status) {
      return NextResponse.json({ error: "Status não informado" }, { status: 400 });
    }

    const db = await initDb();

    const result = await db.execute({
      sql: "UPDATE orders SET status = ? WHERE id = ?",
      args: [status, id],
    });

    if (result.rowsAffected === 0) {
      return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true, id, status });
  } catch (error) {
    console.error("Erro ao atualizar status do pedido:", error);
    return NextResponse.json({ error: "Erro ao atualizar status do pedido" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await initDb();

    const result = await db.execute({
      sql: "DELETE FROM orders WHERE id = ?",
      args: [id],
    });

    if (result.rowsAffected === 0) {
      return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error("Erro ao excluir pedido:", error);
    return NextResponse.json({ error: "Erro ao excluir pedido" }, { status: 500 });
  }
}