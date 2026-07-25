//Manages the race laps, and lap times for the current race.
// - listens for "race_start" to start timers.
// - listens for checkpoints to say "checkpoint_hit", adds 1 to the number of checkpoints this lap
// - checks the total checkpoint count, and if valid, listens for the finish line to send "new_lap".
// - keeps a total time for the current lap, in milliseconds elapsed.
// - has 3 lap times it stores, for display in the GUI during a race.
// - keeps the total time for all laps as well, to submit in the end as a high score.
// - on lap 3 "new_lap", sends "race_end" message over broadcast, and stops counting time or laps.
//
// AD LOGIC (AndroidBridge):
//   Banner      : shown on race_start, hidden on race_end / pause / reset
//   Interstitial: shown after player falls off track 3 times in one race
//   All calls are no-ops in a browser (no AndroidBridge), so the game works on web too.

pc.script.attribute("checkpoint_count","number",4, {
   description: "The highest ID for checkpoints. A lap is only complete if this one is hit."
});

// Safe wrapper — only calls AndroidBridge inside the Android WebView.
function _adBridge(method) {
    try {
        if (window.AndroidBridge && typeof window.AndroidBridge[method] === 'function') {
            window.AndroidBridge[method]();
        }
    } catch (e) {}
}

pc.script.create('race_manager', function (app) {

    var Race_manager = function (entity) {
        this.entity = entity;
        this.score_multiplier  = 1;
        this.race_time         = 0.000;
        this.race_lap_time     = 0.000;
        this.race_lap_times    = [];
        this.race_lap          = 1;
        this.race_running      = false;
        this.rounded_time      = 0;
        this.fired_race_end    = false;
        this.race_active       = false; // true while race is live (for banner tracking)
        this.fall_count        = 0;     // falls off track this race (interstitial trigger)
    };

    Race_manager.prototype = {

        initialize: function () {
            app.on("race_start",     this.race_start,     this);
            app.on("checkpoint_hit", this.checkpoint_hit, this);
            app.on("new_lap",        this.new_lap,        this);
            app.on("GUI:ResetRace",  this.GUI_ResetRace,  this);
            app.on("GUI:Pause",      this.GUI_Pause,      this);
            app.on("GUI:Resume",     this.GUI_Resume,     this);
            app.on("respawn",        this.on_respawn,     this); // fall detection
            window.globals.MaxCurrentCheckpoint = this.checkpoint_count;
        },

        destroy: function () {
            app.off("race_start",     this.race_start,     this);
            app.off("checkpoint_hit", this.checkpoint_hit, this);
            app.off("new_lap",        this.new_lap,        this);
            app.off("GUI:ResetRace",  this.GUI_ResetRace,  this);
            app.off("GUI:Pause",      this.GUI_Pause,      this);
            app.off("GUI:Resume",     this.GUI_Resume,     this);
            app.off("respawn",        this.on_respawn,     this);
        },

        GUI_ResetRace: function () {
            this.race_start();
            this.race_running = false;
            this.race_active  = false;
            app.fire("checkpoint_reset");
            window.globals.CurrentLap = this.race_lap;
            window.globals.LapTime    = this.round_time(this.race_lap_time);
            window.globals.RaceTime   = this.race_time;
            _adBridge('hideBanner'); // back to menu
        },

        GUI_Pause: function () {
            this.race_running = false;
            _adBridge('hideBanner'); // Huawei: no banner on pause screen
        },

        GUI_Resume: function () {
            this.race_running = true;
            if (this.race_active) {
                _adBridge('showBanner'); // restore banner only if race still live
            }
        },

        // Called whenever the player is teleported back to the spawnpoint.
        // Also fires from GUI:ResetRace (menu reset) — the race_active guard
        // ensures we only count falls that happen during a live race.
        on_respawn: function () {
            if (!this.race_active) return;
            this.fall_count++;
            if (this.fall_count >= 3) {
                this.fall_count = 0;
                _adBridge('showInterstitial'); // 3 falls → show interstitial
            }
        },

        checkpoint_hit: function () {
            window.globals.CurrentCheckpoint++;
        },

        new_lap: function () {
            this.race_lap++;
            window.globals.CurrentCheckpoint = 0;
            this.race_lap_times.push(this.race_lap_time);
            window.globals.RaceTime   = this.race_time;
            window.globals.CurrentLap = this.race_lap;
            this.race_lap_time        = 0;
        },

        race_start: function () {
            this.race_lap       = 1;
            this.race_lap_time  = 0;
            this.race_lap_times = [];
            this.race_time      = 0;
            this.race_running   = true;
            this.fired_race_end = false;
            this.race_active    = true;
            this.fall_count     = 0; // reset fall counter each race
            window.globals.CurrentLap = this.race_lap;
            _adBridge('showBanner'); // race is live — show banner
        },

        round_time: function (time) {
            this.rounded_time = Math.round(time * 1000) / 1000;
            return this.rounded_time;
        },

        time_update: function (dt) {
            this.race_lap_time += dt;
            this.race_time     += dt;
            window.globals.LapTime = this.round_time(this.race_lap_time);
        },

        race_logic_update: function () {
            if (this.race_lap > 3 && !this.fired_race_end) {
                app.fire("race_end");
                this.fired_race_end = true;
                this.race_active    = false;
                this.race_running   = false;
                this.entity.sound.play("finish");
                _adBridge('hideBanner'); // race done — results screen coming
            }
        },

        update: function (dt) {
            if (this.race_running) {
                this.time_update(dt);
                this.race_logic_update();
            }
        }
    };

    return Race_manager;
});
