/*global define, console*/
/*jslint browser: true */
/*jshint multistr: true */
define(["jquery", "helper"], function ($, helper) {
  "use strict";
  var notificationQueue = [], notifying = false, notify = function () {
    notifying = false;
    if (notificationQueue.length > 0) {
      notifying = true;
      var msg = notificationQueue.shift();
      $('.notificationTitle').html(msg.title);
      $('.notificationText').html(msg.text);

      $('.notification').removeClass('alert-danger');
      $('.notification').removeClass('alert-success');
      $('.notification').removeClass('alert-info');
      $('.notification').removeClass('alert-warning');
      $('.notification').addClass('alert-' + msg.type);

      $('.notification').removeClass('hide');
      setTimeout(notify, msg.duration);
    } else {
      $('.notification').addClass('hide');
    }
  }, newNotification = function (msg) {
    notificationQueue.push(msg);
    if (!notifying) {
      notify();
    }
  };

  return {
    draw: function (parent) {
      var notifyElem = '<div class="notification alert fade in hide">\
                        <strong class="notificationTitle">Warning!</strong><div class="notificationText">There was a problem with your network connection.</div>\
                    </div>';
      parent.append(notifyElem);

      $('.notification', parent).off().on('click', function () {
        $(this).addClass('hide');
      });
      if ((helper.DEBUGGER === true) && helper.mobile) {
        parent.append('<div id="console"></div>');
      }
      //      parent.on('click', function () {
      //        $('#notification').alert('close');
      //      });
    },
    remove: function (parent) {
      $('.notification', parent).remove();
    },
    /** 
    * Adds a new notification to be presented to the user
    * @param {string} msg - The message to notify
    */
    warning: function (title, text) {
      this.log("Warning: " + text.toString());
      newNotification({
        title: title,
        text: text,
        type: 'warning',
        duration: 3000
      });
    },
    error: function (title, text) {
      newNotification({
        title: title,
        text: text,
        type: 'danger',
        duration: 3000
      });
      this.log("Error: " + text);
    },
    success: function (title, text) {
      newNotification({
        title: title,
        text: text,
        type: 'success',
        duration: 3000
      });
      this.log("Success: " + text);
    },
    info: function (title, text) {
      newNotification({
        title: title,
        text: text,
        type: 'info',
        duration: 3000
      });
      this.log("Info: " + text);
    },
    log: function (msg) {
      if (helper.DEBUGGER === true) {
        var printout = new Date().toISOString() + ': ' + msg;
        if (helper.mobile) {
          $('#console').append(printout + '</br>');
        } 
          
        console.log(printout);
      }
    }
  };
});