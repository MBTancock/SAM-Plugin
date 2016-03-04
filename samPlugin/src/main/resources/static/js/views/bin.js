/*jshint multistr: true */
/*jslint browser: true */
/*global define, console*/

/**
* BinView module
* @module views/bin
*/
define(["jquery", "helper", "views/widgets", "views/notification", "views/footer", "views/metadata", "views/modals", "views/bin-table",
        "controllers/clipboard", "controllers/imgCache", "datatables"],
function ($, helper, widgets, notify, footer, metadataview, modals, binTable, clipboard, imgCache) {
  "use strict";

  notify.log('loaded bin view');

  // Template for the main element
  var binTemplate = '<div class="qitem qbin" role="main"><table class="table" style="width: 100%"></table><div class="qcontrols"></div></div>',
  // Template for the visible options bar in the top left
  optionsTemplate = '<div class ="qtoolbar-fixed navbar-left">\
    <button class="qicon controls add"><span class="newicon icon-add bigger-icon" data-toggle="tooltip" data-placement="bottom" title="Add Bin"></span></button>\
    <button class="qicon controls publish"><span class="newicon icon-bin-publish" data-toggle="tooltip" data-placement="bottom" title="Publish Bin">\
    </span></button>\
    <button class="qicon controls download"><span class="newicon icon-download" data-toggle="tooltip" data-placement="bottom" title="Download MXF">\
    </span></button>\
    <button class="qicon controls snapshot"><span class="newicon icon-snapshot" data-toggle="tooltip" data-placement="bottom" title="Create Snapshot">\
    </span></button>\
    <button class="qicon controls comments"><span class="newicon icon-add-comment" data-toggle="tooltip" data-placement="bottom" title="Add Comment">\
    </span></button>\
    <button class="qicon controls delete"><span class="newicon icon-delete" data-toggle="tooltip" data-placement="bottom" title="Delete Segment">\
    </span></button>\
  </div>',
  // Template for the list of global options triggered from the options button in the top right
  globalOptions = helper.mobile ?
  '<li class="new"><a>New Bin</a></li>\
  <li class="publish"><a>Publish Bin</a></li>\
  <li class="clear"><a>Clear Bin</a></li>\
  <li class="snapshot"><a>Create Snapshot</a></li>\
  <li class="comments"><a>Add Comment</a></li>\
  <li class="delete"><a>Delete</a></li>'
  :
  '<button class="viewtoggle"><div>Toggle Fullscreen</div></button><br>\
  <button class="new"><div>Add Bin</div></button><br>\
  <button class="publish"><div>Publish Bin</div></button><br>\
  <button class="clear"><div>Clear Bin</div></button><br>\
  <button class="downloadmxf"><div>Download MXF</div></button><br>\
  <button class="downloadwav"><div>Download WAV</div></button><br>\
  <button class="snapshot"><div>Create Snapshot</div></button><br>\
  <button class="comments"><div>Add Comment</div></button><br>\
  <button class="delete"><div>Delete</div></button><br>',
  // Returns a listener function to use to listen for user interaction with the global options menu
  makeGlobalOptionsListener = function (bin, metadataView) {
    return function (evt) {
      var items = [], element = null;
      if ((evt.target.nodeName == 'BUTTON') || (evt.target.nodeName == 'LI')) {
        element = $(evt.target);
      } else if ((evt.target.parentElement.nodeName == 'BUTTON') || (evt.target.parentElement.nodeName == 'LI')) {
        element = $(evt.target.parentElement);
      }

      if (element !== null && element.prop('disabled') !== true) {
        if (element.hasClass('new')) {
          $(bin).trigger('update', { update: 'addbin' });
        } else if (element.hasClass('delete')) {
          $(bin).trigger('update', { update: 'deletebin' });
        } else if (element.hasClass('clear')) {
          $(bin).trigger('update', { update: 'clearbin' });
        } else if (element.hasClass('publish')) {
          $(bin).trigger('update', { update: 'publishbin' });
        } else if (element.hasClass('downloadmxf')) {
          items = bin.datatable.getSelectedItems();
          $(this).trigger('update', { update: 'download', format: 'mxf', segs: items });
        } else if (element.hasClass('downloadwav')) {
          items = bin.datatable.getSelectedItems();
          $(this).trigger('update', { update: 'download', format: 'wav', segs: items });
        } else if (element.hasClass('snapshot')) {
          items = bin.datatable.getSelectedItems();
          $(bin).trigger('update', { update: 'snapshotsegs', segs: items });
        } else if (element.hasClass('comments')) {
          items = bin.datatable.getSelectedItems();
          if (items.length > 0) {
            modals.addComments(function (comment) {
              if (comment !== null) {
                $(bin).trigger('update', { update: 'addcomment', term: comment, segs: items });
              }
            });
          } else {
            notify.error("No clips selected", "");
          }
        } else if (element.hasClass('metadata')) {
          items = bin.datatable.getSelectedItems();
          metadataView.show(items);
        } else if (element.hasClass('viewtoggle')) {
          $(bin).trigger('update', { update: 'viewtoggle' });
          $('.popover').remove();
        } else if (element.hasClass('split')) {
          $(bin).trigger('update', { update: 'split' });
        }
        
        if (!$(evt.target).hasClass('optionsSideBar')) {
          $('.row-offcanvas.options').removeClass('active');
          evt.stopPropagation();
          evt.preventDefault();
        }
      }
    };
  },
  // Enables and disables the visible buttons
  checkButtonDisabledState = function (parent, disabled) {
    $('.snapshot', parent).prop('disabled', disabled);
    $('.comments', parent).prop('disabled', disabled);
    $('.download', parent).prop('disabled', disabled);
    $('.delete', parent).prop('disabled', disabled);
  };
  /**
  * Represents a Bin view
  * @constructor
  * @memberof module:views/bin
  */
  function BinView() {
    var optionsBar = $('<div class="qtoolbar">', {}),
    optionsBarLeft = $(optionsTemplate),
    optionsBarRight = $('<div class="qtoolbar-fixed navbar-right">', {}),
    optionsBarTitle = $('<div class="qcenter qtitle">'),
    optionsButton = $(widgets.optionsTemplate),
    optionsSearchBox = $(widgets.optionsSearchBox),
    searchButton = $(widgets.optionsSearchButton),
    globalOptionsSidebar = null,
    itemOptionsSidebar = null,
    metadataView = metadataview.create(),
    bin = this,
    src = null;

    // Start by defining basic page layout

    // Options bar
    optionsSearchBox.addClass('hide');
    optionsBarRight.append(optionsSearchBox);
    optionsBarRight.append(searchButton);
    optionsBarRight.append(optionsButton);

    if (helper.mobile) {
      // Mobile view has a side bar which slides out
      globalOptionsSidebar = $(widgets.optionsSideBar.replace('{{contents}}', globalOptions).replace('{{title}}', 'Window Options'));
      optionsBar.append(globalOptionsSidebar);
      itemOptionsSidebar = $(widgets.optionsSideBar.replace('{{contents}}', binTable.options).replace('{{title}}', 'Clip Options'));
      optionsBar.append(itemOptionsSidebar);
    }

    // Create the top options bar
    optionsBar.append(optionsBarLeft);
    optionsBar.append(optionsBarRight);
    optionsBar.append($('<div class="hor-center">').append(optionsBarTitle));

    /**
    * The view for the main table 
    * @scope static
    */
    this.datatable = binTable.create();
    $(this.datatable).on('update', function (evt, props) {
      if (props.update == 'selectedChange') {
        checkButtonDisabledState(optionsBarLeft, !props.selected);
      } else if (props.update == 'metadata') {
        metadataView.show(props.clips, props.idx);
      } else if (props.update == 'touchheld') {
        footer.show(this);
      } else {
        $(this).trigger('update', props);
      }
    } .bind(this));

    /** 
    * Adds the view to the dom as the last child element of the supplied parent
    * @method
    * @scope static
    * @param {jQueryDomElement} parent - The element to append the view to
    */
    this.draw = function (parent, height) {
      var mainBin = $(binTemplate),
      widthRight = null, widthLeft = null;

      if (height === null) {
        mainBin.addClass('full');
      } else {
        mainBin.removeClass('full');
      }

      // DRAW PANEL
      // Draw basic structure
      metadataView.draw(parent);
      parent.append(optionsBar);
      parent.append(mainBin);

      // Handling for Title. This is to counter act the css for 'text-align:center' aligning optionsBarTitle to the center 
      // between optionsBarRight and left and not the center of the parent div
      widthRight = optionsBarRight.outerWidth();
      widthLeft = optionsBarLeft.outerWidth();
      if (widthRight > widthLeft) {
        optionsBarTitle.css({ 'margin-left': widthRight - widthLeft, 'max-width': $(parent).width() - (widthRight * 2) - 40 });
      } else {
        optionsBarTitle.css({ 'margin-right': widthLeft - widthRight, 'max-width': $(parent).width() - (widthLeft * 2) - 40 });
      }

      this.datatable.draw(parent, height);

      // USER EVENT HANDLING
      // Handle clicking on the search button to display / hide the search box
      searchButton.on('click', function () {
        if (optionsSearchBox.is(':visible')) {
          this.datatable.filter('');
          optionsSearchBox.val('');
          optionsSearchBox.addClass('hide');
          $('.newicon', searchButton).removeClass('icon-close');
        } else {
          optionsSearchBox.removeClass('hide');
          $('.newicon', searchButton).addClass('icon-close');
        }
        optionsSearchBox.focus();
        var widthRight = optionsBarRight.outerWidth(), widthLeft = optionsBarLeft.is(':visible') ? optionsBarLeft.outerWidth() : 0,
        maxWidth = null, display = 'inline-block';
        if (widthRight > widthLeft) {
          maxWidth = $(window).width() - (widthRight * 2) - 40;
          if (maxWidth < 20) {
            display = 'none';
          }
          optionsBarTitle.css({ 'margin-left': widthRight - widthLeft, 'max-width': maxWidth, 'display': display });
        } else {
          maxWidth = $(window).width() - (widthRight * 2) - 40;
          if (maxWidth < 20) {
            display = 'none';
          }
          optionsBarTitle.css({ 'margin-right': widthLeft - widthRight, 'max-width': maxWidth, 'display': display });
        }
      } .bind(this));

      // Handle hitting return in the search box to trigger a search
      optionsSearchBox.on('keydown', function (evt) {
        //notify.log('keydown: ' + evt.keyCode);
        if (evt.keyCode == 13) { // return
          evt.preventDefault();
          evt.stopPropagation();
          this.datatable.filter(evt.target.value);
        } else {
          if (this.textTimeout !== null) {
            clearTimeout(this.textTimeout);
          }
          this.textTimeout = setTimeout(function () {
            this.textTimeout = null;
            this.datatable.filter(evt.target.value);
          } .bind(this), 200);
        }
      } .bind(this));

      // Handle clicking on the bins title
      optionsBarTitle.off().on('click', function () {
        $(this).toggleClass('off');
      });

      if (helper.mobile) {
        optionsButton.on('touchstart', function () {
          $('.row-offcanvas.options', globalOptionsSidebar).addClass('active');
        });

        $('.row-offcanvas.options', globalOptionsSidebar).off().on('touchstart', makeGlobalOptionsListener(bin, metadataView));

        $('.close-options').on('touchend', function () {
          $('.row-offcanvas.options').removeClass('active');
        });
      } else {
        // User can drop items onto the bin in order to add them to the bin
        mainBin.droppable({
          accept: '.ui-draggable',
          hoverClass: "item-accept",
          tolerance: 'pointer',
          drop: function (/*evt, ui*/) {
            bin.handlePaste();
          }
        });

        // Handle clicking on the bins option button
        optionsButton.popover({
          placement: 'left',
          content: globalOptions,
          html: true,
          trigger: helper.popoverTrigger()
        }).on('shown.bs.popover', function () {
          var popover = $(this).next('.popover'),
          disabled = (bin.datatable.getSelectedRows().length === 0);
          $('.downloadmxf', popover).prop('disabled', disabled);
          $('.downloadwav', popover).prop('disabled', disabled);
          $('.snapshot', popover).prop('disabled', disabled);
          $('.comments', popover).prop('disabled', disabled);
          $('.delete', popover).prop('disabled', (bin.src.title == helper.DefaultBin));
          popover.off().on('click', makeGlobalOptionsListener(bin, metadataView));
        })
        .on('click', function () {
          if ($(optionsButton).next('.popover:visible').length === 0) {
            $(optionsButton).popover('show');
          }
        });
      }

      // Options bar click handling
      $(optionsBarLeft, parent).on('click', function (evt) {
        var element = null, items = [], i = 0, item = null;
        if (evt.target.nodeName == 'BUTTON') {
          element = $(evt.target);
        } else if (evt.target.parentElement.nodeName == 'BUTTON') {
          element = $(evt.target.parentElement);
        }
        if ((element !== null) && (element.prop('disabled') !== true)) {
          if (element.hasClass('add')) {
            $(this).trigger('update', { update: 'addbin' });
          } else if (element.hasClass('delete')) {
            //$(this).trigger('update', { update: 'deletebin' });
            items = this.datatable.getSelectedItems();
            modals.confirm("Delete Segment", "Are you sure you want to delete this segment?", function (result) {
              if (result) {
                $(this).trigger('update', { update: 'itemsdeleted', items: items });
              }
            } .bind(this));
          } else if (element.hasClass('publish')) {
            $(this).trigger('update', { update: 'publishbin' });
          } else if (element.hasClass('download')) {
            items = this.datatable.getSelectedItems();
            $(this).trigger('update', { update: 'download', format: 'mxf', segs: items });
          } else if (element.hasClass('snapshot')) {
            items = this.datatable.getSelectedItems();
            $(this).trigger('update', { update: 'snapshotsegs', segs: items });
          } else if (element.hasClass('comments')) {
            items = this.datatable.getSelectedItems();
            if (items.length > 0) {
              modals.addComments(function (comment) {
                if (comment !== null) {
                  $(this).trigger('update', { update: 'addcomment', term: comment, segs: items });
                }
              } .bind(this));
            } else {
              notify.error("No clips selected", "");
            }
          }
        }
      } .bind(this));

      bin.optionsBarUpdate();
    };

    /** 
    * Redraws the table
    * @method
    * @scope static
    */
    this.binUpdate = function () {
      bin.redraw();
    };

    /** 
    * Checks on the disabled state of buttons
    * @method
    * @scope static
    */
    this.optionsBarUpdate = function () {
      checkButtonDisabledState(optionsBarLeft, (bin.datatable.getSelectedRows().length === 0));
    };

    /** 
    * Redraws the table using the supplied src as the model to base the view upon
    * @method
    * @scope static
    * @param {Object} src - Object representing a bin. Contains a string title property and Array of Segments 
    */
    this.redraw = function (src) {
      notify.log('Redrawing Bin!');
      if (src !== undefined) {
        if (this.src !== null) {
          $(this.src).off('update', this.binUpdate);
        }
        this.src = src;
        $(this.src).on('update', this.binUpdate);
      }

      $(optionsBarTitle).html(this.src.title);
      $(optionsBarTitle).tooltip({ title: this.src.title });

      this.datatable.clear();
      var i, seg;

      for (i = 0; i < this.src.segments.length; i++) {
        seg = this.src.segments[i];
        if ((seg !== null) && (seg.clip !== null)) {
          this.datatable.addSeg([[i,
            seg.clip.imgUri(helper.secondsToFrames(
                      seg.intime,
                      seg.clip.zone.site.fps,
                      seg.clip.zone.site.flag1001
                    ).toFixed(0)),
            seg.clip.properties.title === undefined ? '' : seg.clip.properties.title,
            seg.outtime - seg.intime,
            seg.intime,
            seg.outtime,
            seg.clip.properties.created === undefined ? '' : seg.clip.properties.created,
            seg.clip.id,
            seg
          ]]);
        }
      }
      notify.log('Done Redrawing Bin!');
    };

    this.setHeight = function (height) {
      this.datatable.datatable.scrollY = height;
    };

    /** 
    * Selects all rows in the table
    * @method
    * @scope static
    */
    if (typeof this.handleSelectAll != "function") {
      BinView.prototype.handleSelectAll = function () {
        this.datatable.selectAll();
        this.optionsBarUpdate();
      };
    }

    /** 
    * Copies the clips for the selected rows in the table to the clipboard
    * @method
    * @scope static
    */
    if (typeof this.handleCopy != "function") {
      BinView.prototype.handleCopy = function () {
        var items = this.datatable.getSelectedItems(), msg = 'Item';
        clipboard.set(items);

        if (items.length > 1) {
          msg += 's';
        }
        notify.info(msg + ' copied', '');
      };
    }

    /** 
    * Pastes items from the clipboard to the view, not permitted on this view
    * @method
    * @scope static
    */
    if (typeof this.handlePaste != "function") {
      BinView.prototype.handlePaste = function () {
        $(this).trigger('update', { update: 'itemsadded', items: clipboard.get() });
      };
    }

    /** 
    * Deletes the selected items from the table, not permitted on this view
    * @method
    * @scope static
    */
    if (typeof this.handleDelete != "function") {
      BinView.prototype.handleDelete = function () {
        var items = this.datatable.getSelectedItems();
        $(this).trigger('update', { update: 'itemsdeleted', items: items });
      };
    }

    /** 
    * Called for handling key down events from the keyboard
    * @method
    * @scope static
    */
    if (typeof this.handleKeyDown != "function") {
      BinView.prototype.handleKeyDown = function (evt) {
        if ((evt.keyCode == 46) || (evt.keyCode == 8)) { // Delete
          modals.confirm("Delete Segment", "Are you sure you want to delete this segment?", function (result) {
            if (result) {
              this.handleDelete();
            }
          } .bind(this));
          evt.preventDefault();
        } else if (evt.ctrlKey) {
          if (evt.keyCode == 65) { // Ctrl + a
            this.handleSelectAll();
            evt.preventDefault();
          } else if (evt.keyCode == 67) { // Ctrl + c
            this.handleCopy();
          } else if (evt.keyCode == 86) { // Ctrl + v
            this.handlePaste();
            evt.preventDefault();
          }
        }
      };
    }

    /** 
    * Called to handle losing focus
    * @method
    * @scope static
    */
    if (typeof this.handleFocusLost != "function") {
      BinView.prototype.handleFocusLost = function () {
        this.datatable.deselectAll();
        this.optionsBarUpdate();
      };
    }
  }

  return {
    /** 
    * Creates a new Bin view to display segments
    * @returns {BinView} view
    */
    create: function () {
      return new BinView();
    }
  };
});