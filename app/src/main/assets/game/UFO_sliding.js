pc.script.attribute("movespeed","number",1, {
    displayName: "Speed",
    description: "Speed of movement"
});

pc.script.create('UFO_sliding', function (app) {
    // Creates a new UFO_sliding instance
    var UFO_sliding = function (entity) {
        this.entity = entity;
        this.toggledirection = false;
    };

    UFO_sliding.prototype = {
        // Called once after all resources are loaded and before the first update
        initialize: function () {
            //activate listener for collisions
            this.entity.collision.on("collisionstart",this.turn_around,this);
            
        },
        
        turn_around: function () {
          this.toggledirection = !this.toggledirection;  
        },

        // Called every frame, dt is time in seconds since last update
        update: function (dt) {
            //this.directionalpush = new pc.Vec3(this.movespeed,0,0);
            this.directionalpush = this.entity.right.scale(this.movespeed);
            if(!this.toggledirection) {
                this.directionalpush.scale(-1); //flip push if reversed.
            }
            this.entity.rigidbody.applyForce(this.directionalpush);
        }
    };

    return UFO_sliding;
});