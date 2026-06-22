import majorEventsConfig from "@/config/major-events.json";
import routineConfig from "@/config/routine.json";
import type { DashboardConfig, MajorEvent, RoutineConfig } from "@/lib/types";

export const defaultConfig: DashboardConfig = {
  ...(routineConfig as RoutineConfig),
  majorEvents: majorEventsConfig as MajorEvent[]
};
