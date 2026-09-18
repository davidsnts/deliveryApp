import { NextResponse } from 'next/server';
import { calcularValorFrete, gerarUrlRotaOSM, RAIO_MAXIMO_KM } from '@/app/lib/frete';
import { initDb } from '@/app/lib/db';

interface RequestBody {
  origem: string;
  destino: string;
}

interface Coordenadas {
  lat: number;
  lon: number;
}

// Cache em memória para evitar requisições repetidas ao Nominatim/OSRM
interface CacheItem {
  coords?: Coordenadas | null;
  distanciaKm?: number;
  duracaoMin?: number;
  timestamp: number;
}

const geoCache = new Map<string, CacheItem>();
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hora

// Converte CEP, Endereço ou Coordenadas em Lat/Lon usando OpenStreetMap (Nominatim)
async function obterCoordenadas(entrada: string): Promise<Coordenadas | null> {
  if (!entrada || !entrada.trim()) return null;

  const entradaLimpa = entrada.trim();
  const cacheKey = `geo:${entradaLimpa.toLowerCase()}`;
  const emCache = geoCache.get(cacheKey);
  if (emCache && Date.now() - emCache.timestamp < CACHE_TTL_MS && emCache.coords) {
    return emCache.coords;
  }

  // 1. Coordenadas diretas "lat,lon" (ex: vindas do GPS do dispositivo)
  const matchCoords = entradaLimpa.match(/^(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)$/);
  if (matchCoords) {
    const coords: Coordenadas = {
      lat: parseFloat(matchCoords[1]),
      lon: parseFloat(matchCoords[3]),
    };
    geoCache.set(cacheKey, { coords, timestamp: Date.now() });
    return coords;
  }

  // 2. Se for um CEP (ex: "36036-230" ou "36036230"), busca dados no ViaCEP para compor buscas alternativas
  const cepLimpo = entradaLimpa.replace(/\D/g, '');
  let logradouroViaCep = '';
  let bairroViaCep = '';
  let cidadeViaCep = 'Juiz de Fora';
  let ufViaCep = 'MG';

  if (cepLimpo.length === 8) {
    try {
      const resViaCep = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`, {
        signal: AbortSignal.timeout(3500),
      });
      if (resViaCep.ok) {
        const dataViaCep = await resViaCep.json();
        if (!dataViaCep.erro) {
          logradouroViaCep = dataViaCep.logradouro || '';
          bairroViaCep = dataViaCep.bairro || '';
          cidadeViaCep = dataViaCep.localidade || 'Juiz de Fora';
          ufViaCep = dataViaCep.uf || 'MG';
        }
      }
    } catch (err) {
      console.warn('Falha na consulta preliminar ViaCEP:', err);
    }
  }

  // Helper: faz uma busca no Nominatim e retorna as coords ou null
  const buscaNominatim = async (query: string): Promise<Coordenadas | null> => {
    let q = query.trim();
    if (!q.toLowerCase().includes('brasil') && !q.toLowerCase().includes('brazil')) {
      q = `${q}, Brasil`;
    }
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&addressdetails=1`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'MangaDeliveryApp/2.0 (contato@manga.com.br)',
          'Accept-Language': 'pt-BR,pt;q=0.9',
        },
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const dados = await res.json();
        if (dados && dados.length > 0) {
          return { lat: parseFloat(dados[0].lat), lon: parseFloat(dados[0].lon) };
        }
      }
    } catch { /* ignora timeout/erros individuais */ }
    return null;
  };

  // 3. Cascata de estratégias de busca (da mais específica para a mais genérica)
  // Retorna coords + índice da estratégia usada (0=exato, 2+=aproximado)
  try {
    type Estrategia = { query: string; aproximada: boolean };
    const estrategias: Estrategia[] = [];

    if (cepLimpo.length === 8) {
      // 3a. Logradouro + bairro + cidade (mais específico)
      if (logradouroViaCep && bairroViaCep) {
        estrategias.push({ query: `${logradouroViaCep}, ${bairroViaCep}, ${cidadeViaCep} - ${ufViaCep}`, aproximada: false });
      }
      // 3b. Logradouro + cidade (sem bairro)
      if (logradouroViaCep) {
        estrategias.push({ query: `${logradouroViaCep}, ${cidadeViaCep} - ${ufViaCep}`, aproximada: false });
      }
      // 3c. CEP como postcode OSM (posição aproximada do CEP)
      estrategias.push({ query: `${cepLimpo.slice(0, 5)}-${cepLimpo.slice(5)}, ${cidadeViaCep}`, aproximada: true });
      // 3d. Bairro + cidade (posição aproximada do bairro)
      if (bairroViaCep) {
        estrategias.push({ query: `${bairroViaCep}, ${cidadeViaCep} - ${ufViaCep}`, aproximada: true });
      }
      // 3e. Cidade (último recurso)
      estrategias.push({ query: `${cidadeViaCep} - ${ufViaCep}`, aproximada: true });
    } else {
      // Texto livre
      estrategias.push({ query: entradaLimpa, aproximada: false });
      estrategias.push({ query: entradaLimpa.replace(/\b\d+\b/g, '').replace(/\s+/g, ' '), aproximada: true });
    }

    for (const { query: tentativa, aproximada } of estrategias) {
      if (!tentativa.trim()) continue;
      console.log(`[geocode] tentando (${aproximada ? 'aprox' : 'exato'}): "${tentativa}"`);
      const coords = await buscaNominatim(tentativa);
      if (coords) {
        geoCache.set(cacheKey, { coords, timestamp: Date.now() });
        // Retorna coords + flag de posição aproximada (campo extra ignorado onde não usado)
        return Object.assign(coords, { _aproximada: aproximada });
      }
    }

    return null;
  } catch (error) {
    console.error('Erro ao converter endereço em coordenadas (Nominatim):', error);
    return null;
  }
}

