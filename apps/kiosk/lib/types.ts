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

export type ChineseCard = {
  hanzi: string;
  pinyin: string;
  meaning: string;
};

export type DashboardConfig = {
  timezone: string;
  dayRules: DayRule[];
  events?: TimelineEvent[];
  chinese?: ChineseCard[];
};

export type NextEvent = {
  event: TimelineEvent;
  dayOffset: 0 | 1;
  minutesUntil: number;
};
