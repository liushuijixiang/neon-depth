"""Install the pinned Android NDK used by the compatibility bridge."""
from pathlib import Path
import hashlib
import json
import shutil
import time
import urllib.request
import zipfile

work = Path(__file__).resolve().parents[2] / 'work' / 'android'
downloads = work / 'downloads'
toolchain = work / 'toolchain'
ndk = toolchain / 'android-ndk-r27c'
archive = downloads / 'android-ndk-r27c-windows.zip'
expected_size = 781511249
expected_sha1 = 'ac5f7762764b1f15341094e148ad4f847d050c38'
url = 'https://dl.google.com/android/repository/android-ndk-r27c-windows.zip'
progress = work / 'ndk-progress.json'
receipt = work / 'ndk-toolchain.json'

def status(state, **values):
    progress.write_text(json.dumps({'state': state, 'updated': time.time(), **values}, indent=2), encoding='utf-8')

def usable():
    host = ndk / 'toolchains/llvm/prebuilt/windows-x86_64'
    return (host / 'bin/clang.exe').is_file() and (host / 'bin/llvm-readelf.exe').is_file() and (host / 'sysroot/usr/include/jni.h').is_file()

downloads.mkdir(parents=True, exist_ok=True)
toolchain.mkdir(parents=True, exist_ok=True)
try:
    if receipt.exists() and usable():
        status('complete', root=str(ndk), reused=True)
        print(json.dumps({'complete': True, 'root': str(ndk), 'reused': True}, ensure_ascii=True))
        raise SystemExit(0)
    if shutil.disk_usage(work).free < 4 * 1024 ** 3:
        raise RuntimeError('The NDK needs at least 4 GiB of free disk space for download and extraction')
    valid_archive = False
    if archive.exists() and archive.stat().st_size == expected_size:
        with archive.open('rb') as stream:
            valid_archive = hashlib.file_digest(stream, 'sha1').hexdigest() == expected_sha1
    if not valid_archive:
        temporary = archive.with_suffix('.zip.part')
        hasher = hashlib.sha1()
        received = 0
        last_update = 0
        request = urllib.request.Request(url, headers={'User-Agent': 'NeonDepth-Android-Build'})
        status('downloading', bytes=0, total=expected_size)
        with urllib.request.urlopen(request, timeout=90) as response, temporary.open('wb') as stream:
            while chunk := response.read(1024 * 1024):
                stream.write(chunk)
                hasher.update(chunk)
                received += len(chunk)
                if time.monotonic() - last_update > 5:
                    status('downloading', bytes=received, total=expected_size)
                    last_update = time.monotonic()
        if received != expected_size or hasher.hexdigest() != expected_sha1:
            raise RuntimeError('NDK download does not match the official repository size and SHA-1')
        temporary.replace(archive)
    status('extracting', archive=str(archive))
    with zipfile.ZipFile(archive) as source:
        for entry in source.infolist():
            resolved = (toolchain / entry.filename).resolve()
            if not resolved.is_relative_to(toolchain.resolve()):
                raise RuntimeError('Unexpected archive member path')
        source.extractall(toolchain)
    if not usable():
        raise RuntimeError('Required NDK compiler or headers were not extracted')
    result = {'root': str(ndk), 'revision': '27.2.12479018', 'url': url, 'archiveSha1': expected_sha1,
              'archiveBytes': expected_size, 'verified': True}
    receipt.write_text(json.dumps(result, indent=2), encoding='utf-8')
    status('complete', **result)
    print(json.dumps(result, ensure_ascii=True))
except Exception as error:
    status('failed', error=str(error))
    raise
