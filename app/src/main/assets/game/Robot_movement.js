pc.script.attribute("drive_topSpeed","number",100, {
    displayName: "Top Speed",
    discription: "The maximum speed of the normal movement.",
    min: 0,
    max: 2000
});
pc.script.attribute("drive_acceleration","number",30, {
    displayName: "Acceleration",
    discription: "The rate at which the player speeds up.",
    min: 0,
    max: 500
});

pc.script.attribute("drive_turnRate","number",1, {
    displayName: "Turn Rate",
    discription: "The turn rotation rate, how fast can the player controls turn the vehicle?",
    min: 0,
    max: 1000
});
pc.script.attribute("drive_turnSlowDown","number",3, {
    displayName: "Turn Slow Down",
    discription: "The Brake Effect applied to the player speed when turning.",
    min: 0,
    max: 1000
});
pc.script.attribute("drive_turnFriction","number",0.9, {
    displayName: "Turning Friction",
    discription: "The amount of friction set to the player when turning.",
    min: 0,
    max: 1
});
pc.script.attribute("ground_check_distance","number",0.9, {
    displayName: "Ground Check Distance",
    discription: "The distance from 0,0,0 to test for ground below the player.  This speeds the player up if the ray hits something.",
    min: 0,
    max: 30
});

//JUMPING SETUP
pc.script.attribute("jump_topCharge","number",500, {
    displayName: "Jump Max",
    discription: "Maximum jump power possible.  Measured in kick to give the player when released.",
    min: 0,
    max: 3000
});
pc.script.attribute("jump_chargeRate","number",20, {
    displayName: "Jump Rate",
    discription: "Charge rate, each charge up loop fills jump power by this amount.",
    min: 0,
    max: 10000
});

// YOU'VE GOT BOOST POWER  - Boosting editor setup
pc.script.attribute("drive_maxBoostSpeed","number",500, {
    displayName: "max boost Speed",
    discription: "The max speed from boosting effects.",
    min: 0,
    max: 300000
});
pc.script.attribute("drive_maxBoostCharge","number",5000, {
    displayName: "b storage max",
    discription: "The max energy for boosting the player can save up.",
    min: 0,
    max: 1000000
});
pc.script.attribute("drive_boostEffect","number",200, {
    displayName: "boost Force",
    discription: "The force of the boost push applied when a boost is in effect.",
    min: 0,
    max: 500000
});

pc.script.attribute("spawnpoint","entity",null, {
   displayName: "spawn point" 
});


