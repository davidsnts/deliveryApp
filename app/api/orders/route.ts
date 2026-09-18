import { NextResponse } from "next/server";
import { initDb } from "@/app/lib/db";
import { getStoreStatus } from "@/app/lib/storeStatus";
import { Order, OrderStatus } from "@/app/types";

function rowToOrder(row: any): Order {
  return {
    id: String(row.id),
    createdAt: String(row.created_at),
    customer: {
      name: String(row.customer_name),
      phone: String(row.customer_phone),
    },
    deliveryAddress: JSON.parse(String(row.delivery_address_json)),
    items: JSON.parse(String(row.items_json)),
    subtotal: Number(row.subtotal),
    deliveryFee: Number(row.delivery_fee),
    discount: Number(row.discount),
    total: Number(row.total),
    paymentMethod: String(row.payment_method),
    status: String(row.status) as OrderStatus,
    deviceId: row.device_id ? String(row.device_id) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get("deviceId");
    const db = await initDb();

    let result;
    if (deviceId) {
      result = await db.execute({
        sql: "SELECT * FROM orders WHERE device_id = ? ORDER BY rowid DESC",
        args: [deviceId],
      });
    } else {
      result = await db.execute("SELECT * FROM orders ORDER BY rowid DESC");
    }

    const orders: Order[] = result.rows.map(rowToOrder);
    return NextResponse.json(orders);
  } catch (error) {
    console.error("Erro ao buscar pedidos:", error);
    return NextResponse.json({ error: "Erro ao buscar pedidos" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data: Order = await request.json();

    if (!data.id || !data.customer?.name || !data.customer?.phone || !data.items || data.items.length === 0) {
      return NextResponse.json({ error: "Dados do pedido incompletos" }, { status: 400 });
    }

    const storeStatus = await getStoreStatus();
    if (!storeStatus.isOpen) {
      return NextResponse.json(
        { error: storeStatus.message || "A loja está fechada e não está aceitando pedidos." },
        { status: 403 }
      );
    }

    const db = await initDb();

    await db.execute({
      sql: `
        INSERT INTO orders (
          id, created_at, customer_name, customer_phone,
          delivery_address_json, items_json, subtotal, delivery_fee,
          discount, total, payment_method, status, device_id, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        data.id,
        data.createdAt || new Date().toISOString(),
        data.customer.name.trim(),
        data.customer.phone.trim(),
        JSON.stringify(data.deliveryAddress),
        JSON.stringify(data.items),
        Number(data.subtotal),
        Number(data.deliveryFee),
        Number(data.discount || 0),
        Number(data.total),
        data.paymentMethod || "PIX",
        data.status || "pendente",
        data.deviceId || null,
        data.notes?.trim() || null,
      ],
    });

    const createdResult = await db.execute({
      sql: "SELECT * FROM orders WHERE id = ?",
      args: [data.id],
    });

    if (createdResult.rows.length === 0) {
      return NextResponse.json({ error: "Erro ao recuperar pedido criado" }, { status: 500 });
    }

    return NextResponse.json(rowToOrder(createdResult.rows[0]), { status: 201 });
  } catch (error) {
    console.error("Erro ao registrar pedido:", error);
    return NextResponse.json({ error: "Erro ao registrar pedido" }, { status: 500 });
  }
}