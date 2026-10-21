/*
websocketdatasource.js

A datasource for pushed data: one websocket connection, channels multiplexed in it.

WebSocketDataSource        the real thing (a WebSocket)
MockWebSocketDataSource    same api, an in-memory server for file:// testing: same protocol code, a fake socket
WebSocketDataSourceWidget  signals & slots: connection state, subscriptions and requests for page-level wiring

Usage:

    const ws = new WebSocketDataSource().setUrl("../ws/");   // relative to the page: http(s) -> ws(s)
    const unsubscribe = ws.subscribe("block/12", (data, channel) => { ... }, { snapshots: true });
    ws.send("block/12", { some: "message" });                // fire & forget
    const reply = await ws.request("block/12", { q: 1 });    // rejects with {message, status: null, body}
    unsubscribe();

Widgets created on the fly (say, panels) are handed the datasource and call subscribe() themselves, like they'd call
the promise methods of an HTTPDataSource.  The WebSocketDataSourceWidget is for wiring a page with signals & slots.

The connection opens on the first subscribe() / open() and reconnects (setReconnect()): the subscriptions are sent
again, so a subscriber never notices a reconnect, except for the data it missed meanwhile.

=== Protocol (JSON text frames) ===

Client -> server:
  {op: "sub", sub: int, channel: str, params: {}}     subscribe.  sub: a subscription id, chosen by the client
  {op: "unsub", sub: int}
  {op: "msg", channel: str, data: any}
  {op: "req", rid: int, channel: str, data: any}      a request: the server replies with the same rid
Server -> client:
  {channel: str, data: any}                           to every subscription of the channel
  {sub: int, data: any}                               to one subscription (the server can address one subscriber)
  {rid: int, data: any} / {rid: int, error: str}      a reply

A server implementation: limef-streamer, limef/streamer/multiprocess/websocket/server.py (python websockets).
*/
import { DataSource } from './datasource.js';
import { DataSourceWidget } from './datasourcewidget.js';
import { Signal } from './widget.js';


class WebSocketDataSource extends DataSource { /*//DOC
    Pushed data over one websocket: subscribe(channel, callback, params) -> unsubscribe(), send(), request().
    The connection opens on the first subscribe() and reconnects.  Timeouts of request(): setTimeout() (DataSource)
    */
    constructor() {
        super();
        this.url = null;
        this.reconnect_ms = 2000;
        this.socket = null;
        this.connected = false;
        this.closing = false;          // close() was called: no reconnect
        this.next_sub = 1;
        this.subs = new Map();         // sub id -> {channel, callback, params}
        this.next_rid = 1;
        this.pending = new Map();      // rid -> {resolve, reject, timer}
        this.status_listeners = new Set();
        this.reconnect_timer = null;
    }
    setUrl(url) { /*//DOC
        :param url: ws:// or wss:// url, or relative to the page (say "../ws/"): http(s) becomes ws(s)
        :returns: this
        */
        this.url = url;
        return this;
    }
    setReconnect(ms) { /*//DOC
        :param ms: wait this long before reconnecting after the connection is lost.  0: no reconnect
        :returns: this
        */
        this.reconnect_ms = ms;
        return this;
    }
    addStatusListener(callback) { /*//DOC
        callback(connected: bool) when the connection opens / is lost.  Returns a function that removes the listener
        */
        this.status_listeners.add(callback);
        return () => this.status_listeners.delete(callback);
    }
    isConnected() {
        return this.connected;
    }
    open() { /*//DOC
        Connect (if not already).  subscribe() calls this
        */
        this.closing = false;
        if (this.socket != null) return;
        clearTimeout(this.reconnect_timer);
        const socket = this._createSocket();
        this.socket = socket;
        socket.onopen = () => {
            if (socket !== this.socket) return;
            this.connected = true;
            for (const [sub, s] of this.subs) {  // (re)subscribe everything
                this._write({ op: "sub", sub: sub, channel: s.channel, params: s.params });
            }
            this._status(true);
        };
        socket.onmessage = (event) => {
            if (socket !== this.socket) return;
            let msg;
            try {
                msg = JSON.parse(event.data);
            } catch (e) {
                return;
            }
            this._receive(msg);
        };
        socket.onclose = () => {
            if (socket !== this.socket) return;
            this.socket = null;
            const was = this.connected;
            this.connected = false;
            for (const [rid, p] of this.pending) {
                clearTimeout(p.timer);
                p.reject({ message: "Connection lost", status: null, body: null });
            }
            this.pending.clear();
            if (was) this._status(false);
            if (!this.closing && this.reconnect_ms > 0) {
                this.reconnect_timer = setTimeout(() => this.open(), this.reconnect_ms);
            }
        };
    }
    close() { /*//DOC
        Disconnect, no reconnect.  The subscriptions are kept: open() subscribes them again
        */
        this.closing = true;
        clearTimeout(this.reconnect_timer);
        if (this.socket) this.socket.close();
    }
    subscribe(channel, callback, params = {}) { /*//DOC
        Subscribe to a channel.
        :param channel: string
        :param callback: callback(data, channel) for each message: those to the whole channel and those to this
                         subscription only
        :param params: object, for the server (say, what this subscriber wants)
        :returns: a function that unsubscribes
        */
        const sub = this.next_sub++;
        this.subs.set(sub, { channel: channel, callback: callback, params: structuredClone(params) });
        if (this.connected) this._write({ op: "sub", sub: sub, channel: channel, params: params });
        else this.open();
        return () => {
            if (!this.subs.delete(sub)) return;
            if (this.connected) this._write({ op: "unsub", sub: sub });
        };
    }
    send(channel, data) { /*//DOC
        A message to the server, fire & forget.  Dropped when not connected: returns false
        */
        if (!this.connected) return false;
        this._write({ op: "msg", channel: channel, data: data });
        return true;
    }
    request(channel, data) { /*//DOC
        A request to the server.
        :returns: Promise of the reply's data.  Rejects with {message, status: null, body} (an error reply, timeout,
                  not connected, connection lost) like an HTTPDataSource
        */
        if (!this.connected) {
            return Promise.reject({ message: "Not connected", status: null, body: null });
        }
        const rid = this.next_rid++;
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pending.delete(rid);
                reject({ message: `Request timed out after ${this.timeout}ms`, status: 408, body: null });
            }, this.timeout);
            this.pending.set(rid, { resolve: resolve, reject: reject, timer: timer });
            this._write({ op: "req", rid: rid, channel: channel, data: data });
        });
    }
    // ---- internal ----
    _createSocket() {
        // something with send(text), close() and the onopen / onmessage / onclose handlers: a WebSocket here
        const url = new URL(this.url, window.location.href);
        if (url.protocol === "http:") url.protocol = "ws:";
        if (url.protocol === "https:") url.protocol = "wss:";
        return new WebSocket(url.href);
    }
    _write(msg) {
        this.socket.send(JSON.stringify(msg));
    }
    _receive(msg) {
        if (msg.rid != null) {
            const p = this.pending.get(msg.rid);
            if (p == null) return;
            this.pending.delete(msg.rid);
            clearTimeout(p.timer);
            if (msg.error != null) p.reject({ message: msg.error, status: null, body: msg });
            else p.resolve(msg.data);
        } else if (msg.sub != null) {
            const s = this.subs.get(msg.sub);
            if (s) s.callback(msg.data, s.channel);
        } else if (msg.channel != null) {
            for (const s of [...this.subs.values()]) {
                if (s.channel === msg.channel) s.callback(msg.data, msg.channel);
            }
        }
    }
    _status(connected) {
        for (const cb of [...this.status_listeners]) cb(connected);
    }
}


