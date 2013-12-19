//     Backbone.Sentinel v0.0.1
//     Copyright (c) 2013
//     James Nicol <james@fundly.com>
//     Distributed under MIT license
//     git@github.com:jimmynicol/backbone.sentinel.git




// Backbone.Sentinel
// -----------------
// This top-level, singleton class is designed as a manager of Backbone views.
// Components, which are extensions of Backbone.View (either directly or via
// Backbone.Sentinel.Component) are registered with Sentinel which will reject
// anything with conflicting routes.

(function(root, factory){
  'use strict';

  // AMD: import Backbone and underscore into the factory
  if (typeof define === 'function' && define.amd) {
    define(['backbone', 'underscore'], function(Backbone, _){
      return factory(root, Backbone, _);
    });

  // CommonJS: for Node.js or Browserify
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
      slice = [].slice; // grab the slice method off the Array prototype

  // Sentinel Log
  // ------------
  // All purpose logging utility that is mixed into the needed classes
  var Log = {
  
    logDebugMode: function(){
      if (window){
        return (/log=debug/).test(window.location.search);
      }
      return false;
    },
  
    log: function(){
      if (console && this.logDebugMode()){
        if (this._name){
          var args  = [this._name + ':'].concat(slice.call(arguments));
          console.log.apply(console, args);
        } else {
          console.log.apply(console, arguments);
        }
      }
    }
  };
  
  // Sentinel
  // --------
  // Top level singleton to register each component, will throw errors if
  // components try to share routes.
  
  var Sentinel = function() {
    this._name = 'Sentinel';
    this._queue = [];
    this.routeMap = [];
  
    this.initializeRouter();
    this.initializeStore();
  
    // record when the DOM has loaded
    var _this = this;
    $(function(){
      _this.domLoaded = true;
      // flush the queue
      _this.queue();
    });
  
    this.log('initialized!');
  };
  
  // Default compoent options
  Sentinel.componentOptions = {
    renderOnRegister: true,   // typically true for in-page components not popups
    renderOnRoute:    false,  // typically true for popups
    removeOffRoute:   false   // typically true for popups
  };
  
  // Singleton method to make sure we only have one instance of Sentinel
  var instance;
  Sentinel.getInstance = function(){
    if (!instance){
      instance = new Sentinel();
    }
    return instance;
  };
  
  // Register a component with Sentinel
  Sentinel.register = function(component){
    var sentinel = Sentinel.getInstance();
  
    if (_.isArray(component)){
      _.each(component, function(c){
        sentinel.registerComponent(c);
      });
    } else {
      sentinel.registerComponent(component);
    }
  };
  
  // List all the components and their applicable routes
  Sentinel.list = function(){
    var sentinel = Sentinel.getInstance();
  
    return _.map(sentinel.components, function(c){
      return {
        routes: c.routes,
        name: c._name
      };
    });
  };
  
  var SentinelMethods = {
  
    // Store functions to be run once the DOM has loaded
    queue: function(func, args){
      // Push the function on to the queue if present
      if (typeof func !== 'undefined'){
        this._queue.push([func, args]);
      }
  
      // Loop through the queue once the DOM is loaded and run each function
      if (this.domLoaded === true){
        var i, next, queueLength = this._queue.length;
  
        for (i=0; i < queueLength; i++){
          next = this._queue.shift();
          if (typeof next !== 'undefined'){
            next[0].apply(this, next[1]);
          }
        }
      }
    },
  
    registerComponent: function(component){
      // Add the registered component to an internal list
      this.components = this.components || {};
      this.components[component.cid] = component;
  
      // Attach a reference to the Sentinel on the component if needed
      if (!component.sentinel){
        component.sentinel = this;
      }
  
      // Make sure the component has an options hash
      if (!_.has(component,'sentinelOptions')){
        component.sentinelOptions = Sentinel.componentOptions;
      }
  
      // Bubble all events from component to Sentinel
      component.on('all', _.bind(function(){
        this.sentinel.trigger.apply(this.sentinel, arguments);
      }, component));
  
      // Read component options and render if required
      if (component.sentinelOptions.renderOnRegister === true){
        this.queue(this.renderComponent,[component]);
      }
  
      // Register any routes
      if (component.routes){
        this.registerRoutes(component);
      }
  
      this.log(component._name + ' registered!');
    },
  
    // Run the component render function and then set a rendered flag on the
    // component. This is a seperate method so it can be attached to the queue
    // and run when needed
    renderComponent: function(component){
      _.result(component, 'render');
      component._sentinelRendered = true;
    },
  
    registerRoutes: function(component){
      var _this = this;
  
      // loop through each route and
      _.each(component.routes, function(func, route){
        // throw an error if the route has already been registered
        if (_this.routeMap[route]){
          throw 'The route ' + route + ' has already been registered!';
        }
  
        // add the route and hash to `this.routeMap`
        _this.routeMap[route] = { id: component.cid, func: func };
  
        // register the route with the backbone router
        // TODO: this is a dirty way of passing info with the route, try and
        // find a better way of attaching the component and function to the
        // route
        _this.queue(_this.sentinelRoute, [route, func, component]);
      });
    },
  
    sentinelRoute: function(route, func, component){
      this.route(route, component.cid + '-' + func);
      Backbone.history.loadUrl();
    },
  
    // Initialize the router and capture the route change event
    initializeRouter: function(){
      var _this = this;
  
      // Attach a default route so we can hide components when all routes are
      // removed
      this.routeMap[''] = {};
      this.route('', 'default');
  
      // Listen to the top-level route event to pass onto the sentinel method
      Backbone.history.on('route', function(){
        // Drop the redundant router argument when passing on
        _this.handleRoute.apply(_this, [].slice.call(arguments,1));
      });
  
      // Start the history
      if (Backbone.History.started === false){
        this.log('start Backbone.history');
        Backbone.history.start();
      }
    },
  
    // Handle receiving the route and sending the info to the appropriate
    // component and method.
    handleRoute: function(name, args){
      var cid, func, component, _this;
  
      _this = this;
  
      // Determine the component and bound method call for this route
      cid = name.split('-')[0];
      func = name.split('-')[1];
      if (this.components){
        component = this.components[cid];
      }
  
      this.log('handle route', arguments, component);
  
      // If a component matches this route, run the associated callbacks.
      if (component){
        // If the bound callback is not render and the option to renderOnRoute
        // is set then render the component
        if (func !== 'render' && component.sentinelOptions.renderOnRoute){
          // Don't re-render the component
          if (component._sentinelRendered !== true){
            // On re-render it is up to the component author to handle attaching
            // component to the DOM.
            // e.g: in the render method `$(body).append(this.$el)`
            this.queue(this.renderComponent, [component]);
          }
        }
  
        // Run the method bound to this route
        component[func].apply(component, args);
      }
  
      // Remove any components that are "offRoute"
      var removed = [];
      _.each(this.components, function(c, _cid){
        // Make sure we do not try and remove the component more than once
        if (_.indexOf(removed, _cid) > -1){
          return;
        }
        // If required remove the component as the route changes
        if (_cid !== cid && c.sentinelOptions.removeOffRoute){
          _.result(c, 'remove');
          c._sentinelRendered = false;
          removed.push(_cid);
        }
      });
    },
  
    // Create a top-level model for data storage, broadcast any changes to the
    // model as events on Sentinel
    initializeStore: function(){
      var _this = this;
      this.store = new Backbone.Model();
      this.store.on('all', function(){
        _this.trigger.apply(_this, arguments);
      });
    }
  };
  
  // Merge in the methods, Logger and Router to the Sentinel prototype
  _.extend(
    Sentinel.prototype,
    Log,
    Backbone.Router.prototype,
    SentinelMethods
  );
  
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

  Sentinel.VERSION = '0.0.1';

  return Sentinel;
}));