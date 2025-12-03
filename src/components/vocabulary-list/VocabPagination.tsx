import { Button } from "@/components/ui/button";

interface VocabPaginationProps {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function VocabPagination({ page, limit, total, onPageChange }: VocabPaginationProps) {
  if (total <= limit) return null;

  return (
    <div className="mt-4 px-6 py-4 bg-white rounded-lg border border-gray-200 flex items-center justify-between">
      <p className="text-sm text-gray-600">
        Showing {page * limit + 1} - {Math.min((page + 1) * limit, total)} of {total}
      </p>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 0}
        >
          Previous
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onPageChange(page + 1)}
          disabled={(page + 1) * limit >= total}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

