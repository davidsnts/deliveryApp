export interface Category {
  id: string;
  name: string;
  icon: string;
  count: number;
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
