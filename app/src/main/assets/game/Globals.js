//contains some globally accessed values for the gameplay and HUD
// any game object can access or set these values by using window.globals.the_value_to_access
// 
/*
pc.script.attribute("IsPaused","boolean",false);

pc.script.attribute("CurrentTrack","number",0);
pc.script.attribute("LapTime","number",0.00);
pc.script.attribute("CurrentLap","number",1);
pc.script.attribute("RaceTime","number",0.00);

//high score response values
pc.script.attribute("TopRaceTime","number",999.999);
pc.script.attribute("TopRaceScore","number",0);
pc.script.attribute("PlayerRankTime","number",99);
pc.script.attribute("PlayerBestRankTime","number",99);
pc.script.attribute("PlayerRankScore","number",99);
pc.script.attribute("PlayerBestRankScore","number",99);
pc.script.attribute("NewTimeRecord","boolean",false);
pc.script.attribute("NewScoreRecord","boolean",false);
pc.script.attribute("CurrentScoreboardMode","number",0); //mode for checking scoreboards, 0 for race, 1 for coin scores.

pc.script.attribute("CurrentCheckpoint","number",0); //current checkpoint, starts at 0, counts to max
pc.script.attribute("MaxCurrentCheckpoint","number",0); //max checkpoints on the racetrack, the total number of checkpoints to listen for before a lap is valid.

pc.script.attribute("PlayerSpeed","number",0);
pc.script.attribute("PlayerAcceleration","number",0);
pc.script.attribute("PlayerBoostCharge","number",0);
pc.script.attribute("PlayerMaxBoostCharge","number",100);

pc.script.attribute("PlayerJumpCharge","number",0);
pc.script.attribute("PlayerMaxJumpCharge","number",0);

pc.script.attribute("PlayerScore","number",0);
pc.script.attribute("PlayerMultiplier","number",1);
pc.script.attribute("PlayerCoinMultiplierCharge","number",0);
pc.script.attribute("PlayerMaxCoinMultiplierCharge","number",0);

pc.script.attribute("PlayerName","string","Guest");

pc.script.attribute("menu_response_delay","number",1);

pc.script.attribute("OnTitle","boolean",false);
*/

