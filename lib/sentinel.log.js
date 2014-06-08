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
  },

  _bm: false,
  _bmComponents: [],

  // Is this session capable of benchmarking (ie: can it run console.time)
  detectBm: function(){
    var _this, search;

    if (!_.has(window, 'console')){
      return;
    }

    _this = this;
    search = window.location.search.replace(/^\?/, '').split('&');

    _.each(search, function(part){
      if (/^bm/.test(part)){
        _this._bm = true;
        if (part.split('=').length > 1){
          _this._bmComponents = part.split('=')[1].split(',');
        }
      }
    });
  },

  // Benchmark any requested functions
  bm: function(action, func){
    if (!this._bm){
      func.call(this);
      return;
    }

    console.time(action);
    func.call(this);
    console.timeEnd(action);
  }
};

// Detect if the browser session should be logging
Log.detectDebugMode();

// Detect if we want to run any benchmarking
Log.detectBm();