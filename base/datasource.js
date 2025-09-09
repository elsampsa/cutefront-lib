import { DataModel } from "./datamodel.js";

class DataSource {
    constructor() {
        this.dataModel = new DataModel();
        this.paginationInfo = null;
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
}

class DummyDataSource extends DataSource {
    constructor(initialData = []) {
        super();
        this.data = [...initialData];
        this.currentPage = 1;
        this.pageSize = 10;

        // Add some default test data if none provided
        if (this.data.length === 0) {
            this.data = [
                {
                    id: "1",
                    name: "John",
                    surname: "Doe",
                    email: "john@example.com",
                    age: 30,
                },
                {
                    id: "2",
                    name: "Jane",
                    surname: "Smith",
                    email: "jane@example.com",
                    age: 25,
                },
                {
                    id: "3",
                    name: "Bob",
                    surname: "Johnson",
                    email: "bob@example.com",
                    age: 35,
                },
                {
                    id: "4",
                    name: "Alice",
                    surname: "Wilson",
                    email: "alice@example.com",
                    age: 28,
                },
                {
                    id: "5",
                    name: "Charlie",
                    surname: "Brown",
                    email: "charlie@example.com",
                    age: 42,
                },
                {
                    id: "6",
                    name: "Diana",
                    surname: "Davis",
                    email: "diana@example.com",
                    age: 31,
                },
                {
                    id: "7",
                    name: "Eve",
                    surname: "Miller",
                    email: "eve@example.com",
                    age: 29,
                },
                {
                    id: "8",
                    name: "Frank",
                    surname: "Garcia",
                    email: "frank@example.com",
                    age: 38,
                },
                {
                    id: "9",
                    name: "Grace",
                    surname: "Lee",
                    email: "grace@example.com",
                    age: 26,
                },
                {
                    id: "10",
                    name: "Henry",
                    surname: "Taylor",
                    email: "henry@example.com",
                    age: 33,
                },
                {
                    id: "11",
                    name: "Iris",
                    surname: "Anderson",
                    email: "iris@example.com",
                    age: 27,
                },
                {
                    id: "12",
                    name: "Jack",
                    surname: "Thomas",
                    email: "jack@example.com",
                    age: 36,
                },
            ];
        }
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

        // Generate ID
        const maxId = Math.max(
            0,
            ...this.data.map((item) => parseInt(item.id) || 0)
        );
        const newDatum = {
            ...datum,
            id: String(maxId + 1),
        };

        this.data.push(newDatum);
        return newDatum;
    }

    update(datum) {
        if (!datum || !datum.id) {
            return "Missing id for update";
        }

        const index = this.data.findIndex((item) => item.id === datum.id);
        if (index === -1) {
            return `Item with id ${datum.id} not found`;
        }

        this.data[index] = { ...this.data[index], ...datum };
        return this.data[index];
    }

    delete(id) {
        const index = this.data.findIndex((item) => item.id === id);
        if (index === -1) {
            return `Item with id ${id} not found`;
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

export { DataSource, DummyDataSource };
