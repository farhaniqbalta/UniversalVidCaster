"""Type-check the official SDK with iOS app-extension restrictions enabled.

Usage: python3 check_extension_api.py /path/to/extracted/official/sdk
Downloads and SDK binaries are deliberately kept outside the repository.
"""
import os
from pathlib import Path
import subprocess
import sys
import tempfile

if len(sys.argv) != 2:
    sys.exit(__doc__)
frameworks = list(Path(sys.argv[1]).glob('**/ios-arm64/GoogleCast.framework'))
if len(frameworks) != 1:
    sys.exit('Expected exactly one ios-arm64/GoogleCast.framework under the SDK directory.')
env = dict(os.environ)
env.setdefault('DEVELOPER_DIR', '/Applications/Xcode.app/Contents/Developer')
sdk = subprocess.check_output(['xcrun', '--sdk', 'iphoneos', '--show-sdk-path'], env=env, text=True).strip()
with tempfile.TemporaryDirectory(prefix='uvc-extension-module-cache-') as cache:
    subprocess.run([
        'xcrun', 'swiftc', '-typecheck', '-application-extension',
        '-target', 'arm64-apple-ios16.0', '-sdk', sdk,
        '-F', str(frameworks[0].parent.resolve()), '-module-cache-path', cache,
        str(Path(__file__).with_name('ExtensionApiProbe.swift')),
    ], env=env, check=True)
print('PASS: selected API imports type-check with app-extension restrictions. Runtime support is unproven.')
