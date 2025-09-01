import { Widget, Signal } from './widget.js';

class Group extends Widget { /*//DOC
    Groups other widgets into group.  
    Only one widget from the group is shown at a time.  
    Other ones are hidden
    */
    constructor(id) {
        super(id);
        this.createElement();
        this.createState();
    }
    createSignals() {
        this.signals.state_change = new Signal("State de/serialization: state change");
    }
    stateToPar() { 
        /* state is encoded like this:
        0_1_2_ etc. i.e. numbers of
        all visible elements, separated with "_"
        */
        var s="";
        for (var i = 0; i < this.itemList.length; i++) {
            var item = this.itemList[i]
            if (item.isVisible()) {
                s=s.concat(`${i}_`)
            }
        }
        this.log(-1, "stateToPar", s)
        return s
    }
    validatePar(s) {
        // not a comprehensive check.. check at least it's a string
        this.log(-2, "validatePar", s)
        this.log(-2, "validatePar", typeof s === "string")
        return (typeof s === "string")
    }
    parToState(s) {
        this.log(-1, "parToState", s)
        // hide all
        for (const item of this.itemList) {
            item.setVisible(false);
        }
        // pick up which ones to show
        var nums=s.split("_")
        for (const num of nums) {
            let i=parseInt(num)
            if (!(isNaN(i))) {
                this.itemList[i].setVisible(true);
            }
        }
    }
    createState() {
        this.itemList = [];
        this.visible = true;
        this.listen_hash = true;
    }
    createElement() {
    }
    hide_all_slot() { /*//DOC Hide all widgets in this group*/
        for (const item of this.itemList) {
            item.setVisible(false);
        }
        this.stateSave()
    }
    show_all_slot() { /*//DOC Show all widgets in this group*/
        for (const item of this.itemList) {
            item.setVisible(true);
        }
        this.stateSave()
    }
    show_slot(item) { /*//DOC 
        Hide all other widgets, show widget item
        */
        if (this.itemList.includes(item)) {
            for (const item_ of this.itemList) {
               if (item_ == item) {
                    item_.setVisible(true);
               }
               else {
                    item_.setVisible(false);
               }
            }
            // item.setVisible(true);
        }
        this.stateSave()
    }
    setItems(itemsObject) { /*//DOC
        Set all the items belonging to this group.  Example:
        setItems({ home: home, settings: settings })
        */
        this.widgets = itemsObject;
        this.makeList();
    }
    makeList() {
        this.itemList = Object.values(this.widgets);
        for (const item of this.itemList) {
            item.setVisible(false);
        }
        if (this.itemList.length >= 1) {
            this.itemList[0].setVisible(true)
        }
    }

} // Group

export { Group }
