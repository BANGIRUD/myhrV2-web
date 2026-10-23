type ValueChipsProps = {
  value: string | null | undefined;
  fallback?: string;
  className?: string;
};

function splitValues(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function ValueChips({
  value,
  fallback = "—",
  className = "",
}: ValueChipsProps) {
  const items = splitValues(value).filter((item) => item !== fallback);

  if (items.length === 0) {
    return <span className="text-gray-700 dark:text-gray-300">{fallback}</span>;
  }

  return (
    <ul className={`flex flex-wrap gap-1.5 ${className}`}>
      {items.map((item) => (
        <li
          key={item}
          title={item}
          className="max-w-[16rem] truncate rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:bg-white/[0.06] dark:text-gray-300"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}
