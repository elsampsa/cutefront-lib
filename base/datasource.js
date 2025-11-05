import { DataModel } from "./datamodel.js";

class DataSource { /*//DOC
    DataSource may or may not use DataModel (from ./datamodel.js)
    */
    constructor() {
        this.dataModel = null;
        this.paginationInfo = null;
        this.paginationStrategy = null;
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

    setPaginationStrategy(strategy) {
        this.paginationStrategy = strategy;
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

class MockDataSource extends DataSource { /*//DOC
    A datasource for list like data: each element of the list is a json object
    Features pagination
    */
    constructor() {
        super();
        this.data = [];
    }

    setDataModel(dataModel) {
        this.dataModel = dataModel;
        this.data = this.dataModel.getMockData(15);
        return this;
    }

    read() {
        if (this.paginationStrategy && this.paginationStrategy.enabled) {
            if (this.paginationStrategy.currentPage < this.paginationStrategy.baseIndex) {
                console.error("wrong pagination base index")
            }
            else {
                this.paginationStrategy.totalItems = this.data.length;
                const start =
                    (this.paginationStrategy.currentPage - this.paginationStrategy.baseIndex) *
                    (this.paginationStrategy.pageSize);
                const end = start + Math.min(this.paginationStrategy.pageSize, this.paginationStrategy.totalItems);
                console.log(this.data.slice(start, end));
                return Promise.resolve(this.data.slice(start, end));
            }
        }
        return Promise.resolve(this.data);
    }

    create(datum) {
        // Simple validation
        if (!datum || typeof datum !== "object") {
            return Promise.reject({
                message: "Invalid datum provided",
                status: null,
                body: null
            });
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
        return Promise.resolve(newDatum);
    }

    update(datum) {
        const id_key = this.uuid_key;

        if (!datum || !datum[id_key]) {
            return Promise.reject({
                message: `Missing ${id_key} for update`,
                status: null,
                body: null
            });
        }

        const index = this.data.findIndex((item) => item[id_key] === datum[id_key]);
        if (index === -1) {
            return Promise.reject({
                message: `Item with ${id_key} ${datum[id_key]} not found`,
                status: null,
                body: null
            });
        }

        this.data[index] = { ...this.data[index], ...datum };
        return Promise.resolve(this.data[index]);
    }

    delete(id) {
        const id_key = this.uuid_key;
        const index = this.data.findIndex((item) => item[id_key] === id);
        if (index === -1) {
            return Promise.reject({
                message: `Item with ${id_key} ${id} not found`,
                status: null,
                body: null
            });
        }

        const deleted = this.data.splice(index, 1)[0];
        return Promise.resolve(deleted);
    }

    setPage(paginationInfo) { /*//DOC
        Originates typically from upstream widgets to set the current page and page size
        (and then followed by an immediate call to read)
        paginationInfo = {
            currentPage: int,
            pageSize: int, 
            ...
        }
        paginationInfo = null disables pagination
        */
        if (this.paginationStrategy) {
            this.paginationStrategy.set(paginationInfo)
        }
    }
}

export { DataSource, MockDataSource };
