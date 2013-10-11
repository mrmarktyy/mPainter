Introduction
========

**mPainter** is a simple, light-weighted, no dependencies SVG based painting widget library, which can easily embed a painting board wherever on your page.

Please see [Demo page]


### Getting Started

1. Embedding the script before the closing body tag in your HTML

        <script src="app/src/mPainter.js"></script>

2. Put a DOM element where you want to the painting board to be

        <div id='painting-board'></div>

3. Initialize the painting board with a simple line code. And that's it, start painting !

        var mPainter = new mPainter('painting-board');

4. More configuration options are available, please see documentation for details.


### Browser Support

It is currently tested and working on:

- Chrome 4.0+

- Firefox 3.0+

- Safari 3.2+

- Opera 9.0+

- IE 9+

- WIN8 Pointer Screen

- iOS Devices (iPhone/iPad, etc)

- Android Devices


### We're improving everyday !

* strip off jQuery dependency ✓
* undo/redo support ✓
* tablets/mobile devices and win8 point screen support ✓
* replay support ✓

### Road Map

* support save of painting
* support direct upload painting to AWS S3
* support various shapes (line, square, eclipse, etc)
* support layer based functions including resize, flip, rotate, etc
* and more...

### LICENCE

This project is under [MIT] licence

[Demo page]: http://paint.tantanguanguan.com
[MIT]: http://en.wikipedia.org/wiki/MIT_License