pc.script.create('Globals', function (app) {
    // Creates a new Globals instance
    var Globals = function (entity) {
        this.entity = entity;
        window.globals = this;
        
    };

    Globals.prototype = {
        // Called once after all resources are loaded and before the first update
        initialize: function () {
            
            //global values
            //pc.script.attribute("IsPaused","boolean",false);
            this.IsPaused = false;

//pc.script.attribute("CurrentTrack","number",0);
            this.CurrentTrack = 0;
//pc.script.attribute("LapTime","number",0.00);
            this.LapTime = 0.00;
            //pc.script.attribute("CurrentLap","number",1);
            this.CurrentLap = 1;
//pc.script.attribute("RaceTime","number",0.00);
            this.RaceTime = 0.00;

//high score response values
//pc.script.attribute("TopRaceTime","number",999.999);
            this.TopRaceTime = 999.999;
            
//pc.script.attribute("TopRaceScore","number",0);
            this.TopRaceScore = 0;
//pc.script.attribute("PlayerRankTime","number",99);
            this.PlayerRankTime = 99;
//pc.script.attribute("PlayerBestRankTime","number",99);
            this.PlayerBestRankTime = 99;
//pc.script.attribute("PlayerRankScore","number",99);
            this.PlayerRankScore = 99;
//pc.script.attribute("PlayerBestRankScore","number",99);
            this.PlayerBestRankScore = 99;
//pc.script.attribute("NewTimeRecord","boolean",false);
            this.NewTimeRecord = false;
//pc.script.attribute("NewScoreRecord","boolean",false);
            this.NewScoreRecord = false;
//pc.script.attribute("CurrentScoreboardMode","number",0); //mode for checking scoreboards, 0 for race, 1 for coin scores.
            this.CurrentScoreboardMode = 0;

//pc.script.attribute("CurrentCheckpoint","number",0); //current checkpoint, starts at 0, counts to max
            this.CurrentCheckpoint = 0;
//pc.script.attribute("MaxCurrentCheckpoint","number",0); //max checkpoints on the racetrack, the total number of checkpoints to listen for before a lap is valid.
            this.MaxCurrentCheckpoint = 0;

//pc.script.attribute("PlayerSpeed","number",0);
            this.PlayerSpeed = 0;
//pc.script.attribute("PlayerAcceleration","number",0);
            this.PlayerAcceleration = 0;
//pc.script.attribute("PlayerBoostCharge","number",0);
            this.PlayerBoostCharge = 0;
//pc.script.attribute("PlayerMaxBoostCharge","number",100);
            this.PlayerMaxBoostCharge = 100;

//pc.script.attribute("PlayerJumpCharge","number",0);
            this.PlayerJumpCharge = 0;
//pc.script.attribute("PlayerMaxJumpCharge","number",0);
            this.PlayerMaxJumpCharge = 0;

//pc.script.attribute("PlayerScore","number",0);
            this.PlayerScore = 0;
//pc.script.attribute("PlayerMultiplier","number",1);
            this.PlayerMultiplier = 1;
//pc.script.attribute("PlayerCoinMultiplierCharge","number",0);
            this.PlayerCoinMultiplierCharge = 0;
//pc.script.attribute("PlayerMaxCoinMultiplierCharge","number",0);
            this.PlayerMaxCoinMultiplierCharge = 0;

//pc.script.attribute("PlayerName","string","Guest");
            this.PlayerName = "Guest";

//pc.script.attribute("menu_response_delay","number",1);
            //IF ON TOUCH, delay longer then on PC
            if(app.touch){
                this.menu_response_delay = 1;
            } else {
                this.menu_response_delay = 0.1;
            }

//pc.script.attribute("OnTitle","boolean",false);
            this.OnTitle = false;
            
            
            //TOGGLE SOUNDS AND MUSIC
            this.SoundEnabled = true;
            this.MusicEnabled = true;
            
            
            //listeners
            app.on("race_start",this.race_start,this);
            app.on("GUI:ResetRace",this.GUI_ResetRace,this);
            app.on("GUI:Pause",this.GUI_Pause,this); //listen for global pause
            app.on("GUI:Resume",this.GUI_Resume,this);

            //pause game when user switches browser tab (GamePix requirement)
            document.addEventListener("visibilitychange", function() {
                if (document.hidden) {
                    if (!window.globals.IsPaused && !window.globals.OnTitle) {
                        app.fire("GUI:Pause");
                    }
                }
            });
            
            //toggle sound and music
      //      app.on("GUI:Sound_On",this.Sound_On,this);
      //      app.on("GUI:Sound_Off",this.Sound_Off,this);
      //      app.on("GUI:Music_On",this.Music_On,this);
      //      app.on("GUI:Music_Off",this.Music_Off,this);
        },
        
        
 /*       GUI_Sound_On : function() {
            this.SoundEnabled = true;
        },
        
        GUI_Sound_Off : function() {
            this.SoundEnabled = false;
        },
        
        GUI_Music_On : function() {
            this.MusicEnabled = true;
        },
        
        GUI_Music_Off : function() {
            this.MusicEnabled = false;
        },
   */     
        
        //reset score and multiplier on race reset
        GUI_ResetRace : function() {
            this.PlayerScore = 0;
            this.PlayerMultiplier = 1;
            this.PlayerSpeed = 0;
            this.IsPaused = false;
            this.PlayerBoostCharge = 0;
            this.CurrentCheckpoint = 0;
        },
        
        //reset some values if a new race is started up
        race_start : function() {
            this.LapTime = 0.00;
            this.CurrentLap = 1;
            this.RaceTime = 0.00;
            this.PlayerSpeed = 0;
            this.PlayerAcceleration = 0;
            this.PlayerBoostCharge = 0;
            this.PlayerScore = 0;
            this.PlayerMultiplier = 1;
            this.CurrentCheckpoint = 0;
        },
        
        GUI_Pause : function() {
            this.IsPaused = true;
        },
        
        GUI_Resume : function() {
            this.IsPaused = false;
        },
        
        // Called every frame, dt is time in seconds since last update
        update: function (dt) {
            //subtract from menu delay
            if(this.menu_response_delay > 0) {
                this.menu_response_delay -= dt; //take current frame time off of timer
                //if timer is 0 or lower, set to 0 to allow interface to respond again
                if(this.menu_response_delay <= 0) {
                    this.menu_response_delay = 0;
                }
            }
        }
    };

    return Globals;
});