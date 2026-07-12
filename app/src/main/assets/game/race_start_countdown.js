//Start  a countdown, waiting 3 seconds from when the level loaded.
// - when level loads, start the countdown
// - update the text string based on countdown
// - when countdown reaches 3 seconds, send a "race_start" message, and set the text to "" to make it dissapear from the screen.

pc.script.attribute("string_3","string","3",{
    description: "string shown when 3 seconds are left on the countdown."
});
pc.script.attribute("string_2","string","2",{
    description: "string shown when 2 seconds are left on the countdown"
});
pc.script.attribute("string_1","string","1",{
    description: "string shown when 1 second is left on the countdown"
});
pc.script.attribute("string_go","string","GO!",{
    description: "string shown for a second after the race starts"
});

pc.script.create('race_start_countdown', function (app) {
    // Creates a new Race_start_countdown instance
    var Race_start_countdown = function (entity) {
        this.entity = entity;
        this.countdown_start = false;
        this.fired = false; //have we fired the start message yet?
    };

    Race_start_countdown.prototype = {
        // Called once after all resources are loaded and before the first update
        initialize: function () {
            this.countdown_start = false;
            this.count = 0; //how much time has elapsed since the start of the countdown.
            
            //listen for pause feature
            app.on("GUI:Pause",this.GUI_Pause,this);
            app.on("GUI:Resume",this.GUI_Resume,this);
            
            //listen for reset
            app.on("GUI:ResetRace",this.GUI_ResetRace,this);
        },
        
        onEnable: function() {
            this.countdown_start = true;
            this.count = 0;
            this.fired = false;
        },
        
        destroy : function() {
            app.off("GUI:Pause",this.GUI_Pause,this);
            app.off("GUI:Resume",this.GUI_Resume,this);
            app.off("GUI:ResetRace",this.GUI_ResetRace,this);
        },
        
        GUI_ResetRace : function() {
            this.countdown_start = true;
            this.fired = false;
            this.count = 0;
        },
        
        GUI_Pause : function() {
            //stop countdown if paused
            this.countdown_start = false;  
        },
        
        GUI_Resume : function() {
                this.countdown_start = true;
        },

        // Called every frame, dt is time in seconds since last update
        update: function (dt) {
            if(this.countdown_start) {
                //count down the timer
                this.count += dt;
                //console.log(this.count);
                //check timer and update string as needed
                if(this.count >= 4) {
                    this.entity.script.font_renderer.text = "";
                    this.countdown_start = false;
                }
                if(this.count > 3 && this.count < 4) {
                    this.entity.script.font_renderer.text = this.string_go;
                    if(!this.fired){
                        app.fire("race_start");
                        this.fired = true;
                    }
                }
                if(this.count > 2 && this.count < 3) {
                    this.entity.script.font_renderer.text = this.string_1;
                }
                if(this.count > 1 && this.count < 2) {
                    this.entity.script.font_renderer.text = this.string_2;
                }
                if(this.count > 0 && this.count < 1) {
                    this.entity.script.font_renderer.text = this.string_3;
                }
            }
        }
    };

    return Race_start_countdown;
});