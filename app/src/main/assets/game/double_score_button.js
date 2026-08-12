// double_score_button.js
// Shows a "Watch Ad x2 Score" button on the results screen.
// Styled to match the game's jelly button look — created as an HTML overlay,
// no PlayCanvas editor changes needed.
//
// AD LOGIC (Appodeal Rewarded Video via AndroidBridge):
//   1. Player taps button → AndroidBridge.showRewardedAd() is called
//   2. Android shows the full rewarded video
//   3a. Player watches to the end → Android fires app.fire('reward:double_score')
//       → race_results_script.js doubles the score, button hides permanently for this race
//   3b. Player closes early → Android fires app.fire('reward:cancelled')
//       → button reappears so player can try again

pc.script.create('double_score_button', function(app) {

    var DoubleScoreButton = function(entity) {
        this.entity     = entity;
        this._btn       = null;
        this._adWatched = false;
    };

    DoubleScoreButton.prototype = {

        initialize: function() {
            this._createButton();

            app.on('GUI:RaceResults',    this._onResults,        this);
            app.on('race_start',         this._onRaceStart,      this);
            app.on('GUI:Title',          this._hideButton,       this);
            app.on('GUI:Track',          this._hideButton,       this);
            app.on('GUI:GetLeaderboard', this._hideButton,       this);
            app.on('reward:double_score',this._onRewardEarned,   this);
            app.on('reward:cancelled',   this._onRewardCancelled,this);

            // initialize() runs when entity is first enabled, which happens on the
            // GUI:RaceResults event itself — show the button immediately for the
            // first results screen too.
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
            if (this._adWatched) return;

            // Check AndroidBridge is available (not in a plain browser)
            if (!window.AndroidBridge || typeof window.AndroidBridge.showRewardedAd !== 'function') {
                console.warn('[DoubleScore] AndroidBridge.showRewardedAd not available.');
                return;
            }

            this._hideButton(); // hide while video plays; restored if player skips
            window.AndroidBridge.showRewardedAd();
            // Result comes back as app.fire('reward:double_score') or app.fire('reward:cancelled')
        },

        // Reward earned — called when Android fires reward:double_score
        _onRewardEarned: function() {
            this._adWatched = true;
            this._hideButton(); // permanently hide for this race
        },

        // Ad dismissed early — called when Android fires reward:cancelled
        _onRewardCancelled: function() {
            if (!this._adWatched) {
                this._showButton(); // let player try again
            }
        },

        _onResults: function() {
            if (!this._adWatched) {
                this._showButton();
            }
        },

        _onRaceStart: function() {
            this._adWatched = false; // new race — reset so button reappears on next results
            this._hideButton();
        },

        _showButton: function() { if (this._btn) this._btn.style.display = 'block'; },
        _hideButton: function() { if (this._btn) this._btn.style.display = 'none';  },

        update: function(dt) {}
    };

    return DoubleScoreButton;
});
