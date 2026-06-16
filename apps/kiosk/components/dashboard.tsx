"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { defaultChinese } from "@/lib/default-chinese";
import { defaultConfig } from "@/lib/default-config";
import {
  formatZonedTime,
  formatMajorEventDateLabel,
  formatTimerRemaining,
  getCalendarMonth,
  getCardForTime,
  getChineseCardCycleProgress,
  getChineseCharacterToneParts,
  getCurrentRule,
  getNextEvent,
  getNextChineseCardIndex,
  getNextWeekday,
  getPinyinToneParts,
  majorEventDaysUntil,
  pauseTimer,
  resumeTimer,
  getShuffledChineseCards,
  getTimerProgressRatio,
  getTimerRemainingMs,
  getToneColorScheme,
  getUpcomingEventList,
  getZonedDay,
  getZonedMinutes,
  isDarkThemeTime,
  minutesUntilEvent,
  shouldShowNextEventCountdown
} from "@/lib/routine";
import type { ChineseCard, DashboardConfig, ThemeName, TimerState } from "@/lib/types";

type ThemeDefinition = {
  background: string;
  primary: string;
  secondary: string;
  card: string;
  border: string;
  accent: string;
};

type ThemeMode = "alucard" | "dracula";

const timerPresets = [1, 5, 10, 20];
const timerCircleRadius = 148;
const timerCircleCircumference = 2 * Math.PI * timerCircleRadius;

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
  const [timer, setTimer] = useState<TimerState | null>(null);
  const [isTimerOpen, setIsTimerOpen] = useState(false);

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
  const chineseDotColor = themeMode === "dracula" ? "#f8f8f2" : "#2a2d39";
  const displayTime = now ? formatZonedTime(now, timezone) : "--:--";
  const displayDate = now
    ? new Intl.DateTimeFormat("uk-UA", {
        timeZone: timezone,
        weekday: "long",
        day: "numeric",
        month: "long"
      }).format(now)
    : "";
  const chineseShuffleSeed = now
    ? new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).format(now)
    : "kiosk";

  const nextEvent = useMemo(
    () => getNextEvent(config?.events, currentMinutes, currentDay, nextDay),
    [config?.events, currentDay, currentMinutes, nextDay]
  );
  const visibleNextEvent = shouldShowNextEventCountdown(nextEvent) ? nextEvent : null;
  const chineseCards = useMemo(
    () => getShuffledChineseCards(chineseConfig ?? defaultChinese, chineseShuffleSeed),
    [chineseConfig, chineseShuffleSeed]
  );
  const chineseCard = useMemo(
    () => getCardForTime(chineseCards, now?.getTime() ?? 0, chineseManualOffset),
    [chineseCards, chineseManualOffset, now]
  );
  const chineseCardCycleProgress = getChineseCardCycleProgress(now?.getTime() ?? 0);
  const chineseToneParts = chineseCard ? getChineseCharacterToneParts(chineseCard) : [];
  const pinyinToneParts = chineseCard ? getPinyinToneParts(chineseCard) : [];
  const timerNowMs = now?.getTime() ?? Date.now();
  const timerRemainingMs = timer ? getTimerRemainingMs(timer, timerNowMs) : 0;
  const timerProgressRatio = timer ? getTimerProgressRatio(timer, timerNowMs) : 0;
  const timerProgressOffset = timerCircleCircumference * (1 - timerProgressRatio);
  const timerLabel = formatTimerRemaining(timerRemainingMs);
  const isTimerDone = timer !== null && timerRemainingMs === 0;
  const isTimerPaused = timer?.pausedRemainingMs !== undefined && !isTimerDone;
  const timerRingColor = isTimerDone
    ? themeMode === "dracula"
      ? "#50fa7b"
      : "#2b9348"
    : themeMode === "dracula"
      ? "#ff79c6"
      : "#8668b6";
  const upcomingList = getUpcomingEventList(config?.events, currentMinutes, currentDay, 100);
  const majorEvents = config?.majorEvents ?? defaultConfig.majorEvents ?? [];
  const calendarMonth = getCalendarMonth(now ?? new Date(), majorEvents);
  const upcomingMajorEvents = [...majorEvents]
    .filter((event) => event.date >= (now ?? new Date()).toISOString().slice(0, 10))
    .sort((a, b) => a.date.localeCompare(b.date));

  const startTimer = (minutes: number) => {
    setTimer({
      durationMs: minutes * 60_000,
      startedAtMs: Date.now()
    });
    setIsTimerOpen(true);
  };

  const resetTimer = () => {
    setTimer((currentTimer) =>
      currentTimer
        ? {
            durationMs: currentTimer.durationMs,
            startedAtMs: Date.now()
          }
        : currentTimer
    );
  };

  const toggleTimerPaused = () => {
    setTimer((currentTimer) => {
      if (!currentTimer || getTimerRemainingMs(currentTimer, Date.now()) === 0) {
        return currentTimer;
      }

      return currentTimer.pausedRemainingMs === undefined
        ? pauseTimer(currentTimer, Date.now())
        : resumeTimer(currentTimer, Date.now());
    });
  };

  return (
    <main
      className={`min-h-screen w-screen overflow-x-hidden xl:h-screen xl:overflow-hidden ${theme.background} ${theme.primary}`}
    >
      <div className="grid min-h-screen grid-cols-1 gap-4 p-4 sm:gap-5 sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(26rem,0.72fr)] lg:gap-6 lg:p-6 xl:h-full xl:min-h-0 xl:grid-cols-[minmax(0,1fr)_minmax(32rem,0.78fr)] xl:gap-8 xl:p-8">
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
                style={{ fontSize: "clamp(5rem, 10vw, 13rem)" }}
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

          <div className="grid w-full max-w-5xl grid-cols-1 gap-4 pb-2 sm:grid-cols-2 lg:max-w-3xl">
            <div
              className={`w-full rounded-3xl border ${theme.border} ${theme.card} px-5 py-5 shadow-2xl shadow-black/20 sm:px-6 sm:py-6`}
            >
              <button
                type="button"
                className="mb-4 w-full text-left"
                onClick={() => {
                  if (timer) {
                    setIsTimerOpen(true);
                  }
                }}
              >
                <div className={`text-lg font-black uppercase tracking-[0.12em] ${theme.secondary}`}>
                  Таймер
                </div>
                <div className="mt-1 text-4xl font-black tabular-nums sm:text-5xl">
                  {timer ? timerLabel : "00:00"}
                </div>
              </button>
              <div className="grid grid-cols-4 gap-2">
                {timerPresets.map((minutes) => (
                  <button
                    key={minutes}
                    type="button"
                    className={`rounded-2xl border ${theme.border} ${theme.accent} px-2 py-3 text-xl font-black transition active:scale-[0.98]`}
                    onClick={() => startTimer(minutes)}
                  >
                    {minutes}
                  </button>
                ))}
              </div>
            </div>
            {chineseCard ? (
              <button
                type="button"
                className={`relative w-full rounded-3xl border ${theme.border} ${theme.card} px-5 py-5 text-center shadow-2xl shadow-black/25 transition-transform active:scale-[0.98] sm:px-7 sm:py-6`}
                aria-label="Наступне китайське слово"
                onClick={() => {
                  setChineseManualOffset((offset) =>
                    getNextChineseCardIndex(offset, chineseCards.length)
                  );
                }}
              >
                <div
                  aria-hidden="true"
                  className="absolute right-4 top-4 flex items-center gap-1 sm:right-5 sm:top-5"
                >
                  {Array.from({ length: 4 }).map((_, index) => {
                    const remainingDotLevel = (1 - chineseCardCycleProgress) * 4 - index;
                    const dotOpacity = 0.12 + Math.max(0, Math.min(1, remainingDotLevel)) * 0.28;

                    return (
                      <span
                        key={index}
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: chineseDotColor, opacity: dotOpacity } as CSSProperties}
                      />
                    );
                  })}
                </div>
                <div className="space-y-3">
                  <div className="text-6xl font-black leading-none sm:text-7xl">
                    {chineseToneParts.map((part, index) => {
                      const colors = getToneColorScheme(part.tone);

                      return (
                        <span
                          key={`${part.character}-${index}`}
                          style={{ color: colors.light } as CSSProperties}
                        >
                          {part.character}
                        </span>
                      );
                    })}
                  </div>
                  <div className="min-w-0 text-center">
                    <div className="text-2xl font-black sm:text-3xl">
                      {pinyinToneParts.map((part, index) => {
                        const colors = getToneColorScheme(part.tone);

                        return (
                          <span
                            key={`${part.syllable}-${index}`}
                            style={{ color: colors.light } as CSSProperties}
                          >
                            {index > 0 ? " " : ""}
                            {part.syllable}
                          </span>
                        );
                      })}
                    </div>
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
            className={`flex min-h-[28rem] flex-col overflow-hidden rounded-lg border ${theme.border} ${theme.card} p-4 shadow-2xl shadow-black/10 sm:p-5 lg:h-[calc(100vh-3rem)] lg:min-h-0 lg:p-5 xl:h-full xl:p-6`}
          >
            <div className="mb-5 grid shrink-0 grid-cols-2 gap-3">
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
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="mb-5 flex shrink-0 items-start justify-between gap-4">
                  <div>
                    <div className="text-2xl font-black capitalize tracking-normal sm:text-3xl">
                      {calendarMonth.label}
                    </div>
                  </div>
                </div>
                <div className="grid shrink-0 grid-cols-7 gap-1 text-center sm:gap-2">
                  {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"].map((day) => (
                    <div key={day} className={`text-sm font-black sm:text-lg ${theme.secondary}`}>
                      {day}
                    </div>
                  ))}
                  {calendarMonth.cells.map((cell) => (
                    <div
                      key={cell.date}
                      className={`relative aspect-square min-h-0 overflow-hidden rounded-xl border p-1.5 text-left sm:rounded-2xl sm:p-2 ${
                        cell.isToday ? calendarTodayCell : calendarCellBase
                      } ${cell.isCurrentMonth ? "" : "opacity-35"}`}
                    >
                      <div className="text-base font-black sm:text-xl">{cell.day}</div>
                      <div className="absolute bottom-1.5 right-1.5 flex max-w-[70%] flex-row-reverse flex-wrap gap-0.5 overflow-hidden sm:bottom-2 sm:right-2 sm:gap-1">
                        {cell.majorEvents.map((event) => (
                          <span
                            key={`${event.date}-${event.title}`}
                            className="grid h-4 w-4 shrink-0 place-items-center text-sm font-black sm:h-6 sm:w-6 sm:text-lg"
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
                  <div className="max-h-[28vh] space-y-3 overflow-y-auto pr-1 lg:max-h-full">
                    {upcomingMajorEvents.length > 0 ? (
                      upcomingMajorEvents.map((event) => (
                        <div
                          key={`${event.date}-${event.title}`}
                          className={`grid grid-cols-[2.25rem_minmax(0,1fr)] items-center gap-3 rounded-2xl border px-3 py-3 sm:grid-cols-[3rem_minmax(0,1fr)] sm:px-4 ${calendarCellBase}`}
                        >
                          <div className="grid h-9 w-9 place-items-center text-2xl font-black sm:h-10 sm:w-10">
                            {event.icon ?? "★"}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-xl font-black sm:text-2xl">{event.title}</div>
                            <div className={`text-base font-bold sm:text-lg ${theme.secondary}`}>
                              {formatMajorEventDateLabel(
                                event.date,
                                majorEventDaysUntil(event, now ?? new Date())
                              )}
                            </div>
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
              <div className="min-h-0 flex-1 overflow-hidden">
                <div className="h-full max-h-[calc(100vh-12rem)] space-y-4 overflow-y-auto pr-1 lg:max-h-full">
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
                </div>
              </div>
            )}
          </section>
        </aside>
      </div>
      {isTimerOpen && timer ? (
        <div className={`fixed inset-0 z-50 grid place-items-center ${theme.background} ${theme.primary}`}>
          <div className="absolute right-4 top-4 flex gap-2 sm:right-6 sm:top-6">
            <button
              type="button"
              className={`rounded-full border ${theme.border} ${theme.card} px-4 py-2 text-sm font-black sm:text-base`}
              onClick={() => setIsTimerOpen(false)}
            >
              Вийти
            </button>
            <button
              type="button"
              className={`rounded-full border ${theme.border} ${theme.card} px-4 py-2 text-sm font-black sm:text-base`}
              onClick={toggleTimerPaused}
              disabled={isTimerDone}
            >
              {isTimerPaused ? "Далі" : "Стоп"}
            </button>
            <button
              type="button"
              className={`rounded-full border ${theme.border} ${theme.card} px-4 py-2 text-sm font-black sm:text-base`}
              onClick={resetTimer}
            >
              Скинути
            </button>
          </div>
          <div className="relative grid place-items-center">
            <svg
              className="-rotate-90"
              width="min(78vw, 560px)"
              height="min(78vw, 560px)"
              viewBox="0 0 340 340"
              aria-hidden="true"
            >
              <circle
                cx="170"
                cy="170"
                r={timerCircleRadius}
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.16"
                strokeWidth="22"
              />
              <circle
                cx="170"
                cy="170"
                r={timerCircleRadius}
                fill="none"
                stroke={timerRingColor}
                strokeLinecap="round"
                strokeWidth="22"
                strokeDasharray={timerCircleCircumference}
                strokeDashoffset={timerProgressOffset}
              />
            </svg>
            <div className="absolute text-center">
              <div className="text-[clamp(4.5rem,18vw,11rem)] font-black leading-none tabular-nums">
                {timerLabel}
              </div>
              <div className={`mt-4 text-2xl font-black sm:text-4xl ${theme.secondary}`}>
                {isTimerDone ? "Готово!" : isTimerPaused ? "Пауза" : "Таймер"}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
