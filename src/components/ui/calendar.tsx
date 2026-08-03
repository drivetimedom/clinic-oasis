import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-4",
        month: "space-y-4",
        caption: "flex justify-center pt-0.5 pb-1 relative items-center",
        caption_label: "text-[13.5px] font-medium tracking-[-0.01em] capitalize",
        nav: "flex items-center gap-1",
        nav_button:
          "h-7 w-7 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] transition-colors duration-[180ms]",
        nav_button_previous: "absolute left-0",
        nav_button_next: "absolute right-0",
        table: "w-full border-collapse",
        head_row: "flex",
        head_cell:
          "text-subtle w-9 font-medium text-[10.5px] uppercase tracking-[0.08em] pb-1",
        row: "flex w-full mt-1",
        cell: "h-9 w-9 text-center text-[13px] p-0 relative focus-within:relative focus-within:z-20",
        day: "h-9 w-9 p-0 font-normal rounded-[10px] inline-flex items-center justify-center text-foreground/80 hover:bg-foreground/[0.06] hover:text-foreground transition-colors duration-[180ms] aria-selected:opacity-100 num",
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground font-medium hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today:
          "text-primary font-semibold after:absolute after:bottom-1 after:left-1/2 after:h-[3px] after:w-[3px] after:-translate-x-1/2 after:rounded-full after:bg-primary aria-selected:text-primary-foreground aria-selected:after:bg-primary-foreground",
        day_outside: "day-outside text-subtle/50 aria-selected:text-subtle",
        day_disabled: "text-subtle/40 hover:bg-transparent",
        day_range_middle: "aria-selected:bg-foreground/[0.06] aria-selected:text-foreground rounded-none",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
