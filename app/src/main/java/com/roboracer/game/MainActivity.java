package com.roboracer.game;

import android.app.AlertDialog;
import android.content.Context;
import android.content.pm.ActivityInfo;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkRequest;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.DisplayMetrics;
import android.util.Log;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.annotation.NonNull;
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
import com.yandex.mobile.ads.common.YandexAds;
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
 * MainActivity — Robo Racer Android wrapper.
 *
 * AD INTEGRATION SUMMARY:
 * ─────────────────────────────────────────────────────────────────────────────
 * Banner       : Bottom-of-screen sticky banner. Shown/hidden via JS bridge
 *                calls (AndroidBridge.showBanner / hideBanner). Uses a
 *                FrameLayout so the banner overlays the WebView without
 *                shrinking the game canvas (prevents the "lifted scene" bug).
 *
 * Interstitial : Triggered from JS bridge or fall-counter logic.
 *
 * Rewarded     : Triggered from JS bridge (double_score_button.js).
 *
 * App Open Ad  : Yandex app-open ads require PORTRAIT orientation.  Robo Racer
 *                is a landscape game (sensorLandscape).  Yandex will NEVER
 *                serve app-open ads in landscape — this is a hard SDK
 *                limitation documented at:
 *                https://ads.yandex.com/helpcenter/en/dev/android/app-open-ad
 *
 *                FIX: We temporarily flip to portrait, show the ad, then flip
 *                back.  This is the only reliable workaround.  We also use
 *                DefaultProcessLifecycleObserver (the Yandex-recommended
 *                approach) instead of manual wasInBackground tracking.
 *
 * BANNER CANVAS-FIT FIX:
 * ─────────────────────────────────────────────────────────────────────────────
 * The old LinearLayout + layout_weight="1" layout shrinks the WebView height
 * when the banner becomes visible, which makes the PlayCanvas scene appear
 * "lifted" because the canvas was rendered for the full-screen height.
 *
 * The new FrameLayout layout keeps the WebView at full screen size and
 * overlays the banner on top.  The WebView is given bottom padding equal
 * to the banner height so the canvas reflows correctly without shrinking.
 */
public class MainActivity extends AppCompatActivity {

    private static final String TAG = "RoboRacer";

    private static final String BANNER_AD_UNIT_ID       = "R-M-19649179-4";
    private static final String INTERSTITIAL_AD_UNIT_ID = "R-M-19649179-1";
    private static final String REWARDED_AD_UNIT_ID     = "R-M-19649179-3";
    private static final String APP_OPEN_AD_UNIT_ID     = "R-M-19649179-2";

    // Yandex demo IDs for testing (swap with real IDs in production):
    // "demo-banner-ad-yandex", "demo-interstitial-ad-yandex",
    // "demo-rewarded-yandex", "demo-appopenad-yandex"

    private WebView      webView;
    private BannerAdView bannerAdView;

    private AppOpenAdLoader      appOpenAdLoader;
    private InterstitialAdLoader interstitialAdLoader;
    private RewardedAdLoader     rewardedAdLoader;

    private AppOpenAd      appOpenAd;
    private InterstitialAd interstitialAd;
    private RewardedAd     rewardedAd;

    private boolean bannerLoaded    = false;
    private boolean bannerRequested = true; // auto-show banner as soon as it loads
    private boolean appOpenShown    = false;
    private boolean wasInBackground = false; // for app-open ad on foreground

    // Track whether we temporarily flipped to portrait for app-open ad
    private boolean portraitOverrideActive = false;
    private boolean waitingForPortraitFlip = false;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    private ConnectivityManager connectivityManager;
    private ConnectivityManager.NetworkCallback networkCallback;
    private AlertDialog noNetworkDialog;
    private boolean appStarted = false;

    // ── Lifecycle: App Open Ad via ProcessLifecycleObserver ────────────────────

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        connectivityManager = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        registerNetworkCallback();

