"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { defaultChinese } from "@/lib/default-chinese";
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
  isDarkThemeTime,
  majorEventDaysUntil,
  minutesUntilEvent,
  pinyinToTone,
  shouldShowNextEventCountdown
} from "@/lib/routine";
import type { ChineseCard, DashboardConfig, ThemeName } from "@/lib/types";

type ThemeDefinition = {
  background: string;
  primary: string;
  secondary: string;
  card: string;
  border: string;
  accent: string;
};

type ThemeMode = "alucard" | "dracula";

const themePalettes: Record<ThemeMode, Record<ThemeName, ThemeDefinition>> = {
  alucard: {
    green: {
      background: "bg-[#f3eadf]",
      primary: "text-[#1f1f29]",
      secondary: "text-[#64586f]",
      card: "bg-[#fff9f1]/88",
      border: "border-[#a78b72]",
      accent: "bg-[#ead9c7]/80 text-[#1f1f29]"
    },
    blue: {
      background: "bg-[#edf2f5]",
      primary: "text-[#1f1f29]",
      secondary: "text-[#58647a]",
      card: "bg-[#fffdfa]/88",
      border: "border-[#6686a6]",
      accent: "bg-[#d9e6ef]/80 text-[#1f1f29]"
    },
    orange: {
      background: "bg-[#f5ecdf]",
      primary: "text-[#1f1f29]",
      secondary: "text-[#725a44]",
      card: "bg-[#fff9f1]/88",
      border: "border-[#c48a54]",
      accent: "bg-[#efd9bd]/80 text-[#1f1f29]"
    },
    red: {
      background: "bg-[#f5e8e8]",
      primary: "text-[#1f1f29]",
      secondary: "text-[#7a555f]",
      card: "bg-[#fff9f9]/88",
      border: "border-[#b96f7a]",
      accent: "bg-[#efd0d5]/80 text-[#1f1f29]"
    }
  },
  dracula: {
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
  }
};

