p='game.js';s=open(p,encoding='utf8').read()
if 'V21C ·' in s: raise SystemExit('already')
def rep(a,b,cnt=1):
    global s
    n=s.count(a)
    if n!=cnt: raise SystemExit('anchor x%d: %s'%(n,a[:100]))
    s=s.replace(a,b)
mod=open('tools/v21c-module.js',encoding='utf8').read()
anchor="/* =========================================================\n   启动"
rep(anchor,mod+"\n\n"+anchor)
# market chip & ticket tabs replaced
i=s.index("  } else if (mk.tab === 'chip') {\n    if (!mk.chipStat) mk.chipStat = 'atk';")
j=s.index("  } else {\n    html += '<div class=\"cx-h\">仓库义体</div>';",i)
s=s[:i]+"""  } else if (mk.tab === 'chip') {
    html += marketChipTabHTML(mk);
  } else if (mk.tab === 'ticket') {
    html += marketTicketTabHTML();
"""+s[j:]
# ticket detail beautify: items grid
rep("""    html += '<div class="cnode" style="margin-bottom:4px;border-color:' + mq.color + '"><b style="color:' + mq.color + '">' + m.name + '</b><em>' + (SLOT_LABEL[m.slot] || m.slot) + ' · ' + m.des""","""    html += '<div class="cnode tkt-item" style="margin-bottom:4px;border-color:' + mq.color + '"><b style="color:' + mq.color + '">' + m.name + '</b><em>' + (SLOT_LABEL[m.slot] || m.slot) + ' · ' + m.des""")
s=s.replace("'<div class=\"cx-h\" style=\"text-align:left\">券内义体</div><div class=\"treebox\">';","'<div class=\"cx-h\" style=\"text-align:left\">券内义体 · 8 件</div><div class=\"treebox tkt-items\">';",1)
# training chips: socket row + type icons
rep("""  for (var n = 0; n < cap; n++) h += '<div class="tr-entry">芯片槽 ' + (n + 1) + '：' + trainEsc(chips[n] ? chipText(chips[n]) : '空') + '</div>';
  return h + '</div>';""","""  h += '<div class="sockets tr-sock">';
  for (var n = 0; n < cap; n++) { var on = String(n) === String(u.chipIndex); h += chips[n] ? '<div class="sock full' + (on ? ' sel' : '') + '">' + chipIco(chips[n], 'data-tr-pick="chipIndex" data-v="' + n + '"', { on: on }) + '</div>' : (n <= chips.length ? '<button class="sock empty' + (on ? ' sel' : '') + '" data-tr-pick="chipIndex" data-v="' + n + '"><i></i><small>空槽</small></button>' : '<div class="sock empty dim"><i></i><small>空槽</small></div>'); }
  h += '</div><div class="tr-note">选择芯片种类（当前品质预览）</div><div class="chip-grid">';
  CHIPS.forEach(function (c) { var qq = QUALITY[u.chipQuality] || QUALITY.gray; h += chipIco({ stat: c.stat, val: chipRoll(c.stat, c.val, CHIP_MULT[u.chipQuality] || 1, false), color: qq.color, quality: u.chipQuality, affixes: [], grade: qq.name, name: c.name }, 'data-tr-pick="chipId" data-v="' + c.id + '"', { on: c.id === u.chipId }); });
  return h + '</div></div>';""")
# training gear list as 2-col cards
i=s.index("  pool.forEach(function (item) {\n    var on = G.cyber[u.slot] === item.id;\n    h += '<article class=\"tr-entry' + (on ? ' tr-equipped' : '')")
j=s.index("  if (!pool.length) h += '<div class=\"tr-note\">该部位暂无此品质义体",i)
s=s[:i]+"""  h += '<div class="eq-grid">';
  pool.forEach(function (item) {
    var on = G.cyber[u.slot] === item.id, q = QUALITY[item.quality] || QUALITY.gray;
    h += '<button class="eq-card' + (on ? ' on' : '') + '" data-tr-equip="' + trainEsc(item.id) + '"' + (on ? ' disabled' : '') + ' style="--it:' + q.color + '"><b>' + trainEsc(item.name) + '</b><small>' + q.name + ' · ' + q.slots + ' 槽' + (item.active ? ' · 主动「' + trainEsc(item.active.name) + '」' : '') + (on ? ' · 已装配' : '') + '</small><em>' + trainEsc(item.desc) + '</em></button>';
  });
  h += '</div>';
"""+s[j:]
open(p,'w',encoding='utf8').write(s)
p='index.html';s=open(p,encoding='utf8').read()
css='''
/* V21C */
.mchip-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-top:6px}
.mchip{font-family:inherit;padding:8px 6px;text-align:center;color:#eaf6ff;border:1px solid color-mix(in srgb,var(--cq) 45%,transparent);background:linear-gradient(170deg,color-mix(in srgb,var(--cq) 12%,#0a1018),#070b12);border-radius:4px;min-width:0}
.mchip .chipico{width:62px;margin:0 auto 4px;pointer-events:none}.mchip b{display:block;font-size:10px;color:var(--cq)}.mchip small{display:block;font-size:8px;color:#8aa0ad}.mchip span{display:block;font-size:10px;color:#fcee0a;margin-top:3px}
.mchip:disabled{filter:grayscale(.6) brightness(.6)}.mchip:active:not(:disabled){transform:translateY(1px)}
.tkt-h{font-size:11px;letter-spacing:.2em;color:var(--th);text-align:left;margin:12px 0 5px;padding-left:6px;border-left:3px solid var(--th)}
.tkt-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
.tkt{position:relative;font-family:inherit;text-align:left;padding:18px 7px 8px;color:#eaf6ff;border:1px solid color-mix(in srgb,var(--it) 50%,transparent);background:linear-gradient(160deg,color-mix(in srgb,var(--th) 12%,#0a1018),#070b12);border-radius:3px;min-width:0;
  clip-path:polygon(0 0,100% 0,100% 100%,10px 100%,0 calc(100% - 10px))}
.tkt::before{content:"";position:absolute;left:0;right:0;top:12px;border-top:1px dashed color-mix(in srgb,var(--it) 50%,transparent)}
.tkt-q{position:absolute;left:6px;top:2px;font-size:8px;color:var(--it);letter-spacing:.2em}
.tkt b{display:block;font-size:10px;color:#fff}.tkt small{display:block;font-size:8px;color:#8aa0ad;margin:2px 0}
.tkt-dots{display:flex;gap:2px;margin:4px 0}.tkt-dots u{flex:1;height:5px;background:var(--it);opacity:.75}
.tkt-p{font-size:10px;color:#fcee0a}
.tkt-items{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px}.tkt-items .tkt-item{margin:0!important}
.tr-sock .sock.sel{outline:2px solid #fcee0a;outline-offset:2px}.tr-sock button.sock{font-family:inherit;background:none;cursor:pointer}.tr-sock .sock.dim{opacity:.35}
.eq-card.on{outline:1px solid #57ffa8}
'''
s=s.replace('</style>\n</head>',css+'</style>\n</head>'); open(p,'w',encoding='utf8').write(s)
print('v21c applied')
