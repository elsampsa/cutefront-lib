import { Widget, Signal, uuidv4 } from './widget.js';

class DataSourceWidget extends Widget { /*//DOC
    This widget does not create any graphical element.
    It presents a generic datasource and must be subclassed.
    
    Data is accepted into the datasource via slots.
    Datasource emits signals that declare datamodels.  Downstream widgets can then adapt themselves to the desired datamodels.
    There is typically a separate datamodel for each CRUD operation.
    Datasource also emits any new or updated data via a signal which can be connected to downstream widgets.

    A datamodel is an object with metadata for all data fields
    key: the data key
    value: a dictionary with keys "label", "help" and "check", where:
    - label: a label to be used with forms
    - help: a descriptive string about the data element
    - check: a function that checks this data element

    A datasource class should also define functions for checking data fields, see below.
    */
    constructor() {
        super();
        this.createElement();
        this.createState();
    }
    createSignals() {
        this.signals.data = new Signal(); /*//DOC Carries a list of all current datums from the datasource */
        this.signals.datamodel_create = new Signal(); /*//DOC Carries datamodel for C operations */
        this.signals.datamodel_read = new Signal(); /*//DOC Carries datamodel for R operations */
        this.signals.datamodel_update = new Signal(); /*//DOC Carries datamodel for U operations */
        this.signals.error = new Signal(); /*//DOC Carries information (a string) about an occurred error */
    }
    create_slot(datum) { /*//DOC
        Create a new datum into the datasource.
        Argument datum is an object with key-value pairs.
        Emits signal data.
        */
        let res = this.dataCheck(this.datamodel_create, datum)
        if (res.error != null) {
            this.signals.error.emit(`Create: ${res.error}`)
            return
        }
        let datum_ = res.datum
        datum_.uuid = uuidv4()
        this.data.push(datum_)
        this.signals.data.emit(this.data)
    }
    read_slot() { /*//DOC
        Tells datasource to re-read the data from the datasource and emit
        the data signal.
        */
        this.signals.data.emit(this.data);
    }
    update_slot(datum) { /*//DOC
        Update an existing datum in the datasource.
        Argument datum is an object with key-value pairs.  It must have a key named "uuid".
        Emits signal error upon errors, signal data if the update was succesfull.
        */
        this.log(-1, "update_slot", datum)
        if (!datum.hasOwnProperty('uuid')) {
            this.log(0, "update_slot: incoming data missing uuid")
            this.error.emit("Update: missing uuid")
            return
        }
        let res = this.dataCheck(this.datamodel_update, datum)
        if (res.error != null) {
            this.error.emit(`Update: ${res.error}`)
            return
        }
        let datum_ = res.datum
        let cc = 0
        for (const old_datum of this.data) {
            if (old_datum.uuid == datum_.uuid) {
                // found the correct one!
                this.data[cc] = datum_ // update
                this.signals.data.emit(this.data)
                this.log(-1, "update_slot: found uuid", old_datum.uuid)
                return
            }
            cc += 1
        }
        this.signals.error.emit(`Update: could not find uuid "${datum_.uuid}"`)
    }
    delete_slot(uuid) { /*//DOC
        Delete an existing datum from the datasource, corresponding to a uuid.
        Emit signal error upon errors, signal data if the update was succesfull.
        */
        let i = -1
        let cc = 0
        // find list index with data element that matches uuid
        this.data.forEach(
            item => {
                if (item.uuid == uuid) {
                    i = cc;
                }
                cc += 1
            }
        )
        if (i<0) {
            this.log(0, "delete_slot: could not find uuid", uuid)
            this.signals.error.emit(`Delete: could not find uuid "${uuid}"`)
            return;
        }
        this.data.splice(i, 1)
        this.signals.data.emit(this.data)
    }
    model_slot() { /*//DOC
        (re)emits signals datamodel_create, datamodel_read and datamodel_update
        */
        this.signals.datamodel_create.emit(this.datamodel_create)
        this.signals.datamodel_read.emit(this.datamodel_read)
        this.signals.datamodel_update.emit(this.datamodel_update)
    }
    createState() {
        /* datamodel is a dictionary with metadata of all data fields
        key: the data key
        value: a dictionary with keys "label", "help" and "check"
        - label: a label to be used with forms
        - help: a descriptive string about the data element
        - check: a function that checks this data element
        */
        // You need to subclass this method
        this.datamodel_create = { // C
            name: {
                label:  "First Name",
                help :  "The first name of the person",
                check:  this.checkStr.bind(this)
            },
            surname: {
                label:  "Last Name",
                help :  "The surname of the person",
                check:  this.checkStr.bind(this)
            },
            email: {
                label:  "Email",
                help :  "the email",
                check:  this.checkStr.bind(this)
            },
            age: {
                label: "Age",
                help : "Age of the person in years",
                check: this.checkNumber.bind(this)
            }
        };

        // datamodel for update operations .. could be different that
        // datamodel_create
        this.datamodel_read = this.datamodel_create // R
        this.datamodel_update = this.datamodel_create // U

        this.data = []
        // In your test/mock datasource class, you can hard-code some initial mock data here, for example:
        /*
        key: data key
        value: data element
        
        for example:

        this.data = [
            {
                "uuid": "123456",
                "name": "John",
                "surname": "Doe",
                "email": "john.doe@gmail.com",
                "age": 51
            },
            {
                "uuid": "654321",
                "name": "Joanna",
                "surname": "Doe",
                "email": "joanna.doe@gmail.com",
                "age": 18
            }
        ];
    }
    */
    }
    // here some functions for checking input values.
    // you might want to subclass them in your custom datasource class
    // the idea: the datasource class defines the check functions, based
    // on what it accepts
    checkStr(par) { /*//DOC
        Check function. Checks that par is a string.
        Returns (corrected) value, error message
        If everything's ok, the error message is null
        */
        const str = String(par)
        if (str.length < 1) {
            return {value: null, error: "Empty"}
        }
        return {value: str, error: null}
    }
    checkNumber(par) { /*//DOC
        Check function. Checks that par is a number.
        Returns (corrected) value, error message
        If everything's ok, the error message is null
        */
        const str = String(par)
        if (str.length < 1) {
            return {value: null, error: "Empty"}
        }
        const num = Number(str);
        if (isNaN(num)) {
            return {value: null, error: "Numeric value required"}
        }
        return {value: num, error: null}
    }
    checkInt(par) {
        return this.checkNumber(par)
    }
    checkFloat(par) {
        return this.checkNumber(par)
    }
    createElement() { // this widget doesn't create any html elements
    }

