"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  UtensilsCrossed,
  ArrowLeft,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  FolderTree,
  RotateCcw,
  Search,
  CheckCircle2,
  Layers,
  Flame,
  Tag,
  Truck,
  ShoppingBag,
  Clock,
  Bike,
  Check,
  XCircle,
  MessageCircle,
  Receipt,
  Printer,
  ChevronRight,
  Phone,
  MapPin,
  CreditCard,
  User,
  Calendar,
} from "lucide-react";
import { Product, Category, Order, OrderStatus } from "../types";
import {
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  fetchCategories,
  updateCategories,
  fetchOrders,
  updateOrderStatusApi,
  deleteOrderApi,
  resetDatabaseApi,
} from "../lib/api";
import {
  getAdminAuth,
  setAdminAuth,
  clearAdminAuth,
} from "../lib/storage";

export default function AdminPage() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Data state
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Navigation & Filtering in Admin
  const [activeTab, setActiveTab] = useState<"orders" | "products" | "categories" | "settings">("orders");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchFilter, setSearchFilter] = useState("");

  // Orders Filter & Comanda
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("all");
  const [orderSearch, setOrderSearch] = useState("");
  const [selectedTicketOrder, setSelectedTicketOrder] = useState<Order | null>(null);

  // Modal Product State (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("pratos");
  const [formPrice, setFormPrice] = useState("");
  const [formOriginalPrice, setFormOriginalPrice] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formImage, setFormImage] = useState("");
  const [formDeliveryTime, setFormDeliveryTime] = useState("30-40 min");
  const [formIsPopular, setFormIsPopular] = useState(false);
  const [formIsOffer, setFormIsOffer] = useState(false);
  const [formFreeDelivery, setFormFreeDelivery] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Categories edit state
  const [editableCategories, setEditableCategories] = useState<Category[]>([]);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // Load auth and data on mount
  useEffect(() => {
    const isAuth = getAdminAuth();
    setIsAuthenticated(isAuth);
    if (isAuth) {
      loadData();
    }

    const handleSync = () => {
      if (getAdminAuth()) {
        loadData();
      }
    };

    window.addEventListener("delivery_orders_updated", handleSync);
    window.addEventListener("delivery_products_updated", handleSync);
    window.addEventListener("delivery_categories_updated", handleSync);
    window.addEventListener("storage", handleSync);

    return () => {
      window.removeEventListener("delivery_orders_updated", handleSync);
      window.removeEventListener("delivery_products_updated", handleSync);
      window.removeEventListener("delivery_categories_updated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  const loadData = async () => {
    try {
      const [ords, prods, cats] = await Promise.all([
        fetchOrders(),
        fetchProducts(),
        fetchCategories(),
      ]);
      setOrders(ords);
      setProducts(prods);
      setCategories(cats);
      setEditableCategories(JSON.parse(JSON.stringify(cats)));
    } catch (err) {
      console.error("Erro ao carregar dados do admin:", err);
    }
  };

  // Handle Login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (
      (loginUsername.trim().toLowerCase() === "admin" && loginPassword === "admin123") ||
      (loginUsername.trim().toLowerCase() === "manga" && loginPassword === "pimenta123")
    ) {
      setAdminAuth(true);
      setIsAuthenticated(true);
      loadData();
      triggerToast("Autenticado com sucesso no Painel!");
    } else {
      setLoginError("Usuário ou senha incorretos. (Dica: admin / admin123)");
    }
  };

  const handleLogout = () => {
    clearAdminAuth();
    setIsAuthenticated(false);
    setLoginUsername("");
    setLoginPassword("");
  };

  const fillQuickCredentials = () => {
    setLoginUsername("admin");
    setLoginPassword("admin123");
    setLoginError("");
  };

  // ----------------- ORDERS ACTIONS -----------------
  const handleChangeOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await updateOrderStatusApi(orderId, newStatus);
      const ords = await fetchOrders();
      setOrders(ords);
      const labels: Record<OrderStatus, string> = {
        pendente: "Pendente",
        em_preparo: "Em Preparo",
        saiu_entrega: "A Caminho / Saiu para Entrega",
        entregue: "Entregue",
        cancelado: "Cancelado",
      };
      triggerToast(`Status do pedido alterado para: ${labels[newStatus]}`);
    } catch (err) {
      console.error("Erro ao atualizar pedido:", err);
      triggerToast("Erro ao atualizar status do pedido.");
    }
  };

  const handleDeleteOrderAction = async (orderId: string) => {
    if (confirm(`Excluir permanentemente o pedido #${orderId}?`)) {
      try {
        await deleteOrderApi(orderId);
        const ords = await fetchOrders();
        setOrders(ords);
        triggerToast(`Pedido #${orderId} excluído.`);
      } catch (err) {
        console.error("Erro ao excluir pedido:", err);
        triggerToast("Erro ao excluir pedido.");
      }
    }
  };

  const getCustomerWhatsAppUrl = (phone: string, customerName: string, orderId: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const formatted = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
    const text = encodeURIComponent(
      `Olá ${customerName}! Aqui é do restaurante Manga com Pimenta sobre o seu pedido #${orderId}.`
    );
    return `https://wa.me/${formatted}?text=${text}`;
  };

  // ----------------- PRODUCTS ACTIONS -----------------
  const handleOpenCreateModal = () => {
    setEditingProductId(null);
    setFormName("");
    setFormCategory("pratos");
    setFormPrice("");
    setFormOriginalPrice("");
    setFormDescription("");
    setFormImage("https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80");
    setFormDeliveryTime("30-40 min");
    setFormIsPopular(false);
    setFormIsOffer(false);
    setFormFreeDelivery(false);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setEditingProductId(product.id);
    setFormName(product.name);
    setFormCategory(product.category);
    setFormPrice(product.price.toString());
    setFormOriginalPrice(product.originalPrice ? product.originalPrice.toString() : "");
    setFormDescription(product.description);
    setFormImage(product.image);
    setFormDeliveryTime(product.deliveryTime);
    setFormIsPopular(!!product.isPopular);
    setFormIsOffer(!!product.isOffer);
    setFormFreeDelivery(!!product.freeDelivery);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!formName.trim()) errors.name = "Nome é obrigatório";
    const parsedPrice = parseFloat(formPrice.replace(",", "."));
    if (isNaN(parsedPrice) || parsedPrice <= 0) errors.price = "Informe um preço válido";
    if (!formDescription.trim()) errors.description = "Descrição é obrigatória";
    if (!formImage.trim()) errors.image = "URL da imagem é obrigatória";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const parsedOriginalPrice = formOriginalPrice
      ? parseFloat(formOriginalPrice.replace(",", "."))
      : undefined;

    try {
      if (editingProductId) {
        await updateProduct(editingProductId, {
          name: formName.trim(),
          category: formCategory,
          price: parsedPrice,
          originalPrice: parsedOriginalPrice,
          description: formDescription.trim(),
          image: formImage.trim(),
          deliveryTime: formDeliveryTime.trim() || "30-40 min",
          isPopular: formIsPopular,
          isOffer: formIsOffer,
          freeDelivery: formFreeDelivery,
        });
        triggerToast("Item atualizado com sucesso!");
      } else {
        const newProduct: Product = {
          id: `item-${Date.now()}`,
          name: formName.trim(),
          category: formCategory,
          price: parsedPrice,
          originalPrice: parsedOriginalPrice,
          description: formDescription.trim(),
          image: formImage.trim(),
          restaurantId: "rest-1",
          restaurantName: "Manga Com Pimenta",
          rating: 5.0,
          reviewsCount: 1,
          deliveryTime: formDeliveryTime.trim() || "30-40 min",
          isPopular: formIsPopular,
          isOffer: formIsOffer,
          freeDelivery: formFreeDelivery,
        };
        await createProduct(newProduct);
        triggerToast("Novo item adicionado ao cardápio!");
      }

      await loadData();
      setIsModalOpen(false);
    } catch (err) {
      console.error("Erro ao salvar produto:", err);
      triggerToast("Erro ao salvar produto.");
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (confirm(`Tem certeza que deseja excluir "${name}" do cardápio?`)) {
      try {
        await deleteProduct(id);
        await loadData();
        triggerToast(`"${name}" foi removido do cardápio.`);
      } catch (err) {
        console.error("Erro ao excluir produto:", err);
        triggerToast("Erro ao excluir produto.");
      }
    }
  };

  const handleSaveCategories = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateCategories(editableCategories);
      await loadData();
      triggerToast("Categorias atualizadas com sucesso!");
    } catch (err) {
      console.error("Erro ao salvar categorias:", err);
      triggerToast("Erro ao salvar categorias.");
    }
  };

  const handleResetToDefault = async () => {
    if (confirm("Deseja realmente restaurar os itens e categorias originais de fábrica?")) {
      try {
        await resetDatabaseApi();
        await loadData();
        triggerToast("Cardápio restaurado para os itens padrão.");
      } catch (err) {
        console.error("Erro ao restaurar banco:", err);
        triggerToast("Erro ao restaurar cardápio.");
      }
    }
  };

  // Filtered orders
  const filteredOrders = orders.filter((ord) => {
    if (orderStatusFilter !== "all" && ord.status !== orderStatusFilter) return false;
    if (orderSearch.trim()) {
      const q = orderSearch.toLowerCase();
      const matchId = ord.id.toLowerCase().includes(q);
      const matchName = ord.customer.name.toLowerCase().includes(q);
      const matchPhone = ord.customer.phone.includes(q);
      const matchRua = ord.deliveryAddress.rua.toLowerCase().includes(q);
      return matchId || matchName || matchPhone || matchRua;
    }
    return true;
  });

  // Filtered products for admin view
  const filteredProducts = products.filter((p) => {
    if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
    }
    return true;
  });

  // Calculate Metrics
  const pendingOrdersCount = orders.filter((o) => o.status === "pendente").length;
  const preparingOrdersCount = orders.filter((o) => o.status === "em_preparo").length;
  const deliveryOrdersCount = orders.filter((o) => o.status === "saiu_entrega").length;
  const totalRevenue = orders
    .filter((o) => o.status !== "cancelado")
    .reduce((acc, o) => acc + o.total, 0);

  // Status Styling Helper
  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case "pendente":
        return {
          label: "Pendente",
          bg: "bg-amber-500/15 text-amber-400 border-amber-500/30",
          icon: Clock,
        };
      case "em_preparo":
        return {
          label: "Em Preparo",
          bg: "bg-blue-500/15 text-blue-400 border-blue-500/30",
          icon: Flame,
        };
      case "saiu_entrega":
        return {
          label: "A Caminho",
          bg: "bg-purple-500/15 text-purple-400 border-purple-500/30",
          icon: Bike,
        };
      case "entregue":
        return {
          label: "Entregue",
          bg: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
          icon: CheckCircle2,
        };
      case "cancelado":
        return {
          label: "Cancelado",
          bg: "bg-red-500/15 text-red-400 border-red-500/30",
          icon: XCircle,
        };
    }
  };

  // ----------------------------------------------------
  // RENDER: LOGIN SCREEN (if not authenticated)
  // ----------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-amber-600/20 rounded-full blur-3xl" />

        <div className="absolute top-6 left-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-700/60"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao Cardápio</span>
          </Link>
        </div>

        <div className="w-full max-w-md bg-slate-950/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-gradient-to-tr from-orange-600 to-amber-500 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-orange-600/30">
              <UtensilsCrossed className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Manga<span className="text-orange-500">Com Pimenta</span>
            </h1>
            <p className="text-xs font-semibold uppercase tracking-wider text-orange-400 mt-1">
              Painel de Gestão & Pedidos
            </p>
            <p className="text-xs text-slate-400 mt-2">
              Acesse para gerenciar os pedidos em tempo real e os itens do cardápio.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Usuário
              </label>
              <input
                type="text"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="admin"
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 focus:border-orange-500 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all placeholder:text-slate-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 pr-10 bg-slate-900 border border-slate-800 focus:border-orange-500 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all placeholder:text-slate-600"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="flex items-center gap-2 text-xs text-red-400 bg-red-950/40 border border-red-900/50 p-2.5 rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 px-4 bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-600/25 transition-all cursor-pointer mt-2"
            >
              Acessar Painel
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
            <span>Dica de acesso:</span>
            <button
              type="button"
              onClick={fillQuickCredentials}
              className="text-orange-400 hover:text-orange-300 font-semibold underline cursor-pointer"
            >
              Preencher dados de teste
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // RENDER: AUTHENTICATED ADMIN DASHBOARD
  // ----------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-orange-600 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-orange-600 flex items-center justify-center text-white">
              <UtensilsCrossed className="w-4 h-4" />
            </div>
            <div>
              <span className="font-black text-white tracking-tight text-base">
                Manga<span className="text-orange-500">Com Pimenta</span>
              </span>
              <span className="ml-2 text-[10px] bg-orange-500/20 text-orange-400 font-bold px-2 py-0.5 rounded-md border border-orange-500/30 uppercase tracking-wide">
                Painel Restaurante
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Ver Loja / Cardápio</span>
            </Link>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-200 border border-red-900/50 text-xs font-semibold transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Metric Cards Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Novos Pedidos
              </p>
              {pendingOrdersCount > 0 && (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                </span>
              )}
            </div>
            <h3 className="text-2xl font-black text-amber-400 mt-1">{pendingOrdersCount}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Aguardando aceite</p>
          </div>

          <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 shadow-xs">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Na Cozinha
            </p>
            <h3 className="text-2xl font-black text-blue-400 mt-1">{preparingOrdersCount}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Em preparação</p>
          </div>

          <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 shadow-xs">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Em Entrega
            </p>
            <h3 className="text-2xl font-black text-purple-400 mt-1">{deliveryOrdersCount}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Com o motoboy</p>
          </div>

          <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 shadow-xs">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Faturamento
            </p>
            <h3 className="text-2xl font-black text-emerald-400 mt-1">
              R$ {totalRevenue.toFixed(2).replace(".", ",")}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Total de pedidos válidos</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("orders")}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === "orders"
              ? "border-orange-500 text-orange-400 bg-orange-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Gestão de Pedidos</span>
            {pendingOrdersCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-500 text-slate-950 rounded-full animate-pulse">
                {pendingOrdersCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("products")}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === "products"
              ? "border-orange-500 text-orange-400 bg-orange-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>Itens do Cardápio ({products.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("categories")}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === "categories"
              ? "border-orange-500 text-orange-400 bg-orange-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
          >
            <FolderTree className="w-4 h-4" />
            <span>Categorias (Pratos e Bebidas)</span>
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === "settings"
              ? "border-orange-500 text-orange-400 bg-orange-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>Restaurar Dados</span>
          </button>
        </div>

        {/* ==================================================== */}
        {/* TAB: ORDERS MANAGEMENT */}
        {/* ==================================================== */}
        {activeTab === "orders" && (
          <div className="space-y-4">
            {/* Filter and Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                {[
                  { id: "all", label: "Todos", count: orders.length },
                  { id: "pendente", label: "🟡 Pendentes", count: orders.filter((o) => o.status === "pendente").length },
                  { id: "em_preparo", label: "🔵 Na Cozinha", count: orders.filter((o) => o.status === "em_preparo").length },
                  { id: "saiu_entrega", label: "🟣 A Caminho", count: orders.filter((o) => o.status === "saiu_entrega").length },
                  { id: "entregue", label: "🟢 Entregues", count: orders.filter((o) => o.status === "entregue").length },
                  { id: "cancelado", label: "🔴 Cancelados", count: orders.filter((o) => o.status === "cancelado").length },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setOrderStatusFilter(st.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${orderStatusFilter === st.id
                      ? "bg-orange-600 text-white shadow-md shadow-orange-600/20"
                      : "bg-slate-900 text-slate-400 hover:bg-slate-850 border border-slate-800"
                      }`}
                  >
                    <span>{st.label}</span>
                    <span className="ml-1.5 opacity-70 text-[10px]">({st.count})</span>
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Buscar por código, cliente ou rua..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            {/* Orders Feed - Estilo Comanda */}
            {filteredOrders.length === 0 ? (
              <div className="bg-slate-950 rounded-2xl border border-slate-800 p-12 text-center text-slate-400">
                <ShoppingBag className="w-12 h-12 mx-auto text-slate-600 mb-3" />
                <p className="font-bold text-slate-300">Nenhum pedido encontrado neste filtro</p>
                <p className="text-xs mt-1">Os novos pedidos feitos pelos clientes aparecerão aqui automaticamente.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                {filteredOrders.map((ord) => {
                  const badge = getStatusBadge(ord.status);
                  const BadgeIcon = badge.icon;
                  const orderDate = new Date(ord.createdAt);
                  const formattedTime = orderDate.toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const formattedDay = orderDate.toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                  });

                  return (
                    <div
                      key={ord.id}
                      className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 shadow-sm flex flex-col justify-between transition-all relative"
                    >
                      {/* Top Header: ID, Hora e Status */}
                      <div className="flex items-center justify-between pb-2.5 border-b border-dashed border-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-orange-400 text-sm tracking-wide">
                            #{ord.id.slice(-6)}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {formattedDay} às {formattedTime}
                          </span>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg border ${badge.bg}`}
                        >
                          <BadgeIcon className="w-3 h-3" />
                          <span>{badge.label}</span>
                        </span>
                      </div>

                      {/* Cliente e Endereço */}
                      <div className="py-2.5 space-y-1 text-xs border-b border-dashed border-slate-800">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-100 flex items-center gap-1.5 truncate">
                            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            {ord.customer.name}
                          </span>

                          <a
                            href={getCustomerWhatsAppUrl(ord.customer.phone, ord.customer.name, ord.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/50 px-2 py-0.5 rounded-lg border border-emerald-900/50 transition-colors shrink-0"
                            title="Conversar no WhatsApp"
                          >
                            <MessageCircle className="w-3 h-3" />
                            <span>{ord.customer.phone}</span>
                          </a>
                        </div>

                        <p className="text-[11px] text-slate-400 flex items-start gap-1 leading-tight">
                          <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
                          <span>
                            {ord.deliveryAddress.rua}, {ord.deliveryAddress.numero} ({ord.deliveryAddress.bairro})
                          </span>
                        </p>
                      </div>

                      {/* Lista de Itens - Estilo Comanda Sem Imagem */}
                      <div className="py-2.5 space-y-1.5 flex-1 min-h-[70px]">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                          Itens do Pedido ({ord.items.length})
                        </p>
                        <div className="space-y-2">
                          {ord.items.map((item, idx) => (
                            <div key={idx} className="flex items-start justify-between text-xs gap-2">
                              <div className="flex items-start gap-1.5 flex-1 min-w-0">
                                <span className="font-mono font-bold text-orange-400 bg-orange-500/10 px-1 py-0.5 rounded text-[11px] shrink-0 border border-orange-500/20 mt-0.5">
                                  {item.quantity}x
                                </span>
                                <div className="min-w-0">
                                  <p className="text-slate-200 font-medium leading-tight">
                                    {item.product.name}
                                  </p>
                                  {item.product.description && (
                                    <p className="text-[10px] text-slate-500 leading-snug mt-0.5 line-clamp-2">
                                      {item.product.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <span className="font-mono text-[11px] text-slate-400 shrink-0 mt-0.5">
                                R$ {(item.product.price * item.quantity).toFixed(2).replace(".", ",")}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Observações do Pedido */}
                      {ord.notes && (
                        <div className="pt-2 pb-1 border-t border-dashed border-slate-800">
                          <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider font-mono mb-1 flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" />
                            Observações
                          </p>
                          <p className="text-xs text-amber-200 bg-amber-500/10 border border-amber-500/20 rounded-xl px-2.5 py-2 leading-relaxed">
                            {ord.notes}
                          </p>
                        </div>
                      )}

                      {/* Resumo Financeiro & Pagamento */}
                      <div className="pt-2.5 pb-2 border-t border-dashed border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 font-medium">
                            {ord.paymentMethod}
                          </span>
                          <div className="text-right">
                            <span className="text-[11px] text-slate-400">Total: </span>
                            <span className="font-black text-white text-sm font-mono">
                              R$ {ord.total.toFixed(2).replace(".", ",")}
                            </span>
                          </div>
                        </div>

                        {ord.deliveryFee > 0 && (
                          <div className="flex justify-between text-[10px] text-slate-500">
                            <span>Taxa de Entrega</span>
                            <span>R$ {ord.deliveryFee.toFixed(2).replace(".", ",")}</span>
                          </div>
                        )}
                      </div>

                      {/* Botões de Ação da Comanda */}
                      <div className="pt-2 border-t border-slate-850 flex items-center justify-between gap-2">
                        {/* Ações principais de avanço */}
                        <div className="flex items-center gap-1.5 flex-1">
                          {ord.status === "pendente" && (
                            <>
                              <button
                                onClick={() => handleChangeOrderStatus(ord.id, "em_preparo")}
                                className="flex-1 py-1.5 px-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
                              >
                                <Flame className="w-3 h-3" />
                                <span>Aceitar</span>
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Tem certeza que realmente deseja recusar e cancelar o pedido #${ord.id.slice(-6)}?`)) {
                                    handleChangeOrderStatus(ord.id, "cancelado");
                                  }
                                }}
                                className="py-1.5 px-2 text-slate-400 hover:text-red-400 text-xs font-medium transition-colors cursor-pointer"
                              >
                                Recusar
                              </button>
                            </>
                          )}

                          {ord.status === "em_preparo" && (
                            <button
                              onClick={() => handleChangeOrderStatus(ord.id, "saiu_entrega")}
                              className="w-full py-1.5 px-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <Bike className="w-3.5 h-3.5" />
                              <span>Despachar Entrega</span>
                            </button>
                          )}

                          {ord.status === "saiu_entrega" && (
                            <button
                              onClick={() => handleChangeOrderStatus(ord.id, "entregue")}
                              className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Concluir Entrega</span>
                            </button>
                          )}

                          {ord.status === "entregue" && (
                            <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 py-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Pedido Concluído
                            </span>
                          )}

                          {ord.status === "cancelado" && (
                            <span className="text-[11px] text-red-400 font-semibold flex items-center gap-1 py-1">
                              <XCircle className="w-3.5 h-3.5" /> Pedido Cancelado
                            </span>
                          )}
                        </div>

                        {/* Ações secundárias: Comanda Térmica e Excluir */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setSelectedTicketOrder(ord)}
                            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-800 text-xs transition-colors cursor-pointer"
                            title="Imprimir / Ver Comanda Térmica"
                          >
                            <Receipt className="w-3.5 h-3.5 text-orange-400" />
                          </button>

                          <button
                            onClick={() => handleDeleteOrderAction(ord.id)}
                            className="p-1.5 text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                            title="Excluir Pedido"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB: PRODUCTS MANAGEMENT */}
        {/* ==================================================== */}
        {activeTab === "products" && (
          <div className="space-y-4">
            {/* Filter and Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setCategoryFilter("all")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${categoryFilter === "all"
                    ? "bg-orange-600 text-white shadow-md shadow-orange-600/20"
                    : "bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800"
                    }`}
                >
                  Todos ({products.length})
                </button>
                <button
                  onClick={() => setCategoryFilter("pratos")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${categoryFilter === "pratos"
                    ? "bg-orange-600 text-white shadow-md shadow-orange-600/20"
                    : "bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800"
                    }`}
                >
                  <span>🍲</span>
                  <span>Pratos</span>
                </button>
                <button
                  onClick={() => setCategoryFilter("bebidas")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${categoryFilter === "bebidas"
                    ? "bg-orange-600 text-white shadow-md shadow-orange-600/20"
                    : "bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800"
                    }`}
                >
                  <span>🥤</span>
                  <span>Bebidas</span>
                </button>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-60">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Filtrar por nome..."
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                <button
                  onClick={handleOpenCreateModal}
                  className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold text-xs shadow-md shadow-orange-600/20 transition-all cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>Novo Item</span>
                </button>
              </div>
            </div>

            {/* Products List Grid */}
            {filteredProducts.length === 0 ? (
              <div className="bg-slate-950 rounded-2xl border border-slate-800 p-12 text-center text-slate-400">
                <UtensilsCrossed className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                <p className="font-bold text-slate-300">Nenhum item encontrado no filtro</p>
                <p className="text-xs mt-1">Crie um novo item ou limpe a busca.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProducts.map((prod) => (
                  <div
                    key={prod.id}
                    className="bg-slate-950 border border-slate-800/90 rounded-2xl overflow-hidden hover:border-slate-700 transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Image header with category badge */}
                      <div className="relative h-36 w-full bg-slate-900 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={prod.image}
                          alt={prod.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 left-2 flex gap-1">
                          <span className="bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-700/60 uppercase">
                            {prod.category === "pratos" ? "🍲 Prato" : "🥤 Bebida"}
                          </span>
                        </div>
                        <div className="absolute top-2 right-2 flex gap-1">
                          {prod.isPopular && (
                            <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-sm">
                              <Flame className="w-2.5 h-2.5" /> Popular
                            </span>
                          )}
                          {prod.isOffer && (
                            <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-sm">
                              <Tag className="w-2.5 h-2.5" /> Oferta
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-white text-sm line-clamp-1">
                            {prod.name}
                          </h4>
                          <span className="font-black text-orange-400 text-sm whitespace-nowrap">
                            R$ {prod.price.toFixed(2).replace(".", ",")}
                          </span>
                        </div>

                        {prod.originalPrice && (
                          <span className="text-[11px] text-slate-500 line-through block">
                            De R$ {prod.originalPrice.toFixed(2).replace(".", ",")}
                          </span>
                        )}

                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {prod.description}
                        </p>

                        <div className="flex items-center gap-3 pt-2 text-[11px] text-slate-500 border-t border-slate-900">
                          <span>⏱️ {prod.deliveryTime}</span>
                          {prod.freeDelivery && (
                            <span className="text-emerald-400 font-semibold flex items-center gap-1">
                              <Truck className="w-3 h-3" /> Frete Grátis
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions footer */}
                    <div className="p-3 bg-slate-900/50 border-t border-slate-850 flex gap-2">
                      <button
                        onClick={() => handleOpenEditModal(prod)}
                        className="flex-1 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5 text-orange-400" />
                        <span>Editar</span>
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(prod.id, prod.name)}
                        className="p-1.5 bg-red-950/30 hover:bg-red-900/50 text-red-400 hover:text-red-200 border border-red-900/40 rounded-xl text-xs transition-colors cursor-pointer"
                        title="Excluir item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB: CATEGORIES MANAGEMENT */}
        {/* ==================================================== */}
        {activeTab === "categories" && (
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 max-w-2xl mx-auto space-y-6">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-orange-500" />
                Gerenciar as 2 Categorias Principais
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                O cardápio divide-se em duas categorias fundamentais: <strong>Pratos</strong> e <strong>Bebidas</strong>. Você pode personalizar os nomes e ícones exibidos na vitrine.
              </p>
            </div>

            <form onSubmit={handleSaveCategories} className="space-y-4">
              {editableCategories.map((cat, idx) => (
                <div
                  key={cat.id}
                  className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">
                      Identificador: {cat.id}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {products.filter((p) => p.category === cat.id).length} itens vinculados
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    <div className="col-span-1">
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Ícone / Emoji
                      </label>
                      <input
                        type="text"
                        value={cat.icon}
                        onChange={(e) => {
                          const updated = [...editableCategories];
                          updated[idx].icon = e.target.value;
                          setEditableCategories(updated);
                        }}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-center text-lg focus:outline-none focus:border-orange-500"
                        required
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Nome da Categoria
                      </label>
                      <input
                        type="text"
                        value={cat.name}
                        onChange={(e) => {
                          const updated = [...editableCategories];
                          updated[idx].name = e.target.value;
                          setEditableCategories(updated);
                        }}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-orange-500 text-white font-semibold"
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="submit"
                className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-600/20 transition-all cursor-pointer"
              >
                Salvar Alterações das Categorias
              </button>
            </form>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB: RESTORE SETTINGS */}
        {/* ==================================================== */}
        {activeTab === "settings" && (
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 max-w-xl mx-auto text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Restaurar Cardápio de Fábrica
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
                Se você adicionou itens de teste ou deseja reiniciar todas as alterações para os pratos típicos mineiros e refrigerantes originais, clique no botão abaixo.
              </p>
            </div>

            <button
              onClick={handleResetToDefault}
              className="py-2.5 px-5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-amber-600/20"
            >
              Restaurar Itens e Categorias Originais
            </button>
          </div>
        )}

      </main>

      {/* ==================================================== */}
      {/* THERMAL TICKET / COMANDA MODAL */}
      {/* ==================================================== */}
      {selectedTicketOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white text-slate-950 w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl flex flex-col font-mono text-xs">
            {/* Ticket Header */}
            <div className="p-4 bg-slate-100 border-b border-dashed border-slate-300 flex items-center justify-between">
              <span className="font-bold text-sm">Comanda de Pedido</span>
              <button
                onClick={() => setSelectedTicketOrder(null)}
                className="text-slate-500 hover:text-slate-800 p-1 cursor-pointer font-sans"
              >
                ✕
              </button>
            </div>

            {/* Ticket Body */}
            <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              <div className="text-center border-b border-dashed border-slate-300 pb-3">
                <h3 className="font-black text-base uppercase">Manga Com Pimenta</h3>
                <p className="text-[11px] text-slate-600">Comida Mineira & Delivery</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Pedido: <strong>#{selectedTicketOrder.id}</strong>
                </p>
                <p className="text-[10px] text-slate-500">
                  {new Date(selectedTicketOrder.createdAt).toLocaleString("pt-BR")}
                </p>
              </div>

              {/* Customer and Address */}
              <div className="space-y-1 text-[11px] border-b border-dashed border-slate-300 pb-3">
                <p><strong>Cliente:</strong> {selectedTicketOrder.customer.name}</p>
                <p><strong>Tel/Zap:</strong> {selectedTicketOrder.customer.phone}</p>
                <p><strong>Endereço:</strong> {selectedTicketOrder.deliveryAddress.rua}, {selectedTicketOrder.deliveryAddress.numero}</p>
                <p><strong>Bairro:</strong> {selectedTicketOrder.deliveryAddress.bairro} ({selectedTicketOrder.deliveryAddress.label})</p>
                <p><strong>Pagamento:</strong> {selectedTicketOrder.paymentMethod}</p>
              </div>

              {/* Items Table */}
              <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-3">
                <p className="font-bold uppercase tracking-wider text-[10px] text-slate-500 mb-1">
                  Itens:
                </p>
                {selectedTicketOrder.items.map((item, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold">
                        {item.quantity}x {item.product.name}
                      </span>
                      <span className="font-bold shrink-0 ml-2">
                        R$ {(item.product.price * item.quantity).toFixed(2).replace(".", ",")}
                      </span>
                    </div>
                    {item.product.description && (
                      <p className="text-[10px] text-slate-500 leading-snug pl-4">
                        {item.product.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Notes on Ticket */}
              {selectedTicketOrder.notes && (
                <div className="border-b border-dashed border-slate-300 pb-3">
                  <p className="font-bold uppercase tracking-wider text-[10px] text-slate-500 mb-1">
                    Obs.:
                  </p>
                  <p className="text-xs font-medium text-slate-800 leading-snug">
                    {selectedTicketOrder.notes}
                  </p>
                </div>
              )}

              {/* Totals */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>R$ {selectedTicketOrder.subtotal.toFixed(2).replace(".", ",")}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Taxa de Entrega</span>
                  <span>
                    {selectedTicketOrder.deliveryFee === 0
                      ? "Grátis"
                      : `R$ ${selectedTicketOrder.deliveryFee.toFixed(2).replace(".", ",")}`}
                  </span>
                </div>
                {selectedTicketOrder.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Desconto</span>
                    <span>- R$ {selectedTicketOrder.discount.toFixed(2).replace(".", ",")}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black pt-2 border-t border-slate-300">
                  <span>TOTAL A COBRAR</span>
                  <span>R$ {selectedTicketOrder.total.toFixed(2).replace(".", ",")}</span>
                </div>
              </div>
            </div>

            {/* Ticket Footer Buttons */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-2 font-sans">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Comanda</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* CREATE / EDIT PRODUCT MODAL */}
      {/* ==================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-slate-950 border border-slate-800 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-850">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-600/20 text-orange-400 flex items-center justify-center border border-orange-500/30">
                  <Pencil className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-white text-base">
                  {editingProductId ? "Editar Item do Cardápio" : "Adicionar Novo Item"}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-900 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Categoria *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormCategory("pratos")}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 transition-all cursor-pointer ${formCategory === "pratos"
                      ? "bg-orange-600 text-white border-orange-600"
                      : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-850"
                      }`}
                  >
                    <span>🍲</span>
                    <span>Pratos</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormCategory("bebidas")}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 transition-all cursor-pointer ${formCategory === "bebidas"
                      ? "bg-orange-600 text-white border-orange-600"
                      : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-850"
                      }`}
                  >
                    <span>🥤</span>
                    <span>Bebidas</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome do Item *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Feijão Tropeiro Tradicional"
                  className={`w-full px-3 py-2 bg-slate-900 border rounded-xl text-xs text-white focus:outline-none focus:border-orange-500 ${formErrors.name ? "border-red-500" : "border-slate-800"
                    }`}
                />
                {formErrors.name && (
                  <p className="text-[10px] text-red-400 mt-1">{formErrors.name}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Preço de Venda (R$) *
                  </label>
                  <input
                    type="text"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="Ex: 38.90"
                    className={`w-full px-3 py-2 bg-slate-900 border rounded-xl text-xs text-white focus:outline-none focus:border-orange-500 ${formErrors.price ? "border-red-500" : "border-slate-800"
                      }`}
                  />
                  {formErrors.price && (
                    <p className="text-[10px] text-red-400 mt-1">{formErrors.price}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Preço Original / De (Opcional)
                  </label>
                  <input
                    type="text"
                    value={formOriginalPrice}
                    onChange={(e) => setFormOriginalPrice(e.target.value)}
                    placeholder="Ex: 45.00"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Descrição dos Ingredientes / Detalhes *
                </label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Descreva os ingredientes, acompanhamentos e sabor..."
                  className={`w-full px-3 py-2 bg-slate-900 border rounded-xl text-xs text-white focus:outline-none focus:border-orange-500 ${formErrors.description ? "border-red-500" : "border-slate-800"
                    }`}
                />
                {formErrors.description && (
                  <p className="text-[10px] text-red-400 mt-1">{formErrors.description}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  URL da Foto *
                </label>
                <input
                  type="url"
                  value={formImage}
                  onChange={(e) => setFormImage(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className={`w-full px-3 py-2 bg-slate-900 border rounded-xl text-xs text-white focus:outline-none focus:border-orange-500 ${formErrors.image ? "border-red-500" : "border-slate-800"
                    }`}
                />
                {formImage && (
                  <div className="mt-2 relative w-full h-28 rounded-xl overflow-hidden border border-slate-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={formImage}
                      alt="Prévia"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tempo Estimado de Entrega / Preparo
                </label>
                <input
                  type="text"
                  value={formDeliveryTime}
                  onChange={(e) => setFormDeliveryTime(e.target.value)}
                  placeholder="Ex: 30-40 min"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2">
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Destaques e Selos
                </span>

                <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsPopular}
                    onChange={(e) => setFormIsPopular(e.target.checked)}
                    className="rounded text-orange-600 focus:ring-orange-500"
                  />
                  <span>Marcar como <strong>Mais Pedido / Popular</strong> 🔥</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsOffer}
                    onChange={(e) => setFormIsOffer(e.target.checked)}
                    className="rounded text-orange-600 focus:ring-orange-500"
                  />
                  <span>Marcar como <strong>Item em Oferta / Promoção</strong> 🏷️</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formFreeDelivery}
                    onChange={(e) => setFormFreeDelivery(e.target.checked)}
                    className="rounded text-orange-600 focus:ring-orange-500"
                  />
                  <span>Oferecer <strong>Frete Grátis</strong> neste item 🛵</span>
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 px-4 text-xs font-semibold text-slate-400 bg-slate-900 hover:bg-slate-850 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 rounded-xl shadow-md shadow-orange-600/25 transition-colors cursor-pointer"
                >
                  {editingProductId ? "Salvar Alterações" : "Cadastrar Item"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
