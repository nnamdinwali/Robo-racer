

pc.script.create('rocket_pickup', function (app) {
    // Creates a new Rocket_pickup instance
    var Rocket_pickup = function (entity) {
        this.entity = entity;
        this.timer = 8;
        this.current_timer = 0;
    };

    Rocket_pickup.prototype = {
        // Called once after all resources are loaded and before the first update
        initialize: function () {
            this.entity.collision.on("triggerenter",this.triggerenter,this);
            app.on("GUI:ResetRace",this.GUI_ResetRace,this);
            app.on("respawn",this.GUI_ResetRace,this);

            this.rocketmodel = this.entity.findByName("rocket");
        },
        
        destroy : function() {
            app.off("GUI:ResetRace",this.GUI_ResetRace,this);
            app.off("respawn",this.GUI_ResetRace,this);
        },
        
        GUI_ResetRace : function() {
            this.current_timer = 0;
            this.rocketmodel.enabled = true;
            this.entity.collision.enabled = true;
        },
        
        triggerenter : function(e) {
            if(e.name == "player" && this.current_timer === 0) {
                app.fire("player_getBoost",200);
                this.rocketmodel.enabled = false;
                this.current_timer = this.timer;
                this.entity.collision.enabled = false; //turn off collider
            }
        },

        // Called every frame, dt is time in seconds since last update
        update: function (dt) {
            //update the timer
            if(this.current_timer > 0) {
                this.current_timer -= dt;
                //if counted down to 0 again
                if(this.current_timer <= 0) {
                    this.current_timer = 0; //reset timer
                    this.rocketmodel.enabled = true; //make model appear again cause we are ready for pickup.
                    this.entity.collision.enabled = true; //allow collecting the powerup again.
                }
            }
            
        }
    };

    return Rocket_pickup;
});