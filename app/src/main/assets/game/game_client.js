// Handles the client info and GamePix integration.
// -------------------------------------
// - creates and stores the UUID via GamePix.localStorage
// - When race ends, reports score and happy moment to GamePix
// - Added local storage leaderboard logic to restore functionality

pc.script.create('game_client', function (app) {
    var Game_client = function (entity) {
      this.entity = entity;
      this.UUID = "";
      this.leaderboard = [];
      window.game_client_script = this;
    };

    Game_client.prototype = {
        initialize: function () {
            // when the race is over, report to GamePix
            app.on("race_end", this.race_end, this);
            app.on("GUI:GetLeaderboard", this.GUI_GetLeaderboard, this);
            app.on("GUI:SetScoreboardMode", function(mode) {
                window.globals.CurrentScoreboardMode = mode;
                this.GUI_GetLeaderboard(window.globals.CurrentTrack, mode);
            }, this);

            // use GamePix.localStorage if available, else fall back to localStorage
            var storage = (typeof GamePix !== "undefined" && GamePix.localStorage) ? GamePix.localStorage : localStorage;

            var cachedUUID = JSON.parse(storage.getItem("uuid"));
            if (cachedUUID === null || cachedUUID.length === 0) {
                this.UUID = UUID.generate();
                storage.setItem("uuid", JSON.stringify(this.UUID));
            } else {
                this.UUID = cachedUUID;
            }

            this._storage = storage;
        },


        race_end: function () {
            if (typeof GamePix !== "undefined") {
                GamePix.updateScore(window.globals.PlayerScore);
                GamePix.happyMoment();
            }
            this.submit_scores();
            app.fire("GUI:RaceResults", 1);
        },

        submit_scores: function() {
            if (!window.globals) return;
            
            var timeScore = Math.floor(window.globals.RaceTime * 1000);
            var coinScore = window.globals.PlayerScore;
            var track = window.globals.CurrentTrack || 1;

            // Save Time Score
            var timeId = (track === 2) ? 3 : 1;
            this._saveLocalScore(timeId, timeScore);

            // Save Coin Score
            var coinId = (track === 2) ? 4 : 2;
            this._saveLocalScore(coinId, coinScore);
        },

        _saveLocalScore: function(leaderboardId, score) {
            var key = "roboracer_leaderboard_" + leaderboardId;
            var scores = JSON.parse(this._storage.getItem(key)) || [];
            
            // Add new score
            scores.push({
                name: window.globals.PlayerName || "Player",
                score: score,
                timestamp: Date.now()
            });

            // Sort scores
            if (leaderboardId === 1 || leaderboardId === 3) {
                // Time (lower is better)
                scores.sort(function(a, b) { return a.score - b.score; });
            } else {
                // Coins (higher is better)
                scores.sort(function(a, b) { return b.score - a.score; });
            }

            // Keep top 50
            scores = scores.slice(0, 50);
            this._storage.setItem(key, JSON.stringify(scores));
        },

        GUI_GetLeaderboard: function(track, mode) {
            var leaderboardId = (track === 2) ? (mode === 1 ? 4 : 3) : (mode === 1 ? 2 : 1);
            this.leaderboard_name = (track === 2 ? "Track Beta" : "Track Alpha") + (mode === 1 ? " Best Coins" : " Best Times");
            this.leaderboard_mode = mode;

            var key = "roboracer_leaderboard_" + leaderboardId;
            var scores = JSON.parse(this._storage.getItem(key)) || [];
            
            this.leaderboard = scores.map(function(entry, index) {
                return {
                    name: entry.name,
                    nickname: entry.name || "Player",
                    rank: String(index + 1),
                    score: entry.score
                };
            });

            app.fire("leaderboard_refresh");
        },

        convert_scoreboard_to_time: function(score) {
            var seconds = (score / 1000).toFixed(3);
            return seconds;
        },

        // Called every frame, dt is time in seconds since last update
        update: function (dt) {
        }

    };
    return Game_client;
});
