//race results screen script
//  updates the results screen with, well, results.

pc.script.attribute("track_label","entity",null);
pc.script.attribute("this_race_time_label","entity",null);
pc.script.attribute("best_race_time_label","entity",null);
pc.script.attribute("this_race_score_label","entity",null);
pc.script.attribute("best_race_score_label","entity",null);
pc.script.attribute("show_new_best_time_label","entity",null);
pc.script.attribute("show_new_best_score_label","entity",null);


pc.script.create('race_results_script', function (app) {
    var Race_results_script = function (entity) {
        this.entity = entity;
        this._happyMomentFired = false;
    };

    Race_results_script.prototype = {
        initialize: function () {
            // reset the flag each time the results screen becomes active
            app.on("GUI:RaceResults", function() {
                this._happyMomentFired = false;
            }, this);

            // Rewarded ad — double score button fires this after successful ad watch
            app.on("reward:double_score", this.onDoubleScore, this);
        },

        // reward:double_score — fired by double_score_button.js after player
        // watches the full rewarded ad. Doubles PlayerScore, refreshes labels,
        // updates best score if needed.
        onDoubleScore: function () {
            var t    = window.gpLang || {};
            var rank = t.rank || " rank: ";

            window.globals.PlayerScore = window.globals.PlayerScore * 2;

            this.this_race_score_label.script.font_renderer.text =
                window.globals.PlayerScore + rank + window.globals.PlayerRankScore;

            // Check if doubled score is a new all-time best
            if (window.globals.PlayerScore > window.globals.TopRaceScore) {
                window.globals.TopRaceScore = window.globals.PlayerScore;
                window.globals.NewScoreRecord = true;
                this.best_race_score_label.script.font_renderer.text =
                    window.globals.TopRaceScore + rank + window.globals.PlayerBestRankScore;
                this.show_new_best_score_label.enabled = true;
            }

            // Report updated score to GamePix
            if (typeof GamePix !== "undefined") {
                GamePix.updateScore(window.globals.PlayerScore);
                GamePix.happyMoment();
            }

            console.log('[DoubleScore] Score doubled to', window.globals.PlayerScore);
        },

        update: function (dt) {
            var t = window.gpLang || {};
            var rank = t.rank || " rank: ";

            if (window.globals.CurrentTrack == 1) {
                this.track_label.script.font_renderer.text = t.resultsAlpha || "Results: Track Alpha";
            }
            if (window.globals.CurrentTrack == 2) {
                this.track_label.script.font_renderer.text = t.resultsBeta || "Results: Track Beta";
            }
            if (window.globals.CurrentTrack == 3) {
                this.track_label.script.font_renderer.text = t.resultsGamma || "Results: Track Gamma";
            }

            this.this_race_time_label.script.font_renderer.text = window.globals.RaceTime + rank + window.globals.PlayerRankTime;
            this.this_race_score_label.script.font_renderer.text = window.globals.PlayerScore + rank + window.globals.PlayerRankScore;
            this.best_race_time_label.script.font_renderer.text = window.globals.TopRaceTime + rank + window.globals.PlayerBestRankTime;
            this.best_race_score_label.script.font_renderer.text = window.globals.TopRaceScore + rank + window.globals.PlayerBestRankScore;

            if (window.globals.TopRaceTime >= window.globals.RaceTime) {
                window.globals.NewTimeRecord = true;
            } else {
                window.globals.NewTimeRecord = false;
            }

            if (window.globals.TopRaceScore <= window.globals.PlayerScore) {
                window.globals.NewScoreRecord = true;
            } else {
                window.globals.NewScoreRecord = false;
            }

            this.show_new_best_time_label.enabled = window.globals.NewTimeRecord;
            this.show_new_best_score_label.enabled = window.globals.NewScoreRecord;

            // fire GamePix happy moment only once per results screen, on a new record
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
