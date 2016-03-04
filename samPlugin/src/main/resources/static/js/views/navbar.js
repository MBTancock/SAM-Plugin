/*jshint multistr: true */

var navBarTemplate = '<div class="navbar-fixed navbar-left brand">\
        <img class="logo hide" src="img/logo_quantel_red.png">\
        <span class="newicon panel-icon"></span>\
      </div>\
      <div class="navbar-fixed navbar-right">\
        <button class="qicon add"><span class="newicon icon-window-add bigger-icon" data-toggle="tooltip" data-placement="bottom" title="New panel"></button>\
        <button class="qicon remove"><span class="newicon icon-window-delete bigger-icon" data-toggle="tooltip" data-placement="bottom" title="Remove panel"></button>\
        <p class="pull-right visible-xs">\
          <button type="button" class="qicon options" data-toggle="offcanvas">\
            <span class="newicon icon-menu"></span>\
          </button>\
        </p>\
      </div>\
      <div class="row row-offcanvas row-offcanvas-right">\
        <div class="bootstrap-replace-xs sidebar-offcanvas" id="sidebar" role="navigation">\
          <div class="list-group">\
            <ul class="nav navbar-nav">\
              <li class="pull-right visible-xs"><a>\
                <label>Menu</label>\
                <button type="button" class="close normal-font" data-toggle="offcanvas">\
                  <span aria-hidden="true">x</span>\
                  <span class="sr-only">Close</span>\
                </button>\
              </a></li>\
              {{contents}}\
            </ul>\
          </div>\
        </div>\
      </div>\
      <div class="row-offcanvas row-offcanvas-main" data-toggle="offcanvas" tabindex="-1"></div>';

