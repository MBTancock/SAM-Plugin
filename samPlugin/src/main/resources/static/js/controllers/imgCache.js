/*global define, console*/
/*jslint browser: true */
/**
* Image cache module. Used for loading img elements using an ajax call and cacheing the images
* @module controllers/imgCache
*/
define(["models/transformer"], function (transformer) {
  "use strict";

  var lru = [],         // Queue used to store the lru keys for cache
  cache = [],           // Dictionary[{string}url,{Promise}img data] used to store the cached images
  MAX_CACHE_SIZE = 20,  // The maximum size of the cache
  onLoad = function (evt) { // onLoad function for the ajax call
    var xhr = evt.target,
    arr = null,
    raw = '',
    val = null;

    if (xhr.status == 200) {
      arr = new Uint8Array(evt.target.response);
      for (var i = 0; i < arr.byteLength; i++) {  // Use this method to avoid getting an exception 
        raw += String.fromCharCode(arr[i]);
      }
      val = btoa(raw);  // Setting data to an img is required to be base64 encoded
      xhr.resolve(val); // Set value to any promises waiting on the result
    } else {
      xhr.reject(xhr.status); // Send reject to promises waiting on the result
    }
  },
  onLoadNoPromise = function (evt) {
    var xhr = evt.target,
    arr = null,
    raw = '',
    val = null;
    if (xhr.status == 200) {
      arr = new Uint8Array(xhr.response);
      for (var i = 0; i < arr.byteLength; i++) {  // Use this method to avoid getting an exception 
        raw += String.fromCharCode(arr[i]);
      }
      val = btoa(raw);  // Setting data to an img is required to be base64 encoded
      xhr.element.attr('src', 'data:image/jpeg;base64,' + val); // element is a jquery object
      xhr.element.prop('loading', false);
      if (xhr.callback !== undefined) {
        xhr.callback(true);
      }
      lru.push(xhr.url);
      cache[xhr.url] = val;
    } else {
      xhr.element.prop('loading', false);
      if (xhr.callback !== undefined) {
        xhr.callback(false);
      }
    }
  },
  orError = function (evt) { // onError function for the ajax call
    evt.target.reject(evt.target.status); // Send reject to promises waiting on the result
  },
  orErrorNoPromise = function (evt) {
    evt.target.element.prop('loading', false);
    if (evt.target.callback !== undefined) {
      evt.target.callback(false);
    }
    delete cache[evt.target.url];
  };

  return {
    /** 
    * Loads a jpg image using an ajax call and sets it to the src of the provided element
    * @param {object} element - jQuery object for an img element which to set the fetched jpg to
    * @param {string} url - The url to fetch the jpg from
    * @param {function} callback - Optional callback which gets called from the img src has been set
    */
    load: function (element, url, callback) {
      var cached = cache[url], old = null;  // See if the img has been cached, returns a promise
      try {
        if (cached === undefined) {
          cached = new Promise(function (resolve, reject) {
            // Ajax request to fetch the jpg data
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.responseType = 'arraybuffer';
            xhr.timeout = 8000;
            xhr.url = url;
            xhr.resolve = resolve;
            xhr.reject = reject;
            xhr.addEventListener('load', onLoad);
            xhr.addEventListener('error', orError);
            xhr.addEventListener('timeout', orError);
            transformer.beforeSend(xhr);
            element.prop('loading', true);
            xhr.send();
          });

          // If cache has exceeded max size then remove the lru
          if (lru.length > MAX_CACHE_SIZE) {
            //notify.log('removing cached val');
            old = lru.shift();
            delete cache[old];
          }

          // Add the new promise for the item to the cache
          lru.push(url);
          cache[url] = cached;
        }

        cached.then(function (response) {
          // Set the promised data to the supplied element
          element.attr('src', 'data:image/jpeg;base64,' + response);
          element.prop('loading', false);
          if (callback !== undefined) {
            callback(true);
          }
        }, function (err) {
          element.prop('loading', false);
          if (callback !== undefined) {
            callback(false);
          }
          delete cache[url];
        });
      } catch (e) { // Promise may not be defined
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        xhr.timeout = 8000;
        xhr.url = url;
        xhr.element = element;
        xhr.callback = callback;
        xhr.addEventListener('load', onLoadNoPromise);
        xhr.addEventListener('error', orErrorNoPromise);
        xhr.addEventListener('timeout', orErrorNoPromise);
        transformer.beforeSend(xhr);
        element.prop('loading', true);
        xhr.send();
      }
    }
  };
});