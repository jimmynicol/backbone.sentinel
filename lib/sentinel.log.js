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