//Manages the race laps, and lap times for the current race.
// - listens for "race_start" to start timers.
// - listens for checkpoints to say "checkpoint_hit", adds 1 to the number of checkpoints this lap
// - checks the total checkpoint count, and if valid, listens for the finish line to send "new_lap".  Resets the lap timer and checkpoint counts.
// - keeps a total time for the current lap, in milliseconds elapsed.
// - has 3 lap times it stores, for display in the GUI during a race.
// - keeps the total time for all laps as well, to submit in the end as a high score.
// - on lap 3 "new_lap", sends "race_end" message over broadcast, and stops counting time or laps.
//
// AD LOGIC (AndroidBridge):
//   Banner      : shown on "race_underway" (countdown fully cleared, player is racing).
//                 Hidden the moment ANY non-race screen appears.
//   Interstitial: shown after player falls off track 3 times in one race.
//   All bridge calls no-op silently in a plain browser.

pc.script.attribute("checkpoint_count","number",4, {
   description: "The highest ID for checkpoints.  A lap is only complete if this one is hit."
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
        this.race_active       = false; // true only while race is live
        this.fall_count        = 0;     // falls off track this race
    };

    Race_manager.prototype = {

        initialize: function () {
            app.on("race_start",     this.race_start,     this);
            app.on("race_underway",  this.race_underway,  this); // countdown cleared → show banner
            app.on("checkpoint_hit", this.checkpoint_hit, this);
            app.on("new_lap",        this.new_lap,        this);
            app.on("GUI:ResetRace",  this.GUI_ResetRace,  this);
            app.on("GUI:Pause",      this.GUI_Pause,      this);
            app.on("GUI:Resume",     this.GUI_Resume,     this);
            app.on("respawn",        this.on_respawn,     this);
            window.globals.MaxCurrentCheckpoint = this.checkpoint_count;
        },

        destroy: function () {
            app.off("race_start",     this.race_start,     this);
            app.off("race_underway",  this.race_underway,  this);
            app.off("checkpoint_hit", this.checkpoint_hit, this);
            app.off("new_lap",        this.new_lap,        this);
            app.off("GUI:ResetRace",  this.GUI_ResetRace,  this);
            app.off("GUI:Pause",      this.GUI_Pause,      this);
            app.off("GUI:Resume",     this.GUI_Resume,     this);
            app.off("respawn",        this.on_respawn,     this);
        },

        // ── Race flow ─────────────────────────────────────────────────────────

        race_start: function () {
            // Resets state. Banner is NOT shown here — countdown is still visible.
            this.race_lap       = 1;
            this.race_lap_time  = 0;
            this.race_lap_times = [];
            this.race_time      = 0;
            this.race_running   = true;
            this.fired_race_end = false;
            this.race_active    = true;
            this.fall_count     = 0;
            window.globals.CurrentLap = this.race_lap;
            // Banner is shown in race_underway (fired ~1s later when GO! clears).
        },

        race_underway: function () {
            // Fired by race_start_countdown.js the frame the "GO!" text disappears.
            // This is the only place the banner is shown — guarantees no menu/countdown overlap.
            if (this.race_active) {
                _adBridge('showBanner');
            }
        },

        GUI_ResetRace: function () {
            this.race_start();
            this.race_running = false;
            this.race_active  = false;
            app.fire("checkpoint_reset");
            window.globals.CurrentLap = this.race_lap;
            window.globals.LapTime    = this.round_time(this.race_lap_time);
            window.globals.RaceTime   = this.race_time;
            _adBridge('hideBanner'); // leaving gameplay — hide immediately
        },

        GUI_Pause: function () {
            this.race_running = false;
            _adBridge('hideBanner'); // pause screen visible — hide immediately
        },

        GUI_Resume: function () {
            this.race_running = true;
            if (this.race_active) {
                _adBridge('showBanner'); // returning to race — show again
            }
        },

        // ── Fall / respawn ────────────────────────────────────────────────────

        on_respawn: function () {
            if (!this.race_active) return;
            this.fall_count++;
            if (this.fall_count >= 3) {
                this.fall_count = 0;
                _adBridge('showInterstitial');
            }
        },

        // ── Checkpoint / lap logic ────────────────────────────────────────────

        checkpoint_hit: function () {
            window.globals.CurrentCheckpoint++;
        },

        new_lap: function () {
            this.race_lap++;
            window.globals.CurrentCheckpoint = 0;
            // Reset checkpoint passed-flags so every checkpoint can fire again next lap.
            app.fire("checkpoint_reset");
            this.race_lap_times.push(this.race_lap_time);
            window.globals.RaceTime   = this.race_time;
            window.globals.CurrentLap = this.race_lap;
            this.race_lap_time        = 0;
        },

        // ── Timing helpers ────────────────────────────────────────────────────

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
                _adBridge('hideBanner'); // results screen coming — hide immediately
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
