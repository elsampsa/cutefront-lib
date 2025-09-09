import { DataSource } from './datasource.js';

class HTTPDataSource extends DataSource {
    constructor() {
        super();
        this.baseUrl = '';
        this.endpoints = {
            read: '/data',
            create: '/data',
            update: '/data',
            delete: '/data'
        };
        this.authModel = null;
        this.paginationStrategy = null;
    }
    
    setBaseUrl(url) {
        this.baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
        return this;
    }
    
    setAuthModel(authModel) {
        this.authModel = authModel;
        return this;
    }
    
    setPaginationStrategy(strategy) {
        this.paginationStrategy = strategy;
        return this;
    }
    
    setEndpoints(endpoints) {
        this.endpoints = { ...this.endpoints, ...endpoints };
        return this;
    }
    
    async makeRequest(endpoint, options = {}) {
        let requestConfig = {
            url: `${this.baseUrl}${endpoint}`,
            headers: {
                'Content-Type': 'application/json'
            },
            ...options
        };
        
        // Add auth headers if available
        if (this.authModel) {
            Object.assign(requestConfig.headers, this.authModel.getAuthHeaders());
        }
        
        // Let pagination strategy modify the request if available
        if (this.paginationStrategy) {
            requestConfig = this.paginationStrategy.modifyRequest(requestConfig);
        }
        
        try {
            const response = await fetch(requestConfig.url, {
                method: requestConfig.method || 'GET',
                headers: requestConfig.headers,
                body: requestConfig.body
            });
            
            // Handle auth errors
            if (response.status === 401 && this.authModel) {
                const refreshed = await this.authModel.handleUnauthorized();
                if (refreshed) {
                    // Retry with new token
                    Object.assign(requestConfig.headers, this.authModel.getAuthHeaders());
                    const retryResponse = await fetch(requestConfig.url, {
                        method: requestConfig.method || 'GET',
                        headers: requestConfig.headers,
                        body: requestConfig.body
                    });
                    
                    if (!retryResponse.ok) {
                        return `HTTP ${retryResponse.status}: ${retryResponse.statusText}`;
                    }
                    
                    return await retryResponse.json();
                }
                return "Authentication failed";
            }
            
            if (!response.ok) {
                return `HTTP ${response.status}: ${response.statusText}`;
            }
            
            const data = await response.json();
            
            // Let pagination strategy parse the response if available
            if (this.paginationStrategy) {
                return this.paginationStrategy.parseResponse(data);
            }
            
            return data;
            
        } catch (error) {
            return `Network error: ${error.message}`;
        }
    }
    
    async read() {
        return await this.makeRequest(this.endpoints.read);
    }
    
    async create(datum) {
        return await this.makeRequest(this.endpoints.create, {
            method: 'POST',
            body: JSON.stringify(datum)
        });
    }
    
    async update(datum) {
        const endpoint = `${this.endpoints.update}/${datum.id}`;
        return await this.makeRequest(endpoint, {
            method: 'PUT',
            body: JSON.stringify(datum)
        });
    }
    
    async delete(id) {
        const endpoint = `${this.endpoints.delete}/${id}`;
        return await this.makeRequest(endpoint, {
            method: 'DELETE'
        });
    }
    
    setPage(paginationInfo) {
        if (this.paginationStrategy) {
            this.paginationStrategy.set(paginationInfo);
        }
    }
    
    setAuth(authInfo) {
        if (this.authModel) {
            this.authModel.set(authInfo);
        }
    }
}

export { HTTPDataSource }
