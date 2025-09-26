/*
DataSourceWidget - Coordinates data operations with UI signals/slots

This widget doesn't create any UI elements itself. It acts as a coordinator between
data sources and UI components, handling CRUD operations and pagination through signals.
*/

import { Widget, Signal } from './widget.js';

class DataSourceWidget extends Widget { /*//DOC
    Coordinates data operations with UI signals/slots.
    Handles pagination state for UI.
    This is not a UI component itself - just sends signals to downstream UI components.
    No data caching - all data flows through signals.
    Error checking is done by DataSource itself and downstream widgets.
    */
    
    constructor(id, dataSource) {
        super(id);
        this.dataSource = dataSource;
        this.createElement();
        this.createState();
    }
    
    createSignals() { 
        this.signals.data = new Signal("Carries current data (paginated or all)");
        this.signals.datamodel_create = new Signal("Carries dataModel.create. Can be connected to downstream widgets like forms for validation");
        this.signals.datamodel_read = new Signal("Carries dataModel.read"); 
        this.signals.datamodel_update = new Signal("Carries dataModel.update");
        this.signals.pagination_changed = new Signal("Carries pagination info for UI");
        this.signals.error = new Signal("Carries error messages");
    }
    
    // *** CRUD SLOTS ***
    
    read_slot() { /*//DOC
        Reads data from the dataSource and emits data signal.
        Also emits pagination info if available.
        */
        this.log(-1, "read_slot called");
        
        // Handle both sync (DummyDataSource) and async (HTTPDataSource) cases
        const result = this.dataSource.read();
        
        if (result && typeof result.then === 'function') {
            // Async result (HTTPDataSource)
            result.then((data) => {
                this._handleReadResult(data);
            }).catch((error) => {
                this.log(0, "read_slot error:", error.message);
                this.signals.error.emit(`Read failed: ${error.message}`);
            });
        } else {
            // Sync result (DummyDataSource)
            this._handleReadResult(result);
        }
    }
    
    create_slot(datum) { /*//DOC
        Creates a new datum in the dataSource.
        :param datum: object with data fields
        */
        this.log(-1, "create_slot called", datum);
        
        const result = this.dataSource.create(datum);
        
        if (result && typeof result.then === 'function') {
            // Async result (HTTPDataSource)
            result.then((data) => {
                this._handleCRUDResult(data, 'create');
            }).catch((error) => {
                this.log(0, "create_slot error:", error.message);
                this.signals.error.emit(`Create failed: ${error.message}`);
            });
        } else {
            // Sync result (DummyDataSource)
            this._handleCRUDResult(result, 'create');
        }
    }
    
    update_slot(datum) { /*//DOC
        Updates an existing datum in the dataSource.
        :param datum: object with data fields including id
        */
        this.log(-1, "update_slot called", datum);
        
        const result = this.dataSource.update(datum);
        
        if (result && typeof result.then === 'function') {
            // Async result (HTTPDataSource)
            result.then((data) => {
                this._handleCRUDResult(data, 'update');
            }).catch((error) => {
                this.log(0, "update_slot error:", error.message);
                this.signals.error.emit(`Update failed: ${error.message}`);
            });
        } else {
            // Sync result (DummyDataSource)
            this._handleCRUDResult(result, 'update');
        }
    }
    
    delete_slot(par) { /*//DOC
        Deletes a datum from the dataSource by id.
        :param par: either string uuid of the item to delete or the whole datum
        */
        this.log(-1, "delete_slot called", par);
        if (typeof par === 'string') {
            var id = par;
        }
        else {
            const uuid_key = this.dataSource.getUUIDKey()
            var id = par[uuid_key]
            if (!id) {
                this.err(`could not get ${uuid_key} from datum`);
                this.signals.error.emit(`Delete failed: could not get ${uuid_key} from datum`);
                return;
            }
        }
        const result = this.dataSource.delete(id);
        if (result && typeof result.then === 'function') {
            // Async result (HTTPDataSource)
            result.then((data) => {
                this._handleCRUDResult(data, 'delete');
            }).catch((error) => {
                this.log(0, "delete_slot error:", error.message);
                this.signals.error.emit(`Delete failed: ${error.message}`);
            });
        } else {
            // Sync result (DummyDataSource)
            this._handleCRUDResult(result, 'delete');
        }
    }
    
