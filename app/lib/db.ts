import { createClient, Client } from "@libsql/client";

let dbInstance: Client | null = null;

const DEFAULT_CATEGORIES = [
  { id: "pratos", name: "Pratos", icon: "🍲" },
  { id: "bebidas", name: "Bebidas", icon: "🥤" },
];

export function getDb(): Client {
  if (dbInstance) {
    return dbInstance;
  }

  const db = createClient({
    url: process.env.NEXT_PUBLIC_TURSO_DATABASE_URL!,
    authToken: process.env.NEXT_PUBLIC_TURSO_AUTH_TOKEN!,
  });

  dbInstance = db;
  return db;
}

// Inicializa as tabelas e dados padrões caso ainda não existam no Turso
export async function initDb(): Promise<Client> {
  const db = getDb();

  // Criar Tabelas
  await db.execute(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      price REAL NOT NULL,
      original_price REAL,
      image TEXT NOT NULL,
      category_id TEXT NOT NULL,
      restaurant_id TEXT NOT NULL DEFAULT 'rest-1',
      restaurant_name TEXT NOT NULL DEFAULT 'Manga Com Pimenta',
      rating REAL DEFAULT 5.0,
      reviews_count INTEGER DEFAULT 0,
      delivery_time TEXT DEFAULT '30-40 min',
      is_popular INTEGER DEFAULT 0,
      is_offer INTEGER DEFAULT 0,
      free_delivery INTEGER DEFAULT 0
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      delivery_address_json TEXT NOT NULL,
      items_json TEXT NOT NULL,
      subtotal REAL NOT NULL,
      delivery_fee REAL NOT NULL,
      discount REAL NOT NULL,
      total REAL NOT NULL,
      payment_method TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pendente',
      device_id TEXT,
      notes TEXT
    );
  `);

  // Tenta adicionar a coluna 'notes' caso a tabela já exista sem ela
  try {
    await db.execute("ALTER TABLE orders ADD COLUMN notes TEXT;");
  } catch {
    // Coluna já existe no Turso
  }

  // Inicializa categorias padrão se a tabela estiver vazia
  const countResult = await db.execute("SELECT COUNT(*) as count FROM categories");
  const count = Number(countResult.rows[0]?.count ?? 0);

  if (count === 0) {
    const batchStatements = DEFAULT_CATEGORIES.map((cat) => ({
      sql: "INSERT INTO categories (id, name, icon) VALUES (?, ?, ?)",
      args: [cat.id, cat.name, cat.icon],
    }));
    await db.batch(batchStatements, "write");
  }

  return db;
}

// Reseta o banco de dados no Turso
export async function resetDatabase(): Promise<void> {
  const db = getDb();

  await db.batch(
    [
      "DELETE FROM products;",
      "DELETE FROM orders;",
      "DELETE FROM categories;",
    ],
    "write"
  );

  const insertCatStatements = DEFAULT_CATEGORIES.map((cat) => ({
    sql: "INSERT INTO categories (id, name, icon) VALUES (?, ?, ?)",
    args: [cat.id, cat.name, cat.icon],
  }));

  await db.batch(insertCatStatements, "write");
}