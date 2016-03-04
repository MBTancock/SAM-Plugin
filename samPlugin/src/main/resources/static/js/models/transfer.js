/*global define, console*/
define(["jquery", "views/notification", "models/transformer"], function ($, notify, transformer) {
  "use strict";
  var statuses = ['started', 'cancelled', 'complete', 'error', 'rendering'];

  var Download = function (url, filename, filepath, thumbUrl, duration) {
    this.progress = null;
    this.status = null;
    this.type = 'Download';

    this.getId = function () {
      return filename;
    };

    this.title = function () {
      return filename;
    };

    this.getStatusText = function () {
      return statuses[this.status];
    };

    this.getProgressText = function () {
    };

    this.getThumb = function () {
      return thumbUrl;
    };

    this.getDuration = function () {
      return duration;
    };

    this.start = function () {
      this.status = 0;

      filename = filename.replace(/(\\\/)/g, '');
      notify.log("Downloading: " + url);
      //window.open(url, '_self');
      var http = require('http'),
      fs = require('fs'),
      file = fs.createWriteStream(filepath + filename);
      file.on('open', function () {
        var start = url.indexOf(':') + 3,
        //var start = url.indexOf('@') + 1,
        end = url.indexOf('/', start),
        options = {
          host: url.substring(start, end),
          port: '80',
          path: url.substring(end),
          method: 'GET',
          auth: transformer.getAuth()
        };
        notify.log('Requesting host: ' + options.host + '. path: ' + options.path);
        var req = http.request(options, function (response) {
          notify.log("got http request");
          var contentLength = 1, totalWritten = 0;

          if (response.statusCode == 200) {
            if ('content-length' in response.headers) {
              contentLength = response.headers['content-length'];
              notify.log('Got length: ' + contentLength);
            }
            response.addListener('data', function (chunk) {
              if (this.status == 1) {
                req.abort();
                try {
                  notify.log('Deleting: ' + filepath + filename);
                  fs.unlink(filepath + filename);
                } catch (err) {
                  notify.log('Error deleting cancelled download. ' + err);
                }
              } else {
                file.write(chunk);
                totalWritten += chunk.length;
                this.progress = (100.0 * totalWritten) / contentLength;
                //notify.log('Wrote ' + chunk.length + ' bytes. Total: ' + totalWritten + ' bytes. Progress: ' + this.progress + '%');
              }
            } .bind(this));

            response.addListener('end', function () {
              notify.log('got response end');
              if (this.status === 0) {
                this.status = 2;
                file.end();
              }
              $(this).trigger('end', { fullpath: filepath + filename });
            } .bind(this));
          } else {
            notify.log("HTTP Error: " + response.statusCode);
            this.status = 3;
            $(this).trigger('end');
          }
        } .bind(this));

        req.on('error', function (e) {
          notify.log('HTTP error: ' + e.toString());
          this.status = 3;
          $(this).trigger('end');
        } .bind(this));

        req.end();
      } .bind(this));

      file.on('error', function (e) {
        notify.log('File error: ' + e.toString());
        this.status = 3;
        $(this).trigger('end');
      } .bind(this));
    };

    this.cancel = function () {
      this.status = 1;
    };
  };

  var Upload = function (id, filepath, clip, thumbUrl, duration) {
    this.progress = null;
    this.status = null;
    this.type = 'Upload';

    this.getId = function () {
      return id;
    };

    this.title = function () {
      return clip.title;
    };

    this.getStatusText = function () {
      return statuses[this.status];
    };

    this.getThumb = function () {
      return thumbUrl;
    };

    this.getDuration = function () {
      return duration;
    };

    this.start = function () {
      this.status = 0;

      var uploadUrl = clip.transformer + '/quantel/homezone/restore/' + clip.area + '/' + id + '/restore.xml',
      xml = '<clip_prototype version="1.0"><isa_clip_properties><area id="' + clip.area + '" />';
      if (clip.title !== null) {
        xml += '<property name="Title" value="' + clip.title + '"/>';
      }
      if (clip.owner !== null) {
        xml += '<property name="Owner" value="' + clip.owner + '"/>';
      }
      if (clip.category !== null) {
        xml += '<property name="Category" value="' + clip.category + '"/>';
      }
      xml += '</isa_clip_properties></clip_prototype>';

      notify.log('Publish to ' + uploadUrl + '.\n ' + xml);

      $.ajax({
        type: 'POST',
        data: xml,
        url: uploadUrl,
        beforeSend: transformer.beforeSend,
        timeout: 20000,
        success: function () {
          notify.log("Send attributes success!");

          var fs = require('fs');
          var http = require('http');
          var file = fs.createReadStream(filepath + id + '.mxf');
          file.on('open', function () {
            var options = {
              host: clip.transformer.substring(clip.transformer.indexOf(':') + 3),
              port: '80',
              path: '/quantel/homezone/restore/' + encodeURIComponent(clip.area) + '/' + id + '/restore.mxf',
              method: 'PUT',
              auth: transformer.getAuth()
            };
            var req = http.request(options, function (response) {
              notify.log("got http response: " + response.statusCode);
              if (response.statusCode == 200) {
                response.addListener('end', function () {
                  notify.log('finished uploading.');
                  if (this.status === 0) {
                    this.status = 2;
                  }
                  $(this).trigger('end');
                } .bind(this));
              } else {
                this.status = 3;
                $(this).trigger('end');
              }
            } .bind(this)),
            totalWritten = 0,
            contentLength = fs.statSync(filepath + id + '.mxf').size;
            file.on('data', function (chunk) {
              if (this.status == 1) {
                req.abort();
                $(this).trigger('end');
              } else {
                totalWritten += chunk.length;
                this.progress = (100.0 * totalWritten) / contentLength;
                //console.log('Sending file. Wrote ' + chunk.length + ' bytes. Total: ' + totalWritten + ' bytes. Progress: ' + this.progress + '%');
              }
            } .bind(this));
            file.pipe(req);
          } .bind(this));
        } .bind(this),
        error: function (xhr, textStatus) {
          notify.log("Publish error: " + textStatus + ", " + xhr.toString());
          this.status = 3;
          $(this).trigger('end');
        } .bind(this)
      });
    };

    this.cancel = function () {
      this.status = 1;
    };
  };

  return {
    createDownload: function (url, filename, filepath, thumbUrl, duration) {
      return new Download(url, filename, filepath, thumbUrl, duration);
    },
    createUpload: function (id, filepath, clip, thumbUrl, duration) {
      return new Upload(id, filepath, clip, thumbUrl, duration);
    }
  };
});