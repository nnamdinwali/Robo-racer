package com.roboracer.game;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.appcompat.app.AppCompatActivity;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewClientCompat;

import com.yandex.mobile.ads.appopenad.AppOpenAd;
import com.yandex.mobile.ads.appopenad.AppOpenAdEventListener;
import com.yandex.mobile.ads.appopenad.AppOpenAdLoadListener;
import com.yandex.mobile.ads.appopenad.AppOpenAdLoader;
import com.yandex.mobile.ads.banner.BannerAdEventListener;
import com.yandex.mobile.ads.banner.BannerAdSize;
import com.yandex.mobile.ads.banner.BannerAdView;
import com.yandex.mobile.ads.common.AdError;
import com.yandex.mobile.ads.common.AdRequest;
import com.yandex.mobile.ads.common.AdRequestConfiguration;
import com.yandex.mobile.ads.common.AdRequestError;
import com.yandex.mobile.ads.common.ImpressionData;
import com.yandex.mobile.ads.common.MobileAds;
import com.yandex.mobile.ads.interstitial.InterstitialAd;
import com.yandex.mobile.ads.interstitial.InterstitialAdEventListener;
import com.yandex.mobile.ads.interstitial.InterstitialAdLoadListener;
import com.yandex.mobile.ads.interstitial.InterstitialAdLoader;
import com.yandex.mobile.ads.rewarded.Reward;
import com.yandex.mobile.ads.rewarded.RewardedAd;
import com.yandex.mobile.ads.rewarded.RewardedAdEventListener;
import com.yandex.mobile.ads.rewarded.RewardedAdLoadListener;
import com.yandex.mobile.ads.rewarded.RewardedAdLoader;

/**
 * WebView wrapper for Robo Racer — Yandex Mobile Ads v8.2.0.
 *
 * Ad types and triggers:
 *   Banner       – shown during race (race_start → race_end / pause / reset)
 *   App Open     – shown on first launch and whenever app returns from background
 *   Interstitial – shown after race results screen appears (1.5 s delay)
 *                  and also after the player falls off the track 3 times
 *   Rewarded     – shown when player taps "Watch Ad ×2 Score" on results screen;
 *                  fires app.fire('reward:double_score') back into the game on success
 *                  fires app.fire('reward:cancelled') if dismissed early or unavailable
 *
 * JS bridge (window.AndroidBridge):
 *   showBanner()      – reveal banner (race active)
 *   hideBanner()      – hide banner (race over / pause / menu)
 *   showInterstitial()– trigger interstitial (called from game JS)
 *   showRewardedAd()  – trigger rewarded ad (called from game JS)
 */
public class MainActivity extends AppCompatActivity {

    // ─── Ad unit IDs (Yandex dashboard) ──────────────────────────────────────
    private static final String BANNER_AD_UNIT_ID       = "R-M-19649179-4";
    private static final String INTERSTITIAL_AD_UNIT_ID = "R-M-19649179-1";
    private static final String REWARDED_AD_UNIT_ID     = "R-M-19649179-3";
    private static final String APP_OPEN_AD_UNIT_ID     = "R-M-19649179-2";

    // ─── Views ────────────────────────────────────────────────────────────────
    private WebView webView;
    private BannerAdView bannerAdView;

    // ─── Ad objects ───────────────────────────────────────────────────────────
    private AppOpenAd     appOpenAd;
    private InterstitialAd interstitialAd;
    private RewardedAd    rewardedAd;

    // ─── State ────────────────────────────────────────────────────────────────
    private boolean bannerLoaded      = false;
    private boolean appOpenShown      = false; // true after first-launch show
    private boolean wasInBackground   = false;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    // =========================================================================
    // Lifecycle
    // =========================================================================

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        bannerAdView = findViewById(R.id.bannerAdView);
        bannerAdView.setVisibility(View.GONE);

        // Initialise SDK, then kick off all ad loads in the callback
        MobileAds.initialize(this, () -> {
            loadAppOpenAd();
            loadInterstitialAd();
            loadRewardedAd();
        });

