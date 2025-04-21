/*LLM: Beginning of file "hatelike.js"

This file defines a widget class "HateLike" with a collapsable bootstrap accordeon.  Within the accordeon, there is a radio button
with two choises: "I like it" and "I hate it".  There is also a text field that shows how many times the user has
clicked either "I like it" or "I hate it".  Each like increments the text field value by one, while each hate decreases it by one.

Each time a user clicks any of the radio buttons, a text message signal is also emitted from the widget.  This can be connected to other widget instances.

The widget also has a slot that receives a text message signal from some other widget.  If the incoming signal text includes the word "like" then the
text field value is incremented by one, if it includes text "hate", then it is decreased by one.
*/
import { Widget, Signal, randomID } from '../lib/base/widget.js';

/*LLM: Widget is the base class for all widgets.
Please, put always the methods described below in the same order:
constructor, createSignals, _slot functions, createState, createElement
The class, signals and slots should be documented with a string starting
with "//DOC" to facilitate autodocumentation

Note how withing the DOC section we declare the API of signals and slots with:

API
```yaml
signals:
    message: carries a string
slots:
    input_text_slot: receives a string
```

If the signal or slot parameters would have some internal object structure we should do this:

API
```yaml
signals:
    message:
        title: title of the message
        data: data of the message
slots:
    input_text_slot:
        title: title of the message
        data: data of the message
```

*/
class HateLike extends Widget { /*//DOC
    Has two radio buttons with choices "I Like it" and "I hate it".
    Shows a text field how many times it has been liked or hated.

    API
    ```yaml
    signals:
        message: carries a string
    slots:
        input_text_slot: receives a string
    ```
    */
    constructor(id) { // LLM: Usually, the constructor should only accept a single parameter (id).
        /* LLM: The id parameter is an html element's id attribute that is used to identify this.element in createElement() method
        default values for internal state should be set in the createState() method instead
        */
        super(id); // LLM: calls createSignals() and sets this.id = id
        this.createElement();
        this.createState();
    }
    createSignals() { /* LLM: Define signals sent by this widget.
    After each signal definition, there should be a comment what the signal carries and what it is about.
    This method must always be defined, even it the widget didn't use any signals, in which case it is just an empty function.
    If this class inherits signals, don't forget to call the parent classes createSignals method.
    */
        // super.createSignals(); // LLM: add if necessary
        this.signals.message = new Signal(); /*//DOC Carries a string.  Message that depends which radiobutton has been clicked. */
    }
    /* LLM: Next define slots where this widget can receive signals from other widgets.
    Please use always the "snake-case" syntax for slots and always include "_slot" in the name of the function,
    for example in this case, instead of "inputTextSlot", the name is "input_text_slot".
    Each slot should have a comment that describes what kind of datatype and/or what kind a nested json object scheme it expects.
    You can even implement type and json scheme testing.
    */
    input_text_slot(txt) { /*//DOC
        Receives a text message from another widget
        Input txt is a string
        */
        // this.txt = structuredClone(txt) // LLM: if we would cache the data coming with the signal, we should make an immutable copy of it
        if (txt.includes("like")) {
            this.flike()
        }
        else if (txt.includes("hate")) {
            this.fhate()
        }
        /* LLM: if the parameter for the slot would need to have some complex structure, declare it in the DOC section like this:
        ```yaml
        txt:
            title: title of the message
            data: data of the message
        ```
    }
    createState() { /* LLM: Initializes state variables created by createElement (see below).
        Creates additional state variables if necessary.
        */
        if (this.element == null) { // LLM: this check must always be included
            return
        }
        // this.txt = null // LLM: if we would cache in the state the text received in function input_text_slot 
        // LLM: state variables created in createElement (see below):
        this.counter_field.innerHTML='0'
        this.like.checked = true; // initial value: the "I Like it" radio button is enabled
    }
    createElement() { /* LLM: Hooks into an existing html element and creates dynamically the html of this particular widget into the DOM.
        Fields of the DOM elements of the dynamically created widget html are used as member state variables of the widget.
        Callbacks are also attached to buttons, etc. interactive elements.
        */
        this.element = document.getElementById(this.id)
        if (this.element == null) { // LLM: this check must always be included
            this.err("could not find element with id", this.id)
            return
        }
        /* LLM: Generate some UUIDs.  These are required for unique "id" attributes for the html elements.
        When a new widget is instantiated, each one of them should have their own unique set of html elements identified by a unique "id" attribute.
        Same goes for html # targets.
        */
        let head=randomID();
        let ctarget=randomID();
        let name=randomID();
        let uuid1=randomID();
        let uuid2=randomID();
        let uuid3=randomID();
        // LLM: Create the HTML corresponding to this widget
        this.element.innerHTML=`
        <div class="accordion-item">
            <h2 class="accordion-header" id="${head}">
                <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#${ctarget}" aria-expanded="true" aria-controls="${ctarget}">
                    Do you like CuteFront?
                </button>
            </h2>
            <div id="${ctarget}" class="accordion-collapse collapse show" aria-labelledby="${head}" data-bs-parent="#${this.id}">
                <div class="accordion-body">
                    <div class="btn-group-vertical" role="group" aria-label="Basic radio toggle button group">

                        <input type="radio" class="btn-check" name="${name}" id="${uuid1}" autocomplete="off">
                        <label class="btn btn-outline-primary" for="${uuid1}">I like it</label>
                    
                        <input type="radio" class="btn-check" name="${name}" id="${uuid2}" autocomplete="off">
                        <label class="btn btn-outline-primary" for="${uuid2}">I hate it</label>

                        <p>Overall points:<div id="${uuid3}"></div></p>
                    </div>
                </div>
            </div>
        </div>
        `
        // LLM: Get handles to relevant DOM elements and use them as member state variables
        let inputs = this.element.getElementsByClassName("btn-check");
        this.counter_field = document.getElementById(uuid3);
        this.like = inputs[0];
        this.hate = inputs[1];
        this.like.onclick = (event) => { // LLM: use always the "= (event) => {}" syntax
            this.flike();
            this.signals.message.emit("I like Cutefront")
        }
        this.hate.onclick = (event) => { // LLM: use always the "= (event) => {}" syntax
            this.fhate();
            this.signals.message.emit("I hate Cutefront")
        }
    }
    flike() {
        /* LLM: Note how we are using the DOM html element value this.counter_field.innerHTML as a state variable
        instead of creating an additional state variable (say, this.counter).
        Prefer always DOM html element values themselves as state variables.
        */
        let i = parseInt(this.counter_field.innerHTML) + 1;
        this.counter_field.innerHTML = i.toString();
        this.err("report an error")
        // Logging is done like this:
        // this.log(0, "some normal-level logging")
        this.log(-1, "flike called");
    }
    fhate() {
        let i = parseInt(this.counter_field.innerHTML) - 1;
        this.counter_field.innerHTML = i.toString();
    }
    getCount() { // LLM: if we'd need to query the widget about the state of the counter
        return parseInt(this.counter_field.innerHTML);
    }

} // HateLike

/* LLM: Please note that createElement() is used strictly for generating the HTML code and 
to get handles of the relevant DOM elements into member variables (for example, this.like, this.counter_field.innerHTML, etc.)

You should set values of the DOM elements in createElement().

Modifying the state and setting DOM element values should be done outside createElement(), for example in createState() and other
functions called by the _slot functions.
*/

export { HateLike }
/*LLM: End of file "hatelike.js" */
