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

public class MainActivity extends AppCompatActivity {

    private static final String BANNER_AD_UNIT_ID       = "R-M-19649179-4";
    private static final String INTERSTITIAL_AD_UNIT_ID = "R-M-19649179-1";
    private static final String REWARDED_AD_UNIT_ID     = "R-M-19649179-3";
    private static final String APP_OPEN_AD_UNIT_ID     = "R-M-19649179-2";

    private WebView    webView;
    private BannerAdView bannerAdView;

    private AppOpenAdLoader      appOpenAdLoader;
    private InterstitialAdLoader interstitialAdLoader;
    private RewardedAdLoader     rewardedAdLoader;

    private AppOpenAd      appOpenAd;
    private InterstitialAd interstitialAd;
    private RewardedAd     rewardedAd;

    private boolean bannerLoaded    = false;
    private boolean appOpenShown    = false;
    private boolean wasInBackground = false;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    // -------------------------------------------------------------------------
    // Lifecycle
    // -------------------------------------------------------------------------

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        bannerAdView = findViewById(R.id.bannerAdView);
        bannerAdView.setVisibility(View.GONE);

        appOpenAdLoader      = new AppOpenAdLoader(this);
        interstitialAdLoader = new InterstitialAdLoader(this);
        rewardedAdLoader     = new RewardedAdLoader(this);

        YandexAds.initialize(this, () -> {
            initBannerAd();
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
        if (webView != null) webView.onResume();
        if (wasInBackground) {
            wasInBackground = false;
            showAppOpenAd();
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (webView != null) webView.onPause();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        appOpenAdLoader.cancelLoading();
        interstitialAdLoader.cancelLoading();
        rewardedAdLoader.cancelLoading();
        if (appOpenAd != null)      { appOpenAd.setAdEventListener(null);      appOpenAd = null; }
        if (interstitialAd != null) { interstitialAd.setAdEventListener(null); interstitialAd = null; }
        if (rewardedAd != null)     { rewardedAd.setAdEventListener(null);     rewardedAd = null; }
        if (bannerAdView != null)   { bannerAdView.destroy();                  bannerAdView = null; }
        if (webView != null)        { webView.destroy();                        webView = null; }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    // -------------------------------------------------------------------------
    // Banner
    // -------------------------------------------------------------------------

    private void initBannerAd() {
        int widthPx = getResources().getDisplayMetrics().widthPixels;
        int density = (int) getResources().getDisplayMetrics().density;
        int widthDp = (density == 0) ? widthPx : widthPx / density;

        bannerAdView.setAdSize(BannerAdSize.sticky(this, widthDp));
        bannerAdView.setBannerAdEventListener(new BannerAdEventListener() {
            @Override public void onAdLoaded()                         { bannerLoaded = true; }
            @Override public void onAdFailedToLoad(AdRequestError e)  { bannerLoaded = false; }
            @Override public void onAdClicked()                        {}
            @Override public void onImpression(ImpressionData d)       {}
        });
        bannerAdView.loadAd(new AdRequest.Builder(BANNER_AD_UNIT_ID).build());
    }

    // -------------------------------------------------------------------------
    // App Open
    // -------------------------------------------------------------------------

    private void loadAppOpenAd() {
        appOpenAdLoader.loadAd(
            new AdRequest.Builder(APP_OPEN_AD_UNIT_ID).build(),
            new AppOpenAdLoadListener() {
                @Override public void onAdLoaded(AppOpenAd ad) {
                    appOpenAd = ad;
                    if (!appOpenShown) mainHandler.post(() -> showAppOpenAd());
                }
                @Override public void onAdFailedToLoad(AdRequestError e) { appOpenAd = null; }
            }
        );
    }

    private void showAppOpenAd() {
        if (appOpenAd == null) return;
        appOpenAd.setAdEventListener(new AppOpenAdEventListener() {
            @Override public void onAdShown() { appOpenShown = true; }
            @Override public void onAdDismissed() { appOpenAd = null; loadAppOpenAd(); }
            @Override public void onAdFailedToShow(AdError e) { appOpenAd = null; loadAppOpenAd(); }
            @Override public void onAdClicked() {}
            @Override public void onAdImpression(ImpressionData d) {}
        });
        appOpenAd.show(this);
    }

    // -------------------------------------------------------------------------
    // Interstitial
    // -------------------------------------------------------------------------

    private void loadInterstitialAd() {
        interstitialAdLoader.loadAd(
            new AdRequest.Builder(INTERSTITIAL_AD_UNIT_ID).build(),
            new InterstitialAdLoadListener() {
                @Override public void onAdLoaded(InterstitialAd ad)     { interstitialAd = ad; }
                @Override public void onAdFailedToLoad(AdRequestError e) { interstitialAd = null; }
            }
        );
    }

    private void showInterstitialAd() {
        if (interstitialAd == null) return;
        interstitialAd.setAdEventListener(new InterstitialAdEventListener() {
            @Override public void onAdShown() {}
            @Override public void onAdDismissed() { interstitialAd = null; loadInterstitialAd(); }
            @Override public void onAdFailedToShow(AdError e) { interstitialAd = null; loadInterstitialAd(); }
            @Override public void onAdClicked() {}
            @Override public void onAdImpression(ImpressionData d) {}
        });
        interstitialAd.show(this);
    }

    // -------------------------------------------------------------------------
    // Rewarded
    // -------------------------------------------------------------------------

    private void loadRewardedAd() {
        rewardedAdLoader.loadAd(
            new AdRequest.Builder(REWARDED_AD_UNIT_ID).build(),
            new RewardedAdLoadListener() {
                @Override public void onAdLoaded(RewardedAd ad)          { rewardedAd = ad; }
                @Override public void onAdFailedToLoad(AdRequestError e) {
                    rewardedAd = null;
                    fireJsEvent("reward:cancelled");
                }
            }
        );
    }

    private void showRewardedAdInternal() {
        if (rewardedAd == null) { fireJsEvent("reward:cancelled"); return; }
        rewardedAd.setAdEventListener(new RewardedAdEventListener() {
            private boolean rewarded = false;
            @Override public void onRewarded(Reward r) { rewarded = true; fireJsEvent("reward:double_score"); }
            @Override public void onAdShown() {}
            @Override public void onAdDismissed() {
                rewardedAd = null; loadRewardedAd();
                if (!rewarded) fireJsEvent("reward:cancelled");
            }
            @Override public void onAdFailedToShow(AdError e) {
                rewardedAd = null; loadRewardedAd();
                fireJsEvent("reward:cancelled");
            }
            @Override public void onAdClicked() {}
            @Override public void onAdImpression(ImpressionData d) {}
        });
        rewardedAd.show(this);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private void fireJsEvent(String event) {
        mainHandler.post(() -> {
            if (webView != null)
                webView.evaluateJavascript("try{app.fire('" + event + "');}catch(e){}", null);
        });
    }

    // -------------------------------------------------------------------------
    // WebView + JS bridge
    // -------------------------------------------------------------------------

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
            public android.webkit.WebResourceResponse shouldInterceptRequest(
                    WebView view, android.webkit.WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }
        });

        webView.loadUrl("https://appassets.androidplatform.net/assets/game/index.html");
    }

    private class AdJsBridge {
        @JavascriptInterface
        public void showBanner() {
            mainHandler.post(() -> { if (bannerLoaded) bannerAdView.setVisibility(View.VISIBLE); });
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
