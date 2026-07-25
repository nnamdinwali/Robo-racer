//race results screen script — updates labels and triggers ads.
//
// AD LOGIC:
//   Interstitial: shown 1.5 s after results screen appears, giving the player
//                 time to see their score before the full-screen ad appears.
//   Rewarded    : reward:double_score event doubles PlayerScore (fired by Android
//                 after player watches the full rewarded video in double_score_button.js)

pc.script.attribute("track_label","entity",null);
pc.script.attribute("this_race_time_label","entity",null);
pc.script.attribute("best_race_time_label","entity",null);
pc.script.attribute("this_race_score_label","entity",null);
pc.script.attribute("best_race_score_label","entity",null);
pc.script.attribute("show_new_best_time_label","entity",null);
pc.script.attribute("show_new_best_score_label","entity",null);

// Safe AndroidBridge helper — no-op in a plain browser.
function _adBridge(method) {
    try {
        if (window.AndroidBridge && typeof window.AndroidBridge[method] === 'function') {
            window.AndroidBridge[method]();
        }
    } catch (e) {}
}

pc.script.create('race_results_script', function (app) {
    var Race_results_script = function (entity) {
        this.entity = entity;
        this._happyMomentFired = false;
        this._interstitialTimer = null;
    };

    Race_results_script.prototype = {

        initialize: function () {
            app.on("GUI:RaceResults", this.onRaceResults,   this);
            app.on("reward:double_score", this.onDoubleScore, this);
        },

        onRaceResults: function () {
            this._happyMomentFired = false;

            // Show interstitial after 1.5 s — player sees their results first,
            // then the natural break between race and next action shows the ad.
            if (this._interstitialTimer) clearTimeout(this._interstitialTimer);
            this._interstitialTimer = setTimeout(function () {
                _adBridge('showInterstitial');
            }, 1500);
        },

        // Fired by Android (via evaluateJavascript) after player watches full rewarded ad.
        onDoubleScore: function () {
            var t    = window.gpLang || {};
            var rank = t.rank || " rank: ";

            window.globals.PlayerScore = window.globals.PlayerScore * 2;

            this.this_race_score_label.script.font_renderer.text =
                window.globals.PlayerScore + rank + window.globals.PlayerRankScore;

            if (window.globals.PlayerScore > window.globals.TopRaceScore) {
                window.globals.TopRaceScore = window.globals.PlayerScore;
                window.globals.NewScoreRecord = true;
                this.best_race_score_label.script.font_renderer.text =
                    window.globals.TopRaceScore + rank + window.globals.PlayerBestRankScore;
                this.show_new_best_score_label.enabled = true;
            }

            if (typeof GamePix !== "undefined") {
                GamePix.updateScore(window.globals.PlayerScore);
                GamePix.happyMoment();
            }
        },

        update: function (dt) {
            var t    = window.gpLang || {};
            var rank = t.rank || " rank: ";

            if (window.globals.CurrentTrack == 1) {
                this.track_label.script.font_renderer.text = t.resultsAlpha || "Results: Track Alpha";
            }
            if (window.globals.CurrentTrack == 2) {
                this.track_label.script.font_renderer.text = t.resultsBeta  || "Results: Track Beta";
            }
            if (window.globals.CurrentTrack == 3) {
                this.track_label.script.font_renderer.text = t.resultsGamma || "Results: Track Gamma";
            }

            this.this_race_time_label.script.font_renderer.text  = window.globals.RaceTime    + rank + window.globals.PlayerRankTime;
            this.this_race_score_label.script.font_renderer.text = window.globals.PlayerScore + rank + window.globals.PlayerRankScore;
            this.best_race_time_label.script.font_renderer.text  = window.globals.TopRaceTime + rank + window.globals.PlayerBestRankTime;
            this.best_race_score_label.script.font_renderer.text = window.globals.TopRaceScore + rank + window.globals.PlayerBestRankScore;

            window.globals.NewTimeRecord  = (window.globals.TopRaceTime  >= window.globals.RaceTime);
            window.globals.NewScoreRecord = (window.globals.TopRaceScore <= window.globals.PlayerScore);

            this.show_new_best_time_label.enabled  = window.globals.NewTimeRecord;
            this.show_new_best_score_label.enabled = window.globals.NewScoreRecord;

            if (!this._happyMomentFired && (window.globals.NewTimeRecord || window.globals.NewScoreRecord)) {
                if (typeof GamePix !== "undefined") {
                    GamePix.happyMoment();
                }
                this._happyMomentFired = true;
            }
        }
    };

    return Race_results_script;
});