/*global define*/
define(["jquery", "views/notification", "controllers/clipboard", "bootstrap"], function ($, notify, clipboard) {
  "use strict";

  notify.log('loaded navbar');

  /**
  * Represents a Navigation bar 
  * @constructor
  */
  var NavBar = function () {
    if (typeof this.draw != "function") {
      NavBar.prototype.draw = function (parent, menus, allowRemove, hideMenus) {
        var html = '';
        menus.forEach(function (menu) {
          if (menu.dropdown !== undefined) {
            //notify.log("Got menu: " + menu.text + ". ID: " + menu.id + ", Selected: " + menu.selected.toString());
            var activeClass = menu.selected ? ' active' : '';
            html += "<li class='dropdown topmenu'><a class='dropdown-toggle" + activeClass + "' data-toggle='dropdown' id='" + menu.id + "'>" + menu.text +
                "<span class='newicon icon-menu-down'></span></a><ul class='dropdown-menu' role='menu'>";

            menu.dropdown.forEach(function (dropdown) {
              if (dropdown.header !== undefined) {
                html += '<li class="dropdown-header">Nav header</li>';
              }
              dropdown.menus.forEach(function (ddmenu) {
                html += "<li><a class='menu " + ddmenu.away + "' id='" + ddmenu.id + "'>" + ddmenu.text + "</a></li>";
              });
              if (dropdown.divider !== undefined) {
                html += '<li class="divider"></li>';
              }
            });
            html += '</ul></li>';
          } else {
            if (menu.selected) {
              html += "<li ><a id='" + menu.id + "' class='menu active'>" + menu.text + "</a></li>";
            } else {
              html += "<li ><a class='menu' id='" + menu.id + "'>" + menu.text + "</a></li>";
            }
          }
        });
        parent.html($(navBarTemplate.replace('{{contents}}', html)));

        $('.nav', $(parent)).on('click', function (evt) {
          if ($(evt.target).hasClass('menu') || $(evt.target).hasClass('topmenu')) {
            //notify.log("Trying to parse: " + evt.target.id);
            $(this).trigger('update', { update: 'nav', selected: $.parseJSON(evt.target.id) });
          }
        } .bind(this));

        $('.add', $(parent)).on('click', function () {
          $(this).trigger('update', { update: 'plusclicked' });
        } .bind(this));

        if (allowRemove === null) {
          $('.add', $(parent)).addClass('hide');
          $('.remove', $(parent)).addClass('hide');
        } else if (allowRemove) {
          $('.remove', $(parent)).on('click', function () {
            $(this).trigger('update', { update: 'minusclicked' });
          } .bind(this));
        } else {
          $('.remove', $(parent)).addClass('hide');
        }

        if (hideMenus === true) {
          $('ul.nav > li > a:not(.active)', parent).each(function () { $(this).addClass('hide'); });
        }

        $('.menu', $(parent)).droppable({
          hoverClass: "menu-accept",
          tolerance: 'pointer',
          drop: function (evt/*, ui*/) {
            if ($(evt.target).hasClass('menu') || $(evt.target).hasClass('topmenu')) {
              try {
                $('qbin tbody').sortable('cancel'); // MWMWMW Ugh a bit nasty
              } catch (e) { window.alert(e); }
              $(this).trigger('update', { update: 'drop', obj: clipboard.get(), selected: $.parseJSON(evt.target.id) });
              $(evt.target.parentElement.parentElement.parentElement).find('[data-toggle=dropdown]').dropdown('toggle');
            }
          } .bind(this)
        });
        $('.topmenu', $(parent)).droppable({
          hoverClass: "menu-accept",
          tolerance: 'pointer',
          over: function (/*evt, ui*/) {
            notify.log('over dropdown');
            $(this).find('[data-toggle=dropdown]').dropdown('toggle');
          }
          //        out: function (/*evt, ui*/) { MWMWMW Unfortunately this doesn't work as the dropdown closes as soon as you move away from the topmenu
          //          notify.log('out dropdown');
          //          $(this).find('[data-toggle=dropdown]').dropdown('toggle');
          //        }
        });

        $('[data-toggle="offcanvas"]', $(parent)).click(function () {
          $('.row-offcanvas', $(parent)).toggleClass('active');
        });
      };
    }
  };

  return {
    /** 
    * Creates a new NavBar object
    */
    create: function () {
      return new NavBar();
    },
    generateMenus: function (menuState, transformer, binmanager, player, upload) {
      var ret = [], bins, bin, binMenus = [], i, j, serverMenus = [], sites = [transformer], site;

      if (transformer !== null) {
        if (transformer.extraSearchSites !== null) {
          for (i = 0; i < transformer.extraSearchSites.length; i++) {
            sites.push(transformer.extraSearchSites[i]);
          }
        }

        for (i = 0; i < sites.length; i++) {
          site = sites[i];
          if (site.areas !== null) {
            for (j = 0; j < site.areas.length; j++) {
              if (site.areas[j].tag == "search") {
                serverMenus.push({
                  text: site.areas[j].name,
                  id: '{"name":"Areas","area":"' + site.areas[j].name + '","site":"' + site.location + '"}',
                  selected: (menuState.area == site.areas[j].name),
                  away: site.away
                });
              }
            }
          }
        }

        if (serverMenus.length === 0) {
          ret.push({ text: 'Areas', id: '{"name":"Areas"}' });
        } else {
          ret.push({ text: 'Areas', id: '{"name":"Areas"}', dropdown: [{ menus: serverMenus}], selected: (menuState.name == 'Areas') });
        }
      }

      if (binmanager !== null) {
        bins = binmanager.bins();
        if (bins.length === 0) {
          ret.push({ text: 'Bins', id: '{"name":"Bin"}', selected: (menuState.name == 'Bin') });
        } else {
          for (bin in bins) {
            if (bins.hasOwnProperty(bin)) {
              binMenus.push({ text: bins[bin].title, id: '{"name":"Bin","bin":"' + bins[bin].title + '"}', selected: (menuState.bin == bins[bin].title) });
            }
          }
          ret.push({ text: 'Bins', id: '{"name":"Bin"}', dropdown: [{ menus: binMenus}], selected: (menuState.name == 'Bin') });
        }
      }

      if (player !== null) {
        ret.push({ text: 'Player', id: '{"name":"Player"}', selected: (menuState.name == 'Player') });
      }

      if (upload !== null) {
        ret.push({ text: 'Upload', id: '{"name":"Upload"}', selected: (menuState.name == 'Upload') });
      }
      return ret;
    }
  };
});