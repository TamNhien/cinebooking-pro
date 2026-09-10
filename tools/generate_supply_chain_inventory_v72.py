#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
STRATEGY='V72-SUPPLY-CHAIN-INTEGRITY-5'

def sha256(path:Path)->str:
    h=hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''):
            h.update(chunk)
    return h.hexdigest()

def source_commit()->str|None:
    env=os.getenv('GITHUB_SHA') or os.getenv('CI_COMMIT_SHA')
    if env and all(c in '0123456789abcdefABCDEF' for c in env) and 7<=len(env)<=64:
        return env.lower()
    try:
        return subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True,stderr=subprocess.DEVNULL).strip().lower()
    except Exception:
        return None

def maven_dependencies()->list[dict]:
    pom=ROOT/'backend/pom.xml'
    tree=ET.parse(pom)
    root=tree.getroot()
    ns={'m':'http://maven.apache.org/POM/4.0.0'}
    props={}
    props_el=root.find('m:properties',ns)
    if props_el is not None:
        for child in list(props_el):
            key=child.tag.split('}',1)[-1]
            props[key]=(child.text or '').strip()
    def resolve(v:str|None)->str|None:
        if not v:return None
        out=v.strip()
        for _ in range(5):
            if out.startswith('${') and out.endswith('}'):
                out=props.get(out[2:-1],out)
            else:break
        return out
    rows=[]
    deps=root.find('m:dependencies',ns)
    if deps is not None:
        for dep in deps.findall('m:dependency',ns):
            gid=(dep.findtext('m:groupId',default='',namespaces=ns) or '').strip()
            aid=(dep.findtext('m:artifactId',default='',namespaces=ns) or '').strip()
            ver=resolve(dep.findtext('m:version',default='',namespaces=ns))
            scope=(dep.findtext('m:scope',default='compile',namespaces=ns) or 'compile').strip()
            optional=(dep.findtext('m:optional',default='false',namespaces=ns) or 'false').strip().lower()=='true'
            if gid and aid:
                rows.append({'ecosystem':'maven','name':f'{gid}:{aid}','version':ver,'scope':scope,'optional':optional})
    return sorted(rows,key=lambda x:(x['name'],x.get('version') or ''))

def npm_dependencies()->tuple[list[dict],str]:
    lock=ROOT/'frontend/package-lock.json'
    if lock.exists():
        data=json.loads(lock.read_text(encoding='utf-8'))
        rows=[]
        packages=data.get('packages',{})
        for key,pkg in packages.items():
            if not key or key=='' or not key.startswith('node_modules/'):
                continue
            name=pkg.get('name') or key.removeprefix('node_modules/')
            version=pkg.get('version')
            if not name or not version:
                continue
            rows.append({
                'ecosystem':'npm','name':name,'version':str(version),
                'dev':bool(pkg.get('dev',False)),'optional':bool(pkg.get('optional',False)),
                'integrity':pkg.get('integrity')
            })
        return sorted(rows,key=lambda x:(x['name'],x['version'])),'resolved packages from frontend/package-lock.json'
    package=ROOT/'frontend/package.json'
    data=json.loads(package.read_text(encoding='utf-8'))
    rows=[]
    for section,dev in [('dependencies',False),('devDependencies',True)]:
        for name,version in sorted((data.get(section) or {}).items()):
            rows.append({'ecosystem':'npm','name':name,'version':str(version),'dev':dev,'optional':False,'integrity':None})
    return rows,'direct dependencies declared in frontend/package.json (package-lock.json not shipped)'

def main()->int:
    ap=argparse.ArgumentParser(description='Generate CineBooking V72 source dependency inventory without network access.')
    ap.add_argument('--output-dir',default='build/supply-chain-v72')
    args=ap.parse_args()
    out=Path(args.output_dir)
    if not out.is_absolute():out=ROOT/out
    out.mkdir(parents=True,exist_ok=True)
    mvn=maven_dependencies(); npm,npm_coverage=npm_dependencies()
    payload={
        'strategyVersion':STRATEGY,
        'generatedAt':datetime.now(timezone.utc).isoformat(),
        'sourceCommit':source_commit(),
        'inventoryKind':'SOURCE_DEPENDENCY_INVENTORY',
        'coverage':{
            'maven':'direct dependencies declared in backend/pom.xml',
            'npm':npm_coverage
        },
        'counts':{'maven':len(mvn),'npm':len(npm),'total':len(mvn)+len(npm)},
        'components':mvn+npm
    }
    inventory=out/'cinebooking-dependency-inventory-v72.json'
    inventory.write_text(json.dumps(payload,ensure_ascii=False,indent=2,sort_keys=True)+'\n',encoding='utf-8',newline='\n')
    digest=sha256(inventory)
    digest_file=out/'cinebooking-dependency-inventory-v72.json.sha256'
    digest_file.write_text(f'{digest}  {inventory.name}\n',encoding='ascii',newline='\n')
    print(f'V72 dependency inventory: {inventory}')
    print(f'Components: Maven {len(mvn)} + npm {len(npm)} = {len(mvn)+len(npm)}')
    print(f'SHA-256: {digest}')
    return 0

if __name__=='__main__':
    raise SystemExit(main())
