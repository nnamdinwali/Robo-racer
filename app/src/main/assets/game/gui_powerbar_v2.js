//gui powebar script.  Turns a sprite into a gui power bar showing the rate between 
// two values, such as a current charge up and the maximum value allowed.

pc.script.attribute("globals_value_to_display","string","",{
    description: "the global variable to check in window.globals"
});

pc.script.attribute("globals_value_for_max","string","",{
    description: "the global variable in window.globals used for max possible display"
});

pc.script.attribute("hide_if_zero","boolean",false); //should the bar hide itself if below a certain value?

pc.script.attribute("minimum_score_to_hide","number",0);  //value must be over this to show up in game interface.

// the frame of the bar is a seperate sprite, we need to hide those too.
pc.script.attribute("frame_to_disable","entity",null,{
    description: "the entity of the frame that should hide with this status bar"
});

pc.script.create('gui_powerbar_v2', function (app) {
    // Creates a new Gui_powerbar_v2 instance
    var Gui_powerbar_v2 = function (entity) {
        this.entity = entity;
    };

    Gui_powerbar_v2.prototype = {
        
         initialize: function () {
            //related to power bar display
            this.value = 0;
            this.graphic = this.entity.script.sprite;
            this.originalWidth = this.graphic.width;
            this.originalLeft = this.graphic.x;
            this.should_display = true;
        },

        // Called every frame, dt is time in seconds since last update
        update: function (dt) {
            //get values of target entity
            //value = window.globals.PlayerBoostCharge;
            value = window.globals[this.globals_value_to_display];
            //console.log(value); //old debug code
            //maxvalue = window.globals.PlayerMaxBoostCharge;
            maxvalue = window.globals[this.globals_value_for_max];
            
            //check if hide flag is on
            if(this.hide_if_zero) {
                //check value to see if we render anything
                if(value > this.minimum_score_to_hide) {
                    this.should_display = true;
                } else {
                    this.should_display = false;
                }
            }
            
            if(this.should_display) {
                //set display ratios and set graphic up
                ratio = (value / maxvalue );
                //display value
                this.graphic.width = pc.math.lerp(0,this.originalWidth,ratio);
                this.graphic.uPercentage = ratio;
                //this.graphic.x = value; //old debug code
                //also show the frame if we have one
                if(this.frame_to_disable){
                    this.frame_to_disable.enabled = true;
                }
            } else {
                this.graphic.width = 0;
                this.graphic.uPercentage = 0;
                //also hide frame if we have one set
                if(this.frame_to_disable) {
                    this.frame_to_disable.enabled = false;
                }
            }
            
            //draw new sprite
            this.graphic.updateSprite();
        }
    };

    return Gui_powerbar_v2;
});