export function Dashboard() {
  const [config, setConfig] = useState<DashboardConfig | null>(null);
  const [chineseConfig, setChineseConfig] = useState<ChineseCard[] | null>(null);
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
    let cancelled = false;

    fetch("/config/chinese.json", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: ChineseCard[]) => {
        if (!cancelled) {
          setChineseConfig(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setChineseConfig(defaultChinese);
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
  const themeMode: ThemeMode = isDarkThemeTime(currentMinutes) ? "dracula" : "alucard";
  const theme = themePalettes[themeMode][currentRule.theme] ?? themePalettes[themeMode].green;
  const nextEventAccent = themeMode === "dracula" ? "text-[#ffb86c]" : "text-[#9f5d28]";
  const tabActiveToday =
    themeMode === "dracula"
      ? "border-[#8be9fd] bg-[#8be9fd] text-[#282a36]"
      : "border-[#4b9fb3] bg-[#4b9fb3] text-[#fffdfa]";
  const tabActiveCalendar =
    themeMode === "dracula"
      ? "border-[#bd93f9] bg-[#bd93f9] text-[#282a36]"
      : "border-[#8668b6] bg-[#8668b6] text-[#fffdfa]";
  const tabInactive = `border-[#6272a4]/45 bg-[#44475a]/25 ${theme.secondary}`;
  const calendarCellBase =
    themeMode === "dracula"
      ? "border-[#6272a4]/35 bg-[#44475a]/25"
      : "border-[#a78b72]/35 bg-[#fff9f1]/55";
  const calendarTodayCell =
    themeMode === "dracula"
      ? "border-[#ff79c6] bg-[#ff79c6]/15"
      : "border-[#b85d91] bg-[#f4d7e7]/60";
  const listTimeColor = themeMode === "dracula" ? "text-[#8be9fd]" : "text-[#4b7894]";
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
  const chineseCards = chineseConfig ?? defaultChinese;
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
      className={`min-h-screen w-screen overflow-x-hidden lg:h-screen lg:overflow-hidden ${theme.background} ${theme.primary}`}
    >
      <div className="grid min-h-screen grid-cols-1 gap-4 p-4 sm:gap-5 sm:p-5 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_minmax(28rem,0.82fr)] lg:gap-8 lg:p-8 xl:grid-cols-[minmax(0,1fr)_minmax(32rem,0.78fr)]">
        <section className="flex min-h-0 flex-col gap-6 lg:justify-between">
          <div className="space-y-3">
            <button
              type="button"
              className={`text-left text-base font-black uppercase tracking-[0.12em] sm:text-xl lg:text-2xl ${theme.secondary}`}
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
              <div className={`max-w-[48rem] text-[clamp(1.5rem,4vw,4rem)] font-black leading-tight ${nextEventAccent}`}>
                {`${visibleNextEvent.event.title} ${minutesUntilEvent(visibleNextEvent.minutesUntil)}`}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col items-start gap-6 pb-2">
            {chineseCard ? (
              <button
                type="button"
                className={`w-full max-w-sm rounded-3xl border ${theme.border} ${theme.card} px-5 py-5 text-center shadow-2xl shadow-black/25 transition-transform active:scale-[0.98] sm:px-7 sm:py-6 lg:mr-auto lg:min-w-[22rem] lg:w-auto`}
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
                  <div className="text-6xl font-black leading-none text-[var(--tone-light)] sm:text-7xl">
                    {chineseCard.hanzi}
                  </div>
                  <div className="min-w-0 text-center">
                    <div className="text-2xl font-black text-[var(--tone-light)] sm:text-3xl">{chineseCard.pinyin}</div>
                    <div className="mt-1 text-xl font-black sm:text-2xl">
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
            className={`min-h-[28rem] rounded-lg border ${theme.border} ${theme.card} p-4 shadow-2xl shadow-black/10 sm:p-5 lg:h-full lg:min-h-0 lg:p-6`}
          >
            <div className="mb-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                className={`rounded-2xl border px-3 py-2 text-xl font-black transition sm:px-4 sm:py-3 sm:text-2xl ${
                  !isCalendarOpen
                    ? tabActiveToday
                    : tabInactive
                }`}
                onClick={() => setIsCalendarOpen(false)}
              >
                Сьогодні
              </button>
              <button
                type="button"
                className={`rounded-2xl border px-3 py-2 text-xl font-black transition sm:px-4 sm:py-3 sm:text-2xl ${
                  isCalendarOpen
                    ? tabActiveCalendar
                    : tabInactive
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
                    <div className="text-2xl font-black capitalize tracking-normal sm:text-3xl">
                      {calendarMonth.label}
                    </div>
                    {nextMajorEvent && nextMajorEventDays !== null ? (
                      <div className={`mt-2 text-xl font-black sm:text-2xl ${theme.secondary}`}>
                        {nextMajorEvent.icon ? `${nextMajorEvent.icon} ` : ""}
                        {nextMajorEvent.title} через {nextMajorEventDays} дн.
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center sm:gap-2">
                  {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"].map((day) => (
                    <div key={day} className={`text-sm font-black sm:text-lg ${theme.secondary}`}>
                      {day}
                    </div>
                  ))}
                  {calendarMonth.cells.map((cell) => (
                    <div
                      key={cell.date}
                      className={`min-h-12 rounded-xl border p-1.5 text-left sm:min-h-16 sm:rounded-2xl sm:p-2 ${
                        cell.isToday ? calendarTodayCell : calendarCellBase
                      } ${cell.isCurrentMonth ? "" : "opacity-35"}`}
                    >
                      <div className="text-base font-black sm:text-xl">{cell.day}</div>
                      <div className="mt-1 flex flex-wrap gap-0.5 sm:mt-2 sm:gap-1">
                        {cell.majorEvents.map((event) => (
                          <span
                            key={`${event.date}-${event.title}`}
                            className="grid h-5 w-5 place-items-center text-base font-black sm:h-7 sm:w-7 sm:text-xl"
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
                  <div className="mb-3 text-xl font-black sm:text-2xl">Найближчі чекуньки</div>
                  <div className="space-y-3">
                    {upcomingMajorEvents.length > 0 ? (
                      upcomingMajorEvents.map((event) => (
                        <div
                          key={`${event.date}-${event.title}`}
                          className={`grid grid-cols-[2.25rem_minmax(0,1fr)] items-center gap-3 rounded-2xl border px-3 py-3 sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:px-4 ${calendarCellBase}`}
                        >
                          <div className="grid h-9 w-9 place-items-center text-2xl font-black sm:h-10 sm:w-10">
                            {event.icon ?? "★"}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-xl font-black sm:text-2xl">{event.title}</div>
                            <div className={`text-base font-bold sm:text-lg ${theme.secondary}`}>{event.date}</div>
                          </div>
                          <div className={`col-span-2 text-left text-lg font-black sm:col-span-1 sm:text-right sm:text-xl ${nextEventAccent}`}>
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
                    <div className={`text-center text-3xl font-black sm:text-4xl ${theme.secondary}`}>…</div>
                  ) : null}
                  {upcomingList.events.length > 0 ? (
                    upcomingList.events.map((event) => (
                      <div
                        key={`${event.time}-${event.title}`}
                        className="grid grid-cols-[5rem_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[6.5rem_minmax(0,1fr)] sm:gap-4"
                      >
                        <div className={`text-2xl font-black tabular-nums sm:text-3xl ${listTimeColor}`}>
                          {event.time}
                        </div>
                        <div className="text-2xl font-bold leading-tight sm:text-3xl">
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
                    <div className={`text-center text-3xl font-black sm:text-4xl ${theme.secondary}`}>…</div>
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
