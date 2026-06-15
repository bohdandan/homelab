"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { defaultConfig } from "@/lib/default-config";
import {
  formatZonedTime,
  getCardForTime,
  getCurrentRule,
  getEventsForDay,
  getNextEvent,
  getNextChineseCardIndex,
  getNextWeekday,
  getRevealedToneColorScheme,
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
  const [isChineseRevealed, setIsChineseRevealed] = useState(false);
  const [chineseManualOffset, setChineseManualOffset] = useState(0);

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
  const chineseCards = config?.chinese ?? defaultConfig.chinese ?? [];
  const chineseCard = useMemo(
    () => getCardForTime(chineseCards, currentMinutes, chineseManualOffset),
    [chineseCards, chineseManualOffset, currentMinutes]
  );
  const toneColors = chineseCard
    ? getRevealedToneColorScheme(chineseCard.pinyin, isChineseRevealed)
    : null;
  const timeline = getEventsForDay(config?.events, currentDay).slice(0, 6);

  useEffect(() => {
    setIsChineseRevealed(false);
  }, [chineseCard?.hanzi]);

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

          <div className="flex flex-col items-start gap-6 pb-2">
            {visibleNextEvent ? (
              <div className={`max-w-[48rem] text-[clamp(2rem,3.8vw,4rem)] font-bold leading-tight ${theme.secondary}`}>
                {`${visibleNextEvent.event.title} ${minutesUntilEvent(visibleNextEvent.minutesUntil)}`}
              </div>
            ) : null}

            {chineseCard ? (
              <div
                className={`mr-auto min-w-[18rem] rounded-3xl border ${theme.border} ${theme.card} px-6 py-5 text-left shadow-2xl shadow-black/10`}
                style={
                  toneColors
                    ? {
                        "--tone-light": toneColors.light,
                        "--tone-night": toneColors.night
                      } as CSSProperties
                    : undefined
                }
              >
                <button
                  type="button"
                  className="block w-full text-left transition-transform active:scale-[0.98]"
                  aria-label={
                    isChineseRevealed
                      ? `${chineseCard.hanzi}, ${chineseCard.pinyin}, ${chineseCard.meaning}`
                      : `Показати підказку для ${chineseCard.hanzi}`
                  }
                  onClick={() => setIsChineseRevealed((revealed) => !revealed)}
                >
                  <div className={`text-7xl font-black leading-none ${isChineseRevealed ? "text-[var(--tone-light)] dark:text-[var(--tone-night)]" : theme.primary}`}>
                    {chineseCard.hanzi}
                  </div>
                </button>
                {isChineseRevealed ? (
                  <div className="mt-3 flex items-end justify-between gap-5">
                    <div>
                      <div className="text-3xl font-black text-[var(--tone-light)] dark:text-[var(--tone-night)]">{chineseCard.pinyin}</div>
                      <div className={`mt-1 text-2xl font-bold ${theme.secondary}`}>
                        {chineseCard.meaning}
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`grid h-14 w-14 place-items-center rounded-full border ${theme.border} ${theme.accent} text-3xl font-black shadow-lg shadow-black/10 transition-transform active:scale-95`}
                      aria-label="Наступне китайське слово"
                      onClick={() => {
                        setChineseManualOffset((offset) =>
                          getNextChineseCardIndex(offset, chineseCards.length)
                        );
                        setIsChineseRevealed(false);
                      }}
                    >
                      →
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>

        <aside className="min-h-0">
          <section
            className={`h-full min-h-0 rounded-lg border ${theme.border} ${theme.card} p-6 shadow-2xl shadow-black/10`}
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
        </aside>
      </div>
    </main>
  );
}
