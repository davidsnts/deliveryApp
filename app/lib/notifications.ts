import { Order } from "../types";

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextClass) return null;

  if (!audioCtx || audioCtx.state === "closed") {
    audioCtx = new AudioContextClass();
  }

  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }

  return audioCtx;
}

/**
 * Toca um alerta sonoro forte e alto para novos pedidos.
 * Toca 6 vezes com intervalo de 1 segundo entre cada toque (~6.5s no total).
 */
export function tocarSomNovoPedido(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const agora = ctx.currentTime;

    // Master Gain (Volume Principal Elevado)
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.85, agora); // Volume base alto
    masterGain.connect(ctx.destination);

    // Função auxiliar para tocar um par de notas ("Ding-Dong")
    const tocarPar = (startTime: number) => {
      // Nota 1: Aguda (G5 - ~783.99 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();

      osc1.type = "triangle";
      osc1.frequency.setValueAtTime(783.99, startTime);

      gain1.gain.setValueAtTime(0, startTime);
      gain1.gain.linearRampToValueAtTime(0.8, startTime + 0.03);
      gain1.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

      osc1.connect(gain1);
      gain1.connect(masterGain);

      osc1.start(startTime);
      osc1.stop(startTime + 0.35);

      // Nota 2: Grave (C5 - ~523.25 Hz)
      const toque2Time = startTime + 0.16;

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(523.25, toque2Time);

      gain2.gain.setValueAtTime(0, toque2Time);
      gain2.gain.linearRampToValueAtTime(0.9, toque2Time + 0.04);
      gain2.gain.exponentialRampToValueAtTime(0.001, toque2Time + 0.45);

      osc2.connect(gain2);
      gain2.connect(masterGain);

      osc2.start(toque2Time);
      osc2.stop(toque2Time + 0.45);

      // Sub-oscilador para dar mais corpo ao toque da campainha (E5 - ~659.25 Hz)
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = "square";
      osc3.frequency.setValueAtTime(659.25, toque2Time);

      gain3.gain.setValueAtTime(0, toque2Time);
      gain3.gain.linearRampToValueAtTime(0.15, toque2Time + 0.03);
      gain3.gain.exponentialRampToValueAtTime(0.001, toque2Time + 0.35);

      osc3.connect(gain3);
      gain3.connect(masterGain);

      osc3.start(toque2Time);
      osc3.stop(toque2Time + 0.35);
    };

    // Agenda 6 repetições espaçadas por exatamente 1 segundo (i = 0, 1, 2, 3, 4, 5)
    for (let i = 0; i < 3; i++) {
      tocarPar(agora + i * 0.5);
    }

  } catch (err) {
    console.warn("Não foi possível tocar o alerta sonoro:", err);
  }
}

/**
 * Retorna o status atual da permissão de notificações do navegador
 */
export function obterStatusPermissaoNotificacao(): "granted" | "denied" | "default" | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

/**
 * Solicita ao usuário a permissão de notificações do navegador
 */
export async function pedirPermissaoNotificacao(): Promise<"granted" | "denied" | "default" | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  try {
    const permissao = await Notification.requestPermission();
    // Inicia/resume o audioContext na interação do usuário
    getAudioContext();
    return permissao;
  } catch (err) {
    console.error("Erro ao solicitar permissão de notificação:", err);
    return Notification.permission;
  }
}

/**
 * Dispara uma notificação nativa do navegador para um novo pedido
 */
// export function dispararNotificacaoPedido(order: Order): Notification | null {
//   if (typeof window === "undefined" || !("Notification" in window)) {
//     return null;
//   }

//   if (Notification.permission !== "granted") {
//     return null;
//   }

//   try {
//     const orderCode = order.id.replace("PED-", "#");
//     const totalFormatado = order.total.toFixed(2).replace(".", ",");
//     const cliente = order.customer?.name || "Cliente";
//     const itensQtd = order.items?.length || 1;

//     const notificacao = new Notification("🔔 Novo Pedido Recebido!", {
//       body: `Pedido ${orderCode} - R$ ${totalFormatado}\n${cliente} (${itensQtd} ${itensQtd === 1 ? "item" : "itens"})\nClique para visualizar na comanda.`,
//       icon: "/favicon.ico",
//       tag: `pedido-${order.id}`, // Evita duplicatas do mesmo pedido
//       requireInteraction: true, // Mantém a notificação na tela até o lojista clicar
//     });

//     notificacao.onclick = () => {
//       window.focus();
//       notificacao.close();
//     };

//     return notificacao;
//   } catch (err) {
//     console.warn("Erro ao exibir notificação nativa do navegador:", err);
//     return null;
//   }
// }

// export function dispararNotificacaoPendentes(qtd: number): Notification | null {
//   if (typeof window === "undefined" || !("Notification" in window)) return null;
//   if (Notification.permission !== "granted") return null;

//   try {
//     const n = new Notification("⚠️ Pedidos aguardando!", {
//       body: `Você tem ${qtd} ${qtd === 1 ? "pedido pendente" : "pedidos pendentes"} sem resposta.`,
//       icon: "/favicon.ico",
//       tag: "pedidos-pendentes", // substitui o alerta anterior em vez de empilhar
//       requireInteraction: true,
//     });
//     n.onclick = () => { window.focus(); n.close(); };
//     return n;
//   } catch {
//     return null;
//   }
// }


export function destravarAudio(): void {
  getAudioContext();
}

export async function registrarServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch (err) {
    console.warn("Não foi possível registrar o Service Worker:", err);
    return null;
  }
}

type OpcoesNotificacao = NotificationOptions & { renotify?: boolean; vibrate?: number[] };

async function mostrarNotificacao(titulo: string, opcoes: OpcoesNotificacao): Promise<void> {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  try {
    const reg = await registrarServiceWorker();
    if (reg) {
      await navigator.serviceWorker.ready;
      await reg.showNotification(titulo, opcoes);
      return;
    }
  } catch (err) {
    console.warn("Falha ao notificar via Service Worker, usando fallback:", err);
  }

  try {
    const n = new Notification(titulo, opcoes);
    n.onclick = () => { window.focus(); n.close(); };
  } catch (err) {
    console.warn("Erro ao exibir notificação nativa do navegador:", err);
  }
}

export function dispararNotificacaoPedido(order: Order): void {
  const orderCode = order.id.replace("PED-", "#");
  const totalFormatado = order.total.toFixed(2).replace(".", ",");
  const cliente = order.customer?.name || "Cliente";
  const itensQtd = order.items?.length || 1;

  void mostrarNotificacao("🔔 Novo Pedido Recebido!", {
    body: `Pedido ${orderCode} - R$ ${totalFormatado}\n${cliente} (${itensQtd} ${itensQtd === 1 ? "item" : "itens"})\nClique para visualizar na comanda.`,
    icon: "/favicon.ico",
    tag: `pedido-${order.id}`,
    requireInteraction: true,
    vibrate: [300, 150, 300],
  });
}

export function dispararNotificacaoPendentes(qtd: number): void {
  void mostrarNotificacao("⚠️ Pedidos aguardando!", {
    body: `Você tem ${qtd} ${qtd === 1 ? "pedido pendente" : "pedidos pendentes"} sem resposta.`,
    icon: "/favicon.ico",
    tag: "pedidos-pendentes",
    renotify: true,
    requireInteraction: true,
    vibrate: [300, 150, 300, 150, 300],
  });
}