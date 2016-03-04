/*global define, console*/
define(["jquery", "views/notification"], function ($, notify) {
  "use strict";

  /*jslint nomen: true */

  /**
  * Represents a HTML5Player Player
  * @constructor
  */
  function HTML5Player() {
    var src = null, currentTime = null, element = null, loadedListener = null, errorListener = null;

    this.__defineGetter__('element', function () { return element; });

    this.__defineGetter__('src', function () { return src; });
    this.__defineSetter__('src', function (clip) {
      src = clip;
      //window.alert('setting player src to ' + src.hlsUri());
      element.src = src.hlsUri();
      var xhr = new XMLHttpRequest();
      xhr.open('GET', src.imgUri(), true);
      xhr.responseType = 'arraybuffer';
      xhr.timeout = 8000;
      xhr.addEventListener('load', function (evt) {
        var arr = new Uint8Array(evt.target.response);
        var raw = String.fromCharCode.apply(null, arr);
        var b64 = btoa(raw);
        element.setAttribute('poster', 'data:image/jpeg;base64,' + b64);
      });
      src.zone.site.beforeSend(xhr);
      xhr.send();
      element.load();
    });

    this.__defineGetter__('currentTime', function () { return element.currentTime; });
    this.__defineSetter__('currentTime', function (val) {
      currentTime = val;
      notify.log('SETTING CURRENT TIME TO ' + val);
      element.currentTime = val;
    });

    this.__defineGetter__('volume', function () { return element.volume; });
    this.__defineSetter__('volume', function (val) {
      element.volume = val;
    });

    this.__defineSetter__('onload', function (val) {
      loadedListener = val;
    });
    this.__defineSetter__('onerror', function (val) {
      errorListener = val;
    });

    this.play = function () {
      notify.log('PLAYING');
      element.play();
    };
    this.pause = function () {
      element.pause();
    };

    this.draw = function (parent) {
      var newPlayer = $('<video class="qplayer">')
      .on('canplay', function () {
        //window.alert('can play');
        if (currentTime !== null) {
          element.currentTime = currentTime;
        }
        if (loadedListener !== null) {
          loadedListener();
        }
      }).on('error', function (evt) {
        if (errorListener !== null) {
          errorListener(evt.message);
        }
      }).on('seeked', this.onSeeked.bind(this))
      .on('loadeddata', this.onVideoLoaded.bind(this));

      element = newPlayer[0];

      parent.append(element);
    };

    this.onSeeked = function () {
      notify.log('onSeeked');
      if (loadedListener !== null) {
        loadedListener();
      }
    };

    this.onVideoLoaded = function () {
      notify.log('onVideoLoaded');
      if (loadedListener !== null) {
        loadedListener();
      }
    };

    this.height = function () {
      return $(element).height();
    };

    this.width = function () {
      return $(element).width();
    };

    this.setHeight = function (val) {
      $(element).css('max-height', val); // Set window to 16:9
    };

    this.isBuffered = function (t, b) {
      return true;
//      var ret = false, i = 0, s = 0, e = 0;
//      if (t === undefined) {
//        t = this.element.currentTime;
//      }
//      if (b === undefined) {
//        b = this.element.buffered;
//      }
//      for (i = 0; i < b.length; i++) {
//        s = b.start(i);
//        e = b.end(i);
//        //window.alert('buffered at ' + s + ' - ' + e);
//        if ((s <= t) && (t <= e)) {
//          ret = true;
//          break;
//        }
//      }
//      return ret;
    };
  }
  /*jslint nomen: false */

  return {
    /** 
    * Creates a new HTML5Player Player
    */
    create: function () {
      return new HTML5Player();
    }
  };
});