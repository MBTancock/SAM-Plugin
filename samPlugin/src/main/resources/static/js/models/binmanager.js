/*global define, console*/

/**
* Bin Manager module. Handles all the bins in the application.
* @module models/binmanager
*/
define(["jquery", "views/notification", "models/bin", "controllers/storage", "helper"], function ($, notify, bin, storage, helper) {
  "use strict";

  /**
  * Used to store all available Bins
  * @constructor
  * @memberof module:models/binmanager
  */
  function BinManager() {
    var storedBins = null, i, mbins = [], mcurrentBin = null, saveBins = function () {
      if (storage !== undefined) {
        var key, binsxml = '[';
        for (key in mbins) {
          if (mbins.hasOwnProperty(key)) {
            binsxml += '{"title":"' + key + '","segs":' + mbins[key].save() + '},';
          }
        }
        if (binsxml.length > 1) {
          binsxml = binsxml.substring(0, binsxml.length - 1) + ']';
        }
        storage.store(storage.keys.BINS, binsxml);
      }
      //notify.log("saved bins: " + binsxml);
    };

    /** 
    * Creates a new empty Bin. Triggers an update event on completion.
    * @method
    * @scope static
    * @param {string} title - The title for the new bin
    * @returns {Bin} The new Bin
    */
    this.createBin = function (title) {
      var ret = bin.create();
      ret.title = title;

      if (mbins[title] === undefined) {
        mbins.length++;
      } else {
        $(mbins[title]).off();
      }
      mbins[title] = ret;
      if (mcurrentBin === null) {
        mcurrentBin = title;
      }

      $(this).trigger('update');
      notify.log("new bin");

      saveBins();

      $(ret).on('update', saveBins);

      return ret;
    };

    /** 
    * Removes a Bin. Triggers an update event on completion.
    * @method
    * @scope static
    * @param {string} title - The title for the bin to remove.
    * @returns {Boolean} Whether the operation succeeded.
    */
    this.removeBin = function (title) {
      var ret = false;
      if (mbins.length > 1 && mbins.hasOwnProperty(title)) {
        try {
          delete mbins[title];
          mbins.length--;
          $(this).trigger('update');
          saveBins();
          ret = true;
        } catch (e) { }
      }
      return ret;
    };

    /** 
    * Returns the list of bins.
    * @method
    * @scope static
    * @returns {Array} The bins this manager is managing.
    */
    this.bins = function () { return mbins; };

    /** 
    * Returns the current bin.
    * @method
    * @scope static
    * @returns {Bin} The current bins.
    */
    this.currentBin = function () { return mbins[mcurrentBin]; };

    /** 
    * Sets the current bin.
    * @method
    * @scope static
    * @param {string} title - Title of the bin
    */
    this.setCurrentBin = function (title) { mcurrentBin = title; }; // MWMWMW May need to validate bin is in mbins

    try {
      storedBins = storage.fetch(storage.keys.BINS);
      storedBins = JSON.parse(storedBins, bin.reviver);
    } catch (e) {
      notify.error('Failed to load saved bins', e);
      storage.store(storage.keys.BINS + '_old', storedBins);
      storedBins = null;
    }

    if ((storedBins === undefined) || (storedBins === null)) {
      notify.log("No bins");
      this.setCurrentBin(this.createBin(helper.DefaultBin).title);
    } else {
      //notify.log("BinsStr = " + storedBins);
      for (i = 0; i < storedBins.length; i++) {
        mbins[storedBins[i].title] = storedBins[i];
        mbins.length++;
        notify.log("Listening for changes in: " + storedBins[i].title);
        $(storedBins[i]).on('update', saveBins);
      }
      if (storedBins.length > 0) {
        this.setCurrentBin(storedBins[0].title);
      }
    }
  }

  return {
    /** 
    * Creates a new BinManager object
    * @returns {BinManager} - The new binmanager
    */
    create: function () {
      return new BinManager();
    }
  };
});