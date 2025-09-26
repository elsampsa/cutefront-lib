import { DataModel } from "./datamodel.js";

class DataSource {
    constructor() {
        this.dataModel = null;
        this.paginationInfo = null;
        this.uuid_key = 'uuid'; // what column is used as the unique identifier
    }

    // Abstract methods - subclasses must implement
    read() {
        throw new Error("read() must be implemented by subclass");
    }

    create(datum) {
        throw new Error("create() must be implemented by subclass");
    }

    update(datum) {
        throw new Error("update() must be implemented by subclass");
    }

    delete(id) {
        throw new Error("delete() must be implemented by subclass");
    }

    setPage(paginationInfo) {
        throw new Error("setPage() must be implemented by subclass");
    }

    setDataModel(dataModel) {
        this.dataModel = dataModel;
        return this;
    }

    setUUIDKey(key) {
        this.uuid_key = key;
        return this;
    }

    getUUIDKey() {
        return this.uuid_key;
    }
}

class Dummy0DataSource extends DataSource { /*//DOC
    A datasource that returns a single json object
    */
    constructor() {
        super();
        this.data = {}
    }

    setDataModel(dataModel) {
        this.dataModel = dataModel;
        this.data = this.dataModel.getMockData();
        return this;
    }

    // no create or detele methods, just update and read
    read() {
        return this.data;
    }

    update(datum) {
        this.data = datum;
    }
}


class DummyDataSource extends DataSource { /*//DOC
    A datasource for list like data: each element of the list is a json object
    Features pagination
    */
    constructor() {
        super();
        this.data = [];
        this.currentPage = 1;
        this.pageSize = 10;
    }

    setDataModel(dataModel) {
        this.dataModel = dataModel;
        this.data = this.dataModel.getMockData(15);
        return this;
    }

    read() {
        if (this.paginationInfo && this.paginationInfo.currentPage) {
            const start =
                (this.paginationInfo.currentPage - 1) *
                (this.paginationInfo.pageSize || 10);
            const end = start + (this.paginationInfo.pageSize || 10);
            return this.data.slice(start, end);
        }
        return this.data;
    }

    create(datum) {
        // Simple validation
        if (!datum || typeof datum !== "object") {
            return "Invalid datum provided";
        }

        const id = this.uuid_key

        // Generate ID
        const maxId = Math.max(
            0,
            ...this.data.map((item) => parseInt(item[id]) || 0)
        );
        const newDatum = {
            ...datum,
            [id]: String(maxId + 1),
        };

        this.data.push(newDatum);
        return newDatum;
    }

    update(datum) {
        const id_key = this.uuid_key;
        
        if (!datum || !datum[id_key]) {
            return `Missing ${id_key} for update`;
        }
        
        const index = this.data.findIndex((item) => item[id_key] === datum[id_key]);
        if (index === -1) {
            return `Item with ${id_key} ${datum[id_key]} not found`;
        }
        
        this.data[index] = { ...this.data[index], ...datum };
        return this.data[index];
    }

    delete(id) {
        const id_key = this.uuid_key;

        

        const index = this.data.findIndex((item) => item[id_key] === id);
        if (index === -1) {
            return `Item with ${id_key} ${id} not found`;
        }
        
        const deleted = this.data.splice(index, 1)[0];
        return deleted;
    }


    setPage(paginationInfo) {
        if (paginationInfo) {
            if (paginationInfo.currentPage !== undefined) {
                this.currentPage = paginationInfo.currentPage;
            }
            if (paginationInfo.pageSize !== undefined) {
                this.pageSize = paginationInfo.pageSize;
            }
        } else {
            // Reset to no pagination
            this.currentPage = null;
            this.pageSize = null;
        }
    }
}

export { DataSource, Dummy0DataSource, DummyDataSource };
