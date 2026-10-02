import assert from 'node:assert/strict';
import {solarPosition,distance,bearing,destination,angleDifference,lightFor,focalLength,sensorDimension,distanceForFocal,distanceRange,COMPOSITIONS} from './core.mjs';
let checks=0;function near(actual,expected,tolerance){assert.ok(Math.abs(actual-expected)<tolerance,`${actual} ≈ ${expected}`);checks++;}
// NREL SPA reference example, 2003-10-17, 12:30:30 MST, Boulder.
const boulder=solarPosition('2003-10-17',750.5,39.742476,-105.1786,-7);
near(boulder.azimuth,194.34024,1);near(boulder.altitude,39.888378,1);
const tokyo=solarPosition('2026-06-21',720,35.63,139.88);
assert.ok(tokyo.altitude>75&&tokyo.altitude<80);checks++;
assert.ok(solarPosition('2026-06-21',0,35.63,139.88).altitude<0);checks++;
const sun={azimuth:180,altitude:40};
for(const [b,k] of [[180,'front'],[225,'oblique'],[270,'side'],[0,'back'],[150,'front'],[105,'side'],[74,'back']]){assert.equal(lightFor(b,sun),k);checks++;}
assert.equal(lightFor(180,{...sun,altitude:-1}),'night');checks++;
near(angleDifference(359,1),2,.00001);
const origin=[35.63289,139.88045];for(const b of [0,30,90,180,270,359]){const p=destination(origin,100,b);near(distance(origin,p),100,.00001);near(angleDifference(bearing(origin,p),b),0,.00001);}
near(focalLength(10,1.75,36,.8,1),164.57142857,.00001);
near(sensorDimension(1.6,'portrait','height'),22.5,.00001);near(sensorDimension(1,'landscape','height'),24,.00001);near(sensorDimension(1,'landscape','width'),36,.00001);
const lens={min:70,max:200};const range=distanceRange(lens,1.75,36,.8,1);
near(focalLength(range[0],1.75,36,.8,1),70,.00001);near(focalLength(range[1],1.75,36,.8,1),200,.00001);
near(focalLength(10,1.75,36,.8,.9)/focalLength(10,1.75,36,.8,1),.9,.00001);
// The tele-end circle is the maximum distance; all closer positions need less focal length.
const fullRadius=distanceForFocal(200,1.75,36,.8,1);
near(fullRadius,12.15277778,.00001);
near(distanceForFocal(200,1.75,22.5,.8,1),fullRadius*1.6,.00001);
near(distanceForFocal(400,1.75,36,.8,1),fullRadius*2,.00001);
for(const crop of [1,1.6])for(const orientation of ['portrait','landscape'])for(const {size,axis}of Object.values(COMPOSITIONS)){
 const sensor=sensorDimension(crop,orientation,axis),radius=distanceForFocal(200,size,sensor,.8,.9);
 near(focalLength(radius,size,sensor,.8,.9),200,.00001);
 assert.ok(focalLength(radius*.75,size,sensor,.8,.9)<200);checks++;
 const point=destination(origin,radius,135);
 near(distance(origin,point),radius,.00001);
}
near(distanceForFocal(200,1.75,36,.8,.8),fullRadius/ .8,.00001);
near(distanceForFocal(200,1.75,36,.4,1),fullRadius*2,.00001);
console.log(`${checks} calculation checks passed.`);
