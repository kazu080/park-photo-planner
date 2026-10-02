// Solar approximation: NOAA General Solar Position Calculations, geometric altitude.
export const RAD = Math.PI / 180;
export const wrap = n => ((n % 360) + 360) % 360;
export const angleDifference = (a,b) => Math.abs(((a-b+540)%360)-180);
export function solarPosition(date, minutes, lat, lng, timezone=9) {
  const [y,m,d] = date.split('-').map(Number);
  const day = (Date.UTC(y,m-1,d)-Date.UTC(y,0,1))/86400000+1;
  const days = (Date.UTC(y+1,0,1)-Date.UTC(y,0,1))/86400000;
  const g=2*Math.PI/days*(day-1+(minutes/60-12)/24);
  const eq=229.18*(0.000075+0.001868*Math.cos(g)-0.032077*Math.sin(g)-0.014615*Math.cos(2*g)-0.040849*Math.sin(2*g));
  const dec=0.006918-0.399912*Math.cos(g)+0.070257*Math.sin(g)-0.006758*Math.cos(2*g)+0.000907*Math.sin(2*g)-0.002697*Math.cos(3*g)+0.00148*Math.sin(3*g);
  const ha=(((minutes+eq+4*lng-60*timezone)%1440+1440)%1440/4-180)*RAD;
  const p=lat*RAD;
  const altitude=Math.asin(Math.max(-1,Math.min(1,Math.sin(p)*Math.sin(dec)+Math.cos(p)*Math.cos(dec)*Math.cos(ha))))/RAD;
  const azimuth=wrap(Math.atan2(Math.sin(ha),Math.cos(ha)*Math.sin(p)-Math.tan(dec)*Math.cos(p))/RAD+180);
  return {azimuth,altitude};
}
export function distance(a,b) {
 const p1=a[0]*RAD,p2=b[0]*RAD,dp=(b[0]-a[0])*RAD,dl=(b[1]-a[1])*RAD;
 const h=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
 return 6371008.8*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));
}
export function bearing(a,b) {
 const p=a[0]*RAD,q=b[0]*RAD,l=(b[1]-a[1])*RAD;
 return wrap(Math.atan2(Math.sin(l)*Math.cos(q),Math.cos(p)*Math.sin(q)-Math.sin(p)*Math.cos(q)*Math.cos(l))/RAD);
}
export function destination(a,meters,degrees) {
 const p=a[0]*RAD,l=a[1]*RAD,b=degrees*RAD,d=meters/6371008.8;
 const q=Math.asin(Math.sin(p)*Math.cos(d)+Math.cos(p)*Math.sin(d)*Math.cos(b));
 return [q/RAD,((l+Math.atan2(Math.sin(b)*Math.sin(d)*Math.cos(p),Math.cos(d)-Math.sin(p)*Math.sin(q)))/RAD+540)%360-180];
}
export const LIGHTS = {
 front:{label:'順光',color:'#27a68e',short:'カメラ側から光が当たる'},
 oblique:{label:'斜光',color:'#e4ad38',short:'斜め前から光が当たる'},
 side:{label:'サイド光',color:'#6595d2',short:'横から光が当たる'},
 back:{label:'逆光',color:'#e57d67',short:'被写体の後方から光が当たる'},
 night:{label:'太陽が地平線下',color:'#7e8297',short:'直射日光による光判定は対象外'}
};
export function lightFor(cameraBearing, sun) {
 if(sun.altitude<=0) return 'night';
 const delta=angleDifference(cameraBearing,sun.azimuth);
 return delta<=30?'front':delta<75?'oblique':delta<=105?'side':'back';
}
export function sensorDimension(crop,orientation,axis) {
 const width=(orientation==='portrait'?24:36)/crop;
 const height=(orientation==='portrait'?36:24)/crop;
 return axis==='width'?width:height;
}
export function focalLength(meters, size, sensor, occupancy=.8, correction=1) {
 return meters*sensor*occupancy/size*correction;
}
export function distanceForFocal(focal, size, sensor, occupancy=.8, correction=1) {
 return focal*size/(sensor*occupancy*correction);
}
export function distanceRange(range,size,sensor,occupancy,correction) {
 const k=sensor*occupancy/size*correction;
 return [range.min/k,range.max/k];
}
export const COMPOSITIONS={face:{label:'顔アップ',size:.30,axis:'height'},bust:{label:'バストアップ',size:.65,axis:'height'},half:{label:'上半身',size:.95,axis:'height'},full:{label:'全身',size:1.75,axis:'height'},float:{label:'フロート全体',size:8,axis:'width'}};
export const PRESETS={land:{label:'東京ディズニーランド',point:[35.63289,139.88045],zoom:18},sea:{label:'東京ディズニーシー',point:[35.6261912,139.8863250],zoom:18}};
