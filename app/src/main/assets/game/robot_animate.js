//squish and rotate the robot when the parent object is doing things.
//

pc.script.attribute("squish","number",0.5,{
    description: "The percentage of a fully squished down player."
});

pc.script.attribute("lean","number",30,{
    description: "The lean, in degrees, for a fully turning player."
});

pc.script.create('robot_animate', function (app) {
    // Creates a new Robot_animate instance
    var Robot_animate = function (entity) {
        this.entity = entity;
    };

    Robot_animate.prototype = {
        // Called once after all resources are loaded and before the first update
        initialize: function () {
            this.player_ref = this.entity.getParent();
            this.original_size = new pc.Vec3(1,1,1);
            this.squish_scale_y = this.original_size.y*this.squish;
            this.original_rotation = new pc.Vec3(this.entity.getLocalEulerAngles());
            this.left_rotation = this.original_rotation.z-this.lean;
            this.right_rotation = this.original_rotation.z+this.lean;
            
            //listen for respawn or restart, and reset animations
            app.on("respawn",this.reset_animations,this);
            app.on("GUI:ResetRace",this.reset_animations,this);
        },
        
        destroy : function() {
            app.off("respawn",this.reset_animations,this);
            app.off("GUI:ResetRace",this.reset_animations,this);
        },
        
        reset_animations: function() {
            this.entity.setLocalEulerAngles(this.original_rotation);
            this.entity.setLocalScale(this.original_size);
        },
        
        
        update_animations: function(dt) { 
            this.rot_amount = 60*dt;
            if(this.player_ref.script.Robot_movement.turning){
                //update turning by leaning in direction
                //console.log("turning is animating.");
                this.current_rotation = this.entity.getLocalEulerAngles();
               
                if(this.player_ref.script.Robot_movement.pressing_left){
                    if(this.current_rotation.z > this.left_rotation) {
                       // console.log("rotating left by "+this.rot_amount);
                        this.entity.setLocalEulerAngles(this.original_rotation.x,this.original_rotation.y,this.current_rotation.z-this.rot_amount);
                       // console.log("new z rotation is "+this.entity.getLocalEulerAngles().z);
                    }
                } else {
                    if(this.current_rotation.z < this.right_rotation) {
                       // console.log("rotating right by "+this.rot_amount);
                        this.entity.setLocalEulerAngles(this.original_rotation.x,this.original_rotation.y,this.current_rotation.z+this.rot_amount);
                    }
                }
                
            } else {
                this.current_rotation = this.entity.getLocalEulerAngles();
                if (this.current_rotation != this.original_rotation) {
                    //lean straight again if idle
                    if(this.current_rotation.z < this.original_rotation.z-1) {
                        this.entity.setLocalEulerAngles(this.original_rotation.x,this.original_rotation.y,this.current_rotation.z+this.rot_amount);
                    }
                    if(this.current_rotation.z > this.original_rotation.z+1) {
                        this.entity.setLocalEulerAngles(this.original_rotation.x,this.original_rotation.y,this.current_rotation.z-this.rot_amount);
                    }
                    if(this.entity.getLocalEulerAngles().z >= this.original_rotation.z-1-this.rot_amount && this.entity.getLocalEulerAngles().z <= this.original_rotation.z+1+this.rot_amount) {
                        this.entity.setLocalEulerAngles(this.original_rotation);
                    }
                }
                
            }
            
            this.current_scale = this.entity.getLocalScale();
            if(this.player_ref.script.Robot_movement.jump_charge > 0) {
                this.squish_rate = 1*dt;
                //squish down if charging a jump
                //console.log("jump charge is animating.");
                if(this.current_scale.y > this.squish_scale_y) {
                  //  console.log("scaling down along y for charge jump by amount "+this.squish_rate);
                    this.entity.setLocalScale(this.original_size.x,this.current_scale.y-this.squish_rate,this.original_size.z);
                } else {
                   // console.log("locking scaling to squish size "+this.squish_scale_y);
                    this.entity.setLocalScale(this.original_size.x,this.squish_scale_y,this.original_size.z);
                }
                
            } else {
                //spring back up if no jumping is happening
                //if(this.current_scale.y < this.original_size.y) {
                   // console.log("scaling back to normal size "+this.original_size);
                   // this.entity.setLocalScale(this.original_size.x,this.current_scale.y+this.squish_rate,this.original_size.z);
                //} else {
                  //  console.log("locked size at normal size "+this.original_size);
                    this.entity.setLocalScale(this.original_size.x,this.original_size.y,this.original_size.z);
                //}
            }
        },
        

        // Called every frame, dt is time in seconds since last update
        update: function (dt) {
            this.update_animations(dt);
        }
    };

    return Robot_animate;
});