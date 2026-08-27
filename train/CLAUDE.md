## Synopsis

Hi Claude!

Let's do some development with CuteFront.  It is a pure-javascript and HTML framework.  It is similar to the Qt desktop framework.  

This file is either a preamble of a small dump of the CuteFront library I have given you or alternatively you get this file independently and then you can decide which parts of the library you want to study in more detail.

Let's summarize how CuteFront works.

Widgets are written in javascript.  CSS and HTML from bootstrap version 5 are used.

A Widget creates it's corresponding HTML code to the DOM with javascript.

Widgets emit signals.

Widgets have slots for receiving signals from other widgets.

Code for each widget resides in a separate .js file.  We want to use some strict naming conventions:

- A widget class named "SomeWidget" or "Some" would live in a file "some.js".
- An instance of "SomeWidget" should have the name "someWidget".

Each widget has a corresponding html file with the same name (example: "some.html") for basic testing.  These testing files
should be very basic html without any "eye candy" or fancy css styling.  The idea is that the user can see easily how the widgets are used
from html.

The idea is, that widgets have their own, well-separated and documented API and they only interact with the outside world using signals and slots.

When user interacts with a widget (say, with a click or typing something), the widget's **internal state is changed** (say, contents of a text field or a radio button state).  This interaction can result in a signal being emitted.

When a widget receives a signal to a slot, this typically results in its internal state (and its HTML) being changed.

The state of the widget is cached in widget's HTML elements (say, the state of a radio button).  This is the preferred
way to maintain the state.  If needed, some part of the state can also be cached to internal member variables (say, `this.some_boolean_flag`, etc.).

When creating single-page applications with complex interactions between widgets, the signals and slots between widgets instances are explicitly connected in the main html file.

## Gold-standard example widget

Now I will give you an example how to define a basic widget class `HateLike`.

The implementation is in file `hatelike.js` and it's accompanying html file in `hatelike.html`.  `hatelike.js` is a brief "gold" standard
example widget, with the latest ideas in widget organization and API declaration.

You MUST read at least these two files:

./hatelike.js
./hatelike.html

Please READ THEM NOW.

Next, let's take a look at some widgets in the base library.  Remember that CuteFront is still a work in progress and some of the files
might not have all the correct docstrings, etc. but we want to get there.

Said that, these are widget classes in the base library you should take a look at:

```bash
../base/group.js
../base/formwidget.js
../base/listwidget.js
../base/sidebarwidget.js
../base/tabwidget.js
```
(and the corresponding html files).

## Testing Widgets

Each test html file can be run in chrome with the `--allow-file-access-from-files` parameter to visualize an individual widget.

More complex single-page applications (SPAs) can also be opened in the same way: the page has internal logic so that it goes into debug state
when opened as a file.  In the debug state it typically uses mock datasources, adds testing panels, etc.
          
Claude: YOU can use this too: there is a custom tool named "cute-browser" where you get "hands and eyes" on the web-page and browsing!  Please try this for more info:
```bash
cute-browser --help
```
For local testing, you should use the `--local` flag that allows local js file access.
To emphasize: `cute-browser` is meant for LLM agents like you (not for humans) so that you can quick-test the page.
Please start always with `cute-browser --help` to get an idea how the tool works.

You can remove additional testing panels by defining these URL-encoded parameters when opening the SPA html file:
```
network-testing=false
test-panel=false
```

I, for my part, can use the "device toolbar" feature in the chrome's developer panel.  However, in order for us to get consistent results, it is important that the html files have this one defined:
```html
<meta name="viewport" content="width=device-width, initial-scale=1">
```

## Subwidgets and subobjects

Widgets can have subwidgets (i.e. widgets enclosed in a "mother" widget), and subwidgets their own subwidgets, etc. in a hierarchical manner.

Subwidgets that can/should be accessed by the API user are grouped under the `widgets` namespace, i.e. in a `GroupWidget` instance you could access them like this:
`groupWidget.widgets.tabWidget1` and then deeper into the hierarchy like this: `groupWidget.widgets.tabWidget1.widgets.someOtherSubwidgetInstance`, etc.

Here are all subobjects/functions the user can access, grouped under their corresponding namespaces:

- subwidgets under the `widgets` namespace
- all methods ending with the name `_slot`
- signals under the `signals` namespace
- Input fields under the `input_fields` namespace

