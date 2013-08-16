(function (window, undefined) {
    "use strict";

    var mPainter = window.mPainter || {},
        _internal = {},
        _self;

    mPainter = function (options) {
        _self = this;
        this._init(options);
    };

    mPainter.prototype = {

        _init: function (options) {
            var defaults = {
                debug: false,
                id: "mysvg",
                cursor_id: "cursor",
                element_prefix: "element_",
                tool: "PAINT"
            };

            this.options = _extend({}, defaults, options);

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

                EVENTS: {
                    "mousedown": this._mouseDown,
                    "mousemove": this._mouseMove,
                    "mouseup": this._mouseUp,
                    "mouseover": this._mouseOver,
                    "mouseout": this._mouseOut
                },

                TOOLS: {
                    PAINT: "PAINT",
                    LINE: "LINE"
                }

            };

            this._initEvents();
        },

        _initEvents: function () {
            _internal.el.addEventListener("mousedown", _eventHandler, false);
            _internal.el.addEventListener("mousemove", _eventHandler, false);
            _internal.el.addEventListener("mouseup", _eventHandler, false);
            _internal.el.addEventListener("mouseover", _eventHandler, false);
            _internal.el.addEventListener("mouseout", _eventHandler, false);
        },

        _mouseDown: function (e) {
            log("Mouse down: " + e.offsetX + "," + e.offsetY);
            // Fix dragging in svg with text cursor issue
            e.preventDefault();

            addPoint(getPointFromEvent(e));

            _internal.is_mousedown = true;
        },
        // TODO: Add throttle
        _mouseMove: function (e) {
            if (_internal.is_mousedown === true) {
                log("Mouse move to: " + e.offsetX + "," + e.offsetY);

                addPoint(getPointFromEvent(e));
            }
            updateCur(e);
        },

        _mouseUp: function (e) {
            if (_internal.is_mousedown === true) {
                log("Mouse up: " + e.offsetX + "," + e.offsetY);
                addPoint(getPointFromEvent(e));

                endElement();
            }
        },

        _mouseOver: function (e) {
            if (isOutside(e, _internal.el)) {
                log("Mouse enter", e);

                newCur(e);
            }
        },

        _mouseOut: function (e) {
            // check if truly mouse out from svg element
            var toElement = e.toElement ? e.toElement : e.relatedTarget;
            if (toElement === null || toElement.nodeName !== "svg" && toElement.parentNode.nodeName !== "svg" && toElement.id !== this.options.cursor_id) {
                if (_internal.is_mousedown === true) {
                    log("Mouse out: " + e.offsetX + "," + e.offsetY);

                    endElement();
                }
                removeCur();
            }
        },

        setColor: function (color) {
            _internal.config.color = color;
        },

        setPainterSize: function (radius) {
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
            if (_internal.undo.length) {
                var undo = _internal.undo.pop(),
                    _index = undo.id,
                    _value = undo.value,
                    revs = _value === "d" ? "a" : "d";

                // push redo
                _internal.redo.push({id: _index, value: revs});

                if (_value === "d") {
                    var elm = get(this.options.element_prefix + _index);
                    _internal.canvasStack.elements[_index].is_delelted = true;
                    if (elm) {
                        elm.parentNode.removeChild(elm);
                    }
                } else {
                    var config = _internal.canvasStack.elements[_index].config;
                    config.opacity = config.opacity * 2;
                    draw(config);
                }
            }
        },

        redo: function () {
            if (_internal.redo.length) {
                var redo = _internal.redo.pop(),
                    _index = redo.id,
                    _value = redo.value,
                    revs = _value === "d" ? "a" : "d";

                // push undo
                _internal.undo.push({id: _index, value: revs});

                if (_value === "d") {
                    var elm = get(this.options.element_prefix + _index);
                    _internal.canvasStack.elements[_index].is_delelted = true;
                    if (elm) {
                        elm.parentNode.removeChild(elm);
                    }
                } else {
                    var config = _internal.canvasStack.elements[_index].config;
                    config.opacity = config.opacity * 2;
                    draw(config);
                }
            }
        },

        getInternal: function () {
            return _internal;
        },

        reset: function () {
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
    /**
     * Core
     */
    function addPoint(point) {
        var len = getPoints().push(point);
        if (len > 2 && len % 2 === 0) {
            draw(_internal.config);
        }
    }

    function makeElement(tag, attrs) {
        var el = document.createElementNS("http://www.w3.org/2000/svg", tag);
        for (var k in attrs) {
            if (attrs.hasOwnProperty(k)) {
                el.setAttribute(k, attrs[k]);
            }
        }
        return el;
    }

    function _initElements(index) {
        _internal.canvasStack.elements[index] = {
            config: {
                element_index: index,
                tool: _internal.config.tool,
                painter_radius: _internal.config.painter_radius,
                opacity: _internal.config.opacity,
                color: _internal.config.color,
            },
            points: [],
            is_delelted: false
        };
        return _internal.canvasStack.elements[index];
    }

    function endElement() {
        _internal.is_mousedown = false;

        var _index = _internal.config.element_index,
            element = get(_self.options.element_prefix + _index);
        if (element) {
            element.setAttribute("opacity", _internal.config.opacity);
        }

        // redo & undo
        for (var i in _internal.redo) {
            if (_internal.redo.hasOwnProperty(i)) {
                var o = _internal.redo[i],
                    revs = _internal.redo[i].value === "d" ? "a" : "d";
                _internal.undo.push({id: _internal.redo[i].id, value: revs});
                _internal.undo.push({id: _internal.redo[i].id, value: _internal.redo[i].value});
            }
        }
        _internal.undo.push({id: _index, value: "d"});
        _internal.redo = [];

        _internal.canvasStack.head = _internal.config.element_index ++;
    }

    function _eventHandler(e) {
        if (_internal.EVENTS[e.type] && typeof _internal.EVENTS[e.type] === "function") {
            _internal.EVENTS[e.type].call(_self, e);
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
            // fix for undo/redo odd number of points, need refactor
            last = len % 2 === 0 ? len - 1 : len - 2;
        var d = "M" + points[0].x + "," + points[0].y + " Q",
            n = points.length;
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

    function getPoints(index) {
        var _index = index === undefined ? _internal.config.element_index : index;
        if (_internal.canvasStack.elements[_index] === undefined) {
            if (_index === _internal.config.element_index) {
                return _initElements(_index).points;
            }
            return undefined;
        }
        return _internal.canvasStack.elements[_index].points;
    }

    function getPoint(elm_index, point_index) {
        var points = getPoints(elm_index);
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
            styleList = _internal.el.getAttribute("class");
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
     * Helper funcions
     */
    function getPointFromEvent(e) {
        return {
            x: e.offsetX,
            y: e.offsetY
        };
    }

    function get(id) {
        return document.getElementById(id);
    }

    // shallow copy
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

    function log(data) {
        if (_self.options.debug === true) {
            console.log(data);
        }
    }

    window.mPainter = mPainter;

})(window);
