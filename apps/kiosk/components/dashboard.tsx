"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { defaultConfig } from "@/lib/default-config";
import {
  formatZonedTime,
  getCalendarMonth,
  getCardForTime,
  getCurrentRule,
  getNextEvent,
  getNextChineseCardIndex,
  getNextMajorEvent,
  getNextWeekday,
  getToneColorScheme,
  getUpcomingEventList,
  getZonedDay,
  getZonedMinutes,
  majorEventDaysUntil,
  minutesUntilEvent,
  pinyinToTone,
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
    background: "bg-[#242631]",
    primary: "text-[#f8f8f2]",
    secondary: "text-[#c7c4d9]",
    card: "bg-[#282a36]/92",
    border: "border-[#6272a4]",
    accent: "bg-[#44475a]/70 text-[#f8f8f2]"
  },
  blue: {
    background: "bg-[#1f2230]",
    primary: "text-[#f8f8f2]",
    secondary: "text-[#c7c4d9]",
    card: "bg-[#282a36]/92",
    border: "border-[#8be9fd]",
    accent: "bg-[#44475a]/70 text-[#f8f8f2]"
  },
  orange: {
    background: "bg-[#2a2430]",
    primary: "text-[#f8f8f2]",
    secondary: "text-[#d7c7b8]",
    card: "bg-[#282a36]/92",
    border: "border-[#ffb86c]",
    accent: "bg-[#44475a]/70 text-[#f8f8f2]"
  },
  red: {
    background: "bg-[#2b2029]",
    primary: "text-[#f8f8f2]",
    secondary: "text-[#d8c2cc]",
    card: "bg-[#282a36]/92",
    border: "border-[#ff5555]",
    accent: "bg-[#44475a]/70 text-[#f8f8f2]"
  }
};

const majorEventColors = {
  cyan: "bg-[#8be9fd] text-[#282a36]",
  green: "bg-[#50fa7b] text-[#282a36]",
  orange: "bg-[#ffb86c] text-[#282a36]",
  pink: "bg-[#ff79c6] text-[#282a36]",
  purple: "bg-[#bd93f9] text-[#282a36]",
  red: "bg-[#ff5555] text-[#282a36]",
  yellow: "bg-[#f1fa8c] text-[#282a36]"
} as const;

