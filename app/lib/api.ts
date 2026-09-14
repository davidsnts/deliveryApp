import { Product, Category, Order, OrderStatus } from "../types";

export async function fetchProducts(): Promise<Product[]> {
  const res = await fetch("/api/products", { cache: "no-store" });
  if (!res.ok) throw new Error("Falha ao buscar produtos");
  return res.json();
}

export async function createProduct(product: Partial<Product>): Promise<Product> {
  const res = await fetch("/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(product),
  });
  if (!res.ok) throw new Error("Falha ao cadastrar produto");
  return res.json();
}

export async function updateProduct(id: string, product: Partial<Product>): Promise<Product> {
  const res = await fetch(`/api/products/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(product),
  });
  if (!res.ok) throw new Error("Falha ao atualizar produto");
  return res.json();
}

export async function deleteProduct(id: string): Promise<boolean> {
  const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
  return res.ok;
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch("/api/categories", { cache: "no-store" });
  if (!res.ok) throw new Error("Falha ao buscar categorias");
  return res.json();
}

export async function updateCategories(categories: Category[]): Promise<Category[]> {
  const res = await fetch("/api/categories", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(categories),
  });
  if (!res.ok) throw new Error("Falha ao atualizar categorias");
  return res.json();
}

export async function fetchOrders(): Promise<Order[]> {
  const res = await fetch("/api/orders", { cache: "no-store" });
  if (!res.ok) throw new Error("Falha ao buscar pedidos");
  return res.json();
}

export async function fetchMyOrders(deviceId?: string): Promise<Order[]> {
  const url = deviceId ? `/api/orders?deviceId=${encodeURIComponent(deviceId)}` : "/api/orders";
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Falha ao buscar meus pedidos");
  return res.json();
}

export async function createOrder(order: Order): Promise<Order> {
  const res = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(order),
  });
  if (!res.ok) throw new Error("Falha ao registrar pedido");
  return res.json();
}

export async function updateOrderStatusApi(id: string, status: OrderStatus): Promise<boolean> {
  const res = await fetch(`/api/orders/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  return res.ok;
}

export async function deleteOrderApi(id: string): Promise<boolean> {
  const res = await fetch(`/api/orders/${id}`, { method: "DELETE" });
  return res.ok;
}

export async function resetDatabaseApi(): Promise<boolean> {
  const res = await fetch("/api/reset", { method: "POST" });
  return res.ok;
}

