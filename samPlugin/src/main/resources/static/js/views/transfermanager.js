/*global define, console*/
/*jshint multistr: true */
define(["jquery", "views/notification", "helper", "views/widgets", "controllers/imgCache", "controllers/navigation"],
function ($, notify, helper, widgets, imgCache, navigation) {
  "use strict";

  var transferTemplate = '<div class="qitem qtransfers" role="main"><table class="table"" style="width: 100%"></table><div class="qcontrols"></div></div>',
  optionsTemplate = '<div class ="qtoolbar-fixed navbar-left">\
    <button class="qicon controls back"><span class="newicon icon-page-left" data-toggle="tooltip" data-placement="bottom" title="Back">\
    </span></button>\
  </div>',
  columns =
  [
    { mdata: 'cl_idx', sTitle: 'idx', bVisible: false, bSortable: true },
    { mdata: 'cl_th', sTitle: '', bVisible: true, bSortable: false, sDisplayType: 'img', sWidth: helper.adobe ? '76px' : '92px' },
    { mdata: 'cl_ti', sTitle: 'Title', bVisible: true, bSortable: false, sDisplayType: 'text', sWidth: '40%' },
    { mdata: 'cl_dr', sTitle: 'Duration', bVisible: true, bSortable: false, sDisplayType: 'text', sWidth: '94px' },
    { mdata: 'cl_pr', sTitle: 'Progress', bVisible: true, bSortable: false, sDisplayType: 'progress', sWidth: '30%' },
    { mdata: 'cl_tp', sTitle: 'Type', bVisible: true, bSortable: false, sDisplayType: 'text', sWidth: '92px' },
    { mdata: 'cl_obj', sTitle: '', bVisible: true, bSortable: false, sDisplayType: 'options', sWidth: '54px' }
  ],
  globalOptions = '<button class="clearcomplete"><div>Clear Complete</div></button><br>',
  makeGlobalOptionsListener = function (manager) {
    return function (evt) {
      if (evt.target.parentElement.className == 'clearcomplete') {
        manager.clear();
      }
    };
  },
  itemOptions = '<button class="cancel"><div>Cancel</div></button><br>\
  <button class="restart"><div>Restart</div></button><br>\
  <button class="movedown"><div>Move Down</div></button><br>\
  <button class="moveup"><div>Move Up</div></button>',
  makeItemOptionsListener = function (item, manager) {
    return function (evt) {
      if ((evt.target.parentElement.className == 'cancel') && (evt.target.parentElement.disabled === false)) {
        item.cancel();
      } else if ((evt.target.parentElement.className == 'restart') && (evt.target.parentElement.disabled === false)) {
        manager.restart(item);
      } else if ((evt.target.parentElement.className == 'movedown') && (evt.target.parentElement.disabled === false)) {
        manager.moveDown(item);
      } else if ((evt.target.parentElement.className == 'moveup') && (evt.target.parentElement.disabled === false)) {
        manager.moveUp(item);
      }
    };
  };

  var TransferManagerView = function (manager) {
    var optionsBar = $('<div class="qtoolbar">', {}),
    optionsBarLeft = $(optionsTemplate),
    optionsBarRight = $('<div class="qtoolbar-fixed navbar-right">', {}),
    optionsButton = $(widgets.optionsTemplate),
    redraw = function () {
      var transfers = manager.getQueuedTransfers(), i = null, transfer = null;
      notify.log('redrawing transfers: ' + transfers.length);
      if (this.datatable !== undefined) {
        this.datatable.fnClearTable();

        transfer = manager.getActiveTransfer();
        if (transfer !== null) {
          this.datatable.fnAddData([[i, transfer.getThumb(), transfer.title(), transfer.getDuration(), transfer.status, transfer.type, transfer]]);
        }

        for (i = 0; i < transfers.length; i++) {
          transfer = transfers[i];
          if (transfer !== null) {
            this.datatable.fnAddData([[i, transfer.getThumb(), transfer.title(), transfer.getDuration(), transfer.status, transfer.type, transfer]]);
          }
        }

        transfers = manager.getInActiveTransfers();
        for (i = 0; i < transfers.length; i++) {
          transfer = transfers[i];
          if (transfer !== null) {
            this.datatable.fnAddData([[i, transfer.getThumb(), transfer.title(), transfer.getDuration(), transfer.status, transfer.type, transfer]]);
          }
        }
      }

      transfer = manager.getActiveTransfer();
      if (transfer !== null) {
        if (this.progressUpdater === null) {
          //document.getElementById(manager.getActiveTransfer().getId()).value = manager.getActiveTransfer().progress;
          this.progressUpdater = setInterval(function () {
            var activeTransfer = manager.getActiveTransfer(), element = null;
            if (activeTransfer !== null) {
              element = document.getElementById(activeTransfer.getId());
              if (element !== null) {
                element.value = activeTransfer.progress;
              }
            } else if (this.progressUpdater !== null) {
              clearInterval(this.progressUpdater);
              this.progressUpdater = null;
            }
          } .bind(this), 100);
        }
      } else if (this.progressUpdater !== null) {
        clearInterval(this.progressUpdater);
        this.progressUpdater = null;
      }
    } .bind(this);

    this.progressUpdater = null;

    optionsBarRight.append(optionsButton);
    optionsBar.append(optionsBarLeft);
    optionsBar.append(optionsBarRight);

    $(manager).on('update', function () {
      redraw();
    });

    this.draw = function (parent) {
      parent.append(optionsBar);
      parent.append($(transferTemplate));

      this.datatable = $('.table', parent).dataTable({
        "bRetrieve": true,
        "aoColumns": columns,
        "bAutoWidth": false,
        "iDisplayLength": 100,
        "oLanguage": { "sEmptyTable": "No transfers" },
        "sDom": 't',
        fnRowCallback: function (row, aData, iDisplayIndex, iDisplayIndexFull) {
          row.id = iDisplayIndexFull;
          var visCtr = 0, i = null, optionsItem, data = null,
          onThumbLoad = function (evt) {
            $('.thumb', this).removeClass('hide');
            $('.loader', this).addClass('hide');
          },
          onPopOverShow = function () {
            data = aData[aData.length - 1];
            var popover = $(this).next('.popover');
            $('.cancel', popover).prop('disabled', data.status === null || data.status == 1 || data.status == 2 || data.status == 3);
            $('.restart', popover).prop('disabled', data.status === null || data.status === 0 || data.status == 2);
            $('.movedown', popover).prop('disabled', data.status === 0 || data.status == 1 || data.status == 2 || data.status == 3);
            $('.moveup', popover).prop('disabled', data.status === 0 || data.status == 1 || data.status == 2 || data.status == 3);

            popover.off().on('click', makeItemOptionsListener(data, manager));
          },
          onPopOverClick = function (evt) {
            if ($(this).next('.popover:visible').length === 0) {
              $(this).popover('show');
              evt.stopPropagation();
            }
          };
          for (i = 0; i < columns.length; i++) {
            if (columns[i].bVisible !== false) {
              if (columns[i].sDisplayType == 'img') {
                data = aData[i];
                if (data.substring(0, 4) == 'file') {
                  $('td:eq(' + visCtr.toString() + ')', row).html('<div><img class="thumb" src="' + aData[i] + '"></div>');
                } else {
                  $('td:eq(' + visCtr.toString() + ')', row).html('<div><img class="thumb hide"><div class="thumb-loader loader"></div></div>');
                  imgCache.load($('.thumb', row), aData[i], onThumbLoad.bind(row));
                }
              }
              else if (columns[i].sDisplayType == 'progress') {
                data = aData[i];
                if (data === null) {
                  $('td:eq(' + visCtr.toString() + ')', row).html('Queued');
                } else if (data === 0) {
                  $('td:eq(' + visCtr.toString() + ')', row).html('<progress id="' + aData[aData.length - 1].getId() + '" max="100"></progress>');
                } else {
                  $('td:eq(' + visCtr.toString() + ')', row).html(aData[aData.length - 1].getStatusText());
                }
              }
              else if (columns[i].sDisplayType == 'options') {
                optionsItem = $(widgets.optionsTemplate);
                $('td:eq(' + visCtr.toString() + ')', row).html(optionsItem);
                optionsItem.popover({
                  placement: 'left',
                  content: itemOptions,
                  html: true,
                  trigger: helper.popoverTrigger()
                }).on('shown.bs.popover', onPopOverShow).on('click', onPopOverClick);
              }
              else if (columns[i].sDisplayType == 'text' && aData[i] !== null) {
                optionsItem = aData[i];
                if ((optionsItem.length !== undefined) && (optionsItem.length > 50)) {
                  $('td:eq(' + visCtr.toString() + ')', row).html($('<div>' + optionsItem.substr(0, 47) + '...</div>').tooltip({ title: optionsItem }));
                }
              }

              visCtr = visCtr + 1;
            }
          }
        }
      });

      // Options bar handling
      $(optionsBarLeft, parent).on('click', function (evt) {
        if ($(evt.target).hasClass('back') || $(evt.target.parentElement).hasClass('back')) {
          navigation.back();
        }
      } .bind(this));

      optionsButton.popover({
        placement: 'left',
        content: globalOptions,
        html: true,
        trigger: helper.popoverTrigger()
      }).on('shown.bs.popover', function () {
        // Add one click listener for the popover then query target class to work out what action to do
        $(this).next('.popover').off().on('click', makeGlobalOptionsListener(manager));
      }).on('click', function (evt) {
        if ($(optionsButton).next('.popover:visible').length === 0) {
          $(optionsButton).popover('show');
          evt.stopPropagation();
        }
      });

      redraw();
    };
  };

  return {
    create: function (manager) {
      return new TransferManagerView(manager);
    }
  };
});