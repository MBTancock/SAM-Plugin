/*global define, console*/

/**
* Bin module. A bin is a collection of segments.
* @module models/bin
*/
define(["jquery", "views/notification", "helper", "models/segment", "models/transformer", "models/zone", "models/clip"],
function ($, notify, helper, segment, transformer, zone, clip) {
  "use strict";

  /**
  * Represents an bin, which is a collection of Segments
  * @constructor
  * @memberof module:models/bin
  */
  function Bin() {
    /**
    * {Array} List of segments in this bin
    * @scope static
    */
    this.segments = [];

    if (typeof this.add != "function") {
      /** 
      * Adds a new segment to the bin. Triggers an update event when complete.
      * @method
      * @scope static
      * @param {Segment} seg - The segment to add.
      * @param {Number} idx - The index at which to add the segment into the list of segments.
      */
      Bin.prototype.add = function (segs, idx) {
        notify.log('bin add');
        var seg;
        if (segs.length === undefined) {
          seg = segs;
          if (clip.isclip(seg)) {
            seg = segment.create(seg);
            seg.intime = 0;
            seg.outtime = seg.clip.duration;
          }

          if (idx === undefined) {
            idx = this.segments.length;
          }
          this.segments.splice(idx, 0, seg);
        } else {
          for (idx = 0; idx < segs.length; idx++) {
            seg = segs[idx];
            if (clip.isclip(seg)) {
              seg = segment.create(seg);
              seg.intime = 0;
              seg.outtime = seg.clip.duration;
            }
            this.segments.push(seg);
          }
        }
        $(this).trigger('update');
      };
    }

    if (typeof this.remove != "function") {
      /** 
      * Removes a segment from the bin. Triggers an update event when complete.
      * @method
      * @scope static
      * @param {Segment} segs - The segment or array of segments to remove.
      */
      Bin.prototype.remove = function (segs) {
        notify.log('bin remove');
        var i, j;
        if (segs.length === undefined) {
          segs = [segs];
        }

        for (i = 0; i < segs.length; i++) {
          for (j = 0; j < this.segments.length; j++) {
            if (this.segments[j] == segs[i]) {
              this.segments.splice(j, 1);
              break;
            }
          }
        }
        $(this).trigger('update');
      };
    }

    if (typeof this.move != "function") {
      /** 
      * Moves a segment within the bin to a different position. Triggers an update event when complete.
      * @method
      * @scope static
      * @param {Segment} seg - The segment to move.
      * @param {Number} idx - The new idx the segment should be moved to.
      */
      Bin.prototype.move = function (seg, newIdx) {
        notify.log('bin move');
        var i;
        for (i = 0; i < this.segments.length; i++) {
          if (this.segments[i] == seg) {
            this.segments.splice(i, 1);
            this.segments.splice(newIdx, 0, seg);
            $(this).trigger('update');
            return;
          }
        }
      };
    }

    if (typeof this.save != "function") {
      /** 
      * Converts this bin to json.
      * @method
      * @scope static
      * @returns {string} A json string representing the bin
      */
      Bin.prototype.save = function () {
        var i, ret = '';
        for (i = 0; i < this.segments.length; i++) {
          ret += this.segments[i].save() + ',';
        }
        ret = '[' + ret.substring(0, ret.length - 1) + ']';
        return ret;
      };
    }

    if (typeof this.clear != "function") {
      /** 
      * Clears all segments from the bin. Triggers an update event when complete.
      * @method
      * @scope static
      */
      Bin.prototype.clear = function (segs) {
        notify.log('bin clear');
        this.segments = [];
        $(this).trigger('update');
      };
    }

    if (typeof this.publish != "function") {
      /** 
      * Asynchronous function which publishes this bin to a given Transformer. 
      * @method
      * @scope static
      * @param {Object} properties - A set of properties for the publish including title, owner, category, area and transformer object for the publish
      * @param {function} callback - Function which gets called when the publish is complete
      */
      Bin.prototype.publish = function (properties, callback) {
        if (properties.area !== null) {
          var i, seg, uploadUrl, xml = '<clip_prototype version="1.0"><isa_clip_properties><area id="' + properties.area + '" />';
          if (properties.title !== null) {
            xml += '<property name="Title" value="' + properties.title + '"/>';
          }
          if (properties.owner !== null) {
            xml += '<property name="Owner" value="' + properties.owner + '"/>';
          }
          if (properties.category !== null) {
            xml += '<property name="Category" value="' + properties.category + '"/>';
          }
          xml += '</isa_clip_properties>';

          for (i = 0; i < this.segments.length; i++) {
            seg = this.segments[i];
            xml += '<essence_segment><clip_id>' + seg.clip.id + '</clip_id><zone_id>' + seg.clip.zone.id + '</zone_id><start_frame>' +
                    helper.secondsToFrames(seg.intime, seg.clip.zone.site.fps, seg.clip.zone.site.flag1001).toFixed(0) + '</start_frame><frames>' +
                    helper.secondsToFrames(seg.duration(), seg.clip.zone.site.fps, seg.clip.zone.site.flag1001).toFixed(0) + '</frames>';
            if (seg.clip.zone.site.location != properties.transformer) {
              xml += '<zonePath>' + seg.clip.zone.site.location + '</zonePath>';
            }
            xml += '</essence_segment>';
          }
          xml += '</clip_prototype>';

          uploadUrl = properties.transformer + '/quantel/publish/areaID-' + properties.area + '-clipName--' + helper.guid() + '/publish.xml';
          notify.log('Publish to ' + uploadUrl + '.\n ' + xml);

          $.ajax({
            type: 'POST',
            data: xml,
            url: uploadUrl,
            beforeSend: transformer.beforeSend,
            timeout: 20000,
            //contentType: "text/xml",
            success: function () {
              notify.log("Publish success!");
              if (callback !== undefined) {
                callback(true);
              }
            },
            error: function (xhr, textStatus) {
              notify.log("Publish error: " + textStatus + ", " + xhr.toString());
              if (xhr.status == 200) {
                if (callback !== undefined) {
                  callback(true);
                }
              } else {
                if (callback !== undefined) {
                  callback(false, xhr.status + ' - ' + xhr.statusText);
                }
              }
            }
          });
        } else if (callback !== undefined) {
          callback(false, 'No publish area');
        }
      };
    }
  }

  /*jslint unparam: true*/
  return {
    /** 
    * Creates a new empty Bin object 
    */
    create: function () {
      return new Bin();
    },
    /** 
    * Loads a bin from a json object. Use with JSON.parse
    * @param {string} k - The key for the json object
    * @param {string} v - The value for the json object
    */
    reviver: function (k, v) {
      //notify.log("Using bin reviver k: " + k + ". v: " + v);
      var ret = v, newSite;
      if (typeof v === "object") {
        if ((v.sl !== undefined) && (v.zid !== undefined)) { // clip object
          newSite = transformer.create(v.sl);
          newSite.fps = parseInt(v.sfps, 10);
          newSite.flag1001 = (v.sflg === 'true');
          ret = clip.load(v, zone.create(newSite, v.zid));
        } else if (v.inti !== undefined) { // seg object
          ret = segment.create();
          ret.clip = v.cl;
          ret.intime = parseFloat(v.inti);
          ret.outtime = parseFloat(v.out);
          ret.position = parseFloat(v.pos);
        } else if (v.segs !== undefined) { // bin object
          ret = new Bin();
          ret.title = v.title;
          ret.segments = v.segs;
        }
      }
      return ret;
    }
  };
});
/*jslint unparam: false*/