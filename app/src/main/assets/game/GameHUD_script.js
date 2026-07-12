//updates the display of the in game hud to the globals values

pc.script.attribute("score_obj","entity",null);
pc.script.attribute("multiplier_obj","entity",null);
pc.script.attribute("speed_obj","entity",null);
pc.script.attribute("lap_obj","entity",null);
pc.script.attribute("time_obj","entity",null);
pc.script.attribute("total_obj","entity",null);



pc.script.create('GameHUD_script', function (app) {
    // Creates a new GameHUD_script instance
    var GameHUD_script = function (entity) {
        this.entity = entity;
    };

    GameHUD_script.prototype = {
        // Called once after all resources are loaded and before the first update
        initialize: function () {
            if(app.touch) {
                this.entity.findByName("Touch_side_hints").enabled = true;  //Show the touch control hints if touch exists on the device.
                this.show_data = false;
            }
            
            this.show_data = false; //should the interface show speed, laps, and time?
            
            //listen for a race_start to show data again
            app.on("race_start",this.race_start,this);
            
        },
        
        destroy : function() {
            app.off("race_start",this.race_start,this);
        },
        
        race_start : function() {
            this.show_data = true;
        },
        
        hide_race_stats : function() {
            this.score_obj.script.font_renderer.text = "";
            this.multiplier_obj.script.font_renderer.text = "";
            this.speed_obj.script.font_renderer.text = "";
            this.lap_obj.script.font_renderer.text = "";
            this.time_obj.script.font_renderer.text =  "";
            this.total_obj.script.font_renderer.text = "";
        },
        
        show_race_stats : function() {
            var t = window.gpLang || {};
            this.score_obj.script.font_renderer.text = (t.score || "Score: ") + window.globals.PlayerScore.toString();
            this.multiplier_obj.script.font_renderer.text = (t.multiplier || "Multiplier: ") + window.globals.PlayerMultiplier.toString();
            this.speed_obj.script.font_renderer.text = (t.speed || "Speed: ") + window.globals.PlayerSpeed.toString();
            this.lap_obj.script.font_renderer.text = window.globals.CurrentLap.toString() + (t.lap || "/3 : Lap");
            this.time_obj.script.font_renderer.text = window.globals.LapTime.toString() + (t.lapTime || " :Lap Time");
            this.total_obj.script.font_renderer.text = window.globals.RaceTime.toString() + (t.raceTime || " :Race Time");
        },

        // Called every frame, dt is time in seconds since last update
        update: function (dt) {
            if(this.show_data) {
                this.show_race_stats();
            } else {
                this.hide_race_stats();
            }
        }
    };

    return GameHUD_script;
});