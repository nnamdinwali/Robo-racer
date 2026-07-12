//Manages the race laps, and lap times for the current race.
// - listens for "race_start" to start timers.
// - listens for checkpoints to say "checkpoint_hit", adds 1 to the number of checkpoints this lap
// - checks the total checkpoint count, and if valid, listens for the finish line to send "new_lap".  Resets the lap timer and checkpoint counts.
// - keeps a total time for the current lap, in milliseconds elapsed.
// - has 3 lap times it stores, for display in the GUI during a race.
// - keeps the total time for all laps as well, to submit in the end as a high score.
// - on lap 3 "new_lap", sends "race_end" message over broadcast, and stops counting time or laps.

pc.script.attribute("checkpoint_count","number",4, {
   description: "The highest ID for checkpoints.  A lap is only complete if this one is hit." 
});

pc.script.create('race_manager', function (app) {
    // Creates a new Race_manager instance
    var Race_manager = function (entity) {
        this.entity = entity;
        //variables to keep track of race status
        //this.race_score = 0; //the player score for coin mode.
        this.score_multiplier = 1; //the multiplier for coin mode.
        this.race_time = 0.000; //the player time around the track, total.
        this.race_lap_time = 0.000; //the player time, for only the current lap.
        this.race_lap_times = []; //an array of all lap times, indexed by lap.  Use push(time) to add a new time, and this.race_lap_times[lap number] to read data
        //this.race_checkpoints = 0; //the number of checkpoints the player has touched this lap.
        this.race_lap = 1; //the current lap the player is on.
        this.race_running = false; //is the race running?  If false, timers do not count.  If true, race logic is run.
        this.rounded_time = 0; //rounded time function variable
        this.fired_race_end = false; //has this fired the race end?  Used to ensure only a single call is made when race is over.
    };

    Race_manager.prototype = {
        // Called once after all resources are loaded and before the first update
        initialize: function () {
            //setup listeners for events
            //app.on("coin_get",this.coin_get,this);
            app.on("race_start",this.race_start,this);
            app.on("checkpoint_hit",this.checkpoint_hit,this);
            app.on("new_lap",this.new_lap,this);
            app.on("GUI:ResetRace",this.GUI_ResetRace,this);
            //pause feature
            app.on("GUI:Pause",this.GUI_Pause,this);
            app.on("GUI:Resume",this.GUI_Resume,this);
            
            //set global checkpoint count to number of checkpoints set for race
            window.globals.MaxCurrentCheckpoint = this.checkpoint_count;
        },
        
        destroy : function() {
            //app.off("coin_get",this.coin_get,this);
            app.off("race_start",this.race_start,this);
            app.off("checkpoint_hit",this.checkpoint_hit,this);
            app.off("new_lap",this.new_lap,this);
            app.off("GUI:ResetRace",this.GUI_ResetRace,this);
            //pause feature
            app.off("GUI:Pause",this.GUI_Pause,this);
            app.off("GUI:Resume",this.GUI_Resume,this);
        },
        
        
        GUI_ResetRace : function() {
            //run race_start to reset variables
            this.race_start();
            this.race_running = false; //stop all timers
            app.fire("checkpoint_reset");
            //update GUI with lap and time data
            window.globals.CurrentLap = this.race_lap;
            window.globals.LapTime = this.round_time(this.race_lap_time);
            window.globals.RaceTime = this.race_time;
            window.globals.CurrentLap = this.race_lap;
           
        },
        
        GUI_Pause : function() {
            //stop timer on pause
            this.race_running = false;  
        },
        
        GUI_Resume : function() {
            this.race_running = true;  
        },
        
        /*
        //score a coin that has been collected.
        coin_get: function(score) {
            this.race_score += score * this.score_multiplier;
        },*/
        
        //start a race
        race_start: function() {
            this.race_score = 0;  //reset coin score
            this.race_time = 0.000; //reset race time to 0
            this.race_lap_time = 0.000; //reset lap time to 0
            this.race_lap_times = []; //reset lap times to empty array
            //this.race_checkpoints = 0; //reset lap checkpoints to 0.
            this.race_lap = 1; //reset lap to 1
            window.globals.CurrentLap = this.race_lap;
            window.globals.MaxCurrentCheckpoint = this.checkpoint_count;
            window.globals.CurrentCheckpoint = 0;
            this.race_running = true;
            this.fired_race_end = false; //reset race_end flag to allow calling the end of the race again.
        },
        
        checkpoint_hit: function() {
            window.globals.CurrentCheckpoint += 1;
            //this.race_checkpoints += 1; //count up a checkpoint
            //console.log("Checkpoint hit!  Checkpoint count is " + this.race_checkpoints);
            //also play a sound effect
            this.entity.sound.play("checkpoint");
        },
        
        new_lap: function() {
            //check if the checkpoints have all been hit, if so, then trigger a proper new lap.  If not, ignore the broadcast for new_lap.
            if(window.globals.MaxCurrentCheckpoint == window.globals.CurrentCheckpoint){
                window.globals.CurrentCheckpoint = 0;
                //this.race_checkpoints = 0; //reset checkpoints hit
                //round the time to 3 decimal places, there's no point counting further for human players.
                //var rounded_lap_time = Math.round(this.race_lap_time * 1000) / 1000;
                //this.race_lap_times.push(rounded_lap_time); //add the current lap time to the array of lap times
                this.race_lap_times.push(this.round_time(this.race_lap_time));
                this.race_time += parseFloat(this.rounded_time); //also add the lap time to the total race time, for final score.
                window.globals.RaceTime = parseFloat(this.round_time(this.race_time)); //update the globals with the new total time score.
                this.race_lap_time = 0; //reset the lap timer.
                this.race_lap += 1; // count a lap as completed, starting to count the next lap instead.
                window.globals.CurrentLap = this.race_lap; //update the global lap count
                app.fire("checkpoint_reset");  //tell checkpoints to reset themselves for the next lap.
                //console.log("Lap Complete, current lap is " + this.race_lap);
                //fire off a sound effect too, but only if not last lap
                if(this.race_lap <= 3){
                    this.entity.sound.play("newlap");
                }
                
            } else {
                //console.log("race_manager heard the message about a new lap, but says the player hasn't hit all the checkpoints yet.");
            }
        },
        
        round_time : function(time) {
            //round a time value to hundreths
            //this.rounded_time = Math.round(time * 1000) / 1000;
            //this.rounded_time = time.toFixed(3);
            //
            this.rounded_time = parseFloat(Math.round(1000*time)/1000).toFixed(3);
            
            //check length of time, force it to 3 last digits in case rounding broke  -- BROKEN, don't enable.
            /*var roundstring = this.rounded_time.toString();
            var split_string = roundstring.split(".");
            if(split_string.length > 1) {
                    //if longer or equal to 3 characters, trim it to 3 characters and use it in the score value
                    this.rounded_time = Number(split_string[0]+"."+split_string[1].substring(0,3));
                } else {
                    //if shorter then the characters needed for whatever reason, force extra 0s onto the string.
                    var add_length = 3 - split_string[1].length;
                    for (var i = 0; i < add_length; i++) {
                        split_string[1] = split_string[1] + "0";
                    }
                    //now that the time is 3 digits long, run it through the filter like normal
                    this.rounded_time = Number(split_string[0]+"."+split_string[1].substring(0,3));
                }
            }*/
          //  console.log("rounded time called, result is "+this.rounded_time);
            return this.rounded_time;
        },
        
        time_update: function(dt) {
            //update timers
            this.race_lap_time += dt;
            //console.log("race_lap_time line 76 output:" + this.race_lap_time);
            //also update global time
            window.globals.LapTime = this.round_time(this.race_lap_time);
        },
        
        race_logic_update: function() {
            //check lap counts, and see if race is over.
            if(this.race_lap > 3 && !this.fired_race_end) {
                //end the race
                app.fire("race_end");
                //console.log("race_end was called, end of the race.");
                this.fired_race_end = true;
                //stop timers
                this.race_running = false;
                //also fire off a sound effect on race end
                this.entity.sound.play("finish");
            }
        },

        // Called every frame, dt is time in seconds since last update
        update: function (dt) {
            if(this.race_running) {
                //run the race logic and update timers
                this.time_update(dt);
                this.race_logic_update();    
                
            }
        }
    };

    return Race_manager;
});