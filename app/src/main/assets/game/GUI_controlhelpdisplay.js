// display the player controls, either the touch or the keyboard keys to use to play the game.
// Shown at the start of a race, then hidden as soon as the player touches the screen or presses spacebar.
// Auto-dismisses after 60 seconds if player does not interact.

pc.script.create('GUI_controlhelpdisplay', function (app) {
    var GUI_controlhelpdisplay = function (entity) {
        this.entity = entity;
        this.timer = 0;
        this.auto_dismiss_time = 60;
        this.dismissed = false;
    };

    GUI_controlhelpdisplay.prototype = {
        initialize: function () {
            if(app.touch) {
                this.entity.findByName("touch").enabled = true;
                app.touch.on("touchstart",this.touchcheck,this);
                app.touch.on("touchend",this.touchcheck,this);
            } else {
                this.entity.findByName("notouch").enabled = true;
            }
            this.touched = false;
            this.keypressed = false;
            this.timer = 0;
            this.dismissed = false;
        },

        destroy : function() {
            if(app.touch) {
                app.touch.off("touchstart",this.touchcheck,this);
                app.touch.off("touchend",this.touchcheck,this);
            }
        },

        dismiss: function() {
            if(this.dismissed) return;
            this.dismissed = true;
            if(app.root.findByName("Race Start Countdown")){
                app.root.findByName("Race Start Countdown").enabled = true;
            }
            var touch = this.entity.findByName("touch");
            var notouch = this.entity.findByName("notouch");
            var title = this.entity.findByName("Control Title");
            if(touch) touch.enabled = false;
            if(notouch) notouch.enabled = false;
            if(title) title.enabled = false;
        },

        update: function (dt) {
            if(this.dismissed) return;

            this.update_controls();

            if(this.touched || this.keypressed) {
                this.dismiss();
                return;
            }

            this.timer += dt;
            if(this.timer >= this.auto_dismiss_time) {
                this.dismiss();
            }
        },

        touchcheck : function (e) {
            if(e.touches.length > 0) {
                this.touched = true;
            }
        },

        update_controls: function() {
            if(app.keyboard.isPressed(pc.KEY_RIGHT) || app.keyboard.isPressed(pc.KEY_LEFT) || app.keyboard.isPressed(pc.KEY_SPACE)) {
                this.keypressed = true;
            }
        }

    };
    return GUI_controlhelpdisplay;
});
