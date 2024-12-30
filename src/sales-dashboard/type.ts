
export const DIARY = "diary";
export type DiaryType = typeof DIARY;
export const WEEKLY = "weekly";
export type WeeklyType = typeof WEEKLY;
export const MONTHLY = "monthly";
export type MonthlyType = typeof MONTHLY;
export const ANNUAL = "annual";
export type AnnualType = typeof ANNUAL;

export type PeriodType = DiaryType | WeeklyType | MonthlyType | AnnualType;

export type Sales = {
  finalAmount: number
};


