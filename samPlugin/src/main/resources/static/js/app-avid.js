/*global requirejs*/

// Configure loading modules from the lib directory,
// except for 'app' ones, which are in a sibling
// directory.
requirejs.config({
  baseUrl: 'js',
  paths: {
    'app': 'app',
    'bootstrap': 'vendor/bootstrap.min',
    'jquery': 'vendor/jquery-1.11.1.min',
    'jquery-ui': 'vendor/jquery-ui.min',
    'datatables': 'vendor/jquery.dataTables-1.10.5.min',
    'datatables-colReorder': 'vendor/dataTables.colReorder.min',
    'jquery-fullscreen': 'vendor/jquery.fullscreen.min',
    'bootstrap-editable': 'vendor/bootstrap-editable.min',
    'mse': 'vendor/media-source-portability'
  },
  'shim': {
    'bootstrap': {
      deps: ['jquery']
    },
    'bootstrap-editable': {
      deps: ['bootstrap']
    }
  }
});

// Start loading the main app file. Put all of
// your application logic in there.
requirejs(['main-avid']);