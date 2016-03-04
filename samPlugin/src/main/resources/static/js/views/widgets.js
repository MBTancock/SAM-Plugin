/*global define, console*/
/*jshint multistr: true */
define([], function () {
  "use strict";
  
  return {
    /** 
    * Helper templates
    */
    optionsTemplate: '<button type="button" class="qicon options">\
        <span class="newicon icon-options"></span>\
      </button>',
    optionsSearchBox: '<input type="text" placeholder="Search" class="search-input glyphicons-search">',
    optionsSearchButton: '<button class="qicon searchbtn"><span class="newicon icon-search"></span></button>',
    optionsSideBar: '<div><div class="row row-offcanvas row-offcanvas-right options">\
      <div class="col-xs-6 sidebar-offcanvas optionsSideBar" role="navigation" style="pointer-events: all">\
        <div class="list-group">\
          <ul class="nav navbar-nav">\
            <li class="pull-right visible-xs"><a>\
              <label>{{title}}</label>\
              <button type="button" class="close normal-font close-options" data-toggle="offcanvas">\
                <span aria-hidden="true">x</span>\
                <span class="sr-only">Close</span>\
              </button>\
            </a></li>\
            {{contents}}\
          </ul>\
        </div>\
      </div>\
    </div>\
    <div class="row-offcanvas row-offcanvas-main options close-options" data-toggle="offcanvas" tabindex="-1"></div></div>'
  };
});