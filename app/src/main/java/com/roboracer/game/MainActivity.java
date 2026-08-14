package com.roboracer.game;

import android.app.AlertDialog;
import android.content.Context;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkRequest;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewClientCompat;

import com.appodeal.ads.Appodeal;
import com.appodeal.ads.BannerCallbacks;
import com.appodeal.ads.BannerView;
import com.appodeal.ads.InterstitialCallbacks;
import com.appodeal.ads.RewardedVideoCallbacks;
import com.appodeal.ads.NativeCallbacks;
import com.appodeal.ads.NativeAd;
import com.appodeal.ads.nativead.NativeAdViewNewsFeed;
import com.appodeal.ads.initializing.ApdInitializationCallback;
import com.appodeal.ads.initializing.ApdInitializationError;

import java.util.List;

/**
 * MainActivity — Robo Racer Android wrapper.
 *
 * AD INTEGRATION SUMMARY (Appodeal SDK 4.3.0):
 * ─────────────────────────────────────────────────────────────────────────────
 * Banner       : Bottom-of-screen banner rendered into the BannerView declared
 *                in activity_main.xml. Shown/hidden via the JS bridge
 *                (AndroidBridge.showBanner / hideBanner). It sits in its own
 *                LinearLayout row below the WebView, so it never overlaps the
 *                game UI.
 *
 * Interstitial : Triggered from the JS bridge, and also used when the player
 *                returns to the game from the background (see onResume).
 *
 * Rewarded     : Triggered from the JS bridge (double_score_button.js).
 *                Reward → app.fire('reward:double_score')
 *                Skip / failure → app.fire('reward:cancelled')
 *
 * App Open Ad  : Appodeal has no dedicated app-open ad format, so the old
 *                Yandex app-open flow (and its portrait-flip workaround) is
 *                gone. Returning from background now shows a normal
 *                interstitial, which works fine in landscape.
 *
 * Native        : Optional News Feed native ad rendered in its own row above
 *                the banner. It is controlled through the JS bridge and only
 *                becomes visible after a cached NativeAd is registered.
 *
 * NETWORKS     : AdMob and Meta Audience Network are excluded in
 *                app/build.gradle — see the comment there.
 */
public class MainActivity extends AppCompatActivity {

    private static final String TAG = "RoboRacer";

    /** Appodeal app key (Appodeal dashboard → App settings). */
    private static final String APPODEAL_APP_KEY =
            "83fb7616da22b8f43189122019d672888622fdf87eff87d3";

    private static final int AD_TYPES =
            Appodeal.BANNER | Appodeal.INTERSTITIAL | Appodeal.REWARDED_VIDEO
                    | Appodeal.NATIVE;

    private WebView    webView;
    private BannerView bannerView;
    private NativeAdViewNewsFeed nativeAdView;
    private boolean nativeAdLoaded = false;
    private boolean nativeAdRequested = false;

    private boolean bannerLoaded    = false;
    private boolean bannerRequested = true; // auto-show banner as soon as it loads
    private boolean rewardEarned    = false;
    private boolean wasInBackground = false;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    private ConnectivityManager connectivityManager;
    private ConnectivityManager.NetworkCallback networkCallback;
    private AlertDialog noNetworkDialog;
    private boolean appStarted = false;
    private boolean adsInitialized = false;

    // ── Lifecycle ─────────────────────────────────────────────────────────────

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

        bannerView = findViewById(R.id.appodealBannerView);
        bannerView.setVisibility(View.GONE);
        nativeAdView = findViewById(R.id.appodealNativeAdView);
        nativeAdView.setVisibility(View.GONE);

