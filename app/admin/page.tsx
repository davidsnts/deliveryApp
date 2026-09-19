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
  Bell,
  BellRing,
  BellOff,
  Volume2,
  Loader2,
} from "lucide-react";
import { Product, Category, Order, OrderStatus, DeliverySettings, StoreHours, StoreStatus } from "../types";
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
  fetchDeliverySettings,
  updateDeliverySettings,
  fetchStoreHours,
  updateStoreHours,
  fetchStoreStatus,
  setStoreOverride,
} from "../lib/api";
import {
  getAdminAuth,
  setAdminAuth,
  clearAdminAuth,
} from "../lib/storage";
import { gerarUrlRotaOSM, calcularValorFrete } from "../lib/frete";
import {
  tocarSomNovoPedido,
  pedirPermissaoNotificacao,
  dispararNotificacaoPedido,
  dispararNotificacaoPendentes,   // novo
  registrarServiceWorker,         // novo
  destravarAudio,                 // novo
  obterStatusPermissaoNotificacao,
} from "../lib/notifications";
import { criarTimer } from "../lib/backgroundTimer";   // novo
import { UsersTab } from "./components/UsersTab";
import { Users } from "lucide-react";

export default function AdminPage() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [pendingAlert, setPendingAlert] = useState<{ count: number; oldestMin: number } | null>(null);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("🍽️");

  // Data state
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Action Loading States
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [isSavingCategories, setIsSavingCategories] = useState(false);
  const [isResettingDatabase, setIsResettingDatabase] = useState(false);

  // Notification State & Polling Refs
  const [notificationPermission, setNotificationPermission] = useState<
    "granted" | "denied" | "default" | "unsupported"
  >("default");
  const knownOrderIdsRef = React.useRef<Set<string>>(new Set());
  const isInitialOrdersLoadedRef = React.useRef(false);

  // Delivery Settings State
  const [deliverySettings, setDeliverySettings] = useState<DeliverySettings>({
    id: "default",
    raioMaximoKm: 10.0,
    taxaBase: 5.0,
    kmBase: 2.0,
    valorKmAte5Km: 1.5,
    valorKmAte10Km: 1.8,
  });
  const [isSavingDeliverySettings, setIsSavingDeliverySettings] = useState(false);
  const [simuladorCustomKm, setSimuladorCustomKm] = useState<string>("4.5");

  // Store Hours State
  const [storeHours, setStoreHours] = useState<StoreHours[]>([]);
  const [isSavingHours, setIsSavingHours] = useState(false);
  const [storeStatus, setStoreStatus] = useState<StoreStatus | null>(null);
  const [isTogglingStore, setIsTogglingStore] = useState(false);

  // Navigation & Filtering in Admin
  const [activeTab, setActiveTab] = useState<"orders" | "products" | "categories" | "delivery" | "settings" | "horarios" | "users">("orders");
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
    setNotificationPermission(obterStatusPermissaoNotificacao());

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

  // Polling em tempo real (a cada 4s) para detectar novos pedidos feitos por clientes
  useEffect(() => {
    if (!isAuthenticated) return;

    const stopTimer = criarTimer(async () => {
      try {
        const latestOrders = await fetchOrders();

        // Se for a primeira carga via polling
        if (!isInitialOrdersLoadedRef.current) {
          latestOrders.forEach((o) => knownOrderIdsRef.current.add(o.id));
          isInitialOrdersLoadedRef.current = true;
          setOrders(latestOrders);
          return;
        }

        // Filtra pedidos que ainda não tínhamos registrado
        const novosPedidos = latestOrders.filter(
          (o) => !knownOrderIdsRef.current.has(o.id)
        );

        if (novosPedidos.length > 0) {
          // Registra novos pedidos
          novosPedidos.forEach((o) => knownOrderIdsRef.current.add(o.id));
          setOrders(latestOrders);

          // 1. Alerta Sonoro de Comanda ("Ding-Dong")
          tocarSomNovoPedido();

          // 2. Dispara Notificação Nativa do Navegador (mesmo com a aba em segundo plano)
          novosPedidos.forEach((novo) => {
            dispararNotificacaoPedido(novo);
          });

          // 3. Alerta Visual na tela
          const primeiro = novosPedidos[0];
          triggerToast(
            `🔔 Novo Pedido #${primeiro.id.slice(-6)} recebido! (${primeiro.customer?.name || "Cliente"})`
          );
        }
      } catch (err) {
        // Silencia falhas transitórias de conexão
      }
    }, 4000);

    return stopTimer;
  }, [isAuthenticated]);
  // Lembrete a cada 5 min enquanto houver pedidos pendentes
  useEffect(() => {
    if (!isAuthenticated) return;

    const stopTimer = criarTimer(async () => {
      try {
        const latest = await fetchOrders(); // busca dados frescos
        const pendentes = latest.filter((o) => o.status === "pendente");

        setOrders(latest);

        if (pendentes.length === 0) {
          setPendingAlert(null);
          return;
        }

        const maisAntigo = Math.min(...pendentes.map((o) => new Date(o.createdAt).getTime()));
        setPendingAlert({
          count: pendentes.length,
          oldestMin: Math.floor((Date.now() - maisAntigo) / 60000),
        });

        tocarSomNovoPedido();
        dispararNotificacaoPendentes(pendentes.length);
      } catch {
        // ignora falhas transitórias
      }
    }, 5 * 60 * 1000);

    return stopTimer;
  }, [isAuthenticated]);

  // Registra o Service Worker e destrava o áudio na primeira interação
  useEffect(() => {
    if (!isAuthenticated) return;

    registrarServiceWorker();

    const destravar = () => destravarAudio();
    window.addEventListener("pointerdown", destravar, { once: true });
    window.addEventListener("keydown", destravar, { once: true });
    return () => {
      window.removeEventListener("pointerdown", destravar);
      window.removeEventListener("keydown", destravar);
    };
  }, [isAuthenticated]);

  // Mantém a tela ligada (útil em tablet/celular no balcão)
  useEffect(() => {
    if (!isAuthenticated || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;

    let lock: WakeLockSentinel | null = null;
    let cancelado = false;

    const pedir = async () => {
      try {
        lock = await navigator.wakeLock.request("screen");
        if (cancelado) lock.release().catch(() => { });
      } catch { }
    };
    const aoVoltar = () => {
      if (document.visibilityState === "visible") pedir();
    };

    pedir();
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      cancelado = true;
      document.removeEventListener("visibilitychange", aoVoltar);
      lock?.release().catch(() => { });
    };
  }, [isAuthenticated]);

  const loadData = async () => {
    try {
      const [ords, prods, cats, delivSettings, hours, status] = await Promise.all([
        fetchOrders(),
        fetchProducts(),
        fetchCategories(),
        fetchDeliverySettings().catch(() => null),
        fetchStoreHours().catch(() => []),
        fetchStoreStatus().catch(() => null),
      ]);
      setOrders(ords);

      // Marca pedidos existentes como conhecidos para não disparar alerta antigo
      if (!isInitialOrdersLoadedRef.current) {
        ords.forEach((o) => knownOrderIdsRef.current.add(o.id));
        isInitialOrdersLoadedRef.current = true;
      }

      setProducts(prods);
      setCategories(cats);
      setEditableCategories(JSON.parse(JSON.stringify(cats)));
      if (delivSettings) setDeliverySettings(delivSettings);
      if (hours.length > 0) setStoreHours(hours);
      if (status) setStoreStatus(status);
    } catch (err) {
      console.error("Erro ao carregar dados do admin:", err);
    }
  };

  const handleRequestNotificationPermission = async () => {
    const status = await pedirPermissaoNotificacao();
    setNotificationPermission(status);
    if (status === "granted") {
      tocarSomNovoPedido();
      triggerToast("Notificações no navegador ativadas com sucesso!");
    } else if (status === "denied") {
      alert(
        "As notificações estão bloqueadas no seu navegador. Para ativar, clique no ícone de cadeado/ajustes ao lado da URL e permita as notificações."
      );
    }
  };

  const handleTestNotification = () => {
    tocarSomNovoPedido();
    const fakeOrder: Order = {
      id: "PED-" + Math.floor(100000 + Math.random() * 900000),
      createdAt: new Date().toISOString(),
      customer: { name: "Cliente Exemplo", phone: "(32) 99999-9999" },
      deliveryAddress: {
        id: "addr-teste",
        label: "Casa",
        rua: "Rua de Exemplo",
        numero: "123",
        bairro: "Centro",
      },
      items: [],
      subtotal: 45.0,
      deliveryFee: 5.0,
      discount: 0,
      total: 50.0,
      paymentMethod: "PIX",
      status: "pendente",
    };
    dispararNotificacaoPedido(fakeOrder);
    triggerToast("Teste de notificação e som de comanda emitido!");
  };

  const handleSaveDeliverySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingDeliverySettings(true);
      const updated = await updateDeliverySettings(deliverySettings);
      setDeliverySettings(updated);
      triggerToast("Configurações de frete salvas com sucesso!");
    } catch (err) {
      console.error("Erro ao salvar frete:", err);
      alert("Falha ao salvar configurações de frete.");
    } finally {
      setIsSavingDeliverySettings(false);
    }
  };

  const handleSaveStoreHours = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingHours(true);
      const updated = await updateStoreHours(storeHours);
      setStoreHours(updated);
      triggerToast("Horários de funcionamento salvos com sucesso!");
    } catch (err) {
      console.error("Erro ao salvar horários:", err);
      alert("Falha ao salvar horários de funcionamento.");
    } finally {
      setIsSavingHours(false);
    }
  };

  const handleToggleStore = async (targetState: "open" | "closed" | null) => {
    try {
      setIsTogglingStore(true);
      const ok = await setStoreOverride(targetState);
      if (ok) {
        const newStatus = await fetchStoreStatus();
        setStoreStatus(newStatus);
        const msg =
          targetState === "open" ? "Loja aberta manualmente!" :
            targetState === "closed" ? "Loja fechada manualmente!" :
              "Override removido — seguindo horário automático.";
        triggerToast(msg);
      }
    } catch (err) {
      console.error("Erro ao alterar status da loja:", err);
    } finally {
      setIsTogglingStore(false);
    }
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;

    const newSlug = newCategoryName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "-");

    const newCategory: Category = {
      id: newSlug || `cat-${Date.now()}`,
      name: newCategoryName.trim(),
      icon: newCategoryIcon.trim() || "🍽️",
    };

    setEditableCategories((prev) => [...prev, newCategory]);
    setNewCategoryName("");
    setNewCategoryIcon("🍽️");
    triggerToast("Categoria adicionada à lista! Clique em Salvar para confirmar.");
  };

  const handleRemoveCategory = (id: string) => {
    if (editableCategories.length <= 1) {
      triggerToast("Sua loja precisa ter pelo menos uma categoria.");
      return;
    }
    setEditableCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);

    try {
      // ⚠️ ALTERE AQUI: de "/api/users/login" para "/api/admin/login"
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: loginUsername.trim(),
          password: loginPassword,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setAdminAuth(true);
        setIsAuthenticated(true);
        await loadData();
        triggerToast(`Bem-vindo, ${data.user.name || "Administrador"}!`);
      } else {
        setLoginError(data.error || "Usuário ou senha incorretos.");
      }
    } catch (err) {
      console.error("Erro na requisição de login:", err);
      setLoginError("Falha na conexão com o servidor. Tente novamente.");
    } finally {
      setIsLoggingIn(false);
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
      setUpdatingOrderId(orderId);
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
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleDeleteOrderAction = async (orderId: string) => {
    if (confirm(`Excluir permanentemente o pedido #${orderId}?`)) {
      try {
        setUpdatingOrderId(orderId);
        await deleteOrderApi(orderId);
        const ords = await fetchOrders();
        setOrders(ords);
        triggerToast(`Pedido #${orderId} excluído.`);
      } catch (err) {
        console.error("Erro ao excluir pedido:", err);
        triggerToast("Erro ao excluir pedido.");
      } finally {
        setUpdatingOrderId(null);
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
      setIsSavingProduct(true);
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
          restaurantName: `${process.env.NEXT_PUBLIC_NOME} ${process.env.NEXT_PUBLIC_SOBRENOME} `,
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
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (confirm(`Tem certeza que deseja excluir "${name}" do cardápio?`)) {
      try {
        setDeletingProductId(id);
        await deleteProduct(id);
        await loadData();
        triggerToast(`"${name}" foi removido do cardápio.`);
      } catch (err) {
        console.error("Erro ao excluir produto:", err);
        triggerToast("Erro ao excluir produto.");
      } finally {
        setDeletingProductId(null);
      }
    }
  };

  const handleSaveCategories = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingCategories(true);
      await updateCategories(editableCategories);
      await loadData();
      triggerToast("Categorias atualizadas com sucesso!");
    } catch (err) {
      console.error("Erro ao salvar categorias:", err);
      triggerToast("Erro ao salvar categorias.");
    } finally {
      setIsSavingCategories(false);
    }
  };

  const handleResetToDefault = async () => {
    if (confirm("Deseja realmente restaurar os itens e categorias originais de fábrica?")) {
      try {
        setIsResettingDatabase(true);
        await resetDatabaseApi();
        await loadData();
        triggerToast("Cardápio restaurado para os itens padrão.");
      } catch (err) {
        console.error("Erro ao restaurar banco:", err);
        triggerToast("Erro ao restaurar cardápio.");
      } finally {
        setIsResettingDatabase(false);
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
              {process.env.NEXT_PUBLIC_NOME}<span className="text-orange-500"> {process.env.NEXT_PUBLIC_SORENOME}</span>
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
              disabled={isLoggingIn}
              className="w-full py-3 px-4 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-600/25 transition-all cursor-pointer mt-2 flex items-center justify-center gap-2"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Autenticando...</span>
                </>
              ) : (
                <span>Acessar Painel</span>
              )}
            </button>
          </form>

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

      {pendingAlert && pendingOrdersCount > 0 && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md bg-amber-500 text-slate-950 rounded-2xl shadow-2xl p-4 flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <div className="flex-1">
            <p className="text-sm font-black">
              {pendingOrdersCount} {pendingOrdersCount === 1 ? "pedido pendente" : "pedidos pendentes"}
            </p>
            <p className="text-xs font-medium">
              O mais antigo está esperando há {pendingAlert.oldestMin} min.
            </p>
            <button
              onClick={() => {
                setActiveTab("orders");
                setOrderStatusFilter("pendente");
                setPendingAlert(null);
              }}
              className="mt-2 text-xs font-bold bg-slate-950 text-white px-3 py-1.5 rounded-lg"
            >
              Ver pedidos
            </button>
          </div>
          <button onClick={() => setPendingAlert(null)} className="text-xs font-bold">✕</button>
        </div>
      )}

      {/* Top Header */}
      <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6  lg:px-8 h-16 flex items-center justify-between">
          <Link href={'/'} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-orange-600 flex items-center justify-center text-white">
              <UtensilsCrossed className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs sm:text-base font-black text-white tracking-tight ">
                {process.env.NEXT_PUBLIC_NOME}<span className="text-orange-500"> {process.env.NEXT_PUBLIC_SOBRENOME}</span>
              </span>
            </div>
          </Link>
          <span className="ml-2 text-[10px] sm:hidden bg-orange-500/20 text-orange-400 font-bold px-2 py-0.5 rounded-md border border-orange-500/30 uppercase tracking-wide">
            Painel
          </span>

          <div className="flex items-center gap-2 sm:gap-3 px-3">
            {/* Controles de Notificação do Navegador */}
            {notificationPermission === "granted" ? (
              <div className="flex items-center gap-1.5">
                <span
                  title="Notificações no navegador ativas para novos pedidos"
                  className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-950/40 text-emerald-400 border border-emerald-900/50 text-[11px] font-bold"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping mr-0.5" />
                  <Bell className="w-3 h-3" />
                  <span>Notificações Ativas</span>
                </span>
                <button
                  type="button"
                  onClick={handleTestNotification}
                  title="Testar alerta sonoro e notificação de novo pedido"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5 text-orange-400" />
                  <span className="hidden sm:inline">Testar Som</span>
                </button>
              </div>
            ) : notificationPermission === "denied" ? (
              <span
                title="Notificações bloqueadas nas configurações do navegador"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-red-950/40 text-red-400 border border-red-900/50 text-[11px] font-bold"
              >
                <BellOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Notificações Bloqueadas</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleRequestNotificationPermission}
                title="Receber alertas no navegador quando chegar pedido"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-md shadow-orange-600/20 transition-all cursor-pointer animate-pulse"
              >
                <BellRing className="w-3.5 h-3.5" />
                <span>Ativar Notificações</span>
              </button>
            )}

            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-400 hover:bg-gray-600 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:flex">Ver Cardápio</span>
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
            <span>Categorias</span>
          </button>

          <button
            onClick={() => setActiveTab("horarios")}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === "horarios"
              ? "border-orange-500 text-orange-400 bg-orange-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
          >
            <Bike className="w-4 h-4" />
            <span>Horário Funcionamento</span>
          </button>

          <button
            onClick={() => setActiveTab("delivery")}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === "delivery"
              ? "border-orange-500 text-orange-400 bg-orange-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
          >
            <Bike className="w-4 h-4" />
            <span>Frete & Entregas</span>
          </button>

          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === "users"
              ? "border-orange-500 text-orange-400 bg-orange-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
          >
            <Users className="w-4 h-4" />
            <span>Usuários Admin</span>
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
                  const isUpdating = updatingOrderId === ord.id;

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

                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[11px] text-slate-400 flex items-start gap-1 leading-tight flex-1">
                            <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
                            <span>
                              {ord.deliveryAddress.rua}, {ord.deliveryAddress.numero} ({ord.deliveryAddress.bairro})
                              {ord.deliveryAddress.complemento ? ` • ${ord.deliveryAddress.complemento}` : ""}
                            </span>
                          </p>

                          {ord.deliveryAddress.lat && ord.deliveryAddress.lng ? (
                            <a
                              href={gerarUrlRotaOSM(
                                process.env.NEXT_PUBLIC_RESTAURANTE_LAT || "-21.769141",
                                process.env.NEXT_PUBLIC_RESTAURANTE_LNG || "-43.372470",
                                ord.deliveryAddress.lat,
                                ord.deliveryAddress.lng
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Abrir rota no OpenStreetMap"
                              className="inline-flex items-center gap-1 text-[10px] text-orange-400 hover:text-orange-300 bg-orange-950/40 hover:bg-orange-900/50 px-2 py-0.5 rounded-lg border border-orange-900/50 transition-colors shrink-0"
                            >
                              <Bike className="w-3 h-3" />
                              <span>{ord.deliveryAddress.distanciaKm ? `${ord.deliveryAddress.distanciaKm} km` : "Rota"}</span>
                            </a>
                          ) : ord.deliveryAddress.distanciaKm ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-orange-400 bg-orange-950/40 px-2 py-0.5 rounded-lg border border-orange-900/50 shrink-0">
                              <Bike className="w-3 h-3" />
                              <span>{ord.deliveryAddress.distanciaKm} km</span>
                            </span>
                          ) : null}
                        </div>
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

                        {ord.deliveryFee > 0 ? (
                          <div className="flex justify-between text-[10px] text-slate-500">
                            <span className="flex items-center gap-1">
                              <span>Taxa de Entrega</span>
                              {ord.deliveryAddress.distanciaKm && (
                                <span className="text-[9px] text-slate-400">({ord.deliveryAddress.distanciaKm} km via OSM)</span>
                              )}
                            </span>
                            <span>R$ {ord.deliveryFee.toFixed(2).replace(".", ",")}</span>
                          </div>
                        ) : (
                          <div className="flex justify-between text-[10px] text-slate-500">
                            <span>Taxa de Entrega</span>
                            <span className="text-emerald-400 font-medium">Grátis</span>
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
                                disabled={isUpdating}
                                className="flex-1 py-1.5 px-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
                              >
                                {isUpdating ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <>
                                    <Flame className="w-3 h-3" />
                                    <span>Aceitar</span>
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Tem certeza que realmente deseja recusar e cancelar o pedido #${ord.id.slice(-6)}?`)) {
                                    handleChangeOrderStatus(ord.id, "cancelado");
                                  }
                                }}
                                disabled={isUpdating}
                                className="py-1.5 px-2 text-slate-400 hover:text-red-400 disabled:opacity-50 text-xs font-medium transition-colors cursor-pointer"
                              >
                                Recusar
                              </button>
                            </>
                          )}

                          {ord.status === "em_preparo" && (
                            <button
                              onClick={() => handleChangeOrderStatus(ord.id, "saiu_entrega")}
                              disabled={isUpdating}
                              className="w-full py-1.5 px-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              {isUpdating ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <>
                                  <Bike className="w-3.5 h-3.5" />
                                  <span>Despachar Entrega</span>
                                </>
                              )}
                            </button>
                          )}

                          {ord.status === "saiu_entrega" && (
                            <button
                              onClick={() => handleChangeOrderStatus(ord.id, "entregue")}
                              disabled={isUpdating}
                              className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              {isUpdating ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Concluir Entrega</span>
                                </>
                              )}
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
                            disabled={isUpdating}
                            className="p-1.5 text-slate-500 hover:text-red-400 disabled:opacity-50 transition-colors cursor-pointer"
                            title="Excluir Pedido"
                          >
                            {isUpdating ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
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

                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryFilter(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${categoryFilter === cat.id
                      ? "bg-orange-600 text-white shadow-md shadow-orange-600/20"
                      : "bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800"
                      }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.name}</span>
                  </button>
                ))}
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
                {filteredProducts.map((prod) => {
                  const isDeletingThis = deletingProductId === prod.id;
                  return (
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
                          disabled={isDeletingThis}
                          className="flex-1 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5 text-orange-400" />
                          <span>Editar</span>
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(prod.id, prod.name)}
                          disabled={isDeletingThis}
                          className="p-1.5 bg-red-950/30 hover:bg-red-900/50 text-red-400 hover:text-red-200 border border-red-900/40 rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50"
                          title="Excluir item"
                        >
                          {isDeletingThis ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
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
                Gerenciar Categorias
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Adicione, edite ou remova as categorias de produtos exibidas no cardápio.
              </p>
            </div>

            {/* Form para Adicionar Nova Categoria */}
            <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-3">
              <span className="text-xs font-bold text-orange-400 uppercase tracking-wider block">
                ➕ Criar Nova Categoria
              </span>
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-1">
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Emoji / Ícone
                  </label>
                  <input
                    type="text"
                    value={newCategoryIcon}
                    onChange={(e) => setNewCategoryIcon(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-center text-lg focus:outline-none focus:border-orange-500 text-white"
                    placeholder="🍔"
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Nome da Categoria
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Ex: Sobremesas, Lanches..."
                      className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-orange-500 text-white font-semibold"
                    />
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Lista de Categorias Editáveis */}
            <form onSubmit={handleSaveCategories} className="space-y-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Categorias Ativas ({editableCategories.length})
              </span>

              {editableCategories.map((cat, idx) => (
                <div
                  key={cat.id}
                  className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      ID: {cat.id}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-slate-500">
                        {products.filter((p) => p.category === cat.id).length} itens
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCategory(cat.id)}
                        className="p-1 text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                        title="Remover Categoria"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    <div className="col-span-1">
                      <input
                        type="text"
                        value={cat.icon}
                        onChange={(e) => {
                          const updated = [...editableCategories];
                          updated[idx].icon = e.target.value;
                          setEditableCategories(updated);
                        }}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-center text-lg focus:outline-none focus:border-orange-500 text-white"
                        required
                      />
                    </div>
                    <div className="col-span-3">
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
                disabled={isSavingCategories}
                className="w-full py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isSavingCategories ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Salvando Categorias...</span>
                  </>
                ) : (
                  <span>Salvar Alterações das Categorias</span>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB: DELIVERY SETTINGS & LIVE SIMULATOR */}
        {/* ==================================================== */}
        {activeTab === "delivery" && (
          <div className="space-y-6">
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20 flex items-center justify-center shrink-0">
                  <Bike className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Configuração de Frete & Raio de Entrega</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Os valores alterados aqui são salvos diretamente no banco e aplicados instantaneamente na sacola de todos os clientes.
                  </p>
                </div>
              </div>

              {deliverySettings.updatedAt && (
                <span className="text-[11px] text-slate-500 font-mono shrink-0">
                  Atualizado em: {new Date(deliverySettings.updatedAt).toLocaleDateString("pt-BR")} às {new Date(deliverySettings.updatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Formulário de Configuração (7 colunas) */}
              <div className="lg:col-span-7 bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-5">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Truck className="w-4 h-4 text-orange-400" />
                  <span>Parâmetros de Tarifação</span>
                </h4>

                <form onSubmit={handleSaveDeliverySettings} className="space-y-4">
                  {/* Raio Máximo */}
                  <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-200">
                        Raio Máximo de Atendimento (km)
                      </label>
                      <span className="text-xs font-mono font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                        Até {deliverySettings.raioMaximoKm} km
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Endereços cuja distância de trajeto viário exceda este valor serão automaticamente bloqueados para entrega.
                    </p>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      max="50"
                      required
                      value={deliverySettings.raioMaximoKm}
                      onChange={(e) =>
                        setDeliverySettings({
                          ...deliverySettings,
                          raioMaximoKm: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm font-semibold text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  {/* Taxa Base Inicial */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1.5">
                      <label className="text-xs font-bold text-slate-200 block">
                        Taxa Base Inicial (R$)
                      </label>
                      <p className="text-[11px] text-slate-400">
                        Valor cobrado pela partida/saída do entregador.
                      </p>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-xs font-bold text-slate-500">R$</span>
                        <input
                          type="number"
                          step="0.50"
                          min="0"
                          required
                          value={deliverySettings.taxaBase}
                          onChange={(e) =>
                            setDeliverySettings({
                              ...deliverySettings,
                              taxaBase: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm font-semibold text-white focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1.5">
                      <label className="text-xs font-bold text-slate-200 block">
                        Km Base Inicial (km)
                      </label>
                      <p className="text-[11px] text-slate-400">
                        Distância em que a taxa base é cobrada de forma fixa.
                      </p>
                      <input
                        type="number"
                        step="0.5"
                        min="0.5"
                        max="10"
                        required
                        value={deliverySettings.kmBase}
                        onChange={(e) =>
                          setDeliverySettings({
                            ...deliverySettings,
                            kmBase: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm font-semibold text-white focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>

                  {/* Faixas adicionais por km */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1.5">
                      <label className="text-xs font-bold text-slate-200 block">
                        Adicional por Km (de {deliverySettings.kmBase}km até 5km)
                      </label>
                      <p className="text-[11px] text-slate-400">
                        Valor somado por cada km que passar da base até 5 km.
                      </p>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-xs font-bold text-slate-500">R$</span>
                        <input
                          type="number"
                          step="0.10"
                          min="0"
                          required
                          value={deliverySettings.valorKmAte5Km}
                          onChange={(e) =>
                            setDeliverySettings({
                              ...deliverySettings,
                              valorKmAte5Km: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm font-semibold text-white focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1.5">
                      <label className="text-xs font-bold text-slate-200 block">
                        Adicional por Km (acima de 5km)
                      </label>
                      <p className="text-[11px] text-slate-400">
                        Valor somado por cada km acima de 5 km até o limite.
                      </p>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-xs font-bold text-slate-500">R$</span>
                        <input
                          type="number"
                          step="0.10"
                          min="0"
                          required
                          value={deliverySettings.valorKmAte10Km}
                          onChange={(e) =>
                            setDeliverySettings({
                              ...deliverySettings,
                              valorKmAte10Km: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm font-semibold text-white focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSavingDeliverySettings}
                      className="w-full py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isSavingDeliverySettings ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Salvando no Banco de Dados...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Salvar Configurações de Frete</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Simulador Interativo em Tempo Real (5 colunas) */}
              <div className="lg:col-span-5 bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    <span>Simulador de Frete ao Vivo</span>
                  </h4>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Recalcula em tempo real
                  </span>
                </div>

                <p className="text-xs text-slate-400">
                  Veja como os clientes serão cobrados imediatamente ao alterar qualquer número:
                </p>

                {/* Tabela de Exemplos de Distância */}
                <div className="border border-slate-800 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-900/80 text-slate-400 text-[11px] font-mono border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">Distância</th>
                        <th className="p-2.5">Valor Frete</th>
                        <th className="p-2.5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {[1.0, 2.0, 3.5, 5.0, 7.5, deliverySettings.raioMaximoKm, deliverySettings.raioMaximoKm + 2.0].map(
                        (dist, idx) => {
                          const res = calcularValorFrete(dist, undefined, deliverySettings);
                          return (
                            <tr
                              key={idx}
                              className={res.dentroDoRaio ? "hover:bg-slate-900/40" : "bg-red-950/20 text-red-300"}
                            >
                              <td className="p-2.5 font-mono font-medium text-slate-300">
                                {dist.toFixed(1)} km
                              </td>
                              <td className="p-2.5 font-mono font-bold text-white">
                                {res.dentroDoRaio ? `R$ ${res.valor.toFixed(2).replace(".", ",")}` : "—"}
                              </td>
                              <td className="p-2.5 text-right">
                                {res.dentroDoRaio ? (
                                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md font-semibold">
                                    Dentro do Raio
                                  </span>
                                ) : (
                                  <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-md font-semibold">
                                    Bloqueado
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        }
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Teste Customizado Livre */}
                <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
                  <label className="text-[11px] font-bold text-slate-300 block">
                    Testar uma distância específica:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={simuladorCustomKm}
                      onChange={(e) => setSimuladorCustomKm(e.target.value)}
                      placeholder="Ex: 4.5"
                      className="w-24 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-orange-500"
                    />
                    <span className="text-xs text-slate-400">km =&gt;</span>
                    {(() => {
                      const kmNum = parseFloat(simuladorCustomKm) || 0;
                      const res = calcularValorFrete(kmNum, undefined, deliverySettings);
                      return res.dentroDoRaio ? (
                        <span className="font-mono font-black text-emerald-400 text-sm">
                          R$ {res.valor.toFixed(2).replace(".", ",")}
                        </span>
                      ) : (
                        <span className="text-xs text-red-400 font-bold">
                          Bloqueado (acima de {deliverySettings.raioMaximoKm} km)
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB: STORE HOURS */}
        {/* ==================================================== */}
        {activeTab === "horarios" && (
          <div className="space-y-6">
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20 flex items-center justify-center shrink-0">
                  <Bike className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Configuração de horário de funcionamento</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Os valores alterados aqui são salvos diretamente no banco e aplicados instantaneamente no horario de funcionamento do restaurante.
                  </p>
                </div>
              </div>

              {deliverySettings.updatedAt && (
                <span className="text-[11px] text-slate-500 font-mono shrink-0">
                  Atualizado em: {new Date(deliverySettings.updatedAt).toLocaleDateString("pt-BR")} às {new Date(deliverySettings.updatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>

            {/* ---- Horário de Funcionamento ---- */}
            <div className="space-y-4">

              {/* Card de Status + Botão Override Manual */}
              <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${storeStatus?.isOpen
                ? "bg-emerald-950/40 border-emerald-800/60"
                : "bg-red-950/40 border-red-800/60"
                }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xl ${storeStatus?.isOpen ? "bg-emerald-500/20" : "bg-red-500/20"
                    }`}>
                    {storeStatus?.isOpen ? "🟢" : "🔴"}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      Horário de Funcionamento
                      {storeStatus?.manualOverride && (
                        <span className="text-[10px] bg-amber-950/60 text-amber-400 border border-amber-800/60 font-mono px-2 py-0.5 rounded-full">
                          Override Manual Ativo
                        </span>
                      )}
                    </h3>
                    <p className={`text-xs mt-0.5 ${storeStatus?.isOpen ? "text-emerald-400" : "text-red-400"}`}>
                      {storeStatus?.message ?? (storeStatus?.isOpen ? "Loja aberta agora." : "Loja fechada agora.")}
                    </p>
                    {storeStatus?.nextOpen && !storeStatus.isOpen && (
                      <p className="text-[11px] text-slate-400 mt-0.5">⏰ {storeStatus.nextOpen}</p>
                    )}
                  </div>
                </div>

                {/* Botões de Override */}
                <div className="flex items-center gap-2 shrink-0">
                  {storeStatus?.manualOverride && (
                    <button
                      onClick={() => handleToggleStore(null)}
                      disabled={isTogglingStore}
                      className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Seguir Horário Auto
                    </button>
                  )}
                  {storeStatus?.isOpen ? (
                    <button
                      onClick={() => handleToggleStore("closed")}
                      disabled={isTogglingStore}
                      className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-500 text-white transition-colors cursor-pointer disabled:opacity-50 shadow-lg shadow-red-900/40"
                    >
                      {isTogglingStore ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <span>🔒</span>
                      )}
                      Fechar Loja Agora
                    </button>
                  ) : (
                    <button
                      onClick={() => handleToggleStore("open")}
                      disabled={isTogglingStore}
                      className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer disabled:opacity-50 shadow-lg shadow-emerald-900/40"
                    >
                      {isTogglingStore ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <span>🔓</span>
                      )}
                      Abrir Loja Agora
                    </button>
                  )}
                </div>
              </div>

              {/* Tabela de Horários por Dia */}
              {storeHours.length > 0 && (
                <form onSubmit={handleSaveStoreHours} className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
                  <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                      <Clock className="w-4 h-4 text-orange-400" />
                      <span>Horários por Dia da Semana</span>
                    </h4>
                    <span className="text-[10px] text-slate-500">Fuso horário: Brasília (BRT)</span>
                  </div>

                  <div className="divide-y divide-slate-800/60">
                    {storeHours.map((h, idx) => {
                      const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
                      const dayFull = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
                      return (
                        <div
                          key={h.dayOfWeek}
                          className={`flex items-center gap-3 px-4 py-3 transition-colors ${h.isOpen ? "hover:bg-slate-900/40" : "opacity-60"}`}
                        >
                          {/* Dia */}
                          <div className="w-16 shrink-0">
                            <span className="text-xs font-bold text-slate-300">{dayFull[h.dayOfWeek]}</span>
                            <span className="text-[10px] text-slate-500 ml-1">({dayLabels[h.dayOfWeek]})</span>
                          </div>

                          {/* Toggle Aberto/Fechado */}
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...storeHours];
                              updated[idx] = { ...h, isOpen: !h.isOpen };
                              setStoreHours(updated);
                            }}
                            className={`relative w-10 h-5 rounded-full transition-colors shrink-0 cursor-pointer ${h.isOpen ? "bg-emerald-500" : "bg-slate-700"}`}
                          >
                            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${h.isOpen ? "left-5" : "left-0.5"}`} />
                          </button>

                          <span className={`text-[11px] font-semibold w-14 shrink-0 ${h.isOpen ? "text-emerald-400" : "text-slate-500"}`}>
                            {h.isOpen ? "Aberto" : "Fechado"}
                          </span>

                          {/* Inputs de horário */}
                          <div className="flex items-center gap-2 ml-auto">
                            <div className="flex items-center gap-1.5">
                              <label className="text-[10px] text-slate-500">Abre</label>
                              <input
                                type="time"
                                value={h.openTime}
                                disabled={!h.isOpen}
                                onChange={(e) => {
                                  const updated = [...storeHours];
                                  updated[idx] = { ...h, openTime: e.target.value };
                                  setStoreHours(updated);
                                }}
                                className="w-24 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-orange-500 disabled:opacity-30 disabled:cursor-not-allowed"
                              />
                            </div>
                            <span className="text-slate-600 text-xs">–</span>
                            <div className="flex items-center gap-1.5">
                              <label className="text-[10px] text-slate-500">Fecha</label>
                              <input
                                type="time"
                                value={h.closeTime}
                                disabled={!h.isOpen}
                                onChange={(e) => {
                                  const updated = [...storeHours];
                                  updated[idx] = { ...h, closeTime: e.target.value };
                                  setStoreHours(updated);
                                }}
                                className="w-24 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-orange-500 disabled:opacity-30 disabled:cursor-not-allowed"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-4 border-t border-slate-800 flex justify-end">
                    <button
                      type="submit"
                      disabled={isSavingHours}
                      className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-orange-500 hover:bg-orange-400 text-white transition-colors cursor-pointer disabled:opacity-50 shadow-lg shadow-orange-900/30"
                    >
                      {isSavingHours ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Salvando...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Salvar Horários</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>

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
              disabled={isResettingDatabase}
              className="py-2.5 px-5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-amber-600/20 flex items-center justify-center gap-2 mx-auto"
            >
              {isResettingDatabase ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Restaurando Banco de Dados...</span>
                </>
              ) : (
                <span>Restaurar Itens e Categorias Originais</span>
              )}
            </button>
          </div>
        )}

        {activeTab === "users" && <UsersTab triggerToast={triggerToast} />}

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
                <h3 className="font-black text-base uppercase">{process.env.NEXT_PUBLIC_NOME} {process.env.NEXT_PUBLIC_SOBRENOME}</h3>
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
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500 font-semibold"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
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
                  disabled={isSavingProduct}
                  className="flex-1 py-2.5 px-4 text-xs font-semibold text-slate-400 bg-slate-900 hover:bg-slate-850 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingProduct}
                  className="flex-1 py-2.5 px-4 text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 disabled:opacity-50 rounded-xl shadow-md shadow-orange-600/25 transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSavingProduct ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>{editingProductId ? "Salvar Alterações" : "Cadastrar Item"}</span>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}