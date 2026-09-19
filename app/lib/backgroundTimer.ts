type Callback = () => void;

let worker: Worker | null = null;
const callbacks = new Map<number, Callback>();
let nextId = 1;

function getWorker(): Worker | null {
  if (typeof window === "undefined" || typeof Worker === "undefined") return null;
  if (!worker) {
    try {
      worker = new Worker("/timer-worker.js");
      worker.onmessage = (e: MessageEvent<{ id: number }>) => callbacks.get(e.data.id)?.();
    } catch {
      worker = null;
    }
  }
  return worker;
}

export function criarTimer(cb: Callback, ms: number): () => void {
  const w = getWorker();
  if (!w) {
    const t = setInterval(cb, ms);
    return () => clearInterval(t);
  }
  const id = nextId++;
  callbacks.set(id, cb);
  w.postMessage({ type: "start", id, ms });
  return () => {
    callbacks.delete(id);
    w.postMessage({ type: "stop", id });
  };
}