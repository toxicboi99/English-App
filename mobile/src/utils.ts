export function initials(name: string) {
  const parts = name
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) {
    return "SU";
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export function levelLabel(level: string) {
  return level.charAt(0) + level.slice(1).toLowerCase();
}

export function formatRelativeDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "recently";
  }

  const diff = date.getTime() - Date.now();
  const absSeconds = Math.round(Math.abs(diff) / 1000);

  if (absSeconds < 60) {
    return "just now";
  }

  const divisions = [
    { amount: 60, unit: "second" },
    { amount: 60, unit: "minute" },
    { amount: 24, unit: "hour" },
    { amount: 7, unit: "day" },
    { amount: 4.34524, unit: "week" },
    { amount: 12, unit: "month" },
    { amount: Number.POSITIVE_INFINITY, unit: "year" },
  ];

  let duration = diff / 1000;

  for (const division of divisions) {
    if (Math.abs(duration) < division.amount) {
      const rounded = Math.round(duration);
      const absolute = Math.abs(rounded);

      if (division.unit === "day" && absolute === 1) {
        return rounded < 0 ? "yesterday" : "tomorrow";
      }

      const label = absolute === 1 ? division.unit : `${division.unit}s`;
      return rounded < 0
        ? `${absolute} ${label} ago`
        : `in ${absolute} ${label}`;
    }

    duration /= division.amount;
  }

  return date.toLocaleDateString();
}

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
