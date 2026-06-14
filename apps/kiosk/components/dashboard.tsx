"use client";

import { useEffect, useMemo, useState } from "react";
import { defaultConfig } from "@/lib/default-config";
import {
  formatZonedTime,
  getCardForTime,
  getCurrentRule,
  getEventsForDay,
  getNextEvent,
  getNextWeekday,
  getZonedDay,
  getZonedMinutes,
  minutesUntilEvent
} from "@/lib/routine";
import type { DashboardConfig, ThemeName } from "@/lib/types";

type ThemeDefinition = {
  background: string;
  primary: string;
  secondary: string;
  card: string;
  border: string;
  accent: string;
};

const themes: Record<ThemeName, ThemeDefinition> = {
  green: {
    background: "bg-emerald-700",
    primary: "text-white",
    secondary: "text-emerald-50",
    card: "bg-white/16",
    border: "border-white/22",
    accent: "bg-emerald-100 text-emerald-950"
  },
  blue: {
    background: "bg-sky-800",
    primary: "text-white",
    secondary: "text-sky-50",
    card: "bg-white/15",
    border: "border-white/22",
    accent: "bg-sky-100 text-sky-950"
  },
  orange: {
    background: "bg-amber-600",
    primary: "text-white",
    secondary: "text-amber-50",
    card: "bg-white/18",
    border: "border-white/26",
    accent: "bg-amber-100 text-amber-950"
  },
  red: {
    background: "bg-rose-900",
    primary: "text-white",
    secondary: "text-rose-50",
    card: "bg-white/14",
    border: "border-white/22",
    accent: "bg-rose-100 text-rose-950"
  }
};

export function Dashboard() {
  const [config, setConfig] = useState<DashboardConfig | null>(null);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/config/dashboard.json", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: DashboardConfig) => {
        if (!cancelled) {
          setConfig(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setConfig(defaultConfig);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 1000);

    return () => window.clearInterval(timer);
  }, []);

  const timezone = config?.timezone ?? "Europe/London";
  const currentMinutes = now ? getZonedMinutes(now, timezone) : 0;
  const currentDay = now ? getZonedDay(now, timezone) : "monday";
  const nextDay = getNextWeekday(currentDay);
  const currentRule =
    config && now
      ? getCurrentRule(config.dayRules, currentMinutes, currentDay) ?? defaultConfig.dayRules[0]
      : defaultConfig.dayRules[0];
  const theme = themes[currentRule.theme] ?? themes.green;
  const displayTime = now ? formatZonedTime(now, timezone) : "--:--";

  const nextEvent = useMemo(
    () => getNextEvent(config?.events, currentMinutes, currentDay, nextDay),
    [config?.events, currentDay, currentMinutes, nextDay]
  );
  const chineseCard = useMemo(
    () => getCardForTime(config?.chinese, currentMinutes),
    [config?.chinese, currentMinutes]
  );
  const timeline = getEventsForDay(config?.events, currentDay).slice(0, 6);

  return (
    <main
      className={`h-screen w-screen overflow-hidden ${theme.background} ${theme.primary}`}
    >
      <div className="grid h-full grid-cols-[minmax(0,1.4fr)_minmax(300px,0.8fr)] gap-6 p-6 md:p-8">
        <section className="flex min-h-0 flex-col justify-between">
          <div>
            <div
              className="font-black leading-none tracking-normal"
              style={{ fontSize: "clamp(8rem, 21vw, 17rem)" }}
              suppressHydrationWarning
            >
              {displayTime}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-4">
              <div
                className={`rounded px-5 py-3 text-4xl font-black tracking-normal ${theme.accent}`}
              >
                {currentRule.label}
              </div>
              <div className={`text-3xl font-bold ${theme.secondary}`}>
                Час у Лондоні
              </div>
            </div>
          </div>

          <div className="pb-2">
            <div className="text-[clamp(2.8rem,6vw,5.8rem)] font-black leading-tight tracking-normal">
              {currentRule.instruction}
            </div>
            <div className={`mt-6 text-[clamp(2rem,3.8vw,4rem)] font-bold ${theme.secondary}`}>
              {nextEvent
                ? `${nextEvent.event.title}${
                    nextEvent.dayOffset === 1 ? " завтра" : ""
                  } ${minutesUntilEvent(nextEvent.minutesUntil)}`
                : "Сьогодні більше нічого"}
            </div>
          </div>
        </section>

        <aside className="grid min-h-0 grid-rows-[1fr_auto] gap-6">
          <section
            className={`min-h-0 rounded-lg border ${theme.border} ${theme.card} p-6 shadow-2xl shadow-black/10`}
          >
            <div className="mb-5 text-3xl font-black tracking-normal">
              Сьогодні
            </div>
            <div className="space-y-4">
              {timeline.length > 0 ? (
                timeline.map((event) => (
                  <div
                    key={`${event.time}-${event.title}`}
                    className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-4"
                  >
                    <div className="text-3xl font-black tabular-nums">
                      {event.time}
                    </div>
                    <div className="truncate text-4xl font-bold">
                      {event.title}
                    </div>
                  </div>
                ))
              ) : (
                <div className={`text-3xl font-bold ${theme.secondary}`}>
                  Немає запланованих справ
                </div>
              )}
            </div>
          </section>

          {chineseCard ? (
            <section
              key={chineseCard.hanzi}
              className={`rounded-lg border ${theme.border} ${theme.card} p-6 shadow-2xl shadow-black/10 transition-opacity duration-700`}
            >
              <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-6">
                <div className="text-8xl font-black leading-none">
                  {chineseCard.hanzi}
                </div>
                <div>
                  <div className="text-4xl font-black">{chineseCard.pinyin}</div>
                  <div className={`mt-2 text-3xl font-bold ${theme.secondary}`}>
                    {chineseCard.meaning}
                  </div>
                </div>
              </div>
            </section>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
