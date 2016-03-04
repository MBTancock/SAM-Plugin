/*jslint browser: true */
/*jshint multistr: true */
/*global define*/

/**
* TransformerView module
* @module views/transformer
*/
define(["jquery", "helper", "views/widgets", "views/notification", "views/footer", "views/transformer-table", "views/metadata", "views/modals",
        "controllers/clipboard", "controllers/navigation", "datatables", "datatables-plugin"],
function ($, helper, widgets, notify, footer, transformerTable, metadataview, modals, clipboard, navigation) {
  "use strict";

  notify.log('loaded transformer view');

  // Template for the main element
  var transformerTemplate = '<div class="qitem" role="main"><div class="loader area-loader hide"/><table class="table"" style="width: 100%"></table></div>',
  // Template for the visible options bar in the top left
  optionsTemplate = '<div class ="qtoolbar-fixed navbar-left">\
    <button class="qicon controls back"><span class="newicon icon-page-left" data-toggle="tooltip" data-placement="bottom" title="Back">\
    </span></button>\
    <button class="qicon controls download"><span class="newicon icon-download" data-toggle="tooltip" data-placement="bottom" title="Download MXF">\
    </span></button>\
    <button class="qicon controls snapshot"><span class="newicon icon-snapshot" data-toggle="tooltip" data-placement="bottom" title="Create Snapshot">\
    </span></button>\
    <button class="qicon controls comments"><span class="newicon icon-add-comment" data-toggle="tooltip" data-placement="bottom" title="Add Comment">\
    </span></button>\
  </div>',
  // Template for the list of global options triggered from the options button in the top right
  globalOptions = helper.mobile ?
  '<li class="snapshot"><a>Snapshot</a></li>\
  <li class="comments"><a>Add Comment</a></li>' :
  helper.adobe ? '' :
  '<button class="downloadmxf"><div>Download MXF</div></button><br>\
  <button class="downloadwav"><div>Download WAV</div></button><br>\
  <button class="snapshot"><div>Create Snapshot</div></button><br>\
  <button class="comments"><div>Add Comment</div></button><br>',
  // Creates a search terms object for use when searching a transformer
  createSearchTerms = function (term) {
    var ret = [{ key: 'Title', val: term },
      { key: 'Owner', val: term },
      { key: 'Category', val: term }
    ],
    test = parseInt(term);
    if (!isNaN(test)) {
      ret.push({ key: 'ClipID', val: term });
    }
    return [ret];
  },
  // Returns a listener function to use to listen for user interaction with the global options menu
  makeGlobalOptionsListener = function (transformer, metadataView) {
    return function (evt) {
      var items = [], i = 0, item = null, element = null;
      if ((evt.target.nodeName == 'BUTTON') || (evt.target.nodeName == 'LI')) {
        element = $(evt.target);
      } else if ((evt.target.parentElement.nodeName == 'BUTTON') || (evt.target.parentElement.nodeName == 'LI')) {
        element = $(evt.target.parentElement);
      }
      if (element !== null && element.prop('disabled') !== true) {
        if (element.hasClass('snapshot')) {
          items = transformer.datatable.getSelectedItems();
          $(transformer).trigger('update', { update: 'snapshotclips', clips: items });
        } else if (element.hasClass('comments')) {
          items = transformer.datatable.getSelectedItems();
          if (items.length > 0) {
            modals.addComments(function (comment) {
              if (comment !== null) {
                $(transformer).trigger('update', { update: 'addcomment', term: comment, clips: items });
              }
            });
          } else {
            notify.error("No clips selected", "");
          }
        } else if (element.hasClass('metadata')) {
          items = transformer.datatable.getSelectedItems();
          metadataView.show(items);
        } else if (element.hasClass('downloadmxf')) {
          items = transformer.datatable.getSelectedItems();
          $(transformer).trigger('update', { update: 'downloadclip', clips: items, format: 'mxf' });
        } else if (element.hasClass('downloadwav')) {
          items = transformer.datatable.getSelectedItems();
          $(transformer).trigger('update', { update: 'downloadclip', clips: items, format: 'wav' });
        } else if (element.hasClass('split')) {
          $(transformer).trigger('update', { update: 'split' });
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
    $('.download', parent).prop('disabled', disabled);
    $('.snapshot', parent).prop('disabled', disabled);
    $('.comments', parent).prop('disabled', disabled);
  };

  /**
  * Represents a view of a transformers clips
  * @constructor
  * @memberof module:views/transformer
  */
  function TransformerView() {
    var optionsBar = $('<div class="qtoolbar">', {}),
    optionsBarTitle = $('<div class="qcenter qtitle">'),
    optionsBarLeft = $(optionsTemplate),
    optionsBarRight = $('<div class="qtoolbar-fixed navbar-right">', {}),
    globalOptionsSidebar = null,
    itemOptionsSidebarRight = null,
    transformer = this,
    optionsButton = $(widgets.optionsTemplate),
    optionsSearchBox = $(widgets.optionsSearchBox),
    searchButton = $(widgets.optionsSearchButton),
    metadataView = metadataview.create();

    /**
    * The view for the main table 
    * @scope static
    */
    this.datatable = transformerTable.create();
    this.datatable.searchParams = {
      searchTerms: [{ key: 'Title', val: '*'}],
      start: 0,
      rows: 10,
      sortCol: 3,
      sortdir: 'desc'
    };
    $(this.datatable).on('update', function (evt, props) {
      if (props.update == 'selectedChange') {
        checkButtonDisabledState(optionsBarLeft, !props.selected);
      } else if (props.update == 'metadata') {
        metadataView.show(props.clips, props.idx);
      } else if (props.update == 'addcomment') {
        modals.addComments(function (comment) {
          if (comment !== null) {
            $(transformer).trigger('update', { update: 'addcomment', term: comment, clips: props.clips });
          }
        });
      } else if (props.update == 'touchheld') {
        footer.show(this);
      } else {
        $(this).trigger('update', props);
      }
    } .bind(this));

    // Draw options bar
    if (helper.mobile) {
      globalOptionsSidebar = $(widgets.optionsSideBar.replace('{{contents}}', globalOptions).replace('{{title}}', 'Window Options'));
      optionsBar.append(globalOptionsSidebar);
      itemOptionsSidebarRight = $(widgets.optionsSideBar.replace('{{contents}}', transformerTable.options).replace('{{title}}', 'Clip Options'));
      optionsBar.append(itemOptionsSidebarRight);
    }
    optionsBarRight.append(optionsSearchBox);
    optionsBarRight.append(searchButton);
    optionsBarRight.append(optionsButton);
    optionsBar.append(optionsBarLeft);
    optionsBar.append(optionsBarRight);
    optionsBar.append($('<div class="hor-center">').append(optionsBarTitle));

    $(metadataView).on('update', function (evt, props) {
      if (props.update == 'nav') {
        transformer.datatable.deselectAll();
        transformer.datatable.select(metadataView.currentIdx);
      } else if (props.update == 'editted') {
        // This refreshes the server bin when the user edits some metadata. Unfortunately there is a delay for the search service to update so accomodate for that here
        setTimeout(function () {
          transformer.datatable.redraw();
        }, 2000);
      }
    });

    /** 
    * Adds the view to the dom as the last child element of the supplied parent
    * @method
    * @scope static
    * @param {jQueryDomElement} parent - The element to append the view to
    * @param {Object} source - Contains area and transformer properties which are used to search for clips to populate the view
    */
    this.draw = function (parent, source, height) {
      if (source !== null && source.area != source.area) {
        this.datatable.searchParams.start = 0;
      }

      // If area to display has not been set then we use the first area in the transformers list
      if (((source.area === undefined) || (source.area === null)) && (source.transformer !== undefined) && (source.transformer.areas !== null) && (source.transformer.areas.length > 0)) {
        source.area = source.transformer.areas[0].name;
      }

      // DRAW PANEL
      // Draw basic structure
      metadataView.draw(parent);
      parent.append(optionsBar);
      parent.append($(transformerTemplate));

      if (optionsSearchBox.val() === "") {
        optionsSearchBox.addClass('hide');
      }

      // Handling for Title. This is to counter act the css for 'text-align:center' aligning optionsBarTitle to the center between optionsBarRight and left 
      // and not the center of the parent div
      $(optionsBarTitle).html(source.area);
      var widthRight = optionsBarRight.outerWidth(), widthLeft = optionsBarLeft.is(':visible') ? optionsBarLeft.outerWidth() : 0;
      if (widthRight > widthLeft) {
        optionsBarTitle.css({ 'margin-left': widthRight - widthLeft, 'max-width': $(parent).width() - (widthRight * 2) - 40 });
      } else {
        optionsBarTitle.css({ 'margin-right': widthLeft - widthRight, 'max-width': $(parent).width() - (widthLeft * 2) - 40 });
      }

      // Draw the main table
      this.datatable.draw(parent, source, height);

      // USER EVENT HANDLING
      // Handle clicking on the area title
      optionsBarTitle.off().on('click', function () {
        $(this).toggleClass('off');
      });

      // Handle clicking on the search button
      searchButton.off().on('click', function () {
        if (optionsSearchBox.is(':visible')) {
          this.datatable.searchParams.searchTerms = [{ key: 'Title', val: '*'}];
          this.datatable.redraw();
          optionsSearchBox.val('');
          optionsSearchBox.addClass('hide');
          $('.newicon', searchButton).removeClass('icon-close');
        } else {
          optionsSearchBox.removeClass('hide');
          $('.newicon', searchButton).addClass('icon-close');
          optionsSearchBox.focus();
        }
        var widthRight = optionsBarRight.outerWidth(), widthLeft = optionsBarLeft.is(':visible') ? optionsBarLeft.outerWidth() : 0,
        maxWidth = null, display = 'inline-block';
        if (widthRight > widthLeft) {
          maxWidth = $(window).width() - (widthRight * 2) - 40;
          if (maxWidth < 20) {
            display = 'none';
          }
          optionsBarTitle.css({ 'margin-left': widthRight - widthLeft, 'margin-right': 0, 'max-width': maxWidth, 'display': display });
        } else {
          maxWidth = $(window).width() - (widthLeft * 2) - 40;
          if (maxWidth < 20) {
            display = 'none';
          }
          optionsBarTitle.css({ 'margin-right': widthLeft - widthRight, 'margin-left': 0, 'max-width': maxWidth, 'display': display });
        }
      } .bind(this));

      // Handle hitting return in the search box, which triggers a search
      optionsSearchBox.off().on('keyup', function (evt) {
        //notify.log('keydown: ' + evt.keyCode);
        var text = evt.target.value;
        text += '*';

        if (evt.keyCode == 13) { // return
          evt.preventDefault();
          evt.stopPropagation();
          this.datatable.searchParams.searchTerms = createSearchTerms(text);
          this.datatable.redraw();
        } else {
          if (this.textTimeout !== null) {
            clearTimeout(this.textTimeout);
          }
          this.textTimeout = setTimeout(function () {
            this.textTimeout = null;
            this.datatable.searchParams.searchTerms = createSearchTerms(text);
            this.datatable.redraw();
          } .bind(this), 200);
        }
      } .bind(this));

      if (helper.mobile) {
        optionsButton.on('touchstart', function () {
          $('.row-offcanvas.options', globalOptionsSidebar).addClass('active');
        });

        $('.row-offcanvas.options', globalOptionsSidebar).off().on('touchstart', makeGlobalOptionsListener(transformer, metadataView));

        $('.close-options').on('touchend', function () {
          $('.row-offcanvas.options').removeClass('active');
        });
      } else {
        // Handle the areas option button
        optionsButton.popover({
          placement: 'left',
          content: globalOptions,
          html: true,
          trigger: helper.popoverTrigger()
        }).on('shown.bs.popover', function () {
          var popover = $(this).next('.popover'),
          disabled = (transformer.datatable.getSelectedRows().length === 0);
          $('.downloadmxf', popover).prop('disabled', disabled);
          $('.downloadwav', popover).prop('disabled', disabled);
          $('.snapshot', popover).prop('disabled', disabled);
          $('.comments', popover).prop('disabled', disabled);
          $(this).next('.popover').off().on('click', makeGlobalOptionsListener(transformer, metadataView));
        }).on('click', function (evt) {
          if ($(this).next('.popover:visible').length === 0) {
            $(this).popover('show');
            evt.stopPropagation();
          }
        });
      }

      $(optionsBarLeft, parent).on('click', function (evt) {
        var element = null, items = [], i = 0, item = null;
        if (evt.target.nodeName == 'BUTTON') {
          element = $(evt.target);
        } else if (evt.target.parentElement.nodeName == 'BUTTON') {
          element = $(evt.target.parentElement);
        }
        if ((element !== null) && (element.prop('disabled') !== true)) {
          items = this.datatable.getSelectedItems();
          if (element.hasClass('download')) {
            $(this).trigger('update', { update: 'downloadclip', clips: items, format: 'mxf' });
          } else if (element.hasClass('snapshot')) {
            $(this).trigger('update', { update: 'snapshotclips', clips: items });
          } else if (element.hasClass('comments')) {
            if (items.length > 0) {
              modals.addComments(function (comment) {
                if (comment !== null) {
                  $(this).trigger('update', { update: 'addcomment', term: comment, clips: items });
                }
              } .bind(this));
            } else {
              notify.error("No clips selected", "");
            }
          } else if (element.hasClass('back')) {
            navigation.back();
          }
        }
      } .bind(this));

      $(optionsBarTitle).tooltip({ title: source.area });
      checkButtonDisabledState(optionsBarLeft, (this.datatable.getSelectedRows().length === 0));
    };

    /** 
    * Redraws the table with the provided set of clips
    * @method
    * @scope static
    * @param {Array} clip - Array of clips to populate the table with
    */
    if (typeof this.redraw != "function") {
      TransformerView.prototype.redraw = function (clips) {
        this.clear();
        this.add(clips);
      };
    }

    this.setHeight = function (height) {
      $(this.datatable.datatable).dataTable({ 'scrollY': height });
    };

    /** 
    * Selects all rows in the table
    * @method
    * @scope static
    */
    this.handleSelectAll = function () {
      this.datatable.selectAll();
      checkButtonDisabledState(optionsBarLeft, (this.datatable.getSelectedRows().length === 0));
    };

    /** 
    * Copies the clips for the selected rows in the table to the clipboard
    * @method
    * @scope static
    */
    if (typeof this.handleCopy != "function") {
      TransformerView.prototype.handleCopy = function () {
        var items = this.datatable.getSelectedItems(), i = 0, item = null, msg = 'Item';

        if (items.length > 1) {
          msg += 's';
        }
        notify.info(msg + ' copied', '');
        clipboard.set(items);
      };
    }

    /** 
    * Pastes items from the clipboard to the view, not permitted on this view
    * @method
    * @scope static
    */
    if (typeof this.handlePaste != "function") {
      TransformerView.prototype.handlePaste = function () {
        notify.error('Not Allowed!', 'Item paste into area');
      };
    }

    /** 
    * Deletes the selected items from the table, not permitted on this view
    * @method
    * @scope static
    */
    if (typeof this.handleDelete != "function") {
      TransformerView.prototype.handleDelete = function () {
        notify.error('Not Allowed!', 'Cannot delete from transformer'); // MWMWMW Should just grey out (or not show) the paste image 
      };
    }

    /** 
    * Called for handling key down events from the keyboard
    * @method
    * @scope static
    */
    if (typeof this.handleKeyDown != "function") {
      TransformerView.prototype.handleKeyDown = function (evt) {
        if (evt.keyCode == 46) { // Delete
          this.handleDelete();
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
    this.handleFocusLost = function () {
      //notify.log('focus lost!');
      this.datatable.deselectAll();
      checkButtonDisabledState(optionsBarLeft, true);
    };
  }

  return {
    /** 
    * Creates a new Transformer view
    * @returns {TransformerView} view
    */
    create: function () {
      return new TransformerView();
    }
  };
});