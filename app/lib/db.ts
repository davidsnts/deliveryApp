import { createClient, type Client } from "@libsql/client";
import bcrypt from "bcrypt";

let dbInstance: Client | null = null;

const DEFAULT_CATEGORIES = [
  { id: "pratos", name: "Pratos", icon: "🍲" },
  { id: "bebidas", name: "Bebidas", icon: "🥤" },
];

// Horários padrão: Seg–Sex 11h–22h, Sáb 11h–23h, Dom fechado
// day_of_week: 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb
const DEFAULT_STORE_HOURS = [
  { day: 0, isOpen: 0, open: "11:00", close: "22:00" }, // Dom — fechado
  { day: 1, isOpen: 1, open: "11:00", close: "22:00" }, // Seg
  { day: 2, isOpen: 1, open: "11:00", close: "22:00" }, // Ter
  { day: 3, isOpen: 1, open: "11:00", close: "22:00" }, // Qua
  { day: 4, isOpen: 1, open: "11:00", close: "22:00" }, // Qui
  { day: 5, isOpen: 1, open: "11:00", close: "22:00" }, // Sex
  { day: 6, isOpen: 1, open: "11:00", close: "23:00" }, // Sáb
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

  // Tabela de Usuários do Painel Admin
  await db.execute(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      created_at TEXT NOT NULL
    );
  `);

  // Inicializa usuário admin padrão se a tabela estiver vazia
  const countUsers = await db.execute("SELECT COUNT(*) as count FROM admin_users");
  if (Number(countUsers.rows[0]?.count ?? 0) === 0) {
    const defaultPasswordHash = await bcrypt.hash("admin123", 10);
    await db.execute({
      sql: `INSERT INTO admin_users (id, username, password_hash, name, role, created_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        "usr-admin-1",
        "admin",
        defaultPasswordHash,
        "Administrador",
        "admin",
        new Date().toISOString(),
      ],
    });
  }

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

  // Tabela de Configurações de Frete & Entrega
  await db.execute(`
    CREATE TABLE IF NOT EXISTS delivery_settings (
      id TEXT PRIMARY KEY,
      raio_maximo_km REAL NOT NULL,
      taxa_base REAL NOT NULL,
      km_base REAL NOT NULL,
      valor_km_ate_5km REAL NOT NULL,
      valor_km_ate_10km REAL NOT NULL,
      manual_override TEXT DEFAULT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Adiciona coluna manual_override em instâncias existentes do banco
  try {
    await db.execute("ALTER TABLE delivery_settings ADD COLUMN manual_override TEXT DEFAULT NULL;");
  } catch {
    // Coluna já existe
  }

  // Inicializa configurações de frete padrão se estiver vazia
  const countSettings = await db.execute("SELECT COUNT(*) as count FROM delivery_settings");
  if (Number(countSettings.rows[0]?.count ?? 0) === 0) {
    await db.execute({
      sql: `INSERT INTO delivery_settings (id, raio_maximo_km, taxa_base, km_base, valor_km_ate_5km, valor_km_ate_10km, manual_override, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: ["default", 10.0, 5.0, 2.0, 1.5, 1.8, null, new Date().toISOString()],
    });
  }

  // Tabela de Horários de Funcionamento
  await db.execute(`
    CREATE TABLE IF NOT EXISTS store_hours (
      day_of_week INTEGER PRIMARY KEY,
      is_open INTEGER NOT NULL DEFAULT 1,
      open_time TEXT NOT NULL DEFAULT '11:00',
      close_time TEXT NOT NULL DEFAULT '22:00'
    );
  `);

  // Inicializa horários padrão se a tabela estiver vazia
  const countHours = await db.execute("SELECT COUNT(*) as count FROM store_hours");
  if (Number(countHours.rows[0]?.count ?? 0) === 0) {
    const hourStatements = DEFAULT_STORE_HOURS.map((h) => ({
      sql: "INSERT INTO store_hours (day_of_week, is_open, open_time, close_time) VALUES (?, ?, ?, ?)",
      args: [h.day, h.isOpen, h.open, h.close],
    }));
    await db.batch(hourStatements, "write");
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
      "DELETE FROM delivery_settings;",
      "DELETE FROM store_hours;",
      "DELETE FROM admin_users;",
    ],
    "write"
  );

  // Reinsere o usuário administrativo padrão ao resetar
  const defaultPasswordHash = await bcrypt.hash("admin123", 10);
  await db.execute({
    sql: `INSERT INTO admin_users (id, username, password_hash, name, role, created_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      "usr-admin-1",
      "admin",
      defaultPasswordHash,
      "Administrador",
      "admin",
      new Date().toISOString(),
    ],
  });

  const insertCatStatements = DEFAULT_CATEGORIES.map((cat) => ({
    sql: "INSERT INTO categories (id, name, icon) VALUES (?, ?, ?)",
    args: [cat.id, cat.name, cat.icon],
  }));

  await db.batch(insertCatStatements, "write");

  await db.execute({
    sql: `INSERT INTO delivery_settings (id, raio_maximo_km, taxa_base, km_base, valor_km_ate_5km, valor_km_ate_10km, manual_override, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: ["default", 10.0, 5.0, 2.0, 1.5, 1.8, null, new Date().toISOString()],
  });

  const hourStatements = DEFAULT_STORE_HOURS.map((h) => ({
    sql: "INSERT INTO store_hours (day_of_week, is_open, open_time, close_time) VALUES (?, ?, ?, ?)",
    args: [h.day, h.isOpen, h.open, h.close],
  }));
  await db.batch(hourStatements, "write");
}