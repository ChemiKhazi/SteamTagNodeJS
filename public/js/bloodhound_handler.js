(function($){
  (function(root){
    root.Bloodhound_Handler = Bloodhound_Handler;
    function Bloodhound_Handler(o){
      this.navkeys = [38, 40] // down/up

      this.responseList = [];
      this.index = -1;

      this.o = o;
      this.element = this.o.element;
      this.element.on('keyup', this, this._handlekey);
    }

    $.extend(Bloodhound_Handler.prototype, {
      _close: function close(){
        this.responseList = [];
        this.index = -1;
      },
      _navigate: function navigate(keycode){
        if (this.responseList.length == 0)
          return false;
        var pressed = this.navkeys.indexOf(keycode);
        if (pressed < 0)
          return false;
        if (pressed == 0)
          this.index--;
        else
          this.index++;
        // Wrap around
        if (this.index < 0)
          this.index = this.responseList.length - 1;
        if (this.index >= this.responseList.length)
          this.index = 0;
        return true;
      },
      _handlekey: function handlekey(e){
        var that = e.data;
        // Escape pressed
        if (e.keyCode == 27) {
          that._close();
          if (that.o.close !== undefined)
            that.o.close(e);
        }
        // Enter pressed
        else if (e.keyCode == 13) {
          if (that.o.select !== undefined)
            that.o.select(e, that.current());
        }
        // Up/down pressed
        else if (that._navigate(e.keyCode)) {
          if (that.o.focus !== undefined)
            that.o.focus(e, that.current());
        }
        else{
          // Search
          var search = $(this).val();
          if (search !== undefined){
            that.o.engine.get(search, function(datums){
              that.responseList = datums;
              that.index = -1;
              if (that.o.response !== undefined){
                that.o.response(e, datums);
              }
            });
          }
        }
      },
      current: function current() {
        if (this.index < 0)
          return null;
        if (this.responseList.length == 0)
          return null;
        return this.responseList[this.index];
      },
      unregister: function unregister() {
        this.element.off('keyup', this._handlekey);
      },
      element:this.element,
      responses:this.responseList
    });

    return Bloodhound_Handler;
  })(this);
}(window.jQuery))
