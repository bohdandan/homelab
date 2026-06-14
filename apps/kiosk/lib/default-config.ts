import type { DashboardConfig } from "@/lib/types";

export const defaultConfig: DashboardConfig = {
  timezone: "Europe/London",
  dayRules: [
    {
      from: "10:00",
      to: "11:00",
      theme: "blue",
      label: "ЗАВДАННЯ",
      instruction: "Зробити домашнє завдання на наступний тиждень",
      days: ["saturday", "sunday"]
    },
    {
      from: "16:00",
      to: "17:00",
      theme: "blue",
      label: "ПЕРЕВІРКА",
      instruction: "Перевірити домашнє завдання на наступний тиждень",
      days: ["saturday", "sunday"]
    },
    {
      from: "06:30",
      to: "18:00",
      theme: "green",
      label: "ДЕНЬ",
      instruction: "Гарного дня",
      days: ["monday", "tuesday", "wednesday", "thursday", "friday"]
    },
    {
      from: "06:30",
      to: "20:00",
      theme: "green",
      label: "ВИХІДНИЙ",
      instruction: "Вихідний день",
      days: ["saturday", "sunday"]
    },
    {
      from: "18:00",
      to: "19:00",
      theme: "orange",
      label: "ВЕЧЕРЯ",
      instruction: "Час вечеряти",
      days: ["monday", "tuesday", "wednesday", "thursday", "friday"]
    },
    {
      from: "19:00",
      to: "20:00",
      theme: "blue",
      label: "ДУШ",
      instruction: "Час приймати душ",
      days: ["monday", "tuesday", "wednesday", "thursday", "friday"]
    },
    {
      from: "20:00",
      to: "06:30",
      theme: "red",
      label: "СОН",
      instruction: "Час спати"
    }
  ],
  events: [
    {
      time: "18:00",
      title: "Вечеря",
      days: ["monday", "tuesday", "wednesday", "thursday", "friday"]
    },
    {
      time: "19:00",
      title: "Душ",
      days: ["monday", "tuesday", "wednesday", "thursday", "friday"]
    },
    {
      time: "10:00",
      title: "Домашнє завдання на наступний тиждень",
      days: ["saturday", "sunday"]
    },
    {
      time: "16:00",
      title: "Перевірити домашнє завдання",
      days: ["saturday", "sunday"]
    },
    { time: "20:00", title: "Час спати" }
  ]
};
