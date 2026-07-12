pc.script.create('Sound_option_script', function (app) {
    // Creates a new Sound_option_script instance
    var Sound_option_script = function (entity) {
        this.entity = entity;
    };

    Sound_option_script.prototype = {
        // Called once after all resources are loaded and before the first update
        initialize: function () {
            //find my child objects
            this.S_on = this.entity.findByName("SoundOptionOn");
            this.S_off = this.entity.findByName("SoundOptionOff");
            this.M_on = this.entity.findByName("MusicOptionOn");
            this.M_off = this.entity.findByName("MusicOptionOff");
            this.last_option_seen = true;
            this.last_option_seen_music = true;
          //  console.log(this.S_on.name);
          //  console.log(this.S_off.name);
          //  console.log(this.M_on.name);
          //  console.log(this.M_off.name);
            
            app.on("GUI:Sound_On",this.Sound_On,this);
            app.on("GUI:Sound_Off",this.Sound_Off,this);
            app.on("GUI:Music_On",this.Music_On,this);
            app.on("GUI:Music_Off",this.Music_Off,this);
        },
        
        Sound_On : function () {
            this.S_off.enabled = true;
            this.S_on.enabled = false;
            window.globals.SoundEnabled = true;
        },
        
        
        Sound_Off : function () {
            this.S_off.enabled = false;
            this.S_on.enabled = true;
            window.globals.SoundEnabled = false;
        },
        
        Music_On : function () {
            this.M_off.enabled = true;
            this.M_on.enabled = false;
            window.globals.MusicEnabled = true;
        },
        
        
        Music_Off : function () {
            this.M_off.enabled = false;
            this.M_on.enabled = true;
            window.globals.MusicEnabled = false;
        },

        // Called every frame, dt is time in seconds since last update
        update: function (dt) {
            /*if(this.last_option_seen != window.globals.SoundEnabled) {
                this.last_option_seen = window.globals.SoundEnabled;
                if(this.last_option_seen) {
                    console.log("toggling sound icons to ON state");
                    this.S_on.enabled = true;
                    this.S_off.enabled = false;
                } else {
                    console.log("toggling sound icons to OFF state");
                    this.S_off.enabled = true;
                    this.S_on.enabled = false;
                }
            }
            if(this.last_option_seen_music != window.globals.MusicEnabled) {
                this.last_option_seen_music = window.globals.MusicEnabled;
                if(this.last_option_seen_music) {
                    this.M_on.enabled = true;
                    this.M_off.enabled = false;
                } else {
                    this.M_off.enabled = true;
                    this.M_on.enabled = false;
                }
            }*/
        }
        
        
    };

    return Sound_option_script;
});