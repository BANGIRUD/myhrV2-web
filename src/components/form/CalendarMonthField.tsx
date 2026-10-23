import { useEffect, useRef } from "react";
import flatpickr from "flatpickr";
import monthSelectPlugin from "flatpickr/dist/plugins/monthSelect";
import type { Instance } from "flatpickr/dist/types/instance";
import "flatpickr/dist/plugins/monthSelect/style.css";
import { CalenderIcon } from "../../icons";

type Props = {
  /** Controlled value, `YYYY-MM`. */
  value: string;
  onChange: (yearMonth: string) => void;
  id?: string;
  disabled?: boolean;
  placeholder?: string;
  inputClassName?: string;
};

/**
 * Calendar-only month field (flatpickr monthSelect): pick month/year from the
 * popup; the text box is read-only so values are never typed by hand.
 * Shows `October 2026`, emits `2026-10`.
 */
export default function CalendarMonthField({
  value,
  onChange,
  id,
  disabled = false,
  placeholder = "Select month",
  inputClassName = "",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<Instance | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!inputRef.current) return;
    const defaultDate = value ? `${value}-01` : undefined;
    const picker = flatpickr(inputRef.current, {
      allowInput: false,
      disableMobile: true,
      // Float on body — static calendars get clipped by modal overflow.
      static: false,
      appendTo: document.body,
      altInput: true,
      altInputClass: `${inputClassName} cursor-pointer`,
      defaultDate,
      plugins: [
        monthSelectPlugin({
          shorthand: false,
          dateFormat: "Y-m",
          altFormat: "F Y",
        }),
      ],
      onReady: (_dates, _str, instance) => {
        // Above app modals (z-99999).
        instance.calendarContainer.style.zIndex = "100000";
      },
      onChange: (_dates, dateStr) => {
        // Plugin emits YYYY-MM (dateFormat); fall back to first-of-month slice.
        const next =
          dateStr && /^\d{4}-\d{2}$/.test(dateStr)
            ? dateStr
            : dateStr && /^\d{4}-\d{2}/.test(dateStr)
              ? dateStr.slice(0, 7)
              : "";
        if (next) onChangeRef.current(next);
      },
    }) as Instance;
    pickerRef.current = picker;
    if (picker.altInput) {
      picker.altInput.placeholder = placeholder;
      picker.altInput.disabled = disabled;
    }
    return () => {
      picker.destroy();
      pickerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const picker = pickerRef.current;
    if (!picker) return;
    if (value) picker.setDate(`${value}-01`, false);
    else picker.clear(false);
  }, [value]);

  useEffect(() => {
    const alt = pickerRef.current?.altInput;
    if (alt) alt.disabled = disabled;
  }, [disabled]);

  return (
    <div className="relative">
      <input ref={inputRef} id={id} type="text" className="hidden" readOnly />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
        <CalenderIcon className="size-5" />
      </span>
    </div>
  );
}
