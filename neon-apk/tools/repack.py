"""在没有 Android SDK 的机器上重新打包：沿用已签名安装包里的壳（dex / so / 资源），
替换 assets/index.html 与版本号，再用原证书做 v1（jarsigner）+ v2（本脚本）签名。

用法：
  NEON_SIGNING_PASSWORD=... python3 neon-apk/tools/repack.py \
      --base neon-apk/delivery/霓虹深潜-3.8.3.apk --asset neon-rogue/dist.html \
      --version-name 1.0.0 --version-code 100 --out 霓虹深潜-1.0.0.apk
依赖：JDK（keytool / jarsigner）、pip 包 cryptography。
"""
import argparse
import hashlib
import os
import struct
import subprocess
import tempfile
import zipfile
from pathlib import Path

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.serialization import pkcs12

ROOT = Path(__file__).resolve().parent.parent
KEYSTORE = ROOT / 'neon.keystore'
STORED_ALIGN = 4
NATIVE_ALIGN = 16384


def patch_manifest(data, old_name, new_name, new_code):
    """二进制 AXML：版本名等长替换（UTF-16），版本号改写整型属性值。"""
    old, new = old_name.encode('utf-16-le'), new_name.encode('utf-16-le')
    if len(old) != len(new) or data.count(old) != 1:
        raise RuntimeError('版本名必须等长且在清单里只出现一次')
    data = data.replace(old, new)
    # versionCode 是清单根元素的第一个整型属性：Res_value{size=8,res0=0,type=0x10,data}
    marker = bytes.fromhex('08000010')
    first = data.find(marker)
    if first < 0:
        raise RuntimeError('没找到 versionCode')
    return data[:first + 4] + struct.pack('<I', new_code) + data[first + 8:]


def build_unsigned(base, asset, out, version):
    src = zipfile.ZipFile(base)
    with zipfile.ZipFile(out, 'w') as dst:
        for info in src.infolist():
            if info.filename.startswith('META-INF/'):
                continue
            data = src.read(info.filename)
            if info.filename == 'assets/index.html':
                data = Path(asset).read_bytes()
            elif info.filename == 'AndroidManifest.xml':
                data = patch_manifest(data, *version)
            entry = zipfile.ZipInfo(info.filename, date_time=(1980, 1, 1, 0, 0, 0))
            entry.external_attr = info.external_attr
            native = info.filename.endswith('.so')
            entry.compress_type = zipfile.ZIP_STORED if native or info.compress_type == zipfile.ZIP_STORED else zipfile.ZIP_DEFLATED
            dst.writestr(entry, data, compresslevel=9)


def find_eocd(data):
    at = data.rfind(b'PK\x05\x06')
    if at < 0:
        raise RuntimeError('不是 ZIP')
    return at


def align(source, target):
    """等价于 zipalign -p 4：未压缩条目的数据起点按 4 字节对齐，.so 按 16KB 对齐。"""
    data = Path(source).read_bytes()
    eocd = find_eocd(data)
    count, cd_size, cd_offset = struct.unpack('<HII', data[eocd + 10:eocd + 20])
    out = bytearray()
    central = bytearray()
    at = cd_offset
    for _ in range(count):
        if data[at:at + 4] != b'PK\x01\x02':
            raise RuntimeError('中央目录损坏')
        method, = struct.unpack('<H', data[at + 10:at + 12])
        comp_size, = struct.unpack('<I', data[at + 20:at + 24])
        name_len, extra_len, comment_len = struct.unpack('<HHH', data[at + 28:at + 34])
        local, = struct.unpack('<I', data[at + 42:at + 46])
        name = data[at + 46:at + 46 + name_len]
        record = bytearray(data[at:at + 46 + name_len + extra_len + comment_len])
        l_name, l_extra = struct.unpack('<HH', data[local + 26:local + 30])
        header = bytearray(data[local:local + 30])
        payload = data[local + 30 + l_name + l_extra:local + 30 + l_name + l_extra + comp_size]
        extra = b''
        if method == 0:
            boundary = NATIVE_ALIGN if name.endswith(b'.so') else STORED_ALIGN
            start = len(out) + 30 + l_name
            extra = b'\x00' * ((boundary - start % boundary) % boundary)
        struct.pack_into('<H', header, 28, len(extra))
        flags, = struct.unpack('<H', header[6:8])
        if flags & 8:  # jarsigner 写的是数据描述符：把校验和与长度搬回本地头
            struct.pack_into('<H', header, 6, flags & ~8)
            struct.pack_into('<H', record, 8, flags & ~8)
            header[14:26] = record[16:28]
        struct.pack_into('<I', record, 42, len(out))
        out += header + data[local + 30:local + 30 + l_name] + extra + payload
        central += record
        at += len(record)
    tail = bytearray(data[eocd:])
    struct.pack_into('<II', tail, 12, len(central), len(out))
    Path(target).write_bytes(bytes(out) + bytes(central) + bytes(tail))


def lp(blob):
    return struct.pack('<I', len(blob)) + blob


