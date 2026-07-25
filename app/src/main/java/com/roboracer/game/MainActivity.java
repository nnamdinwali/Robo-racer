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

import com.yandex.mobile.ads.banner.BannerAdEventListener;
import com.yandex.mobile.ads.banner.BannerAdSize;
import com.yandex.mobile.ads.banner.BannerAdView;
import com.yandex.mobile.ads.common.AdRequest;
import com.yandex.mobile.ads.common.AdRequestError;
import com.yandex.mobile.ads.common.ImpressionData;
import com.yandex.mobile.ads.common.MobileAds;

/**
 * WebView wrapper for Robo Racer with Yandex Mobile Ads banner integration.
 *
 * Communication flow:
 *   PlayCanvas JS  -->  window.AndroidBridge.showBanner() / hideBanner()
 *   AndroidBridge  -->  runs on main thread via Handler
 *   Banner         -->  shown only while race is active; hidden otherwise
 *
 * This satisfies Huawei AppGallery policy: the banner is never visible on menus
 * or result screens — only during live gameplay.
 */
public class MainActivity extends AppCompatActivity {

    /** Yandex banner ad unit ID (from Yandex Ads dashboard). */
    private static final String BANNER_AD_UNIT_ID = "R-M-19649179-4";

    private WebView webView;
    private BannerAdView bannerAdView;

    /** All UI updates from the JS bridge must run on the main thread. */
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    /** True once the banner has loaded successfully at least once. */
    private boolean bannerLoaded = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // Initialise Yandex Mobile Ads SDK once per process.
        MobileAds.initialize(this, () -> { /* SDK ready */ });

        bannerAdView = findViewById(R.id.bannerAdView);
        bannerAdView.setVisibility(View.GONE); // hidden until race_start

        initBannerAd();
        initWebView();
    }

    // ─── Banner ad setup ──────────────────────────────────────────────────────

    private void initBannerAd() {
        // Use a sticky adaptive banner that fills the screen width.
        int widthPx = getResources().getDisplayMetrics().widthPixels;
        int density = (int) getResources().getDisplayMetrics().density;
        int widthDp = (density == 0) ? widthPx : widthPx / density;

        bannerAdView.setAdSize(BannerAdSize.stickySize(this, widthDp));
        bannerAdView.setAdUnitId(BANNER_AD_UNIT_ID);

        bannerAdView.setBannerAdEventListener(new BannerAdEventListener() {
            @Override
            public void onAdLoaded() {
                bannerLoaded = true;
            }

            @Override
            public void onAdFailedToLoad(AdRequestError error) {
                // Keep bannerLoaded = false; showBanner() will no-op safely.
                bannerLoaded = false;
            }

            @Override public void onAdClicked() {}
            @Override public void onLeftApplication() {}
            @Override public void onReturnedToApplication() {}
            @Override public void onImpression(ImpressionData impressionData) {}
        });

        bannerAdView.loadAd(new AdRequest.Builder().build());
    }

    // ─── WebView setup ────────────────────────────────────────────────────────

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

        // Expose the ad bridge to the game's JavaScript as window.AndroidBridge
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

    // ─── JavaScript → Android bridge ─────────────────────────────────────────

    /**
     * Called by the PlayCanvas game JS via window.AndroidBridge.
     * Methods must be called on the main thread — we use mainHandler.post().
     */
    private class AdJsBridge {

        /**
         * Show the banner. Called by race_manager.js on race_start.
         * No-op if the ad has not loaded yet (avoids a blank strip).
         */
        @JavascriptInterface
        public void showBanner() {
            mainHandler.post(() -> {
                if (bannerLoaded) {
                    bannerAdView.setVisibility(View.VISIBLE);
                }
            });
        }

        /**
         * Hide the banner. Called by race_manager.js on race_end, GUI:Pause,
         * and GUI:ResetRace so the banner never appears on menus or results.
         */
        @JavascriptInterface
        public void hideBanner() {
            mainHandler.post(() -> bannerAdView.setVisibility(View.GONE));
        }
    }

    // ─── Activity lifecycle ───────────────────────────────────────────────────

    @Override
    protected void onPause() {
        super.onPause();
        // Do NOT call webView.pauseTimers() — it pauses JS timers globally
        // and would break any WebView-based ad rendering.
        if (webView != null)      webView.onPause();
        if (bannerAdView != null) bannerAdView.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null)      webView.onResume();
        if (bannerAdView != null) bannerAdView.onResume();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (webView != null)      webView.destroy();
        if (bannerAdView != null) bannerAdView.destroy();
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
