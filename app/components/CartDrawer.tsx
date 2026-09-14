"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Tag,
  CheckCircle2,
  ArrowRight,
  Bike,
  MapPin,
  User,
  Phone,
  MessageCircle,
  CreditCard,
  QrCode,
  Banknote,
  Copy,
  Check,
} from "lucide-react";
import { CartItem, Address, Order } from "../types";
import { getCustomerProfile, saveCustomerProfile, getDeviceId } from "../lib/storage";
import { createOrder } from "../lib/api";
import { gerarPixEstatico } from "../lib/gerarPix";

interface PixOptions {
  chave: string;
  nome: string;
  cidade: string;
  valor: number;
  txid?: string;
}

const VALID_COUPONS: Record<string, { discount: number; type: "fixed" | "percent"; minOrder: number }> = {
  PRIMEIRA15: { discount: 15, type: "fixed", minOrder: 50 },
  FRETELIVRE: { discount: 5.9, type: "fixed", minOrder: 35 },
};

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  currentAddress: Address | null;
  onOpenAddressModal: () => void;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  appliedCoupon: string | null;
  onApplyCoupon: (code: string) => void;
  onRemoveCoupon: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  currentAddress,
  onOpenAddressModal,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  appliedCoupon,
  onApplyCoupon,
  onRemoveCoupon,
}) => {
  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState("");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [orderCompleted, setOrderCompleted] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("PIX");
  const [orderNotes, setOrderNotes] = useState("");
  const [copiedPix, setCopiedPix] = useState(false);
  const [completedOrderTotal, setCompletedOrderTotal] = useState<number>(0);

  // Guarda os itens e o payload Pix do pedido concluído
  const [completedItems, setCompletedItems] = useState<CartItem[]>([]);
  const [completedPixPayload, setCompletedPixPayload] = useState<string>("");

  // Customer Profile State
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; phone?: string }>({});

  useEffect(() => {
    if (isOpen) {
      const saved = getCustomerProfile();
      if (saved.name) setCustomerName(saved.name);
      if (saved.phone) setCustomerPhone(saved.phone);
    }
  }, [isOpen]);

  const handleNameChange = (val: string) => {
    setCustomerName(val);
    saveCustomerProfile({ name: val, phone: customerPhone });
    if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }));
  };

  const handlePhoneChange = (val: string) => {
    setCustomerPhone(val);
    saveCustomerProfile({ name: customerName, phone: val });
    if (fieldErrors.phone) setFieldErrors((prev) => ({ ...prev, phone: undefined }));
  };

  if (!isOpen) return null;

  const subtotal = items.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  // Delivery fee calculation
  const hasOnlyFreeDelivery = items.length > 0 && items.every((i) => i.product.freeDelivery);
  const deliveryFee = items.length === 0 ? 0 : hasOnlyFreeDelivery ? 0 : Number(process.env.NEXT_PUBLIC_TAXA_ENTREGA || 0);

  // Coupon discount calculation
  let discountAmount = 0;
  if (appliedCoupon && VALID_COUPONS[appliedCoupon]) {
    const couponInfo = VALID_COUPONS[appliedCoupon];
    if (couponInfo.type === "fixed") {
      discountAmount = Math.min(couponInfo.discount, subtotal);
    } else if (couponInfo.type === "percent") {
      discountAmount = subtotal * couponInfo.discount;
    }
  }

  const finalTotal = Math.max(0, subtotal + deliveryFee - discountAmount);
  const valorPixCalculado = orderCompleted ? completedOrderTotal : finalTotal;

  // Pix static payload generator
  const currentPixPayload =
    paymentMethod === "PIX" && valorPixCalculado > 0
      ? gerarPixEstatico({
        chave: process.env.NEXT_PUBLIC_PIX_CHAVE!,
        nome: process.env.NEXT_PUBLIC_PIX_NOME!,
        cidade: process.env.NEXT_PUBLIC_PIX_CIDADE!,
        valor: valorPixCalculado,
        txid: (orderId || "PEDIDO").replace(/[^a-zA-Z0-9]/g, ""),
      })
      : "";

  const activePixPayload = orderCompleted ? completedPixPayload : currentPixPayload;

  const handleCopyPix = () => {
    if (!activePixPayload) return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(activePixPayload)
        .then(() => {
          setCopiedPix(true);
          setTimeout(() => setCopiedPix(false), 3000);
        })
        .catch(() => {
          fallbackCopyTextToClipboard(activePixPayload);
        });
    } else {
      fallbackCopyTextToClipboard(activePixPayload);
    }
  };

  function fallbackCopyTextToClipboard(text: string) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand("copy");
      if (successful) {
        setCopiedPix(true);
        setTimeout(() => setCopiedPix(false), 3000);
      }
    } catch (err) {
      console.error("Erro ao copiar código Pix: ", err);
    }

    document.body.removeChild(textArea);
  }

  const handleApplyCouponSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError("");
    const cleaned = couponInput.trim().toUpperCase();
    if (!cleaned) return;

    if (VALID_COUPONS[cleaned]) {
      const min = VALID_COUPONS[cleaned].minOrder;
      if (subtotal < min) {
        setCouponError(`Pedido mínimo para este cupom é R$ ${min.toFixed(2).replace(".", ",")}`);
        return;
      }
      onApplyCoupon(cleaned);
      setCouponInput("");
    } else {
      setCouponError("Cupom inválido ou expirado. Tente PRIMEIRA15 ou FRETELIVRE");
    }
  };

  // Montagem da comanda completa em texto para enviar no WhatsApp
  const generateWhatsAppMessage = (id: string, orderItems: CartItem[], pixCode?: string) => {
    const addressStr =
      currentAddress && currentAddress.rua
        ? `${currentAddress.rua}, ${currentAddress.numero} - ${currentAddress.bairro}`
        : "Endereço a combinar";

    const itemListStr = orderItems
      .map((item) => {
        const itemTotal = (item.product.price * item.quantity).toFixed(2).replace(".", ",");
        const desc = item.product.description ? `\n└ ${item.product.description.trim()}` : "";

        return `• ${item.quantity}x ${item.product.name} - R$ ${itemTotal}${desc}`;
      })
      .join("\n");

    let message =
      `*NOVO PEDIDO: #${id}*\n\n` +
      `*Cliente:* ${customerName.trim()}\n` +
      `*Telefone:* ${customerPhone.trim()}\n` +
      `*Endereço:* ${addressStr}\n\n` +
      `*ITENS DO PEDIDO:*\n${itemListStr}\n\n`;

    if (orderNotes.trim()) {
      message += `📝 *Observações:* ${orderNotes.trim()}\n\n`;
    }

    message +=
      `💳 *Forma de Pagamento:* ${paymentMethod}\n` +
      // `*Taxa de Entrega:* Grátis\n` +
      `💰 *TOTAL:* R$ ${(completedOrderTotal > 0 ? completedOrderTotal : finalTotal).toFixed(2).replace(".", ",")}\n\n`;

    if (paymentMethod === "PIX" && pixCode) {
      message +=
        `🔑 *Código PIX Copia e Cola:*\n\`${pixCode}\`\n\n` +
        `📌 *Aviso:* Segue em anexo o comprovante do pagamento via Pix.`;
    } else {
      message += `Poderiam confirmar o recebimento do pedido, por favor?`;
    }

    return message;
  };

  const buildWhatsAppLink = (id: string, orderItems: CartItem[], pixCode?: string) => {
    const phone = process.env.NEXT_PUBLIC_TELEFONE || "5532991234567";
    const text = encodeURIComponent(generateWhatsAppMessage(id, orderItems, pixCode));
    return `https://wa.me/${phone}?text=${text}`;
  };

  const handleCheckout = () => {
    const errors: { name?: string; phone?: string } = {};
    if (!customerName.trim()) {
      errors.name = "Informe seu nome para a entrega";
    }
    if (!customerPhone.trim() || customerPhone.replace(/\D/g, "").length < 8) {
      errors.phone = "Informe um telefone/WhatsApp válido";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    if (!currentAddress || !currentAddress.rua) {
      alert("Por favor, selecione ou cadastre o endereço de entrega.");
      onOpenAddressModal();
      return;
    }

    saveCustomerProfile({ name: customerName.trim(), phone: customerPhone.trim() });

    setIsCheckingOut(true);
    const generatedId = `PED-${Math.floor(100000 + Math.random() * 900000)}`;
    const devId = getDeviceId();

    // Gera o código Pix definitivo para a comanda
    const generatedPixPayload =
      paymentMethod === "PIX"
        ? gerarPixEstatico({
          chave: process.env.NEXT_PUBLIC_PIX_CHAVE!,
          nome: process.env.NEXT_PUBLIC_PIX_NOME!,
          cidade: process.env.NEXT_PUBLIC_PIX_CIDADE!,
          valor: finalTotal,
          txid: generatedId.replace(/[^a-zA-Z0-9]/g, ""),
        })
        : "";

    setCompletedOrderTotal(finalTotal);
    setCompletedItems([...items]);
    setCompletedPixPayload(generatedPixPayload);

    const newOrder: Order = {
      id: generatedId,
      createdAt: new Date().toISOString(),
      customer: { name: customerName.trim(), phone: customerPhone.trim() },
      deliveryAddress: currentAddress,
      items: [...items],
      subtotal,
      deliveryFee,
      discount: discountAmount,
      total: finalTotal,
      paymentMethod,
      status: "pendente",
      deviceId: devId,
      notes: orderNotes.trim() || undefined,
    };

    createOrder(newOrder)
      .catch((err) => console.error("Erro ao registrar no banco:", err))
      .finally(() => {
        window.dispatchEvent(new Event("delivery_orders_updated"));
        setOrderId(generatedId);
        setIsCheckingOut(false);
        setOrderCompleted(true);

        onClearCart();
        onRemoveCoupon();
      });
  };

  const handleResetAndClose = () => {
    setOrderCompleted(false);
    setCompletedOrderTotal(0);
    setCompletedItems([]);
    setCompletedPixPayload("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Sua Sacola</h3>
              <p className="text-xs text-slate-400">
                {items.length} {items.length === 1 ? "item" : "itens adicionados"}
              </p>
            </div>
          </div>
          <button
            onClick={orderCompleted ? handleResetAndClose : onClose}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        {orderCompleted ? (
          <div className="p-6 flex-1 flex flex-col items-center justify-start text-center overflow-y-auto">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2 animate-bounce shrink-0">
              <CheckCircle2 className="w-7 h-7 stroke-[2.5]" />
            </div>
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full mb-1">
              Pedido Gerado com Sucesso!
            </span>
            <h4 className="text-xl font-black text-slate-900 mb-0.5">
              {paymentMethod === "PIX" ? "Faça o Pagamento e Envie a Comanda" : "Quase lá!"}
            </h4>
            <p className="text-xs text-slate-500 max-w-xs mb-3">
              Código do pedido:{" "}
              <strong className="text-slate-800 font-mono">{orderId}</strong>
            </p>

            {/* SEÇÃO DO PIX COPIA E COLA - Exibida em destaque antes do WhatsApp */}
            {paymentMethod === "PIX" && (
              <div className="w-full bg-amber-50/90 border border-amber-300 rounded-2xl p-4 mb-4 text-left space-y-2.5 shadow-xs">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                  <QrCode className="w-4 h-4 text-amber-600" />
                  <span>Passo 1: Copie o código PIX para pagar</span>
                </div>

                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Copie o código abaixo, abra o aplicativo do seu banco e acesse a opção <strong>Pix Copia e Cola</strong> para efetuar o pagamento de <strong>R$ {completedOrderTotal.toFixed(2).replace(".", ",")}</strong>:
                </p>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={activePixPayload}
                    className="flex-1 bg-white border border-amber-200 text-[11px] font-mono px-2.5 py-2 rounded-xl text-slate-600 truncate focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopyPix}
                    className={`px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${copiedPix
                      ? "bg-emerald-600 text-white"
                      : "bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                      }`}
                  >
                    {copiedPix ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Pix</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Resumo do Pedido */}
            <div className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 mb-4 text-left space-y-2 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-medium text-slate-500">
                  <User className="w-3.5 h-3.5 text-orange-500" />
                  Cliente
                </span>
                <span className="font-semibold text-slate-800">{customerName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-medium text-slate-500">
                  <Phone className="w-3.5 h-3.5 text-orange-500" />
                  WhatsApp
                </span>
                <span className="font-semibold text-slate-800">{customerPhone}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-medium text-slate-500">
                  <CreditCard className="w-3.5 h-3.5 text-orange-500" />
                  Pagamento
                </span>
                <span className="font-semibold text-slate-800">{paymentMethod}</span>
              </div>
              {currentAddress && currentAddress.rua && (
                <div className="flex items-start justify-between gap-2 border-t border-slate-200/60 pt-2">
                  <span className="flex items-center gap-1.5 font-medium text-slate-500 shrink-0">
                    <MapPin className="w-3.5 h-3.5 text-orange-500" />
                    Entrega em
                  </span>
                  <span className="font-semibold text-slate-800 text-right">
                    {currentAddress.rua}, {currentAddress.numero} ({currentAddress.bairro})
                  </span>
                </div>
              )}
            </div>

            {/* Passo 2: Botão para enviar a comanda para o WhatsApp */}
            <a
              href={buildWhatsAppLink(orderId, completedItems, activePixPayload)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 mb-2 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>
                {paymentMethod === "PIX"
                  ? "Passo 2: Enviar Comanda / Comprovante no WhatsApp"
                  : "Enviar Comanda no WhatsApp"}
              </span>
            </a>

            <button
              type="button"
              onClick={handleResetAndClose}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
            >
              Fazer outro pedido
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-full bg-slate-100 text-slate-300 flex items-center justify-center mb-4">
              <ShoppingBag className="w-10 h-10 stroke-1" />
            </div>
            <h4 className="text-lg font-bold text-slate-800 mb-1">Sua sacola está vazia</h4>
            <p className="text-xs text-slate-400 max-w-xs mb-6">
              Adicione pratos deliciosos e bebidas para saborear no conforto da sua casa.
            </p>
            <button
              onClick={onClose}
              type="button"
              className="py-2.5 px-6 rounded-xl bg-orange-600 text-white font-semibold text-xs hover:bg-orange-700 transition-colors shadow-xs cursor-pointer"
            >
              Explorar Cardápio
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Delivery Address Summary */}
            {currentAddress && currentAddress.rua ? (
              <div className="p-3.5 bg-orange-50/60 border border-orange-200/80 rounded-2xl">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-orange-800 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-orange-600" />
                    Entregar em ({currentAddress.label || "Endereço"})
                  </span>
                  <button
                    type="button"
                    onClick={onOpenAddressModal}
                    className="text-xs font-semibold text-orange-600 hover:text-orange-700 underline cursor-pointer"
                  >
                    Trocar
                  </button>
                </div>
                <p className="text-xs font-semibold text-slate-800">
                  {currentAddress.rua}, {currentAddress.numero}
                </p>
                <p className="text-[11px] text-slate-500">{currentAddress.bairro}</p>
              </div>
            ) : (
              <div
                onClick={onOpenAddressModal}
                className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl cursor-pointer hover:bg-amber-100/60 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-amber-900">
                    Cadastre o seu endereço de entrega
                  </span>
                </div>
                <span className="text-xs font-semibold text-amber-800 underline">
                  Adicionar
                </span>
              </div>
            )}

            {/* Customer Contact Information */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-orange-500" />
                  Identificação do Cliente
                </span>
                <span className="text-[10px] text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                  Salvo no navegador
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Seu Nome Completo *
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Ex: David Silva"
                  className={`w-full px-3 py-1.5 text-xs bg-white border rounded-xl focus:outline-none focus:border-orange-500 transition-colors ${fieldErrors.name ? "border-red-400 bg-red-50/20" : "border-slate-200"
                    }`}
                />
                {fieldErrors.name && (
                  <p className="text-[10px] text-red-500 mt-1">{fieldErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  WhatsApp / Telefone para Contato *
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="Ex: (32) 99999-8888"
                  className={`w-full px-3 py-1.5 text-xs bg-white border rounded-xl focus:outline-none focus:border-orange-500 transition-colors ${fieldErrors.phone ? "border-red-400 bg-red-50/20" : "border-slate-200"
                    }`}
                />
                {fieldErrors.phone && (
                  <p className="text-[10px] text-red-500 mt-1">{fieldErrors.phone}</p>
                )}
              </div>
            </div>

            {/* Items List */}
            <div className="space-y-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Itens Selecionados
              </span>
              {items.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white transition-colors"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    className="w-14 h-14 rounded-xl object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h5 className="font-bold text-slate-900 text-xs truncate">
                      {item.product.name}
                    </h5>
                    <p className="text-[11px] text-slate-400">
                      R$ {item.product.price.toFixed(2).replace(".", ",")} un.
                    </p>

                    <div className="flex items-center justify-between mt-1.5">
                      <span className="font-extrabold text-slate-900 text-xs">
                        R$ {(item.product.price * item.quantity).toFixed(2).replace(".", ",")}
                      </span>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.product.id, -1)}
                          className="w-5 h-5 flex items-center justify-center text-slate-600 hover:text-orange-600 rounded cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold text-slate-800 min-w-[14px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.product.id, 1)}
                          className="w-5 h-5 flex items-center justify-center text-slate-600 hover:text-orange-600 rounded cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.product.id)}
                    className="text-slate-300 hover:text-red-500 p-1.5 transition-colors self-start cursor-pointer"
                    aria-label="Remover item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Order Notes Section */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
              <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5 text-orange-500" />
                Observações do Pedido
              </label>
              <textarea
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Ex: Sem cebola, ponto da carne bem passado, troco para R$ 50,00..."
                rows={3}
                maxLength={300}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 transition-colors resize-none"
              />
              <p className="text-[10px] text-slate-400 text-right">{orderNotes.length}/300</p>
            </div>

            {/* Payment Method Selector */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
              <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-orange-500" />
                Forma de Pagamento
              </label>

              <div className="grid grid-cols-1 gap-2">
                {[
                  { id: "PIX", label: "PIX (Rápido e Seguro)", icon: QrCode },
                  { id: "Cartão de Crédito na Entrega", label: "Cartão de Crédito (na maquininha)", icon: CreditCard },
                  { id: "Cartão de Débito na Entrega", label: "Cartão de Débito (na maquininha)", icon: CreditCard },
                  { id: "Dinheiro", label: "Dinheiro (troco se necessário)", icon: Banknote },
                ].map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = paymentMethod === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setPaymentMethod(opt.id)}
                      className={`flex items-center gap-2.5 p-2 rounded-xl border text-xs font-medium text-left transition-all cursor-pointer ${isSelected
                        ? "bg-orange-50/80 border-orange-500 text-orange-950 font-semibold shadow-2xs"
                        : "bg-white border-slate-200/80 text-slate-700 hover:bg-slate-100/60"
                        }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? "bg-orange-600 text-white" : "bg-slate-100 text-slate-500"
                          }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="flex-1">{opt.label}</span>
                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-orange-600 text-white flex items-center justify-center">
                          <CheckCircle2 className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Coupon Section */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
              <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-orange-500" />
                Cupom de Desconto
              </label>

              {appliedCoupon ? (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <div>
                      <p className="text-xs font-bold text-emerald-800 font-mono">
                        {appliedCoupon}
                      </p>
                      <p className="text-[10px] text-emerald-600 font-medium">
                        Economia de R$ {discountAmount.toFixed(2).replace(".", ",")}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onRemoveCoupon}
                    className="text-xs text-red-600 hover:text-red-800 font-semibold p-1 cursor-pointer"
                  >
                    Remover
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCouponSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="Ex: PRIMEIRA15"
                    className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 uppercase font-mono"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    Aplicar
                  </button>
                </form>
              )}

              {couponError && (
                <p className="text-[11px] text-red-500 mt-1.5 font-medium">{couponError}</p>
              )}
            </div>

            {/* Pricing Summary */}
            <div className="space-y-2 pt-2 text-xs border-t border-slate-100">
              <div className="flex items-center justify-between text-slate-500">
                <span>Subtotal dos itens</span>
                <span className="font-semibold text-slate-700">
                  R$ {subtotal.toFixed(2).replace(".", ",")}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-500">
                <span>Taxa de entrega</span>
                <span
                  className={
                    deliveryFee === 0
                      ? "text-emerald-600 font-bold"
                      : "font-semibold text-slate-700"
                  }
                >
                  {deliveryFee === 0 ? "Grátis" : `R$ ${deliveryFee.toFixed(2).replace(".", ",")}`}
                </span>
              </div>

              {discountAmount > 0 && (
                <div className="flex items-center justify-between text-emerald-600 font-medium">
                  <span>Desconto de cupom</span>
                  <span>- R$ {discountAmount.toFixed(2).replace(".", ",")}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-100">
                <span>Total a pagar</span>
                <span className="text-orange-600">
                  R$ {finalTotal.toFixed(2).replace(".", ",")}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Footer with Checkout Button */}
        {!orderCompleted && items.length > 0 && (
          <div className="p-5 border-t border-slate-100 bg-white">
            <button
              type="button"
              disabled={isCheckingOut}
              onClick={handleCheckout}
              className="w-full py-3.5 px-4 bg-orange-600 hover:bg-orange-700 active:scale-98 disabled:opacity-75 text-white rounded-xl font-bold text-sm shadow-md shadow-orange-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {isCheckingOut ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Gerando Pedido...</span>
                </>
              ) : (
                <>
                  <span>Concluir Pedido</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
            <p className="text-[11px] text-center text-slate-400 mt-2">
              Gere a comanda para enviar ao WhatsApp
            </p>
          </div>
        )}
      </div>
    </div>
  );
};