export function Dashboard() {
  const [config, setConfig] = useState<DashboardConfig | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const [chineseManualOffset, setChineseManualOffset] = useState(0);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

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
  const displayDate = now
    ? new Intl.DateTimeFormat("uk-UA", {
        timeZone: timezone,
        weekday: "long",
        day: "numeric",
        month: "long"
      }).format(now)
    : "";

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
    ? getToneColorScheme(pinyinToTone(chineseCard.pinyin))
    : null;
  const upcomingList = getUpcomingEventList(config?.events, currentMinutes, currentDay, 6);
  const majorEvents = config?.majorEvents ?? defaultConfig.majorEvents ?? [];
  const calendarMonth = getCalendarMonth(now ?? new Date(), majorEvents);
  const nextMajorEvent = getNextMajorEvent(majorEvents, now ?? new Date());
  const nextMajorEventDays = nextMajorEvent && now ? majorEventDaysUntil(nextMajorEvent, now) : null;
  const upcomingMajorEvents = [...majorEvents]
    .filter((event) => event.date >= (now ?? new Date()).toISOString().slice(0, 10))
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <main
      className={`h-screen w-screen overflow-hidden ${theme.background} ${theme.primary}`}
    >
      <div className="grid h-full grid-cols-[minmax(0,1fr)_minmax(32rem,0.78fr)] gap-8 p-6 md:p-8">
        <section className="flex min-h-0 flex-col justify-between">
          <div className="space-y-3">
            <button
              type="button"
              className={`text-left text-2xl font-black uppercase tracking-[0.12em] ${theme.secondary}`}
              onClick={() => setIsCalendarOpen((open) => !open)}
            >
              {displayDate}
            </button>
            <div>
              <div
                className="max-w-full overflow-hidden whitespace-nowrap font-black leading-none tracking-[-0.06em]"
                style={{ fontSize: "clamp(7rem, 18vw, 14rem)" }}
                suppressHydrationWarning
              >
                {displayTime}
              </div>
            </div>
            {visibleNextEvent ? (
              <div className="max-w-[48rem] text-[clamp(2rem,3.8vw,4rem)] font-black leading-tight text-[#ffb86c]">
                {`${visibleNextEvent.event.title} ${minutesUntilEvent(visibleNextEvent.minutesUntil)}`}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col items-start gap-6 pb-2">
            {chineseCard ? (
              <button
                type="button"
                className={`mr-auto min-w-[22rem] rounded-3xl border ${theme.border} ${theme.card} px-7 py-6 text-center shadow-2xl shadow-black/25 transition-transform active:scale-[0.98]`}
                style={
                  toneColors
                    ? {
                        "--tone-light": toneColors.light,
                        "--tone-night": toneColors.night
                      } as CSSProperties
                    : undefined
                }
                aria-label="Наступне китайське слово"
                onClick={() => {
                  setChineseManualOffset((offset) =>
                    getNextChineseCardIndex(offset, chineseCards.length)
                  );
                }}
              >
                <div className="space-y-3">
                  <div className="text-7xl font-black leading-none text-[var(--tone-light)]">
                    {chineseCard.hanzi}
                  </div>
                  <div className="min-w-0 text-center">
                    <div className="text-3xl font-black text-[var(--tone-light)]">{chineseCard.pinyin}</div>
                    <div className="mt-1 text-2xl font-black text-[#f8f8f2]">
                      {chineseCard.meaning}
                    </div>
                  </div>
                </div>
              </button>
            ) : null}
          </div>
        </section>

        <aside className="min-h-0">
          <section
            className={`h-full min-h-0 rounded-lg border ${theme.border} ${theme.card} p-6 shadow-2xl shadow-black/10`}
          >
            <div className="mb-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                className={`rounded-2xl border px-4 py-3 text-2xl font-black transition ${
                  !isCalendarOpen
                    ? "border-[#8be9fd] bg-[#8be9fd] text-[#282a36]"
                    : `border-[#6272a4]/45 bg-[#44475a]/25 ${theme.secondary}`
                }`}
                onClick={() => setIsCalendarOpen(false)}
              >
                Сьогодні
              </button>
              <button
                type="button"
                className={`rounded-2xl border px-4 py-3 text-2xl font-black transition ${
                  isCalendarOpen
                    ? "border-[#bd93f9] bg-[#bd93f9] text-[#282a36]"
                    : `border-[#6272a4]/45 bg-[#44475a]/25 ${theme.secondary}`
                }`}
                onClick={() => setIsCalendarOpen(true)}
              >
                Чекуньки!
              </button>
            </div>
            {isCalendarOpen ? (
              <div className="flex h-full min-h-0 flex-col">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <div className="text-3xl font-black capitalize tracking-normal">
                      {calendarMonth.label}
                    </div>
                    {nextMajorEvent && nextMajorEventDays !== null ? (
                      <div className={`mt-2 text-2xl font-black ${theme.secondary}`}>
                        {nextMajorEvent.icon ? `${nextMajorEvent.icon} ` : ""}
                        {nextMajorEvent.title} через {nextMajorEventDays} дн.
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-2 text-center">
                  {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"].map((day) => (
                    <div key={day} className={`text-lg font-black ${theme.secondary}`}>
                      {day}
                    </div>
                  ))}
                  {calendarMonth.cells.map((cell) => (
                    <div
                      key={cell.date}
                      className={`min-h-16 rounded-2xl border p-2 text-left ${
                        cell.isToday ? "border-[#ff79c6] bg-[#ff79c6]/15" : "border-[#6272a4]/35 bg-[#44475a]/25"
                      } ${cell.isCurrentMonth ? "" : "opacity-35"}`}
                    >
                      <div className="text-xl font-black">{cell.day}</div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {cell.majorEvents.map((event) => (
                          <span
                            key={`${event.date}-${event.title}`}
                            className={`grid h-7 w-7 place-items-center rounded-full text-base font-black ${
                              majorEventColors[event.color ?? "purple"]
                            }`}
                            title={event.title}
                          >
                            {event.icon ?? "★"}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 min-h-0 flex-1 overflow-hidden">
                  <div className="mb-3 text-2xl font-black">Найближчі чекуньки</div>
                  <div className="space-y-3">
                    {upcomingMajorEvents.length > 0 ? (
                      upcomingMajorEvents.map((event) => (
                        <div
                          key={`${event.date}-${event.title}`}
                          className="grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-[#6272a4]/35 bg-[#44475a]/25 px-4 py-3"
                        >
                          <div className={`grid h-10 w-10 place-items-center rounded-full text-xl font-black ${majorEventColors[event.color ?? "purple"]}`}>
                            {event.icon ?? "★"}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-2xl font-black">{event.title}</div>
                            <div className={`text-lg font-bold ${theme.secondary}`}>{event.date}</div>
                          </div>
                          <div className="text-right text-xl font-black text-[#ffb86c]">
                            через {majorEventDaysUntil(event, now ?? new Date())} дн.
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className={`text-2xl font-bold ${theme.secondary}`}>
                        Немає великих подій
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {upcomingList.hasHiddenPassedEvents ? (
                    <div className={`text-center text-4xl font-black ${theme.secondary}`}>…</div>
                  ) : null}
                  {upcomingList.events.length > 0 ? (
                    upcomingList.events.map((event) => (
                      <div
                        key={`${event.time}-${event.title}`}
                        className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-4"
                      >
                        <div className="text-3xl font-black tabular-nums text-[#8be9fd]">
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
                  {upcomingList.hasHiddenFutureEvents ? (
                    <div className={`text-center text-4xl font-black ${theme.secondary}`}>…</div>
                  ) : null}
                </div>
              </>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}