class MockWebSocketDataSource extends WebSocketDataSource { /*//DOC
    WebSocketDataSource with an in-memory server: the same protocol code runs over a fake socket.
    Play the server with the hooks and the push methods:

        onSubscribe(({sub, channel, params}) => ..)   onUnsubscribe(({sub, channel}) => ..)
        onMessage((channel, data) => ..)              onRequest((channel, data) => reply | Promise | throw)
        broadcast(channel, data)                      sendToSub(sub, data)
        dropConnection()                              simulate a lost connection (then it reconnects)
    */
    constructor() {
        super();
        this.server_subs = new Map();  // the server's view: sub -> channel
        this.hooks = { subscribe: null, unsubscribe: null, message: null, request: null };
        this.reconnect_ms = 500;
    }
    onSubscribe(fn) { this.hooks.subscribe = fn; return this; }
    onUnsubscribe(fn) { this.hooks.unsubscribe = fn; return this; }
    onMessage(fn) { this.hooks.message = fn; return this; }
    onRequest(fn) { this.hooks.request = fn; return this; }
    broadcast(channel, data) { /*//DOC
        The server pushes to every subscription of channel
        */
        if ([...this.server_subs.values()].includes(channel)) this._deliver({ channel: channel, data: data });
    }
    sendToSub(sub, data) { /*//DOC
        The server pushes to one subscription
        */
        if (this.server_subs.has(sub)) this._deliver({ sub: sub, data: data });
    }
    dropConnection() { /*//DOC
        The connection is lost (the server forgets the subscriptions): then reconnects as usual
        */
        if (this.socket) this.socket._drop();
    }
    // ---- internal ----
    _createSocket() {
        const socket = {
            alive: true,
            send: (text) => { if (socket.alive) this._serverReceive(JSON.parse(text)); },
            close: () => socket._drop(),
            _drop: () => {
                if (!socket.alive) return;
                socket.alive = false;
                for (const [sub, channel] of [...this.server_subs]) {
                    this.server_subs.delete(sub);
                    if (this.hooks.unsubscribe) this.hooks.unsubscribe({ sub: sub, channel: channel });
                }
                setTimeout(() => socket.onclose && socket.onclose(), 0);
            },
        };
        this.mock_socket = socket;
        setTimeout(() => { if (socket.alive && socket.onopen) socket.onopen(); }, 0);
        return socket;
    }
    _deliver(msg) {
        const socket = this.mock_socket;
        setTimeout(() => {
            if (socket && socket.alive && socket.onmessage) socket.onmessage({ data: JSON.stringify(msg) });
        }, 0);
    }
    _serverReceive(msg) {
        if (msg.op === "sub") {
            this.server_subs.set(msg.sub, msg.channel);
            if (this.hooks.subscribe) this.hooks.subscribe({ sub: msg.sub, channel: msg.channel, params: msg.params || {} });
        } else if (msg.op === "unsub") {
            const channel = this.server_subs.get(msg.sub);
            if (channel == null) return;
            this.server_subs.delete(msg.sub);
            if (this.hooks.unsubscribe) this.hooks.unsubscribe({ sub: msg.sub, channel: channel });
        } else if (msg.op === "msg") {
            if (this.hooks.message) this.hooks.message(msg.channel, msg.data);
        } else if (msg.op === "req") {
            Promise.resolve()
                .then(() => {
                    if (this.hooks.request == null) throw new Error("mock: no request handler");
                    return this.hooks.request(msg.channel, msg.data);
                })
                .then((data) => this._deliver({ rid: msg.rid, data: data }))
                .catch((e) => this._deliver({ rid: msg.rid, error: String((e && e.message) || e) }));
        }
    }
}


