import { Product, Category, Order, OrderStatus, DeliverySettings, StoreHours, StoreStatus } from "../types";

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
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Falha ao registrar pedido");
  }
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

export async function fetchDeliverySettings(): Promise<DeliverySettings> {
  const res = await fetch("/api/settings/delivery", { cache: "no-store" });
  if (!res.ok) throw new Error("Falha ao buscar configurações de frete");
  return res.json();
}

export async function updateDeliverySettings(settings: Partial<DeliverySettings>): Promise<DeliverySettings> {
  const res = await fetch("/api/settings/delivery", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error("Falha ao salvar configurações de frete");
  return res.json();
}

export async function fetchStoreHours(): Promise<StoreHours[]> {
  const res = await fetch("/api/settings/hours", { cache: "no-store" });
  if (!res.ok) throw new Error("Falha ao buscar horários de funcionamento");
  return res.json();
}

export async function updateStoreHours(hours: StoreHours[]): Promise<StoreHours[]> {
  const res = await fetch("/api/settings/hours", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(hours),
  });
  if (!res.ok) throw new Error("Falha ao salvar horários de funcionamento");
  return res.json();
}

export async function fetchStoreStatus(): Promise<StoreStatus> {
  const res = await fetch("/api/store-status", { cache: "no-store" });
  if (!res.ok) {
    return {
      isOpen: false,
      reason: "no_schedule",
      message: "Não foi possível verificar o horário da loja.",
      manualOverride: null,
    };
  }
  return res.json();
}

export async function setStoreOverride(override: "open" | "closed" | null): Promise<boolean> {
  const res = await fetch("/api/store-status", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ override }),
  });
  return res.ok;
}

export async function fetchAdminUsers() {
  const res = await fetch("/api/admin/users", { cache: "no-store" });
  if (!res.ok) throw new Error("Falha ao buscar usuários");
  return res.json();
}

export async function createAdminUser(data: { username: string; password: string; name: string }) {
  const res = await fetch("/api/admin/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Erro ao criar usuário");
  return json;
}

export async function updateAdminUser(data: { id: string; newPassword?: string; name?: string }) {
  const res = await fetch("/api/admin/users", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Erro ao atualizar usuário");
  return json;
}

export async function deleteAdminUser(id: string) {
  const res = await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Erro ao excluir usuário");
  return json;
}
