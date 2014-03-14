//     Backbone.Sentinel v0.3.0
//     Copyright (c) 2014
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
  
    _canLog: false,
    _logComponents: [],
  
    detectDebugMode: function(){
      if (window){
        var _this, search;
  
        // only proceed if the console object is available
        if (!_.has(window, 'console')){
          return;
        }
  
        _this = this;
        search = window.location.search.replace(/^\?/, '').split('&');
  
        _.each(search, function(part){
          if (/^log=/.test(part)){
            _this._canLog = true;
            _this._logComponents = part.split('=')[1].split(',');
          }
        });
      }
    },
  
    log: function(){
      if (this._canLog){
        // Check to see if we are requesting logging on a specific component
        if (_.indexOf(this._logComponents, 'debug') === -1){
          // Don't log if this is against a component not in the list
          if (_.indexOf(this._logComponents, this._name) === -1){
            return;
          }
        }
  
        // Prepend the name of the component when possible
        if (this._name){
          var args  = [this._name + ':'].concat(slice.call(arguments));
          console.log.apply(console, args);
        } else {
          console.log.apply(console, arguments);
        }
      }
    }
  };
  
  // Detect if the browser session should be logging
  Log.detectDebugMode();
  
  // Sentinel
  // --------
  // Top level singleton to register each component, will throw errors if
  // components try to share routes.
  
  var Sentinel = function() {
    this._name = 'Sentinel';
    this._queue = [];
    this.routeMap = [];
    this.currentRoute = null;
  
    this.initializeRouter();
  
    // record when the DOM has loaded
    var _this = this;
    $(function(){
      _this.log('domload');
      _this.domLoaded = true;
      _this.initializeStore();
      _this.queue(); // flush the queue
    });
  
    this.log('initialized!');
  };
  
  // Default compoent options
  Sentinel.componentOptions = {
    renderOnRegister: true,   // typically true for in-page components not popups
    renderOnRoute:    false,  // typically true for popups
    removeOffRoute:   false   // typically true for popups
  };
  
  // Placeholder for any data that is bootstrapped to the page and then
  // inserted into the Sentinel.store accessible by all components
  Sentinel.Bootstrap = {};
  
  // Expose the base store model class so it can be overidden if need be
  Sentinel.StoreClass = Backbone.Model;
  
  
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
        sentinel.queue(sentinel.registerComponent, [c]);
      });
    } else {
      sentinel.queue(sentinel.registerComponent, [component]);
    }
  };
  
  // List all the components and their applicable routes
  Sentinel.list = function(){
    var list = [],
        componentNames = [],
        sentinel = Sentinel.getInstance();
  
    _.each(sentinel.components, function(c){
      if (c.routes){
        _.each(c.routes, function(method, route){
          list.push({ Component: c._name, Route: route, Method: method });
          componentNames.push(c._name);
        });
      } else {
        list.push({ Component: c._name, Route: null, Method: null });
        componentNames.push(c._name);
      }
    });
  
    if (console.table){
      console.table(list);
      return 'Number of Components: ' + _.uniq(componentNames).length;
    } else {
      return list;
    }
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
      // Make sure the component is an instance
      if (_.has(component, 'prototype')){
        var ComponentClass = _.bind(component, null);
        component = new ComponentClass();
      }
  
      // If the component is not a Backbone view, add a cid property using the
      // underscore uniqueId method.
      if (!_.has(component,'cid')){
        component.cid = _.uniqueId('component');
      }
  
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
        // throw an error if the route has already been registered, unless it
        // is the default route
        if (_this.routeMap[route] && route !== ''){
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
    // component and method. If the named route matches the current processed
    // route then do nothing
    handleRoute: function(name, args){
      if ( name === this.currentRoute ){
        return;
      }
  
      var cid, func, component, _this;
  
      _this = this;
      this.currentRoute = name;
  
      // Determine the component and bound method call for this route
      cid = name.split('-')[0];
      func = name.split('-')[1];
      if (this.components){
        component = this.components[cid];
      }
  
      this.log('handle route', name, args);
  
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
        if (_cid !== cid && c.sentinelOptions.removeOffRoute === true){
          if (c.remove){
            c.remove.apply(c);
          }
          c._sentinelRendered = false;
          removed.push(_cid);
        }
      });
    },
  
    // Create a top-level model for data storage, broadcast any changes to the
    // model as events on Sentinel. Initialize with any data stored againts the
    // Bootstrap variable.
    initializeStore: function(){
      var _this = this;
  
      if (typeof Sentinel.StoreClass === 'undefined'){
        throw 'Please define the Sentinel.StoreClass';
      }
  
      this.store = new Sentinel.StoreClass(Sentinel.Bootstrap);
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
  
  function methodNotImplemented(method){
    throw new Error('Please implement the "' + method + '" method!');
  }
  
  // Sentinel Component
  // ------------------
  
  // This class is a simple extension of the Backbone.View and should be used
  // in roughly the same manner. The key exception is that you can nominate from
  // within the class what routes it should respond to.
  var Component = Sentinel.Component = function(){
    var _so = {};
  
    // Attach a reference to Sentinel
    this.sentinel = Sentinel.getInstance();
  
    // Merge together the default options with the component specific ones
    _.extend(_so, Sentinel.componentOptions, this.sentinelOptions);
    this.sentinelOptions = _so;
  
    // Run the parent Backbone.View constructor
    Backbone.View.apply(this, arguments);
  };
  
  // Add static extend method from the Backbone.View, Sentinel.Components are
  // designed to basically be a Backbone.View with some upgrades
  Component.extend = Backbone.View.extend;
  
  // Add ability to include mixins in extended classes
  Component.include = function(obj) {
    _.extend(this.prototype, obj.prototype);
    return this;
  };
  
  var ComponentMethods = {
    // Override `_name` in the base class to help with logging, it will prefix
    // all log messages
    _name: 'Component',
  
    // Set this in the component if any of the above defaults need to be
    // overriden
    sentinelOptions: {},
  
    // Placeholder for the render method, it should be implemented.
    render: function(){ methodNotImplemented('render'); }
  };
  
  _.extend(
    Component.prototype,
    Log,
    Backbone.View.prototype,
    ComponentMethods
  );

  Sentinel.VERSION = '0.3.0';

  return Sentinel;
}));