def chunk_digest(sections):
    digests = []
    for section in sections:
        for start in range(0, len(section), 1 << 20):
            chunk = section[start:start + (1 << 20)]
            digests.append(hashlib.sha256(b'\xa5' + struct.pack('<I', len(chunk)) + chunk).digest())
    return hashlib.sha256(b'\x5a' + struct.pack('<I', len(digests)) + b''.join(digests)).digest()


def sign_v2(source, target, password):
    key, cert, _ = pkcs12.load_key_and_certificates(KEYSTORE.read_bytes(), password.encode())
    data = Path(source).read_bytes()
    eocd = find_eocd(data)
    cd_size, cd_offset = struct.unpack('<II', data[eocd + 12:eocd + 20])
    digest = chunk_digest([data[:cd_offset], data[cd_offset:cd_offset + cd_size], data[eocd:]])
    algorithm = 0x0103  # RSASSA-PKCS1-v1_5 with SHA2-256
    signed = lp(lp(struct.pack('<I', algorithm) + lp(digest))) + \
        lp(lp(cert.public_bytes(serialization.Encoding.DER))) + lp(b'')
    signature = key.sign(signed, padding.PKCS1v15(), hashes.SHA256())
    public = key.public_key().public_bytes(serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo)
    signer = lp(signed) + lp(lp(struct.pack('<I', algorithm) + lp(signature))) + lp(public)
    value = lp(lp(signer))
    pair = struct.pack('<QI', len(value) + 4, 0x7109871a) + value
    size = len(pair) + 8 + 16
    block = struct.pack('<Q', size) + pair + struct.pack('<Q', size) + b'APK Sig Block 42'
    tail = bytearray(data[eocd:])
    struct.pack_into('<I', tail, 16, cd_offset + len(block))
    Path(target).write_bytes(data[:cd_offset] + block + data[cd_offset:cd_offset + cd_size] + bytes(tail))
    return cert.fingerprint(hashes.SHA256()).hex()


def verify_v2(apk):
    """独立复核：重算摘要并用块里的公钥验签。"""
    data = Path(apk).read_bytes()
    eocd = find_eocd(data)
    cd_size, cd_offset = struct.unpack('<II', data[eocd + 12:eocd + 20])
    if data[cd_offset - 16:cd_offset] != b'APK Sig Block 42':
        raise RuntimeError('缺少签名块')
    size, = struct.unpack('<Q', data[cd_offset - 24:cd_offset - 16])
    start = cd_offset - size - 8
    pair_len, pair_id = struct.unpack('<QI', data[start + 8:start + 20])
    value = data[start + 20:start + 8 + 8 + pair_len]
    signer = value[8:]
    signed_len, = struct.unpack('<I', signer[:4])
    signed = signer[4:4 + signed_len]
    rest = signer[4 + signed_len:]
    sig_len, = struct.unpack('<I', rest[12:16])
    signature = rest[16:16 + sig_len]
    public = rest[4 + struct.unpack('<I', rest[:4])[0] + 4:]
    stated = signed[16:48]
    tail = bytearray(data[eocd:])
    struct.pack_into('<I', tail, 16, start)
    actual = chunk_digest([data[:start], data[cd_offset:cd_offset + cd_size], bytes(tail)])
    serialization.load_der_public_key(public).verify(signature, signed, padding.PKCS1v15(), hashes.SHA256())
    return pair_id == 0x7109871a and stated == actual


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--base', required=True)
    parser.add_argument('--asset', required=True)
    parser.add_argument('--out', required=True)
    parser.add_argument('--old-version-name', default='3.8.3')
    parser.add_argument('--version-name', required=True)
    parser.add_argument('--version-code', type=int, required=True)
    args = parser.parse_args()
    password = os.environ.get('NEON_SIGNING_PASSWORD')
    if not password:
        raise SystemExit('请通过环境变量 NEON_SIGNING_PASSWORD 提供签名口令')
    with tempfile.TemporaryDirectory() as work:
        unsigned, v1, aligned = (str(Path(work) / name) for name in ('unsigned.apk', 'v1.apk', 'aligned.apk'))
        build_unsigned(args.base, args.asset, unsigned, (args.old_version_name, args.version_name, args.version_code))
        env = dict(os.environ, NEON_SIGNING_PASSWORD=password)
        env.pop('JAVA_TOOL_OPTIONS', None)
        subprocess.run(['jarsigner', '-keystore', str(KEYSTORE), '-storepass:env', 'NEON_SIGNING_PASSWORD',
                        '-sigalg', 'SHA256withRSA', '-digestalg', 'SHA-256', '-sigfile', 'NEON',
                        '-signedjar', v1, unsigned, 'neon'], check=True, env=env, stdout=subprocess.DEVNULL)
        align(v1, aligned)
        fingerprint = sign_v2(aligned, args.out, password)
    ok = verify_v2(args.out)
    print('v2 复核', '通过' if ok else '失败', '· 证书 SHA-256', fingerprint)
    if not ok:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