        initAppodeal();
        initWebView();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
        // Returning from background — Appodeal has no app-open format, so we
        // show a regular interstitial instead.
        if (wasInBackground && appStarted) {
            wasInBackground = false;
            mainHandler.postDelayed(this::showInterstitialAd, 300);
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
        if (adsInitialized) {
            Appodeal.setBannerCallbacks(null);
            Appodeal.setInterstitialCallbacks(null);
            Appodeal.setRewardedVideoCallbacks(null);
            Appodeal.setNativeCallbacks(null);
        }
        if (nativeAdView != null) {
            nativeAdView.destroy();
            nativeAdView = null;
        }
        bannerView = null;
        if (webView != null) { webView.destroy(); webView = null; }
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

    // ── Appodeal init ─────────────────────────────────────────────────────────

    private void initAppodeal() {
        Appodeal.setTesting(false);
        // Auto-cache keeps interstitial / rewarded / native / banner inventory ready.
        Appodeal.setAutoCache(AD_TYPES, true);
        Appodeal.setBannerViewId(R.id.appodealBannerView);
        Appodeal.setSharedAdsInstanceAcrossActivities(true);

        registerAdCallbacks();

        Appodeal.initialize(this, APPODEAL_APP_KEY, AD_TYPES, new ApdInitializationCallback() {
            @Override
            public void onInitializationFinished(List<ApdInitializationError> errors) {
                adsInitialized = true;
                if (errors != null && !errors.isEmpty()) {
                    for (ApdInitializationError e : errors) {
                        Log.w(TAG, "Appodeal init issue: " + e.toString());
                    }
                } else {
                    Log.i(TAG, "Appodeal initialized successfully");
                }
                // The first title-screen event can occur before the WebView bridge and
                // race-manager listeners are ready. Request the initial menu ads here as
                // a shell-side fallback; later JS calls remain supported.
                bannerRequested = true;
                nativeAdRequested = true;
                Appodeal.cache(MainActivity.this, Appodeal.BANNER, 1);
                Appodeal.cache(MainActivity.this, Appodeal.NATIVE, 1);
                mainHandler.post(() -> {
                    Appodeal.show(MainActivity.this, Appodeal.BANNER_VIEW);
                    showNativeAdInternal();
                });
            }
        });
    }

    private void registerAdCallbacks() {
        Appodeal.setBannerCallbacks(new BannerCallbacks() {
            @Override public void onBannerLoaded(int height, boolean isPrecache) {
                bannerLoaded = true;
                Log.i(TAG, "Banner loaded (height=" + height + "dp)");
                if (bannerRequested) showBannerView();
            }
            @Override public void onBannerFailedToLoad() {
                bannerLoaded = false;
                Log.w(TAG, "Banner failed to load");
            }
            @Override public void onBannerShown() { Log.i(TAG, "Banner shown"); }
            @Override public void onBannerShowFailed() { Log.w(TAG, "Banner show failed"); }
            @Override public void onBannerClicked() { Log.i(TAG, "Banner clicked"); }
            @Override public void onBannerExpired() { bannerLoaded = false; Log.i(TAG, "Banner expired"); }
        });

        Appodeal.setInterstitialCallbacks(new InterstitialCallbacks() {
            @Override public void onInterstitialLoaded(boolean isPrecache) { Log.i(TAG, "Interstitial loaded"); }
            @Override public void onInterstitialFailedToLoad() { Log.w(TAG, "Interstitial failed to load"); }
            @Override public void onInterstitialShown() { Log.i(TAG, "Interstitial shown"); }
            @Override public void onInterstitialShowFailed() { Log.w(TAG, "Interstitial show failed"); }
            @Override public void onInterstitialClicked() { Log.i(TAG, "Interstitial clicked"); }
            @Override public void onInterstitialClosed() { Log.i(TAG, "Interstitial closed"); }
            @Override public void onInterstitialExpired() { Log.i(TAG, "Interstitial expired"); }
        });

        Appodeal.setNativeCallbacks(new NativeCallbacks() {
            @Override public void onNativeLoaded() {
                nativeAdLoaded = true;
                Log.i(TAG, "Native ad loaded");
                if (nativeAdRequested) showNativeAdInternal();
            }
            @Override public void onNativeFailedToLoad() {
                nativeAdLoaded = false;
                Log.w(TAG, "Native ad failed to load");
            }
            @Override public void onNativeShown(NativeAd nativeAd) { Log.i(TAG, "Native ad shown"); }
            @Override public void onNativeShowFailed(NativeAd nativeAd) { Log.w(TAG, "Native ad show failed"); }
            @Override public void onNativeClicked(NativeAd nativeAd) { Log.i(TAG, "Native ad clicked"); }
            @Override public void onNativeExpired() {
                nativeAdLoaded = false;
                Log.i(TAG, "Native ad expired");
            }
        });

        Appodeal.setRewardedVideoCallbacks(new RewardedVideoCallbacks() {
            @Override public void onRewardedVideoLoaded(boolean isPrecache) { Log.i(TAG, "Rewarded loaded"); }
            @Override public void onRewardedVideoFailedToLoad() {
                Log.w(TAG, "Rewarded failed to load");
            }
            @Override public void onRewardedVideoShown() { Log.i(TAG, "Rewarded shown"); }
            @Override public void onRewardedVideoShowFailed() {
                Log.w(TAG, "Rewarded show failed");
                fireJsEvent("reward:cancelled");
            }
            @Override public void onRewardedVideoClicked() { Log.i(TAG, "Rewarded clicked"); }
            @Override public void onRewardedVideoFinished(double amount, String name) {
                rewardEarned = true;
                Log.i(TAG, "Rewarded finished — reward earned");
                fireJsEvent("reward:double_score");
            }
            @Override public void onRewardedVideoClosed(boolean finished) {
                Log.i(TAG, "Rewarded closed (finished=" + finished + ")");
                if (!rewardEarned && !finished) fireJsEvent("reward:cancelled");
                rewardEarned = false;
            }
            @Override public void onRewardedVideoExpired() { Log.i(TAG, "Rewarded expired"); }
        });
    }

    // ── Banner ────────────────────────────────────────────────────────────────

    private void showBannerView() {
        runOnUiThread(() -> {
            if (bannerView == null) return;
            bannerView.setVisibility(View.VISIBLE);
            Appodeal.show(this, Appodeal.BANNER_VIEW);
            Log.i(TAG, "Banner visible");
        });
    }

    private void hideBannerView() {
        runOnUiThread(() -> {
            Appodeal.hide(this, Appodeal.BANNER_VIEW);
            if (bannerView != null) bannerView.setVisibility(View.GONE);
            Log.i(TAG, "Banner hidden");
        });
    }

    // ── Native ─────────────────────────────────────────────────────────────────

    private void showNativeAdInternal() {
        runOnUiThread(() -> {
            if (nativeAdView == null || !Appodeal.isLoaded(Appodeal.NATIVE)) {
                Log.w(TAG, "Native ad not ready, skipping");
                return;
            }
            List<NativeAd> ads = Appodeal.getNativeAds(1);
            if (ads == null || ads.isEmpty()) {
                nativeAdLoaded = false;
                Log.w(TAG, "Native ad cache was empty, skipping");
                return;
            }
            nativeAdView.registerView(ads.get(0));
            nativeAdView.setVisibility(View.VISIBLE);
            nativeAdLoaded = false;
            Log.i(TAG, "Native ad registered");
        });
    }

    private void hideNativeAd() {
        runOnUiThread(() -> {
            if (nativeAdView != null) {
                nativeAdView.unregisterView();
                nativeAdView.setVisibility(View.GONE);
            }
            nativeAdRequested = false;
            Log.i(TAG, "Native ad hidden");
        });
    }

    // ── Interstitial ──────────────────────────────────────────────────────────

    private void showInterstitialAd() {
        if (!Appodeal.isLoaded(Appodeal.INTERSTITIAL)) {
            Log.w(TAG, "Interstitial not ready, skipping");
            return;
        }
        Appodeal.show(this, Appodeal.INTERSTITIAL);
    }

    // ── Rewarded ──────────────────────────────────────────────────────────────

    private void showRewardedAdInternal() {
        if (!Appodeal.isLoaded(Appodeal.REWARDED_VIDEO)) {
            Log.w(TAG, "Rewarded not ready, firing cancel");
            fireJsEvent("reward:cancelled");
            return;
        }
        rewardEarned = false;
        if (!Appodeal.show(this, Appodeal.REWARDED_VIDEO)) {
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
                if (bannerLoaded) showBannerView();
            });
        }
        @JavascriptInterface
        public void hideBanner() {
            Log.i(TAG, "JS bridge: hideBanner called");
            bannerRequested = false;
            mainHandler.post(() -> hideBannerView());
        }
        @JavascriptInterface
        public void showNativeAd() {
            Log.i(TAG, "JS bridge: showNativeAd called");
            nativeAdRequested = true;
            mainHandler.post(() -> showNativeAdInternal());
        }
        @JavascriptInterface
        public void hideNativeAd() {
            Log.i(TAG, "JS bridge: hideNativeAd called");
            mainHandler.post(() -> hideNativeAd());
        }
        @JavascriptInterface
        public boolean isNativeAdLoaded() {
            return nativeAdLoaded;
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
