/*global define*/
/*jshint multistr: true */
define(["jquery", "views/notification", "bootstrap"], function ($, notify) {
  "use strict";

  return {
    /** 
    * Modal templates
    */
    draw: function (parent) {
      var addBinModal = '<div class="modal fade" id="addBinModal" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">\
        <div class="modal-dialog">\
          <div class="modal-content">\
            <div class="modal-header">\
              <button type="button" class="close" data-dismiss="modal"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button>\
              <h4 class="modal-title">Add Bin</h4>\
            </div>\
            <div class="modal-body">\
              <div><input id="bin_title" class="full-width" type="text" placeholder="Enter a bin name" value="" tabindex=0/></div> \
            </div>\
            <div class="modal-footer">\
              <button type="button" class="btn-default" data-dismiss="modal">Cancel</button>\
              <button type="button" class="btn-primary" id="addBinComplete">Add</button>\
            </div>\
          </div>\
        </div>\
      </div>', publishBinModal = '<div class="modal fade" id="publishBinModal" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">\
        <div class="modal-dialog">\
          <div class="modal-content">\
            <div class="modal-header">\
              <button type="button" class="close" data-dismiss="modal"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button>\
              <h4 class="modal-title">Publish Bin</h4>\
            </div>\
            <div class="modal-body">\
              <div>\
                <label class="col-sm-3 control-label" for="publishBin_title">Title</label><input id="publishBin_title" class="qcol-sm-9" type="text" value=""/>\
              </div>\
              <div><label class="col-sm-3 control-label" for="bin_owner">Owner</label><input id="bin_owner" class="qcol-sm-9" type="text" value=""/></div>\
              <div>\
                <label class="col-sm-3 control-label" for="bin_category">Category</label><input id="bin_category" class="qcol-sm-9" type="text" value=""/>\
              </div>\
              <div><label class="col-sm-3 control-label" for="publish_area">Area</label><select id="publish_area" class="qcol-sm-9"></select></div>\
              <div><label class="col-sm-3 control-label" for="publish_video_format" id="publish_video_format_label">Video Format</label><select id="publish_video_format" class="qcol-sm-9"></select></div>\
              <div><label class="col-sm-3 control-label" for="publish_audio_format" id="publish_audio_format_label">Audio Format</label><select id="publish_audio_format" class="qcol-sm-9"></select></div>\
            </div>\
            <div class="modal-footer">\
              <button type="button" class="btn-default" data-dismiss="modal">Cancel</button>\
              <button type="button" class="btn-primary" id="publishBinComplete">Publish</button>\
            </div>\
          </div>\
        </div>\
      </div>', confirmModel = '<div id="confirmModal" class="modal fade">\
        <div class="modal-dialog">\
          <div class="modal-content">\
            <div class="modal-header">\
              <button type="button" class="close" data-dismiss="modal"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button>\
              <h4 id="confirm_title" class="modal-title"></h4>\
            </div>\
            <div class="modal-body">\
              <div id="confirm_text">Hello world!</div>\
            </div>\
            <div class="modal-footer">\
              <button type="button" class="btn-default" data-dismiss="modal" id="cancel_button">Cancel</button>\
              <button type="button" class="btn-primary" id="confirm_button" tabindex="0">Delete</button>\
            </div>\
          </div>\
        </div>\
      </div>', commentsModal = '<div id="commentModal" class="modal fade">\
        <div class="modal-dialog">\
          <div class="modal-header">\
            <button type="button" class="close cancel" data-dismiss="modal"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button>\
            <h4 class="modal-title">Add Comment</h4>\
          </div>\
          <div class="modal-body">\
            <div><input id="comment_text" class="commentsText full-width" type="text" placeholder="Enter a comment here..." value=""/></div> \
          </div>\
          <div class="modal-footer">\
            <button type="button" class="btn-default cancel" data-dismiss="modal">Cancel</button>\
            <button type="button" class="btn-primary" id="addCommentComplete">Add</button>\
          </div>\
        </div>\
      </div>';

      parent.append(addBinModal);
      parent.append(publishBinModal);
      parent.append(confirmModel);
      parent.append(commentsModal);
    },
    confirm: function (header, text, callback) {
      $('#confirm_title').html(header);
      $('#confirm_text').html(text);
      $('#confirm_button').off().on('click', function (ev) {
        ev.preventDefault();
        $('#confirmModal').modal('hide');
        callback(true);
      });
      $('#confirmModal').off().on('hide.bs.modal', function (ev) {
        $('#confirm_button').off();
        $('#confirmModal').off();
        ev.preventDefault();
        $('#confirmModal').modal('hide');

        callback(null);
      });
      $('#confirmModal').on('shown.bs.modal', function () {
        $('#confirm_button').focus();
      });
      $('#confirmModal').modal('show');
    },
    addBin: function (callback) {
      var addComplete = function (evt) {
        if (evt.keyCode == 13) {
          notify.log("Add bin complete");

          $(document).off('keydown', addComplete);
          $('#addBinComplete').off();
          $('#addBinModal').off();
          evt.preventDefault();
          $('#addBinModal').modal('hide');

          callback($('#bin_title').val());
          $('#bin_title').val('');
        }
      };

      $(document).on('keydown', addComplete);
      $('#addBinComplete').off().on('click', function (evt) {
        notify.log("Add bin complete");

        $(document).off('keydown', addComplete);
        $('#addBinComplete').off();
        $('#addBinModal').off();
        evt.preventDefault();
        $('#addBinModal').modal('hide');

        callback($('#bin_title').val());
        $('#bin_title').val('');
      });

      $('#addBinModal').off().on('hide.bs.modal', function (ev) {
        $(document).off('keydown', addComplete);
        $('#addBinComplete').off();
        $('#addBinModal').off();
        ev.preventDefault();
        $('#addBinModal').modal('hide');

        callback(null);
      });
      $('#addBinModal').on('shown.bs.modal', function () {
        $('#bin_title').focus();
      });
      $('#addBinModal').modal('show');
    },
    publishBin: function (transformer, title, callback, defaults) {
      var i, j, publishAreasHtml = '', publishVideoFormatHtml = '', publishAudioFormatHtml = '', sites = $.merge([transformer], transformer.extraPublishSites), site;
      $('#publishBin_title').val(title);

      var publishComplete = function (evt) {
        if (evt.keyCode == 13) {
          notify.log("Add bin complete");

          $(document).off('keydown', publishComplete);
          $('#publishBinComplete').off();
          $('#publishBinModal').off();
          evt.preventDefault();
          $('#publishBinModal').modal('hide');

          callback({
            title: $('#publishBin_title').val(),
            owner: $('#bin_owner').val(),
            category: $('#bin_category').val(),
            area: $('option:selected', $('#publish_area')).text(),
            transformer: $('option:selected', $('#publish_area')).data('transformer')
          });
        }
      };

      $(document).on('keydown', publishComplete);
      $('#publishBinComplete').off().on('click', function (ev) {
        notify.log("Add bin complete");

        $(document).off('keydown', publishComplete);
        $('#publishBinComplete').off();
        $('#publishBinModal').off();
        ev.preventDefault();
        $('#publishBinModal').modal('hide');

        var videoFormat = null, audioFormat = null;
        if ($('option:selected', $('#publish_video_format')).data !== undefined) {
          videoFormat = $('option:selected', $('#publish_video_format')).data('format');
        }
        if ($('option:selected', $('#publish_audio_format')).data !== undefined) {
          audioFormat = $('option:selected', $('#publish_audio_format')).data('format');
        }
        callback({
          title: $('#publishBin_title').val(),
          owner: $('#bin_owner').val(),
          category: $('#bin_category').val(),
          area: $('option:selected', $('#publish_area')).text(),
          transformer: $('option:selected', $('#publish_area')).data('transformer'),
          videoFormat: videoFormat,
          audioFormat: audioFormat
        });
      });
      $('#publishBinModal').off().on('hide.bs.modal', function (ev) {
        $(document).off('keydown', publishComplete);
        $('#publishBinComplete').off();
        $('#publishBinModal').off();
        ev.preventDefault();
        $('#publishBinModal').modal('hide');

        callback(null);
      });
      $('#publishBinModal').on('shown.bs.modal', function () {
        $('#publishBin_title').focus();
      });

      for (i = 0; i < sites.length; i++) {
        site = sites[i];
        if (site.areas !== null) {
          for (j = 0; j < site.areas.length; j++) {
            if (site.areas[j].tag == 'publish') {
              publishAreasHtml += '<option';

              if (defaults !== undefined && defaults.area !== undefined && defaults.area == site.areas[j].name) {
                publishAreasHtml += ' selected';
              }

              publishAreasHtml += ' class="' + site.away + '" data-transformer="' + site.url() + '">' + site.areas[j].name + '</option>';
            }
          }
        }
      }
      $('#publish_area').html(publishAreasHtml);

      if (transformer.allowedVideoFormats !== null) {
        for (j = 0; j < transformer.allowedVideoFormats.length; j++) {
          publishVideoFormatHtml += '<option';

          if (transformer.allowedVideoFormats[j].preferred === true) {
            publishVideoFormatHtml += ' class="preferred"';
          }

          if (defaults !== undefined && defaults.videoFormat !== undefined && defaults.videoFormat == transformer.allowedVideoFormats[j].value) {
            publishVideoFormatHtml += ' selected';
          }

          publishVideoFormatHtml += ' data-format="' + transformer.allowedVideoFormats[j].value + '">' + transformer.allowedVideoFormats[j].tag + '</option>';
        }
        $('#publish_video_format').html(publishVideoFormatHtml);
        $('#publish_video_format').removeClass('hide');
        $('#publish_video_format_label').removeClass('hide');
      } else {
        $('#publish_video_format').addClass('hide');
        $('#publish_video_format_label').addClass('hide');
      }
      if (transformer.allowedAudioFormats !== null) {
        for (j = 0; j < transformer.allowedAudioFormats.length; j++) {
          publishAudioFormatHtml += '<option';

          if (transformer.allowedVideoFormats[j].preferred === true) {
            publishAudioFormatHtml += ' class="preferred"';
          }

          if (defaults !== undefined && defaults.audioFormat !== undefined && defaults.audioFormat == transformer.allowedAudioFormats[j].value) {
            publishAudioFormatHtml += ' selected';
          }

          publishAudioFormatHtml += ' data-format="' + transformer.allowedAudioFormats[j].value + '">' + transformer.allowedAudioFormats[j].tag + '</option>';
        }
        $('#publish_audio_format').html(publishAudioFormatHtml);
        $('#publish_audio_format').removeClass('hide');
        $('#publish_audio_format_label').removeClass('hide');
      } else {
        $('#publish_audio_format').addClass('hide');
        $('#publish_audio_format_label').addClass('hide');
      }

      $('#publishBinModal').modal('show');
    },
    addComments: function (callback) {
      var addCommentsComplete = function (evt) {
        if (evt.keyCode == 13) {
          notify.log("Add bin complete");

          $(document).off('keydown', addCommentsComplete);
          $('#addCommentComplete').off();
          $('#commentModal').off();
          evt.preventDefault();
          $('#commentModal').modal('hide');

          callback($('#comment_text').val());
          $('#comment_text').val('');
        }
      };

      $(document).on('keydown', addCommentsComplete);

      $('#addCommentComplete').off().on('click', function (ev) {
        notify.log("Add bin complete");

        $(document).off('keydown', addCommentsComplete);
        $('#addCommentComplete').off();
        $('#commentModal').off();
        ev.preventDefault();
        $('#commentModal').modal('hide');

        callback($('#comment_text').val());
        $('#comment_text').val('');
      });
      $('#commentModal').off().on('hide.bs.modal', function (ev) {
        $(document).off('keydown', addCommentsComplete);
        $('#addCommentComplete').off();
        $('#commentModal').off();
        ev.preventDefault();
        $('#commentModal').modal('hide');

        callback(null);
      });
      $('#commentModal').on('shown.bs.modal', function () {
        $('#comment_text').focus();
      });
      $('#commentModal').modal('show');
    }
  };
});