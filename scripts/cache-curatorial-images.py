"""Refresh verified Cleveland CC0 URLs offline; render never calls the museum API."""
import concurrent.futures
import json
import pathlib
import re
import subprocess

root = pathlib.Path(__file__).resolve().parent.parent
records = json.loads((root / 'data/catalogue/catalogue-records.json').read_text())
ids = {re.search(r'/art/([\d.]+)', r.get('sourceUrl', '')).group(1)
       for r in records if 'clevelandart.org/art/' in r.get('sourceUrl', '')
       and r.get('publicVisibility') and not r.get('communityAuthorityRequired')
       and re.search(r'/art/([\d.]+)', r.get('sourceUrl', ''))}
cache = root / 'data/catalogue/cache/cleveland'
cache.mkdir(exist_ok=True)

def refresh(identifier):
    try:
        response = subprocess.run(['curl', '--fail', '--silent', '--max-time', '15',
            '-A', 'ARED archive image cache (+https://ared.design)',
            'https://openaccess-api.clevelandart.org/api/artworks/?accession_number=' + identifier],
            capture_output=True, check=True)
        rows = json.loads(response.stdout).get('data', [])
        data = next((row for row in rows if row.get('accession_number') == identifier), {})
        url = data.get('images', {}).get('web', {}).get('url')
        if data.get('share_license_status') == 'CC0' and url and url.startswith('https://openaccess-cdn.clevelandart.org/'):
            target = cache / (identifier + '.json')
            temporary = target.with_suffix('.tmp')
            temporary.write_text(json.dumps({'url': url, 'license': 'CC0', 'ar': float(data['images']['web']['width']) / float(data['images']['web']['height'])}))
            temporary.replace(target)
            return 1
    except (subprocess.SubprocessError, ValueError, TypeError, KeyError, ZeroDivisionError, OSError):
        pass  # Retain the previous successful cache when an institution is unavailable.
    return 0

with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    print('Verified Cleveland image URLs refreshed:', sum(pool.map(refresh, ids)), '/', len(ids))
