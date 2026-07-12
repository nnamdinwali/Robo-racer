// double_score_button.js
// Shows a "Watch Ad x2 Score" button on the results screen.
// Styled to match the game's jelly button look — created as an HTML overlay,
// no PlayCanvas editor changes needed.
// Rewarded ad logic: calls window.showRewardedAd(onSuccess, onFail)
// which will be provided by gamepix_rewarded.js once SDK is integrated.

pc.script.create('double_score_button', function(app) {

    var DoubleScoreButton = function(entity) {
        this.entity     = entity;
        this._btn       = null;
        this._adWatched = false;
    };

    DoubleScoreButton.prototype = {

        initialize: function() {
            this._createButton();

            app.on('GUI:RaceResults',    this._onResults,   this);
            app.on('race_start',         this._onRaceStart, this);
            app.on('GUI:Title',          this._hideButton,  this);
            app.on('GUI:Track',          this._hideButton,  this);
            app.on('GUI:GetLeaderboard', this._hideButton,  this);
            app.on('GUI:Pause',          this._hideButton,  this);

            // This script lives on the "Race Results" entity, which starts
            // disabled — so initialize() only runs the *first* time that entity
            // is enabled, which happens as a side effect of the very
            // "GUI:RaceResults" event that this script needs to react to. That
            // means the app.on('GUI:RaceResults', ...) listener above gets
            // registered too late to catch that same, already-in-progress
            // event on the player's very first win, and the button only
            // starts appearing from the second win onward. Since initialize()
            // running at all means we are on the results screen right now,
            // show the button immediately here too, so it also appears the
            // first time.
            this._onResults();
        },

        _createButton: function() {
            var self = this;

            var btn = document.createElement('div');
            btn.id = 'double-score-btn';
            btn.innerHTML = '&#9654;&nbsp; Watch Ad &times;2 Score';

            btn.style.cssText = [
                'position:fixed',
                'bottom:20%',
                'left:50%',
                'transform:translateX(-50%)',
                'padding:13px 30px',
                'font-size:19px',
                'font-weight:900',
                'color:#ffffff',
                'background:linear-gradient(to bottom,#2ecc71,#27ae60)',
                'border:none',
                'border-bottom:5px solid #1a7a43',
                'border-radius:14px',
                'box-shadow:0 6px 20px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.25)',
                'cursor:pointer',
                'display:none',
                'z-index:9999',
                'letter-spacing:0.4px',
                'text-shadow:0 2px 5px rgba(0,0,0,0.45)',
                '-webkit-user-select:none',
                'user-select:none',
                'white-space:nowrap',
                'font-family:Arial Black,Arial,sans-serif',
                'transition:transform 0.08s,border-bottom 0.08s'
            ].join(';');

            // Press-down jelly feel
            btn.addEventListener('pointerdown', function(e) {
                e.preventDefault();
                btn.style.transform    = 'translateX(-50%) scale(0.95) translateY(3px)';
                btn.style.borderBottom = '2px solid #1a7a43';
                btn.style.boxShadow    = '0 2px 8px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.2)';
            });

            btn.addEventListener('pointerup', function() {
                btn.style.transform    = 'translateX(-50%) scale(1) translateY(0)';
                btn.style.borderBottom = '5px solid #1a7a43';
                btn.style.boxShadow    = '0 6px 20px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.25)';
                if (window.globals && window.globals.menu_response_delay > 0) return;
                self._onButtonClick();
            });

            btn.addEventListener('pointerleave', function() {
                btn.style.transform    = 'translateX(-50%) scale(1) translateY(0)';
                btn.style.borderBottom = '5px solid #1a7a43';
                btn.style.boxShadow    = '0 6px 20px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.25)';
            });

            document.body.appendChild(btn);
            this._btn = btn;
        },

        _onButtonClick: function() {
            var self = this;
            if (this._adWatched) return;

            if (typeof window.showRewardedAd !== 'function') {
                console.warn('[DoubleScore] window.showRewardedAd not available — GamePix rewarded SDK not yet integrated.');
                return;
            }

            // Hide button while ad is playing
            this._hideButton();

            window.showRewardedAd(
                function() {
                    // Player watched full ad — grant reward
                    self._adWatched = true;
                    app.fire('reward:double_score');
                    console.log('[DoubleScore] Reward granted — doubling score');
                },
                function() {
                    // Player closed ad early — show button again so they can retry
                    if (!self._adWatched) {
                        self._showButton();
                    }
                    console.log('[DoubleScore] Ad closed early — no reward');
                }
            );
        },

        _onResults: function() {
            if (!this._adWatched) {
                this._showButton();
            }
        },

        _onRaceStart: function() {
            // New race — reset flag so button reappears on next results screen
            this._adWatched = false;
            this._hideButton();
        },

        _showButton: function() {
            if (this._btn) this._btn.style.display = 'block';
        },

        _hideButton: function() {
            if (this._btn) this._btn.style.display = 'none';
        },

        update: function(dt) {}
    };

    return DoubleScoreButton;
});
