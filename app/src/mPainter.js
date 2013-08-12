/* global $ */
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

            this.options = $.extend({}, defaults, options);

            this._internal = {
                el: get(this.options.id),

                tool: "paint",
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
            $(document).on("mousedown", "#" + this.options.id, function (e) {
                log('Mouse down: ' + e.offsetX + ',' + e.offsetY);
                // Fix dragging in svg with text cursor issue
                e.originalEvent.preventDefault();

                addPoint(getPointFromEvent(e));
                _self._internal.is_mousedown = true;
            });
             /**
             * Mouse move
             */
            $(document).on("mousemove", "#" + this.options.id, function (e) {
                if (_self._internal.is_mousedown === true) {
                    log('Mouse move to: ' + e.offsetX + ',' + e.offsetY);

                    addPoint(getPointFromEvent(e));
                }

                updateCursorPosition(e);
            });
            /**
             * Mouse Up
             */
            // TODO: Add throttle
            $(document).on("mouseup", "#" + this.options.id, function (e) {
                if (_self._internal.is_mousedown === true) {
                    log('Mouse up: ' + e.offsetX + ',' + e.offsetY);
                    var point = getPointFromEvent(e);

                    addPoint(point);

                    _endElement();
                }
            });
            /**
             * Mouse enter
             */
            $(document).on("mouseenter", "#" + this.options.id, function (e) {
                log('Mouse enter', e);
                newCursor(e);
            });
            /**
             * Mouse out
             */
            $(document).on("mouseout", "#" + this.options.id, function (e) {
                // check if truly mouse out from svg element
                var toElement = e.toElement ? e.toElement : e.relatedTarget;
                if (toElement === null || toElement.nodeName !== "svg" && toElement.parentNode.nodeName !== "svg" && toElement.id !== _self.options.cursor_id) {
                    if (_self._internal.is_mousedown === true) {
                        log('Mouse out: ' + e.offsetX + ',' + e.offsetY);

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
            drawPath();
        }
    }

    function drawPath() {
        var path_id = _self.options.element_prefix + _self._internal.element_index,
            path = get(path_id);
        if (path) {
            path.setAttribute("d", makeD());
        } else {
            path = makeElement("path", {
                "id": path_id,
                "d": makeD(),
                "fill": "none",
                "stroke": _self._internal.color,
                "stroke-width": _self._internal.painter_radius * 2,
                "stroke-linecap": "round",
                "opacity": "0.5"
            });
            _self._internal.el.appendChild(path);
        }
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

    function makeElement(tag, attrs) {
        var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
        for (var k in attrs) {
            el.setAttribute(k, attrs[k]);
        }
        return el;
    }

    function newCursor(e) {
        var cursor = makeElement('circle', {"id": _self.options.cursor_id, "cx": e.offsetX, "cy": e.offsetY, "r": _self._internal.painter_radius, "stroke": _self._internal.color, "fill": _self._internal.color});
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

    function _endElement() {
        _self._internal.is_mousedown = false;
        _self._internal.points = [];

        var element = get(_self.options.element_prefix + _self._internal.element_index);
        element.setAttribute("opacity", _self._internal.opacity);

        _self._internal.element_index ++;
    }

    function getPointFromEvent(e) {
        return {
            x: e.offsetX,
            y: e.offsetY
        };
    }

    function log(data) {
        if (_self.options.debug === true) {
            console.log(data);
        }
    }

    function get(id) {
        return document.getElementById(id);
    }

    window.mPainter = mPainter;

})(window);