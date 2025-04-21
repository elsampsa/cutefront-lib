/*LLM: This js file lacks imports and will not work as such.
The idea is to demonstrate how we can have nested widgets and
how only in the upper level of the nested widgets, only a certain
signals and slots are exposed in the API from the deeper level
*/

class ItemsSection extends Widget { /*//DOC
    Here we have:
    
    - "Add Item" button that launches a FormWidget
    - A FapiItemListWidget.  Internally connected to FormWidget.
    - A FormWiget for create and update operations

    Declaring the API

    We can implement new signals and slots for this composite widget
    and/or expose selected signals and slots from the deeper nested widgets.

    From the deeper widget levels, declare only the relevant signals and
    slots for this API.

    API:
    ```yaml

    signals:
        delete_datum: datum to be deleted

    slots:
        datamodel_slot: data schema

    fapiList: 
        class: FapiItemListWidget
        about: A list of items with pagination control
        signals:
            page_changed: requested page
        slots:
            datamodel_slot: data schema
            datums_slot: incoming data
            set_pagination_slot: pagination schema

    form: 
        class: FormWidget
        signals: 
            create: datum of a new object
            update: datum of the modified object
        slots:
            datamodel_slot: data schema
    ```
    */
    constructor() {
        super(null);
        this.createElement();
        this.createState();
    }
    createSignals() {
        this.signals.delete_datum = new Signal(); /*//DOC
        Carries datum of the element to be deleted.
        Shadowing the fapiList's corresponding signal as we confirm
        first the delete operation
        */
    }
    datamodel_slot(schema) { /* //DOC
        forward datamodel to form
        */
        this.form.datamodel_slot(schema)
    }
    createState() {}
    createElement() {
        this.autoElement();
        const table_uuid = randomID();
        const button_uuid = randomID();
        this.element.innerHTML = `
            <h2>Items</h2>
            <p>This is the items page.</p>
            <button id="${button_uuid}" class="btn btn-primary mb-3">
                <i class="fas fa-plus"></i> Add Item
            </button>
            <table id="${table_uuid}" class="table table-striped"></table>
        `;
        // Get references
        const table_element = this.element.querySelector(`#${table_uuid}`);
        this.add_button = this.element.querySelector(`#${button_uuid}`);

        this.fapiList = new FapiItemListWidget(table_element);
        this.form = new FormWidget(randomID(), "Add Item"); // note datamodel_create signal is connected here to set the fields
        this.fapiList.signals.edit_datum.connect((datum) => {
            this.form.current_datum_slot(datum);
            this.form.update_slot();
        })
        this.fapiList.signals.delete_datum.connect((datum) => {
            // alert .. if ok, then emit
            let userConfirmed = confirm("Are you sure you want to proceed?");
            if (userConfirmed) {
                // User clicked "OK"
                this.signals.delete_datum.emit(datum)
            } else {
                // nada
            }
        })
        // "Add" click handler
        this.add_button.onclick = () => {
            this.form.create_slot()
        };
     }
}
