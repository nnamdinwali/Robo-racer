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
 *   Banner       – shown during race only (race_start → race_end / pause / reset)
 *   App Open     – shown on first launch + whenever app returns from background
 *   Interstitial – shown 1.5s after race results appear, and after 3 falls off track
 *   Rewarded     – shown when player taps "Watch Ad ×2 Score" on results screen
 *
 * JS bridge (window.AndroidBridge):
 *   showBanner()       – reveal banner (race active)
 *   hideBanner()       – hide banner (race over / pause / menu)
 *   showInterstitial() – trigger interstitial from game JS
 *   showRewardedAd()   – trigger rewarded ad from game JS
 *
 * Result events fired back into the game via evaluateJavascript:
 *   app.fire('reward:double_score') – player watched full rewarded video
 *   app.fire('reward:cancelled')    – ad dismissed early or unavailable
 */
public class MainActivity extends AppCompatActivity {

    // ── Ad unit IDs from Yandex dashboard ──────────────────────────────────────
    private static final String BANNER_AD_UNIT_ID       = "R-M-19649179-4";
    private static final String INTERSTITIAL_AD_UNIT_ID = "R-M-19649179-1";
    private static final String REWARDED_AD_UNIT_ID     = "R-M-19649179-3";
    private static final String APP_OPEN_AD_UNIT_ID     = "R-M-19649179-2";

    // ── Views ──────────────────────────────────────────────────────────────────
    private WebView webView;
    private BannerAdView bannerAdView;

    // ── Ad loaders (kept as fields so we can cancelLoading in onDestroy) ───────
    private AppOpenAdLoader      appOpenAdLoader;
    private InterstitialAdLoader interstitialAdLoader;
    private RewardedAdLoader     rewardedAdLoader;

    // ── Loaded ad objects ──────────────────────────────────────────────────────
    private AppOpenAd      appOpenAd;
    private InterstitialAd interstitialAd;
    private RewardedAd     rewardedAd;

    // ── State ──────────────────────────────────────────────────────────────────
    private boolean bannerLoaded    = false;
    private boolean appOpenShown    = false;  // true after first-launch show
    private boolean wasInBackground = false;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    // ==========================================================================
    // Lifecycle
    // ==========================================================================

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        bannerAdView = findViewById(R.id.bannerAdView);
        bannerAdView.setVisibility(View.GONE);

        // Create loaders once — reuse them for every subsequent load
        appOpenAdLoader      = new AppOpenAdLoader(this);
        interstitialAdLoader = new InterstitialAdLoader(this);
        rewardedAdLoader     = new RewardedAdLoader(this);

        // Banner uses AdRequest directly; initialise early
        initBannerAd();

        // Full-screen ads load after SDK initialises
        MobileAds.initialize(this, () -> {
            loadAppOpenAd();
            loadInterstitialAd();
            loadRewardedAd();
        });

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