// Cálculo de Distância em km pela fórmula de Haversine (linha reta)
function calcularHaversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Raio médio da Terra em km
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// Obter distância viária e tempo real via OSRM (Open Source Routing Machine - OpenStreetMap)
async function obterDistanciaViariaOSRM(
  origem: Coordenadas,
  destino: Coordenadas
): Promise<{ distanciaKm: number; duracaoMin: number; fonte: string }> {
  try {
    // OSRM público: coordenadas no formato {lon},{lat}
    const url = `https://router.project-osrm.org/route/v1/driving/${origem.lon},${origem.lat};${destino.lon},${destino.lat}?overview=false`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'MangaDeliveryApp/2.0 (contato@manga.com.br)',
      },
      signal: AbortSignal.timeout(4000), // Timeout seguro de 4s
    });

    if (res.ok) {
      const data = await res.json();
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const rota = data.routes[0];
        const distanciaKm = Number((rota.distance / 1000).toFixed(2));
        const duracaoMin = Math.max(1, Math.round(rota.duration / 60));

        return {
          distanciaKm,
          duracaoMin,
          fonte: '(OSRM)',
        };
      }
    }
  } catch (err) {
    console.warn('OSRM indisponível ou timeout, utilizando fallback Haversine calibrado:', err);
  }

  // Fallback garantido: Haversine com fator de correção viário urbano médio (~1.25x)
  const haversineKm = calcularHaversine(origem.lat, origem.lon, destino.lat, destino.lon);
  const distanciaAproximada = Number((haversineKm * 1.25).toFixed(2));
  // Velocidade média estimada para entregas urbanas: ~24 km/h
  const duracaoEstimadaMin = Math.max(1, Math.round((distanciaAproximada / 24) * 60));

  return {
    distanciaKm: distanciaAproximada,
    duracaoMin: duracaoEstimadaMin,
    fonte: 'OpenStreetMap (Haversine Calibrado)',
  };
}

export async function POST(request: Request) {
  try {
    const body: RequestBody = await request.json();

    if (!body.origem || !body.destino) {
      return NextResponse.json(
        { error: 'Endereço ou coordenadas de origem e destino são obrigatórios.' },
        { status: 400 }
      );
    }

    const [coordsOrigem, coordsDestino] = await Promise.all([
      obterCoordenadas(body.origem),
      obterCoordenadas(body.destino),
    ]);

    if (!coordsOrigem) {
      return NextResponse.json(
        { error: 'Não foi possível localizar o endereço ou coordenadas do restaurante.' },
        { status: 422 }
      );
    }

    if (!coordsDestino) {
      return NextResponse.json(
        {
          error:
            'Não foi possível encontrar este endereço de entrega no OpenStreetMap. Por favor, verifique a rua, número e bairro.',
        },
        { status: 422 }
      );
    }

    // Calcula a rota viária real via OpenStreetMap (OSRM)
    const { distanciaKm, duracaoMin, fonte } = await obterDistanciaViariaOSRM(
      coordsOrigem,
      coordsDestino
    );

    // Busca configurações de frete ativas no banco de dados
    let deliverySettings = null;
    try {
      const db = await initDb();
      const settingsRes = await db.execute("SELECT * FROM delivery_settings WHERE id = 'default' LIMIT 1");
      if (settingsRes.rows.length > 0) {
        const row = settingsRes.rows[0];
        deliverySettings = {
          raioMaximoKm: Number(row.raio_maximo_km),
          taxaBase: Number(row.taxa_base),
          kmBase: Number(row.km_base),
          valorKmAte5Km: Number(row.valor_km_ate_5km),
          valorKmAte10Km: Number(row.valor_km_ate_10km),
        };
      }
    } catch (errDb) {
      console.warn("Falha ao carregar delivery_settings do banco, usando padrões:", errDb);
    }

    // Calcula o valor do frete e valida raio
    const freteResultado = calcularValorFrete(distanciaKm, duracaoMin, deliverySettings);

    // Link para rota visual no OpenStreetMap
    const rotaOsmUrl = gerarUrlRotaOSM(
      coordsOrigem.lat,
      coordsOrigem.lon,
      coordsDestino.lat,
      coordsDestino.lon
    );

    const posicaoAproximada = !!(coordsDestino as Coordenadas & { _aproximada?: boolean })._aproximada;

    return NextResponse.json({
      origem: body.origem,
      destino: body.destino,
      coordenadas: {
        origem: coordsOrigem,
        destino: coordsDestino,
      },
      distancia_km: freteResultado.distanciaKm,
      distancia_formatada: freteResultado.distanciaFormatada,
      duracao_min: duracaoMin,
      duracao_formatada: `${duracaoMin} min`,
      dentro_do_raio: freteResultado.dentroDoRaio,
      raio_maximo_km: RAIO_MAXIMO_KM,
      valor_frete: freteResultado.valor,
      mensagem: freteResultado.mensagem || null,
      posicao_aproximada: posicaoAproximada,
      fonte_rota: fonte,
      rota_osm_url: rotaOsmUrl,
    });
  } catch (error) {
    console.error('Erro ao calcular frete com OpenStreetMap:', error);
    return NextResponse.json(
      { error: 'Erro interno ao calcular a rota e frete com OpenStreetMap.' },
      { status: 500 }
    );
  }
}