import React, { useState, useEffect } from "react";
import { Button } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// تابع تبدیل تاریخ میلادی به شمسی
function gregorianToJalali(gDate: Date): { year: number; month: number; day: number } {
  const g_d = gDate.getDate();
  const g_m = gDate.getMonth() + 1;
  const g_y = gDate.getFullYear();
  
  const g_days_in_month = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  
  if (g_y % 4 === 0 && (g_y % 100 !== 0 || g_y % 400 === 0)) {
    g_days_in_month[1] = 29;
  }
  
  let gy = g_y - 1600;
  let gm = g_m - 1;
  let gd = g_d - 1;

  let g_day_no = 365 * gy + Math.floor((gy + 3) / 4) - Math.floor((gy + 99) / 100) + Math.floor((gy + 399) / 400);

  for (let i = 0; i < gm; ++i) {
    g_day_no += g_days_in_month[i];
  }
  g_day_no += gd;

  let j_day_no = g_day_no - 79;

  let j_np = Math.floor(j_day_no / 12053);
  j_day_no = j_day_no % 12053;

  let j_y = 979 + 33 * j_np + 4 * Math.floor(j_day_no / 1461);

  j_day_no %= 1461;

  if (j_day_no >= 366) {
    j_y += Math.floor((j_day_no - 1) / 365);
    j_day_no = (j_day_no - 1) % 365;
  }

  const j_days_in_month = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];
  
  let j_m = 0;
  while (j_m < 12 && j_day_no >= j_days_in_month[j_m]) {
    j_day_no -= j_days_in_month[j_m];
    j_m++;
  }
  j_m++;
  let j_d = j_day_no + 1;

  return { year: j_y, month: j_m, day: j_d };
}

// تابع تبدیل تاریخ شمسی به میلادی
function jalaliToGregorian(j_y: number, j_m: number, j_d: number): Date {
  const j_days_in_month = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];
  
  let jy = j_y - 979;
  let jm = j_m - 1;
  let jd = j_d - 1;

  let j_day_no = 365 * jy + Math.floor(jy / 33) * 8 + Math.floor(((jy % 33) + 3) / 4);
  for (let i = 0; i < jm; ++i) {
    j_day_no += j_days_in_month[i];
  }

  j_day_no += jd;

  let g_day_no = j_day_no + 79;

  let gy = 1600 + 400 * Math.floor(g_day_no / 146097);
  g_day_no = g_day_no % 146097;

  let leap = true;
  if (g_day_no >= 36525) {
    g_day_no--;
    gy += 100 * Math.floor(g_day_no / 36524);
    g_day_no = g_day_no % 36524;

    if (g_day_no >= 365) {
      g_day_no++;
    }
    leap = false;
  }

  gy += 4 * Math.floor(g_day_no / 1461);
  g_day_no %= 1461;

  if (g_day_no >= 366) {
    leap = false;
    g_day_no--;
    gy += Math.floor(g_day_no / 365);
    g_day_no = g_day_no % 365;
  }

  const g_days_in_month = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  
  let gm = 0;
  while (gm < 12 && g_day_no >= g_days_in_month[gm]) {
    g_day_no -= g_days_in_month[gm];
    gm++;
  }
  
  return new Date(gy, gm, g_day_no + 1);
}

const monthNames = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"
];

const weekDays = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

interface PersianCalendarProps {
  value?: Date | string | null;
  onSelect?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function PersianCalendar({
  value,
  onSelect,
  placeholder = "انتخاب تاریخ",
  disabled = false,
  className
}: PersianCalendarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [displayMonth, setDisplayMonth] = useState<{ year: number; month: number }>(() => {
    if (value) {
      const date = typeof value === 'string' ? new Date(value) : value;
      if (!isNaN(date.getTime())) {
        const jalali = gregorianToJalali(date);
        return { year: jalali.year, month: jalali.month };
      }
    }
    const today = gregorianToJalali(new Date());
    return { year: today.year, month: today.month };
  });

  useEffect(() => {
    if (value) {
      const date = typeof value === 'string' ? new Date(value) : value;
      if (!isNaN(date.getTime())) {
        setSelectedDate(date);
      }
    }
  }, [value]);

  const formatDate = (date: Date | null): string => {
    if (!date) return placeholder;
    const jalali = gregorianToJalali(date);
    return `${jalali.year}/${jalali.month.toString().padStart(2, '0')}/${jalali.day.toString().padStart(2, '0')}`;
  };

  const getDaysInMonth = (year: number, month: number): number => {
    const daysInMonth = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];
    return daysInMonth[month - 1];
  };

