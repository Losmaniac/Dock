import type { WidgetKind } from "@glass-dock/shared";
import { AiFace, AiPanel } from "./ai";
import { CryptoFace, CryptoPanel } from "./crypto";
import { CurrencyFace, CurrencyPanel } from "./currency";
import { MarketFace, MarketPanel, StocksFace, StocksPanel } from "./markets";
import { CalendarFace, CalendarPanel, WeatherFace, WeatherPanel } from "./online";
import {
  MediaFace,
  MediaPanel,
  TurntableFace,
  TurntablePanel,
  VolumeFace,
  VolumePanel,
} from "./media";
import {
  BatteryFace,
  BatteryPanel,
  StatsFace,
  StatsPanel,
  UptimeFace,
  UptimePanel,
} from "./system";
import {
  DesktopsFace,
  DesktopsPanel,
  NetworkFace,
  NetworkPanel,
  StorageFace,
  StoragePanel,
  TemperatureFace,
  TemperaturePanel,
} from "./hardware";
import { ClockFace, ClockPanel, DateFace, DatePanel } from "./time";
import {
  CountdownFace,
  CountdownPanel,
  PomodoroFace,
  PomodoroPanel,
  StopwatchFace,
  StopwatchPanel,
  WorldClockFace,
  WorldClockPanel,
} from "./timers";
import { CalculatorFace, CalculatorPanel, NoteFace, NotePanel, TodoFace, TodoPanel } from "./tools";
import type { WidgetDef } from "./types";

/** One entry per widget kind: adding a widget means adding a line here and its Face/Panel. */
export const WIDGETS: Record<WidgetKind, WidgetDef> = {
  clock: {
    label: "Clock",
    group: "Time",
    Face: ClockFace,
    Panel: ClockPanel,
    panel: { w: 300, h: 220 },
  },
  date: {
    label: "Calendar",
    group: "Time",
    Face: DateFace,
    Panel: DatePanel,
    panel: { w: 300, h: 260 },
  },
  stopwatch: {
    label: "Stopwatch",
    group: "Time",
    Face: StopwatchFace,
    Panel: StopwatchPanel,
    panel: { w: 300, h: 250 },
  },
  pomodoro: {
    label: "Focus timer",
    group: "Time",
    Face: PomodoroFace,
    Panel: PomodoroPanel,
    panel: { w: 300, h: 240 },
  },
  countdown: {
    label: "Countdown",
    group: "Time",
    Face: CountdownFace,
    Panel: CountdownPanel,
    panel: { w: 300, h: 190 },
    keyboard: true,
  },
  "world-clock": {
    label: "World clock",
    group: "Time",
    Face: WorldClockFace,
    Panel: WorldClockPanel,
    panel: { w: 320, h: 260 },
    keyboard: true,
  },
  calculator: {
    label: "Calculator",
    group: "Tools",
    Face: CalculatorFace,
    Panel: CalculatorPanel,
    panel: { w: 300, h: 330 },
    keyboard: true,
  },
  todo: {
    label: "To-do list",
    group: "Tools",
    Face: TodoFace,
    Panel: TodoPanel,
    panel: { w: 320, h: 340 },
    keyboard: true,
  },
  note: {
    label: "Sticky note",
    group: "Tools",
    Face: NoteFace,
    Panel: NotePanel,
    panel: { w: 320, h: 260 },
    keyboard: true,
  },
  "system-stats": {
    label: "System load",
    group: "System",
    Face: StatsFace,
    Panel: StatsPanel,
    panel: { w: 300, h: 250 },
  },
  battery: {
    label: "Battery",
    group: "System",
    Face: BatteryFace,
    Panel: BatteryPanel,
    panel: { w: 280, h: 170 },
  },
  uptime: {
    label: "Uptime",
    group: "System",
    Face: UptimeFace,
    Panel: UptimePanel,
    panel: { w: 300, h: 160 },
  },
  storage: {
    label: "Storage",
    group: "System",
    Face: StorageFace,
    Panel: StoragePanel,
    panel: { w: 320, h: 250 },
  },
  network: {
    label: "Network",
    group: "System",
    Face: NetworkFace,
    Panel: NetworkPanel,
    panel: { w: 320, h: 220 },
  },
  temperature: {
    label: "Temperature",
    group: "System",
    Face: TemperatureFace,
    Panel: TemperaturePanel,
    panel: { w: 320, h: 200 },
  },
  "virtual-desktops": {
    label: "Virtual desktops",
    group: "System",
    Face: DesktopsFace,
    Panel: DesktopsPanel,
    panel: { w: 300, h: 210 },
  },
  volume: {
    label: "Volume",
    group: "Media",
    Face: VolumeFace,
    Panel: VolumePanel,
    panel: { w: 300, h: 220 },
  },
  "now-playing": {
    label: "Now playing",
    group: "Media",
    Face: MediaFace,
    Panel: MediaPanel,
    panel: { w: 300, h: 190 },
  },
  turntable: {
    label: "Record player",
    group: "Media",
    Face: TurntableFace,
    Panel: TurntablePanel,
    panel: { w: 320, h: 420 },
  },
  calendar: {
    label: "Next event",
    group: "Online",
    Face: CalendarFace,
    Panel: CalendarPanel,
    panel: { w: 300, h: 190 },
  },
  stocks: {
    label: "Stocks",
    group: "Online",
    Face: StocksFace,
    Panel: StocksPanel,
    panel: { w: 320, h: 270 },
    keyboard: true,
  },
  crypto: {
    label: "Crypto",
    group: "Online",
    Face: CryptoFace,
    Panel: CryptoPanel,
    panel: { w: 340, h: 270 },
    keyboard: true,
  },
  currency: {
    label: "Currency",
    group: "Online",
    Face: CurrencyFace,
    Panel: CurrencyPanel,
    panel: { w: 320, h: 270 },
    keyboard: true,
  },
  market: {
    label: "Market overview",
    group: "Online",
    Face: MarketFace,
    Panel: MarketPanel,
    panel: { w: 320, h: 270 },
    keyboard: true,
  },
  "ai-providers": {
    label: "AI providers",
    group: "Online",
    Face: AiFace,
    Panel: AiPanel,
    panel: { w: 280, h: 280 },
  },
  weather: {
    label: "Weather",
    group: "Online",
    Face: WeatherFace,
    Panel: WeatherPanel,
    panel: { w: 300, h: 190 },
  },
};

export const WIDGET_GROUPS = ["Time", "Tools", "System", "Media", "Online"] as const;
