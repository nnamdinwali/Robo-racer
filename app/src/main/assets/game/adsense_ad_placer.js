
pc.script.attribute("button_x","number",0);
pc.script.attribute("button_y","number",0);


pc.script.create('adsense_ad_placer', function (app) {
    var Adsense_ad_placer = function (entity) {
        this.entity = entity;
    };

    Adsense_ad_placer.prototype = {
        initialize: function () {
            // external link removed for ad network submission
        }
    };

    return Adsense_ad_placer;
});
