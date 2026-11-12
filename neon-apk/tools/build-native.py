"""Build and verify the optional compatibility JNI bridge using an existing NDK."""

import argparse
import hashlib
import json
import os
from pathlib import Path
import platform
import re
import struct
import subprocess
import tempfile


APK_ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = APK_ROOT.parent
SOURCE = APK_ROOT / 'native' / 'compatibility.c'
OUTPUT = PROJECT_ROOT / 'work' / 'android' / 'native'
RECEIPT = OUTPUT / 'native-build-receipt.json'
LIBRARY = 'libneoncompat.so'
TARGET_API = 23
ABIS = {
    'arm64-v8a': {'triple': 'aarch64-linux-android', 'bits': 64, 'machine': 183, 'page': 16384},
    'armeabi-v7a': {'triple': 'armv7a-linux-androideabi', 'bits': 32, 'machine': 40, 'page': 4096},
    'x86': {'triple': 'i686-linux-android', 'bits': 32, 'machine': 3, 'page': 4096},
    'x86_64': {'triple': 'x86_64-linux-android', 'bits': 64, 'machine': 62, 'page': 16384},
}
JNI_EXPORTS = [
    'Java_com_dsh_neondepth_CompatibilityMode_nativeIsSupported',
    'Java_com_dsh_neondepth_CompatibilityMode_nativeDisableHeapTagging',
]


def digest(filename):
    with Path(filename).open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def write_receipt(receipt):
    temporary = RECEIPT.with_suffix('.json.tmp')
    temporary.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    os.replace(temporary, RECEIPT)


