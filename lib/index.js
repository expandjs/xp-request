/*jslint browser: true, devel: true, node: true, ass: true, nomen: true, unparam: true, indent: 4 */

/**
 * @license
 * Copyright (c) 2015 The ExpandJS authors. All rights reserved.
 * This code may only be used under the BSD style license found at https://expandjs.github.io/LICENSE.txt
 * The complete set of authors may be found at https://expandjs.github.io/AUTHORS.txt
 * The complete set of contributors may be found at https://expandjs.github.io/CONTRIBUTORS.txt
 */
(function (global) {
    "use strict";

    // Vars
    var http      = require('http'),
        https     = require('https'),
        XP        = global.XP || require('expandjs'),
        XPEmitter = global.XPEmitter || require('xp-emitter');

    /*********************************************************************/

    /**
     * This class is used to perform XHR requests.
     *
     * @class XPRequest
     * @description This class is used to perform XHR requests
     * @extends XPEmitter
     */
    module.exports = new XP.Class('XPRequest', {

        // EXTENDS
        extends: XPEmitter,

        // OPTIONS
        options: {
            dataType: 'text',
            headers: null,
            keepAlive: 0,
            method: 'GET',
            path: '',
            port: null,
            url: ''
        },

        /*********************************************************************/

        /**
         * Emitted when a chunk of data is received.
         *
         * @event chunk
         * @param {Buffer | string} chunk
         * @param {Object} emitter
         */

        /**
         * Emitted when the entire data is received.
         *
         * @event data
         * @param {Buffer | string} data
         * @param {Object} emitter
         */

        /**
         * Emitted when an error is received.
         *
         * @event error
         * @param {string} error
         * @param {Object} emitter
         */

        /**
         * Emitted when a response is received.
         *
         * @event response
         * @param {Object} response
         * @param {Object} emitter
         */

        /**
         * Emitted when the request state changes.
         *
         * @event state
         * @param {string} state
         * @param {Object} emitter
         */

        /*********************************************************************/

        /**
         * @constructs
         * @param {Object | string} opt The request url or options.
         *   @param {string} [opt.dataType = "text"] The type of data expected back from the server.
         *   @param {Object} [opt.headers] An object containing request headers.
         *   @param {number} [opt.keepAlive = 0] How often to submit TCP KeepAlive packets over sockets being kept alive.
         *   @param {string} [opt.method = "GET"] A string specifying the HTTP request method.
         *   @param {string} [opt.path] The request path, useful for relative requests.
         *   @param {number} [opt.port] The request port, useful for relative requests.
         *   @param {string} [opt.url] The request url.
         */
        initialize: {
            promise: true,
            value: function (opt, resolver) {

                // Asserting
                XP.assertArgument(XP.isObject(opt) || XP.isString(opt, true), 1, 'Object or string');

                // Vars
                var self     = this,
                    location = global.location || {};

                // Super
                XPEmitter.call(self);

                // Setting
                self.chunks    = [];
                self.options   = XP.isString(opt) ? {} : opt;
                self.dataType  = self.options.dataType;
                self.headers   = self.options.headers || {};
                self.keepAlive = self.options.keepAlive;
                self.method    = self.options.method;
                self.url       = self.options.url;
                self.path      = self.options.path;
                self.port      = self.options.port;
                self.secure    = (self.parsed.protocol || location.protocol) === 'https:';
                self.resolver  = resolver;
                self.state     = 'idle';

                // Adapting
                self.adapt();

                // Listening
                self.adaptee.on('error', self.handleError.bind(self));
                self.adaptee.on('response', self.handleResponse.bind(self));
            }
        },

        /*********************************************************************/

        /**
         * Aborts the request.
         *
         * @method abort
         * @returns {Object}
         */
        abort: function () {

            // Vars
            var self = this;

            // Checking
            if (self.timeAbort) { return self; }

            // Aborting
            self.adaptee.abort();

            // Setting
            self.state     = 'aborted';
            self.timeAbort = Date.now();

            return self;
        },

        /**
         * Submits the request, using data for the request body.
         *
         * @method submit
         * @param {Buffer | Object | string} [data]
         * @returns {Object}
         */
        submit: function (data) {

            // Asserting
            XP.assertArgument(XP.isVoid(data) || XP.isObject(data) || XP.isString(data, true), 1, 'Buffer, Object or string');

            // Vars
            var self = this;

            // Checking
            if (self.timeSubmit) { return self; }

            // Serializing
            if (self.method !== 'GET' && !XP.isString(data) && !Buffer.isBuffer(data)) { data = JSON.stringify(data); }

            // Ending
            self.adaptee.end(self.method !== 'GET' ? data : undefined);

            // Setting
            self.state      = 'pending';
            self.timeSubmit = Date.now();

            return self;
        },

        /*********************************************************************/

        /**
         * Creates the adpatee
         *
         * @method adapt
         * @returns {Object}
         * @private
         */
        adapt: {
            enumerable: false,
            value: function () {

                // Vars
                var self     = this,
                    location = global.location || {},
                    port     = self.secure ? 443 : 80,
                    protocol = self.secure ? https : http;

                // Adapting
                self.adaptee = protocol.request({
                    auth: self.parsed.auth,
                    headers: self.headers,
                    hostname: self.parsed.hostname || location.hostname,
                    keepAlive: self.keepAlive > 0,
                    keepAliveMsecs: Math.max(self.keepAlive, 0),
                    method: self.method,
                    path: self.path || self.parsed.path + (self.parsed.hash || ''),
                    port: self.port || self.parsed.port || (self.parsed.hostname && port) || location.port,
                    withCredentials: false
                });

                return self;
            }
        },

        /**
         * Parses the data
         *
         * @method parse
         * @param {Buffer | string} data
         * @returns {*}
         * @private
         */
        parse: {
            enumerable: true,
            value: function (data) {
                var self = this;
                if (self.dataType === 'json') { return JSON.parse(data); }
                return data;
            }
        },

        /*********************************************************************/

        /**
         * TODO DOC
         *
         * @property adaptee
         * @type Object
         * @private
         */
        adaptee: {
            enumerable: false,
            set: function (val) { return this.request || val; },
            validate: function (val) { return XP.isObject(val); }
        },

        /**
         * TODO DOC
         *
         * @property chunks
         * @type Array
         * @readonly
         * @private
         */
        chunks: {
            set: function (val) { return this.chunks || val; },
            validate: function (val) { return XP.isArray(val); }
        },

        /**
         * TODO DOC
         *
         * @property data
         * @type Buffer | string
         * @readonly
         */
        data: {
            validate: function (val) { return XP.isString(val) || Buffer.isBuffer(val); }
        },

        /**
         * TODO DOC
         *
         * @property dataType
         * @type string
         * @default "text"
         */
        dataType: {
            set: function (val) { return this.dataType || val; },
            validate: function (val) { return XP.includes(this.dataTypes, val); }
        },

        /**
         * TODO DOC
         *
         * @property dataTypes
         * @type Array
         * @default ["json", "text"]
         * @readonly
         */
        dataTypes: {
            frozen: true,
            writable: false,
            value: ['json', 'text']
        },

        /**
         * TODO DOC
         *
         * @property header
         * @type Object
         */
        headers: {
            set: function (val) { return this.headers || val; },
            validate: function (val) { return XP.isObject(val); }
        },

        /**
         * TODO DOC
         *
         * @property keepAlive
         * @type number
         * @default 0
         */
        keepAlive: {
            set: function (val) { return this.keepAlive >= 0 ? this.keepAlive : val; },
            validate: function (val) { return XP.isInt(val, true); }
        },

        /**
         * TODO DOC
         *
         * @property method
         * @type string
         * @default "GET"
         */
        method: {
            set: function (val) { return this.method || XP.upperCase(val); },
            validate: function (val) { return XP.isString(val, true); }
        },

        /**
         * TODO DOC
         *
         * @property parsed
         * @type Object
         */
        parsed: {
            set: function (val) { return this.parsed || val; },
            validate: function (val) { return XP.isObject(val); }
        },

        /**
         * TODO DOC
         *
         * @property path
         * @type string
         */
        path: {
            set: function (val) { return XP.isDefined(this.path) ? this.path : (!this.url && val) || ''; },
            validate: function (val) { return XP.isString(val); }
        },

        /**
         * TODO DOC
         *
         * @property port
         * @type number
         */
        port: {
            set: function (val) { return XP.isDefined(this.port) ? this.port : (!this.url && val) || null; },
            validate: function (val) { return XP.isVoid(val) || XP.isFinite(val, true); }
        },

        /**
         * TODO DOC
         * @property response
         * @type Object
         * @readonly
         */
        response: {
            set: function (val) { return this.response || val; },
            validate: function (val) { return XP.isObject(val); }
        },

        /**
         * TODO DOC
         *
         * @property secure
         * @type boolean
         * @readonly
         */
        secure: {
            set: function (val) { return XP.isDefined(this.secure) ? this.secure : !!val; }
        },

        /**
         * TODO DOC
         *
         * @property state
         * @type string
         * @readonly
         */
        state: {
            then: function (post) { this.emit('state', post, this); },
            validate: function (val) { return XP.includes(this.states, val); }
        },

        /**
         * TODO DOC
         *
         * @property states
         * @type Array
         * @default ["aborted", "failed", "idle", "pending", "received", "receiving"]
         * @readonly
         */
        states: {
            frozen: true,
            writable: false,
            value: ['aborted', 'failed', 'idle', 'pending', 'received', 'receiving']
        },

        /**
         * TODO DOC
         *
         * @property timeAbort
         * @type number
         * @readonly
         */
        timeAbort: {
            set: function (val) { return this.timeAbort || val; },
            validate: function (val) { return XP.isFinite(val, true); }
        },

        /**
         * TODO DOC
         *
         * @property timeData
         * @type number
         * @readonly
         */
        timeData: {
            set: function (val) { return this.timeData || val; },
            validate: function (val) { return XP.isFinite(val, true); }
        },

        /**
         * TODO DOC
         *
         * @property timeResponse
         * @type number
         * @readonly
         */
        timeResponse: {
            set: function (val) { return this.timeResponse || val; },
            validate: function (val) { return XP.isFinite(val, true); }
        },

        /**
         * TODO DOC
         *
         * @property timeSubmit
         * @type number
         * @readonly
         */
        timeSubmit: {
            set: function (val) { return this.timeSubmit || val; },
            validate: function (val) { return XP.isFinite(val, true); }
        },

        /**
         * TODO DOC
         *
         * @property url
         * @type string
         */
        url: {
            set: function (val) { return XP.isDefined(this.url) ? this.url : val || ''; },
            then: function (post) { this.parsed = XP.parseURL(post) || {}; },
            validate: function (val) { return XP.isString(val); }
        },

        /*********************************************************************/

        // HANDLER
        handleData: function (chunk) {

            // Vars
            var self = this;

            // Setting
            self.chunks.push(chunk);

            // Emitting
            self.emit('chunk', chunk, self);
        },

        // HANDLER
        handleEnd: function () {

            // Vars
            var self = this;

            // Trying
            try {

                // Setting
                self.data     = self.parse(Buffer.isBuffer(self.chunks[0]) ? Buffer.concat(self.chunks) : self.chunks.join(''));
                self.state    = 'received';
                self.timeData = Date.now();

            } catch (exc) {

                // Handling
                return self.handleError(exc.message);
            }

            // Resolving
            self.resolver(null, self.data);

            // Emitting
            self.emit('data', self.data, self);
        },

        // HANDLER
        handleError: function (error) {

            // Vars
            var self = this;

            // Setting
            self.state        = 'failed';
            self.timeResponse = Date.now();
            self.timeData     = self.timeResponse;

            // Rejecting
            self.resolver(error);

            // Emitting
            self.emit('response', null, self);
            self.emit('error', error, self);
        },

        // HANDLER
        handleResponse: function (response) {

            // Vars
            var self = this;

            // Setting
            self.response     = response;
            self.state        = 'receiving';
            self.timeResponse = Date.now();

            // Listening
            response.on('data', self.handleData.bind(self));
            response.on('end', self.handleEnd.bind(self));

            // Emitting
            self.emit('response', response, self);
        }
    });

}(typeof window !== "undefined" ? window : global));