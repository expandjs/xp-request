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
    module.exports = global.XPRequest = new XP.Class('XPRequest', {

        // EXTENDS
        extends: XPEmitter,

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
         * @param {*} data
         * @param {Object} emitter
         */

        /**
         * Emitted when the entire error is received.
         *
         * @event error
         * @param {string} error
         * @param {Object} emitter
         */

        /**
         * Emitted when a response is received.
         *
         * @event response
         * @param {number} statusCode
         * @param {Object} emitter
         */

        /**
         * Emitted when the request state changes.
         *
         * @event state
         * @param {string} state
         * @param {Object} emitter
         */

        /**
         * Emitted when the request is submitted.
         *
         * @event submit
         * @param {Buffer | string} data
         * @param {Object} emitter
         */

        /*********************************************************************/

        /**
         * @constructs
         * @param {Object | string} options The request url or options.
         *   @param {string} [options.contentType] A shortcut for the "Content-Type" header.
         *   @param {string} [options.dataType] The type of data expected back from the server.
         *   @param {string} [options.encoding] The response encoding.
         *   @param {Object} [options.headers] An object containing request headers.
         *   @param {string} [options.hostname] The request hostname, usable in alternative to url.
         *   @param {number} [options.keepAlive = 0] How often to submit TCP KeepAlive packets over sockets being kept alive.
         *   @param {string} [options.method = "GET"] A string specifying the HTTP request method.
         *   @param {string} [options.path] The request path, usable in alternative to url.
         *   @param {number} [options.port] The request port, usable in alternative to url.
         *   @param {number} [options.protocol] The request protocol, usable in alternative to url.
         *   @param {string} [options.url] The request url.
         */
        initialize: {
            promise: true,
            value: function (options, resolver) {

                // Vars
                var self = this;

                // Super
                XPEmitter.call(self);

                // Setting
                self.options     = XP.isObject(options) ? options : {url: options};
                self.url         = self.options.url || null;
                self.contentType = self.options.contentType || null;
                self.dataType    = self.options.dataType || null;
                self.encoding    = self.options.encoding || null;
                self.headers     = self.options.headers || {};
                self.hostname    = self.options.hostname || null;
                self.keepAlive   = self.options.keepAlive || 0;
                self.method      = self.options.method || 'GET';
                self.path        = self.options.path || null;
                self.port        = self.options.port || null;
                self.protocol    = self.options.protocol || null;
                self.state       = 'idle';
                self._chunks     = [];
                self._resolver   = resolver;

                // Adapting
                self._adapt();
            }
        },

        /*********************************************************************/

        /**
         * Aborts the request.
         *
         * @method abort
         */
        abort: function () {

            // Vars
            var self = this;

            // Checking
            if (self.tsAbort) { return self; }

            // Aborting
            self._adaptee.abort();

            // Setting
            self.state   = 'aborted';
            self.tsAbort = Date.now();
        },

        /**
         * Submits the request, using data for the request body.
         *
         * @method submit
         * @param {*} [data]
         * @param {Function} [resolver]
         * @returns {Promise}
         */
        submit: {
            promise: true,
            value: function (data, resolver) {

                // Asserting
                XP.assertArgument(XP.isVoid(resolver) || XP.isFunction(resolver), 2, 'Function');

                // Vars
                var self = this;

                // Checking
                if (self.tsSubmit) { return self; }

                // Serializing
                if (self.method === 'GET') { data = undefined; }
                if (self.method !== 'GET') { data = (XP.isInput(data, true) || XP.isBuffer(data) ? data : (XP.isCollection(data) ? XP.toJSON(data) : undefined)); }

                // Listening
                self.resolved(function (data) { resolver(null, data); });
                self.rejected(function (error) { resolver(error, null); });

                // Ending
                self._adaptee.end(data);

                // Setting
                self.state    = 'pending';
                self.tsSubmit = Date.now();

                // Emitting
                self.emit('submit', data, self);
            }
        },

        /*********************************************************************/

        /**
         * Creates the adpatee.
         *
         * @method _adapt
         * @returns {Object}
         * @private
         */
        _adapt: {
            enumerable: false,
            value: function () {

                // Vars
                var self     = this,
                    location = global.location || {},
                    secure   = (self.protocol || (!self.hostname && location.protocol)) === 'https:',
                    port     = (self.port || (!self.hostname && location.port)) || null,
                    protocol = secure ? 'https:' : 'http:',
                    factory  = secure ? https : http;

                // Adapting
                self._adaptee = factory.request({
                    headers: self.headers,
                    hostname: self.hostname,
                    keepAlive: self.keepAlive > 0,
                    keepAliveMsecs: self.keepAlive,
                    method: self.method,
                    path: self.path,
                    port: port,
                    protocol: protocol,
                    withCredentials: false
                });

                // Listening
                self._adaptee.on('error', self._handleError.bind(self));
                self._adaptee.on('response', self._handleResponse.bind(self));

                return self;
            }
        },

        /*********************************************************************/

        /**
         * TODO DOC
         *
         * @property contentType
         * @type string
         */
        contentType: {
            set: function (val) { return XP.isDefined(this.contentType) ? this.contentType : val; },
            validate: function (val) { return !XP.isVoid(val) && !XP.isString(val, true) && 'string'; }
        },

        /**
         * TODO DOC
         *
         * @property data
         * @type *
         * @readonly
         */
        data: {
            set: function (val) { return XP.isDefined(this.data) ? this.data : val; }
        },

        /**
         * TODO DOC
         *
         * @property dataType
         * @type string
         */
        dataType: {
            set: function (val) { return XP.isDefined(this.dataType) ? this.dataType : val; },
            validate: function (val) { return !XP.isVoid(val) && !XP.includes(this.dataTypes, val) && 'string'; }
        },

        /**
         * TODO DOC
         *
         * @property dataTypes
         * @type Array
         * @default ["json"]
         * @readonly
         */
        dataTypes: {
            frozen: true,
            writable: false,
            value: ['json']
        },

        /**
         * TODO DOC
         *
         * @property encoding
         * @type string
         */
        encoding: {
            set: function (val) { return XP.isDefined(this.encoding) ? this.encoding : val; },
            validate: function (val) { return !XP.isVoid(val) && !XP.isString(val, true) && 'string'; }
        },

        /**
         * TODO DOC
         *
         * @property error
         * @type string
         * @readonly
         */
        error: {
            set: function (val) { return XP.isDefined(this.error) ? this.error : val; },
            validate: function (val) { return !XP.isVoid(val) && !XP.isString(val) && 'string'; }
        },

        /**
         * TODO DOC
         *
         * @property headers
         * @type Object
         */
        headers: {
            set: function (val) { return this.headers || (XP.isObject(val) && XP.cloneDeep(val)); },
            then: function () { if (this.contentType) { this.headers['content-type'] = this.contentType; } },
            validate: function (val) { return !XP.isObject(val) && 'Object'; }
        },

        /**
         * TODO DOC
         *
         * @property hostname
         * @type string
         */
        hostname: {
            set: function (val) { return XP.isDefined(this.hostname) ? this.hostname : val; },
            validate: function (val) { return !XP.isVoid(val) && !XP.isString(val, true) && 'string'; }
        },

        /**
         * TODO DOC
         *
         * @property keepAlive
         * @type number
         * @default 0
         */
        keepAlive: {
            set: function (val) { return XP.isDefined(this.keepAlive) ? this.keepAlive : val; },
            validate: function (val) { return !XP.isInt(val, true) && 'number'; }
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
            validate: function (val) { return !XP.isString(val, true) && 'string'; }
        },

        /**
         * TODO DOC
         *
         * @property path
         * @type string
         */
        path: {
            set: function (val) { return XP.isDefined(this.path) ? this.path : val; },
            validate: function (val) { return !XP.isVoid(val) && !XP.isString(val, true) && 'string'; }
        },

        /**
         * TODO DOC
         *
         * @property port
         * @type number
         */
        port: {
            set: function (val) { return XP.isDefined(this.port) ? this.port : val; },
            validate: function (val) { return !XP.isVoid(val) && !XP.isInt(val, true) && 'number'; }
        },

        /**
         * TODO DOC
         *
         * @property protocol
         * @type string
         */
        protocol: {
            set: function (val) { return XP.isDefined(this.protocol) ? this.protocol : val; },
            validate: function (val) { return !XP.isVoid(val) && !XP.isString(val, true) && 'string'; }
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
            validate: function (val) { return !XP.includes(this.states, val) && 'string'; }
        },

        /**
         * TODO DOC
         *
         * @property states
         * @type Array
         * @default ["aborted", "idle", "pending", "received", "receiving"]
         * @readonly
         */
        states: {
            frozen: true,
            writable: false,
            value: ['aborted', 'idle', 'pending', 'received', 'receiving']
        },

        /**
         * TODO DOC
         *
         * @property statusCode
         * @type number
         * @readonly
         */
        statusCode: {
            set: function (val) { return this.statusCode || val; },
            validate: function (val) { return !XP.isInt(val, true) && 'number'; }
        },

        /**
         * TODO DOC
         *
         * @property statusMessage
         * @type string
         * @readonly
         */
        statusMessage: {
            set: function (val) { return this.statusMessage || val; },
            validate: function (val) { return !XP.isString(val) && 'string'; }
        },

        /**
         * TODO DOC
         *
         * @property tsAbort
         * @type number
         * @readonly
         */
        tsAbort: {
            set: function (val) { return this.tsAbort || val; },
            validate: function (val) { return !XP.isInt(val, true) && 'number'; }
        },

        /**
         * TODO DOC
         *
         * @property tsData
         * @type number
         * @readonly
         */
        tsData: {
            set: function (val) { return this.tsData || val; },
            validate: function (val) { return !XP.isInt(val, true) && 'number'; }
        },

        /**
         * TODO DOC
         *
         * @property tsResponse
         * @type number
         * @readonly
         */
        tsResponse: {
            set: function (val) { return this.tsResponse || val; },
            validate: function (val) { return !XP.isInt(val, true) && 'number'; }
        },

        /**
         * TODO DOC
         *
         * @property tsSubmit
         * @type number
         * @readonly
         */
        tsSubmit: {
            set: function (val) { return this.tsSubmit || val; },
            validate: function (val) { return !XP.isInt(val, true) && 'number'; }
        },

        /**
         * TODO DOC
         *
         * @property url
         * @type string
         */
        url: {
            set: function (val) { return XP.isDefined(this.url) ? this.url : val; },
            then: function (post) { if (post = XP.parseURL(post)) { this.options = {hostname: post.hostname, path: post.path, port: post.port, protocol: post.protocol}; } },
            validate: function (val) { return !XP.isVoid(val) && !XP.isString(val, true) && 'string'; }
        },

        /*********************************************************************/

        /**
         * TODO DOC
         *
         * @property _adaptee
         * @type Object
         * @private
         */
        _adaptee: {
            enumerable: false,
            set: function (val) { return this._adaptee || val; },
            validate: function (val) { return !XP.isObject(val) && 'Object'; }
        },

        /**
         * TODO DOC
         *
         * @property _chunks
         * @type Array
         * @private
         */
        _chunks: {
            enumerable: false,
            set: function (val) { return this._chunks || val; },
            validate: function (val) { return !XP.isArray(val) && 'Array'; }
        },

        /**
         * TODO DOC
         *
         * @property _resolver
         * @type Function
         * @private
         */
        _resolver: {
            enumerable: false,
            set: function (val) { return this._resolver || val; },
            validate: function (val) { return !XP.isFunction(val) && 'Function'; }
        },

        /**
         * TODO DOC
         *
         * @property _response
         * @type Object
         * @private
         */
        _response: {
            enumerable: false,
            set: function (val) { return this._response || val; },
            validate: function (val) { return !XP.isObject(val) && 'Object'; }
        },

        /*********************************************************************/

        // HANDLER
        _handleData: function (chunk) {

            // Vars
            var self = this;

            // Setting
            self._chunks.push(chunk);

            // Emitting
            self.emit('chunk', chunk, self);
        },

        // HANDLER
        _handleEnd: function () {

            // Vars
            var self     = this,
                failed   = self.statusCode >= 400,
                data     = failed ? null : XP.join(self._chunks),
                dataType = failed ? 'error' : self.dataType,
                error    = failed ? XP.join(self._chunks).toString() || self.statusMessage : null,
                state    = failed ? 'failed' : 'received';

            // Parsing
            if (dataType === 'json') { data = XP.parseJSON(data.toString()); }

            // Setting
            self.data   = data;
            self.error  = error;
            self.state  = state;
            self.tsData = Date.now();

            // Resolving
            self._resolver(self.error, self.data);

            // Emitting
            self.emit(failed ? 'error' : 'data', failed ? self.error : self.data, self);
        },

        // HANDLER
        _handleError: function (error) {

            // Vars
            var self = this;

            // Setting
            self.error = error.message || 'Unknown';
            self.state = 'failed';

            // Resolving
            self._resolver(self.error, null);

            // Emitting
            self.emit('error', self.error, self);
        },

        // HANDLER
        _handleResponse: function (response) {

            // Vars
            var self = this;

            // Encoding
            if (self.encoding) { response.setEncoding(self.encoding); }

            // Setting
            self._response     = response;
            self.state         = 'receiving';
            self.statusCode    = response.statusCode;
            self.statusMessage = response.statusMessage || http.STATUS_CODES[self.statusCode] || 'Unknown';
            self.tsResponse    = Date.now();

            // Listening
            response.on('data', self._handleData.bind(self));
            response.on('end', self._handleEnd.bind(self));

            // Emitting
            self.emit('response', self.statusCode, self);
        }
    });

}(typeof window !== "undefined" ? window : global));