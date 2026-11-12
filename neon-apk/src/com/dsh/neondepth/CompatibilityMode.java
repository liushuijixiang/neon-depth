package com.dsh.neondepth;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;
import java.util.Iterator;
import java.util.UUID;
import org.json.JSONException;
import org.json.JSONObject;

/** Native compatibility state and a durable checkpoint for a process restart. */
final class CompatibilityMode {
    private static final String PREFERENCES = "neon_runtime";
    private static final String ENABLED = "compatibility_enabled";
    private static final String RESTART_ID = "restart_id";
    private static final String RESTART_STORAGE = "restart_storage";

    private static SharedPreferences preferences;
    private static boolean supported;
    private static boolean active;
    private static boolean restoredDuringThisProcess;

    private CompatibilityMode() { }

    private static native boolean nativeIsSupported();
    private static native boolean nativeDisableHeapTagging();

    static synchronized void initialize(Context context) {
        if (preferences != null) return;
        preferences = context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE);
        if (Build.VERSION.SDK_INT < 31) return;
        try {
            System.loadLibrary("neoncompat");
            supported = nativeIsSupported();
            if (supported && preferences.getBoolean(ENABLED, false)) {
                active = nativeDisableHeapTagging();
                if (!active) Log.w("NeonDepth", "Compatibility mode was not applied by the native allocator");
            }
        } catch (LinkageError | RuntimeException error) {
            supported = false;
            active = false;
            Log.w("NeonDepth", "Compatibility initialization failed", error);
        }
    }

    static synchronized String state() {
        boolean requested = preferences != null && preferences.getBoolean(ENABLED, false);
        return "{\"supported\":" + supported
                + ",\"requested\":" + requested
                + ",\"active\":" + active
                + ",\"failed\":" + (requested && !active) + "}";
    }

    static synchronized String restartStorage() {
        return preferences == null ? "" : preferences.getString(RESTART_STORAGE, "");
    }

    static synchronized void storageRestored(String id, boolean markerWasPresent) {
        if (preferences == null || id == null || !id.equals(preferences.getString(RESTART_ID, ""))) return;
        // A marker observed on a later process startup proves that the previous
        // restore reached WebView storage. Keep the checkpoint during its first
        // process lifetime, including any renderer replacement in that process.
        if (markerWasPresent && !restoredDuringThisProcess) {
            if (!preferences.edit().remove(RESTART_ID).remove(RESTART_STORAGE).commit()) {
                Log.w("NeonDepth", "Compatibility checkpoint acknowledgement was not persisted");
            }
        }
        restoredDuringThisProcess = true;
    }

    static synchronized RestartRequest prepareRestart(boolean enabled, String storage) {
        if (!supported || preferences == null) return null;
        try {
            JSONObject input = new JSONObject(storage);
            if (input.getInt("version") != 1) return null;
            JSONObject entries = input.getJSONObject("entries");
            Iterator<String> keys = entries.keys();
            while (keys.hasNext()) {
                String key = keys.next();
                if (!isGameStorageKey(key) || !(entries.get(key) instanceof String)) return null;
            }
            String id = UUID.randomUUID().toString();
            JSONObject checkpoint = new JSONObject();
            checkpoint.put("id", id);
            checkpoint.put("entries", entries);
            RestartRequest request = new RestartRequest(id,
                    preferences.getBoolean(ENABLED, false),
                    preferences.getString(RESTART_ID, ""),
                    preferences.getString(RESTART_STORAGE, ""));
            boolean saved = preferences.edit()
                    .putBoolean(ENABLED, enabled)
                    .putString(RESTART_ID, id)
                    .putString(RESTART_STORAGE, checkpoint.toString())
                    .commit();
            if (!saved) cancelRestart(request);
            return saved ? request : null;
        } catch (JSONException | RuntimeException error) {
            Log.w("NeonDepth", "Compatibility restart preparation failed", error);
            return null;
        }
    }

    static synchronized void cancelRestart(RestartRequest request) {
        if (preferences == null || request == null
                || !request.id.equals(preferences.getString(RESTART_ID, ""))) return;
        boolean saved = preferences.edit()
                .putBoolean(ENABLED, request.previousEnabled)
                .putString(RESTART_ID, request.previousId)
                .putString(RESTART_STORAGE, request.previousStorage)
                .commit();
        if (!saved) Log.w("NeonDepth", "Compatibility restart rollback was not persisted");
    }

    private static boolean isGameStorageKey(String key) {
        return key.startsWith("neon-depth-") || key.equals("neon_chal_v1");
    }

    static final class RestartRequest {
        final String id;
        final boolean previousEnabled;
        final String previousId;
        final String previousStorage;

        RestartRequest(String id, boolean previousEnabled, String previousId, String previousStorage) {
            this.id = id;
            this.previousEnabled = previousEnabled;
            this.previousId = previousId;
            this.previousStorage = previousStorage;
        }
    }
}
