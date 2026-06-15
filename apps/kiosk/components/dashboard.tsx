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
  minutesUntilEvent,
  shouldShowNextEventCountdown
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
    background: "bg-[#d9e8d4]",
    primary: "text-[#26392f]",
    secondary: "text-[#52675a]",
    card: "bg-white/42",
    border: "border-[#8ea996]",
    accent: "bg-[#edf6ea] text-[#26392f]"
  },
  blue: {
    background: "bg-[#d7e5ee]",
    primary: "text-[#253746]",
    secondary: "text-[#526879]",
    card: "bg-white/44",
    border: "border-[#8ca7b8]",
    accent: "bg-[#edf5f9] text-[#253746]"
  },
  orange: {
    background: "bg-[#f1ddc7]",
    primary: "text-[#463526]",
    secondary: "text-[#765f48]",
    card: "bg-white/44",
    border: "border-[#c4a783]",
    accent: "bg-[#fff4e6] text-[#463526]"
  },
  red: {
    background: "bg-[#ead8dc]",
    primary: "text-[#442f36]",
    secondary: "text-[#775d66]",
    card: "bg-white/42",
    border: "border-[#b997a1]",
    accent: "bg-[#f8edf0] text-[#442f36]"
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
  const visibleNextEvent = shouldShowNextEventCountdown(nextEvent) ? nextEvent : null;
  const chineseCard = useMemo(
    () => getCardForTime(config?.chinese, currentMinutes),
    [config?.chinese, currentMinutes]
  );
  const timeline = getEventsForDay(config?.events, currentDay).slice(0, 6);

  return (
    <main
      className={`h-screen w-screen overflow-hidden ${theme.background} ${theme.primary}`}
    >
      <div className="grid h-full grid-cols-[minmax(0,1fr)_minmax(32rem,0.78fr)] gap-8 p-6 md:p-8">
        <section className="flex min-h-0 flex-col justify-between">
          <div>
            <div
              className="max-w-full overflow-hidden whitespace-nowrap font-black leading-none tracking-[-0.06em]"
              style={{ fontSize: "clamp(7rem, 18vw, 14rem)" }}
              suppressHydrationWarning
            >
              {displayTime}
            </div>
          </div>

          <div className="pb-2">
            {visibleNextEvent ? (
              <div className={`text-[clamp(2rem,3.8vw,4rem)] font-bold leading-tight ${theme.secondary}`}>
                {`${visibleNextEvent.event.title} ${minutesUntilEvent(visibleNextEvent.minutesUntil)}`}
              </div>
            ) : null}
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
                    <div className="text-3xl font-bold leading-tight">
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
