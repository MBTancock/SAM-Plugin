/*jslint browser: true */
/*jshint multistr: true */

var controlsTemplate = '<div class="qcontrols player-controls">\
    <div class="navbar-right playerbar-right-btns">\
      <button class="qicon controls volume"><span class="newicon icon-audio" data-toggle="tooltip" data-placement="bottom" title="Volume"></span></button>\
      <button class="qicon controls fullscreen"><span class="newicon icon-full-screen" data-toggle="tooltip" data-placement="bottom" title="Fullscreen">\
      </span></button>\
    </div>\
    <div class="hor-center"><div class="qcenter qtoolbar-fixed player-controls-play">\
      <button class="qicon controls in"><span class="newicon icon-mark-in" data-toggle="tooltip" data-placement="bottom" title="Mark In">\
      </span></button>\
      <button class="qicon controls backward"><span class="newicon icon-rewind" data-toggle="tooltip" data-placement="bottom" title="Rewind"></span></button>\
      <button class="qicon controls play"><span class="newicon icon-play" data-toggle="tooltip" data-placement="bottom" title="Play"></span></button>\
      <button class="qicon controls pause"><span class="newicon icon-pause" data-toggle="tooltip" data-placement="bottom" title="Pause"></span></button>\
      <button class="qicon controls forward"><span class="newicon icon-fast-forward" data-toggle="tooltip" data-placement="bottom" title="Fast Forward"></span></button>\
      <button class="qicon controls out"><span class="newicon icon-mark-out" data-toggle="tooltip" data-placement="bottom" title="Mark Out">\
      <button class="qicon controls add"><span class="newicon icon-add-to-bin bigger-icon" data-toggle="tooltip" data-placement="bottom" title="Add to Bin"></span></button>\
      </span></button>\
    </div></div>\
  </div>';

