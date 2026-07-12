//collects a coin when hit

pc.script.create('coin', function (app) {
    // Creates a new Coin instance
    var Coin = function (entity) {
        this.entity = entity;
    };

    Coin.prototype = {
        // Called once after all resources are loaded and before the first update
        initialize: function () {
            this.entity.collision.on("triggerenter",this.triggerenter,this);
            //listen for a GUI:ResetRace message to "reappear"
            app.on("GUI:ResetRace",this.GUI_ResetRace,this);
            
            //turn off colliders if we have any
            //if(this.entity.collision) {
                //this.entity.collision.enabled = false;
            //}
            
            //get reference to player object
            //this.playerobject = app.root.findByName("player");
            
            //flag for if collected
           // this.collected = false;
            
            //distance
           // this.distance = new pc.Vec3();
            
            //collect distance, how close does the player need to be to collect this object
           // this.collect_distance = 4;
        },
        
        destroy : function() {
            app.off("GUI:ResetRace",this.GUI_ResetRace,this);  
        },
        
        GUI_ResetRace : function(t) {
            //reappear and reenable collisions
            this.entity.collision.enabled = true;
            //this.collected = false;
            this.entity.model.enabled = true;
        },
        
        
        triggerenter : function(e) {
            if(e.name == "player") {
                //console.log("collected coin");
                app.fire("collect_coin");
                //window.globals.PlayerScore += 100 * window.globals.PlayerMultiplier;
                //old destroy code, doesn't support track resetting
                //this.entity.destroy();
                //Instead of destroying the coin, let's just make it vanish and disable it's collisions.
                this.entity.collision.enabled = false;
                this.entity.model.enabled = false;
            }
                
        }
        
        
/*
        // Called every frame, dt is time in seconds since last update
        update: function (dt) {
            //check if not collected
            if(!this.collected) {
                //check distance between coin and player
                this.distance.sub2(this.entity.getPosition(),this.playerobject.getPosition());
                if(this.distance.length < this.collect_distance) {
                    this.entity.model.enabled = false;
                    this.collected = true;
                }
            }
        }*/
    };

    return Coin;
});