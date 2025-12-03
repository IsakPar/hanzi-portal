import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MetadataPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function MetadataPagination({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
}: MetadataPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-4 flex items-center justify-between">
      <div className="text-sm text-gray-500">
        Showing {page * pageSize + 1} - {Math.min((page + 1) * pageSize, total)} of {total}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(0)}
          disabled={page === 0}
        >
          <ChevronLeft className="w-4 h-4" />
          <ChevronLeft className="w-4 h-4 -ml-2" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(0, page - 1))}
          disabled={page === 0}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm text-gray-600 px-2">
          Page {page + 1} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
          disabled={page >= totalPages - 1}
        >
          <ArrowRight className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages - 1)}
          disabled={page >= totalPages - 1}
        >
          <ChevronRight className="w-4 h-4" />
          <ChevronRight className="w-4 h-4 -ml-2" />
        </Button>
      </div>
    </div>
  );
}

