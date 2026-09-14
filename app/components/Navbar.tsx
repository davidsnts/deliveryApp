"use client";

import React from "react";
import { Search, ShoppingBag, MapPin, ChevronDown, UtensilsCrossed, X, ChefHat } from "lucide-react";
import { Address } from "../types";

interface NavbarProps {
  currentAddress: Address | null;
  onOpenAddressModal: () => void;
  cartCount: number;
  cartSubtotal: number;
  onOpenCart: () => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  myOrdersCount?: number;
  hasActiveOrder?: boolean;
  onOpenMyOrders?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentAddress,
  onOpenAddressModal,
  cartCount,
  cartSubtotal,
  onOpenCart,
  searchQuery,
  onSearchChange,
  myOrdersCount = 0,
  hasActiveOrder = false,
  onOpenMyOrders,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-xs transition-all">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-2 sm:gap-4">

          {/* Logo Brand */}
          <div className="flex items-center gap-3 sm:gap-6 min-w-0">
            <a href="#" className="flex items-center gap-2 group select-none min-w-0">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/30 group-hover:scale-105 transition-transform duration-200 shrink-0">
                <UtensilsCrossed className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-base sm:text-2xl font-black tracking-tight text-slate-900 leading-none truncate">
                  Manga<span className="text-orange-600">Com Pimenta</span>
                </span>
                <span className="text-[9px] sm:text-[11px] font-semibold tracking-wider text-slate-400 uppercase mt-0.5 hidden xs:block">
                  Delivery Rápido
                </span>
              </div>
            </a>

            {/* Address Selector Trigger (Desktop/Tablet) */}
            <button
              onClick={onOpenAddressModal}
              type="button"
              className="hidden md:flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-orange-50/80 border border-slate-200/80 hover:border-orange-200 text-left transition-all duration-200 cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <p className="text-slate-400 font-medium leading-none">Entregar em</p>
                <p className="font-semibold text-slate-800 truncate max-w-[180px] mt-0.5">
                  {currentAddress && currentAddress.rua
                    ? `${currentAddress.rua}, ${currentAddress.numero}`
                    : "Cadastrar endereço"}
                </p>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 ml-1" />
            </button>
          </div>

          {/* Search Bar (Desktop center) */}
          <div className="hidden lg:flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Busque por pratos, refrigerantes ou categorias..."
                className="w-full pl-10 pr-10 py-2.5 bg-slate-100/80 hover:bg-slate-100 focus:bg-white text-sm rounded-xl border border-transparent focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/10 transition-all placeholder:text-slate-400 text-slate-800"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Right Actions: Address on Mobile, Cart Button & My Orders */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* My Orders Button */}
            <button
              onClick={onOpenMyOrders}
              type="button"
              className="relative flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-xl bg-slate-100 hover:bg-orange-50 text-slate-700 hover:text-orange-600 border border-slate-200/80 hover:border-orange-200 font-semibold text-xs transition-all cursor-pointer"
              title="Acompanhar meus pedidos"
            >
              <div className="relative">
                <ChefHat className="w-4 h-4 text-orange-600" />
                {hasActiveOrder && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full animate-ping" />
                )}
              </div>
              <span className="hidden sm:inline">Meus Pedidos</span>
              {myOrdersCount > 0 && (
                <span className="bg-orange-100 text-orange-700 font-bold px-1.5 py-0.2 rounded-md text-[10px]">
                  {myOrdersCount}
                </span>
              )}
            </button>

            {/* Cart Button */}
            <button
              onClick={onOpenCart}
              type="button"
              className="relative flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-orange-600 hover:bg-orange-700 active:scale-98 text-white rounded-xl font-medium shadow-md shadow-orange-600/20 hover:shadow-orange-600/30 transition-all cursor-pointer"
            >
              <div className="relative">
                <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2.5 w-4 h-4 sm:w-5 sm:h-5 bg-amber-400 text-slate-900 font-black text-[10px] sm:text-xs rounded-full flex items-center justify-center shadow-xs animate-bounce">
                    {cartCount}
                  </span>
                )}
              </div>
              <span className="hidden sm:inline text-xs sm:text-sm font-semibold">
                {cartCount === 0 ? "Sacola" : `R$ ${cartSubtotal.toFixed(2).replace(".", ",")}`}
              </span>
            </button>
          </div>

        </div>

        {/* Mobile Address Bar & Search Row */}
        <div className="pb-2.5 lg:hidden space-y-2">
          {/* Mobile Address Pill */}
          <button
            onClick={onOpenAddressModal}
            type="button"
            className="w-full flex items-center justify-between px-3 py-1.5 bg-orange-50/70 hover:bg-orange-100/70 border border-orange-200/60 rounded-xl text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              <MapPin className="w-3.5 h-3.5 text-orange-600 shrink-0" />
              <span className="text-[11px] text-slate-700 truncate font-medium">
                {currentAddress && currentAddress.rua
                  ? `${currentAddress.rua}, ${currentAddress.numero} (${currentAddress.bairro})`
                  : "Cadastrar endereço de entrega"}
              </span>
            </div>
            <span className="text-[11px] font-bold text-orange-600 shrink-0 ml-2">
              {currentAddress && currentAddress.rua ? "Trocar" : "Adicionar"}
            </span>
          </button>

          {/* Search Bar Input */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar comida ou bebida..."
              className="w-full pl-9 pr-9 py-2 bg-slate-100 focus:bg-white text-xs sm:text-sm rounded-xl border border-transparent focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/10 transition-all text-slate-800"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

      </div>
    </header>
  );
};
