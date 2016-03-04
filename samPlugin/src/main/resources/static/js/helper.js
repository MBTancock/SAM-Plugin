/*global define, console*/
/*jslint browser: true*/
define(["jquery"], function ($) {
  "use strict";
  window.jQuery = $;

  var isiPad = navigator.userAgent.match(/iPad/i) !== null,
  isiPhone = navigator.userAgent.match(/iPhone/i) !== null,
  isAndroid = navigator.userAgent.match(/android/i) !== null,
  isMobile = isiPad || isiPhone || isAndroid,
  isAdobe = window.__adobe_cep__ !== undefined,
  isDesktop = !(isAdobe || isMobile),
  debug = false;
  if (location.href.indexOf('dev') >= 0 || isAdobe) {
    debug = true;
    console.log('entering debug mode');
  }

  if (isMobile) {
    // MWMWMW Not ideal but this fixes the bug where you shrink the height of the body and the top bit becomes in accessible
    // It means you get an extra scroll bar on mobile view
    //$('#base').css({ 'overflow-y': 'visible', 'padding-bottom': '60px' });
    $('body').css('height', '1000vh');
  } //else {
  //$('body').css('overflow', 'visible'); // Fixes problem where page wouldn't scroll when you drag elements to the top / bottom of screen

  return {
    /** 
    * Creates a new Area object and loads it's resources 
    * @param {string} name - The name of the area
    */
    DEBUGGER: debug,
    DefaultBin: 'Go! Bin',
    iPad: isiPad,
    iPhone: isiPhone,
    android: isAndroid,
    mobile: isMobile,
    adobe: isAdobe,
    desktop: isDesktop,
    LAYOUT_KEY: "layout",
    LOGOUT_TIMEOUT: debug ? 3000000 : 300000,
    s4: function () {
      return Math.floor((1 + Math.random()) * 0x10000)
                 .toString(16)
                 .substring(1);
    },
    popoverTrigger: function () { return isMobile ? 'hover' : 'focus'; },
    guid: function () {
      return this.s4() + this.s4() + '-' + this.s4() + '-' + this.s4() + '-' +
             this.s4() + '-' + this.s4() + this.s4() + this.s4();
    },
    formatDate: function (raw) {
      var d = new Date(raw), millisecs;
      if (d == "Invalid Date") {
        millisecs = parseInt(raw, 10);
        d = new Date(millisecs);
        if (d == "Invalid Date") {
          return '';
        }
      }
      return d.toLocaleString();
    },
    secondsToTimecode: function (time, fps) {
      //console.log('FORMATTING: ' + time);
      var hours, minutes, seconds, frames, result;
      hours = Math.floor(time / 3600) % 24;
      minutes = Math.floor(time / 60) % 60;
      seconds = Math.floor(time % 60);
      frames = Math.floor(((time % 1) * fps).toFixed(3));

      result = (hours < 10 ? "0" + hours : hours) + ":" + (minutes < 10 ? "0" + minutes : minutes) + ":" + (seconds < 10 ? "0" + seconds : seconds) + ":" + (frames < 10 ? "0" + frames : frames);

      return result;
    },
    timecodeToSeconds: function (hh_mm_ss_ff, fps) {
      var tc_array = hh_mm_ss_ff.split(":");
      var tc_hh = parseInt(tc_array[0], 10);
      var tc_mm = parseInt(tc_array[1], 10);
      var tc_ss = parseInt(tc_array[2], 10);
      var tc_ff = parseInt(tc_array[3], 10);
      var tc_in_seconds = (tc_hh * 3600) + (tc_mm * 60) + tc_ss + (tc_ff / fps);
      return tc_in_seconds;
    },
    framesToSeconds: function (frames, fps, flag1001) {
      var ret = null;
      if (flag1001) {
        ret = (frames * 1001) / (fps * 1000);
      } else {
        ret = frames / fps;
      }
      return ret;
    },
    secondsToFrames: function (time, fps, flag1001) {
      var ret = null;
      if (flag1001) {
        ret = (time * fps * 1000) / 1001;
      } else {
        ret = time * fps;
      }
      return ret;
    },
    escape: function (json) {
      return json.replace(/(\&)/g, '\\&')
                 .replace(/(\\)/g, '\\\\');
    },
    quantelVideoFormatToAdobe: function (videoFormat) {
      var ret = null;
      if (videoFormat == '710') { //ntsc_dv50i
        ret = 'DVCPRO 50 NTSC';
      } else if (videoFormat == '711') { //ntsc_dv25i
        ret = 'DVCPRO 25 NTSC';
        //} else if (videoFormat == '712') { //ntsc_dvh25i NOT SUPPORTED
        //ret = '';
      } else if (videoFormat == '86') { //ntsc_imx30i
        ret = 'IMX 30 NTSC';
      } else if (videoFormat == '87') { //ntsc_imx40i
        ret = 'IMX 40 NTSC';
      } else if (videoFormat == '88') { //ntsc_imx50i
        ret = 'IMX 50 NTSC';
      } else if (videoFormat == '89') { //pal_imx30i
        ret = 'IMX 30 PAL';
      } else if (videoFormat == '90') { //pal_imx40i
        ret = 'IMX 40 PAL'; // 'IMX 40 PAL';
      } else if (videoFormat == '91') { //pal_imx50i
        ret = 'IMX 50 PAL';
      } else if (videoFormat == '512') { //pal_dv100_720p
        ret = 'DVCPRO HD 720p 50';
      } else if (videoFormat == '530') { //pal_dv100_1080i
        ret = 'DVCPRO HD 1080i 50';
      } else if (videoFormat == '600') { //ntsc_avci50_1080i
        ret = 'AVCI 50 1080i 60';
      } else if (videoFormat == '601') { //ntsc_avci100_1080i
        ret = 'AVCI 100 1080i 60';
      } else if (videoFormat == '602') { //ntsc_avci50_720p
        ret = 'AVCI 50 720p 60';
      } else if (videoFormat == '603') { //ntsc_avci100_720p
        ret = 'AVCI 100 720p 60';
      } else if (videoFormat == '610') { //pal_avci50_1080i
        ret = 'AVCI 50 1080i 50';
      } else if (videoFormat == '611') { //pal_avci100_1080i
        ret = 'AVCI 100 1080i 50';
      } else if (videoFormat == '612') { //pal_avci50_720p
        ret = 'AVCI 50 720p 50';
      } else if (videoFormat == '613') { //pal_avci100_720p
        ret = 'AVCI 100 720p 50';
      } else if (videoFormat == '620') { //pal_avci100_1080p
        ret = 'AVCI 100 1080p 50';
      } else if (videoFormat == '621') { //pal_avci200_1080p
        ret = 'AVCI 200 1080p 50';
      } else if (videoFormat == '622') { //ntsc_avci100_1080p
        ret = 'AVCI 100 1080p 60';
      } else if (videoFormat == '623') { //ntsc_avci200_1080p
        ret = 'AVCI 200 1080p 60';
      } else if (videoFormat == '700') { //pal_dv50i
        ret = 'DVCPRO 50 PAL';
      } else if (videoFormat == '701') { //pal_dv25i
        ret = 'DVCPRO 25 PAL';
        //} else if (videoFormat == '702') { //pal_dvh25i NOT SUPPORTED
        //ret = '';
      } else if (videoFormat == '280') { //ntsc_dv100_720p
        ret = 'DVCPRO HD 720p 60';
      } else if (videoFormat == '281') { //ntsc_dv100_1080i
        ret = 'DVCPRO HD 1080i 60';
      }

      return ret;
    },
    quantelAudioFormatToAdobe: function (audioFormat) {
      var ret = null;
      if (audioFormat == 265) { //ntsc_4channel_16bit
        ret = '4channel 16bit';
      } else if (audioFormat == 269) { //ntsc_4channel_24bit
        ret = '4channel 24bit';
      } else if (audioFormat == 270) { //ntsc_8channel_16bit
        ret = '8channel 16bit';
      } else if (audioFormat == 271) { //ntsc_8channel_24bit
        ret = '8channel 24bit';
      } else if (audioFormat == 521) { //pal_4channel_16bit
        ret = '4channel 16bit';
      } else if (audioFormat == 522) { //pal_4channel_24bit
        ret = '4channel 24bit';
      } else if (audioFormat == 523) { //pal_8channel_16bit
        ret = '8channel 16bit';
      } else if (audioFormat == 524) { //pal_8channel_24bit
        ret = '8channel 24bit';
      }
      return ret;
    }
  };
});

