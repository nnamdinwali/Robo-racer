//runs the particle systems based on player situations
pc.script.attribute("wheel_on_ground_particles","entity",null); //wheel on ground sparks effect
pc.script.attribute("fast_speed_particles","entity",null); //effect for fast speed
pc.script.attribute("fast_speed_requirement","number",100); //how fast does the speed of this object need to be to show extra speed?
pc.script.attribute("boosting_particles","entity",null); //the boost effect particle emitter.
pc.script.attribute("player_object","entity",null); //the player object to be looking for the player script on.

pc.script.create('particle_wheel', function (app) {
    // Creates a new Particle_wheel instance
    var Particle_wheel = function (entity) {
        this.entity = entity;
        app.on("race_end",this.race_end,this);
    };

    Particle_wheel.prototype = {
        // Called once after all resources are loaded and before the first update
        initialize: function () {
            this.enable_particles = false; //should the particle logic be run?
            
            //listen for GUI:ResetRace
            app.on("GUI:ResetRace",this.GUI_ResetRace,this);
            app.on("race_start",this.race_start,this);
        },
        
        destroy : function() {
            app.off("race_end",this.race_end,this);
            app.off("GUI:ResetRace",this.GUI_ResetRace,this);
            app.off("race_start",this.race_start,this);
        },
        
        race_start : function() {
            //start the particle systems
            this.enable_particles = true;  
        },
        
        GUI_ResetRace : function() {
            this.wheel_on_ground_particles.particlesystem.stop();
            this.fast_speed_particles.particlesystem.stop();
            this.boosting_particles.particlesystem.stop();
            this.enable_particles = false;  
        },
        
        race_end : function() {
            //stop all emitters, as we are stopping all engines
            this.wheel_on_ground_particles.particlesystem.stop();
            this.fast_speed_particles.particlesystem.stop();
            this.boosting_particles.particlesystem.stop();
            this.enable_particles = false;
        },

        // Called every frame, dt is time in seconds since last update
        update: function (dt) {
            //should particles be enabled, update our logic and display the correct systems.
            if(this.enable_particles){   
                
                if(this.player_object.script.Robot_movement.wheel_on_ground) {
                    //show effects for being on the ground
                    //check speed to show the player different effects based on the speed the robot is trying to go.
                    if(this.player_object.script.Robot_movement.drive_currentSpeed < this.fast_speed_requirement) {
                        this.wheel_on_ground_particles.particlesystem.play();
                        this.fast_speed_particles.particlesystem.stop();
                    } else {
                        this.wheel_on_ground_particles.particlesystem.stop();
                        this.fast_speed_particles.particlesystem.play();    
                    }
                } else {
                    //hide effects for being on the ground if in the air
                    this.wheel_on_ground_particles.particlesystem.stop();
                    this.fast_speed_particles.particlesystem.stop();
                }
            
                //show player boosting if the player has some boost energy being spent.
                if(this.player_object.script.Robot_movement.drive_boostSpeed > 0) {
                    this.boosting_particles.particlesystem.play();
                } else {
                    this.boosting_particles.particlesystem.stop();
                }
            }
        }
    };

    return Particle_wheel;
});