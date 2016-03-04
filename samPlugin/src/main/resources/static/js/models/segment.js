/*global define, console*/
define(["models/clip", "models/transformer", "models/zone", "jquery"], function (clip, transformer, zone) {
  "use strict";

  /**
  * Represents a Quantel Segment which is a sub part of a clip
  * @constructor
  * @param {clip} - The Clip the segment belongs to
  */
  function Segment(clip) {
    this.clip = clip;
    this.intime = null;
    this.outtime = null;
    this.position = null;

    if (typeof this.copy != "function") {
      Segment.prototype.copy = function () {
        var ret = new Segment(this.clip);
        ret.intime = this.intime;
        ret.outtime = this.outtime;
        ret.position = this.position;
        return ret;
      };
    }

    if (typeof this.save != "function") {
      Segment.prototype.save = function () {
        return '{"cl":' + this.clip.save() + ',"inti":"' + this.intime + '","out":"' + this.outtime + '","pos":"' + this.position + '"}';
      };
    }

    if (typeof this.duration != "function") {
      Segment.prototype.duration = function () {
        var ret = this.clip.duration;
        if (this.outtime !== null) {
          ret = this.outtime;
        }
        if (this.intime !== null) {
          ret -= this.intime;
        }
        return ret;
      };
    }

    if (typeof this.toJSON != "function") {
      Segment.prototype.toJSON = function () {
        return { "cl": this.clip.toJSON(), "inti": this.intime, "out": this.outtime, "pos": this.position };
      };
    }
  }

  return {
    /** 
    * Creates a new Segment object and loads it's resources 
    * @param {clip} - The Clip the segment belongs to
    */
    isSegment: function (obj) {
      return obj instanceof Segment;
    },
    create: function (obj) {
      var ret = null;
      if (this.isSegment(obj)) {
        ret = obj.copy();
      }
      else if (clip.isclip(obj)) {
        ret = new Segment(obj);
      }
      else {
        ret = new Segment();
      }
      return ret;
    },
    load: function (json) {
      var ret = null, newSite, newZone;
      if (json.cl !== undefined && json.cl.sl !== undefined && json.cl.zid !== undefined) {
        newSite = transformer.create(json.cl.sl);
        newZone = zone.create(newSite, json.cl.zid);
        ret = new Segment(clip.load(json.cl, newZone));
        ret.intime = json.inti;
        ret.outtime = json.out;
        ret.position = json.pos;
        if (json.cl.sfps !== undefined) {
          newSite.fps = parseInt(json.cl.sfps, 10);
        }
        if (json.cl.sflg !== undefined) {
          newSite.flag1001 = (json.cl.sflg === 'true');
        }
      }
      return ret;
    }
  };
});