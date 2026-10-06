#!/usr/bin/env python3
"""Apply the reviewed login patch without overwriting conflicting Codespace work."""
import json
from pathlib import Path
import subprocess
import sys


def git(*args, data=None):
    return subprocess.run(['git', *args], input=data, capture_output=True)


root_result = git('rev-parse', '--show-toplevel')
if root_result.returncode:
    sys.exit('Run this script from inside online-exam-v1.')
root = Path(root_result.stdout.decode().strip())
import os
os.chdir(root)
package = root / 'server/package.json'
if not package.exists() or not (root / 'client/package.json').exists():
    sys.exit('Expected the online-exam-v1 workspace. No files changed.')
metadata = json.loads(package.read_text())
if not isinstance(metadata.get('scripts', {}).get('test'), str):
    sys.exit('Cannot read server test script. No files changed.')
patch_path = Path(__file__).resolve().with_name('login-completion.patch')
parts = patch_path.read_bytes().split(b'diff --git ')[1:]
ready, conflicts, skipped = [], [], []
for part in parts:
    chunk = b'diff --git ' + part
    filename = part.splitlines()[0].decode().split(' b/', 1)[1]
    if git('apply', '--ignore-space-change', '--check', '-', data=chunk).returncode == 0:
        ready.append(chunk)
    elif git('apply', '--ignore-space-change', '--reverse', '--check', '-', data=chunk).returncode == 0:
        skipped.append(filename)
    else:
        conflicts.append(filename)
if conflicts:
    print('STOP: These files differ from the reviewed version. No files changed:')
    print('\n'.join(conflicts))
    print('Send this output and git status --short; do not reset or discard your work.')
    sys.exit(1)
if ready:
    result = git('apply', '--ignore-space-change', '-', data=b''.join(ready))
    if result.returncode:
        sys.exit(result.stderr.decode())
for test in ('tests/authErrors.test.cjs', 'tests/googleAuth.test.cjs'):
    if test not in metadata['scripts']['test'].split():
        metadata['scripts']['test'] += ' ' + test
new = json.dumps(metadata, ensure_ascii=False, indent=2) + '\n'
if package.read_text() != new:
    package.write_text(new)
print(f'Applied {len(ready)} files; {len(skipped)} files were already applied.')
print('Next: npm test -w client')
print('Then: node --test server/tests/googleAuth.test.cjs server/tests/authErrors.test.cjs server/tests/sessionAccess.test.cjs')
print('Then: npm run build -w server && npm run build -w client && npm run lint -w client')
print('This script does not commit, push, reset, or change database data.')
