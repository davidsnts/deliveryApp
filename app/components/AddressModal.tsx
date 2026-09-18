"use client";

import React, { useState } from "react";
import {
  X,
  MapPin,
  Check,
  Plus,
  Home,
  Briefcase,
  Loader2,
  Navigation,
  Trash2,
  Search,
  Building,
  FileText,
  AlertCircle,
} from "lucide-react";

import { Address } from "../types";
import { RAIO_MAXIMO_KM, calcularValorFrete } from "../lib/frete";

// Endereço do Restaurante vindo da variável de ambiente (ou fallback exato)
const RESTAURANTE_ENDERECO =
  process.env.NEXT_PUBLIC_ENDERECO_RESTAURANTE ||
  "José Lourenço, 1015, Juiz de Fora, MG";

interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  addresses: Address[];
  currentAddress: Address | null;
  onSelectAddress: (address: Address) => void;
  onAddNewAddress: (address: Address) => void;
  onDeleteAddress: (addressId: string) => void;
}

type TabMode = "cep" | "manual";

export const AddressModal: React.FC<AddressModalProps> = ({
  isOpen,
  onClose,
  addresses,
  currentAddress,
  onSelectAddress,
  onAddNewAddress,
  onDeleteAddress,
}) => {
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [tabMode, setTabMode] = useState<TabMode>("cep");
  const [loading, setLoading] = useState(false);

  // Formulário
  const [label, setLabel] = useState("Casa");
  const [cep, setCep] = useState("");
  const [rua, setRua] = useState("");
  const [numero, setNumero] = useState("");
  const [bairro, setBairro] = useState("");
  const [complemento, setComplemento] = useState("");
  const [coords, setCoords] = useState<{ lat?: number; lng?: number }>({});
  const [distanciaCalculada, setDistanciaCalculada] = useState<number | null>(null);
  const [valorFreteCalculado, setValorFreteCalculado] = useState<number | null>(null);
  const [duracaoEstimada, setDuracaoEstimada] = useState<number | null>(null);
  const [posicaoAproximada, setPosicaoAproximada] = useState(false);

  if (!isOpen) return null;

  // 1. GPS Nativo do Celular
  const handleUsarGPS = () => {
    if (!navigator.geolocation) {
      alert("Seu dispositivo não suporta geolocalização.");
      return;
    }

    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });
        await preencherPorCoordenadas(lat, lng);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        alert("Não foi possível acessar a localização. Verifique as permissões de GPS.");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Formata o CEP e busca na API quando completar 8 dígitos
  const handleBuscarCEP = async (valor: string) => {
    const apenasNumeros = valor.replace(/\D/g, "");

    // Aplica a máscara 00000-000
    let cepFormatado = apenasNumeros;
    if (apenasNumeros.length > 5) {
      cepFormatado = `${apenasNumeros.slice(0, 5)}-${apenasNumeros.slice(5, 8)}`;
    }

    setCep(cepFormatado);

    if (apenasNumeros.length === 8) {
      setLoading(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${apenasNumeros}/json/`);
        const data = await res.json();

        if (data.erro) {
          alert("CEP não encontrado. Por favor, verifique os dígitos.");
          setLoading(false);
          return;
        }

        const logradouro = data.logradouro || "";
        const bairroEncontrado = data.bairro || "";
        const cidade = data.localidade || "Juiz de Fora";
        const uf = data.uf || "MG";

        setRua(logradouro);
        setBairro(bairroEncontrado);

        // Sempre passa o CEP diretamente — a API tem cascata de fallbacks inteligente
        // (tenta rua, CEP como postcode OSM, bairro, cidade) e usa posição aproximada se necessário
        await calcularDistanciaAPI(apenasNumeros);
      } catch (err) {
        console.error("Erro ao buscar CEP:", err);
        alert("Erro ao buscar o CEP.");
      } finally {
        setLoading(false);
      }
    }
  };

  // 3. Preencher dados por Coordenadas Lat/Lon (Geocoding Reverso)
  const preencherPorCoordenadas = async (lat: number, lng: number) => {
    try {
      const res = await fetch(`/api/geocode?lat=${lat}&lon=${lng}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.address) {
          setRua(data.address.road || data.address.pedestrian || "");
          setBairro(
            data.address.suburb ||
            data.address.neighbourhood ||
            data.address.city_district ||
            ""
          );
          if (data.address.house_number) setNumero(data.address.house_number);
          if (data.address.postcode) setCep(data.address.postcode.replace(/\D/g, ""));
        }
      }
      await calcularDistanciaAPI(`${lat},${lng}`);
    } catch (err) {
      console.error(err);
    }
  };

  // 4. API de Cálculo de Frete
  const calcularDistanciaAPI = async (destinoStr: string) => {
    try {
      setLoading(true);

      const RESTAURANTE_ORIGEM = `${process.env.NEXT_PUBLIC_RESTAURANTE_LAT || "-21.776589"},${process.env.NEXT_PUBLIC_RESTAURANTE_LNG || "-43.368812"}`;

      const res = await fetch("/api/distancia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origem: RESTAURANTE_ORIGEM,
          destino: destinoStr,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Não foi possível localizar o endereço.");
        return;
      }

      if (data.distancia_km !== undefined) {
        setDistanciaCalculada(data.distancia_km);
        setPosicaoAproximada(!!data.posicao_aproximada);
        if (data.valor_frete !== undefined) {
          setValorFreteCalculado(data.valor_frete);
        } else {
          const resultado = calcularValorFrete(data.distancia_km);
          setValorFreteCalculado(resultado.valor);
        }
        if (data.duracao_min !== undefined) {
          setDuracaoEstimada(data.duracao_min);
        }
        if (data.coordenadas?.destino) {
          setCoords({
            lat: data.coordenadas.destino.lat,
            lng: data.coordenadas.destino.lon,
          });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBuscarManual = () => {
    if (!rua || !bairro) return;
    const enderecoTexto = `${rua}, ${numero ? numero + " - " : ""}${bairro}, Juiz de Fora - MG`;
    calcularDistanciaAPI(enderecoTexto);
  };

  const handleResetForm = () => {
    setIsAddingNew(false);
    setTabMode("cep");
    setCep("");
    setRua("");
    setNumero("");
    setBairro("");
    setComplemento("");
    setCoords({});
    setDistanciaCalculada(null);
    setValorFreteCalculado(null);
    setDuracaoEstimada(null);
    setPosicaoAproximada(false);
  };

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rua || !numero || !bairro) return;

    if (distanciaCalculada !== null && distanciaCalculada > RAIO_MAXIMO_KM) {
      alert(`Infelizmente não entregamos nesta região. Nosso raio de entrega é de até ${RAIO_MAXIMO_KM} km.`);
      return;
    }

    const newAddr: Address = {
      id: `addr-${Math.random().toString(36).substring(2, 9)}`,
      label,
      rua,
      numero,
      bairro,
      complemento: complemento || undefined,
      cep: cep || undefined,
      lat: coords.lat,
      lng: coords.lng,
      distanciaKm: distanciaCalculada || undefined,
    };

    onAddNewAddress(newAddr);
    onSelectAddress(newAddr);
    handleResetForm();
    onClose();
  };

  const handleDelete = (e: React.MouseEvent, addressId: string) => {
    e.stopPropagation();
    if (confirm("Deseja mesmo excluir este endereço?")) {
      onDeleteAddress(addressId);
    }
  };

  const foraDoRaio = distanciaCalculada !== null && distanciaCalculada > RAIO_MAXIMO_KM;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]">

        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shadow-xs">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base leading-tight">
                Endereço de Entrega
              </h3>
              <p className="text-[11px] text-slate-400">
                Entrega até {RAIO_MAXIMO_KM} km de {RESTAURANTE_ENDERECO}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {!isAddingNew ? (
            /* ================= VISTA: LISTA DE ENDEREÇOS SALVOS ================= */
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Meus Endereços Salvos
                </span>
                <span className="text-xs text-slate-400">
                  {addresses.length} cadastrado(s)
                </span>
              </div>

              {addresses.length === 0 ? (
                <div className="text-center py-8 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">Nenhum endereço encontrado</p>
                  <p className="text-xs text-slate-400 mt-1 mb-4">
                    Cadastre o local onde deseja receber suas entregas.
                  </p>
                  <button
                    onClick={() => setIsAddingNew(true)}
                    className="py-2.5 px-5 bg-orange-600 text-white rounded-xl text-xs font-bold hover:bg-orange-500 shadow-sm transition-all cursor-pointer"
                  >
                    Adicionar Novo Endereço
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
                        className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${isSelected
                            ? "border-orange-500 bg-orange-50/40 shadow-xs ring-1 ring-orange-500/20"
                            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center mt-0.5 shrink-0 ${isSelected
                                ? "bg-orange-600 text-white shadow-xs"
                                : "bg-slate-100 text-slate-600"
                              }`}
                          >
                            {addr.label === "Casa" ? (
                              <Home className="w-4 h-4" />
                            ) : addr.label === "Trabalho" ? (
                              <Briefcase className="w-4 h-4" />
                            ) : (
                              <Building className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800 text-sm">
                                {addr.label}
                              </span>
                              {isSelected && (
                                <span className="text-[10px] bg-orange-100 text-orange-700 font-bold px-2 py-0.5 rounded-full">
                                  Ativo
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-medium text-slate-700 mt-0.5">
                              {addr.rua}, {addr.numero}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {addr.bairro}
                              {addr.complemento ? ` • ${addr.complemento}` : ""}
                              {addr.distanciaKm ? (
                                <>
                                  {" "}• {addr.distanciaKm} km
                                  {(() => {
                                    const frete = calcularValorFrete(addr.distanciaKm);
                                    return frete.dentroDoRaio ? ` (Frete R$ ${frete.valor.toFixed(2).replace(".", ",")})` : " (Fora do raio)";
                                  })()}
                                </>
                              ) : ""}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isSelected && (
                            <div className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-xs">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={(e) => handleDelete(e, addr.id)}
                            title="Remover endereço"
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {addresses.length > 0 && (
                <button
                  onClick={() => setIsAddingNew(true)}
                  className="w-full py-3 px-4 border-2 border-dashed border-slate-200 hover:border-orange-400 rounded-2xl text-sm font-semibold text-slate-600 hover:text-orange-600 flex items-center justify-center gap-2 transition-colors mt-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Cadastrar Novo Endereço
                </button>
              )}
            </>
          ) : (
            /* ================= VISTA: CADASTRO DE NOVO ENDEREÇO ================= */
            <form onSubmit={handleSaveNew} className="space-y-4">

              {/* Botão de GPS Automático */}
              <button
                type="button"
                onClick={handleUsarGPS}
                disabled={loading}
                className="w-full py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs hover:shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Navigation className="w-4 h-4 fill-white" />
                )}
                Usar Minha Localização Atual (GPS)
              </button>

              {/* Seletor de Abas (CEP x Manual) */}
              <div className="bg-slate-100 p-1 rounded-2xl flex text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setTabMode("cep")}
                  className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${tabMode === "cep"
                      ? "bg-white text-slate-800 shadow-xs font-bold"
                      : "text-slate-500 hover:text-slate-800"
                    }`}
                >
                  Por CEP
                </button>
                <button
                  type="button"
                  onClick={() => setTabMode("manual")}
                  className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${tabMode === "manual"
                      ? "bg-white text-slate-800 shadow-xs font-bold"
                      : "text-slate-500 hover:text-slate-800"
                    }`}
                >
                  Por Endereço
                </button>
              </div>

              {/* ABA 1: CEP */}
              {tabMode === "cep" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    CEP (somente números)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={9}
                      placeholder="Ex: 36010-011"
                      value={cep}
                      onChange={(e) => handleBuscarCEP(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-orange-500"
                    />
                    {loading && (
                      <Loader2 className="w-4 h-4 animate-spin text-orange-500 absolute right-3 top-3" />
                    )}
                  </div>
                </div>
              )}

              {/* ABA 2: MANUAL */}
              {tabMode === "manual" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Rua / Avenida
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: José Lourenço"
                      value={rua}
                      onChange={(e) => {
                        setRua(e.target.value);
                        setDistanciaCalculada(null);
                      }}
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Bairro
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: São Pedro"
                        value={bairro}
                        onChange={(e) => {
                          setBairro(e.target.value);
                          setDistanciaCalculada(null);
                        }}
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Verificar Frete
                      </label>
                      <button
                        type="button"
                        onClick={handleBuscarManual}
                        disabled={loading || !rua || !bairro}
                        className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                        Validar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* DADOS DETALHADOS (Sempre exibidos para conferência) */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Rua / Avenida *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Nome da rua"
                      value={rua}
                      onChange={(e) => setRua(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Número *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="123"
                      value={numero}
                      onChange={(e) => setNumero(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Bairro *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Nome do bairro"
                      value={bairro}
                      onChange={(e) => setBairro(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  {/* Campo Complemento */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                      <FileText className="w-3 h-3 text-slate-400" />
                      Complemento
                    </label>
                    <input
                      type="text"
                      placeholder="Apto 402, Bloco B..."
                      value={complemento}
                      onChange={(e) => setComplemento(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                {/* Identificador do Endereço */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Salvar como:
                  </label>
                  <div className="flex gap-2">
                    {["Casa", "Trabalho", "Outro"].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setLabel(type)}
                        className={`flex-1 py-1.5 text-xs rounded-xl font-semibold border transition-all cursor-pointer ${label === type
                            ? "bg-orange-600 text-white border-orange-600 shadow-xs"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                          }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status do Raio de Entrega, Distância e Frete */}
                {distanciaCalculada !== null && (
                  <div
                    className={`p-3 rounded-2xl flex flex-col gap-1.5 text-xs font-medium border ${foraDoRaio
                        ? "bg-red-50 border-red-200 text-red-900"
                        : "bg-emerald-50 border-emerald-200 text-emerald-900"
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-semibold">
                        {foraDoRaio ? (
                          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                        ) : (
                          <Check className="w-4 h-4 text-emerald-600 stroke-[3] shrink-0" />
                        )}
                        {foraDoRaio
                          ? `Fora da área de atendimento (Máx. ${RAIO_MAXIMO_KM} km):`
                          : "Distância calculada (OpenStreetMap):"}
                      </span>
                      <span className="font-bold text-sm">
                        {distanciaCalculada} km
                        {duracaoEstimada && !foraDoRaio ? ` (~${duracaoEstimada} min)` : ""}
                      </span>
                    </div>

                    {!foraDoRaio && valorFreteCalculado !== null && (
                      <div className="flex items-center justify-between pt-1 border-t border-emerald-200/60 text-emerald-800">
                        <span className="text-[11px] flex items-center gap-1">
                          🛵 Taxa de entrega estimada:
                        </span>
                        <span className="font-black text-sm text-emerald-700">
                          R$ {valorFreteCalculado.toFixed(2).replace(".", ",")}
                        </span>
                      </div>
                    )}

                    {posicaoAproximada && !foraDoRaio && (
                      <div className="flex items-start gap-1.5 pt-1 border-t border-emerald-200/60 text-amber-700">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />
                        <span className="text-[10px] leading-tight">
                          Posição aproximada (CEP/bairro). O frete final pode variar levemente.
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Botões de Ação Final */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="flex-1 py-3 px-4 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={loading || !rua || !numero || !bairro || foraDoRaio}
                  className="flex-1 py-3 px-4 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-2xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {foraDoRaio ? `Fora da Área (Máx. ${RAIO_MAXIMO_KM} km)` : "Confirmar e Salvar"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};