        initBannerAd(); // banner uses AdRequest, not AdRequestConfiguration — load early
        initWebView();
    }

    @Override
    protected void onStop() {
        super.onStop();
        wasInBackground = true;
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null)      webView.onResume();
        if (bannerAdView != null) bannerAdView.onResume();

        // Show app open ad when user returns from another app
        if (wasInBackground) {
            wasInBackground = false;
            showAppOpenAd();
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        // Do NOT call webView.pauseTimers() — pauses JS globally, breaks ad rendering
        if (webView != null)      webView.onPause();
        if (bannerAdView != null) bannerAdView.onPause();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (webView != null)      webView.destroy();
        if (bannerAdView != null) bannerAdView.destroy();
        if (appOpenAd != null)    appOpenAd.setAdEventListener(null);
        if (interstitialAd != null) interstitialAd.setAdEventListener(null);
        if (rewardedAd != null)   rewardedAd.setAdEventListener(null);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    // =========================================================================
    // Banner ad
    // =========================================================================

    private void initBannerAd() {
        int widthPx  = getResources().getDisplayMetrics().widthPixels;
        int density  = (int) getResources().getDisplayMetrics().density;
        int widthDp  = (density == 0) ? widthPx : widthPx / density;

        bannerAdView.setAdSize(BannerAdSize.stickySize(this, widthDp));
        bannerAdView.setAdUnitId(BANNER_AD_UNIT_ID);
        bannerAdView.setBannerAdEventListener(new BannerAdEventListener() {
            @Override public void onAdLoaded()                          { bannerLoaded = true; }
            @Override public void onAdFailedToLoad(AdRequestError e)   { bannerLoaded = false; }
            @Override public void onAdClicked()                        {}
            @Override public void onLeftApplication()                  {}
            @Override public void onReturnedToApplication()            {}
            @Override public void onImpression(ImpressionData d)       {}
        });
        bannerAdView.loadAd(new AdRequest.Builder().build());
    }

    // =========================================================================
    // App Open ad — first launch + background return
    // =========================================================================

    private void loadAppOpenAd() {
        AppOpenAdLoader loader = new AppOpenAdLoader(this);
        loader.setAdLoadListener(new AppOpenAdLoadListener() {
            @Override
            public void onAdLoaded(AppOpenAd ad) {
                appOpenAd = ad;
                // Show immediately on first launch if not yet shown
                if (!appOpenShown) {
                    mainHandler.post(() -> showAppOpenAd());
                }
            }
            @Override
            public void onAdFailedToLoad(AdRequestError error) {
                appOpenAd = null;
            }
        });
        loader.loadAd(new AdRequestConfiguration.Builder(APP_OPEN_AD_UNIT_ID).build());
    }

    private void showAppOpenAd() {
        if (appOpenAd == null) return;
        appOpenAd.setAdEventListener(new AppOpenAdEventListener() {
            @Override public void onAdShown()  { appOpenShown = true; }
            @Override public void onAdDismissed() {
                appOpenAd = null;
                loadAppOpenAd(); // preload the next one
            }
            @Override public void onAdFailedToShow(AdError e) {
                appOpenAd = null;
                loadAppOpenAd();
            }
            @Override public void onAdClicked()                   {}
            @Override public void onAdImpression(ImpressionData d){}
        });
        appOpenAd.show(this);
    }

    // =========================================================================
    // Interstitial ad — after race results and after 3 falls
    // =========================================================================

    private void loadInterstitialAd() {
        InterstitialAdLoader loader = new InterstitialAdLoader(this);
        loader.setAdLoadListener(new InterstitialAdLoadListener() {
            @Override public void onAdLoaded(InterstitialAd ad) { interstitialAd = ad; }
            @Override public void onAdFailedToLoad(AdRequestError e) { interstitialAd = null; }
        });
        loader.loadAd(new AdRequestConfiguration.Builder(INTERSTITIAL_AD_UNIT_ID).build());
    }

    private void showInterstitialAd() {
        if (interstitialAd == null) return;
        interstitialAd.setAdEventListener(new InterstitialAdEventListener() {
            @Override public void onAdShown()  {}
            @Override public void onAdDismissed() {
                interstitialAd = null;
                loadInterstitialAd(); // preload next immediately
            }
            @Override public void onAdFailedToShow(AdError e) {
                interstitialAd = null;
                loadInterstitialAd();
            }
            @Override public void onAdClicked()                   {}
            @Override public void onAdImpression(ImpressionData d){}
        });
        interstitialAd.show(this);
    }

    // =========================================================================
    // Rewarded ad — "Watch Ad ×2 Score" button
    // =========================================================================

    private void loadRewardedAd() {
        RewardedAdLoader loader = new RewardedAdLoader(this);
        loader.setAdLoadListener(new RewardedAdLoadListener() {
            @Override public void onAdLoaded(RewardedAd ad) { rewardedAd = ad; }
            @Override public void onAdFailedToLoad(AdRequestError e) {
                rewardedAd = null;
                // Notify game so button reappears
                fireJsEvent("reward:cancelled");
            }
        });
        loader.loadAd(new AdRequestConfiguration.Builder(REWARDED_AD_UNIT_ID).build());
    }

    private void showRewardedAdInternal() {
        if (rewardedAd == null) {
            fireJsEvent("reward:cancelled"); // not loaded yet — tell game
            return;
        }
        rewardedAd.setAdEventListener(new RewardedAdEventListener() {
            private boolean rewarded = false;

            @Override
            public void onRewarded(Reward reward) {
                rewarded = true;
                fireJsEvent("reward:double_score"); // full watch — grant reward
            }

            @Override public void onAdShown() {}

            @Override
            public void onAdDismissed() {
                rewardedAd = null;
                loadRewardedAd(); // preload next
                if (!rewarded) {
                    fireJsEvent("reward:cancelled"); // closed early — no reward
                }
            }

            @Override
            public void onAdFailedToShow(AdError e) {
                rewardedAd = null;
                loadRewardedAd();
                fireJsEvent("reward:cancelled");
            }

            @Override public void onAdClicked()                   {}
            @Override public void onAdImpression(ImpressionData d){}
        });
        rewardedAd.show(this);
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    /** Safely evaluate a PlayCanvas event dispatch in the WebView (main thread). */
    private void fireJsEvent(String event) {
        mainHandler.post(() -> {
            if (webView != null) {
                webView.evaluateJavascript("try{app.fire('" + event + "');}catch(e){}", null);
            }
        });
    }

    // =========================================================================
    // WebView + JavaScript bridge
    // =========================================================================

    private void initWebView() {
        webView = findViewById(R.id.webView);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);

        webView.addJavascriptInterface(new AdJsBridge(), "AndroidBridge");

        final WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        webView.setWebViewClient(new WebViewClientCompat() {
            @Override
            public android.webkit.WebResourceResponse shouldInterceptRequest(
                    WebView view, android.webkit.WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }
        });

        webView.loadUrl("https://appassets.androidplatform.net/assets/game/index.html");
    }

    /**
     * Exposed to PlayCanvas game JS as window.AndroidBridge.
     * All methods post back to the main thread — WebView JS runs on the main
     * thread but @JavascriptInterface callbacks run on a Binder thread.
     */
    private class AdJsBridge {

        /** Show banner. Called by race_manager.js on race_start. */
        @JavascriptInterface
        public void showBanner() {
            mainHandler.post(() -> {
                if (bannerLoaded) bannerAdView.setVisibility(View.VISIBLE);
            });
        }

        /** Hide banner. Called on race_end, pause, reset, back-to-menu. */
        @JavascriptInterface
        public void hideBanner() {
            mainHandler.post(() -> bannerAdView.setVisibility(View.GONE));
        }

        /**
         * Show interstitial. Called by:
         *  - race_results_script.js  (1.5 s after results appear)
         *  - race_manager.js         (after 3rd fall off the track)
         */
        @JavascriptInterface
        public void showInterstitial() {
            mainHandler.post(() -> showInterstitialAd());
        }

        /**
         * Show rewarded ad. Called by double_score_button.js.
         * Result fires back as app.fire('reward:double_score') or app.fire('reward:cancelled').
         */
        @JavascriptInterface
        public void showRewardedAd() {
            mainHandler.post(() -> showRewardedAdInternal());
        }
    }
}
