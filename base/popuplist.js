// File: popup_list_widget.js

import { Widget, Signal, randomID, isDOMElement } from './widget.js';

class PopupList extends Widget {
    /*//DOC
    A minimal pop-up window that shows a small list
    ctor parameter can be a global id or a DOM element
    */
    constructor(id) {
        super(id);
        this.createElement();
        this.items = [];
    }

    createSignals() {
        this.signals.itemSelected = new Signal(`Emitted when an item is selected. Carries an object:
            item: name of the item in the list
            datum: a cached datum that has been set with set_datum_slot
            `);
        this.signals.closed = new Signal(`Emitted when the popup is closed.  Carries the cached datum.`);
    }

    show_slot(x, y) {
        this.log(-1, "show_slot", this.popup);
        this.popup.style.left = `${x}px`;
        this.popup.style.top = `${y}px`;
        super.show()
        this.show_timer = performance.now();
    }

    hide_slot() {
        this.log(-1, "hide_slot");
        this.signals.closed.emit(this.datum);
        super.hide()
    }

    set_datum_slot(datum) {
        this.log(-1, "set_datum_slot");
        this.datum = structuredClone(datum);
    }

    createElement() {
        console.log("popuplist: createElement", this.id);
        if (isDOMElement(this.id)) { // TODO: document this trick
            // take as a basis an html DOM object directly
            this.element = this.id // i.e. Widget.element that is a DOM object
        }
        else { // .. or resolve the html DOM object, based on an id
            this.element = document.getElementById(this.id);
            if (this.element == null) {
                this.err("could not find element with id", this.id);
                return;
            }
        }
        
        console.log("populist element>", this.element);

        const popupId = randomID();
        const listId = randomID();

        this.element.innerHTML = `
            <div id="${popupId}" class="popup" style="position: fixed; z-index: 1000; 
                background: white; border: 1px solid #ccc; padding: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.2);">
                <ul id="${listId}" style="list-style-type: none; padding: 0; margin: 0;"></ul>
            </div>
        `;

        this.popup = this.element.querySelector(`#${popupId}`); // TODO: ALWAYS USE THIS INSTEAD OF document.getElement
        console.log(">> PopupList: this.popup", this.popup);
        this.list = this.element.querySelector(`#${listId}`);
        
        // Close popup when clicking outside
        document.addEventListener('click', (event) => {
            if ((performance.now() - this.show_timer) > 100 && !this.popup.contains(event.target) && event.target !== this.element) {
                this.log(-1, "clicked outside. visibility state:", this.isVisible());
                this.hide_slot();
            }
        });
        super.hide();
    }

    createState() {
        this.show_timer = 0;
        this.datum = null;
    }

    setItems(items) {
        this.items = items;
        this.renderList();
    }

    renderList() {
        this.list.innerHTML = '';
        this.items.forEach((item, index) => {
            const li = document.createElement('li');
            li.innerHTML = item;
            li.style.cursor = 'pointer';
            li.style.padding = '5px';
            li.onmouseover = () => li.style.background = '#f0f0f0';
            li.onmouseout = () => li.style.background = 'white';
            li.onclick = () => {
                this.signals.itemSelected.emit({
                    item: item,
                    datum: this.datum
                });
                this.hide_slot();
            };
            this.list.appendChild(li);
        });
    }    
}

export { PopupList };
