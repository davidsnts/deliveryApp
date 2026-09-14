"use client";

import React, { useState } from "react";
import { X, MapPin, Check, Plus, Home, Briefcase } from "lucide-react";
import { Address } from "../types";
import { randomUUID } from "crypto";

interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  addresses: Address[];
  currentAddress: Address | null;
  onSelectAddress: (address: Address) => void;
  onAddNewAddress: (address: Address) => void;
}

export const AddressModal: React.FC<AddressModalProps> = ({
  isOpen,
  onClose,
  addresses,
  currentAddress,
  onSelectAddress,
  onAddNewAddress,
}) => {
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [rua, setRua] = useState("");
  const [numero, setNumero] = useState("");
  const [bairro, setBairro] = useState("");
  const [label, setLabel] = useState("Outro");

  if (!isOpen) return null;

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rua || !numero || !bairro) return;

    const newAddr: Address = {
      id: `addr-${Math.random().toString(36).substring(2, 9)}`,
      label,
      rua,
      numero,
      bairro,
    };

    onAddNewAddress(newAddr);
    onSelectAddress(newAddr);
    setIsAddingNew(false);
    setRua("");
    setNumero("");
    setBairro("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-800 text-lg">Onde você quer receber?</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {!isAddingNew ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Endereços Salvos
              </p>

              {addresses.length === 0 ? (
                <div className="text-center py-6 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-xs text-slate-500 mb-2">
                    Você ainda não cadastrou nenhum endereço.
                  </p>
                  <button
                    onClick={() => setIsAddingNew(true)}
                    className="py-2 px-4 bg-orange-600 text-white rounded-xl text-xs font-semibold hover:bg-orange-500 transition-colors cursor-pointer"
                  >
                    Cadastrar Primeiro Endereço
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {addresses.map((addr) => {
                    const isSelected = currentAddress ? addr.id === currentAddress.id : false;
                    return (
                      <div
                        key={addr.id}
                        onClick={() => {
                          onSelectAddress(addr);
                          onClose();
                        }}
                        className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${isSelected
                          ? "border-orange-500 bg-orange-50/50 shadow-xs"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center mt-0.5 ${isSelected ? "bg-orange-600 text-white" : "bg-slate-100 text-slate-600"
                              }`}
                          >
                            {addr.label === "Casa" ? (
                              <Home className="w-4 h-4" />
                            ) : addr.label === "Trabalho" ? (
                              <Briefcase className="w-4 h-4" />
                            ) : (
                              <MapPin className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-800 text-sm">
                                {addr.label}
                              </span>
                              {isSelected && (
                                <span className="text-[10px] bg-orange-100 text-orange-700 font-bold px-1.5 py-0.5 rounded-md">
                                  Ativo
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-600 mt-0.5">
                              {addr.rua}, {addr.numero}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {addr.bairro}
                            </p>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center shrink-0">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {addresses.length > 0 && (
                <button
                  onClick={() => setIsAddingNew(true)}
                  className="w-full py-3 px-4 border-2 border-dashed border-slate-200 hover:border-orange-400 rounded-xl text-sm font-semibold text-slate-600 hover:text-orange-600 flex items-center justify-center gap-2 transition-colors mt-4"
                >
                  <Plus className="w-4 h-4" />
                  Cadastrar novo endereço
                </button>
              )}
            </>
          ) : (
            <form onSubmit={handleSaveNew} className="space-y-3.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Novo Endereço de Entrega
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Identificador
                </label>
                <div className="flex gap-2">
                  {["Casa", "Trabalho", "Outro"].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setLabel(type)}
                      className={`flex-1 py-1.5 text-xs rounded-lg font-medium border ${label === type
                        ? "bg-orange-600 text-white border-orange-600"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Rua / Avenida
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Av. Brigadeiro Faria Lima"
                  value={rua}
                  onChange={(e) => setRua(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Número / Compl.
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 3477, Bloco B"
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bairro
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Itaim Bibi"
                    value={bairro}
                    onChange={(e) => setBairro(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="flex-1 py-2.5 px-4 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-xs transition-colors"
                >
                  Salvar Endereço
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
