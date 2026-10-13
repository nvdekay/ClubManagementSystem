from pathlib import Path
import re, html, base64, json
root=Path(__file__).resolve().parent
text=(root/'GUIDE_BOOK.md').read_text()
manifest=json.loads((root/'images/manifest.json').read_text())
images={i['file']:i for i in manifest['images']}
source_labels={'local-api':'API local · chưa đăng nhập','seeded-local-api':'API local · dữ liệu đã seed','seeded-demo-api':'API demo · dữ liệu MongoDB đã seed'}
def inline(s):
 s=html.escape(s)
 s=re.sub(r'\*\*(.*?)\*\*',r'<strong>\1</strong>',s)
 s=re.sub(r'`(.*?)`',r'<code>\1</code>',s)
 s=re.sub(r'\[([^\]]+)\]\(([^)]+)\)',r'<a href="\2">\1</a>',s)
 return s
parts=[];toc=[];paragraph=[];listing=None;table=[];counter=0

def flush():
 global listing,table
 if paragraph:parts.append('<p>'+inline(' '.join(paragraph))+'</p>');paragraph.clear()
 if listing:parts.append('</'+listing+'>');listing=None
 if table:
  rows=[]
  for n,row in enumerate(table):
   tag='th' if n==0 else 'td'
   rows.append('<tr>'+''.join('<'+tag+'>'+inline(cell.strip())+'</'+tag+'>' for cell in row.strip('|').split('|'))+'</tr>')
  parts.append('<table>'+''.join(rows)+'</table>');table.clear()
for line in text.splitlines():
 if not line.strip():flush();continue
 image=re.fullmatch(r'!\[([^]]+)\]\(([^)]+)\)',line)
 if image:
  flush();alt,file=image.groups();p=root/file
  if not p.exists():raise RuntimeError('Missing '+file)
  counter+=1;data=base64.b64encode(p.read_bytes()).decode();source=source_labels[images[p.name]['source']]
  parts.append(f'<figure><img src="data:image/png;base64,{data}" alt="{html.escape(alt)}"><figcaption><b>Hình {counter}.</b> {html.escape(alt)}<span>{source}</span></figcaption></figure>');continue
 if line.startswith('# '):flush();parts.append('<h1>'+inline(line[2:])+'</h1>');continue
 if line.startswith('### '):flush();parts.append('<h3>'+inline(line[4:])+'</h3>');continue
 if line.startswith('## '):
  flush();label=line[3:];slug='chapter-'+str(len(toc)+1);toc.append((slug,label));parts.append('<h2 id="'+slug+'">'+inline(label)+'</h2>');continue
 if line.startswith('|'):
  if not re.match(r'^\|[\s:|\-]+\|$',line):table.append(line)
  continue
 numbered=re.match(r'^\d+\. (.*)',line)
 bullet=re.match(r'^- (.*)',line)
 if numbered or bullet:
  if paragraph:parts.append('<p>'+inline(' '.join(paragraph))+'</p>');paragraph.clear()
  kind='ol' if numbered else 'ul'
  if listing!=kind:
   if listing:parts.append('</'+listing+'>')
   parts.append('<'+kind+'>');listing=kind
  parts.append('<li>'+inline((numbered or bullet).group(1))+'</li>');continue
 if listing:
  # Markdown indented continuations belong to the previous item.
  if line.startswith('  '):parts[-1]=parts[-1].removesuffix('</li>')+' '+inline(line.strip())+'</li>';continue
  parts.append('</'+listing+'>');listing=None
 paragraph.append(line.strip())
flush()
nav='<nav aria-label="Mục lục">'+''.join('<a href="#'+slug+'">'+html.escape(label)+'</a>' for slug,label in toc if label!='Mục lục')+'</nav>'
css='''
:root{color-scheme:light;--ink:#172c41;--teal:#087b8c;--muted:#566779}*{box-sizing:border-box}body{margin:0;color:var(--ink);background:#eef3f6;font:16px/1.75 -apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif}main{max-width:1160px;margin:40px auto;padding:54px 62px;background:white;border-radius:18px;box-shadow:0 12px 50px #172c4110}h1{font-size:36px;line-height:1.25;border-bottom:5px solid var(--teal);padding-bottom:22px;margin-bottom:22px}h3{font-size:19px;margin-top:30px}h2{font-size:25px;line-height:1.4;color:var(--teal);border-top:1px solid #dde5eb;padding-top:28px;margin-top:46px;scroll-margin-top:20px}p,li{max-width:980px}li{padding:3px 0}code{font:0.9em ui-monospace,monospace;background:#edf5f7;border-radius:4px;padding:2px 5px;overflow-wrap:anywhere}a{color:var(--teal)}nav{display:grid;grid-template-columns:1fr 1fr;gap:8px 25px;border:1px solid #dce7ec;padding:24px;border-radius:14px;background:#f5fafb}nav a{text-decoration:none;font-size:14px}figure{margin:30px 0 44px;border:1px solid #d8e3e9;border-radius:12px;overflow:hidden;background:white}figure img{display:block;width:100%;height:auto}figcaption{padding:12px 16px;font-size:14px;line-height:1.4;background:#f5fafb}figcaption span{display:block;color:var(--muted);font-size:12px;margin-top:5px}table{border-collapse:collapse;width:100%;margin:24px 0;font-size:14px}th,td{border:1px solid #dbe5eb;padding:10px 12px;text-align:left}th{background:#eaf4f7}footer{font-size:12px;color:var(--muted);border-top:1px solid #dbe5eb;margin-top:40px;padding-top:18px}@media(max-width:760px){main{margin:0;padding:26px 20px;border-radius:0}h1{font-size:27px}nav{grid-template-columns:1fr}}@page{size:A4 landscape;margin:12mm 14mm 15mm}@media print{body{background:white;font-size:11.5pt;line-height:1.5}main{max-width:none;margin:0;padding:0;border-radius:0;box-shadow:none}h1{font-size:30pt;padding-top:25mm}h2{break-before:page;margin:0 0 5mm;padding-top:0;border:none;font-size:21pt}p,li{max-width:none}nav{break-after:page;grid-template-columns:1fr 1fr}nav a{font-size:10pt}figure{break-inside:avoid;break-before:page;max-width:100%;margin:0 0 8mm;border-radius:0;border:none;text-align:center}figure img{max-height:153mm;max-width:100%;width:auto;height:auto;margin:auto;border:1px solid #d8e3e9}figcaption{font-size:10pt;padding:3mm;background:white}figcaption span{font-size:8pt}table{font-size:10pt;break-inside:avoid}footer{display:none}a{text-decoration:none}}
'''
body='\n'.join(parts);first=body.find('</h1>')+5;body=body[:first]+'<p class="edition">Hướng dẫn theo vai trò · 13/10/2026 · Có ảnh từ app và dữ liệu seed</p>'+body[first:]
body=re.sub(r'<h2 id="chapter-1">Mục lục</h2>.*?(?=<h2)', '<h2 id="chapter-1">Mục lục</h2>'+nav, body, count=1, flags=re.S)
(root/'GUIDE_BOOK.html').write_text('<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>UCMS — Guide book hướng dẫn sử dụng</title><style>'+css+'</style></head><body><main>'+body+'<footer>UCMS · Hướng dẫn sử dụng · 13/10/2026 · Ảnh nhúng trong file, đọc được khi offline.</footer></main></body></html>')
print(f'Rendered HTML with {counter} embedded screenshots')