There are also subobjects/widgets not supposed to be accessed by the API user.

Take for example the ListWidget that owns ListItemWidget(s).  ListWidget creates child widgets on-the-fly and caches them into a list.  It can then query the ListItemWidget(s) HTML DOM element from their ``getElement()`` and attach it to it's own DOM tree / remove it from it's own DOM tree when necessary.  For more details, take a look into `../base/listwidget.js`.

For an example on how to compose a page of complex nested widgets, please take a look into `./landing.html` and `./layout.html`.  

The complex hierarchy of a widget can be visualized with the `cute-get-api-tree` tool (which you might want to use).

For example, in `./landing.html` we have this line:
```html
window.genDocs = ["container", "itemDataSourceWidget","userDataSourceWidget","authUserFloaterWidget"]
```
Now we can do this:
```bash
cute-get-api-tree landing.html
```
It takes the widget instances named "container", "itemDataSourceWidget", etc., dumps their API (signals, slots, subwidgets, etc.) into a hierarchical yaml file into the stdout.

### Composing a widget out of other widgets

A "composite" widget owns other widgets as internal members instead of (or in addition to) its own plain HTML. Conventions, confirmed against a real-world example (`fullstack-fastapi-cutefront`'s `AdminSection`):

- If the composite widget is meant to place itself (rather than hook into a pre-existing DOM element the caller provides), its constructor takes no `id` and calls `super(null)`:
```js
class AdminSection extends Widget {
    constructor() {
        super(null); // floating element - autoElement() will create one
        this.createElement();
        this.createState();
    }
```
- Subwidgets are constructed in `createElement()` and stored under `this.widgets.name`, same as any other subwidget access rule above. A subwidget can be constructed either the usual way (an id string, hooking an element already in this widget's own HTML) or by handing it a live DOM element reference directly - both are valid, pick whichever is more convenient for how the child widget renders itself:
```js
this.widgets.userList = new UserListWidget(table_element); // element reference
this.widgets.form = new FormWidget(randomID(), "Add User"); // id string
```
- **Exposing a child's signal as your own: expose it directly**, by assigning the same `Signal` object rather than relaying it through a `connect()` + re-`emit()` pair:
```js
this.signals.create = this.widgets.form.signals.create;
this.signals.update = this.widgets.form.signals.update;
```
  This is the confirmed convention (not the relay-through-connect alternative) - it's cheaper and callers connecting to `adminSection.signals.create` are connecting to the exact same `Signal` instance the child widget emits on, no indirection.
- Wiring between two subwidgets of the same composite (as opposed to a signal being re-exposed outward) still uses the normal explicit `connect()` syntax, just written inside the composite's own `createElement()` instead of in the page-level HTML:
```js
this.widgets.userList.signals.edit_datum.connect((datum) => {
    this.widgets.form.current_datum_slot(datum);
    this.widgets.form.update_slot();
});
```
- A composite can forward an incoming slot call straight to a child's slot of the same name, when there's nothing of its own to do first:
```js
datamodel_slot(schema) { // forwards to formWidget, no transformation needed
    this.widgets.form.datamodel_slot(schema);
}
```

## Forms and fields

When creating forms for user input data, we have several options:

- Create the form from scratch as an independent widget
- Create the form from scratch, but use ready-made `FormField` classes from `../base/formfield.js`
- Define data structures and necessary `FormField` classes in the `DataModel` class (see below) for adaptable input forms

To make testing easier, each `FormField` has `fillValid()` and `fillInvalid()` methods to fill them with valid or invalid data.
These can then be used by the composite/mother widgets to fill individual fields automatically for testing purposes.

Composite widgets should have slot `set_debug_slot()`.  Calling this slot will set the widget into a debug state that renders two extra
buttons "fillValid" and "fillInvalid" that are used to fill in the form with in/valid data.

More complex testing panels can be implemented in the main html file itself.

## Backend data

How data is received from the backend and inserted to the widgets, is handled by datasource widgets.

For a minimal, self-contained example with no `DataModel` involved - just a `GET`, a `POST` with a
JSON body, and a `POST` with `multipart/form-data`, wired purely through signals & slots - read:

./backendexample.js
./backendexample.html

Please READ THEM NOW.  The header comment in `backendexample.js` also documents the helper methods
and signals already available on the base `DataSource`, `HTTPDataSource` and `DataSourceWidget`
classes, so you don't need to go digging through those base files just to find out what's already
there:

```
../base/datasource.js : `DataSource` defines CRUD operations, and its `MockDataSource` subclass lets you fake a backend for testing
../base/httpdatasource.js : `HTTPDataSource` : HTTP implementation of the datasource
../base/datasourcewidget.js : `DataSourceWidget` coordinates UI interaction and signals and slots of a datasource
```

### More advanced: DataModel, adaptive forms, auth & pagination

Real backends usually need more than `backendexample.js` shows:

```
../base/datamodel.js : `DataModel` defines the structure of the data records, and can drive adaptive forms (see "Forms and fields" above)
../base/authmodel.js : `AuthModel` is an authentication model for httpdatasource (injects auth data into the request, say, a token)
```

```js
const itemDataModel = new ItemDataModel(); // defines what datarecords have .. subclassed from DataModel
const itemDataSource = new MockDataSource().setDataModel(itemDataModel).setUUIDKey("id"); // 
const itemDataSourceWidget = new DataSourceWidget('item-datasource-widget', itemDataSource);
```
`HTTPDataSource` class also has these methods for the advanced cases:
```js
setBaseUrl(url)
setAuthModel(authModel) 
setPaginationStrategy(strategy) 
```
What we typically do, is to create mock data sources that imitate the actual datasources and then finally switch from the mock
to the actual (http(s)) datasource.

None of this - `DataModel`, `AuthModel`, pagination, adaptive forms - is covered in this training
material. For a real, working example of all of it wired together, take a look at `./landing.html`
and `./layout.html` in this same folder (as mentioned above) - though note that the widgets they use
(`ItemDataSourceWidget`, `AuthUserFloaterWidget`, etc.) are app-specific widgets ripped from a real
project, not part of this training library, so don't expect matching `.js`/`.html` training pairs
for them here.

For the full picture, including the actual FastAPI backend these widgets talk to: ask me for the
directory of the fullstack FastAPI example project. I haven't given it to you by default, but I'm
happy to point you to it or grant access when you actually need to dig into it.

## State Management

Widgets can serialize their state to the browser's URL address bar, enabling:

- Bookmarkable/shareable URLs with widget state
- Browser back/forward navigation between states

### Widget Serialization API

Widgets wanting to participate in state serialization must:

1. Define the `state_change` signal:
```js
createSignals() {
    this.signals.state_change = new Signal("State change. Carries { serializationKey, serializationValue, write }");
}
```

2. Configure serialization in the HTML file (chainable API):
```js
myWidget.setSerializationKey("mykey")   // URL parameter name
        .setSerializationWrite(true);    // true = create history entries, false = only update URL
```

3. Override these methods in the widget class:
```js
getSerializationValue() { // return serialized state as a string
    return this.someValue.toString();
}
setState(serializationValue) { // deserialize and apply state (validate first!)
    const val = parseInt(serializationValue);
    if (!isNaN(val)) {
        this.someValue = val;
    }
}
```

4. Call `this.serialize()` whenever the widget's state changes and should be saved:
```js
this.button.onclick = () => {
    this.someValue++;
    this.serialize(); // emits state_change signal
};
```

### StateWidget

`StateWidget` manages URL state for all registered widgets:

```js
const stateWidget = new StateWidget();
stateWidget.register(widget1, widget2, widget3); // registers and connects automatically
```

The `register()` method:
- Reads each widget's `serializationKey` via `getState()`
- Connects each widget's `state_change` signal to StateWidget's `change_state_slot`
- Pulls existing state from URL and applies to widgets via `setState()`
- Sets up browser back/forward button handling

When a widget calls `serialize()`:
- If `serializationWrite` is true: creates new browser history entry (`push()`)
- If `serializationWrite` is false: just caches the serialization value, but doesn't create a new entry into browser history

On browser back/forward: StateWidget calls each widget's `setState()` with the restored value.

See `../base/statewidget.html` for a working example.

### localStorage-backed state (an alternative to URL state)

Not every piece of widget state belongs in the URL. A user preference like a light/dark theme
toggle should persist across sessions and devices-in-the-same-browser, but it has no reason to be
shareable/bookmarkable or to create browser-history entries the way page navigation state does -
so it doesn't belong in the Widget Serialization API above. For state like this, read/write
`localStorage` directly instead:

```js
const STORAGE_KEY = 'my-app-theme';

createState() {
    this._theme = localStorage.getItem(STORAGE_KEY) === 'night' ? 'night' : 'day'; // default
    this._applyTheme(this._theme); // apply immediately, don't wait for user interaction
}

_setTheme(theme) {
    this._theme = theme;
    localStorage.setItem(STORAGE_KEY, theme);
    this._applyTheme(theme);
    this.signals.themeChanged.emit(theme); // still emit a signal, even with nothing connected yet
}
```

A real-world reference split across two widgets (from a full CuteFront app, not this training
library) shows the two roles this can take:
- An invisible, no-DOM widget (`ThemeWidget`) owns the `localStorage` key and applies the resulting
  state globally (e.g. setting `data-bs-theme` on `<html>` for Bootstrap 5.3+'s dark mode) -
  instantiated early, before any other widget, so there's no flash of the wrong theme.
- A separate, purely visual widget (`AppearanceWidget`) renders the actual toggle/radio UI and only
  emits a signal when the user changes it - it has no idea `localStorage` exists.

Splitting the two makes sense when the applied state needs to exist before other widgets render
(avoiding a flash), or when more than one UI entry point should drive the same stored value. If
neither applies - a single toggle behind one settings panel, applied immediately on click, no
flash-of-wrong-state to avoid - it's simpler to merge both roles into one widget instead: read/
apply the stored value in `createState()`, and apply-and-save together in the click handler, same
as the snippet above.

Either way, the same "no edit-switch, always applies" character used elsewhere in these docs
applies here too: there's no commit-on-close step, since there's nothing to protect the user from
overwriting - each change is just saved immediately.

## Timing-Independent Slots (Slot Timing Independence)

When implementing slots that depend on other asynchronous operations, use a timing-independent pattern to avoid race conditions.

### Problem

Consider a widget that needs two things to happen before it can perform an action:
1. `activate_debug_slot()` is called (user requests debug mode)
2. `datamodel_slot(schema)` is called (data arrives from backend)

These can happen in **any order** because they're asynchronous. If debug activation depends on the datamodel existing, it may fail if called first.

### Solution Pattern

Decouple the operations using flags and a shared helper method:

```js
createState() {
    this.datamodel = null;
    this.debug_mode_activated = false; // Flag: has activate_debug_slot been called?
    this.debug_buttons_added = false;  // Flag: are debug features in the DOM?
}

activate_debug_slot() {
    // Set the flag that debug mode has been requested
    this.debug_mode_activated = true;

    // If datamodel already exists, set up features now
    if (this.datamodel != null) {
        this._setupDebugFeatures();
    }
    // Otherwise, wait for datamodel_slot to call it
}

datamodel_slot(datamodel) {
    this.datamodel = datamodel;
    // ... create form fields ...

    // Check if debug mode should be activated now that we have a datamodel
    if (this.debug_mode_activated) {
        this._setupDebugFeatures();
    }
}

_setupDebugFeatures() {
    if (this.debug_buttons_added) return; // Idempotency guard

    // Actually add debug buttons and activate features
    // ...

    this.debug_buttons_added = true;
}
```

### Key Principles

1. **Intent flags** (`debug_mode_activated`): Track what has been *requested*
2. **State flags** (`debug_buttons_added`): Track what has been *completed*
3. **Condition checks**: Each slot checks if conditions are met
4. **Shared helper**: Both slots call the same helper method when conditions are satisfied
5. **Idempotency guard**: Helper returns early if already executed

This pattern works **regardless of call order**:
- If `activate_debug_slot()` → `datamodel_slot()`: Helper called from `datamodel_slot()`
- If `datamodel_slot()` → `activate_debug_slot()`: Helper called from `activate_debug_slot()`

See `../base/formwidget.js` for a real implementation.

## Conclusions

I hope you got it!

If I ask for new widgets, please always provide me with both the .js and accompanying .html files.

I know you're excited, but please do not provide any files if I don't ask for it explicitly.  :)

I might also ask you to take a look at the web-page rendering.  All test html files can be rendered in file mode


Thank you!
