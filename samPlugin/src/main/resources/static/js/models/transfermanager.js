/*global define, console*/
define(["jquery", "views/notification"], function ($, notify) {
  "use strict";

  var TransferManager = function () {
    var queuedTransfers = [],
    inactiveTransfers = [],
    activeTransfer = null,
    update = function () {
      if ((queuedTransfers.length > 0) && (activeTransfer === null)) {
        activeTransfer = queuedTransfers.shift();
        var transferEnded = function () {
          notify.log('Transfer ENDED');
          inactiveTransfers.push(activeTransfer);
          $(activeTransfer).off('end', transferEnded);
          activeTransfer = null;
          update();
        };
        $(activeTransfer).on('end', transferEnded);
        activeTransfer.start();
      }
      $(this).trigger('update');
    } .bind(this);

    this.getQueuedTransfers = function () {
      return queuedTransfers;
    };

    this.getInActiveTransfers = function () {
      return inactiveTransfers;
    };

    this.getActiveTransfer = function () {
      return activeTransfer;
    };

    this.queue = function (transfer) {
      queuedTransfers.push(transfer);
      update();
    };

    this.restart = function (transfer) {
      transfer.status = null;
      inactiveTransfers.splice(inactiveTransfers.indexOf(transfer), 1);
      this.queue(transfer);
    };

    this.moveDown = function (transfer) {
      var curIdx = queuedTransfers.indexOf(transfer);
      if ((curIdx !== null) && (curIdx < queuedTransfers.length - 1)) {
        queuedTransfers.splice(curIdx, 1);
        queuedTransfers.splice(curIdx + 1, 0, transfer);
      }
    };

    this.moveUp = function (transfer) {
      var curIdx = queuedTransfers.indexOf(transfer);
      if ((curIdx !== null) && (curIdx > 0)) {
        queuedTransfers.splice(curIdx, 1);
        queuedTransfers.splice(curIdx - 1, 0, transfer);
      }
    };

    this.clear = function () {
      var i = null, idxsToClear = [];
      for (i = inactiveTransfers.length - 1; i > -1; i--) {
        if (inactiveTransfers[i].status == 2) {
          idxsToClear.push(i);
        }
      }
      for (i = 0; i < idxsToClear.length; i++) {
        inactiveTransfers.splice(idxsToClear[i], 1);
      }
      $(this).trigger('update');
    };

    this.display = function (item) {
      inactiveTransfers.push(item);
      $(this).trigger('update');
    };

    this.undisplay = function (item) {
      var idx = inactiveTransfers.indexOf(item);
      if (idx !== undefined) {
        inactiveTransfers.splice(idx, 1);
      }
    };
  };

  return {
    create: function () {
      return new TransferManager();
    }
  };
});