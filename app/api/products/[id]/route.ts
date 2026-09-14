import { NextResponse } from "next/server";
import { initDb } from "@/app/lib/db";
import { Product } from "@/app/types";

function rowToProduct(row: any): Product {
  return {
    id: String(row.id),
    name: String(row.name),
    description: String(row.description),
    price: Number(row.price),
    originalPrice: row.original_price ? Number(row.original_price) : undefined,
    image: String(row.image),
    category: String(row.category_id),
    restaurantId: String(row.restaurant_id),
    restaurantName: String(row.restaurant_name),
    rating: Number(row.rating),
    reviewsCount: Number(row.reviews_count),
    deliveryTime: String(row.delivery_time),
    isPopular: Boolean(row.is_popular),
    isOffer: Boolean(row.is_offer),
    freeDelivery: Boolean(row.free_delivery),
  };
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data: Partial<Product> = await request.json();
    const db = await initDb();

    const existingResult = await db.execute({
      sql: "SELECT * FROM products WHERE id = ?",
      args: [id],
    });

    if (existingResult.rows.length === 0) {
      return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
    }

    const existing: any = existingResult.rows[0];

    await db.execute({
      sql: `
        UPDATE products SET
          name = ?,
          description = ?,
          price = ?,
          original_price = ?,
          image = ?,
          category_id = ?,
          delivery_time = ?,
          is_popular = ?,
          is_offer = ?,
          free_delivery = ?
        WHERE id = ?
      `,
      args: [
        data.name?.trim() ?? existing.name,
        data.description?.trim() ?? existing.description,
        data.price !== undefined ? Number(data.price) : existing.price,
        data.originalPrice !== undefined
          ? data.originalPrice ? Number(data.originalPrice) : null
          : existing.original_price,
        data.image?.trim() ?? existing.image,
        data.category ?? existing.category_id,
        data.deliveryTime ?? existing.delivery_time,
        data.isPopular !== undefined ? (data.isPopular ? 1 : 0) : existing.is_popular,
        data.isOffer !== undefined ? (data.isOffer ? 1 : 0) : existing.is_offer,
        data.freeDelivery !== undefined ? (data.freeDelivery ? 1 : 0) : existing.free_delivery,
        id,
      ],
    });

    const updatedResult = await db.execute({
      sql: "SELECT * FROM products WHERE id = ?",
      args: [id],
    });

    return NextResponse.json(rowToProduct(updatedResult.rows[0]));
  } catch (error) {
    console.error("Erro ao atualizar produto:", error);
    return NextResponse.json({ error: "Erro ao atualizar produto" }, { status: 500 });
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
      sql: "DELETE FROM products WHERE id = ?",
      args: [id],
    });

    if (result.rowsAffected === 0) {
      return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error("Erro ao excluir produto:", error);
    return NextResponse.json({ error: "Erro ao excluir produto" }, { status: 500 });
  }
}