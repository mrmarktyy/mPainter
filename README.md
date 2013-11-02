Introduction
========

**mPainter** is a simple, light-weighted, no dependencies SVG based painting widget library, which can easily embed a painting board wherever on your page.

Please see [Demo page]


### Getting Started

####1. Embedding the script before the closing body tag in your HTML

``` html
<script src="app/src/mPainter.js"></script>
```

####2. Put a DOM element where you want to the painting board to be

``` html
<div id="painting-board"></div>
```

####3. Initialize the painting board with a simple line code. And that's it, start painting !

``` html
var mPainter = new mPainter('painting-board');
```

####4. More configuration options are available, please see documentation for details.

### Browser Support

It is currently tested and working on:

- Chrome 4.0+
- Firefox 3.0+
- Safari 3.2+
- Opera 9.0+
- IE 9+
- iOS Devices (iPhone/iPad, etc)
- Android Devices
- WIN8 Pointer Screen

### We're improving everyday !

* strip off jQuery dependency ✓
* undo/redo support ✓
* tablets/mobile devices and win8 pointer screen support ✓
* cool replay support ✓
* UI integration & enhancement ✓
* get/set public methods for save/load a painting ✓
* support various shapes (line, rectangle, eclipse) ✓

### Road Map

* support save painting and direct upload it to S3
* support layer based functions including resize, flip, rotate, etc
* full documentation
* and more...

### Dependencies

NO

### LICENCE

This project is under [MIT] licence

[Demo page]: http://paint.tantanguanguan.com
[MIT]: http://en.wikipedia.org/wiki/MIT_License
