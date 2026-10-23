import { useEffect, useRef } from "react";
import flatpickr from "flatpickr";
import type { Instance } from "flatpickr/dist/types/instance";
import { CalenderIcon } from "../../icons";

type Props = {
  /** Controlled value, `YYYY-MM-DD` (local date, never UTC). */
  value: string;
  onChange: (isoDate: string) => void;
  id?: string;
  disabled?: boolean;
  /** Latest selectable day, `YYYY-MM-DD`. */
  maxDate?: string;
  placeholder?: string;
  inputClassName?: string;
};

/**
 * Calendar-only date field (flatpickr): the user picks a day from the popup,
 * the text box itself is read-only so day / month / year are never typed by hand.
 * Shows `05 Oct 2026`, emits `2026-10-05`.
 */
export default function CalendarDateField({
  value,
  onChange,
  id,
  disabled = false,
  maxDate,
  placeholder = "Select date",
  inputClassName = "",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<Instance | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!inputRef.current) return;
    const picker = flatpickr(inputRef.current, {
      dateFormat: "Y-m-d",
      altInput: true,
      altFormat: "d M Y",
      altInputClass: `${inputClassName} cursor-pointer`,
      allowInput: false,
      disableMobile: true,
      // Float on body — static calendars get clipped by modal overflow.
      static: false,
      appendTo: document.body,
      monthSelectorType: "static",
      defaultDate: value || undefined,
      maxDate: maxDate || undefined,
      onReady: (_dates, _str, instance) => {
        // Above app modals (z-99999).
        instance.calendarContainer.style.zIndex = "100000";
      },
      onChange: (_dates, dateStr) => {
        if (dateStr) onChangeRef.current(dateStr);
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
    // The instance is created once; value / disabled / maxDate are synced below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const picker = pickerRef.current;
    if (!picker) return;
    if (value) picker.setDate(value, false, "Y-m-d");
    else picker.clear(false);
  }, [value]);

  useEffect(() => {
    pickerRef.current?.set("maxDate", maxDate || undefined);
  }, [maxDate]);

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
