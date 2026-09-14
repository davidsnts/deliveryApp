"use client";

import React from "react";
import {
  X,
  ShoppingBag,
  Clock,
  Flame,
  Bike,
  CheckCircle2,
  XCircle,
  MapPin,
  MessageCircle,
  CreditCard,
  ChefHat,
} from "lucide-react";
import { Order, OrderStatus } from "../types";

interface MyOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
}

export const MyOrdersModal: React.FC<MyOrdersModalProps> = ({
  isOpen,
  onClose,
  orders,
}) => {
  if (!isOpen) return null;

  const getStatusInfo = (status: OrderStatus) => {
    switch (status) {
      case "pendente":
        return {
          label: "Recebido pelo Restaurante",
          desc: "Aguardando confirmação da cozinha",
          color: "bg-amber-50 text-amber-700 border-amber-200",
          icon: Clock,
          progress: 25,
        };
      case "em_preparo":
        return {
          label: "Em Preparação",
          desc: "Sua comida está sendo preparada com muito carinho",
          color: "bg-blue-50 text-blue-700 border-blue-200",
          icon: Flame,
          progress: 55,
        };
      case "saiu_entrega":
        return {
          label: "Saiu para Entrega!",
          desc: "O motoboy já está a caminho do seu endereço",
          color: "bg-purple-50 text-purple-700 border-purple-200",
          icon: Bike,
          progress: 85,
        };
      case "entregue":
        return {
          label: "Entregue com Sucesso",
          desc: "Esperamos que saboreie cada garfada!",
          color: "bg-emerald-50 text-emerald-700 border-emerald-200",
          icon: CheckCircle2,
          progress: 100,
        };
      case "cancelado":
        return {
          label: "Cancelado",
          desc: "Este pedido foi cancelado",
          color: "bg-red-50 text-red-700 border-red-200",
          icon: XCircle,
          progress: 0,
        };
    }
  };

  const getWhatsAppLink = (orderId: string) => {
    const text = encodeURIComponent(
      `Olá! Gostaria de acompanhar o status do meu pedido *#${orderId}* no Manga com Pimenta.`
    );
    return `https://wa.me/${process.env.NEXT_PUBLIC_TELEFONE}?text=${text}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Meus Pedidos</h3>
              <p className="text-xs text-slate-400">
                {orders.length === 0
                  ? "Nenhum pedido recente"
                  : `${orders.length} ${orders.length === 1 ? "pedido registrado" : "pedidos registrados"}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Orders List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {orders.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-300 flex items-center justify-center mx-auto mb-3">
                <ShoppingBag className="w-8 h-8 stroke-1" />
              </div>
              <h4 className="text-base font-bold text-slate-800">
                Você ainda não fez pedidos
              </h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1 mb-6 leading-relaxed">
                Quando você pedir pratos ou bebidas, eles aparecerão aqui automaticamente com acompanhamento em tempo real!
              </p>
              <button
                onClick={onClose}
                className="py-2.5 px-6 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
              >
                Ver Cardápio
              </button>
            </div>
          ) : (
            orders.map((ord) => {
              const status = getStatusInfo(ord.status);
              const StatusIcon = status.icon;
              const date = new Date(ord.createdAt);
              const formattedDate = date.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              });
              const formattedDay = date.toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
              });

              return (
                <div
                  key={ord.id}
                  className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3 hover:border-orange-200 transition-colors"
                >
                  {/* Order Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-slate-900 text-xs">
                        #{ord.id}
                      </span>
                      <p className="text-[11px] text-slate-400">
                        {formattedDay} às {formattedDate}
                      </p>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-xl border ${status.color}`}
                    >
                      <StatusIcon className="w-3.5 h-3.5" />
                      <span>{status.label}</span>
                    </span>
                  </div>

                  {/* Progress Bar (if active) */}
                  {ord.status !== "cancelado" && ord.status !== "entregue" && (
                    <div className="space-y-1">
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-orange-500 h-full transition-all duration-500 rounded-full"
                          style={{ width: `${status.progress}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium italic">
                        {status.desc}
                      </p>
                    </div>
                  )}

                  {/* Address */}
                  <div className="text-[11px] text-slate-500 flex items-start gap-1.5 pt-1 border-t border-slate-200/60">
                    <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
                    <span>
                      {ord.deliveryAddress.rua}, {ord.deliveryAddress.numero} ({ord.deliveryAddress.bairro})
                    </span>
                  </div>

                  {/* Items List */}
                  <div className="space-y-1 bg-white p-2.5 rounded-xl border border-slate-200/60 text-xs">
                    {ord.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-700">
                          <strong className="text-slate-900">{item.quantity}x</strong>{" "}
                          {item.product.name}
                        </span>
                        <span className="text-slate-500 font-mono">
                          R$ {(item.product.price * item.quantity).toFixed(2).replace(".", ",")}
                        </span>
                      </div>
                    ))}

                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-xs font-bold">
                      <span className="text-slate-600 flex items-center gap-1">
                        <CreditCard className="w-3 h-3 text-slate-400" />
                        {ord.paymentMethod}
                      </span>
                      <span className="text-orange-600 font-mono">
                        R$ {ord.total.toFixed(2).replace(".", ",")}
                      </span>
                    </div>
                  </div>

                  {/* WhatsApp Support Action */}
                  <a
                    href={getWhatsAppLink(ord.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Dúvidas? Falar com o restaurante</span>
                  </a>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 text-center">
          <p className="text-[11px] text-slate-400">
            Identificado automaticamente neste navegador
          </p>
        </div>

      </div>
    </div>
  );
};
