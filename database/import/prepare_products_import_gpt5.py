from __future__ import annotations
import csv, json, re, unicodedata
from collections import Counter, defaultdict
from decimal import Decimal, InvalidOperation
from pathlib import Path

BASE_DIRECTORY = Path(__file__).resolve().parents[2]
INPUT = BASE_DIRECTORY / 'database/consolidation-produits-avec-images-apres-gpt5.csv'
OUTPUT = BASE_DIRECTORY / 'database/import/products_import_ready_gpt5.csv'
REPORT = BASE_DIRECTORY / 'database/import/products_import_anomalies_gpt5.csv'

COLS=['name','slug','reference','marque','rubrique','categorie','famille','description','url_image1','url_image2','url_image3','url_image4','url_image5','price','colors','stock','weight','badge','is_active','is_featured','is_new','is_bestseller','rating','reviews_count','category_slug','subcategory_slug','care_instructions','origin_country','collection_name','seo_title','seo_description','price_wholesale','wholesale_min_qty','is_available_on_site','has_color_variants','width_cm','depth_cm','height_cm']

def strip_acc(s):
    return ''.join(c for c in unicodedata.normalize('NFKD',str(s or '')) if not unicodedata.combining(c))
def clean(s): return str(s or '').strip()
def slugify(s):
    s=strip_acc(s).lower(); s=re.sub(r'[^a-z0-9]+','-',s); return re.sub(r'-+','-',s).strip('-') or 'produit'
def refkey(s): return re.sub(r'\s+',' ',clean(s)).casefold()
def valid_price(v):
    try:
        d=Decimal(clean(v).replace(',','.'))
        return d if d>=0 else None
    except: return None

def parse_json_list(v):
    try:
        x=json.loads(clean(v) or '[]'); return x if isinstance(x,list) else []
    except: return []

def choose_text(rows, key):
    vals=[clean(r.get(key)) for r in rows if clean(r.get(key))]
    if not vals:return ''
    counts=Counter(vals)
    return sorted(counts, key=lambda v:(counts[v],len(v)), reverse=True)[0]

def choose_price(rows):
    vals=[]
    for r in rows:
        d=valid_price(r.get('price'))
        if d is not None: vals.append(d)
    if not vals:return None
    c=Counter(vals)
    return sorted(c,key=lambda d:(c[d],d), reverse=True)[0]

def dims(size):
    s=clean(size).lower().replace('×','x').replace('*','x')
    nums=re.findall(r'\d+(?:[.,]\d+)?',s)
    nums=[n.replace(',','.') for n in nums]
    if len(nums)>=3:return nums[0],nums[1],nums[2]
    if len(nums)==2:return nums[0],'',nums[1]
    return '','',''

def cats(row):
    text=' '.join([clean(row.get('rubrique')),clean(row.get('categorie')),clean(row.get('famille')),clean(row.get('detected_product_type')),clean(row.get('name'))])
    n=strip_acc(text).lower()
    if 'luminaire' in n or any(k in n for k in ['lustre','lampe','applique','suspension','plafonnier']):
        main='luminaires'
        sub=''
        for keys,slug in [(['applique'],'appliques-murales'),(['lampadaire'],'lampadaires'),(['plafonnier'],'plafonniers'),(['spot'],'spots'),(['ampoule'],'ampoules'),(['lampe a poser','lampe de table'],'lampes-a-poser'),(['suspension','lustre'],'suspensions')]:
            if any(k in n for k in keys):sub=slug;break
        return main,sub
    if 'arts de la table' in n or any(k in n for k in ['assiette','verre','tasse','mug','bol','saladier','couvert','carafe','pichet','plateau','set de table','nappe']):
        main='arts-de-la-table'; sub=''
        for keys,slug in [(['assiette'],'assiettes'),(['verre'],'verres'),(['tasse','mug'],'tasses-et-mugs'),(['bol'],'bols'),(['saladier'],'saladiers'),(['couvert'],'couverts'),(['carafe','pichet'],'carafes-et-pichets'),(['plateau'],'plateaux'),(['set de table'],'sets-de-table'),(['nappe'],'nappes')]:
            if any(k in n for k in keys):sub=slug;break
        return main,sub
    if 'mobilier' in n or any(k in n for k in ['table','chaise','fauteuil','canape','console','buffet','meuble tv','bibliotheque','banc','tabouret','lit','chevet']):
        main='mobilier'; sub=''
        for keys,slug in [(['table basse'],'tables-basses'),(['table d appoint'],'tables-dappoint'),(['table de chevet','chevet'],'tables-de-chevet'),(['chaise'],'chaises'),(['fauteuil'],'fauteuils'),(['canape'],'canapes'),(['console'],'consoles'),(['buffet'],'buffets'),(['meuble tv'],'meubles-tv'),(['bibliotheque'],'bibliotheques'),(['banc'],'bancs'),(['tabouret'],'tabourets'),(['lit','tete de lit'],'lits-et-tetes-de-lit'),(['table'],'tables')]:
            if any(k in n for k in keys):sub=slug;break
        return main,sub
    if 'miroir' in n:return 'miroirs','miroirs-decoratifs'
    if 'art mural' in n or any(k in n for k in ['tableau','cadre','affiche','horloge murale','decoration murale']):
        sub='decorations-murales'
        for k,s in [('tableau','tableaux'),('cadre','cadres'),('affiche','affiches'),('horloge','horloges-murales')]:
            if k in n:sub=s;break
        return 'decoration-murale',sub
    if any(k in n for k in ['fleur','plante','cache-pot','cache pot']):return 'plantes-et-cache-pots','plantes-artificielles'
    if 'vase' in n:return 'objets-decoratifs','vases'
    return 'objets-decoratifs','objets-design'

