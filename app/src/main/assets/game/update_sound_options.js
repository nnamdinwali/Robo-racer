//this script, when attached to a sound emitting object, will disable the attached sound entity or reenable it when sound options are pressed.

pc.script.attribute("is_music_emitter","boolean",false,{
    description: "If this is a music playing sound entity, check this box.  The object will listen for music toggles instead of sound toggles."
});

pc.script.create('update_sound_options', function (app) {
    // Creates a new Update_sound_options instance
    var Update_sound_options = function (entity) {
        this.entity = entity;
    };

    Update_sound_options.prototype = {
        // Called once after all resources are loaded and before the first update
        initialize: function () {
            this.originalVolume = this.entity.sound.volume;
            this.entity.sound.volume = 0;
            this.lastcheck = false;
        },

        // Called every frame, dt is time in seconds since last update
        update: function (dt) {
            
            //update the sound volumes
            if(!this.is_music_emitter){
                //check if there has been a change to avoid setting volume each frame
                if(this.lastcheck != window.globals.SoundEnabled) {
                    this.entity.sound.volume = this.originalVolume * window.globals.SoundEnabled;
                    this.lastcheck = window.globals.SoundEnabled;
                }
            } else {
                //check if there has been a change to avoid setting volume each frame
                if(this.lastcheck != window.globals.MusicEnabled) {
                    this.entity.sound.volume = this.originalVolume * window.globals.MusicEnabled;
                    this.lastcheck = window.globals.MusicEnabled;
                //console.log("volume of music is "+this.entity.sound.volume);
                }
            }
        }
    };

    return Update_sound_options;
});