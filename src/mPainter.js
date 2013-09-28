(function (window, undefined) {
    "use strict";

    var mPainter = window.mPainter || {},
        _internal = {},
        _self;

    /**
     * Initialization
     */
    mPainter = function (options) {
        var defaults = {
                debug: false,
                id: "mysvg",
                cursor_id: "cursor",
                element_prefix: "element_",
                tool: "PAINT",

                startTrigger : ['mousedown', 'touchstart', 'MSPointerDown'],
                moveTrigger  : ['mousemove', 'touchmove', 'MSPointerMove'],
                stopTrigger  : ['mouseup', 'touchend', 'touchcancel', 'MSPointerUp'],
            };
        this.options = _extend(defaults, options);

        _self = this;
        _internal = {
            el: get(this.options.id),
            undo: [],
            redo: [],

            is_mousedown: false,
            canvasStack: {
                head: -1,
                elements: []
            },

            config: {
                element_index: 0,
                tool: this.options.tool,
                painter_radius: 3,
                opacity: 1,
                color: "#FF0000"  // red
            },

            // EVENTS: {
            //     "mousedown": _mouseDown,
            //     "mousemove": _mouseMove,
            //     "mouseup": _mouseUp,
            //     "mouseover": _mouseOver,
            //     "mouseout": _mouseOut
            // },

            TOOLS: {
                PAINT: "PAINT",
                LINE: "LINE"
            }

        };

        bindEvents();
    };

    mPainter.prototype = {

        setColor: function (color) {
            _internal.config.color = color;
        },

        setSize: function (radius) {
            _internal.config.painter_radius = radius;
        },

        setOpacity: function (opacity) {
            _internal.config.opacity = opacity;
        },

        setTool: function (tool_name) {
            if (_internal.TOOLS[tool_name]) {
                _internal.config.tool = _internal.TOOLS[tool_name];
            } else {
                throw "TOOL: " + tool_name + " is not available.";
            }
        },

        undo: function () {
            this.exec("undo");
        },

        redo: function () {
            this.exec("redo");
        },
        // TODO: Function does not workk at the moment
        saveImage: function () {
            // Create a canvas element
            // var canvas = document.createElement('canvas');
            // canvas.width = 980;
            // canvas.height = 500;
            var canvas = get("mycanvas");
            var ctx = canvas.getContext("2d");

            var data = new XMLSerializer().serializeToString(_internal.el);
            var DOMURL = window.URL || window.webkitURL || window;
            // var img = new Image();
            var img = document.createElement('img');
            var svg = new Blob([data], {type: "image/svg+xml;charset=utf-8"});
            var url = DOMURL.createObjectURL(svg);
            img.onload = function () {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                // DOMURL.revokeObjectURL(url);
                var b64 = canvas.toDataURL("image/png");
                console.log(b64);
            };
            img.crossOrigin = 'anonymous';
            img.src = url;
        },

        exec: function (type) {
            // TODO: Refactor, now is checking the length of 'type' array
            if (_internal[type].length) {
                var o = _internal[type].pop(),
                    _index = o.id,
                    _value = o.value;

                // push state to oppsite array
                _internal[revs(type)].push({id: _index, value: revs(_value)});

                switch (_value) {
                case "a":
                    _internal.canvasStack.elements[_index].is_delelted = false;
                    var config = _internal.canvasStack.elements[_index].config;
                    // fix half opacity issue
                    config.opacity *= 2;
                    draw(config);
                    break;
                case "d":
                    _internal.canvasStack.elements[_index].is_delelted = true;
                    removeElement(_index);
                    break;
                }
            }
        },

        getInternal: function () {
            return _internal;
        },

        reset: function () {
            _internal.undo = [];
            _internal.redo = [];
            _internal.config.element_index = 0;
            _internal.canvasStack = {
                head: -1,
                elements: []
            };
            _internal.is_mousedown = false;

            while (_internal.el.lastChild) {
                _internal.el.removeChild(_internal.el.lastChild);
            }
        }

    };

    function bindEvents() {
        _forEach(_self.options.startTrigger, function (eventType) {
            _addEventListener(_internal.el, eventType, paintStart);
        });
        _forEach(_self.options.moveTrigger, function (eventType) {
            _addEventListener(_internal.el, eventType, paintMove);
        });
        _forEach(_self.options.stopTrigger, function (eventType) {
            _addEventListener(_internal.el, eventType, paintStop);
        });
        _addEventListener(_internal.el, "mouseover", mouseOver);
        _addEventListener(_internal.el, "mouseout", mouseOut);
    }

    // function _eventHandler(e) {
    //     if (_internal.EVENTS[e.type] && typeof _internal.EVENTS[e.type] === "function") {
    //         _internal.EVENTS[e.type].call(_self, e);
    //     }
    // }
    /**
     * Events han
     */
    function paintStart(e) {
        log("Mouse down: " + e.offsetX + "," + e.offsetY);
        // Fix dragging in svg with text cursor issue
        e.preventDefault();

        addPoint(getPointFromEvent(e));

        _internal.is_mousedown = true;
    }
    // TODO: Add throttle
    function paintMove(e) {
        if (_internal.is_mousedown === true) {
            log("Mouse move to: " + e.offsetX + "," + e.offsetY);

            addPoint(getPointFromEvent(e));
        }
        updateCur(e);
    }

    function paintStop(e) {
        if (_internal.is_mousedown === true) {
            log("Mouse up: " + e.offsetX + "," + e.offsetY);
            addPoint(getPointFromEvent(e));

            endElement();
        }
    }

    function mouseOver(e) {
        if (isOutside(e, _internal.el)) {
            log("Mouse enter", e);

            newCur(e);
        }
    }

    function mouseOut(e) {
        // check if truly mouse out from svg element
        var toElement = e.toElement ? e.toElement : e.relatedTarget;
        if (toElement === null || toElement.nodeName !== "svg" && toElement.parentNode.nodeName !== "svg" && toElement.id !== _self.options.cursor_id) {
            if (_internal.is_mousedown === true) {
                log("Mouse out: " + e.offsetX + "," + e.offsetY);

                endElement();
            }
            removeCur();
        }
    }
    /**
     * Core
     */
    function addPoint(point) {
        getPoints(_internal.config.element_index).push(point);
        draw(_internal.config);
    }

    function _initElements(index) {
        _internal.canvasStack.elements[index] = {
            config: {
                element_index: index,
                tool: _internal.config.tool,
                painter_radius: _internal.config.painter_radius,
                opacity: _internal.config.opacity,
                color: _internal.config.color
            },
            points: [],
            is_delelted: false
        };
        return _internal.canvasStack.elements[index];
    }

    function makeElement(tag, attrs) {
        var elm = document.createElementNS("http://www.w3.org/2000/svg", tag);
        for (var i in attrs) {
            if (attrs.hasOwnProperty(i)) {
                elm.setAttribute(i, attrs[i]);
            }
        }
        return elm;
    }

    function endElement() {
        _internal.is_mousedown = false;

        var _index = _internal.config.element_index,
            element = get(_self.options.element_prefix + _index);
        if (element) {
            element.setAttribute("opacity", _internal.config.opacity);
        }

        // setup redo & undo
        for (var i = _internal.redo.length - 1; i >= 0; i--) {
            _internal.undo.push({id: _internal.redo[i].id, value: revs(_internal.redo[i].value)});
        }
        for (var j = 0, n = _internal.redo.length; j < n; j++) {
            _internal.undo.push({id: _internal.redo[j].id, value: _internal.redo[j].value});
        }
        _internal.undo.push({id: _index, value: "d"});
        _internal.redo = [];

        _internal.canvasStack.head = _internal.config.element_index ++;
    }

    function removeElement(index) {
        var elm = get(_self.options.element_prefix + index);
        if (elm) {
            elm.parentNode.removeChild(elm);
        }
    }
    /**
     * Draw
     */
    function draw(config) {
        switch (config.tool) {
        case _internal.TOOLS.PAINT:
            drawPath(config);
            break;
        case _internal.TOOLS.LINE:
            drawLine(config);
            break;
        }
    }

    function drawPath(config) {
        var element_id = _self.options.element_prefix + config.element_index,
            path = get(element_id);
        if (path) {
            path.setAttribute("d", makeD(config.element_index));
        } else {
            path = makeElement("path", {
                "id": element_id,
                "d": makeD(config.element_index),
                "fill": "none",
                "stroke": config.color,
                "stroke-linecap": "round",
                "stroke-width": config.painter_radius * 2,
                "opacity": config.opacity / 2
            });
            _internal.el.appendChild(path);
        }
    }

    function makeD(index) {
        var points = getPoints(index),
            len = points.length,
            last = len % 2 === 0 ? len - 1 : len - 2,
            d = "M" + points[0].x + "," + points[0].y;
        // dealting with if only has 1-3 points
        if (len === 1) {
            return d;
        }
        if (len === 2 || len === 3) {
            return d + "T" + points[len - 1].x + "," + points[len - 1].y;
        }
        d += "Q";
        for (var i = 1; i < last; i++) {
            d += points[i].x + "," + points[i].y + " ";
        }
        d += "T" + points[last].x + "," + points[last].y;
        return d;
    }

    function drawLine(config) {
        var element_id = _self.options.element_prefix + config.element_index,
            line = get(element_id);
        if (line) {
            var point = getPoint(config.element_index);
            line.setAttribute("x2", point.x);
            line.setAttribute("y2", point.y);
        } else {
            var point_1 = getPoint(config.element_index, 0),
                point_2 = getPoint(config.element_index);
            line = makeElement("line", {
                "id": element_id,
                "x1": point_1.x,
                "y1": point_1.y,
                "x2": point_2.x,
                "y2": point_2.y,
                "stroke-linecap": "round",
                "stroke-width": config.painter_radius * 2,
                "stroke": config.color,
                "opacity": config.opacity / 2
            });
            _internal.el.appendChild(line);
        }
    }

    function getPoints(element_index) {
        if (_internal.canvasStack.elements[element_index] === undefined) {
            return _initElements(element_index).points;
        }
        return _internal.canvasStack.elements[element_index].points;
    }

    function getPoint(element_index, point_index) {
        var points = getPoints(element_index);
        if (point_index === undefined) {
            return points[points.length - 1];
        } else {
            return points[point_index];
        }
    }

    /**
     * Cursor
     */
    function newCur(e) {
        switch (_internal.config.tool) {
        case _internal.TOOLS.PAINT:
            newPointerCur(e);
            break;
        case _internal.TOOLS.LINE:
            newCrossCur(e);
            break;
        }
    }

    function newPointerCur(e) {
        var cursor = makeElement("circle", {
            "id": _self.options.cursor_id,
            "cx": e.offsetX,
            "cy": e.offsetY,
            "r": _internal.config.painter_radius,
            "stroke": _internal.config.color,
            "fill": _internal.config.color
        });
        _internal.el.appendChild(cursor);
    }

    function newCrossCur(e) {
        var styleList = "";
        if (_internal.el.getAttribute("style")) {
            styleList = _internal.el.getAttribute("style");
        }
        _internal.el.setAttribute("style", styleList + "cursor:crosshair;");
    }

    function updateCur(e) {
        var cursor = get(_self.options.cursor_id);
        if (cursor) {
            cursor.setAttribute("cx", e.offsetX);
            cursor.setAttribute("cy", e.offsetY);
        }
    }

    function removeCur() {
        var cursor = get(_self.options.cursor_id),
            styleList = _internal.el.getAttribute('style');
        if (cursor) {
            cursor.parentNode.removeChild(cursor);
        }
        if (styleList) {
            _internal.el.setAttribute("style", styleList.replace(/cursor:crosshair;/, ''));
        }
    }

    /**
     * Helper methods
     */
    function getPointFromEvent(e) {
        return {
            x: e.offsetX,
            y: e.offsetY
        };
    }

    function isOutside(evt, parent) {
        var elem = evt.relatedTarget || evt.toElement || evt.fromElement;
        while (elem && elem !== parent) {
            elem = elem.parentNode;
        }
        if (elem !== parent) {
            return true;
        }
        return false;
    }

    function revs(input) {
        if (input === "d") return "a";
        if (input === "a") return "d";
        if (input === "redo") return "undo";
        if (input === "undo") return "redo";
        return input;
    }

    function log(data) {
        if (_self.options.debug === true) {
            console.log(data);
        }
    }
    /**
     * Shim methods
     */
    function _extend() {
        var o = {};
        for (var i = 0, n = arguments.length; i < n; i++) {
            for (var key in arguments[i]) {
                if (arguments[i].hasOwnProperty(key)) {
                    o[key] = arguments[i][key];
                }
            }
        }
        return o;
    }

    function _bind(f, object) {
        var __method = f;
        return function (event) {
            __method.call(object, event || window.event);
        };
    }

    function _forEach(collections, fn, context) {
        for (var i = 0, n = collections.length; i < n; i++) {
            fn.call(context || null, collections[i], i, collections);
        }
    }

    function _addEventListener(obj, eventType, handler) {
        if (window.addEventListener) {
            obj.addEventListener(eventType, handler, false);
        } else if (window.attachEvent) {
            obj.attachEvent('on' + eventType, handler);
        } else {
            throw "Event type: " + eventType + " is not supported";
        }
    }


    function get(id) {
        return document.getElementById(id);
    }

    window.mPainter = mPainter;

})(window);