class WebSocketDataSourceWidget extends DataSourceWidget { /*//DOC
    Signals & slots around a WebSocketDataSource / MockWebSocketDataSource, for wiring a page.
    Renders nothing.  Errors come out of the inherited signals.error as {message, status, body}
    */
    constructor(id, dataSource) {
        super(id, dataSource);
        this.unsubscribe = new Map();  // channel -> unsubscribe function, for the subscriptions made with subscribe_slot
        this.remove_listener = dataSource.addStatusListener((connected) =>
            connected ? this.signals.connected.emit() : this.signals.disconnected.emit());
    }
    createSignals() {
        super.createSignals();
        this.signals.connected = new Signal("The connection opened (also after a reconnect). Carries nothing");
        this.signals.disconnected = new Signal("The connection was lost (reconnects if so set). Carries nothing");
        this.signals.message = new Signal("Pushed data of a channel subscribed with subscribe_slot. Carries {channel: str, data: any}");
        this.signals.reply = new Signal("Reply to request_slot. Carries {channel: str, data: any}");
    }
    static subscribe_slot_schema = { channel: "string", params: "object?" };
    subscribe_slot(datum) { /*//DOC
        Subscribe to a channel: its data comes out of signals.message.  Again for the same channel: replaced
        datum = {channel: str, params: object (optional, for the server)}
        */
        this.checkSchema(datum, this.constructor.subscribe_slot_schema);
        if (!this.enabled) return;
        this.unsubscribe_slot(datum.channel);
        this.unsubscribe.set(datum.channel, this.dataSource.subscribe(datum.channel,
            (data, channel) => this.signals.message.emit({ channel: channel, data: data }), datum.params || {}));
    }
    static unsubscribe_slot_schema = "string";
    unsubscribe_slot(channel) { /*//DOC
        Unsubscribe a channel subscribed with subscribe_slot
        :param channel: string
        */
        this.checkSchema(channel, this.constructor.unsubscribe_slot_schema);
        const f = this.unsubscribe.get(channel);
        if (f) f();
        this.unsubscribe.delete(channel);
    }
    static send_slot_schema = { channel: "string" };
    send_slot(datum) { /*//DOC
        A message to the server, fire & forget
        datum = {channel: str, data: any}
        */
        this.checkSchema(datum, this.constructor.send_slot_schema);
        if (!this.enabled) return;
        if (!this.dataSource.send(datum.channel, datum.data)) {
            this._emitError("Send failed", { message: "Not connected", status: null, body: null });
        }
    }
    static request_slot_schema = { channel: "string" };
    request_slot(datum) { /*//DOC
        A request to the server: the reply comes out of signals.reply, a failure out of signals.error
        datum = {channel: str, data: any}
        */
        this.checkSchema(datum, this.constructor.request_slot_schema);
        if (!this.enabled) return;
        this.signals.loading_start.emit('request');
        this.dataSource.request(datum.channel, datum.data)
            .then((data) => {
                this.signals.loading_success.emit('request');
                this.signals.reply.emit({ channel: datum.channel, data: data });
            })
            .catch((error) => {
                this.signals.loading_error.emit({ operation: 'request', error: error });
                this._emitError("Request failed", error);
            });
    }
    open_slot() { /*//DOC
        Connect (also happens on the first subscription)
        */
        this.dataSource.open();
    }
    close_slot() { /*//DOC
        Disconnect, no reconnect (open_slot connects again, with the subscriptions)
        */
        this.dataSource.close();
    }
} // WebSocketDataSourceWidget

export { WebSocketDataSource, MockWebSocketDataSource, WebSocketDataSourceWidget };
