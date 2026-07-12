pc.script.attribute("min_page","number",1);

pc.script.attribute("max_page","number",4);

pc.script.attribute("non_page_children","number",3,{
    description : "the deactivation code will skip this many children before disabling everything."
});

pc.script.create('instructions_menu_script', function (app) {
    // Creates a new Instructions_menu_script instance
    var Instructions_menu_script = function (entity) {
        this.entity = entity;
        this.page = 0;
    };

    Instructions_menu_script.prototype = {
        // Called once after all resources are loaded and before the first update
        initialize: function () {
            app.on("GUI:HelpNextPage",this.GUI_HelpNextPage,this);
            app.on("GUI:HelpPreviousPage",this.GUI_HelpPreviousPage,this);
        },
        
        onEnable: function () {
            this.page = 1;
            this.refresh_page();
        },
        
        GUI_HelpNextPage: function(id) {
            //show the next screen
            this.page += 1;
            if (this.page > this.max_page) {
                this.page = this.min_page;
        //        console.log("page overflow, setting to min_page.");
            }
            this.refresh_page();
        },
        
        GUI_HelpPreviousPage: function(id) {
            //show the previous screen
            this.page -= 1;
            if (this.page < this.min_page) {
                this.page = this.max_page;
          //      console.log("page under min, setting to max_page.");
            }
            this.refresh_page();
        },
        
        refresh_page : function() {
            //activate the correct sprite based on page number
            this.childref = this.entity.getChildren();
            for(i = this.non_page_children; i < this.childref.length;i++){
      //          console.log("hiding child id "+i);
                this.childref[i].enabled = false;
                //also resize to fit resolution  - COULDN'T GET THIS WORKING, MOVING ON TO OTHER THINGS.  SORRY PC USERS, the instructions will look aweful unless you are running widescreen
                //ratio = 1280 / window.innerWidth;
                //ratioy = 720 / window.innerHeight;
                //if(window.innerWidth < this.childref[i].script.sprite.width){
                //    this.childref[i].script.sprite.width = 1280*ratio;
                //    this.childref[i].script.sprite.height = 720*ratio;
                //}
                //ratio_size = window.innerHeight/720; //window.innerHeight;
                //this.childref[i].script.sprite.width = 1280 * ratio_size;
                //this.childref[i].script.sprite.height = 720 * ratio_size;
               // this.childref[i].script.sprite.updateSprite();
                //this.childref[i].script.sprite.width = 1280 * (1280/window.innerWidth);
                //this.childref[i].script.sprite.height = 720 * (720/window.innerWidth);
               // if(window.innerWidth < 1280) {
                  //  this.childref[i].script.sprite.width = 800;
                  //  this.childref[i].script.sprite.height = 450;
               // }
            }
      //      console.log("trying to show page "+this.page);
            this.entity.findByName("page"+[this.page]).enabled = true;
        },

        // Called every frame, dt is time in seconds since last update
        update: function (dt) {
        }
    };

    return Instructions_menu_script;
});