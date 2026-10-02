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
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewClientCompat;

/**
 * MainActivity — Robo Racer Android wrapper.
 *
 * Appodeal SDK has been removed. Ad JS bridge methods remain as safe no-ops
 * so the game still runs. Wire your new mediation SDK (Meta + Yandex, etc.)
 * into these methods when ready.
 */
public class MainActivity extends AppCompatActivity {

    private static final String TAG = "RoboRacer";

    private WebView webView;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    private ConnectivityManager connectivityManager;
    private ConnectivityManager.NetworkCallback networkCallback;
    private AlertDialog noNetworkDialog;
    private boolean appStarted = false;
    private boolean wasInBackground = false;

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
        initWebView();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
        wasInBackground = false;
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
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
    }

    private void registerNetworkCallback() {
        networkCallback = new ConnectivityManager.NetworkCallback() {
            @Override
            public void onAvailable(@NonNull Network network) {
                mainHandler.post(() -> {
                    if (noNetworkDialog != null && noNetworkDialog.isShowing()) {
                        noNetworkDialog.dismiss();
                    }
                    if (!appStarted) startApp();
                });
            }

            @Override
            public void onLost(@NonNull Network network) {
                mainHandler.post(() -> {
                    if (!isNetworkAvailable()) showNoNetworkDialog();
                });
            }
        };
        NetworkRequest request = new NetworkRequest.Builder()
                .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                .build();
        try {
            connectivityManager.registerNetworkCallback(request, networkCallback);
        } catch (Exception e) {
            Log.w(TAG, "registerNetworkCallback failed", e);
        }
    }

    private void unregisterNetworkCallback() {
        if (connectivityManager != null && networkCallback != null) {
            try {
                connectivityManager.unregisterNetworkCallback(networkCallback);
            } catch (Exception ignored) {
            }
            networkCallback = null;
        }
    }

    private boolean isNetworkAvailable() {
        if (connectivityManager == null) return false;
        Network network = connectivityManager.getActiveNetwork();
        if (network == null) return false;
        NetworkCapabilities caps = connectivityManager.getNetworkCapabilities(network);
        return caps != null && (
                caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)
                        || caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)
                        || caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)
        );
    }

    private void showNoNetworkDialog() {
        if (isFinishing()) return;
        if (noNetworkDialog != null && noNetworkDialog.isShowing()) return;
        noNetworkDialog = new AlertDialog.Builder(this)
                .setTitle("No Internet")
                .setMessage("Please connect to the internet to play Robo Racer.")
                .setCancelable(false)
                .setPositiveButton("Retry", (d, w) -> {
                    if (isNetworkAvailable()) {
                        d.dismiss();
                        if (!appStarted) startApp();
                    } else {
                        showNoNetworkDialog();
                    }
                })
                .create();
        noNetworkDialog.show();
    }

    private void initWebView() {
        webView = findViewById(R.id.webView);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

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

        webView.addJavascriptInterface(new AndroidBridge(), "AndroidBridge");
        webView.loadUrl("https://appassets.androidplatform.net/assets/game/index.html");
    }

    private void fireJsEvent(String eventName) {
        if (webView == null) return;
        String js = "try{if(typeof app!=='undefined'&&app.fire){app.fire('" + eventName + "');}}catch(e){}";
        webView.evaluateJavascript(js, null);
    }

    /**
     * JS bridge used by the PlayCanvas game.
     * Ad methods are no-ops until a new mediation SDK is wired in.
     */
    public class AndroidBridge {
        @JavascriptInterface
        public void showBanner() {
            Log.i(TAG, "JS bridge: showBanner (no ad SDK)");
        }

        @JavascriptInterface
        public void hideBanner() {
            Log.i(TAG, "JS bridge: hideBanner (no ad SDK)");
        }

        @JavascriptInterface
        public void showInterstitial() {
            Log.i(TAG, "JS bridge: showInterstitial (no ad SDK)");
        }

        @JavascriptInterface
        public void showRewardedAd() {
            Log.i(TAG, "JS bridge: showRewardedAd (no ad SDK) — granting reward so gameplay continues");
            mainHandler.post(() -> fireJsEvent("reward:double_score"));
        }

        @JavascriptInterface
        public boolean isBannerLoaded() {
            return false;
        }

        @JavascriptInterface
        public void showNativeAd() {
            Log.i(TAG, "JS bridge: showNativeAd (no ad SDK)");
        }

        @JavascriptInterface
        public void hideNativeAd() {
            Log.i(TAG, "JS bridge: hideNativeAd (no ad SDK)");
        }
    }
}
