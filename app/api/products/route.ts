import { NextResponse } from "next/server";
import { initDb } from "@/app/lib/db";
import { Product } from "@/app/types";

// Helper to map DB row to Product interface
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

export async function GET() {
  try {
    const db = await initDb();
    const result = await db.execute("SELECT * FROM products ORDER BY rowid DESC");
    const products: Product[] = result.rows.map(rowToProduct);

    return NextResponse.json(products);
  } catch (error) {
    console.error("Erro ao listar produtos do Turso:", error);
    return NextResponse.json({ error: "Erro ao buscar produtos" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data: Partial<Product> = await request.json();

    if (!data.name || !data.price || !data.category) {
      return NextResponse.json({ error: "Nome, preço e categoria são obrigatórios" }, { status: 400 });
    }

    const db = await initDb();
    const id = data.id || `item-${Date.now()}`;

    await db.execute({
      sql: `
        INSERT INTO products (
          id, name, description, price, original_price, image,
          category_id, restaurant_id, restaurant_name, rating,
          reviews_count, delivery_time, is_popular, is_offer, free_delivery
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        id,
        data.name.trim(),
        data.description?.trim() || "",
        Number(data.price),
        data.originalPrice ? Number(data.originalPrice) : null,
        data.image?.trim() || "",
        data.category,
        data.restaurantId || "rest-1",
        data.restaurantName || "Manga Com Pimenta",
        data.rating || 5.0,
        data.reviewsCount || 1,
        data.deliveryTime || "30-40 min",
        data.isPopular ? 1 : 0,
        data.isOffer ? 1 : 0,
        data.freeDelivery ? 1 : 0,
      ],
    });

    const createdResult = await db.execute({
      sql: "SELECT * FROM products WHERE id = ?",
      args: [id],
    });

    if (createdResult.rows.length === 0) {
      return NextResponse.json({ error: "Erro ao buscar produto cadastrado" }, { status: 500 });
    }

    return NextResponse.json(rowToProduct(createdResult.rows[0]), { status: 201 });
  } catch (error) {
    console.error("Erro ao cadastrar produto:", error);
    return NextResponse.json({ error: "Erro ao cadastrar produto" }, { status: 500 });
  }
}