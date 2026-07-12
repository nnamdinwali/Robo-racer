pc.script.create('welcome_playername_text_script', function (app) {
    // Creates a new Welcome_playername_text_script instance
    var Welcome_playername_text_script = function (entity) {
        this.entity = entity;
        this.lastname = "";
        var t = window.gpLang || {};
        this.fronttext = t.welcome || "Welcome ";
        this.backtext = t.welcomeEnd || "!";
    };

    Welcome_playername_text_script.prototype = {
        // Called once after all resources are loaded and before the first update
        initialize: function () {
        },

        // Called every frame, dt is time in seconds since last update
        update: function (dt) {
            if(this.lastname != window.globals.PlayerName) {
                this.lastname = window.globals.PlayerName;
                    this.entity.script.font_renderer.text = this.fronttext + this.lastname + this.backtext;
            }
        }
    };

    return Welcome_playername_text_script;
});