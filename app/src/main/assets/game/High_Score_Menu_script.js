// updates all the strings for the high score table to show the top scores

//how many text objects are there to update?
pc.script.attribute("number_of_texts","number",9);

pc.script.attribute("view_coin_button","entity",null);
pc.script.attribute("view_time_button","entity",null);

pc.script.attribute("highlight_score_tint","rgba",[0,0,0,255],{
    description: "the player's score will be this color."
});

pc.script.attribute("normal_score_tint","rgba",[255,255,255,255],{
    description: "the normal scores color."
});


pc.script.create('High_Score_Menu_script', function (app) {
    var High_Score_Menu_script = function (entity) {
        this.entity = entity;
    };

    High_Score_Menu_script.prototype = {
        initialize: function () {
            app.on("leaderboard_refresh", this.leaderboard_refresh, this);
            app.on("GUI:GetLeaderboard", this.GUI_GetLeaderboard, this);

            this.screen_offset = 0;
            app.on("GUI:ScoresUp", this.GUI_ScoresUp, this);
            app.on("GUI:ScoresDown", this.GUI_ScoresDown, this);
            app.on("GUI:ScoresNext", this.GUI_ScoresNext, this);
        },

        GUI_GetLeaderboard: function () {
            this.screen_offset = 0;
        },

        GUI_ScoresDown: function() {
            this.screen_offset += this.number_of_texts;
            if (this.screen_offset > 49) {
                this.screen_offset = 50 - this.number_of_texts;
            }
            app.fire("leaderboard_refresh");
        },

        GUI_ScoresUp: function() {
            this.screen_offset -= this.number_of_texts;
            if (this.screen_offset < 0) {
                this.screen_offset = 0;
            }
            app.fire("leaderboard_refresh");
        },

        GUI_ScoresNext: function() {
            window.globals.CurrentTrack += 1;
            if (window.globals.CurrentTrack > 2) {
                window.globals.CurrentTrack = 1;
            }
            this.screen_offset = 0;
            app.fire("GUI:GetLeaderboard", window.globals.CurrentTrack, window.globals.CurrentScoreboardMode);
        },


        onEnable: function() {
            if (window.globals.CurrentTrack === 0) {
                window.globals.CurrentTrack = 1;
            }
            window.globals.CurrentScoreboardMode = 0;
            this.screen_offset = 0;
            this.clear_leaderboard();
        },


        button_hide_or_show: function() {
            if (window.globals.CurrentScoreboardMode == 1) {
                if (this.view_coin_button) this.view_coin_button.enabled = false;
                if (this.view_time_button) this.view_time_button.enabled = true;
            } else {
                if (this.view_coin_button) this.view_coin_button.enabled = true;
                if (this.view_time_button) this.view_time_button.enabled = false;
            }
        },


        leaderboard_refresh: function() {
            this.button_hide_or_show();

            // if there is no leaderboard data available, just clear and return
            if (!window.game_client_script || !window.game_client_script.leaderboard) {
                this.clear_leaderboard();
                return;
            }

            var titleEntity = this.entity.findByName("High Score Title");
            if (titleEntity) {
                titleEntity.script.font_renderer.text = window.game_client_script.leaderboard_name || "";
            }

            this.clear_leaderboard();

            var entries = window.game_client_script.leaderboard;
            var length_of_data = entries.length;

            for (var i = 0; i < this.number_of_texts; i++) {
                if ((i + this.screen_offset) < length_of_data) {
                    var current_name = entries[(i + this.screen_offset)].name;
                    var current_nick = entries[(i + this.screen_offset)].nickname;

                    var name_entity = this.entity.findByName("Name" + String(i + 1));
                    var score_entity = this.entity.findByName("Score" + String(i + 1));

                    if (name_entity !== null) {
                        var rank_string = entries[(i + this.screen_offset)].rank;
                        if (rank_string.length == 1) {
                            rank_string = rank_string + " ";
                        }
                        rank_string = rank_string + " - ";
                        name_entity.script.font_renderer.text = rank_string + current_nick;

                        if (current_name == window.globals.PlayerName) {
                            name_entity.script.font_renderer.tint = this.highlight_score_tint;
                            if (score_entity) score_entity.script.font_renderer.tint = this.highlight_score_tint;
                        } else {
                            name_entity.script.font_renderer.tint = this.normal_score_tint;
                            if (score_entity) score_entity.script.font_renderer.tint = this.normal_score_tint;
                        }
                        name_entity.script.font_renderer.updateText();
                    }

                    if (score_entity !== null) {
                        var score_string = String(entries[(i + this.screen_offset)].score);
                        if (window.game_client_script.leaderboard_mode === 0 && window.game_client_script.convert_scoreboard_to_time) {
                            score_string = String(window.game_client_script.convert_scoreboard_to_time(Number(score_string)));
                        }
                        score_entity.script.font_renderer.text = score_string;
                    }
                }
            }
        },

        clear_leaderboard: function() {
            for (var i = 0; i < this.number_of_texts; i++) {
                var name_entity = this.entity.findByName("Name" + String(i + 1));
                if (name_entity) name_entity.script.font_renderer.text = "";

                var score_entity = this.entity.findByName("Score" + String(i + 1));
                if (score_entity) score_entity.script.font_renderer.text = "";
            }
        },

        update: function (dt) {
        }
    };

    return High_Score_Menu_script;
});
