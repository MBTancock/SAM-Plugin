/*jshint multistr: true */
define(["jquery", "views/notification", "helper", "views/widgets", "views/footer",
        "controllers/keyboard", "controllers/imgCache", "controllers/clipboard", "views/modals", "jquery-ui"],
function ($, notify, helper, widgets, footer, keyboard, imgCache, clipboard, modals) {
  "use strict";

  var columns =
  [
    { mdata: 'cl_idx', sTitle: 'idx', bVisible: false, bSortable: true },
    { mdata: 'cl_th', sTitle: '', bVisible: true, bSortable: false, sDisplayType: 'img', sWidth: '92px' },
    { mdata: 'cl_ti', sTitle: 'Title', bVisible: true, bSortable: false, sDisplayType: 'text', sWidth: '40%', nBaseWidth: 40 },
    { mdata: 'cl_dr', sTitle: 'Duration', bVisible: true, bSortable: false, sDisplayType: 'timecode', sWidth: '92px' },
    { mdata: 'cl_in', sTitle: 'In', bVisible: true, bSortable: false, sDisplayType: 'timecode', sWidth: '92px' },
    { mdata: 'cl_ot', sTitle: 'Out', bVisible: true, bSortable: false, sDisplayType: 'timecode', sWidth: '92px' },
    { mdata: 'cl_cr', sTitle: 'Created', bVisible: true, bSortable: false, sDisplayType: 'date', sWidth: '20%', nBaseWidth: 20 },
    { mdata: 'cl_sr', sTitle: 'Source', bVisible: true, bSortable: false, sDisplayType: 'text', sWidth: '20%', nBaseWidth: 20 },
    { mdata: 'cl_obj', sTitle: '', bVisible: true, bSortable: false, sDisplayType: 'options', sWidth: '54px' }
  ],
  itemOptions = helper.mobile ?
  '<li class="play"><a>Play</a></li>\
  <li class="snapshot"><a>Create Snapshot</a></li>\
  <li class="comments"><a>Add Comment</span></a></li>\
  <li class="metadata"><a>Metadata</a></li>\
  <li class="delete"><a>Delete</a></li>' :
  '<button class="play"><div>Play</div></button><br>\
  <button class="downloadmxf"><div>Download MXF</div></button><br>\
  <button class="downloadwav"><div>Download WAV</div></button><br>\
  <button class="snapshot"><div>Snapshot</div></button><br>\
  <button class="comments"><div>Add Comment</div></button><br>\
  <button class="metadata"><div>Metadata</div></button><br>\
  <button class="delete"><div>Delete</div></button><br>',
  makeItemOptionsListener = function (bin, data, idx) {
    return function (evt) {
      //console.log('popover clicked: ' + evt.target.parentElement.className.toString());
      var items = bin.getSelectedItems(), i = 0, clips = [], element = null;
      if (items.length === 0) {
        items = [data];
      }

      if ((evt.target.nodeName == 'BUTTON') || (evt.target.nodeName == 'LI')) {
        element = $(evt.target);
      } else if ((evt.target.parentElement.nodeName == 'BUTTON') || (evt.target.parentElement.nodeName == 'LI')) {
        element = $(evt.target.parentElement);
      }

      if (element !== null && element.prop('disabled') !== true) {
        if (element.hasClass('play')) {
          $(bin).trigger('update', { update: 'playseg', seg: items[0] });
        } else if (element.hasClass('downloadmxf')) {
          $(bin).trigger('update', { update: 'downloadseg', seg: items[0], format: 'mxf' });
        } else if (element.hasClass('downloadwav')) {
          $(bin).trigger('update', { update: 'downloadseg', seg: items[0], format: 'wav' });
        } else if (element.hasClass('delete')) {
          modals.confirm("Delete Segment", "Are you sure you want to delete this segment?", function (result) {
            if (result) {
              $(bin).trigger('update', { update: 'itemsdeleted', items: [data] });
            }
          });
        } else if (element.hasClass('snapshot')) {
          $(bin).trigger('update', { update: 'snapshotsegs', segs: [data] });
        } else if (element.hasClass('comments')) {
          modals.addComments(function (comment) {
            if (comment !== null) {
              $(bin).trigger('update', { update: 'addcomment', term: comment, segs: items });
            }
          });
        } else if (element.hasClass('metadata')) {
          items = bin.getItem();
          for (i = 0; i < items.length; i++) {
            clips.push(items[i].clip);
          }
          $(bin).trigger('update', { update: 'metadata', clips: clips, idx: idx });
        }
      }

      if (!$(evt.target).hasClass('optionsSideBar')) {
        $('.row-offcanvas.options').removeClass('active');
        evt.stopPropagation();
        evt.preventDefault();
      }
    };
  },
  selectSeg = function (bin, seg) {
    return function (evt) {
      $(bin).trigger('update', { update: 'playseg', seg: seg });
      evt.stopPropagation(); // Need this because we set keyboard focus to player and need to stop it jumping back to here
    };
  },
  draggableHelper = function (e, tr) {
    return $('<div class="sortable-div"><img class="dragging-thumb"></div>')
            .css({ width: '80px', 'padding-left': (e.pageX - $(this.datatable).offset().left).toString() + 'px' });
  },
  adjustTable = function (bin) {
    var row = $(bin.datatable), width = row.width(), height = row.height(),
    numVisibleColumns = 6, i = 0, header = null, col = null, multiple = null,
    headers = $('th', bin.datatable);

    if (window.orientation === 0) {
      if (width > height) {
        width = height; // Sometimes width doesn't update by the orientationchange event 
      }
    } else if (height > width && false) {
      width = height;
    }
    if (width < 400) {
      numVisibleColumns = 1;
    } else if (width < 600) {
      numVisibleColumns = 2;
    } else if (width < 700) {
      numVisibleColumns = 3;
    } else if (width < 800) {
      numVisibleColumns = 4;
    } else if (width < 900) {
      numVisibleColumns = 5;
    }
    numVisibleColumns++; // because of the extra hidden column
    multiple = 6 / numVisibleColumns;
    notify.log('BIN - Adjusting table columns: ' + numVisibleColumns + '. width: ' + width + '. headers: ' + headers.length);
    if (headers.length != (numVisibleColumns + 2)) {
      for (i = 2; i < columns.length - 1; i++) {
        if (i > numVisibleColumns) {
          columns[i].bVisible = false;
          bin.datatable.fnSetColumnVis(i, false, false);
        } else {
          if (i < headers.length) {
            header = headers[i - 1];
            col = columns[i];
            if ((header !== undefined) && (col.nBaseWidth !== undefined)) {
              var colWidth = col.nBaseWidth * multiple;
              header.style.width = colWidth + '%';
              col.sWidth = colWidth + '%';
            }
          }
          columns[i].bVisible = true;
          bin.datatable.fnSetColumnVis(i, true, false);
        }
      }
    }
    bin.datatable.fnAdjustColumnSizing();
  };

  /**
  * Represents a SegmentTable view
  * @constructor
  */
  function SegmentTable() {

    this.draw = function (parent, height) {
      var bin = this, // MWMWMW
      options = {
        "bRetrieve": true,
        "aoColumns": columns,
        "bAutoWidth": false,
        "oLanguage": { "sEmptyTable": "Bin empty" },
        "sPaginationType": "bootstrap",
        "bPaginate": false,
        "iDisplayLength": 100,
        "sDom": 't<"qcontrolsp"<"qcontrols"p>>',
        fnRowCallback: function (row, aData, iDisplayIndex, iDisplayIndexFull) {
          row.id = iDisplayIndexFull;
          var visCtr = 0, i = null, optionsItem,
          onItemOptionsSelected = helper.mobile ? function () {
            $('.row-offcanvas.options', parent).addClass('active');
            if (!footer.on()) {
              bin.deselectAll();
            }
            $(row).addClass('selected');
          } : function () {
            $(this).next('.popover').off().on('click', makeItemOptionsListener(bin, aData[aData.length - 1], iDisplayIndex));
          };
          for (i = 0; i < columns.length; i++) {
            if (columns[i].bVisible !== false) {
              if (columns[i].sDisplayType == 'img') {
                $('td:eq(' + visCtr.toString() + ')', row).html('<div><img class="thumb"></div>')
                .off('click')
                .on('click', selectSeg(bin, aData[aData.length - 1]));

                // Load thumb
                imgCache.load($('.thumb', row), aData[1]);
              }
              else if (columns[i].sDisplayType == 'date') {
                $('td:eq(' + visCtr.toString() + ')', row).html(helper.formatDate(aData[i]));
              }
              else if (columns[i].sDisplayType == 'timecode') {
                $('td:eq(' + visCtr.toString() + ')', row).html(helper.secondsToTimecode(aData[i], aData[aData.length - 1].clip.zone.site.fps));
              }
              else if (columns[i].sDisplayType == 'options') {
                optionsItem = $('<div>' + widgets.optionsTemplate + '</div>');
                $('td:eq(' + visCtr.toString() + ')', row).html(optionsItem);
                if (helper.mobile) {
                  optionsItem.on('click', onItemOptionsSelected);
                } else {
                  optionsItem.popover({
                    placement: 'left',
                    content: itemOptions,
                    html: true,
                    trigger: helper.popoverTrigger()
                  }).on('shown.bs.popover', onItemOptionsSelected);
                }
              }
              else if (columns[i].sDisplayType == 'text' && aData[i] !== null) {
                optionsItem = aData[i];
                if ((optionsItem !== undefined) && (optionsItem.length > 50)) {
                  $('td:eq(' + visCtr.toString() + ')', row).html($('<div>' + optionsItem.substr(0, 47) + '...</div>').tooltip({ title: optionsItem }));
                }
              }

              visCtr = visCtr + 1;
            }
          }
          $(row).off('dblclick'); // Needed to stop adding more than one event handler
          $(row).on('dblclick', selectSeg(bin, aData[aData.length - 1]));
        }
      };
      if ((height !== null) && (height !== undefined)) {
        options.sScrollY = height;
        options.bPaginate = true;
        options.iDisplayLength = 10;
      }
      this.datatable = $('.table', parent).dataTable(options);

      if (helper.mobile) {
        $('.row-offcanvas.options', parent).off().on('touchstart', makeItemOptionsListener(bin, null, 0));

        this.datatable.on('touchstart', 'tr', function (evt) {
          if (!$(evt.target).hasClass('options') && !$(evt.target).hasClass('icon-options')) {
            var row = this,
            startOffset = $(document).scrollTop(),
            touchHold = setTimeout(function () {
              if ($(document).scrollTop() == startOffset) {
                notify.log('touchheld');
                touchHold = null;
                var isSelected = $(row).hasClass('selected');
                if (!footer.on()) {
                  bin.deselectAll();
                }

                if (!isSelected) {
                  $(row).addClass('selected');
                }
                $(row).addClass('selected');
                $(bin).trigger('update', { update: 'touchheld' });
              }
            }, 750);

            $(window).on('touchend', function () {
              $(window).off('touchend');
              if ((touchHold !== null) && ($(document).scrollTop() == startOffset)) {
                clearTimeout(touchHold);
                touchHold = null;

                var isSelected = $(row).hasClass('selected');
                if (!footer.on()) {
                  bin.deselectAll();
                }
                if (isSelected) {
                  $(row).removeClass('selected');
                }
                else if (bin.datatable.fnGetData(row) !== null) {
                  $(row).addClass('selected');
                }
                $(bin).trigger('update', { update: 'selectedChange', selected: bin.getSelectedRows().length > 0 });
              }
            });
          }
        });

        $(window).on('orientationchange', function () {
          adjustTable(bin);
        });
        adjustTable(bin);
      } else {
        this.datatable.on('click', 'tr', function (evt) {
          if ($(evt.target).hasClass('options') || $(evt.target).hasClass('icon-options')) {
            $('.options').each(function () {
              if (this != evt.target.parentElement) {
                $(this).popover('hide');
              }
            });
            if ($(evt.target.parentElement).next('.popover:visible').length === 0) {
              $(evt.target.parentElement).popover('show');
            }
            evt.stopPropagation();
          } else {
            var curSelected = null, start = this, end = null, isSelected = null;
            if (keyboard.shift()) {
              curSelected = bin.getSelectedRows();
              if (curSelected.length == 1) {
                end = curSelected[0];
                if (curSelected[0].rowIndex < this.rowIndex) {
                  start = curSelected[0];
                  end = this;
                }

                while (start != end) {
                  $(start).addClass('selected');
                  start = start.nextSibling;
                }
                $(end).addClass('selected');
              }
            } else {
              isSelected = $(this).hasClass('selected');
              if (!keyboard.ctrl()) {
                bin.deselectAll();
              }

              if (isSelected) {
                $(this).removeClass('selected');
              }
              else if (bin.datatable.fnGetData(this) !== null) {
                $(this).addClass('selected');
              }
            }
            $(bin).trigger('update', { update: 'selectedChange', selected: bin.getSelectedRows().length > 0 });
          }
        });

        if (window.onDragStarted !== undefined) {
          var md = false, row = null;

          bin.datatable.on('mousedown', 'tr', function (evt) {
            md = true;
            row = this;
          });
          bin.datatable.on('mouseup', 'tr', function (evt) {
            md = false;
            row = null;
          });
          bin.datatable.on('mousemove', 'tr', function (evt) {
            if (md) {
              var title = 'Hello World', seg = bin.datatable.fnGetData(row), xml = '';
              seg = seg[seg.length - 1];
              //xml = '<clip_prototype version="1.0"><isa_clip_properties><property name="Title" value="' + title + '"/></isa_clip_properties><essence_segment><clip_id>' + seg.clip.id + '</clip_id><zone_id>' + seg.clip.zone.id + '</zone_id><start_frame>' +
              xml = '<clip_prototype><essence_segment><clip_id>' + seg.clip.id + '</clip_id><zone_id>' + seg.clip.zone.id + '</zone_id><start_frame>' +
            helper.secondsToFrames(seg.intime, seg.clip.zone.site.fps, seg.clip.zone.site.flag1001).toFixed(0) + '</start_frame><frames>' +
            helper.secondsToFrames(seg.duration(), seg.clip.zone.site.fps, seg.clip.zone.site.flag1001).toFixed(0) + '</frames></essence_segment></clip_prototype>';
              console.log('draggin!!!!!!! - ' + xml);
              window.onDragStarted('[{"type":"clipPrototype","prototypeXML":"' + xml + '"}]');
              md = false;
            }
          });
          $('.publish').on('mousedown', function (evt) {
            md = true;
          });
          $('.publish').on('mouseup', function (evt) {
            md = false;
          });
          $('.publish').on('mousemove', function (evt) {
            if (md) {
              var title = 'Hello World', segs = bin.datatable.fnGetData(), xml = '', seg = null, i = null;
              //xml = '<clip_prototype version="1.0"><isa_clip_properties><property name="Title" value="' + title + '"/></isa_clip_properties><essence_segment><clip_id>' + seg.clip.id + '</clip_id><zone_id>' + seg.clip.zone.id + '</zone_id><start_frame>' +
              xml = '<clip_prototype>';
              for (i = 0; i < segs.length; i++) {
                seg = segs[i];
                seg = seg[seg.length - 1];
                xml += '<essence_segment><clip_id>' + seg.clip.id + '</clip_id><zone_id>' + seg.clip.zone.id + '</zone_id><start_frame>' +
                helper.secondsToFrames(seg.intime, seg.clip.zone.site.fps, seg.clip.zone.site.flag1001).toFixed(0) + '</start_frame><frames>' +
                helper.secondsToFrames(seg.duration(), seg.clip.zone.site.fps, seg.clip.zone.site.flag1001).toFixed(0) + '</frames></essence_segment>';
              }
              xml += '</clip_prototype>';
              console.log('draggin!!!!!!! - ' + xml + '. segs length: ' + segs.length);
              window.onDragStarted('[{"type":"clipPrototype","prototypeXML":"' + xml + '"}]');
              md = false;
            }
          });
        }
        /*jslint unparam: true*/
        $("tbody", this.datatable).disableSelection().sortable({
          connectWith: '.ui-sortable',
          distance: 5,
          scroll: true,
          helper: draggableHelper.bind(bin),
          refreshPositions: true,
          update: function (event, ui) {
            notify.log('sortable update: ' + ui.sender + '. cancel: ' + ui.item[0].cancel);
            if (ui.item[0].cancel) {
              $(this).sortable('cancel');
            } else {
              var idx = $(this).children().index($(ui.item[0])),
              item = bin.datatable.fnGetData(ui.item[0]);
              if (ui.sender !== null) {
                $(bin).trigger('update', { update: 'itemsadded', items: clipboard.get(), idx: idx });
              } else {
                if ((item !== null) && (idx > -1)) {
                  // If we are just moving an item in the same bin we just want to trigger a move so that we don't redraw the bin twice
                  $(bin).trigger('update', { update: 'itemmoved', item: item[item.length - 1], idx: idx });
                }
                else if (item !== null) {
                  $(bin).trigger('update', { update: 'itemsdeleted', items: [item[item.length - 1]] });
                }
                else if (idx > -1) {
                  $(bin).trigger('update', { update: 'itemsadded', items: clipboard.get(), idx: idx });
                }
              }
            }
          },
          start: function (event, ui) {
            notify.log('sortable started');
            var item = this.datatable.fnGetData(ui.item[0]), dragged = ui.helper, uiItem = ui.item[0];
            imgCache.load($('.dragging-thumb'), item[1]);
            dragged.css('top', '0px');
            //items.push(item[item.length - 1]);
            clipboard.set(bin.getSelectedItems());
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
                  if ($(droppableItem).hasClass('qbin')) {
                    uiItem.cancel = false;
                  } else {
                    uiItem.cancel = true;
                  }
                  return;
                }
              }

              uiItem.cancel = true;
              dragged.addClass('nodrop');
              //notify.log('not got intersecting item: ' + temp.length);
            });
          } .bind(this),
          stop: function (event, ui) {
            notify.log('sortable finished');
            clipboard.set(null);
            $(window).off('mouseup');
            $(window).off('mousemove');
          }
        });
        /*jslint unparam: false*/

        this.resizeTimeout = null;
        $(window).on('resize', function () {
          if (this.resizeTimeout === null) {
            this.resizeTimeout = setTimeout(function () {
              adjustTable(bin);
              this.resizeTimeout = null;
            } .bind(this), 100);
          }
        } .bind(this));
        adjustTable(bin);
      }
    };

    if (typeof this.redraw != "function") {
      SegmentTable.prototype.redraw = function () {
        this.datatable.fnDraw();
      };
    }

    if (typeof this.clear != "function") {
      SegmentTable.prototype.clear = function () {
        this.datatable.fnClearTable();
      };
    }

    if (typeof this.addSeg != "function") {
      SegmentTable.prototype.addSeg = function (seg) {
        this.datatable.fnAddData(seg);
      };
    }

    if (typeof this.filter != "function") {
      SegmentTable.prototype.filter = function (term) {
        this.datatable.fnFilter(term);
      };
    }

    if (typeof this.getSelectedRows != "function") {
      SegmentTable.prototype.getSelectedRows = function () {
        return this.datatable.$('tr.selected');
      };
    }

    if (typeof this.getItem != "function") {
      SegmentTable.prototype.getItem = function (idx) {
        var i = 0, item = null, rows = this.datatable.fnGetData(idx), ret = [];
        for (i = 0; i < rows.length; i++) {
          item = rows[i];
          ret.push(item[item.length - 1]);
        }
        return ret;
      };
    }

    if (typeof this.getSelectedItems != "function") {
      SegmentTable.prototype.getSelectedItems = function () {
        var i = 0, item = null, selectedRows = this.getSelectedRows(), ret = [];
        for (i = 0; i < selectedRows.length; i++) {
          item = this.datatable.fnGetData(selectedRows[i]);
          ret.push(item[item.length - 1]);
        }
        return ret;
      };
    }

    if (typeof this.selectAll != "function") {
      SegmentTable.prototype.selectAll = function () {
        this.datatable.$('tr').addClass('selected');
      };
    }

    if (typeof this.deselectAll != "function") {
      SegmentTable.prototype.deselectAll = function () {
        this.datatable.$('tr.selected').removeClass('selected');
      };
    }

    if (typeof this.select != "function") {
      SegmentTable.prototype.select = function (idx) {
        $(this.datatable.fnGetNodes(idx)).addClass('selected');
      };
    }
  }

  return {
    /** 
    * Creates a new SegmentTable view to display segments
    */
    create: function () {
      return new SegmentTable();
    },
    options: itemOptions
  };
});