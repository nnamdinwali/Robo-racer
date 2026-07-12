// start finish line marker
// - when the player hits this marker, sends a "new_lap" message over broadcast.
// - sets player spawn to above this object when activated.
//
//


//pc.script.attribute("player","entity",null,{
  // description: "player entity" 
//});
//pc.script.attribute("checkpoint","entity",null, {
  // description: "checkpoint entity" 
//});

pc.script.attribute("spawnheight","number",4,{
    description: "y offset for spawn"
});

pc.script.create('start_finish', function (app) {
    // Creates a new Start_finish instance
    var Start_finish = function (entity) {
        this.entity = entity;
    };

    Start_finish.prototype = {
        // Called once after all resources are loaded and before the first update
        initialize: function () {
            this.entity.collision.on("triggerenter",this.onTriggerEnter,this);
            this.player = app.root.findByName("player");
            this.checkpoint = app.root.findByName("spawnpoint");
            this.cue = this.entity.findByName("cue");
            this.cue.enabled = false; //force the finishline to always be false on start
            app.on("checkpoint_hit",this.checkpoint_hit,this); //listen for checkpoint hit messages
            app.on("race_start",this.checkpoint_hit,this); //listen for race starts
            app.on("GUI:ResetRace",this.checkpoint_hit,this); //listen for reset race
            app.on("new_lap",this.checkpoint_hit,this);
        },
        
        destroy : function() {
            app.off("checkpoint_hit",this.checkpoint_hit,this);
            app.off("race_start",this.checkpoint_hit,this);
            app.off("GUI:ResetRace",this.checkpoint_hit,this);
            app.off("new_lap",this.checkpoint_hit,this);
        },
        
        checkpoint_hit : function() {
            if(window.globals.CurrentCheckpoint == window.globals.MaxCurrentCheckpoint) {
                this.cue.enabled = true;
            } else {
                this.cue.enabled = false;
            }
        },
        
        onTriggerEnter: function(entity_entered) {
            if(entity_entered == this.player && this.cue.enabled) {
                //console.log("player entered trigger has been tripped for start finish line.");
                this.point = this.entity.getPosition();
                this.point.y += this.spawnheight;
                this.checkpoint.setPosition(this.point.x,this.point.y,this.point.z);
                this.checkpoint.setRotation(this.entity.getRotation());
                app.fire("new_lap");
               // console.log("finish line is firing new lap");
               // console.log("finish put spawn at " + this.point.x + "," + this.point.y + "," + this.point.z);
            }
        },

        // Called every frame, dt is time in seconds since last update
        update: function (dt) {
            
        }
    };

    return Start_finish;
});