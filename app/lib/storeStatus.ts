import { initDb } from "./db";
import { StoreHours, StoreStatus } from "../types";

const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function isWithinSchedule(
  hours: StoreHours[]
): { open: boolean; nextOpen?: string } {
  const now = new Date();
  const brtOffset = -3 * 60;
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const brtMinutes = ((utcMinutes + brtOffset) % (24 * 60) + 24 * 60) % (24 * 60);
  const brtDay = new Date(now.getTime() + brtOffset * 60000).getUTCDay();

  const todaySchedule = hours.find((h) => h.dayOfWeek === brtDay);

  if (todaySchedule?.isOpen) {
    const [openH, openM] = todaySchedule.openTime.split(":").map(Number);
    const [closeH, closeM] = todaySchedule.closeTime.split(":").map(Number);
    const openMin = openH * 60 + openM;
    const closeMin = closeH * 60 + closeM;

    if (brtMinutes >= openMin && brtMinutes < closeMin) {
      return { open: true };
    }
  }

  for (let offset = 0; offset <= 7; offset++) {
    const nextDay = (brtDay + offset) % 7;
    const nextSchedule = hours.find((h) => h.dayOfWeek === nextDay);
    if (!nextSchedule?.isOpen) continue;

    if (offset === 0) {
      const [openH, openM] = nextSchedule.openTime.split(":").map(Number);
      const openMin = openH * 60 + openM;
      if (brtMinutes < openMin) {
        return { open: false, nextOpen: `Hoje às ${nextSchedule.openTime}` };
      }
      continue;
    }

    const label = offset === 1 ? "Amanhã" : DAY_NAMES[nextDay];
    return { open: false, nextOpen: `${label} às ${nextSchedule.openTime}` };
  }

  return { open: false };
}

export async function getStoreStatus(): Promise<StoreStatus> {
  const db = await initDb();

  const [settingsRes, hoursRes] = await Promise.all([
    db.execute("SELECT manual_override FROM delivery_settings WHERE id = 'default' LIMIT 1"),
    db.execute("SELECT * FROM store_hours ORDER BY day_of_week ASC"),
  ]);

  const manualOverride = (settingsRes.rows[0]?.manual_override as string | null) ?? null;

  const hours: StoreHours[] = hoursRes.rows.map((r) => ({
    dayOfWeek: Number(r.day_of_week),
    isOpen: Number(r.is_open) === 1,
    openTime: String(r.open_time),
    closeTime: String(r.close_time),
  }));

  if (manualOverride === "open") {
    return {
      isOpen: true,
      reason: "manual_open",
      message: "Loja aberta manualmente pelo administrador.",
      manualOverride: "open",
    };
  }

  if (manualOverride === "closed") {
    return {
      isOpen: false,
      reason: "manual_closed",
      message: "Loja fechada pelo administrador.",
      manualOverride: "closed",
    };
  }

  if (hours.length === 0) {
    return {
      isOpen: false,
      reason: "no_schedule",
      message: "Horário de funcionamento não configurado.",
      manualOverride: null,
    };
  }

  const { open, nextOpen } = isWithinSchedule(hours);

  return {
    isOpen: open,
    reason: "schedule",
    message: open
      ? "Loja aberta! Fazemos entregas agora."
      : nextOpen
        ? `Loja fechada. Próxima abertura: ${nextOpen}.`
        : "Loja fechada por hoje.",
    nextOpen,
    manualOverride: null,
  };
}
