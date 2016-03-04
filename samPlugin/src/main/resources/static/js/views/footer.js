/*global define, console*/
/*jshint multistr: true */
define(["jquery", "views/notification"], function ($, notify) {
  "use strict";
  notify.log('loaded footer');

  /**
  * Represents a Container
  * @constructor
  * @param {string} parent - The parent widget to add the container to
  */
  var footer = '<div id="footer" class="hide">\
    <div class="col-xs-12 navbar-inverse navbar-fixed-bottom">\
      <div class="row" id="bottomNav">\
        <div class="col-xs-15 text-center">\
          <button type="button" class="qicon options selectall">\
            <span class="newicon icon-select-all"></span>\
          </button>\
        </div>\
        <div class="col-xs-15 text-center">\
          <button type="button" class="qicon options copy">\
            <span class="newicon icon-copy"></span>\
          </button>\
        </div>\
        <div class="col-xs-15 text-center">\
          <button type="button" class="qicon options paste">\
            <span class="newicon icon-paste"></span>\
          </button>\
        </div>\
        <div class="col-xs-15 text-center">\
          <button type="button" class="qicon options remove">\
            <span class="newicon icon-delete"></span>\
          </button>\
        </div>\
        <div class="col-xs-15 text-center">\
          <button type="button" class="qicon options exit">\
            <span class="newicon icon-close"></span>\
          </button>\
        </div>\
      </div>\
    </div>\
  </div>';

  return {
    /** 
    * Footer templates
    */
    draw: function (parent) {
      parent.append(footer);
    },
    focus: function (listener) {
      if (listener !== undefined) {
        $('#footer').off().on('click', function (evt) {
          if (($(evt.target).hasClass('exit')) || ($(evt.target).hasClass('icon-close'))) {
            notify.log('closing');
            $('#footer').addClass('hide');
          }
          else if (($(evt.target).hasClass('selectall')) || ($(evt.target).hasClass('icon-select-all'))) {
            notify.log('select all');
            listener.handleSelectAll();
            //$('#footer').off();
            //$('#footer').hide();
          }
          else if (($(evt.target).hasClass('copy')) || ($(evt.target).hasClass('icon-copy'))) {
            notify.log('copy');
            listener.handleCopy();
            //$('#footer').off();
            //$('#footer').hide();
          }
          else if (($(evt.target).hasClass('paste')) || ($(evt.target).hasClass('icon-paste'))) {
            notify.log('paste');
            listener.handlePaste();
            //$('#footer').off();
            //$('#footer').hide();
          }
          else if (($(evt.target).hasClass('remove')) || ($(evt.target).hasClass('icon-delete'))) {
            notify.log('delete');
            listener.handleDelete();
            //$('#footer').off();
            //$('#footer').hide();
          }
        });
      }
    },
    show: function (listener) {
      $('#footer').removeClass('hide');
      this.focus(listener);
    },
    hide: function () {
      $('#footer').addClass('hide');
    },
    on: function () {
      return $('#footer').is(':visible');
    }
  };
});