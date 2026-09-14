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

      <div className="grid grid-cols-2 gap-2 sm:gap-3 max-w-sm sm:max-w-md py-1">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(isSelected ? "all" : cat.id)}
              className={`group flex items-center gap-2.5 sm:gap-3.5 px-3 sm:px-4 py-2.5 sm:py-3.5 rounded-2xl border transition-all duration-200 cursor-pointer ${isSelected
                  ? "bg-orange-600 border-orange-600 text-white shadow-md shadow-orange-600/25 scale-[1.02]"
                  : "bg-white border-slate-200/80 hover:border-orange-200 hover:bg-orange-50/40 text-slate-700 shadow-xs"
                }`}
            >
              <span className="text-2xl sm:text-3xl group-hover:scale-110 transition-transform duration-200 shrink-0">
                {cat.icon}
              </span>
              <div className="text-left min-w-0">
                <span
                  className={`block text-xs sm:text-sm font-bold leading-tight truncate ${isSelected ? "text-white" : "text-slate-900"
                    }`}
                >
                  {cat.name}
                </span>
                <span
                  className={`text-[10px] sm:text-xs ${isSelected ? "text-white/85 font-medium" : "text-slate-400"
                    }`}
                >
                  {cat.count} opções
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
