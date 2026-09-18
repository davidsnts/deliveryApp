/**
 * Módulo de Regras de Frete e Integração OpenStreetMap
 * Raio máximo de atendimento: 10 km
 */

// Raio máximo de atendimento configurável via .env (padrão: 10 km)
export const RAIO_MAXIMO_KM =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_FRETE_RAIO_MAXIMO_KM
    ? Number(process.env.NEXT_PUBLIC_FRETE_RAIO_MAXIMO_KM)
    : 10;

// Taxa base mínima inicial (padrão: R$ 5,00)
export const TAXA_BASE_MINIMA =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_FRETE_TAXA_BASE
    ? Number(process.env.NEXT_PUBLIC_FRETE_TAXA_BASE)
    : 5.0;

// Distância coberta pela taxa base (padrão: 2.0 km)
export const KM_BASE_MINIMO =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_FRETE_KM_BASE
    ? Number(process.env.NEXT_PUBLIC_FRETE_KM_BASE)
    : 2.0;

// Valor por km adicional entre o km base e 5 km (padrão: R$ 1,50/km)
export const TAXA_KM_ADICIONAL_ATE_5KM =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_FRETE_VALOR_KM_ATE_5KM
    ? Number(process.env.NEXT_PUBLIC_FRETE_VALOR_KM_ATE_5KM)
    : 1.5;

// Valor por km adicional acima de 5 km até o limite de entrega (padrão: R$ 1,80/km)
export const TAXA_KM_ADICIONAL_ATE_10KM =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_FRETE_VALOR_KM_ATE_10KM
    ? Number(process.env.NEXT_PUBLIC_FRETE_VALOR_KM_ATE_10KM)
    : 1.8;

import { DeliverySettings } from "../types";

export interface CalculoFreteResultado {
  valor: number;
  dentroDoRaio: boolean;
  distanciaKm: number;
  distanciaFormatada: string;
  tempoEstimadoMinutos?: number;
  mensagem?: string;
}

/**
 * Calcula o valor do frete com base na distância viária em km
 * @param distanciaKm Distância em quilômetros
 * @param tempoMinutos Tempo estimado de rota em minutos (opcional)
 * @param settings Configurações de frete salvas no banco (opcional)
 */
export function calcularValorFrete(
  distanciaKm: number,
  tempoMinutos?: number,
  settings?: Partial<DeliverySettings> | null
): CalculoFreteResultado {
  const km = Math.max(0, Number(distanciaKm) || 0);
  const distanciaFormatada = `${km.toFixed(1).replace(".", ",")} km`;

  const raioMaximo = settings?.raioMaximoKm ?? RAIO_MAXIMO_KM;
  const taxaBase = settings?.taxaBase ?? TAXA_BASE_MINIMA;
  const kmBase = settings?.kmBase ?? KM_BASE_MINIMO;
  const valorKmAte5 = settings?.valorKmAte5Km ?? TAXA_KM_ADICIONAL_ATE_5KM;
  const valorKmAteMax = settings?.valorKmAte10Km ?? TAXA_KM_ADICIONAL_ATE_10KM;

  if (km > raioMaximo) {
    return {
      valor: 0,
      dentroDoRaio: false,
      distanciaKm: km,
      distanciaFormatada,
      tempoEstimadoMinutos: tempoMinutos,
      mensagem: `Endereço a ${distanciaFormatada}. Nosso raio máximo de entrega é de ${raioMaximo} km.`,
    };
  }

  let valor = taxaBase;

  if (km <= kmBase) {
    valor = taxaBase;
  } else if (km <= 5.0) {
    valor = taxaBase + (km - kmBase) * valorKmAte5;
  } else {
    // Acima de 5km até o raio máximo
    const baseAte5 = taxaBase + Math.max(0, 5.0 - kmBase) * valorKmAte5;
    valor = baseAte5 + (km - 5.0) * valorKmAteMax;
  }

  const valorFinal = Number((Math.round(valor * 100) / 100).toFixed(2));

  return {
    valor: valorFinal,
    dentroDoRaio: true,
    distanciaKm: km,
    distanciaFormatada,
    tempoEstimadoMinutos: tempoMinutos,
  };
}

/**
 * Gera URL de visualização de rota no OpenStreetMap para o entregador / lojista
 */
export function gerarUrlRotaOSM(
  latOrig: number | string,
  lonOrig: number | string,
  latDest: number | string,
  lonDest: number | string
): string {
  return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${latOrig}%2C${lonOrig}%3B${latDest}%2C${lonDest}`;
}
