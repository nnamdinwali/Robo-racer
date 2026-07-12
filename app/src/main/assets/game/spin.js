//spins an object at a set speed

pc.script.attribute("speed","number",300);

pc.script.create('spin', function (app) {
    // Creates a new Spin instance
    var Spin = function (entity) {
        this.entity = entity;
    };

    Spin.prototype = {
        // Called once after all resources are loaded and before the first update
        initialize: function () {
        },

        // Called every frame, dt is time in seconds since last update
        update: function (dt) {
            this.entity.rotate(0,this.speed*dt,0);
        }
    };

    return Spin;
});