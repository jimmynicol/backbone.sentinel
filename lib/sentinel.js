
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