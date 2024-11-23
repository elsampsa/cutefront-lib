import { Widget, Signal } from './widget.js';
import { Group } from './group.js';

class ContainerWidget extends Group {
    /*//DOC
    Manages main content area that can host multiple child widgets.
    Only one child widget is visible at a time.
    Child widgets create their own elements that are attached to this container.
    */
    constructor(id) {
        super(id);
        this.createElement();
        this.createState();
    }

    createSignals() {
        super.createSignals(); // Get the state_change signal from Group
    }

    createState() {
        super.createState();
    }

    createElement() {
        this.element = document.getElementById(this.id);
        if (this.element == null) {
            this.err("could not find element with id", this.id);
            return;
        }
        // Container stays empty - child widgets will be attached in setItems
    }

    setItems(...widgets) { /*//DOC
        Set the child widgets for this container.
        Each widget should be a fully initialized widget instance that
        creates its own element.
        */
        // First remove any existing child elements
        while (this.element.firstChild) {
            this.element.removeChild(this.element.firstChild);
        }
        // Attach each widget's element as a child to our container
        widgets.forEach(widget => {
            this.log(-1, ">", widget)
            if (!widget.element) {
                this.err("setItems: widget has no element");
                return;
            }
            this.element.appendChild(widget.element);
        });
        // Use Group's functionality to manage visibility
        super.setItems(...widgets);
    }
}

export { ContainerWidget };
