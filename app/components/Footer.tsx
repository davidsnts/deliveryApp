"use client";

import React from "react";
import Link from "next/link";
import { UtensilsCrossed, ShieldCheck, Clock, Award, Phone, Heart, MapPin, Lock } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 mt-12 border-t border-slate-800 text-xs">
      {/* Guarantees Bar - Compact */}
      <div className="border-b border-slate-800/80 py-4 bg-slate-950/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-orange-400 shrink-0" />
              <span>
                <strong className="text-white">Entrega no Prazo:</strong> Levamos o pedido até sua porta
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-orange-400 shrink-0" />
              <span>
                <strong className="text-white">Pagamento Seguro:</strong> Pix, crédito e débito
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <Award className="w-4 h-4 text-orange-400 shrink-0" />
              <span>
                <strong className="text-white">Qualidade:</strong> Restaurante aprovado pelos clientes
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Compact 3 Columns */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">

          {/* Brand & Support */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-orange-600 flex items-center justify-center text-white shrink-0">
                <UtensilsCrossed className="w-4 h-4" />
              </div>
              <span className="text-lg font-black tracking-tight text-white">
                Manga<span className="text-orange-500">Com Pimenta</span>
              </span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px] max-w-sm">
              A forma mais rápida, prática e deliciosa de pedir comida direto na sua casa ou trabalho.
            </p>
            <div className="flex items-center gap-1.5 text-slate-300 font-medium text-[11px] pt-1">
              <Phone className="w-3.5 h-3.5 text-orange-400" />
              <span>Suporte: {process.env.NEXT_PUBLIC_TELEFONE_FORMATADO}</span>
            </div>
          </div>

          {/* City / Location */}
          <div className="space-y-2">
            <h5 className="text-white font-bold text-xs uppercase tracking-wider">
              Conheça melhor nossa cidade!
            </h5>
            <div className="flex items-center gap-1.5 text-slate-300">
              <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0" />
              <span className="font-semibold text-white">Juiz de Fora - MG</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Orgulho em servir o autêntico sabor da comida mineira com muito carinho e tradição.
            </p>
          </div>

          {/* Payment Methods */}
          <div className="space-y-2">
            <h5 className="text-white font-bold text-xs uppercase tracking-wider">
              Formas de Pagamento
            </h5>
            <div className="flex flex-wrap gap-1.5">
              {["PIX", "Mastercard", "Visa", "Elo", "Alelo"].map((method) => (
                <span
                  key={method}
                  className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[11px] font-semibold border border-slate-700/60"
                >
                  {method}
                </span>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Copyright Bar - Compact */}
      <div className="border-t border-slate-800/80 py-4 bg-slate-950/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
          <span>
            &copy; {new Date().getFullYear()} Manga com Pimenta Ltda. Todos os direitos reservados.
          </span>

          <div className="flex items-center gap-4">
            <span className="hidden md:flex items-center gap-1">
              Feito com <Heart className="w-3 h-3 text-red-500 fill-red-500" /> para amantes da boa gastronomia
            </span>

            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-orange-600 text-slate-400 hover:text-white transition-all text-xs font-semibold border border-slate-700 hover:border-orange-500 shadow-xs group cursor-pointer"
            >
              <Lock className="w-3 h-3 text-orange-400 group-hover:text-white transition-colors" />
              <span>Área Administrativa</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
