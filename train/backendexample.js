/*
backendexample.js

Minimal, from-scratch example of the DataSource / DataSourceWidget backend-connection pattern,
without a DataModel (no schema, no validation, no downstream form wiring - see the DataModel
docs for that side of things).

Three example operations are shown end-to-end (HTTP + mock + widget wiring):
  - getSome()       GET request
  - postSome()      POST request, JSON body
  - postFormData()  POST request, multipart/form-data body

=== DataSource base class (../base/datasource.js) ===

State:
  dataModel            - optional DataModel instance (schema/validation) - unused here
  paginationStrategy   - optional pagination strategy - unused here
  uuid_key             - name of the field used as unique id (default 'uuid')
  timeout              - request timeout in ms (default 30000)
  networkSimulator     - optional NetworkSimulator, for injecting delay/errors in tests

Methods a subclass implements: read(), create(datum), update(datum), delete(id), setPage(pageInfo)
Chainable setters: setDataModel(), setPaginationStrategy(), setUUIDKey(), setTimeout(), setNetworkSimulator()

MockDataSource (same file) adds:
  data                 - the in-memory mock data
  _simulateNetwork(fn) - await this to simulate a request: awaits fn(), races it against a
                         timeout, and (if a networkSimulator is set) runs it through that
                         simulator so delay/error scenarios can be tested. Always wrap mock
                         operations with this instead of returning a bare Promise.

=== HTTPDataSource (../base/httpdatasource.js) ===

State: baseUrl, authModel, paginationStrategy, networkSimulator

Helpers (used to build the subclass methods below):
  _buildRequestConfig(endpoint, options)    -> {url, method, headers, body}
  _applyAuth(requestConfig)                 -> injects authModel headers, if any
  _applyPagination(requestConfig)           -> lets paginationStrategy rewrite the request
  _executeFetch(requestConfig)              -> the actual fetch() call, with timeout + networkSimulator
  _handleAuthRetry(requestConfig, response) -> refreshes + retries once on HTTP 401, if authModel supports it
  _parseResponseBody(response)              -> json/text/null depending on content-type
  _parsePaginatedResponse(body)             -> lets paginationStrategy unwrap a paginated body
  _jsonToFormData(datum)                    -> plain object -> FormData (File/Blob values pass through)
  _jsonToURLEncoded(datum)                  -> plain object -> URLSearchParams

Core request methods:
  _makeRequest(requestConfig)               -> runs the full lifecycle above, throws a
                                                standardized {message, status, body} error object
  makeFormRequest(endpoint, verb, formData) -> like _makeRequest but for FormData bodies
                                                (no Content-Type header - the browser sets the boundary)

Default CRUD (read/create/update/delete) and examples (postForm/me/reset) already exist on the
base class, so a plain REST resource needs no code at all - subclass only what differs.

=== DataSourceWidget (../base/datasourcewidget.js) ===

Coordinates a DataSource with the rest of the widget graph purely through signals - it renders
no HTML itself.

Inherited signals (created by super.createSignals() - ALWAYS call this first if you subclass):
  data                          - result of read_slot()
  datamodel_create/read/update  - dataModel schemas, emitted by model_slot()
  pagination_changed            - pagination info, or null if pagination is disabled
  error                         - {message, status, body}, emitted by _emitError() on any failure
  loading_start/loading_success/loading_error
                                - emitted around every operation, carry the operation name
                                  (e.g. 'read') so a spinner widget can key off them

Inherited slots: enable_slot/disable_slot, read_slot/create_slot/update_slot/delete_slot,
set_page_slot, set_network_simulator_slot, set_auth_slot, model_slot

Inherited helper: _emitError(fallbackMessage, errorData) - call this in every .catch(), it
normalizes whatever the DataSource threw into the signals.error shape above.

The generic read/create/update/delete slots are meant for list-like REST resources. This
example widget instead defines its own domain slots (get_some_slot/post_some_slot/
post_form_data_slot) that call the matching dataSource methods directly - the same approach
used by AuthUserDataSourceWidget (../../app/datapi/authuser/datawidget.js).
*/

import { HTTPDataSource } from '../base/httpdatasource.js';
import { MockDataSource } from '../base/datasource.js';
import { DataSourceWidget } from '../base/datasourcewidget.js';
import { Signal } from '../base/widget.js';

class ExampleHTTPDataSource extends HTTPDataSource { /*//DOC
    Real backend counterpart of ExampleMockDataSource. No DataModel involved.
    */
    async getSome() { /*//DOC
        GET request example.
        Returns whatever json the server responds with.
        */
        const ENDPOINT = 'example/some';
        const VERB = 'GET';
        const requestConfig = this._buildRequestConfig(ENDPOINT, {
            method: VERB
        });
        return await this._makeRequest(requestConfig);
    }

