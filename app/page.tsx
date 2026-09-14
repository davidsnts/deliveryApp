"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Navbar } from "./components/Navbar";
import { CategoryList } from "./components/CategoryList";
import { ProductCard } from "./components/ProductCard";
import { CartDrawer } from "./components/CartDrawer";
import { AddressModal } from "./components/AddressModal";
import { MyOrdersModal } from "./components/MyOrdersModal";
import { Footer } from "./components/Footer";

import Link from "next/link";
import { Product, Category, CartItem, Address, FilterOption, Order } from "./types";
import {
  getSavedAddresses,
  saveSavedAddresses,
  getCurrentAddress,
  saveCurrentAddress,
  getDeviceId,
} from "./lib/storage";
import { fetchProducts, fetchCategories, fetchMyOrders } from "./lib/api";
import { Check, Utensils, ShoppingBag } from "lucide-react";

export default function Home() {
  // Menu Products & Categories (loaded from SQLite)
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Address State (synced with localStorage)
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [currentAddress, setCurrentAddress] = useState<Address | null>(null);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

  // My Orders State (browser-based tracking from SQLite)
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [isMyOrdersOpen, setIsMyOrdersOpen] = useState(false);

  // Cart & UI State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [currentFilter, setCurrentFilter] = useState<FilterOption>("all");

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // Synchronize with SQLite API on client mount & listen to changes
  useEffect(() => {
    const syncData = () => {
      fetchProducts().then(setProducts).catch(console.error);
      fetchCategories().then(setCategories).catch(console.error);
      
      const devId = getDeviceId();
      fetchMyOrders(devId).then(setMyOrders).catch(console.error);

      const savedAddresses = getSavedAddresses();
      setAddresses(savedAddresses);
      setCurrentAddress(getCurrentAddress());
    };

    syncData();

    window.addEventListener("delivery_products_updated", syncData);
    window.addEventListener("delivery_categories_updated", syncData);
    window.addEventListener("delivery_addresses_updated", syncData);
    window.addEventListener("delivery_current_address_updated", syncData);
    window.addEventListener("delivery_orders_updated", syncData);
    window.addEventListener("storage", syncData);

    return () => {
      window.removeEventListener("delivery_products_updated", syncData);
      window.removeEventListener("delivery_categories_updated", syncData);
      window.removeEventListener("delivery_addresses_updated", syncData);
      window.removeEventListener("delivery_current_address_updated", syncData);
      window.removeEventListener("delivery_orders_updated", syncData);
      window.removeEventListener("storage", syncData);
    };
  }, []);

  // Cart Handlers
  const handleAddToCart = (product: Product) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    triggerToast(`"${product.name}" adicionado à sacola!`);
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveItem = (productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  const handleApplyCoupon = (code: string) => {
    setAppliedCoupon(code);
    triggerToast(`Cupom ${code} aplicado com sucesso!`);
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    triggerToast("Cupom removido.");
  };

  // Filtered Products from dynamic state
  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesDesc = item.description.toLowerCase().includes(q);
        const matchesRest = item.restaurantName.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesRest) return false;
      }

      // Category filter
      if (selectedCategory !== "all" && item.category !== selectedCategory) {
        return false;
      }

      // Tag filter
      if (currentFilter === "popular" && !item.isPopular) return false;
      if (currentFilter === "free_delivery" && !item.freeDelivery) return false;
      if (currentFilter === "offers" && !item.isOffer) return false;
      if (currentFilter === "fast") {
        const minutes = parseInt(item.deliveryTime, 10);
        if (minutes > 30) return false;
      }

      return true;
    });
  }, [products, searchQuery, selectedCategory, currentFilter]);

  // Cart calculations
  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const cartSubtotal = cartItems.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0
  );

  const getProductCartQuantity = (productId: string) => {
    return cartItems.find((i) => i.product.id === productId)?.quantity || 0;
  };

  // Check if customer has active orders (in progress)
  const hasActiveOrder = myOrders.some(
    (o) => o.status === "pendente" || o.status === "em_preparo" || o.status === "saiu_entrega"
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center">
            <Check className="w-2.5 h-2.5 stroke-[3]" />
          </div>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Navigation */}
      <Navbar
        currentAddress={currentAddress}
        onOpenAddressModal={() => setIsAddressModalOpen(true)}
        cartCount={cartCount}
        cartSubtotal={cartSubtotal}
        onOpenCart={() => setIsCartOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        myOrdersCount={myOrders.length}
        hasActiveOrder={hasActiveOrder}
        onOpenMyOrders={() => setIsMyOrdersOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-24 sm:pb-12 space-y-6 sm:space-y-8">

        {/* Category Selector (Pratos e Bebidas) */}
        <CategoryList
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={(catId) => setSelectedCategory(catId)}
        />

        {/* Dishes & Drinks Feed */}
        <section className="pt-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <Utensils className="w-5 h-5 text-orange-600" />
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  {selectedCategory === "pratos"
                    ? (categories.find((c) => c.id === "pratos")?.name || "Pratos")
                    : selectedCategory === "bebidas"
                      ? (categories.find((c) => c.id === "bebidas")?.name || "Bebidas")
                      : "Cardápio Completo"}
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedCategory === "pratos"
                  ? "Pratos feitos com muito amor e dedicação"
                  : selectedCategory === "bebidas"
                    ? "Os melhores refrigerantes gelados"
                    : "Pratos e refrigerantes gelados para acompanhar"}
              </p>
            </div>
          </div>

          {/* Products Grid */}
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  quantityInCart={getProductCartQuantity(product.id)}
                  onAddToCart={handleAddToCart}
                  onUpdateQuantity={handleUpdateQuantity}
                />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center my-6">
              <div className="w-16 h-16 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center mx-auto mb-3">
                <Utensils className="w-8 h-8 stroke-1" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                Cardápio em preparação
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                Nenhum produto cadastrado no momento. Acesse a área administrativa para cadastrar os pratos e bebidas reais do restaurante.
              </p>
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-sm"
              >
                Cadastrar Itens no Painel Admin
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center my-6">
              <div className="w-16 h-16 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center mx-auto mb-3">
                <Utensils className="w-8 h-8 stroke-1" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                Nenhum item encontrado
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                Não encontramos resultados para a sua busca atual. Tente pesquisar por outro termo.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                  setCurrentFilter("all");
                }}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Limpar busca
              </button>
            </div>
          )}
        </section>

      </main>

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        currentAddress={currentAddress}
        onOpenAddressModal={() => setIsAddressModalOpen(true)}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
        appliedCoupon={appliedCoupon}
        onApplyCoupon={handleApplyCoupon}
        onRemoveCoupon={handleRemoveCoupon}
      />

      {/* Address Selection Modal */}
      <AddressModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        addresses={addresses}
        currentAddress={currentAddress}
        onSelectAddress={(addr) => {
          setCurrentAddress(addr);
          saveCurrentAddress(addr);
          triggerToast(`Endereço alterado para ${addr.rua}, ${addr.numero}`);
        }}
        onAddNewAddress={(newAddr) => {
          setAddresses((prev) => {
            const updated = [newAddr, ...prev];
            saveSavedAddresses(updated);
            return updated;
          });
          setCurrentAddress(newAddr);
          saveCurrentAddress(newAddr);
        }}
      />

      {/* Customer My Orders Modal */}
      <MyOrdersModal
        isOpen={isMyOrdersOpen}
        onClose={() => setIsMyOrdersOpen(false)}
        orders={myOrders}
      />

      {/* Footer */}
      <Footer />

      {/* Floating Bottom Cart Bar (Mobile Only) */}
      {cartCount > 0 && !isCartOpen && (
        <div className="fixed bottom-4 inset-x-3 sm:hidden z-30 animate-in slide-in-from-bottom-5 duration-300">
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="w-full py-3 px-4 bg-orange-600 active:scale-98 text-white rounded-2xl font-bold text-xs shadow-xl shadow-orange-600/35 flex items-center justify-between transition-transform cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div className="text-left">
                <span className="block font-black leading-tight text-sm">Ver Sacola</span>
                <span className="text-[10px] text-white/80">{cartCount} {cartCount === 1 ? "item adicionado" : "itens adicionados"}</span>
              </div>
            </div>
            <span className="font-black text-sm bg-black/15 px-3 py-1.5 rounded-xl border border-white/10">
              R$ {cartSubtotal.toFixed(2).replace(".", ",")}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
