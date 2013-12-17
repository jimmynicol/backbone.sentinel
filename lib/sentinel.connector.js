// @echo BANNER

// Backbone.Sentinel
// -----------------
// This top-level, singleton class is designed as a manager of Backbone views.
// Components, which are extensions of Backbone.View (either directly or via
// Backbone.Sentinel.Component) are registered with Sentinel which will reject
// anything with conflicting routes.

(function(root, factory){
  'use strict';

  // Set up Backbone appropriately for the environment. Start with AMD.
  if (typeof define === 'function' && define.amd) {
    define(['backbone', 'underscore'], function(Backbone, _){
      return factory(root, Backbone, _);
    });

  // Next for Node.js or CommonJS
  } else if (typeof exports !== 'undefined') {
    var _ = require('underscore'),
        Backbone = require('backbone');
    module.exports = factory(root, Backbone, _);

  // Finally, as a browser global.
  } else {
    root.Backbone.Sentinel = factory(root, root.Backbone, root._);
  }

}(this, function(root, Backbone, _){
  'use strict';

  var $ = Backbone.$,
      slice = [].slice;

  // @include sentinel.log.js
  // @include sentinel.js
  // @include sentinel.component.js

  Sentinel.VERSION = '/* @echo VERSION */';

  return Sentinel;
}));