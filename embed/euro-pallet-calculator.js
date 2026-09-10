(function(){
  if(!document.getElementById('ep-tbody')) return;
  var D=(window.PALLET_DASH&&window.PALLET_DASH.euro)||{};
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
  var PL=1200,PW=800,PH=144,PW_EMPTY=25;
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
    var el=g('ep-upload-status'); el.textContent=msg||'';
    el.style.color=ok===false?'#b91c1c':(ok?'#047857':'#64748b');
  }

  function layer(pL,pW,cL,cW,tol){
    var aL=Math.floor((pL+tol)/cL),aW=Math.floor((pW+tol)/cW);
    return{ti:aL*aW,aL:aL,aW:aW,cL:cL,cW:cW};
  }

  function calcRow(row){
    var cL=num(row.querySelector('.ep-l').value),cW=num(row.querySelector('.ep-w').value);
    var cH=num(row.querySelector('.ep-h').value),cWt=num(row.querySelector('.ep-wt').value);
    if(cL<=0||cW<=0||cH<=0||cWt<=0)return null;
    var maxH=num(g('ep-max-h').value)||1800,maxW=num(g('ep-max-w').value)||1000;
    var tol=g('ep-overhang').checked?num(g('ep-tolerance').value):0;
    var a=layer(PL,PW,cL,cW,tol),b=layer(PL,PW,cW,cL,tol);
    var best=a.ti>=b.ti?a:b;
    if(best.ti===0)return null;
    var hi=Math.floor((maxH-PH)/cH);if(hi<1)hi=1;
    var total=best.ti*hi;
    var maxByWt=Math.floor((maxW-PW_EMPTY)/cWt);
    if(total>maxByWt){hi=Math.floor(maxByWt/best.ti);if(hi<1)return null;total=best.ti*hi;}
    var stackH=PH+hi*cH,gross=total*cWt+PW_EMPTY;
    var floorUtil=(best.ti*best.cL*best.cW)/(PL*PW)*100;
    return{ti:best.ti,hi:hi,total:total,stackH:stackH,gross:gross,floorUtil:floorUtil,
      name:row.querySelector('.ep-name').value,sku:row.querySelector('.ep-sku').value,cL,cW,cH,cWt};
  }

  function calcAll(){
    g('ep-tbody').querySelectorAll('tr').forEach(function(row){
      var r=calcRow(row);
      var cells=['ep-ti','ep-hi','ep-total','ep-stack','ep-gross','ep-floor'];
      if(r){
        row.querySelector('.ep-ti').textContent=r.ti;
        row.querySelector('.ep-hi').textContent=r.hi;
        row.querySelector('.ep-total').textContent=r.total;
        row.querySelector('.ep-stack').textContent=r.stackH;
        row.querySelector('.ep-gross').textContent=r.gross.toFixed(1);
        row.querySelector('.ep-floor').textContent=r.floorUtil.toFixed(1)+'%';
      }else cells.forEach(function(c){row.querySelector('.'+c).textContent='';});
    });
  }

  function addRow(d){
    var defaults={name:cfg('ex1_name','Example: Ambient Carton 400×300'),sku:cfg('ex1_sku','EXAMPLE-CARTON-A'),l:cfg('ex1_l','400'),w:cfg('ex1_w','300'),h:cfg('ex1_h','250'),wt:cfg('ex1_wt','8.5')};
    d=d||{};
    var row={};
    Object.keys(defaults).forEach(function(k){
      var v=d[k];
      row[k]=(v===undefined||v===null||v==='-')?defaults[k]:v;
    });
    var tr=document.createElement('tr');
    tr.innerHTML='<td><input class="ep-name" value="'+esc(row.name)+'" placeholder="'+esc(t('ph_name','Your product name'))+'"></td><td><input class="ep-sku" value="'+esc(row.sku)+'" placeholder="'+esc(t('ph_sku','Your SKU'))+'"></td>'+
      '<td><input type="number" class="ep-l" value="'+row.l+'" min="1"></td><td><input type="number" class="ep-w" value="'+row.w+'" min="1"></td>'+
      '<td><input type="number" class="ep-h" value="'+row.h+'" min="1"></td><td><input type="number" class="ep-wt" value="'+row.wt+'" min="0.1" step="0.1"></td>'+
      '<td class="out ep-ti"></td><td class="out ep-hi"></td><td class="out ep-total"></td>'+
      '<td class="out ep-stack"></td><td class="out ep-gross"></td><td class="out ep-floor"></td>'+
      '<td><button type="button" class="fmcg-btn-danger ep-remove">✕</button></td>';
    g('ep-tbody').appendChild(tr);
    tr.querySelector('.ep-remove').onclick=function(){tr.remove();calcAll();};
    tr.querySelectorAll('input').forEach(function(i){i.addEventListener('input',calcAll);});
    calcAll();
  }

  function downloadCSV(){
    var rows=[[t('mc_th_name','Product Name'),t('mc_th_sku','SKU'),t('ep_th_l','Length mm'),t('ep_th_w','Width mm'),t('ep_th_h','Height mm'),t('ep_th_wt','Weight kg'),t('ep_th_ti','TI'),t('ep_th_hi','HI'),t('ep_th_total','Total Cases'),t('ep_th_stack','Stack Height mm'),t('ep_th_gross','Gross Weight kg'),t('ep_th_floor','Floor Utilisation %')]];
    g('ep-tbody').querySelectorAll('tr').forEach(function(tr){
      var r=calcRow(tr);if(!r)return;
      rows.push([r.name,r.sku,r.cL,r.cW,r.cH,r.cWt,r.ti,r.hi,r.total,r.stackH,r.gross.toFixed(1),r.floorUtil.toFixed(1)]);
    });
    downloadFile('euro-pallet-configurator-'+new Date().toISOString().slice(0,10)+'.csv', rows);
  }
  function downloadTemplate(){
    downloadFile('euro-pallet-configurator-example-upload.csv', [
      [t('mc_th_name','Product Name'),t('mc_th_sku','SKU'),t('ep_th_l','Length mm'),t('ep_th_w','Width mm'),t('ep_th_h','Height mm'),t('ep_th_wt','Weight kg')],
      [cfg('ex1_name','Example: Ambient Carton 400×300'),cfg('ex1_sku','EXAMPLE-CARTON-A'),cfg('ex1_l','400'),cfg('ex1_w','300'),cfg('ex1_h','250'),cfg('ex1_wt','8.5')]
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
        l:['length mm','length','l','länge (mm)','longueur (mm)','largo (mm)',t('ep_th_l','').toLowerCase()],
        w:['width mm','width','w','breite (mm)','largeur (mm)','ancho (mm)',t('ep_th_w','').toLowerCase()],
        h:['height mm','height','h','höhe (mm)','hauteur (mm)','alto (mm)',t('ep_th_h','').toLowerCase()],
        wt:['weight kg','weight','wt','gewicht (kg)','poids (kg)','peso (kg)',t('ep_th_wt','').toLowerCase()]
      });
      var start=map.sku!==undefined||map.name!==undefined?1:0;
      if(start===1&&map.l===undefined){ setStatus(t('status_bad_template','Use this tool’s example CSV so the column headings match.'), false); return; }
      var items=[], i;
      for(i=start;i<grid.length;i++){
        var r=grid[i];
        var name=cellAt(r,map,'name')||(start?'':String(r[0]||'').trim());
        var sku=cellAt(r,map,'sku')||(start?'':String(r[1]||'').trim());
        var l=cellAt(r,map,'l')||(start?'':String(r[2]||'').trim());
        var w=cellAt(r,map,'w')||(start?'':String(r[3]||'').trim());
        var h=cellAt(r,map,'h')||(start?'':String(r[4]||'').trim());
        var wt=cellAt(r,map,'wt')||(start?'':String(r[5]||'').trim());
        if(!name&&!sku&&!l) continue;
        items.push({name:name,sku:sku,l:l||'400',w:w||'300',h:h||'200',wt:wt||'6'});
      }
      if(!items.length){ setStatus(t('status_none','No product rows found. Keep the header row and add SKUs underneath.'), false); return; }
      g('ep-tbody').innerHTML='';
      items.forEach(function(item){ addRow(item); });
      setStatus(t('status_loaded','Loaded {n} product(s) from your CSV. Nothing was sent to our servers.').replace('{n}', String(items.length)), true);
    };
    reader.onerror=function(){ setStatus(t('status_read_fail','Could not read that file. Try the example CSV in UTF-8.'), false); };
    reader.readAsText(file);
  }

  g('ep-add-row').onclick=function(){addRow({name:'',sku:'',l:cfg('ex1_l','400'),w:cfg('ex1_w','300'),h:cfg('ex1_h','200'),wt:cfg('ex1_wt','6')});};
  g('ep-download').onclick=downloadCSV;
  g('ep-template').onclick=downloadTemplate;
  g('ep-upload-btn').onclick=function(){ g('ep-upload').click(); };
  g('ep-upload').addEventListener('change', function(){ uploadCSV(this.files&&this.files[0]); this.value=''; });
  ['ep-max-h','ep-max-w','ep-tolerance','ep-overhang'].forEach(function(id){
    g(id).addEventListener('change',calcAll);g(id).addEventListener('input',calcAll);
  });
  (function applyDash(){
    var el;
    el=g('ep-max-h'); if(el) el.value=cfg('max_h','1800');
    el=g('ep-max-w'); if(el) el.value=cfg('max_w','1000');
    el=g('ep-tolerance'); if(el) el.value=cfg('tolerance','0');
    el=g('ep-overhang'); if(el) el.checked=String(cfg('overhang','0'))==='1';
    var h2=document.querySelector('#fmcg-euro-calc h2'); if(h2&&D.title) h2.textContent=D.title;
    var desc=document.querySelector('#fmcg-euro-calc p.desc'); if(desc&&D.desc) desc.textContent=D.desc;
    var hint=document.querySelector('#fmcg-euro-calc .fmcg-example-hint'); if(hint&&D.hint) hint.textContent=D.hint;
    applyI18n(document.getElementById('fmcg-euro-calc'));
    setPrivacy('#fmcg-euro-calc');
  })();
  if(String(cfg('show_examples','1'))==='0'){
    addRow({name:'',sku:'',l:cfg('ex1_l','400'),w:cfg('ex1_w','300'),h:cfg('ex1_h','200'),wt:cfg('ex1_wt','6')});
  }else{
    addRow();
  }
})();
