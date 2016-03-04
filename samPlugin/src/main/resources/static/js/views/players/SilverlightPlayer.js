/*global define, console*/
/*jslint browser: true */
/*jshint multistr: true */

var silverlightPlayer = "\
<object id=\"{{id}}\" class=\"qplayer\" autoupdate=\"true\" type=\"application/x-silverlight-2\">\
  <param name=\"MinRuntimeVersion\" value=\"4.0.50303.0\" />\
  <param name=\"Source\" value=\"./player.xap\"/>\
  <param name=\"windowless\" value=\"true\"/>\
  <param name=\"enablehtmlaccess\" value=\"true\" />\
  <param name=\"wmode\" value=\"transparent\" />\
  <param name=\"InitParams\" value=\"scriptablename=QTube\" />\
  <a style=\"text-decoration: none;\" href=\"http://go.microsoft.com/fwlink/?LinkID=92799\">\
  <img style=\"border-width:0px\" alt=\"Install Silverlight\" \
  src=\'http://i3.iis.net/resources/images/ui/silverlight/slplayer_disabled.png?cdn_id=52867178000v1\' /></a>\
</object>";

define(["jquery", "views/notification"], function ($, notify) {
  "use strict";

  /*jslint nomen: true */

  /**
  * Represents a Stills Player
  * @constructor
  * @param {clip} - The Clip the segment belongs to
  */
  function SilverlightPlayer(id) {
    /*jslint unparam: true*/
    var src = null, currentTime = null, volume = null, slObject = null, element = null, loadedListener = null, errorListener = null, loading = false,
    onMediaLoaded = function () {
      loading = false;
      if (currentTime !== null) {
        notify.log('********* setting time to ' + currentTime);
        slObject.currentTime = currentTime;
      }
      if (loadedListener !== null) {
        loadedListener();
      }
    },
    onMediaError = function (sender, evt) {
      notify.log('media error');
      if (errorListener !== null) {
        errorListener(evt.Message);
      }
    },
    load = function () {
      // We need to wait until SL object has loaded
      var loadID = setInterval(function () {
        var elem = document.getElementById("silverlight-player-" + id.toString());
        if ((elem !== null) && (elem.IsLoaded === true) && (elem.content.qtube !== undefined)) {
          slObject = elem.content.qtube;
          if (src !== null) {
            slObject.src = src.smoothStreamUri();
          }
          try {
            slObject.onmedialoaded = onMediaLoaded;
            slObject.onmediaerror = onMediaError;

            if (currentTime !== null) {
              slObject.currentTime = currentTime;
            }
            if (volume !== null) {
              slObject.volume = volume;
            }
          } catch (err) { }

          clearInterval(loadID);
          $(this).trigger('qSLLoaded');
        }
      } .bind(this), 10);
    } .bind(this);
    /*jslint unparam: false*/

    this.__defineGetter__('src', function () {
      if (slObject !== null) {
        return slObject.src;
      }
      return src;
    });
    this.__defineSetter__('src', function (clip) {
      src = clip;
      loading = true;
      if (slObject !== null) {
        try { slObject.src = src.smoothStreamUri(); } catch (e) { }
      }
    });

    this.__defineGetter__('currentTime', function () {
      if (slObject !== null) {
        return slObject.currentTime;
      }
      return currentTime;
    });
    this.__defineSetter__('currentTime', function (val) {
      currentTime = val;
      if (slObject !== null) {
        try {
          slObject.currentTime = currentTime;
        } catch (err) { }
      }
    });

    this.__defineGetter__('volume', function () {
      if (slObject !== null) {
        return slObject.volume;
      }
      return volume;
    });
    this.__defineSetter__('volume', function (val) {
      volume = val;
      if (slObject !== null) {
        slObject.volume = volume;
      }
    });

    this.__defineSetter__('onload', function (val) {
      loadedListener = val;
    });
    this.__defineSetter__('onerror', function (val) {
      errorListener = val;
    });

    this.play = function () {
      if (slObject !== null) {
        slObject.play();
      }
    };
    this.pause = function () {
      if (slObject !== null) {
        slObject.pause();
      }
    };

    element = $(silverlightPlayer.replace('{{id}}', "silverlight-player-" + id.toString()));

    this.draw = function (parent) {
      load();
      parent.append(element);
    };

    this.height = function () {
      return $(element).height();
    };

    this.width = function () {
      return $(element).width();
    };

    this.setHeight = function (val) {
      $(element).css('height', val); // Set window to 16:9
    };

    this.isBuffered = function () {
      return !loading;
    };
  }
  /*jslint nomen: false */

  return {
    /** 
    * Creates a new SilverlightPlayer Player
    * @param {id} - The unique id of the player element
    */
    create: function (id) {
      return new SilverlightPlayer(id);
    }
  };
});