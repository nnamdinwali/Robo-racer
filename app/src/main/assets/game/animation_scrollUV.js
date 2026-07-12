//scroll a uv mapping around to animate it

pc.script.attribute("speed","vec2",null);

pc.script.attribute("material_asset","asset",null);

pc.script.create('animation_scrollUV', function (app) {
    
    
    // Creates a new Animation_scrollUV instance
    var Animation_scrollUV = function (entity) {
        this.entity = entity;
       // this.tmp = pc.Vec2();
        
    };

    Animation_scrollUV.prototype = {
        // Called once after all resources are loaded and before the first update
        initialize: function () {
            //get material to edit
            this.material_to_animate = app.assets.get(this.material_asset).resource;
            this.tmp = new pc.Vec2();
        },

        // Called every frame, dt is time in seconds since last update
        update: function (dt) {
            this.tmp.set(this.speed.x, this.speed.y);
            this.tmp.scale(dt);
            // Update the diffuse and normal map offset values
            this.material_to_animate.diffuseMapOffset.add(this.tmp);
            this.material_to_animate.normalMapOffset.add(this.tmp);
            this.material_to_animate.emissiveMapOffset.add(this.tmp);
            this.material_to_animate.opacityMapOffset.add(this.tmp);
            this.material_to_animate.update();
            
        }
    };

    return Animation_scrollUV;
});