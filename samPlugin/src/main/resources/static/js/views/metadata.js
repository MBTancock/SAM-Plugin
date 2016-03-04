/*jshint multistr: true */

var metadataTemplate = '<div class="modal fade metadata-modal" role="dialog"><div class="modal-dialog"><div class="modal-content metadata-box">\
        <div class="modal-header">\
          <button type="button" class="close cancel" data-dismiss="modal"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button>\
          <h4 class="modal-title">Metadata</h4>\
        </div>\
        <div class="modal-body">\
        </div>\
        <div class="modal-footer qcontrolsp">\
          <div class="pagination">\
            <ul>\
                <li class="prev disabled"><a href="#"><button class="qicon previousbtnx"><span class="newicon icon-page-left"></span></button></a></li>\
                <li class="next disabled"><a href="#"><button class="qicon nextbtnx"><span class="newicon icon-page-right"></span></button></a></li>\
            </ul>\
          </div>\
        </div>\
  </div></div></div>';

/*global define*/
define(["jquery", "views/notification", "helper", "controllers/clipboard", "models/segment", "controllers/imgCache", "bootstrap", "bootstrap-editable", "jquery-ui"],
      function ($, notify, helper, clipboard, segment, imgCache) {
        "use strict";

        notify.log('loaded metadata view');

        $.fn.editable.defaults.mode = 'inline';

        var clipFields = [
          { name: 'ID', clipprop: 'clipid', editable: false },
          { name: 'Title', clipprop: 'title', editable: true },
          { name: 'Owner', clipprop: 'owner', editable: true },
          { name: 'Category', clipprop: 'category', editable: true },
          { name: 'Zone', clipprop: 'zoneid', editable: false },
          { name: 'Pool', clipprop: 'poolid', editable: false },
          { name: 'Created', clipprop: 'created', editable: false, convert: helper.formatDate },
          { name: 'Modified', clipprop: 'modified', editable: false, convert: helper.formatDate },
          { name: 'Completed', clipprop: 'completed', editable: false, convert: helper.formatDate },
          { name: 'Server FPS', clipprop: 'serverframerate', editable: false },
          { name: 'Description', clipprop: 'description', editable: true },
          { name: 'Frames', clipprop: 'frames', editable: false, convert: function (val) { return val; } },
          { name: 'Video Tracks', clipprop: 'numvidtracks', editable: false },
          { name: 'Audio Tracks', clipprop: 'numaudtracks', editable: false },
          { name: 'Placeholder', clipprop: 'placeholder', editable: false, convert: function (val) { if (val == "1") { return "Yes"; } else { return "No"; } } },
          { name: 'Editted', clipprop: 'unedited', editable: false, convert: function (val) { if (val == "0") { return "Yes"; } else { return "No"; } } },
          { name: 'Has History', clipprop: 'haseditdata', editable: false, convert: function (val) { if (val == "1") { return "Yes"; } else { return "No"; } } },
          { name: 'Video Format', clipprop: 'videoformats', editable: false, convert: function (val) { return helper.quantelVideoFormatToAdobe(parseInt(val, 10)); } }, // MWMWMW Should convert these
          {name: 'Audio Format', clipprop: 'audioformats', editable: false, convert: function (val) { return helper.quantelAudioFormatToAdobe(parseInt(val, 10)); } },
          { name: 'VDCP ID', clipprop: 'vdcpid', editable: true }
          ],
          segFields = [
          { name: 'Clip Title', clipprop: 'title', editable: false },
          { name: 'Begin', prop: 'intime', editable: false },
          { name: 'End', prop: 'outtime', editable: false },
          { name: 'Duration', prop: 'duration', editable: false },
          { name: 'Created', prop: 'created', editable: false, convert: helper.formatDate },
          { name: 'Location', clipprop: 'location', editable: false },
          { name: 'Clip ID', clipprop: 'clipid', editable: false }
        ], editableURL = function (prop, clip, view) {
          $('.' + prop.clipprop).editable({
            disabled: !prop.editable,
            url: function (params) {
              var deferredObj = new $.Deferred();
              clip.editAttribute(prop.clipprop, params.value, function (success, errorMsg) {
                if (success) {
                  deferredObj.resolve();
                  clip.properties[prop.clipprop] = params.value;
                  $(view).trigger('update', { update: 'editted' });
                } else {
                  notify.log(xhr.status);
                  deferredObj.reject('Failed To Update: ' + xhr.status + ' - ' + xhr.statusText);
                }
                return success;
              });
              return deferredObj.promise();
            }
          });
        }, editableClipComment = function (clip) {
          $('.metacomment').editable({
            url: function (params) {
              var deferredObj = new $.Deferred();
              clip.addLog(clip.id + ':' + params.value, 0, 1, 4, function (success, errorMsg) {
                if (success) {
                  deferredObj.resolve();
                } else {
                  notify.log(xhr.status);
                  deferredObj.reject('Failed To Update: ' + xhr.status + ' - ' + xhr.statusText);
                }
                return success;
              });
              return deferredObj.promise();
            }
          });
        }, editableSegComment = function (seg) {
          $('.metacomment').editable({
            url: function (params) {
              var deferredObj = new $.Deferred();
              var inframe = parseInt(helper.secondsToFrames(
                seg.intime,
                seg.clip.zone.site.fps,
                seg.clip.zone.site.flag1001
              ).toFixed(0), 10);
              seg.clip.addLog(seg.outtime + ':' + params.value, inframe, inframe + 1, 4, function (success, errorMsg) {
                if (success) {
                  deferredObj.resolve();
                } else {
                  notify.log(errorMsg);
                  deferredObj.reject('Failed To Update: ' + errorMsg);
                }
                return success;
              });
              return deferredObj.promise();
            }
          });
        }, createClipMetadata = function (clip) {
          var ret = '', prop = null, val = null, rowIdx = 0, i = 0, oddText = null, editableText = null;

          notify.log('Opening metadata for clip: ' + clip.id);
          ret = '<div class="row"><div class="col-md-6 qmetadatacol">';

          // Add thumbnail
          // MWMWMW Need to work out a way of checking thumbnail height to adjust rows per column automatically
          ret += '<div class="metathumbparent"><img class="fullthumb metathumb full-width"></div>'; //</div><div class="col-md-6 qmetadatacol">';

          // Add clip comment
          ret += '<div class="form-control-parent"><label class="col-sm-3 control-label qmetadataeven">Comment</label><div class="col-sm-9 qmetadatacol">\
                  <a href="#" class="form-control metacomment" data-type="text" data-title="Comment">Loading...</a></div></div>';

          rowIdx = 4;

          for (i = 0; i < clipFields.length; i++) {
            if (rowIdx > 9) {
              ret += '</div><div class="col-md-6 qmetadatacol">';
              rowIdx = 0;
            }

            prop = clipFields[i];
            val = clip.properties[prop.clipprop];
            if (val === undefined) {
              val = '';
            }
            if (prop.convert !== undefined) {
              val = prop.convert(val);
            }
            oddText = (i % 2) ? 'qmetadataeven' : 'qmetadataodd';
            editableText = prop.editable ? '<i class="icon-pencil"></i>' : '';
            ret += '<div class="form-control-parent"><label class="col-sm-3 control-label">' + prop.name + '</label><div class="col-sm-9 qmetadatacol">\
                  <a href="#" class="form-control ' + prop.clipprop + ' ' + oddText + '" data-type="text" data-title="' +
                  prop.name + '">' + editableText + val + '</a></div></div>';
            rowIdx++;
          }
          ret += '</div></div>';
          return ret;
        }, createSegmentMetadata = function (seg) {
          var ret = '', prop = null, val = null, rowIdx = 0, i = 0;

          notify.log('Opening metadata for seg');
          ret = '<div class="row"><div class="col-md-4">';

          // Add thumbnail
          // MWMWMW Need to work out a way of checking thumbnail height to adjust rows per column automatically
          ret += '<img class="fullthumb metathumb full-width"></div><div class="col-md-4 qmetadatacol">';

          // Add clip comment
          ret += '<div class="form-control-parent"><label class="col-sm-3 control-label qmetadataeven">Comment</label><div class="col-sm-9 qmetadatacol">\
                  <a href="#" class="form-control metacomment" data-type="text" data-title="Comment">Loading...</a></div></div>';

          ret += '<div class="form-control-parent"><label class="col-sm-3 control-label">Clip Title</label><div class="col-sm-9 qmetadatacol">\
                <a href="#" class="form-control qmetadataeven" data-type="text" data-title="Clip Title">' + seg.clip.title + '</a></div></div>';
          ret += '<div class="form-control-parent"><label class="col-sm-3 control-label">Begin</label><div class="col-sm-9 qmetadatacol">\
                <a href="#" class="form-control qmetadataodd" data-type="text" data-title="Begin">' + helper.secondsToTimecode(seg.intime, seg.clip.zone.site.fps) + '</a></div></div>';
          ret += '<div class="form-control-parent"><label class="col-sm-3 control-label">End</label><div class="col-sm-9 qmetadatacol">\
                <a href="#" class="form-control qmetadataeven" data-type="text" data-title="End">' + helper.secondsToTimecode(seg.outtime, seg.clip.zone.site.fps) + '</a></div></div>';
          ret += '<div class="form-control-parent"><label class="col-sm-3 control-label">Duration</label><div class="col-sm-9 qmetadatacol">\
                <a href="#" class="form-control qmetadataodd" data-type="text" data-title="Duration">' + helper.secondsToTimecode(seg.duration(), seg.clip.zone.site.fps) + '</a></div></div>';
          ret += '<div class="form-control-parent"><label class="col-sm-3 control-label">Created</label><div class="col-sm-9 qmetadatacol">\
                <a href="#" class="form-control qmetadataeven" data-type="text" data-title="Created">' + helper.formatDate(seg.created) + '</a></div></div>';
          ret += '<div class="form-control-parent"><label class="col-sm-3 control-label">Location</label><div class="col-sm-9 qmetadatacol">\
                <a href="#" class="form-control qmetadataodd" data-type="text" data-title="Location">' + seg.clip.location + '</a></div></div>';
          ret += '<div class="form-control-parent"><label class="col-sm-3 control-label">Clip ID</label><div class="col-sm-9 qmetadatacol">\
                <a href="#" class="form-control qmetadataeven" data-type="text" data-title="Clip ID">' + seg.clip.id + '</a></div></div>';

          ret += '</div></div>';
          return ret;
        };

        /**
        * Represents a view of a clips metadata
        * @constructor
        */
        function MetadataView() {
          var metadataBox = $(metadataTemplate);
          this.__defineGetter__('metadataBox', function () { return metadataBox; });

          this.currentItems = null;
          this.currentIdx = null;

          if (typeof this.update != "function") {
            MetadataView.prototype.update = function () {
              var contents = $('.modal-body', this.metadataBox),
              item = this.currentItems[this.currentIdx], i = 0;

              if (item !== undefined) {
                if (segment.isSegment(item)) {
                  contents.html(createSegmentMetadata(item));
                  imgCache.load($('.metathumb', contents), item.clip.imgUri(
                      helper.secondsToFrames(
                        item.intime,
                        item.clip.zone.site.fps,
                        item.clip.zone.site.flag1001
                      ).toFixed(0)));

                  // Load comment
                  var fr = helper.secondsToFrames(item.intime, item.clip.zone.site.fps, item.clip.zone.site.flag1001).toFixed(0);
                  notify.log('looking for seg frame: ' + fr);
                  $.ajax({
                    type: 'GET',
                    url: item.clip.logsUri(fr),
                    dataType: 'xml',
                    timeout: 8000,
                    beforeSend: item.zone.site.beforeSend,
                    success: function (xml) {
                      var found = false;
                      $(xml).find('log').each(function () {
                        if ($(this).attr('type') == "4") {
                          var comment = $(this).attr('contents'),
                          outtime = comment.substring(0, comment.indexOf(':')),
                          text = comment.substring(comment.indexOf(':') + 1);

                          notify.log('got seg comment, outtime: ' + outtime + '. item dur: ' + item.outtime);
                          if (outtime == item.outtime) {
                            found = true;
                            $('.metacomment').html('<i class="icon-pencil"></i>' + text);
                          }
                        }
                      });

                      if (!found) {
                        $('.metacomment').html('<i class="icon-pencil"></i>');
                      }
                      editableSegComment(item);
                    },
                    error: function (xhr) {
                      notify.log('Error fetching comment: ' + xhr.status + ' - ' + xhr.statusText);
                      if (xhr.status == 404) {
                        $('.metacomment').html('<i class="icon-pencil"></i>');
                      } else {
                        $('.metacomment').html('Error fetching comment');
                      }

                      editableSegComment(item);
                    }
                  });
                  //                for (i = 0; i < segFields.length; i++) {
                  //                  editableURL(segFields[i], item);
                  //                }
                } else {
                  contents.html(createClipMetadata(item));
                  imgCache.load($('.metathumb', contents), item.imgUri());

                  // Load comment
                  $.ajax({
                    type: 'GET',
                    url: item.logsUri(0),
                    dataType: 'xml',
                    timeout: 8000,
                    beforeSend: item.zone.site.beforeSend,
                    success: function (xml) {
                      var found = false;
                      $(xml).find('log').each(function () {
                        if ($(this).attr('type') == "4") {
                          var comment = $(this).attr('contents'),
                          clipid = comment.substring(0, comment.indexOf(':')),
                          text = comment.substring(comment.indexOf(':') + 1);
                          if (clipid == item.id) {
                            found = true;
                            $('.metacomment').html('<i class="icon-pencil"></i>' + text);
                          }
                        }
                      });

                      if (!found) {
                        $('.metacomment').html('<i class="icon-pencil"></i>');
                      }
                      editableClipComment(item);
                    },
                    error: function (xhr) {
                      notify.log('Error fetching comment: ' + xhr.status + ' - ' + xhr.statusText);
                      if (xhr.status == 404) {
                        $('.metacomment').html('<i class="icon-pencil"></i>');
                      } else {
                        $('.metacomment').html('Error fetching comment');
                      }

                      editableClipComment(item);
                    }
                  });
                  for (i = 0; i < clipFields.length; i++) {
                    editableURL(clipFields[i], item, this);
                  }
                }
              } else {
                notify.log('error');
              }

              if (this.currentIdx === 0) {
                $('.previousbtnx', this.metadataBox).prop('disabled', true);
              } else {
                $('.previousbtnx', this.metadataBox).prop('disabled', false);
              }

              if (this.currentIdx == this.currentItems.length - 1) {
                $('.nextbtnx', this.metadataBox).prop('disabled', true);
              } else {
                $('.nextbtnx', this.metadataBox).prop('disabled', false);
              }
            };
          }

          if (typeof this.draw != "function") {
            MetadataView.prototype.draw = function (parent) {
              parent.append(this.metadataBox);

              $('.cancel', this.metadataBox).off().on('click', function () {
                this.metadataBox.removeClass('show');
              } .bind(this));

              $('.previousbtnx', this.metadataBox).off().on('click', function () {
                if (this.currentIdx > 0) {
                  this.currentIdx--;
                  this.update();
                  $(this).trigger('update', { update: 'nav' });
                }
              } .bind(this));
              $('.nextbtnx', this.metadataBox).off().on('click', function () {
                if (this.currentIdx < this.currentItems.length - 1) {
                  this.currentIdx++;
                  this.update();
                  $(this).trigger('update', { update: 'nav' });
                }
              } .bind(this));

              this.metadataBox.droppable({
                hoverClass: "item-accept",
                tolerance: 'pointer',
                drop: function (/*evt, ui*/) {
                  notify.log('dropped on metadata');
                  this.show(clipboard.get());
                } .bind(this)
              });
            };
          }

          if (typeof this.show != "function") {
            MetadataView.prototype.show = function (items, idx) {
              this.currentItems = items;
              this.currentIdx = idx === undefined ? 0 : idx;

              this.update();
              this.metadataBox.modal('show');
            };
          }

          if (typeof this.hide != "function") {
            MetadataView.prototype.hide = function () {
              this.currentItems = null;
              this.metadataBox.removeClass('show');
            };
          }
        }

        return {
          /** 
          * Creates a new Metadata view to display and edit clips metadata
          */
          create: function () {
            return new MetadataView();
          }
        };
      });