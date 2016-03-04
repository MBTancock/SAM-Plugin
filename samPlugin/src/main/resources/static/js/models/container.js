/*global define, console*/
define(["helper", "views/notification", "controllers/storage", "views/container", "models/transformer", "models/zone", "models/clip", "models/segment"],
function (helper, notify, storage, containerView, transformer, zone, clip, segment) {
  "use strict";

  var base = null,
  containers = [],
  reviver = function (k, v) {
    //notify.log("Using container reviver k: " + k + ". v: " + v);
    var ret = null, newSite = null;
    try {
      if (k === "play") {
        if (v.inti !== undefined) {
          ret = segment.load(v);
        } else {
          newSite = transformer.create(v.sl);
          newSite.fps = parseInt(v.sfps, 10);
          newSite.flag1001 = (v.sflg === 'true');
          ret = clip.load(v, zone.create(newSite, v.zid));
        }
        return ret;
      }
    } catch (e) { }
    return v;
  },
  layoutChanged = function () {
    if (storage !== undefined) {
      var containersStr = "[", i, container;
      for (i = 0; i < containers.length; i++) {
        container = containers[i];
        if (container.split === true) {
          container = '{"split":true,"container":' + container.save() + '}';
        } else {
          container = container.save();
        }
        containersStr += container + ',';
      }
      containersStr = containersStr.substring(0, containersStr.length - 1) + ']';
      //notify.log("sContainersStr = " + containersStr);
      storage.store(storage.keys.LAYOUT, containersStr);
    }
  };

  function ContainerManager(binManager, transformer) {
    if (typeof this.addContainer != "function") {
      ContainerManager.prototype.addContainer = function (allowRemove, hideContainers, selected, parent, insertAfter) {
        if ((selected === undefined) || (selected === null)) {
          selected = { name: 'Areas' };
        }

        var newContainer = containerView.create(transformer, binManager, selected, allowRemove, hideContainers);
        if ((parent === undefined) || (parent === null)) {
          parent = $('<div class="qcontainer-parent">');
          if (insertAfter === undefined) {
            $(base).append(parent);
            containers.push(newContainer);
          } else {
            $(insertAfter.parent).after(parent);
            containers.splice(containers.indexOf(insertAfter.container) + 1, 0, newContainer);
          }
        }
        newContainer.draw(parent);

        $(newContainer).on('update', function (evt, props) {
          var containerRight = null, i = null;
          if (props.update == 'changepanel') {
            layoutChanged();
          } else if (props.update == 'addpanel') {
            this.addContainer(true, helper.desktop, null, null, { parent: parent, container: newContainer });
            layoutChanged();
          } else if (props.update == 'removepanel') {
            if (newContainer.pairedContainer) {
              newContainer.pairedContainer.container.removeClass('qcontainer-left');
              newContainer.pairedContainer.container.removeClass('qcontainer-right');
              newContainer.pairedContainer.split = false;
              newContainer.pairedContainer.pairedContainer = null;
              newContainer.remove();
              $(window).trigger('resize');
            } else {
              newContainer.remove();
              parent.remove();
            }
            containers.splice(containers.indexOf(newContainer), 1);
            layoutChanged();
          } else if ((props.update == 'splitpanel') && !newContainer.pairedContainer && (parent.width() > 1500)) {
            notify.log('Splitting panel');
            containerRight = this.addContainer(true, helper.desktop, null, parent);
            newContainer.container.addClass('qcontainer-left');
            containerRight.container.container.addClass('qcontainer-right');
            containers.splice(containers.indexOf(newContainer) + 1, 0, containerRight.container);

            newContainer.split = true;
            newContainer.pairedContainer = containerRight.container;
            containerRight.container.pairedContainer = newContainer;
            $(window).trigger('resize');
            layoutChanged();
          } else if (props.update == 'playclip') {
            for (i = 0; i < containers.length; i++) {
              if (containers[i].getState().name == 'Player') {
                containers[i].setState({ name: 'Player', play: props.clip, autoplay: true });
              }
            }
          }
        } .bind(this));
        return { container: newContainer, parent: parent };
      };
    }

    if (typeof this.load != "function") {
      ContainerManager.prototype.load = function (parent) {
        base = parent;
        var storedContainers = null, i = 0, left = null, right = null, allowRemove = null, temp = null;
        if (storage !== undefined) {
          temp = storage.fetch(storage.keys.VERSION);
          // Layout versioning so we can reset the layout if needbe
          if ((temp === undefined) || (temp != storage.version)) {
            notify.log('Upgrading layout version to ' + storage.version);
            storage.store(storage.keys.VERSION, storage.version);
          } else {
            storedContainers = storage.fetch(storage.keys.LAYOUT);
          }
        }
        if ((storedContainers === null) || (storedContainers === undefined)) {
          notify.log("No containers");
          if (helper.desktop === true) {
            // For desktop we are fixing Areas in the top left, Player in top right and Bin along the bottom
            left = this.addContainer(null, true, { name: 'Areas' });

            i++;
            right = this.addContainer(null, true, { name: 'Player' }, left.parent);
            left.container.container.addClass('qcontainer-left');
            right.container.container.addClass('qcontainer-right');
            containers.push(right.container);

            left.container.split = true;
            left.container.pairedContainer = right.container;
            right.container.pairedContainer = left.container;
            $(window).trigger('resize');

            this.addContainer(null, true, { name: 'Bin', bin: helper.DefaultBin });
          } else {
            //this.addContainer(false, false);
            this.addContainer(null, true, { name: 'Areas' });
            this.addContainer(null, true, { name: 'Player' });
            this.addContainer(null, true, { name: 'Bin', bin: helper.DefaultBin });
          }
        } else {
          //notify.log("ContainersStr = " + storedContainers);
          storedContainers = JSON.parse(storedContainers, reviver);
          for (i = 0; i < storedContainers.length; i++) {
            //allowRemove = helper.desktop ? null : i !== 0;
            allowRemove = null;
            if (storedContainers[i].split === undefined) {
              this.addContainer(allowRemove, true, storedContainers[i]);
            } else {
              left = this.addContainer(allowRemove, true, storedContainers[i].container);

              i++;
              //right = this.addContainer(helper.desktop ? null : true, helper.desktop, storedContainers[i], left.parent);
              right = this.addContainer(null, true, storedContainers[i], left.parent);
              left.container.container.addClass('qcontainer-left');
              right.container.container.addClass('qcontainer-right');
              containers.push(right.container);

              left.container.split = true;
              left.container.pairedContainer = right.container;
              right.container.pairedContainer = left.container;
              $(window).trigger('resize');
            }
          }
        }

        if (helper.desktop) {
          // Not using window height because we want the player to be half the height of the screen. 
          // Need to take off 120 to accomodate for the browsers toolbars. This isn't ideal but will do for now.
          temp = screen.height - 120;
          if (temp % 2 == 1) {
            temp++;
          }
          temp = (temp / 2) - 190; // 190 is the height of the constants. Should collect this from the css file.
          for (i = 0; i < containers.length; i++) {
            containers[i].setHeight(temp);
          }
        } else {
          temp = $(window).height() > $(window).width() ? $(window).width() : $(window).height();
          temp -= 220;
          containers[1].setHeight(temp); // Set Player height
        }
      };
    }
  }

  return {
    create: function (binManager, transformer) {
      return new ContainerManager(binManager, transformer);
    }
  };
});