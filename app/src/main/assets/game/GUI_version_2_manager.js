//GUI hud and menu manager
//    listens for GUI messages sent to app, and changes the menu display.
//also will handle disposing the menu and loading a track scene.
//
//pc.script.attribute("menu_level_root","entity",null);

pc.script.create('GUI_version_2_manager', function (app) {
    // Creates a new GUI_version_2_manager instance
    var GUI_version_2_manager = function (entity) {
        this.entity = entity;
    };

    GUI_version_2_manager.prototype = {
        // Called once after all resources are loaded and before the first update
        initialize: function () {
            this._fallCount = 0;
            
            //variable for the contents of the scene
            this.loaded_entities = [false,false,false,false];
            
            this.title_objects = false;
            this.track1_objects = false;
            this.track2_objects = false;
            this.track3_objects = false;
            
            //app menu control messages
            app.on("GUI:Track",this.GUI_Track,this); //selecting a track from the menu
            app.on("GUI:ResetRace",this.GUI_ResetRace,this); //resetting the race
            app.on("GUI:Title",this.GUI_Title,this); //reloading title screen
            app.on("GUI:Pause",this.GUI_Pause,this); //pausing the game
            app.on("GUI:Resume",this.GUI_Resume,this); //resuming the game
            app.on("GUI:HowToPlay",this.GUI_HowToPlay,this); //showing game instructions
            app.on("GUI:BackToMenu",this.GUI_BackToMenu,this); // leave game instructions for main menu
            app.on("GUI:RaceResults",this.GUI_RaceResults,this); //show race results screen
            app.on("GUI:GetLeaderboard", this.GUI_GetLeaderboard, this); // show high score menu
            app.on("race_start",this.race_start,this);
            app.on("respawn", this.onPlayerFall, this); // count falls for interstitial
            
            this.loading_screen = this.entity.findByName("loading");
        },

        GUI_GetLeaderboard: function() {
            this.hide_all();
            this.show_high_scores();
        },

        show_high_scores: function() {
            this.entity.findByName("High Score Menu").enabled = true;
        },
        
        
        
        postInitialize: function() {
            this.GUI_Title();
        },
        
        GUI_ResetRace: function(id) {
            var self = this;
            var doReset = function() {
                self.hide_all();
                self.show_in_game();
                self.show_pause_button();
                
                //also set the track correctly
                window.globals.CurrentTrack = 1;
                if(self.track1_objects) {
                    window.globals.CurrentTrack = 1;
                }
                if(self.track2_objects) {
                    window.globals.CurrentTrack = 2;
                }
            };

            // If we're resetting from the race results, show an ad first
            if (typeof GamePix !== "undefined" && !window.globals.OnTitle) {
                app.timeScale = 0;
                app.fire("ad:start");
                GamePix.interstitialAd().then(function(res) {
                    app.timeScale = 1;
                    app.fire("ad:end");
                    doReset();
                });
            } else {
                doReset();
            }
        },
        
        GUI_Title: function(id) {
            //show interstitial ad when returning to menu from gameplay
            if (typeof GamePix !== "undefined" && !window.globals.OnTitle) {
                app.timeScale = 0;
                app.fire("ad:start");
                GamePix.interstitialAd().then(function(res) {
                    app.timeScale = 1;
                    app.fire("ad:end");
                });
            }

            //unload all scenes except menu
            this.unload_track1();
            this.unload_track2();
            this.unload_track3();
            
            //load title screen contents if they do not exist
            this.load_title();
            
            //now enable the main menu
            this.hide_all();
            this.show_title_screen();
            this.show_sound_menu();
            //also force track selection to 0
            window.globals.CurrentTrack = 0;
            
            //FIX ALL THE GLOBALS ISSUES WITH HALF DONE TRACKS
            window.globals.LapTime = 0;
            window.globals.RaceTime = 0;
            window.globals.CurrentCheckpoint = 0;
            window.globals.PlayerScore = 0;
            window.globals.PlayerMultiplier = 1;
            window.globals.PlayerCoinMultiplierCharge = 0;
            
            //last, tell everyone we are on the main menu
            window.globals.OnTitle = true;
            //can't be paused on the title screen, force the game to be unpaused.
            window.globals.IsPaused = false;
            
        },
        
        GUI_Pause: function(id) {
            this.hide_pause_button();
            this.show_pause_screen();
            this.show_sound_menu();
        },
        
        GUI_Resume: function(id) {
            this.hide_all();
            this.show_in_game();
            this.show_pause_button();
        },
        
        GUI_HowToPlay: function(id) {
            this.hide_all();
            this.show_instructions();
        },
        
        GUI_BackToMenu: function(id) {
            if(!window.globals.OnTitle) {
                this.hide_all();
                this.GUI_Pause(id);
            } else {
                this.hide_all();
                this.GUI_Title();
            }
        },
        
        GUI_RaceResults: function(id) {
            this.hide_all();
            this.show_race_results();
        },
        
        race_start : function() {
            this._fallCount = 0; // reset fall counter each new race
            this.show_pause_button();
        },

        //internal helper: actually loads and starts a track after ad is done
        _doLoadTrack: function(tracknumber) {
            this.unload_title();
            this.hide_all();

            if(tracknumber == 1) {
                this.unload_track2();
                this.unload_track3();
                this.load_track1();
                this.show_in_game();
                window.globals.CurrentTrack = 1;
                window.globals.OnTitle = false;
                if (typeof GamePix !== "undefined") { GamePix.updateLevel(1); }
            }

            if(tracknumber == 2) {
                this.unload_track1();
                this.unload_track3();
                this.load_track2();
                this.show_in_game();
                window.globals.CurrentTrack = 2;
                window.globals.OnTitle = false;
                if (typeof GamePix !== "undefined") { GamePix.updateLevel(2); }
            }
        },
        
        GUI_Track: function(tracknumber) {
            var self = this;
            //show interstitial ad when player clicks Play — pause game and music first
            if (typeof GamePix !== "undefined") {
                app.timeScale = 0;
                app.fire("ad:track_select");
                app.fire("ad:start");
                GamePix.interstitialAd().then(function(res) {
                    app.timeScale = 1;
                    app.fire("ad:end");
                    self._doLoadTrack(tracknumber);
                });
            } else {
                this._doLoadTrack(tracknumber);
            }
        },
        
        hide_all : function() {
            this.entity.findByName("Main Menu").enabled = false;
            this.entity.findByName("GameHUD").enabled = false;
            this.entity.findByName("Pause Menu").enabled = false;
            this.entity.findByName("Race Results").enabled = false;
            this.entity.findByName("Instructions").enabled = false;
            this.entity.findByName("SoundMenu").enabled = false;
            var highScoreMenu = this.entity.findByName("High Score Menu");
            if (highScoreMenu) highScoreMenu.enabled = false;
        },
        
        show_title_screen : function() {
            this.entity.findByName("Main Menu").enabled = true;
        },
        
        show_in_game : function() {
            this.entity.findByName("GameHUD").enabled = true;
        },
        
        onPlayerFall: function() {
            // Only count falls during an active race (not on title/menu)
            if (window.globals && window.globals.OnTitle) return;
            if (window.globals && window.globals.IsPaused) return;

            this._fallCount++;

            if (this._fallCount >= 3) {
                this._fallCount = 0; // reset so it can trigger again after 3 more falls
                if (typeof GamePix !== "undefined") {
                    app.timeScale = 0;
                    app.fire("ad:start");
                    GamePix.interstitialAd().then(function(res) {
                        app.timeScale = 1;
                        app.fire("ad:end");
                    });
                }
            }
        },

        show_pause_screen : function() {
            this.entity.findByName("Pause Menu").enabled = true;  
        },
        
        hide_pause_button : function() {
            //hide the pause button if pause menu is activated, so the rest of the hud still works
            this.entity.findByName("Pause Button").enabled = false;  
        },
        
        show_pause_button : function() {
            //show the pause button if resume was activated
            this.entity.findByName("Pause Button").enabled = true;  
        },
        
        show_race_results : function() {
            this.entity.findByName("Race Results").enabled = true;
        },
        
        show_instructions : function() {
            this.entity.findByName("Instructions").enabled = true;
        },
        
        show_sound_menu : function() {
            this.entity.findByName("SoundMenu").enabled = true;
        },
        
        ///////////////  LOADING CONTENT AND REMOVING THEM  ////////////////////////////
        
        unload_all : function () {
            this.unload_title();
            this.unload_track1();
            this.unload_track2();
            this.unload_track3();
        },
        
        //////////////////////  LOADING SCREEN POP UP  ///////////////////////////////
        //  NOTE: Could not get this working, the screen is not rendered before the scene fires.
        show_loading : function() {
            //show the loading pop up
            this.loading_screen.enabled = true;
            
        },
        
        hide_loading : function() {
            this.loading_screen.enabled = false;
        },
        
        
        
        /////////////  SCENE LOADING ////////////////////////////////
        
        load_title : function() {
            //console.log("loading title objects.");
            if (!this.title_objects) {
                //show the loading pop up
                this.show_loading();
                
                this.title_objects = true;
                this.loaded_entities[0] = true;
                this.loadLevel(414069, function (entity) {
                    this.loaded_entities[0] = entity;
                    this.hide_loading();
                }.bind(this));
            }
        },
        
        unload_title : function() {
            //console.log("unloading title screen objects.");
            if(this.title_objects) {
                if(this.loaded_entities[0].destroy) {
                    this.loaded_entities[0].destroy();
                    this.loaded_entities[0] = null;
                    this.title_objects = false;
                }
            }
        },
        
        load_track1 : function() {
            if (!this.track1_objects) {
                //show the loading pop up
                this.show_loading();
                
                this.track1_objects = true;
                this.loaded_entities[1] = true;
                this.loadLevel(410661, function (entity) {
                    this.loaded_entities[1] = entity;
                    this.hide_loading();
                }.bind(this));
            }
        },
        
        unload_track1 : function() {
            if(this.track1_objects) {
                if(this.loaded_entities[1].destroy) {
                    this.loaded_entities[1].destroy();
                    this.loaded_entities[1] = null;
                    this.track1_objects = false;
                }
            }
        },
        
        load_track2 : function() {
            if (!this.track2_objects) {
                //show the loading pop up
                this.show_loading();
                
                this.track2_objects = true;
                this.loaded_entities[2] = true;
                this.loadLevel(416088, function (entity) {
                    this.loaded_entities[2] = entity;
                    this.hide_loading();
                }.bind(this));
            }
        },
        
        unload_track2 : function() {
            if(this.track2_objects) {
                if(this.loaded_entities[2].destroy) {
                    this.loaded_entities[2].destroy();
                    this.loaded_entities[2] = null;
                    this.track2_objects = false;
                }
            }
        },
        
        load_track3 : function() {
            
        },
        
        unload_track3 : function() {
        
        },
        
        
        loadLevel : function(id, callback) {

            
            var self = this;
            var url = id + ".json";
            app.loadSceneHierarchy(url, function (err, parent) {
                if(!err) {
                    app.loadSceneSettings(url, function(err, parent) {
                        if(!err) {
                           // callback(parent);
                        }
                    });
                    //callback to parent function
                    callback(parent);
                }
            });
        },
        
        

        // Called every frame, dt is time in seconds since last update
        update: function (dt) {
        }
    };

    return GUI_version_2_manager;
});