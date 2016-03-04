/*global define, console, localStorage*/
/*jslint browser: true*/
/**
* Storage module. Wrapper for HTML5 local storage
* @module controllers/storage
*/
define(["views/notification"], function (notify) {
  "use strict";
  try {
    if (window.localStorage !== null) {
      return {
        /** 
        * Stores an object
        * @param {string} key - A unique key for the object
        * @param {string} val - The object to store
        */
        store: function (key, val) {
          localStorage[key] = val;
          //ctr++;
        },

        /** 
        * Fetches an object from the store
        * @param {string} key - A unique key for the object
        * @returns {string} - A stored object
        */
        fetch: function (key) {
          return localStorage[key];
        },
        /** 
        * Returns the keys used for storing objects in the HTML storage area
        * @returns {string} - Unique identifier for storage key
        */
        keys: {
          LAYOUT: 'layout',
          REMEMBERME: 'remembered',
          BINS: 'bins',
          OVERLAY: 'playeroverlay',
          VOLUME: 'volume',
          LOCATION: 'location',
          PUBLISHAREA: 'publisharea',
          VIDEOFORMAT: 'videoformat',
          AUDIOFORMAT: 'audioformat',
          VERSION: 'version'
        },
        version: '0.0.1'
      };
    }
  } catch (e) {
    notify.log('Storage failed: ' + e);
  }
  return null;
});