/*global define, console*/
define(["jquery", "views/notification", "helper", "jquery-ui"], function ($, notify, helper) {
  "use strict";

  var volume = 1.0;
  /**
  * Represents a PlayerControls view
  * @constructor
  */
  function PlayerControls() {

    if (typeof this.draw != "function") {
      PlayerControls.prototype.draw = function (parent) {
        parent.append($(controlsTemplate));

        this.playbutton = $('.play', parent);
        this.pausebutton = $('.pause', parent);
        this.inicon = $('.icon-mark-in', parent);
        this.outicon = $('.icon-mark-out', parent);
        this.rewicon = $('.icon-rewind', parent);
        this.fficon = $('.icon-fast-forward', parent);

        this.pausebutton.addClass('hide');

        // Set play controls to the center. Need to set margin to take account of the right controls panel
        var rightWidth = $('.playerbar-right-btns', parent).outerWidth(), centerControls = $('.player-controls-play', parent);
        if (centerControls.outerWidth() + (rightWidth * 2) < $(parent).width()) {
          centerControls.css('margin-left', rightWidth);
        }

        // Click listeners
        $('.player-controls', parent).off().on('click', function (evt) {
          var element = null;
          if ((evt.target.nodeName == 'BUTTON') || (evt.target.nodeName == 'LI')) {
            element = $(evt.target);
          } else if ((evt.target.parentElement.nodeName == 'BUTTON') || (evt.target.parentElement.nodeName == 'LI')) {
            element = $(evt.target.parentElement);
          }

          if (element !== null && element.prop('disabled') !== true) {
            if (element.hasClass('play')) {
              $(this).trigger('update', { update: 'play' });
            } else if (element.hasClass('pause')) {
              $(this).trigger('update', { update: 'pause' });
            } else if (element.hasClass('in')) {
              $(this).trigger('update', { update: 'in' });
            } else if (element.hasClass('out')) {
              $(this).trigger('update', { update: 'out' });
            } else if (element.hasClass('add')) {
              $(this).trigger('update', { update: 'add' });
            } else if (element.hasClass('backward')) {
              $(this).trigger('update', { update: 'rew' });
            } else if (element.hasClass('forward')) {
              $(this).trigger('update', { update: 'ff' });
            } else if (element.hasClass('fullscreen')) {
              $(this).trigger('update', { update: 'fullscreen' });
            }
          }
        } .bind(this));

        if (helper.mobile) {
          $('.fullscreen', parent).addClass('hide');
        }

        // Volume Control handling
        if (helper.iPad || helper.iPhone) {
          $('.volume', parent).addClass('hide');
        } else {
          $('.volume', parent).popover({
            placement: 'top',
            content: '<div class="volume-slider"><a class="volume-slider-handle"></a></div>',
            html: true,
            trigger: 'click'
          }).on('shown.bs.popover', function () {
            // Set the position of the volume slider to reflect the current volume
            var volumeSlider = $('.volume-slider', parent),
            volumeSliderElement = $('.volume-slider-handle', parent);
            volumeSliderElement.css('margin-top', (volumeSlider.height() - (volume * volumeSlider.height()) - (volumeSliderElement.height() / 2)) + 'px');
            if (helper.mobile) {
              volumeSlider.off().on('touchstart', function (startEvt) {
                var startOff = volumeSlider.offset().top,
                height = $(startEvt.currentTarget).height(),
                newPos = startEvt.originalEvent.touches[0].pageY;
                if (newPos < startOff) {
                  newPos = 0;
                } else if (newPos > startOff + height) {
                  newPos = height;
                } else {
                  newPos = newPos - startOff;
                }
                volume = 1 - (newPos / height);
                $(this).trigger('update', { update: 'volume', val: volume });
                volumeSliderElement.css('margin-top', (newPos - (volumeSliderElement.height() / 2)) + 'px');

                $(window).on('touchmove', function (moveEvt) {
                  moveEvt.preventDefault();
                  var newPos = moveEvt.originalEvent.touches[0].pageY;
                  if (newPos < startOff) {
                    newPos = 0;
                  } else if (newPos > startOff + height) {
                    newPos = height;
                  } else {
                    newPos = newPos - startOff;
                  }
                  volume = 1 - (newPos / height);
                  $(this).trigger('update', { update: 'volume', val: volume });
                  volumeSliderElement.css('margin-top', (newPos - (volumeSliderElement.height() / 2)) + 'px');
                } .bind(this));
                $(window).on('touchend', function () {
                  $(window).off('touchmove');
                  $(window).off('touchend');
                } .bind(this));
              } .bind(this));
            } else {
              volumeSlider.off().on('mousedown', function (downEvt) {
                var startOff = volumeSlider.offset().top,
                height = $(downEvt.currentTarget).height(),
                newPos = downEvt.pageY;
                if (newPos < startOff) {
                  newPos = 0;
                } else if (newPos > startOff + height) {
                  newPos = height;
                } else {
                  newPos = newPos - startOff;
                }
                volume = 1 - (newPos / height);
                $(this).trigger('update', { update: 'volume', val: volume });
                volumeSliderElement.css('margin-top', (newPos - (volumeSliderElement.height() / 2)) + 'px');

                $(window).on('mousemove', function (moveEvt) {
                  moveEvt.preventDefault();
                  var newPos = moveEvt.pageY;
                  if (newPos < startOff) {
                    newPos = 0;
                  } else if (newPos > startOff + height) {
                    newPos = height;
                  } else {
                    newPos = newPos - startOff;
                  }
                  volume = 1 - (newPos / height);
                  $(this).trigger('update', { update: 'volume', val: volume });
                  volumeSliderElement.css('margin-top', (newPos - (volumeSliderElement.height() / 2)) + 'px');
                } .bind(this));
                $(window).on('mouseup', function () {
                  $(window).off('mouseup');
                  $(window).off('mousemove');
                } .bind(this));
              } .bind(this));
            }
          } .bind(this)).on('click', function (evt) {
            if ($(this).next('.popover:visible').length === 0) {
              $(this).popover('show');
              evt.stopPropagation();
            }
          } .bind(this));
        }
      };
    }

    if (typeof this.play != "function") {
      PlayerControls.prototype.play = function () {
        this.playbutton.addClass('hide');
        this.pausebutton.removeClass('hide');
        this.rewicon.removeClass('active');
        this.fficon.removeClass('active');
      };
    }

    if (typeof this.pause != "function") {
      PlayerControls.prototype.pause = function () {
        this.playbutton.removeClass('hide');
        this.pausebutton.addClass('hide');
        this.rewicon.removeClass('active');
        this.fficon.removeClass('active');
      };
    }

    if (typeof this.rew != "function") {
      PlayerControls.prototype.rew = function () {
        this.playbutton.addClass('hide');
        this.pausebutton.removeClass('hide');
        this.rewicon.addClass('active');
        this.fficon.removeClass('active');
      };
    }

    if (typeof this.ff != "function") {
      PlayerControls.prototype.ff = function () {
        this.playbutton.addClass('hide');
        this.pausebutton.removeClass('hide');
        this.rewicon.removeClass('active');
        this.fficon.addClass('active');
      };
    }

    if (typeof this.redraw != "function") {
      PlayerControls.prototype.redraw = function (src) {
        if (src.intime === null) {
          this.inicon.removeClass('active');
        } else {
          this.inicon.addClass('active');
        }

        if (src.outtime === null) {
          this.outicon.removeClass('active');
        } else {
          this.outicon.addClass('active');
        }
      };
    }

    if (typeof this.setVolume != "function") {
      PlayerControls.prototype.setVolume = function (val) {
        volume = val;
      };
    }
  }

  return {
    /** 
    * Creates a new PlayerControls view to display segments
    */
    create: function () {
      return new PlayerControls();
    }
  };
});