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

                start_trigger : ['mousedown', 'touchstart', 'MSPointerDown'],
                move_trigger  : ['mousemove', 'touchmove', 'MSPointerMove'],
                stop_trigger  : ['mouseup', 'touchend', 'touchcancel', 'MSPointerUp'],
            };
        this.options = _extend(defaults, options);

        _self = this;
        _internal = {
            el: _get(this.options.id),
            undo: [],
            redo: [],

            is_mousedown: false,
            first_draw: true,
            paint_start: undefined,
            paint_stack: {
                head: 0,
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
        // TODO FIX: Function does not work
        saveImage: function () {
            // Create a canvas element
            var canvas = _get("mycanvas");
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
            img.src = url;
        },

        replay: function () {
            var elements = _internal.paint_stack.elements,
                len = elements.length,
                _raf = _requestAnimationFrame(),
                replay_time = time(),
                element_begin = 0,
                point_begin = 0,
                replay_points = [];

            clearPaint();
            console.log(elements);

            var render = function () {
                // stop repeat
                if (element_begin >= len) {
                    return;
                }
                _raf(render);

                console.log(element_begin, point_begin);

                var i, j, n, element_end,
                    dt = time() - replay_time,
                    before_time = _internal.paint_start + dt;

                // search for element_end
                for (element_end = element_begin; element_end <= len - 1; i++) {
                    var points = elements[element_end].points;
                    if (points[points.length - 1].timestamp > before_time) {
                        break;
                    }
                }
                // prepare for drawing
                for (i = element_begin; i <= element_end; i++) {
                    var elm = elements[i];
                    for (j = point_begin, n = elm.points.length; j <= n - 1; j++) {
                        var point = elm.points[j];
                        point_begin = j;
                        if (point.timestamp > before_time) {
                            console.log('break', j, n - 1);
                            break;
                        }

                        console.log(point);
                        replay_points.push(point);
                        draw(elm.config, replay_points);

                        if (j === n - 1) {
                            point_begin = 0;
                            replay_points = [];
                            setElementOpacity(elm.config);
                        }
                    }
                }

                console.log(point_begin);

                if (element_end === len - 1 && point_begin === n - 1 && replay_points === []) {
                    console.log('exit');
                    element_begin = len;
                } else {
                    element_begin = element_end;
                }

            };
            _raf(render);
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
                    _internal.paint_stack.elements[_index].is_deleted = false;
                    var config = _internal.paint_stack.elements[_index].config;
                    // fix half opacity issue
                    config.opacity *= 2;
                    draw(config);
                    break;
                case "d":
                    _internal.paint_stack.elements[_index].is_deleted = true;
                    removeElement(_index);
                    break;
                }
            }
        },
        // TODO REMOVE: development use only
        getInternal: function () {
            return _internal;
        },

        reset: function () {
            _internal.undo = [];
            _internal.redo = [];
            _internal.config.element_index = 0;
            _internal.is_mousedown = false;
            _internal.first_draw = true;
            _internal.paint_start = undefined;
            _internal.paint_stack = {
                head: 0,
                elements: []
            };

            clearPaint();
        }

    };
    // TODO REFACTOR:
    function bindEvents() {
        _self.options.start_trigger.forEach(function (eventType) {
            _internal.el.addEventListener(eventType, paintStart, false);
        });
        _self.options.move_trigger.forEach(function (eventType) {
            _internal.el.addEventListener(eventType, paintMove, false);
        });
        _self.options.stop_trigger.forEach(function (eventType) {
            _internal.el.addEventListener(eventType, paintStop, false);
        });
        _internal.el.addEventListener("mouseover", mouseOver, false);
        _internal.el.addEventListener("mouseout", mouseOut, false);
    }
    // function _eventHandler(e) {
    //     if (_internal.EVENTS[e.type] && typeof _internal.EVENTS[e.type] === "function") {
    //         _internal.EVENTS[e.type].call(_self, e);
    //     }
    // }
    /**
     * Events handlers
     */
    function paintStart(e) {
        // Fix moving in svg with text cursor issue
        e.preventDefault();
        e.stopPropagation();

        // set paint_start timestamp
        if (_internal.first_draw === true) {
            _internal.first_draw = false;
            _internal.paint_start = time();
        }

        var point = getPointFromEvent(e);
        log("Start: " + point.x + "," + point.y);

        addPoint(point);

        _internal.is_mousedown = true;
    }
    // TODO: Add throttle if necessary
    function paintMove(e) {
        if (_internal.is_mousedown === true) {
            e.preventDefault();
            e.stopPropagation();

            var point = getPointFromEvent(e);
            log("Move: " + point.x + "," + point.y);

            addPoint(point);
        }

        updateCur(e);
    }

    function paintStop(e) {
        e.preventDefault();
        e.stopPropagation();

        var point = getPointFromEvent(e);
        log('Stop: ' + point.x + ',' + point.y);

        addPoint(point);

        endElement();
    }

    function mouseOver(e) {
        if (isOutside(e, _internal.el)) {
            log('Enter', e);

            newCur(e);
        }
    }

    function mouseOut(e) {
        // check if truly mouse out from svg element
        var toElement = e.toElement ? e.toElement : e.relatedTarget;
        if (toElement === null || toElement.nodeName !== "svg" && toElement.parentNode.nodeName !== "svg" && toElement.id !== _self.options.cursor_id) {
            if (_internal.is_mousedown === true) {
                log('Out', e);

                endElement();
            }

            removeCur();
        }
    }
    /**
     * Core
     */
    function addPoint(point) {
        var points_arr = getPoints(_internal.config.element_index);
        points_arr.push(point);

        draw(_internal.config);
    }

    function initElement(element_index) {
        _internal.paint_stack.elements[element_index] = {
            config: {
                element_index: element_index,
                tool: _internal.config.tool,
                painter_radius: _internal.config.painter_radius,
                opacity: _internal.config.opacity,
                color: _internal.config.color
            },
            points: [],
            is_deleted: false
        };
        return _internal.paint_stack.elements[element_index];
    }

    function endElement() {
        _internal.is_mousedown = false;

        setElementOpacity(_internal.config);

        // setup redo & undo
        for (var i = _internal.redo.length - 1; i >= 0; i--) {
            _internal.undo.push({id: _internal.redo[i].id, value: revs(_internal.redo[i].value)});
        }
        for (var j = 0, n = _internal.redo.length; j < n; j++) {
            _internal.undo.push({id: _internal.redo[j].id, value: _internal.redo[j].value});
        }
        _internal.undo.push({id: _internal.config.element_index, value: "d"});
        _internal.redo = [];
        _internal.config.element_index ++;
        // _internal.paint_stack.head = _internal.config.element_index ++;
    }

    function removeElement(index) {
        var elm = _get(_self.options.element_prefix + index);
        if (elm) {
            elm.parentNode.removeChild(elm);
        }
    }

    function setElementOpacity(config) {
        console.log('opacity', config);
        var element = _get(_self.options.element_prefix + config.element_index);
        if (element) {
            element.setAttribute("opacity", config.opacity);
        }
    }

    function clearPaint() {
        while (_internal.el.lastChild) {
            _internal.el.removeChild(_internal.el.lastChild);
        }
    }
    /**
     * Draw
     */
    function draw(config, points) {
        switch (config.tool) {
        case _internal.TOOLS.PAINT:
            drawPath(config, points);
            break;
        case _internal.TOOLS.LINE:
            drawLine(config, points);
            break;
        }
    }

    function drawPath(config, points) {
        var element_id = _self.options.element_prefix + config.element_index,
            path = _get(element_id);
        if (path) {
            path.setAttribute("d", makeD(config.element_index, points));
        } else {
            path = makeElement("path", {
                "id": element_id,
                "d": makeD(config.element_index, points),
                "fill": "none",
                "stroke": config.color,
                "stroke-linecap": "round",
                "stroke-width": config.painter_radius * 2,
                "opacity": config.opacity / 2
            });
            _internal.el.appendChild(path);
        }
    }

    function makeD(element_index, points_arr) {
        var points = points_arr || getPoints(element_index),
            len = points.length,
            last = len % 2 === 0 ? len - 1 : len - 2,
            d = "M" + points[0].x + "," + points[0].y;
        // if only has 1-3 points
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

    function drawLine(config, points) {
        var element_id = _self.options.element_prefix + config.element_index,
            line = _get(element_id);
        if (line) {
            var point = getPoint(points, config.element_index);
            line.setAttribute("x2", point.x);
            line.setAttribute("y2", point.y);
        } else {
            var point_1 = getPoint(points, config.element_index, 0),
                point_2 = getPoint(points, config.element_index);
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
        if (_internal.paint_stack.elements[element_index] === undefined) {
            return initElement(element_index).points;
        }
        return _internal.paint_stack.elements[element_index].points;
    }

    function getPoint(points_arr, element_index, point_index) {
        var points = points_arr || getPoints(element_index);
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
        var cursor = _get(_self.options.cursor_id);
        if (cursor) {
            cursor.setAttribute("cx", e.offsetX);
            cursor.setAttribute("cy", e.offsetY);
        }
    }

    function removeCur() {
        var cursor = _get(_self.options.cursor_id),
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
    function makeElement(tag, attrs) {
        var elm = document.createElementNS("http://www.w3.org/2000/svg", tag);
        for (var i in attrs) {
            if (attrs.hasOwnProperty(i)) {
                elm.setAttribute(i, attrs[i]);
            }
        }
        return elm;
    }
     // normalize events
    function getPointFromEvent(event) {
        var e = event || window.event,
            x, y;
        if (!isTouch(e)) {
            x = e.offsetX;
            y = e.offsetY;
        } else if (e.targetTouches.length) {
            x = e.targetTouches[0].clientX;
            y = e.targetTouches[0].clientY - _internal.el.offsetTop + window.scrollY;
        } else {
            x = e.changedTouches[0].clientX;
            y = e.changedTouches[0].clientY - _internal.el.offsetTop + window.scrollY;
        }
        return { x: x, y: y, timestamp: time() };
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

    function time() {
        return +new Date();
    }

    function log(data) {
        if (_self.options.debug === true) {
            console.log(data);
        }
    }

    function isTouch(e) {
        return event.type.search('touch') > -1;
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

    function _requestAnimationFrame() {
        return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame  ||
        window.mozRequestAnimationFrame     ||
        function (callback) {
            window.setTimeout(callback, 1000 / 60);
        };
    }

    function _get(id) {
        return document.getElementById(id);
    }

    window.mPainter = mPainter;

})(window);

