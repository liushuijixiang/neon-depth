package com.dsh.neondepth;

import android.app.Activity;
import android.app.ActivityManager;
import android.app.ApplicationExitInfo;
import android.content.Intent;
import android.os.Bundle;
import android.os.Build;
import android.os.Process;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.ValueCallback;
import android.webkit.JavascriptInterface;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

public class MainActivity extends Activity {
    private static final String GAME_URL = "file:///android_asset/index.html";
    private WebView web;
    private boolean activityPaused;
    private final AtomicBoolean restartRequested = new AtomicBoolean();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (Build.VERSION.SDK_INT >= 30) ExitDiagnostics.report(this);
        createGameView();
    }

    private static final class ExitDiagnostics {
        static void report(Activity activity) {
            ActivityManager manager = (ActivityManager) activity.getSystemService(ACTIVITY_SERVICE);
            if (manager == null) return;
            try {
                List<ApplicationExitInfo> exits = manager.getHistoricalProcessExitReasons(activity.getPackageName(), 0, 3);
                for (ApplicationExitInfo exit : exits) Log.i("NeonDepth", exit.toString());
            } catch (RuntimeException failure) {
                Log.w("NeonDepth", failure);
            }
        }
    }

    private void createGameView() {
        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccessFromFileURLs(false);
        s.setAllowUniversalAccessFromFileURLs(false);
        web.addJavascriptInterface(new RuntimeBridge(), "NeonAndroid");
        web.setWebViewClient(Build.VERSION.SDK_INT >= 26 ? new RecoveringClient() : new GameClient());
        web.setBackgroundColor(0xFF04060B);
        setContentView(web);
        hideSystemUi();
        web.loadUrl(GAME_URL);
        if (activityPaused) {
            web.onPause();
            web.pauseTimers();
        }
    }

    private static class GameClient extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, String url) {
            return !GAME_URL.equals(url);
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            return !GAME_URL.equals(request.getUrl().toString());
        }
    }

    private final class RecoveringClient extends GameClient {
        @Override
        public boolean onRenderProcessGone(WebView failedView, RenderProcessGoneDetail detail) {
            Log.e("NeonDepth", "WebView renderer ended, crashed=" + detail.didCrash());
            ViewGroup parent = (ViewGroup) failedView.getParent();
            if (parent != null) parent.removeView(failedView);
            failedView.destroy();
            if (failedView == web) {
                web = null;
                if (!isFinishing()) createGameView();
            }
            return true;
        }
    }

    public final class RuntimeBridge {
        @JavascriptInterface
        public String compatibilityState() {
            return CompatibilityMode.state();
        }

        @JavascriptInterface
        public String restartStorage() {
            return CompatibilityMode.restartStorage();
        }

        @JavascriptInterface
        public void storageRestored(String id, boolean markerWasPresent) {
            CompatibilityMode.storageRestored(id, markerWasPresent);
        }

        @JavascriptInterface
        public boolean restartCompatibility(boolean enabled, String storage) {
            if (!restartRequested.compareAndSet(false, true)) return false;
            final CompatibilityMode.RestartRequest request = CompatibilityMode.prepareRestart(enabled, storage);
            if (request == null) {
                restartRequested.set(false);
                return false;
            }
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        Intent restart = new Intent(MainActivity.this, CompatibilityRestartActivity.class);
                        restart.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
                        restart.putExtra(CompatibilityRestartActivity.MAIN_PID, Process.myPid());
                        startActivity(restart);
                    } catch (RuntimeException error) {
                        CompatibilityMode.cancelRestart(request);
                        restartRequested.set(false);
                        Log.e("NeonDepth", "Compatibility restart could not be launched", error);
                        if (web != null) web.evaluateJavascript(
                                "if (window.NeonCompatibility) window.NeonCompatibility.restartFailed();", null);
                    }
                }
            });
            return true;
        }
    }

    @Override
    protected void onPause() {
        activityPaused = true;
        if (web != null) {
            // Complete audio suspension before pausing the JavaScript timers.
            web.evaluateJavascript("if (window.NeonAudio) window.NeonAudio.suspend();", new ValueCallback<String>() {
                @Override
                public void onReceiveValue(String value) {
                    if (activityPaused && web != null) web.pauseTimers();
                }
            });
            web.onPause();
        }
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        activityPaused = false;
        if (web != null) {
            web.resumeTimers();
            web.onResume();
            web.evaluateJavascript("if (window.NeonAudio) window.NeonAudio.resume();", null);
        }
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            ViewGroup parent = (ViewGroup) web.getParent();
            if (parent != null) parent.removeView(web);
            web.stopLoading();
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }

    private void hideSystemUi() {
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            | View.SYSTEM_UI_FLAG_FULLSCREEN
            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemUi();
    }

    @Override
    public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }
}