    dataCheck(datamodel, datum) { /*//DOC
        Given a datamodel, checks the datum against the datamodel

        Returns:

        {
            datum: corrected/filtered datum,
            error: error string or null of there was no error

        }

        If datum has keys not described by the datamodel, these
        are silently omitted (but kept in the final datum)

        */
        /* note: in the follosing, we could also use sets
        datamodel_keys = Set(Object.keys(datamodel))
        datum_keys = Set(Object.keys(datum))
        if (!equalSets(datamodel_keys, datum_keys)) {
            // etc
        }
        */
        this.log(-1, "dataCheck got", datum)
        let required_keys = Object.keys(datamodel)
        var tmp_datum = structuredClone(datum) // corrected datum
        let datum_leftover_keys = Object.keys(datum)
        for (const key of required_keys) {
            this.log(-2, "dataCheck.key", key)
            if (!datum.hasOwnProperty(key)) {
                this.log(-1, "dataCheck missing key", key)
                return {
                    datum: null,
                    error: `missing key ${key}`
                }
            }
            // get datum value
            let value=datum[key]
            // checker function from datamodel
            let check_func = datamodel[key].check
            // apply check function
            let res = check_func(value)
            this.log(-2, "dataCheck.check", key, res.error, res.value)
            if (res.error != null) {
                return {
                    datum: null,
                    error: `error "${res.error}" with key ${key}`
                }
            }
            tmp_datum[key] = res.value // corrected / cleaned up value
            this.log(-2, "dataCheck.leftover", datum_leftover_keys)
            let index = datum_leftover_keys.findIndex(
                (element) => element == key
            )
            datum_leftover_keys.splice(index, 1)
        } // required_keys
        // what to do with extra keys not described by the datamodel?
        /*
        for (const key in datum_leftover_keys) {
            // tmp_datum.delete[key] // delete..? NOPES!
            // ..we want to keep the uuid etc. keys
        }
        */
        return {
            datum: tmp_datum,
            error: null
        }
    }
    
} // DataSourceWidget

export { DataSourceWidget }
