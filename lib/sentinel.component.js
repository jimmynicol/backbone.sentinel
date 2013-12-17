
// Sentinel Component
// ------------------

// This class is a simple extension of the Backbone.View and should be used
// in roughly the same manner. The key exception is that you can nominate from
// within the class what routes it should respond to.
function methodNotImplemented(method){
  throw new Error('Please implement the "' + method + '" method!');
}

var ComponentMethods = _.extend(Log, {
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
    this.sentinel = Sentinel.getInstance();

    // Merge together the default options with the component specific ones
    _.extend(_so, Sentinel.componentOptions, this.sentinelOptions);
    this.sentinelOptions = _so;

    // Run the parent Backbone.View constructor
    Backbone.View.apply(this, arguments);
  },

  render: function(){ methodNotImplemented('render'); }
});

var Component = Sentinel.Component = Backbone.View.extend(ComponentMethods);

// Add ability to include mixins in extended classes
Component.include = function(obj) {
  _.extend(this.prototype, obj.prototype);
  return this;
};