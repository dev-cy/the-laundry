import { useEffect, useMemo, useState } from "react";

export const LIST_PAGE_SIZE = 10;

function listResetKey(items: unknown[]): string {
  if (items.length === 0) return "0";

  const keyOf = (item: unknown): string => {
    if (item && typeof item === "object") {
      const record = item as Record<string, unknown>;
      if (typeof record.id === "string") return record.id;
      if (typeof record.date === "string") return record.date;
      if (typeof record.staffId === "string") return record.staffId;
      if (typeof record.scheduleId === "string") return record.scheduleId;
      if (typeof record.month === "string" && typeof record.period === "string") {
        return `${record.month}:${record.period}`;
      }
    }
    return JSON.stringify(item);
  };

  return `${items.length}:${keyOf(items[0])}:${keyOf(items[items.length - 1])}`;
}

export function useLoadMore<T>(items: T[], pageSize = LIST_PAGE_SIZE) {
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const resetKey = useMemo(() => listResetKey(items), [items]);

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [resetKey, pageSize]);

  const visible = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);
  const hasMore = visibleCount < items.length;
  const remaining = items.length - visibleCount;

  function loadMore() {
    setVisibleCount((count) => Math.min(count + pageSize, items.length));
  }

  return { visible, hasMore, loadMore, remaining, total: items.length };
}
