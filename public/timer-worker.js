const timers = new Map();

self.onmessage = (e) => {
  const { type, id, ms } = e.data;
  if (type === "start") {
    clearInterval(timers.get(id));
    timers.set(id, setInterval(() => self.postMessage({ id }), ms));
  } else if (type === "stop") {
    clearInterval(timers.get(id));
    timers.delete(id);
  }
};