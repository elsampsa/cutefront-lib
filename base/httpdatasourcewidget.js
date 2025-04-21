import { assertKeys } from './widget.js';
import { DataSourceWidget } from './datasourcewidget.js';

class HTTPDataSourceWidget extends DataSourceWidget { /*//DOC
    Implements a datasource using HTTP verbs.
    For an actual HTTP datasource, you still need to subclass this to declare
    the expected datamodels.  See method declareDatamodels
    and ExampleHTTPDataSourceWidget.

    Ctor takes parameter ctx with the following members;
    
    - base_address
    - api_slug
    - object_name 
    - tail [optional]
    - customHeaders [optional]: Object with custom headers to include in all requests
    - pluralRule [optional]: Function that converts singular to plural (default: add 's')

    The intercom with the backend works with the following convention:

    OP      VERB    Address

    C       POST    base_address/api_slug/object_name/tail/create
    R       GET     base_address/api_slug/object_name/tail/read
    U       PUT     base_address/api_slug/object_name/tail/update
    D       DELETE  base_address/api_slug/object_name/tail/delete

    (where tail is optional)

    C expects a json object without uuid

    R returns an object: {"objects" : list-of-objects}, where "objects" is the name of the objects in plural, i.e.
    if "object_name" is "banana", then R should return {"bananas" : list-of-objects}

    U expects a json object with uuid

    D expects a json objects: {"uuid" : uuid-of-object-to-be-deleted}
    */
    constructor(ctx) {
        if (ctx == undefined) {
            throw("HTTPDataSourceWidget missing ctx")
        }
        assertKeys(["base_address", "api_slug", "object_name"], ctx);
        super(); // must always be called in js ctor before using "this"
        this.ctx = ctx;
        this.createState(); /* although called by "super()" we need to call this again.. as it calls createState
        and createState uses this.ctx
        */
    }

    createState() {
        if (this.ctx == undefined) {
            // invoked by the superclass (DataSourceWidget) ctor
            // so "this.ctx" not yet ready
            return;
        }
        
        // Build the base API address
        if (this.ctx.tail != undefined) {
            this.adr = `${this.ctx.base_address}/${this.ctx.api_slug}/${this.ctx.object_name}/${this.ctx.tail}/`;
        } else {
            this.adr = `${this.ctx.base_address}/${this.ctx.api_slug}/${this.ctx.object_name}/`;
        }
        
        // Set pluralization function or use default
        this.pluralizeFunc = this.ctx.pluralRule || ((name) => `${name}s`);
        this.object_name_plural = this.pluralizeFunc(this.ctx.object_name);
        
        // Store custom headers
        this.customHeaders = this.ctx.customHeaders || {};
        
        this.data = [];
        this.log(-1, "createState: adr:", this.adr);
        this.declareDatamodels();
    }

    declareDatamodels() { /*//DOC
        You need to subclass this to define
        this.datamodel_create
        this.datamodel_read
        this.datamodel_update
        */
        throw("Please subclass declareDatamodels");
    }

    // Helper methods for HTTP requests
    
    /**
     * Get common headers for all requests
     * @param {Object} additionalHeaders - Additional headers to merge with default ones
     * @returns {Headers} Headers object for fetch requests
     */
    getHeaders(additionalHeaders = {}) {
        const headers = new Headers();
        
        // Add default headers
        headers.append('Accept', 'application/json');
        headers.append('Content-Type', 'application/json');
        
        // Add custom headers from constructor
        Object.entries(this.customHeaders).forEach(([key, value]) => {
            headers.append(key, value);
        });
        
        // Add additional headers for this specific request
        Object.entries(additionalHeaders).forEach(([key, value]) => {
            headers.append(key, value);
        });
        
        return headers;
    }
    
    /**
     * Handle API errors consistently
     * @param {Response} response - Fetch response object
     * @param {string} operation - Name of operation (create, read, update, delete)
     * @returns {Promise<Object>} Error details or throws error
     */
    async handleApiError(response, operation) {
        try {
            // Try to parse error response as JSON
            const errorData = await response.json();
            const errorMessage = errorData.detail || 'Unknown error';
            
            this.err(`${operation}: request error ${response.status} - ${errorMessage}`);
            this.signals.error.emit(`Error ${response.status}: "${errorMessage}" from server for operation ${operation}`);
            
            return errorData;
        } catch (error) {
            // If error response isn't valid JSON
            this.err(`${operation}: non-JSON error response - ${response.statusText}`);
            this.signals.error.emit(`Error ${response.status}: Non-JSON error response from server for operation ${operation}`);
            
            return { detail: response.statusText || 'Unknown error' };
        }
    }
    
