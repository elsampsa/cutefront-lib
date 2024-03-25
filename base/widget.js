/* This file has:

- Helper functions
- The base class implementation "Widget" for all CuteFront widgets
*/

// first, some generic helper functions

function assertKeys(keys, obj) { // check an object for keys
    keys.forEach(key => {
        if (!obj.hasOwnProperty(key)) {
            console.trace()
            throw(`missing key ${key}`)
        }
    })
}

function boxify(element) { // modify an html element so that it has visible boxes all around it
    if (element == undefined) {
        element=document.getElementsByTagName("body").item(0)
    }
    element.classList.add("border")
    element.classList.add("border-primary")
    var children = element.children;
    for (var i = 0; i < children.length; i++) {
        boxify(children[i]);
    }
}


function getPageParameters() { // get the URLencoded parameters as a dictionary
    var url = new URL(document.documentURI);
    var obj = new Object()
    for (const [key, value] of url.searchParams) {
        // console.log(key,":", value)
        obj[key] = value
    }
    return obj
}

function equalSets(setA, setB) { // check if two sets are equal
    for (const elem of setB) {
      if (!setA.has(elem)) {
        return False
      }
    }
    return True
}

function uuidv4() { // generate uuid version 4
    // as per https://stackoverflow.com/questions/105034/how-do-i-create-a-guid-uuid
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
  }

function csv2obj(str) { // split a string like this: "orange=1,banana=2,apple=3" into an object {orange:1, banana:2, apple:3}
  var obj = new Object()
  if (str.length < 1) {
    return obj;
  }
  str.split(",").forEach(function(substring) {
    let parts = substring.split("=");
    obj[parts[0]] = parseInt(parts[1]);
  });
  return obj
}

function obj2csv(obj) { // inverse of csv2obj
    return Object.entries(obj)
        .map(([key, value]) => `${key}=${value}`)
        .join(",");
}


class Widget { /* The Base class implementation for CuteFront Widgets

    Subclass should always call this superclasses ctor.
    Parameter id is the id of the html element to which this widget attaches to.
    */
    constructor(id) {
        this.id = id
        this.loglevel = 0; // 0 = normal.  smaller: useless, bigger: usefull
        this.signals = new Object(); // i.e. json
        this.createSignals();
    }
    createElement() { // set the html element corresponding to this component
        this.err("you must subclass createElement");
        // the main html element dom object shall be in the member this.element
    }
    createState() {
        this.err("you must subclass createState");
    }
    deleteState() { // remove any mem reserving state variables if necessary
    }
    deleteElement() { // remove any html element(s) if necessary
    }
    createSignals() { // This must be subclassed
        this.err("you must subclass createSignals");
    }
    setVisible(visible) { // set the widget's html element visible or not
        this.log(-1, "setVisible", visible)
        if (!(typeof visible === 'boolean')) {
            this.err("need boolean value")
        }
        if (this.element) {
            if (visible) {
                if (this.isVisible()) { // already visible
                    // this.log(-2, "already visible");
                    // return
                }
                else {
                    // recoved saved visibility style
                    // this.log(-2, "style.display: recovering", this.style_display_saved);
                    this.element.style.display = this.style_display_saved
                }
            }
            else { // need to hide
                if (!this.isVisible()) { // already hidden
                    // this.log(-2, "already hidden");
                }
                else {
                    // this.log(-2, "will save style.display:",this.element.style.display)
                    this.style_display_saved = this.element.style.display // save current visibility style
                    this.element.style.display = "none";
                }
            } // if visible
            if (!visible) {
                //this.log(-1, "setVisible: calling hideCallback", visible)
                this.hideCallback()
                }
            else {
                //this.log(-1, "setVisible: calling showCallback", visible)
                this.showCallback()
            }
        } // element
    }
    hideCallback() {
    }
    showCallback() {
    }
    isVisible() { // true: element is visible, false: it is hidden
        if (this.element) {
            return this.element.style.display != "none";
        }
    }
    hide() {
        this.setVisible(false);
    }
    show() {
        this.log(-1, "show")
        this.setVisible(true);
    }
    setStyles(obj) { // helper: set css style attributes
        if (this.element) {
            Object.entries(obj).forEach( // javascript
            ([key, value]) => {
                this.element.style[key] = value
            })
        }
    }
    getStyle(key) {
        if (this.element) {
            return this.element.style[key]
        }
    }
    addClasses(...classnames) { // helper: add css classess
        if (this.element) {
            classnames.forEach(classname => { 
                this.element.classList.add(classname)
            })
        }
    }
    remClasses(...classnames) { // helper: remove css classes
        if (this.element) {
            classnames.forEach(classname => { 
                this.element.classList.remove(classname)
            })
        }
    }
    close() { // close this widget: remove all signal connections, delete state variables and finally the html element
        for (const [name, signal] of Object.entries(this.signals)) {
            signal.close();
        }
        delete this.signals;
        this.deleteState();
        this.deleteElement();
    }
    log(...args) { // logging helper.  Works like console.log
        // console.log("loglevel", this.loglevel, "args", args)
        if (args[0] < this.loglevel) {
            return;
        }
        args.splice(0, 1);
        args.unshift(this.constructor.name + ":" + this.id + ":");
        console.log(...args);
    }
    err(...args) { // error logging helper.  Works like console.error
        args.unshift(this.constructor.name + ":");
        console.error(...args);
    }
    setLogLevel(num) { // set the log level
        this.loglevel = num;
    }
    // state mangement methods follow
    stateSave() {
        var par = this.stateToPar()
        this.log(-1,"stateSave", par)
        // if (par != null && this.signals.state_change != null) {
        if (this.signals.state_change != null) { // par _can_ be null
            //let obj = {}
            //obj[this.id] = par
            const keyval = [this.id, par];
            this.signals.state_change.emit(keyval);
        }
        else {
            // this.err("did not emit state_save", par, this.signals.state_change)
        }
    }
    parToState(par) { // deserialize par and set the state of the widget
    }
    validatePar(par) { // check that a serialized state parameter is a legit one
        return true;
    }
    stateToPar() { // serialize state of the widget and return a par
        return null;
    }
}

