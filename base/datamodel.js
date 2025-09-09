class DataModel {
    constructor() {
        // Default datamodel - can be overridden
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
}

export { DataModel }
