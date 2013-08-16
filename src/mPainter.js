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

                is_mousedown: false,
                element_index: 0,
                canvasStack: {
                    head: -1,
                    elements: []
                },

                tool: this.options.tool,
                painter_radius: 3,
                opacity: 1,
                color: "#FF0000",  // red

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
            _internal.color = color;
        },

        setPainterSize: function (radius) {
            _internal.painter_radius = radius;
        },

        setOpacity: function (opacity) {
            _internal.opacity = opacity;
        },

        setTool: function (tool_name) {
            if (_internal.TOOLS[tool_name]) {
                _internal.tool = _internal.TOOLS[tool_name];
            } else {
                throw "TOOL: " + tool_name + " is not available.";
            }
        },

        getInternal: function () {
            return _internal;
        },

        reset: function () {
            _internal.element_index = 0;
            _internal.canvasStack = {
                head: -1,
                elements: []
            },
            _internal.is_mousedown = false;

            var svg = _internal.el;
            while (svg.lastChild) {
                svg.removeChild(svg.lastChild);
            }
        }

    };
    /**
     * Core
     */
    function addPoint(point) {
        var len = getPoints().push(point);
        if (len > 2 && len % 2 === 0) {
            draw();
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

    function makeD() {
        var points = getPoints();
        var d = "M" + points[0].x + "," + points[0].y + " Q",
            n = points.length;
        for (var i = 1; i < n - 1; i++) {
            d += points[i].x + "," + points[i].y + " ";
        }
        d += "T" + points[n - 1].x + "," + points[n - 1].y;
        return d;
    }

    function getPoint(index) {
        var points = getPoints();
        if (index === undefined) {
            return points[points.length - 1];
        } else {
            return points[index];
        }
    }

    function getPoints(index) {
        var _index = index ? index : _internal.element_index;
        if (_internal.canvasStack.elements[_index] === undefined) {
            if (_index === _internal.element_index) {
                return _initElements(_index).points;
            }
            return undefined;
        }
        return _internal.canvasStack.elements[_index].points;
    }

    function _initElements(index) {
        _internal.canvasStack.elements[index] = {
            tool: _internal.tool,
            painter_radius: _internal.painter_radius,
            opacity: _internal.opacity,
            color: _internal.color,
            points: []
        };
        return _internal.canvasStack.elements[index];
    }

    function endElement() {
        _internal.is_mousedown = false;

        var element = get(_self.options.element_prefix + _internal.element_index);
        if (element) {
            element.setAttribute("opacity", _internal.opacity);
        }

        _internal.canvasStack.head ++;
        _internal.element_index ++;
    }

    function _eventHandler(e) {
        if (_internal.EVENTS[e.type] && typeof _internal.EVENTS[e.type] === "function") {
            _internal.EVENTS[e.type].call(_self, e);
        }
    }

    /**
     * Draw
     */
    function draw() {
        switch (_internal.tool) {
        case _internal.TOOLS.PAINT:
            drawPath();
            break;
        case _internal.TOOLS.LINE:
            drawLine();
            break;
        }
    }

    function drawPath() {
        var element_id = _self.options.element_prefix + _internal.element_index,
            path = get(element_id);
        if (path) {
            path.setAttribute("d", makeD());
        } else {
            path = makeElement("path", {
                "id": element_id,
                "d": makeD(),
                "fill": "none",
                "stroke": _internal.color,
                "stroke-linecap": "round",
                "stroke-width": _internal.painter_radius * 2,
                "opacity": _internal.opacity / 2
            });
            _internal.el.appendChild(path);
        }
    }

    function drawLine() {
        var element_id = _self.options.element_prefix + _internal.element_index,
            line = get(element_id);
        if (line) {
            var point = getPoint();
            line.setAttribute("x2", point.x);
            line.setAttribute("y2", point.y);
        } else {
            var point_1 = getPoint(0),
                point_2 = getPoint();
            line = makeElement("line", {
                "id": element_id,
                "x1": point_1.x,
                "y1": point_1.y,
                "x2": point_2.x,
                "y2": point_2.y,
                "stroke-linecap": "round",
                "stroke-width": _internal.painter_radius * 2,
                "stroke": _internal.color,
                "opacity": _internal.opacity / 2
            });
            _internal.el.appendChild(line);
        }
    }

    /**
     * Cursor
     */
    function newCur(e) {
        switch (_internal.tool) {
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
            "r": _internal.painter_radius,
            "stroke": _internal.color,
            "fill": _internal.color
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
