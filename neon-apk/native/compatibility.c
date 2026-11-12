#include <jni.h>

#if defined(__aarch64__)
#include <dlfcn.h>
#include <malloc.h>
#include <stdlib.h>
#include <sys/prctl.h>
#include <sys/system_properties.h>

typedef int (*MalloptFunction)(int option, int value);

static MalloptFunction supported_mallopt(void) {
    char sdk[PROP_VALUE_MAX] = {0};
    char *end = NULL;
    if (__system_property_get("ro.build.version.sdk", sdk) <= 0) {
        return NULL;
    }
    long api = strtol(sdk, &end, 10);
    if (end == sdk || *end != '\0' || api < 31) {
        return NULL;
    }

    /* Restrict the workaround to readable, enabled tagged-address ABI without active MTE checks.
     * PR_GET_TAGGED_ADDR_CTRL reports the calling thread's configuration.
     * Call from NeonApplication.onCreate on the main thread, before creating WebView.
     * This startup check does not inspect tagging modes later selected by other threads.
     * Runtime NONE can disable MTE checks that an explicit memtagMode kept enabled at startup.
     */
    int tagged_control = prctl(PR_GET_TAGGED_ADDR_CTRL, 0L, 0L, 0L, 0L);
    if (tagged_control < 0 || (tagged_control & PR_TAGGED_ADDR_ENABLE) == 0 ||
        (tagged_control & PR_MTE_TCF_MASK) != 0) {
        return NULL;
    }

    /* mallopt was added in API 26. Resolve it without a load-time API 26 import. */
    return (MalloptFunction)dlsym(RTLD_DEFAULT, "mallopt");
}
#endif

JNIEXPORT jboolean JNICALL
Java_com_dsh_neondepth_CompatibilityMode_nativeIsSupported(JNIEnv *env, jclass type) {
    (void)env;
    (void)type;
#if defined(__aarch64__)
    /* This is a side-effect-free eligibility check. The allocator can still reject the option. */
    return supported_mallopt() != NULL ? JNI_TRUE : JNI_FALSE;
#else
    return JNI_FALSE;
#endif
}

JNIEXPORT jboolean JNICALL
Java_com_dsh_neondepth_CompatibilityMode_nativeDisableHeapTagging(JNIEnv *env, jclass type) {
    (void)env;
    (void)type;
#if defined(__aarch64__)
    MalloptFunction configure = supported_mallopt();
    if (configure == NULL) {
        return JNI_FALSE;
    }

    /* Public API 31 option. Disabling is process-wide and requires a new process to undo.
     * https://android.googlesource.com/platform/bionic/+/android-13.0.0_r1/libc/include/malloc.h
     */
    return configure(M_BIONIC_SET_HEAP_TAGGING_LEVEL, M_HEAP_TAGGING_LEVEL_NONE) == 1
        ? JNI_TRUE : JNI_FALSE;
#else
    return JNI_FALSE;
#endif
}
