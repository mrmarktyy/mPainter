(function (window, undefined) {
    "use strict";

    var mPainter = window.mPainter || {},
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
                element_prefix: "element_"
            };

            this.options = _extend({}, defaults, options);

            this._internal = {
                el: get(this.options.id),

                tool: "PAINT",

                element_index: 0,

                is_mousedown: false,
                points: [],
                painter_radius: 3,
                opacity: 1,
                color: "#FF0000"  // red
            };

            this._initMouseEvents();
        },

        _initMouseEvents: function () {
            /**
             * Mouse down
             */
            get(this.options.id).addEventListener("mousedown", function (e) {
                log("Mouse down: " + e.offsetX + "," + e.offsetY);
                // Fix dragging in svg with text cursor issue
                e.preventDefault();

                addPoint(getPointFromEvent(e));

                _self._internal.is_mousedown = true;
            });
             /**
             * Mouse move
             */
            get(this.options.id).addEventListener("mousemove", function (e) {
                if (_self._internal.is_mousedown === true) {
                    log("Mouse move to: " + e.offsetX + "," + e.offsetY);

                    addPoint(getPointFromEvent(e));
                }

                updateCursorPosition(e);
            });
            /**
             * Mouse Up
             */
            // TODO: Add throttle
            get(this.options.id).addEventListener("mouseup", function (e) {
                if (_self._internal.is_mousedown === true) {
                    log("Mouse up: " + e.offsetX + "," + e.offsetY);
                    addPoint(getPointFromEvent(e));

                    _endElement();
                }
            });
            /**
             * Mouse enter
             */
            get(this.options.id).addEventListener("mouseover", function (e) {
                if (isOutside(e, this)) {
                    log("Mouse enter", e);

                    newCursor(e);
                }
            }, false);
            /**
             * Mouse out
             */
            get(this.options.id).addEventListener("mouseout", function (e) {
                // check if truly mouse out from svg element
                var toElement = e.toElement ? e.toElement : e.relatedTarget;
                if (toElement === null || toElement.nodeName !== "svg" && toElement.parentNode.nodeName !== "svg" && toElement.id !== _self.options.cursor_id) {
                    if (_self._internal.is_mousedown === true) {
                        log("Mouse out: " + e.offsetX + "," + e.offsetY);

                        _endElement();
                    }
                    removeCursor();
                }
            });
        },

        setColor: function (color) {
            this._internal.color = color;
        },

        setPainterSize: function (radius) {
            this._internal.painter_radius = radius;
        },

        setOpacity: function (opacity) {
            this._internal.opacity = opacity;
        },

        setTool: function (tool) {
            this._internal.tool = tool;
        },

        reset: function () {
            this._internal.points = [];
            this._internal.element_index = 0;
            this._internal.is_mousedown = false;

            var svg = this._internal.el;
            while (svg.lastChild) {
                svg.removeChild(svg.lastChild);
            }

        }

    };

    /**
     * Core
     */
    function addPoint(point) {
        var len = _self._internal.points.push(point);
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
        var points = _self._internal.points;
        var d = "M" + points[0].x + "," + points[0].y + " Q",
            n = points.length;
        for (var i = 1; i < n - 1; i++) {
            d += points[i].x + "," + points[i].y + " ";
        }
        d += "T" + points[n - 1].x + "," + points[n - 1].y;
        return d;
    }

    function _endElement() {
        _self._internal.is_mousedown = false;
        _self._internal.points = [];

        var element = get(_self.options.element_prefix + _self._internal.element_index);
        if (element) {
            element.setAttribute("opacity", _self._internal.opacity);
        }

        _self._internal.element_index ++;
    }

    function getPoint(index) {
        if (index === undefined) {
            return _self._internal.points[_self._internal.points.length - 1];
        } else {
            return _self._internal.points[index];
        }
    }

    /**
     * Draw
     */
    function draw() {
        switch (_self._internal.tool) {
        case "PAINT":
            drawPath();
            break;
        case "LINE":
            drawLine();
            break;
        default:
            // TODO: throw error
            break;
        }

    }

    function drawPath() {
        var element_id = _self.options.element_prefix + _self._internal.element_index,
            path = get(element_id);
        if (path) {
            path.setAttribute("d", makeD());
        } else {
            path = makeElement("path", {
                "id": element_id,
                "d": makeD(),
                "fill": "none",
                "stroke": _self._internal.color,
                "stroke-linecap": "round",
                "stroke-width": _self._internal.painter_radius * 2,
                "opacity": _self._internal.opacity / 2
            });
            _self._internal.el.appendChild(path);
        }
    }

    function drawLine() {
        var element_id = _self.options.element_prefix + _self._internal.element_index,
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
                "stroke-width": _self._internal.painter_radius * 2,
                "stroke": _self._internal.color,
                "opacity": _self._internal.opacity / 2
            });
            _self._internal.el.appendChild(line);
        }
    }

    /**
     * Cursor
     */
    function newCursor(e) {
        var cursor = makeElement("circle", {
            "id": _self.options.cursor_id,
            "cx": e.offsetX,
            "cy": e.offsetY,
            "r": _self._internal.painter_radius,
            "stroke": _self._internal.color,
            "fill": _self._internal.color
        });
        _self._internal.el.appendChild(cursor);
    }

    function updateCursorPosition(e) {
        var cursor = get(_self.options.cursor_id);
        cursor.setAttribute("cx", e.offsetX);
        cursor.setAttribute("cy", e.offsetY);
    }

    function removeCursor() {
        var cursor = get(_self.options.cursor_id);
        if (cursor) {
            cursor.parentNode.removeChild(cursor);
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