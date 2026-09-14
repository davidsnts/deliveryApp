"use client";

import React from "react";
import { Star, Clock, Plus, Minus, Check } from "lucide-react";
import { Product } from "../types";

interface ProductCardProps {
  product: Product;
  quantityInCart: number;
  onAddToCart: (product: Product) => void;
  onUpdateQuantity: (productId: string, delta: number) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  quantityInCart,
  onAddToCart,
  onUpdateQuantity,
}) => {
  return (
    <div className="group bg-white rounded-2xl border border-slate-200/80 hover:border-orange-300 shadow-xs hover:shadow-xl hover:shadow-orange-500/5 transition-all duration-300 flex flex-col justify-between overflow-hidden">
      
      {/* Image & Badges */}
      <div className="relative w-full h-40 sm:h-44 bg-slate-100 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60" />

        {/* Badges on Top */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
          {product.isPopular && (
            <span className="bg-amber-500 text-slate-950 font-black text-[10px] uppercase px-2 py-0.5 rounded-md shadow-xs">
              🔥 Mais Pedido
            </span>
          )}
          {product.isOffer && (
            <span className="bg-red-500 text-white font-extrabold text-[10px] uppercase px-2 py-0.5 rounded-md shadow-xs">
              Oferta
            </span>
          )}
        </div>

        {product.freeDelivery && (
          <div className="absolute top-2.5 right-2.5">
            <span className="bg-emerald-600/95 backdrop-blur-xs text-white font-bold text-[10px] px-2 py-0.5 rounded-md shadow-xs">
              Frete Grátis
            </span>
          </div>
        )}

        {/* Rating overlay bottom left */}
        <div className="absolute bottom-2 left-2.5 flex items-center gap-1 bg-slate-900/80 backdrop-blur-xs text-white text-[11px] font-bold px-2 py-0.5 rounded-md">
          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
          <span>{product.rating.toFixed(1)}</span>
          <span className="text-white/60 font-normal">({product.reviewsCount})</span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-slate-400 text-[10px] sm:text-[11px] font-medium mb-1">
            <span>{product.restaurantName}</span>
            <span>•</span>
            <span className="flex items-center gap-0.5">
              <Clock className="w-3 h-3" />
              {product.deliveryTime}
            </span>
          </div>

          <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug group-hover:text-orange-600 transition-colors">
            {product.name}
          </h3>

          <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        </div>

        {/* Price & Add to Cart action */}
        <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <div>
            {product.originalPrice && (
              <span className="block text-[10px] sm:text-[11px] text-slate-400 line-through">
                R$ {product.originalPrice.toFixed(2).replace(".", ",")}
              </span>
            )}
            <span className="text-sm sm:text-base font-extrabold text-slate-900">
              R$ {product.price.toFixed(2).replace(".", ",")}
            </span>
          </div>

          {quantityInCart === 0 ? (
            <button
              type="button"
              onClick={() => onAddToCart(product)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-50 text-orange-600 hover:bg-orange-600 hover:text-white font-bold text-xs transition-all duration-200 active:scale-95 cursor-pointer min-h-[36px]"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Adicionar</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2 bg-orange-600 text-white rounded-xl p-1 shadow-xs min-h-[36px]">
              <button
                type="button"
                onClick={() => onUpdateQuantity(product.id, -1)}
                className="w-7 h-7 sm:w-6 sm:h-6 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Diminuir quantidade"
              >
                <Minus className="w-3 h-3 stroke-[3]" />
              </button>
              <span className="text-xs font-black px-1 min-w-[16px] text-center">
                {quantityInCart}
              </span>
              <button
                type="button"
                onClick={() => onUpdateQuantity(product.id, 1)}
                className="w-7 h-7 sm:w-6 sm:h-6 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Aumentar quantidade"
              >
                <Plus className="w-3 h-3 stroke-[3]" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
