import { Button } from "@/components/ui/Button";

export function LoadMoreFooter({
  hasMore,
  remaining,
  onLoadMore,
}: {
  hasMore: boolean;
  remaining: number;
  onLoadMore: () => void;
}) {
  if (!hasMore) return null;

  return (
    <div className="border-t border-brand-blue/10 px-4 py-3 text-center">
      <Button type="button" variant="ghost" size="sm" onClick={onLoadMore}>
        Load more ({remaining} remaining)
      </Button>
    </div>
  );
}
