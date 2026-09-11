"use client";

import React, { useState, useRef, useEffect, useId } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";

export interface DatePickerProps {
  id?: string;
  label?: string;
  value?: string; // Format: "YYYY-MM-DD"
  onChange?: (date: string) => void;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  hint?: string;
  placeholder?: string;
  locale?: string;
  className?: string;
}

const MONTH_NAMES_TR = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

const MONTH_NAMES_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAY_NAMES_TR = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pa"];
const WEEKDAY_NAMES_EN = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export function DatePicker({
  id,
  label,
  value = "",
  onChange,
  required = false,
  disabled = false,
  error,
  hint,
  placeholder = "gg.aa.yyyy",
  locale = "tr",
  className,
}: DatePickerProps) {
  const isTr = locale === "tr";
  const generatedId = useId();
  const inputId = id || generatedId;
  const containerRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);

  // Parse current value or use default view (if user is entering birthdate, default to 18 years ago, e.g. 2005)
  const today = new Date();
  const currentYear = today.getFullYear();
  const defaultYear = currentYear - 18;

  const parsedDate = value ? new Date(value) : null;
  const isValidDate = parsedDate && !isNaN(parsedDate.getTime());

  const [viewYear, setViewYear] = useState<number>(() => {
    if (isValidDate) return parsedDate.getFullYear();
    return defaultYear;
  });

  const [viewMonth, setViewMonth] = useState<number>(() => {
    if (isValidDate) return parsedDate.getMonth();
    return 0; // January
  });

  // Keep view in sync when value changes externally
  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [value]);

  // Close on outside click or Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Generate days matrix for viewMonth and viewYear
  // Monday is index 0 in our layout (ISO 8601 week)
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  // JavaScript getDay() returns 0 for Sunday, 1 for Monday, etc.
  let startWeekday = firstDayOfMonth.getDay() - 1;
  if (startWeekday === -1) startWeekday = 6; // Sunday becomes 6

  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

  // Calendar cells: 42 cells (6 rows x 7 cols)
  const cells: Array<{
    day: number;
    monthOffset: number; // -1 = prev month, 0 = current, 1 = next
    dateString: string;
  }> = [];

  // Previous month trailing days
  for (let i = startWeekday - 1; i >= 0; i--) {
    const day = prevMonthDays - i;
    const m = viewMonth === 0 ? 11 : viewMonth - 1;
    const y = viewMonth === 0 ? viewYear - 1 : viewYear;
    const dateString = `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({ day, monthOffset: -1, dateString });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateString = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, monthOffset: 0, dateString });
  }

  // Next month leading days to fill up to 35 or 42 cells
  const remaining = cells.length <= 35 ? 35 - cells.length : 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    const m = viewMonth === 11 ? 0 : viewMonth + 1;
    const y = viewMonth === 11 ? viewYear + 1 : viewYear;
    const dateString = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, monthOffset: 1, dateString });
  }

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  const handleSelectDate = (dateStr: string) => {
    onChange?.(dateStr);
    setIsOpen(false);
  };

  const handleClear = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    onChange?.("");
  };

  const handleSetToday = () => {
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    onChange?.(todayStr);
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setIsOpen(false);
  };

  // Format displayed string
  const displayString = isValidDate
    ? `${String(parsedDate.getDate()).padStart(2, "0")}.${String(parsedDate.getMonth() + 1).padStart(2, "0")}.${parsedDate.getFullYear()}`
    : "";

  const monthNames = isTr ? MONTH_NAMES_TR : MONTH_NAMES_EN;
  const weekdayNames = isTr ? WEEKDAY_NAMES_TR : WEEKDAY_NAMES_EN;

  // Year options for birthdate / general pickers (from currentYear to 1920)
  const years: number[] = [];
  for (let y = currentYear; y >= 1920; y--) {
    years.push(y);
  }

  return (
    <div ref={containerRef} className="relative w-full flex flex-col gap-1.5">
      {label && (
        <div className="min-h-[22px] flex items-center justify-between gap-2">
          <label
            htmlFor={inputId}
            className="text-xs font-medium text-[var(--color-text-secondary)] select-none flex items-center gap-1.5"
          >
            <span>{label}</span>
            {required && (
              <span className="text-red-400/80 text-[11px] font-normal" aria-hidden="true">
                *
              </span>
            )}
          </label>
        </div>
      )}

      {/* Trigger Field */}
      <div className="relative flex items-center group">
        <button
          type="button"
          id={inputId}
          disabled={disabled}
          onClick={() => setIsOpen((prev) => !prev)}
          className={twMerge(
            clsx(
              "w-full h-12 text-sm rounded-xl font-normal transition-all duration-200 text-left flex items-center select-none",
              "bg-[var(--bg-surface)] text-[var(--text-primary)]",
              "border border-[var(--border-subtle)] hover:border-[var(--border-strong)]",
              "shadow-sm",
              "pl-10 pr-4",
              isOpen && "border-blue-500 ring-4 ring-blue-500/15 bg-[var(--bg-surface)]",
              error ? "border-red-500 ring-2 ring-red-500/20" : "",
              disabled && "opacity-50 cursor-not-allowed",
              className
            )
          )}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
        >
          {displayString ? (
            <span className="font-medium tracking-wide">{displayString}</span>
          ) : (
            <span className="text-[var(--text-muted)] font-normal">{placeholder}</span>
          )}
        </button>

        {/* Left Interactive Calendar Icon */}
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => setIsOpen((prev) => !prev)}
          className="absolute left-3.5 z-10 flex items-center text-[var(--text-muted)] group-hover:text-blue-500 transition-colors cursor-pointer"
          aria-label={isTr ? "Takvimi Aç" : "Open Calendar"}
        >
          <CalendarIcon className="h-4 w-4" aria-hidden="true" />
        </button>

        {/* Clear Button if has value */}
        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3.5 z-10 flex h-5 w-5 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            aria-label={isTr ? "Tarihi Temizle" : "Clear Date"}
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Hidden input to hold native value for forms */}
      <input type="hidden" name={inputId} value={value} />

      {/* Custom Theme-Aware Calendar Popover */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={isTr ? "Tarih Seçici" : "Date Picker"}
          className="absolute top-full left-0 mt-2 z-50 w-72 sm:w-80 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-150 select-none overflow-hidden"
        >
          {/* Subtle Ambient Glow */}
          <div className="pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full bg-blue-500/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-indigo-500/10 blur-2xl" />

          {/* Popover Header: Month & Year Selectors + Nav Chevrons */}
          <div className="relative z-10 flex items-center justify-between gap-1.5 pb-3 mb-2.5 border-b border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:border-[var(--border-strong)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
              aria-label={isTr ? "Önceki Ay" : "Previous Month"}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>

            {/* Month and Year Quick Selectors */}
            <div className="flex items-center gap-1.5">
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="h-8 px-2 rounded-lg text-xs font-semibold bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors cursor-pointer"
              >
                {monthNames.map((m, idx) => (
                  <option
                    key={m}
                    value={idx}
                    className="bg-[var(--bg-surface)] text-[var(--text-primary)]"
                  >
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className="h-8 px-2 rounded-lg text-xs font-semibold bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors cursor-pointer"
              >
                {years.map((y) => (
                  <option
                    key={y}
                    value={y}
                    className="bg-[var(--bg-surface)] text-[var(--text-primary)]"
                  >
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:border-[var(--border-strong)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
              aria-label={isTr ? "Sonraki Ay" : "Next Month"}
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* Weekdays Row */}
          <div className="relative z-10 grid grid-cols-7 gap-1 text-center mb-1">
            {weekdayNames.map((wd) => (
              <div key={wd} className="text-[11px] font-semibold text-[var(--text-muted)] py-1">
                {wd}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="relative z-10 grid grid-cols-7 gap-1">
            {cells.map(({ day, monthOffset, dateString }, idx) => {
              const isSelected = value === dateString;
              const isToday =
                today.getFullYear() === viewYear &&
                today.getMonth() === viewMonth &&
                today.getDate() === day &&
                monthOffset === 0;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectDate(dateString)}
                  className={twMerge(
                    clsx(
                      "h-8 w-8 text-xs font-medium rounded-lg flex items-center justify-center transition-all duration-150 cursor-pointer",
                      monthOffset !== 0 && "text-[var(--text-muted)] opacity-35 hover:opacity-80",
                      monthOffset === 0 &&
                        !isSelected &&
                        "text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] hover:text-blue-500",
                      isToday &&
                        !isSelected &&
                        "border border-blue-500/60 text-blue-500 font-semibold bg-blue-500/10",
                      isSelected &&
                        "bg-blue-600 text-white font-bold shadow-md shadow-blue-500/30 scale-105"
                    )
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Footer Quick Actions */}
          <div className="relative z-10 mt-3 pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={handleClear}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] font-medium px-2 py-1 rounded-md hover:bg-[var(--bg-elevated)] cursor-pointer transition-colors"
            >
              {isTr ? "Temizle" : "Clear"}
            </button>
            <button
              type="button"
              onClick={handleSetToday}
              className="font-medium text-blue-500 px-2.5 py-1 rounded-md bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 cursor-pointer transition-colors"
            >
              {isTr ? "Bugün" : "Today"}
            </button>
          </div>
        </div>
      )}

      {hint && !error && <p className="text-xs text-[var(--color-text-tertiary)]">{hint}</p>}
      {error && (
        <p className="text-xs text-[var(--color-danger)] font-medium" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
