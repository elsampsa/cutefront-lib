class DataModel {
    constructor() {
        // Default datamodel - must be overridden
        this.create = {
            name: {
                label: "First Name",
                help: "The first name of the person",
                check: this.checkStr
            },
            surname: {
                label: "Last Name", 
                help: "The surname of the person",
                check: this.checkStr
            },
            email: {
                label: "Email",
                help: "The email address",
                check: this.checkStr
            },
            age: {
                label: "Age",
                help: "Age of the person in years",
                check: this.checkNumber
            }
        };
        
        this.read = this.create;
        this.update = this.create;
    }
    
    getMockData(n) { // returns a list of mock data of n elements, a single element or null
        return [];
    }

    checkStr(par) {
        const str = String(par);
        if (str.length < 1) {
            return { value: null, error: "Empty" };
        }
        return { value: str, error: null };
    }
    
    checkNumber(par) {
        const str = String(par);
        if (str.length < 1) {
            return { value: null, error: "Empty" };
        }
        const num = Number(str);
        if (isNaN(num)) {
            return { value: null, error: "Numeric value required" };
        }
        return { value: num, error: null };
    }

    checkBool(par) {
        // Handle null/undefined
        if (par === null || par === undefined) {
            return { value: null, error: "Empty" };
        }
        
        // Handle actual booleans
        if (typeof par === 'boolean') {
            return { value: par, error: null };
        }
        
        // Handle numbers
        if (typeof par === 'number') {
            if (par === 0) return { value: false, error: null };
            if (par === 1) return { value: true, error: null };
            return { value: null, error: "Invalid number - must be 0 or 1" };
        }
        
        // Handle strings
        if (typeof par === 'string') {
            const trimmed = par.trim().toLowerCase();
            if (trimmed === '') {
                return { value: null, error: "Empty" };
            }
            if (trimmed === 'true') return { value: true, error: null };
            if (trimmed === 'false') return { value: false, error: null };
            if (trimmed === '1') return { value: true, error: null };
            if (trimmed === '0') return { value: false, error: null };
            return { value: null, error: "Invalid string - must be 'true', 'false', '0', or '1'" };
        }
        
        return { value: null, error: "Invalid type" };
    }
}

export { DataModel }
