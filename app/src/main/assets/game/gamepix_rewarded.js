// gamepix_rewarded.js
// Provides window.showRewardedAd(onSuccess, onFail) using GamePix.rewardAd()
// Follows the same pause/resume flow as interstitial ads:
//   app.timeScale = 0  +  app.fire("ad:start")  →  show ad
//   app.timeScale = 1  +  app.fire("ad:end")    →  resume game & music

(function() {
    window.showRewardedAd = function(onSuccess, onFail) {
        if (typeof GamePix === 'undefined') {
            console.warn('[showRewardedAd] GamePix SDK not available.');
            if (typeof onFail === 'function') onFail();
            return;
        }

        // Pause game and stop music — same as interstitial
        if (window.pc && window.pc.app) {
            window.pc.app.timeScale = 0;
            window.pc.app.fire('ad:start');
        }

        GamePix.rewardAd().then(function(res) {
            // Resume game and music — same as interstitial
            if (window.pc && window.pc.app) {
                window.pc.app.timeScale = 1;
                window.pc.app.fire('ad:end');
            }

            if (res.success) {
                if (typeof onSuccess === 'function') onSuccess();
            } else {
                if (typeof onFail === 'function') onFail();
            }
        });
    };

    console.log('[gamepix_rewarded] window.showRewardedAd ready.');
})();