    // *** OTHER SLOTS ***
    
    set_page_slot(pageInfo) { /*//DOC
        Sets pagination info and re-reads data.
        :param pageInfo: object with currentPage, pageSize, etc. or null to disable pagination
        */
        this.log(-1, "set_page_slot called", pageInfo);
        
        // Tell dataSource to update its page state
        this.dataSource.setPage(pageInfo);
        
        // Re-read data with new page
        this.read_slot();
    }
    
    set_auth_slot(authInfo) { /*//DOC
        Sets authentication info on the dataSource.
        :param authInfo: object with token, refreshToken, etc.
        */
        this.log(-1, "set_auth_slot called", authInfo);
        
        if (this.dataSource.setAuth) {
            this.dataSource.setAuth(authInfo);
        } else {
            this.log(0, "dataSource doesn't support authentication");
        }
    }
    
    model_slot() { /*//DOC
        Emits all datamodel signals for downstream UI components.
        Triggers emission of datamodel_create, datamodel_read, datamodel_update signals.
        */
        this.log(-1, "model_slot called");
        
        if (this.dataSource.dataModel) {
            this.signals.datamodel_create.emit(this.dataSource.dataModel.create);
            this.signals.datamodel_read.emit(this.dataSource.dataModel.read);  
            this.signals.datamodel_update.emit(this.dataSource.dataModel.update);
        } else {
            this.log(0, "dataSource doesn't have dataModel");
        }
    }
    
    // *** INTERNAL METHODS ***
    
    _handleReadResult(data) {
        this.log(-1, "_handleReadResult", typeof data, data);
        
        // Check if result is an error string
        if (typeof data === 'string') {
            this.signals.error.emit(data);
            return;
        }
        
        // Emit pagination info first if available
        if (this.dataSource.paginationStrategy) {
            const paginationInfo = this.dataSource.paginationStrategy.getPaginationInfo();
            this.log(-1, "emitting pagination info", paginationInfo);
            this.signals.pagination_changed.emit(paginationInfo);
        }
        
        // Emit the data
        this.log(-1, "emitting data");
        this.signals.data.emit(data);
    }
    
    _handleCRUDResult(result, operation) {
        this.log(-1, `_handleCRUDResult ${operation}`, typeof result, result);
        
        // Check if result is an error string
        if (typeof result === 'string') {
            this.signals.error.emit(`${operation}: ${result}`);
            return;
        }
        
        // Success - re-read data to refresh UI
        this.read_slot();
    }
    
    createState() {
        if (this.element == null) {
            return;
        }
        // No state to initialize - this widget doesn't create UI elements
        // All state is managed by the dataSource
    }
    
    createElement() {
        // This widget doesn't create any HTML elements
        // It just coordinates data operations via signals
        this.element = document.getElementById(this.id);
        if (this.element == null) {
            // For a non-UI widget, we might not even need an element
            // But we'll follow the pattern and log if element doesn't exist
            this.log(-1, "no element found with id", this.id, "- this is normal for DataSourceWidget");
        }
    }
    
    // *** PUBLIC API METHODS ***
    
    setDataSource(dataSource) { /*//DOC
        Sets a new dataSource for this widget.
        :param dataSource: DummyDataSource, HTTPDataSource, etc.
        */
        this.dataSource = dataSource;
        this.log(-1, "dataSource changed");
    }
    
    getDataSource() { /*//DOC
        Returns the current dataSource.
        */
        return this.dataSource;
    }

} // DataSourceWidget

export { DataSourceWidget };
