/*jshint multistr: true */
define(["jquery", "views/notification", "helper", "views/widgets", "views/footer",
        "controllers/keyboard", "controllers/imgCache", "controllers/clipboard", "jquery-ui"],
function ($, notify, helper, widgets, footer, keyboard, imgCache, clipboard) {
  "use strict";

  var columns = [
    { mdata: 'cl_th', sTitle: '', bVisible: true, bSortable: false, sDisplayType: 'img', sWidth: helper.adobe ? '76px' : '92px' },
    { mdata: 'cl_ti', sTitle: 'Title', bVisible: true, bSortable: true, sSortField: 'Title', sDisplayType: 'text', sWidth: '30%', nBaseWidth: 30 },
    { mdata: 'cl_dr', sTitle: 'Duration', bVisible: true, bSortable: true, sSortField: 'Frames', sDisplayType: 'timecode', sWidth: '92px' },
    { mdata: 'cl_cr', sTitle: 'Created', bVisible: true, bSortable: true, sSortField: 'Created', sDisplayType: 'date', sWidth: '15%', nBaseWidth: 15 },
    { mdata: 'cl_ow', sTitle: 'Owner', bVisible: true, bSortable: true, sSortField: 'Owner', sDisplayType: 'text', sWidth: '12%', nBaseWidth: 12 },
    { mdata: 'cl_ca', sTitle: 'Category', bVisible: true, bSortable: false, sDisplayType: 'text', sWidth: '20%', nBaseWidth: 20 },
    { mdata: 'cl_id', sTitle: 'ID', bVisible: true, bSortable: true, sSortField: 'ClipID', sDisplayType: 'text', sWidth: '8%', nBaseWidth: 8 },
    { mdata: 'cl_obj', sTitle: '', bVisible: true, bSortable: false, sDisplayType: 'options', sWidth: '54px' }
  ],
  adjustTable = function (transformer) {
    // The number of columns displayed depends on the width of the screen
    // When screen is resized we add or remove columns
    var row = $(transformer.datatable), width = row.width(), height = row.height(),
    numVisibleColumns = 6, i = 0, header = null, col = null, multiple = null,
    headers = $('th', transformer.datatable);

    //window.alert('width: ' + width + '. height: ' + height + '. orient: ' + window.orientation + '. screen width: ' + screen.width + '. height: ' + screen.height);
    if (helper.mobile) {
      if (window.orientation === 0) {
        if (width > height) {
          width = height; // Sometimes width doesn't update by the orientationchange event 
        }
      } else if (false && height > width) {
        width = height;
      }
    }
    if (width < 400) {
      numVisibleColumns = 1;
    } else if (width < 600) {
      numVisibleColumns = 2;
    } else if (width < 700) {
      numVisibleColumns = 3;
    } else if (width < 800) {
      numVisibleColumns = 4;
    } else if (width < 1000) {
      numVisibleColumns = 5;
    }
    multiple = 6 / numVisibleColumns;
    if (headers.length != (numVisibleColumns + 2)) {
      notify.log('Adjusting table columns: ' + numVisibleColumns + '. width: ' + width + '. headers: ' + headers.length);
      for (i = 1; i < columns.length - 1; i++) {
        if (i > numVisibleColumns) {
          columns[i].bVisible = false;
          transformer.datatable.fnSetColumnVis(i, false, false);
        } else {
          if (i < headers.length - 1) {
            header = headers[i];
            col = columns[i];
            if ((header !== undefined) && (col.nBaseWidth !== undefined)) {
              var colWidth = col.nBaseWidth * multiple;
              header.style.width = colWidth + '%';
              col.sWidth = colWidth + '%';
            }
          }
          columns[i].bVisible = true;
          transformer.datatable.fnSetColumnVis(i, true, false);
        }
      }
    }
    transformer.datatable.fnAdjustColumnSizing();
  },
  itemOptions = helper.mobile ?
  '<li class="play"><a>Play</a></li>\
  <li class="add"><a>Add to Bin</a></li>\
  <li class="snapshot"><a>Snapshot</a></li>\
  <li class="comments"><a>Add Comment</a></li>\
  <li class="metadata"><a>Metadata</a></li>' :
  helper.adobe ?
  '<button class="play"><div>Play</div></button><br>\
  <button class="add"><div>Add to Bin</div></button><br>\
  <button class="metadata"><div>Metadata</div></button><br>' :
  '<button class="play"><div>Play</div></button><br>\
  <button class="add"><div>Add to Bin</div></button><br>\
  <button class="downloadmxf"><div>Download MXF</div></button><br>\
  <button class="downloadwav"><div>Download WAV</div></button><br>\
  <button class="snapshot"><div>Create Snapshot</div></button><br>\
  <button class="comments"><div>Add Comment</div></button><br>\
  <button class="metadata"><div>Metadata</div></button><br>',
  makeItemOptionsListener = function (transformer, data, idx) {
    return function (evt) {
      var items = transformer.getSelectedItems(), i = 0, item = null, element = null;
      if (items.length === 0) {
        items = [data];
      }

      if ((evt.target.nodeName == 'BUTTON') || (evt.target.nodeName == 'LI')) {
        element = $(evt.target);
      } else if ((evt.target.parentElement.nodeName == 'BUTTON') || (evt.target.parentElement.nodeName == 'LI')) {
        element = $(evt.target.parentElement);
      }

      if (element !== null && element.prop('disabled') !== true) {
        if (element.hasClass('add')) {
          $(transformer).trigger('update', { update: 'addclip', clip: items[0] });
        } else if (element.hasClass('downloadmxf')) {
          $(transformer).trigger('update', { update: 'downloadclip', clips: items, format: 'mxf' });
        } else if (element.hasClass('downloadwav')) {
          $(transformer).trigger('update', { update: 'downloadclip', clips: items, format: 'wav' });
        } else if (element.hasClass('play')) {
          $(transformer).trigger('update', { update: 'playclip', clip: items[0] });
        } else if (element.hasClass('snapshot')) {
          $(transformer).trigger('update', { update: 'snapshotclips', clips: items });
        } else if (element.hasClass('comments')) {
          $(transformer).trigger('update', { update: 'addcomment', clips: items });
        } else if (element.hasClass('metadata')) {
          items = transformer.getItem();
          $(transformer).trigger('update', { update: 'metadata', clips: items, idx: idx });
        }
      }

      if (!$(evt.target).hasClass('optionsSideBar')) {
        $('.row-offcanvas.options').removeClass('active');
        evt.stopPropagation();
        evt.preventDefault();
      }
    };
  };
  /**
  * Represents a ClipsTable view
  * @constructor
  */
  function ClipsTable() {
    this.searchParams = null;

    this.draw = function (parent, source, height) {
      var transformer = this, // MWMWMW
      options = {
        "bRetrieve": true,
        "bPaginate": true,
        "aoColumns": columns,
        "bAutoWidth": false,
        "bFilter": false,
        "bSortable": true,
        "iDisplayStart": this.searchParams.start,
        "iDisplayLength": this.searchParams.rows,
        "sPaginationType": "bootstrap",
        "aaSorting": [[this.searchParams.sortCol, this.searchParams.sortdir]],
        "sDom": 'Rt<"qcontrolsp"<"qcontrols"p>>',
        "oLanguage": { "sInfo": "<b>_START_-_END_</b> of _TOTAL_", "sEmptyTable": "Area empty" },
        "bServerSide": true,
        "fnServerData": function (sSource, aoData, fnCallback, oSettings) {
          if (source !== null) {
            var params = transformer.searchParams, i = 0, ret = [], overallRecords = 0, sortCol = 0, sortDir = 1, start = 0, rows = 0;
            $('.area-loader', parent).removeClass('hide');
            for (i = 0; i < aoData.length; i++) {
              if (aoData[i].name == 'start') {
                //params.start = aoData[i].value;
                start = parseInt(aoData[i].value, 10);
              } else if (aoData[i].name == 'length') {
                //params.rows = aoData[i].value;
                rows = parseInt(aoData[i].value, 10);
              } else if (aoData[i].name.indexOf('order') === 0) {
                if (aoData[i].value.length > 0) {
                  sortCol = parseInt(aoData[i].value[0].column, 10);
                  params.sortCol = sortCol;
                  params.sortcol = columns[sortCol].sSortField;
                  params.sortdir = aoData[i].value[0].dir;
                  sortDir = params.sortdir == 'asc' ? 1 : -1;
                }
              }
            }
            params.start = start;
            params.rows = rows;
            transformer.searchParams = params;
            source.transformer.search(source.area, $.extend(true, {}, params), function (clips, totalRecords) {
              overallRecords += totalRecords;
              var i, clip;
              $('.area-loader', parent).addClass('hide');
              if (clips !== null) {
                notify.log('clips length = ' + clips.length);
                for (i = 0; i < clips.length; i++) {
                  clip = clips[i];
                  ret.push([
                  clip.imgUri(),
                  clip.properties.title,
                  clip.duration,
                  clip.properties.created,
                  clip.properties.owner === undefined ? null : clip.properties.owner,
                  clip.properties.category === undefined ? null : clip.properties.category,
                  //clip.zone.site.location,
                  clip.id,
                  clip
                ]);
                }
                // This is to handle multi zone searching
                ret.sort(function (a, b) {
                  var ret2 = 0;
                  if (a[sortCol] > b[sortCol]) {
                    ret2 = sortDir;
                  } else if (a[sortCol] < b[sortCol]) {
                    ret2 = -sortDir;
                  }
                  return ret2;
                });
                //ret.splice(10, ret.length - 10);
                if (ret.length > rows) {
                  ret.splice(start + rows, ret.length - start - rows);
                  ret.splice(0, start);
                }
              }
              fnCallback({ "aaData": ret, "iTotalDisplayRecords": overallRecords, "iTotalRecords": overallRecords });
            } .bind(this));
          }
        } .bind(this),
        fnRowCallback: function (row, aData, iDisplayIndex, iDisplayIndexFull) {
          if (!helper.mobile) {
            $(row).draggable({
              //cursor: "move",
              distance: 5,
              scroll: true,
              helper: function (e) {
                notify.log("calling helper");
                var temp = $('<div class="sortable-div"><img class="dragging-thumb" /><div class="dragging-thumb-number"></div></div>'), offset = e.pageX - $(transformer.datatable).offset().left;
                return temp.css({ width: (80 + offset).toString() + 'px', 'padding-left': offset.toString() + 'px', 'z-index': '1020' });
              },
              start: function (event, ui) {
                imgCache.load($('.dragging-thumb'), aData[0]);
                var items = transformer.getSelectedItems(), i = 0, item = null, dragged = ui.helper;
                if (items.length < 2) {
                  items = [aData[aData.length - 1]];
                }
                clipboard.set(items);
                if (items.length > 1) {
                  $('.dragging-thumb-number').html(items.length).css('display', 'block');
                }

                $(window).on('mouseup', function () {
                  $(window).off('mouseup');
                  $(window).off('mousemove');
                  $('.ui-droppable:visible').each(function () { $(this).removeClass('hover'); });
                });
                $(window).on('mousemove', function (evt) {
                  var droppableItems = $('.ui-droppable:visible'), droppableItem = null, pos = null, width = null, dropHeight = null;
                  droppableItems.each(function () { $(this).removeClass('hover'); });
                  for (var i = 0; i < droppableItems.length; i++) {
                    droppableItem = droppableItems[i];
                    pos = $(droppableItem).offset();
                    width = $(droppableItem).outerWidth();
                    dropHeight = $(droppableItem).outerHeight();
                    if (evt.pageX >= pos.left && evt.pageX <= pos.left + width && evt.pageY >= pos.top && evt.pageY <= pos.top + dropHeight) {
                      //notify.log('got intersecting item');
                      dragged.removeClass('nodrop');
                      $(droppableItem).addClass('hover');
                      return;
                    }
                  }

                  dragged.addClass('nodrop');
                  //notify.log('not got intersecting item: ' + temp.length);
                });
              },
              stop: function () {
                clipboard.set(null);
                $(window).off('mouseup');
                $(window).off('mousemove');
              }
            });
          }
          var selectClip = function (evt) {
            $(transformer).trigger('update', { update: 'playclip', clip: aData[aData.length - 1] });
            evt.stopPropagation(); // Need this because we set keyboard focus to player and need to stop it jumping back to here
          },
          visCtr = 0,
          i = iDisplayIndex,
          clip = null,
          data = null,
          optionsItem = null,
          onThumbLoad = function (evt) {
            $('.thumb', this).removeClass('hide');
            $('.thumb-loader', this).addClass('hide');
          },
          onItemOptionsSelected = helper.mobile ? function () {
            $('.row-offcanvas.options', parent).addClass('active');
            if (!footer.on()) {
              transformer.deselectAll();
            }
            $(row).addClass('selected');
          } : function () {
            $(this).next('.popover').off().on('click', makeItemOptionsListener(transformer, data, iDisplayIndex));
          };

          row.id = iDisplayIndexFull;
          for (i = 0; i < columns.length; i++) {
            if (columns[i].bVisible !== false) {
              clip = aData[aData.length - 1];
              if (columns[i].mdata == 'cl_th') {
                $('td:eq(' + visCtr.toString() + ')', row)
                  .html('<div><img class="thumb hide"><div class="thumb-loader loader"></div></div>')
                  .off('click')
                  .on('click', selectClip);
                imgCache.load($('.thumb', row), clip.imgUri(), onThumbLoad.bind(row));
              } else if (columns[i].mdata == 'cl_ti') {
                data = clip.properties.title;
                if ((data.length !== undefined) && (data.length > 50)) {
                  $('td:eq(' + visCtr.toString() + ')', row).html($('<div>' + data.substr(0, 47) + '...</div>').tooltip({ title: data }));
                }
              } else if (columns[i].mdata == 'cl_dr') {
                data = clip.duration;
                data = helper.secondsToTimecode(data, clip.zone.site.fps);
                $('td:eq(' + visCtr.toString() + ')', row).html(data);
              } else if (columns[i].mdata == 'cl_cr') {
                data = clip.properties.created;
                data = helper.formatDate(data);
                $('td:eq(' + visCtr.toString() + ')', row).html(data);
              } else if (columns[i].mdata == 'cl_ow') {
                data = clip.properties.owner === undefined ? '' : clip.properties.owner;
                if (data.length > 30) {
                  $('td:eq(' + visCtr.toString() + ')', row).html($('<div>' + data.substr(0, 27) + '...</div>').tooltip({ title: data }));
                } else {
                  $('td:eq(' + visCtr.toString() + ')', row).html(data);
                }
              } else if (columns[i].mdata == 'cl_ca') {
                data = clip.properties.category === undefined ? '' : clip.properties.category;
                if ((data.length !== undefined) && (data.length > 30)) {
                  $('td:eq(' + visCtr.toString() + ')', row).html($('<div>' + data.substr(0, 27) + '...</div>').tooltip({ title: data }));
                } else {
                  $('td:eq(' + visCtr.toString() + ')', row).html(data);
                }
              } else if (columns[i].mdata == 'cl_id') {
                data = clip.id;
                if ((data.length !== undefined) && (data.length > 25)) {
                  $('td:eq(' + visCtr.toString() + ')', row).html($('<div>' + data.substr(0, 22) + '...</div>').tooltip({ title: data }));
                } else {
                  $('td:eq(' + visCtr.toString() + ')', row).html(data);
                }
              }
              else if (columns[i].sDisplayType == 'img') {
                data = aData[i];
                $('td:eq(' + visCtr.toString() + ')', row)
                  .html('<div><img class="thumb hide"><div class="thumb-loader loader"></div></div>')
                  .off('click')
                  .on('click', selectClip);
                imgCache.load($('.thumb', row), data, onThumbLoad.bind(row));
              }
              else if (columns[i].sDisplayType == 'date') {
                data = helper.formatDate(aData[i]);
                $('td:eq(' + visCtr.toString() + ')', row).html(data);
              }
              else if (columns[i].sDisplayType == 'timecode') {
                data = helper.secondsToTimecode(aData[i], aData[aData.length - 1].zone.site.fps);
                $('td:eq(' + visCtr.toString() + ')', row).html(data);
              }
              else if (columns[i].sDisplayType == 'options') {
                optionsItem = $('<div>' + widgets.optionsTemplate + '</div>');
                data = aData[aData.length - 1];
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
                data = aData[i];
                if ((data.length !== undefined) && (data.length > 50)) {
                  $('td:eq(' + visCtr.toString() + ')', row).html($('<div>' + data.substr(0, 47) + '...</div>').tooltip({ title: data }));
                }
              }

              visCtr = visCtr + 1;
            }
          }
          $(row).off('dblclick'); // Needed to stop adding more than one event handler
          $(row).on('dblclick', selectClip);
        },
        "oColReorder": {
          "fnReorderCallback": function () {
            columns = new $.fn.dataTable.ColReorder(transformer.datatable).s.dt.aoColumns;
            transformer.datatable.fnDraw();
          }
        }
      };
      if ((height !== undefined) && (height !== null)) {
        options.sScrollY = height;
      }

      this.datatable = $('.table', parent).dataTable(options);

      if (helper.mobile) {
        $('.row-offcanvas.options', parent).off().on('touchstart', makeItemOptionsListener(transformer, null, 0));

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
                  transformer.deselectAll();
                }

                if (!isSelected) {
                  $(row).addClass('selected');
                }
                $(row).addClass('selected');
                $(transformer).trigger('update', { update: 'touchheld' });
              }
            }, 750);

            $(window).on('touchend', function () {
              $(window).off('touchend');
              if ((touchHold !== null) && ($(document).scrollTop() == startOffset)) {
                clearTimeout(touchHold);
                touchHold = null;

                var isSelected = $(row).hasClass('selected');
                if (!footer.on()) {
                  transformer.deselectAll();
                }
                if (isSelected) {
                  $(row).removeClass('selected');
                }
                else {
                  $(row).addClass('selected');
                }
                $(transformer).trigger('update', { update: 'selectedChange', selected: transformer.getSelectedRows().length > 0 });
              }
            });
          }
        });

        $(window).on('orientationchange', function () {
          adjustTable(transformer);
        });
        adjustTable(transformer);
      } else {
        // Handle data table row click
        this.datatable.on('click', 'tr', function (evt) {
          // This is to get around differences in browser behaviour
          // Popovers should just display when the user clicks on them and hide when the user clicks away
          // However the bootstrap functionality relies on the button trigger for the popover being focused
          // Unfortunately some browsers do not do this so I've put in this workaround to open and close popovers
          // Be careful changing this code as there are subtle differences, be sure to check on each different browser
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
            //$('.options').popover('hide');
            if (keyboard.shift()) {
              curSelected = transformer.getSelectedRows();
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
                transformer.deselectAll();
              }

              if (isSelected) {
                $(this).removeClass('selected');
              }
              else {
                $(this).addClass('selected');
              }
            }
          }
          $(transformer).trigger('update', { update: 'selectedChange', selected: transformer.getSelectedRows().length > 0 });
        });

        this.resizeTimeout = null;
        $(window).on('resize', function () {
          if (this.resizeTimeout === null) {
            this.resizeTimeout = setTimeout(function () {
              adjustTable(transformer);
              this.resizeTimeout = null;
            } .bind(this), 100);
          }
        } .bind(this));
        adjustTable(transformer);

        if (window.onDragStarted !== undefined) {
          var md = false, row = null;
          this.datatable.on('mousedown', 'tr', function (evt) {
            md = true;
            row = this;
          });
          this.datatable.on('mouseup', 'tr', function (evt) {
            md = false;
            row = null;
          });
          this.datatable.on('mousemove', 'tr', function (evt) {
            if (md) {
              var item = transformer.datatable.fnGetData(row);
              item = item[item.length - 1];
              window.onDragStarted('[{"type":"clip","clipid":"' + item.id + '","zoneid":"' + item.zone.id + '"}]');
              md = false;
            }
          });
        }
      }
    };

    if (typeof this.redraw != "function") {
      ClipsTable.prototype.redraw = function () {
        this.datatable.fnDraw();
      };
    }

    if (typeof this.getSelectedRows != "function") {
      ClipsTable.prototype.getSelectedRows = function () {
        return this.datatable.$('tr.selected');
      };
    }

    if (typeof this.getItem != "function") {
      ClipsTable.prototype.getItem = function (idx) {
        var i = 0, item = null, rows = this.datatable.fnGetData(idx), ret = [];
        for (i = 0; i < rows.length; i++) {
          item = rows[i];
          ret.push(item[item.length - 1]);
        }
        return ret;
      };
    }

    if (typeof this.getSelectedItems != "function") {
      ClipsTable.prototype.getSelectedItems = function () {
        var i = 0, item = null, selectedRows = this.getSelectedRows(), ret = [];
        for (i = 0; i < selectedRows.length; i++) {
          item = this.datatable.fnGetData(selectedRows[i]);
          ret.push(item[item.length - 1]);
        }
        return ret;
      };
    }

    if (typeof this.selectAll != "function") {
      ClipsTable.prototype.selectAll = function () {
        this.datatable.$('tr').addClass('selected');
      };
    }

    if (typeof this.deselectAll != "function") {
      ClipsTable.prototype.deselectAll = function () {
        this.datatable.$('tr.selected').removeClass('selected');
      };
    }

    if (typeof this.select != "function") {
      ClipsTable.prototype.select = function (idx) {
        $(this.datatable.fnGetNodes(idx)).addClass('selected');
      };
    }
  }
  return {
    /** 
    * Creates a new ClipsTable view to display clips
    */
    create: function () {
      return new ClipsTable();
    },
    options: itemOptions
  };
});