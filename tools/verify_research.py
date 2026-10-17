"""Read-only integrity check for the explicitly imported research snapshot."""

import argparse
import hashlib
import json
import re
from pathlib import Path, PurePosixPath
from urllib.parse import unquote


def safe_file(root, relative):
    path = PurePosixPath(relative)
    if path.is_absolute() or not path.parts or any(p in {'.', '..'} or ':' in p or '\\' in p for p in path.parts):
        raise ValueError(f'Unsafe relative path: {relative}')
    candidate = root
    for part in path.parts:
        candidate = candidate / part
        if candidate.is_symlink() or (hasattr(candidate, 'is_junction') and candidate.is_junction()):
            raise ValueError(f'Linked path rejected: {relative}')
    if not candidate.is_file():
        raise ValueError(f'Missing file: {relative}')
    return candidate


def verify(original_root=None):
    project = Path(__file__).resolve().parents[1]
    directory = project / 'docs/reverse-engineering'
    root = directory / 'source'
    manifest = json.loads((directory / 'provenance.json').read_text(encoding='utf-8'))
    if manifest.get('schema_version') != 1:
        raise ValueError('Unsupported provenance schema')
    failures, checked, links = [], 0, 0
    names = set()
    external = {(r['document'], r['link']) for r in manifest['external_markdown_references']}
    for item in manifest['files']:
        relative = item['path']
        try:
            if relative.lower() in names:
                raise ValueError(f'Duplicate manifest path: {relative}')
            names.add(relative.lower())
            path = safe_file(root, relative)
            content = path.read_bytes()
            if len(content) != item['bytes'] or hashlib.sha256(content).hexdigest() != item['sha256']:
                raise ValueError(f'Snapshot bytes differ: {relative}')
            if original_root:
                original = safe_file(original_root, relative).read_bytes()
                if original != content:
                    raise ValueError(f'Original bytes differ: {relative}')
            checked += 1
            if path.suffix == '.md':
                for original in re.findall(r'\]\(([^)]+)\)', content.decode('utf-8-sig')):
                    link = unquote(original.split('#', 1)[0].strip('<>'))
                    if not link or re.match(r'^[A-Za-z][A-Za-z0-9+.-]*:', link):
                        continue
                    if (relative, original) in external:
                        continue
                    target = (path.parent / link).resolve()
                    if not target.is_relative_to(root.resolve()):
                        raise ValueError(f'Link escapes snapshot in {relative}: {original}')
                    safe_file(root, target.relative_to(root.resolve()).as_posix())
                    links += 1
        except (OSError, UnicodeError, ValueError, KeyError) as error:
            failures.append(str(error))
    expected = {item['path'].lower() for item in manifest['files']}
    actual = {p.relative_to(root).as_posix().lower() for p in root.rglob('*') if p.is_file()}
    if expected != actual:
        failures.append('Snapshot inventory differs from provenance manifest')
    result = {'files_checked': checked, 'local_markdown_links_checked': links,
              'external_references_declared': len(external),
              'original_compared': original_root is not None, 'failures': failures}
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 1 if failures else 0


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--original-root', type=Path, help='Optionally compare the original workspace; never executes its scripts.')
    args = parser.parse_args()
    try:
        raise SystemExit(verify(args.original_root))
    except (OSError, ValueError, KeyError, TypeError) as error:
        print(json.dumps({'failures': [str(error)]}, ensure_ascii=False))
        raise SystemExit(1)
