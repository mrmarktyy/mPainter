(function (window, undefined) {
    'use strict';

    var mPainter = window.mPainter || {},
        _internal = {},
        _self,
        _xmlns = 'http://www.w3.org/2000/svg';

    /**
     * Initialization
     */
    mPainter = function (hook, options) {
        var defaults = {
                id: 'm-board',
                cursor_id: 'm-cursor',
                element_prefix: 'element_',
                ui: {
                    widget: {
                        enable: true
                    }
                },

                width: 600,
                height: 400,
                hook_id: hook,

                start_trigger : ['mousedown', 'touchstart', 'MSPointerDown'],
                move_trigger  : ['mousemove', 'touchmove', 'MSPointerMove'],
                stop_trigger  : ['mouseup', 'touchend', 'touchcancel', 'MSPointerUp'],

                debug: false,
            },
            config = {
                UI: {
                    widget_group_classname: 'm-button-groups'
                },
                WIDGETS: {
                    COLOR: {
                        HEX: ['#FF0000', '#0063DC', '#66CEFF', '#73BA37', '#FFCC33', '#E47911', '#FF0084', '#6441A5',
                        '#C7C5E6', '#171515'],
                        ELEMENTS: []
                    },
                    TOOL: {
                        TYPE: ['FREE', 'LINE', 'RECT'],
                        FREE: {
                            NAME: 'FREE',
                            ICON: '\u2710'
                        },
                        LINE: {
                            NAME: 'LINE',
                            ICON: '\u2711'
                        },
                        RECT: {
                            NAME: 'RECT',
                            ICON: '\u32CC'
                        }
                    },
                    SIZE: [
                        4, 8, 12
                    ],
                    GENERAL: {
                        UNDO: {
                            METHOD: 'undo',
                            ICON: '\u21B6'
                        },
                        REDO: {
                            METHOD: 'redo',
                            ICON: '\u21B7'
                        },
                        REPLAY: {
                            METHOD: 'replay',
                            ICON: '\u27F3'
                        },
                        RESET: {
                            METHOD: 'reset',
                            ICON: '\u2672'
                        }
                    }
                }
            };

        this.options = _extend(defaults, options, config);
        _self = this;

        renderUI(this.options.ui);

        _internal = {
            el: _get(this.options.id),
            undo: [],
            redo: [],

            is_mousedown: false,
            replay_in_progress: false,
            paint_start: undefined,
            paint_stack: {
                elements: []
            },

            config: {
                element_index: 0,
                tool: this.options.WIDGETS.TOOL.TYPE[0],
                painter_radius: 2,
                opacity: 1,
                color: this.options.WIDGETS.COLOR.HEX[0]
            },
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
            if (this.options.WIDGETS.TOOL[tool_name]) {
                _internal.config.tool = tool_name;
            } else {
                throw 'TOOL: ' + tool_name + ' is not available.';
            }
        },

        undo: function () {
            exec('undo');
        },

        redo: function () {
            exec('redo');
        },
        // TODO FIX: Function does not work
        saveImage: function () {
            // Create a canvas element
            var canvas = _get('mycanvas');
            var ctx = canvas.getContext('2d');

            var data = new XMLSerializer().serializeToString(_internal.el);
            var DOMURL = window.URL || window.webkitURL || window;
            // var img = new Image();
            var img = document.createElement('img');
            var svg = new Blob([data], {type: 'image/svg+xml;charset=utf-8'});
            var url = DOMURL.createObjectURL(svg);
            img.onload = function () {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                // DOMURL.revokeObjectURL(url);
                var b64 = canvas.toDataURL('image/png');
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

            _internal.replay_in_progress = true;
            clearBoard();
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
                    _internal.replay_in_progress = false;
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

        getJSON: function () {
            return _internal.paint_stack;
        },

        setJSON: function (paint_stack) {
            if (paint_stack.elements !== undefined) {
                for (var i = 0, n = paint_stack.elements.length; i < n; i++) {
                    var element = paint_stack.elements[i];
                    if (element.is_deleted === false) {
                        // TODO: fix this hack
                        element.config.opacity *= 2;
                        draw(element.config, element.points);
                    }
                }
            }
        },

        reset: function () {
            _internal.undo = [];
            _internal.redo = [];
            _internal.config.element_index = 0;
            _internal.is_mousedown = false;
            _internal.replay_in_progress = false;
            _internal.paint_start = undefined;
            _internal.paint_stack = {
                elements: []
            };
            clearBoard();
        }

    };
    /**
     * Render paint board and required widgets
     */
    function renderUI(ui) {
        renderPaintBoard();
        if (ui.widget.enable === true) {
            renderWidgets(ui.widget);
        }
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

    function renderWidgets(widget_conf) {
        var hook = _get(_self.options.hook_id),
            button_groups = document.createElement('div');
        button_groups.setAttribute('class', _self.options.UI.widget_group_classname);

        var rendered_colors = renderColors();
        button_groups.appendChild(rendered_colors[0]);
        button_groups.appendChild(rendered_colors[1]);

        var rendered_tools = renderTools();
        button_groups.appendChild(rendered_tools[0]);
        button_groups.appendChild(rendered_tools[1]);

        var rendered_sizes = renderSizes();
        button_groups.appendChild(rendered_sizes[0]);
        button_groups.appendChild(rendered_sizes[1]);

        var rendered_general = renderGeneral();
        rendered_general.forEach(function (div) {
            button_groups.appendChild(div);
        });

        var div_clear = document.createElement('div');
        div_clear.style['clear'] = 'both';
        button_groups.appendChild(div_clear);

        hook.insertBefore(button_groups, hook.childNodes[0]);
    }

    function renderHierarchy(name, li_length, click_handler) {
        var wrapper = document.createElement('div');
        wrapper.setAttribute('class', 'm-' + name + '-selector');

        var ul_list = document.createElement('ul');
        ul_list.setAttribute('class', 'm-' + name + '-list');

        var div_selected = document.createElement('div');
        wrapper.appendChild(div_selected);

        var li_divs = [];
        for (var i = 0, n = li_length; i < n; i++) {
            var li = document.createElement('li'),
                div_inner = document.createElement('div');
            div_inner.setAttribute('class', 'm-' + name);
            li.appendChild(div_inner);
            ul_list.appendChild(li);
            li_divs.push(div_inner);
        }

        wrapper.addEventListener('mouseover', function (e) {
            ul_list.style['display'] = 'block';
        }, false);
        wrapper.addEventListener('mouseout', function (e) {
            var toElement = e.toElement || e.relatedTarget;
            if (!isDescendant(ul_list, toElement) && toElement !== ul_list) {
                ul_list.style['display'] = 'none';
            }
        }, false);
        ul_list.addEventListener('mouseout', function (e) {
            var toElement = e.toElement || e.relatedTarget,
                fromElement = e.fromElement || e.relatedTarget;
            if ((fromElement === ul_list || isDescendant(ul_list, fromElement)) &&
               (toElement === ul_list || isDescendant(ul_list, toElement))) {
                return;
            }
            ul_list.style['display'] = 'none';
        });
        ul_list.addEventListener('click', function (e) {
            var div_clicked;
            if (e.target.tagName === 'LI') {
                div_clicked = e.target.getElementsByTagName('div')[0];
            } else if (e.target.className.indexOf('m-' + name) !== -1) {
                div_clicked = e.target;
            }
            if (div_clicked) {
                click_handler(div_clicked, div_selected);
            }
        }, false);

        return [wrapper, ul_list, div_selected, li_divs];
    }

    function renderColors() {
        var li_length =  _self.options.WIDGETS.COLOR.HEX.length,
            click_handler = function (div_clicked, div_selected) {
                var hex = div_clicked.style['background-color'];
                _self.setColor(hex);
                _self.options.WIDGETS.COLOR.ELEMENTS.forEach(function (div) {
                    div.style['background-color'] = hex;
                });
            };
        var kits = renderHierarchy('color', li_length, click_handler);
        var wrapper = kits[0], ul_list = kits[1], div_selected = kits[2], li_divs = kits[3];

        div_selected.style['background-color'] = _self.options.WIDGETS.COLOR.HEX[0];
        _self.options.WIDGETS.COLOR.ELEMENTS.push(div_selected);

        li_divs.forEach(function (div, i) {
            div.style['background-color'] = _self.options.WIDGETS.COLOR.HEX[i];
        });

        return [wrapper, ul_list];
    }

    function renderTools() {
        var li_length =  _self.options.WIDGETS.TOOL.TYPE.length,
            click_handler = function (div_clicked, div_selected) {
                var tool = div_clicked.getAttribute('data-tool'),
                    icon = div_clicked.innerText;
                _self.setTool(tool);
                div_selected.innerText = icon;
            };
        var kits = renderHierarchy('tool', li_length, click_handler);
        var wrapper = kits[0], ul_list = kits[1], div_selected = kits[2], li_divs = kits[3];

        var tool = _self.options.WIDGETS.TOOL.TYPE[0];
        div_selected.innerText = _self.options.WIDGETS.TOOL[tool].ICON;

        li_divs.forEach(function (div, i) {
            var tool = _self.options.WIDGETS.TOOL.TYPE[i],
                icon = _self.options.WIDGETS.TOOL[tool].ICON;
            div.setAttribute('data-tool', tool);
            div.innerText = icon;
        });

        return [wrapper, ul_list];
    }

    function renderSizes() {
        var li_length =  _self.options.WIDGETS.SIZE.length,
            click_handler = function (div_clicked, div_selected) {
                var width = div_clicked.style['width'],
                    radius = width.substring(0, width.length - 2) / 2;
                _self.setSize(radius);
                div_selected.getElementsByTagName('div')[0].style['width'] = width;
                div_selected.getElementsByTagName('div')[0].style['height'] = width;
            };
        var kits = renderHierarchy('size', li_length, click_handler);
        var wrapper = kits[0], ul_list = kits[1], div_selected = kits[2], li_divs = kits[3];

        var div_inner = document.createElement('div');
        div_inner.setAttribute('class', 'm-size');
        div_inner.style['width'] = _self.options.WIDGETS.SIZE[0] + 'px';
        div_inner.style['height'] = _self.options.WIDGETS.SIZE[0] + 'px';
        div_inner.style['background-color'] = _self.options.WIDGETS.COLOR.HEX[0];
        div_selected.appendChild(div_inner);
        _self.options.WIDGETS.COLOR.ELEMENTS.push(div_inner);

        li_divs.forEach(function (div, i) {
            var size = _self.options.WIDGETS.SIZE[i];
            div.style['width'] = size + 'px';
            div.style['height'] = size + 'px';
            div.style['background-color'] = _self.options.WIDGETS.COLOR.HEX[0];
            _self.options.WIDGETS.COLOR.ELEMENTS.push(div);
        });

        return [wrapper, ul_list];
    }

    function renderGeneral() {
        var general_buttons = [],
            click_handler = function (conf) {
                return function () {
                    if (isFunction(_self[conf.METHOD])) {
                        _self[conf.METHOD].call(_self);
                    }
                };
            };
        for (var type in _self.options.WIDGETS.GENERAL) {
            if (_self.options.WIDGETS.GENERAL.hasOwnProperty(type)) {
                var button_config = _self.options.WIDGETS.GENERAL[type],
                    div = document.createElement('div'),
                    span = document.createElement('span');
                span.innerText = button_config.ICON;
                span.setAttribute('class', 'm-' + button_config.METHOD);
                div.appendChild(span);
                div.setAttribute('class', 'm-button');
                div.setAttribute('title', button_config.METHOD);
                div.addEventListener('click', click_handler(button_config), false);
                general_buttons.push(div);
            }
        }
        return general_buttons;
    }
    // TODO: REFACTOR
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
        _internal.el.addEventListener('mouseover', mouseOver, false);
        _internal.el.addEventListener('mouseout', mouseOut, false);
    }
    /**
     * Events handlers
     */
    function paintStart(e) {
        // Fix moving in svg with text cursor issue
        e.preventDefault();
        e.stopPropagation();

        if (isValidToStart()) {
            // set paint_start timestamp
            if (_internal.paint_start === undefined) {
                _internal.paint_start = time();
            }

            var point = getPointFromEvent(e);
            log('Start: ' + point.x + ',' + point.y);

            addPoint(point, _internal.config);

            _internal.is_mousedown = true;
        }
    }
    // TODO: Add throttle if necessary
    function paintMove(e) {
        if (_internal.is_mousedown === true) {
            e.preventDefault();
            e.stopPropagation();

            var point = getPointFromEvent(e);
            log('Move: ' + point.x + ',' + point.y);

            addPoint(point, _internal.config);
        }

        updateCur(e);
    }

    function paintStop(e) {
        e.preventDefault();
        e.stopPropagation();

        if (_internal.is_mousedown === true) {
            var point = getPointFromEvent(e);
            log('Stop: ' + point.x + ',' + point.y);

            addPoint(point, _internal.config);

            endElement();
        }
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
        if (toElement === null || toElement.nodeName !== 'svg' && toElement.parentNode.nodeName !== 'svg' && toElement.id !== _self.options.cursor_id) {
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
        _internal.undo.push({id: _internal.config.element_index, value: 'd'});
        _internal.redo = [];
        _internal.config.element_index ++;
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
            element.setAttribute('opacity', config.opacity);
        }
    }

    function clearBoard() {
        while (_internal.el.lastChild) {
            _internal.el.removeChild(_internal.el.lastChild);
        }
    }
    /**
     * Draw
     */
    function draw(config, points) {
        switch (config.tool) {
        case _self.options.WIDGETS.TOOL.FREE.NAME:
            drawPath(config, points);
            break;
        case _self.options.WIDGETS.TOOL.LINE.NAME:
            drawLine(config, points);
            break;
        case _self.options.WIDGETS.TOOL.RECT.NAME:
            drawRect(config, points);
            break;
        }
    }

    function drawPath(config, points) {
        var element_id = _self.options.element_prefix + config.element_index,
            element = _get(element_id);
        if (element) {
            setElementAttr(element, {'d': makeD(config.element_index, points)});
        } else {
            element = makeElement('path', {
                'id'                : element_id,
                'd'                 : makeD(config.element_index, points),
                'stroke'            : config.color,
                'stroke-width'      : config.painter_radius * 2,
                'opacity'           : config.opacity / 2,
                'fill'              : 'none',
                'stroke-linecap'    : 'round'
            });
            _internal.el.appendChild(element);
        }
    }

    function makeD(element_index, points_arr) {
        var points = points_arr || getPointsArr(element_index),
            len = points.length,
            last = len % 2 === 0 ? len - 1 : len - 2,
            d = 'M' + points[0].x + ',' + points[0].y;
        // if only has 1-3 points
        if (len === 1) {
            return d;
        }
        if (len === 2 || len === 3) {
            return d + 'T' + points[len - 1].x + ',' + points[len - 1].y;
        }
        d += 'Q';
        for (var i = 1; i < last; i++) {
            d += points[i].x + ',' + points[i].y + ' ';
        }
        d += 'T' + points[last].x + ',' + points[last].y;
        return d;
    }

    function drawLine(config, points) {
        var element_id = _self.options.element_prefix + config.element_index,
            element = _get(element_id);
        if (element) {
            var point = getPoint(points, config.element_index);
            setElementAttr(element, {
                'x2': point.x,
                'y2': point.y
            });
        } else {
            var point_begin = getPoint(points, config.element_index, 0),
                point_end = getPoint(points, config.element_index);
            element = makeElement('line', {
                'id'                : element_id,
                'x1'                : point_begin.x,
                'y1'                : point_begin.y,
                'x2'                : point_end.x,
                'y2'                : point_end.y,
                'stroke-width'      : config.painter_radius * 2,
                'stroke'            : config.color,
                'opacity'           : config.opacity / 2,
                'stroke-linecap'    : 'round'
            });
            _internal.el.appendChild(element);
        }
    }

    function drawRect(config, points) {
        var element_id = _self.options.element_prefix + config.element_index,
            element = _get(element_id),
            point_begin =  getPoint(points, config.element_index, 0),
            point_end = getPoint(points, config.element_index),
            x = Math.min(point_begin.x, point_end.x),
            y = Math.min(point_begin.y, point_end.y),
            width =  Math.abs(point_begin.x - point_end.x),
            height = Math.abs(point_begin.y - point_end.y);
        if (element) {
            setElementAttr(element, {
                'x': x,
                'y': y,
                'width': width,
                'height': height
            });
        } else {
            element = makeElement('rect', {
                'id'                : element_id,
                'x'                 : x,
                'y'                 : y,
                'width'             : width,
                'height'            : height,
                'stroke-width'      : config.painter_radius * 2,
                'stroke'            : config.color,
                'opacity'           : config.opacity / 2,
                'fill'              : 'none',
            });
            _internal.el.appendChild(element);
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
        case _self.options.WIDGETS.TOOL.FREE.NAME:
            newPointerCur(e);
            break;
        case _self.options.WIDGETS.TOOL.LINE.NAME:
        case _self.options.WIDGETS.TOOL.RECT.NAME:
            newCrossCur(e);
            break;
        }
    }

    function newPointerCur(e) {
        var cursor = makeElement('circle', {
            'id': _self.options.cursor_id,
            'cx': e.offsetX,
            'cy': e.offsetY,
            'r': _internal.config.painter_radius,
            'stroke': _internal.config.color,
            'fill': _internal.config.color
        });
        _internal.el.appendChild(cursor);
    }

    function newCrossCur(e) {
        var styleList = '';
        if (_internal.el.getAttribute('style')) {
            styleList = _internal.el.getAttribute('style');
        }
        _internal.el.setAttribute('style', styleList + 'cursor:crosshair;');
    }

    function updateCur(e) {
        var cursor = _get(_self.options.cursor_id);
        if (cursor) {
            setElementAttr(cursor, {
                'cx': e.offsetX,
                'cy': e.offsetY
            });
        }
    }

    function removeCur() {
        var cursor = _get(_self.options.cursor_id),
            styleList = _internal.el.getAttribute('style');
        if (cursor) {
            cursor.parentNode.removeChild(cursor);
        }
        if (styleList) {
            _internal.el.setAttribute('style', styleList.replace(/cursor:crosshair;/, ''));
        }
    }
    /**
     * Others
     */
    function exec(type) {
        // TODO: Refactor, now is checking the length of 'type' array
        if (_internal[type].length) {
            var o = _internal[type].pop(),
                _index = o.id,
                _value = o.value;

            // push state to oppsite array
            _internal[revs(type)].push({id: _index, value: revs(_value)});

            switch (_value) {
            case 'a':
                _internal.paint_stack.elements[_index].is_deleted = false;
                var config = _internal.paint_stack.elements[_index].config;
                // TODO: fix this hack
                config.opacity *= 2;
                draw(config);
                break;
            case 'd':
                _internal.paint_stack.elements[_index].is_deleted = true;
                removeElement(_index);
                break;
            }
        }
    }
    /**
     * Helper methods
     */
    function isValidToStart() {
        if (_internal.replay_in_progress === true) {
            return false;
        }
        return true;
    }
    function makeElement(tag, attrs) {
        var elm = document.createElementNS(_xmlns, tag);
        if (attrs) {
            elm = setElementAttr(elm, attrs);
        }
        return elm;
    }
    function setElementAttr(elm, attrs) {
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
        if (input === 'd') return 'a';
        if (input === 'a') return 'd';
        if (input === 'redo') return 'undo';
        if (input === 'undo') return 'redo';
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
        while (node !== null) {
            if (node === parent) {
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
