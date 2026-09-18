"use client";

import React from "react";
import { Category } from "../types";

interface CategoryListProps {
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
  categories?: Category[];
}

export const CategoryList: React.FC<CategoryListProps> = ({
  selectedCategory,
  onSelectCategory,
  categories = [],
}) => {
  return (
    <section className="py-2">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Categorias
          </h2>
          <p className="text-xs text-slate-500">
            Selecione para filtrar os pratos ou as bebidas
          </p>
        </div>
        {selectedCategory !== "all" && (
          <button
            onClick={() => onSelectCategory("all")}
            className="text-xs font-semibold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
          >
            Ver todos
          </button>
        )}
      </div>

      {/* Wrapper Relativo para ancorar os gradientes laterais */}
      <div className="relative w-full py-2">

        {/* 1. GRADIENTE ESQUERDO (Aparece apenas no mobile) */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-slate-50 to-transparent z-10 sm:hidden" />

        {/* 2. GRADIENTE DIREITO (Cria o efeito 'fade out' indicando mais itens à direita) */}
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-slate-50 to-transparent z-10 sm:hidden" />

        {/* Container com Scroll Horizontal no Mobile e Grid a partir de telas Médias/Grandes */}
        <div className="flex sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 overflow-x-auto pb-2 sm:pb-0 scrollbar-none snap-x snap-mandatory">

          {/* Botão para Resetar / Ver Todos */}
          <button
            onClick={() => onSelectCategory("all")}
            className={`snap-start shrink-0 flex items-center gap-3 px-3.5 py-2.5 rounded-2xl border transition-all duration-200 cursor-pointer active:scale-95 ${
              selectedCategory === "all"
                ? "bg-slate-200 border-slate-300 text-white shadow-md shadow-slate-900/20"
                : "bg-white border-slate-200/80 text-slate-700 hover:border-slate-300 hover:bg-slate-50 shadow-xs"
            }`}
          >
            <span className="text-xl shrink-0">🍽️</span>
            <div className="text-left min-w-0 pr-1">
              <span className={`block text-xs font-bold leading-tight truncate ${selectedCategory === "all" ? "text-slate-500" : "text-slate-900"}`}>
                Todos
              </span>
              <span className={`text-[10px] ${selectedCategory === "all" ? "text-slate-500" : "text-slate-400"}`}>
                Ver cardápio
              </span>
            </div>
          </button>

          {/* Categorias Dinâmicas */}
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(isSelected ? "all" : cat.id)}
                className={`snap-start shrink-0 group flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl border transition-all duration-200 cursor-pointer active:scale-95 ${
                  isSelected
                    ? "bg-orange-600 border-orange-600 text-white shadow-md shadow-orange-600/25 scale-[1.02]"
                    : "bg-white border-slate-200/80 hover:border-orange-300 hover:bg-orange-50/30 text-slate-700 shadow-xs"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-2xl group-hover:scale-110 transition-transform duration-200 shrink-0 select-none">
                    {cat.icon}
                  </span>
                  <span
                    className={`block text-xs font-bold leading-tight truncate ${
                      isSelected ? "text-white" : "text-slate-900"
                    }`}
                  >
                    {cat.name}
                  </span>
                </div>

                {/* Badge Contadora */}
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 transition-colors ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-500 group-hover:bg-orange-100 group-hover:text-orange-700"
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};