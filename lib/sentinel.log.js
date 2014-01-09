// Sentinel Log
// ------------
// All purpose logging utility that is mixed into the needed classes
var Log = {

  _canLog: false,
  _logComponents: [],

  detectDebugMode: function(){

    if (window){
      var _this, search;

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
    if (console && this._canLog){
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