// mockserver.js - Simple fetch override for testing HTTP data sources

let mockData = [];
let authToken = null;
let networkDelay = 100; // Simulate network delay

export function setupMockServer(config = {}) {
    const originalFetch = window.fetch;
    
    // Configure mock server
    if (config.data) mockData = [...config.data];
    if (config.delay !== undefined) networkDelay = config.delay;
    
    window.fetch = async function(url, options = {}) {
        // Simulate network delay
        if (networkDelay > 0) {
            await new Promise(resolve => setTimeout(resolve, networkDelay));
        }
        
        const method = options.method || 'GET';
        const headers = options.headers || {};
        const body = options.body ? JSON.parse(options.body) : null;
        
        console.log(`[MOCK] ${method} ${url}`, body ? body : '');
        
        // Check auth if Authorization header is present
        const authHeader = headers.Authorization;
        if (authHeader) {
            const token = authHeader.replace('Bearer ', '');
            if (token !== 'valid-token' && token !== authToken) {
                return createResponse(401, { error: 'Unauthorized' });
            }
        }
        
        // Parse URL to get endpoint and ID
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        const searchParams = urlObj.searchParams;
        
        // Handle different endpoints
        if (pathname === '/data' || pathname.startsWith('/data')) {
            return handleDataEndpoint(method, pathname, searchParams, body);
        }
        
        if (pathname === '/auth/refresh') {
            return handleAuthRefresh(body);
        }
        
        // Default 404
        return createResponse(404, { error: 'Not found' });
    };
    
    return {
        restore: () => {
            window.fetch = originalFetch;
        },
        setAuthToken: (token) => {
            authToken = token;
        },
        setNetworkDelay: (delay) => {
            networkDelay = delay;
        },
        resetData: () => {
            mockData = [
            ];
        },
        getData: () => [...mockData],
        simulateError: (errorCode = 500) => {
            const originalHandler = window.fetch;
            window.fetch = () => createResponse(errorCode, { error: 'Simulated error' });
            setTimeout(() => { window.fetch = originalHandler; }, 1000);
        }
    };
}

function handleDataEndpoint(method, pathname, searchParams, body) {
    switch (method) {
        case 'GET':
            return handleRead(searchParams);
        case 'POST':
            return handleCreate(body);
        case 'PUT':
            return handleUpdate(pathname, body);
        case 'DELETE':
            return handleDelete(pathname);
        default:
            return createResponse(405, { error: 'Method not allowed' });
    }
}

function handleRead(searchParams) {
    let data = [...mockData];
    let totalItems = data.length;
    
    // Handle pagination via query params
    const page = parseInt(searchParams.get('page'));
    const pageSize = parseInt(searchParams.get('pageSize'));
    
    if (page && pageSize) {
        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        data = data.slice(start, end);
        
        return createResponse(200, {
            data: data,
            totalItems: totalItems,
            currentPage: page,
            pageSize: pageSize
        });
    }
    
    // Return all data if no pagination
    return createResponse(200, data);
}

function handleCreate(body) {
    if (!body) {
        return createResponse(400, { error: 'Missing body' });
    }
    
    // Generate new ID
    const maxId = Math.max(0, ...mockData.map(item => parseInt(item.id) || 0));
    const newItem = {
        ...body,
        id: String(maxId + 1)
    };
    
    mockData.push(newItem);
    return createResponse(201, newItem);
}

function handleUpdate(pathname, body) {
    if (!body) {
        return createResponse(400, { error: 'Missing body' });
    }
    
    // Extract ID from URL: /data/123
    const id = pathname.split('/').pop();
    const index = mockData.findIndex(item => item.id === id);
    
    if (index === -1) {
        return createResponse(404, { error: 'Item not found' });
    }
    
    mockData[index] = { ...mockData[index], ...body, id: id };
    return createResponse(200, mockData[index]);
}

function handleDelete(pathname) {
    // Extract ID from URL: /data/123
    const id = pathname.split('/').pop();
    const index = mockData.findIndex(item => item.id === id);
    
    if (index === -1) {
        return createResponse(404, { error: 'Item not found' });
    }
    
    const deleted = mockData.splice(index, 1)[0];
    return createResponse(200, deleted);
}

function handleAuthRefresh(body) {
    if (body && body.refreshToken === 'valid-refresh-token') {
        authToken = 'refreshed-token';
        return createResponse(200, { token: 'refreshed-token' });
    }
    
    return createResponse(401, { error: 'Invalid refresh token' });
}

function createResponse(status, data) {
    const responseText = JSON.stringify(data);
    
    return Promise.resolve({
        ok: status >= 200 && status < 300,
        status: status,
        statusText: getStatusText(status),
        headers: new Map([
            ['content-type', 'application/json']
        ]),
        json: () => Promise.resolve(data),
        text: () => Promise.resolve(responseText)
    });
}

function getStatusText(status) {
    const statusTexts = {
        200: 'OK',
        201: 'Created',
        400: 'Bad Request',
        401: 'Unauthorized',
        404: 'Not Found',
        405: 'Method Not Allowed',
        500: 'Internal Server Error'
    };
    return statusTexts[status] || 'Unknown';
}
