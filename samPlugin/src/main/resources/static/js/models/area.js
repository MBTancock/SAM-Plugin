/*global define, console*/

/**
* Area module. Represents an area which is a collection of zones
* @module models/area
*/
define(["views/notification"], function (notify) {
  "use strict";

  notify.log('loaded area');

  /**
  * Represents an area
  * @constructor
  * @memberof module:models/area
  */
  function Area(name, tag, areakeys) {
    /**
    * {string} The area name
    * @scope static
    */
    this.name = name;

    /**
    * {string} The area type (search or publish)
    * @scope static
    */
    this.tag = tag;

    /**
    * {Array} The area keys which represent the values used to define the set of clips in the area.
    * @scope static
    */
    this.areakeys = areakeys;
  }

  return {
    /** 
    * Creates a new Area object 
    * @param {string} name - The name of the area
    * @param {string} tag - The type of area (search or publish)
    * @param {string} keys - The key attributes which define what the area includes
    * @returns {Area} - The new area
    */
    create: function (name, tag, areakeys) {
      return new Area(name, tag, areakeys);
    }
  };
});