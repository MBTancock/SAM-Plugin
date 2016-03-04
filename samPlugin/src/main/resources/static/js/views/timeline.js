/*global define, console*/
/*jslint browser: true */
define(["jquery", "views/notification", "helper", "controllers/imgLoader"], function ($, notify, helper, imgLoader) {
  "use strict";

  var preview = '<div class="popover fade top in preview hide"></div>',
  previewTime = '<div class="time"></div>',
  posBar = '<div class="posbar"></div>',
  highwaterBar = '<div class="recordingbar"></div>',
  zoomFactor = '<div class="zoom popover fade top in">Hello</div>',
  inOutBar = '<div class="inoutbar"></div>';
  /**
  * Represents a Timeline view
  * @constructor
  */
  function Timeline() {
    this.src = null;
    this.hwm = null;
    this.timeline = $('<div>', { 'class': 'timeline' });

    // Preview
    this.preview = $(preview);
    this.previewImg = imgLoader.create(3);

    this.previewTime = $(previewTime);
    $(this.preview).append(this.previewTime);

    this.posbar = $(posBar);
    this.timeline.append(this.posbar);

    this.highwaterbar = $(highwaterBar);
    this.timeline.append(this.highwaterbar);

    this.inoutbar = $(inOutBar);
    this.timeline.append(this.inoutbar);

    this.logsbar = $('<div>', {});
    this.timeline.append(this.logsbar);

    this.zoom = $(zoomFactor);
    this.timeline.append(this.zoom);
    this.zoom.removeClass('hide');
    this.zoomFactor = 1.0;
    this.startTime = null;

    if (helper.mobile) {
      this.timeline.css('height', '45px');
    }

    if (typeof this.triggerTimelineUpdate != "function") {
      Timeline.prototype.triggerTimelineUpdate = function (off, width) {
        var pos = off / width, time = 0, diffTime = null;
        if (pos > 1) {
          time = this.src.clip.duration;
        } else if (pos > 0) {
          time = pos * this.src.clip.duration;
        }
        if ((this.src !== null) && (this.hwm === null || time < this.hwm)) {
          $(this).trigger('update', { update: 'scrub', pos: time });
        }
      };
    }

    if (typeof this.draw != "function") {
      Timeline.prototype.draw = function (parent) {
        if (helper.mobile) {
          this.timeline.off().on('touchstart', function (startEvt) {
            var startOffX = this.timeline.offset().left,
            startOffY = this.timeline.offset().top,
            startZoom = 70,
            endZoom = 250,
            width = $(startEvt.currentTarget).width(),
            startPos = this.triggerTimelineUpdate(startEvt.originalEvent.touches[0].pageX - startOffX, width);

            $(window).on('touchmove', function (moveEvt) {
              moveEvt.preventDefault();
              var zoom = Math.min(Math.max(startOffY - moveEvt.originalEvent.touches[0].pageY - startZoom, 0), endZoom) / endZoom;
              if (zoom > 0) {
                this.zoomFactor = 1 - zoom;
                var dur = Math.max(this.src.clip.duration * this.zoomFactor, 1.0);
                //console.log('Moving at ' + this.zoomFactor + '. time: ' + this.src.clip.duration);
                this.zoom.html(helper.secondsToTimecode(dur, this.src.clip.zone.site.fps));
              } else {
                //console.log('Updating: ' + zoom);
                this.triggerTimelineUpdate(moveEvt.originalEvent.touches[0].pageX - startOffX, width);
              }
            } .bind(this));
            $(window).on('touchend', function () {
              $(window).off('touchmove');
              $(window).off('touchend');
              $(this).trigger('update', { update: 'scrubend' });
            } .bind(this));
          } .bind(this));
        } else {
          this.timeline.off().on('mousedown', function (downEvt) {
            this.preview.addClass('hide');
            this.timelinehover = false;

            var startOff = this.timeline.offset().left,
            width = $(downEvt.currentTarget).width();
            this.triggerTimelineUpdate(downEvt.pageX - startOff, width);

            $(window).on('mousemove', function (moveEvt) {
              moveEvt.preventDefault();

              // set zoom factor
              this.triggerTimelineUpdate(moveEvt.pageX - startOff, width);
            } .bind(this));
            $(window).on('mouseup', function () {
              $(window).off('mousemove');
              $(window).off('mouseup');
              $(this).trigger('update', { update: 'scrubend' });
            } .bind(this));
          } .bind(this));
          this.timeline.on('mouseenter', function () {
            if (!helper.mobile) {
              this.timelinehover = true;
              this.preview.removeClass('hide');
            }
          } .bind(this));
          this.timeline.on('mouseout', function () {
            this.timelinehover = false;
            this.preview.addClass('hide');
          } .bind(this));
          this.timeline.on('mousemove', function (evt) {
            if (this.src !== null) {
              var startOff = this.timeline.offset().left,
            off = evt.pageX,
            pos = ((off - startOff) / $(evt.currentTarget).width()) * this.src.clip.duration,
            img = null;
              if (this.timelinehover) {
                off = off - 22 - ($(this.preview).width() / 2);
                if (off < 0) {
                  off = 0;
                } else if ((off + $(this.preview).width()) > $(window).width()) {
                  off = $(window).width() - $(this.preview).width();
                }
                this.preview.css({ 'top': (this.timeline.offset().top - 145).toString() + 'px', 'left': off + 'px' });
                if ((this.src !== null) && (this.hwm === null || pos < this.hwm)) {
                  this.previewTime.text(helper.secondsToTimecode(pos, this.src.clip.zone.site.fps));
                  img = this.src.clip.imgUri(helper.secondsToFrames(
                  pos,
                  this.src.clip.zone.site.fps,
                  this.src.clip.zone.site.flag1001
                ).toFixed(0), 'jpg');

                  //notify.log('Preview: ' + img + '. Pos: ' + pos + '. Duration: ' + this.src.clip.duration + '. Offset: ' + off + '. Start: ' + startOff + '. PageX: ' + evt.pageX);
                  this.previewImg.queueFrame(img);
                }
              }
            }
          } .bind(this));
        }

        this.previewImg.draw(this.preview);
        parent.append(this.timeline);
        parent.append(this.preview);

        this.nextLoadSrc = null;
      };
    }

    if (typeof this.redraw != "function") {
      Timeline.prototype.redraw = function (segment) {
        if ((segment !== undefined) && (segment !== null)) {
          var i, offset = 0, segbar = null, inplace = 0, outplace = 100, visible = false, pos = null;
          if (this.src != segment) {
            this.src = segment;
            if (this.src.clip.segs !== undefined) {
              for (i = 0; i < this.src.clip.segs.length; i++) {
                segbar = $('<div>', {
                  'class': 'segbar'
                }).css('left', (offset * 100 / this.src.clip.duration) + '%');
                offset += this.src.clip.segs[i].duration();
                this.timeline.append(segbar);
              }
            }
          }

          $(this.posbar).css('left', this.src.position === null ? '0px' : (this.src.position * ($(this.timeline).width() - $(this.posbar).width()) / this.src.clip.duration) + 'px');

          if (this.src.clip.highwaterMark === null) {
            this.highwaterbar.addClass('hide');
            this.hwm = null;
          }
          else {
            this.highwaterbar.removeClass('hide');
            pos = (this.src.clip.highwaterMark * 100) / this.src.clip.duration;
            this.hwm = this.src.clip.highwaterMark;
            //notify.log('updating timeline with hwm: ' + this.src.clip.highwaterMark + '. dur: ' + this.src.clip.duration + '. pos: ' + pos);
            this.highwaterbar.css('left', pos + '%');
            this.highwaterbar.css('width', (100 - pos) + '%');
          }

          // in out handling
          if ((this.src.intime !== undefined) && (this.src.intime !== null)) {
            inplace = (this.src.intime * 100 / this.src.clip.duration);
            visible = true;
          }
          if ((this.src.outtime !== undefined) && (this.src.outtime !== null)) {
            outplace = (this.src.outtime * 100 / this.src.clip.duration);
            visible = true;
          }

          if (visible) {
            this.inoutbar.css('visibility', 'visible');
            if (outplace < inplace) {
              this.inoutbar.css('left', outplace + '%');
              this.inoutbar.css('width', (inplace - outplace) + '%');
              this.inoutbar.css('background', '#cc0033');
            } else {
              this.inoutbar.css('left', inplace + '%');
              this.inoutbar.css('width', (outplace - inplace) + '%');
              this.inoutbar.css('background', '#66ccff');
            }
          } else {
            this.inoutbar.css('visibility', 'hidden');
          }
        }
      };
    }

    if (typeof this.addLogMarker != "function") {
      Timeline.prototype.addLogMarker = function (log) {
        if (this.src !== null) {
          var html = '<div class="logbar" style="left: ' + (log.time * 100 / this.src.clip.duration) +
                  '%" data-toggle="tooltip" data-placement="bottom" title="' + log.comment + '"></div>';
          this.logsbar.append($(html));
        }
      };
    }

    if (typeof this.clear != "function") {
      Timeline.prototype.clear = function () {
        this.previewImg.clear();
        this.logsbar.empty();
      };
    }
  }

  return {
    /** 
    * Creates a new Timeline view to display segments in a timeline
    */
    create: function () {
      return new Timeline();
    }
  };
});