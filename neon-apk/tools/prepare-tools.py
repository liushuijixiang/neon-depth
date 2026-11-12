"""Prepare the pinned Windows Android build tools inside this project's work directory."""
import concurrent.futures
import hashlib
import json
import os
from pathlib import Path
import subprocess
import zipfile

WORK = Path(__file__).resolve().parents[2] / 'work' / 'android'
DOWNLOADS = WORK / 'downloads'
TOOLCHAIN = WORK / 'toolchain'
TOOLS_FILE = WORK / 'tools.json'
REQUIRED = ['java.exe', 'javac.exe', 'keytool.exe', 'jar.exe', 'aapt2.exe',
            'zipalign.exe', 'apksigner.jar', 'd8.jar', 'android.jar']
PACKAGES = [
    {
        'directory': 'jdk',
        'name': 'amazon-corretto-17.0.21.0.11-windows-x64-jdk.zip',
        'url': 'https://corretto.aws/downloads/resources/17.0.21.0.11/amazon-corretto-17.0.21.0.11-windows-x64-jdk.zip',
        'sha256': '59d6514305f6fab3b18955fb17185562f0a0bbf20e1466eda33a5429f3b31618',
    },
    {
        'directory': 'build-tools',
        'name': 'build-tools_r35_windows.zip',
        'url': 'https://dl.google.com/android/repository/build-tools_r35_windows.zip',
        'sha256': '5753c679a1b90bcf6fbc9945a2ce39dfb9e74f1df0831a1e1866ae5b594326f0',
    },
    {
        'directory': 'platform',
        'name': 'platform-33-ext5_r01.zip',
        'url': 'https://dl.google.com/android/repository/platform-33-ext5_r01.zip',
        'sha256': '3d6189a18d0cebd4e518b8728de0e6b940d95c96b57316769dd56ee2d1708d10',
    },
]


def checksum(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def cached_tools():
    if not TOOLS_FILE.exists():
        return False
    try:
        paths = json.loads(TOOLS_FILE.read_text(encoding='utf-8'))
        return all(name in paths and Path(paths[name]).is_file() for name in REQUIRED)
    except (OSError, ValueError, TypeError):
        return False


def prepare(package):
    archive_path = DOWNLOADS / package['name']
    if not archive_path.exists() or checksum(archive_path) != package['sha256']:
        temporary = archive_path.with_suffix('.zip.part')
        with (WORK / (package['directory'] + '-download.log')).open('wb') as log:
            subprocess.run([
                'curl.exe', '--ssl-revoke-best-effort', '-L', '--fail', '--connect-timeout', '25',
                '--max-time', '1200', '-A', 'Mozilla/5.0', '-o', str(temporary), package['url'],
            ], stdout=log, stderr=log, check=True)
        if checksum(temporary) != package['sha256']:
            raise RuntimeError('Checksum mismatch for ' + package['name'])
        temporary.replace(archive_path)
    destination = TOOLCHAIN / package['directory']
    destination.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(archive_path) as archive:
        for entry in archive.infolist():
            if not (destination / entry.filename).resolve().is_relative_to(destination.resolve()):
                raise RuntimeError('Unsafe path in ' + package['name'])
        archive.extractall(destination)
    return package['name']


def main():
    if os.name != 'nt':
        raise RuntimeError('This bootstrap contains the Windows Android toolchain')
    if cached_tools():
        print('Build tools ready at ' + str(TOOLS_FILE))
        return
    DOWNLOADS.mkdir(parents=True, exist_ok=True)
    TOOLCHAIN.mkdir(parents=True, exist_ok=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        for package in executor.map(prepare, PACKAGES):
            print('Prepared ' + package)
    paths = {}
    for name in REQUIRED:
        matches = list(TOOLCHAIN.rglob(name))
        if len(matches) != 1:
            raise RuntimeError('Expected exactly one ' + name + ' in the isolated toolchain')
        paths[name] = str(matches[0])
    TOOLS_FILE.write_text(json.dumps(paths, indent=2), encoding='utf-8')
    print('Build tools ready at ' + str(TOOLS_FILE))


if __name__ == '__main__':
    main()
