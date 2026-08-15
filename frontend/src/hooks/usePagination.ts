import { useState, useEffect } from 'react';

interface UsePaginationOptions {
  totalItems: number;
  itemsPerPage?: number;
  resetDeps?: unknown[];
}

interface UsePaginationReturn {
  currentPage: number;
  totalPages: number;
  indexOfFirstItem: number;
  indexOfLastItem: number;
  paginationPages: (number | string)[];
  handlePageChange: (page: number) => void;
  setCurrentPage: (page: number) => void;
}

/**
 * Custom hook for smart pagination logic.
 * Shows a sliding 3-page window around the current page.
 *
 * @param totalItems - Total number of items to paginate
 * @param itemsPerPage - Number of items per page (default: 10)
 * @param resetDeps - Dependencies that should reset page back to 1 (e.g. filters)
 */
export const usePagination = ({
  totalItems,
  itemsPerPage = 10,
  resetDeps = [],
}: UsePaginationOptions): UsePaginationReturn => {
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 when filters/search change
  useEffect(() => {
    setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, resetDeps);

  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  // Clamp current page if total pages shrinks (e.g. after filter)
  const safePage = Math.min(currentPage, totalPages);
  const indexOfLastItem = safePage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;

  // Smart sliding window: show 3 pages centered on current page
  const getPaginationPages = (): (number | string)[] => {
    const maxVisible = 3;
    const pages: number[] = [];

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      let start = Math.max(1, safePage - 1);
      const end = Math.min(totalPages, start + maxVisible - 1);
      if (end - start < maxVisible - 1) {
        start = Math.max(1, end - maxVisible + 1);
      }
      for (let i = start; i <= end; i++) pages.push(i);
    }

    return pages;
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return {
    currentPage: safePage,
    totalPages,
    indexOfFirstItem,
    indexOfLastItem,
    paginationPages: getPaginationPages(),
    handlePageChange,
    setCurrentPage,
  };
};
