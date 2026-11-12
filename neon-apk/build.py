"""Build the Android wrapper with an existing signing identity and verified tools."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parent
WORK = ROOT.parent / 'work' / 'android'
ANDROID = '{http://schemas.android.com/apk/res/android}'


def digest(path):
    with Path(path).open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def execute(arguments, log_name, env=None):
    arguments = [str(value) for value in arguments]
    if Path(arguments[0]).name in ['aapt2.exe', 'zipalign.exe']:
        # Windows Android native tools require ASCII arguments even when their working directory is Unicode.
        arguments[1:] = [os.path.relpath(value, ROOT) if os.path.isabs(value) else value for value in arguments[1:]]
    result = subprocess.run(arguments, cwd=ROOT,
                            env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    output = result.stdout.decode('utf-8', errors='replace')
    (WORK / (log_name + '.log')).write_text(output, encoding='utf-8')
    if result.returncode:
        raise RuntimeError(log_name + ' failed with exit ' + str(result.returncode) + '. See its log in work/android.')
    return output


def signing_environment(password_file):
    password = password_file.read_text(encoding='utf-8-sig').rstrip('\r\n')
    if not password:
        raise RuntimeError('Signing password file is empty')
    env = dict(os.environ)
    env['NEON_SIGNING_PASSWORD'] = password
    return env


def signing_identity(tools, password_file, allow_unmatched_key=False):
    original = ROOT / '霓虹深潜.apk'
    keystore = ROOT / 'neon.keystore'
    receipt_file = WORK / 'signing-identity.json'
    inputs = {'keystoreSha256': digest(keystore), 'allowUnmatchedKey': allow_unmatched_key}
    if not allow_unmatched_key:
        inputs['originalApkSha256'] = digest(original)
    if receipt_file.exists():
        receipt = json.loads(receipt_file.read_text(encoding='utf-8'))
        if receipt.get('inputs') == inputs:
            return receipt
    listing = execute([tools['keytool.exe'], '-J-Duser.language=en', '-J-Duser.country=US',
                       '-list', '-v', '-keystore', keystore,
                       '-storepass:env', 'NEON_SIGNING_PASSWORD'], 'keystore-public-identity',
                      signing_environment(password_file))
    aliases = re.findall(r'Alias name:\s*([^\r\n]+)', listing)
    fingerprints = re.findall(r'SHA256:\s*([0-9A-Fa-f:]+)', listing)
    if len(aliases) != 1 or len(fingerprints) != 1 or 'PrivateKeyEntry' not in listing:
        raise RuntimeError('Expected a single private signing key in the supplied keystore')
    key_fingerprint = fingerprints[0].replace(':', '').lower()
    matches_original = None
    if not allow_unmatched_key:
        original_info = execute([tools['java.exe'], '-jar', tools['apksigner.jar'], 'verify',
                                 '--verbose', '--print-certs', '--min-sdk-version', '23', original],
                                'original-apk-signature')
        match = re.search(r'Signer #1 certificate SHA-256 digest:\s*([0-9a-fA-F]+)', original_info)
        if not match or match.group(1).lower() != key_fingerprint:
            raise RuntimeError('The supplied key does not match the original APK signing certificate')
        matches_original = True
    receipt = {'inputs': inputs, 'alias': aliases[0], 'certificateSha256': key_fingerprint,
               'matchesOriginal': matches_original}
    receipt_file.write_text(json.dumps(receipt, indent=2), encoding='utf-8')
    return receipt


def compile_wrapper(tools):
    sources = sorted((ROOT / 'src').rglob('*.java'))
    build = WORK / 'build'
    classes = build / 'classes'
    dex = build / 'dex'
    classes.mkdir(parents=True, exist_ok=True)
    dex.mkdir(parents=True, exist_ok=True)
    receipt_file = build / 'wrapper-compile.json'
    inputs = {'sourceSha256': {str(source.relative_to(ROOT)): digest(source) for source in sources},
              'compiler': tools['javac.exe'], 'platform': tools['android.jar']}
    if receipt_file.exists() and (dex / 'classes.dex').exists():
        receipt = json.loads(receipt_file.read_text(encoding='utf-8'))
        if receipt.get('inputs') == inputs and receipt.get('dexSha256') == digest(dex / 'classes.dex'):
            return receipt
    for directory in [classes, dex]:
        if not directory.resolve().is_relative_to(build.resolve()):
            raise RuntimeError('Build cleanup escaped its workspace')
        shutil.rmtree(directory)
        directory.mkdir()
    execute([tools['javac.exe'], '-encoding', 'UTF-8', '-source', '8', '-target', '8',
             '-bootclasspath', tools['android.jar'], '-d', classes, *sources], 'javac')
    execute([tools['jar.exe'], 'cf', build / 'classes.jar', '-C', classes, '.'], 'jar')
    execute([tools['java.exe'], '-cp', tools['d8.jar'], 'com.android.tools.r8.D8',
             '--lib', tools['android.jar'], '--min-api', '23', '--output', dex,
             build / 'classes.jar'], 'd8')
    javap = Path(tools['java.exe']).with_name('javap.exe')
    methods = execute([javap, '-classpath', classes, '-p', 'com.dsh.neondepth.MainActivity'], 'wrapper-methods')
    for method in ['onPause();', 'onResume();', 'onDestroy();']:
        if method not in methods:
            raise RuntimeError('Missing compiled lifecycle method ' + method)
    receipt = {'inputs': inputs, 'dexSha256': digest(dex / 'classes.dex'),
               'lifecycleMethodsCompiled': True}
    receipt_file.write_text(json.dumps(receipt, indent=2), encoding='utf-8')
    return receipt


def compile_native():
    toolchain_file = WORK / 'ndk-toolchain.json'
    if not toolchain_file.exists():
        raise RuntimeError('Run neon-apk/tools/prepare-ndk.py before building the native compatibility bridge')
    toolchain = json.loads(toolchain_file.read_text(encoding='utf-8'))
    execute(['python', ROOT / 'tools' / 'build-native.py', '--ndk', toolchain['root']], 'native-build')
    receipt = json.loads((WORK / 'native' / 'native-build-receipt.json').read_text(encoding='utf-8'))
    required_abis = {'arm64-v8a', 'armeabi-v7a', 'x86', 'x86_64'}
    if receipt.get('status') != 'complete' or set(receipt.get('libraries', {})) != required_abis:
        raise RuntimeError('The compatibility bridge is missing verified ABI builds')
    for library in receipt['libraries'].values():
        if digest(library['path']) != library['sha256']:
            raise RuntimeError('A native library differs from its build receipt')
    return receipt


def package(tools, password_file, asset, allow_unmatched_key=False):
    identity = signing_identity(tools, password_file, allow_unmatched_key)
    wrapper = compile_wrapper(tools)
    native = compile_native()
    manifest = ET.parse(ROOT / 'AndroidManifest.xml').getroot()
    if manifest.attrib.get('package') != 'com.dsh.neondepth':
        raise RuntimeError('Unexpected package identity')
    if manifest.findall('uses-permission'):
        raise RuntimeError('Unexpected Android permission change')
    version_code = manifest.attrib[ANDROID + 'versionCode']
    version_name = manifest.attrib[ANDROID + 'versionName']
    if not version_code.isdigit() or int(version_code) <= 0 or not version_name:
        raise RuntimeError('Invalid release version')
    content = asset.read_bytes()
    if b'window.__neon =' in content or b'window.NeonAudio' not in content:
        raise RuntimeError('Expected the final release asset with the audio module')
    (ROOT / 'assets' / 'index.html').write_bytes(content)
    build = WORK / 'build'
    execute([tools['aapt2.exe'], 'compile', '--dir', ROOT / 'res', '-o', build / 'res.zip'], 'aapt2-compile')
    execute([tools['aapt2.exe'], 'link', '-o', build / 'base.apk', '-I', tools['android.jar'],
             '--manifest', ROOT / 'AndroidManifest.xml', '-A', ROOT / 'assets',
             '--min-sdk-version', '23', '--target-sdk-version', '33', build / 'res.zip'], 'aapt2-link')
    unsigned = build / 'unsigned.apk'
    shutil.copyfile(build / 'base.apk', unsigned)
    with zipfile.ZipFile(unsigned, 'a', compression=zipfile.ZIP_DEFLATED) as archive:
        archive.write(build / 'dex' / 'classes.dex', 'classes.dex')
        for abi, library in native['libraries'].items():
            archive.write(library['path'], 'lib/' + abi + '/libneoncompat.so')
    aligned = build / 'aligned.apk'
    execute([tools['zipalign.exe'], '-f', '-p', '4', unsigned, aligned], 'zipalign')
    delivery = ROOT / 'delivery'
    delivery.mkdir(exist_ok=True)
    output = build / 'release.apk'
    execute([tools['java.exe'], '-jar', tools['apksigner.jar'], 'sign', '--ks', ROOT / 'neon.keystore',
             '--ks-key-alias', identity['alias'], '--ks-pass', 'env:NEON_SIGNING_PASSWORD',
             '--key-pass', 'env:NEON_SIGNING_PASSWORD', '--v1-signing-enabled', 'true',
             '--v2-signing-enabled', 'true', '--v3-signing-enabled', 'true',
             '--v4-signing-enabled', 'false', '--out', output, aligned], 'apksigner-sign',
            signing_environment(password_file))
    verification = execute([tools['java.exe'], '-jar', tools['apksigner.jar'], 'verify', '--verbose',
                            '--print-certs', '--min-sdk-version', '23', output], 'release-apk-signature')
    for scheme in ['v1 scheme', 'v2 scheme', 'v3 scheme']:
        if not re.search(r'Verified using ' + scheme + r'[^\r\n]*: true', verification):
            raise RuntimeError('Missing APK signature verification for ' + scheme)
    if identity['certificateSha256'] not in verification.lower():
        raise RuntimeError('Release certificate differs from the supplied signing key')
    execute([tools['zipalign.exe'], '-c', '-p', '4', output], 'release-alignment')
    badging = execute([tools['aapt2.exe'], 'dump', 'badging', output], 'release-badging')
    if "name='com.dsh.neondepth'" not in badging or ("versionCode='" + version_code + "'") not in badging or 'uses-permission:' in badging:
        raise RuntimeError('Unexpected built package metadata')
    with zipfile.ZipFile(output) as archive:
        if archive.read('assets/index.html') != content:
            raise RuntimeError('Embedded game asset differs from the selected final release')
        if digest(build / 'dex' / 'classes.dex') != hashlib.sha256(archive.read('classes.dex')).hexdigest():
            raise RuntimeError('Embedded wrapper differs from the compiled wrapper')
        for abi, library in native['libraries'].items():
            if hashlib.sha256(archive.read('lib/' + abi + '/libneoncompat.so')).hexdigest() != library['sha256']:
                raise RuntimeError('Embedded compatibility bridge differs from its verified build')
    final_output = delivery / ('霓虹深潜-' + version_name + '.apk')
    shutil.copyfile(output, final_output)
    receipt = {'apk': str(final_output), 'apkSha256': digest(final_output), 'assetSha256': hashlib.sha256(content).hexdigest(),
               'certificateSha256': identity['certificateSha256'], 'matchesOriginalCertificate': identity['matchesOriginal'],
               'signatureSchemes': ['v1', 'v2', 'v3'], 'aligned': True, 'embeddedAssetMatches': True,
               'package': 'com.dsh.neondepth', 'versionCode': int(version_code), 'versionName': version_name,
               'permissions': [], 'wrapper': wrapper, 'native': native, 'deviceRuntimeTested': False}
    (WORK / 'apk-build-receipt.json').write_text(json.dumps(receipt, ensure_ascii=False, indent=2), encoding='utf-8')
    return receipt


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=['check-signing', 'compile', 'package'])
    parser.add_argument('--tools', type=Path, default=WORK / 'tools.json')
    parser.add_argument('--password-file', type=Path, default=WORK / 'signing-password.txt')
    parser.add_argument('--asset', type=Path)
    parser.add_argument('--allow-unmatched-key', action='store_true',
                        help='Use a developer key without requiring the original APK; cannot update the official app')
    args = parser.parse_args()
    tools = json.loads(args.tools.read_text(encoding='utf-8'))
    if args.action == 'check-signing':
        result = signing_identity(tools, args.password_file, args.allow_unmatched_key)
    elif args.action == 'compile':
        result = {'wrapper': compile_wrapper(tools), 'native': compile_native()}
    else:
        if not args.asset:
            parser.error('package requires --asset with the final release HTML')
        result = package(tools, args.password_file, args.asset.resolve(), args.allow_unmatched_key)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