    /**
     * Execute a fetch request with error handling
     * @param {string} url - URL to fetch
     * @param {Object} options - Fetch options
     * @param {string} operation - Operation name for error reporting
     * @returns {Promise<Response|boolean>} Response object or false on error
     */
    async fetchWithErrorHandling(url, options, operation) {
        try {
            const response = await fetch(url, options);
            
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

    // CRUD Slots
    
    create_slot(datum) { /*//DOC
        Create a new datum into the datasource.
        Argument datum is an object with key-value pairs.
        Emits signal data.
        */
        let res = this.dataCheck(this.datamodel_create, datum);
        if (res.error != null) {
            this.signals.error.emit(`Create: ${res.error}`);
            return;
        }
        
        this.create(res.datum)
            .then(success => {
                if (success) {
                    return this.read();
                }
                return false;
            })
            .then(success => {
                if (success) {
                    this.signals.data.emit(this.data);
                }
            });
    }

    read_slot() { /*//DOC
        Tells datasource to re-read the data from the datasource and emit
        the data signal.
        */
        this.read()
            .then(success => {
                if (success) {
                    this.signals.data.emit(this.data);
                }
            });
    }

    update_slot(datum) { /*//DOC
        Update an existing datum in the datasource.
        Argument datum is an object with key-value pairs.  It must have a key named "uuid".
        Emits signal error upon errors, signal data if the update was succesfull.
        */
        this.log(-1, "update_slot", datum);
        
        if (!datum.hasOwnProperty('uuid')) {
            this.log(0, "update_slot: incoming data missing uuid");
            this.signals.error.emit("Update: missing uuid"); // Fixed this.error to this.signals.error
            return;
        }
        
        let res = this.dataCheck(this.datamodel_update, datum);
        if (res.error != null) {
            this.signals.error.emit(`Update: ${res.error}`);
            return;
        }
        
        this.update(res.datum)
            .then(success => {
                if (success) {
                    return this.read();
                }
                return false;
            })
            .then(success => {
                if (success) {
                    this.signals.data.emit(this.data);
                }
            });
    }

    delete_slot(uuid) { /*//DOC
        Delete an existing datum from the datasource, corresponding to a uuid.
        Emit signal error upon errors, signal data if the update was succesfull.
        */
        this.delete(uuid)
            .then(success => {
                if (success) {
                    return this.read();
                }
                return false;
            })
            .then(success => {
                if (success) {
                    this.signals.data.emit(this.data);
                }
            });
    }

    // HTTP calls implementation
    
    async create(datum) { // C
        const headers = this.getHeaders();
        
        const options = {
            method: 'POST',
            headers: headers,
            mode: 'cors',
            cache: 'default',
            body: JSON.stringify(datum)
        };
        
        const response = await this.fetchWithErrorHandling(
            `${this.adr}create`, 
            options, 
            'create'
        );
        
        return !!response; // Convert to boolean
    }

    async read() { // R
        const headers = this.getHeaders();
        
        const options = {
            method: 'GET',
            headers: headers,
            mode: 'cors',
            cache: 'default',
        };
        
        const response = await this.fetchWithErrorHandling(
            `${this.adr}read`, 
            options, 
            'read'
        );
        
        if (!response) return false;
        
        try {
            const data = await response.json();
            
            this.log(-1, "read: resp", data);
            
            // Check if the expected data key exists
            if (data[this.object_name_plural] === undefined) {
                this.err(`Key ${this.object_name_plural} missing from server reply`);
                this.signals.error.emit(`Key ${this.object_name_plural} missing from server reply`);
                return false;
            }
            
            this.data = data[this.object_name_plural];
            this.log(-1, "read finished with", this.data);
            return true;
            
        } catch (error) {
            this.err("Error parsing JSON response:", error);
            this.signals.error.emit(`Error parsing response: ${error.message}`);
            return false;
        }
    }

    async update(datum) { // U
        const headers = this.getHeaders();
        
        const options = {
            method: 'PUT',
            headers: headers,
            mode: 'cors',
            cache: 'default',
            body: JSON.stringify(datum)
        };
        
        const response = await this.fetchWithErrorHandling(
            `${this.adr}update`, 
            options, 
            'update'
        );
        
        return !!response; // Convert to boolean
    }

    async delete(uuid) { // D
        this.log(-1, "delete: uuid", uuid);
        
        const headers = this.getHeaders();
        
        const options = {
            method: 'DELETE',
            headers: headers,
            mode: 'cors',
            cache: 'default',
            body: JSON.stringify({"uuid": uuid})
        };
        
        const response = await this.fetchWithErrorHandling(
            `${this.adr}delete`, 
            options, 
            'delete'
        );
        
        return !!response; // Convert to boolean
    }

} // HTTPDataSourceWidget

export { HTTPDataSourceWidget }