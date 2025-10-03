import { DataSource } from './datasource.js';

class HTTPDataSource extends DataSource {
    constructor() {
        super();
        this.baseUrl = '';
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
    
    async makeRequest(endpoint, options = {}) { /*//DOC
        Core method for making HTTP requests with auth and error handling
        Subclasses use this to implement custom endpoints
        :param endpoint: URL path (e.g. '/me' or '/data/123')
        :param options: fetch options (method, body, headers, etc.)
        */
        let requestConfig = {
            url: `${this.baseUrl}${endpoint}`,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };
        
        // Add auth headers if available
        if (this.authModel) {
            Object.assign(requestConfig.headers, this.authModel.getAuthHeaders());
        }
        
        // Let pagination strategy modify the request if available
        if (this.paginationStrategy && options.method === 'GET') {
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
                        let errorData = await this._parseErrorResponse(retryResponse);
                        throw {
                            message: `HTTP ${retryResponse.status}: ${retryResponse.statusText}`,
                            status: retryResponse.status,
                            data: errorData
                        };
                    }
                    
                    return await retryResponse.json();
                }
                throw {
                    message: "Authentication failed",
                    status: 401,
                    data: null
                };
            }
            
            if (!response.ok) {
                let errorData = await this._parseErrorResponse(response);
                throw {
                    message: `HTTP ${response.status}: ${response.statusText}`,
                    status: response.status,
                    data: errorData
                };
            }
            
            const data = await response.json();
            
            // Let pagination strategy parse the response if available
            if (this.paginationStrategy && options.method === 'GET') {
                return this.paginationStrategy.parseResponse(data);
            }
            
            return data;
            
        } catch (error) {
            // If error is already our structured format, pass it through
            if (error && error.status !== undefined) {
                throw error;
            }
            // Otherwise wrap network/other errors
            throw {
                message: `Network error: ${error.message}`,
                status: null,
                data: error
            };
        }
    }
    

    async makeFormRequest(endpoint, verb, formData) {
        let requestConfig = {
            url: `${this.baseUrl}/${endpoint}`,
            headers: {},
            method: verb,
            body: formData
        };
        
        if (this.authModel) {
            Object.assign(requestConfig.headers, this.authModel.getAuthHeaders());
        }
        
        try {
            const response = await fetch(requestConfig.url, requestConfig);
            
            if (!response.ok) {
                let errorData = await this._parseErrorResponse(response);
                throw {
                    message: `HTTP ${response.status}: ${response.statusText}`,
                    status: response.status,
                    data: errorData
                };
            }
            
            return await response.json();
            
        } catch (error) {
            if (error && error.status !== undefined) {
                throw error;
            }
            throw {
                message: `Network error: ${error.message}`,
                status: null,
                data: error
            };
        }
    }

    async _parseErrorResponse(response) {
        try {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            } else {
                return await response.text();
            }
        } catch (e) {
            return null;
        }
    }
    
    _jsonToFormData(datum) { /*//DOC
        Convert JSON object to FormData for multipart/form-data requests
        Helper method for subclasses to send form data
        :param datum: Object to convert
        :returns: FormData instance
        */
        const formData = new FormData();
        
        for (const [key, value] of Object.entries(datum)) {
            if (value === null || value === undefined) {
                continue;
            }
            else if (value instanceof File || value instanceof Blob) {
                formData.append(key, value);
            }
            else if (typeof value === 'object' && !(value instanceof Date)) {
                formData.append(key, JSON.stringify(value));
            }
            else {
                formData.append(key, value.toString());
            }
        }
        
        return formData;
    }
    
    _jsonToURLEncoded(datum) { /*//DOC
        Convert JSON object to URL-encoded string for application/x-www-form-urlencoded requests
        Helper method for subclasses to send URL-encoded data
        :param datum: Object to convert
        :returns: URLSearchParams instance
        */
        const params = new URLSearchParams();
        
        for (const [key, value] of Object.entries(datum)) {
            if (value === null || value === undefined) {
                continue;
            }
            else if (typeof value === 'object' && !(value instanceof Date)) {
                params.append(key, JSON.stringify(value));
            }
            else {
                params.append(key, value.toString());
            }
        }
        
        return params;
    }
    
    async read() { /*//DOC
        Standard READ operation - GET request to read endpoint
        Subclass to customize endpoint, add query params, etc.
        */
        const ENDPOINT = '/data';
        const VERB = 'GET';
        return await this.makeRequest(ENDPOINT, {
            method: VERB
        });
    }
    
    async create(datum) { /*//DOC
        Standard CREATE operation - POST request with JSON body
        Subclass to customize endpoint, use FormData, etc.
        */
        const ENDPOINT = '/data';
        const VERB = 'POST';
        return await this.makeRequest(ENDPOINT, {
            method: VERB,
            body: JSON.stringify(datum)
        });
    }
    
    async update(datum) { /*//DOC
        Standard UPDATE operation - PUT request with ID in URL
        Subclass to use PATCH, put ID in body, use FormData, etc.
        */
        const ENDPOINT = '/data';
        const VERB = 'PUT';
        const id_key = this.uuid_key;
        return await this.makeRequest(`${ENDPOINT}/${datum[id_key]}`, {
            method: VERB,
            body: JSON.stringify(datum)
        });
    }
    
    async delete(id) { /*//DOC
        Standard DELETE operation - DELETE request with ID in URL
        Subclass to use POST, put ID in body, etc.
        */
        const ENDPOINT = '/data';
        const VERB = 'DELETE';
        return await this.makeRequest(`${ENDPOINT}/${id}`, {
            method: VERB
        });
    }
    
    async postForm(datum) { /*//DOC
        Example method: POST data as multipart/form-data
        Shows how to use _jsonToFormData helper in a custom method
        Subclass and customize endpoint as needed
        :param datum: Object to send as form data
        */
        const ENDPOINT = '/form';
        const VERB = 'POST';
        const formData = this._jsonToFormData(datum);
        return await this.makeFormRequest(`${ENDPOINT}`, VERB, formData);    
    }

    async me() { /*//DOC
        Example method: GET current user info from /me endpoint
        Uses auth token to identify the user
        Subclass to customize endpoint
        */
        const ENDPOINT = '/me';
        const VERB = 'GET';
        return await this.makeRequest(ENDPOINT, {
            method: VERB
        });
    }

    async reset(datum) { /*//DOC
        Example method: POST to reset endpoint with email in URL path
        Shows how to construct URLs with data from datum
        Subclass to customize endpoint and verb
        :param datum: Object containing email field
        */
        const ENDPOINT = '/reset';
        const VERB = 'POST';
        return await this.makeRequest(`${ENDPOINT}/${datum.email}`, {
            method: VERB,
            body: JSON.stringify(datum)
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