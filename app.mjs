import {solarPosition,distance,bearing,destination,angleDifference,lightFor,LIGHTS,focalLength,sensorDimension,distanceForFocal,COMPOSITIONS,PRESETS} from './core.mjs';
const $=id=>document.getElementById(id), KEY='park-photo-planner-v1';
const jpNow=()=>{const t=new Date(Date.now()+9*3600000);return {date:t.toISOString().slice(0,10),minutes:t.getUTCHours()*60+t.getUTCMinutes()};};
const defaults=()=>({version:1,mapStyle:'street',park:'land',subject:[...PRESETS.land.point],camera:destination(PRESETS.land.point,22,210),date:jpNow().date,minutes:840,crop:1,orientation:'portrait',composition:'full',size:1.75,occupancy:80,correction:1,teleFocal:200,preferred:'front',mode:'check'});
function valid(s){return s&&s.version===1&&(s.mapStyle===undefined||['street','photo'].includes(s.mapStyle))&&['land','sea'].includes(s.park)&&[s.subject,s.camera].every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&Math.abs(p[0])<=85&&Math.abs(p[1])<=180)&&typeof s.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s.date)&&new Date(s.date+'T00:00:00Z').toISOString().slice(0,10)===s.date&&+s.date.slice(0,4)>=1900&&+s.date.slice(0,4)<=2100&&Number.isInteger(s.minutes)&&s.minutes>=0&&s.minutes<1440&&[1,1.6].includes(s.crop)&&['portrait','landscape'].includes(s.orientation)&&Object.hasOwn(COMPOSITIONS,s.composition)&&Number.isFinite(s.size)&&s.size>=.05&&s.size<=100&&Number.isFinite(s.occupancy)&&s.occupancy>=10&&s.occupancy<=100&&Number.isFinite(s.correction)&&s.correction>=.5&&s.correction<=1.5&&Number.isFinite(s.teleFocal)&&s.teleFocal>=1&&s.teleFocal<=3000&&['front','oblique','side','back','any'].includes(s.preferred)&&['check','recommend'].includes(s.mode);}
function migrate(saved){
 if(!saved)return saved;
 const {lenses,lensId,all,rangeMin,rangeMax,...clean}=saved;
 return {...clean,mapStyle:clean.mapStyle||'street',teleFocal:clean.teleFocal??rangeMax??200};
}
let state=defaults();try{const saved=migrate(JSON.parse(localStorage.getItem(KEY)));if(valid(saved))state=saved;}catch{}
let pick='subject',toastTimer;
const normalize=p=>[Math.max(-85,Math.min(85,p[0])),((p[1]+180)%360+360)%360-180];
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),4000);}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));$('save-status').textContent='この端末に自動保存';}catch{$('save-status').textContent='保存できません';}}
const map=L.map('map',{zoomControl:true}).setView(state.subject,18);
const baseLayers={
 street:L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'}),
 photo:L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg',{minZoom:14,maxNativeZoom:18,maxZoom:19,attribution:'出典：<a href="https://maps.gsi.go.jp/development/ichiran.html#seamlessphoto" target="_blank" rel="noopener">国土地理院</a>'})
};
let activeBase=null;
for(const [style,layer]of Object.entries(baseLayers)){
 let errors=0;
 layer.on('tileerror',()=>{if(++errors===3)toast(style==='photo'?'航空写真を読み込めません。ネット接続を確認するか、通常地図に切り替えてください。':'地図を読み込めません。ネット接続をご確認ください。計算と数値入力は使えます。');});
 layer.on('tileload',()=>{errors=0;});
}
function applyBaseLayer(){
 if(activeBase!==state.mapStyle){
  if(activeBase)map.removeLayer(baseLayers[activeBase]);
  map.setMinZoom(state.mapStyle==='photo'?14:0);
  baseLayers[state.mapStyle].addTo(map);activeBase=state.mapStyle;
 }
 for(const style of ['street','photo']){$('view-'+style).classList.toggle('active',style===state.mapStyle);$('view-'+style).setAttribute('aria-pressed',style===state.mapStyle);}
 $('photo-note').hidden=state.mapStyle!=='photo';
}
$('view-street').onclick=()=>{state.mapStyle='street';applyBaseLayer();save();};
$('view-photo').onclick=()=>{state.mapStyle='photo';applyBaseLayer();save();};
applyBaseLayer();
const colored=L.layerGroup().addTo(map),recommendations=L.layerGroup().addTo(map),lines=L.layerGroup().addTo(map);
function icon(type){return L.divIcon({className:'',html:`<div class="map-pin ${type==='camera'?'camera-pin':''}">${type==='camera'?'②':'①'}</div>`,iconSize:[30,30],iconAnchor:[15,15]});}
const subject=L.marker(state.subject,{icon:icon('subject'),draggable:true,keyboard:true,title:'① 被写体：ドラッグで移動'}).addTo(map).bindTooltip('被写体',{permanent:true,direction:'right',offset:[13,0],className:'pin-label'});
const camera=L.marker(state.camera,{icon:icon('camera'),draggable:true,keyboard:true,title:'② 撮影位置：ドラッグで移動'}).bindTooltip('撮影位置',{permanent:true,direction:'left',offset:[-13,0],className:'pin-label'});
const sunMarker=L.marker(state.subject,{interactive:false,keyboard:false,icon:L.divIcon({className:'',html:'<div class="sun-pin">☀</div>',iconSize:[32,32],iconAnchor:[16,16]})}).addTo(map);
subject.on('drag',()=>{state.subject=normalize([subject.getLatLng().lat,subject.getLatLng().lng]);update();});camera.on('drag',()=>{state.camera=normalize([camera.getLatLng().lat,camera.getLatLng().lng]);update();});
map.on('click',e=>{const target=state.mode==='recommend'?'subject':pick;state[target]=normalize([e.latlng.lat,e.latlng.lng]);if(state.mode==='check'&&pick==='subject')setPick('camera');update();});
function setPick(value){
 pick=state.mode==='recommend'?'subject':value;
 $('pick-subject').classList.toggle('active',pick==='subject');$('pick-camera').classList.toggle('active',pick==='camera');
 $('pick-subject').setAttribute('aria-pressed',pick==='subject');$('pick-camera').setAttribute('aria-pressed',pick==='camera');
 $('map-hint').textContent=state.mode==='recommend'?'地図をタップ・①をドラッグして円の中心を移動':`地図をタップして${pick==='subject'?'被写体':'撮影位置'}の位置を指定`;
}
$('pick-subject').onclick=()=>setPick('subject');$('pick-camera').onclick=()=>setPick('camera');
const timeText=m=>`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
function syncUI(){applyBaseLayer();for(const k of ['park','date','crop','orientation','composition','size','occupancy','correction','preferred'])$(k).value=state[k];$('tele-focal').value=state.teleFocal;setPick(pick);update();}
function arc(inner,outer,start,end){const points=[];const count=Math.max(2,Math.ceil(Math.abs(end-start)/3));for(let i=0;i<=count;i++)points.push(destination(state.subject,outer,start+(end-start)*i/count));for(let i=count;i>=0;i--)points.push(destination(state.subject,inner,start+(end-start)*i/count));return points;}
function intervals(light){return {front:[[-30,30]],oblique:[[-75,-30],[30,75]],side:[[-105,-75],[75,105]],back:[[105,255]],any:[[0,360]]}[light];}
let recommendationBounds=null;
function circleArc(radius,start,end){
 const points=[],count=Math.max(2,Math.ceil(Math.abs(end-start)/2));
 for(let i=0;i<=count;i++)points.push(destination(state.subject,radius,start+(end-start)*i/count));
 return points;
}
function draw(sun,d){
 colored.clearLayers();recommendations.clearLayers();lines.clearLayers();recommendationBounds=null;
 const planning=state.mode==='recommend';
 const sensor=sensorDimension(state.crop,state.orientation,COMPOSITIONS[state.composition].axis);
 const radius=planning?distanceForFocal(state.teleFocal,state.size,sensor,state.occupancy/100,state.correction):Math.max(25,Math.min(150,d*1.2));
 if(planning){
  const circle=L.circle(state.subject,{radius,color:'#33475b',weight:2,fillColor:'#647d91',fillOpacity:.055,interactive:false,className:'focal-distance-circle'}).addTo(recommendations);
  recommendationBounds=circle.getBounds();
  if(sun.altitude>0&&state.preferred!=='any')for(const [a,b]of intervals(state.preferred)){
   L.polygon(arc(0,radius,a+sun.azimuth,b+sun.azimuth),{stroke:false,fillColor:LIGHTS[state.preferred].color,fillOpacity:.16,interactive:false,className:'preferred-light-sector'}).addTo(recommendations);
  }
  for(const key of ['front','oblique','side','back']){
   if(sun.altitude<=0)break;
   for(const [a,b]of intervals(key))L.polyline(circleArc(radius,a+sun.azimuth,b+sun.azimuth),{color:LIGHTS[key].color,weight:key===state.preferred?7:4,opacity:1,interactive:false,className:'focal-light-arc light-'+key}).addTo(colored);
  }
  const labelPoint=destination(state.subject,radius,0);
  L.marker(labelPoint,{interactive:false,keyboard:false,icon:L.divIcon({className:'focal-circle-label',html:`${state.teleFocal.toLocaleString('ja-JP')}mm <span>· ${formatDistance(radius)}</span>`,iconSize:[150,28],iconAnchor:[75,35]})}).addTo(recommendations);
  const preferred=state.preferred==='any'?'円周の色で光の向きを確認できます。':`${LIGHTS[state.preferred].label}になる方向を、円の内側の色で強調しています。`;
  $('planner-radius').textContent=formatDistance(radius);
  $('planner-focal-caption').textContent=`${state.teleFocal.toLocaleString('ja-JP')}mmで「${COMPOSITIONS[state.composition].label}」を撮れる距離`;
  $('recommend-description').textContent=sun.altitude<=0?'太陽は地平線下です。光の色分けは休止しますが、焦点距離の円はそのまま使えます。':preferred;
 }else if(sun.altitude>0){
  for(const k of ['front','oblique','side','back'])for(const [a,b]of intervals(k))L.polygon(arc(radius*.84,radius,a+sun.azimuth,b+sun.azimuth),{color:LIGHTS[k].color,weight:0,fillOpacity:.25,interactive:false}).addTo(colored);
 }
 if(sun.altitude>0){
  const end=destination(state.subject,Math.max(6,radius*1.22),sun.azimuth);
  L.polyline([state.subject,end],{color:'#d19d39',weight:2,dashArray:'6 7',interactive:false}).addTo(lines);
  sunMarker.setLatLng(end);sunMarker.setOpacity(1);
  if(planning)recommendationBounds.extend(end);
 }else sunMarker.setOpacity(0);
 if(!planning)L.polyline([state.subject,state.camera],{color:'#172e35',weight:2,dashArray:'4 5',interactive:false}).addTo(lines);
}
const formatDistance=d=>d>=1000?`${(d/1000).toFixed(2)} km`:`${d.toFixed(1)} m`;
function fitCircle(){if(recommendationBounds)map.fitBounds(recommendationBounds,{padding:[55,85],maxZoom:19,animate:false});}
function changeMode(mode){state.mode=mode;setPick('subject');update();if(mode==='recommend')fitCircle();}
function compass(sun,cb){const relative=(sun.azimuth-cb)*Math.PI/180;const sx=160+Math.sin(relative)*57,sy=52-Math.cos(relative)*37;const night=sun.altitude<=0;
 $('compass').innerHTML=`<svg viewBox="0 0 320 104" role="img" aria-label="${night?'太陽は地平線下':'被写体を中心に撮影位置と太陽の方向を表示'}"><ellipse cx="160" cy="52" rx="65" ry="38" fill="none" stroke="#ffffff20" stroke-dasharray="3 5"/><line x1="160" y1="52" x2="160" y2="88" stroke="#a9e8d6" stroke-dasharray="3 4"/>${night?'':`<line x1="160" y1="52" x2="${sx}" y2="${sy}" stroke="#efbf68"/><circle cx="${sx}" cy="${sy}" r="9" fill="#efbf68"/>`}<circle cx="160" cy="52" r="5" fill="white"/><text x="160" y="41" text-anchor="middle" fill="#c0d0d1" font-size="10">被写体</text><rect x="153" y="85" width="14" height="10" rx="3" fill="#a9e8d6"/><text x="176" y="94" fill="#a9e8d6" font-size="10">撮影位置</text><text x="12" y="22" fill="#aabcbf" font-size="9">光の方向</text><text x="12" y="92" fill="#aabcbf" font-size="9">${night?'地平線下':'☀ 太陽'}</text></svg>`;}
function update(){
 document.body.dataset.park=state.park;document.body.dataset.mode=state.mode;
 $('park-theme-label').textContent=state.park==='sea'?'TOKYO DISNEYSEA':'TOKYO DISNEYLAND';
 const sun=solarPosition(state.date,state.minutes,...state.subject),d=distance(state.subject,state.camera),cb=bearing(state.subject,state.camera),k=lightFor(cb,sun),light=LIGHTS[k];
 const sensor=sensorDimension(state.crop,state.orientation,COMPOSITIONS[state.composition].axis),f=focalLength(d,state.size,sensor,state.occupancy/100,state.correction),same=d<.1;
 subject.setLatLng(state.subject);
 if(state.mode==='recommend'){camera.closeTooltip();if(map.hasLayer(camera))map.removeLayer(camera);}else {camera.setLatLng(state.camera);if(!map.hasLayer(camera))camera.addTo(map);camera.openTooltip();}
 $('result-card').hidden=state.mode==='recommend';$('tele-field').hidden=state.mode!=='recommend';$('planner-summary').hidden=state.mode!=='recommend';$('pick-camera').hidden=state.mode==='recommend';$('locate').hidden=state.mode==='recommend';$('camera-coordinates').hidden=state.mode==='recommend';
 $('map-title').textContent=state.mode==='recommend'?'焦点距離の円で、立ち位置を。':'撮影ポジションを探そう。';
 $('pick-subject').textContent=state.mode==='recommend'?'① 円の中心（被写体）':'① 被写体';
 for(const button of document.querySelectorAll('[data-focal]')){const active=Number(button.dataset.focal)===state.teleFocal;button.classList.toggle('active',active);button.setAttribute('aria-pressed',active);}
 $('minutes').value=state.minutes;$('time').value=timeText(state.minutes);$('time-label').textContent=timeText(state.minutes);
 $('sun-azimuth').textContent=`方位 ${sun.azimuth.toFixed(1)}°`;$('sun-altitude').textContent=`${sun.altitude.toFixed(1)}°`;$('day-status').textContent=sun.altitude<=0?'太陽は地平線下':sun.altitude>60?'頭上に近い太陽':sun.altitude<10?'低い太陽':'日中';
 $('focal-value').textContent=same?'—':f<10?f.toFixed(1):Math.round(f).toLocaleString('ja-JP');$('equivalent').textContent=state.crop===1.6&&!same?`35mm判換算 約${Math.round(f*1.6)}mm`:'';
 $('distance').textContent=d>=1000?`${(d/1000).toFixed(2)} km`:`${d.toFixed(1)} m`;$('light-angle').textContent=same||k==='night'?'—':`${angleDifference(cb,sun.azimuth).toFixed(0)}°`;
 $('light-badge').textContent=same?'位置を離してください':light.label;$('light-badge').style.color=light.color;$('light-badge').style.background=light.color+'25';
 $('light-description').textContent=same?'被写体と撮影位置が同じです。撮影位置を移動してください。':light.short+(sun.altitude>60?'。頭上の光による顔の影も確認。':'。');
 $('size-label').firstChild.textContent=COMPOSITIONS[state.composition].axis==='width'?'被写体の幅 (m)':'被写体の高さ (m)';$('correction-label').textContent=state.correction.toFixed(2)+'×';
 for(const [key,point] of [['subject',state.subject],['camera',state.camera]]){$(key+'-lat').value=point[0].toFixed(7);$(key+'-lng').value=point[1].toFixed(7);}
 $('mode-check').classList.toggle('active',state.mode==='check');$('mode-recommend').classList.toggle('active',state.mode==='recommend');$('mode-check').setAttribute('aria-pressed',state.mode==='check');$('mode-recommend').setAttribute('aria-pressed',state.mode==='recommend');$('recommend-panel').hidden=state.mode!=='recommend';
 setPick(pick);compass(sun,cb);draw(sun,d);save();
}
for(const k of ['crop','orientation','size','occupancy','correction','preferred','date'])$(k).addEventListener(k==='correction'?'input':'change',()=>{
 const n=['crop','size','occupancy','correction'].includes(k)?Number($(k).value):$(k).value;const next={...state,[k]:n};let isValid=false;try{isValid=valid(next);}catch{}if(!isValid){$(k).value=state[k];toast('入力できる範囲の値・日付を指定してください。');return;}state=next;update();if(state.mode==='recommend'&&['crop','orientation','size','occupancy','correction'].includes(k))fitCircle();
});
$('composition').onchange=()=>{state.composition=$('composition').value;state.size=COMPOSITIONS[state.composition].size;$('size').value=state.size;if(state.composition==='float'){state.orientation='landscape';$('orientation').value=state.orientation;}update();if(state.mode==='recommend')fitCircle();};
$('minutes').oninput=()=>{state.minutes=Number($('minutes').value);update();};$('time').onchange=()=>{if(!$('time').value){$('time').value=timeText(state.minutes);return;}const[h,m]=$('time').value.split(':').map(Number);state.minutes=h*60+m;update();};
$('now').onclick=()=>{Object.assign(state,jpNow());$('date').value=state.date;update();};
function applyFocal(commit){
 const next={...state,teleFocal:Number($('tele-focal').value)};
 if(!$('tele-focal').value||!valid(next)){if(commit){$('tele-focal').value=state.teleFocal;toast('焦点距離は1〜3,000mmで指定してください。');}return;}
 state=next;update();fitCircle();
}
$('tele-focal').oninput=()=>applyFocal(false);$('tele-focal').onchange=()=>applyFocal(true);
for(const button of document.querySelectorAll('[data-focal]'))button.onclick=()=>{state.teleFocal=Number(button.dataset.focal);$('tele-focal').value=state.teleFocal;update();fitCircle();};
for(const key of ['size','occupancy'])$(key).addEventListener('input',()=>{if(!$(key).value)return;const next={...state,[key]:Number($(key).value)};if(valid(next)){state=next;update();if(state.mode==='recommend')fitCircle();}});
$('mode-check').onclick=()=>changeMode('check');$('mode-recommend').onclick=()=>changeMode('recommend');$('fit-recommend').onclick=fitCircle;
$('park').onchange=()=>{state.park=$('park').value;state.subject=[...PRESETS[state.park].point];state.camera=destination(state.subject,22,210);map.setView(state.subject,PRESETS[state.park].zoom);setPick('subject');update();if(state.mode==='recommend')fitCircle();toast('初期表示用の仮位置です。撮りたい位置にピンを移動してください。');};
$('coordinate-form').onsubmit=e=>{e.preventDefault();const next={...state,subject:[+$('subject-lat').value,+$('subject-lng').value],camera:[+$('camera-lat').value,+$('camera-lng').value]};if(!valid(next)){toast('有効な緯度・経度を指定してください。');return;}state=next;update();if(state.mode==='recommend')fitCircle();else map.fitBounds([state.subject,state.camera],{padding:[65,85],maxZoom:19});};
$('locate').onclick=()=>{if(!navigator.geolocation){toast('現在地に対応していません。地図から位置を指定してください。');return;}$('locate').disabled=true;navigator.geolocation.getCurrentPosition(p=>{state.camera=[p.coords.latitude,p.coords.longitude];map.setView(state.camera,18);update();$('locate').disabled=false;toast(`撮影位置を現在地に設定（推定精度 ±${Math.round(p.coords.accuracy)}m）。`);},()=>{$('locate').disabled=false;toast('現在地を取得できません。位置情報の許可・HTTPS接続を確認するか、地図で指定してください。');},{enableHighAccuracy:true,timeout:12000,maximumAge:30000});};
$('export').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='park-photo-settings.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('import').onchange=async()=>{const file=$('import').files[0];if(!file)return;try{if(file.size>100000)throw Error();const next=migrate(JSON.parse(await file.text()));if(!valid(next))throw Error();state={...next,mapStyle:next.mapStyle||'street'};syncUI();if(state.mode==='recommend')fitCircle();else map.setView(state.subject,18);toast('設定を読み込みました。');}catch{toast('このアプリの有効な設定ファイルを選んでください。');}$('import').value='';};
$('reset').onclick=()=>{if(!confirm('位置と撮影設定を初期状態に戻しますか？'))return;state=defaults();syncUI();map.setView(state.subject,18);toast('初期状態に戻しました。');};
$('help').onclick=()=>$('help-dialog').showModal();$('close-help').onclick=()=>$('help-dialog').close();
$('help-dialog').onclick=e=>{if(e.target===$('help-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}};
syncUI();if(state.mode==='recommend')fitCircle();
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
