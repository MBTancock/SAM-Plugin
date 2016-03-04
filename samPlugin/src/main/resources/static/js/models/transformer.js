/*global define, console*/
/*jslint browser: true */

/**
* Transformer module
* @module models/transformer
*/
define(["jquery", "views/notification", "models/zone", "models/area"], function ($, notify, zone, area) {
  "use strict";

  notify.log('loaded transformer');
  var creds = null,
   auth = null,
   transformers = [],
   beforeSend = function (xhr) {
     if (auth !== null) {
       xhr.setRequestHeader('Authorization', auth);
     }
   },
   createTransformer = null,
   ntscFrame = 1001 / 30000;

  /**
  * Represents a cluster of Transformers
  * @constructor
  * @memberof module:models/transformer
  */
  function Transformer(location) {
    /**
    * The unique location of this Transformer
    * @scope static
    */
    this.location = location;

    /**
    * The frame rate for this Transformer
    * @scope static
    */
    this.fps = null;

    /**
    * Flag1001 for this Transformer
    * @scope static
    */
    this.flag1001 = null;

    /**
    * List of extra Transformer objects which are the extra sites the user is permitted to search when this Transformer is the home site
    * @scope static
    */
    this.extraSearchSites = [];

    /**
    * List of extra Transformer objects which are the extra sites the user is permitted to publish to when this Transformer is the home site
    * @scope static
    */
    this.extraPublishSites = [];

    /**
    * List of areas for this Transformer.
    * @scope static
    */
    this.areas = null;

    /**
    * List of zones for this Transformer. 
    * @scope static
    */
    this.zones = null;

    /**
    * List of allowed video formats for this transformer 
    * @scope static
    */
    this.allowedVideoFormats = null;

    /**
    * List of allowed audio formats for this transformer 
    * @scope static
    */
    this.allowedAudioFormats = null;

    /**
    * Describes if this Transformer is an away site or not. If away then the value will be 'away' otherwise null
    * @scope static
    */
    this.away = null;

    if (typeof this.oneFrame != "function") {
      /** 
      * Returns the duration of one frame for this Transformers fps
      * @method
      * @scope static
      * @returns {Number} frame duration
      */
      Transformer.prototype.oneFrame = function () {
        if (this.fps == 30) {
          return ntscFrame;
        }
        return 0.04;
      };
    }

    if (typeof this.beforeSend != "function") {
      Transformer.prototype.beforeSend = beforeSend;
    }

    if (typeof this.url != "function") {
      /** 
      * Returns the url to access this Transformer 
      * @method
      * @scope static
      * @returns {string} url
      */
      Transformer.prototype.url = function () {
        return this.location.indexOf('http') === 0 ? this.location : document.location.protocol + '//' + this.location; // This should take it from the URL the user first accessed or force to https
      };
    }

    if (typeof this.urlCreds != "function") {
      Transformer.prototype.urlCreds = function () {
        return creds === null ? this.url() : document.location.protocol + '//' + creds + '@' + this.location;
        //return 'http://' + this.location;
      };
    }

    if (typeof this.findTransformer != "function") {
      /** 
      * Searches the transformers extra sites for the given location. Also searches itself.
      * @method
      * @scope static
      * @param {string} location - The location variable of the Transformer to find
      * @returns {Object} The Transformer object or itself if not found 
      */
      Transformer.prototype.findTransformer = function (location) {
        var ret = this, i;
        if (this.location != location) {
          for (i = 0; i < this.extraSearchSites.length; i++) {
            if (this.extraSearchSites[i].location == location) {
              ret = this.extraSearchSites[i];
              break;
            }
          }
          if (i == this.extraSearchSites.length) {
            for (i = 0; i < this.extraPublishSites.length; i++) {
              if (this.extraPublishSites[i].location == location) {
                ret = this.extraPublishSites[i];
                break;
              }
            }
          }
        }
        return ret;
      };
    }

    if (typeof this.load != "function") {
      /** 
      * Loads the extra sites, areas and zones for this Transformer using siteproperties, areaproperties and zoneinfo documents
      * @method
      * @scope static
      * @param {function} callback - Function which gets called once the siteproperties has loaded
      */
      Transformer.prototype.load = function (callback) {
        notify.log('Loading ' + this.location);
        /*jslint unparam: true*/
        var numErrors = 0,
        maxErrors = 10,
        loadSites = null,
        loadAreas = null,
        loadZones = null;

        // Fetches the areaproperties and parses it to extract the available areas
        loadAreas = function () {
          $.ajax({ type: "GET",
            url: this.url() + '/quantel/homezone/areaproperties.xml',
            dataType: "xml",
            context: this,
            cache: false,
            beforeSend: beforeSend,
            success: function (xml) {
              loadSites();
              loadZones();

              // XML parsing
              this.areas = $(xml).find('area').map(function () {
                return area.create(
                  $(this).attr('name'),
                  $(this).attr('tag'),
                  $(this).find('key').map(function () { return { tag: $(this).attr('tag').toLowerCase(), value: $(this).attr('value') }; }));
              });

              $(this).trigger('update', { update: 'areasloaded', areas: this.areas });
              if (callback !== undefined) {
                callback();
              }
            } .bind(this),
            error: function (xhr, textStatus, errorThrown) {
              // On error we retry every 10 seconds for a number of times then give up
              notify.log('Logon error: ' + xhr.status + ' - ' + xhr.statusText);
              var msg = (xhr.status == 401) ? "Username or password is incorrect, please try again" : "Failed to connect to server";
              numErrors++;
              if ((numErrors < maxErrors) && (xhr.status != 401)) {
                msg += ". Retrying in 10 seconds";
                setTimeout(function () {
                  loadAreas();
                }, 10000);
              }
              else if (callback !== undefined) {
                callback(msg);
              }
            } .bind(this)
          });
        } .bind(this);

        // Fetches siteproperties and parses it to extract the extra sites
        loadSites = function () {
          $.ajax({
            type: 'GET',
            url: this.url() + '/quantel/homezone/siteproperties.xml',
            dataType: 'xml',
            //cache: false,
            beforeSend: beforeSend,
            success: function (xml) {
              // Only load extra sites for the home site
              if (this.away === null) {
                // XML parsing to extract the site locations
                this.extraSearchSites = $.merge(
                $(xml).find('property[tag="Site-WanSearch"]').map(function () {
                  return createTransformer($(this).attr('value')).setAway();
                }), $(xml).find('property[tag="Site-Search"]').map(function () {
                  return createTransformer($(this).text()).setAway();
                }));

                this.extraPublishSites = $(xml).find('property[tag="Site-Publish"]').map(function () {
                  return createTransformer($(this).attr('value')).setAway();
                });
              }

              // Trigger loaded event and async callback
              $(this).trigger('update', { update: 'sitesloaded', searchSites: this.extraSearchSites, publishSites: this.extraPublishSites });
            } .bind(this),
            error: function (xhr, textStatus, err) {
              // On error we retry every 10 seconds for a number of times then give up
              numErrors++;
              if ((numErrors < maxErrors) && (xhr.status != 401)) {
                notify.error("Site properties failed!", " Retrying in 10 seconds. Error: " + err + ' - ' + xhr.statusText);
                setTimeout(function () {
                  loadSites();
                }, 10000);
              }
            } .bind(this)
          });
        } .bind(this);

        // Fetches the zoneinfo and parses it to extract the available areas
        loadZones = function () {
          $.ajax({ type: "GET",
            url: this.url() + '/quantel/homezone/zoneinfo.xml',
            dataType: "xml",
            context: this,
            beforeSend: beforeSend,
            success: function (xml) {
              var homezoneNode = null, homezone = null;
              homezoneNode = $(xml).find('homezoneinfo');
              if (homezoneNode === null) {
                //throw;
                notify.log('No Homezone');
                return;
              }
              // XML parsing
              homezone = zone.parse(this).apply(homezoneNode);
              this.zones = $(xml).find('zoneinfo').map(zone.parse(this));
              this.zones.push(homezone);

              $(this).trigger('update', { update: 'zonesloaded', zones: this.zones });
            } .bind(this),
            error: function (xhr, textStatus, errorThrown) {
              // On error we retry every 10 seconds for a number of times then give up
              numErrors++;
              if (numErrors < maxErrors) {
                if (numErrors < 2) {
                  notify.error("Zone properties failed!", "Failed to load zones for " + this.location + ". Retrying in 10 seconds. Error: " +
                    xhr.status + ' - ' + xhr.statusText);
                }
                setTimeout(function () {
                  loadZones();
                }, 10000);
              }
            } .bind(this)
          });
        } .bind(this);
        /*jslint unparam: false*/

        loadAreas();
      };
    }

    if (typeof this.search != "function") {
      /** 
      * Searches the transformers set of clips using the supplied params. This sends a request(s) to the search services for the various zones the Transformer is zoned with. This is an asynchronous function.
      * @method
      * @scope static
      * @param {string} searchArea - Name of the area to search within. Must be a search area.
      * @param {Object} params - Parameters for the search
      * @param {function} callback - Function gets called with the results of the search
      */
      Transformer.prototype.search = function (searchArea, params, callback) {
        notify.log('Searching ' + this.location);

        var area, pools = [], j, k, keyidx, key, validx, value, zone, poolidx, pool, searchkey, values, searchvalue;
        if (this.areas !== null) {
          for (j = 0; j < this.areas.length; j++) {
            area = this.areas[j];
            if ((area.tag == 'search') && (area.name == searchArea)) {
              for (keyidx = 0; keyidx < area.areakeys.length; keyidx++) {
                key = area.areakeys[keyidx];
                if (key.tag != 'group') {
                  searchkey = key;
                  if (key.tag == 'pools') {
                    searchkey = 'PoolID';
                  }
                  values = key.value.split(',');
                  searchvalue = '';
                  for (validx = 0; validx < values.length; validx++) {
                    value = values[validx].replace(' ', '');
                    if (searchvalue !== '') {
                      searchvalue += ' OR ';
                    }

                    searchvalue += value;
                    if (key.tag == 'pools') {
                      pools.push(value);
                    }
                  }
                  params.searchTerms.push({ key: searchkey, val: searchvalue });
                }
              }
              break;
            }
          }

          if (this.zones !== null) {
            for (k = 0; k < this.zones.length; k++) {
              zone = this.zones[k];
              if (zone.sQ) { // Could do something for revQ
                for (poolidx = 0; poolidx < zone.pools.length; poolidx++) {
                  pool = zone.pools[poolidx];
                  if (pools.indexOf(pool) != -1) {
                    zone.search(params, callback);
                    break;
                  }
                }
              }
            }
          }
        }
      };
    }

    if (typeof this.loadSeatProperties != "function") {
      /** 
      * Loads the seat properties for this Transformer
      * @method
      * @scope static
      * @param {function} callback - Function which gets called once the seatproperties has loaded
      */
      Transformer.prototype.loadSeatProperties = function (callback) {
        $.ajax({
          type: "GET",
          url: this.url() + '/quantel/homezone/seatproperties.xml',
          dataType: "xml",
          beforeSend: beforeSend,
          error: function (xhr, status, error) {
            notify.error("Seat properties failed!", "Failed to load codecs for " + this.location + ". Retrying in 10 seconds. Error: " +
                    xhr.status + ' - ' + xhr.statusText);
          } .bind(this),
          success: function (xml, status, request) {
            var sdPreferred = $(xml).find('category[tag="video.sd.preferred"] > key'),
            hdPreferred = $(xml).find('category[tag="video.hd.preferred"] > key'),
            fourChannel = $(xml).find('category[tag="audio.4channel.preferred"] > key'),
            eightChannel = $(xml).find('category[tag="audio.8channel.preferred"] > key');

            this.allowedVideoFormats = $(xml).find('category[tag="video.sd"] > key').map(function () { return { tag: $(this).attr('tag'), value: $(this).attr('value'), type: 'sd' }; });
            this.allowedVideoFormats.push({ tag: sdPreferred.attr('tag'), value: sdPreferred.attr('value'), type: 'sd', preferred: true });
            this.allowedVideoFormats = $.merge(this.allowedVideoFormats, $(xml).find('category[tag="video.hd"] > key').map(function () { return { tag: $(this).attr('tag'), value: $(this).attr('value'), type: 'hd' }; }));
            this.allowedVideoFormats.push({ tag: hdPreferred.attr('tag'), value: hdPreferred.attr('value'), type: 'hd', preferred: true });
            //callback(sdPreferred, hdPreferred);

            this.allowedAudioFormats = [];
            if (fourChannel !== null) {
              this.allowedAudioFormats.push({ tag: '4 channel', value: fourChannel.attr('value'), preferred: true });
            }
            if (eightChannel !== null) {
              this.allowedAudioFormats.push({ tag: '8 channel', value: eightChannel.attr('value'), preferred: true });
            }

            $(this).trigger('update', { update: 'seatpropertiesloaded', video: this.allowedVideoFormats });
          } .bind(this)
        });
      };
    }

    if (typeof this.setAway != "function") {
      Transformer.prototype.setAway = function () {
        this.away = 'away';
        return this;
      };
    }
  }

  // Create and load a Transformer
  createTransformer = function (location, loadedCallback) {
    var t = transformers[location];

    // Transformers are identified by their unique location. If Transformer has been loaded before then use the existing object
    if (t === undefined) {
      t = new Transformer(location);
      transformers[location] = t;
      //t.load(loadedCallback);
    }
    //    } else if (loadedCallback !== undefined) {
    //      loadedCallback();
    //    }
    return t;
  };

  return {
    /** 
    * Creates a new Transformer object and loads it's resources 
    * @param {string} location - The URL of the cluster of Transformers
    * @param {function} callback - Callback which gets called once the siteproperties has been fetched from the Transformer
    */
    create: function (location, loadedCallback) { return createTransformer(location, loadedCallback); },
    setCredentials: function (user, pass) {
      creds = user + ':' + pass;
      auth = 'Basic ' + window.btoa(user + ':' + pass);
    },
    beforeSend: beforeSend,
    getAuth: function () { return creds; }
  };
});