    async postSome(datum) { /*//DOC
        POST request example, JSON body.
        datum = { ... } any JSON-serializable object
        */
        const ENDPOINT = 'example/some';
        const VERB = 'POST';
        const requestConfig = this._buildRequestConfig(ENDPOINT, {
            method: VERB,
            body: JSON.stringify(datum)
        });
        return await this._makeRequest(requestConfig);
    }

    async postFormData(datum) { /*//DOC
        POST request example, multipart/form-data body (e.g. for file uploads).
        datum = { ... } converted to FormData with _jsonToFormData()
        */
        const ENDPOINT = 'example/some-form';
        const VERB = 'POST';
        const formData = this._jsonToFormData(datum);
        return await this.makeFormRequest(ENDPOINT, VERB, formData);
    }
}

class ExampleMockDataSource extends MockDataSource { /*//DOC
    Mock counterpart of ExampleHTTPDataSource - same method names & shapes, no real network.
    See _simulateNetwork() in the MockDataSource base class (../base/datasource.js).
    */
    constructor() {
        super();
        this.data = { message: "Hello from the mock backend!" };
    }

    getSome() { /*//DOC
        Simulates a successful GET.
        Returns: { message: str }
        */
        return this._simulateNetwork(async () => structuredClone(this.data));
    }

    postSome(datum) { /*//DOC
        Simulates a POST (json).

        Success case (200 OK): any datum
        Returns: { message: str }

        Error case (400): datum = { fail: true, ... }
        Returns: Promise.reject with a structured error - lets you test the error path
        */
        return this._simulateNetwork(async () => {
            if (datum && datum.fail) {
                throw {
                    message: "HTTP 400: Bad Request",
                    status: 400,
                    body: { detail: "fail flag was set in datum" }
                };
            }
            return { message: `Server got: ${JSON.stringify(datum)}` };
        });
    }

    postFormData(datum) { /*//DOC
        Simulates a POST (multipart/form-data). Same success/error rules as postSome().
        */
        return this._simulateNetwork(async () => {
            if (datum && datum.fail) {
                throw {
                    message: "HTTP 400: Bad Request",
                    status: 400,
                    body: { detail: "fail flag was set in datum" }
                };
            }
            return { message: `Server got form data: ${JSON.stringify(datum)}` };
        });
    }
}

class ExampleDataSourceWidget extends DataSourceWidget { /*//DOC
    Wires ExampleHTTPDataSource / ExampleMockDataSource to signals & slots.

    For all slots:

    error = {
        message: a string describing the error (with http error message)
        status: http status code, or null for network/timeout errors
        body: null, json or string - the server's response body, if any
    }
    */

    createSignals() {
        super.createSignals(); // keep data/error/loading_* signals from DataSourceWidget
        this.signals.someData = new Signal("Result of getSome(). Carries: { message: str }");
        this.signals.success = new Signal("Fired after ANY operation (get/post/post-form) succeeds. Carries nothing - connect a green/red status widget alongside signals.error.");
    }

    get_some_slot() { /*//DOC
        Calls dataSource.getSome().
        */
        this.signals.loading_start.emit('get-some');
        this.dataSource.getSome()
            .then((reply_message) => {
                this.signals.loading_success.emit('get-some');
                this.signals.success.emit();
                this.signals.someData.emit(reply_message); // emit last: a status widget showing both should end up displaying the data, not just "success"
            })
            .catch((error) => {
                this.log(0, "get-some error", error);
                this.signals.loading_error.emit({operation: 'get-some', error: error});
                this._emitError("Get failed", error);
            });
    }

    post_some_slot(datum) { /*//DOC
        Calls dataSource.postSome(datum).
        datum = { ... } any JSON-serializable object
        */
        this.signals.loading_start.emit('post-some');
        this.dataSource.postSome(datum)
            .then((reply_message) => {
                this.signals.loading_success.emit('post-some');
                this.signals.success.emit();
            })
            .catch((error) => {
                this.log(0, "post-some error", error);
                this.signals.loading_error.emit({operation: 'post-some', error: error});
                this._emitError("Post failed", error);
            });
    }

    post_form_data_slot(datum) { /*//DOC
        Calls dataSource.postFormData(datum).
        datum = { ... } any JSON-serializable object (may include File/Blob values)
        */
        this.signals.loading_start.emit('post-form-data');
        this.dataSource.postFormData(datum)
            .then((reply_message) => {
                this.signals.loading_success.emit('post-form-data');
                this.signals.success.emit();
            })
            .catch((error) => {
                this.log(0, "post-form-data error", error);
                this.signals.loading_error.emit({operation: 'post-form-data', error: error});
                this._emitError("Post (form-data) failed", error);
            });
    }
}

export { ExampleHTTPDataSource, ExampleMockDataSource, ExampleDataSourceWidget };
