/*global define, console*/
/*jslint browser: true */
/**
* Image Loader module. Used to create a new StillsLoader. 
* @module controllers/imgLoader
*/
define(["jquery", "models/transformer", "controllers/imgCache"], function ($, transformer, imgCache) {
  "use strict";

  /**
  * Represents a Stills Loader. The client can request a number of overlapped requests on creation. This many img elements 
  * will be created then the StillsLoader handles showing and hiding each of the elements when they are loaded
  * @constructor
  * @memberof module:controllers/imgLoader
  */
  function StillsLoader(numOverlaps) {
    var nextFrame = null, imgElements = [], curImgIdx = null,
    loadNextImage = function () {
      //console.log('nextFrame = ' + nextFrame.substring(40) + '. freeImgs.length = ' + freeImgs.length + '. loadingImgQueue = ' + loadingImgQueue.length);
      if (nextFrame !== null) {
        var i = 0;
        for (i = 0; i < imgElements.length; i++) {
          if ($(imgElements[i]).prop('loading') !== true) {
            imgCache.load($(imgElements[i]), nextFrame);
            nextFrame = null;
            break;
          }
        }
      }
    };

    /** 
    * Queues a new frame to load asynchronously. Calling this function doesn't garuantee the frame will get loaded. If a new queueFrame request
    * is queued before a free loader is available then this request will get ignored
    * @method
    * @scope static
    * @param {string} url - The url for the frame to load
    */
    this.queueFrame = function (frame) {
      nextFrame = frame;
      loadNextImage();
    };

    /** 
    * Clears all the img elements
    * @method
    * @scope static
    */
    this.clear = function () {
      for (var i = 0; i < imgElements.length; i++) {
        $(imgElements[i]).attr('src', '');
      }
    };

    /** 
    * Adds all the img elements to the dom
    * @method
    * @scope static
    * @param {object} parent - jQuery object for the element that you want to append the img elements to as children
    * @param {string} class - Optional name for a class to add to each of the new img elements
    */
    this.draw = function (parent, classToAddToElem) {
      var i = null, img = null, onImgLoad = function (idx) {
        return function () {
          if (curImgIdx !== null) {
            $(imgElements[curImgIdx]).css('z-index', '0');
          }
          curImgIdx = idx;
          $(imgElements[idx]).css('z-index', '1');

          loadNextImage();
        };
      };

      if (imgElements.length === 0) {
        for (i = 0; i < numOverlaps; i++) {
          img = $('<img>').css({
            'z-index': '0',
            'position': 'relative',
            'top': '50%',
            'left': '50%',
            'transform': 'translateY(' + (-50 - (i * 100)).toString() + '%) translateX(-50%)'
          });
          if (classToAddToElem !== undefined) {
            img.addClass(classToAddToElem);
          }
          imgElements[i] = img[0];
        }
      }

      for (i = 0; i < imgElements.length; i++) {
        $(imgElements[i]).off().on('load', onImgLoad(i));
        parent.append(imgElements[i]);
      }
    };
  }

  return {
    /** 
    * Creates a new Stills Loader
    * @param {Number} overlaps - The number of overlapping requests for images the loader will handle
    * @returns {StillsLoader} - The new stills loader
    */
    create: function (numOverlaps) {
      return new StillsLoader(numOverlaps);
    }
  };
});