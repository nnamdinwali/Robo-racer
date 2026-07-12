//Attached to a checkpoint, this:
// - checks for a player touching it if NOT TOUCHED
// - sets itself to TOUCHED and adds 1 to the total checkpoints hit through a broadcast message, "checkpoint_hit"
// - also sets the player spawn point to above the checkpoint middle.
// - resets itself on hearing a "new_lap" message.

//pc.script.attribute("player","entity",null,{
  // description: "player entity" 
//});
//pc.script.attribute("spawnpoint","entity",null, {
   //description: "spawnpoint entity" 
//});
//

pc.script.attribute("order_id","number",0,{
    description: "The order in the race of which checkpoint this is.  Starts at 0, and increases by 1 till the max checkpoints are reached.  The checkpoint will only register if it is next in the line."
});

pc.script.attribute("spawnheight","number",4,{
    description: "y offset for spawn"
});

//pc.script.attribute("visual_model","entity",null);

pc.script.create('checkpoint', function (app) {
    // Creates a new Checkpoint instance
    var Checkpoint = function (entity) {
        this.entity = entity;
        this.passed = false;
        this.player = null;
        this.spawnpoint = null;
    };

    Checkpoint.prototype = {
        // Called once after all resources are loaded and before the first update
        initialize: function () {
            this.entity.collision.on("triggerenter",this.onTriggerEnter,this);
            app.on("checkpoint_reset",this.checkpoint_reset,this);
            this.rot = new pc.Vec3();
            //this.q = new pc.Quat();
            
            //find the spawnpoint and player objects dynamically
            this.player = app.root.findByName("player");
            this.spawnpoint = app.root.findByName("spawnpoint");
            this.visual_cue_model = this.entity.findByName("cue");  //anything named cue as a child of this will be the model hidden when hit.
            
            //listen for other checkpoints, to check your id number again.
            app.on("checkpoint_hit",this.check_count,this);
            this.check_count();
        },
        
        destroy : function() {
            app.off("checkpoint_reset",this.checkpoint_reset,this);
            app.off("checkpoint_hit",this.checkpoint_hit,this);
        },
        
        onTriggerEnter: function(entity_entered) {
            if(entity_entered == this.player && this.visual_cue_model.enabled) {
                //console.log("player entered trigger has been tripped for start finish line.");
                this.point = this.entity.getPosition();
                this.point.y += this.spawnheight;
                this.spawnpoint.setPosition(this.point.x,this.point.y,this.point.z);
                this.spawnpoint.setRotation(this.entity.getRotation());
                
                //console.log("checkpoint put spawn at " + this.point.x + "," + this.point.y + "," + this.point.z);
                if(!this.passed) {
                    this.passed = true;
                    app.fire("checkpoint_hit");
                    //also hide the model
                    this.visual_cue_model.enabled = false;
                }
            }
        },
        
        checkpoint_reset: function() {
            this.passed = false;
            this.check_count();
            //this.visual_cue_model.enabled = true;
        },
        
        check_count: function() {
            //check count against global value
            if(this.order_id == window.globals.CurrentCheckpoint) {
                this.visual_cue_model.enabled = true;
            } else {
                this.visual_cue_model.enabled = false;
            }
        },

        // Called every frame, dt is time in seconds since last update
        update: function (dt) {
        }
    };

    return Checkpoint;
});