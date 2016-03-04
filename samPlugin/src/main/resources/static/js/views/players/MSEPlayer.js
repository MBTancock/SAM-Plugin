/*global define*/
/*jslint browser: true*/
define(["jquery", "views/notification", "helper", "mse", "vendor/segmentindex"], function ($, notify, helper) {
  "use strict";

  var kSlowEWMACoeff = 0.99,
  kFastEWMACoeff = 0.98,
  globalSlowBandwidth = 500000,
  globalFastBandwidth = 500000,
  videoRepSel = null,
  cooldown = 4,
  PREQ_LENGTH = 12,
  normalizeQualityLevel = function (manifest, stream) {
    return function () {
      var bitrateURL = manifest.url.substring(0, manifest.url.lastIndexOf("/") + 1) + stream.Url.replace("{bitrate}", this.Bitrate.toString()),
      ret = {
        'url': bitrateURL,
        'bandwidth': this.Bitrate
      };
      ret.init = {
        'url': bitrateURL.replace("{start time}", "init"),
        'value': null
      };
      return ret;
    };
  }, normalizeCodec = function () {
    return "avc1." + this.CodecPrivateData.substring(10, 16);
  },
  parseManifest = function (xml) {
    var result = {};
    result.Duration = parseInt($(xml).find('SmoothStreamingMedia').attr('Duration'), 10);
    result.isLive = ($(xml).find('SmoothStreamingMedia').attr('ISAIsLive') == 'TRUE');
    result.streams = $(xml).find('StreamIndex').map(function () {
      var stream = {
        Type: $(this).attr('Type'),
        Name: $(this).attr('Name'),
        Url: $(this).attr('Url'),
        DisplayWidth: parseInt($(this).attr('DisplayWidth'), 10),
        DisplayHeight: parseInt($(this).attr('DisplayHeight'), 10)
      };
      stream.qualityLevels = $(this).find('QualityLevel').map(function () {
        var ql = {
          Index: parseInt($(this).attr('Index'), 10),
          Bitrate: parseInt($(this).attr('Bitrate'), 10),
          FourCC: $(this).attr('FourCC'),
          MaxWidth: parseInt($(this).attr('MaxWidth'), 10),
          MaxHeight: parseInt($(this).attr('MaxHeight'), 10),
          SamplingRate: parseInt($(this).attr('SamplingRate'), 10),
          Channels: parseInt($(this).attr('Channels'), 10),
          CodecPrivateData: $(this).attr('CodecPrivateData')
        };
        return ql;
      });
      stream.chunks = $(this).find('c').map(function () {
        var chunk = {
          t: parseInt($(this).attr('t'), 10),
          d: parseInt($(this).attr('d'), 10)
        };
        return chunk;
      });
      return stream;
    });
    return result;
  },
  toUInt32 = function (buffer, offset) {
    return (buffer[offset] << 24) + (buffer[offset + 1] << 16) + (buffer[offset + 2] << 8) + (buffer[offset + 3]);
  },
  toUInt64 = function (buffer, offset) {
    return (buffer[offset] << 56) + (buffer[offset + 1] << 48) + (buffer[offset + 2] << 40) + (buffer[offset + 3] << 32) + (buffer[offset + 4] << 24) + (buffer[offset + 5] << 16) + (buffer[offset + 6] << 8) + (buffer[offset + 7]);
  },
  parseChunk = function (buffer, chunks) {
    var offset = 0, atom = null, val = null, i = null, lookahead = null, last = chunks.getOffset(chunks.getCount() - 1);
    while (offset < buffer.length) {
      atom = {
        "type": String.fromCharCode(buffer[offset + 4]) + String.fromCharCode(buffer[offset + 5]) + String.fromCharCode(buffer[offset + 6]) + String.fromCharCode(buffer[offset + 7]),
        "len": toUInt32(buffer, offset)
      };
      if (atom.len) {
        if (atom.type in { 'moof': '', 'traf': '' }) {
          offset += 8;
        } else if (atom.type == 'uuid') {
          if ((buffer[offset + 8] == 212) && (buffer[offset + 9] == 128) && (buffer[offset + 10] == 126) && (buffer[offset + 11] == 242)) {
            offset += 28;
            val = buffer[offset];
            offset++;
            for (i = 0; i < val; i++) {
              lookahead = { time: toUInt64(buffer, offset), duration: toUInt64(buffer, offset + 8) };

              while (last <= lookahead.time) {
                chunks.addSegmentBySize(lookahead.duration, lookahead.duration / 1e7);
                last += lookahead.duration;
              }
              offset += 16;
              //console.log('time: ' + lookaheads[i].time + '. dur: ' + lookaheads[i].duration);
            }
            break;
          } else {
            offset += atom.len;
          }
        } else {
          offset += atom.len;
        }
      }
    }
  },
  onRequestLoad = function (evt) {
    var xhr = evt.target,
          buf = xhr.buf,
          idx = xhr.idx,
          val = null,
          temp = null;
    buf.xhr = null;
    if (xhr.readyState != xhr.DONE) { return; }
    if (xhr.status >= 300) {
      notify.log('XHR failure, status=' + xhr.status);
      onRequestError.bind(this)(evt);
      return;
      //throw 'TODO: retry XHRs on failure';
    }

    try {
      if (buf.previousRep != xhr.rep) {
        //console.log('got change, currentRep: ' + buf.currentRep + '. buf.previousRep: ' + buf.previousRep + '. xhr.rep: ' + xhr.rep);
        buf.previousRep = xhr.rep;
        if (buf.updating) {
          buf.queue.push(buf.reps[xhr.rep].init.val);
        } else if (buf.appendBuffer) {
          buf.appendBuffer(buf.reps[xhr.rep].init.val);
        } else {
          buf.append(new Uint8Array(buf.reps[xhr.rep].init.val));
        }
      }

      val = new Uint8Array(xhr.response);
      if (buf.updating) {
        buf.queue.push(val);
      } else if (buf.appendBuffer) {
        buf.appendBuffer(val);
      } else {
        buf.append(new Uint8Array(val));
      }
    }
    catch (e) { notify.log('appendBuffer error: ' + e); }

    if (this.manifest !== null && this.manifest.isLive) {
      // Optimise for live clips
      // Parse the lookaheads from the chunk and add them to the chunk list
      parseChunk(val, buf.chunks);
    }

    if (xhr.callback !== undefined) {
      xhr.callback();
    }

    if ((this.fetchingRequests !== null) && (this.fetchingRequests[idx] !== undefined)) {
      notify.log('Done request ' + xhr.time + '. idx: ' + idx);
      temp = this.fetchingRequests[idx].indexOf(xhr.time);
      if (temp >= 0) {
        this.fetchingRequests[idx].splice(temp, 1);
        setTimeout(function () {
          this.nextRequest(idx);
        } .bind(this), 0);
      }
    }
  }, onRequestError = function (evt) {
    notify.log('video chunk Error');
    var xhr = evt.target;
    if (xhr.retries === undefined) {
      xhr.retries = 0;
    } else {
      xhr.retries++;
    }

    if (xhr.retries > 2) {
      if ((this.fetchingRequests !== null) && (this.fetchingRequests[xhr.idx] !== undefined)) {
        var temp = this.fetchingRequests[xhr.idx].indexOf(xhr.time);
        if (temp >= 0) {
          this.fetchingRequests[xhr.idx].splice(temp, 1);
          this.nextRequest(xhr.idx);
        }
      }
    } else {
      xhr.send();
    }
  }, onRequestProgress = function (evt) {
    var xhr = evt.target;
    if (xhr.lastTime !== null && evt.timeStamp != xhr.lastTime) {

      var bw = 8000 * (evt.loaded - xhr.lastSize) / (evt.timeStamp - xhr.lastTime);
      globalSlowBandwidth = kSlowEWMACoeff * globalSlowBandwidth + (1 - kSlowEWMACoeff) * bw;
      globalFastBandwidth = kFastEWMACoeff * globalFastBandwidth + (1 - kFastEWMACoeff) * bw;
      //notify.log('Calculated Bandwidths: ' + globalSlowBandwidth + ', ' + globalFastBandwidth);
    }
    xhr.lastTime = evt.timeStamp;
    xhr.lastSize = evt.loaded;
  },
  onXHRLoad = function (evt) {
    notify.log('Got Initialisation chunk');

    var xhr = evt.target,
    buf = xhr.buf,
    val = null;
    buf.xhr = null;
    if (xhr.readyState != xhr.DONE) { return; }
    if (xhr.status >= 300) {
      notify.log('XHR failure, status=' + xhr.status);
      //throw 'TODO: retry XHRs on failure';
      if (errorListener !== null) {
        errorListener("Failed to initialise player: " + xhr.status);
      }
    }
    val = new Uint8Array(xhr.response);
    if (xhr.add !== undefined) {
      buf.previousRep = xhr.rep;
      if (buf.updating) {
        buf.queue.push(val);
      } else if (buf.appendBuffer) {
        buf.appendBuffer(val);
      } else {
        buf.append(new Uint8Array(val));
      }
    }
    buf.reps[xhr.rep].init.val = val;
    //buf.last_init = reps[buf.currentRep].init;
    //buf.timestampOffset = 0; // -buf.reps[buf.currentRep].index.getStartTime(0);
    notify.log('Initialisation chunk appended');
  },
  onXHRError = function () {
    notify.log('Index chunk Error');
  },
  adapt = function (buf, src) {
    if (cooldown) {
      cooldown--;
    } else {
      var bestBw = 0;
      var best = buf.reps.length - 1; // The smallest bandwidth is the last in the list
      var gbw = Math.min(globalSlowBandwidth, globalFastBandwidth);
      for (var i = 0; i < buf.reps.length; i++) {
        var bw = buf.reps[i].bandwidth;
        if (bw > bestBw && bw < (0.85 * gbw - 128000)) {
          bestBw = bw;
          best = i;
        }
      }
      if (best != buf.currentRep) {
        buf.currentRep = best;
        notify.log('selecting new bitrate: ' + buf.reps[buf.currentRep].bandwidth + '. gbw: ' + gbw + '. buf.reps[buf.currentRep].init.val = ' + buf.reps[buf.currentRep].init.val);
        cooldown = 2;
        if ((buf.reps[buf.currentRep].init.val === null) || (buf.reps[buf.currentRep].init.val === undefined)) {
          var xhr = new XMLHttpRequest();
          xhr.buf = buf;
          xhr.rep = buf.currentRep;
          xhr.open("GET", buf.reps[buf.currentRep].init.url);
          src.zone.site.beforeSend(xhr);
          xhr.responseType = 'arraybuffer';
          //xhr.timeout = 8000;
          xhr.addEventListener('load', onXHRLoad);
          xhr.addEventListener('error', onXHRError);
          xhr.send();
        }
        return true;
      }
    }
  };

  /*jslint nomen: true */

  /**
  * Represents a MSEPlayer Player
  * @constructor
  */
  function MSEPlayer(element) {
    var src = null, currentTime = null, loadedListener = null, errorListener = null;

    this.__defineGetter__('element', function () { return element; });
    this.__defineGetter__('loadedListener', function () { return loadedListener; });
    this.__defineGetter__('errorListener', function () { return errorListener; });

    this.loaded = false;
    this.preQOnLoaded = [];

    this.__defineGetter__('src', function () { return src; });
    this.__defineSetter__('src', function (clip) {
      this.loaded = false;
      src = clip;

      if (this.element.mse !== undefined) {
        this.curRequests = [];
        this.element.mse.removeEventListener('error', this.onVideoError);
        this.element.mse.removeEventListener('sourceopen', this.mediaSourceOpen);
        this.element.mse.removeEventListener('webkitsourceopen', this.mediaSourceOpen);
        this.element.mse.removeEventListener('sourceended', this.mediaSourceEnded);
        this.element.mse.removeEventListener('webkitsourceended', this.mediaSourceEnded);
        this.element.mse.removeEventListener('sourceclosed', this.mediaSourceClosed);
        this.element.mse.removeEventListener('webkitsourceclosed', this.mediaSourceClosed);
      }
      var mse = new MediaSource();
      mse.addEventListener('error', this.onVideoError);
      mse.addEventListener('sourceopen', this.mediaSourceOpen.bind(this));
      mse.addEventListener('webkitsourceopen', this.mediaSourceOpen.bind(this));
      mse.addEventListener('sourceended', this.mediaSourceEnded.bind(this));
      mse.addEventListener('webkitsourceended', this.mediaSourceEnded.bind(this));
      mse.addEventListener('sourceclosed', this.mediaSourceClosed.bind(this));
      mse.addEventListener('webkitsourceclosed', this.mediaSourceClosed.bind(this));
      mse.attachTo(this.element);
      this.element.mse = mse;
      this.manifest = null;

      // Reset the bandwidths when playing clips in order for fast startup
      globalSlowBandwidth = 500000;
      globalFastBandwidth = 500000;

      var xhr = new XMLHttpRequest();
      xhr.open('GET', src.imgUri(), true);
      xhr.responseType = 'arraybuffer';
      //xhr.timeout = 8000;
      xhr.addEventListener('load', function (evt) {
        var arr = new Uint8Array(evt.target.response);
        var raw = String.fromCharCode.apply(null, arr);
        var b64 = btoa(raw);
        this.element.setAttribute('poster', 'data:image/jpeg;base64,' + b64);
      } .bind(this));
      src.zone.site.beforeSend(xhr);
      xhr.send();

      $.ajax({
        type: 'GET',
        url: src.smoothStreamUri(),
        dataType: 'xml',
        beforeSend: src.zone.site.beforeSend,
        tryCount: 0,
        retryLimit: 3,
        //timeout: 8000,
        success: function (xml) {
          notify.log('Got SS manifest');
          var manifest = parseManifest(xml);
          if (manifest === null) {
            notify.log('Error parsing SS manifest');
          } else {
            manifest.url = src.smoothStreamUri();
            notify.log('Parsed SS manifest');
            this.manifest = manifest;
            this.videoReady();
          }
        } .bind(this),
        error: function (xhr, textStatus, err) {
          if (textStatus == 'timeout') {
            this.tryCount++;
            if (this.tryCount < this.retryLimit) {
              $.ajax(this);
              return;
            }
          }

          if (errorListener !== null) {
            errorListener("Failed play clip: " + xhr.status);
            notify.log('Failed to fetch clip manifest: ' + src.smoothStreamUri());
          }
        }
      });
      //element.load();
    });

    this.__defineGetter__('currentTime', function () {
      if (currentTime === null) {
        var time = this.element.currentTime,
        frame = src.zone.site.oneFrame();
        if (time < frame) {
          time = 0;
        } else {
          time = time - frame;
        }
        return time;
      } else {
        return currentTime;
      }
    });
    this.__defineSetter__('currentTime', function (val) {
      notify.log('Setting players time to ' + val);
      this.curRequests = [];
      currentTime = val;
      this.preQ(val, val + 1, function () {
        try {
          currentTime = null;
          notify.log('Setting time to: ' + (val + src.zone.site.oneFrame()).toString());
          this.element.currentTime = val + src.zone.site.oneFrame(); // This is to account for the html 5 video player being off by one frame
        } catch (e) { notify.log('MSE set currentTime error: ' + e.toString()); }
      } .bind(this));
    });

    this.__defineGetter__('volume', function () { return this.element.volume; });
    this.__defineSetter__('volume', function (val) {
      this.element.volume = val;
    });

    this.__defineSetter__('onload', function (val) {
      loadedListener = val;
    });
    this.__defineSetter__('onerror', function (val) {
      errorListener = val;
    });

    if (typeof this.play != "function") {
      MSEPlayer.prototype.play = function () {
        notify.log('Playing');
        this.element.play();
      };
    }

    if (typeof this.pause != "function") {
      MSEPlayer.prototype.pause = function () {
        notify.log('Pausing');
        this.element.pause();
      };
    }

    if (typeof this.onSeeking != "function") {
      MSEPlayer.prototype.onSeeking = function () {
        notify.log('onSeeking');
      };
    }

    if (typeof this.onSeeked != "function") {
      MSEPlayer.prototype.onSeeked = function () {
        notify.log('onSeeked');
        if (this.loadedListener !== null) {
          this.loadedListener();
        }
      };
    }

    if (typeof this.onVideoError != "function") {
      MSEPlayer.prototype.onVideoError = function () {
        notify.log('onVideoError');
        if (this.errorListener !== null) {
          this.errorListener();
        }
      };
    }

    if (typeof this.onVideoLoaded != "function") {
      MSEPlayer.prototype.onVideoLoaded = function () {
        notify.log('onVideoLoaded');
        if (this.loadedListener !== null) {
          this.loadedListener();
        }
      };
    }

    if (typeof this.onVideoDataLoaded != "function") {
      MSEPlayer.prototype.onVideoDataLoaded = function () {
        notify.log('onVideoDataLoaded: ' + this.currentTime);
        this.loaded = true;
        for (var i = 0; i < this.preQOnLoaded.length; i++) {
          var val = this.preQOnLoaded[i];
          this.preQ(val.intime, val.outtime, val.callback);
        }
        this.preQOnLoaded = [];
        this.preQ(this.currentTime, this.currentTime + PREQ_LENGTH);
      };
    }

    if (typeof this.mediaSourceOpen != "function") {
      MSEPlayer.prototype.mediaSourceOpen = function () {
        notify.log('mediaSourceOpen');
        this.mediaSourceReady = true;
        this.videoReady();
      };
    }

    if (typeof this.mediaSourceEnded != "function") {
      MSEPlayer.prototype.mediaSourceEnded = function () {
        notify.log('mediaSourceEnded');
      };
    }


    if (typeof this.mediaSourceClosed != "function") {
      MSEPlayer.prototype.mediaSourceClosed = function () {
        notify.log('mediaSourceClosed');
      };
    }

    if (typeof this.videoReady != "function") {
      MSEPlayer.prototype.videoReady = function () {
        if ((this.manifest !== null) && (this.mediaSourceReady === true)) {
          var i = 0, j = 0, stream = null, reps = null, mime = null, codecs = null, buf = null, xhr = null,
        updateBuffer = function () {
          if (this.queue.length) {
            try {
              this.appendBuffer(this.queue.shift());
            } catch (e) { notify.log('appendBuffer error: ' + e); }
          }
        };

          if (this.element.mse.sourceBuffers.length) {
            for (i = 0; i < this.element.mse.sourceBuffers.length; i++) {
              this.element.mse.sourceBuffers[i].active = true;
            }
            return;
          }
          this.buffers = [];

          this.element.mse.duration = this.manifest.Duration / 10000000;
          notify.log('Duration: ' + this.element.mse.duration);

          try {
            for (i = 0; i < this.manifest.streams.length; i++) {
              stream = this.manifest.streams[i];
              if (stream.Type == "audio" && stream.Name != "CH 1-2" && stream.Name != "CH") { // MWMWMW For now hard code to channels 1 and 2
                continue;
              }

              reps = stream.qualityLevels.map(normalizeQualityLevel(this.manifest, stream));
              mime = stream.Type + "/mp4";
              codecs = mime.indexOf('video') >= 0 ? stream.qualityLevels.map(normalizeCodec)[0] : "mp4a.40.2";
              buf = this.element.mse.addSourceBuffer(mime + '; codecs="' + codecs + '"');
              this.buffers.push(buf);

              buf.reps = reps;    // Individual normalized representations
              buf.chunks = new player.dash.SegmentIndex();
              buf.chunks.populateIdx(stream.chunks);
              buf.currentRep = helper.adobe ? 0 : reps.length - 1; // Index into reps[]
              buf.active = true;  // Whether this buffer has reached EOS yet
              buf.queue = [];
              if (buf.appendBuffer) {
                buf.addEventListener('updateend', updateBuffer.bind(buf));
              }

              buf.resetReason = null; // Reason for performing last call to reset().
              // Used for better QoE when refilling after reset().

              // Fetch init
              xhr = new XMLHttpRequest();
              xhr.buf = buf;
              xhr.open("GET", reps[buf.currentRep].init.url);
              this.src.zone.site.beforeSend(xhr);
              xhr.responseType = 'arraybuffer';
              //xhr.timeout = 8000;
              xhr.rep = buf.currentRep;
              xhr.add = true;
              xhr.addEventListener('load', onXHRLoad);
              xhr.addEventListener('error', onXHRError);
              xhr.send();

              // MSE requires that the first video and audio chunk in the stream are appended in order for the video to play
              this.preQ(0, 1);
            }
          }
          catch (err) {
            if (err.name == "QuotaExceededError") {
              notify.log(err.message);
            }
            else {
              throw err;
            }
          }
        }
      };
    }

    this.curRequests = [];
    this.fetchingRequests = [];
    var kMaxConcurrentRequests = 4;

    if (typeof this.nextRequest != "function") {
      MSEPlayer.prototype.nextRequest = function (idx) {
        var requests = null,
        fetching = null,
        buf = null,
        xhr = null,
        req = null,
        nextIdx = null,
        nextTime = Number.MAX_VALUE,
        curRequest = null;

        for (var i = 0; i < this.curRequests.length; i++) {
          curRequest = this.curRequests[i];
          if (curRequest !== undefined && curRequest.length > 0 && curRequest[0].time < nextTime) {
            nextTime = curRequest[0].time;
            nextIdx = i;
          }
        }
        if (nextIdx !== null) {
          requests = this.curRequests[nextIdx];
          fetching = this.fetchingRequests[nextIdx];
          buf = this.element.mse.sourceBuffers[nextIdx];

          if (requests !== undefined && requests.length > 0 && fetching.length < kMaxConcurrentRequests) {
            adapt(buf, this.src);
            req = requests[0].time;
            xhr = new XMLHttpRequest();
            xhr.open("GET", buf.reps[buf.currentRep].url.replace("{start time}", req.toString()));
            this.src.zone.site.beforeSend(xhr);
            xhr.responseType = 'arraybuffer';
            xhr.buf = buf;
            xhr.idx = nextIdx;
            xhr.time = req;
            xhr.rep = buf.currentRep;
            //xhr.timeout = 15000;
            xhr.lastTime = null;
            xhr.lastSize = null;
            xhr.callback = requests[0].callback;
            xhr.addEventListener('progress', onRequestProgress);
            xhr.addEventListener('load', onRequestLoad.bind(this));
            xhr.addEventListener('error', onRequestError.bind(this));
            notify.log('Requesting: ' + req + '. Bitrate: ' + buf.reps[buf.currentRep].bandwidth + '. fetching: ' + fetching.length);
            fetching.push(req);
            requests.splice(0, 1);
            xhr.send();
          }
        }
      };
    }

    if (typeof this.makeRequest != "function") {
      MSEPlayer.prototype.makeRequest = function (time, idx, callback) {
        //notify.log('request: ' + time);
        var req = this.curRequests[idx], fetching = this.fetchingRequests[idx],
        i = 0, add = true;
        if (req === undefined) {
          this.curRequests[idx] = [{ time: time, callback: callback}];
          this.fetchingRequests[idx] = [];
          //notify.log('New requests for ' + idx + '. time: ' + time);
        } else {
          for (i = 0; i < req.length; i++) {
            //notify.log('looking for request ' + time + '. found: ' + req[i]);
            if (req[i].time == time) {
              add = false;
              break;
            }
          }
          if (add) {
            for (i = 0; i < fetching.length; i++) {
              //notify.log('looking for request ' + time + '. found: ' + fetching[i]);
              if (fetching[i] == time) {
                add = false;
                break;
              }
            }
          }
          if (add) {
            //notify.log('add requests for ' + idx + '. time: ' + time);
            req.push({ time: time, callback: callback });
          }
        }

        this.nextRequest(idx);
      };
    }

    if (typeof this.preQ != "function") {
      MSEPlayer.prototype.preQ = function (intime, outtime, callback) {
        var i = 0, j = 0, buf = null, rep = null, inSegIdx = null, outSegIdx = null, fixedTime = null, time = null, outSegTime = null;

        if (this.loaded) {
          if (intime === undefined) {
            intime = this.currentTime;
            outtime = intime + PREQ_LENGTH;
          }

          if (outtime > this.src.duration) {
            outtime = this.src.duration;
          }
          //notify.log('PreQing: ' + intime + ' - ' + outtime);
          for (time = intime; time < outtime; ) {
            outSegTime = time + 1;
            for (i = 0; i < this.element.mse.sourceBuffers.length; i++) {
              buf = this.element.mse.sourceBuffers[i];
              if (!buf.active) {
                notify.log('buf ' + i + ' not active. time = ' + this.currentTime);
                buf.reps = this.buffers[i].reps;    // Individual normalized representations
                buf.currentRep = this.buffers[i].currentRep; // Index into reps[]
                buf.active = true;  // Whether this buffer has reached EOS yet
                buf.queue = [];
              }

              rep = buf.reps[buf.currentRep];
              inSegIdx = Math.max(0, buf.chunks.findForTime(time));
              outSegIdx = Math.max(0, buf.chunks.findForTime(outSegTime));
              if (this.manifest.isLive && (inSegIdx == outSegIdx)) {
                fixedTime = Math.floor(time);
                if (!this.isBuffered(fixedTime, buf.buffered)) {
                  //notify.log('Live playin. Time: ' + time + '. fixedTime: ' + fixedTime);
                  this.makeRequest(fixedTime * 10000000, i, callback);
                } else if (callback !== undefined) {
                  callback();
                }
              } else {
                for (j = inSegIdx; j <= outSegIdx; j++) {
                  fixedTime = (Math.round(buf.chunks.getStartTime(j) * 100) + 1) / 100;
                  if (!this.isBuffered(fixedTime, buf.buffered)) {
                    this.makeRequest(buf.chunks.getOffset(j), i, callback);
                  } else if (callback !== undefined) {
                    callback();
                  }
                }
              }
            }
            time = outSegTime;
          }
        } else {
          this.preQOnLoaded.push({ intime: intime, outtime: outtime, callback: callback });
        }
      };
    }

    if (typeof this.draw != "function") {
      MSEPlayer.prototype.draw = function (parent) {
        //this.element.setAttribute("controls", "");
        $(this.element).addClass('qplayer');
        this.element.addEventListener('seeking', this.onSeeking.bind(this));
        this.element.addEventListener('seeked', this.onSeeked.bind(this));
        this.element.addEventListener('error', this.onVideoError.bind(this));
        this.element.addEventListener('loadeddata', this.onVideoLoaded.bind(this));
        this.element.addEventListener('loadedmetadata', this.onVideoDataLoaded.bind(this));

        parent.append($(this.element));
      };
    }

    if (typeof this.height != "function") {
      MSEPlayer.prototype.height = function () {
        return $(this.element).height();
      };
    }

    if (typeof this.width != "function") {
      MSEPlayer.prototype.width = function () {
        return $(this.element).width();
      };
    }

    if (typeof this.setHeight != "function") {
      MSEPlayer.prototype.setHeight = function (val) {
        $(this.element).css('max-height', val);
      };
    }

    if (typeof this.isBuffered != "function") {
      MSEPlayer.prototype.isBuffered = function (t, b) {
        if (t === undefined) {
          t = this.element.currentTime;
        }
        if (b === undefined) {
          b = this.element.buffered;
        }

        var ret = false, i = 0, s = 0, e = 0;
        for (i = 0; i < b.length; i++) {
          s = b.start(i);
          e = b.end(i);
          //notify.log('buffered at ' + s + ' - ' + e + '. looking for ' + t);
          if ((s <= t) && (t <= e)) {
            ret = true;
            break;
          }
        }
        return ret;
      };
    }
  }
  /*jslint nomen: false */

  return {
    /** 
    * Creates a new MSEPlayer Player
    */
    create: function () {
      var ret = null, videoElement = document.createElement('video');
      if (videoElement && videoElement.canPlayType && videoElement.canPlayType('video/mp4; codecs="avc1.4d401E, mp4a.40.2"') &&
        (window.MediaSource || window.WebKitMediaSource)) {
        ret = new MSEPlayer(videoElement);
        notify.log('MSE supported');
      } else {
        notify.log('MSE not supported');
      }
      return ret;
    }
  };
});