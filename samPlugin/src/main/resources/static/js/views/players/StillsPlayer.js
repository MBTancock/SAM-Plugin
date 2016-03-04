/*global define, console*/
define(["jquery", "helper", "controllers/imgCache"], function ($, helper, imgCache) {
  "use strict";

  /*jslint nomen: true */

  /**
  * Represents a Stills Player
  * @constructor
  * @param {clip} - The Clip the segment belongs to
  */
  function StillsPlayer() {
    var src = null, currentTime = null, volume = null, element = null;

    this.__defineGetter__('src', function () { return src; });
    this.__defineSetter__('src', function (clip) {
      src = clip;
      //element.attr('src', src.imgUri());
      imgCache.load(element, src.imgUri());
    });

    this.__defineGetter__('currentTime', function () { return currentTime; });
    this.__defineSetter__('currentTime', function (val) {
      currentTime = val;
      if (src !== null) {
        element.attr('src', src.imgUri(helper.secondsToFrames(
                  currentTime,
                  src.zone.site.fps,
                  src.zone.site.flag1001
                ).toFixed(0)));
      }
    });

    this.__defineGetter__('volume', function () { return volume; });
    this.__defineSetter__('volume', function (val) {
      volume = val;
    });

    this.play = function () {
    };
    this.pause = function () {
    };

    element = $('<img>',
      {
        'class': 'qplayer'
      });

    this.draw = function (parent) {
      parent.append(element);
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
  }
  /*jslint nomen: false */

  return {
    /** 
    * Creates a new Stills Player
    * @param {clip} - The Clip the segment belongs to
    */
    create: function () {
      return new StillsPlayer();
    }
  };
});