pc.script.attribute("message_to_send","string",""); //what message should this button send to the app when pressed?
pc.script.attribute("variable1","number",0);
pc.script.attribute("variable2","number",0);

pc.script.create('button_touched', function (app) {
    // Creates a new Button_touched instance
    var Button_touched = function (entity) {
        this.entity = entity;
    };

    Button_touched.prototype = {
        // Called once after all resources are loaded and before the first update
        initialize: function () {
            this.entity.script.sprite.on("click",this.click,this);
            //this.entity.script.sprite.on("touchstart",this.click,this);
        },
        
        click : function() {
            //only fire if the global cooldown on the menu is 0
            if(window.globals.menu_response_delay === 0){
                //console.log("button clicked");
                //set a delay on the menu interaction so the next button doesn't respond
                window.globals.menu_response_delay = 0.5;
                //when clicked on or tapped, send the message
                app.fire(this.message_to_send,this.variable1,this.variable2);
            }
        },

        // Called every frame, dt is time in seconds since last update
        update: function (dt) {
        }
    };

    return Button_touched;
});