        if (wasInBackground) {
            wasInBackground = false;
            showAppOpenAd();   // show each time app returns from another app
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        // Do NOT call webView.pauseTimers() — it pauses JS timers globally
        if (webView != null)      webView.onPause();
        if (bannerAdView != null) bannerAdView.onPause();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        appOpenAdLoader.cancelLoading();
        interstitialAdLoader.cancelLoading();
        rewardedAdLoader.cancelLoading();
        if (appOpenAd != null)     { appOpenAd.setAdEventListener(null);     appOpenAd = null; }
        if (interstitialAd != null){ interstitialAd.setAdEventListener(null); interstitialAd = null; }
        if (rewardedAd != null)    { rewardedAd.setAdEventListener(null);    rewardedAd = null; }
        if (webView != null)       webView.destroy();
        if (bannerAdView != null)  bannerAdView.destroy();
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    // ==========================================================================
    // Banner ad
    // ==========================================================================

    private void initBannerAd() {
        int widthPx = getResources().getDisplayMetrics().widthPixels;
        int density = (int) getResources().getDisplayMetrics().density;
        int widthDp = (density == 0) ? widthPx : widthPx / density;

        bannerAdView.setAdSize(BannerAdSize.stickySize(this, widthDp));
        bannerAdView.setAdUnitId(BANNER_AD_UNIT_ID);
        bannerAdView.setBannerAdEventListener(new BannerAdEventListener() {
            @Override public void onAdLoaded()                        { bannerLoaded = true; }
            @Override public void onAdFailedToLoad(AdRequestError e)  { bannerLoaded = false; }
            @Override public void onAdClicked()                       {}
            @Override public void onLeftApplication()                 {}
            @Override public void onReturnedToApplication()           {}
            @Override public void onImpression(ImpressionData d)      {}
        });
        bannerAdView.loadAd(new AdRequest.Builder().build());
    }

    // ==========================================================================
    // App Open ad — first launch + background return
    // ==========================================================================

    private void loadAppOpenAd() {
        AdRequest adRequest = new AdRequest.Builder(APP_OPEN_AD_UNIT_ID).build();
        appOpenAdLoader.loadAd(adRequest, new AppOpenAdLoadListener() {
            @Override
            public void onAdLoaded(AppOpenAd ad) {
                appOpenAd = ad;
                if (!appOpenShown) {
                    mainHandler.post(() -> showAppOpenAd());
                }
            }
            @Override
            public void onAdFailedToLoad(AdRequestError error) {
                appOpenAd = null;
            }
        });
    }

    private void showAppOpenAd() {
        if (appOpenAd == null) return;
        appOpenAd.setAdEventListener(new AppOpenAdEventListener() {
            @Override public void onAdShown()  { appOpenShown = true; }
            @Override public void onAdDismissed() {
                appOpenAd = null;
                loadAppOpenAd();   // preload next immediately
            }
            @Override public void onAdFailedToShow(AdError e) {
                appOpenAd = null;
                loadAppOpenAd();
            }
            @Override public void onAdClicked()                    {}
            @Override public void onAdImpression(ImpressionData d) {}
        });
        appOpenAd.show(this);
    }

    // ==========================================================================
    // Interstitial ad — after race results and after 3 falls
    // ==========================================================================

    private void loadInterstitialAd() {
        AdRequest adRequest = new AdRequest.Builder(INTERSTITIAL_AD_UNIT_ID).build();
        interstitialAdLoader.loadAd(adRequest, new InterstitialAdLoadListener() {
            @Override public void onAdLoaded(InterstitialAd ad)      { interstitialAd = ad; }
            @Override public void onAdFailedToLoad(AdRequestError e)  { interstitialAd = null; }
        });
    }

    private void showInterstitialAd() {
        if (interstitialAd == null) return;
        interstitialAd.setAdEventListener(new InterstitialAdEventListener() {
            @Override public void onAdShown()  {}
            @Override public void onAdDismissed() {
                interstitialAd = null;
                loadInterstitialAd();   // preload next immediately
            }
            @Override public void onAdFailedToShow(AdError e) {
                interstitialAd = null;
                loadInterstitialAd();
            }
            @Override public void onAdClicked()                    {}
            @Override public void onAdImpression(ImpressionData d) {}
        });
        interstitialAd.show(this);
    }

    // ==========================================================================
    // Rewarded ad — "Watch Ad ×2 Score" button
    // ==========================================================================

    private void loadRewardedAd() {
        AdRequest adRequest = new AdRequest.Builder(REWARDED_AD_UNIT_ID).build();
        rewardedAdLoader.loadAd(adRequest, new RewardedAdLoadListener() {
            @Override public void onAdLoaded(RewardedAd ad)          { rewardedAd = ad; }
            @Override public void onAdFailedToLoad(AdRequestError e) {
                rewardedAd = null;
                fireJsEvent("reward:cancelled");   // tell button to reappear
            }
        });
    }

    private void showRewardedAdInternal() {
        if (rewardedAd == null) {
            fireJsEvent("reward:cancelled");
            return;
        }
        rewardedAd.setAdEventListener(new RewardedAdEventListener() {
            private boolean rewarded = false;

            @Override
            public void onRewarded(Reward reward) {
                rewarded = true;
                fireJsEvent("reward:double_score");
            }

            @Override public void onAdShown() {}

            @Override
            public void onAdDismissed() {
                rewardedAd = null;
                loadRewardedAd();
                if (!rewarded) fireJsEvent("reward:cancelled");
            }

            @Override
            public void onAdFailedToShow(AdError e) {
                rewardedAd = null;
                loadRewardedAd();
                fireJsEvent("reward:cancelled");
            }

            @Override public void onAdClicked()                    {}
            @Override public void onAdImpression(ImpressionData d) {}
        });
        rewardedAd.show(this);
    }

    // ==========================================================================
    // Helpers
    // ==========================================================================

    /** Fire a PlayCanvas event back into the WebView on the main thread. */
    private void fireJsEvent(String event) {
        mainHandler.post(() -> {
            if (webView != null) {
                webView.evaluateJavascript(
                        "try{app.fire('" + event + "');}catch(e){}", null);
            }
        });
    }

    // ==========================================================================
    // WebView + JavaScript bridge
    // ==========================================================================

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
     * Exposed to PlayCanvas JS as window.AndroidBridge.
     * @JavascriptInterface methods run on a Binder thread — always post to mainHandler.
     */
    private class AdJsBridge {

        @JavascriptInterface
        public void showBanner() {
            mainHandler.post(() -> {
                if (bannerLoaded) bannerAdView.setVisibility(View.VISIBLE);
            });
        }

        @JavascriptInterface
        public void hideBanner() {
            mainHandler.post(() -> bannerAdView.setVisibility(View.GONE));
        }

        @JavascriptInterface
        public void showInterstitial() {
            mainHandler.post(() -> showInterstitialAd());
        }

        @JavascriptInterface
        public void showRewardedAd() {
            mainHandler.post(() -> showRewardedAdInternal());
        }
    }
}
