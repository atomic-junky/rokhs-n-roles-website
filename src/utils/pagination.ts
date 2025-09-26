export function getCurrentPage(searchParams: URLSearchParams): number {
    const pageParam = searchParams.get("page");
    const pageNumber = parseInt(pageParam || "1", 10);
    
    return isNaN(pageNumber) || pageNumber < 1 ? 1 : pageNumber;
}

export function calculatePagination(currentPage: number, totalItems: number, itemsPerPage: number) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const offset = (currentPage - 1) * itemsPerPage;
    
    return {
        totalPages,
        offset,
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1,
        firstPageUrl: "?page=1",
        previousPageUrl: `?page=${Math.max(1, currentPage - 1)}`,
        nextPageUrl: `?page=${Math.min(totalPages, currentPage + 1)}`,
        lastPageUrl: `?page=${totalPages}`
    };
}