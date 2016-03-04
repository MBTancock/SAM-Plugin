/*global define, console*/
/*jslint browser: true*/
define(["jquery", "views/navbar", "views/transformer", "views/player", "views/bin", "helper",
        "views/modals", "views/notification", "controllers/navigation", "controllers/keyboard", "views/footer", "jquery-fullscreen"],
  function ($, navbar, transformerview, playerview, binview, helper, modals, notify, navigation, keyboard, footer) {
    "use strict";

    /**
    * Represents a Container
    * @constructor
    * @param {string} parent - The parent widget to add the container to
    */
    var ContainerView = function (transformer, binmanager, state, allowRemove, hideMenus) {
      this.container = $('<div class="qcontainer">', {});
      var navBarContainer = $('<div class="qnavbar">', {}),
      contents = $('<div class="qcontents">', {}),
      navBarView = navbar.create(),
      transformerView = transformerview.create(),
      binView = binview.create(),
      playerView = helper.mobile ? playerview.createHTML5Player() : playerview.createSilverlightPlayer(),
      currentHeight = null,
      transformerUpdate = null, i = 0,
      redraw = function () {
        $(contents).empty();
        navBarView.draw(navBarContainer, navbar.generateMenus(state, transformer, binmanager, true, null), allowRemove, hideMenus);

        if (state.name == 'Player') {
          $('.panel-icon', navBarContainer).addClass('icon-player');
          playerView.draw(contents);
          if (state.play !== undefined) {
            playerView.setSource(state.play);
          }
          if (state.autoplay === true) {
            playerView.play();
            state.autoplay = null;
          }
        } else if (state.name == 'Bin') {
          $('.panel-icon', navBarContainer).addClass('icon-bin');
          binView.draw(contents, state.binFullView ? null : currentHeight);
          if (state.bin !== undefined) {
            binmanager.setCurrentBin(state.bin);
            var selbin = binmanager.bins()[state.bin];
            if (selbin !== undefined) {
              binView.redraw(selbin);
            }
          }
        } else if (state.name == 'Areas') {
          $('.panel-icon', navBarContainer).addClass('icon-server');
          transformerView.draw(contents, { transformer: transformer.findTransformer(state.site), area: state.area, searchTerm: '*' }, currentHeight);
        }

        $(this).trigger('update', { update: 'changepanel' });
      } .bind(this);

      /*jslint unparam: true*/
      // Navbar controls
      $(navBarView).on('update', function (evt, props) {
        var i = null, selbin = null, curbin = null, msg = null;
        if (props.update == 'nav') {
          this.setState(props.selected);
        } else if (props.update == 'plusclicked') {
          $(this).trigger('update', { update: 'addpanel' });
        } else if (props.update == 'minusclicked') {
          $(this).trigger('update', { update: 'removepanel' });
        } else if (props.update == 'drop') {
          notify.log('dropped: ' + props.obj);
          if (props.selected.name == 'Player') {
            if (props.obj.length !== undefined) {
              props.selected.play = props.obj[0];
            } else {
              props.selected.play = props.obj;
            }

            this.setState(props.selected);
          } else if (props.selected.name == 'Bin') {
            selbin = binmanager.bins()[props.selected.bin];
            curbin = binmanager.bins()[state.bin];
            if ((selbin !== undefined) && (curbin !== undefined)) {
              if (props.obj.length !== undefined) {
                msg = "Segments Added To " + selbin.title;
              } else {
                msg = "Segment Added To " + selbin.title;
              }
              curbin.remove(props.obj);
              selbin.add(props.obj);
              notify.info("", msg);
            }
          } else {
            notify.error('Not allowed', 'Copy to area not permitted!');
          }
        }
      } .bind(this));

      // Transformer controls
      $(transformerView).on('update', function (evt, props) {
        var url = null, i = null, clip = null, commentsAdded = null, commentsAddedCallback = null, clipsCommented = null, target = null;

        if (props.update == 'addclip') {
          binmanager.currentBin().add(props.clip);
          notify.info("", "Clip Added");
        } else if (props.update == 'downloadclip') {
          for (i = 0; i < props.clips.length; i++) {
            url = props.clips[i].fileUri(props.format) + "/" + props.clips[i].properties.title + "." + props.format;
            notify.log("Downloading: " + props.format);
            window.open(url, '_self');
          }
        } else if (props.update == 'snapshotclips') {
          if (props.clips.length > 0) {
            if (props.clips.length > 1) {
              target = '_blank';
              commentsAdded = 'Snapshots created';
            } else {
              target = helper.mobile ? '_blank' : '_self'; // Load img in a new window for mobile
              commentsAdded = 'Snapshot created';
            }
            for (i = 0; i < props.clips.length; i++) {
              url = props.clips[i].imgUri('0', 'jpg', 'full', true);
              notify.log("Snapshotting Clip: " + props.clips[i].id);
              window.open(url + '/' + props.clips[i].properties.title + '.jpg', target);
            }
            notify.info("", commentsAdded);
          }
        } else if (props.update == 'playclip') {
          $(this).trigger('update', props);
        } else if (props.update == 'addcomment') {
          notify.log('Adding comment: ' + props.term);
          clipsCommented = [];
          commentsAdded = 0;
          commentsAddedCallback = function (success, errorMsg) {
            commentsAdded++;
            if (!success) {
              notify.error("Failed to add comment: ", errorMsg);
            } else if (commentsAdded == clipsCommented.length) {
              if (commentsAdded > 1) {
                notify.info("Comments added", "");
              } else {
                notify.info("Comment added", "");
              }
            }
          };
          if (props.clips !== undefined) {
            for (i = 0; i < props.clips.length; i++) {
              clip = props.clips[i];
              if (clipsCommented.indexOf(clip.id) == -1) {
                clip.addLog(clip.id + ':' + props.term, 0, 1, 4, commentsAddedCallback);
                clipsCommented.push(clip.id);
              }
            }
          }
        } else if (props.update == 'split') {
          $(this).trigger('update', { update: 'splitpanel' });
        }
      } .bind(this));

      // Handles updating the view when the transformers resources have loaded
      transformerUpdate = function (evt, props) {
        var i = 0;
        if (props.update === null) {
          notify.log('no update');
        } else if (props.update == 'areasloaded') {
          navBarView.draw(navBarContainer, navbar.generateMenus(state, transformer, binmanager, true, null), allowRemove, hideMenus);
          if (state.name == 'Player') {
            $('.panel-icon', navBarContainer).addClass('icon-player');
          } else if (state.name == 'Bin') {
            $('.panel-icon', navBarContainer).addClass('icon-bin');
          } else if (state.name == 'Areas') {
            $('.panel-icon', navBarContainer).addClass('icon-server');
          }

          if (state.name == 'Areas') {
            if ((state.area === undefined) || (state.area === null)) {
              state.area = transformer.areas[0].name;
            }
            redraw();
          }
        } else if ((state.name == 'Areas') && (props.update == 'sitesloaded')) {
          redraw();
          for (i = 0; i < transformer.extraSearchSites.length; i++) {
            $(transformer.extraSearchSites[i]).off().on('update', transformerUpdate);
          }
        } else if ((state.name == 'Areas') && (props.update == 'zonesloaded')) {
          redraw();
        }
      };
      $(transformer).on('update', transformerUpdate);
      if (transformer.extraSearchSites !== null) {
        for (i = 0; i < transformer.extraSearchSites.length; i++) {
          $(transformer.extraSearchSites[i]).on('update', transformerUpdate);
        }
      }

      // Player controls
      $(playerView).on('update', function (evt, props) {
        var url = null, frame = null, target = null;
        if (props.update == 'add') {
          if (props.seg.intime === null) {
            props.seg.intime = 0;
          }
          if (props.seg.outtime === null) {
            props.seg.outtime = props.seg.clip.duration;
          }
          binmanager.currentBin().add(props.seg);
          notify.info("", "Segment Added To " + binmanager.currentBin().title);
        } else if (props.update == 'fullscreen') {
          if (!$.fullscreen.isFullScreen()) {
            contents.on('fscreenclose', function () {
              playerView.fullscreenHide();
              contents.off('fscreenclose');
              notify.remove(contents);
              if (currentHeight !== null) {
                var test = parseInt(currentHeight.substring(0, currentHeight.length - 2));
                playerView.setHeight((test + 33) + 'px');
              }
            });
            notify.draw(contents);
            contents.fullscreen();
            playerView.fullscreenFull();
          } else {
            $.fullscreen.exit();
            playerView.fullscreenHide();
            contents.off('fscreenclose');
            notify.remove(contents);
            if (currentHeight !== null) {
              var test = parseInt(currentHeight.substring(0, currentHeight.length - 2));
              playerView.setHeight((test + 33) + 'px');
            }
          }
        } else if (props.update == 'downloadseg') {
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
          frame = helper.secondsToFrames(
                  props.seg.position,
                  props.seg.clip.zone.site.fps,
                  props.seg.clip.zone.site.flag1001
                ).toFixed(0);
          url = props.seg.clip.imgUri(frame, 'jpg', 'full', true);
          target = helper.mobile ? '_blank' : '_self'; // Load img in a new window for mobile
          window.open(url + '/' + props.seg.clip.properties.title + '_' + frame + '.jpg', target);
        } else if (props.update == 'drop') {
          notify.log('dropped: ' + props.obj);
          if (props.obj.length > 0) {
            state.play = props.obj[0];
          } else {
            state.play = props.obj;
          }
          redraw();
        } else if (props.update == 'split') {
          $(this).trigger('update', { update: 'splitpanel' });
        }
      } .bind(this));

      // Bin controls
      $(binmanager).on('update', function () {
        navBarView.draw(navBarContainer, navbar.generateMenus(state, transformer, binmanager, true, null), allowRemove, hideMenus);
        if (state.name == 'Player') {
          $('.panel-icon', navBarContainer).addClass('icon-player');
        } else if (state.name == 'Bin') {
          $('.panel-icon', navBarContainer).addClass('icon-bin');
        } else if (state.name == 'Areas') {
          $('.panel-icon', navBarContainer).addClass('icon-server');
        }
      });

      $(binView).on('update', function (evt, props) {
        var i = 0, curbin = null, url = null, seg = null, frame = null, commentsAdded = null, commentsAddedCallback = null, clipsCommented = null, target = null;

        if (props.update === null) {
          notify.log('bin no update');
        } else if (props.update == 'playseg') {
          notify.log("Playing clip " + props.seg.clip.id);
          $(this).trigger('update', { update: 'playclip', clip: props.seg });
        } else if (props.update == 'downloadseg') {
          url = props.seg.clip.fileUri(props.format,
                      helper.secondsToFrames(
                        props.seg.intime,
                        props.seg.clip.zone.site.fps,
                        props.seg.clip.zone.site.flag1001
                      ).toFixed(0),
                      helper.secondsToFrames(
                        props.seg.outtime,
                        props.seg.clip.zone.site.fps,
                        props.seg.clip.zone.site.flag1001
                      ).toFixed(0)
                    ) + "/" + props.seg.clip.properties.title + "." + props.format;
          notify.log("Downloading: " + props.format);
          window.open(url, '_self');
        } else if (props.update == 'itemsdeleted') {
          curbin = binmanager.bins()[state.bin];
          if (curbin !== undefined) {
            curbin.remove(props.items);
          }
        } else if (props.update == 'itemsadded') {
          curbin = binmanager.bins()[state.bin];
          if (curbin !== undefined) {
            curbin.add(props.items, props.idx);
          }
        } else if (props.update == 'itemmoved') {
          curbin = binmanager.bins()[state.bin];
          if (curbin !== undefined) {
            curbin.move(props.item, props.idx);
          }
        } else if (props.update == 'snapshotsegs') {
          if (props.segs.length > 1) {
            target = '_blank';
            commentsAdded = 'Snapshots created';
          } else {
            target = helper.mobile ? '_blank' : '_self'; // Load img in a new window for mobile
            commentsAdded = 'Snapshot created';
          }
          for (i = 0; i < props.segs.length; i++) {
            seg = props.segs[i];
            frame = helper.secondsToFrames(seg.intime, seg.clip.zone.site.fps, seg.clip.zone.site.flag1001).toFixed(0);
            url = seg.clip.imgUri(frame, 'jpg', 'full', true);
            notify.log("Snapshotting Clip: " + seg.clip.id + ' frame: ' + frame);
            window.open(url + '/' + seg.clip.properties.title + '_' + frame + '.jpg', target);
          }
          if (props.segs.length > 0) {
            notify.info("", commentsAdded);
          }
        } else if (props.update == 'addbin') {
          modals.addBin(function (title) {
            if (title !== null) {
              var newbin = binmanager.createBin(title);
              this.setState({ name: 'Bin', bin: title });
              notify.info("Bin created: ", title);
            }
          } .bind(this));
        } else if (props.update == 'deletebin') {
          // Show confirmation dialog box 
          curbin = state.bin;
          modals.confirm("Delete Bin", "Are you sure you want to delete bin: <span class='bold'>" + curbin + "</span>", function (result) {
            if (result) {
              if (binmanager.removeBin(curbin)) {
                this.setState({ name: 'Bin', bin: helper.DefaultBin });
                notify.info("Bin deleted: ", curbin);
              } else {
                notify.error("Failed to delete bin: ", curbin);
              }
            }
          } .bind(this));
        } else if (props.update == 'publishbin') {
          curbin = binmanager.bins()[state.bin];
          if (curbin !== undefined) {
            modals.publishBin(transformer, curbin.title, function (clip) {
              if (clip !== null) {
                notify.log("Publish started, title: " + clip.title + ", owner: " + clip.owner + ", category: " + clip.category +
                  ", area: " + clip.area + ", transformer: " + clip.transformer);

                curbin.publish(clip, function (success, errorMsg) {
                  if (success) {
                    notify.info("Publish complete!", "");
                  } else {
                    notify.error("Publish failed!", errorMsg);
                  }
                });
              }
            });
          } else {
            notify.log("No bin selected");
          }
        } else if (props.update == 'clearbin') {
          // Show confirmation dialog box 
          curbin = binmanager.bins()[state.bin];
          if (curbin !== undefined) {
            modals.confirm("Clear Bin", "Are you sure you want to clear all segments from bin: <span class='bold'>" + curbin.title + "</span>", function (result) {
              if (result) {
                curbin.clear();
                notify.info("Bin cleared: ", curbin);
              }
            } .bind(this));
          } else {
            notify.log("No bin selected");
          }
        } else if (props.update == 'download') {
          notify.log("downloading bin");
          for (i = 0; i < props.segs.length; i++) {
            seg = props.segs[i];
            url = seg.clip.fileUri(props.format,
                  helper.secondsToFrames(
                    seg.intime,
                    seg.clip.zone.site.fps,
                    seg.clip.zone.site.flag1001
                  ).toFixed(0),
                  helper.secondsToFrames(
                    seg.outtime,
                    seg.clip.zone.site.fps,
                    seg.clip.zone.site.flag1001
                  ).toFixed(0)
                ) + "/" + seg.clip.properties.title + "." + props.format;
            notify.log("Downloading " + props.format);
            window.open(url, '_self');
          }
        } else if (props.update == 'addcomment') {
          notify.log('Adding comment: ' + props.term);
          clipsCommented = [];
          commentsAdded = 0;
          commentsAddedCallback = function (success, errorMsg) {
            commentsAdded++;
            if (!success) {
              notify.error("Failed to add comment: ", errorMsg);
            } else if (commentsAdded == clipsCommented.length) {
              if (commentsAdded > 1) {
                notify.info("Comments added", "");
              } else {
                notify.info("Comment added", "");
              }
            }
          };
          for (i = 0; i < props.segs.length; i++) {
            seg = props.segs[i];
            if (clipsCommented.indexOf(seg.clip.id) == -1) {
              //var inframe = parseInt(helper.secondsToFrames(seg.intime,seg.clip.zone.site.fps,seg.clip.zone.site.flag1001).toFixed(0), 10);
              //props.seg.clip.addLog(props.seg.outtime + ':' + props.term, inframe, inframe + 1, 6, function (success, errorMsg) {
              seg.clip.addLog(seg.clip.id + ':' + props.term, 0, 1, 4, commentsAddedCallback);
              clipsCommented.push(seg.clip.id);
            }
          }
        } else if (props.update == 'viewtoggle') {
          state.binFullView = !state.binFullView;
          redraw();
        } else if (props.update == 'split') {
          $(this).trigger('update', { update: 'splitpanel' });
        }
      } .bind(this));
      /*jslint unparam: false*/


      this.draw = function (parent) {
        $(parent).append(this.container);
        $(this.container).append(navBarContainer);
        $(this.container).append(contents);

        redraw();

        $(this.container).on('click', function (evt) {
          //notify.log('container clicked');
          if (!$(evt.target).hasClass('options') && !$(evt.target).hasClass('icon-options')) {
            $('.options').popover('hide');
          }

          if (helper.mobile) {
            var listener = null;
            if (state.name == 'Player') {
              listener = playerView;
            } else if (state.name == 'Bin') {
              listener = binView;
            } else if (state.name == 'Areas') {
              listener = transformerView;
            }
            footer.focus(listener);
          }
          keyboard.focused(this);
        } .bind(this));
      };

      this.remove = function () {
        playerView.remove();

        $(playerView).off();
        $(binView).off();
        $(transformerView).off();
        $(navBarView).off();
        $(transformerView).off();
        //$(transformer).off(); MWMWMW Need to provide unique ID for these
        //$(binManager).off();
        $(this.container).off();
        $(this.container).remove();
      };

      this.save = function () {
        return JSON.stringify(state);
      };

      this.setState = function (st, dontUpdate) {
        var previousState = state, curScroll = $(document).scrollTop();

        if (previousState.binFullView === undefined) {
          st.binFullView = false;
        } else {
          st.binFullView = previousState.binFullView;
        }
        if (state.name == 'Player') {
          playerView.remove();
        }

        state = st;
        redraw();
        if (dontUpdate !== true) {
          navigation.add(this, previousState, state);
        }

        if (state.name == 'Player') {
          keyboard.focused(this);
          $('html, body').animate({ scrollTop: $(this.container).offset().top + 'px' }, 80);
          // MWMWMW Do we need this for SL players?
          //          $(playerView).off('SLLoaded').on('SLLoaded', function () {
          //            $('html, body').animate({ scrollTop: $(container).offset().top + 'px' }, 0);
          //          } .bind(this));
          //        } else {
          //          $('html, body').animate({ scrollTop: curScroll }, 0);
        }
      };

      this.getState = function () {
        return state;
      };

      this.setHeight = function (height) {
        currentHeight = height + 'px';
        try {
          if (state.name == 'Player') {
            playerView.setHeight((height + 18) + 'px');
          } else if (state.name == 'Bin') {
            redraw();
          } else if (state.name == 'Areas') {
            redraw();
          }
        } catch (err) { }
      };

      this.handleKeyDown = function (evt) {
        try {
          if (state.name == 'Player') {
            playerView.handleKeyDown(evt);
          } else if (state.name == 'Bin') {
            binView.handleKeyDown(evt);
          } else if (state.name == 'Areas') {
            transformerView.handleKeyDown(evt);
          }
        } catch (err) { }
      };

      this.handleKeyUp = function (evt) {
        try {
          if (state.name == 'Player') {
            playerView.handleKeyUp(evt);
          } else if (state.name == 'Bin') {
            binView.handleKeyUp(evt);
          } else if (state.name == 'Areas') {
            transformerView.handleKeyUp(evt);
          }
        } catch (err) { }
      };

      this.handleFocusLost = function () {
        try {
          if (state.name == 'Player') {
            playerView.handleFocusLost();
          } else if (state.name == 'Bin') {
            binView.handleFocusLost();
          } else if (state.name == 'Areas') {
            transformerView.handleFocusLost();
          }
        } catch (err) { }
      };
    };

    return {
      /** 
      * Creates a new ContainerView object 
      */
      create: function (transformer, binmanager, state, allowRemove, hideMenus) {
        return new ContainerView(transformer, binmanager, state, allowRemove, hideMenus);
      }
    };
  });