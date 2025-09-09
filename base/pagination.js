class PaginationStrategy {
    constructor() {
        this.currentPage = 1;
        this.pageSize = 10;
        this.totalItems = 0;
        this.disabled = false;
    }
    
    set(paginationInfo) {
        if (!paginationInfo) {
            this.disabled = true; // Flag to not modify requests
            return;
        }
        this.disabled = false;
        if (paginationInfo.currentPage !== undefined) this.currentPage = paginationInfo.currentPage;
        if (paginationInfo.pageSize !== undefined) this.pageSize = paginationInfo.pageSize;
        if (paginationInfo.totalItems !== undefined) this.totalItems = paginationInfo.totalItems;
    }
    
    modifyRequest(requestConfig) {
        // Base implementation - subclasses should override
        if (this.disabled) {
           return requestConfig; // Don't modify if disabled
        }
        // modify..
        return requestConfig;
    }
    
    parseResponse(response) {
        // Base implementation - subclasses should override
        return response;
    }
    
    getPaginationInfo() {
        return {
            currentPage: this.currentPage,
            totalPages: Math.ceil(this.totalItems / this.pageSize),
            pageSize: this.pageSize,
            totalItems: this.totalItems
        };
    }
}

// Simple query parameter pagination strategy
class QueryParamPagination extends PaginationStrategy {
    modifyRequest(requestConfig) {
        if (this.disabled) {
            return requestConfig; // Don't modify if disabled
        }
        const url = new URL(requestConfig.url);
        url.searchParams.set('page', this.currentPage);
        url.searchParams.set('pageSize', this.pageSize);
        
        return {
            ...requestConfig,
            url: url.toString()
        };
    }
    
    parseResponse(response) {
        // Assume response has { data: [], totalItems: 100 }
        if (response.totalItems !== undefined) {
            this.totalItems = response.totalItems;
        }
        return response.data || response.items || response;
    }
}

export { PaginationStrategy, QueryParamPagination}
