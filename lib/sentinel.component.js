// Sentinel Component
// ------------------

// This class is a simple extension of the Backbone.View and should be used
// in roughly the same manner. The key exception is that you can nominate from
// within the class what routes it should respond to.
Backbone.Sentinel.Component = (function(Backbone, _){
  'use strict';

  function methodNotImplemented(method){
    throw 'Please implement the "' + method + '" method!';
  }

  var methods = _.extend(Backbone.SentinelLog, {
    // Override `_name` in the base class to help with logging, it will prefix
    // all log messages
    _name: 'Component',

    // Set this in the component if any of the above defaults need to be
    // overriden
    sentinelOptions: {},

    // Override the constructor to merge in the sentinel specific options
    constructor: function(){
      var _so = {};

      // Attach a reference to Sentinel
      this.sentinel = Backbone.Sentinel.getInstance();

      // Merge together the default options with the component specific ones
      _.extend(_so, Backbone.Sentinel.componentOptions, this.sentinelOptions);
      this.sentinelOptions = _so;

      // Run the parent Backbone.View constructor
      Backbone.View.apply(this, arguments);
    },

    render: function(){ methodNotImplemented('render'); }
  });

  return Backbone.View.extend(methods);
})(Backbone, _);

// Add ability to include mixins in extended classes
Backbone.Sentinel.Component.include = function(obj) {
  'use strict';
  _.extend(this.prototype, obj.prototype);
  return this;
};