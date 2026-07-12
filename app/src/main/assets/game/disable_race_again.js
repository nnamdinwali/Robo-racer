pc.script.attribute("object_to_disable","entity",null);

pc.script.create('disable_race_again', function (app) {
    // Creates a new Disable_race_again instance
    var Disable_race_again = function (entity) {
        this.entity = entity;
    };

    Disable_race_again.prototype = {
        // Called once after all resources are loaded and before the first update
        initialize: function () {
        },

        // Called every frame, dt is time in seconds since last update
        update: function (dt) {
            if(window.globals.OnTitle) {
                //if on the title, hide self
                if(this.object_to_disable.enabled) {
                    this.object_to_disable.enabled = false;
                }
            } else {
                if(!this.object_to_disable.enabled) {
                    this.object_to_disable.enabled = true;
                }
            }
        }
    };

    return Disable_race_again;
});