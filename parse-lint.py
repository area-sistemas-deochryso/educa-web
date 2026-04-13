import re
with open('/tmp/lint.txt','r',encoding='utf-8',errors='ignore') as f:
    lines = f.readlines()
pairs = []
for i,l in enumerate(lines):
    if 'max-lines' in l:
        m = re.search(r'\((\d+)\)', l)
        if not m: continue
        n = int(m.group(1))
        for j in range(i-1,-1,-1):
            if 'educa-web' in lines[j]:
                path = lines[j].strip().split('educa-web')[-1]
                path = path.replace('\\','/').lstrip('/')
                pairs.append((n,path))
                break
pairs.sort()
for n,p in pairs:
    print(f'{n}\t{p}')
