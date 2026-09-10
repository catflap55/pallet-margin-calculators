(function(){
  if(!document.getElementById('mc-tbody')) return;
  var D=(window.PALLET_DASH&&window.PALLET_DASH.margin)||{};
  function cfg(k,fb){ if(!Object.prototype.hasOwnProperty.call(D,k)) return fb; var v=D[k]; return (v===undefined||v===null)?fb:v; }
  var UI=(window.PALLET_DASH&&window.PALLET_DASH.ui)||{};
  function t(k,fb){ var v=UI[k]; return (v!=null&&String(v)!=='')?String(v):(fb||''); }
  function applyI18n(root){ (root||document).querySelectorAll('[data-i18n]').forEach(function(el){ var v=t(el.getAttribute('data-i18n'),''); if(v) el.textContent=v; }); }
  function setPrivacy(sel){
    var el=document.querySelector(sel+' .fmcg-privacy-note'); if(!el) return;
    var d=window.PALLET_DASH||{};
    el.textContent='';
    el.appendChild(document.createTextNode(t('privacy_note','Uploads stay in this browser only. We do not store your CSV and we are not liable for it. It lives in cache — clear cache or history and it is gone. Download results CSV first.')+' '));
    var a1=document.createElement('a'); a1.href=d.privacy||'/privacy-policy/'; a1.textContent=t('legal_privacy','Privacy Policy');
    var a2=document.createElement('a'); a2.href=d.terms||'/terms-of-use/'; a2.textContent=t('legal_terms','Terms of Use');
    el.appendChild(a1); el.appendChild(document.createTextNode(' · ')); el.appendChild(a2);
  }
  var symMap={GBP:'\u00A3',EUR:'\u20AC',USD:'$'};
  function sym(){return symMap[document.getElementById('mc-currency').value]||'\u00A3';}
  function g(id){return document.getElementById(id);}
  function num(v){return parseFloat(v)||0;}
  function esc(s){return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/\u003c/g,'&lt;').replace(/\u003e/g,'&gt;');}
  function parseCSV(text){
    text=String(text||'').replace(/^\uFEFF/,'').replace(/\r\n/g,'\n').replace(/\r/g,'\n');
    var rows=[],row=[],cell='',q=false;
    for(var i=0;i<text.length;i++){
      var c=text[i];
      if(q){ if(c==='"'){ if(text[i+1]==='"'){cell+='"';i++;} else q=false; } else cell+=c; }
      else if(c==='"') q=true;
      else if(c===','){ row.push(cell); cell=''; }
      else if(c==='\n'){ row.push(cell); rows.push(row); row=[]; cell=''; }
      else cell+=c;
    }
    row.push(cell);
    if(row.some(function(x){return String(x).trim()!=='';})) rows.push(row);
    return rows.filter(function(r){return r.some(function(x){return String(x).trim()!=='';});});
  }
  function colMap(header, aliases){
    var idx={};
    header.forEach(function(h,i){ idx[String(h).replace(/^\uFEFF/,'').trim().toLowerCase()]=i; });
    var map={};
    Object.keys(aliases).forEach(function(k){
      aliases[k].some(function(a){ if(idx[a]!==undefined){ map[k]=idx[a]; return true; } return false; });
    });
    return map;
  }
  function cellAt(row, map, key){ return map[key]===undefined?'':String(row[map[key]]||'').trim(); }
  function toCSV(rows){ return rows.map(function(r){return r.map(function(c){return'"'+String(c).replace(/"/g,'""')+'"';}).join(',');}).join('\n'); }
  function downloadFile(name, rows){
    var a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([toCSV(rows)],{type:'text/csv;charset=utf-8'}));
    a.download=name; a.click();
  }
  function setStatus(msg, ok){
    var el=g('mc-upload-status'); el.textContent=msg||'';
    el.style.color=ok===false?'#b91c1c':(ok?'#047857':'#64748b');
  }

  function calcRow(row){
    var caseCost=num(row.querySelector('.mc-cost').value);
    var cases=parseInt(row.querySelector('.mc-cases').value,10)||0;
    var target=num(row.querySelector('.mc-target').value);
    var freight=num(g('mc-freight').value);
    var useMargin=g('mc-mode').value==='margin';
    var duty=num(g('mc-duty').value),handling=num(g('mc-handling').value);
    var waste=num(g('mc-waste').value),promo=num(g('mc-promo').value);
    if(cases<=0)return null;
    var freightPerCase=freight/cases,dutyPerCase=caseCost*(duty/100);
    var landed=caseCost+freightPerCase+dutyPerCase+handling;
    var adj=waste>0?landed/(1-waste/100):landed;
    var sell=useMargin?(target>=100?0:adj/(1-target/100)):adj*(1+target/100);
    if(useMargin&&target>=100)return null;
    var profit=sell-adj;
    var marginPct=sell>0?(profit/sell*100):0;
    return{landed,adj,sell,profit,profitPallet:profit*cases,revenuePallet:sell*cases,marginPct,
      name:row.querySelector('.mc-name').value,sku:row.querySelector('.mc-sku').value,
      caseCost,cases,target};
  }

  function renderRowOut(row,r){
    var s=sym();
    row.querySelector('.mc-landed').textContent=s+r.landed.toFixed(2);
    row.querySelector('.mc-sell').textContent=s+r.sell.toFixed(2);
    row.querySelector('.mc-profit').textContent=s+r.profit.toFixed(2);
    row.querySelector('.mc-profit-pallet').textContent=s+r.profitPallet.toFixed(2);
    row.querySelector('.mc-margin').textContent=r.marginPct.toFixed(1)+'%';
  }

  function calcAll(){
    g('mc-tbody').querySelectorAll('tr').forEach(function(row){
      var r=calcRow(row);
      if(r)renderRowOut(row,r);
      else{['mc-landed','mc-sell','mc-profit','mc-profit-pallet','mc-margin'].forEach(function(c){
        row.querySelector('.'+c).textContent='';
      });}
    });
  }

  function addRow(data){
    var defaults={name:cfg('ex1_name','Example: Organic Pasta 500g'),sku:cfg('ex1_sku','EXAMPLE-PASTA-500'),cost:cfg('ex1_cost','12.50'),cases:cfg('ex1_cases','48'),target:cfg('ex1_target','30')};
    data=data||{};
    var row={};
    Object.keys(defaults).forEach(function(k){
      var v=data[k];
      row[k]=(v===undefined||v===null||v==='-')?defaults[k]:v;
    });
    var tr=document.createElement('tr');
    tr.innerHTML='<td><input class="mc-name" value="'+esc(row.name)+'" placeholder="'+esc(t('ph_name','Your product name'))+'"></td>'+
      '<td><input class="mc-sku" value="'+esc(row.sku)+'" placeholder="'+esc(t('ph_sku','Your SKU'))+'"></td>'+
      '<td><input type="number" class="mc-cost" value="'+row.cost+'" min="0" step="0.01"></td>'+
      '<td><input type="number" class="mc-cases" value="'+row.cases+'" min="1" step="1"></td>'+
      '<td><input type="number" class="mc-target" value="'+row.target+'" min="0" step="0.1"></td>'+
      '<td class="out mc-landed"></td><td class="out mc-sell"></td><td class="out mc-profit"></td>'+
      '<td class="out mc-profit-pallet"></td><td class="out mc-margin"></td>'+
      '<td><button type="button" class="fmcg-btn-danger mc-remove">✕</button></td>';
    g('mc-tbody').appendChild(tr);
    tr.querySelector('.mc-remove').onclick=function(){tr.remove();calcAll();};
    tr.querySelectorAll('input').forEach(function(inp){inp.addEventListener('input',calcAll);});
    calcAll();
  }

  function downloadCSV(){
    var rows=[[t('mc_th_name','Product Name'),t('mc_th_sku','SKU'),t('csv_mc_cost','Case Cost'),t('csv_mc_cases','Cases Per Pallet'),t('csv_mc_target','Target %'),t('csv_mc_landed','Landed Cost'),t('csv_mc_sell','Selling Price'),t('csv_mc_profit','Profit Per Case'),t('csv_mc_pallet','Profit Per Pallet'),t('mc_th_margin','Margin %'),t('label_currency','Currency')]];
    g('mc-tbody').querySelectorAll('tr').forEach(function(tr){
      var r=calcRow(tr);
      if(!r)return;
      rows.push([r.name,r.sku,r.caseCost,r.cases,r.target,r.landed.toFixed(2),r.sell.toFixed(2),r.profit.toFixed(2),r.profitPallet.toFixed(2),r.marginPct.toFixed(1),g('mc-currency').value]);
    });
    downloadFile('fmcg-margin-calculator-'+new Date().toISOString().slice(0,10)+'.csv', rows);
  }
  function downloadTemplate(){
    downloadFile('fmcg-margin-calculator-example-upload.csv', [
      [t('mc_th_name','Product Name'),t('mc_th_sku','SKU'),t('csv_mc_cost','Case Cost'),t('csv_mc_cases','Cases Per Pallet'),t('csv_mc_target','Target %')],
      [cfg('ex1_name','Example: Organic Pasta 500g'),cfg('ex1_sku','EXAMPLE-PASTA-500'),cfg('ex1_cost','12.50'),cfg('ex1_cases','48'),cfg('ex1_target','30')],
      [cfg('ex2_name','Example: Sparkling Water 12pk'),cfg('ex2_sku','EXAMPLE-WATER-12'),cfg('ex2_cost','8.20'),cfg('ex2_cases','60'),cfg('ex2_target','25')]
    ]);
    setStatus(t('status_downloaded','Example CSV downloaded. Replace the example rows with your SKUs, save, then upload.'), true);
  }
  function loadRows(list){
    g('mc-tbody').innerHTML='';
    list.forEach(function(item){ addRow(item); });
  }
  function uploadCSV(file){
    if(!file)return;
    var reader=new FileReader();
    reader.onload=function(){
      var grid=parseCSV(reader.result);
      if(!grid.length){ setStatus(t('status_empty','That file was empty. Use the example CSV template.'), false); return; }
      var map=colMap(grid[0], {
        name:['product name','name','product','produktname','nom du produit','nombre del producto',t('mc_th_name','').toLowerCase()],
        sku:['sku','product sku','code'],
        cost:['case cost','cost','cost per case','kartonkosten','coût colis','coste caja',t('csv_mc_cost','').toLowerCase()],
        cases:['cases per pallet','cases/pallet','cases','kartons pro palette','colis par palette','cajas por palé',t('csv_mc_cases','').toLowerCase()],
        target:['target %','target','markup %','margin %','ziel %','objectif %','objetivo %',t('csv_mc_target','').toLowerCase()]
      });
      var start=map.sku!==undefined||map.name!==undefined?1:0;
      if(start===1&&map.cost===undefined&&map.cases===undefined){
        setStatus(t('status_bad_template','Use this tool’s example CSV so the column headings match.'), false); return;
      }
      var items=[], i;
      for(i=start;i<grid.length;i++){
        var r=grid[i];
        var name=cellAt(r,map,'name')||(start? '' : String(r[0]||'').trim());
        var sku=cellAt(r,map,'sku')||(start? '' : String(r[1]||'').trim());
        var cost=cellAt(r,map,'cost')||(start? '' : String(r[2]||'').trim());
        var cases=cellAt(r,map,'cases')||(start? '' : String(r[3]||'').trim());
        var target=cellAt(r,map,'target')||(start? '' : String(r[4]||'').trim());
        if(!name&&!sku&&!cost) continue;
        items.push({name:name,sku:sku,cost:cost||'10',cases:cases||'48',target:target||'30'});
      }
      if(!items.length){ setStatus(t('status_none','No product rows found. Keep the header row and add SKUs underneath.'), false); return; }
      loadRows(items);
      setStatus(t('status_loaded','Loaded {n} product(s) from your CSV. Nothing was sent to our servers.').replace('{n}', String(items.length)), true);
    };
    reader.onerror=function(){ setStatus(t('status_read_fail','Could not read that file. Try the example CSV in UTF-8.'), false); };
    reader.readAsText(file);
  }

  g('mc-add-row').onclick=function(){addRow({name:'',sku:'',cost:cfg('ex1_cost','10'),cases:cfg('ex1_cases','48'),target:cfg('ex1_target','30')});};
  g('mc-download').onclick=downloadCSV;
  g('mc-template').onclick=downloadTemplate;
  g('mc-upload-btn').onclick=function(){ g('mc-upload').click(); };
  g('mc-upload').addEventListener('change', function(){ uploadCSV(this.files&&this.files[0]); this.value=''; });
  ['mc-freight','mc-mode','mc-currency','mc-duty','mc-handling','mc-waste','mc-promo'].forEach(function(id){
    g(id).addEventListener('change',calcAll);g(id).addEventListener('input',calcAll);
  });
  (function applyDash(){
    var el;
    el=g('mc-freight'); if(el) el.value=cfg('freight','85');
    el=g('mc-duty'); if(el) el.value=cfg('duty','0');
    el=g('mc-handling'); if(el) el.value=cfg('handling','0');
    el=g('mc-waste'); if(el) el.value=cfg('waste','2');
    el=g('mc-promo'); if(el) el.value=cfg('promo','0');
    el=g('mc-mode'); if(el) el.value=cfg('mode','markup');
    el=g('mc-currency'); if(el) el.value=cfg('currency','GBP');
    var h2=document.querySelector('#fmcg-margin-calc h2'); if(h2&&D.title) h2.textContent=D.title;
    var desc=document.querySelector('#fmcg-margin-calc p.desc'); if(desc&&D.desc) desc.textContent=D.desc;
    var hint=document.querySelector('#fmcg-margin-calc .fmcg-example-hint'); if(hint&&D.hint) hint.textContent=D.hint;
    applyI18n(document.getElementById('fmcg-margin-calc'));
    setPrivacy('#fmcg-margin-calc');
  })();
  if(String(cfg('show_examples','1'))==='0'){
    addRow({name:'',sku:'',cost:cfg('ex1_cost','10'),cases:cfg('ex1_cases','48'),target:cfg('ex1_target','30')});
  }else{
    addRow();
    var ex2=cfg('ex2_name','Example: Sparkling Water 12pk');
    if(ex2) addRow({name:ex2,sku:cfg('ex2_sku','EXAMPLE-WATER-12'),cost:cfg('ex2_cost','8.20'),cases:cfg('ex2_cases','60'),target:cfg('ex2_target','25')});
  }
})();
