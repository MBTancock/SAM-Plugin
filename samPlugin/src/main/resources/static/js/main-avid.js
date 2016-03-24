/*global require, console*/

//requirejs(["jquery"], function ($) {
//  window.jquery = $; // We need to define jquery right at the start as jquery plugins rely on this being there when they load
//  requirejs(["jquery", "helper", "views/notification", "controllers/storage", "models/transformer", "models/zone", "models/clip",
//        "views/player", "views/modals", "controllers/keyboard", "jquery-fullscreen"],
      function main ($, helper, notify, storage, transformer, zone, clip, playerView, modals, keyboard) {
        "use strict";

        // SET HOST TO BE THE URL OF THE TRANSFORMER
        // eg. host = "http://195.12.20.58:8090"
        var host = "http://195.12.20.58:8090",
            home = transformer.create(host),
            container = $('<div class="qcontainer">', {}),
            contents = $('<div class="qcontents">', {}),
            pv = playerView.createSilverlightPlayer();

        // Set height of player
        pv.setHeight($(window).height() - 200);

        $('#loggingIn').removeClass('hide');

        // Fetch Transformer ip address from login
        notify.log('Loading ' + document.location.host);

        // Connect to the Transformer
        home.load(function (errorMsg) {
          $('#loggingIn').addClass('hide');
          if (errorMsg !== undefined) {
            notify.error(errorMsg);
          } else {
            // Draw panel
            modals.draw($('#base'));
            notify.draw($('#base'));
            $('#base').append(container);
            $(container).append(contents);

            // Draw player
            pv.draw(contents);
            keyboard.focused(pv);

            // Hide login form
            $('.ui-loader').addClass('hide');
            $('#login').fadeOut(500);
            setTimeout(function () {
              $('#login').remove();
            }, 500);
          }
        });

        // YOU NEED TO SET THE CLIP ID AND ZONE ID OF THE CLIP YOU WANT TO PLAY
        // Event listener for Play Something button
        $('#playClip').on('click', function () {
          var zoneID = "1090", clipID = "229045",
              myClip = clip.create(zone.create(home, zoneID), clipID);
          pv.setSource(myClip);
          pv.play();
        });

        // Event listener for actions from the Player widget
        $(pv).on('update', function (evt, props) {
          var url = null, frame = null, target = null;
          if (props.update == 'fullscreen') {
            if (!$.fullscreen.isFullScreen()) {
              contents.on('fscreenclose', function () {
                pv.fullscreenHide();
                contents.off('fscreenclose');
                notify.remove(contents);
                //pv.setHeight($(window).height() - 200);
                setTimeout(function () {
                  pv.setHeight($(window).height() - 200);
                }, 500);
              });

              // Set fullscreen
              notify.draw(contents);
              contents.fullscreen();
              pv.fullscreenFull();
            } else {
              $.fullscreen.exit();
              pv.fullscreenHide();
              contents.off('fscreenclose');
              notify.remove(contents);
              setTimeout(function () {
                pv.setHeight($(window).height() - 200);
              }, 500);
            }
          } else if (props.update == 'downloadseg') {
            // Download mxf or wav file
            url = props.seg.clip.fileUri(props.format,
                    helper.secondsToFrames(
                        props.seg.intime,
                        props.seg.clip.zone.site.fps,
                        props.seg.clip.zone.site.flag1001
                    ).toFixed(0),
                    helper.secondsToFrames(
                        props.seg.outtime === null ? props.seg.clip.duration : props.seg.outtime,
                        props.seg.clip.zone.site.fps,
                        props.seg.clip.zone.site.flag1001
                    ).toFixed(0)
                ) + "/" + props.seg.clip.properties.title + "." + props.format;
            notify.log("Downloading: " + props.format);
            window.open(url, '_self');
          } else if (props.update == 'addcomment') {
            // Add a comment (rush tag) to a frame
            notify.log('Adding comment: ' + props.term);
            frame = parseInt(helper.secondsToFrames(
                props.seg.position,
                props.seg.clip.zone.site.fps,
                props.seg.clip.zone.site.flag1001
            ).toFixed(0), 10);

            props.seg.clip.addLog(props.term, frame, frame + 1, 4, function (success, errorMsg) {
              if (success) {
                notify.info("Comment added", "");
                if (props.callback !== undefined) {
                  props.callback(true);
                }
              } else {
                notify.error("Failed to add comment: ", errorMsg);
              }
            });
          } else if (props.update == 'snapshot') {
            // Downloads a jpg
            frame = helper.secondsToFrames(
                props.seg.position,
                props.seg.clip.zone.site.fps,
                props.seg.clip.zone.site.flag1001
            ).toFixed(0);
            url = props.seg.clip.imgUri(frame, 'jpg', 'full', true);
            target = helper.mobile ? '_blank' : '_self'; // Load img in a new window for mobile
            window.open(url + '/' + props.seg.clip.properties.title + '_' + frame + '.jpg', target);
          }
        }.bind(this));
      };
//});