        if (!isNetworkAvailable()) {
            showNoNetworkDialog();
        } else {
            startApp();
        }
    }

    private void startApp() {
        appStarted = true;

        bannerAdView = findViewById(R.id.bannerAdView);
        bannerAdView.setVisibility(View.GONE);

        appOpenAdLoader      = new AppOpenAdLoader(this);
        interstitialAdLoader = new InterstitialAdLoader(this);
        rewardedAdLoader     = new RewardedAdLoader(this);

        // FIX: Initialize Yandex first, then set the banner size AND start loading inside
        // a single post() callback so setAdSize() is always called before loadAd().
        // (Previously calculateAndSetBannerSize and initBannerAd were in separate callbacks
        // with no ordering guarantee between them.)
        YandexAds.initialize(this, () -> {
            Log.i(TAG, "YandexAds initialized");
            // Both size and load happen sequentially in one post() — ordering guaranteed.
            bannerAdView.post(() -> {
                calculateAndSetBannerSize();
                initBannerAd();
            });
            loadAppOpenAd();
            loadInterstitialAd();
            loadRewardedAd();

            // App-open ad on foreground is handled by onResume() via wasInBackground flag.
        });

        initWebView();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
        // Only restore landscape when the 350ms delay has elapsed (ad is on screen).
        // If waitingForPortraitFlip is still true the ad hasn't shown yet — don't flip back early.
        if (portraitOverrideActive && !waitingForPortraitFlip) {
            restoreLandscape();
        }
        // Show app-open ad when returning from background.
        if (wasInBackground && appStarted) {
            wasInBackground = false;
            showAppOpenAdInternal();
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (webView != null) webView.onPause();
        wasInBackground = true;
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        unregisterNetworkCallback();
        if (noNetworkDialog != null && noNetworkDialog.isShowing()) noNetworkDialog.dismiss();
        if (appOpenAdLoader      != null) appOpenAdLoader.cancelLoading();
        if (interstitialAdLoader != null) interstitialAdLoader.cancelLoading();
        if (rewardedAdLoader     != null) rewardedAdLoader.cancelLoading();
        if (appOpenAd      != null) { appOpenAd.setAdEventListener(null);      appOpenAd = null; }
        if (interstitialAd != null) { interstitialAd.setAdEventListener(null); interstitialAd = null; }
        if (rewardedAd     != null) { rewardedAd.setAdEventListener(null);     rewardedAd = null; }
        if (bannerAdView   != null) { bannerAdView.destroy();                  bannerAdView = null; }
        if (webView        != null) { webView.destroy();                        webView = null; }
    }

    // ── Network monitoring ────────────────────────────────────────────────────

    private void registerNetworkCallback() {
        networkCallback = new ConnectivityManager.NetworkCallback() {
            @Override
            public void onAvailable(@NonNull Network network) {
                runOnUiThread(() -> {
                    if (noNetworkDialog != null && noNetworkDialog.isShowing()) {
                        noNetworkDialog.dismiss();
                        noNetworkDialog = null;
                        if (!appStarted) startApp();
                    }
                });
            }

            @Override
            public void onLost(@NonNull Network network) {
                runOnUiThread(() -> {
                    if (noNetworkDialog == null || !noNetworkDialog.isShowing()) {
                        showNoNetworkDialog();
                    }
                });
            }
        };

        NetworkRequest request = new NetworkRequest.Builder()
                .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                .build();
        connectivityManager.registerNetworkCallback(request, networkCallback);
    }

    private void unregisterNetworkCallback() {
        if (networkCallback != null && connectivityManager != null) {
            try { connectivityManager.unregisterNetworkCallback(networkCallback); } catch (Exception e) {}
            networkCallback = null;
        }
    }

    private boolean isNetworkAvailable() {
        if (connectivityManager == null) return false;
        NetworkCapabilities caps = connectivityManager.getNetworkCapabilities(connectivityManager.getActiveNetwork());
        return caps != null && (caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) || caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR));
    }

    private void showNoNetworkDialog() {
        if (noNetworkDialog != null && noNetworkDialog.isShowing()) return;
        noNetworkDialog = new AlertDialog.Builder(this)
                .setTitle("No Internet Connection")
                .setMessage("Robo Racer requires an internet connection to play.")
                .setCancelable(false)
                .setPositiveButton("Retry", (dialog, which) -> {
                    noNetworkDialog = null;
                    if (isNetworkAvailable()) { if (!appStarted) startApp(); } else { showNoNetworkDialog(); }
                })
                .setNegativeButton("Exit", (dialog, which) -> finishAffinity())
                .show();
    }

    // ── Banner ────────────────────────────────────────────────────────────────

    /**
     * Calculate the adaptive sticky banner size using the full screen width.
     * Uses BannerAdSize.sticky() (SDK v8 API) with the available width in dp.
     */
    private void calculateAndSetBannerSize() {
        DisplayMetrics metrics = getResources().getDisplayMetrics();
        int widthPx = metrics.widthPixels;
        float density = metrics.density;
        int widthDp = (int) (widthPx / density);
        bannerAdView.setAdSize(BannerAdSize.sticky(this, widthDp));
        Log.i(TAG, "Banner size set to sticky, width=" + widthDp + "dp");
    }

    private void initBannerAd() {
        bannerAdView.setBannerAdEventListener(new BannerAdEventListener() {
            @Override
            public void onAdLoaded() {
                bannerLoaded = true;
                Log.i(TAG, "Banner ad loaded");
                // If the game already requested the banner while it was loading, show it now
                if (bannerRequested) {
                    showBannerView();
                }
            }
            @Override
            public void onAdFailedToLoad(AdRequestError e) {
                bannerLoaded = false;
                Log.w(TAG, "Banner ad failed to load: " + e.toString());
            }
            @Override public void onAdClicked() {
                Log.i(TAG, "Banner clicked");
            }
            @Override public void onImpression(ImpressionData d) {
                Log.i(TAG, "Banner impression");
            }
        });
        bannerAdView.loadAd(new AdRequest.Builder(BANNER_AD_UNIT_ID).build());
        Log.i(TAG, "Banner ad load request sent for unit: " + BANNER_AD_UNIT_ID);
    }

    /**
     * Show the banner below the WebView.
     * LinearLayout naturally reserves space for the banner row — no padding tricks needed.
     */
    private void showBannerView() {
        runOnUiThread(() -> {
            if (bannerAdView == null) return;
            bannerAdView.setVisibility(View.VISIBLE);
            Log.i(TAG, "Banner shown");
        });
    }

    private void hideBannerView() {
        runOnUiThread(() -> {
            if (bannerAdView != null) bannerAdView.setVisibility(View.GONE);
            Log.i(TAG, "Banner hidden");
        });
    }

    // ── App Open Ad ───────────────────────────────────────────────────────────

    /**
     * CRITICAL FIX: Yandex app-open ads require PORTRAIT orientation.
     * Our game is landscape (sensorLandscape). We temporarily flip to portrait,
     * show the ad, then flip back.
     *
     * If already in portrait (shouldn't happen in our app), just show directly.
     */
    private void showAppOpenAdInternal() {
        int currentOrientation = getResources().getConfiguration().orientation;
        if (currentOrientation == android.content.res.Configuration.ORIENTATION_PORTRAIT) {
            // Already portrait — show directly
            showAppOpenAd();
        } else {
            // We're in landscape — must flip to portrait first
            Log.i(TAG, "Landscape detected — flipping to portrait for app-open ad");
            waitingForPortraitFlip = true;
            portraitOverrideActive = true;
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
            // Delay show to give Android time to reconfigure the orientation
            mainHandler.postDelayed(() -> {
                if (waitingForPortraitFlip) {
                    waitingForPortraitFlip = false;
                    showAppOpenAd();
                }
            }, 350); // 350ms is enough for orientation change
        }
    }

    private void restoreLandscape() {
        portraitOverrideActive = false;
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
        Log.i(TAG, "Restored sensorLandscape orientation");
    }

    private void loadAppOpenAd() {
        appOpenAdLoader.loadAd(
            new AdRequest.Builder(APP_OPEN_AD_UNIT_ID).build(),
            new AppOpenAdLoadListener() {
                @Override
                public void onAdLoaded(AppOpenAd ad) {
                    appOpenAd = ad;
                    Log.i(TAG, "App-open ad loaded successfully");
                    // Cold Start: Show immediately on first load if not shown yet
                    if (!appOpenShown) {
                        mainHandler.postDelayed(() -> showAppOpenAdInternal(), 500);
                    }
                }
                @Override
                public void onAdFailedToLoad(AdRequestError e) {
                    Log.w(TAG, "App-open ad failed to load: " + e.toString());
                    appOpenAd = null;
                }
            }
        );
    }

    private void showAppOpenAd() {
        if (appOpenAd == null) {
            Log.w(TAG, "App-open ad is null, preloading for next time");
            loadAppOpenAd();
            return;
        }
        appOpenAd.setAdEventListener(new AppOpenAdEventListener() {
            @Override public void onAdShown() {
                appOpenShown = true;
                Log.i(TAG, "App-open ad shown");
            }
            @Override public void onAdDismissed() {
                Log.i(TAG, "App-open ad dismissed");
                appOpenAd = null;
                // Restore landscape after dismissing
                if (portraitOverrideActive) {
                    mainHandler.post(() -> restoreLandscape());
                }
                loadAppOpenAd();
            }
            @Override public void onAdFailedToShow(AdError e) {
                Log.w(TAG, "App-open ad failed to show: " + e.toString());
                appOpenAd = null;
                // Restore landscape even on failure
                if (portraitOverrideActive) {
                    mainHandler.post(() -> restoreLandscape());
                }
                loadAppOpenAd();
            }
            @Override public void onAdClicked() {
                Log.i(TAG, "App-open ad clicked");
            }
            @Override public void onAdImpression(ImpressionData d) {
                Log.i(TAG, "App-open ad impression");
            }
        });
        try {
            appOpenAd.show(this);
        } catch (Exception e) {
            Log.e(TAG, "Exception showing app-open ad: " + e.getMessage());
            appOpenAd = null;
            loadAppOpenAd();
        }
    }

    // ── Interstitial ──────────────────────────────────────────────────────────

    private void loadInterstitialAd() {
        interstitialAdLoader.loadAd(
            new AdRequest.Builder(INTERSTITIAL_AD_UNIT_ID).build(),
            new InterstitialAdLoadListener() {
                @Override
                public void onAdLoaded(InterstitialAd ad) {
                    interstitialAd = ad;
                    Log.i(TAG, "Interstitial ad loaded");
                }
                @Override
                public void onAdFailedToLoad(AdRequestError e) {
                    interstitialAd = null;
                    Log.w(TAG, "Interstitial ad failed to load: " + e.toString());
                }
            }
        );
    }

    private void showInterstitialAd() {
        if (interstitialAd == null) {
            Log.w(TAG, "Interstitial ad not ready, skipping");
            return;
        }
        interstitialAd.setAdEventListener(new InterstitialAdEventListener() {
            @Override public void onAdShown() {
                Log.i(TAG, "Interstitial shown");
            }
            @Override public void onAdDismissed() {
                Log.i(TAG, "Interstitial dismissed");
                interstitialAd = null;
                loadInterstitialAd();
            }
            @Override public void onAdFailedToShow(AdError e) {
                Log.w(TAG, "Interstitial failed to show: " + e.toString());
                interstitialAd = null;
                loadInterstitialAd();
            }
            @Override public void onAdClicked() {
                Log.i(TAG, "Interstitial clicked");
            }
            @Override public void onAdImpression(ImpressionData d) {
                Log.i(TAG, "Interstitial impression");
            }
        });
        try {
            interstitialAd.show(this);
        } catch (Exception e) {
            Log.e(TAG, "Exception showing interstitial: " + e.getMessage());
            interstitialAd = null;
            loadInterstitialAd();
        }
    }

    // ── Rewarded ──────────────────────────────────────────────────────────────

    private void loadRewardedAd() {
        rewardedAdLoader.loadAd(
            new AdRequest.Builder(REWARDED_AD_UNIT_ID).build(),
            new RewardedAdLoadListener() {
                @Override
                public void onAdLoaded(RewardedAd ad) {
                    rewardedAd = ad;
                    Log.i(TAG, "Rewarded ad loaded");
                }
                @Override
                public void onAdFailedToLoad(AdRequestError e) {
                    rewardedAd = null;
                    Log.w(TAG, "Rewarded ad failed to load: " + e.toString());
                    fireJsEvent("reward:cancelled");
                }
            }
        );
    }

    private void showRewardedAdInternal() {
        if (rewardedAd == null) {
            Log.w(TAG, "Rewarded ad not ready, firing cancel");
            fireJsEvent("reward:cancelled");
            return;
        }
        rewardedAd.setAdEventListener(new RewardedAdEventListener() {
            private boolean rewarded = false;
            @Override public void onRewarded(Reward r) {
                rewarded = true;
                fireJsEvent("reward:double_score");
                Log.i(TAG, "Rewarded ad: reward earned");
            }
            @Override public void onAdShown() {
                Log.i(TAG, "Rewarded ad shown");
            }
            @Override public void onAdDismissed() {
                Log.i(TAG, "Rewarded ad dismissed");
                rewardedAd = null;
                loadRewardedAd();
                if (!rewarded) fireJsEvent("reward:cancelled");
            }
            @Override public void onAdFailedToShow(AdError e) {
                Log.w(TAG, "Rewarded ad failed to show: " + e.toString());
                rewardedAd = null;
                loadRewardedAd();
                fireJsEvent("reward:cancelled");
            }
            @Override public void onAdClicked() {
                Log.i(TAG, "Rewarded ad clicked");
            }
            @Override public void onAdImpression(ImpressionData d) {
                Log.i(TAG, "Rewarded ad impression");
            }
        });
        try {
            rewardedAd.show(this);
        } catch (Exception e) {
            Log.e(TAG, "Exception showing rewarded ad: " + e.getMessage());
            rewardedAd = null;
            loadRewardedAd();
            fireJsEvent("reward:cancelled");
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void fireJsEvent(String event) {
        mainHandler.post(() -> {
            if (webView != null) {
                String js = "try{if(window.app&&typeof window.app.fire==='function'){app.fire('" + event + "');}}catch(e){}";
                webView.evaluateJavascript(js, null);
            }
        });
    }

    private void initWebView() {
        webView = findViewById(R.id.webView);
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        webView.addJavascriptInterface(new AdJsBridge(), "AndroidBridge");

        final WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        webView.setWebViewClient(new WebViewClientCompat() {
            @Override
            public android.webkit.WebResourceResponse shouldInterceptRequest(WebView view, android.webkit.WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }
        });
        webView.loadUrl("https://appassets.androidplatform.net/assets/game/index.html");
    }

    // ── JavaScript Bridge ─────────────────────────────────────────────────────

    private class AdJsBridge {
        @JavascriptInterface
        public void showBanner() {
            Log.i(TAG, "JS bridge: showBanner called");
            bannerRequested = true;
            mainHandler.post(() -> {
                if (bannerLoaded) {
                    showBannerView();
                }
            });
        }
        @JavascriptInterface
        public void hideBanner() {
            Log.i(TAG, "JS bridge: hideBanner called");
            bannerRequested = false;
            mainHandler.post(() -> hideBannerView());
        }
        @JavascriptInterface
        public void showInterstitial() {
            Log.i(TAG, "JS bridge: showInterstitial called");
            mainHandler.post(() -> showInterstitialAd());
        }
        @JavascriptInterface
        public void showRewardedAd() {
            Log.i(TAG, "JS bridge: showRewardedAd called");
            mainHandler.post(() -> showRewardedAdInternal());
        }
        @JavascriptInterface
        public boolean isBannerLoaded() {
            return bannerLoaded;
        }
    }
}
