pc.script.create('music_player', function (app) {
    var Music_player = function (entity) {
        this.entity = entity;
    };

    Music_player.prototype = {
        initialize: function () {
            this.music_to_play = 0;
            this._music_before_ad = 0;
            this._ad_from_track_select = false;

            app.on("GUI:Title", this.GUI_Title, this);
            app.on("GUI:Track", this.GUI_Track, this);
            app.on("ad:start", this.adStart, this);
            app.on("ad:end", this.adEnd, this);
            app.on("ad:track_select", this.adTrackSelect, this);
        },

        GUI_Title: function () {
            if (this.music_to_play !== 0) {
                this.entity.sound.stop();
                this.entity.sound.play("title");
                this.music_to_play = 0;
            }
        },

        GUI_Track: function (tracknumber) {
            if (tracknumber == 1) {
                if (this.music_to_play != 1) {
                    this.entity.sound.stop();
                    this.entity.sound.play("track1");
                    this.music_to_play = 1;
                }
            }
            if (tracknumber == 2) {
                if (this.music_to_play != 2) {
                    this.entity.sound.stop();
                    this.entity.sound.play("track2");
                    this.music_to_play = 2;
                }
            }
        },

        adTrackSelect: function () {
            this._ad_from_track_select = true;
        },

        adStart: function () {
            this._music_before_ad = this.music_to_play;
            this.entity.sound.stop();
            // Suspend the entire audio context so all game sounds stop during ads
            if (app.systems && app.systems.sound && app.systems.sound.context) {
                try { app.systems.sound.context.suspend(); } catch(e) {}
            }
        },

        adEnd: function () {
            // Resume the audio context after the ad
            if (app.systems && app.systems.sound && app.systems.sound.context) {
                try { app.systems.sound.context.resume(); } catch(e) {}
            }


            if (this._ad_from_track_select) {
                this._ad_from_track_select = false;
                return;
            }

            if (this._music_before_ad === 0) {
                this.entity.sound.play("title");
            } else if (this._music_before_ad === 1) {
                this.entity.sound.play("track1");
            } else if (this._music_before_ad === 2) {
                this.entity.sound.play("track2");
            }
        },

        update: function (dt) {
        }
    };

    return Music_player;
});
