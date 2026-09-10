(function(){
  if(!document.getElementById('re-tbody')) return;
  var D=(window.PALLET_DASH&&window.PALLET_DASH.reverse)||{};
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
  function sym(){return symMap[document.getElementById('re-currency').value]||'\u00A3';}
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
    var el=g('re-upload-status'); el.textContent=msg||'';
    el.style.color=ok===false?'#b91c1c':(ok?'#047857':'#64748b');
  }

  function calcRow(row){
    var shelf=num(row.querySelector('.re-shelf').value);
    var margin=num(row.querySelector('.re-margin').value);
    var units=parseInt(row.querySelector('.re-units').value,10)||1;
    if(shelf<=0||margin>=100)return null;
    var vatOn=g('re-vat').checked,vatRate=num(g('re-vat-rate').value);
    var dist=num(g('re-dist').value),listing=num(g('re-listing').value),mkt=num(g('re-marketing').value);
    var net=vatOn&&vatRate>0?shelf/(1+vatRate/100):shelf;
    var maxUnit=net*(1-margin/100),maxCase=maxUnit*units;
    var afterDist=maxCase-maxCase*(dist/100);
    var afterMkt=afterDist-afterDist*(mkt/100);
    var supplier=Math.max(0,afterMkt-listing);
    return{name:row.querySelector('.re-name').value,sku:row.querySelector('.re-sku').value,
      shelf,margin,units,net,maxUnit,maxCase,supplier};
  }

  function calcAll(){
    g('re-tbody').querySelectorAll('tr').forEach(function(row){
      var r=calcRow(row),s=sym();
      if(r){
        row.querySelector('.re-max-unit').textContent=s+r.maxUnit.toFixed(2);
        row.querySelector('.re-max-case').textContent=s+r.maxCase.toFixed(2);
        row.querySelector('.re-supplier').textContent=s+r.supplier.toFixed(2);
      }else{['re-max-unit','re-max-case','re-supplier'].forEach(function(c){row.querySelector('.'+c).textContent='';});}
    });
  }

  function addRow(d){
    var defaults={name:cfg('ex1_name','Example: Olive Oil 500ml'),sku:cfg('ex1_sku','EXAMPLE-OIL-500'),shelf:cfg('ex1_shelf','2.99'),units:cfg('ex1_units','12'),margin:cfg('ex1_margin',g('re-type').value)};
    d=d||{};
    var row={};
    Object.keys(defaults).forEach(function(k){
      var v=d[k];
      row[k]=(v===undefined||v===null||v==='-')?defaults[k]:v;
    });
    var tr=document.createElement('tr');
    tr.innerHTML='<td><input class="re-name" value="'+esc(row.name)+'" placeholder="'+esc(t('ph_name','Your product name'))+'"></td><td><input class="re-sku" value="'+esc(row.sku)+'" placeholder="'+esc(t('ph_sku','Your SKU'))+'"></td>'+
      '<td><input type="number" class="re-shelf" value="'+row.shelf+'" min="0" step="0.01"></td>'+
      '<td><input type="number" class="re-units" value="'+row.units+'" min="1"></td>'+
      '<td><input type="number" class="re-margin" value="'+row.margin+'" min="0" max="99" step="0.1"></td>'+
      '<td class="out re-max-unit"></td><td class="out re-max-case"></td><td class="out re-supplier"></td>'+
      '<td><button type="button" class="fmcg-btn-danger re-remove">✕</button></td>';
    g('re-tbody').appendChild(tr);
    tr.querySelector('.re-remove').onclick=function(){tr.remove();calcAll();};
    tr.querySelectorAll('input').forEach(function(i){i.addEventListener('input',calcAll);});
    calcAll();
  }

  function downloadCSV(){
    var rows=[[t('mc_th_name','Product Name'),t('mc_th_sku','SKU'),t('csv_re_shelf','Shelf Price'),t('csv_re_units','Units Per Case'),t('csv_re_margin','Retailer Margin %'),'Net '+t('re_th_shelf','Shelf Price'),t('re_th_unit','Max Wholesale Unit'),t('re_th_case','Max Wholesale Case'),t('re_th_sup','Max Supplier Case'),t('label_currency','Currency')]];
    g('re-tbody').querySelectorAll('tr').forEach(function(tr){
      var r=calcRow(tr);if(!r)return;
      rows.push([r.name,r.sku,r.shelf,r.units,r.margin,r.net.toFixed(2),r.maxUnit.toFixed(2),r.maxCase.toFixed(2),r.supplier.toFixed(2),g('re-currency').value]);
    });
    downloadFile('supermarket-margin-reverse-engineer-'+new Date().toISOString().slice(0,10)+'.csv', rows);
  }
  function downloadTemplate(){
    downloadFile('supermarket-margin-reverse-engineer-example-upload.csv', [
      [t('mc_th_name','Product Name'),t('mc_th_sku','SKU'),t('csv_re_shelf','Shelf Price'),t('csv_re_units','Units Per Case'),t('csv_re_margin','Retailer Margin %')],
      [cfg('ex1_name','Example: Olive Oil 500ml'),cfg('ex1_sku','EXAMPLE-OIL-500'),cfg('ex1_shelf','2.99'),cfg('ex1_units','12'),cfg('ex1_margin','25')]
    ]);
    setStatus(t('status_downloaded','Example CSV downloaded. Replace the example row with your SKUs, save, then upload.'), true);
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
        shelf:['shelf price','shelf','rsp','price','regalpreis','prix rayon','precio lineal',t('csv_re_shelf','').toLowerCase()],
        units:['units per case','units/case','units','stück pro karton','unités par colis','unidades por caja',t('csv_re_units','').toLowerCase()],
        margin:['retailer margin %','margin %','margin','händlermarge %','marge distributeur %','margen minorista %',t('csv_re_margin','').toLowerCase()]
      });
      var start=map.sku!==undefined||map.name!==undefined?1:0;
      if(start===1&&map.shelf===undefined){ setStatus(t('status_bad_template','Use this tool’s example CSV so the column headings match.'), false); return; }
      var items=[], i, preset=g('re-type').value;
      for(i=start;i<grid.length;i++){
        var r=grid[i];
        var name=cellAt(r,map,'name')||(start?'':String(r[0]||'').trim());
        var sku=cellAt(r,map,'sku')||(start?'':String(r[1]||'').trim());
        var shelf=cellAt(r,map,'shelf')||(start?'':String(r[2]||'').trim());
        var units=cellAt(r,map,'units')||(start?'':String(r[3]||'').trim());
        var margin=cellAt(r,map,'margin')||(start?'':String(r[4]||'').trim())||preset;
        if(!name&&!sku&&!shelf) continue;
        items.push({name:name,sku:sku,shelf:shelf||'3.50',units:units||'6',margin:margin});
      }
      if(!items.length){ setStatus(t('status_none','No product rows found. Keep the header row and add SKUs underneath.'), false); return; }
      g('re-tbody').innerHTML='';
      items.forEach(function(item){ addRow(item); });
      setStatus(t('status_loaded','Loaded {n} product(s) from your CSV. Nothing was sent to our servers.').replace('{n}', String(items.length)), true);
    };
    reader.onerror=function(){ setStatus(t('status_read_fail','Could not read that file. Try the example CSV in UTF-8.'), false); };
    reader.readAsText(file);
  }

  g('re-type').onchange=function(){g('re-tbody').querySelectorAll('.re-margin').forEach(function(i){i.value=g('re-type').value;});calcAll();};
  g('re-add-row').onclick=function(){addRow({name:'',sku:'',shelf:cfg('ex1_shelf','3.50'),units:cfg('ex1_units','6'),margin:g('re-type').value});};
  g('re-download').onclick=downloadCSV;
  g('re-template').onclick=downloadTemplate;
  g('re-upload-btn').onclick=function(){ g('re-upload').click(); };
  g('re-upload').addEventListener('change', function(){ uploadCSV(this.files&&this.files[0]); this.value=''; });
  ['re-currency','re-vat-rate','re-vat','re-dist','re-listing','re-marketing'].forEach(function(id){
    g(id).addEventListener('change',calcAll);g(id).addEventListener('input',calcAll);
  });
  (function applyDash(){
    var el;
    el=g('re-currency'); if(el) el.value=cfg('currency','GBP');
    el=g('re-type'); if(el) el.value=cfg('type','25');
    el=g('re-vat-rate'); if(el) el.value=cfg('vat_rate','20');
    el=g('re-vat'); if(el) el.checked=String(cfg('vat_on','1'))==='1';
    el=g('re-dist'); if(el) el.value=cfg('dist','0');
    el=g('re-listing'); if(el) el.value=cfg('listing','0');
    el=g('re-marketing'); if(el) el.value=cfg('marketing','0');
    var h2=document.querySelector('#fmcg-reverse-calc h2'); if(h2&&D.title) h2.textContent=D.title;
    var desc=document.querySelector('#fmcg-reverse-calc p.desc'); if(desc&&D.desc) desc.textContent=D.desc;
    var hint=document.querySelector('#fmcg-reverse-calc .fmcg-example-hint'); if(hint&&D.hint) hint.textContent=D.hint;
    applyI18n(document.getElementById('fmcg-reverse-calc'));
    setPrivacy('#fmcg-reverse-calc');
  })();
  if(String(cfg('show_examples','1'))==='0'){
    addRow({name:'',sku:'',shelf:cfg('ex1_shelf','3.50'),units:cfg('ex1_units','6'),margin:g('re-type').value});
  }else{
    addRow();
  }
})();
