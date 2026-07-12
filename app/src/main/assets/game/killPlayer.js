
pc.script.attribute("player","entity",null,{
   description: "player entity" 
});

pc.script.create('killPlayer', function (app) {
    // Creates a new KillPlayer instance
    var KillPlayer = function (entity) {
        this.entity = entity;
    };

    KillPlayer.prototype = {
        // Called once after all resources are loaded and before the first update
        initialize: function () {
            this.entity.collision.on("triggerenter",this.onTriggerEnter,this);    
        },
        
        onTriggerEnter: function(entity) {
            if(entity == this.player) {
               //respawn the player
               //console.log("attempting to respawn player with fire respawn message");
               app.fire("respawn");
            }
        },
        
        // Called every frame, dt is time in seconds since last update
        update: function (dt) {
        }
    };

    return KillPlayer;
});