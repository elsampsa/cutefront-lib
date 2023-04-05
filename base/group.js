import { Widget } from './widget.js';

class Group extends Widget {
    // hide/show widgets as a group
    constructor() {
        super(); // calls createSignals automagically
        this.createElement();
        this.createState();
    }
    // UP: signals
    createSignals() {
    }
    // IN: slots
    some_slot(par) {
        // permute state, send signals, do something with the elements
        // call methods that does all those things..
    }
    another_slot(obj) {
        // for slots that receive objects or arrays,
        // before permuting them, create a mutable copy
        // obj=obj.slice() // for arrays with simple objects
        // obj=structuredClone(obj) // for complete objects
    }
    createState() {
        this.items = [];
        this.visible = true;
    }
    createElement() {
    }
    setVisible(visible) { // set html element visible or not
        this.log(-1, "setVisible", this.items);
        this.visible = visible;
        for (const item of this.items) {
            // console.log(">", item, item.setVisible);
            item.setVisible(this.visible);
        }
    }
    isVisible() { // true: element is visible, false: it is hidden
        return this.visible;
    }
    setItems(...items) {
        // console.log(">>", items);
        this.items = items;
    }

} // Group

export { Group }
