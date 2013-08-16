Introduction
========

**mPainter** is a simple, light-weighted, no dependency SVG painting library, which can easily create or convert SVG element to be a painting board.

Please see [DEMO]


Getting Started
------------

1. Place the loader script before the closing body tag in the HTML
```
<script src="app/src/mPainter.js"></script>
```

2. Create a SVG element in the HTML, like
```
<svg id="my-svg" width="980" height="500"> </svg>
```

3. Init mPaint via Javascript. And that's it, start painting !
```
var config = {
    id: "my-svg",
};
var mPainter = new mPainter(config);
```

4. More options are available, please see documentation for details.

Browser Support
--------------

Chrome 4.0+

Firefox 3.0+

Safari 3.2+

Opera 9.0+

IE 9+


Currently, It doesn't support on mobile/tablet devices. But it's coming soon...


We're improving everyday !
-----------

* take out jQuery dependency ✓
* undo/redo support ✓

Road Map
----

* support save/replay of painting
* support direct upload painting to AWS S3
* support various shapes (line, square, eclipse, etc)
* support layer based functions including resize, flip, rotate, etc
* and more...

LICENCE
-------

MIT

[DEMO]:http://paint.tantanguanguan.com
