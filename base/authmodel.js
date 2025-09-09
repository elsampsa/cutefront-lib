class AuthModel {
    constructor() {
        this.token = null;
        this.refreshToken = null;
    }
    
    set(authInfo) {
        if (authInfo.token !== undefined) this.token = authInfo.token;
        if (authInfo.refreshToken !== undefined) this.refreshToken = authInfo.refreshToken;
    }
    
    getAuthHeaders() {
        return this.token ? { Authorization: `Bearer ${this.token}` } : {};
    }
    
    async handleUnauthorized() {
        if (!this.refreshToken) return false;
        
        try {
            const response = await fetch('/auth/refresh', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: this.refreshToken })
            });
            
            if (response.ok) {
                const data = await response.json();
                this.token = data.token;
                return true;
            }
        } catch (error) {
            console.error('Token refresh failed:', error);
        }
        
        return false;
    }
}

export { AuthModel }
