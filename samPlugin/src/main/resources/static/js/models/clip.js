/*global define, console*/

/**
* Clip module. Represents a clip on a Quantel system.
* @module models/clip
*/
define(["jquery", "views/notification", "helper"], function ($, notify, helper) {
  "use strict";

  notify.log('loaded clip');

  /**
  * Represents a Quantel Clip
  * @constructor
  * @memberof module:models/clip
  */
  function Clip(zone, id) {
    this.zone = zone;
    this.id = id;
    this.duration = null;
    this.properties = [];

    this.videoSegments = [];
    this.audioSegments = [];

    this.playing = false;
    this.highwaterMark = null;

    if (typeof this.manifestUri != "function") {
      Clip.prototype.manifestUri = function () {
        return this.zone.baseUri() + '/clips/metadata/' + this.id + '/manifest.xml';
      };
    }
    if (typeof this.smoothStreamUri != "function") {
      Clip.prototype.smoothStreamUri = function () {
        return this.zone.baseUri() + '/clips/streams/' + this.id + '/stream.xml';
      };
    }
    if (typeof this.hlsUri != "function") {
      Clip.prototype.hlsUri = function () {
        return this.zone.baseUriCreds() + '/clips/streams/' + this.id + '/stream.m3u8';
      };
    }
    if (typeof this.highwaterUri != "function") {
      Clip.prototype.highwaterUri = function () {
        return this.zone.baseUri() + '/clips/lives/' + this.id + '/live.xml';
      };
    }
    if (typeof this.imgUri != "function") {
      /* Args
      frame
      format
      width
      */
      Clip.prototype.imgUri = function (frame, format, width, download) {
        var ret = this.zone.baseUri(), dl = '';
        if (download !== undefined) {
          //ret = this.zone.baseUriCreds();
          dl = '_download';
        }
        if (arguments.length === 0) {
          ret += '/clips/stills/' + this.id + '/thumb' + dl + '.jpg';
        }
        else if (arguments.length == 1) {
          ret += '/clips/stills/' + this.id + '/' + frame + dl + '.jpg';
        }
        else if (arguments.length == 2) {
          ret += '/clips/stills/' + this.id + '/' + frame + dl + '.' + format;
        }
        else if (arguments.length > 2) {
          ret += '/clips/stills/' + this.id + '/' + frame + dl + '.' + width + '.' + format;
        }
        return ret;
      };
    }
    if (typeof this.fileUri != "function") {
      /* Args
      format
      inframe
      outframe
      */
      Clip.prototype.fileUri = function (format, inFrame, outFrame) {
        var ret = null;
        if (arguments.length == 1) {
          if (format == 'mxf') {
            ret = this.zone.baseUri() + '/clips/ports/' + this.id + '/essence.' + format;
          } else if (format == 'wav') {
            ret = this.zone.baseUri() + '/clips/ports/' + this.id + '/audio.' + format;
          }
        }
        else if (arguments.length == 3) {
          ret = this.zone.baseUri() + '/clips/ports/' + this.id + '/' + inFrame + '-' + outFrame + '.' + format;
        }
        return ret;
      };
    }
    if (typeof this.attributesUri != "function") {
      /* Args
      frame
      */
      Clip.prototype.attributesUri = function (attribute) {
        var ret = null;
        if (arguments.length == 1) {
          ret = this.zone.baseUri() + '/clips/metadata/' + this.id + '/attributes(' + attribute + ')';
        } else {
          ret = this.zone.baseUri() + '/clips/metadata/' + this.id + '/attributes';
        }
        return ret;
      };
    }
    if (typeof this.logsUri != "function") {
      /* Args
      frame
      */
      Clip.prototype.logsUri = function (frame) {
        var ret = null;
        if (arguments.length == 1) {
          ret = this.zone.baseUri() + '/clips/metadata/' + this.id + '/logs(inframe=' + frame + ')';
        } else {
          ret = this.zone.baseUri() + '/clips/metadata/' + this.id + '/logs';
        }
        return ret;
      };
    }

    if (typeof this.loadProperties != "function") {
      Clip.prototype.loadProperties = function () {
        this.zone.search({ searchTerms: [{ key: 'ClipID', val: this.id}] }, function (clips) {
          if (clips !== null && clips.length > 0) {
            this.properties = clips[0].properties;
            this.duration = clips[0].duration;
          }
        } .bind(this));
      };
    }

    if (typeof this.loadManifest != "function") {
      Clip.prototype.loadManifest = function (asyncCallback) {
        var clipOutFrame = null, frag = null, clip = this;

        // Load highwater
        $.ajax({
          type: 'GET',
          url: this.manifestUri(),
          dataType: 'xml',
          cache: false,
          timeout: 8000,
          beforeSend: this.zone.site.beforeSend,
          success: function (xml) {
            this.frames = 0;
            $(xml).find('attribute').each(function () {
              //for (i = 0; i < $(xml).clip[0].attributes.length; i++) {
              if ($(this).attr('tag') == "Frames") {
                clip.frames = $(this).attr('value');
              }
              else if ($(this).attr('tag') == "Framerate") {
                clip.fps = parseInt($(this).attr('value'), 10);
              }
              else if ($(this).attr('tag') == "Framerate1001") {
                clip.flag1001 = ($(this).attr('value') === 'true');
              } else {
                clip.properties[$(this).attr('tag').toLowerCase()] = $(this).attr('value');
              }
            });

            //manifest.clip[0].logical[0].tracks[0].fragments[2].clipInFrame = 0;
            clip.videoSegments = [];
            clip.audioSegments = [];
            $(xml).find('orderedFragment').each(function () {
              //for (i = 0; i < xml.clip[0].logical[0].tracks[0].fragments.length; i++) {
              frag = {};
              //              notify.log('frag type:' + frag.type + ', clipInFrame:' + frag.clipInFrame
              //              + ', inFrame:' + frag.inFrame + ', outFrame:' + frag.outFrame + ', ID:' + frag.ID);

              // MWMWMW Need to take into account flag1001 and check floating point maths
              frag.ID = $(this).attr('ID');
              frag.intime = clip.flag1001 ? ($(this).attr('inFrame') * 1001) / (clip.fps * 1000) : $(this).attr('inFrame') / clip.fps;
              frag.outtime = clip.flag1001 ? ($(this).attr('outFrame') * 1001) / (clip.fps * 1000) : $(this).attr('outFrame') / clip.fps;
              frag.duration = frag.outtime - frag.intime;
              frag.clipInTime = clip.flag1001 ? ($(this).attr('clipInFrame') * 1001) / (clip.fps * 1000) : $(this).attr('clipInFrame') / clip.fps;
              frag.clipOutTime = frag.clipInTime + frag.duration;
              frag.zone = clip.zone;
              if ($(this).attr('type') == 'video') {
                clip.videoSegments.push(frag);
              } else {
                clip.audioSegments.push(frag);
              }
              clipOutFrame = frag.clipInFrame + frag.outFrame - frag.inFrame;
              if (clip.frames < clipOutFrame) {
                clip.frames = clipOutFrame;
              }
            });
            clip.duration = clip.flag1001 ? (clip.frames * 1001) / (clip.fps * 1000) : clip.frames / clip.fps;

            asyncCallback(clip);
          },
          error: function () {
            asyncCallback(null);
          }
        });
      };
    }

    if (typeof this.fetchHighwaterMark != "function") {
      Clip.prototype.fetchHighwaterMark = function (asyncCallback) {
        // Load highwater
        $.ajax({
          type: 'GET',
          url: this.highwaterUri(),
          dataType: 'xml',
          timeout: 8000,
          beforeSend: this.zone.site.beforeSend,
          success: function (xml) {
            var highwater = parseInt($(xml).find('Frame-Offset').text(), 10);
            if (isNaN(highwater) || highwater === 0) {
              asyncCallback(null);
            } else {
              asyncCallback(helper.framesToSeconds(highwater, this.zone.site.fps, this.zone.site.flag1001));
            }
          } .bind(this),
          error: function () {
            asyncCallback(null);
          }
        });
      };
    }

    if (typeof this.editAttribute != "function") {
      Clip.prototype.editAttribute = function (name, value, asyncCallback) {
        if (arguments.length == 3) {
          $.ajax({
            url: this.attributesUri(name),
            data: '<attributes><attribute value="' + value + '" /></attributes>',
            type: 'PUT',
            dataType: "xml",
            timeout: 8000,
            beforeSend: this.zone.site.beforeSend,
            error: function (xhr) {
              if (xhr.status == 200) {
                asyncCallback(true);
              } else {
                asyncCallback(false, xhr.status + ' - ' + xhr.statusText);
              }
            },
            success: function () {
              asyncCallback(true);
            }
          });
        }
      };
    }

    if (typeof this.addLog != "function") {
      Clip.prototype.addLog = function (comment, inframe, outframe, type, asyncCallback) {
        if (arguments.length == 5) {
          var data = '<newLogEntries><log clipid="' + this.id + '" inframe="' + inframe + '" outframe="' + outframe +
                  '" contents="' + comment + '" type="' + type + '" /></newLogEntries>';
          $.ajax({
            type: 'PUT',
            url: this.logsUri(inframe),
            data: data,
            dataType: 'xml',
            timeout: 8000,
            beforeSend: this.zone.site.beforeSend,
            success: function () {
              asyncCallback(true);
            },
            error: function (xhr) {
              if (xhr.status == 200) {
                asyncCallback(true);
              } else {
                asyncCallback(false, xhr.status + ' - ' + xhr.statusText);
              }
            }
          });
        }
      };
    }

    if (typeof this.copy != "function") {
      Clip.prototype.copy = function () {
        var ret = new Clip(this.zone, this.id);
        return ret;
      };
    }

    if (typeof this.save != "function") {
      Clip.prototype.save = function () {
        var ret = '{"id":"' + this.id +
                '","zid":"' + this.zone.id +
                '","sl":"' + this.zone.site.location +
                '","sfps":"' + this.zone.site.fps +
                '","sflg":"' + this.zone.site.flag1001;

        if (this.properties !== undefined) {
          if (this.duration !== undefined) {
            ret += '","dur":"' + this.duration;
          }
          if (this.properties.title !== undefined) {
            ret += '","ti":"' + this.properties.title;
          }
          if (this.properties.created !== undefined) {
            ret += '","cr":"' + this.properties.created;
          }
          if (this.properties.owner !== undefined) {
            ret += '","ow":"' + this.properties.owner;
          }
          if (this.properties.category !== undefined) {
            ret += '","cat":"' + this.properties.category;
          }
          ret += '" }';
        }
        return helper.escape(ret);
      };
    }
    if (typeof this.toJSON != "function") {
      Clip.prototype.toJSON = function () {
        //return this.save();

        var ret = { "id": this.id, "zid": this.zone.id, "sl": this.zone.site.location, "sfps": this.zone.site.fps, "sflg": this.zone.site.flag1001 };

        if (this.properties !== undefined) {
          if (this.duration !== undefined) {
            ret.dur = this.duration;
          }
          if (this.properties.title !== undefined) {
            ret.ti = this.properties.title;
          }
          if (this.properties.created !== undefined) {
            ret.cr = this.properties.created;
          }
          if (this.properties.owner !== undefined) {
            ret.ow = this.properties.owner;
          }
          if (this.properties.category !== undefined) {
            ret.cat = this.properties.category;
          }
        }
        return ret;
      };
    }
  }

  return {
    /** 
    * Creates a new Clip object and loads it's resources 
    * @param {Zone} zone - The zone the clip is stored in
    * @param {Number} id - The clip id
    * @returns {Clip} - The new clip
    */
    create: function (zone, id) {
      return new Clip(zone, id);
    },
    /** 
    * Creates a new Clip object from json
    * @param {string} json - The json representing the new clip
    * @param {Zone} zone - The zone the clip is stored in
    * @returns {Clip} - The new clip
    */
    load: function (json, zone) {
      var ret = null;
      if (json.id !== undefined) {
        ret = new Clip(zone, json.id);

        ret.loaded = false;
        ret.properties.duration = json.dur;
        ret.duration = json.dur;
        ret.properties.title = json.ti;
        ret.properties.created = json.cr;
        ret.properties.owner = json.ow;
        ret.properties.category = json.cat;
      }
      return ret;
    },
    /** 
    * Checks if an object is a Clip object
    * @param {Object} obj - The object to check
    * @returns {Boolean} - Whether obj is a Clip object
    */
    isclip: function (obj) {
      return obj instanceof Clip;
    }
  };
});