rows=list(csv.DictReader(INPUT.open(encoding='utf-8-sig',newline='')))
groups=defaultdict(list); anomalies=[]
for i,r in enumerate(rows,2):
    ref=clean(r.get('reference'))
    if not ref:
        anomalies.append({'type':'excluded_missing_reference','reference':'','source_json':r.get('source_json',''),'details':f'ligne {i}'})
        continue
    groups[refkey(ref)].append(r)
out=[]; used_slugs=set()
for key,grp in groups.items():
    ref=choose_text(grp,'reference')
    name=choose_text(grp,'name') or choose_text(grp,'detected_product_type') or choose_text(grp,'categorie') or f'Produit {ref}'
    name=name[:255]
    price=choose_price(grp)
    desc=choose_text(grp,'description')
    rubrique=choose_text(grp,'rubrique'); categorie=choose_text(grp,'categorie'); famille=choose_text(grp,'famille')
    images=[]
    for r in grp:
        for im in parse_json_list(r.get('images')):
            im=clean(im).replace('\\','/')
            im=re.sub(r'^backend/','/',im)
            if im and im not in images: images.append(im)
    colors=[]
    for r in grp:
        for c in parse_json_list(r.get('colors')):
            c=clean(c)
            if c and c not in colors:colors.append(c)
    size=choose_text(grp,'size'); w,d,h=dims(size)
    category_slug,subcategory_slug=cats(grp[0])
    base=slugify(f'{name}-{ref}')[:240]
    slug=base; n=2
    while slug in used_slugs:
        suffix=f'-{n}'; slug=(base[:255-len(suffix)]+suffix); n+=1
    used_slugs.add(slug)
    if len(grp)>1:
        prices=sorted({str(p) for p in [valid_price(r.get('price')) for r in grp] if p is not None})
        anomalies.append({'type':'merged_duplicate_reference','reference':ref,'source_json':' | '.join(sorted({r.get('source_json','') for r in grp})),'details':f'{len(grp)} lignes; prix={prices}; images={len(images)}'})
    if price is None:
        anomalies.append({'type':'missing_price_imported_inactive','reference':ref,'source_json':' | '.join(sorted({r.get('source_json','') for r in grp})),'details':'price=0, is_available_on_site=false'})
    obj={
      'name':name,'slug':slug,'reference':ref[:100],'marque':'','rubrique':rubrique[:120],'categorie':categorie[:120],'famille':famille[:120],'description':desc,
      **{f'url_image{i}':(images[i-1] if len(images)>=i else '') for i in range(1,6)},
      'price':f'{(price or Decimal(0)):.2f}','colors':json.dumps(colors,ensure_ascii=False),'stock':'10000','weight':'','badge':'','is_active':'true','is_featured':'false','is_new':'false','is_bestseller':'false','rating':'0','reviews_count':'0','category_slug':category_slug,'subcategory_slug':subcategory_slug,'care_instructions':'','origin_country':'','collection_name':'','seo_title':name[:255],'seo_description':desc[:300],'price_wholesale':'0','wholesale_min_qty':'1','is_available_on_site':'true' if price is not None and price>0 else 'false','has_color_variants':'false','width_cm':w,'depth_cm':d,'height_cm':h
    }
    out.append(obj)
OUTPUT.parent.mkdir(parents=True,exist_ok=True)
with OUTPUT.open('w',encoding='utf-8-sig',newline='') as f:
    w=csv.DictWriter(f,fieldnames=COLS);w.writeheader();w.writerows(out)
with REPORT.open('w',encoding='utf-8-sig',newline='') as f:
    cols=['type','reference','source_json','details'];w=csv.DictWriter(f,fieldnames=cols);w.writeheader();w.writerows(anomalies)
print('raw',len(rows),'ready',len(out),'excluded missing ref',sum(a['type']=='excluded_missing_reference' for a in anomalies),'merged refs',sum(a['type']=='merged_duplicate_reference' for a in anomalies),'missing price',sum(a['type']=='missing_price_imported_inactive' for a in anomalies),'with image',sum(bool(r['url_image1']) for r in out),'available',sum(r['is_available_on_site']=='true' for r in out))
