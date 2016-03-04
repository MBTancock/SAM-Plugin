/*jslint browser: true */
/*jshint multistr: true */

/*global define*/
define(["jquery", "views/playercontrols", "views/timeline", "models/segment", "helper", "controllers/clipboard", "controllers/storage",
        "views/widgets", "views/footer", "views/notification", "views/modals", "views/metadata",
        "views/players/HTML5Player", "views/players/SilverlightPlayer", "views/players/StillsPlayer", "views/players/MSEPlayer",
        "controllers/imgLoader", "controllers/imgCache", "controllers/navigation"],
  function ($, playercontrols, timelineView, segment, helper, clipboard, storage, widgets, footer, notify, modals, metadataview,
            html5Player, silverlightPlayer, stillsPlayer, msePlayer, imgLoader, imgCache, navigation) {
    "use strict";

    notify.log('loaded player view');

    var playerTemplate = '<div class="qitem qplayeritem" style="position: relative"></div>',
    optionsTemplate = '<div class ="qtoolbar-fixed navbar-left">\
      <button class="qicon controls back"><span class="newicon icon-page-left" data-toggle="tooltip" data-placement="bottom" title="Back">\
      </span></button>\
      <button class="qicon controls download"><span class="newicon icon-download" data-toggle="tooltip" data-placement="bottom" title="Download MXF">\
      </span></button>\
      <button class="qicon controls overlay">\
      <span class="newicon icon-toggle-overlay" data-toggle="tooltip" data-placement="bottom" title="Toggle Hotspots">\
      </span></button>\
      <button class="qicon controls snapshot"><span class="newicon icon-snapshot" data-toggle="tooltip" data-placement="bottom" title="Create Snapshot">\
      </span></button>\
      <button class="qicon controls comments"><span class="newicon icon-add-comment" data-toggle="tooltip" data-placement="bottom" title="Add Comment">\
    </span></button></div>',
    globalOptions = helper.mobile ?
    '<li class="markin"><a>Mark In</a></li>\
      <li class="markout"><a>Mark Out</a></li>\
      <li class="clearinout"><a>Clear In / Out</a></li>\
      <li class="addtobin"><a>Add to Bin</a></li>\
      <li class="overlay"><a>Toggle Hotspots</a></li>\
      <li class="snapshot"><a>Create Snapshot</a></li>\
      <li class="comments"><a>Add Comment</a></li>\
      <li class="metadata"><a>Metadata</a></li>\
      ' : helper.adobe ? '<button class="markin"><div>Mark In</div></button><br>\
      <button class="markout"><div>Mark Out</div></button><br>\
      <button class="clearinout"><div>Clear In / Out</div></button><br>\
      <button class="addtobin"><div>Add to Bin</div></button><br>\
      <button class="overlay"><div>Toggle Hotspots</div></button><br>\
      <button class="metadata"><div>Metadata</div></button><br>\
      ' :
      '<button class="markin"><div>Mark In</div></button><br>\
      <button class="markout"><div>Mark Out</div></button><br>\
      <button class="clearinout"><div>Clear In / Out</div></button><br>\
      <button class="addtobin"><div>Add to Bin</div></button><br>\
      <button class="downloadmxf"><div>Download MXF</div></button><br>\
      <button class="downloadwav"><div>Download WAV</div></button><br>\
      <button class="overlay"><div>Toggle Hotspots</div></button><br>\
      <button class="snapshot"><div>Create Snapshot</div></button><br>\
      <button class="comments"><div>Add Comment</div></button><br>\
      <button class="metadata"><div>Metadata</div></button><br>\
    ',
    makeGlobalOptionsListener = function (player, metadataView) {
      return function (evt) {
        var element = null;
        if ((evt.target.nodeName == 'BUTTON') || (evt.target.nodeName == 'LI')) {
          element = $(evt.target);
        } else if ((evt.target.parentElement.nodeName == 'BUTTON') || (evt.target.parentElement.nodeName == 'LI')) {
          element = $(evt.target.parentElement);
        }

        if (element !== null && element.prop('disabled') !== true) {
          if (element.hasClass('markin')) {
            player.setIn();
          } else if (element.hasClass('markout')) {
            player.setOut();
          } else if (element.hasClass('clearinout')) {
            if (player.src !== null) {
              player.src.intime = null;
              player.src.outtime = null;
              player.timeline.redraw(player.src);
              player.controls.redraw(player.src);
            }
          } else if (element.hasClass('addtobin')) {
            if (player.src !== null) {
              $(player).trigger('update', { update: 'add', seg: player.src.copy() });
            }
          } else if (element.hasClass('downloadmxf')) {
            if (player.src !== null) {
              $(player).trigger('update', { update: 'downloadseg', seg: player.src.copy(), format: 'mxf' });
            }
          } else if (element.hasClass('downloadwav')) {
            if (player.src !== null) {
              $(player).trigger('update', { update: 'downloadseg', seg: player.src.copy(), format: 'wav' });
            }
          } else if (element.hasClass('overlay')) {
            player.togglePlayerOverlay();
          } else if (element.hasClass('snapshot')) {
            player.toggleSnapshotOverlay();
          } else if (element.hasClass('comments')) {
            if (player.src !== null) {
              modals.addComments(function (comment) {
                if (comment !== null) {
                  var pos = player.src.position;
                  $(player).trigger('update', { update: 'addcomment', term: comment, seg: player.src,
                    callback: function (success) { if (success) { player.timeline.addLogMarker({ comment: comment, time: pos }); } }
                  });
                }
              });
            }
          } else if (element.hasClass('metadata')) {
            if (player.src !== null) {
              metadataView.show([player.src.clip]);
            }
          } else if (element.hasClass('split')) {
            $(player).trigger('update', { update: 'split' });
          }
        }

        if (!$(evt.target).hasClass('optionsSideBar')) {
          $('.row-offcanvas.options').removeClass('active');
          evt.stopPropagation();
          evt.preventDefault();
        }
      };
    },
    interval = 0.1,
    scrubLoop = function () {
      var newTime = this.src.position + (interval * this.speed);
      //notify.log("Rewinding to " + newTime.toString());
      //this.player.currentTime = newTime;

      if (newTime < 0) {
        this.src.position = 0;
        this.pause();
      } else if (newTime > this.src.clip.duration) {
        this.src.position = this.src.clip.duration;
        this.pause();
      } else {
        this.src.position = newTime;
        this.playerStillsOverlayTimecode.text(helper.secondsToTimecode(this.src.position, this.src.clip.zone.site.fps));
        this.playerStillsOverlayImg.queueFrame(this.src.clip.imgUri(helper.secondsToFrames(
          this.src.position,
          this.src.clip.zone.site.fps,
          this.src.clip.zone.site.flag1001
        ).toFixed(0), 'jpg', scrubSize));
        this.timeline.redraw(this.src);
      }
    },
    scrubSize = '360',
    playLoop = function () {
      if (this.playing) {
        if (!this.checkBuffer) {
          this.src.position = this.player.currentTime;
          if (this.src.position >= this.src.clip.duration) {
            this.src.position = this.src.clip.duration;
            this.pause();
          } else {
            if (this.player.preQ) {
              this.player.preQ();
            }
          }
        }
      }
      this.timeline.redraw(this.src);
    };

    /**
    * Represents a Player
    * @constructor
    */
    function PlayerView(type) { // MWMWMW Maybe should do type through inheritence
      this.playing = false;
      this.src = null;
      this.SpeedId = null;
      this.playloopid = null;
      this.highwaterLoopId = null;

      var optionsBar = $('<div class="qtoolbar">', {}),
      optionsBarTitle = $('<div class="qcenter qtitle">Player</div>'),
      optionsBarLeft = $(optionsTemplate),
      optionsBarRight = $('<div class="qtoolbar-fixed navbar-right">', {}),
      globalOptionsSidebar = null,
      player = this,
      optionsButton = $(widgets.optionsTemplate),
      timelineParent = $('<div>'),
      controlsBar = $('<div>'),
      metadataView = metadataview.create(),
      loadingBox = $('<div class="loader player-loader qplayer-overlay hide">', {});

      if (typeof this.autoSetHeight != "function") {
        PlayerView.prototype.autoSetHeight = function (extrasHeight) {
          if (($.fullscreen === undefined) || !$.fullscreen.isFullScreen()) {
            var height = this.player.height(),
            overlayWidth = height * 16 / 9,
            overlayLeft = (this.player.width() - overlayWidth) / 2;
            //console.log('setting player height to: ' + height + '. overlayWidth: ' + overlayWidth + '. overlayLeft: ' + overlayLeft);
            $(this.playerOverlay).css({ 'height': height, 'width': overlayWidth.toString() + 'px', 'left': overlayLeft.toString() + 'px' });
            $(this.playerStillsOverlay).css({ 'height': height, 'width': overlayWidth.toString() + 'px', 'left': overlayLeft.toString() + 'px' });
            $(this.playerSnapshotOverlay).css({ 'height': height, 'width': overlayWidth.toString() + 'px', 'left': overlayLeft.toString() + 'px' });
          }
          return null;
        };
      }

      this.togglePlayerOverlay = function () {
        if (this.playerOverlay.css('opacity') == '0') {
          this.playerOverlay.fadeTo('slow', 0.7);
          $('.icon-toggle-overlay', optionsBarLeft).addClass('toggle-on');
          if (storage !== null) {
            storage.store(storage.keys.OVERLAY, '1');
          }
        } else {
          this.playerOverlay.fadeTo('slow', 0.0);
          $('.icon-toggle-overlay', optionsBarLeft).removeClass('toggle-on');
          if (storage !== null) {
            storage.store(storage.keys.OVERLAY, '0');
          }
        }
      };

      this.toggleSnapshotOverlay = function () {
        if ($(this.playerSnapshotOverlay).is(':visible')) {
          //$(this.playerStillsOverlay).addClass('hide');
          $(this.playerSnapshotOverlay).addClass('hide');
          $(this.playerOverlay).removeClass('hide');
          $('.icon-snapshot', optionsBarLeft).removeClass('toggle-on');
        } else if (this.src !== null) {
          this.pause();
          $(this.playerOverlay).addClass('hide');
          $(this.playerStillsOverlay).removeClass('hide');
          this.playerStillsOverlayTimecode.text(helper.secondsToTimecode(this.src.position, this.src.clip.zone.site.fps));
          this.playerStillsOverlayImg.queueFrame(this.src.clip.imgUri(helper.secondsToFrames(
                  this.src.position,
                  this.src.clip.zone.site.fps,
                  this.src.clip.zone.site.flag1001
                ).toFixed(0), 'jpg', scrubSize));

          $(this.playerSnapshotOverlay).removeClass('hide');
          $('.icon-snapshot', optionsBarLeft).addClass('toggle-on');
        }
      };

      // Options
      if (helper.mobile) {
        globalOptionsSidebar = $(widgets.optionsSideBar.replace('{{contents}}', globalOptions).replace('{{title}}', 'Window Options'));
        optionsBar.append(globalOptionsSidebar);
      }
      optionsBarRight.append(optionsButton);
      optionsBar.append(optionsBarLeft);
      optionsBar.append(optionsBarRight);
      optionsBar.append($('<div class="hor-center">').append(optionsBarTitle));

      // Player
      // Always first try to create an mse player, but not all browsers support mse
      // If not fallback to the chosen type
      this.player = msePlayer.create();
      if (this.player === null) {
        if (type === 0) {
          this.player = html5Player.create();
        } else if (type == 1) {
          this.player = silverlightPlayer.create(helper.guid());
          $(this.player).on('qSLLoaded', function () {
            $(this).trigger('SLLoaded');
          } .bind(this));
        } else if (type == 2) {
          this.player = stillsPlayer.create();
        }
      }

      // Hide the loading circle 
      this.player.onload = function () {
        this.setLoading(false);
        if (this.playing) {
          notify.log('playing');
          this.player.play();
          $(this.playerStillsOverlay).addClass('hide');
          $(this.playerOverlay).removeClass('hide');
          $(this.playerSnapshotOverlay).addClass('hide');
        }
      } .bind(this);

      // Display error to user
      this.player.onerror = function (msg) {
        loadingBox.addClass('hide');
        notify.error('Playback failed!', msg);
      };

      // Stills overlay is used to overlay a still image on top of the player
      // This is used when shuttling or stepping through frames
      this.playerStillsOverlay = $('<div>', { 'class': 'qplayer-stills-overlay' });
      this.playerStillsOverlay.addClass('hide');
      this.playerStillsOverlayImg = imgLoader.create(3);
      this.playerStillsOverlayTimecode = $('<div>', {
        'class': 'time'
      }).css({
        'right': '0%',
        'bottom': '10%',
        'background': '#000',
        'z-index': '2' // Needs to be in front of the previewImg
      });
      this.playerStillsOverlay.append(this.playerStillsOverlayTimecode);

      // Player overlay is used to overlay player hotspots on top of the player
      this.playerOverlay = $('<div>', { 'class': 'qplayer-overlay' });

      // Snapshot overlay is used to overlay the snapshot controls on top of the player
      this.playerSnapshotOverlay = $('<div>', { 'class': 'qplayer-overlay qplayer-snapshot-overlay' });
      this.playerSnapshotOverlay.addClass('hide');

      // Playback controls
      this.controls = playercontrols.create();
      $(this.controls).off().on('update', function (evt, props) {
        if (props.update == 'play') {
          this.play();
        } else if (props.update == 'pause') {
          this.pause();
        } else if (props.update == 'in') {
          this.setIn();
        } else if (props.update == 'out') {
          this.setOut();
        } else if (props.update == 'add') {
          if (this.src !== null) {
            $(this).trigger('update', { update: 'add', seg: this.src.copy() });
          }
        } else if (props.update == 'rew') {
          this.rew();
        } else if (props.update == 'ff') {
          this.ff();
        } else if (props.update == 'fullscreen') {
          $(this).trigger('update', { update: 'fullscreen' });
        } else if (props.update == 'volume') {
          this.player.volume = props.val;
          storage.store(storage.keys.VOLUME, props.val);
        }
      } .bind(this));

      // Timeline
      this.timeline = timelineView.create();
      $(this.timeline).off().on('update', function (evt, props) {
        if (props.update == 'scrub') {
          notify.log('scrub: ' + props.pos);
          this.pause();
          this.src.position = props.pos;

          // When scrubbing the stills overlay is displayed and updated. The players currentTime is not updated in order to save Transformer resources
          this.playerStillsOverlay.removeClass('hide');
          this.playerStillsOverlayTimecode.text(helper.secondsToTimecode(this.src.position, this.src.clip.zone.site.fps));
          this.playerStillsOverlayImg.queueFrame(this.src.clip.imgUri(helper.secondsToFrames(
                  this.src.position,
                  this.src.clip.zone.site.fps,
                  this.src.clip.zone.site.flag1001
                ).toFixed(0), 'jpg', scrubSize));

          this.timeline.redraw(this.src);
//        } else if (props.update == 'scrubend') {
//          //if (helper.mobile()) {
//          // When scrubbing completes we update the players currentTime
//          this.player.currentTime = this.src.position;
//          //}
        }
        //window.alert('t update: ' + props.update);
      } .bind(this));

      this.draw = function (parent) {
        var container = $(playerTemplate),
        newHeight = null,
        extrasHeight = null,
        widthRight = null,
        widthLeft = null;

        metadataView.draw(parent);
        container.append(this.playerOverlay);
        container.append(this.playerStillsOverlay);
        container.append(this.playerSnapshotOverlay);
        container.append(loadingBox);
        this.player.draw(container);
        $(timelineParent).empty();
        $(controlsBar).empty();
        controlsBar.append(timelineParent);
        //container.append(controlsBar);

        this.timeline.draw(timelineParent, false);
        this.playerStillsOverlayImg.draw(this.playerStillsOverlay, 'qimage');

        parent.append(optionsBar);
        parent.append(container);
        parent.append(controlsBar);
        this.controls.draw(controlsBar);

        newHeight = storage.fetch(storage.keys.VOLUME);
        if (newHeight !== undefined) {
          this.player.volume = newHeight;
          this.controls.setVolume(newHeight);
        }

        widthRight = optionsBarRight.outerWidth();
        widthLeft = optionsBarLeft.is(':visible') ? optionsBarLeft.outerWidth() : 0;

        // This is to counter act the css for 'text-align:center' aligning optionsBarTitle to the center between optionsBarRight and left 
        // and not the center of the parent div
        if (widthRight > widthLeft) {
          optionsBarTitle.css({ 'margin-left': widthRight - widthLeft, 'margin-right': 0, 'max-width': $(parent).width() - (widthRight * 2) - 40 });
        } else {
          optionsBarTitle.css({ 'margin-right': widthLeft - widthRight, 'margin-left': 0, 'max-width': $(parent).width() - (widthLeft * 2) - 40 });
        }

        // Handle clicking on the player title box
        optionsBarTitle.off().on('click', function () {
          $(this).toggleClass('off');
        });

        // Handle the players option box
        if (helper.mobile) {
          $('.download', optionsBarLeft).addClass('hide');
          optionsButton.on('touchstart', function () {
            $('.row-offcanvas.options', globalOptionsSidebar).addClass('active');
          });

          $('.row-offcanvas.options', globalOptionsSidebar).off().on('touchstart', makeGlobalOptionsListener(player, metadataView));

          $('.close-options').on('touchend', function () {
            $('.row-offcanvas.options').removeClass('active');
          });
        } else {
          optionsButton.popover({
            placement: 'left',
            content: globalOptions,
            html: true,
            trigger: helper.popoverTrigger()
          }).on('shown.bs.popover', function () {
            player.pause();

            // Add one click listener for the popover then query target class to work out what action to do
            $(this).next('.popover').off().on('click', makeGlobalOptionsListener(player, metadataView));
          }).on('click', function (evt) {
            if ($(optionsButton).next('.popover:visible').length === 0) {
              $(optionsButton).popover('show');
              evt.stopPropagation();
            }
          });

          container.draggable({
            //cursor: "move",
            distance: 5,
            scroll: true,
            helper: function (e) {
              var offsetX = e.pageX - container.offset().left,
              offsetY = e.pageY - container.offset().top;
              return $('<div class="sortable-div"><img class="dragging-thumb"></div>').css({
                width: (80 + offsetX).toString() + 'px',
                'padding-left': offsetX.toString() + 'px',
                'padding-top': offsetY.toString() + 'px',
                'z-index': '1020'
              });
            },
            start: function (event, ui) {
              var item = player.src, dragged = ui.helper;
              if (item !== null) {
                imgCache.load($('.dragging-thumb'), item.clip.imgUri(helper.secondsToFrames(
                  item.intime,
                  item.clip.zone.site.fps,
                  item.clip.zone.site.flag1001
                ).toFixed(0)));
                clipboard.set([item.copy()]);
                $(window).on('mouseup', function () {
                  $(window).off('mouseup');
                  $(window).off('mousemove');
                  $('.ui-droppable:visible').each(function () { $(this).removeClass('hover'); });
                });
                $(window).on('mousemove', function (evt) {
                  var droppableItems = $('.ui-droppable:visible'), droppableItem = null, pos = null, width = null, height = null;
                  droppableItems.each(function () { $(this).removeClass('hover'); });
                  for (var i = 0; i < droppableItems.length; i++) {
                    droppableItem = droppableItems[i];
                    pos = $(droppableItem).offset();
                    width = $(droppableItem).outerWidth();
                    height = $(droppableItem).outerHeight();
                    if (evt.pageX >= pos.left && evt.pageX <= pos.left + width && evt.pageY >= pos.top && evt.pageY <= pos.top + height) {
                      //notify.log('got intersecting item');
                      dragged.removeClass('nodrop');
                      $(droppableItem).addClass('hover');
                      return;
                    }
                  }

                  dragged.addClass('nodrop');
                  //notify.log('not got intersecting item: ' + temp.length);
                });
              } else {
                return false;
              }
            },
            stop: function () {
              clipboard.set(null);
              $(window).off('mouseup');
              $(window).off('mousemove');
            }
          });

          // User can drop items onto the player in order to play them
          container.droppable({
            hoverClass: "item-accept",
            tolerance: 'pointer',
            drop: function (/*evt, ui*/) {
              $(this).trigger('update', { update: 'drop', obj: clipboard.get() });
            } .bind(this)
          });
        }

        // Resize the player when the user resizes the window to ensure player is fullscreen
        //extrasHeight = $('.qnavbar').outerHeight(true) + parent.height() - newHeight + 20;
        $(window).on('resize', function () {
          this.autoSetHeight();
        } .bind(this));

        // Set player height
        newHeight = this.autoSetHeight(optionsBar.outerHeight(true) + controlsBar.outerHeight(true) + $('.qnavbar').outerHeight(true) + 20);

        // Options bar handling
        $(optionsBarLeft, parent).on('click', function (evt) {
          var element = null;
          if ((evt.target.nodeName == 'BUTTON') || (evt.target.nodeName == 'LI')) {
            element = $(evt.target);
          } else if ((evt.target.parentElement.nodeName == 'BUTTON') || (evt.target.parentElement.nodeName == 'LI')) {
            element = $(evt.target.parentElement);
          }

          if (element !== null && element.prop('disabled') !== true) {
            if (element.hasClass('download')) {
              if (this.src !== null) {
                $(this).trigger('update', { update: 'downloadseg', seg: this.src.copy(), format: 'mxf' });
              }
            } else if (element.hasClass('overlay')) {
              this.togglePlayerOverlay();
            } else if (element.hasClass('snapshot')) {
              this.toggleSnapshotOverlay();
            } else if (element.hasClass('comments')) {
              if (this.src !== null) {
                this.pause();
                modals.addComments(function (comment) {
                  if (comment !== null) {
                    var pos = player.src.position;
                    $(this).trigger('update', { update: 'addcomment', term: comment, seg: this.src,
                      callback: function (success) { if (success) { player.timeline.addLogMarker({ comment: comment, time: pos }); } }
                    });
                  }
                } .bind(this));
              }
            } else if (element.hasClass('back')) {
              navigation.back();
            }
          }
        } .bind(this));

        // Draw player controls overlay and click handling
        this.playerOverlay.off().empty();
        this.playerOverlay.append($('<div>', { 'class': 'qplayer-overlay-item' }).html('<p><span class="newicon icon-mark-in hotspot-icon" data-toggle="tooltip" data-placement="bottom" title="Mark in point"></span></br>Mark In</p>').on('click', function () {
          this.setIn();
        } .bind(this)));
        this.playerOverlay.append($('<div>', { 'class': 'qplayer-overlay-item' }).html('<p><span class="newicon icon-mark-out hotspot-icon" data-toggle="tooltip" data-placement="bottom" title="Mark out point"></span></br>Mark Out</p>').css({ left: "33.5%" }).on('click', function () {
          this.setOut();
        } .bind(this)));
        this.playerOverlay.append($('<div>', { 'class': 'qplayer-overlay-item' }).html('<p><span class="newicon icon-add-to-bin hotspot-icon" data-toggle="tooltip" data-placement="bottom" title="Mark out point"></span></br>Add to Bin</p>').css({ left: "67.5%" }).on('click', function () {
          if (this.src !== null) {
            $(this).trigger('update', { update: 'add', seg: this.src.copy() });
          }
        } .bind(this)));
        this.playerOverlay.append($('<div>', { 'class': 'qplayer-overlay-circle-outer' }).html($('<div>', { 'class': 'qplayer-overlay-circle-inner' }))
        .on('click', function () {
          this.togglePlay();
        } .bind(this)));
        if (storage !== null && storage.fetch(storage.keys.OVERLAY) == '1') {
          this.playerOverlay.css('opacity', '0.7');
          $('.icon-toggle-overlay', optionsBarLeft).addClass('toggle-on');
        } else {
          this.playerOverlay.css('opacity', '0.0');
          $('.icon-toggle-overlay', parent).removeClass('toggle-on');
        }

        // Draw snapshot overlay and click handling
        this.playerSnapshotOverlay.off().empty();
        this.playerSnapshotOverlay.append($('<div>', { 'class': 'qplayer-snapshot-overlay-item' }).css({ top: "45%" })
        .html('<p><span class="newicon icon-page-left" data-toggle="tooltip" data-placement="bottom" title="Previous"></span></p>')
          .on('click', function (evt) {
            evt.preventDefault();
            this.setPosition(this.src.position - this.src.clip.zone.site.oneFrame());
            this.playerStillsOverlayTimecode.text(helper.secondsToTimecode(this.src.position, this.src.clip.zone.site.fps));
            this.playerStillsOverlayImg.queueFrame(this.src.clip.imgUri(helper.secondsToFrames(
                    this.src.position,
                    this.src.clip.zone.site.fps,
                    this.src.clip.zone.site.flag1001
                  ).toFixed(0), 'jpg', scrubSize));
          } .bind(this)));
        this.playerSnapshotOverlay.append($('<div>', { 'class': 'qplayer-snapshot-overlay-item' }).css({ top: "45%", right: "20px" })
        .html('<p><span class="newicon icon-page-right" data-toggle="tooltip" data-placement="bottom" title="Next"></span></p>')
        .on('click', function (evt) {
          evt.preventDefault();
          this.setPosition(this.src.position + this.src.clip.zone.site.oneFrame());
          this.playerStillsOverlayTimecode.text(helper.secondsToTimecode(this.src.position, this.src.clip.zone.site.fps));
          this.playerStillsOverlayImg.queueFrame(this.src.clip.imgUri(helper.secondsToFrames(
                  this.src.position,
                  this.src.clip.zone.site.fps,
                  this.src.clip.zone.site.flag1001
                ).toFixed(0), 'jpg', scrubSize));
        } .bind(this)));
        this.playerSnapshotOverlay.append($('<div>', { 'class': 'qplayer-snapshot-overlay-item' }).css({ bottom: "20px", right: "20px" })
        .html('<p><span class="newicon icon-download" data-toggle="tooltip" data-placement="bottom" title="Download still"></span></p>')
        .on('click', function (evt) {
          evt.preventDefault();
          $(player).trigger('update', { update: 'snapshot', seg: player.src.copy() });
        } .bind(this)));
      };

      this.remove = function () {
        notify.log('removing player');
        clearInterval(this.SpeedId);
        clearInterval(this.playloopid);
        clearInterval(this.highwaterLoopId);
        this.SpeedId = null;
        this.playloopid = null;
        this.highwaterLoopId = null;
      };

      this.setSource = function (clip) {
        if ((clip !== null) && (clip != this.src) && ((this.src === null) || (clip != this.src.clip))) {
          if (clip.length > 0) {
            clip = clip[0];
          }
          loadingBox.removeClass('hide');
          this.timeline.clear();
          this.playerStillsOverlayImg.clear();

          this.src = segment.create(clip);
          this.player.src = this.src.clip;
          this.player.currentTime = this.src.intime === null ? 0 : this.src.intime;
          if (this.src.intime !== null) {
            this.src.position = this.src.intime;
          } else {
            this.src.position = 0;
          }
          $(optionsBarTitle).html(this.src.clip.properties.title);
          $(optionsBarTitle).tooltip({ title: this.src.clip.properties.title });
          notify.log('playing clip: ' + this.src.clip.id + ' at ' + this.src.intime);

          this.src.clip.loadProperties();

          // Load comments
          var timeline = this.timeline;
          this.timeline.redraw(this.src);
          $.ajax({
            type: 'GET',
            url: this.src.clip.logsUri(),
            dataType: 'xml',
            timeout: 8000,
            beforeSend: this.src.clip.zone.site.beforeSend,
            success: function (xml) {
              $(xml).find('log').each(function () {
                if ($(this).attr('type') == "4") {
                  var comment = $(this).attr('contents'), time = $(this).attr('t');
                  timeline.addLogMarker({ comment: comment, time: parseInt(time, 10) / 10000000 });
                }
              });
            },
            error: function (xhr) {
              notify.log('Error fetching comment: ' + xhr.status + ' - ' + xhr.statusText);
            }
          });

          // Check and update highwater if clip is live
          if (this.highwaterLoopId !== null) {
            clearInterval(this.highwaterLoopId);
            this.highwaterLoopId = null;
          }
          this.highwaterLoopId = setInterval(function () {
            this.src.clip.fetchHighwaterMark(function (highwater) {
              if (highwater === null) {
                clearInterval(this.highwaterLoopId);
                this.highwaterId = null;
              }
              //notify.log('got hwm: ' + highwater);
              this.src.clip.highwaterMark = highwater;
            } .bind(this));
          } .bind(this), 2000);

          // Update from current player time
          if (this.playloopid !== null) {
            clearInterval(this.playloopid);
            this.playloopid = null;
          }
          this.playloopid = setInterval(playLoop.bind(this), 40);
        } else {
          clearInterval(this.playloopid);
          clearInterval(this.highwaterLoopId);
          this.playloopid = null;
          this.highwaterLoopId = null;
        }
      };

      this.setLoading = function (loading) {
        if (loading === true) {
          loadingBox.removeClass('hide');
        } else {
          loadingBox.addClass('hide');
        }
        this.checkBuffer = loading;
      };

      if (typeof this.togglePlay != "function") {
        PlayerView.prototype.togglePlay = function () {
          if (this.playing) {
            this.pause();
          } else {
            this.play();
          }
        };
      }

      if (typeof this.play != "function") {
        PlayerView.prototype.play = function () {
          if (this.src !== null) {
            if (this.SpeedId !== null) {
              clearInterval(this.SpeedId);
              this.player.currentTime = this.src.position;
              this.SpeedId = null;
            }
            this.player.currentTime = this.src.position;

            if (this.player.isBuffered(this.src.position)) {
              $(this.playerStillsOverlay).addClass('hide');

              $(this.playerOverlay).removeClass('hide');
              $(this.playerSnapshotOverlay).addClass('hide');
              this.player.play();
            } else {
              this.setLoading(true);
              if (this.player.preQ) {
                this.player.preQ();
              }
            }
            this.controls.play();
            this.playing = true;
          }
        };
      }

      if (typeof this.pause != "function") {
        PlayerView.prototype.pause = function () {
          if (this.SpeedId !== null) {
            clearInterval(this.SpeedId);
            this.player.currentTime = this.src.position;
            this.SpeedId = null;
          }
          if (this.player.pause !== undefined) {
            this.player.pause();
          }
          this.controls.pause();
          this.playing = false;
        };
      }

      if (typeof this.setPosition != "function") {
        PlayerView.prototype.setPosition = function (time) {
          if (this.src !== null) {
            this.player.currentTime = time;
            this.src.position = time;
            this.timeline.redraw(this.src);
          }
        };
      }

      if (typeof this.setIn != "function") {
        PlayerView.prototype.setIn = function () {
          if (this.src !== null) {
            if (this.src.intime == this.src.position) {
              this.src.intime = null;
            } else {
              this.src.intime = this.src.position;
              if (this.src.intime > this.src.outtime) {
                this.src.outtime = null;
              }
            }
            this.timeline.redraw(this.src);
            this.controls.redraw(this.src);
          }
        };
      }

      if (typeof this.clearIn != "function") {
        PlayerView.prototype.clearIn = function () {
          this.src.intime = null;
          this.timeline.redraw(this.src);
          this.controls.redraw(this.src);
        };
      }

      if (typeof this.setOut != "function") {
        PlayerView.prototype.setOut = function () {
          if (this.src !== null) {
            if (this.src.outtime == this.src.position) {
              this.src.outtime = null;
            } else {
              this.src.outtime = this.src.position;
              if (this.src.intime > this.src.outtime) {
                this.src.intime = null;
              }
            }
            this.timeline.redraw(this.src);
            this.controls.redraw(this.src);
          }
        };
      }

      if (typeof this.clearOut != "function") {
        PlayerView.prototype.clearOut = function () {
          this.src.outtime = null;
          this.timeline.redraw(this.src);
          this.controls.redraw(this.src);
        };
      }

      if (typeof this.rew != "function") {
        PlayerView.prototype.rew = function () {
          if (this.src !== null) {
            notify.log("Rewinding");
            if (this.SpeedId === null) {
              this.pause();
              this.controls.rew();
              this.playerStillsOverlay.removeClass('hide');
              this.speed = -2;
              this.SpeedId = setInterval(scrubLoop.bind(this), interval * 1000);
            } else if (this.speed > 1) {
              this.speed = this.speed / 2;
            } else if (this.speed < 0) {
              this.speed = this.speed * 2;
            } else {
              this.speed = -1;
              this.controls.rew();
            }
          }
        };
      }

      if (typeof this.ff != "function") {
        PlayerView.prototype.ff = function () {
          if (this.src !== null) {
            if (this.SpeedId === null) {
              notify.log("Fast forwarding");
              this.pause();
              this.controls.ff();
              this.playerStillsOverlay.removeClass('hide');
              this.speed = 2;
              this.SpeedId = setInterval(scrubLoop.bind(this), interval * 1000);
            } else if (this.speed < -1) {
              this.speed = this.speed / 2;
            } else if (this.speed > 0) {
              this.speed = this.speed * 2;
            } else {
              this.speed = 1;
              this.controls.ff();
            }
          }
        };
      }

      this.setHeight = function (height) {
        this.player.setHeight(height);

        // Bit of a bodge to get around updating the dom taking time.
        // We first set the max-height of the player in the line above
        // The player could have a smaller height than this if the width of the screen is smaller
        // We then want to set the size and offset of the player overlays (stills, and hotspots) dependent on the actual height of the player, in the line below.
        setTimeout(function () {
          this.autoSetHeight();
        } .bind(this), 1000);
      };

      if (typeof this.handleSelectAll != "function") {
        PlayerView.prototype.handleSelectAll = function () {
          notify.error('Not Allowed!', 'Cannot select all in player'); // MWMWMW Should just grey out (or not show) the paste image 
        };
      }

      if (typeof this.handleCopy != "function") {
        PlayerView.prototype.handleCopy = function () {
          clipboard.set(this.src);
          notify.info('Item copied', '');
        };
      }

      if (typeof this.handlePaste != "function") {
        PlayerView.prototype.handlePaste = function () {
          var item = clipboard.get();
          if (item.length !== undefined && item.length > 0) {
            item = item[0];
          }
          this.setSource(item);
        };
      }

      if (typeof this.handleDelete != "function") {
        PlayerView.prototype.handleDelete = function () {
          notify.error('Not Allowed!', 'Cannot delete from player');
        };
      }

      this.fullscreenFull = function () {
        var controlsHeight = controlsBar.outerHeight(),
        height = 'calc(100% - ' + controlsHeight + 'px)';
        optionsBar.addClass('hide');
        controlsBar.css({ 'bottom': controlsHeight + 'px', 'position': 'relative' });
        $('.icon-full-screen', controlsBar).addClass('icon-exit-full-screen');
        $('.icon-full-screen', controlsBar).removeClass('icon-full-screen');
        this.player.setHeight(height);
        $(this.playerOverlay).css({ 'height': height, 'width': '100%', 'left': '0px', 'bottom': controlsHeight + 'px' });
        $(this.playerStillsOverlay).css({ 'height': height, 'width': '100%', 'left': '0px' });
        $(this.playerSnapshotOverlay).addClass('hide');
      };
      this.fullscreenHide = function () {
        clearTimeout(this.fsTimeout);
        $(document).off('touchmove touchstart');
        $(document).off('mousemove');
        controlsBar.removeClass('hide');
        optionsBar.removeClass('hide');
        controlsBar.css({ 'bottom': '0px', 'position': 'inherit' });
        $(this.playerOverlay).css({ 'bottom': '0px' });
        $(this.playerStillsOverlay).css({ 'bottom': '0px' });
        $('.icon-exit-full-screen', controlsBar).addClass('icon-full-screen');
        $('.icon-exit-full-screen', controlsBar).removeClass('icon-exit-full-screen');
      };

      if (typeof this.handleKeyDown != "function") {
        PlayerView.prototype.handleKeyDown = function (evt) {
          var preventDefault = false, times = null, nextTime = null;
          if (evt.keyCode == 32) { //space
            this.togglePlay();
            preventDefault = true;
          } else if ((evt.keyCode == 73) || (evt.keyCode == 69)) { //i
            this.setIn();
          } else if ((evt.keyCode == 79) || (evt.keyCode == 82)) { //o
            this.setOut();
          } else if (evt.keyCode == 13) { //Return
            if (this.src !== null) {
              if (this.playerSnapshotOverlay.is(':visible')) {
                $(this).trigger('update', { update: 'snapshot', seg: player.src.copy() });
              } else {
                $(this).trigger('update', { update: 'add', seg: this.src.copy() });
              }
            }
            preventDefault = true;
          } else if (evt.keyCode == 74) { //j
            this.rew();
          } else if (evt.keyCode == 75) { //k
            this.pause();
          } else if (evt.keyCode == 76) { //l
            this.ff();
          } else if (evt.keyCode == 81) { //q
            this.setPosition(this.src.intime);
          } else if (evt.keyCode == 87) { //w
            this.setPosition(this.src.outtime);
          } else if (evt.keyCode == 68) { //d
            this.src.intime = null;
            this.timeline.redraw(this.src);
          } else if (evt.keyCode == 70) { //f
            this.src.outtime = null;
            this.timeline.redraw(this.src);
          } else if (evt.keyCode == 71) { //g
            if (this.src !== null) {
              this.src.intime = null;
              this.src.outtime = null;
              this.timeline.redraw(this.src);
            }
          } else if (evt.keyCode == 37) { // left
            this.setPosition(this.src.position - this.src.clip.zone.site.oneFrame());
            $(this.playerStillsOverlay).removeClass('hide');
            this.playerStillsOverlayTimecode.text(helper.secondsToTimecode(this.src.position, this.src.clip.zone.site.fps));
            this.playerStillsOverlayImg.queueFrame(this.src.clip.imgUri(helper.secondsToFrames(
                  this.src.position,
                  this.src.clip.zone.site.fps,
                  this.src.clip.zone.site.flag1001
                ).toFixed(0), 'jpg', scrubSize));
          } else if (evt.keyCode == 39) { // right
            this.setPosition(this.src.position + this.src.clip.zone.site.oneFrame());
            $(this.playerStillsOverlay).removeClass('hide');
            this.playerStillsOverlayTimecode.text(helper.secondsToTimecode(this.src.position, this.src.clip.zone.site.fps));
            this.playerStillsOverlayImg.queueFrame(this.src.clip.imgUri(helper.secondsToFrames(
                  this.src.position,
                  this.src.clip.zone.site.fps,
                  this.src.clip.zone.site.flag1001
                ).toFixed(0), 'jpg', scrubSize));
          } else if (evt.keyCode == 35) { //end
            if (this.src.clip.highwaterMark !== null) {
              this.setPosition(this.src.clip.highwaterMark - 100 /*PreQ*/);
              $(this.playerStillsOverlay).removeClass('hide');
              this.playerStillsOverlayTimecode.text(helper.secondsToTimecode(this.src.position, this.src.clip.zone.site.fps));
              this.playerStillsOverlayImg.queueFrame(this.src.clip.imgUri(helper.secondsToFrames(
                  this.src.position,
                  this.src.clip.zone.site.fps,
                  this.src.clip.zone.site.flag1001
                ).toFixed(0), 'jpg', scrubSize));
            } else {
              this.setPosition(this.src.clip.duration);
              $(this.playerStillsOverlay).removeClass('hide');
              this.playerStillsOverlayTimecode.text(helper.secondsToTimecode(this.src.position, this.src.clip.zone.site.fps));
              this.playerStillsOverlayImg.queueFrame(this.src.clip.imgUri(helper.secondsToFrames(
                  this.src.position,
                  this.src.clip.zone.site.fps,
                  this.src.clip.zone.site.flag1001
                ).toFixed(0), 'jpg', scrubSize));
            }
            preventDefault = true;
          } else if (evt.keyCode == 36) { //home
            this.setPosition(0);
          } else if (evt.keyCode == 38) { // up
            times = [0, this.src.position, this.src.intime, this.src.outtime, this.src.clip.duration];
            times.sort(function (a, b) { return a - b; });
            nextTime = times.indexOf(this.src.position);
            if (nextTime > 0) {
              nextTime--;
              this.setPosition(times[nextTime]);
              $(this.playerStillsOverlay).removeClass('hide');
              this.playerStillsOverlayTimecode.text(helper.secondsToTimecode(this.src.position, this.src.clip.zone.site.fps));
              this.playerStillsOverlayImg.queueFrame(this.src.clip.imgUri(helper.secondsToFrames(
                  this.src.position,
                  this.src.clip.zone.site.fps,
                  this.src.clip.zone.site.flag1001
                ).toFixed(0), 'jpg', scrubSize));
              preventDefault = true;
            }
          } else if (evt.keyCode == 40) { // down
            times = [0, this.src.position, this.src.intime, this.src.outtime, this.src.clip.duration - this.src.clip.zone.site.oneFrame()];
            times.sort(function (a, b) { return a - b; });
            nextTime = times.indexOf(this.src.position);
            if (times.indexOf(this.src.position, nextTime + 1) > -1) {
              nextTime++;
            }
            if (nextTime < times.length) {
              nextTime++;
              this.setPosition(times[nextTime]);
              $(this.playerStillsOverlay).removeClass('hide');
              this.playerStillsOverlayTimecode.text(helper.secondsToTimecode(this.src.position, this.src.clip.zone.site.fps));
              this.playerStillsOverlayImg.queueFrame(this.src.clip.imgUri(helper.secondsToFrames(
                  this.src.position,
                  this.src.clip.zone.site.fps,
                  this.src.clip.zone.site.flag1001
                ).toFixed(0), 'jpg', scrubSize));
              preventDefault = true;
            }
          } else if (evt.keyCode == 77) { // m
            $(this.playerStillsOverlay).removeClass('hide');
            this.playerStillsOverlayTimecode.text(helper.secondsToTimecode(this.src.position, this.src.clip.zone.site.fps));
            this.playerStillsOverlayImg.queueFrame(this.src.clip.imgUri(helper.secondsToFrames(
                  this.src.position,
                  this.src.clip.zone.site.fps,
                  this.src.clip.zone.site.flag1001
                ).toFixed(0), 'jpg', 'full'));
            if (evt.ctrlKey) {
              scrubSize = (scrubSize == 'full') ? '360' : 'full';
            }
            preventDefault = true;
          } else if (evt.keyCode == 65) { // a
            if (evt.ctrlKey) {
              this.handleSelectAll();
              preventDefault = true;
            }
          } else if (evt.keyCode == 67) { // c
            if (evt.ctrlKey) {
              this.handleCopy();
            }
          } else if (evt.keyCode == 86) { // v
            if (evt.ctrlKey) {
              this.handlePaste();
              preventDefault = true;
            }
          }

          if (preventDefault) {
            evt.preventDefault();
            evt.stopPropagation();
          }
        };
      }
    }

    return {
      /** 
      * Creates a new Player view to play clips
      */
      create: function (type) {
        return new PlayerView(type);
      },
      /** 
      * Creates a new Silverlight Player
      */
      createSilverlightPlayer: function () {
        return new PlayerView(1);
      },
      /** 
      * Creates a new HTML5 Player
      */
      createHTML5Player: function () {
        return new PlayerView(0);
      },
      /** 
      * Creates a new Still Player
      */
      createStillsPlayer: function () {
        return new PlayerView(2);
      }
    };
  });