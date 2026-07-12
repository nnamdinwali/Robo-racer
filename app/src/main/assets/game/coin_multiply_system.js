//coin multiplication system
// listens for messages from coins or the game system, and sets the global multipliers as needed.
// also scores coins to the player scores.

pc.script.attribute("coin_score_needed","number",270,{
    description: "How many coin collect points are needed for the first multiplier increase?"
});

pc.script.attribute("needed_increase","number",150,{
    description: "How much to increase the coins_needed value each new multiply rank?"
});

pc.script.attribute("coin_multiplier_score","number",100,{
     description: "The amount of points a coin is worth to the multiply bar score"
});

pc.script.attribute("max_multiplier","number",5,{
    description: "The maximum value the multiplier is allowed to reach.  When this is reached, the bar cannot be reset and the level cannot increase."
});

pc.script.attribute("drain_cooldown","number",1,{
    description: "Seconds, how long after a coin collect does the bar start draining?"
});

pc.script.attribute("drain_amount","number",1,{
    description: "The rate of drain, this number is multiplied by the rank of the multiplier as the rank increases."
});


pc.script.create('coin_multiply_system', function (app) {
    // Creates a new Coin_multiply_system instance
    var Coin_multiply_system = function (entity) {
        this.entity = entity;
    };

    Coin_multiply_system.prototype = {
        // Called once after all resources are loaded and before the first update
        initialize: function () {
            this.drain_timer = 0; //temporary timer for checking combo break.
            
            //set some globals
            window.globals.PlayerCoinMultiplierCharge = -1; //set to -1 to hide scoring gui.
            window.globals.PlayerMaxCoinMultiplierCharge = this.coin_score_needed; //set the max value to the current level's requirement
            
            //listeners go here
            app.on("collect_coin",this.collect_coin,this);
            app.on("GUI:ResetRace",this.reset_multiplier,this);
            app.on("race_start",this.reset_multiplier,this);
            app.on("race_end",this.reset_multiplier,this);
            app.on("GUI:Title",this.reset_multiplier,this);
            
            //sound effect flags
            this.sound_play_level_up = false;
            this.sound_play_level_down = false;
        },
        
        
        destroy : function() {
            //clean up listeners here
            app.off("collect_coin",this.collect_coin,this);
            app.off("GUI:ResetRace",this.reset_multiplier,this);
            app.off("race_start",this.reset_multiplier,this);
            app.off("race_end",this.reset_multiplier,this);
            app.off("GUI:Title",this.reset_multiplier,this);
        },
        
        
        collect_coin : function() {
            //stop any drain
            this.drain_timer = 0;
            //add to the multiplier
            window.globals.PlayerCoinMultiplierCharge += this.coin_multiplier_score;
            //check for "rank up"
            this.check_level_of_bar();
            //now that multipliers are accurate, score the coin
            window.globals.PlayerScore += 100 * window.globals.PlayerMultiplier;
        },
        
        
        check_level_of_bar : function() {
            
            //check for rank up
            if(window.globals.PlayerCoinMultiplierCharge >= window.globals.PlayerMaxCoinMultiplierCharge) {
                //rank up but only if there is a new rank to get
                if(window.globals.PlayerMultiplier < this.max_multiplier){
                    //drain the points for the current rank off the charge bar
                    window.globals.PlayerCoinMultiplierCharge -= this.get_rank_score(window.globals.PlayerMultiplier);
                    //rank up
                    window.globals.PlayerMultiplier += 1;
                    // attempting rank up, prepare to play sound
                    this.sound_play_level_up = true;
                    //recalculate new max value for next rank up
                    window.globals.PlayerMaxCoinMultiplierCharge = this.get_rank_score(window.globals.PlayerMultiplier);
                }
                //if there is no ranks to get
                if(window.globals.PlayerMultiplier >= this.max_multiplier) {
                    //force the charge back to max if over
                    if(window.globals.PlayerCoinMultiplierCharge > window.globals.PlayerMaxCoinMultiplierCharge){
                        window.globals.PlayerCoinMultiplierCharge = window.globals.PlayerMaxCoinMultiplierCharge;
                    }
                } else {
                    if(this.sound_play_level_up) {
                        //play rankup sound when rank up was successful
                        this.entity.sound.play("level up");
                        this.sound_play_level_up = false;
                        this.entity.sound.stop("level down");
                    }
                }
            }
            //check for rank down too
            this.check_rank_down();
        },
        
        //find a rank's cost in points, and return it
        get_rank_score : function(rank) {
            if(rank > 1){
                rankscore = (rank * this.needed_increase) + this.coin_score_needed;
                return rankscore;
            } else {
                rankscore = this.coin_score_needed;
                return rankscore;
            }
        },
        
        check_rank_down : function() {
            //reset rank down sound effect
            this.sound_play_level_down = false;
            
            //check for rank down
            if(window.globals.PlayerCoinMultiplierCharge <= -1) {
                //reset all multiplier stuff
                //this.reset_multiplier();
                //rank down a rank
                if(window.globals.PlayerMultiplier > 0) {
                    window.globals.PlayerCoinMultiplierCharge = this.get_rank_score(window.globals.PlayerMultiplier) - 1;
                    window.globals.PlayerMultiplier -= 1;
                    this.sound_play_level_down = true;
                    
                } 
                if(window.globals.PlayerMultiplier <= 0) {
                    //if on rank 0, reset to 1
                    this.reset_multiplier();
                    this.sound_play_level_down = false;  //also stop playing the sound
                }
                //if rank down happened and was not at rank 1, play sound
                if(this.sound_play_level_down){
                    this.entity.sound.play("level down");
                    this.sound_play_level_down = false;
                    this.entity.sound.stop("level up");
                }
            }
        },
        
        
        reset_multiplier : function() {
            //reset multiplier to 1
            window.globals.PlayerMultiplier = 1;
            //reset multiplier charge
            window.globals.PlayerCoinMultiplierCharge = -1;
            //reset the amount to the next mutltiplier
            window.globals.PlayerMaxCoinMultiplierCharge = this.coin_score_needed;
            //reset cooldown timer
            this.drain_timer = 0;
        },

        
        // Called every frame, dt is time in seconds since last update
        update: function (dt) {
            //only update if game is not paused
            if(!window.globals.IsPaused) {
                //check for drained rank
                this.check_rank_down();
                
                //if not empty, add to drain bar timer
                if(window.globals.PlayerCoinMultiplierCharge > -1 && this.drain_timer < this.drain_cooldown) {
                    this.drain_timer += dt;
                }
                //if drain_timer is 10 or over, and multiplier is over 1, drain bar
                if(this.drain_timer >= this.drain_cooldown && window.globals.PlayerCoinMultiplierCharge > -1) {
                    //drain bar by drain amount
                    window.globals.PlayerCoinMultiplierCharge -= (this.drain_amount * window.globals.PlayerMultiplier) * dt;
                }
              }
        }
    };

    return Coin_multiply_system;
});