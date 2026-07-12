pc.script.attribute("player","entity",null,{
    description: "player entity"
});

pc.script.create('spawnpoint_script', function (app) {
    // Creates a new Spawnpoint_script instance
    var Spawnpoint_script = function (entity) {
        this.entity = entity;
        this.original_Position = new pc.Vec3();
        this.original_Rotation = new pc.Quat();
    };

    Spawnpoint_script.prototype = {
        // Called once after all resources are loaded and before the first update
        initialize: function () {
            //set position to initial player position
            this.entity.setPosition(this.player.getPosition());
            //store this position for reference on race reset
            this.original_Position = this.entity.getPosition();
            this.original_Rotation = this.entity.getRotation();
            //console.log("spawn original location is "+this.original_Position);
            //console.log("spwan original rotation is "+this.original_Rotation);
            //listen for a race reset
            app.on("GUI:ResetRace",this.GUI_ResetRace,this);
        },
        
        destroy : function() {
            app.off("GUI:ResetRace",this.GUI_ResetRace,this);
        },
        
        GUI_ResetRace : function(t) {
            //jump back to original position
            this.entity.setPosition(0,4,0);
            //this.entity.setPosition(this.original_Position);
            this.entity.setRotation(pc.Quat.ZERO);
            //this.entity.setRotation(this.original_Rotation);
            
            ////////////////////////////////////////////////////////////////////////////////////////////
            /////  EERRROR  : Player is not spawning correctly.  Is the spawnpoint being reset to the right place and rotation?  Further testing will be needed.
            
            app.fire("respawn");
        },

        // Called every frame, dt is time in seconds since last update
        update: function (dt) {
            
        }
    };

    return Spawnpoint_script;
});