export type ThemeName = "green" | "blue" | "orange" | "red";
export type Weekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type DayRule = {
  from: string;
  to: string;
  theme: ThemeName;
  label: string;
  instruction: string;
  days?: Weekday[];
};

export type TimelineEvent = {
  time: string;
  title: string;
  days?: Weekday[];
};

export type MajorEvent = {
  date: string;
  title: string;
  icon?: string;
};

export type UpcomingEventList = {
  events: TimelineEvent[];
};

export type CalendarCell = {
  date: string;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  majorEvents: MajorEvent[];
};

export type CalendarMonth = {
  label: string;
  cells: CalendarCell[];
};

export type ChineseCard = {
  hanzi: string;
  pinyin: string;
  meaning: string;
};

export type MandarinTone = 1 | 2 | 3 | 4 | 5;

export type ChineseCharacterTonePart = {
  character: string;
  tone: MandarinTone;
};

export type PinyinTonePart = {
  syllable: string;
  tone: MandarinTone;
};

export type ToneColorScheme = {
  light: string;
  night: string;
};

export type TimerState = {
  durationMs: number;
  startedAtMs: number;
  pausedRemainingMs?: number;
};

export type DashboardConfig = {
  timezone: string;
  dayRules: DayRule[];
  events?: TimelineEvent[];
  majorEvents?: MajorEvent[];
};

export type NextEvent = {
  event: TimelineEvent;
  dayOffset: 0 | 1;
  minutesUntil: number;
};
