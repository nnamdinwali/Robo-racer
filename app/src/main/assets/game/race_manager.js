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
//                 NEVER shown on the menu / title screen (guarded by window.globals.OnTitle).
//                 Hidden immediately any time the title screen is shown, the race is paused,
//                 the player quits, or the race ends.
//   Interstitial: shown after player falls off track 3 times in one race.
//   All bridge calls no-op silently in a plain browser.
//
// ROOT-CAUSE NOTE:
//   race_start_countdown.js sets countdown_start = true inside onEnable().
//   GUI_controlhelpdisplay.js auto-dismisses on a timer and enables the
//   "Race Start Countdown" entity — so the countdown can fire on the title
//   screen on first load, eventually emitting race_start (race_active = true)
//   and race_underway.  The fix: every showBanner call is guarded by
//   !window.globals.OnTitle, AND GUI:Title always hides the banner immediately.

pc.script.attribute("checkpoint_count","number",4, {
   description: "The highest ID for checkpoints.  A lap is only complete if this one is hit."
});

// Safe wrapper — only calls AndroidBridge inside the Android WebView.
function _adBridge(method) {
    try {
        if (window.AndroidBridge && typeof window.AndroidBridge[method] === "function") {
            window.AndroidBridge[method]();
        }
    } catch (e) {}
}

pc.script.create("race_manager", function (app) {

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
            app.on("GUI:Title",      this.GUI_Title,      this); // hide banner when menu is shown
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
            app.off("GUI:Title",      this.GUI_Title,      this);
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
            // Guard: only show banner when actually racing (not on title/menu).
            // window.globals.OnTitle is set to true by GUI_Title() / GUI_version_2_manager
            // and to false only when a track is loaded via _doLoadTrack().
            if (this.race_active && !window.globals.OnTitle) {
                _adBridge("showBanner");
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
            _adBridge("hideBanner"); // leaving gameplay — hide immediately
        },

        GUI_Title: function () {
            // Fired (via app.fire("GUI:Title")) when the menu/title screen is shown.
            // Note: postInitialize in GUI_version_2_manager calls GUI_Title() directly
            // (not via app.fire) on first load, so this listener only catches subsequent
            // navigations — but the OnTitle guard in race_underway covers first load.
            _adBridge("hideBanner");
            // Also clear race state so a stale race_active flag cannot leak to the menu.
            this.race_active  = false;
            this.race_running = false;
        },

        GUI_Pause: function () {
            this.race_running = false;
            _adBridge("hideBanner"); // pause screen visible — hide immediately
        },

        GUI_Resume: function () {
            this.race_running = true;
            // Only restore banner if we are genuinely mid-race (not on menu).
            if (this.race_active && !window.globals.OnTitle) {
                _adBridge("showBanner"); // returning to race — show again
            }
        },

        // ── Fall / respawn ────────────────────────────────────────────────────

        on_respawn: function () {
            if (!this.race_active) return;
            this.fall_count++;
            if (this.fall_count >= 3) {
                this.fall_count = 0;
                _adBridge("showInterstitial");
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
                _adBridge("hideBanner"); // results screen coming — hide immediately
                // Show interstitial ~1.5 s after win so player sees the result first
                setTimeout(function () { _adBridge("showInterstitial"); }, 1500);
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
