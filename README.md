Introduction
========

**mPainter** is a simple, light-weighted, dependency free SVG painting widget library, which can easily create or convert a DOM element to a SVG painting board.

Please see [DEMO]


Getting Started
------------

- 1. Place the loader script before the closing body tag in the HTML

```
<script src="app/src/mPainter.js"></script>
```

- 2. Create a SVG element in the HTML, like

```
<svg id="my-svg" width="980" height="500"> </svg>
```

- 3. Init mPaint via Javascript. And that's it, start painting !

```
var config = {
    id: "my-svg",
};
var mPainter = new mPainter(config);
```

- 4. More options are available, please see documentation for details.

Browser Support
--------------

Chrome 4.0+

Firefox 3.0+

Safari 3.2+

Opera 9.0+

IE 9+


We're improving everyday !
-----------

* strip off jQuery dependency ✓
* undo/redo support ✓
* tablets, mobile devices and win8 point screen support ✓
* replay support ✓

Road Map
----

* support save of painting
* support direct upload painting to AWS S3
* support various shapes (line, square, eclipse, etc)
* support layer based functions including resize, flip, rotate, etc
* and more...

LICENCE
-------

This project is under [MIT] licence

[DEMO]: http://paint.tantanguanguan.com
[MIT]: http://en.wikipedia.org/wiki/MIT_License
