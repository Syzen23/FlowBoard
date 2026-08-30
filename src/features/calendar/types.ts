export * from "@/src/types/index";

export type DayCalendarContext = {
  selectedDate: Date;
  tasks: import("@/src/types/index").Task[];
};
