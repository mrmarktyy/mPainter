(function (window, undefined) {
    "use strict";

    var mPainter = window.mPainter || {},
        _internal = {},
        _self,
        _xmlns = 'http://www.w3.org/2000/svg';

    /**
     * Initialization
     */
    mPainter = function (hook, options) {
        var defaults = {
                id: "m-board",
                cursor_id: "m-cursor",
                element_prefix: "element_",
                tool: "PAINT",

                width: 600,
                height: 400,
                hook_id: hook,

                start_trigger : ['mousedown', 'touchstart', 'MSPointerDown'],
                move_trigger  : ['mousemove', 'touchmove', 'MSPointerMove'],
                stop_trigger  : ['mouseup', 'touchend', 'touchcancel', 'MSPointerUp'],

                debug: false,

                UI: {
                    widget_group_classname: 'm-button-groups'
                },
                WIDGETS: {
                    COLOR: {
                        hex: ['#FF0000', '#0063DC', '#66CEFF', '#73BA37', '#FFCC33', '#E47911', '#FF0084', '#6441A5',
                        '#C7C5E6', '#171515']
                    },
                    TOOLS: [
                        "PAINT", "LINE"
                    ],
                    PAINT_TYPE: {
                        PAINT: {
                            text: 'Paint',
                            icon: '\u2710'
                        },
                        LINE: {
                            text: 'Line',
                            icon: '\u2711'
                        }
                    },
                    UNDO: {
                        text: 'Undo',
                        icon: '\u21B6'
                    },
                    REDO: {
                        text: 'Redo',
                        icon: '\u21B7'
                    },
                    REPLAY: {
                        text: 'Replay',
                        icon: '\u27F3'
                    },
                    RESET: {
                        text: 'Reset',
                        icon: '\u2672',
                    }
                }
            };

        this.options = _extend(defaults, options);
        _self = this;

        renderUI();

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
            };
            img.src = url;
        },

        replay: function (callback) {
            var elements = _internal.paint_stack.elements,
                elements_length = elements.length,
                _raf = _requestAnimationFrame(),
                replay_time = time(),
                deleted_time = 0,
                element_begin = 0,
                point_begin = 0,
                number_drew = 0,
                replay_points = [];

            clearPaint();
            var render = function () {
                var i, j, element_end,
                    before_time = _internal.paint_start + deleted_time + (time() - replay_time);
                // find element_end
                for (element_end = element_begin; element_end <= elements_length - 1; element_end++) {
                    var points = elements[element_end].points,
                        first_timestamp = points[0].timestamp,
                        last_timestamp = points[points.length - 1].timestamp;
                    if (elements[element_end].is_deleted === true) {
                        deleted_time += last_timestamp - first_timestamp;
                        continue;
                    }
                    if (last_timestamp > before_time) {
                        break;
                    }
                }
                if (element_end > elements_length - 1) {
                    element_end = elements_length - 1;
                }

                for (i = element_begin; i <= element_end; i++) {
                    var element = elements[i],
                        points_length = element.points.length;
                    if (element.is_deleted === true) {
                        continue;
                    }
                    for (j = point_begin; j < points_length; j++) {
                        var point = element.points[j];
                        if (point.timestamp > before_time) {
                            point_begin = j;
                            break;
                        }
                        replay_points.push(point);
                        draw(element.config, replay_points);
                        if (replay_points.length === points_length) {
                            point_begin = 0;
                            replay_points = [];
                            number_drew ++;
                            setElementOpacity(element.config);
                        }
                    }
                }
                // If replay not done do recursion, otherwise execute callback
                if (number_drew === elements_length) {
                    if (callback !== undefined && isFunction(callback)) {
                        callback();
                    }
                } else {
                    element_begin = element_end;
                    _raf(render);
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
    /**
     * Render paint board and required buttons
     */
    function renderUI() {
        renderPaintBoard();
        renderWidgets();
    }

    function renderPaintBoard() {
        var hook = _get(_self.options.hook_id);
        if (!hook) {
            throw 'Hook #: ' + _self.options.hook_id + ' is not found on the page. mPainter initilization failure.';
        }
        var _svg = makeElement('svg', {
            'id': _self.options.id,
            'width': _self.options.width,
            'height': _self.options.height,
        });
        hook.appendChild(_svg);
    }

    function renderWidgets() {
        var hook = _get(_self.options.hook_id),
            button_groups = document.createElement('div');
        button_groups.setAttribute('class', _self.options.UI.widget_group_classname);

        var rendered_colors = renderColors();
        button_groups.appendChild(rendered_colors.color_selected);
        button_groups.appendChild(rendered_colors.color_list);
        var rendered_tools = renderTools();
        button_groups.appendChild(rendered_tools.tool_selected);
        button_groups.appendChild(rendered_tools.tool_list);

        // for (var i = 0, n = _self.options.WIDGETS.length; i < n; i++) {
        //     var ul = document.createElement('ul');
        //     var group = _self.options.WIDGETS[i];
        //     for (var icon_type in group) {
        //         if (group.hasOwnProperty(icon_type)) {
        //             var icon_config = group[icon_type],
        //                 li = document.createElement('li');
        //             if (icon_config.icon) {
        //                 var span = document.createElement('span');
        //                 span.appendChild(document.createTextNode(icon_config.icon));
        //                 li.appendChild(span);
        //             }
        //             li.appendChild(document.createTextNode(icon_config.text));
        //             bindClick(li, icon_type);
        //             ul.appendChild(li);
        //         }
        //     }
        //     button_groups.appendChild(ul);
        // }

        hook.insertBefore(button_groups, hook.childNodes[0]);
    }

    function renderColors() {
        var wrapper = document.createElement('div');
        wrapper.setAttribute('class', 'm-color-selector');

        var ul_color_list = document.createElement('ul');
        ul_color_list.setAttribute('class', 'm-color-list');

        wrapper.addEventListener('mouseover', function (e) {
            ul_color_list.setAttribute('style', 'display:block;');
        }, false);
        wrapper.addEventListener('mouseout', function (e) {
            var toElement = e.toElement || e.relatedTarget;
            if (toElement !== wrapper && toElement !== ul_color_list) {
                ul_color_list.setAttribute('style', 'display:none;');
            }
        }, false);

        var div_color_selected = document.createElement('div');
        div_color_selected.setAttribute('style', 'background-color:' + _self.options.WIDGETS.COLOR.hex[0]);
        wrapper.appendChild(div_color_selected);

        for (var i = 0, n = _self.options.WIDGETS.COLOR.hex.length; i < n; i++) {
            var li = document.createElement('li'),
                div_color = document.createElement('div'),
                hex = _self.options.WIDGETS.COLOR.hex[i];
            div_color.setAttribute('class', 'm-color');
            div_color.setAttribute('style', 'background-color:' + hex);
            li.appendChild(div_color);
            ul_color_list.appendChild(li);
        }
        ul_color_list.addEventListener('click', function (e) {
            if (e.target.className.indexOf('m-color') !== -1) {
                var hex = e.target.style['background-color'];
                _self.setColor(hex);
                div_color_selected.setAttribute('style', 'background-color:' + hex);
            }
        }, false);
        ul_color_list.addEventListener('mouseout', function (e) {
            var toElement = e.toElement || e.relatedTarget,
                fromElement = e.fromElement || e.relatedTarget;
            if ((fromElement === ul_color_list || isDescendant(ul_color_list, fromElement)) &&
               (toElement === ul_color_list || isDescendant(ul_color_list, toElement))) {
                return;
            }
            ul_color_list.setAttribute('style', 'display:none;');
        });

        return {color_selected: wrapper, color_list: ul_color_list};
    }
    function renderTools() {
        var wrapper = document.createElement('div');
        wrapper.setAttribute('class', 'm-tool-selector');

        var ul_tool_list = document.createElement('ul');
        ul_tool_list.setAttribute('class', 'm-tool-list');

        wrapper.addEventListener('mouseover', function (e) {
            ul_tool_list.setAttribute('style', 'display:block;');
        }, false);
        wrapper.addEventListener('mouseout', function (e) {
            var toElement = e.toElement || e.relatedTarget;
            if (toElement !== wrapper && toElement !== ul_tool_list) {
                ul_tool_list.setAttribute('style', 'display:none;');
            }
        }, false);

        var div_tool_selected = document.createElement('div');
        div_tool_selected.setAttribute('class', 'm-tool-icon');
        div_tool_selected.appendChild(document.createTextNode(_self.options.WIDGETS.PAINT_TYPE.PAINT.icon));
        wrapper.appendChild(div_tool_selected);

        for (var i = 0, n = _self.options.WIDGETS.TOOLS.length; i < n; i++) {
            var tool = _self.options.WIDGETS.TOOLS[i],
                li = document.createElement('li'),
                div_tool = document.createElement('div'),
                icon = _self.options.WIDGETS.PAINT_TYPE[tool].icon;
            div_tool.setAttribute('class', 'm-tool');
            div_tool.setAttribute('data-tool', tool);
            div_tool.appendChild(document.createTextNode(icon));
            li.appendChild(div_tool);
            ul_tool_list.appendChild(li);
        }
        ul_tool_list.addEventListener('click', function (e) {
            if (e.target.className.indexOf('m-tool') !== -1) {
                var tool = e.target.getAttribute('data-tool');
                _self.setTool(tool);
                // div_color_selected.get('style', 'background-color:' + hex);
            }
        }, false);
        ul_tool_list.addEventListener('mouseout', function (e) {
            var toElement = e.toElement || e.relatedTarget,
                fromElement = e.fromElement || e.relatedTarget;
            if ((fromElement === ul_tool_list || isDescendant(ul_tool_list, fromElement)) &&
               (toElement === ul_tool_list || isDescendant(ul_tool_list, toElement))) {
                return;
            }
            ul_tool_list.setAttribute('style', 'display:none;');
        });

        return {tool_selected: wrapper, tool_list: ul_tool_list};
    }
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
    function bindClick(el, type) {
        var _method, _args;
        switch (type) {
        case 'UNDO':
            _method = 'undo';
            break;
        case 'REDO':
            _method = 'redo';
            break;
        case 'REPLAY':
            _method = 'replay';
            break;
        case 'RESET':
            _method = 'reset';
            break;
        case 'PAINT':
            _method = 'setTool';
            _args = [type];
            break;
        case 'LINE':
            _method = 'setTool';
            _args = [type];
            break;
        }
        if (typeof _self[_method] === 'function') {
            el.addEventListener('click', _bind(_self[_method], _self, _args), false);
        }
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

        addPoint(point, _internal.config);

        _internal.is_mousedown = true;
    }
    // TODO: Add throttle if necessary
    function paintMove(e) {
        if (_internal.is_mousedown === true) {
            e.preventDefault();
            e.stopPropagation();

            var point = getPointFromEvent(e);
            log("Move: " + point.x + "," + point.y);

            addPoint(point, _internal.config);
        }

        updateCur(e);
    }

    function paintStop(e) {
        e.preventDefault();
        e.stopPropagation();

        var point = getPointFromEvent(e);
        log('Stop: ' + point.x + ',' + point.y);

        addPoint(point, _internal.config);

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
    function addPoint(point, config) {
        getPointsArr(config.element_index).push(point);

        draw(config);
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
        var points = points_arr || getPointsArr(element_index),
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

    function getPointsArr(element_index) {
        if (_internal.paint_stack.elements[element_index] === undefined) {
            return initElement(element_index).points;
        }
        return _internal.paint_stack.elements[element_index].points;
    }

    function getPoint(points_arr, element_index, point_index) {
        var points = points_arr || getPointsArr(element_index);
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
        var elm = document.createElementNS(_xmlns, tag);
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

    function isFunction(fn) {
        return typeof fn === 'function';
    }

    function isDescendant(parent, child) {
        var node = child.parentNode;
        while (node != null) {
            if (node == parent) {
                return true;
            }
            node = node.parentNode;
        }
        return false;
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

    function _bind(f, context, args) {
        var __method = f;
        return function () {
            __method.apply(context, args || arguments);
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

