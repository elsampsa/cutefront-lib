Hi!  Let's do some development with CuteFront.  It is a pure-javascript and HTML framework.  It is similar to the Qt desktop framework.  Let's summarize how it works:

Widgets are written in javascript.  CSS and HTML from bootstrap version 5 are used.

A Widget creates it's corresponding HTML code to the DOM with javascript.

Widgets emit signals.

Widgets have slots for receiving signals from other widgets.

Code for each widget resides in a separate .js file.  We want to use some strict naming conventions:

- A widget class named "SomeWidget" or "Some" would live in a file "some.js" or "some_widget.js".
- An instance of "SomeWidget" should have the name "someWidget".

Each widget has a corresponding html file with the same name (example: "some.html") for basic testing.  These testing files
should be very basic html without any "eye candy" or fancy css styling.  The idea is that the user can see easily how the widgets are used
from html.

Signals and slots between widgets instances are explicitly connected in the main html file.

When user interacts with a widget (say, with a click or typing something), the widget's internal state is changed (say, contents of a text field or a radio button state).  This interaction can result in a signal being emitted.

When a widget receives a signal to a slot, this typically results in its internal state (and its HTML) being changed.

The state of the widget is cached in widget's HTML elements (say, the state of a radio button).  This is the preferred
way to maintain the state.  If needed, some part of the state can also be cached to internal member variables (say, this.some_boolean_flag, etc.).

Now I will give you an example how to define a basic widget class `HateLike`.

The implementation is in file `hatelike.js` and it's accompanying html file in `hatelike.html`.  `hatelike.js` is the "gold" standard
example widget, with the latest ideas in widget organization and API declaration.  

Next, let's take a look at some widgets we in the base library.  Remember that CuteFront is still a working progress and some of the files
might not have all the correct docstrings, etc. but we want to get there.

Said that, these are widget classes in the base library you should take a look at:

```
../base/group.js
../base/formwidget.js
../base/listwidget.js
../base/sidebarwidget.js
../base/tabwidget.js
```
(and the corresponding html files)

How data is received from the backend and inserted to the widgets, is handled by datasource widgets.  Please see these files:
```
../base/datamodel.js : `DataModel` defines the structure of the data records
../base/datasource.js : `DataSource` defines CRUD operations.  Provides also the class `DummyDataSource`.
../base/httpdatasource.js : `HTTPDataSource` : HTTP implementation of the datasource
../base/datasourcewidget.js : `DataSourceWidget` coordinates UI interaction and signals and slots of a datasource
../base/authmodel.js : `AuthModel` is an authentication model for httpdatasource (injects auth data into the request, say, a token)
```

```js
const itemDataModel = new ItemDataModel(); // defines what datarecords have .. subclassed from DataModel
const itemDataSource = new DummyDataSource().setDataModel(itemDataModel).setUUIDKey("id"); // 
const itemDataSourceWidget = new DataSourceWidget('item-datasource-widget', itemDataSource);
```
`HTTPDataSource` class has these methods:
```js
setBaseUrl(url)
setAuthModel(authModel) 
setPaginationStrategy(strategy) 
```
Finally, let's talk about child/parent widgets.

A typical example would be a list (= basic / parent widget) that owns list items (= child widgets).  In that case, 
the parent widget would create child widgets on-the-fly and cache them into a list.  It can then query it's child widget's HTML DOM element from their ``getElement()`` and attach it to it's own DOM tree / remove it from it's own DOM tree when necessary, etc.  That `../base/listwidget.js` is a good example.

Please take also a look into `./sections.js` for an example of a nested widget structure: there a widget creates in its `createElement` method
child widgets and attaches their HTML code into its internal HTML.  In `./layout.html` you have an example
how the signals and slots are connected for that case.

I hope you got it!  Briefly, I will ask you for widgets.  Please, always provide me with both the .js and accompanying .html files.  

I know you're excited, but please do not provide any files if I don't ask for it explicitly.  :)

Thank you!