def execute(arguments, log_path):
    result = subprocess.run([str(value) for value in arguments], cwd=PROJECT_ROOT,
                            stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    output = result.stdout.decode('utf-8', errors='replace')
    log_path.write_text(output, encoding='utf-8')
    if result.returncode:
        raise RuntimeError(f'{log_path.name} failed with exit {result.returncode}')
    return output


def find_toolchain(ndk):
    hosts = {'Windows': 'windows-x86_64', 'Linux': 'linux-x86_64', 'Darwin': 'darwin-x86_64'}
    host = hosts.get(platform.system())
    if host is None:
        raise RuntimeError(f'Unsupported NDK build host {platform.system()}')
    toolchain = ndk / 'toolchains' / 'llvm' / 'prebuilt' / host
    suffix = '.exe' if os.name == 'nt' else ''
    tools = {name: toolchain / 'bin' / (name + suffix) for name in ['clang', 'ld.lld', 'llvm-readelf']}
    files = {**tools,
             'source.properties': ndk / 'source.properties',
             'malloc.h': toolchain / 'sysroot' / 'usr' / 'include' / 'malloc.h',
             'jni.h': toolchain / 'sysroot' / 'usr' / 'include' / 'jni.h',
             'system_properties.h': toolchain / 'sysroot' / 'usr' / 'include' / 'sys' / 'system_properties.h'}
    for name, filename in files.items():
        if not filename.is_file():
            raise RuntimeError(f'Missing NDK component {name}: {filename}')
    properties = files['source.properties'].read_text(encoding='utf-8')
    revision = re.search(r'^Pkg\.Revision\s*=\s*(.+)$', properties, re.MULTILINE)
    if revision is None:
        raise RuntimeError('NDK source.properties has no Pkg.Revision')
    facts = {'ndk': str(ndk), 'revision': revision.group(1).strip(), 'host': host,
             'files': {name: {'path': str(filename), 'sha256': digest(filename)} for name, filename in files.items()}}
    facts['sha256'] = hashlib.sha256(json.dumps(facts, sort_keys=True).encode('utf-8')).hexdigest()
    return tools, facts


def inspect_elf(filename, specification):
    data = filename.read_bytes()
    if len(data) < 64 or data[:4] != b'\x7fELF' or data[5] != 1 or data[6] != 1:
        raise RuntimeError('Expected a little-endian ELF file')
    bits = {1: 32, 2: 64}.get(data[4])
    if bits != specification['bits']:
        raise RuntimeError(f'Unexpected ELF class {bits}')
    header = struct.unpack_from('<HHIQQQIHHHHHH' if bits == 64 else '<HHIIIIIHHHHHH', data, 16)
    file_type, machine = header[:2]
    ph_offset, ph_size, ph_count = header[4], header[8], header[9]
    expected_size = 56 if bits == 64 else 32
    if file_type != 3 or machine != specification['machine']:
        raise RuntimeError(f'Unexpected ELF type or machine: {file_type}, {machine}')
    if not ph_count or ph_size != expected_size or ph_offset + ph_size * ph_count > len(data):
        raise RuntimeError('Invalid ELF program-header table')
    segments = []
    for index in range(ph_count):
        values = struct.unpack_from('<IIQQQQQQ' if bits == 64 else '<IIIIIIII', data, ph_offset + index * ph_size)
        if bits == 64:
            kind, flags, offset, address, _, file_size, memory_size, alignment = values
        else:
            kind, offset, address, _, file_size, memory_size, flags, alignment = values
        if offset + file_size > len(data) or file_size > memory_size:
            raise RuntimeError('Invalid ELF segment bounds')
        segments.append({'type': kind, 'flags': flags, 'offset': offset, 'address': address,
                         'fileSize': file_size, 'memorySize': memory_size, 'alignment': alignment})
    loads = [segment for segment in segments if segment['type'] == 1]
    if not loads:
        raise RuntimeError('ELF has no loadable segments')
    for segment in loads:
        alignment = segment['alignment']
        if alignment < specification['page'] or alignment & (alignment - 1):
            raise RuntimeError('ELF load alignment is below the ABI requirement')
        if (segment['offset'] - segment['address']) % alignment:
            raise RuntimeError('ELF load offset and address are incongruent')
        if segment['flags'] & 3 == 3:
            raise RuntimeError('ELF has a writable executable load segment')
    stacks = [segment for segment in segments if segment['type'] == 0x6474E551]
    if len(stacks) != 1 or stacks[0]['flags'] & 1:
        raise RuntimeError('ELF must declare a non-executable stack')
    if not any(segment['type'] == 0x6474E552 for segment in segments):
        raise RuntimeError('ELF is missing GNU_RELRO')
    return {'bits': bits, 'machine': machine, 'type': 'ET_DYN', 'loadSegments': loads,
            'minimumLoadAlignment': min(segment['alignment'] for segment in loads),
            'nonExecutableStack': True, 'relro': True}


def inspect_symbols(readelf_output):
    symbols = []
    for line in readelf_output.splitlines():
        match = re.match(r'^\s*\d+:\s+\S+\s+\S+\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)', line)
        if match:
            kind, binding, visibility, section, name = match.groups()
            symbols.append({'name': name.split('@')[0], 'type': kind, 'binding': binding,
                            'visibility': visibility, 'section': section})
    for name in JNI_EXPORTS:
        if not any(symbol['name'] == name and symbol['type'] == 'FUNC' and symbol['binding'] == 'GLOBAL'
                   and symbol['visibility'] == 'DEFAULT' and symbol['section'] != 'UND' for symbol in symbols):
            raise RuntimeError(f'Missing public JNI export {name}')
    imports = sorted({symbol['name'] for symbol in symbols if symbol['section'] == 'UND'})
    if 'mallopt' in imports or 'android_get_device_api_level' in imports:
        raise RuntimeError('JNI library has a direct import newer than the API 23 floor')
    needed = re.findall(r'\(NEEDED\).*?\[([^\]]+)\]', readelf_output)
    if not needed or set(needed) - {'libc.so', 'libdl.so', 'libm.so'}:
        raise RuntimeError(f'Unexpected native dependencies {needed}')
    soname = re.search(r'\(SONAME\).*?\[([^\]]+)\]', readelf_output)
    if soname is None or soname.group(1) != LIBRARY:
        raise RuntimeError('Incorrect native library SONAME')
    if 'TEXTREL' in readelf_output:
        raise RuntimeError('Native library contains text relocations')
    if not re.search(r'\bBIND_NOW\b|\(FLAGS_1\).*\bNOW\b', readelf_output):
        raise RuntimeError('Native library is missing immediate symbol binding')
    return {'jniExports': JNI_EXPORTS, 'undefinedSymbols': imports, 'needed': needed,
            'soname': soname.group(1), 'noDirectMalloptImport': True, 'bindNow': True, 'noTextRelocations': True}


def build(ndk):
    ndk = ndk.resolve(strict=True)
    tools, toolchain = find_toolchain(ndk)
    inputs = {'sourceSha256': digest(SOURCE), 'builderSha256': digest(__file__),
              'toolchainSha256': toolchain['sha256'], 'targetApi': TARGET_API, 'abis': ABIS}
    if RECEIPT.is_file():
        try:
            previous = json.loads(RECEIPT.read_text(encoding='utf-8'))
            if previous.get('status') == 'complete' and previous.get('inputs') == inputs:
                products = previous.get('libraries', {})
                if set(products) == set(ABIS) and all((OUTPUT / abi / LIBRARY).is_file()
                    and digest(OUTPUT / abi / LIBRARY) == products[abi]['sha256'] for abi in ABIS):
                    return previous
        except (OSError, ValueError, KeyError):
            pass

    OUTPUT.mkdir(parents=True, exist_ok=True)
    receipt = {'status': 'building', 'inputs': inputs, 'source': str(SOURCE), 'toolchain': toolchain,
               'libraryName': LIBRARY, 'libraries': {}, 'runtimeVerified': False,
               'support': {'effectiveAbi': 'arm64-v8a', 'minimumRuntimeApi': 31,
                           'isSupportedChecks': ['ABI', 'SDK level', 'mallopt symbol availability'],
                           'activationSuccess': 'mallopt(M_BIONIC_SET_HEAP_TAGGING_LEVEL, M_HEAP_TAGGING_LEVEL_NONE) == 1'}}
    write_receipt(receipt)
    try:
        toolchain['clangVersion'] = execute([tools['clang'], '--version'], OUTPUT / 'clang-version.log').strip()
        toolchain['readelfVersion'] = execute([tools['llvm-readelf'], '--version'], OUTPUT / 'readelf-version.log').strip()
        with tempfile.TemporaryDirectory(prefix='.native-build-', dir=OUTPUT) as temporary:
            stage = Path(temporary).resolve()
            if OUTPUT.resolve() not in stage.parents:
                raise RuntimeError('Native build staging escaped the output directory')
            for abi, specification in ABIS.items():
                candidate = stage / abi / LIBRARY
                candidate.parent.mkdir()
                arguments = [tools['clang'], f'--target={specification["triple"]}{TARGET_API}',
                             '-std=c11', '-O2', '-fPIC', '-fvisibility=hidden', '-ffunction-sections',
                             '-fdata-sections', '-fstack-protector-strong', '-D_FORTIFY_SOURCE=2',
                             '-Wall', '-Wextra', '-Werror', '-shared',
                             os.path.relpath(SOURCE, PROJECT_ROOT), '-o', os.path.relpath(candidate, PROJECT_ROOT),
                             '-Wl,--no-undefined', '-Wl,--gc-sections', '-Wl,--build-id=sha1',
                             f'-Wl,-soname,{LIBRARY}', '-Wl,-z,relro', '-Wl,-z,now', '-Wl,-z,noexecstack',
                             f'-Wl,-z,max-page-size={specification["page"]}',
                             f'-Wl,-z,common-page-size={specification["page"]}', '-ldl']
                execute(arguments, OUTPUT / f'{abi}-compile.log')
                elf = inspect_elf(candidate, specification)
                readelf_arguments = [tools['llvm-readelf'], '--file-header', '--program-headers',
                                     '--dynamic-table', '--dyn-symbols', '--version-info', '--wide',
                                     os.path.relpath(candidate, PROJECT_ROOT)]
                details = execute(readelf_arguments, OUTPUT / f'{abi}-elf.log')
                elf.update(inspect_symbols(details))
                receipt['libraries'][abi] = {'path': str(OUTPUT / abi / LIBRARY), 'sha256': digest(candidate),
                                             'size': candidate.stat().st_size, 'target': specification['triple'] + str(TARGET_API),
                                             'command': [str(value) for value in arguments], 'elf': elf}
            # Publish only after all four candidates have compiled and passed inspection.
            for abi in ABIS:
                destination = OUTPUT / abi / LIBRARY
                destination.parent.mkdir(exist_ok=True)
                os.replace(stage / abi / LIBRARY, destination)
        receipt['status'] = 'complete'
        write_receipt(receipt)
        return receipt
    except Exception as error:
        receipt['status'] = 'failed'
        receipt['error'] = str(error)
        write_receipt(receipt)
        raise


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--ndk', required=True, type=Path, help='Existing Android NDK directory')
    arguments = parser.parse_args()
    receipt = build(arguments.ndk)
    for abi, library in receipt['libraries'].items():
        print(f'{abi} {library["sha256"]}')
    print(f'Receipt {RECEIPT}')


if __name__ == '__main__':
    main()
