import re
p='game.js';s=open(p,encoding='utf8').read()
if 'MENU_V3 ·' in s: raise SystemExit('already')
i=s.index("/* =========================================================\n   MENU_V2")
j=s.index("// 松手时没灌满",i)
s=s[:i]+open('tools/menu3-module.js',encoding='utf8').read()+"\n\n"+s[j:]
s=s.replace("if (typeof menuMarkSeen === 'function') menuMarkSeen('arc');","mnMark('arc');")
s=s.replace("if (typeof menuMarkSeen === 'function') menuMarkSeen('dream');","mnMark('dream');")
m=re.search(r"    var flowbar = flow \? (.*?) : '';\n",s)
assert m, 'flowbar'
s=s[:m.start()]+"    var flowbar = flow ? menuStepper(3, '战备', '<button class=\"m3-chalbtn\" id=\"prepChal\">挑战树 ' + (G.chalSel.length || 0) + '</button>') : '';\n"+s[m.end():]
open(p,'w',encoding='utf8').write(s)
p='index.html';s=open(p,encoding='utf8').read()
i=s.index("/* MENU_V2"); j=s.index("\n",s.index("@media(max-width:360px){.mn-title",i))+1
s=s[:i]+open('tools/menu3.css',encoding='utf8').read()+s[j:]
open(p,'w',encoding='utf8').write(s)
print('menu3 applied')
