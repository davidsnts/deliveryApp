export interface Category {
  id: string;
  name: string;
  icon: string;
  count?: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  restaurantId: string;
  restaurantName: string;
  rating: number;
  reviewsCount: number;
  deliveryTime: string;
  isPopular?: boolean;
  isOffer?: boolean;
  freeDelivery?: boolean;
}

export interface Restaurant {
  id: string;
  name: string;
  category: string;
  rating: number;
  reviewsCount: number;
  deliveryTime: string;
  deliveryFee: number;
  freeDeliveryMin?: number;
  image: string;
  logo: string;
  distance: string;
  isOpen: boolean;
  isFeatured?: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
  notes?: string;
}

export interface Address {
  id: string;
  label: string;
  rua: string;
  numero: string;
  bairro: string;
  complemento?: string;
  cep?: string;
  lat?: number;
  lng?: number;
  distanciaKm?: number;
  isDefault?: boolean;
}

export interface Promotion {
  id: string;
  title: string;
  subtitle: string;
  couponCode: string;
  discountBadge: string;
  bgGradient: string;
  expiresIn: string;
  buttonText: string;
}

export type FilterOption = "all" | "popular" | "free_delivery" | "fast" | "offers";

export interface CustomerProfile {
  name: string;
  phone: string;
}

export type OrderStatus = "pendente" | "em_preparo" | "saiu_entrega" | "entregue" | "cancelado";

export interface Order {
  id: string;
  createdAt: string;
  customer: CustomerProfile;
  deliveryAddress: Address;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  paymentMethod: string;
  status: OrderStatus;
  deviceId?: string;
  notes?: string;
}

export interface DeliverySettings {
  id: string;
  raioMaximoKm: number;
  taxaBase: number;
  kmBase: number;
  valorKmAte5Km: number;
  valorKmAte10Km: number;
  updatedAt?: string;
  manualOverride?: "open" | "closed" | null; // null = segue horário automático
}

/** Uma linha de horário para um dia da semana (0=Dom … 6=Sáb) */
export interface StoreHours {
  dayOfWeek: number;
  isOpen: boolean;
  openTime: string;  // "HH:MM"
  closeTime: string; // "HH:MM"
}

/** Resposta do endpoint /api/store-status */
export interface StoreStatus {
  isOpen: boolean;
  reason: "schedule" | "manual_open" | "manual_closed" | "no_schedule";
  message: string;
  nextOpen?: string; // ex: "Segunda às 11:00"
  manualOverride?: "open" | "closed" | null;
}

