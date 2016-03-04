/*global define, console*/
/*jslint browser: true*/

/**
* Clipboard module. Used for copying and pasteing item(s) to a clipboard
* @module controllers/clipboard
*/
define(["jquery"], function () {
  "use strict";

  try {
    var currentObj = null;  // The current object on the clipboard
    return {
      /** 
      * Sets an item to the clipboard
      * @param {object} item - The item to set
      */
      set: function (obj) {
        currentObj = obj;
        //console.log('clipboard set: ' + currentObj.length);
      },
      /** 
      * Gets the current item from the clipboard
      * @returns {object} - The clipboard item
      */
      get: function () {
        //console.log('clipboard get: ' + currentObj.length);
        return currentObj;
      }
    };
  } catch (e) {
  }
  return null;
});