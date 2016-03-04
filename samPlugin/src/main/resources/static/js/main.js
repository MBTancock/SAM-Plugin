/*global require, console*/
/*jslint browser: true*/


requirejs(["jquery", "helper", "models/transformer", "views/modals", "views/footer", "views/notification",
        "models/binmanager", "controllers/storage", "models/container", "controllers/genq"],
  function ($, helper, transformer, modals, footer, notify, binmanager, storage, container, genq) {
    "use strict";

    var location = document.location.host,
    home = transformer.create(location),
    clicked = false,
    remembered = (storage.fetch(storage.keys.REMEMBERME) == '1'),
    loginVid = document.getElementById('login-video'),
    allowSubmit = false;

    if (helper.mobile) {
      $('#base').addClass('mobile');
    } else {
      $('#base').addClass('desktop');
    }

    if (remembered) {
      $('#rememberme').prop('checked', true);
    }

    if (loginVid.networkState == 2) {
      loginVid.querySelectorAll('source')[0].addEventListener('error', function () {
        $('#login-image').removeClass('hide');
        $('#login-video').addClass('hide');
      });
    } else if (loginVid.networkState == 3) {
      $('#login-image').removeClass('hide');
      $(loginVid).addClass('hide');
    }

    if (helper.DEBUGGER) {
      window.onerror = function (err) {
        window.alert('Error: ' + err);
      };
    }

    $('#login').submit(function (evt) {
      notify.log('checked: ' + $('#rememberme').is(':checked'));
      if (!allowSubmit) {
        evt.preventDefault();
        $('#loggingIn').removeClass('hide');
        transformer.setCredentials($('#username').val(), $('#password').val());

        allowSubmit = true;
        home.load(function (errorMsg) {
          $('#loggingIn').addClass('hide');
          if (errorMsg !== undefined) {
            $('#loginFeedback').html(errorMsg);
            allowSubmit = false;
            storage.store(storage.keys.REMEMBERME, '0');
          } else if (remembered || !$('#rememberme').is(':checked')) {
            notify.log('Logged onto transformer at ' + home.location);

            $(window).on('click', function () {
              clicked = true;
            });
            setInterval(function () {
              if (clicked === true) {
                clicked = false;
              } else {
                document.location.reload();
              }
            }, helper.LOGOUT_TIMEOUT);

            var binManager = binmanager.create(),
            containerManager = container.create(binManager, home);

            if (window.onDragStarted !== undefined) {
              // If the website is hosted in a GenQ CEF environment then the onDragStarted function will be defined
              genq.create(binManager, home);
            }

            // Add elements to the dom
            modals.draw($('#base'));
            notify.draw($('#base'));
            footer.draw($('#base'));

            containerManager.load($('#base'));

            notify.log('application ready');
            $('.ui-loader').addClass('hide');
            $('#login').fadeOut(500);
            try {
              document.getElementById('login-video').pause();
            } catch (e) { }
            setTimeout(function () {
              $('#login').remove();
            }, 500);
          } else {
            $('#login').submit();
          }
        });
      } else {
        window.submitme = true;
      }
    });
  });