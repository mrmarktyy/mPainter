Introduction
========

**mPainter** is a simple and easy to use SVG painting library, which will create or convert SVG element to be a painting board.

Please see [DEMO]


Getting Started
------------

1. Place the loader script before the closing body tag

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

4. More options available, please see documentation for more details.


## We're improving everyday !

* take out jQuery dependency ✓

## Road Map

* support save/redo/redo/replay of painting
* support direct upload painting to AWS S3
* support various shapes (line, square, eclipse, etc)
* support layer based functions including resize, flip, rotate, etc
* and more...

[DEMO]:http://paint.tantanguanguan.com