class Signal {
    constructor() {
        this.callbacks=new Array(); // all registered callback functions for this particular signal
    }
    connect(method) { // register method that's called when emit is called
        this.callbacks.push(method);
    }
    disconnect(method) { //  deregister a callback function
        let i = this.callbacks.find(func => func == method);
        if (i>0) {
            this.callbacks.pop(i);
        }
        else {
            console.log("Signal: could not find method from callback list");
        }
    }
    emit(par) { // call all registered functions when signal is emitted
        this.callbacks.forEach(cb => {
           cb(par);
        });
    }
    close() { // close the signal: remove all callback connections
        delete this.callbacks;
    }
}


class ElementWidget extends Widget { /*//DOC
    Dummy widget: just register the html element for this widget
    */
    constructor(id) {
        super();
        this.id = id
        this.createElement();
        this.createState();
    }
    createSignals() {};
    createElement() {
        this.element = document.getElementById(this.id)
        if (this.element == null) {
            this.err("could not find element with id", this.id)
            return
        }
    };
    createState() {};
}

class DummyWidget extends Widget { /*//DOC
    A dummy debugging widget: everything that comes to the slot
    is just dumped to the console
    */
    constructor() {
        super();
        this.createElement();
        this.createState();
    }
    slot(par) { /*//DOC
        Everything coming to this slot is dumped to the debug console
        */
        this.log(0, "got ", par)
    }

    createSignals() {};
    createElement() {};
    createState() {};
}

class DumpWidget extends Widget { /*//DOC
    data arriving to slot is
    stringified & dumped into the DOM    
    */
    constructor(id) {
        super();
        this.id = id;
        this.createElement();
        this.createState();
    }
    slot(par) { /*//DOC
        Everything coming to this slot is dumped to the debug console but
        also stringified and dumped to the html element of this widget
        */
        this.log(0, "got ", par)
        this.element.innerHTML = JSON.stringify(par, null, '\t')
    }
    createSignals() {};
    createElement() {
        this.log(0, this.id)
        this.element = document.getElementById(this.id)
        this.log(0, this.element)
    };
    createState() {};
}

export { Widget, Signal, DummyWidget, DumpWidget, ElementWidget,
    assertKeys, getPageParameters, equalSets, uuidv4, boxify, csv2obj, obj2csv };
