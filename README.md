# Backbone.Sentinel

Top-level Backbone extension for managing collections of Backbone based view components.


## Usage

    var Component1 = Backbone.Sentinel.Component.extend({
      sentinelOptions: {
        renderOnRegister: false,
        renderOnRoute: true,
        removeOffRoute: true
      },

      initialize: function(){
        this.log('init');
      },

      render: function(){
        this.log('render');
        return this;
      }
    });

    var c1 = new Component1();

    Backbone.Sentinel.register(c1);