/*global define, console*/
/*jslint browser: true*/
/**
* Keyboard module. Controls all the keyboard interactions. 
* @module controllers/keyboard
*/
define(["jquery"], function ($) {
  "use strict";

  var currentFocus = null, ctrlDown = false, shiftDown = false;
  try {
    $(document).on('keydown', function (evt) {
      //console.log('-keydown: ' + evt.keyCode);
      if ((evt.keyCode == 17) || (evt.keyCode == 91)) {
        ctrlDown = true;
      } else if (evt.keyCode == 16) {
        shiftDown = true;
      }

      if ((currentFocus !== null) && (evt.target.nodeName != 'INPUT')) {
        try {
          currentFocus.handleKeyDown(evt);
        } catch (e) { }
      }
    });

    $(document).on('keyup', function (evt) {
      //console.log('-keyup: ' + evt.keyCode);
      if ((evt.keyCode == 17) || (evt.keyCode == 91)) {
        ctrlDown = false;
      } else if (evt.keyCode == 16) {
        shiftDown = false;
      }

      if (currentFocus !== null) {
        try {
          currentFocus.handleKeyUp(evt);
        } catch (e) { }
      }
    });
  } catch (e) {
  }
  return {
    /** 
    * Sets the supplied container as the currently focused container
    * @param {object} container - This object is required to have the handleFocusLost, handleKeyUp and handleKeyDown functions. 
    * These functions will get called while the container has focus, ie. up until this function is called again.
    * The functions are called when the document.keyup, keydown functions occur.
    */
    focused: function (container) {
      if (currentFocus != container) {
        if (currentFocus !== null) {
          currentFocus.handleFocusLost();
        }
        currentFocus = container;
      }
    },
    ctrl: function () { return ctrlDown; },
    shift: function () { return shiftDown; }
  };
});