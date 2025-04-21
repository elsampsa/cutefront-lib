import { Signal } from './widget.js';
import { HTTPDataSourceWidget } from './httpdatasourcewidget.js';

class AuthHTTPDataSourceWidget extends HTTPDataSourceWidget { /*//DOC
    Extends HTTPDataSourceWidget to add token-based authentication.
    Automatically adds auth token to all requests.
    Can read token from localStorage or receive it via a slot.
    
    Additional constructor options in ctx.authOptions:
    - tokenStorageKey: localStorage key for the token (default: 'token')
    - tokenTypeStorageKey: localStorage key for token type (default: 'token_type')
    - tokenType: Default token type if not in localStorage (default: 'bearer')
    - autoRefreshToken: Whether to attempt token refresh on 401 (default: false)
    */
    constructor(ctx) {
        // Set auth defaults
        ctx.authOptions = ctx.authOptions || {};
        
        // Call parent constructor
        super(ctx);
    }
    
    createSignals() {
        super.createSignals();
        
        this.signals.token_expired = new Signal(); /*//DOC 
            Emitted when a request fails with 401 Unauthorized. 
            Application can connect this to a login redirect or token refresh mechanism.
        */
    }
    
    createState() {
        if (this.ctx == undefined) {
            return;
        }
        
        super.createState();
        
        // Set token-related options with defaults
        this.authOptions = this.ctx.authOptions || {};
        this.tokenStorageKey = this.authOptions.tokenStorageKey || 'token';
        this.tokenTypeStorageKey = this.authOptions.tokenTypeStorageKey || 'token_type';
        this.defaultTokenType = this.authOptions.tokenType || 'bearer';
        this.autoRefreshToken = this.authOptions.autoRefreshToken || false;
        
        // Initialize token from localStorage if available
        this.token = localStorage.getItem(this.tokenStorageKey) || null;
        this.tokenType = localStorage.getItem(this.tokenTypeStorageKey) || this.defaultTokenType;
        
        this.log(-1, "Auth initialized, token present:", !!this.token);
    }
    
    /**
     * Set authentication token
     * @param {Object} data - Token data
     */
    set_token_slot(data) { /*//DOC
        Set authentication token directly.
        Accepts an object with:
        - token: The auth token
        - tokenType: (Optional) Token type (bearer, basic, etc.)
        - storeInLocalStorage: (Optional) Whether to store in localStorage
        */
        if (!data || !data.token) {
            this.err("set_token_slot: No token provided");
            return;
        }
        
        this.token = data.token;
        
        if (data.tokenType) {
            this.tokenType = data.tokenType;
        }
        
        if (data.storeInLocalStorage !== false) {
            localStorage.setItem(this.tokenStorageKey, this.token);
            localStorage.setItem(this.tokenTypeStorageKey, this.tokenType);
        }
        
        this.log(-1, "Token updated");
    }
    
    /**
     * Clear authentication token
     */
    clear_token_slot() { /*//DOC
        Clears the authentication token from memory and localStorage
        */
        this.token = null;
        localStorage.removeItem(this.tokenStorageKey);
        localStorage.removeItem(this.tokenTypeStorageKey);
        this.log(-1, "Token cleared");
    }
    
    /**
     * Force reload token from localStorage
     */
    refresh_token_from_storage_slot() { /*//DOC
        Reloads the authentication token from localStorage
        */
        this.token = localStorage.getItem(this.tokenStorageKey);
        this.tokenType = localStorage.getItem(this.tokenTypeStorageKey) || this.defaultTokenType;
        this.log(-1, "Token refreshed from storage, token present:", !!this.token);
    }
    
    /**
     * Override getHeaders to include auth token
     */
    getHeaders(additionalHeaders = {}) {
        // Get headers from parent class
        const headers = super.getHeaders(additionalHeaders);
        
        // Add Authorization header if token is available
        if (this.token) {
            headers.set('Authorization', `${this.tokenType} ${this.token}`);
        }
        
        return headers;
    }
    
    /**
     * Override fetchWithErrorHandling to handle auth errors
     */
    async fetchWithErrorHandling(url, options, operation) {
        try {
            const response = await fetch(url, options);
            
            // Handle 401 Unauthorized errors specially
            if (response.status === 401) {
                this.log(0, "Authentication error (401) - token might be expired");
                this.signals.token_expired.emit();
                
                // If auto refresh is enabled, try to refresh the token and retry
                if (this.autoRefreshToken) {
                    this.refresh_token_from_storage_slot();
                    
                    // If token changed, retry the request
                    if (this.token) {
                        this.log(-1, "Retrying request with refreshed token");
                        
                        // Update Authorization header with new token
                        options.headers.set('Authorization', `${this.tokenType} ${this.token}`);
                        
                        // Retry the request
                        try {
                            const retryResponse = await fetch(url, options);
                            
                            if (!retryResponse.ok) {
                                await this.handleApiError(retryResponse, `${operation} (retry)`);
                                return false;
                            }
                            
                            return retryResponse;
                        } catch (error) {
                            this.err(`${operation} (retry): fetch failed with`, error);
                            this.signals.error.emit(`Error ${String(error)} for operation ${operation} (retry)`);
                            return false;
                        }
                    }
                }
                
                // Handle as regular error if we didn't retry or retry failed
                await this.handleApiError(response, operation);
                return false;
            }
            
            // Handle other errors
            if (!response.ok) {
                await this.handleApiError(response, operation);
                return false;
            }
            
            return response;
            
        } catch (error) {
            this.err(`${operation}: fetch failed with`, error);
            this.signals.error.emit(`Error ${String(error)} for operation ${operation}`);
            return false;
        }
    }
}

export { AuthHTTPDataSourceWidget };