pc.script.create('Robot_movement', function (app) {
    // Creates a new Robot_movement instance
    var Robot_movement = function (entity) {
        this.entity = entity;
        
        //////////////////////////////////////////////////////////////
        //variables for driving that do not show up in editor
        this.drive_currentSpeed = 0; //the current speed of the movement.
        this.drive_boostSpeed = 0; //additional boost effect speed
        this.turning = false; //is the player currently turning, or just driving straight?
        this.boosting = false; //is the player currently trying to use a boost by hitting both left and right at once?
        this.pressing_left = false; //is the player turning left on the controls?
        this.pressing_right = false; //is the player turning right on the controls?
        this.pressing_jump = false; //is the player holding jump on the controls?
        
        this.boosting_turn_delay = 0.25; //delay for turn boosting, to make exploiting snaking less useful.
        this.boosting_turn_delay_current = 0.00; //the current countdown for boost turn delay.
        
        // JUMPING VALUES
        this.jump_charge = 0; //how much jump power has been saved up?
        this.jump_charge_minimum = 400; //jump charge must be over this value to count as a jump, or the jump will be ignored.
        
        //BOOST POWER internal values
        this.boost_charge = 0; //how much boosting power is saved up in the manual boost, boost power used only when player uses it in controls?
        this.boost_charge_rate = 60; //rate * time to add to manual boost charge up and burn rate.
        this.autoboost_charge = 0; //how much boosting power is stored in the autoboost - boost power automatically used when higher then 0
        this.autoboost_charge_rate = 60; //rate * time to add to autoboost per frame
        this.boost_vector = new pc.Vec3(); //vector for boost effect direction
        
        //////////////////////////////////////////////////
        this.wheel_on_ground = false; //is the wheel of the player on the ground?
        this.groundCheckRay = new pc.Vec3(0,-this.ground_check_distance,0);
        this.rayEnd = new pc.Vec3();
        
        //TOUCH SCREEN SIZE
        this.screen_width = window.screen.width;
        this.screen_height = window.screen.height;
        this.screen_w_third = this.screen_width / 3;
        this.touch_left = false;
        this.touch_right = false;
        this.touch_jump = false;
        
        //used to calculate speed during race
        this.calculatedSpeedVector = new pc.Vec3();
        
        //self flag, allows pause resume to control movement on and off, but only if race has been started and not over.
        this.enable_pause_stop_movement = false;
        
        //movement "magic number" to multiply movement by in order to preserve physics feel
        this.magic_number = 60;
        //storage value for recalculated turn rate based on fps rate
        this.drive_turnRate_modded = 0;
        
        //vector for calculating movement speed
        this.drive_vector = new pc.Vec3();
        
        this.frames_per_second = 1 / 60; //physics frames per second to emulate, formula is (1 / whatever amount of frames to try to stick to)
        this.frames_per_second_count = 0; //the count since last physics update
    };

    Robot_movement.prototype = {
        // Called once after all resources are loaded and before the first update
        initialize: function () {
            this.drive_originalFriction = this.entity.rigidbody.friction; //save the editor friction
            //if "respawn" event is heard, lose all boosts and reset control inputs.
            app.on("respawn", this.respawn,this);            
            //if "race_start" is heard, start up rigidbody
            app.on("race_start",this.race_start,this);            
            //if "race_end" is heard, stop rigidbody from moving
            app.on("race_end",this.race_end,this);            
            //get widths of screen
            this.recalculate_width_of_screen();            
            //listen for touch control
            this.enable_touch = false;
            //if we have a touch device, enable the touch controls
            if(app.touch) {
                app.touch.on("touchstart",this.touchcheck,this);
                app.touch.on("touchend",this.touchcheck,this);
                window.addEventListener("orientationchange",this.recalculate_width_of_screen,false);
                window.addEventListener("resize",this.recalculate_width_of_screen,false);
                this.enable_touch = true;
            }            
            //update some globals to match this object's settings
            window.globals.PlayerMaxBoostCharge = this.drive_maxBoostCharge;
            window.globals.PlayerMaxJumpCharge = this.jump_topCharge;            
            //listen for pause gui
            app.on("GUI:Pause",this.GUI_Pause,this);
            app.on("GUI:Resume",this.GUI_Resume,this);
            app.on("GUI:ResetRace",this.GUI_ResetRace,this);            
            //listen for boost gain
            app.on("player_getBoost",this.player_getBoost,this);
            
            //get sound object so we can play some noise
            this.sound_entity = this.entity.findByName("sounds");
            //listen for collision enter
            this.entity.collision.on("collisionstart",this.on_collisionstart,this);
            //listen for coin collecting
            app.on("collect_coin",this.collect_coin_sound,this);
            
            //values for checking sound effects
            this.sound_got_boost = false;
            this.sound_jump_released = false;
            this.sound_jump_charge_start = false;
            this.sound_fell = false;
        },
        
        ///clean up listeners on destroy
        destroy : function() {
            app.off("respawn", this.respawn,this);
            app.off("race_start",this.race_start,this);
            app.off("race_end",this.race_end,this);
            if(app.touch){
                //remove touch listeners
                app.touch.off("touchstart",this.touchcheck,this);
                app.touch.off("touchend",this.touchcheck,this);
                window.removeEventListener("orientationchange",this.recalculate_width_of_screen,false);
                window.removeEventListener("resize",this.recalculate_width_of_screen,false);
            }
            app.off("GUI:Pause",this.GUI_Pause,this);
            app.off("GUI:Resume",this.GUI_Resume,this);
            app.off("GUI:ResetRace",this.GUI_ResetRace,this);
            app.off("player_getBoost",this.player_getBoost,this);
            //this.entity.collision.off("collisionstart",this.on_collisionstart,this);  // no need to remove this, the entity already doesn't exist when destroyed.
            app.off("collect_coin",this.collect_coin_sound,this);
        },
        
        /////////////////////////////////////////////////////////////        
        
        GUI_ResetRace : function() {
            this.entity.rigidbody.enabled = false;
            this.enable_pause_stop_movement = false;
            this.stop_making_noise();
            this.boost_charge = 0;
            this.autoboost_charge = 0;
            this.drive_boostSpeed = 0;
            this.drive_currentSpeed = 0;
            this.jump_charge = 0;
            this.boosting = false;
            this.turning = false;
            this.pressing_jump = false;
            this.pressing_left = false;
            this.pressing_right = false;
        },
        
        GUI_Pause : function() {
            //pause movement if game is paused
            if(this.enable_pause_stop_movement) {
                this.entity.rigidbody.enabled = false;
            }
            this.stop_making_noise();
        },
        
        GUI_Resume : function() {
            //resume movement, but only if race is in progress
            if(this.enable_pause_stop_movement) {
                this.entity.rigidbody.enabled = true;
            }
        },
        
        player_getBoost : function(amount) {
            this.boost_charge += amount;
            this.sound_got_boost = true;
            //keep below max, eating the rest
            if(this.boost_charge > this.driveMaxBoostCharge) {
                this.boost_charge = this.driveMaxBoostCharge;
                
            }
        },
        

        recalculate_width_of_screen : function() {
            this.screen_width = window.screen.availWidth;  // old code window.screen.height;
            this.screen_height = window.screen.availHeight; // old code  window.screen.height;
            this.screen_w_third = this.screen_width / 3;
        },
        
        // LISTEN FUNCTIONS
        //
        respawn: function () {
            this.entity.rigidbody.teleport(this.spawnpoint.getPosition(),this.spawnpoint.getRotation());
            this.entity.rigidbody.linearVelocity = pc.Vec3.ZERO; //erase any velocity
            this.entity.rigidbody.angularVelocity = pc.Vec3.ZERO; //erase any rotational velocity
            this.boost_charge = 0;
            this.autoboost_charge = 0;
            this.drive_boostSpeed = 0;
            this.drive_currentSpeed = 0;
            this.jump_charge = 0;
            this.boosting = false;
            this.turning = false;
            this.pressing_jump = false;
            this.pressing_left = false;
            this.pressing_right = false;
            this.sound_fell = true;
        },
        
        race_start: function() {
            //ONLY LISTEN TO A RACE START IF NOT ALREADY ENABLED
            if(!this.entity.rigidbody.enabled) {
                //SINCE THE RIGIDBODY IS NOT ENABLED, WE CAN START A NEW RACE AND RESET EVERYTHING
                this.entity.rigidbody.enabled = true; //turn on physics rigidbody when race starts up.
                this.entity.rigidbody.linearVelocity = pc.Vec3.ZERO; //erase any movement from rigidbody
                this.entity.rigidbody.angularVelocity = pc.Vec3.ZERO; //erase any rotation from rigidbody
                //also reset some internal logic numbers so we start fresh like nothing was ever done to the logic
                this.boost_charge = 0;
                this.autoboost_charge = 0;
                this.drive_boostSpeed = 0;
                this.drive_currentSpeed = 0;
                this.wheel_on_ground = false;
                this.boosting = false;
                this.turning = false;
                //also enable pause feature to control movement
                this.enable_pause_stop_movement = true;
                //stop playing death sound
                this.sound_fell = false;
            }
        },
        
        race_end: function() {
            this.entity.rigidbody.enabled = false; //stop moving the player, freezing them in place
            //also disable resuming movement if pause feature is used.
            this.enable_pause_stop_movement = false;
            
            //stop all looping sounds on race end
            this.stop_making_noise();
            
        },
        
        /////////////////////////////////////////////////////////
        // TOUCH CONTROLS
        /////////////////////////////////////////////////////////
        touchcheck : function (e) {
            //check touch events
            touched = e.touches.length;
            //loop over all touched objects to find if anything is poking the virtual controls.
            this.touch_left = false;
            this.touch_jump = false;
            this.touch_right = false;
            
            var cur_x = 0;
            var cur_y = 0;
            for(var i = 0; i < touched;i++) {
               // console.log("checking touch number " + i + " in the for loop.");
                cur_x = e.touches[i].x;
                cur_y = e.touches[i].y;
                if(cur_y > (this.screen_height/2) && cur_x < (this.screen_width/2)) {
                    this.touch_left = true;
                    //console.log("touched the left.");
                }
                if(cur_y > (this.screen_height/2) && cur_x > (this.screen_width/2)) {
                    this.touch_right = true;
                    //console.log("touched the middle.");
                }
                if(cur_y < (this.screen_height/2) && cur_y > 80) {
                    this.touch_jump = true;
                    //console.log("touched the right.");
                }
            }
        },
        
        //////////////////////////////////////////////////////////////////////////////////////////
        // SETS this.pressing_left AND OTHER FLAGS BASED ON this.touch_left AND OTHER TOUCH FLAGS
        update_touch_controls : function () {
            //If the player is not enabled to move, don't respond to touch either.
            if(!this.entity.rigidbody.enabled) {
                return;  //just cancel running this function and return if we are not allowed to move.
            }
            
            if(this.touch_left) {
                this.pressing_left = true;
            }
            if(this.touch_jump) {
                this.pressing_jump = true;
            }
            if(this.touch_right) {
                this.pressing_right = true;
            }
        },
        
        /////////////////////////////////////
        // UPDATE THE this.drive_currentSpeed VALUE BASED ON SOME GAME LOGIC
        update_speed: function (dt) { 
            //check if turning
            if(this.turning) {
                //if turning or jumping, slow down
                this.drive_currentSpeed -= this.drive_turnSlowDown*(dt);
                //if below 20, add more break assist
            } else {
                //if NOT turning, speed up
                this.drive_currentSpeed += this.drive_acceleration*(dt);
                //if this.drive_currentSpeed too low, cheat in some speed to get the robot moving
                if(this.calculatedSpeedVector.length() < 5) {
                    this.drive_currentSpeed += (this.drive_acceleration*20)*dt;
                }
            }
            //cap speed in sane ranges
            if(this.drive_currentSpeed < 0) {this.drive_currentSpeed = 0;}
            if(this.drive_currentSpeed > this.drive_topSpeed) {this.drive_currentSpeed = this.drive_topSpeed;}
        },
        /////////////////////////////////////////////////////////////
        // UPDATE THE this.wheel_on_ground flag based on a raytrace below the player.
        update_wheel_on_ground: function() {
            //cache this entity object, cause java this sucks
            var self = this;
            this.groundCheckRay.x = 0;
            this.groundCheckRay.y = -this.ground_check_distance;
            this.groundCheckRay.z = 0;
            this.rayEnd.add2(this.entity.getPosition(), this.groundCheckRay);
            
            this.wheel_on_ground = false;
            // Fire a ray straight down to just below the bottom of the rigid body, 
            // if it hits something then the character is standing on something.
            app.systems.rigidbody.raycastFirst(this.entity.getPosition(), this.rayEnd, function (result) {
                self.wheel_on_ground = true;
            });
                       
        },

        ////////////////////////////////////////////
        // UPDATE THE PLAYER CONTROL INPUTS LIKE this.pressing_left WITH THE TOUCH AND KEYBOARD INPUT FROM CONTROLS
        update_controls: function() {
          //update the inputs based on control inputs being passed in
          //assume no input
          this.pressing_right = false;
          this.pressing_left = false;
          this.pressing_jump = false;
            
          //update touch controls
          if(this.enable_touch) { 
              this.update_touch_controls();
          }
          
          //if right input is pressed, set to true instead
          if(app.keyboard.isPressed(pc.KEY_RIGHT) || this.touch_right) {
              this.pressing_right = true;
          }
          if(app.keyboard.isPressed(pc.KEY_LEFT) || this.touch_left) {
              this.pressing_left = true;
          }
          if(app.keyboard.isPressed(pc.KEY_SPACE) || this.touch_middle) {
              this.pressing_jump = true;
          }
            
          
          //set boosting and turning values based on control inputs
          this.boosting = false;
          if(this.pressing_left && this.pressing_right) {
              this.boosting = true;
          }
          this.turning = false;
          if(this.pressing_left && !this.pressing_right && this.boosting === false) {
              this.turning = true;
          }
          if(this.pressing_right && !this.pressing_left && this.boosting === false) {
              this.turning = true;
          }
                    
        },
        
        /////////////////////////////////
        // APPLY ROTATION WHEN TURNING
        update_turning: function(dt) {
            if(this.turning && this.pressing_left && !this.pressing_right) {
                //calculate a new turn rate based on frames and original turn rate
                this.drive_turnRate_modded = this.drive_turnRate*(dt);
                
              //  if(this.wheel_on_ground) { //only work on the ground
                    //this.entity.rigidbody.applyTorqueImpulse(0,(this.drive_turnRate_modded),0);
              //  }
            }
            if(this.turning && this.pressing_right && !this.pressing_left) {
                //calculate a new turn rate based on frames and original turn rate
                this.drive_turnRate_modded = 0-this.drive_turnRate*(dt);
                
               // if(this.wheel_on_ground) { //only work on the ground
                    //this.entity.rigidbody.applyTorqueImpulse(0,(-this.drive_turnRate_modded),0);
               // }
            }
        },
        
        /////////////////////////////
        //JUMPING CHARGE AND RELEASE
        update_jumping: function(dt) {
            //just check if jump is held down and wheels are on ground
            if(this.pressing_jump && this.wheel_on_ground) {
                this.jump_charge += this.jump_chargeRate*(dt*this.magic_number);
            }
            //fix overcharge or undercharge to keep values sane
            if(this.jump_charge > this.jump_topCharge) {
                this.jump_charge = this.jump_topCharge;
            }
            if(this.jump_charge < 0) {
                this.jump_charge = 0;
            }
        },
        
        /////////////////////////
        // YOU'VE GOT BOOST POWER
        update_boost: function(dt) {
            //count down boosting_turn_delay_current if over 0
            if(this.boosting_turn_delay_current > 0 && this.turning) {
                this.boosting_turn_delay_current -= dt;
                if(this.boosting_turn_delay_current < 0) {
                    this.boosting_turn_delay_current = 0;
                }
            }
            //if turn was released, set delay back to normal
            if(!this.turning) {
                //give extra missing boost time if the timer was at 0
                if(this.boosting_turn_delay_current === 0) {
                    this.autoboost_charge += (this.autoboost_charge_rate * this.boosting_turn_delay); //reward the player with the extra boost we skipped due to timer.
                }
                this.boosting_turn_delay_current = this.boosting_turn_delay; // reset the boosting timer.
            }
            //reset boost vector to normal forward vector
            this.boost_vector = this.entity.forward;
            this.drive_boostSpeed = 0; //unless a boost is being triggered, the push is always 0 speed.
            ///////////////////////////////////////////
            //GAIN BOOSTING ENERGY ON CERTAIN CONDITIONS
            //gain on turning
            if(this.turning && this.boosting_turn_delay_current === 0) {
                this.autoboost_charge += this.autoboost_charge_rate * (dt);
                //this.boost_charge += this.autoboost_charge_rate * dt;
            }
            
            ///////////////////////////////
            //AUTO BOOSTING IF AUTOBOOST ENERGY EXISTS.
            //energy is gained from jump charging or from turning a corner.  
            //Spent once the player is straight and not inputting anything into the controls.
            if(this.autoboost_charge > 0 && !this.turning && !this.pressing_jump) {
                this.drive_boostSpeed += this.drive_boostEffect * (dt);
                this.autoboost_charge -= this.autoboost_charge_rate * (dt);
                //this.autoboost_charge = 0; //attempt at new mechanic for autoboost power
            }
            //keep boost charge in sane range
            if(this.boost_charge > this.drive_maxBoostCharge) {
                this.boost_charge = this.drive_maxBoostCharge;
            }
            if(this.boost_charge < 0) {
                this.boost_charge = 0;
            }
            //keep autoboost in sane range
            if(this.autoboost_charge > this.drive_maxBoostCharge) {
                this.autoboost_charge = this.drive_maxBoostCharge;
            }
            if(this.autoboost_charge < 0) {
                this.autoboost_charge = 0;
            }            
            ///////////////////////////////////
            //MANUALLY USED BOOSTING, TRIGGERED ONLY WHEN PLAYER ASKS FOR IT BY HOLDING BOTH LEFT AND RIGHT TOGETHER.  
            //Energy is gained from collecting nitro packs, or from turning corners long enough.
            //spent only by player holding down left and right controls together.  Stacks with autoboost push if used together.
            //Only works on the ground.
            if(this.boost_charge > 0 && this.boosting && !this.pressing_jump && this.wheel_on_ground) {
                this.drive_boostSpeed += this.drive_boostEffect * (dt);
                this.boost_charge -= this.boost_charge_rate * (dt);
                
            }
            ////////////////////////////////////
            //keep boosting values in sane limits
            if(this.drive_boostSpeed > this.drive_maxBoostSpeed) {
                this.drive_boostSpeed = this.drive_maxBoostSpeed;
            }
            if(this.drive_boostSpeed < 0) {
                this.drive_boostSpeed = 0;
            }
        },
        
        
        // Called every frame, dt is time in seconds since last update
        update: function (dt) {
            //check if rigidbody is enabled before running any movement logic, skip if not enabled.
            if(this.entity.rigidbody.enabled) {
                //if enabled, run these functions to update it's movement and respond to player input.
                this.update_wheel_on_ground();  //raytrace check to see if player is on ground
                this.update_controls(); //update the player's input values.
                this.update_speed(dt); //update the speed one step.
                this.update_boost(dt); //update the boost power.
                this.update_jumping(dt); //update the jumping logic, jumping if needed.
                
                //update physics on a timer instead of leaving it up to other attempts
                this.frames_per_second_count += dt;
                //for every unprocessed physics frame, do all the pushing stuff
                while(this.frames_per_second_count > this.frames_per_second) {
                    this.physics_push();
                    this.frames_per_second_count -= this.frames_per_second;
                }
                
                //update globals
                window.globals.PlayerBoostCharge = this.boost_charge;
                this.calculatedSpeedVector = this.entity.rigidbody.linearVelocity.clone();
                this.calculatedSpeedVector.y = 0;
                window.globals.PlayerSpeed = this.calculatedSpeedVector.length().toFixed(0);
                window.globals.PlayerJumpCharge = this.jump_charge;
                
                //update sounds
                this.sound_update(dt);
            }
        },
        
        physics_push : function()  {
            //finally fed up with trying to get the above on a steady framerate, writing my own physics loop check to push at a steady rate.
            //apply push of speed rate + boosting speed rate
            //if the wheel is touching the ground
            if(this.wheel_on_ground){
                //move robot forwards
                this.drive_vector = this.entity.forward.clone();
                this.drive_vector.scale((-this.drive_currentSpeed)+(-this.drive_boostSpeed));  //apply both boost and normal speed to robot at once.
                this.entity.rigidbody.applyImpulse(this.drive_vector); //instant move test
            } //end of on ground
            //apply any turning needed
            if(this.turning) {
                this.update_turning(this.frames_per_second);
                this.entity.rigidbody.applyTorqueImpulse(0,(this.drive_turnRate_modded),0);
            }
            ////if turning, increase friction
            if(this.entity.rigidbody.friction != this.drive_originalFriction && !this.turning) {
                this.entity.rigidbody.friction = this.drive_originalFriction; //restore original editor friction if not turning.
            }
            if(this.turning) {
                this.entity.rigidbody.friction = this.drive_turnFriction; //set to turning friction value if turning.
            }
            //Jumping
            //if jump is released, and jump_charge is more then the minimum, trigger a jump.
            if(this.jump_charge > this.jump_charge_minimum && !this.pressing_jump) {
                this.entity.rigidbody.applyImpulse(0,this.jump_charge,0); //PUSH THE PLAYER UPWARDS
                this.jump_charge = 0; //reset the charge amount to 0
                this.sound_jump_released = true;
            }
            
            //if jump is below or equal to minimum when released, force the jump_minimum instead.
            if(this.jump_charge <= this.jump_charge_minimum && !this.pressing_jump && this.jump_charge > 0) {
                this.jump_charge = this.jump_charge_minimum;
                this.entity.rigidbody.applyImpulse(0,this.jump_charge,0); //PUSH THE PLAYER UPWARDS
                this.jump_charge = 0;
                this.sound_jump_released = true;
            }
            //force update of physics
            this.entity.rigidbody.activate();
        },
        
        /////////////////////// SOUND EFFECTS ////////////////////////////////////
        
        //collision sounds
        on_collisionstart : function(result) {
           // console.log("collision, sound_allow_landing = "+this.sound_allow_landing);
            //if(result.other.rigidbody && this.sound_allow_landing) {
            if(result.other.rigidbody && this.sound_allow_landing) {
                this.sound_entity.sound.play("landing");
                this.sound_allow_landing = false;
            }

        },
        
        collect_coin_sound : function() {
            this.sound_entity.sound.play("coin_pickup");
        },
        
        //update the state of the turn sound effect
        sound_update : function(dt) {
            // play turning sound when turning
            if(this.turning){
                if(this.sound_entity.sound.slots.turn.isPlaying) {
                    this.sound_entity.sound.resume("turn");
                } else {
                    this.sound_entity.sound.play("turn");
                }
            } else {
                this.sound_entity.sound.pause("turn");
            }
            //allow clunk if hitting something if the robot "leaves the ground" according to the raytrace response
            if(!this.wheel_on_ground) {
                this.sound_allow_landing = true;
            }
            //boost sound
            if(this.drive_boostSpeed > 0 && !this.sound_boosting_fired) {
                this.sound_entity.sound.play("boost");
                this.sound_boosting_fired = true;
            } 
            if(this.drive_boostSpeed <= 0) {
                this.sound_boosting_fired = false;
                this.sound_entity.sound.stop("boost");
            }
            //boost collecting sound
            if(this.sound_got_boost) {
                this.sound_entity.sound.play("boost collect");
                this.sound_got_boost = false;
            }
            //jump sounds
            if(this.jump_charge > 0 && !this.sound_jump_charge_start) {
                this.sound_entity.sound.play("jump_charge");
                this.sound_jump_charge_start = true;
            }
            if(this.sound_jump_released) {
                this.sound_jump_charge_start = false;
                this.sound_jump_released = false;
                this.sound_entity.sound.play("jump");
                this.sound_entity.sound.stop("jump_charge");
            }
            //falling sound
            if(this.sound_fell) {
                this.sound_entity.sound.play("fall");
                this.sound_fell = false;
            }   
        },
        
        stop_making_noise : function() {
            //put all looping sounds on pause.
            this.sound_entity.sound.pause("turn");
            this.sound_entity.sound.pause("boost");
            this.sound_entity.sound.pause("jump_charge");
        }
    };
    
    return Robot_movement;
});