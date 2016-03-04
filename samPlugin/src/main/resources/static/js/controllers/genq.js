/*global define, console*/
define(["views/notification", "helper", "models/transformer", "models/zone", "models/clip", "models/segment"],
function (notify, helper, transformer, zone, clip, segment) {
  "use strict";

  return {
    create: function (binManager, home) {
      console.log('Adding prototpye function');
      window.createPrototypeBin = function (xml) {
        console.log('GOT NEW PROTOTYPE! - ' + xml);
        var title = $(xml).find('property[name="Title"]').attr('value'),
        bin = binManager.createBin(title),
        segs = $(xml).find('essence_segment').map(function () {
          var zonePath = $(this).find('zonePath').text(),
          zoneId = $(this).find('zone_id').text(),
          clipId = $(this).find('clip_id').text(),
          inFrame = parseInt($(this).find('start_frame').text(), 10),
          frames = parseInt($(this).find('frames').text(), 10),
          site = transformer.create(zonePath === '' ? home.location : zonePath),
          segClip = clip.create(zone.create(site, zoneId), clipId),
          seg = segment.create(segClip);
          seg.intime = helper.framesToSeconds(inFrame, site.fps, site.flag1001); // MWMWMW Won't work if site hasn't been loaded previously
          seg.outtime = helper.framesToSeconds(inFrame + frames, site.fps, site.flag1001);
          segClip.loadProperties();
          return seg;
        }), i = null;
        console.log('created new bin: ' + title);

        for (i = 0; i < segs.length; i++) {
          bin.add(segs[i]);
        }
      };
      console.log('Added prototpye function, testing...');
      //window.createPrototypeBin('Hi');
    }
  };
});