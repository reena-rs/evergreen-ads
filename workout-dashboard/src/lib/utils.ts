import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toDateKey(date: Date): string {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

export function macroKcal(protein_g: number, carb_g: number, fat_g: number): number {
  return Math.round(protein_g * 4 + carb_g * 4 + fat_g * 9);
}

export const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const WORKOUT_TYPE_OPTIONS = [
  "Push",
  "Pull",
  "Legs",
  "Solidcore",
  "Full Body",
  "Active Recovery",
  "Rest",
];
