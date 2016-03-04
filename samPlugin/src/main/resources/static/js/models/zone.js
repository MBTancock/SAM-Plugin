/*global define, console*/
define(["jquery", "views/notification", "models/clip", "helper"], function ($, notify, clip, helper) {
  "use strict";

  notify.log('loaded zone');

  /**
  * Represents a Quantel Zone
  * @constructor
  * @param {Transformer} site - The Transformer the zone can be accessed through
  */
  function Zone(site, id) {
    this.site = site;
    this.id = id;
    this.name = null;
    this.pools = null;
    this.sQ = null;
    this.type = null;

    if (typeof this.searchUri != "function") {
      Zone.prototype.searchUri = function () {
        return this.baseUri() + '/clips/search';
      };
    }

    if (typeof this.baseUri != "function") {
      Zone.prototype.baseUri = function () {
        var ret = null;
        if (this.id !== null) {
          ret = this.site.url() + '/quantel/zone-' + this.id;
        } else {
          ret = this.site.url() + '/quantel/homezone';
        }
        return ret;
      };
    }

    if (typeof this.baseUriCreds != "function") {
      Zone.prototype.baseUriCreds = function () {
        var ret = null;
        if (this.id !== null) {
          ret = this.site.urlCreds() + '/quantel/zone-' + this.id;
        } else {
          ret = this.site.urlCreds() + '/quantel/homezone';
        }
        return ret;
      };
    }

    if (typeof this.mapISAToQStack != "function") {
      Zone.prototype.mapISAToQStack = function (name) {
        var ret = name;
        if (this.type == 'qstack') {
          if (name == 'content') {
            ret = 'doc';
          } else if (name == 'Title') {
            ret = 'isa_Title_sdtext';
          } else if (name == 'Created') {
            ret = 'isa_Created_stimestamp';
          } else if (name == 'Frames') {
            ret = 'isa_Frames_stext';
          } else if (name == 'Owner') {
            ret = 'isa_Owner_stext';
          } else if (name == 'Category') {
            ret = 'isa_Category_stext';
          } else if (name == 'ClipID') {
            ret = 'id';
          } else if (name == 'PoolID') {
            ret = 'isa_PoolID_slong';
          }
        }
        return ret;
      };
    }

    if (typeof this.mapQStackToISA != "function") {
      Zone.prototype.mapQStackToISA = function (name) {
        var ret = name;
        if (name.indexOf('isa_' === 0)) {
          ret = name.substring(4, name.indexOf('_', 4));
        }
        return ret;
      };
    }

    if (typeof this.addSearchTerm != "function") {
      Zone.prototype.addSearchTerm = function (searchTerm) {
        var ret = '', i = 0;
        if (searchTerm.length !== undefined) {
          ret += '(' + this.mapISAToQStack(searchTerm[0].key) + ':(' + searchTerm[0].val + ')';
          for (i = 1; i < searchTerm.length; i++) {
            ret += ' OR ' + this.mapISAToQStack(searchTerm[i].key) + ':(' + searchTerm[i].val + ')';
          }
          ret += ')';
        } else {
          ret += this.mapISAToQStack(searchTerm.key) + ':(' + searchTerm.val + ')';
        }
        return ret;
      };
    }

    if (typeof this.search != "function") {
      Zone.prototype.search = function (params, callback) {
        //        if (typeof callback != "function") {
        //          throw;
        //        }

        notify.log('search started');
        var zone = this, searchURL = this.searchUri() + '?q=', i = 0;
        if ((params.searchTerms === undefined) || (params.searchTerms.length === 0)) {
          searchURL += '*';
        } else {
          searchURL += this.addSearchTerm(params.searchTerms[0]);
          for (i = 1; i < params.searchTerms.length; i++) {
            searchURL += ' AND ' + this.addSearchTerm(params.searchTerms[i]);
          }
        }
        if (params.start !== undefined) {
          searchURL += '&start=' + params.start;
          if (params.rows !== undefined) {
            searchURL += '&rows=' + params.rows;
          }
        }
        if (params.sortcol !== undefined) {
          searchURL += '&sort=' + this.mapISAToQStack(params.sortcol);
          if (params.sortdir !== undefined) {
            searchURL += ' ' + params.sortdir;
          }
        }

        /*jslint unparam: true*/
        $.ajax({ type: "GET",
          url: searchURL,
          dataType: "xml",
          context: this,
          timeout: 8000,
          beforeSend: this.site.beforeSend,
          success: function (xml) {
            var ret = $(xml).find(zone.mapISAToQStack('content')).map(function () {
              var newclip = null;
              if (zone.type == 'qstack') {
                newclip = clip.create(zone, $(this).find('str[name="describes"]').text(), 10);
                $(this).children().each(function () {
                  newclip.properties[zone.mapQStackToISA($(this).attr('name').toLowerCase())] = $(this).text();
                });
                if (newclip.properties.frames !== undefined) {
                  newclip.duration = helper.timecodeToSeconds(newclip.properties.frames, newclip.zone.site.fps, newclip.zone.site.flag1001);
                }
              } else {
                newclip = clip.create(zone, parseInt($(this).find('ClipID').text(), 10));
                $(this).children().each(function () {
                  newclip.properties[this.nodeName.toLowerCase()] = $(this).text();
                });
                if (newclip.properties.frames !== undefined) {
                  newclip.duration = helper.framesToSeconds(newclip.properties.frames, newclip.zone.site.fps, newclip.zone.site.flag1001);
                }
              }
              return newclip;
            }), totalResults = this.type == 'qstack' ? $(xml).find('str[name="rows"]').text() : $(xml).find('totalResults').text();

            notify.log('search complete');
            callback(ret, parseInt(totalResults, 10));
            notify.log('callback complete');
          } .bind(this),
          error: function (jqXHR, textStatus, errorThrown) {
            notify.log('search Zone error: ' + errorThrown);
            callback(null);
          }
        });
        /*jslint unparam: false*/
      };
    }
  }

  return {
    /** 
    * Creates a new Zone object and loads it's resources 
    * @param {Transformer} site - The Transformer the zone can be accessed through
    */
    create: function (site, id) {
      return new Zone(site, id);
    },
    parse: function (site) {
      return function () {
        // MWMWMW may want some error handling if these nodes don't exist
        var standard = null, id = null, name = null, pools = null, type = null;
        standard = $(this).find('videoStandard').text();
        if (standard == 'PAL') {
          site.fps = 25;
          site.flag1001 = false;
        } else {
          site.fps = 30;
          site.flag1001 = true;
        }
        id = $(this).find('zoneNumber').text();
        name = $(this).find('zoneName').text();
        type = $(this).find('type').text();
        pools = $(this).find('pool').map(function () { return $(this).text(); });
        return $.extend(new Zone(site, id), {
          name: name,
          sQ: true,
          pools: pools,
          type: type
        });
      };
    }
  };
});