  const getFirstDayOfMonth = (year: number, month: number): number => {
    const gregorian = jalaliToGregorian(year, month, 1);
    return (gregorian.getDay() + 1) % 7; // تبدیل از یکشنبه=0 به شنبه=0
  };

  const handleDateSelect = (day: number) => {
    const gregorian = jalaliToGregorian(displayMonth.year, displayMonth.month, day);
    setSelectedDate(gregorian);
    if (onSelect) {
      onSelect(gregorian);
    }
    setIsOpen(false);
  };

  const handlePrevMonth = () => {
    if (displayMonth.month === 1) {
      setDisplayMonth({ year: displayMonth.year - 1, month: 12 });
    } else {
      setDisplayMonth({ ...displayMonth, month: displayMonth.month - 1 });
    }
  };

  const handleNextMonth = () => {
    if (displayMonth.month === 12) {
      setDisplayMonth({ year: displayMonth.year + 1, month: 1 });
    } else {
      setDisplayMonth({ ...displayMonth, month: displayMonth.month + 1 });
    }
  };

  const handleToday = () => {
    const today = new Date();
    setSelectedDate(today);
    const jalali = gregorianToJalali(today);
    setDisplayMonth({ year: jalali.year, month: jalali.month });
    if (onSelect) {
      onSelect(today);
    }
    setIsOpen(false);
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(displayMonth.year, displayMonth.month);
    const firstDay = getFirstDayOfMonth(displayMonth.year, displayMonth.month);
    const days: JSX.Element[] = [];

    // خانه‌های خالی قبل از اولین روز ماه
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2" />);
    }

    // روزهای ماه
    const selectedJalali = selectedDate ? gregorianToJalali(selectedDate) : null;
    
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected = selectedJalali?.year === displayMonth.year && 
                        selectedJalali?.month === displayMonth.month && 
                        selectedJalali?.day === day;
      
      const monthName = monthNames[displayMonth.month - 1];
      const ariaLabel = `${day} ${monthName} ${displayMonth.year}`;

      days.push(
        <button
          key={day}
          type="button"
          onClick={() => handleDateSelect(day)}
          aria-label={ariaLabel}
          className={cn(
            "p-2 text-center rounded-md hover:bg-accent transition-colors text-sm",
            isSelected && "bg-primary text-primary-foreground hover:bg-primary"
          )}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  // تولید لیست سال‌ها (100 سال گذشته تا 10 سال آینده)
  const generateYears = () => {
    const currentYear = gregorianToJalali(new Date()).year;
    const years: number[] = [];
    for (let i = currentYear - 100; i <= currentYear + 10; i++) {
      years.push(i);
    }
    return years;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-right font-normal",
            !selectedDate && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="ml-2 h-4 w-4" />
          {formatDate(selectedDate)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" dir="rtl">
        <div className="p-3">
          {/* هدر تقویم - سلکت سال و ماه */}
          <div className="flex items-center gap-2 mb-4">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleNextMonth}
              className="h-8 w-8"
              aria-label="ماه بعد"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            
            <div className="flex gap-1 flex-1">
              <Select
                value={displayMonth.month.toString()}
                onValueChange={(value) => setDisplayMonth({ ...displayMonth, month: parseInt(value) })}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthNames.map((month, index) => (
                    <SelectItem key={index + 1} value={(index + 1).toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={displayMonth.year.toString()}
                onValueChange={(value) => setDisplayMonth({ ...displayMonth, year: parseInt(value) })}
              >
                <SelectTrigger className="h-8 text-sm w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {generateYears().map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handlePrevMonth}
              className="h-8 w-8"
              aria-label="ماه قبل"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>

          {/* روزهای هفته */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((day) => (
              <div key={day} className="p-2 text-center text-xs font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>

          {/* روزهای ماه */}
          <div className="grid grid-cols-7 gap-1">
            {renderCalendar()}
          </div>

          {/* دکمه امروز */}
          <div className="mt-3 border-t pt-3">
             <Button
               variant="ghost"
               className="w-full text-sm h-8"
               onClick={handleToday}
             >
               امروز: {formatDate(new Date())}
             </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default PersianCalendar;
