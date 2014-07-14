(function ( $ ) {

    $.fn.minimodal = function(options) {
        var settings = $.extend({
            clickClose : false,
            close: false,
            fade: false,
            duration: 100,
            color: "#000",
            opacity: 0.65,
            width: 300,
            height: 200
        }, options );

        if (settings.close)
        {
          close(this, settings);
          return this;
        }

        // Create the root of the modal, top/left enables quick dumb centering
        var modalRoot = $('<div/>')
        .attr('rel', 'modal-root')
        .css({
          position:'fixed',
          top: '50%',
          left: '50%',
          width: '100%',
          height: '100%'
        })
        // This is the node that blacks out the rest of the page
        var modalBack = $('<div/>').css({
          position: 'absolute',
          top: '-50%',
          left: '-50%',
          width: '100%',
          height: '100%',
          'background-color': settings.color,
          opacity: settings.opacity
        });
        // And add styles to the target modal to center it properly
        this.css({
          display: 'block',
          position: 'absolute',
          top: -(settings.height/2),
          left: -(settings.width/2),
          width: settings.width,
          height: settings.height
        });

        // Setup click listener on blackout div to close if in options
        if (settings.clickClose){
          modalBack.click({object:this, opts:settings}, function(e){
            close(e.data.object, e.data.opts);
          });
        }
        // Optional fade in
        if (settings.fade){
          modalRoot.css({opacity:0})
          modalRoot.animate({opacity:1}, settings.duration);
        }

        // Build the modal node on the end of body to overlay everything
        $('body').append(modalRoot.append(modalBack).append(this));

        return this;
    };

    function close(obj, settings){

      if (settings.fade){
        $(obj).parent().animate({opacity:0},
          {duration:settings.duration,
            complete:function(){
              close(obj, {fade:false});
            }
          }
        );
        return;
      }

      var target = $(obj);
      var root = target.parent();
      $('body').append(target);
      target.hide();
      root.remove();
    };

}( jQuery ));
