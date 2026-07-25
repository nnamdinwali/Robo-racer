//Manages the race laps, and lap times for the current race.
// - listens for "race_start" to start timers.
// - listens for checkpoints to say "checkpoint_hit", adds 1 to the number of checkpoints this lap
// - checks the total checkpoint count, and if valid, listens for the finish line to send "new_lap".  Resets the lap timer and checkpoint counts.
// - keeps a total time for the current lap, in milliseconds elapsed.
// - has 3 lap times it stores, for display in the GUI during a race.
// - keeps the total time for all laps as well, to submit in the end as a high score.
// - on lap 3 "new_lap", sends "race_end" message over broadcast, and stops counting time or laps.
//
// BANNER ADS (Yandex / AndroidBridge):
// - showBanner() is called on race_start  → banner appears during active gameplay only.
// - hideBanner() is called on race_end, GUI:Pause, and GUI:ResetRace.
// - On GUI:Resume the banner is restored only if the race was still active.
// - All calls are guarded so the game still works in a plain browser (no AndroidBridge).

pc.script.attribute("checkpoint_count","number",4, {
   description: "The highest ID for checkpoints.  A lap is only complete if this one is hit." 
});

// ─── Android ad bridge helper ─────────────────────────────────────────────────
// Safe wrapper: only calls AndroidBridge when running inside the Android WebView.
// Does nothing in a regular browser, so the game is unaffected outside Android.
function _adBridge(method) {
    try {
        if (window.AndroidBridge && typeof window.AndroidBridge[method] === 'function') {
            window.AndroidBridge[method]();
        }
    } catch (e) { /* swallow any bridge errors silently */ }
}
// ─────────────────────────────────────────────────────────────────────────────

pc.script.create('race_manager', function (app) {
    // Creates a new Race_manager instance
    var Race_manager = function (entity) {
        this.entity = entity;
        //variables to keep track of race status
        this.score_multiplier = 1;
        this.race_time = 0.000;
        this.race_lap_time = 0.000;
        this.race_lap_times = [];
        this.race_lap = 1;
        this.race_running = false;
        this.rounded_time = 0;
        this.fired_race_end = false;
        this.race_active = false; // true while a race is in progress (banner tracking)
    };

    Race_manager.prototype = {
        initialize: function () {
            app.on("race_start",this.race_start,this);
            app.on("checkpoint_hit",this.checkpoint_hit,this);
            app.on("new_lap",this.new_lap,this);
            app.on("GUI:ResetRace",this.GUI_ResetRace,this);
            app.on("GUI:Pause",this.GUI_Pause,this);
            app.on("GUI:Resume",this.GUI_Resume,this);
            window.globals.MaxCurrentCheckpoint = this.checkpoint_count;
        },
        
        destroy : function() {
            app.off("race_start",this.race_start,this);
            app.off("checkpoint_hit",this.checkpoint_hit,this);
            app.off("new_lap",this.new_lap,this);
            app.off("GUI:ResetRace",this.GUI_ResetRace,this);
            app.off("GUI:Pause",this.GUI_Pause,this);
            app.off("GUI:Resume",this.GUI_Resume,this);
        },
        
        GUI_ResetRace : function() {
            this.race_start();
            this.race_running = false;
            this.race_active = false;
            app.fire("checkpoint_reset");
            window.globals.CurrentLap = this.race_lap;
            window.globals.LapTime = this.round_time(this.race_lap_time);
            window.globals.RaceTime = this.race_time;
            window.globals.CurrentLap = this.race_lap;
            // Player returned to menu — hide banner
            _adBridge('hideBanner');
        },
        
        GUI_Pause : function() {
            this.race_running = false;
            // Hide banner while paused (Huawei AppGallery: no banner on pause screen)
            _adBridge('hideBanner');
        },
        
        GUI_Resume : function() {
            this.race_running = true;
            // Restore banner only if the race is still in progress
            if (this.race_active) {
                _adBridge('showBanner');
            }
        },
        
        checkpoint_hit: function() {
            window.globals.CurrentCheckpoint++;
        },
        
        new_lap: function() {
            this.race_lap++;
            window.globals.CurrentCheckpoint = 0;
            this.race_lap_times.push(this.race_lap_time);
            window.globals.RaceTime = this.race_time;
            window.globals.CurrentLap = this.race_lap;
            this.race_lap_time = 0;
        },
        
        race_start: function() {
            this.race_lap = 1;
            this.race_lap_time = 0;
            this.race_lap_times = [];
            this.race_time = 0;
            this.race_running = true;
            this.fired_race_end = false;
            this.race_active = true;
            window.globals.CurrentLap = this.race_lap;
            // Race is live — show banner
            _adBridge('showBanner');
        },
        
        round_time: function(time) {
            this.rounded_time = Math.round(time * 1000) / 1000;
            return this.rounded_time;
        },
        
        time_update: function(dt) {
            this.race_lap_time += dt;
            this.race_time += dt;
            window.globals.LapTime = this.round_time(this.race_lap_time);
        },
        
        race_logic_update: function() {
            if(this.race_lap > 3 && !this.fired_race_end) {
                app.fire("race_end");
                this.fired_race_end = true;
                this.race_active = false;
                this.race_running = false;
                this.entity.sound.play("finish");
                // Race finished — hide banner (results screen is shown)
                _adBridge('hideBanner');
            }
        },

        update: function (dt) {
            if(this.race_running) {
                this.time_update(dt);
                this.race_logic_update();    
            }
        }
    };

    return Race_manager;
});
