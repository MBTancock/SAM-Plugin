/*global define, console*/
/*jslint browser: true*/
/**
* Navigation module. Controls the browser navigation, ie. Back and forward buttons
* @module controllers/navigation
*/
define(["jquery"], function ($) {
  "use strict";

  try {
    var navigationEvents = [], curIdx = -1, kMaxNavEvts = 10;
    //location.hash = curIdx;

    $(window).on('hashchange', function () {
      var newIdx = null, newEvt = null, back = true;
      if (location.hash.length > 0) {
        newIdx = parseInt(location.hash.replace('#', ''), 10);
      } else {
        newIdx = 0;
      }
      //console.log('got hashchange event: newIdx = ' + newIdx + '. curIdx = ' + curIdx);

      if (newIdx != curIdx) {
        back = (newIdx < curIdx);
        if (back) {
          newEvt = navigationEvents[newIdx];
          if (newEvt !== undefined) {
            newEvt.container.setState(newEvt.previousState, true);
          }
        } else {
          newEvt = navigationEvents[curIdx];
          if (newEvt !== undefined) {
            newEvt.container.setState(newEvt.newstate, true);
          }
        }
        curIdx = newIdx;
      }
    });

    return {
      /** 
      * Adds a new state for the app to the stack of states. This will become the current state. When the user clicks the back and forward buttons
      * then the app will move between the states queued using this function. This is quite heavily tied to the views/container module
      * @param {object} container - This object is required to have the setState function. This gets called when the user navigates back or forward to a state
      * @param {object} previousState - The state that the container is moving from
      * @param {object} newState - The state that the container is moving to
      */
      add: function (container, previousState, state) {
        if (curIdx < (navigationEvents.length - 1)) {
          navigationEvents.splice(curIdx, navigationEvents.length - 1 - curIdx);
        }

        navigationEvents.push({ container: container, previousState: previousState, newstate: state });

        if (navigationEvents.length > kMaxNavEvts) {
          navigationEvents.shift();
        } else {
          curIdx++;
        }
        //location.hash = curIdx; // We are no longer going back between pages in the in browser app.
      },
      back: function () {
        var newEvt = navigationEvents[curIdx];
        if (newEvt !== undefined) {
          newEvt.container.setState(newEvt.previousState, true);
          curIdx--;
        }
      },
      forward: function () {
        var newIdx = curIdx + 1,
        newEvt = navigationEvents[newIdx];
        if (newEvt !== undefined) {
          newEvt.container.setState(newEvt.newstate, true);
          curIdx = newIdx;
        }
      }
    };
  } catch (e) {
  }
  return null;
});