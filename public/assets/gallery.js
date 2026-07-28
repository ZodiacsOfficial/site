/* Generated from src/shelf/ by scripts/build-shelf.mjs — do not edit directly. */
"use strict";(()=>{var ue=Object.freeze({radius:26,spacing:1.72,height:1.6,maxWidth:1.5,depth:.07,baseY:-.72,plinthHeight:.14,plinthRadius:.66,focusLift:.05,focusOut:.22,neighbourEase:.14}),Ga=(i=ue)=>i.baseY-i.plinthHeight;function wc(i,t=ue){return Math.min(t.height,t.maxWidth/i)}function nu(i=ue){return i.spacing/i.radius}function iu(i,t=ue){if(i===0)return 0;let e=Math.exp(-((Math.abs(i)-1)**2));return t.neighbourEase*Math.sign(i)*e}function Wa(i,t,e=ue){let n=nu(e),s=i-t,r=(s+iu(s,e))*n,a=Math.max(0,1-Math.abs(s)),o=Math.sin(r),c=Math.cos(r),l=e.focusOut*a;return{x:e.radius*o+o*l,y:e.baseY+e.focusLift*a,z:e.radius*c-e.radius+c*l,rotationY:r,prominence:a,distance:s}}function Vn(i,t){return t<=1?0:Math.min(t-1,Math.max(0,i))}function Hs(i,t){return Math.round(Vn(i,t))}function ui(i,t,e,n){return n<=0?i:t+(i-t)*Math.exp(-e*n)}function Ac(i,t){let e=Math.PI*2;return t+Math.round((i-t)/e)*e}function Cc(i,t,e=190){return(Math.abs(i)>Math.abs(t)?i:t)/e}function Rc(i,t){let e=Math.max(320,t||1024);return-i/e*4}function Ic(i,t){let e=String(i||"").replace(/^#/,"").toLowerCase();return e?t.indexOf(e):-1}function Pc(i,t,e=7){return Math.abs(i-t)<=e}var Be=Object.freeze({fov:.5934119456780721,tilt:.1047197551196598,rowMargin:1.12,stageMargin:1.2,zoomGain:.3,stageZ:.9,minWorldHeight:3,maxWorldHeight:7.2});function Lc(i=ue){let t=Ga(i)-.1,e=i.baseY+i.height+.04;return{height:e-t,width:i.maxWidth*1.2,centerY:(e+t)/2,centerZ:0}}function Dc(i,t,e=Be){return{height:i,width:i*t,centerY:0,centerZ:e.stageZ}}var Mn=(i,t,e)=>i+(t-i)*e;function Uc(i,t,e){return{height:Mn(i.height,t.height,e),width:Mn(i.width,t.width,e),centerY:Mn(i.centerY,t.centerY,e),centerZ:Mn(i.centerZ,t.centerZ,e)}}function Nc(i,t,e){return{x:Mn(i.x,t.x,e),y:Mn(i.y,t.y,e),width:Mn(i.width,t.width,e),height:Mn(i.height,t.height,e)}}function Fc(i,t=Be){let{canvasWidth:e,canvasHeight:n,rect:s,content:r,margin:a=1}=i,o=Math.max(1,e),c=Math.max(1,n),l=Math.max(1,s.width),h=Math.max(1,s.height),u=Math.min(t.maxWorldHeight,Math.max(t.minWorldHeight,r.height*a*c/h,r.width*a*c/l)),d=u/c;return{worldHeight:u,distance:u/(2*Math.tan(t.fov/2)),panX:(o/2-(s.x+l/2))*d,panY:(s.y+h/2-c/2)*d}}var hl=0,Po=1,ul=2;var Lo=1,dl=2,en=3,pn=0,Ae=1,nn=2,xn=0,Zn=1,Do=2,Uo=3,No=4,fl=5,In=100,pl=101,ml=102,gl=103,_l=104,xl=200,vl=201,yl=202,Ml=203,ur=204,dr=205,Sl=206,bl=207,El=208,Tl=209,wl=210,Al=211,Cl=212,Rl=213,Il=214,kr=0,Vr=1,Hr=2,Jn=3,Gr=4,Wr=5,Xr=6,qr=7,Fo=0,Pl=1,Ll=2,vn=0,Dl=1,Ul=2,Nl=3,Fl=4,Ol=5,Bl=6,zl=7;var Oo=300,ni=301,ii=302,Yr=303,$r=304,Ps=306,fr=1e3,Rn=1001,pr=1002,ke=1003,kl=1004;var Ls=1005;var qe=1006,Zr=1007;var sn=1008;var Ze=1009,Bo=1010,zo=1011,Bi=1012,Jr=1013,Bn=1014,rn=1015,zi=1016,Kr=1017,Qr=1018,ki=1020,ko=35902,Vo=35899,Ho=1021,Go=1022,Ve=1023,wi=1026,Vi=1027,Wo=1028,jr=1029,Xo=1030,ta=1031;var ea=1033,Ds=33776,Us=33777,Ns=33778,Fs=33779,na=35840,ia=35841,sa=35842,ra=35843,aa=36196,oa=37492,ca=37496,la=37808,ha=37809,ua=37810,da=37811,fa=37812,pa=37813,ma=37814,ga=37815,_a=37816,xa=37817,va=37818,ya=37819,Ma=37820,Sa=37821,ba=36492,Ea=36494,Ta=36495,wa=36283,Aa=36284,Ca=36285,Ra=36286;var is=2300,mr=2301,hr=2302,xo=2400,vo=2401,yo=2402;var Vl=3200,Hl=3201;var qo=0,Gl=1,yn="",ye="srgb",Kn="srgb-linear",ss="linear",te="srgb";var qn=7680;var Mo=519,Wl=512,Xl=513,ql=514,Yo=515,Yl=516,$l=517,Zl=518,Jl=519,So=35044;var $o="300 es",Xe=2e3,rs=2001;var mn=class{addEventListener(t,e){this._listeners===void 0&&(this._listeners={});let n=this._listeners;n[t]===void 0&&(n[t]=[]),n[t].indexOf(e)===-1&&n[t].push(e)}hasEventListener(t,e){let n=this._listeners;return n===void 0?!1:n[t]!==void 0&&n[t].indexOf(e)!==-1}removeEventListener(t,e){let n=this._listeners;if(n===void 0)return;let s=n[t];if(s!==void 0){let r=s.indexOf(e);r!==-1&&s.splice(r,1)}}dispatchEvent(t){let e=this._listeners;if(e===void 0)return;let n=e[t.type];if(n!==void 0){t.target=this;let s=n.slice(0);for(let r=0,a=s.length;r<a;r++)s[r].call(this,t);t.target=null}}},xe=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],Oc=1234567,ji=Math.PI/180,Ai=180/Math.PI;function si(){let i=Math.random()*4294967295|0,t=Math.random()*4294967295|0,e=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(xe[i&255]+xe[i>>8&255]+xe[i>>16&255]+xe[i>>24&255]+"-"+xe[t&255]+xe[t>>8&255]+"-"+xe[t>>16&15|64]+xe[t>>24&255]+"-"+xe[e&63|128]+xe[e>>8&255]+"-"+xe[e>>16&255]+xe[e>>24&255]+xe[n&255]+xe[n>>8&255]+xe[n>>16&255]+xe[n>>24&255]).toLowerCase()}function Yt(i,t,e){return Math.max(t,Math.min(e,i))}function Zo(i,t){return(i%t+t)%t}function su(i,t,e,n,s){return n+(i-t)*(s-n)/(e-t)}function ru(i,t,e){return i!==t?(e-i)/(t-i):0}function ts(i,t,e){return(1-e)*i+e*t}function au(i,t,e,n){return ts(i,t,1-Math.exp(-e*n))}function ou(i,t=1){return t-Math.abs(Zo(i,t*2)-t)}function cu(i,t,e){return i<=t?0:i>=e?1:(i=(i-t)/(e-t),i*i*(3-2*i))}function lu(i,t,e){return i<=t?0:i>=e?1:(i=(i-t)/(e-t),i*i*i*(i*(i*6-15)+10))}function hu(i,t){return i+Math.floor(Math.random()*(t-i+1))}function uu(i,t){return i+Math.random()*(t-i)}function du(i){return i*(.5-Math.random())}function fu(i){i!==void 0&&(Oc=i);let t=Oc+=1831565813;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}function pu(i){return i*ji}function mu(i){return i*Ai}function gu(i){return(i&i-1)===0&&i!==0}function _u(i){return Math.pow(2,Math.ceil(Math.log(i)/Math.LN2))}function xu(i){return Math.pow(2,Math.floor(Math.log(i)/Math.LN2))}function vu(i,t,e,n,s){let r=Math.cos,a=Math.sin,o=r(e/2),c=a(e/2),l=r((t+n)/2),h=a((t+n)/2),u=r((t-n)/2),d=a((t-n)/2),p=r((n-t)/2),m=a((n-t)/2);switch(s){case"XYX":i.set(o*h,c*u,c*d,o*l);break;case"YZY":i.set(c*d,o*h,c*u,o*l);break;case"ZXZ":i.set(c*u,c*d,o*h,o*l);break;case"XZX":i.set(o*h,c*m,c*p,o*l);break;case"YXY":i.set(c*p,o*h,c*m,o*l);break;case"ZYZ":i.set(c*m,c*p,o*h,o*l);break;default:console.warn("THREE.MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+s)}}function Ei(i,t){switch(t.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("Invalid component type.")}}function Te(i,t){switch(t.constructor){case Float32Array:return i;case Uint32Array:return Math.round(i*4294967295);case Uint16Array:return Math.round(i*65535);case Uint8Array:return Math.round(i*255);case Int32Array:return Math.round(i*2147483647);case Int16Array:return Math.round(i*32767);case Int8Array:return Math.round(i*127);default:throw new Error("Invalid component type.")}}var Je={DEG2RAD:ji,RAD2DEG:Ai,generateUUID:si,clamp:Yt,euclideanModulo:Zo,mapLinear:su,inverseLerp:ru,lerp:ts,damp:au,pingpong:ou,smoothstep:cu,smootherstep:lu,randInt:hu,randFloat:uu,randFloatSpread:du,seededRandom:fu,degToRad:pu,radToDeg:mu,isPowerOfTwo:gu,ceilPowerOfTwo:_u,floorPowerOfTwo:xu,setQuaternionFromProperEuler:vu,normalize:Te,denormalize:Ei},gt=class i{constructor(t=0,e=0){i.prototype.isVector2=!0,this.x=t,this.y=e}get width(){return this.x}set width(t){this.x=t}get height(){return this.y}set height(t){this.y=t}set(t,e){return this.x=t,this.y=e,this}setScalar(t){return this.x=t,this.y=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y)}copy(t){return this.x=t.x,this.y=t.y,this}add(t){return this.x+=t.x,this.y+=t.y,this}addScalar(t){return this.x+=t,this.y+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this}subScalar(t){return this.x-=t,this.y-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this}multiply(t){return this.x*=t.x,this.y*=t.y,this}multiplyScalar(t){return this.x*=t,this.y*=t,this}divide(t){return this.x/=t.x,this.y/=t.y,this}divideScalar(t){return this.multiplyScalar(1/t)}applyMatrix3(t){let e=this.x,n=this.y,s=t.elements;return this.x=s[0]*e+s[3]*n+s[6],this.y=s[1]*e+s[4]*n+s[7],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this}clamp(t,e){return this.x=Yt(this.x,t.x,e.x),this.y=Yt(this.y,t.y,e.y),this}clampScalar(t,e){return this.x=Yt(this.x,t,e),this.y=Yt(this.y,t,e),this}clampLength(t,e){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Yt(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(t){return this.x*t.x+this.y*t.y}cross(t){return this.x*t.y-this.y*t.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(t){let e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;let n=this.dot(t)/e;return Math.acos(Yt(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){let e=this.x-t.x,n=this.y-t.y;return e*e+n*n}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this}equals(t){return t.x===this.x&&t.y===this.y}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this}rotateAround(t,e){let n=Math.cos(e),s=Math.sin(e),r=this.x-t.x,a=this.y-t.y;return this.x=r*n-a*s+t.x,this.y=r*s+a*n+t.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}},gn=class{constructor(t=0,e=0,n=0,s=1){this.isQuaternion=!0,this._x=t,this._y=e,this._z=n,this._w=s}static slerpFlat(t,e,n,s,r,a,o){let c=n[s+0],l=n[s+1],h=n[s+2],u=n[s+3],d=r[a+0],p=r[a+1],m=r[a+2],v=r[a+3];if(o===0){t[e+0]=c,t[e+1]=l,t[e+2]=h,t[e+3]=u;return}if(o===1){t[e+0]=d,t[e+1]=p,t[e+2]=m,t[e+3]=v;return}if(u!==v||c!==d||l!==p||h!==m){let g=1-o,f=c*d+l*p+h*m+u*v,w=f>=0?1:-1,E=1-f*f;if(E>Number.EPSILON){let I=Math.sqrt(E),C=Math.atan2(I,f*w);g=Math.sin(g*C)/I,o=Math.sin(o*C)/I}let M=o*w;if(c=c*g+d*M,l=l*g+p*M,h=h*g+m*M,u=u*g+v*M,g===1-o){let I=1/Math.sqrt(c*c+l*l+h*h+u*u);c*=I,l*=I,h*=I,u*=I}}t[e]=c,t[e+1]=l,t[e+2]=h,t[e+3]=u}static multiplyQuaternionsFlat(t,e,n,s,r,a){let o=n[s],c=n[s+1],l=n[s+2],h=n[s+3],u=r[a],d=r[a+1],p=r[a+2],m=r[a+3];return t[e]=o*m+h*u+c*p-l*d,t[e+1]=c*m+h*d+l*u-o*p,t[e+2]=l*m+h*p+o*d-c*u,t[e+3]=h*m-o*u-c*d-l*p,t}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get w(){return this._w}set w(t){this._w=t,this._onChangeCallback()}set(t,e,n,s){return this._x=t,this._y=e,this._z=n,this._w=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(t){return this._x=t.x,this._y=t.y,this._z=t.z,this._w=t.w,this._onChangeCallback(),this}setFromEuler(t,e=!0){let n=t._x,s=t._y,r=t._z,a=t._order,o=Math.cos,c=Math.sin,l=o(n/2),h=o(s/2),u=o(r/2),d=c(n/2),p=c(s/2),m=c(r/2);switch(a){case"XYZ":this._x=d*h*u+l*p*m,this._y=l*p*u-d*h*m,this._z=l*h*m+d*p*u,this._w=l*h*u-d*p*m;break;case"YXZ":this._x=d*h*u+l*p*m,this._y=l*p*u-d*h*m,this._z=l*h*m-d*p*u,this._w=l*h*u+d*p*m;break;case"ZXY":this._x=d*h*u-l*p*m,this._y=l*p*u+d*h*m,this._z=l*h*m+d*p*u,this._w=l*h*u-d*p*m;break;case"ZYX":this._x=d*h*u-l*p*m,this._y=l*p*u+d*h*m,this._z=l*h*m-d*p*u,this._w=l*h*u+d*p*m;break;case"YZX":this._x=d*h*u+l*p*m,this._y=l*p*u+d*h*m,this._z=l*h*m-d*p*u,this._w=l*h*u-d*p*m;break;case"XZY":this._x=d*h*u-l*p*m,this._y=l*p*u-d*h*m,this._z=l*h*m+d*p*u,this._w=l*h*u+d*p*m;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+a)}return e===!0&&this._onChangeCallback(),this}setFromAxisAngle(t,e){let n=e/2,s=Math.sin(n);return this._x=t.x*s,this._y=t.y*s,this._z=t.z*s,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(t){let e=t.elements,n=e[0],s=e[4],r=e[8],a=e[1],o=e[5],c=e[9],l=e[2],h=e[6],u=e[10],d=n+o+u;if(d>0){let p=.5/Math.sqrt(d+1);this._w=.25/p,this._x=(h-c)*p,this._y=(r-l)*p,this._z=(a-s)*p}else if(n>o&&n>u){let p=2*Math.sqrt(1+n-o-u);this._w=(h-c)/p,this._x=.25*p,this._y=(s+a)/p,this._z=(r+l)/p}else if(o>u){let p=2*Math.sqrt(1+o-n-u);this._w=(r-l)/p,this._x=(s+a)/p,this._y=.25*p,this._z=(c+h)/p}else{let p=2*Math.sqrt(1+u-n-o);this._w=(a-s)/p,this._x=(r+l)/p,this._y=(c+h)/p,this._z=.25*p}return this._onChangeCallback(),this}setFromUnitVectors(t,e){let n=t.dot(e)+1;return n<1e-8?(n=0,Math.abs(t.x)>Math.abs(t.z)?(this._x=-t.y,this._y=t.x,this._z=0,this._w=n):(this._x=0,this._y=-t.z,this._z=t.y,this._w=n)):(this._x=t.y*e.z-t.z*e.y,this._y=t.z*e.x-t.x*e.z,this._z=t.x*e.y-t.y*e.x,this._w=n),this.normalize()}angleTo(t){return 2*Math.acos(Math.abs(Yt(this.dot(t),-1,1)))}rotateTowards(t,e){let n=this.angleTo(t);if(n===0)return this;let s=Math.min(1,e/n);return this.slerp(t,s),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(t){return this._x*t._x+this._y*t._y+this._z*t._z+this._w*t._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let t=this.length();return t===0?(this._x=0,this._y=0,this._z=0,this._w=1):(t=1/t,this._x=this._x*t,this._y=this._y*t,this._z=this._z*t,this._w=this._w*t),this._onChangeCallback(),this}multiply(t){return this.multiplyQuaternions(this,t)}premultiply(t){return this.multiplyQuaternions(t,this)}multiplyQuaternions(t,e){let n=t._x,s=t._y,r=t._z,a=t._w,o=e._x,c=e._y,l=e._z,h=e._w;return this._x=n*h+a*o+s*l-r*c,this._y=s*h+a*c+r*o-n*l,this._z=r*h+a*l+n*c-s*o,this._w=a*h-n*o-s*c-r*l,this._onChangeCallback(),this}slerp(t,e){if(e===0)return this;if(e===1)return this.copy(t);let n=this._x,s=this._y,r=this._z,a=this._w,o=a*t._w+n*t._x+s*t._y+r*t._z;if(o<0?(this._w=-t._w,this._x=-t._x,this._y=-t._y,this._z=-t._z,o=-o):this.copy(t),o>=1)return this._w=a,this._x=n,this._y=s,this._z=r,this;let c=1-o*o;if(c<=Number.EPSILON){let p=1-e;return this._w=p*a+e*this._w,this._x=p*n+e*this._x,this._y=p*s+e*this._y,this._z=p*r+e*this._z,this.normalize(),this}let l=Math.sqrt(c),h=Math.atan2(l,o),u=Math.sin((1-e)*h)/l,d=Math.sin(e*h)/l;return this._w=a*u+this._w*d,this._x=n*u+this._x*d,this._y=s*u+this._y*d,this._z=r*u+this._z*d,this._onChangeCallback(),this}slerpQuaternions(t,e,n){return this.copy(t).slerp(e,n)}random(){let t=2*Math.PI*Math.random(),e=2*Math.PI*Math.random(),n=Math.random(),s=Math.sqrt(1-n),r=Math.sqrt(n);return this.set(s*Math.sin(t),s*Math.cos(t),r*Math.sin(e),r*Math.cos(e))}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._w===this._w}fromArray(t,e=0){return this._x=t[e],this._y=t[e+1],this._z=t[e+2],this._w=t[e+3],this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._w,t}fromBufferAttribute(t,e){return this._x=t.getX(e),this._y=t.getY(e),this._z=t.getZ(e),this._w=t.getW(e),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},D=class i{constructor(t=0,e=0,n=0){i.prototype.isVector3=!0,this.x=t,this.y=e,this.z=n}set(t,e,n){return n===void 0&&(n=this.z),this.x=t,this.y=e,this.z=n,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this}multiplyVectors(t,e){return this.x=t.x*e.x,this.y=t.y*e.y,this.z=t.z*e.z,this}applyEuler(t){return this.applyQuaternion(Bc.setFromEuler(t))}applyAxisAngle(t,e){return this.applyQuaternion(Bc.setFromAxisAngle(t,e))}applyMatrix3(t){let e=this.x,n=this.y,s=this.z,r=t.elements;return this.x=r[0]*e+r[3]*n+r[6]*s,this.y=r[1]*e+r[4]*n+r[7]*s,this.z=r[2]*e+r[5]*n+r[8]*s,this}applyNormalMatrix(t){return this.applyMatrix3(t).normalize()}applyMatrix4(t){let e=this.x,n=this.y,s=this.z,r=t.elements,a=1/(r[3]*e+r[7]*n+r[11]*s+r[15]);return this.x=(r[0]*e+r[4]*n+r[8]*s+r[12])*a,this.y=(r[1]*e+r[5]*n+r[9]*s+r[13])*a,this.z=(r[2]*e+r[6]*n+r[10]*s+r[14])*a,this}applyQuaternion(t){let e=this.x,n=this.y,s=this.z,r=t.x,a=t.y,o=t.z,c=t.w,l=2*(a*s-o*n),h=2*(o*e-r*s),u=2*(r*n-a*e);return this.x=e+c*l+a*u-o*h,this.y=n+c*h+o*l-r*u,this.z=s+c*u+r*h-a*l,this}project(t){return this.applyMatrix4(t.matrixWorldInverse).applyMatrix4(t.projectionMatrix)}unproject(t){return this.applyMatrix4(t.projectionMatrixInverse).applyMatrix4(t.matrixWorld)}transformDirection(t){let e=this.x,n=this.y,s=this.z,r=t.elements;return this.x=r[0]*e+r[4]*n+r[8]*s,this.y=r[1]*e+r[5]*n+r[9]*s,this.z=r[2]*e+r[6]*n+r[10]*s,this.normalize()}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this}divideScalar(t){return this.multiplyScalar(1/t)}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this}clamp(t,e){return this.x=Yt(this.x,t.x,e.x),this.y=Yt(this.y,t.y,e.y),this.z=Yt(this.z,t.z,e.z),this}clampScalar(t,e){return this.x=Yt(this.x,t,e),this.y=Yt(this.y,t,e),this.z=Yt(this.z,t,e),this}clampLength(t,e){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Yt(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this}cross(t){return this.crossVectors(this,t)}crossVectors(t,e){let n=t.x,s=t.y,r=t.z,a=e.x,o=e.y,c=e.z;return this.x=s*c-r*o,this.y=r*a-n*c,this.z=n*o-s*a,this}projectOnVector(t){let e=t.lengthSq();if(e===0)return this.set(0,0,0);let n=t.dot(this)/e;return this.copy(t).multiplyScalar(n)}projectOnPlane(t){return Xa.copy(this).projectOnVector(t),this.sub(Xa)}reflect(t){return this.sub(Xa.copy(t).multiplyScalar(2*this.dot(t)))}angleTo(t){let e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;let n=this.dot(t)/e;return Math.acos(Yt(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){let e=this.x-t.x,n=this.y-t.y,s=this.z-t.z;return e*e+n*n+s*s}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)+Math.abs(this.z-t.z)}setFromSpherical(t){return this.setFromSphericalCoords(t.radius,t.phi,t.theta)}setFromSphericalCoords(t,e,n){let s=Math.sin(e)*t;return this.x=s*Math.sin(n),this.y=Math.cos(e)*t,this.z=s*Math.cos(n),this}setFromCylindrical(t){return this.setFromCylindricalCoords(t.radius,t.theta,t.y)}setFromCylindricalCoords(t,e,n){return this.x=t*Math.sin(e),this.y=n,this.z=t*Math.cos(e),this}setFromMatrixPosition(t){let e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this}setFromMatrixScale(t){let e=this.setFromMatrixColumn(t,0).length(),n=this.setFromMatrixColumn(t,1).length(),s=this.setFromMatrixColumn(t,2).length();return this.x=e,this.y=n,this.z=s,this}setFromMatrixColumn(t,e){return this.fromArray(t.elements,e*4)}setFromMatrix3Column(t,e){return this.fromArray(t.elements,e*3)}setFromEuler(t){return this.x=t._x,this.y=t._y,this.z=t._z,this}setFromColor(t){return this.x=t.r,this.y=t.g,this.z=t.b,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let t=Math.random()*Math.PI*2,e=Math.random()*2-1,n=Math.sqrt(1-e*e);return this.x=n*Math.cos(t),this.y=e,this.z=n*Math.sin(t),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}},Xa=new D,Bc=new gn,Wt=class i{constructor(t,e,n,s,r,a,o,c,l){i.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],t!==void 0&&this.set(t,e,n,s,r,a,o,c,l)}set(t,e,n,s,r,a,o,c,l){let h=this.elements;return h[0]=t,h[1]=s,h[2]=o,h[3]=e,h[4]=r,h[5]=c,h[6]=n,h[7]=a,h[8]=l,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(t){let e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],this}extractBasis(t,e,n){return t.setFromMatrix3Column(this,0),e.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(t){let e=t.elements;return this.set(e[0],e[4],e[8],e[1],e[5],e[9],e[2],e[6],e[10]),this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){let n=t.elements,s=e.elements,r=this.elements,a=n[0],o=n[3],c=n[6],l=n[1],h=n[4],u=n[7],d=n[2],p=n[5],m=n[8],v=s[0],g=s[3],f=s[6],w=s[1],E=s[4],M=s[7],I=s[2],C=s[5],P=s[8];return r[0]=a*v+o*w+c*I,r[3]=a*g+o*E+c*C,r[6]=a*f+o*M+c*P,r[1]=l*v+h*w+u*I,r[4]=l*g+h*E+u*C,r[7]=l*f+h*M+u*P,r[2]=d*v+p*w+m*I,r[5]=d*g+p*E+m*C,r[8]=d*f+p*M+m*P,this}multiplyScalar(t){let e=this.elements;return e[0]*=t,e[3]*=t,e[6]*=t,e[1]*=t,e[4]*=t,e[7]*=t,e[2]*=t,e[5]*=t,e[8]*=t,this}determinant(){let t=this.elements,e=t[0],n=t[1],s=t[2],r=t[3],a=t[4],o=t[5],c=t[6],l=t[7],h=t[8];return e*a*h-e*o*l-n*r*h+n*o*c+s*r*l-s*a*c}invert(){let t=this.elements,e=t[0],n=t[1],s=t[2],r=t[3],a=t[4],o=t[5],c=t[6],l=t[7],h=t[8],u=h*a-o*l,d=o*c-h*r,p=l*r-a*c,m=e*u+n*d+s*p;if(m===0)return this.set(0,0,0,0,0,0,0,0,0);let v=1/m;return t[0]=u*v,t[1]=(s*l-h*n)*v,t[2]=(o*n-s*a)*v,t[3]=d*v,t[4]=(h*e-s*c)*v,t[5]=(s*r-o*e)*v,t[6]=p*v,t[7]=(n*c-l*e)*v,t[8]=(a*e-n*r)*v,this}transpose(){let t,e=this.elements;return t=e[1],e[1]=e[3],e[3]=t,t=e[2],e[2]=e[6],e[6]=t,t=e[5],e[5]=e[7],e[7]=t,this}getNormalMatrix(t){return this.setFromMatrix4(t).invert().transpose()}transposeIntoArray(t){let e=this.elements;return t[0]=e[0],t[1]=e[3],t[2]=e[6],t[3]=e[1],t[4]=e[4],t[5]=e[7],t[6]=e[2],t[7]=e[5],t[8]=e[8],this}setUvTransform(t,e,n,s,r,a,o){let c=Math.cos(r),l=Math.sin(r);return this.set(n*c,n*l,-n*(c*a+l*o)+a+t,-s*l,s*c,-s*(-l*a+c*o)+o+e,0,0,1),this}scale(t,e){return this.premultiply(qa.makeScale(t,e)),this}rotate(t){return this.premultiply(qa.makeRotation(-t)),this}translate(t,e){return this.premultiply(qa.makeTranslation(t,e)),this}makeTranslation(t,e){return t.isVector2?this.set(1,0,t.x,0,1,t.y,0,0,1):this.set(1,0,t,0,1,e,0,0,1),this}makeRotation(t){let e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,n,e,0,0,0,1),this}makeScale(t,e){return this.set(t,0,0,0,e,0,0,0,1),this}equals(t){let e=this.elements,n=t.elements;for(let s=0;s<9;s++)if(e[s]!==n[s])return!1;return!0}fromArray(t,e=0){for(let n=0;n<9;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){let n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t}clone(){return new this.constructor().fromArray(this.elements)}},qa=new Wt;function Jo(i){for(let t=i.length-1;t>=0;--t)if(i[t]>=65535)return!0;return!1}function as(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function Kl(){let i=as("canvas");return i.style.display="block",i}var zc={};function Ci(i){i in zc||(zc[i]=!0,console.warn(i))}function Ql(i,t,e){return new Promise(function(n,s){function r(){switch(i.clientWaitSync(t,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:s();break;case i.TIMEOUT_EXPIRED:setTimeout(r,e);break;default:n()}}setTimeout(r,e)})}var kc=new Wt().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Vc=new Wt().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function yu(){let i={enabled:!0,workingColorSpace:Kn,spaces:{},convert:function(s,r,a){return this.enabled===!1||r===a||!r||!a||(this.spaces[r].transfer===te&&(s.r=fn(s.r),s.g=fn(s.g),s.b=fn(s.b)),this.spaces[r].primaries!==this.spaces[a].primaries&&(s.applyMatrix3(this.spaces[r].toXYZ),s.applyMatrix3(this.spaces[a].fromXYZ)),this.spaces[a].transfer===te&&(s.r=Ti(s.r),s.g=Ti(s.g),s.b=Ti(s.b))),s},workingToColorSpace:function(s,r){return this.convert(s,this.workingColorSpace,r)},colorSpaceToWorking:function(s,r){return this.convert(s,r,this.workingColorSpace)},getPrimaries:function(s){return this.spaces[s].primaries},getTransfer:function(s){return s===yn?ss:this.spaces[s].transfer},getToneMappingMode:function(s){return this.spaces[s].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(s,r=this.workingColorSpace){return s.fromArray(this.spaces[r].luminanceCoefficients)},define:function(s){Object.assign(this.spaces,s)},_getMatrix:function(s,r,a){return s.copy(this.spaces[r].toXYZ).multiply(this.spaces[a].fromXYZ)},_getDrawingBufferColorSpace:function(s){return this.spaces[s].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(s=this.workingColorSpace){return this.spaces[s].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(s,r){return Ci("THREE.ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),i.workingToColorSpace(s,r)},toWorkingColorSpace:function(s,r){return Ci("THREE.ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),i.colorSpaceToWorking(s,r)}},t=[.64,.33,.3,.6,.15,.06],e=[.2126,.7152,.0722],n=[.3127,.329];return i.define({[Kn]:{primaries:t,whitePoint:n,transfer:ss,toXYZ:kc,fromXYZ:Vc,luminanceCoefficients:e,workingColorSpaceConfig:{unpackColorSpace:ye},outputColorSpaceConfig:{drawingBufferColorSpace:ye}},[ye]:{primaries:t,whitePoint:n,transfer:te,toXYZ:kc,fromXYZ:Vc,luminanceCoefficients:e,outputColorSpaceConfig:{drawingBufferColorSpace:ye}}}),i}var Jt=yu();function fn(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function Ti(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}var di,gr=class{static getDataURL(t,e="image/png"){if(/^data:/i.test(t.src)||typeof HTMLCanvasElement>"u")return t.src;let n;if(t instanceof HTMLCanvasElement)n=t;else{di===void 0&&(di=as("canvas")),di.width=t.width,di.height=t.height;let s=di.getContext("2d");t instanceof ImageData?s.putImageData(t,0,0):s.drawImage(t,0,0,t.width,t.height),n=di}return n.toDataURL(e)}static sRGBToLinear(t){if(typeof HTMLImageElement<"u"&&t instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&t instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&t instanceof ImageBitmap){let e=as("canvas");e.width=t.width,e.height=t.height;let n=e.getContext("2d");n.drawImage(t,0,0,t.width,t.height);let s=n.getImageData(0,0,t.width,t.height),r=s.data;for(let a=0;a<r.length;a++)r[a]=fn(r[a]/255)*255;return n.putImageData(s,0,0),e}else if(t.data){let e=t.data.slice(0);for(let n=0;n<e.length;n++)e instanceof Uint8Array||e instanceof Uint8ClampedArray?e[n]=Math.floor(fn(e[n]/255)*255):e[n]=fn(e[n]);return{data:e,width:t.width,height:t.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),t}},Mu=0,Ri=class{constructor(t=null){this.isSource=!0,Object.defineProperty(this,"id",{value:Mu++}),this.uuid=si(),this.data=t,this.dataReady=!0,this.version=0}getSize(t){let e=this.data;return typeof HTMLVideoElement<"u"&&e instanceof HTMLVideoElement?t.set(e.videoWidth,e.videoHeight,0):e instanceof VideoFrame?t.set(e.displayHeight,e.displayWidth,0):e!==null?t.set(e.width,e.height,e.depth||0):t.set(0,0,0),t}set needsUpdate(t){t===!0&&this.version++}toJSON(t){let e=t===void 0||typeof t=="string";if(!e&&t.images[this.uuid]!==void 0)return t.images[this.uuid];let n={uuid:this.uuid,url:""},s=this.data;if(s!==null){let r;if(Array.isArray(s)){r=[];for(let a=0,o=s.length;a<o;a++)s[a].isDataTexture?r.push(Ya(s[a].image)):r.push(Ya(s[a]))}else r=Ya(s);n.url=r}return e||(t.images[this.uuid]=n),n}};function Ya(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?gr.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}var Su=0,$a=new D,Me=class i extends mn{constructor(t=i.DEFAULT_IMAGE,e=i.DEFAULT_MAPPING,n=Rn,s=Rn,r=qe,a=sn,o=Ve,c=Ze,l=i.DEFAULT_ANISOTROPY,h=yn){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Su++}),this.uuid=si(),this.name="",this.source=new Ri(t),this.mipmaps=[],this.mapping=e,this.channel=0,this.wrapS=n,this.wrapT=s,this.magFilter=r,this.minFilter=a,this.anisotropy=l,this.format=o,this.internalFormat=null,this.type=c,this.offset=new gt(0,0),this.repeat=new gt(1,1),this.center=new gt(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Wt,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(t&&t.depth&&t.depth>1),this.pmremVersion=0}get width(){return this.source.getSize($a).x}get height(){return this.source.getSize($a).y}get depth(){return this.source.getSize($a).z}get image(){return this.source.data}set image(t=null){this.source.data=t}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(t){return this.name=t.name,this.source=t.source,this.mipmaps=t.mipmaps.slice(0),this.mapping=t.mapping,this.channel=t.channel,this.wrapS=t.wrapS,this.wrapT=t.wrapT,this.magFilter=t.magFilter,this.minFilter=t.minFilter,this.anisotropy=t.anisotropy,this.format=t.format,this.internalFormat=t.internalFormat,this.type=t.type,this.offset.copy(t.offset),this.repeat.copy(t.repeat),this.center.copy(t.center),this.rotation=t.rotation,this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrix.copy(t.matrix),this.generateMipmaps=t.generateMipmaps,this.premultiplyAlpha=t.premultiplyAlpha,this.flipY=t.flipY,this.unpackAlignment=t.unpackAlignment,this.colorSpace=t.colorSpace,this.renderTarget=t.renderTarget,this.isRenderTargetTexture=t.isRenderTargetTexture,this.isArrayTexture=t.isArrayTexture,this.userData=JSON.parse(JSON.stringify(t.userData)),this.needsUpdate=!0,this}setValues(t){for(let e in t){let n=t[e];if(n===void 0){console.warn(`THREE.Texture.setValues(): parameter '${e}' has value of undefined.`);continue}let s=this[e];if(s===void 0){console.warn(`THREE.Texture.setValues(): property '${e}' does not exist.`);continue}s&&n&&s.isVector2&&n.isVector2||s&&n&&s.isVector3&&n.isVector3||s&&n&&s.isMatrix3&&n.isMatrix3?s.copy(n):this[e]=n}}toJSON(t){let e=t===void 0||typeof t=="string";if(!e&&t.textures[this.uuid]!==void 0)return t.textures[this.uuid];let n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(t).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),e||(t.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(t){if(this.mapping!==Oo)return t;if(t.applyMatrix3(this.matrix),t.x<0||t.x>1)switch(this.wrapS){case fr:t.x=t.x-Math.floor(t.x);break;case Rn:t.x=t.x<0?0:1;break;case pr:Math.abs(Math.floor(t.x)%2)===1?t.x=Math.ceil(t.x)-t.x:t.x=t.x-Math.floor(t.x);break}if(t.y<0||t.y>1)switch(this.wrapT){case fr:t.y=t.y-Math.floor(t.y);break;case Rn:t.y=t.y<0?0:1;break;case pr:Math.abs(Math.floor(t.y)%2)===1?t.y=Math.ceil(t.y)-t.y:t.y=t.y-Math.floor(t.y);break}return this.flipY&&(t.y=1-t.y),t}set needsUpdate(t){t===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(t){t===!0&&this.pmremVersion++}};Me.DEFAULT_IMAGE=null;Me.DEFAULT_MAPPING=Oo;Me.DEFAULT_ANISOTROPY=1;var jt=class i{constructor(t=0,e=0,n=0,s=1){i.prototype.isVector4=!0,this.x=t,this.y=e,this.z=n,this.w=s}get width(){return this.z}set width(t){this.z=t}get height(){return this.w}set height(t){this.w=t}set(t,e,n,s){return this.x=t,this.y=e,this.z=n,this.w=s,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this.w=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setW(t){return this.w=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;case 3:this.w=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this.w=t.w!==void 0?t.w:1,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this.w+=t.w,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this.w+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this.w=t.w+e.w,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this.w+=t.w*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this.w-=t.w,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this.w-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this.w=t.w-e.w,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this.w*=t.w,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this.w*=t,this}applyMatrix4(t){let e=this.x,n=this.y,s=this.z,r=this.w,a=t.elements;return this.x=a[0]*e+a[4]*n+a[8]*s+a[12]*r,this.y=a[1]*e+a[5]*n+a[9]*s+a[13]*r,this.z=a[2]*e+a[6]*n+a[10]*s+a[14]*r,this.w=a[3]*e+a[7]*n+a[11]*s+a[15]*r,this}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this.w/=t.w,this}divideScalar(t){return this.multiplyScalar(1/t)}setAxisAngleFromQuaternion(t){this.w=2*Math.acos(t.w);let e=Math.sqrt(1-t.w*t.w);return e<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=t.x/e,this.y=t.y/e,this.z=t.z/e),this}setAxisAngleFromRotationMatrix(t){let e,n,s,r,c=t.elements,l=c[0],h=c[4],u=c[8],d=c[1],p=c[5],m=c[9],v=c[2],g=c[6],f=c[10];if(Math.abs(h-d)<.01&&Math.abs(u-v)<.01&&Math.abs(m-g)<.01){if(Math.abs(h+d)<.1&&Math.abs(u+v)<.1&&Math.abs(m+g)<.1&&Math.abs(l+p+f-3)<.1)return this.set(1,0,0,0),this;e=Math.PI;let E=(l+1)/2,M=(p+1)/2,I=(f+1)/2,C=(h+d)/4,P=(u+v)/4,U=(m+g)/4;return E>M&&E>I?E<.01?(n=0,s=.707106781,r=.707106781):(n=Math.sqrt(E),s=C/n,r=P/n):M>I?M<.01?(n=.707106781,s=0,r=.707106781):(s=Math.sqrt(M),n=C/s,r=U/s):I<.01?(n=.707106781,s=.707106781,r=0):(r=Math.sqrt(I),n=P/r,s=U/r),this.set(n,s,r,e),this}let w=Math.sqrt((g-m)*(g-m)+(u-v)*(u-v)+(d-h)*(d-h));return Math.abs(w)<.001&&(w=1),this.x=(g-m)/w,this.y=(u-v)/w,this.z=(d-h)/w,this.w=Math.acos((l+p+f-1)/2),this}setFromMatrixPosition(t){let e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this.w=e[15],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this.w=Math.min(this.w,t.w),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this.w=Math.max(this.w,t.w),this}clamp(t,e){return this.x=Yt(this.x,t.x,e.x),this.y=Yt(this.y,t.y,e.y),this.z=Yt(this.z,t.z,e.z),this.w=Yt(this.w,t.w,e.w),this}clampScalar(t,e){return this.x=Yt(this.x,t,e),this.y=Yt(this.y,t,e),this.z=Yt(this.z,t,e),this.w=Yt(this.w,t,e),this}clampLength(t,e){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Yt(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z+this.w*t.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this.w+=(t.w-this.w)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this.w=t.w+(e.w-t.w)*n,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z&&t.w===this.w}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this.w=t[e+3],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t[e+3]=this.w,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this.w=t.getW(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}},_r=class extends mn{constructor(t=1,e=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:qe,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1},n),this.isRenderTarget=!0,this.width=t,this.height=e,this.depth=n.depth,this.scissor=new jt(0,0,t,e),this.scissorTest=!1,this.viewport=new jt(0,0,t,e);let s={width:t,height:e,depth:n.depth},r=new Me(s);this.textures=[];let a=n.count;for(let o=0;o<a;o++)this.textures[o]=r.clone(),this.textures[o].isRenderTargetTexture=!0,this.textures[o].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview}_setTextureOptions(t={}){let e={minFilter:qe,generateMipmaps:!1,flipY:!1,internalFormat:null};t.mapping!==void 0&&(e.mapping=t.mapping),t.wrapS!==void 0&&(e.wrapS=t.wrapS),t.wrapT!==void 0&&(e.wrapT=t.wrapT),t.wrapR!==void 0&&(e.wrapR=t.wrapR),t.magFilter!==void 0&&(e.magFilter=t.magFilter),t.minFilter!==void 0&&(e.minFilter=t.minFilter),t.format!==void 0&&(e.format=t.format),t.type!==void 0&&(e.type=t.type),t.anisotropy!==void 0&&(e.anisotropy=t.anisotropy),t.colorSpace!==void 0&&(e.colorSpace=t.colorSpace),t.flipY!==void 0&&(e.flipY=t.flipY),t.generateMipmaps!==void 0&&(e.generateMipmaps=t.generateMipmaps),t.internalFormat!==void 0&&(e.internalFormat=t.internalFormat);for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(e)}get texture(){return this.textures[0]}set texture(t){this.textures[0]=t}set depthTexture(t){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),t!==null&&(t.renderTarget=this),this._depthTexture=t}get depthTexture(){return this._depthTexture}setSize(t,e,n=1){if(this.width!==t||this.height!==e||this.depth!==n){this.width=t,this.height=e,this.depth=n;for(let s=0,r=this.textures.length;s<r;s++)this.textures[s].image.width=t,this.textures[s].image.height=e,this.textures[s].image.depth=n,this.textures[s].isArrayTexture=this.textures[s].image.depth>1;this.dispose()}this.viewport.set(0,0,t,e),this.scissor.set(0,0,t,e)}clone(){return new this.constructor().copy(this)}copy(t){this.width=t.width,this.height=t.height,this.depth=t.depth,this.scissor.copy(t.scissor),this.scissorTest=t.scissorTest,this.viewport.copy(t.viewport),this.textures.length=0;for(let e=0,n=t.textures.length;e<n;e++){this.textures[e]=t.textures[e].clone(),this.textures[e].isRenderTargetTexture=!0,this.textures[e].renderTarget=this;let s=Object.assign({},t.textures[e].image);this.textures[e].source=new Ri(s)}return this.depthBuffer=t.depthBuffer,this.stencilBuffer=t.stencilBuffer,this.resolveDepthBuffer=t.resolveDepthBuffer,this.resolveStencilBuffer=t.resolveStencilBuffer,t.depthTexture!==null&&(this.depthTexture=t.depthTexture.clone()),this.samples=t.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}},je=class extends _r{constructor(t=1,e=1,n={}){super(t,e,n),this.isWebGLRenderTarget=!0}},os=class extends Me{constructor(t=null,e=1,n=1,s=1){super(null),this.isDataArrayTexture=!0,this.image={data:t,width:e,height:n,depth:s},this.magFilter=ke,this.minFilter=ke,this.wrapR=Rn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(t){this.layerUpdates.add(t)}clearLayerUpdates(){this.layerUpdates.clear()}};var xr=class extends Me{constructor(t=null,e=1,n=1,s=1){super(null),this.isData3DTexture=!0,this.image={data:t,width:e,height:n,depth:s},this.magFilter=ke,this.minFilter=ke,this.wrapR=Rn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};var Pn=class{constructor(t=new D(1/0,1/0,1/0),e=new D(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=t,this.max=e}set(t,e){return this.min.copy(t),this.max.copy(e),this}setFromArray(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e+=3)this.expandByPoint(He.fromArray(t,e));return this}setFromBufferAttribute(t){this.makeEmpty();for(let e=0,n=t.count;e<n;e++)this.expandByPoint(He.fromBufferAttribute(t,e));return this}setFromPoints(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e++)this.expandByPoint(t[e]);return this}setFromCenterAndSize(t,e){let n=He.copy(e).multiplyScalar(.5);return this.min.copy(t).sub(n),this.max.copy(t).add(n),this}setFromObject(t,e=!1){return this.makeEmpty(),this.expandByObject(t,e)}clone(){return new this.constructor().copy(this)}copy(t){return this.min.copy(t.min),this.max.copy(t.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(t){return this.isEmpty()?t.set(0,0,0):t.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(t){return this.isEmpty()?t.set(0,0,0):t.subVectors(this.max,this.min)}expandByPoint(t){return this.min.min(t),this.max.max(t),this}expandByVector(t){return this.min.sub(t),this.max.add(t),this}expandByScalar(t){return this.min.addScalar(-t),this.max.addScalar(t),this}expandByObject(t,e=!1){t.updateWorldMatrix(!1,!1);let n=t.geometry;if(n!==void 0){let r=n.getAttribute("position");if(e===!0&&r!==void 0&&t.isInstancedMesh!==!0)for(let a=0,o=r.count;a<o;a++)t.isMesh===!0?t.getVertexPosition(a,He):He.fromBufferAttribute(r,a),He.applyMatrix4(t.matrixWorld),this.expandByPoint(He);else t.boundingBox!==void 0?(t.boundingBox===null&&t.computeBoundingBox(),Gs.copy(t.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),Gs.copy(n.boundingBox)),Gs.applyMatrix4(t.matrixWorld),this.union(Gs)}let s=t.children;for(let r=0,a=s.length;r<a;r++)this.expandByObject(s[r],e);return this}containsPoint(t){return t.x>=this.min.x&&t.x<=this.max.x&&t.y>=this.min.y&&t.y<=this.max.y&&t.z>=this.min.z&&t.z<=this.max.z}containsBox(t){return this.min.x<=t.min.x&&t.max.x<=this.max.x&&this.min.y<=t.min.y&&t.max.y<=this.max.y&&this.min.z<=t.min.z&&t.max.z<=this.max.z}getParameter(t,e){return e.set((t.x-this.min.x)/(this.max.x-this.min.x),(t.y-this.min.y)/(this.max.y-this.min.y),(t.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(t){return t.max.x>=this.min.x&&t.min.x<=this.max.x&&t.max.y>=this.min.y&&t.min.y<=this.max.y&&t.max.z>=this.min.z&&t.min.z<=this.max.z}intersectsSphere(t){return this.clampPoint(t.center,He),He.distanceToSquared(t.center)<=t.radius*t.radius}intersectsPlane(t){let e,n;return t.normal.x>0?(e=t.normal.x*this.min.x,n=t.normal.x*this.max.x):(e=t.normal.x*this.max.x,n=t.normal.x*this.min.x),t.normal.y>0?(e+=t.normal.y*this.min.y,n+=t.normal.y*this.max.y):(e+=t.normal.y*this.max.y,n+=t.normal.y*this.min.y),t.normal.z>0?(e+=t.normal.z*this.min.z,n+=t.normal.z*this.max.z):(e+=t.normal.z*this.max.z,n+=t.normal.z*this.min.z),e<=-t.constant&&n>=-t.constant}intersectsTriangle(t){if(this.isEmpty())return!1;this.getCenter(Yi),Ws.subVectors(this.max,Yi),fi.subVectors(t.a,Yi),pi.subVectors(t.b,Yi),mi.subVectors(t.c,Yi),Sn.subVectors(pi,fi),bn.subVectors(mi,pi),Hn.subVectors(fi,mi);let e=[0,-Sn.z,Sn.y,0,-bn.z,bn.y,0,-Hn.z,Hn.y,Sn.z,0,-Sn.x,bn.z,0,-bn.x,Hn.z,0,-Hn.x,-Sn.y,Sn.x,0,-bn.y,bn.x,0,-Hn.y,Hn.x,0];return!Za(e,fi,pi,mi,Ws)||(e=[1,0,0,0,1,0,0,0,1],!Za(e,fi,pi,mi,Ws))?!1:(Xs.crossVectors(Sn,bn),e=[Xs.x,Xs.y,Xs.z],Za(e,fi,pi,mi,Ws))}clampPoint(t,e){return e.copy(t).clamp(this.min,this.max)}distanceToPoint(t){return this.clampPoint(t,He).distanceTo(t)}getBoundingSphere(t){return this.isEmpty()?t.makeEmpty():(this.getCenter(t.center),t.radius=this.getSize(He).length()*.5),t}intersect(t){return this.min.max(t.min),this.max.min(t.max),this.isEmpty()&&this.makeEmpty(),this}union(t){return this.min.min(t.min),this.max.max(t.max),this}applyMatrix4(t){return this.isEmpty()?this:(cn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(t),cn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(t),cn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(t),cn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(t),cn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(t),cn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(t),cn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(t),cn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(t),this.setFromPoints(cn),this)}translate(t){return this.min.add(t),this.max.add(t),this}equals(t){return t.min.equals(this.min)&&t.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(t){return this.min.fromArray(t.min),this.max.fromArray(t.max),this}},cn=[new D,new D,new D,new D,new D,new D,new D,new D],He=new D,Gs=new Pn,fi=new D,pi=new D,mi=new D,Sn=new D,bn=new D,Hn=new D,Yi=new D,Ws=new D,Xs=new D,Gn=new D;function Za(i,t,e,n,s){for(let r=0,a=i.length-3;r<=a;r+=3){Gn.fromArray(i,r);let o=s.x*Math.abs(Gn.x)+s.y*Math.abs(Gn.y)+s.z*Math.abs(Gn.z),c=t.dot(Gn),l=e.dot(Gn),h=n.dot(Gn);if(Math.max(-Math.max(c,l,h),Math.min(c,l,h))>o)return!1}return!0}var bu=new Pn,$i=new D,Ja=new D,Ii=class{constructor(t=new D,e=-1){this.isSphere=!0,this.center=t,this.radius=e}set(t,e){return this.center.copy(t),this.radius=e,this}setFromPoints(t,e){let n=this.center;e!==void 0?n.copy(e):bu.setFromPoints(t).getCenter(n);let s=0;for(let r=0,a=t.length;r<a;r++)s=Math.max(s,n.distanceToSquared(t[r]));return this.radius=Math.sqrt(s),this}copy(t){return this.center.copy(t.center),this.radius=t.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(t){return t.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(t){return t.distanceTo(this.center)-this.radius}intersectsSphere(t){let e=this.radius+t.radius;return t.center.distanceToSquared(this.center)<=e*e}intersectsBox(t){return t.intersectsSphere(this)}intersectsPlane(t){return Math.abs(t.distanceToPoint(this.center))<=this.radius}clampPoint(t,e){let n=this.center.distanceToSquared(t);return e.copy(t),n>this.radius*this.radius&&(e.sub(this.center).normalize(),e.multiplyScalar(this.radius).add(this.center)),e}getBoundingBox(t){return this.isEmpty()?(t.makeEmpty(),t):(t.set(this.center,this.center),t.expandByScalar(this.radius),t)}applyMatrix4(t){return this.center.applyMatrix4(t),this.radius=this.radius*t.getMaxScaleOnAxis(),this}translate(t){return this.center.add(t),this}expandByPoint(t){if(this.isEmpty())return this.center.copy(t),this.radius=0,this;$i.subVectors(t,this.center);let e=$i.lengthSq();if(e>this.radius*this.radius){let n=Math.sqrt(e),s=(n-this.radius)*.5;this.center.addScaledVector($i,s/n),this.radius+=s}return this}union(t){return t.isEmpty()?this:this.isEmpty()?(this.copy(t),this):(this.center.equals(t.center)===!0?this.radius=Math.max(this.radius,t.radius):(Ja.subVectors(t.center,this.center).setLength(t.radius),this.expandByPoint($i.copy(t.center).add(Ja)),this.expandByPoint($i.copy(t.center).sub(Ja))),this)}equals(t){return t.center.equals(this.center)&&t.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(t){return this.radius=t.radius,this.center.fromArray(t.center),this}},ln=new D,Ka=new D,qs=new D,En=new D,Qa=new D,Ys=new D,ja=new D,cs=class{constructor(t=new D,e=new D(0,0,-1)){this.origin=t,this.direction=e}set(t,e){return this.origin.copy(t),this.direction.copy(e),this}copy(t){return this.origin.copy(t.origin),this.direction.copy(t.direction),this}at(t,e){return e.copy(this.origin).addScaledVector(this.direction,t)}lookAt(t){return this.direction.copy(t).sub(this.origin).normalize(),this}recast(t){return this.origin.copy(this.at(t,ln)),this}closestPointToPoint(t,e){e.subVectors(t,this.origin);let n=e.dot(this.direction);return n<0?e.copy(this.origin):e.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(t){return Math.sqrt(this.distanceSqToPoint(t))}distanceSqToPoint(t){let e=ln.subVectors(t,this.origin).dot(this.direction);return e<0?this.origin.distanceToSquared(t):(ln.copy(this.origin).addScaledVector(this.direction,e),ln.distanceToSquared(t))}distanceSqToSegment(t,e,n,s){Ka.copy(t).add(e).multiplyScalar(.5),qs.copy(e).sub(t).normalize(),En.copy(this.origin).sub(Ka);let r=t.distanceTo(e)*.5,a=-this.direction.dot(qs),o=En.dot(this.direction),c=-En.dot(qs),l=En.lengthSq(),h=Math.abs(1-a*a),u,d,p,m;if(h>0)if(u=a*c-o,d=a*o-c,m=r*h,u>=0)if(d>=-m)if(d<=m){let v=1/h;u*=v,d*=v,p=u*(u+a*d+2*o)+d*(a*u+d+2*c)+l}else d=r,u=Math.max(0,-(a*d+o)),p=-u*u+d*(d+2*c)+l;else d=-r,u=Math.max(0,-(a*d+o)),p=-u*u+d*(d+2*c)+l;else d<=-m?(u=Math.max(0,-(-a*r+o)),d=u>0?-r:Math.min(Math.max(-r,-c),r),p=-u*u+d*(d+2*c)+l):d<=m?(u=0,d=Math.min(Math.max(-r,-c),r),p=d*(d+2*c)+l):(u=Math.max(0,-(a*r+o)),d=u>0?r:Math.min(Math.max(-r,-c),r),p=-u*u+d*(d+2*c)+l);else d=a>0?-r:r,u=Math.max(0,-(a*d+o)),p=-u*u+d*(d+2*c)+l;return n&&n.copy(this.origin).addScaledVector(this.direction,u),s&&s.copy(Ka).addScaledVector(qs,d),p}intersectSphere(t,e){ln.subVectors(t.center,this.origin);let n=ln.dot(this.direction),s=ln.dot(ln)-n*n,r=t.radius*t.radius;if(s>r)return null;let a=Math.sqrt(r-s),o=n-a,c=n+a;return c<0?null:o<0?this.at(c,e):this.at(o,e)}intersectsSphere(t){return t.radius<0?!1:this.distanceSqToPoint(t.center)<=t.radius*t.radius}distanceToPlane(t){let e=t.normal.dot(this.direction);if(e===0)return t.distanceToPoint(this.origin)===0?0:null;let n=-(this.origin.dot(t.normal)+t.constant)/e;return n>=0?n:null}intersectPlane(t,e){let n=this.distanceToPlane(t);return n===null?null:this.at(n,e)}intersectsPlane(t){let e=t.distanceToPoint(this.origin);return e===0||t.normal.dot(this.direction)*e<0}intersectBox(t,e){let n,s,r,a,o,c,l=1/this.direction.x,h=1/this.direction.y,u=1/this.direction.z,d=this.origin;return l>=0?(n=(t.min.x-d.x)*l,s=(t.max.x-d.x)*l):(n=(t.max.x-d.x)*l,s=(t.min.x-d.x)*l),h>=0?(r=(t.min.y-d.y)*h,a=(t.max.y-d.y)*h):(r=(t.max.y-d.y)*h,a=(t.min.y-d.y)*h),n>a||r>s||((r>n||isNaN(n))&&(n=r),(a<s||isNaN(s))&&(s=a),u>=0?(o=(t.min.z-d.z)*u,c=(t.max.z-d.z)*u):(o=(t.max.z-d.z)*u,c=(t.min.z-d.z)*u),n>c||o>s)||((o>n||n!==n)&&(n=o),(c<s||s!==s)&&(s=c),s<0)?null:this.at(n>=0?n:s,e)}intersectsBox(t){return this.intersectBox(t,ln)!==null}intersectTriangle(t,e,n,s,r){Qa.subVectors(e,t),Ys.subVectors(n,t),ja.crossVectors(Qa,Ys);let a=this.direction.dot(ja),o;if(a>0){if(s)return null;o=1}else if(a<0)o=-1,a=-a;else return null;En.subVectors(this.origin,t);let c=o*this.direction.dot(Ys.crossVectors(En,Ys));if(c<0)return null;let l=o*this.direction.dot(Qa.cross(En));if(l<0||c+l>a)return null;let h=-o*En.dot(ja);return h<0?null:this.at(h/a,r)}applyMatrix4(t){return this.origin.applyMatrix4(t),this.direction.transformDirection(t),this}equals(t){return t.origin.equals(this.origin)&&t.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},ae=class i{constructor(t,e,n,s,r,a,o,c,l,h,u,d,p,m,v,g){i.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],t!==void 0&&this.set(t,e,n,s,r,a,o,c,l,h,u,d,p,m,v,g)}set(t,e,n,s,r,a,o,c,l,h,u,d,p,m,v,g){let f=this.elements;return f[0]=t,f[4]=e,f[8]=n,f[12]=s,f[1]=r,f[5]=a,f[9]=o,f[13]=c,f[2]=l,f[6]=h,f[10]=u,f[14]=d,f[3]=p,f[7]=m,f[11]=v,f[15]=g,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new i().fromArray(this.elements)}copy(t){let e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],e[9]=n[9],e[10]=n[10],e[11]=n[11],e[12]=n[12],e[13]=n[13],e[14]=n[14],e[15]=n[15],this}copyPosition(t){let e=this.elements,n=t.elements;return e[12]=n[12],e[13]=n[13],e[14]=n[14],this}setFromMatrix3(t){let e=t.elements;return this.set(e[0],e[3],e[6],0,e[1],e[4],e[7],0,e[2],e[5],e[8],0,0,0,0,1),this}extractBasis(t,e,n){return t.setFromMatrixColumn(this,0),e.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this}makeBasis(t,e,n){return this.set(t.x,e.x,n.x,0,t.y,e.y,n.y,0,t.z,e.z,n.z,0,0,0,0,1),this}extractRotation(t){let e=this.elements,n=t.elements,s=1/gi.setFromMatrixColumn(t,0).length(),r=1/gi.setFromMatrixColumn(t,1).length(),a=1/gi.setFromMatrixColumn(t,2).length();return e[0]=n[0]*s,e[1]=n[1]*s,e[2]=n[2]*s,e[3]=0,e[4]=n[4]*r,e[5]=n[5]*r,e[6]=n[6]*r,e[7]=0,e[8]=n[8]*a,e[9]=n[9]*a,e[10]=n[10]*a,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromEuler(t){let e=this.elements,n=t.x,s=t.y,r=t.z,a=Math.cos(n),o=Math.sin(n),c=Math.cos(s),l=Math.sin(s),h=Math.cos(r),u=Math.sin(r);if(t.order==="XYZ"){let d=a*h,p=a*u,m=o*h,v=o*u;e[0]=c*h,e[4]=-c*u,e[8]=l,e[1]=p+m*l,e[5]=d-v*l,e[9]=-o*c,e[2]=v-d*l,e[6]=m+p*l,e[10]=a*c}else if(t.order==="YXZ"){let d=c*h,p=c*u,m=l*h,v=l*u;e[0]=d+v*o,e[4]=m*o-p,e[8]=a*l,e[1]=a*u,e[5]=a*h,e[9]=-o,e[2]=p*o-m,e[6]=v+d*o,e[10]=a*c}else if(t.order==="ZXY"){let d=c*h,p=c*u,m=l*h,v=l*u;e[0]=d-v*o,e[4]=-a*u,e[8]=m+p*o,e[1]=p+m*o,e[5]=a*h,e[9]=v-d*o,e[2]=-a*l,e[6]=o,e[10]=a*c}else if(t.order==="ZYX"){let d=a*h,p=a*u,m=o*h,v=o*u;e[0]=c*h,e[4]=m*l-p,e[8]=d*l+v,e[1]=c*u,e[5]=v*l+d,e[9]=p*l-m,e[2]=-l,e[6]=o*c,e[10]=a*c}else if(t.order==="YZX"){let d=a*c,p=a*l,m=o*c,v=o*l;e[0]=c*h,e[4]=v-d*u,e[8]=m*u+p,e[1]=u,e[5]=a*h,e[9]=-o*h,e[2]=-l*h,e[6]=p*u+m,e[10]=d-v*u}else if(t.order==="XZY"){let d=a*c,p=a*l,m=o*c,v=o*l;e[0]=c*h,e[4]=-u,e[8]=l*h,e[1]=d*u+v,e[5]=a*h,e[9]=p*u-m,e[2]=m*u-p,e[6]=o*h,e[10]=v*u+d}return e[3]=0,e[7]=0,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromQuaternion(t){return this.compose(Eu,t,Tu)}lookAt(t,e,n){let s=this.elements;return Pe.subVectors(t,e),Pe.lengthSq()===0&&(Pe.z=1),Pe.normalize(),Tn.crossVectors(n,Pe),Tn.lengthSq()===0&&(Math.abs(n.z)===1?Pe.x+=1e-4:Pe.z+=1e-4,Pe.normalize(),Tn.crossVectors(n,Pe)),Tn.normalize(),$s.crossVectors(Pe,Tn),s[0]=Tn.x,s[4]=$s.x,s[8]=Pe.x,s[1]=Tn.y,s[5]=$s.y,s[9]=Pe.y,s[2]=Tn.z,s[6]=$s.z,s[10]=Pe.z,this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){let n=t.elements,s=e.elements,r=this.elements,a=n[0],o=n[4],c=n[8],l=n[12],h=n[1],u=n[5],d=n[9],p=n[13],m=n[2],v=n[6],g=n[10],f=n[14],w=n[3],E=n[7],M=n[11],I=n[15],C=s[0],P=s[4],U=s[8],S=s[12],x=s[1],A=s[5],N=s[9],k=s[13],G=s[2],V=s[6],q=s[10],nt=s[14],X=s[3],ot=s[7],it=s[11],rt=s[15];return r[0]=a*C+o*x+c*G+l*X,r[4]=a*P+o*A+c*V+l*ot,r[8]=a*U+o*N+c*q+l*it,r[12]=a*S+o*k+c*nt+l*rt,r[1]=h*C+u*x+d*G+p*X,r[5]=h*P+u*A+d*V+p*ot,r[9]=h*U+u*N+d*q+p*it,r[13]=h*S+u*k+d*nt+p*rt,r[2]=m*C+v*x+g*G+f*X,r[6]=m*P+v*A+g*V+f*ot,r[10]=m*U+v*N+g*q+f*it,r[14]=m*S+v*k+g*nt+f*rt,r[3]=w*C+E*x+M*G+I*X,r[7]=w*P+E*A+M*V+I*ot,r[11]=w*U+E*N+M*q+I*it,r[15]=w*S+E*k+M*nt+I*rt,this}multiplyScalar(t){let e=this.elements;return e[0]*=t,e[4]*=t,e[8]*=t,e[12]*=t,e[1]*=t,e[5]*=t,e[9]*=t,e[13]*=t,e[2]*=t,e[6]*=t,e[10]*=t,e[14]*=t,e[3]*=t,e[7]*=t,e[11]*=t,e[15]*=t,this}determinant(){let t=this.elements,e=t[0],n=t[4],s=t[8],r=t[12],a=t[1],o=t[5],c=t[9],l=t[13],h=t[2],u=t[6],d=t[10],p=t[14],m=t[3],v=t[7],g=t[11],f=t[15];return m*(+r*c*u-s*l*u-r*o*d+n*l*d+s*o*p-n*c*p)+v*(+e*c*p-e*l*d+r*a*d-s*a*p+s*l*h-r*c*h)+g*(+e*l*u-e*o*p-r*a*u+n*a*p+r*o*h-n*l*h)+f*(-s*o*h-e*c*u+e*o*d+s*a*u-n*a*d+n*c*h)}transpose(){let t=this.elements,e;return e=t[1],t[1]=t[4],t[4]=e,e=t[2],t[2]=t[8],t[8]=e,e=t[6],t[6]=t[9],t[9]=e,e=t[3],t[3]=t[12],t[12]=e,e=t[7],t[7]=t[13],t[13]=e,e=t[11],t[11]=t[14],t[14]=e,this}setPosition(t,e,n){let s=this.elements;return t.isVector3?(s[12]=t.x,s[13]=t.y,s[14]=t.z):(s[12]=t,s[13]=e,s[14]=n),this}invert(){let t=this.elements,e=t[0],n=t[1],s=t[2],r=t[3],a=t[4],o=t[5],c=t[6],l=t[7],h=t[8],u=t[9],d=t[10],p=t[11],m=t[12],v=t[13],g=t[14],f=t[15],w=u*g*l-v*d*l+v*c*p-o*g*p-u*c*f+o*d*f,E=m*d*l-h*g*l-m*c*p+a*g*p+h*c*f-a*d*f,M=h*v*l-m*u*l+m*o*p-a*v*p-h*o*f+a*u*f,I=m*u*c-h*v*c-m*o*d+a*v*d+h*o*g-a*u*g,C=e*w+n*E+s*M+r*I;if(C===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let P=1/C;return t[0]=w*P,t[1]=(v*d*r-u*g*r-v*s*p+n*g*p+u*s*f-n*d*f)*P,t[2]=(o*g*r-v*c*r+v*s*l-n*g*l-o*s*f+n*c*f)*P,t[3]=(u*c*r-o*d*r-u*s*l+n*d*l+o*s*p-n*c*p)*P,t[4]=E*P,t[5]=(h*g*r-m*d*r+m*s*p-e*g*p-h*s*f+e*d*f)*P,t[6]=(m*c*r-a*g*r-m*s*l+e*g*l+a*s*f-e*c*f)*P,t[7]=(a*d*r-h*c*r+h*s*l-e*d*l-a*s*p+e*c*p)*P,t[8]=M*P,t[9]=(m*u*r-h*v*r-m*n*p+e*v*p+h*n*f-e*u*f)*P,t[10]=(a*v*r-m*o*r+m*n*l-e*v*l-a*n*f+e*o*f)*P,t[11]=(h*o*r-a*u*r-h*n*l+e*u*l+a*n*p-e*o*p)*P,t[12]=I*P,t[13]=(h*v*s-m*u*s+m*n*d-e*v*d-h*n*g+e*u*g)*P,t[14]=(m*o*s-a*v*s-m*n*c+e*v*c+a*n*g-e*o*g)*P,t[15]=(a*u*s-h*o*s+h*n*c-e*u*c-a*n*d+e*o*d)*P,this}scale(t){let e=this.elements,n=t.x,s=t.y,r=t.z;return e[0]*=n,e[4]*=s,e[8]*=r,e[1]*=n,e[5]*=s,e[9]*=r,e[2]*=n,e[6]*=s,e[10]*=r,e[3]*=n,e[7]*=s,e[11]*=r,this}getMaxScaleOnAxis(){let t=this.elements,e=t[0]*t[0]+t[1]*t[1]+t[2]*t[2],n=t[4]*t[4]+t[5]*t[5]+t[6]*t[6],s=t[8]*t[8]+t[9]*t[9]+t[10]*t[10];return Math.sqrt(Math.max(e,n,s))}makeTranslation(t,e,n){return t.isVector3?this.set(1,0,0,t.x,0,1,0,t.y,0,0,1,t.z,0,0,0,1):this.set(1,0,0,t,0,1,0,e,0,0,1,n,0,0,0,1),this}makeRotationX(t){let e=Math.cos(t),n=Math.sin(t);return this.set(1,0,0,0,0,e,-n,0,0,n,e,0,0,0,0,1),this}makeRotationY(t){let e=Math.cos(t),n=Math.sin(t);return this.set(e,0,n,0,0,1,0,0,-n,0,e,0,0,0,0,1),this}makeRotationZ(t){let e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,0,n,e,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(t,e){let n=Math.cos(e),s=Math.sin(e),r=1-n,a=t.x,o=t.y,c=t.z,l=r*a,h=r*o;return this.set(l*a+n,l*o-s*c,l*c+s*o,0,l*o+s*c,h*o+n,h*c-s*a,0,l*c-s*o,h*c+s*a,r*c*c+n,0,0,0,0,1),this}makeScale(t,e,n){return this.set(t,0,0,0,0,e,0,0,0,0,n,0,0,0,0,1),this}makeShear(t,e,n,s,r,a){return this.set(1,n,r,0,t,1,a,0,e,s,1,0,0,0,0,1),this}compose(t,e,n){let s=this.elements,r=e._x,a=e._y,o=e._z,c=e._w,l=r+r,h=a+a,u=o+o,d=r*l,p=r*h,m=r*u,v=a*h,g=a*u,f=o*u,w=c*l,E=c*h,M=c*u,I=n.x,C=n.y,P=n.z;return s[0]=(1-(v+f))*I,s[1]=(p+M)*I,s[2]=(m-E)*I,s[3]=0,s[4]=(p-M)*C,s[5]=(1-(d+f))*C,s[6]=(g+w)*C,s[7]=0,s[8]=(m+E)*P,s[9]=(g-w)*P,s[10]=(1-(d+v))*P,s[11]=0,s[12]=t.x,s[13]=t.y,s[14]=t.z,s[15]=1,this}decompose(t,e,n){let s=this.elements,r=gi.set(s[0],s[1],s[2]).length(),a=gi.set(s[4],s[5],s[6]).length(),o=gi.set(s[8],s[9],s[10]).length();this.determinant()<0&&(r=-r),t.x=s[12],t.y=s[13],t.z=s[14],Ge.copy(this);let l=1/r,h=1/a,u=1/o;return Ge.elements[0]*=l,Ge.elements[1]*=l,Ge.elements[2]*=l,Ge.elements[4]*=h,Ge.elements[5]*=h,Ge.elements[6]*=h,Ge.elements[8]*=u,Ge.elements[9]*=u,Ge.elements[10]*=u,e.setFromRotationMatrix(Ge),n.x=r,n.y=a,n.z=o,this}makePerspective(t,e,n,s,r,a,o=Xe,c=!1){let l=this.elements,h=2*r/(e-t),u=2*r/(n-s),d=(e+t)/(e-t),p=(n+s)/(n-s),m,v;if(c)m=r/(a-r),v=a*r/(a-r);else if(o===Xe)m=-(a+r)/(a-r),v=-2*a*r/(a-r);else if(o===rs)m=-a/(a-r),v=-a*r/(a-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+o);return l[0]=h,l[4]=0,l[8]=d,l[12]=0,l[1]=0,l[5]=u,l[9]=p,l[13]=0,l[2]=0,l[6]=0,l[10]=m,l[14]=v,l[3]=0,l[7]=0,l[11]=-1,l[15]=0,this}makeOrthographic(t,e,n,s,r,a,o=Xe,c=!1){let l=this.elements,h=2/(e-t),u=2/(n-s),d=-(e+t)/(e-t),p=-(n+s)/(n-s),m,v;if(c)m=1/(a-r),v=a/(a-r);else if(o===Xe)m=-2/(a-r),v=-(a+r)/(a-r);else if(o===rs)m=-1/(a-r),v=-r/(a-r);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+o);return l[0]=h,l[4]=0,l[8]=0,l[12]=d,l[1]=0,l[5]=u,l[9]=0,l[13]=p,l[2]=0,l[6]=0,l[10]=m,l[14]=v,l[3]=0,l[7]=0,l[11]=0,l[15]=1,this}equals(t){let e=this.elements,n=t.elements;for(let s=0;s<16;s++)if(e[s]!==n[s])return!1;return!0}fromArray(t,e=0){for(let n=0;n<16;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){let n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t[e+9]=n[9],t[e+10]=n[10],t[e+11]=n[11],t[e+12]=n[12],t[e+13]=n[13],t[e+14]=n[14],t[e+15]=n[15],t}},gi=new D,Ge=new ae,Eu=new D(0,0,0),Tu=new D(1,1,1),Tn=new D,$s=new D,Pe=new D,Hc=new ae,Gc=new gn,Ye=class i{constructor(t=0,e=0,n=0,s=i.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=e,this._z=n,this._order=s}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get order(){return this._order}set order(t){this._order=t,this._onChangeCallback()}set(t,e,n,s=this._order){return this._x=t,this._y=e,this._z=n,this._order=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(t){return this._x=t._x,this._y=t._y,this._z=t._z,this._order=t._order,this._onChangeCallback(),this}setFromRotationMatrix(t,e=this._order,n=!0){let s=t.elements,r=s[0],a=s[4],o=s[8],c=s[1],l=s[5],h=s[9],u=s[2],d=s[6],p=s[10];switch(e){case"XYZ":this._y=Math.asin(Yt(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-h,p),this._z=Math.atan2(-a,r)):(this._x=Math.atan2(d,l),this._z=0);break;case"YXZ":this._x=Math.asin(-Yt(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(o,p),this._z=Math.atan2(c,l)):(this._y=Math.atan2(-u,r),this._z=0);break;case"ZXY":this._x=Math.asin(Yt(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(-u,p),this._z=Math.atan2(-a,l)):(this._y=0,this._z=Math.atan2(c,r));break;case"ZYX":this._y=Math.asin(-Yt(u,-1,1)),Math.abs(u)<.9999999?(this._x=Math.atan2(d,p),this._z=Math.atan2(c,r)):(this._x=0,this._z=Math.atan2(-a,l));break;case"YZX":this._z=Math.asin(Yt(c,-1,1)),Math.abs(c)<.9999999?(this._x=Math.atan2(-h,l),this._y=Math.atan2(-u,r)):(this._x=0,this._y=Math.atan2(o,p));break;case"XZY":this._z=Math.asin(-Yt(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(d,l),this._y=Math.atan2(o,r)):(this._x=Math.atan2(-h,p),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+e)}return this._order=e,n===!0&&this._onChangeCallback(),this}setFromQuaternion(t,e,n){return Hc.makeRotationFromQuaternion(t),this.setFromRotationMatrix(Hc,e,n)}setFromVector3(t,e=this._order){return this.set(t.x,t.y,t.z,e)}reorder(t){return Gc.setFromEuler(this),this.setFromQuaternion(Gc,t)}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._order===this._order}fromArray(t){return this._x=t[0],this._y=t[1],this._z=t[2],t[3]!==void 0&&(this._order=t[3]),this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._order,t}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};Ye.DEFAULT_ORDER="XYZ";var Pi=class{constructor(){this.mask=1}set(t){this.mask=(1<<t|0)>>>0}enable(t){this.mask|=1<<t|0}enableAll(){this.mask=-1}toggle(t){this.mask^=1<<t|0}disable(t){this.mask&=~(1<<t|0)}disableAll(){this.mask=0}test(t){return(this.mask&t.mask)!==0}isEnabled(t){return(this.mask&(1<<t|0))!==0}},wu=0,Wc=new D,_i=new gn,hn=new ae,Zs=new D,Zi=new D,Au=new D,Cu=new gn,Xc=new D(1,0,0),qc=new D(0,1,0),Yc=new D(0,0,1),$c={type:"added"},Ru={type:"removed"},xi={type:"childadded",child:null},to={type:"childremoved",child:null},Se=class i extends mn{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:wu++}),this.uuid=si(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=i.DEFAULT_UP.clone();let t=new D,e=new Ye,n=new gn,s=new D(1,1,1);function r(){n.setFromEuler(e,!1)}function a(){e.setFromQuaternion(n,void 0,!1)}e._onChange(r),n._onChange(a),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:e},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:s},modelViewMatrix:{value:new ae},normalMatrix:{value:new Wt}}),this.matrix=new ae,this.matrixWorld=new ae,this.matrixAutoUpdate=i.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=i.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Pi,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(t){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(t),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(t){return this.quaternion.premultiply(t),this}setRotationFromAxisAngle(t,e){this.quaternion.setFromAxisAngle(t,e)}setRotationFromEuler(t){this.quaternion.setFromEuler(t,!0)}setRotationFromMatrix(t){this.quaternion.setFromRotationMatrix(t)}setRotationFromQuaternion(t){this.quaternion.copy(t)}rotateOnAxis(t,e){return _i.setFromAxisAngle(t,e),this.quaternion.multiply(_i),this}rotateOnWorldAxis(t,e){return _i.setFromAxisAngle(t,e),this.quaternion.premultiply(_i),this}rotateX(t){return this.rotateOnAxis(Xc,t)}rotateY(t){return this.rotateOnAxis(qc,t)}rotateZ(t){return this.rotateOnAxis(Yc,t)}translateOnAxis(t,e){return Wc.copy(t).applyQuaternion(this.quaternion),this.position.add(Wc.multiplyScalar(e)),this}translateX(t){return this.translateOnAxis(Xc,t)}translateY(t){return this.translateOnAxis(qc,t)}translateZ(t){return this.translateOnAxis(Yc,t)}localToWorld(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(this.matrixWorld)}worldToLocal(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(hn.copy(this.matrixWorld).invert())}lookAt(t,e,n){t.isVector3?Zs.copy(t):Zs.set(t,e,n);let s=this.parent;this.updateWorldMatrix(!0,!1),Zi.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?hn.lookAt(Zi,Zs,this.up):hn.lookAt(Zs,Zi,this.up),this.quaternion.setFromRotationMatrix(hn),s&&(hn.extractRotation(s.matrixWorld),_i.setFromRotationMatrix(hn),this.quaternion.premultiply(_i.invert()))}add(t){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return t===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",t),this):(t&&t.isObject3D?(t.removeFromParent(),t.parent=this,this.children.push(t),t.dispatchEvent($c),xi.child=t,this.dispatchEvent(xi),xi.child=null):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",t),this)}remove(t){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}let e=this.children.indexOf(t);return e!==-1&&(t.parent=null,this.children.splice(e,1),t.dispatchEvent(Ru),to.child=t,this.dispatchEvent(to),to.child=null),this}removeFromParent(){let t=this.parent;return t!==null&&t.remove(this),this}clear(){return this.remove(...this.children)}attach(t){return this.updateWorldMatrix(!0,!1),hn.copy(this.matrixWorld).invert(),t.parent!==null&&(t.parent.updateWorldMatrix(!0,!1),hn.multiply(t.parent.matrixWorld)),t.applyMatrix4(hn),t.removeFromParent(),t.parent=this,this.children.push(t),t.updateWorldMatrix(!1,!0),t.dispatchEvent($c),xi.child=t,this.dispatchEvent(xi),xi.child=null,this}getObjectById(t){return this.getObjectByProperty("id",t)}getObjectByName(t){return this.getObjectByProperty("name",t)}getObjectByProperty(t,e){if(this[t]===e)return this;for(let n=0,s=this.children.length;n<s;n++){let a=this.children[n].getObjectByProperty(t,e);if(a!==void 0)return a}}getObjectsByProperty(t,e,n=[]){this[t]===e&&n.push(this);let s=this.children;for(let r=0,a=s.length;r<a;r++)s[r].getObjectsByProperty(t,e,n);return n}getWorldPosition(t){return this.updateWorldMatrix(!0,!1),t.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Zi,t,Au),t}getWorldScale(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Zi,Cu,t),t}getWorldDirection(t){this.updateWorldMatrix(!0,!1);let e=this.matrixWorld.elements;return t.set(e[8],e[9],e[10]).normalize()}raycast(){}traverse(t){t(this);let e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].traverse(t)}traverseVisible(t){if(this.visible===!1)return;t(this);let e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].traverseVisible(t)}traverseAncestors(t){let e=this.parent;e!==null&&(t(e),e.traverseAncestors(t))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(t){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||t)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,t=!0);let e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].updateMatrixWorld(t)}updateWorldMatrix(t,e){let n=this.parent;if(t===!0&&n!==null&&n.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),e===!0){let s=this.children;for(let r=0,a=s.length;r<a;r++)s[r].updateWorldMatrix(!1,!0)}}toJSON(t){let e=t===void 0||typeof t=="string",n={};e&&(t={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});let s={};s.uuid=this.uuid,s.type=this.type,this.name!==""&&(s.name=this.name),this.castShadow===!0&&(s.castShadow=!0),this.receiveShadow===!0&&(s.receiveShadow=!0),this.visible===!1&&(s.visible=!1),this.frustumCulled===!1&&(s.frustumCulled=!1),this.renderOrder!==0&&(s.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(s.userData=this.userData),s.layers=this.layers.mask,s.matrix=this.matrix.toArray(),s.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(s.matrixAutoUpdate=!1),this.isInstancedMesh&&(s.type="InstancedMesh",s.count=this.count,s.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(s.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(s.type="BatchedMesh",s.perObjectFrustumCulled=this.perObjectFrustumCulled,s.sortObjects=this.sortObjects,s.drawRanges=this._drawRanges,s.reservedRanges=this._reservedRanges,s.geometryInfo=this._geometryInfo.map(o=>({...o,boundingBox:o.boundingBox?o.boundingBox.toJSON():void 0,boundingSphere:o.boundingSphere?o.boundingSphere.toJSON():void 0})),s.instanceInfo=this._instanceInfo.map(o=>({...o})),s.availableInstanceIds=this._availableInstanceIds.slice(),s.availableGeometryIds=this._availableGeometryIds.slice(),s.nextIndexStart=this._nextIndexStart,s.nextVertexStart=this._nextVertexStart,s.geometryCount=this._geometryCount,s.maxInstanceCount=this._maxInstanceCount,s.maxVertexCount=this._maxVertexCount,s.maxIndexCount=this._maxIndexCount,s.geometryInitialized=this._geometryInitialized,s.matricesTexture=this._matricesTexture.toJSON(t),s.indirectTexture=this._indirectTexture.toJSON(t),this._colorsTexture!==null&&(s.colorsTexture=this._colorsTexture.toJSON(t)),this.boundingSphere!==null&&(s.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(s.boundingBox=this.boundingBox.toJSON()));function r(o,c){return o[c.uuid]===void 0&&(o[c.uuid]=c.toJSON(t)),c.uuid}if(this.isScene)this.background&&(this.background.isColor?s.background=this.background.toJSON():this.background.isTexture&&(s.background=this.background.toJSON(t).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(s.environment=this.environment.toJSON(t).uuid);else if(this.isMesh||this.isLine||this.isPoints){s.geometry=r(t.geometries,this.geometry);let o=this.geometry.parameters;if(o!==void 0&&o.shapes!==void 0){let c=o.shapes;if(Array.isArray(c))for(let l=0,h=c.length;l<h;l++){let u=c[l];r(t.shapes,u)}else r(t.shapes,c)}}if(this.isSkinnedMesh&&(s.bindMode=this.bindMode,s.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(t.skeletons,this.skeleton),s.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){let o=[];for(let c=0,l=this.material.length;c<l;c++)o.push(r(t.materials,this.material[c]));s.material=o}else s.material=r(t.materials,this.material);if(this.children.length>0){s.children=[];for(let o=0;o<this.children.length;o++)s.children.push(this.children[o].toJSON(t).object)}if(this.animations.length>0){s.animations=[];for(let o=0;o<this.animations.length;o++){let c=this.animations[o];s.animations.push(r(t.animations,c))}}if(e){let o=a(t.geometries),c=a(t.materials),l=a(t.textures),h=a(t.images),u=a(t.shapes),d=a(t.skeletons),p=a(t.animations),m=a(t.nodes);o.length>0&&(n.geometries=o),c.length>0&&(n.materials=c),l.length>0&&(n.textures=l),h.length>0&&(n.images=h),u.length>0&&(n.shapes=u),d.length>0&&(n.skeletons=d),p.length>0&&(n.animations=p),m.length>0&&(n.nodes=m)}return n.object=s,n;function a(o){let c=[];for(let l in o){let h=o[l];delete h.metadata,c.push(h)}return c}}clone(t){return new this.constructor().copy(this,t)}copy(t,e=!0){if(this.name=t.name,this.up.copy(t.up),this.position.copy(t.position),this.rotation.order=t.rotation.order,this.quaternion.copy(t.quaternion),this.scale.copy(t.scale),this.matrix.copy(t.matrix),this.matrixWorld.copy(t.matrixWorld),this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrixWorldAutoUpdate=t.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=t.matrixWorldNeedsUpdate,this.layers.mask=t.layers.mask,this.visible=t.visible,this.castShadow=t.castShadow,this.receiveShadow=t.receiveShadow,this.frustumCulled=t.frustumCulled,this.renderOrder=t.renderOrder,this.animations=t.animations.slice(),this.userData=JSON.parse(JSON.stringify(t.userData)),e===!0)for(let n=0;n<t.children.length;n++){let s=t.children[n];this.add(s.clone())}return this}};Se.DEFAULT_UP=new D(0,1,0);Se.DEFAULT_MATRIX_AUTO_UPDATE=!0;Se.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var We=new D,un=new D,eo=new D,dn=new D,vi=new D,yi=new D,Zc=new D,no=new D,io=new D,so=new D,ro=new jt,ao=new jt,oo=new jt,Cn=class i{constructor(t=new D,e=new D,n=new D){this.a=t,this.b=e,this.c=n}static getNormal(t,e,n,s){s.subVectors(n,e),We.subVectors(t,e),s.cross(We);let r=s.lengthSq();return r>0?s.multiplyScalar(1/Math.sqrt(r)):s.set(0,0,0)}static getBarycoord(t,e,n,s,r){We.subVectors(s,e),un.subVectors(n,e),eo.subVectors(t,e);let a=We.dot(We),o=We.dot(un),c=We.dot(eo),l=un.dot(un),h=un.dot(eo),u=a*l-o*o;if(u===0)return r.set(0,0,0),null;let d=1/u,p=(l*c-o*h)*d,m=(a*h-o*c)*d;return r.set(1-p-m,m,p)}static containsPoint(t,e,n,s){return this.getBarycoord(t,e,n,s,dn)===null?!1:dn.x>=0&&dn.y>=0&&dn.x+dn.y<=1}static getInterpolation(t,e,n,s,r,a,o,c){return this.getBarycoord(t,e,n,s,dn)===null?(c.x=0,c.y=0,"z"in c&&(c.z=0),"w"in c&&(c.w=0),null):(c.setScalar(0),c.addScaledVector(r,dn.x),c.addScaledVector(a,dn.y),c.addScaledVector(o,dn.z),c)}static getInterpolatedAttribute(t,e,n,s,r,a){return ro.setScalar(0),ao.setScalar(0),oo.setScalar(0),ro.fromBufferAttribute(t,e),ao.fromBufferAttribute(t,n),oo.fromBufferAttribute(t,s),a.setScalar(0),a.addScaledVector(ro,r.x),a.addScaledVector(ao,r.y),a.addScaledVector(oo,r.z),a}static isFrontFacing(t,e,n,s){return We.subVectors(n,e),un.subVectors(t,e),We.cross(un).dot(s)<0}set(t,e,n){return this.a.copy(t),this.b.copy(e),this.c.copy(n),this}setFromPointsAndIndices(t,e,n,s){return this.a.copy(t[e]),this.b.copy(t[n]),this.c.copy(t[s]),this}setFromAttributeAndIndices(t,e,n,s){return this.a.fromBufferAttribute(t,e),this.b.fromBufferAttribute(t,n),this.c.fromBufferAttribute(t,s),this}clone(){return new this.constructor().copy(this)}copy(t){return this.a.copy(t.a),this.b.copy(t.b),this.c.copy(t.c),this}getArea(){return We.subVectors(this.c,this.b),un.subVectors(this.a,this.b),We.cross(un).length()*.5}getMidpoint(t){return t.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return i.getNormal(this.a,this.b,this.c,t)}getPlane(t){return t.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,e){return i.getBarycoord(t,this.a,this.b,this.c,e)}getInterpolation(t,e,n,s,r){return i.getInterpolation(t,this.a,this.b,this.c,e,n,s,r)}containsPoint(t){return i.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return i.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(t){return t.intersectsTriangle(this)}closestPointToPoint(t,e){let n=this.a,s=this.b,r=this.c,a,o;vi.subVectors(s,n),yi.subVectors(r,n),no.subVectors(t,n);let c=vi.dot(no),l=yi.dot(no);if(c<=0&&l<=0)return e.copy(n);io.subVectors(t,s);let h=vi.dot(io),u=yi.dot(io);if(h>=0&&u<=h)return e.copy(s);let d=c*u-h*l;if(d<=0&&c>=0&&h<=0)return a=c/(c-h),e.copy(n).addScaledVector(vi,a);so.subVectors(t,r);let p=vi.dot(so),m=yi.dot(so);if(m>=0&&p<=m)return e.copy(r);let v=p*l-c*m;if(v<=0&&l>=0&&m<=0)return o=l/(l-m),e.copy(n).addScaledVector(yi,o);let g=h*m-p*u;if(g<=0&&u-h>=0&&p-m>=0)return Zc.subVectors(r,s),o=(u-h)/(u-h+(p-m)),e.copy(s).addScaledVector(Zc,o);let f=1/(g+v+d);return a=v*f,o=d*f,e.copy(n).addScaledVector(vi,a).addScaledVector(yi,o)}equals(t){return t.a.equals(this.a)&&t.b.equals(this.b)&&t.c.equals(this.c)}},jl={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},wn={h:0,s:0,l:0},Js={h:0,s:0,l:0};function co(i,t,e){return e<0&&(e+=1),e>1&&(e-=1),e<1/6?i+(t-i)*6*e:e<1/2?t:e<2/3?i+(t-i)*6*(2/3-e):i}var $t=class{constructor(t,e,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(t,e,n)}set(t,e,n){if(e===void 0&&n===void 0){let s=t;s&&s.isColor?this.copy(s):typeof s=="number"?this.setHex(s):typeof s=="string"&&this.setStyle(s)}else this.setRGB(t,e,n);return this}setScalar(t){return this.r=t,this.g=t,this.b=t,this}setHex(t,e=ye){return t=Math.floor(t),this.r=(t>>16&255)/255,this.g=(t>>8&255)/255,this.b=(t&255)/255,Jt.colorSpaceToWorking(this,e),this}setRGB(t,e,n,s=Jt.workingColorSpace){return this.r=t,this.g=e,this.b=n,Jt.colorSpaceToWorking(this,s),this}setHSL(t,e,n,s=Jt.workingColorSpace){if(t=Zo(t,1),e=Yt(e,0,1),n=Yt(n,0,1),e===0)this.r=this.g=this.b=n;else{let r=n<=.5?n*(1+e):n+e-n*e,a=2*n-r;this.r=co(a,r,t+1/3),this.g=co(a,r,t),this.b=co(a,r,t-1/3)}return Jt.colorSpaceToWorking(this,s),this}setStyle(t,e=ye){function n(r){r!==void 0&&parseFloat(r)<1&&console.warn("THREE.Color: Alpha component of "+t+" will be ignored.")}let s;if(s=/^(\w+)\(([^\)]*)\)/.exec(t)){let r,a=s[1],o=s[2];switch(a){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,e);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,e);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,e);break;default:console.warn("THREE.Color: Unknown color model "+t)}}else if(s=/^\#([A-Fa-f\d]+)$/.exec(t)){let r=s[1],a=r.length;if(a===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,e);if(a===6)return this.setHex(parseInt(r,16),e);console.warn("THREE.Color: Invalid hex color "+t)}else if(t&&t.length>0)return this.setColorName(t,e);return this}setColorName(t,e=ye){let n=jl[t.toLowerCase()];return n!==void 0?this.setHex(n,e):console.warn("THREE.Color: Unknown color "+t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(t){return this.r=t.r,this.g=t.g,this.b=t.b,this}copySRGBToLinear(t){return this.r=fn(t.r),this.g=fn(t.g),this.b=fn(t.b),this}copyLinearToSRGB(t){return this.r=Ti(t.r),this.g=Ti(t.g),this.b=Ti(t.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(t=ye){return Jt.workingToColorSpace(ve.copy(this),t),Math.round(Yt(ve.r*255,0,255))*65536+Math.round(Yt(ve.g*255,0,255))*256+Math.round(Yt(ve.b*255,0,255))}getHexString(t=ye){return("000000"+this.getHex(t).toString(16)).slice(-6)}getHSL(t,e=Jt.workingColorSpace){Jt.workingToColorSpace(ve.copy(this),e);let n=ve.r,s=ve.g,r=ve.b,a=Math.max(n,s,r),o=Math.min(n,s,r),c,l,h=(o+a)/2;if(o===a)c=0,l=0;else{let u=a-o;switch(l=h<=.5?u/(a+o):u/(2-a-o),a){case n:c=(s-r)/u+(s<r?6:0);break;case s:c=(r-n)/u+2;break;case r:c=(n-s)/u+4;break}c/=6}return t.h=c,t.s=l,t.l=h,t}getRGB(t,e=Jt.workingColorSpace){return Jt.workingToColorSpace(ve.copy(this),e),t.r=ve.r,t.g=ve.g,t.b=ve.b,t}getStyle(t=ye){Jt.workingToColorSpace(ve.copy(this),t);let e=ve.r,n=ve.g,s=ve.b;return t!==ye?`color(${t} ${e.toFixed(3)} ${n.toFixed(3)} ${s.toFixed(3)})`:`rgb(${Math.round(e*255)},${Math.round(n*255)},${Math.round(s*255)})`}offsetHSL(t,e,n){return this.getHSL(wn),this.setHSL(wn.h+t,wn.s+e,wn.l+n)}add(t){return this.r+=t.r,this.g+=t.g,this.b+=t.b,this}addColors(t,e){return this.r=t.r+e.r,this.g=t.g+e.g,this.b=t.b+e.b,this}addScalar(t){return this.r+=t,this.g+=t,this.b+=t,this}sub(t){return this.r=Math.max(0,this.r-t.r),this.g=Math.max(0,this.g-t.g),this.b=Math.max(0,this.b-t.b),this}multiply(t){return this.r*=t.r,this.g*=t.g,this.b*=t.b,this}multiplyScalar(t){return this.r*=t,this.g*=t,this.b*=t,this}lerp(t,e){return this.r+=(t.r-this.r)*e,this.g+=(t.g-this.g)*e,this.b+=(t.b-this.b)*e,this}lerpColors(t,e,n){return this.r=t.r+(e.r-t.r)*n,this.g=t.g+(e.g-t.g)*n,this.b=t.b+(e.b-t.b)*n,this}lerpHSL(t,e){this.getHSL(wn),t.getHSL(Js);let n=ts(wn.h,Js.h,e),s=ts(wn.s,Js.s,e),r=ts(wn.l,Js.l,e);return this.setHSL(n,s,r),this}setFromVector3(t){return this.r=t.x,this.g=t.y,this.b=t.z,this}applyMatrix3(t){let e=this.r,n=this.g,s=this.b,r=t.elements;return this.r=r[0]*e+r[3]*n+r[6]*s,this.g=r[1]*e+r[4]*n+r[7]*s,this.b=r[2]*e+r[5]*n+r[8]*s,this}equals(t){return t.r===this.r&&t.g===this.g&&t.b===this.b}fromArray(t,e=0){return this.r=t[e],this.g=t[e+1],this.b=t[e+2],this}toArray(t=[],e=0){return t[e]=this.r,t[e+1]=this.g,t[e+2]=this.b,t}fromBufferAttribute(t,e){return this.r=t.getX(e),this.g=t.getY(e),this.b=t.getZ(e),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},ve=new $t;$t.NAMES=jl;var Iu=0,Ln=class extends mn{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Iu++}),this.uuid=si(),this.name="",this.type="Material",this.blending=Zn,this.side=pn,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=ur,this.blendDst=dr,this.blendEquation=In,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new $t(0,0,0),this.blendAlpha=0,this.depthFunc=Jn,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Mo,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=qn,this.stencilZFail=qn,this.stencilZPass=qn,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(t){this._alphaTest>0!=t>0&&this.version++,this._alphaTest=t}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(t){if(t!==void 0)for(let e in t){let n=t[e];if(n===void 0){console.warn(`THREE.Material: parameter '${e}' has value of undefined.`);continue}let s=this[e];if(s===void 0){console.warn(`THREE.Material: '${e}' is not a property of THREE.${this.type}.`);continue}s&&s.isColor?s.set(n):s&&s.isVector3&&n&&n.isVector3?s.copy(n):this[e]=n}}toJSON(t){let e=t===void 0||typeof t=="string";e&&(t={textures:{},images:{}});let n={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(t).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(t).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(t).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(t).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(t).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(t).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(t).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(t).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(t).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(t).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(t).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(t).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(t).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(t).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(t).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(t).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(t).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(t).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(t).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(t).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(t).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(t).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(t).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(t).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(t).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(t).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==Zn&&(n.blending=this.blending),this.side!==pn&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==ur&&(n.blendSrc=this.blendSrc),this.blendDst!==dr&&(n.blendDst=this.blendDst),this.blendEquation!==In&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==Jn&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==Mo&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==qn&&(n.stencilFail=this.stencilFail),this.stencilZFail!==qn&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==qn&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function s(r){let a=[];for(let o in r){let c=r[o];delete c.metadata,a.push(c)}return a}if(e){let r=s(t.textures),a=s(t.images);r.length>0&&(n.textures=r),a.length>0&&(n.images=a)}return n}clone(){return new this.constructor().copy(this)}copy(t){this.name=t.name,this.blending=t.blending,this.side=t.side,this.vertexColors=t.vertexColors,this.opacity=t.opacity,this.transparent=t.transparent,this.blendSrc=t.blendSrc,this.blendDst=t.blendDst,this.blendEquation=t.blendEquation,this.blendSrcAlpha=t.blendSrcAlpha,this.blendDstAlpha=t.blendDstAlpha,this.blendEquationAlpha=t.blendEquationAlpha,this.blendColor.copy(t.blendColor),this.blendAlpha=t.blendAlpha,this.depthFunc=t.depthFunc,this.depthTest=t.depthTest,this.depthWrite=t.depthWrite,this.stencilWriteMask=t.stencilWriteMask,this.stencilFunc=t.stencilFunc,this.stencilRef=t.stencilRef,this.stencilFuncMask=t.stencilFuncMask,this.stencilFail=t.stencilFail,this.stencilZFail=t.stencilZFail,this.stencilZPass=t.stencilZPass,this.stencilWrite=t.stencilWrite;let e=t.clippingPlanes,n=null;if(e!==null){let s=e.length;n=new Array(s);for(let r=0;r!==s;++r)n[r]=e[r].clone()}return this.clippingPlanes=n,this.clipIntersection=t.clipIntersection,this.clipShadows=t.clipShadows,this.shadowSide=t.shadowSide,this.colorWrite=t.colorWrite,this.precision=t.precision,this.polygonOffset=t.polygonOffset,this.polygonOffsetFactor=t.polygonOffsetFactor,this.polygonOffsetUnits=t.polygonOffsetUnits,this.dithering=t.dithering,this.alphaTest=t.alphaTest,this.alphaHash=t.alphaHash,this.alphaToCoverage=t.alphaToCoverage,this.premultipliedAlpha=t.premultipliedAlpha,this.forceSinglePass=t.forceSinglePass,this.visible=t.visible,this.toneMapped=t.toneMapped,this.userData=JSON.parse(JSON.stringify(t.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(t){t===!0&&this.version++}},Dn=class extends Ln{constructor(t){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new $t(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Ye,this.combine=Fo,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.fog=t.fog,this}};var de=new D,Ks=new gt,Pu=0,De=class{constructor(t,e,n=!1){if(Array.isArray(t))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:Pu++}),this.name="",this.array=t,this.itemSize=e,this.count=t!==void 0?t.length/e:0,this.normalized=n,this.usage=So,this.updateRanges=[],this.gpuType=rn,this.version=0}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.name=t.name,this.array=new t.array.constructor(t.array),this.itemSize=t.itemSize,this.count=t.count,this.normalized=t.normalized,this.usage=t.usage,this.gpuType=t.gpuType,this}copyAt(t,e,n){t*=this.itemSize,n*=e.itemSize;for(let s=0,r=this.itemSize;s<r;s++)this.array[t+s]=e.array[n+s];return this}copyArray(t){return this.array.set(t),this}applyMatrix3(t){if(this.itemSize===2)for(let e=0,n=this.count;e<n;e++)Ks.fromBufferAttribute(this,e),Ks.applyMatrix3(t),this.setXY(e,Ks.x,Ks.y);else if(this.itemSize===3)for(let e=0,n=this.count;e<n;e++)de.fromBufferAttribute(this,e),de.applyMatrix3(t),this.setXYZ(e,de.x,de.y,de.z);return this}applyMatrix4(t){for(let e=0,n=this.count;e<n;e++)de.fromBufferAttribute(this,e),de.applyMatrix4(t),this.setXYZ(e,de.x,de.y,de.z);return this}applyNormalMatrix(t){for(let e=0,n=this.count;e<n;e++)de.fromBufferAttribute(this,e),de.applyNormalMatrix(t),this.setXYZ(e,de.x,de.y,de.z);return this}transformDirection(t){for(let e=0,n=this.count;e<n;e++)de.fromBufferAttribute(this,e),de.transformDirection(t),this.setXYZ(e,de.x,de.y,de.z);return this}set(t,e=0){return this.array.set(t,e),this}getComponent(t,e){let n=this.array[t*this.itemSize+e];return this.normalized&&(n=Ei(n,this.array)),n}setComponent(t,e,n){return this.normalized&&(n=Te(n,this.array)),this.array[t*this.itemSize+e]=n,this}getX(t){let e=this.array[t*this.itemSize];return this.normalized&&(e=Ei(e,this.array)),e}setX(t,e){return this.normalized&&(e=Te(e,this.array)),this.array[t*this.itemSize]=e,this}getY(t){let e=this.array[t*this.itemSize+1];return this.normalized&&(e=Ei(e,this.array)),e}setY(t,e){return this.normalized&&(e=Te(e,this.array)),this.array[t*this.itemSize+1]=e,this}getZ(t){let e=this.array[t*this.itemSize+2];return this.normalized&&(e=Ei(e,this.array)),e}setZ(t,e){return this.normalized&&(e=Te(e,this.array)),this.array[t*this.itemSize+2]=e,this}getW(t){let e=this.array[t*this.itemSize+3];return this.normalized&&(e=Ei(e,this.array)),e}setW(t,e){return this.normalized&&(e=Te(e,this.array)),this.array[t*this.itemSize+3]=e,this}setXY(t,e,n){return t*=this.itemSize,this.normalized&&(e=Te(e,this.array),n=Te(n,this.array)),this.array[t+0]=e,this.array[t+1]=n,this}setXYZ(t,e,n,s){return t*=this.itemSize,this.normalized&&(e=Te(e,this.array),n=Te(n,this.array),s=Te(s,this.array)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=s,this}setXYZW(t,e,n,s,r){return t*=this.itemSize,this.normalized&&(e=Te(e,this.array),n=Te(n,this.array),s=Te(s,this.array),r=Te(r,this.array)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=s,this.array[t+3]=r,this}onUpload(t){return this.onUploadCallback=t,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let t={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(t.name=this.name),this.usage!==So&&(t.usage=this.usage),t}};var ls=class extends De{constructor(t,e,n){super(new Uint16Array(t),e,n)}};var hs=class extends De{constructor(t,e,n){super(new Uint32Array(t),e,n)}};var we=class extends De{constructor(t,e,n){super(new Float32Array(t),e,n)}},Lu=0,ze=new ae,lo=new Se,Mi=new D,Le=new Pn,Ji=new Pn,me=new D,tn=class i extends mn{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Lu++}),this.uuid=si(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(t){return Array.isArray(t)?this.index=new(Jo(t)?hs:ls)(t,1):this.index=t,this}setIndirect(t){return this.indirect=t,this}getIndirect(){return this.indirect}getAttribute(t){return this.attributes[t]}setAttribute(t,e){return this.attributes[t]=e,this}deleteAttribute(t){return delete this.attributes[t],this}hasAttribute(t){return this.attributes[t]!==void 0}addGroup(t,e,n=0){this.groups.push({start:t,count:e,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(t,e){this.drawRange.start=t,this.drawRange.count=e}applyMatrix4(t){let e=this.attributes.position;e!==void 0&&(e.applyMatrix4(t),e.needsUpdate=!0);let n=this.attributes.normal;if(n!==void 0){let r=new Wt().getNormalMatrix(t);n.applyNormalMatrix(r),n.needsUpdate=!0}let s=this.attributes.tangent;return s!==void 0&&(s.transformDirection(t),s.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(t){return ze.makeRotationFromQuaternion(t),this.applyMatrix4(ze),this}rotateX(t){return ze.makeRotationX(t),this.applyMatrix4(ze),this}rotateY(t){return ze.makeRotationY(t),this.applyMatrix4(ze),this}rotateZ(t){return ze.makeRotationZ(t),this.applyMatrix4(ze),this}translate(t,e,n){return ze.makeTranslation(t,e,n),this.applyMatrix4(ze),this}scale(t,e,n){return ze.makeScale(t,e,n),this.applyMatrix4(ze),this}lookAt(t){return lo.lookAt(t),lo.updateMatrix(),this.applyMatrix4(lo.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Mi).negate(),this.translate(Mi.x,Mi.y,Mi.z),this}setFromPoints(t){let e=this.getAttribute("position");if(e===void 0){let n=[];for(let s=0,r=t.length;s<r;s++){let a=t[s];n.push(a.x,a.y,a.z||0)}this.setAttribute("position",new we(n,3))}else{let n=Math.min(t.length,e.count);for(let s=0;s<n;s++){let r=t[s];e.setXYZ(s,r.x,r.y,r.z||0)}t.length>e.count&&console.warn("THREE.BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),e.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Pn);let t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new D(-1/0,-1/0,-1/0),new D(1/0,1/0,1/0));return}if(t!==void 0){if(this.boundingBox.setFromBufferAttribute(t),e)for(let n=0,s=e.length;n<s;n++){let r=e[n];Le.setFromBufferAttribute(r),this.morphTargetsRelative?(me.addVectors(this.boundingBox.min,Le.min),this.boundingBox.expandByPoint(me),me.addVectors(this.boundingBox.max,Le.max),this.boundingBox.expandByPoint(me)):(this.boundingBox.expandByPoint(Le.min),this.boundingBox.expandByPoint(Le.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Ii);let t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new D,1/0);return}if(t){let n=this.boundingSphere.center;if(Le.setFromBufferAttribute(t),e)for(let r=0,a=e.length;r<a;r++){let o=e[r];Ji.setFromBufferAttribute(o),this.morphTargetsRelative?(me.addVectors(Le.min,Ji.min),Le.expandByPoint(me),me.addVectors(Le.max,Ji.max),Le.expandByPoint(me)):(Le.expandByPoint(Ji.min),Le.expandByPoint(Ji.max))}Le.getCenter(n);let s=0;for(let r=0,a=t.count;r<a;r++)me.fromBufferAttribute(t,r),s=Math.max(s,n.distanceToSquared(me));if(e)for(let r=0,a=e.length;r<a;r++){let o=e[r],c=this.morphTargetsRelative;for(let l=0,h=o.count;l<h;l++)me.fromBufferAttribute(o,l),c&&(Mi.fromBufferAttribute(t,l),me.add(Mi)),s=Math.max(s,n.distanceToSquared(me))}this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let t=this.index,e=this.attributes;if(t===null||e.position===void 0||e.normal===void 0||e.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let n=e.position,s=e.normal,r=e.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new De(new Float32Array(4*n.count),4));let a=this.getAttribute("tangent"),o=[],c=[];for(let U=0;U<n.count;U++)o[U]=new D,c[U]=new D;let l=new D,h=new D,u=new D,d=new gt,p=new gt,m=new gt,v=new D,g=new D;function f(U,S,x){l.fromBufferAttribute(n,U),h.fromBufferAttribute(n,S),u.fromBufferAttribute(n,x),d.fromBufferAttribute(r,U),p.fromBufferAttribute(r,S),m.fromBufferAttribute(r,x),h.sub(l),u.sub(l),p.sub(d),m.sub(d);let A=1/(p.x*m.y-m.x*p.y);isFinite(A)&&(v.copy(h).multiplyScalar(m.y).addScaledVector(u,-p.y).multiplyScalar(A),g.copy(u).multiplyScalar(p.x).addScaledVector(h,-m.x).multiplyScalar(A),o[U].add(v),o[S].add(v),o[x].add(v),c[U].add(g),c[S].add(g),c[x].add(g))}let w=this.groups;w.length===0&&(w=[{start:0,count:t.count}]);for(let U=0,S=w.length;U<S;++U){let x=w[U],A=x.start,N=x.count;for(let k=A,G=A+N;k<G;k+=3)f(t.getX(k+0),t.getX(k+1),t.getX(k+2))}let E=new D,M=new D,I=new D,C=new D;function P(U){I.fromBufferAttribute(s,U),C.copy(I);let S=o[U];E.copy(S),E.sub(I.multiplyScalar(I.dot(S))).normalize(),M.crossVectors(C,S);let A=M.dot(c[U])<0?-1:1;a.setXYZW(U,E.x,E.y,E.z,A)}for(let U=0,S=w.length;U<S;++U){let x=w[U],A=x.start,N=x.count;for(let k=A,G=A+N;k<G;k+=3)P(t.getX(k+0)),P(t.getX(k+1)),P(t.getX(k+2))}}computeVertexNormals(){let t=this.index,e=this.getAttribute("position");if(e!==void 0){let n=this.getAttribute("normal");if(n===void 0)n=new De(new Float32Array(e.count*3),3),this.setAttribute("normal",n);else for(let d=0,p=n.count;d<p;d++)n.setXYZ(d,0,0,0);let s=new D,r=new D,a=new D,o=new D,c=new D,l=new D,h=new D,u=new D;if(t)for(let d=0,p=t.count;d<p;d+=3){let m=t.getX(d+0),v=t.getX(d+1),g=t.getX(d+2);s.fromBufferAttribute(e,m),r.fromBufferAttribute(e,v),a.fromBufferAttribute(e,g),h.subVectors(a,r),u.subVectors(s,r),h.cross(u),o.fromBufferAttribute(n,m),c.fromBufferAttribute(n,v),l.fromBufferAttribute(n,g),o.add(h),c.add(h),l.add(h),n.setXYZ(m,o.x,o.y,o.z),n.setXYZ(v,c.x,c.y,c.z),n.setXYZ(g,l.x,l.y,l.z)}else for(let d=0,p=e.count;d<p;d+=3)s.fromBufferAttribute(e,d+0),r.fromBufferAttribute(e,d+1),a.fromBufferAttribute(e,d+2),h.subVectors(a,r),u.subVectors(s,r),h.cross(u),n.setXYZ(d+0,h.x,h.y,h.z),n.setXYZ(d+1,h.x,h.y,h.z),n.setXYZ(d+2,h.x,h.y,h.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){let t=this.attributes.normal;for(let e=0,n=t.count;e<n;e++)me.fromBufferAttribute(t,e),me.normalize(),t.setXYZ(e,me.x,me.y,me.z)}toNonIndexed(){function t(o,c){let l=o.array,h=o.itemSize,u=o.normalized,d=new l.constructor(c.length*h),p=0,m=0;for(let v=0,g=c.length;v<g;v++){o.isInterleavedBufferAttribute?p=c[v]*o.data.stride+o.offset:p=c[v]*h;for(let f=0;f<h;f++)d[m++]=l[p++]}return new De(d,h,u)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let e=new i,n=this.index.array,s=this.attributes;for(let o in s){let c=s[o],l=t(c,n);e.setAttribute(o,l)}let r=this.morphAttributes;for(let o in r){let c=[],l=r[o];for(let h=0,u=l.length;h<u;h++){let d=l[h],p=t(d,n);c.push(p)}e.morphAttributes[o]=c}e.morphTargetsRelative=this.morphTargetsRelative;let a=this.groups;for(let o=0,c=a.length;o<c;o++){let l=a[o];e.addGroup(l.start,l.count,l.materialIndex)}return e}toJSON(){let t={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(t.uuid=this.uuid,t.type=this.type,this.name!==""&&(t.name=this.name),Object.keys(this.userData).length>0&&(t.userData=this.userData),this.parameters!==void 0){let c=this.parameters;for(let l in c)c[l]!==void 0&&(t[l]=c[l]);return t}t.data={attributes:{}};let e=this.index;e!==null&&(t.data.index={type:e.array.constructor.name,array:Array.prototype.slice.call(e.array)});let n=this.attributes;for(let c in n){let l=n[c];t.data.attributes[c]=l.toJSON(t.data)}let s={},r=!1;for(let c in this.morphAttributes){let l=this.morphAttributes[c],h=[];for(let u=0,d=l.length;u<d;u++){let p=l[u];h.push(p.toJSON(t.data))}h.length>0&&(s[c]=h,r=!0)}r&&(t.data.morphAttributes=s,t.data.morphTargetsRelative=this.morphTargetsRelative);let a=this.groups;a.length>0&&(t.data.groups=JSON.parse(JSON.stringify(a)));let o=this.boundingSphere;return o!==null&&(t.data.boundingSphere=o.toJSON()),t}clone(){return new this.constructor().copy(this)}copy(t){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let e={};this.name=t.name;let n=t.index;n!==null&&this.setIndex(n.clone());let s=t.attributes;for(let l in s){let h=s[l];this.setAttribute(l,h.clone(e))}let r=t.morphAttributes;for(let l in r){let h=[],u=r[l];for(let d=0,p=u.length;d<p;d++)h.push(u[d].clone(e));this.morphAttributes[l]=h}this.morphTargetsRelative=t.morphTargetsRelative;let a=t.groups;for(let l=0,h=a.length;l<h;l++){let u=a[l];this.addGroup(u.start,u.count,u.materialIndex)}let o=t.boundingBox;o!==null&&(this.boundingBox=o.clone());let c=t.boundingSphere;return c!==null&&(this.boundingSphere=c.clone()),this.drawRange.start=t.drawRange.start,this.drawRange.count=t.drawRange.count,this.userData=t.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}},Jc=new ae,Wn=new cs,Qs=new Ii,Kc=new D,js=new D,tr=new D,er=new D,ho=new D,nr=new D,Qc=new D,ir=new D,ge=class extends Se{constructor(t=new tn,e=new Dn){super(),this.isMesh=!0,this.type="Mesh",this.geometry=t,this.material=e,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),t.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=t.morphTargetInfluences.slice()),t.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},t.morphTargetDictionary)),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}updateMorphTargets(){let e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){let s=e[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,a=s.length;r<a;r++){let o=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=r}}}}getVertexPosition(t,e){let n=this.geometry,s=n.attributes.position,r=n.morphAttributes.position,a=n.morphTargetsRelative;e.fromBufferAttribute(s,t);let o=this.morphTargetInfluences;if(r&&o){nr.set(0,0,0);for(let c=0,l=r.length;c<l;c++){let h=o[c],u=r[c];h!==0&&(ho.fromBufferAttribute(u,t),a?nr.addScaledVector(ho,h):nr.addScaledVector(ho.sub(e),h))}e.add(nr)}return e}raycast(t,e){let n=this.geometry,s=this.material,r=this.matrixWorld;s!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),Qs.copy(n.boundingSphere),Qs.applyMatrix4(r),Wn.copy(t.ray).recast(t.near),!(Qs.containsPoint(Wn.origin)===!1&&(Wn.intersectSphere(Qs,Kc)===null||Wn.origin.distanceToSquared(Kc)>(t.far-t.near)**2))&&(Jc.copy(r).invert(),Wn.copy(t.ray).applyMatrix4(Jc),!(n.boundingBox!==null&&Wn.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(t,e,Wn)))}_computeIntersections(t,e,n){let s,r=this.geometry,a=this.material,o=r.index,c=r.attributes.position,l=r.attributes.uv,h=r.attributes.uv1,u=r.attributes.normal,d=r.groups,p=r.drawRange;if(o!==null)if(Array.isArray(a))for(let m=0,v=d.length;m<v;m++){let g=d[m],f=a[g.materialIndex],w=Math.max(g.start,p.start),E=Math.min(o.count,Math.min(g.start+g.count,p.start+p.count));for(let M=w,I=E;M<I;M+=3){let C=o.getX(M),P=o.getX(M+1),U=o.getX(M+2);s=sr(this,f,t,n,l,h,u,C,P,U),s&&(s.faceIndex=Math.floor(M/3),s.face.materialIndex=g.materialIndex,e.push(s))}}else{let m=Math.max(0,p.start),v=Math.min(o.count,p.start+p.count);for(let g=m,f=v;g<f;g+=3){let w=o.getX(g),E=o.getX(g+1),M=o.getX(g+2);s=sr(this,a,t,n,l,h,u,w,E,M),s&&(s.faceIndex=Math.floor(g/3),e.push(s))}}else if(c!==void 0)if(Array.isArray(a))for(let m=0,v=d.length;m<v;m++){let g=d[m],f=a[g.materialIndex],w=Math.max(g.start,p.start),E=Math.min(c.count,Math.min(g.start+g.count,p.start+p.count));for(let M=w,I=E;M<I;M+=3){let C=M,P=M+1,U=M+2;s=sr(this,f,t,n,l,h,u,C,P,U),s&&(s.faceIndex=Math.floor(M/3),s.face.materialIndex=g.materialIndex,e.push(s))}}else{let m=Math.max(0,p.start),v=Math.min(c.count,p.start+p.count);for(let g=m,f=v;g<f;g+=3){let w=g,E=g+1,M=g+2;s=sr(this,a,t,n,l,h,u,w,E,M),s&&(s.faceIndex=Math.floor(g/3),e.push(s))}}}};function Du(i,t,e,n,s,r,a,o){let c;if(t.side===Ae?c=n.intersectTriangle(a,r,s,!0,o):c=n.intersectTriangle(s,r,a,t.side===pn,o),c===null)return null;ir.copy(o),ir.applyMatrix4(i.matrixWorld);let l=e.ray.origin.distanceTo(ir);return l<e.near||l>e.far?null:{distance:l,point:ir.clone(),object:i}}function sr(i,t,e,n,s,r,a,o,c,l){i.getVertexPosition(o,js),i.getVertexPosition(c,tr),i.getVertexPosition(l,er);let h=Du(i,t,e,n,js,tr,er,Qc);if(h){let u=new D;Cn.getBarycoord(Qc,js,tr,er,u),s&&(h.uv=Cn.getInterpolatedAttribute(s,o,c,l,u,new gt)),r&&(h.uv1=Cn.getInterpolatedAttribute(r,o,c,l,u,new gt)),a&&(h.normal=Cn.getInterpolatedAttribute(a,o,c,l,u,new D),h.normal.dot(n.direction)>0&&h.normal.multiplyScalar(-1));let d={a:o,b:c,c:l,normal:new D,materialIndex:0};Cn.getNormal(js,tr,er,d.normal),h.face=d,h.barycoord=u}return h}var Un=class i extends tn{constructor(t=1,e=1,n=1,s=1,r=1,a=1){super(),this.type="BoxGeometry",this.parameters={width:t,height:e,depth:n,widthSegments:s,heightSegments:r,depthSegments:a};let o=this;s=Math.floor(s),r=Math.floor(r),a=Math.floor(a);let c=[],l=[],h=[],u=[],d=0,p=0;m("z","y","x",-1,-1,n,e,t,a,r,0),m("z","y","x",1,-1,n,e,-t,a,r,1),m("x","z","y",1,1,t,n,e,s,a,2),m("x","z","y",1,-1,t,n,-e,s,a,3),m("x","y","z",1,-1,t,e,n,s,r,4),m("x","y","z",-1,-1,t,e,-n,s,r,5),this.setIndex(c),this.setAttribute("position",new we(l,3)),this.setAttribute("normal",new we(h,3)),this.setAttribute("uv",new we(u,2));function m(v,g,f,w,E,M,I,C,P,U,S){let x=M/P,A=I/U,N=M/2,k=I/2,G=C/2,V=P+1,q=U+1,nt=0,X=0,ot=new D;for(let it=0;it<q;it++){let rt=it*A-k;for(let _t=0;_t<V;_t++){let bt=_t*x-N;ot[v]=bt*w,ot[g]=rt*E,ot[f]=G,l.push(ot.x,ot.y,ot.z),ot[v]=0,ot[g]=0,ot[f]=C>0?1:-1,h.push(ot.x,ot.y,ot.z),u.push(_t/P),u.push(1-it/U),nt+=1}}for(let it=0;it<U;it++)for(let rt=0;rt<P;rt++){let _t=d+rt+V*it,bt=d+rt+V*(it+1),Dt=d+(rt+1)+V*(it+1),Ut=d+(rt+1)+V*it;c.push(_t,bt,Ut),c.push(bt,Dt,Ut),X+=6}o.addGroup(p,X,S),p+=X,d+=nt}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}};function ri(i){let t={};for(let e in i){t[e]={};for(let n in i[e]){let s=i[e][n];s&&(s.isColor||s.isMatrix3||s.isMatrix4||s.isVector2||s.isVector3||s.isVector4||s.isTexture||s.isQuaternion)?s.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),t[e][n]=null):t[e][n]=s.clone():Array.isArray(s)?t[e][n]=s.slice():t[e][n]=s}}return t}function be(i){let t={};for(let e=0;e<i.length;e++){let n=ri(i[e]);for(let s in n)t[s]=n[s]}return t}function Uu(i){let t=[];for(let e=0;e<i.length;e++)t.push(i[e].clone());return t}function Ko(i){let t=i.getRenderTarget();return t===null?i.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:Jt.workingColorSpace}var th={clone:ri,merge:be},Nu=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,Fu=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,$e=class extends Ln{constructor(t){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=Nu,this.fragmentShader=Fu,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,t!==void 0&&this.setValues(t)}copy(t){return super.copy(t),this.fragmentShader=t.fragmentShader,this.vertexShader=t.vertexShader,this.uniforms=ri(t.uniforms),this.uniformsGroups=Uu(t.uniformsGroups),this.defines=Object.assign({},t.defines),this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.fog=t.fog,this.lights=t.lights,this.clipping=t.clipping,this.extensions=Object.assign({},t.extensions),this.glslVersion=t.glslVersion,this}toJSON(t){let e=super.toJSON(t);e.glslVersion=this.glslVersion,e.uniforms={};for(let s in this.uniforms){let a=this.uniforms[s].value;a&&a.isTexture?e.uniforms[s]={type:"t",value:a.toJSON(t).uuid}:a&&a.isColor?e.uniforms[s]={type:"c",value:a.getHex()}:a&&a.isVector2?e.uniforms[s]={type:"v2",value:a.toArray()}:a&&a.isVector3?e.uniforms[s]={type:"v3",value:a.toArray()}:a&&a.isVector4?e.uniforms[s]={type:"v4",value:a.toArray()}:a&&a.isMatrix3?e.uniforms[s]={type:"m3",value:a.toArray()}:a&&a.isMatrix4?e.uniforms[s]={type:"m4",value:a.toArray()}:e.uniforms[s]={value:a}}Object.keys(this.defines).length>0&&(e.defines=this.defines),e.vertexShader=this.vertexShader,e.fragmentShader=this.fragmentShader,e.lights=this.lights,e.clipping=this.clipping;let n={};for(let s in this.extensions)this.extensions[s]===!0&&(n[s]=!0);return Object.keys(n).length>0&&(e.extensions=n),e}},us=class extends Se{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new ae,this.projectionMatrix=new ae,this.projectionMatrixInverse=new ae,this.coordinateSystem=Xe,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(t,e){return super.copy(t,e),this.matrixWorldInverse.copy(t.matrixWorldInverse),this.projectionMatrix.copy(t.projectionMatrix),this.projectionMatrixInverse.copy(t.projectionMatrixInverse),this.coordinateSystem=t.coordinateSystem,this}getWorldDirection(t){return super.getWorldDirection(t).negate()}updateMatrixWorld(t){super.updateMatrixWorld(t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(t,e){super.updateWorldMatrix(t,e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}},An=new D,jc=new gt,tl=new gt,_e=class extends us{constructor(t=50,e=1,n=.1,s=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=t,this.zoom=1,this.near=n,this.far=s,this.focus=10,this.aspect=e,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.fov=t.fov,this.zoom=t.zoom,this.near=t.near,this.far=t.far,this.focus=t.focus,this.aspect=t.aspect,this.view=t.view===null?null:Object.assign({},t.view),this.filmGauge=t.filmGauge,this.filmOffset=t.filmOffset,this}setFocalLength(t){let e=.5*this.getFilmHeight()/t;this.fov=Ai*2*Math.atan(e),this.updateProjectionMatrix()}getFocalLength(){let t=Math.tan(ji*.5*this.fov);return .5*this.getFilmHeight()/t}getEffectiveFOV(){return Ai*2*Math.atan(Math.tan(ji*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(t,e,n){An.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),e.set(An.x,An.y).multiplyScalar(-t/An.z),An.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(An.x,An.y).multiplyScalar(-t/An.z)}getViewSize(t,e){return this.getViewBounds(t,jc,tl),e.subVectors(tl,jc)}setViewOffset(t,e,n,s,r,a){this.aspect=t/e,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let t=this.near,e=t*Math.tan(ji*.5*this.fov)/this.zoom,n=2*e,s=this.aspect*n,r=-.5*s,a=this.view;if(this.view!==null&&this.view.enabled){let c=a.fullWidth,l=a.fullHeight;r+=a.offsetX*s/c,e-=a.offsetY*n/l,s*=a.width/c,n*=a.height/l}let o=this.filmOffset;o!==0&&(r+=t*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+s,e,e-n,t,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){let e=super.toJSON(t);return e.object.fov=this.fov,e.object.zoom=this.zoom,e.object.near=this.near,e.object.far=this.far,e.object.focus=this.focus,e.object.aspect=this.aspect,this.view!==null&&(e.object.view=Object.assign({},this.view)),e.object.filmGauge=this.filmGauge,e.object.filmOffset=this.filmOffset,e}},Si=-90,bi=1,vr=class extends Se{constructor(t,e,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;let s=new _e(Si,bi,t,e);s.layers=this.layers,this.add(s);let r=new _e(Si,bi,t,e);r.layers=this.layers,this.add(r);let a=new _e(Si,bi,t,e);a.layers=this.layers,this.add(a);let o=new _e(Si,bi,t,e);o.layers=this.layers,this.add(o);let c=new _e(Si,bi,t,e);c.layers=this.layers,this.add(c);let l=new _e(Si,bi,t,e);l.layers=this.layers,this.add(l)}updateCoordinateSystem(){let t=this.coordinateSystem,e=this.children.concat(),[n,s,r,a,o,c]=e;for(let l of e)this.remove(l);if(t===Xe)n.up.set(0,1,0),n.lookAt(1,0,0),s.up.set(0,1,0),s.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),a.up.set(0,0,1),a.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),c.up.set(0,1,0),c.lookAt(0,0,-1);else if(t===rs)n.up.set(0,-1,0),n.lookAt(-1,0,0),s.up.set(0,-1,0),s.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),a.up.set(0,0,-1),a.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),c.up.set(0,-1,0),c.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+t);for(let l of e)this.add(l),l.updateMatrixWorld()}update(t,e){this.parent===null&&this.updateMatrixWorld();let{renderTarget:n,activeMipmapLevel:s}=this;this.coordinateSystem!==t.coordinateSystem&&(this.coordinateSystem=t.coordinateSystem,this.updateCoordinateSystem());let[r,a,o,c,l,h]=this.children,u=t.getRenderTarget(),d=t.getActiveCubeFace(),p=t.getActiveMipmapLevel(),m=t.xr.enabled;t.xr.enabled=!1;let v=n.texture.generateMipmaps;n.texture.generateMipmaps=!1,t.setRenderTarget(n,0,s),t.render(e,r),t.setRenderTarget(n,1,s),t.render(e,a),t.setRenderTarget(n,2,s),t.render(e,o),t.setRenderTarget(n,3,s),t.render(e,c),t.setRenderTarget(n,4,s),t.render(e,l),n.texture.generateMipmaps=v,t.setRenderTarget(n,5,s),t.render(e,h),t.setRenderTarget(u,d,p),t.xr.enabled=m,n.texture.needsPMREMUpdate=!0}},ds=class extends Me{constructor(t=[],e=ni,n,s,r,a,o,c,l,h){super(t,e,n,s,r,a,o,c,l,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(t){this.image=t}},yr=class extends je{constructor(t=1,e={}){super(t,t,e),this.isWebGLCubeRenderTarget=!0;let n={width:t,height:t,depth:1},s=[n,n,n,n,n,n];this.texture=new ds(s),this._setTextureOptions(e),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(t,e){this.texture.type=e.type,this.texture.colorSpace=e.colorSpace,this.texture.generateMipmaps=e.generateMipmaps,this.texture.minFilter=e.minFilter,this.texture.magFilter=e.magFilter;let n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},s=new Un(5,5,5),r=new $e({name:"CubemapFromEquirect",uniforms:ri(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:Ae,blending:xn});r.uniforms.tEquirect.value=e;let a=new ge(s,r),o=e.minFilter;return e.minFilter===sn&&(e.minFilter=qe),new vr(1,10,this).update(t,a),e.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(t,e=!0,n=!0,s=!0){let r=t.getRenderTarget();for(let a=0;a<6;a++)t.setRenderTarget(this,a),t.clear(e,n,s);t.setRenderTarget(r)}},Yn=class extends Se{constructor(){super(),this.isGroup=!0,this.type="Group"}},Ou={type:"move"},Li=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Yn,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Yn,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new D,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new D),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Yn,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new D,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new D),this._grip}dispatchEvent(t){return this._targetRay!==null&&this._targetRay.dispatchEvent(t),this._grip!==null&&this._grip.dispatchEvent(t),this._hand!==null&&this._hand.dispatchEvent(t),this}connect(t){if(t&&t.hand){let e=this._hand;if(e)for(let n of t.hand.values())this._getHandJoint(e,n)}return this.dispatchEvent({type:"connected",data:t}),this}disconnect(t){return this.dispatchEvent({type:"disconnected",data:t}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(t,e,n){let s=null,r=null,a=null,o=this._targetRay,c=this._grip,l=this._hand;if(t&&e.session.visibilityState!=="visible-blurred"){if(l&&t.hand){a=!0;for(let v of t.hand.values()){let g=e.getJointPose(v,n),f=this._getHandJoint(l,v);g!==null&&(f.matrix.fromArray(g.transform.matrix),f.matrix.decompose(f.position,f.rotation,f.scale),f.matrixWorldNeedsUpdate=!0,f.jointRadius=g.radius),f.visible=g!==null}let h=l.joints["index-finger-tip"],u=l.joints["thumb-tip"],d=h.position.distanceTo(u.position),p=.02,m=.005;l.inputState.pinching&&d>p+m?(l.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:t.handedness,target:this})):!l.inputState.pinching&&d<=p-m&&(l.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:t.handedness,target:this}))}else c!==null&&t.gripSpace&&(r=e.getPose(t.gripSpace,n),r!==null&&(c.matrix.fromArray(r.transform.matrix),c.matrix.decompose(c.position,c.rotation,c.scale),c.matrixWorldNeedsUpdate=!0,r.linearVelocity?(c.hasLinearVelocity=!0,c.linearVelocity.copy(r.linearVelocity)):c.hasLinearVelocity=!1,r.angularVelocity?(c.hasAngularVelocity=!0,c.angularVelocity.copy(r.angularVelocity)):c.hasAngularVelocity=!1));o!==null&&(s=e.getPose(t.targetRaySpace,n),s===null&&r!==null&&(s=r),s!==null&&(o.matrix.fromArray(s.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,s.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(s.linearVelocity)):o.hasLinearVelocity=!1,s.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(s.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(Ou)))}return o!==null&&(o.visible=s!==null),c!==null&&(c.visible=r!==null),l!==null&&(l.visible=a!==null),this}_getHandJoint(t,e){if(t.joints[e.jointName]===void 0){let n=new Yn;n.matrixAutoUpdate=!1,n.visible=!1,t.joints[e.jointName]=n,t.add(n)}return t.joints[e.jointName]}};var fs=class extends Se{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new Ye,this.environmentIntensity=1,this.environmentRotation=new Ye,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(t,e){return super.copy(t,e),t.background!==null&&(this.background=t.background.clone()),t.environment!==null&&(this.environment=t.environment.clone()),t.fog!==null&&(this.fog=t.fog.clone()),this.backgroundBlurriness=t.backgroundBlurriness,this.backgroundIntensity=t.backgroundIntensity,this.backgroundRotation.copy(t.backgroundRotation),this.environmentIntensity=t.environmentIntensity,this.environmentRotation.copy(t.environmentRotation),t.overrideMaterial!==null&&(this.overrideMaterial=t.overrideMaterial.clone()),this.matrixAutoUpdate=t.matrixAutoUpdate,this}toJSON(t){let e=super.toJSON(t);return this.fog!==null&&(e.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(e.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(e.object.backgroundIntensity=this.backgroundIntensity),e.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(e.object.environmentIntensity=this.environmentIntensity),e.object.environmentRotation=this.environmentRotation.toArray(),e}};var uo=new D,Bu=new D,zu=new Wt,Qe=class{constructor(t=new D(1,0,0),e=0){this.isPlane=!0,this.normal=t,this.constant=e}set(t,e){return this.normal.copy(t),this.constant=e,this}setComponents(t,e,n,s){return this.normal.set(t,e,n),this.constant=s,this}setFromNormalAndCoplanarPoint(t,e){return this.normal.copy(t),this.constant=-e.dot(this.normal),this}setFromCoplanarPoints(t,e,n){let s=uo.subVectors(n,e).cross(Bu.subVectors(t,e)).normalize();return this.setFromNormalAndCoplanarPoint(s,t),this}copy(t){return this.normal.copy(t.normal),this.constant=t.constant,this}normalize(){let t=1/this.normal.length();return this.normal.multiplyScalar(t),this.constant*=t,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(t){return this.normal.dot(t)+this.constant}distanceToSphere(t){return this.distanceToPoint(t.center)-t.radius}projectPoint(t,e){return e.copy(t).addScaledVector(this.normal,-this.distanceToPoint(t))}intersectLine(t,e){let n=t.delta(uo),s=this.normal.dot(n);if(s===0)return this.distanceToPoint(t.start)===0?e.copy(t.start):null;let r=-(t.start.dot(this.normal)+this.constant)/s;return r<0||r>1?null:e.copy(t.start).addScaledVector(n,r)}intersectsLine(t){let e=this.distanceToPoint(t.start),n=this.distanceToPoint(t.end);return e<0&&n>0||n<0&&e>0}intersectsBox(t){return t.intersectsPlane(this)}intersectsSphere(t){return t.intersectsPlane(this)}coplanarPoint(t){return t.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(t,e){let n=e||zu.getNormalMatrix(t),s=this.coplanarPoint(uo).applyMatrix4(t),r=this.normal.applyMatrix3(n).normalize();return this.constant=-s.dot(r),this}translate(t){return this.constant-=t.dot(this.normal),this}equals(t){return t.normal.equals(this.normal)&&t.constant===this.constant}clone(){return new this.constructor().copy(this)}},Xn=new Ii,ku=new gt(.5,.5),rr=new D,Di=class{constructor(t=new Qe,e=new Qe,n=new Qe,s=new Qe,r=new Qe,a=new Qe){this.planes=[t,e,n,s,r,a]}set(t,e,n,s,r,a){let o=this.planes;return o[0].copy(t),o[1].copy(e),o[2].copy(n),o[3].copy(s),o[4].copy(r),o[5].copy(a),this}copy(t){let e=this.planes;for(let n=0;n<6;n++)e[n].copy(t.planes[n]);return this}setFromProjectionMatrix(t,e=Xe,n=!1){let s=this.planes,r=t.elements,a=r[0],o=r[1],c=r[2],l=r[3],h=r[4],u=r[5],d=r[6],p=r[7],m=r[8],v=r[9],g=r[10],f=r[11],w=r[12],E=r[13],M=r[14],I=r[15];if(s[0].setComponents(l-a,p-h,f-m,I-w).normalize(),s[1].setComponents(l+a,p+h,f+m,I+w).normalize(),s[2].setComponents(l+o,p+u,f+v,I+E).normalize(),s[3].setComponents(l-o,p-u,f-v,I-E).normalize(),n)s[4].setComponents(c,d,g,M).normalize(),s[5].setComponents(l-c,p-d,f-g,I-M).normalize();else if(s[4].setComponents(l-c,p-d,f-g,I-M).normalize(),e===Xe)s[5].setComponents(l+c,p+d,f+g,I+M).normalize();else if(e===rs)s[5].setComponents(c,d,g,M).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+e);return this}intersectsObject(t){if(t.boundingSphere!==void 0)t.boundingSphere===null&&t.computeBoundingSphere(),Xn.copy(t.boundingSphere).applyMatrix4(t.matrixWorld);else{let e=t.geometry;e.boundingSphere===null&&e.computeBoundingSphere(),Xn.copy(e.boundingSphere).applyMatrix4(t.matrixWorld)}return this.intersectsSphere(Xn)}intersectsSprite(t){Xn.center.set(0,0,0);let e=ku.distanceTo(t.center);return Xn.radius=.7071067811865476+e,Xn.applyMatrix4(t.matrixWorld),this.intersectsSphere(Xn)}intersectsSphere(t){let e=this.planes,n=t.center,s=-t.radius;for(let r=0;r<6;r++)if(e[r].distanceToPoint(n)<s)return!1;return!0}intersectsBox(t){let e=this.planes;for(let n=0;n<6;n++){let s=e[n];if(rr.x=s.normal.x>0?t.max.x:t.min.x,rr.y=s.normal.y>0?t.max.y:t.min.y,rr.z=s.normal.z>0?t.max.z:t.min.z,s.distanceToPoint(rr)<0)return!1}return!0}containsPoint(t){let e=this.planes;for(let n=0;n<6;n++)if(e[n].distanceToPoint(t)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}};var ps=class extends Me{constructor(t,e,n,s,r,a,o,c,l){super(t,e,n,s,r,a,o,c,l),this.isCanvasTexture=!0,this.needsUpdate=!0}},ms=class extends Me{constructor(t,e,n=Bn,s,r,a,o=ke,c=ke,l,h=wi,u=1){if(h!==wi&&h!==Vi)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");let d={width:t,height:e,depth:u};super(d,s,r,a,o,c,h,n,l),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(t){return super.copy(t),this.source=new Ri(Object.assign({},t.image)),this.compareFunction=t.compareFunction,this}toJSON(t){let e=super.toJSON(t);return this.compareFunction!==null&&(e.compareFunction=this.compareFunction),e}},gs=class extends Me{constructor(t=null){super(),this.sourceTexture=t,this.isExternalTexture=!0}copy(t){return super.copy(t),this.sourceTexture=t.sourceTexture,this}};var _s=class i extends tn{constructor(t=1,e=1,n=1,s=32,r=1,a=!1,o=0,c=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:t,radiusBottom:e,height:n,radialSegments:s,heightSegments:r,openEnded:a,thetaStart:o,thetaLength:c};let l=this;s=Math.floor(s),r=Math.floor(r);let h=[],u=[],d=[],p=[],m=0,v=[],g=n/2,f=0;w(),a===!1&&(t>0&&E(!0),e>0&&E(!1)),this.setIndex(h),this.setAttribute("position",new we(u,3)),this.setAttribute("normal",new we(d,3)),this.setAttribute("uv",new we(p,2));function w(){let M=new D,I=new D,C=0,P=(e-t)/n;for(let U=0;U<=r;U++){let S=[],x=U/r,A=x*(e-t)+t;for(let N=0;N<=s;N++){let k=N/s,G=k*c+o,V=Math.sin(G),q=Math.cos(G);I.x=A*V,I.y=-x*n+g,I.z=A*q,u.push(I.x,I.y,I.z),M.set(V,P,q).normalize(),d.push(M.x,M.y,M.z),p.push(k,1-x),S.push(m++)}v.push(S)}for(let U=0;U<s;U++)for(let S=0;S<r;S++){let x=v[S][U],A=v[S+1][U],N=v[S+1][U+1],k=v[S][U+1];(t>0||S!==0)&&(h.push(x,A,k),C+=3),(e>0||S!==r-1)&&(h.push(A,N,k),C+=3)}l.addGroup(f,C,0),f+=C}function E(M){let I=m,C=new gt,P=new D,U=0,S=M===!0?t:e,x=M===!0?1:-1;for(let N=1;N<=s;N++)u.push(0,g*x,0),d.push(0,x,0),p.push(.5,.5),m++;let A=m;for(let N=0;N<=s;N++){let G=N/s*c+o,V=Math.cos(G),q=Math.sin(G);P.x=S*q,P.y=g*x,P.z=S*V,u.push(P.x,P.y,P.z),d.push(0,x,0),C.x=V*.5+.5,C.y=q*.5*x+.5,p.push(C.x,C.y),m++}for(let N=0;N<s;N++){let k=I+N,G=A+N;M===!0?h.push(G,G+1,k):h.push(G+1,G,k),U+=3}l.addGroup(f,U,M===!0?1:2),f+=U}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.radiusTop,t.radiusBottom,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}};var Ue=class{constructor(){this.type="Curve",this.arcLengthDivisions=200,this.needsUpdate=!1,this.cacheArcLengths=null}getPoint(){console.warn("THREE.Curve: .getPoint() not implemented.")}getPointAt(t,e){let n=this.getUtoTmapping(t);return this.getPoint(n,e)}getPoints(t=5){let e=[];for(let n=0;n<=t;n++)e.push(this.getPoint(n/t));return e}getSpacedPoints(t=5){let e=[];for(let n=0;n<=t;n++)e.push(this.getPointAt(n/t));return e}getLength(){let t=this.getLengths();return t[t.length-1]}getLengths(t=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===t+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;let e=[],n,s=this.getPoint(0),r=0;e.push(0);for(let a=1;a<=t;a++)n=this.getPoint(a/t),r+=n.distanceTo(s),e.push(r),s=n;return this.cacheArcLengths=e,e}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(t,e=null){let n=this.getLengths(),s=0,r=n.length,a;e?a=e:a=t*n[r-1];let o=0,c=r-1,l;for(;o<=c;)if(s=Math.floor(o+(c-o)/2),l=n[s]-a,l<0)o=s+1;else if(l>0)c=s-1;else{c=s;break}if(s=c,n[s]===a)return s/(r-1);let h=n[s],d=n[s+1]-h,p=(a-h)/d;return(s+p)/(r-1)}getTangent(t,e){let s=t-1e-4,r=t+1e-4;s<0&&(s=0),r>1&&(r=1);let a=this.getPoint(s),o=this.getPoint(r),c=e||(a.isVector2?new gt:new D);return c.copy(o).sub(a).normalize(),c}getTangentAt(t,e){let n=this.getUtoTmapping(t);return this.getTangent(n,e)}computeFrenetFrames(t,e=!1){let n=new D,s=[],r=[],a=[],o=new D,c=new ae;for(let p=0;p<=t;p++){let m=p/t;s[p]=this.getTangentAt(m,new D)}r[0]=new D,a[0]=new D;let l=Number.MAX_VALUE,h=Math.abs(s[0].x),u=Math.abs(s[0].y),d=Math.abs(s[0].z);h<=l&&(l=h,n.set(1,0,0)),u<=l&&(l=u,n.set(0,1,0)),d<=l&&n.set(0,0,1),o.crossVectors(s[0],n).normalize(),r[0].crossVectors(s[0],o),a[0].crossVectors(s[0],r[0]);for(let p=1;p<=t;p++){if(r[p]=r[p-1].clone(),a[p]=a[p-1].clone(),o.crossVectors(s[p-1],s[p]),o.length()>Number.EPSILON){o.normalize();let m=Math.acos(Yt(s[p-1].dot(s[p]),-1,1));r[p].applyMatrix4(c.makeRotationAxis(o,m))}a[p].crossVectors(s[p],r[p])}if(e===!0){let p=Math.acos(Yt(r[0].dot(r[t]),-1,1));p/=t,s[0].dot(o.crossVectors(r[0],r[t]))>0&&(p=-p);for(let m=1;m<=t;m++)r[m].applyMatrix4(c.makeRotationAxis(s[m],p*m)),a[m].crossVectors(s[m],r[m])}return{tangents:s,normals:r,binormals:a}}clone(){return new this.constructor().copy(this)}copy(t){return this.arcLengthDivisions=t.arcLengthDivisions,this}toJSON(){let t={metadata:{version:4.7,type:"Curve",generator:"Curve.toJSON"}};return t.arcLengthDivisions=this.arcLengthDivisions,t.type=this.type,t}fromJSON(t){return this.arcLengthDivisions=t.arcLengthDivisions,this}},Ui=class extends Ue{constructor(t=0,e=0,n=1,s=1,r=0,a=Math.PI*2,o=!1,c=0){super(),this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=t,this.aY=e,this.xRadius=n,this.yRadius=s,this.aStartAngle=r,this.aEndAngle=a,this.aClockwise=o,this.aRotation=c}getPoint(t,e=new gt){let n=e,s=Math.PI*2,r=this.aEndAngle-this.aStartAngle,a=Math.abs(r)<Number.EPSILON;for(;r<0;)r+=s;for(;r>s;)r-=s;r<Number.EPSILON&&(a?r=0:r=s),this.aClockwise===!0&&!a&&(r===s?r=-s:r=r-s);let o=this.aStartAngle+t*r,c=this.aX+this.xRadius*Math.cos(o),l=this.aY+this.yRadius*Math.sin(o);if(this.aRotation!==0){let h=Math.cos(this.aRotation),u=Math.sin(this.aRotation),d=c-this.aX,p=l-this.aY;c=d*h-p*u+this.aX,l=d*u+p*h+this.aY}return n.set(c,l)}copy(t){return super.copy(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}toJSON(){let t=super.toJSON();return t.aX=this.aX,t.aY=this.aY,t.xRadius=this.xRadius,t.yRadius=this.yRadius,t.aStartAngle=this.aStartAngle,t.aEndAngle=this.aEndAngle,t.aClockwise=this.aClockwise,t.aRotation=this.aRotation,t}fromJSON(t){return super.fromJSON(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}},Mr=class extends Ui{constructor(t,e,n,s,r,a){super(t,e,n,n,s,r,a),this.isArcCurve=!0,this.type="ArcCurve"}};function Qo(){let i=0,t=0,e=0,n=0;function s(r,a,o,c){i=r,t=o,e=-3*r+3*a-2*o-c,n=2*r-2*a+o+c}return{initCatmullRom:function(r,a,o,c,l){s(a,o,l*(o-r),l*(c-a))},initNonuniformCatmullRom:function(r,a,o,c,l,h,u){let d=(a-r)/l-(o-r)/(l+h)+(o-a)/h,p=(o-a)/h-(c-a)/(h+u)+(c-o)/u;d*=h,p*=h,s(a,o,d,p)},calc:function(r){let a=r*r,o=a*r;return i+t*r+e*a+n*o}}}var ar=new D,fo=new Qo,po=new Qo,mo=new Qo,Sr=class extends Ue{constructor(t=[],e=!1,n="centripetal",s=.5){super(),this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=t,this.closed=e,this.curveType=n,this.tension=s}getPoint(t,e=new D){let n=e,s=this.points,r=s.length,a=(r-(this.closed?0:1))*t,o=Math.floor(a),c=a-o;this.closed?o+=o>0?0:(Math.floor(Math.abs(o)/r)+1)*r:c===0&&o===r-1&&(o=r-2,c=1);let l,h;this.closed||o>0?l=s[(o-1)%r]:(ar.subVectors(s[0],s[1]).add(s[0]),l=ar);let u=s[o%r],d=s[(o+1)%r];if(this.closed||o+2<r?h=s[(o+2)%r]:(ar.subVectors(s[r-1],s[r-2]).add(s[r-1]),h=ar),this.curveType==="centripetal"||this.curveType==="chordal"){let p=this.curveType==="chordal"?.5:.25,m=Math.pow(l.distanceToSquared(u),p),v=Math.pow(u.distanceToSquared(d),p),g=Math.pow(d.distanceToSquared(h),p);v<1e-4&&(v=1),m<1e-4&&(m=v),g<1e-4&&(g=v),fo.initNonuniformCatmullRom(l.x,u.x,d.x,h.x,m,v,g),po.initNonuniformCatmullRom(l.y,u.y,d.y,h.y,m,v,g),mo.initNonuniformCatmullRom(l.z,u.z,d.z,h.z,m,v,g)}else this.curveType==="catmullrom"&&(fo.initCatmullRom(l.x,u.x,d.x,h.x,this.tension),po.initCatmullRom(l.y,u.y,d.y,h.y,this.tension),mo.initCatmullRom(l.z,u.z,d.z,h.z,this.tension));return n.set(fo.calc(c),po.calc(c),mo.calc(c)),n}copy(t){super.copy(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){let s=t.points[e];this.points.push(s.clone())}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}toJSON(){let t=super.toJSON();t.points=[];for(let e=0,n=this.points.length;e<n;e++){let s=this.points[e];t.points.push(s.toArray())}return t.closed=this.closed,t.curveType=this.curveType,t.tension=this.tension,t}fromJSON(t){super.fromJSON(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){let s=t.points[e];this.points.push(new D().fromArray(s))}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}};function el(i,t,e,n,s){let r=(n-t)*.5,a=(s-e)*.5,o=i*i,c=i*o;return(2*e-2*n+r+a)*c+(-3*e+3*n-2*r-a)*o+r*i+e}function Vu(i,t){let e=1-i;return e*e*t}function Hu(i,t){return 2*(1-i)*i*t}function Gu(i,t){return i*i*t}function es(i,t,e,n){return Vu(i,t)+Hu(i,e)+Gu(i,n)}function Wu(i,t){let e=1-i;return e*e*e*t}function Xu(i,t){let e=1-i;return 3*e*e*i*t}function qu(i,t){return 3*(1-i)*i*i*t}function Yu(i,t){return i*i*i*t}function ns(i,t,e,n,s){return Wu(i,t)+Xu(i,e)+qu(i,n)+Yu(i,s)}var xs=class extends Ue{constructor(t=new gt,e=new gt,n=new gt,s=new gt){super(),this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=t,this.v1=e,this.v2=n,this.v3=s}getPoint(t,e=new gt){let n=e,s=this.v0,r=this.v1,a=this.v2,o=this.v3;return n.set(ns(t,s.x,r.x,a.x,o.x),ns(t,s.y,r.y,a.y,o.y)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){let t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}},br=class extends Ue{constructor(t=new D,e=new D,n=new D,s=new D){super(),this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=t,this.v1=e,this.v2=n,this.v3=s}getPoint(t,e=new D){let n=e,s=this.v0,r=this.v1,a=this.v2,o=this.v3;return n.set(ns(t,s.x,r.x,a.x,o.x),ns(t,s.y,r.y,a.y,o.y),ns(t,s.z,r.z,a.z,o.z)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){let t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}},vs=class extends Ue{constructor(t=new gt,e=new gt){super(),this.isLineCurve=!0,this.type="LineCurve",this.v1=t,this.v2=e}getPoint(t,e=new gt){let n=e;return t===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(t).add(this.v1)),n}getPointAt(t,e){return this.getPoint(t,e)}getTangent(t,e=new gt){return e.subVectors(this.v2,this.v1).normalize()}getTangentAt(t,e){return this.getTangent(t,e)}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){let t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}},Er=class extends Ue{constructor(t=new D,e=new D){super(),this.isLineCurve3=!0,this.type="LineCurve3",this.v1=t,this.v2=e}getPoint(t,e=new D){let n=e;return t===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(t).add(this.v1)),n}getPointAt(t,e){return this.getPoint(t,e)}getTangent(t,e=new D){return e.subVectors(this.v2,this.v1).normalize()}getTangentAt(t,e){return this.getTangent(t,e)}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){let t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}},ys=class extends Ue{constructor(t=new gt,e=new gt,n=new gt){super(),this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=t,this.v1=e,this.v2=n}getPoint(t,e=new gt){let n=e,s=this.v0,r=this.v1,a=this.v2;return n.set(es(t,s.x,r.x,a.x),es(t,s.y,r.y,a.y)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){let t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}},Tr=class extends Ue{constructor(t=new D,e=new D,n=new D){super(),this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=t,this.v1=e,this.v2=n}getPoint(t,e=new D){let n=e,s=this.v0,r=this.v1,a=this.v2;return n.set(es(t,s.x,r.x,a.x),es(t,s.y,r.y,a.y),es(t,s.z,r.z,a.z)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){let t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}},Ms=class extends Ue{constructor(t=[]){super(),this.isSplineCurve=!0,this.type="SplineCurve",this.points=t}getPoint(t,e=new gt){let n=e,s=this.points,r=(s.length-1)*t,a=Math.floor(r),o=r-a,c=s[a===0?a:a-1],l=s[a],h=s[a>s.length-2?s.length-1:a+1],u=s[a>s.length-3?s.length-1:a+2];return n.set(el(o,c.x,l.x,h.x,u.x),el(o,c.y,l.y,h.y,u.y)),n}copy(t){super.copy(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){let s=t.points[e];this.points.push(s.clone())}return this}toJSON(){let t=super.toJSON();t.points=[];for(let e=0,n=this.points.length;e<n;e++){let s=this.points[e];t.points.push(s.toArray())}return t}fromJSON(t){super.fromJSON(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){let s=t.points[e];this.points.push(new gt().fromArray(s))}return this}},bo=Object.freeze({__proto__:null,ArcCurve:Mr,CatmullRomCurve3:Sr,CubicBezierCurve:xs,CubicBezierCurve3:br,EllipseCurve:Ui,LineCurve:vs,LineCurve3:Er,QuadraticBezierCurve:ys,QuadraticBezierCurve3:Tr,SplineCurve:Ms}),wr=class extends Ue{constructor(){super(),this.type="CurvePath",this.curves=[],this.autoClose=!1}add(t){this.curves.push(t)}closePath(){let t=this.curves[0].getPoint(0),e=this.curves[this.curves.length-1].getPoint(1);if(!t.equals(e)){let n=t.isVector2===!0?"LineCurve":"LineCurve3";this.curves.push(new bo[n](e,t))}return this}getPoint(t,e){let n=t*this.getLength(),s=this.getCurveLengths(),r=0;for(;r<s.length;){if(s[r]>=n){let a=s[r]-n,o=this.curves[r],c=o.getLength(),l=c===0?0:1-a/c;return o.getPointAt(l,e)}r++}return null}getLength(){let t=this.getCurveLengths();return t[t.length-1]}updateArcLengths(){this.needsUpdate=!0,this.cacheLengths=null,this.getCurveLengths()}getCurveLengths(){if(this.cacheLengths&&this.cacheLengths.length===this.curves.length)return this.cacheLengths;let t=[],e=0;for(let n=0,s=this.curves.length;n<s;n++)e+=this.curves[n].getLength(),t.push(e);return this.cacheLengths=t,t}getSpacedPoints(t=40){let e=[];for(let n=0;n<=t;n++)e.push(this.getPoint(n/t));return this.autoClose&&e.push(e[0]),e}getPoints(t=12){let e=[],n;for(let s=0,r=this.curves;s<r.length;s++){let a=r[s],o=a.isEllipseCurve?t*2:a.isLineCurve||a.isLineCurve3?1:a.isSplineCurve?t*a.points.length:t,c=a.getPoints(o);for(let l=0;l<c.length;l++){let h=c[l];n&&n.equals(h)||(e.push(h),n=h)}}return this.autoClose&&e.length>1&&!e[e.length-1].equals(e[0])&&e.push(e[0]),e}copy(t){super.copy(t),this.curves=[];for(let e=0,n=t.curves.length;e<n;e++){let s=t.curves[e];this.curves.push(s.clone())}return this.autoClose=t.autoClose,this}toJSON(){let t=super.toJSON();t.autoClose=this.autoClose,t.curves=[];for(let e=0,n=this.curves.length;e<n;e++){let s=this.curves[e];t.curves.push(s.toJSON())}return t}fromJSON(t){super.fromJSON(t),this.autoClose=t.autoClose,this.curves=[];for(let e=0,n=t.curves.length;e<n;e++){let s=t.curves[e];this.curves.push(new bo[s.type]().fromJSON(s))}return this}},Qn=class extends wr{constructor(t){super(),this.type="Path",this.currentPoint=new gt,t&&this.setFromPoints(t)}setFromPoints(t){this.moveTo(t[0].x,t[0].y);for(let e=1,n=t.length;e<n;e++)this.lineTo(t[e].x,t[e].y);return this}moveTo(t,e){return this.currentPoint.set(t,e),this}lineTo(t,e){let n=new vs(this.currentPoint.clone(),new gt(t,e));return this.curves.push(n),this.currentPoint.set(t,e),this}quadraticCurveTo(t,e,n,s){let r=new ys(this.currentPoint.clone(),new gt(t,e),new gt(n,s));return this.curves.push(r),this.currentPoint.set(n,s),this}bezierCurveTo(t,e,n,s,r,a){let o=new xs(this.currentPoint.clone(),new gt(t,e),new gt(n,s),new gt(r,a));return this.curves.push(o),this.currentPoint.set(r,a),this}splineThru(t){let e=[this.currentPoint.clone()].concat(t),n=new Ms(e);return this.curves.push(n),this.currentPoint.copy(t[t.length-1]),this}arc(t,e,n,s,r,a){let o=this.currentPoint.x,c=this.currentPoint.y;return this.absarc(t+o,e+c,n,s,r,a),this}absarc(t,e,n,s,r,a){return this.absellipse(t,e,n,n,s,r,a),this}ellipse(t,e,n,s,r,a,o,c){let l=this.currentPoint.x,h=this.currentPoint.y;return this.absellipse(t+l,e+h,n,s,r,a,o,c),this}absellipse(t,e,n,s,r,a,o,c){let l=new Ui(t,e,n,s,r,a,o,c);if(this.curves.length>0){let u=l.getPoint(0);u.equals(this.currentPoint)||this.lineTo(u.x,u.y)}this.curves.push(l);let h=l.getPoint(1);return this.currentPoint.copy(h),this}copy(t){return super.copy(t),this.currentPoint.copy(t.currentPoint),this}toJSON(){let t=super.toJSON();return t.currentPoint=this.currentPoint.toArray(),t}fromJSON(t){return super.fromJSON(t),this.currentPoint.fromArray(t.currentPoint),this}},Ni=class extends Qn{constructor(t){super(t),this.uuid=si(),this.type="Shape",this.holes=[]}getPointsHoles(t){let e=[];for(let n=0,s=this.holes.length;n<s;n++)e[n]=this.holes[n].getPoints(t);return e}extractPoints(t){return{shape:this.getPoints(t),holes:this.getPointsHoles(t)}}copy(t){super.copy(t),this.holes=[];for(let e=0,n=t.holes.length;e<n;e++){let s=t.holes[e];this.holes.push(s.clone())}return this}toJSON(){let t=super.toJSON();t.uuid=this.uuid,t.holes=[];for(let e=0,n=this.holes.length;e<n;e++){let s=this.holes[e];t.holes.push(s.toJSON())}return t}fromJSON(t){super.fromJSON(t),this.uuid=t.uuid,this.holes=[];for(let e=0,n=t.holes.length;e<n;e++){let s=t.holes[e];this.holes.push(new Qn().fromJSON(s))}return this}};function $u(i,t,e=2){let n=t&&t.length,s=n?t[0]*e:i.length,r=eh(i,0,s,e,!0),a=[];if(!r||r.next===r.prev)return a;let o,c,l;if(n&&(r=ju(i,t,r,e)),i.length>80*e){o=1/0,c=1/0;let h=-1/0,u=-1/0;for(let d=e;d<s;d+=e){let p=i[d],m=i[d+1];p<o&&(o=p),m<c&&(c=m),p>h&&(h=p),m>u&&(u=m)}l=Math.max(h-o,u-c),l=l!==0?32767/l:0}return Ss(r,a,e,o,c,l,0),a}function eh(i,t,e,n,s){let r;if(s===hd(i,t,e,n)>0)for(let a=t;a<e;a+=n)r=nl(a/n|0,i[a],i[a+1],r);else for(let a=e-n;a>=t;a-=n)r=nl(a/n|0,i[a],i[a+1],r);return r&&Fi(r,r.next)&&(Es(r),r=r.next),r}function jn(i,t){if(!i)return i;t||(t=i);let e=i,n;do if(n=!1,!e.steiner&&(Fi(e,e.next)||le(e.prev,e,e.next)===0)){if(Es(e),e=t=e.prev,e===e.next)break;n=!0}else e=e.next;while(n||e!==t);return t}function Ss(i,t,e,n,s,r,a){if(!i)return;!a&&r&&sd(i,n,s,r);let o=i;for(;i.prev!==i.next;){let c=i.prev,l=i.next;if(r?Ju(i,n,s,r):Zu(i)){t.push(c.i,i.i,l.i),Es(i),i=l.next,o=l.next;continue}if(i=l,i===o){a?a===1?(i=Ku(jn(i),t),Ss(i,t,e,n,s,r,2)):a===2&&Qu(i,t,e,n,s,r):Ss(jn(i),t,e,n,s,r,1);break}}}function Zu(i){let t=i.prev,e=i,n=i.next;if(le(t,e,n)>=0)return!1;let s=t.x,r=e.x,a=n.x,o=t.y,c=e.y,l=n.y,h=Math.min(s,r,a),u=Math.min(o,c,l),d=Math.max(s,r,a),p=Math.max(o,c,l),m=n.next;for(;m!==t;){if(m.x>=h&&m.x<=d&&m.y>=u&&m.y<=p&&Qi(s,o,r,c,a,l,m.x,m.y)&&le(m.prev,m,m.next)>=0)return!1;m=m.next}return!0}function Ju(i,t,e,n){let s=i.prev,r=i,a=i.next;if(le(s,r,a)>=0)return!1;let o=s.x,c=r.x,l=a.x,h=s.y,u=r.y,d=a.y,p=Math.min(o,c,l),m=Math.min(h,u,d),v=Math.max(o,c,l),g=Math.max(h,u,d),f=Eo(p,m,t,e,n),w=Eo(v,g,t,e,n),E=i.prevZ,M=i.nextZ;for(;E&&E.z>=f&&M&&M.z<=w;){if(E.x>=p&&E.x<=v&&E.y>=m&&E.y<=g&&E!==s&&E!==a&&Qi(o,h,c,u,l,d,E.x,E.y)&&le(E.prev,E,E.next)>=0||(E=E.prevZ,M.x>=p&&M.x<=v&&M.y>=m&&M.y<=g&&M!==s&&M!==a&&Qi(o,h,c,u,l,d,M.x,M.y)&&le(M.prev,M,M.next)>=0))return!1;M=M.nextZ}for(;E&&E.z>=f;){if(E.x>=p&&E.x<=v&&E.y>=m&&E.y<=g&&E!==s&&E!==a&&Qi(o,h,c,u,l,d,E.x,E.y)&&le(E.prev,E,E.next)>=0)return!1;E=E.prevZ}for(;M&&M.z<=w;){if(M.x>=p&&M.x<=v&&M.y>=m&&M.y<=g&&M!==s&&M!==a&&Qi(o,h,c,u,l,d,M.x,M.y)&&le(M.prev,M,M.next)>=0)return!1;M=M.nextZ}return!0}function Ku(i,t){let e=i;do{let n=e.prev,s=e.next.next;!Fi(n,s)&&ih(n,e,e.next,s)&&bs(n,s)&&bs(s,n)&&(t.push(n.i,e.i,s.i),Es(e),Es(e.next),e=i=s),e=e.next}while(e!==i);return jn(e)}function Qu(i,t,e,n,s,r){let a=i;do{let o=a.next.next;for(;o!==a.prev;){if(a.i!==o.i&&od(a,o)){let c=sh(a,o);a=jn(a,a.next),c=jn(c,c.next),Ss(a,t,e,n,s,r,0),Ss(c,t,e,n,s,r,0);return}o=o.next}a=a.next}while(a!==i)}function ju(i,t,e,n){let s=[];for(let r=0,a=t.length;r<a;r++){let o=t[r]*n,c=r<a-1?t[r+1]*n:i.length,l=eh(i,o,c,n,!1);l===l.next&&(l.steiner=!0),s.push(ad(l))}s.sort(td);for(let r=0;r<s.length;r++)e=ed(s[r],e);return e}function td(i,t){let e=i.x-t.x;if(e===0&&(e=i.y-t.y,e===0)){let n=(i.next.y-i.y)/(i.next.x-i.x),s=(t.next.y-t.y)/(t.next.x-t.x);e=n-s}return e}function ed(i,t){let e=nd(i,t);if(!e)return t;let n=sh(e,i);return jn(n,n.next),jn(e,e.next)}function nd(i,t){let e=t,n=i.x,s=i.y,r=-1/0,a;if(Fi(i,e))return e;do{if(Fi(i,e.next))return e.next;if(s<=e.y&&s>=e.next.y&&e.next.y!==e.y){let u=e.x+(s-e.y)*(e.next.x-e.x)/(e.next.y-e.y);if(u<=n&&u>r&&(r=u,a=e.x<e.next.x?e:e.next,u===n))return a}e=e.next}while(e!==t);if(!a)return null;let o=a,c=a.x,l=a.y,h=1/0;e=a;do{if(n>=e.x&&e.x>=c&&n!==e.x&&nh(s<l?n:r,s,c,l,s<l?r:n,s,e.x,e.y)){let u=Math.abs(s-e.y)/(n-e.x);bs(e,i)&&(u<h||u===h&&(e.x>a.x||e.x===a.x&&id(a,e)))&&(a=e,h=u)}e=e.next}while(e!==o);return a}function id(i,t){return le(i.prev,i,t.prev)<0&&le(t.next,i,i.next)<0}function sd(i,t,e,n){let s=i;do s.z===0&&(s.z=Eo(s.x,s.y,t,e,n)),s.prevZ=s.prev,s.nextZ=s.next,s=s.next;while(s!==i);s.prevZ.nextZ=null,s.prevZ=null,rd(s)}function rd(i){let t,e=1;do{let n=i,s;i=null;let r=null;for(t=0;n;){t++;let a=n,o=0;for(let l=0;l<e&&(o++,a=a.nextZ,!!a);l++);let c=e;for(;o>0||c>0&&a;)o!==0&&(c===0||!a||n.z<=a.z)?(s=n,n=n.nextZ,o--):(s=a,a=a.nextZ,c--),r?r.nextZ=s:i=s,s.prevZ=r,r=s;n=a}r.nextZ=null,e*=2}while(t>1);return i}function Eo(i,t,e,n,s){return i=(i-e)*s|0,t=(t-n)*s|0,i=(i|i<<8)&16711935,i=(i|i<<4)&252645135,i=(i|i<<2)&858993459,i=(i|i<<1)&1431655765,t=(t|t<<8)&16711935,t=(t|t<<4)&252645135,t=(t|t<<2)&858993459,t=(t|t<<1)&1431655765,i|t<<1}function ad(i){let t=i,e=i;do(t.x<e.x||t.x===e.x&&t.y<e.y)&&(e=t),t=t.next;while(t!==i);return e}function nh(i,t,e,n,s,r,a,o){return(s-a)*(t-o)>=(i-a)*(r-o)&&(i-a)*(n-o)>=(e-a)*(t-o)&&(e-a)*(r-o)>=(s-a)*(n-o)}function Qi(i,t,e,n,s,r,a,o){return!(i===a&&t===o)&&nh(i,t,e,n,s,r,a,o)}function od(i,t){return i.next.i!==t.i&&i.prev.i!==t.i&&!cd(i,t)&&(bs(i,t)&&bs(t,i)&&ld(i,t)&&(le(i.prev,i,t.prev)||le(i,t.prev,t))||Fi(i,t)&&le(i.prev,i,i.next)>0&&le(t.prev,t,t.next)>0)}function le(i,t,e){return(t.y-i.y)*(e.x-t.x)-(t.x-i.x)*(e.y-t.y)}function Fi(i,t){return i.x===t.x&&i.y===t.y}function ih(i,t,e,n){let s=cr(le(i,t,e)),r=cr(le(i,t,n)),a=cr(le(e,n,i)),o=cr(le(e,n,t));return!!(s!==r&&a!==o||s===0&&or(i,e,t)||r===0&&or(i,n,t)||a===0&&or(e,i,n)||o===0&&or(e,t,n))}function or(i,t,e){return t.x<=Math.max(i.x,e.x)&&t.x>=Math.min(i.x,e.x)&&t.y<=Math.max(i.y,e.y)&&t.y>=Math.min(i.y,e.y)}function cr(i){return i>0?1:i<0?-1:0}function cd(i,t){let e=i;do{if(e.i!==i.i&&e.next.i!==i.i&&e.i!==t.i&&e.next.i!==t.i&&ih(e,e.next,i,t))return!0;e=e.next}while(e!==i);return!1}function bs(i,t){return le(i.prev,i,i.next)<0?le(i,t,i.next)>=0&&le(i,i.prev,t)>=0:le(i,t,i.prev)<0||le(i,i.next,t)<0}function ld(i,t){let e=i,n=!1,s=(i.x+t.x)/2,r=(i.y+t.y)/2;do e.y>r!=e.next.y>r&&e.next.y!==e.y&&s<(e.next.x-e.x)*(r-e.y)/(e.next.y-e.y)+e.x&&(n=!n),e=e.next;while(e!==i);return n}function sh(i,t){let e=To(i.i,i.x,i.y),n=To(t.i,t.x,t.y),s=i.next,r=t.prev;return i.next=t,t.prev=i,e.next=s,s.prev=e,n.next=e,e.prev=n,r.next=n,n.prev=r,n}function nl(i,t,e,n){let s=To(i,t,e);return n?(s.next=n.next,s.prev=n,n.next.prev=s,n.next=s):(s.prev=s,s.next=s),s}function Es(i){i.next.prev=i.prev,i.prev.next=i.next,i.prevZ&&(i.prevZ.nextZ=i.nextZ),i.nextZ&&(i.nextZ.prevZ=i.prevZ)}function To(i,t,e){return{i,x:t,y:e,prev:null,next:null,z:0,prevZ:null,nextZ:null,steiner:!1}}function hd(i,t,e,n){let s=0;for(let r=t,a=e-n;r<e;r+=n)s+=(i[a]-i[r])*(i[r+1]+i[a+1]),a=r;return s}var wo=class{static triangulate(t,e,n=2){return $u(t,e,n)}},$n=class i{static area(t){let e=t.length,n=0;for(let s=e-1,r=0;r<e;s=r++)n+=t[s].x*t[r].y-t[r].x*t[s].y;return n*.5}static isClockWise(t){return i.area(t)<0}static triangulateShape(t,e){let n=[],s=[],r=[];il(t),sl(n,t);let a=t.length;e.forEach(il);for(let c=0;c<e.length;c++)s.push(a),a+=e[c].length,sl(n,e[c]);let o=wo.triangulate(n,s);for(let c=0;c<o.length;c+=3)r.push(o.slice(c,c+3));return r}};function il(i){let t=i.length;t>2&&i[t-1].equals(i[0])&&i.pop()}function sl(i,t){for(let e=0;e<t.length;e++)i.push(t[e].x),i.push(t[e].y)}var Ts=class i extends tn{constructor(t=new Ni([new gt(.5,.5),new gt(-.5,.5),new gt(-.5,-.5),new gt(.5,-.5)]),e={}){super(),this.type="ExtrudeGeometry",this.parameters={shapes:t,options:e},t=Array.isArray(t)?t:[t];let n=this,s=[],r=[];for(let o=0,c=t.length;o<c;o++){let l=t[o];a(l)}this.setAttribute("position",new we(s,3)),this.setAttribute("uv",new we(r,2)),this.computeVertexNormals();function a(o){let c=[],l=e.curveSegments!==void 0?e.curveSegments:12,h=e.steps!==void 0?e.steps:1,u=e.depth!==void 0?e.depth:1,d=e.bevelEnabled!==void 0?e.bevelEnabled:!0,p=e.bevelThickness!==void 0?e.bevelThickness:.2,m=e.bevelSize!==void 0?e.bevelSize:p-.1,v=e.bevelOffset!==void 0?e.bevelOffset:0,g=e.bevelSegments!==void 0?e.bevelSegments:3,f=e.extrudePath,w=e.UVGenerator!==void 0?e.UVGenerator:ud,E,M=!1,I,C,P,U;f&&(E=f.getSpacedPoints(h),M=!0,d=!1,I=f.computeFrenetFrames(h,!1),C=new D,P=new D,U=new D),d||(g=0,p=0,m=0,v=0);let S=o.extractPoints(l),x=S.shape,A=S.holes;if(!$n.isClockWise(x)){x=x.reverse();for(let tt=0,Q=A.length;tt<Q;tt++){let R=A[tt];$n.isClockWise(R)&&(A[tt]=R.reverse())}}function k(tt){let R=10000000000000001e-36,z=tt[0];for(let $=1;$<=tt.length;$++){let K=$%tt.length,at=tt[K],Nt=at.x-z.x,zt=at.y-z.y,b=Nt*Nt+zt*zt,_=Math.max(Math.abs(at.x),Math.abs(at.y),Math.abs(z.x),Math.abs(z.y)),B=R*_*_;if(b<=B){tt.splice(K,1),$--;continue}z=at}}k(x),A.forEach(k);let G=A.length,V=x;for(let tt=0;tt<G;tt++){let Q=A[tt];x=x.concat(Q)}function q(tt,Q,R){return Q||console.error("THREE.ExtrudeGeometry: vec does not exist"),tt.clone().addScaledVector(Q,R)}let nt=x.length;function X(tt,Q,R){let z,$,K,at=tt.x-Q.x,Nt=tt.y-Q.y,zt=R.x-tt.x,b=R.y-tt.y,_=at*at+Nt*Nt,B=at*b-Nt*zt;if(Math.abs(B)>Number.EPSILON){let Y=Math.sqrt(_),st=Math.sqrt(zt*zt+b*b),J=Q.x-Nt/Y,wt=Q.y+at/Y,ft=R.x-b/st,Ct=R.y+zt/st,Rt=((ft-J)*b-(Ct-wt)*zt)/(at*b-Nt*zt);z=J+at*Rt-tt.x,$=wt+Nt*Rt-tt.y;let ct=z*z+$*$;if(ct<=2)return new gt(z,$);K=Math.sqrt(ct/2)}else{let Y=!1;at>Number.EPSILON?zt>Number.EPSILON&&(Y=!0):at<-Number.EPSILON?zt<-Number.EPSILON&&(Y=!0):Math.sign(Nt)===Math.sign(b)&&(Y=!0),Y?(z=-Nt,$=at,K=Math.sqrt(_)):(z=at,$=Nt,K=Math.sqrt(_/2))}return new gt(z/K,$/K)}let ot=[];for(let tt=0,Q=V.length,R=Q-1,z=tt+1;tt<Q;tt++,R++,z++)R===Q&&(R=0),z===Q&&(z=0),ot[tt]=X(V[tt],V[R],V[z]);let it=[],rt,_t=ot.concat();for(let tt=0,Q=G;tt<Q;tt++){let R=A[tt];rt=[];for(let z=0,$=R.length,K=$-1,at=z+1;z<$;z++,K++,at++)K===$&&(K=0),at===$&&(at=0),rt[z]=X(R[z],R[K],R[at]);it.push(rt),_t=_t.concat(rt)}let bt;if(g===0)bt=$n.triangulateShape(V,A);else{let tt=[],Q=[];for(let R=0;R<g;R++){let z=R/g,$=p*Math.cos(z*Math.PI/2),K=m*Math.sin(z*Math.PI/2)+v;for(let at=0,Nt=V.length;at<Nt;at++){let zt=q(V[at],ot[at],K);vt(zt.x,zt.y,-$),z===0&&tt.push(zt)}for(let at=0,Nt=G;at<Nt;at++){let zt=A[at];rt=it[at];let b=[];for(let _=0,B=zt.length;_<B;_++){let Y=q(zt[_],rt[_],K);vt(Y.x,Y.y,-$),z===0&&b.push(Y)}z===0&&Q.push(b)}}bt=$n.triangulateShape(tt,Q)}let Dt=bt.length,Ut=m+v;for(let tt=0;tt<nt;tt++){let Q=d?q(x[tt],_t[tt],Ut):x[tt];M?(P.copy(I.normals[0]).multiplyScalar(Q.x),C.copy(I.binormals[0]).multiplyScalar(Q.y),U.copy(E[0]).add(P).add(C),vt(U.x,U.y,U.z)):vt(Q.x,Q.y,0)}for(let tt=1;tt<=h;tt++)for(let Q=0;Q<nt;Q++){let R=d?q(x[Q],_t[Q],Ut):x[Q];M?(P.copy(I.normals[tt]).multiplyScalar(R.x),C.copy(I.binormals[tt]).multiplyScalar(R.y),U.copy(E[tt]).add(P).add(C),vt(U.x,U.y,U.z)):vt(R.x,R.y,u/h*tt)}for(let tt=g-1;tt>=0;tt--){let Q=tt/g,R=p*Math.cos(Q*Math.PI/2),z=m*Math.sin(Q*Math.PI/2)+v;for(let $=0,K=V.length;$<K;$++){let at=q(V[$],ot[$],z);vt(at.x,at.y,u+R)}for(let $=0,K=A.length;$<K;$++){let at=A[$];rt=it[$];for(let Nt=0,zt=at.length;Nt<zt;Nt++){let b=q(at[Nt],rt[Nt],z);M?vt(b.x,b.y+E[h-1].y,E[h-1].x+R):vt(b.x,b.y,u+R)}}}Z(),j();function Z(){let tt=s.length/3;if(d){let Q=0,R=nt*Q;for(let z=0;z<Dt;z++){let $=bt[z];ht($[2]+R,$[1]+R,$[0]+R)}Q=h+g*2,R=nt*Q;for(let z=0;z<Dt;z++){let $=bt[z];ht($[0]+R,$[1]+R,$[2]+R)}}else{for(let Q=0;Q<Dt;Q++){let R=bt[Q];ht(R[2],R[1],R[0])}for(let Q=0;Q<Dt;Q++){let R=bt[Q];ht(R[0]+nt*h,R[1]+nt*h,R[2]+nt*h)}}n.addGroup(tt,s.length/3-tt,0)}function j(){let tt=s.length/3,Q=0;pt(V,Q),Q+=V.length;for(let R=0,z=A.length;R<z;R++){let $=A[R];pt($,Q),Q+=$.length}n.addGroup(tt,s.length/3-tt,1)}function pt(tt,Q){let R=tt.length;for(;--R>=0;){let z=R,$=R-1;$<0&&($=tt.length-1);for(let K=0,at=h+g*2;K<at;K++){let Nt=nt*K,zt=nt*(K+1),b=Q+z+Nt,_=Q+$+Nt,B=Q+$+zt,Y=Q+z+zt;Lt(b,_,B,Y)}}}function vt(tt,Q,R){c.push(tt),c.push(Q),c.push(R)}function ht(tt,Q,R){Ot(tt),Ot(Q),Ot(R);let z=s.length/3,$=w.generateTopUV(n,s,z-3,z-2,z-1);T($[0]),T($[1]),T($[2])}function Lt(tt,Q,R,z){Ot(tt),Ot(Q),Ot(z),Ot(Q),Ot(R),Ot(z);let $=s.length/3,K=w.generateSideWallUV(n,s,$-6,$-3,$-2,$-1);T(K[0]),T(K[1]),T(K[3]),T(K[1]),T(K[2]),T(K[3])}function Ot(tt){s.push(c[tt*3+0]),s.push(c[tt*3+1]),s.push(c[tt*3+2])}function T(tt){r.push(tt.x),r.push(tt.y)}}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}toJSON(){let t=super.toJSON(),e=this.parameters.shapes,n=this.parameters.options;return dd(e,n,t)}static fromJSON(t,e){let n=[];for(let r=0,a=t.shapes.length;r<a;r++){let o=e[t.shapes[r]];n.push(o)}let s=t.options.extrudePath;return s!==void 0&&(t.options.extrudePath=new bo[s.type]().fromJSON(s)),new i(n,t.options)}},ud={generateTopUV:function(i,t,e,n,s){let r=t[e*3],a=t[e*3+1],o=t[n*3],c=t[n*3+1],l=t[s*3],h=t[s*3+1];return[new gt(r,a),new gt(o,c),new gt(l,h)]},generateSideWallUV:function(i,t,e,n,s,r){let a=t[e*3],o=t[e*3+1],c=t[e*3+2],l=t[n*3],h=t[n*3+1],u=t[n*3+2],d=t[s*3],p=t[s*3+1],m=t[s*3+2],v=t[r*3],g=t[r*3+1],f=t[r*3+2];return Math.abs(o-h)<Math.abs(a-l)?[new gt(a,1-c),new gt(l,1-u),new gt(d,1-m),new gt(v,1-f)]:[new gt(o,1-c),new gt(h,1-u),new gt(p,1-m),new gt(g,1-f)]}};function dd(i,t,e){if(e.shapes=[],Array.isArray(i))for(let n=0,s=i.length;n<s;n++){let r=i[n];e.shapes.push(r.uuid)}else e.shapes.push(i.uuid);return e.options=Object.assign({},t),t.extrudePath!==void 0&&(e.options.extrudePath=t.extrudePath.toJSON()),e}var Nn=class i extends tn{constructor(t=1,e=1,n=1,s=1){super(),this.type="PlaneGeometry",this.parameters={width:t,height:e,widthSegments:n,heightSegments:s};let r=t/2,a=e/2,o=Math.floor(n),c=Math.floor(s),l=o+1,h=c+1,u=t/o,d=e/c,p=[],m=[],v=[],g=[];for(let f=0;f<h;f++){let w=f*d-a;for(let E=0;E<l;E++){let M=E*u-r;m.push(M,-w,0),v.push(0,0,1),g.push(E/o),g.push(1-f/c)}}for(let f=0;f<c;f++)for(let w=0;w<o;w++){let E=w+l*f,M=w+l*(f+1),I=w+1+l*(f+1),C=w+1+l*f;p.push(E,M,C),p.push(M,I,C)}this.setIndex(p),this.setAttribute("position",new we(m,3)),this.setAttribute("normal",new we(v,3)),this.setAttribute("uv",new we(g,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.width,t.height,t.widthSegments,t.heightSegments)}};var _n=class extends Ln{constructor(t){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new $t(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new $t(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=qo,this.normalScale=new gt(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Ye,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.defines={STANDARD:""},this.color.copy(t.color),this.roughness=t.roughness,this.metalness=t.metalness,this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.roughnessMap=t.roughnessMap,this.metalnessMap=t.metalnessMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.envMapIntensity=t.envMapIntensity,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}};var Ar=class extends Ln{constructor(t){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=Vl,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(t)}copy(t){return super.copy(t),this.depthPacking=t.depthPacking,this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this}},Cr=class extends Ln{constructor(t){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(t)}copy(t){return super.copy(t),this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this}};function lr(i,t){return!i||i.constructor===t?i:typeof t.BYTES_PER_ELEMENT=="number"?new t(i):Array.prototype.slice.call(i)}function fd(i){return ArrayBuffer.isView(i)&&!(i instanceof DataView)}var ti=class{constructor(t,e,n,s){this.parameterPositions=t,this._cachedIndex=0,this.resultBuffer=s!==void 0?s:new e.constructor(n),this.sampleValues=e,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(t){let e=this.parameterPositions,n=this._cachedIndex,s=e[n],r=e[n-1];n:{t:{let a;e:{i:if(!(t<s)){for(let o=n+2;;){if(s===void 0){if(t<r)break i;return n=e.length,this._cachedIndex=n,this.copySampleValue_(n-1)}if(n===o)break;if(r=s,s=e[++n],t<s)break t}a=e.length;break e}if(!(t>=r)){let o=e[1];t<o&&(n=2,r=o);for(let c=n-2;;){if(r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===c)break;if(s=r,r=e[--n-1],t>=r)break t}a=n,n=0;break e}break n}for(;n<a;){let o=n+a>>>1;t<e[o]?a=o:n=o+1}if(s=e[n],r=e[n-1],r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(s===void 0)return n=e.length,this._cachedIndex=n,this.copySampleValue_(n-1)}this._cachedIndex=n,this.intervalChanged_(n,r,s)}return this.interpolate_(n,r,t,s)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(t){let e=this.resultBuffer,n=this.sampleValues,s=this.valueSize,r=t*s;for(let a=0;a!==s;++a)e[a]=n[r+a];return e}interpolate_(){throw new Error("call to abstract method")}intervalChanged_(){}},Rr=class extends ti{constructor(t,e,n,s){super(t,e,n,s),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:xo,endingEnd:xo}}intervalChanged_(t,e,n){let s=this.parameterPositions,r=t-2,a=t+1,o=s[r],c=s[a];if(o===void 0)switch(this.getSettings_().endingStart){case vo:r=t,o=2*e-n;break;case yo:r=s.length-2,o=e+s[r]-s[r+1];break;default:r=t,o=n}if(c===void 0)switch(this.getSettings_().endingEnd){case vo:a=t,c=2*n-e;break;case yo:a=1,c=n+s[1]-s[0];break;default:a=t-1,c=e}let l=(n-e)*.5,h=this.valueSize;this._weightPrev=l/(e-o),this._weightNext=l/(c-n),this._offsetPrev=r*h,this._offsetNext=a*h}interpolate_(t,e,n,s){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,c=t*o,l=c-o,h=this._offsetPrev,u=this._offsetNext,d=this._weightPrev,p=this._weightNext,m=(n-e)/(s-e),v=m*m,g=v*m,f=-d*g+2*d*v-d*m,w=(1+d)*g+(-1.5-2*d)*v+(-.5+d)*m+1,E=(-1-p)*g+(1.5+p)*v+.5*m,M=p*g-p*v;for(let I=0;I!==o;++I)r[I]=f*a[h+I]+w*a[l+I]+E*a[c+I]+M*a[u+I];return r}},Ir=class extends ti{constructor(t,e,n,s){super(t,e,n,s)}interpolate_(t,e,n,s){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,c=t*o,l=c-o,h=(n-e)/(s-e),u=1-h;for(let d=0;d!==o;++d)r[d]=a[l+d]*u+a[c+d]*h;return r}},Pr=class extends ti{constructor(t,e,n,s){super(t,e,n,s)}interpolate_(t){return this.copySampleValue_(t-1)}},Ne=class{constructor(t,e,n,s){if(t===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(e===void 0||e.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+t);this.name=t,this.times=lr(e,this.TimeBufferType),this.values=lr(n,this.ValueBufferType),this.setInterpolation(s||this.DefaultInterpolation)}static toJSON(t){let e=t.constructor,n;if(e.toJSON!==this.toJSON)n=e.toJSON(t);else{n={name:t.name,times:lr(t.times,Array),values:lr(t.values,Array)};let s=t.getInterpolation();s!==t.DefaultInterpolation&&(n.interpolation=s)}return n.type=t.ValueTypeName,n}InterpolantFactoryMethodDiscrete(t){return new Pr(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodLinear(t){return new Ir(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodSmooth(t){return new Rr(this.times,this.values,this.getValueSize(),t)}setInterpolation(t){let e;switch(t){case is:e=this.InterpolantFactoryMethodDiscrete;break;case mr:e=this.InterpolantFactoryMethodLinear;break;case hr:e=this.InterpolantFactoryMethodSmooth;break}if(e===void 0){let n="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(t!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(n);return console.warn("THREE.KeyframeTrack:",n),this}return this.createInterpolant=e,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return is;case this.InterpolantFactoryMethodLinear:return mr;case this.InterpolantFactoryMethodSmooth:return hr}}getValueSize(){return this.values.length/this.times.length}shift(t){if(t!==0){let e=this.times;for(let n=0,s=e.length;n!==s;++n)e[n]+=t}return this}scale(t){if(t!==1){let e=this.times;for(let n=0,s=e.length;n!==s;++n)e[n]*=t}return this}trim(t,e){let n=this.times,s=n.length,r=0,a=s-1;for(;r!==s&&n[r]<t;)++r;for(;a!==-1&&n[a]>e;)--a;if(++a,r!==0||a!==s){r>=a&&(a=Math.max(a,1),r=a-1);let o=this.getValueSize();this.times=n.slice(r,a),this.values=this.values.slice(r*o,a*o)}return this}validate(){let t=!0,e=this.getValueSize();e-Math.floor(e)!==0&&(console.error("THREE.KeyframeTrack: Invalid value size in track.",this),t=!1);let n=this.times,s=this.values,r=n.length;r===0&&(console.error("THREE.KeyframeTrack: Track is empty.",this),t=!1);let a=null;for(let o=0;o!==r;o++){let c=n[o];if(typeof c=="number"&&isNaN(c)){console.error("THREE.KeyframeTrack: Time is not a valid number.",this,o,c),t=!1;break}if(a!==null&&a>c){console.error("THREE.KeyframeTrack: Out of order keys.",this,o,c,a),t=!1;break}a=c}if(s!==void 0&&fd(s))for(let o=0,c=s.length;o!==c;++o){let l=s[o];if(isNaN(l)){console.error("THREE.KeyframeTrack: Value is not a valid number.",this,o,l),t=!1;break}}return t}optimize(){let t=this.times.slice(),e=this.values.slice(),n=this.getValueSize(),s=this.getInterpolation()===hr,r=t.length-1,a=1;for(let o=1;o<r;++o){let c=!1,l=t[o],h=t[o+1];if(l!==h&&(o!==1||l!==t[0]))if(s)c=!0;else{let u=o*n,d=u-n,p=u+n;for(let m=0;m!==n;++m){let v=e[u+m];if(v!==e[d+m]||v!==e[p+m]){c=!0;break}}}if(c){if(o!==a){t[a]=t[o];let u=o*n,d=a*n;for(let p=0;p!==n;++p)e[d+p]=e[u+p]}++a}}if(r>0){t[a]=t[r];for(let o=r*n,c=a*n,l=0;l!==n;++l)e[c+l]=e[o+l];++a}return a!==t.length?(this.times=t.slice(0,a),this.values=e.slice(0,a*n)):(this.times=t,this.values=e),this}clone(){let t=this.times.slice(),e=this.values.slice(),n=this.constructor,s=new n(this.name,t,e);return s.createInterpolant=this.createInterpolant,s}};Ne.prototype.ValueTypeName="";Ne.prototype.TimeBufferType=Float32Array;Ne.prototype.ValueBufferType=Float32Array;Ne.prototype.DefaultInterpolation=mr;var Fn=class extends Ne{constructor(t,e,n){super(t,e,n)}};Fn.prototype.ValueTypeName="bool";Fn.prototype.ValueBufferType=Array;Fn.prototype.DefaultInterpolation=is;Fn.prototype.InterpolantFactoryMethodLinear=void 0;Fn.prototype.InterpolantFactoryMethodSmooth=void 0;var Lr=class extends Ne{constructor(t,e,n,s){super(t,e,n,s)}};Lr.prototype.ValueTypeName="color";var Dr=class extends Ne{constructor(t,e,n,s){super(t,e,n,s)}};Dr.prototype.ValueTypeName="number";var Ur=class extends ti{constructor(t,e,n,s){super(t,e,n,s)}interpolate_(t,e,n,s){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,c=(n-e)/(s-e),l=t*o;for(let h=l+o;l!==h;l+=4)gn.slerpFlat(r,0,a,l-o,a,l,c);return r}},ws=class extends Ne{constructor(t,e,n,s){super(t,e,n,s)}InterpolantFactoryMethodLinear(t){return new Ur(this.times,this.values,this.getValueSize(),t)}};ws.prototype.ValueTypeName="quaternion";ws.prototype.InterpolantFactoryMethodSmooth=void 0;var On=class extends Ne{constructor(t,e,n){super(t,e,n)}};On.prototype.ValueTypeName="string";On.prototype.ValueBufferType=Array;On.prototype.DefaultInterpolation=is;On.prototype.InterpolantFactoryMethodLinear=void 0;On.prototype.InterpolantFactoryMethodSmooth=void 0;var Nr=class extends Ne{constructor(t,e,n,s){super(t,e,n,s)}};Nr.prototype.ValueTypeName="vector";var Fr=class{constructor(t,e,n){let s=this,r=!1,a=0,o=0,c,l=[];this.onStart=void 0,this.onLoad=t,this.onProgress=e,this.onError=n,this.abortController=new AbortController,this.itemStart=function(h){o++,r===!1&&s.onStart!==void 0&&s.onStart(h,a,o),r=!0},this.itemEnd=function(h){a++,s.onProgress!==void 0&&s.onProgress(h,a,o),a===o&&(r=!1,s.onLoad!==void 0&&s.onLoad())},this.itemError=function(h){s.onError!==void 0&&s.onError(h)},this.resolveURL=function(h){return c?c(h):h},this.setURLModifier=function(h){return c=h,this},this.addHandler=function(h,u){return l.push(h,u),this},this.removeHandler=function(h){let u=l.indexOf(h);return u!==-1&&l.splice(u,2),this},this.getHandler=function(h){for(let u=0,d=l.length;u<d;u+=2){let p=l[u],m=l[u+1];if(p.global&&(p.lastIndex=0),p.test(h))return m}return null},this.abort=function(){return this.abortController.abort(),this.abortController=new AbortController,this}}},rh=new Fr,Or=class{constructor(t){this.manager=t!==void 0?t:rh,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={}}load(){}loadAsync(t,e){let n=this;return new Promise(function(s,r){n.load(t,s,e,r)})}parse(){}setCrossOrigin(t){return this.crossOrigin=t,this}setWithCredentials(t){return this.withCredentials=t,this}setPath(t){return this.path=t,this}setResourcePath(t){return this.resourcePath=t,this}setRequestHeader(t){return this.requestHeader=t,this}abort(){return this}};Or.DEFAULT_MATERIAL_NAME="__DEFAULT";var Oi=class extends Se{constructor(t,e=1){super(),this.isLight=!0,this.type="Light",this.color=new $t(t),this.intensity=e}dispose(){}copy(t,e){return super.copy(t,e),this.color.copy(t.color),this.intensity=t.intensity,this}toJSON(t){let e=super.toJSON(t);return e.object.color=this.color.getHex(),e.object.intensity=this.intensity,this.groundColor!==void 0&&(e.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(e.object.distance=this.distance),this.angle!==void 0&&(e.object.angle=this.angle),this.decay!==void 0&&(e.object.decay=this.decay),this.penumbra!==void 0&&(e.object.penumbra=this.penumbra),this.shadow!==void 0&&(e.object.shadow=this.shadow.toJSON()),this.target!==void 0&&(e.object.target=this.target.uuid),e}},As=class extends Oi{constructor(t,e,n){super(t,n),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(Se.DEFAULT_UP),this.updateMatrix(),this.groundColor=new $t(e)}copy(t,e){return super.copy(t,e),this.groundColor.copy(t.groundColor),this}},go=new ae,rl=new D,al=new D,Br=class{constructor(t){this.camera=t,this.intensity=1,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new gt(512,512),this.mapType=Ze,this.map=null,this.mapPass=null,this.matrix=new ae,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Di,this._frameExtents=new gt(1,1),this._viewportCount=1,this._viewports=[new jt(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(t){let e=this.camera,n=this.matrix;rl.setFromMatrixPosition(t.matrixWorld),e.position.copy(rl),al.setFromMatrixPosition(t.target.matrixWorld),e.lookAt(al),e.updateMatrixWorld(),go.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),this._frustum.setFromProjectionMatrix(go,e.coordinateSystem,e.reversedDepth),e.reversedDepth?n.set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1):n.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),n.multiply(go)}getViewport(t){return this._viewports[t]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(t){return this.camera=t.camera.clone(),this.intensity=t.intensity,this.bias=t.bias,this.radius=t.radius,this.autoUpdate=t.autoUpdate,this.needsUpdate=t.needsUpdate,this.normalBias=t.normalBias,this.blurSamples=t.blurSamples,this.mapSize.copy(t.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){let t={};return this.intensity!==1&&(t.intensity=this.intensity),this.bias!==0&&(t.bias=this.bias),this.normalBias!==0&&(t.normalBias=this.normalBias),this.radius!==1&&(t.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(t.mapSize=this.mapSize.toArray()),t.camera=this.camera.toJSON(!1).object,delete t.camera.matrix,t}};var ol=new ae,Ki=new D,_o=new D,Ao=class extends Br{constructor(){super(new _e(90,1,.5,500)),this.isPointLightShadow=!0,this._frameExtents=new gt(4,2),this._viewportCount=6,this._viewports=[new jt(2,1,1,1),new jt(0,1,1,1),new jt(3,1,1,1),new jt(1,1,1,1),new jt(3,0,1,1),new jt(1,0,1,1)],this._cubeDirections=[new D(1,0,0),new D(-1,0,0),new D(0,0,1),new D(0,0,-1),new D(0,1,0),new D(0,-1,0)],this._cubeUps=[new D(0,1,0),new D(0,1,0),new D(0,1,0),new D(0,1,0),new D(0,0,1),new D(0,0,-1)]}updateMatrices(t,e=0){let n=this.camera,s=this.matrix,r=t.distance||n.far;r!==n.far&&(n.far=r,n.updateProjectionMatrix()),Ki.setFromMatrixPosition(t.matrixWorld),n.position.copy(Ki),_o.copy(n.position),_o.add(this._cubeDirections[e]),n.up.copy(this._cubeUps[e]),n.lookAt(_o),n.updateMatrixWorld(),s.makeTranslation(-Ki.x,-Ki.y,-Ki.z),ol.multiplyMatrices(n.projectionMatrix,n.matrixWorldInverse),this._frustum.setFromProjectionMatrix(ol,n.coordinateSystem,n.reversedDepth)}},Cs=class extends Oi{constructor(t,e,n=0,s=2){super(t,e),this.isPointLight=!0,this.type="PointLight",this.distance=n,this.decay=s,this.shadow=new Ao}get power(){return this.intensity*4*Math.PI}set power(t){this.intensity=t/(4*Math.PI)}dispose(){this.shadow.dispose()}copy(t,e){return super.copy(t,e),this.distance=t.distance,this.decay=t.decay,this.shadow=t.shadow.clone(),this}},Rs=class extends us{constructor(t=-1,e=1,n=1,s=-1,r=.1,a=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=t,this.right=e,this.top=n,this.bottom=s,this.near=r,this.far=a,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.left=t.left,this.right=t.right,this.top=t.top,this.bottom=t.bottom,this.near=t.near,this.far=t.far,this.zoom=t.zoom,this.view=t.view===null?null:Object.assign({},t.view),this}setViewOffset(t,e,n,s,r,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let t=(this.right-this.left)/(2*this.zoom),e=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,s=(this.top+this.bottom)/2,r=n-t,a=n+t,o=s+e,c=s-e;if(this.view!==null&&this.view.enabled){let l=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=l*this.view.offsetX,a=r+l*this.view.width,o-=h*this.view.offsetY,c=o-h*this.view.height}this.projectionMatrix.makeOrthographic(r,a,o,c,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){let e=super.toJSON(t);return e.object.zoom=this.zoom,e.object.left=this.left,e.object.right=this.right,e.object.top=this.top,e.object.bottom=this.bottom,e.object.near=this.near,e.object.far=this.far,this.view!==null&&(e.object.view=Object.assign({},this.view)),e}},Co=class extends Br{constructor(){super(new Rs(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}},ei=class extends Oi{constructor(t,e){super(t,e),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(Se.DEFAULT_UP),this.updateMatrix(),this.target=new Se,this.shadow=new Co}dispose(){this.shadow.dispose()}copy(t){return super.copy(t),this.target=t.target.clone(),this.shadow=t.shadow.clone(),this}};var zr=class extends _e{constructor(t=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=t}};var jo="\\[\\]\\.:\\/",pd=new RegExp("["+jo+"]","g"),tc="[^"+jo+"]",md="[^"+jo.replace("\\.","")+"]",gd=/((?:WC+[\/:])*)/.source.replace("WC",tc),_d=/(WCOD+)?/.source.replace("WCOD",md),xd=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",tc),vd=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",tc),yd=new RegExp("^"+gd+_d+xd+vd+"$"),Md=["material","materials","bones","map"],Ro=class{constructor(t,e,n){let s=n||re.parseTrackName(e);this._targetGroup=t,this._bindings=t.subscribe_(e,s)}getValue(t,e){this.bind();let n=this._targetGroup.nCachedObjects_,s=this._bindings[n];s!==void 0&&s.getValue(t,e)}setValue(t,e){let n=this._bindings;for(let s=this._targetGroup.nCachedObjects_,r=n.length;s!==r;++s)n[s].setValue(t,e)}bind(){let t=this._bindings;for(let e=this._targetGroup.nCachedObjects_,n=t.length;e!==n;++e)t[e].bind()}unbind(){let t=this._bindings;for(let e=this._targetGroup.nCachedObjects_,n=t.length;e!==n;++e)t[e].unbind()}},re=class i{constructor(t,e,n){this.path=e,this.parsedPath=n||i.parseTrackName(e),this.node=i.findNode(t,this.parsedPath.nodeName),this.rootNode=t,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(t,e,n){return t&&t.isAnimationObjectGroup?new i.Composite(t,e,n):new i(t,e,n)}static sanitizeNodeName(t){return t.replace(/\s/g,"_").replace(pd,"")}static parseTrackName(t){let e=yd.exec(t);if(e===null)throw new Error("PropertyBinding: Cannot parse trackName: "+t);let n={nodeName:e[2],objectName:e[3],objectIndex:e[4],propertyName:e[5],propertyIndex:e[6]},s=n.nodeName&&n.nodeName.lastIndexOf(".");if(s!==void 0&&s!==-1){let r=n.nodeName.substring(s+1);Md.indexOf(r)!==-1&&(n.nodeName=n.nodeName.substring(0,s),n.objectName=r)}if(n.propertyName===null||n.propertyName.length===0)throw new Error("PropertyBinding: can not parse propertyName from trackName: "+t);return n}static findNode(t,e){if(e===void 0||e===""||e==="."||e===-1||e===t.name||e===t.uuid)return t;if(t.skeleton){let n=t.skeleton.getBoneByName(e);if(n!==void 0)return n}if(t.children){let n=function(r){for(let a=0;a<r.length;a++){let o=r[a];if(o.name===e||o.uuid===e)return o;let c=n(o.children);if(c)return c}return null},s=n(t.children);if(s)return s}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(t,e){t[e]=this.targetObject[this.propertyName]}_getValue_array(t,e){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)t[e++]=n[s]}_getValue_arrayElement(t,e){t[e]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(t,e){this.resolvedProperty.toArray(t,e)}_setValue_direct(t,e){this.targetObject[this.propertyName]=t[e]}_setValue_direct_setNeedsUpdate(t,e){this.targetObject[this.propertyName]=t[e],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(t,e){this.targetObject[this.propertyName]=t[e],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(t,e){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=t[e++]}_setValue_array_setNeedsUpdate(t,e){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=t[e++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(t,e){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=t[e++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(t,e){this.resolvedProperty[this.propertyIndex]=t[e]}_setValue_arrayElement_setNeedsUpdate(t,e){this.resolvedProperty[this.propertyIndex]=t[e],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(t,e){this.resolvedProperty[this.propertyIndex]=t[e],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(t,e){this.resolvedProperty.fromArray(t,e)}_setValue_fromArray_setNeedsUpdate(t,e){this.resolvedProperty.fromArray(t,e),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(t,e){this.resolvedProperty.fromArray(t,e),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(t,e){this.bind(),this.getValue(t,e)}_setValue_unbound(t,e){this.bind(),this.setValue(t,e)}bind(){let t=this.node,e=this.parsedPath,n=e.objectName,s=e.propertyName,r=e.propertyIndex;if(t||(t=i.findNode(this.rootNode,e.nodeName),this.node=t),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!t){console.warn("THREE.PropertyBinding: No target node found for track: "+this.path+".");return}if(n){let l=e.objectIndex;switch(n){case"materials":if(!t.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!t.material.materials){console.error("THREE.PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}t=t.material.materials;break;case"bones":if(!t.skeleton){console.error("THREE.PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}t=t.skeleton.bones;for(let h=0;h<t.length;h++)if(t[h].name===l){l=h;break}break;case"map":if("map"in t){t=t.map;break}if(!t.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!t.material.map){console.error("THREE.PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}t=t.material.map;break;default:if(t[n]===void 0){console.error("THREE.PropertyBinding: Can not bind to objectName of node undefined.",this);return}t=t[n]}if(l!==void 0){if(t[l]===void 0){console.error("THREE.PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,t);return}t=t[l]}}let a=t[s];if(a===void 0){let l=e.nodeName;console.error("THREE.PropertyBinding: Trying to update property for track: "+l+"."+s+" but it wasn't found.",t);return}let o=this.Versioning.None;this.targetObject=t,t.isMaterial===!0?o=this.Versioning.NeedsUpdate:t.isObject3D===!0&&(o=this.Versioning.MatrixWorldNeedsUpdate);let c=this.BindingType.Direct;if(r!==void 0){if(s==="morphTargetInfluences"){if(!t.geometry){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!t.geometry.morphAttributes){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}t.morphTargetDictionary[r]!==void 0&&(r=t.morphTargetDictionary[r])}c=this.BindingType.ArrayElement,this.resolvedProperty=a,this.propertyIndex=r}else a.fromArray!==void 0&&a.toArray!==void 0?(c=this.BindingType.HasFromToArray,this.resolvedProperty=a):Array.isArray(a)?(c=this.BindingType.EntireArray,this.resolvedProperty=a):this.propertyName=s;this.getValue=this.GetterByBindingType[c],this.setValue=this.SetterByBindingTypeAndVersioning[c][o]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};re.Composite=Ro;re.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};re.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};re.prototype.GetterByBindingType=[re.prototype._getValue_direct,re.prototype._getValue_array,re.prototype._getValue_arrayElement,re.prototype._getValue_toArray];re.prototype.SetterByBindingTypeAndVersioning=[[re.prototype._setValue_direct,re.prototype._setValue_direct_setNeedsUpdate,re.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[re.prototype._setValue_array,re.prototype._setValue_array_setNeedsUpdate,re.prototype._setValue_array_setMatrixWorldNeedsUpdate],[re.prototype._setValue_arrayElement,re.prototype._setValue_arrayElement_setNeedsUpdate,re.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[re.prototype._setValue_fromArray,re.prototype._setValue_fromArray_setNeedsUpdate,re.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var M0=new Float32Array(1);var cl=new ae,Is=class{constructor(t,e,n=0,s=1/0){this.ray=new cs(t,e),this.near=n,this.far=s,this.camera=null,this.layers=new Pi,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(t,e){this.ray.set(t,e)}setFromCamera(t,e){e.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(t.x,t.y,.5).unproject(e).sub(this.ray.origin).normalize(),this.camera=e):e.isOrthographicCamera?(this.ray.origin.set(t.x,t.y,(e.near+e.far)/(e.near-e.far)).unproject(e),this.ray.direction.set(0,0,-1).transformDirection(e.matrixWorld),this.camera=e):console.error("THREE.Raycaster: Unsupported camera type: "+e.type)}setFromXRController(t){return cl.identity().extractRotation(t.matrixWorld),this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(cl),this}intersectObject(t,e=!0,n=[]){return Io(t,this,n,e),n.sort(ll),n}intersectObjects(t,e=!0,n=[]){for(let s=0,r=t.length;s<r;s++)Io(t[s],this,n,e);return n.sort(ll),n}};function ll(i,t){return i.distance-t.distance}function Io(i,t,e,n){let s=!0;if(i.layers.test(t.layers)&&i.raycast(t,e)===!1&&(s=!1),s===!0&&n===!0){let r=i.children;for(let a=0,o=r.length;a<o;a++)Io(r[a],t,e,!0)}}function ec(i,t,e,n){let s=Sd(n);switch(e){case Ho:return i*t;case Wo:return i*t/s.components*s.byteLength;case jr:return i*t/s.components*s.byteLength;case Xo:return i*t*2/s.components*s.byteLength;case ta:return i*t*2/s.components*s.byteLength;case Go:return i*t*3/s.components*s.byteLength;case Ve:return i*t*4/s.components*s.byteLength;case ea:return i*t*4/s.components*s.byteLength;case Ds:case Us:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*8;case Ns:case Fs:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case ia:case ra:return Math.max(i,16)*Math.max(t,8)/4;case na:case sa:return Math.max(i,8)*Math.max(t,8)/2;case aa:case oa:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*8;case ca:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case la:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case ha:return Math.floor((i+4)/5)*Math.floor((t+3)/4)*16;case ua:return Math.floor((i+4)/5)*Math.floor((t+4)/5)*16;case da:return Math.floor((i+5)/6)*Math.floor((t+4)/5)*16;case fa:return Math.floor((i+5)/6)*Math.floor((t+5)/6)*16;case pa:return Math.floor((i+7)/8)*Math.floor((t+4)/5)*16;case ma:return Math.floor((i+7)/8)*Math.floor((t+5)/6)*16;case ga:return Math.floor((i+7)/8)*Math.floor((t+7)/8)*16;case _a:return Math.floor((i+9)/10)*Math.floor((t+4)/5)*16;case xa:return Math.floor((i+9)/10)*Math.floor((t+5)/6)*16;case va:return Math.floor((i+9)/10)*Math.floor((t+7)/8)*16;case ya:return Math.floor((i+9)/10)*Math.floor((t+9)/10)*16;case Ma:return Math.floor((i+11)/12)*Math.floor((t+9)/10)*16;case Sa:return Math.floor((i+11)/12)*Math.floor((t+11)/12)*16;case ba:case Ea:case Ta:return Math.ceil(i/4)*Math.ceil(t/4)*16;case wa:case Aa:return Math.ceil(i/4)*Math.ceil(t/4)*8;case Ca:case Ra:return Math.ceil(i/4)*Math.ceil(t/4)*16}throw new Error(`Unable to determine texture byte length for ${e} format.`)}function Sd(i){switch(i){case Ze:case Bo:return{byteLength:1,components:1};case Bi:case zo:case zi:return{byteLength:2,components:1};case Kr:case Qr:return{byteLength:2,components:4};case Bn:case Jr:case rn:return{byteLength:4,components:1};case ko:case Vo:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${i}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"180"}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__="180");function Rh(){let i=null,t=!1,e=null,n=null;function s(r,a){e(r,a),n=i.requestAnimationFrame(s)}return{start:function(){t!==!0&&e!==null&&(n=i.requestAnimationFrame(s),t=!0)},stop:function(){i.cancelAnimationFrame(n),t=!1},setAnimationLoop:function(r){e=r},setContext:function(r){i=r}}}function Ed(i){let t=new WeakMap;function e(o,c){let l=o.array,h=o.usage,u=l.byteLength,d=i.createBuffer();i.bindBuffer(c,d),i.bufferData(c,l,h),o.onUploadCallback();let p;if(l instanceof Float32Array)p=i.FLOAT;else if(typeof Float16Array<"u"&&l instanceof Float16Array)p=i.HALF_FLOAT;else if(l instanceof Uint16Array)o.isFloat16BufferAttribute?p=i.HALF_FLOAT:p=i.UNSIGNED_SHORT;else if(l instanceof Int16Array)p=i.SHORT;else if(l instanceof Uint32Array)p=i.UNSIGNED_INT;else if(l instanceof Int32Array)p=i.INT;else if(l instanceof Int8Array)p=i.BYTE;else if(l instanceof Uint8Array)p=i.UNSIGNED_BYTE;else if(l instanceof Uint8ClampedArray)p=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+l);return{buffer:d,type:p,bytesPerElement:l.BYTES_PER_ELEMENT,version:o.version,size:u}}function n(o,c,l){let h=c.array,u=c.updateRanges;if(i.bindBuffer(l,o),u.length===0)i.bufferSubData(l,0,h);else{u.sort((p,m)=>p.start-m.start);let d=0;for(let p=1;p<u.length;p++){let m=u[d],v=u[p];v.start<=m.start+m.count+1?m.count=Math.max(m.count,v.start+v.count-m.start):(++d,u[d]=v)}u.length=d+1;for(let p=0,m=u.length;p<m;p++){let v=u[p];i.bufferSubData(l,v.start*h.BYTES_PER_ELEMENT,h,v.start,v.count)}c.clearUpdateRanges()}c.onUploadCallback()}function s(o){return o.isInterleavedBufferAttribute&&(o=o.data),t.get(o)}function r(o){o.isInterleavedBufferAttribute&&(o=o.data);let c=t.get(o);c&&(i.deleteBuffer(c.buffer),t.delete(o))}function a(o,c){if(o.isInterleavedBufferAttribute&&(o=o.data),o.isGLBufferAttribute){let h=t.get(o);(!h||h.version<o.version)&&t.set(o,{buffer:o.buffer,type:o.type,bytesPerElement:o.elementSize,version:o.version});return}let l=t.get(o);if(l===void 0)t.set(o,e(o,c));else if(l.version<o.version){if(l.size!==o.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(l.buffer,o,c),l.version=o.version}}return{get:s,remove:r,update:a}}var Td=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,wd=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,Ad=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,Cd=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Rd=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,Id=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,Pd=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,Ld=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,Dd=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec3 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 ).rgb;
	}
#endif`,Ud=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,Nd=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Fd=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,Od=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,Bd=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,zd=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,kd=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,Vd=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Hd=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Gd=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Wd=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,Xd=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,qd=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,Yd=`#if defined( USE_COLOR_ALPHA )
	vColor = vec4( 1.0 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
#endif
#ifdef USE_BATCHING_COLOR
	vec3 batchingColor = getBatchingColor( getIndirectIndex( gl_DrawID ) );
	vColor.xyz *= batchingColor.xyz;
#endif`,$d=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
mat3 transposeMat3( const in mat3 m ) {
	mat3 tmp;
	tmp[ 0 ] = vec3( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x );
	tmp[ 1 ] = vec3( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y );
	tmp[ 2 ] = vec3( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z );
	return tmp;
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,Zd=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,Jd=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,Kd=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,Qd=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,jd=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,tf=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,ef="gl_FragColor = linearToOutputTexel( gl_FragColor );",nf=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,sf=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
	#else
		vec4 envColor = vec4( 0.0 );
	#endif
	#ifdef ENVMAP_BLENDING_MULTIPLY
		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_MIX )
		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_ADD )
		outgoingLight += envColor.xyz * specularStrength * reflectivity;
	#endif
#endif`,rf=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,af=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,of=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,cf=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,lf=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,hf=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,uf=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,df=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,ff=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,pf=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,mf=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,gf=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,_f=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,xf=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, roughness * roughness) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,vf=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,yf=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,Mf=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,Sf=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,bf=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = mix( min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = mix( vec3( 0.04 ), diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.07, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,Ef=`struct PhysicalMaterial {
	vec3 diffuseColor;
	float roughness;
	vec3 specularColor;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		float v = 0.5 / ( gv + gl );
		return saturate(v);
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColor;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transposeMat3( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float a = roughness < 0.25 ? -339.2 * r2 + 161.4 * roughness - 25.9 : -8.48 * r2 + 14.3 * roughness - 9.95;
	float b = roughness < 0.25 ? 44.0 * r2 - 23.7 * roughness + 3.26 : 1.97 * r2 - 3.27 * roughness + 0.72;
	float DG = exp( a * dotNV + b ) + ( roughness < 0.25 ? 0.0 : 0.1 * ( roughness - 0.25 ) );
	return saturate( DG * RECIPROCAL_PI );
}
vec2 DFGApprox( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	const vec4 c0 = vec4( - 1, - 0.0275, - 0.572, 0.022 );
	const vec4 c1 = vec4( 1, 0.0425, 1.04, - 0.04 );
	vec4 r = roughness * c0 + c1;
	float a004 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;
	vec2 fab = vec2( - 1.04, 1.04 ) * a004 + r.zw;
	return fab;
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
	#endif
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnel, material.roughness, singleScattering, multiScattering );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScattering, multiScattering );
	#endif
	vec3 totalScattering = singleScattering + multiScattering;
	vec3 diffuse = material.diffuseColor * ( 1.0 - max( max( totalScattering.r, totalScattering.g ), totalScattering.b ) );
	reflectedLight.indirectSpecular += radiance * singleScattering;
	reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;
	reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,Tf=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,wf=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
		iblIrradiance += getIBLIrradiance( geometryNormal );
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,Af=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,Cf=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,Rf=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,If=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Pf=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,Lf=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,Df=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,Uf=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,Nf=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Ff=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,Of=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,Bf=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,zf=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,kf=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Vf=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,Hf=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Gf=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,Wf=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,Xf=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,qf=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Yf=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,$f=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,Zf=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,Jf=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,Kf=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,Qf=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,jf=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,tp=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return depth * ( near - far ) - near;
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return ( near * far ) / ( ( far - near ) * depth - far );
}`,ep=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,np=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,ip=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,sp=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,rp=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,ap=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,op=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
		float depth = unpackRGBAToDepth( texture2D( depths, uv ) );
		#ifdef USE_REVERSED_DEPTH_BUFFER
			return step( depth, compare );
		#else
			return step( compare, depth );
		#endif
	}
	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
		return unpackRGBATo2Half( texture2D( shadow, uv ) );
	}
	float VSMShadow( sampler2D shadow, vec2 uv, float compare ) {
		float occlusion = 1.0;
		vec2 distribution = texture2DDistribution( shadow, uv );
		#ifdef USE_REVERSED_DEPTH_BUFFER
			float hard_shadow = step( distribution.x, compare );
		#else
			float hard_shadow = step( compare, distribution.x );
		#endif
		if ( hard_shadow != 1.0 ) {
			float distance = compare - distribution.x;
			float variance = max( 0.00000, distribution.y * distribution.y );
			float softness_probability = variance / (variance + distance * distance );			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 );			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );
		}
		return occlusion;
	}
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		float shadow = 1.0;
		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;
		bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
		bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
		if ( frustumTest ) {
		#if defined( SHADOWMAP_TYPE_PCF )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;
			float dx2 = dx0 / 2.0;
			float dy2 = dy0 / 2.0;
			float dx3 = dx1 / 2.0;
			float dy3 = dy1 / 2.0;
			shadow = (
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 17.0 );
		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx = texelSize.x;
			float dy = texelSize.y;
			vec2 uv = shadowCoord.xy;
			vec2 f = fract( uv * shadowMapSize + 0.5 );
			uv -= f * texelSize;
			shadow = (
				texture2DCompare( shadowMap, uv, shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),
						  f.x ),
					 mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),
						  f.x ),
					 f.y )
			) * ( 1.0 / 9.0 );
		#elif defined( SHADOWMAP_TYPE_VSM )
			shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );
		#else
			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );
		#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	vec2 cubeToUV( vec3 v, float texelSizeY ) {
		vec3 absV = abs( v );
		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );
		vec2 planar = v.xy;
		float almostATexel = 1.5 * texelSizeY;
		float almostOne = 1.0 - almostATexel;
		if ( absV.z >= almostOne ) {
			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;
		} else if ( absV.x >= almostOne ) {
			float signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;
		} else if ( absV.y >= almostOne ) {
			float signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;
		}
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
	}
	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		
		float lightToPositionLength = length( lightToPosition );
		if ( lightToPositionLength - shadowCameraFar <= 0.0 && lightToPositionLength - shadowCameraNear >= 0.0 ) {
			float dp = ( lightToPositionLength - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );
			#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )
				vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;
				shadow = (
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
				) * ( 1.0 / 9.0 );
			#else
				shadow = texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );
			#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
#endif`,cp=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,lp=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,hp=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,up=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,dp=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,fp=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,pp=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,mp=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,gp=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,_p=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,xp=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,vp=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,yp=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,Mp=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,Sp=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,bp=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,Ep=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,Tp=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,wp=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Ap=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Cp=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Rp=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Ip=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Pp=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,Lp=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,Dp=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,Up=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = packDepthToRGBA( dist );
}`,Np=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,Fp=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Op=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Bp=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,zp=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,kp=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Vp=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Hp=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Gp=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,Wp=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Xp=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,qp=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <packing>
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( packNormalToRGB( normal ), diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,Yp=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,$p=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Zp=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,Jp=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Kp=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Qp=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,jp=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,t1=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,e1=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,n1=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,i1=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,s1=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,qt={alphahash_fragment:Td,alphahash_pars_fragment:wd,alphamap_fragment:Ad,alphamap_pars_fragment:Cd,alphatest_fragment:Rd,alphatest_pars_fragment:Id,aomap_fragment:Pd,aomap_pars_fragment:Ld,batching_pars_vertex:Dd,batching_vertex:Ud,begin_vertex:Nd,beginnormal_vertex:Fd,bsdfs:Od,iridescence_fragment:Bd,bumpmap_pars_fragment:zd,clipping_planes_fragment:kd,clipping_planes_pars_fragment:Vd,clipping_planes_pars_vertex:Hd,clipping_planes_vertex:Gd,color_fragment:Wd,color_pars_fragment:Xd,color_pars_vertex:qd,color_vertex:Yd,common:$d,cube_uv_reflection_fragment:Zd,defaultnormal_vertex:Jd,displacementmap_pars_vertex:Kd,displacementmap_vertex:Qd,emissivemap_fragment:jd,emissivemap_pars_fragment:tf,colorspace_fragment:ef,colorspace_pars_fragment:nf,envmap_fragment:sf,envmap_common_pars_fragment:rf,envmap_pars_fragment:af,envmap_pars_vertex:of,envmap_physical_pars_fragment:xf,envmap_vertex:cf,fog_vertex:lf,fog_pars_vertex:hf,fog_fragment:uf,fog_pars_fragment:df,gradientmap_pars_fragment:ff,lightmap_pars_fragment:pf,lights_lambert_fragment:mf,lights_lambert_pars_fragment:gf,lights_pars_begin:_f,lights_toon_fragment:vf,lights_toon_pars_fragment:yf,lights_phong_fragment:Mf,lights_phong_pars_fragment:Sf,lights_physical_fragment:bf,lights_physical_pars_fragment:Ef,lights_fragment_begin:Tf,lights_fragment_maps:wf,lights_fragment_end:Af,logdepthbuf_fragment:Cf,logdepthbuf_pars_fragment:Rf,logdepthbuf_pars_vertex:If,logdepthbuf_vertex:Pf,map_fragment:Lf,map_pars_fragment:Df,map_particle_fragment:Uf,map_particle_pars_fragment:Nf,metalnessmap_fragment:Ff,metalnessmap_pars_fragment:Of,morphinstance_vertex:Bf,morphcolor_vertex:zf,morphnormal_vertex:kf,morphtarget_pars_vertex:Vf,morphtarget_vertex:Hf,normal_fragment_begin:Gf,normal_fragment_maps:Wf,normal_pars_fragment:Xf,normal_pars_vertex:qf,normal_vertex:Yf,normalmap_pars_fragment:$f,clearcoat_normal_fragment_begin:Zf,clearcoat_normal_fragment_maps:Jf,clearcoat_pars_fragment:Kf,iridescence_pars_fragment:Qf,opaque_fragment:jf,packing:tp,premultiplied_alpha_fragment:ep,project_vertex:np,dithering_fragment:ip,dithering_pars_fragment:sp,roughnessmap_fragment:rp,roughnessmap_pars_fragment:ap,shadowmap_pars_fragment:op,shadowmap_pars_vertex:cp,shadowmap_vertex:lp,shadowmask_pars_fragment:hp,skinbase_vertex:up,skinning_pars_vertex:dp,skinning_vertex:fp,skinnormal_vertex:pp,specularmap_fragment:mp,specularmap_pars_fragment:gp,tonemapping_fragment:_p,tonemapping_pars_fragment:xp,transmission_fragment:vp,transmission_pars_fragment:yp,uv_pars_fragment:Mp,uv_pars_vertex:Sp,uv_vertex:bp,worldpos_vertex:Ep,background_vert:Tp,background_frag:wp,backgroundCube_vert:Ap,backgroundCube_frag:Cp,cube_vert:Rp,cube_frag:Ip,depth_vert:Pp,depth_frag:Lp,distanceRGBA_vert:Dp,distanceRGBA_frag:Up,equirect_vert:Np,equirect_frag:Fp,linedashed_vert:Op,linedashed_frag:Bp,meshbasic_vert:zp,meshbasic_frag:kp,meshlambert_vert:Vp,meshlambert_frag:Hp,meshmatcap_vert:Gp,meshmatcap_frag:Wp,meshnormal_vert:Xp,meshnormal_frag:qp,meshphong_vert:Yp,meshphong_frag:$p,meshphysical_vert:Zp,meshphysical_frag:Jp,meshtoon_vert:Kp,meshtoon_frag:Qp,points_vert:jp,points_frag:t1,shadow_vert:e1,shadow_frag:n1,sprite_vert:i1,sprite_frag:s1},xt={common:{diffuse:{value:new $t(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Wt},alphaMap:{value:null},alphaMapTransform:{value:new Wt},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Wt}},envmap:{envMap:{value:null},envMapRotation:{value:new Wt},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Wt}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Wt}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Wt},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Wt},normalScale:{value:new gt(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Wt},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Wt}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Wt}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Wt}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new $t(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new $t(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Wt},alphaTest:{value:0},uvTransform:{value:new Wt}},sprite:{diffuse:{value:new $t(16777215)},opacity:{value:1},center:{value:new gt(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Wt},alphaMap:{value:null},alphaMapTransform:{value:new Wt},alphaTest:{value:0}}},an={basic:{uniforms:be([xt.common,xt.specularmap,xt.envmap,xt.aomap,xt.lightmap,xt.fog]),vertexShader:qt.meshbasic_vert,fragmentShader:qt.meshbasic_frag},lambert:{uniforms:be([xt.common,xt.specularmap,xt.envmap,xt.aomap,xt.lightmap,xt.emissivemap,xt.bumpmap,xt.normalmap,xt.displacementmap,xt.fog,xt.lights,{emissive:{value:new $t(0)}}]),vertexShader:qt.meshlambert_vert,fragmentShader:qt.meshlambert_frag},phong:{uniforms:be([xt.common,xt.specularmap,xt.envmap,xt.aomap,xt.lightmap,xt.emissivemap,xt.bumpmap,xt.normalmap,xt.displacementmap,xt.fog,xt.lights,{emissive:{value:new $t(0)},specular:{value:new $t(1118481)},shininess:{value:30}}]),vertexShader:qt.meshphong_vert,fragmentShader:qt.meshphong_frag},standard:{uniforms:be([xt.common,xt.envmap,xt.aomap,xt.lightmap,xt.emissivemap,xt.bumpmap,xt.normalmap,xt.displacementmap,xt.roughnessmap,xt.metalnessmap,xt.fog,xt.lights,{emissive:{value:new $t(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:qt.meshphysical_vert,fragmentShader:qt.meshphysical_frag},toon:{uniforms:be([xt.common,xt.aomap,xt.lightmap,xt.emissivemap,xt.bumpmap,xt.normalmap,xt.displacementmap,xt.gradientmap,xt.fog,xt.lights,{emissive:{value:new $t(0)}}]),vertexShader:qt.meshtoon_vert,fragmentShader:qt.meshtoon_frag},matcap:{uniforms:be([xt.common,xt.bumpmap,xt.normalmap,xt.displacementmap,xt.fog,{matcap:{value:null}}]),vertexShader:qt.meshmatcap_vert,fragmentShader:qt.meshmatcap_frag},points:{uniforms:be([xt.points,xt.fog]),vertexShader:qt.points_vert,fragmentShader:qt.points_frag},dashed:{uniforms:be([xt.common,xt.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:qt.linedashed_vert,fragmentShader:qt.linedashed_frag},depth:{uniforms:be([xt.common,xt.displacementmap]),vertexShader:qt.depth_vert,fragmentShader:qt.depth_frag},normal:{uniforms:be([xt.common,xt.bumpmap,xt.normalmap,xt.displacementmap,{opacity:{value:1}}]),vertexShader:qt.meshnormal_vert,fragmentShader:qt.meshnormal_frag},sprite:{uniforms:be([xt.sprite,xt.fog]),vertexShader:qt.sprite_vert,fragmentShader:qt.sprite_frag},background:{uniforms:{uvTransform:{value:new Wt},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:qt.background_vert,fragmentShader:qt.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Wt}},vertexShader:qt.backgroundCube_vert,fragmentShader:qt.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:qt.cube_vert,fragmentShader:qt.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:qt.equirect_vert,fragmentShader:qt.equirect_frag},distanceRGBA:{uniforms:be([xt.common,xt.displacementmap,{referencePosition:{value:new D},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:qt.distanceRGBA_vert,fragmentShader:qt.distanceRGBA_frag},shadow:{uniforms:be([xt.lights,xt.fog,{color:{value:new $t(0)},opacity:{value:1}}]),vertexShader:qt.shadow_vert,fragmentShader:qt.shadow_frag}};an.physical={uniforms:be([an.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Wt},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Wt},clearcoatNormalScale:{value:new gt(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Wt},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Wt},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Wt},sheen:{value:0},sheenColor:{value:new $t(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Wt},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Wt},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Wt},transmissionSamplerSize:{value:new gt},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Wt},attenuationDistance:{value:0},attenuationColor:{value:new $t(0)},specularColor:{value:new $t(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Wt},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Wt},anisotropyVector:{value:new gt},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Wt}}]),vertexShader:qt.meshphysical_vert,fragmentShader:qt.meshphysical_frag};var Ia={r:0,b:0,g:0},ai=new Ye,r1=new ae;function a1(i,t,e,n,s,r,a){let o=new $t(0),c=r===!0?0:1,l,h,u=null,d=0,p=null;function m(E){let M=E.isScene===!0?E.background:null;return M&&M.isTexture&&(M=(E.backgroundBlurriness>0?e:t).get(M)),M}function v(E){let M=!1,I=m(E);I===null?f(o,c):I&&I.isColor&&(f(I,1),M=!0);let C=i.xr.getEnvironmentBlendMode();C==="additive"?n.buffers.color.setClear(0,0,0,1,a):C==="alpha-blend"&&n.buffers.color.setClear(0,0,0,0,a),(i.autoClear||M)&&(n.buffers.depth.setTest(!0),n.buffers.depth.setMask(!0),n.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function g(E,M){let I=m(M);I&&(I.isCubeTexture||I.mapping===Ps)?(h===void 0&&(h=new ge(new Un(1,1,1),new $e({name:"BackgroundCubeMaterial",uniforms:ri(an.backgroundCube.uniforms),vertexShader:an.backgroundCube.vertexShader,fragmentShader:an.backgroundCube.fragmentShader,side:Ae,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),h.geometry.deleteAttribute("normal"),h.geometry.deleteAttribute("uv"),h.onBeforeRender=function(C,P,U){this.matrixWorld.copyPosition(U.matrixWorld)},Object.defineProperty(h.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),s.update(h)),ai.copy(M.backgroundRotation),ai.x*=-1,ai.y*=-1,ai.z*=-1,I.isCubeTexture&&I.isRenderTargetTexture===!1&&(ai.y*=-1,ai.z*=-1),h.material.uniforms.envMap.value=I,h.material.uniforms.flipEnvMap.value=I.isCubeTexture&&I.isRenderTargetTexture===!1?-1:1,h.material.uniforms.backgroundBlurriness.value=M.backgroundBlurriness,h.material.uniforms.backgroundIntensity.value=M.backgroundIntensity,h.material.uniforms.backgroundRotation.value.setFromMatrix4(r1.makeRotationFromEuler(ai)),h.material.toneMapped=Jt.getTransfer(I.colorSpace)!==te,(u!==I||d!==I.version||p!==i.toneMapping)&&(h.material.needsUpdate=!0,u=I,d=I.version,p=i.toneMapping),h.layers.enableAll(),E.unshift(h,h.geometry,h.material,0,0,null)):I&&I.isTexture&&(l===void 0&&(l=new ge(new Nn(2,2),new $e({name:"BackgroundMaterial",uniforms:ri(an.background.uniforms),vertexShader:an.background.vertexShader,fragmentShader:an.background.fragmentShader,side:pn,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),s.update(l)),l.material.uniforms.t2D.value=I,l.material.uniforms.backgroundIntensity.value=M.backgroundIntensity,l.material.toneMapped=Jt.getTransfer(I.colorSpace)!==te,I.matrixAutoUpdate===!0&&I.updateMatrix(),l.material.uniforms.uvTransform.value.copy(I.matrix),(u!==I||d!==I.version||p!==i.toneMapping)&&(l.material.needsUpdate=!0,u=I,d=I.version,p=i.toneMapping),l.layers.enableAll(),E.unshift(l,l.geometry,l.material,0,0,null))}function f(E,M){E.getRGB(Ia,Ko(i)),n.buffers.color.setClear(Ia.r,Ia.g,Ia.b,M,a)}function w(){h!==void 0&&(h.geometry.dispose(),h.material.dispose(),h=void 0),l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0)}return{getClearColor:function(){return o},setClearColor:function(E,M=1){o.set(E),c=M,f(o,c)},getClearAlpha:function(){return c},setClearAlpha:function(E){c=E,f(o,c)},render:v,addToRenderList:g,dispose:w}}function o1(i,t){let e=i.getParameter(i.MAX_VERTEX_ATTRIBS),n={},s=d(null),r=s,a=!1;function o(x,A,N,k,G){let V=!1,q=u(k,N,A);r!==q&&(r=q,l(r.object)),V=p(x,k,N,G),V&&m(x,k,N,G),G!==null&&t.update(G,i.ELEMENT_ARRAY_BUFFER),(V||a)&&(a=!1,M(x,A,N,k),G!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,t.get(G).buffer))}function c(){return i.createVertexArray()}function l(x){return i.bindVertexArray(x)}function h(x){return i.deleteVertexArray(x)}function u(x,A,N){let k=N.wireframe===!0,G=n[x.id];G===void 0&&(G={},n[x.id]=G);let V=G[A.id];V===void 0&&(V={},G[A.id]=V);let q=V[k];return q===void 0&&(q=d(c()),V[k]=q),q}function d(x){let A=[],N=[],k=[];for(let G=0;G<e;G++)A[G]=0,N[G]=0,k[G]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:A,enabledAttributes:N,attributeDivisors:k,object:x,attributes:{},index:null}}function p(x,A,N,k){let G=r.attributes,V=A.attributes,q=0,nt=N.getAttributes();for(let X in nt)if(nt[X].location>=0){let it=G[X],rt=V[X];if(rt===void 0&&(X==="instanceMatrix"&&x.instanceMatrix&&(rt=x.instanceMatrix),X==="instanceColor"&&x.instanceColor&&(rt=x.instanceColor)),it===void 0||it.attribute!==rt||rt&&it.data!==rt.data)return!0;q++}return r.attributesNum!==q||r.index!==k}function m(x,A,N,k){let G={},V=A.attributes,q=0,nt=N.getAttributes();for(let X in nt)if(nt[X].location>=0){let it=V[X];it===void 0&&(X==="instanceMatrix"&&x.instanceMatrix&&(it=x.instanceMatrix),X==="instanceColor"&&x.instanceColor&&(it=x.instanceColor));let rt={};rt.attribute=it,it&&it.data&&(rt.data=it.data),G[X]=rt,q++}r.attributes=G,r.attributesNum=q,r.index=k}function v(){let x=r.newAttributes;for(let A=0,N=x.length;A<N;A++)x[A]=0}function g(x){f(x,0)}function f(x,A){let N=r.newAttributes,k=r.enabledAttributes,G=r.attributeDivisors;N[x]=1,k[x]===0&&(i.enableVertexAttribArray(x),k[x]=1),G[x]!==A&&(i.vertexAttribDivisor(x,A),G[x]=A)}function w(){let x=r.newAttributes,A=r.enabledAttributes;for(let N=0,k=A.length;N<k;N++)A[N]!==x[N]&&(i.disableVertexAttribArray(N),A[N]=0)}function E(x,A,N,k,G,V,q){q===!0?i.vertexAttribIPointer(x,A,N,G,V):i.vertexAttribPointer(x,A,N,k,G,V)}function M(x,A,N,k){v();let G=k.attributes,V=N.getAttributes(),q=A.defaultAttributeValues;for(let nt in V){let X=V[nt];if(X.location>=0){let ot=G[nt];if(ot===void 0&&(nt==="instanceMatrix"&&x.instanceMatrix&&(ot=x.instanceMatrix),nt==="instanceColor"&&x.instanceColor&&(ot=x.instanceColor)),ot!==void 0){let it=ot.normalized,rt=ot.itemSize,_t=t.get(ot);if(_t===void 0)continue;let bt=_t.buffer,Dt=_t.type,Ut=_t.bytesPerElement,Z=Dt===i.INT||Dt===i.UNSIGNED_INT||ot.gpuType===Jr;if(ot.isInterleavedBufferAttribute){let j=ot.data,pt=j.stride,vt=ot.offset;if(j.isInstancedInterleavedBuffer){for(let ht=0;ht<X.locationSize;ht++)f(X.location+ht,j.meshPerAttribute);x.isInstancedMesh!==!0&&k._maxInstanceCount===void 0&&(k._maxInstanceCount=j.meshPerAttribute*j.count)}else for(let ht=0;ht<X.locationSize;ht++)g(X.location+ht);i.bindBuffer(i.ARRAY_BUFFER,bt);for(let ht=0;ht<X.locationSize;ht++)E(X.location+ht,rt/X.locationSize,Dt,it,pt*Ut,(vt+rt/X.locationSize*ht)*Ut,Z)}else{if(ot.isInstancedBufferAttribute){for(let j=0;j<X.locationSize;j++)f(X.location+j,ot.meshPerAttribute);x.isInstancedMesh!==!0&&k._maxInstanceCount===void 0&&(k._maxInstanceCount=ot.meshPerAttribute*ot.count)}else for(let j=0;j<X.locationSize;j++)g(X.location+j);i.bindBuffer(i.ARRAY_BUFFER,bt);for(let j=0;j<X.locationSize;j++)E(X.location+j,rt/X.locationSize,Dt,it,rt*Ut,rt/X.locationSize*j*Ut,Z)}}else if(q!==void 0){let it=q[nt];if(it!==void 0)switch(it.length){case 2:i.vertexAttrib2fv(X.location,it);break;case 3:i.vertexAttrib3fv(X.location,it);break;case 4:i.vertexAttrib4fv(X.location,it);break;default:i.vertexAttrib1fv(X.location,it)}}}}w()}function I(){U();for(let x in n){let A=n[x];for(let N in A){let k=A[N];for(let G in k)h(k[G].object),delete k[G];delete A[N]}delete n[x]}}function C(x){if(n[x.id]===void 0)return;let A=n[x.id];for(let N in A){let k=A[N];for(let G in k)h(k[G].object),delete k[G];delete A[N]}delete n[x.id]}function P(x){for(let A in n){let N=n[A];if(N[x.id]===void 0)continue;let k=N[x.id];for(let G in k)h(k[G].object),delete k[G];delete N[x.id]}}function U(){S(),a=!0,r!==s&&(r=s,l(r.object))}function S(){s.geometry=null,s.program=null,s.wireframe=!1}return{setup:o,reset:U,resetDefaultState:S,dispose:I,releaseStatesOfGeometry:C,releaseStatesOfProgram:P,initAttributes:v,enableAttribute:g,disableUnusedAttributes:w}}function c1(i,t,e){let n;function s(l){n=l}function r(l,h){i.drawArrays(n,l,h),e.update(h,n,1)}function a(l,h,u){u!==0&&(i.drawArraysInstanced(n,l,h,u),e.update(h,n,u))}function o(l,h,u){if(u===0)return;t.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,l,0,h,0,u);let p=0;for(let m=0;m<u;m++)p+=h[m];e.update(p,n,1)}function c(l,h,u,d){if(u===0)return;let p=t.get("WEBGL_multi_draw");if(p===null)for(let m=0;m<l.length;m++)a(l[m],h[m],d[m]);else{p.multiDrawArraysInstancedWEBGL(n,l,0,h,0,d,0,u);let m=0;for(let v=0;v<u;v++)m+=h[v]*d[v];e.update(m,n,1)}}this.setMode=s,this.render=r,this.renderInstances=a,this.renderMultiDraw=o,this.renderMultiDrawInstances=c}function l1(i,t,e,n){let s;function r(){if(s!==void 0)return s;if(t.has("EXT_texture_filter_anisotropic")===!0){let P=t.get("EXT_texture_filter_anisotropic");s=i.getParameter(P.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else s=0;return s}function a(P){return!(P!==Ve&&n.convert(P)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function o(P){let U=P===zi&&(t.has("EXT_color_buffer_half_float")||t.has("EXT_color_buffer_float"));return!(P!==Ze&&n.convert(P)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE)&&P!==rn&&!U)}function c(P){if(P==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";P="mediump"}return P==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let l=e.precision!==void 0?e.precision:"highp",h=c(l);h!==l&&(console.warn("THREE.WebGLRenderer:",l,"not supported, using",h,"instead."),l=h);let u=e.logarithmicDepthBuffer===!0,d=e.reversedDepthBuffer===!0&&t.has("EXT_clip_control"),p=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),m=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),v=i.getParameter(i.MAX_TEXTURE_SIZE),g=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),f=i.getParameter(i.MAX_VERTEX_ATTRIBS),w=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),E=i.getParameter(i.MAX_VARYING_VECTORS),M=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),I=m>0,C=i.getParameter(i.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:c,textureFormatReadable:a,textureTypeReadable:o,precision:l,logarithmicDepthBuffer:u,reversedDepthBuffer:d,maxTextures:p,maxVertexTextures:m,maxTextureSize:v,maxCubemapSize:g,maxAttributes:f,maxVertexUniforms:w,maxVaryings:E,maxFragmentUniforms:M,vertexTextures:I,maxSamples:C}}function h1(i){let t=this,e=null,n=0,s=!1,r=!1,a=new Qe,o=new Wt,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(u,d){let p=u.length!==0||d||n!==0||s;return s=d,n=u.length,p},this.beginShadows=function(){r=!0,h(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(u,d){e=h(u,d,0)},this.setState=function(u,d,p){let m=u.clippingPlanes,v=u.clipIntersection,g=u.clipShadows,f=i.get(u);if(!s||m===null||m.length===0||r&&!g)r?h(null):l();else{let w=r?0:n,E=w*4,M=f.clippingState||null;c.value=M,M=h(m,d,E,p);for(let I=0;I!==E;++I)M[I]=e[I];f.clippingState=M,this.numIntersection=v?this.numPlanes:0,this.numPlanes+=w}};function l(){c.value!==e&&(c.value=e,c.needsUpdate=n>0),t.numPlanes=n,t.numIntersection=0}function h(u,d,p,m){let v=u!==null?u.length:0,g=null;if(v!==0){if(g=c.value,m!==!0||g===null){let f=p+v*4,w=d.matrixWorldInverse;o.getNormalMatrix(w),(g===null||g.length<f)&&(g=new Float32Array(f));for(let E=0,M=p;E!==v;++E,M+=4)a.copy(u[E]).applyMatrix4(w,o),a.normal.toArray(g,M),g[M+3]=a.constant}c.value=g,c.needsUpdate=!0}return t.numPlanes=v,t.numIntersection=0,g}}function u1(i){let t=new WeakMap;function e(a,o){return o===Yr?a.mapping=ni:o===$r&&(a.mapping=ii),a}function n(a){if(a&&a.isTexture){let o=a.mapping;if(o===Yr||o===$r)if(t.has(a)){let c=t.get(a).texture;return e(c,a.mapping)}else{let c=a.image;if(c&&c.height>0){let l=new yr(c.height);return l.fromEquirectangularTexture(i,a),t.set(a,l),a.addEventListener("dispose",s),e(l.texture,a.mapping)}else return null}}return a}function s(a){let o=a.target;o.removeEventListener("dispose",s);let c=t.get(o);c!==void 0&&(t.delete(o),c.dispose())}function r(){t=new WeakMap}return{get:n,dispose:r}}var Gi=4,ah=[.125,.215,.35,.446,.526,.582],li=20,nc=new Rs,oh=new $t,ic=null,sc=0,rc=0,ac=!1,ci=(1+Math.sqrt(5))/2,Hi=1/ci,ch=[new D(-ci,Hi,0),new D(ci,Hi,0),new D(-Hi,0,ci),new D(Hi,0,ci),new D(0,ci,-Hi),new D(0,ci,Hi),new D(-1,1,-1),new D(1,1,-1),new D(-1,1,1),new D(1,1,1)],d1=new D,Da=class{constructor(t){this._renderer=t,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(t,e=0,n=.1,s=100,r={}){let{size:a=256,position:o=d1}=r;ic=this._renderer.getRenderTarget(),sc=this._renderer.getActiveCubeFace(),rc=this._renderer.getActiveMipmapLevel(),ac=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(a);let c=this._allocateTargets();return c.depthBuffer=!0,this._sceneToCubeUV(t,n,s,c,o),e>0&&this._blur(c,0,0,e),this._applyPMREM(c),this._cleanup(c),c}fromEquirectangular(t,e=null){return this._fromTexture(t,e)}fromCubemap(t,e=null){return this._fromTexture(t,e)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=uh(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=hh(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(t){this._lodMax=Math.floor(Math.log2(t)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let t=0;t<this._lodPlanes.length;t++)this._lodPlanes[t].dispose()}_cleanup(t){this._renderer.setRenderTarget(ic,sc,rc),this._renderer.xr.enabled=ac,t.scissorTest=!1,Pa(t,0,0,t.width,t.height)}_fromTexture(t,e){t.mapping===ni||t.mapping===ii?this._setSize(t.image.length===0?16:t.image[0].width||t.image[0].image.width):this._setSize(t.image.width/4),ic=this._renderer.getRenderTarget(),sc=this._renderer.getActiveCubeFace(),rc=this._renderer.getActiveMipmapLevel(),ac=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let n=e||this._allocateTargets();return this._textureToCubeUV(t,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){let t=3*Math.max(this._cubeSize,112),e=4*this._cubeSize,n={magFilter:qe,minFilter:qe,generateMipmaps:!1,type:zi,format:Ve,colorSpace:Kn,depthBuffer:!1},s=lh(t,e,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==t||this._pingPongRenderTarget.height!==e){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=lh(t,e,n);let{_lodMax:r}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=f1(r)),this._blurMaterial=p1(r,t,e)}return s}_compileMaterial(t){let e=new ge(this._lodPlanes[0],t);this._renderer.compile(e,nc)}_sceneToCubeUV(t,e,n,s,r){let c=new _e(90,1,e,n),l=[1,-1,1,1,1,1],h=[1,1,1,-1,-1,-1],u=this._renderer,d=u.autoClear,p=u.toneMapping;u.getClearColor(oh),u.toneMapping=vn,u.autoClear=!1,u.state.buffers.depth.getReversed()&&(u.setRenderTarget(s),u.clearDepth(),u.setRenderTarget(null));let v=new Dn({name:"PMREM.Background",side:Ae,depthWrite:!1,depthTest:!1}),g=new ge(new Un,v),f=!1,w=t.background;w?w.isColor&&(v.color.copy(w),t.background=null,f=!0):(v.color.copy(oh),f=!0);for(let E=0;E<6;E++){let M=E%3;M===0?(c.up.set(0,l[E],0),c.position.set(r.x,r.y,r.z),c.lookAt(r.x+h[E],r.y,r.z)):M===1?(c.up.set(0,0,l[E]),c.position.set(r.x,r.y,r.z),c.lookAt(r.x,r.y+h[E],r.z)):(c.up.set(0,l[E],0),c.position.set(r.x,r.y,r.z),c.lookAt(r.x,r.y,r.z+h[E]));let I=this._cubeSize;Pa(s,M*I,E>2?I:0,I,I),u.setRenderTarget(s),f&&u.render(g,c),u.render(t,c)}g.geometry.dispose(),g.material.dispose(),u.toneMapping=p,u.autoClear=d,t.background=w}_textureToCubeUV(t,e){let n=this._renderer,s=t.mapping===ni||t.mapping===ii;s?(this._cubemapMaterial===null&&(this._cubemapMaterial=uh()),this._cubemapMaterial.uniforms.flipEnvMap.value=t.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=hh());let r=s?this._cubemapMaterial:this._equirectMaterial,a=new ge(this._lodPlanes[0],r),o=r.uniforms;o.envMap.value=t;let c=this._cubeSize;Pa(e,0,0,3*c,2*c),n.setRenderTarget(e),n.render(a,nc)}_applyPMREM(t){let e=this._renderer,n=e.autoClear;e.autoClear=!1;let s=this._lodPlanes.length;for(let r=1;r<s;r++){let a=Math.sqrt(this._sigmas[r]*this._sigmas[r]-this._sigmas[r-1]*this._sigmas[r-1]),o=ch[(s-r-1)%ch.length];this._blur(t,r-1,r,a,o)}e.autoClear=n}_blur(t,e,n,s,r){let a=this._pingPongRenderTarget;this._halfBlur(t,a,e,n,s,"latitudinal",r),this._halfBlur(a,t,n,n,s,"longitudinal",r)}_halfBlur(t,e,n,s,r,a,o){let c=this._renderer,l=this._blurMaterial;a!=="latitudinal"&&a!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");let h=3,u=new ge(this._lodPlanes[s],l),d=l.uniforms,p=this._sizeLods[n]-1,m=isFinite(r)?Math.PI/(2*p):2*Math.PI/(2*li-1),v=r/m,g=isFinite(r)?1+Math.floor(h*v):li;g>li&&console.warn(`sigmaRadians, ${r}, is too large and will clip, as it requested ${g} samples when the maximum is set to ${li}`);let f=[],w=0;for(let P=0;P<li;++P){let U=P/v,S=Math.exp(-U*U/2);f.push(S),P===0?w+=S:P<g&&(w+=2*S)}for(let P=0;P<f.length;P++)f[P]=f[P]/w;d.envMap.value=t.texture,d.samples.value=g,d.weights.value=f,d.latitudinal.value=a==="latitudinal",o&&(d.poleAxis.value=o);let{_lodMax:E}=this;d.dTheta.value=m,d.mipInt.value=E-n;let M=this._sizeLods[s],I=3*M*(s>E-Gi?s-E+Gi:0),C=4*(this._cubeSize-M);Pa(e,I,C,3*M,2*M),c.setRenderTarget(e),c.render(u,nc)}};function f1(i){let t=[],e=[],n=[],s=i,r=i-Gi+1+ah.length;for(let a=0;a<r;a++){let o=Math.pow(2,s);e.push(o);let c=1/o;a>i-Gi?c=ah[a-i+Gi-1]:a===0&&(c=0),n.push(c);let l=1/(o-2),h=-l,u=1+l,d=[h,h,u,h,u,u,h,h,u,u,h,u],p=6,m=6,v=3,g=2,f=1,w=new Float32Array(v*m*p),E=new Float32Array(g*m*p),M=new Float32Array(f*m*p);for(let C=0;C<p;C++){let P=C%3*2/3-1,U=C>2?0:-1,S=[P,U,0,P+2/3,U,0,P+2/3,U+1,0,P,U,0,P+2/3,U+1,0,P,U+1,0];w.set(S,v*m*C),E.set(d,g*m*C);let x=[C,C,C,C,C,C];M.set(x,f*m*C)}let I=new tn;I.setAttribute("position",new De(w,v)),I.setAttribute("uv",new De(E,g)),I.setAttribute("faceIndex",new De(M,f)),t.push(I),s>Gi&&s--}return{lodPlanes:t,sizeLods:e,sigmas:n}}function lh(i,t,e){let n=new je(i,t,e);return n.texture.mapping=Ps,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function Pa(i,t,e,n,s){i.viewport.set(t,e,n,s),i.scissor.set(t,e,n,s)}function p1(i,t,e){let n=new Float32Array(li),s=new D(0,1,0);return new $e({name:"SphericalGaussianBlur",defines:{n:li,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:n},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:s}},vertexShader:gc(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:xn,depthTest:!1,depthWrite:!1})}function hh(){return new $e({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:gc(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:xn,depthTest:!1,depthWrite:!1})}function uh(){return new $e({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:gc(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:xn,depthTest:!1,depthWrite:!1})}function gc(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}function m1(i){let t=new WeakMap,e=null;function n(o){if(o&&o.isTexture){let c=o.mapping,l=c===Yr||c===$r,h=c===ni||c===ii;if(l||h){let u=t.get(o),d=u!==void 0?u.texture.pmremVersion:0;if(o.isRenderTargetTexture&&o.pmremVersion!==d)return e===null&&(e=new Da(i)),u=l?e.fromEquirectangular(o,u):e.fromCubemap(o,u),u.texture.pmremVersion=o.pmremVersion,t.set(o,u),u.texture;if(u!==void 0)return u.texture;{let p=o.image;return l&&p&&p.height>0||h&&p&&s(p)?(e===null&&(e=new Da(i)),u=l?e.fromEquirectangular(o):e.fromCubemap(o),u.texture.pmremVersion=o.pmremVersion,t.set(o,u),o.addEventListener("dispose",r),u.texture):null}}}return o}function s(o){let c=0,l=6;for(let h=0;h<l;h++)o[h]!==void 0&&c++;return c===l}function r(o){let c=o.target;c.removeEventListener("dispose",r);let l=t.get(c);l!==void 0&&(t.delete(c),l.dispose())}function a(){t=new WeakMap,e!==null&&(e.dispose(),e=null)}return{get:n,dispose:a}}function g1(i){let t={};function e(n){if(t[n]!==void 0)return t[n];let s;switch(n){case"WEBGL_depth_texture":s=i.getExtension("WEBGL_depth_texture")||i.getExtension("MOZ_WEBGL_depth_texture")||i.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":s=i.getExtension("EXT_texture_filter_anisotropic")||i.getExtension("MOZ_EXT_texture_filter_anisotropic")||i.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":s=i.getExtension("WEBGL_compressed_texture_s3tc")||i.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||i.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":s=i.getExtension("WEBGL_compressed_texture_pvrtc")||i.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:s=i.getExtension(n)}return t[n]=s,s}return{has:function(n){return e(n)!==null},init:function(){e("EXT_color_buffer_float"),e("WEBGL_clip_cull_distance"),e("OES_texture_float_linear"),e("EXT_color_buffer_half_float"),e("WEBGL_multisampled_render_to_texture"),e("WEBGL_render_shared_exponent")},get:function(n){let s=e(n);return s===null&&Ci("THREE.WebGLRenderer: "+n+" extension not supported."),s}}}function _1(i,t,e,n){let s={},r=new WeakMap;function a(u){let d=u.target;d.index!==null&&t.remove(d.index);for(let m in d.attributes)t.remove(d.attributes[m]);d.removeEventListener("dispose",a),delete s[d.id];let p=r.get(d);p&&(t.remove(p),r.delete(d)),n.releaseStatesOfGeometry(d),d.isInstancedBufferGeometry===!0&&delete d._maxInstanceCount,e.memory.geometries--}function o(u,d){return s[d.id]===!0||(d.addEventListener("dispose",a),s[d.id]=!0,e.memory.geometries++),d}function c(u){let d=u.attributes;for(let p in d)t.update(d[p],i.ARRAY_BUFFER)}function l(u){let d=[],p=u.index,m=u.attributes.position,v=0;if(p!==null){let w=p.array;v=p.version;for(let E=0,M=w.length;E<M;E+=3){let I=w[E+0],C=w[E+1],P=w[E+2];d.push(I,C,C,P,P,I)}}else if(m!==void 0){let w=m.array;v=m.version;for(let E=0,M=w.length/3-1;E<M;E+=3){let I=E+0,C=E+1,P=E+2;d.push(I,C,C,P,P,I)}}else return;let g=new(Jo(d)?hs:ls)(d,1);g.version=v;let f=r.get(u);f&&t.remove(f),r.set(u,g)}function h(u){let d=r.get(u);if(d){let p=u.index;p!==null&&d.version<p.version&&l(u)}else l(u);return r.get(u)}return{get:o,update:c,getWireframeAttribute:h}}function x1(i,t,e){let n;function s(d){n=d}let r,a;function o(d){r=d.type,a=d.bytesPerElement}function c(d,p){i.drawElements(n,p,r,d*a),e.update(p,n,1)}function l(d,p,m){m!==0&&(i.drawElementsInstanced(n,p,r,d*a,m),e.update(p,n,m))}function h(d,p,m){if(m===0)return;t.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,p,0,r,d,0,m);let g=0;for(let f=0;f<m;f++)g+=p[f];e.update(g,n,1)}function u(d,p,m,v){if(m===0)return;let g=t.get("WEBGL_multi_draw");if(g===null)for(let f=0;f<d.length;f++)l(d[f]/a,p[f],v[f]);else{g.multiDrawElementsInstancedWEBGL(n,p,0,r,d,0,v,0,m);let f=0;for(let w=0;w<m;w++)f+=p[w]*v[w];e.update(f,n,1)}}this.setMode=s,this.setIndex=o,this.render=c,this.renderInstances=l,this.renderMultiDraw=h,this.renderMultiDrawInstances=u}function v1(i){let t={geometries:0,textures:0},e={frame:0,calls:0,triangles:0,points:0,lines:0};function n(r,a,o){switch(e.calls++,a){case i.TRIANGLES:e.triangles+=o*(r/3);break;case i.LINES:e.lines+=o*(r/2);break;case i.LINE_STRIP:e.lines+=o*(r-1);break;case i.LINE_LOOP:e.lines+=o*r;break;case i.POINTS:e.points+=o*r;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",a);break}}function s(){e.calls=0,e.triangles=0,e.points=0,e.lines=0}return{memory:t,render:e,programs:null,autoReset:!0,reset:s,update:n}}function y1(i,t,e){let n=new WeakMap,s=new jt;function r(a,o,c){let l=a.morphTargetInfluences,h=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,u=h!==void 0?h.length:0,d=n.get(o);if(d===void 0||d.count!==u){let S=function(){P.dispose(),n.delete(o),o.removeEventListener("dispose",S)};d!==void 0&&d.texture.dispose();let p=o.morphAttributes.position!==void 0,m=o.morphAttributes.normal!==void 0,v=o.morphAttributes.color!==void 0,g=o.morphAttributes.position||[],f=o.morphAttributes.normal||[],w=o.morphAttributes.color||[],E=0;p===!0&&(E=1),m===!0&&(E=2),v===!0&&(E=3);let M=o.attributes.position.count*E,I=1;M>t.maxTextureSize&&(I=Math.ceil(M/t.maxTextureSize),M=t.maxTextureSize);let C=new Float32Array(M*I*4*u),P=new os(C,M,I,u);P.type=rn,P.needsUpdate=!0;let U=E*4;for(let x=0;x<u;x++){let A=g[x],N=f[x],k=w[x],G=M*I*4*x;for(let V=0;V<A.count;V++){let q=V*U;p===!0&&(s.fromBufferAttribute(A,V),C[G+q+0]=s.x,C[G+q+1]=s.y,C[G+q+2]=s.z,C[G+q+3]=0),m===!0&&(s.fromBufferAttribute(N,V),C[G+q+4]=s.x,C[G+q+5]=s.y,C[G+q+6]=s.z,C[G+q+7]=0),v===!0&&(s.fromBufferAttribute(k,V),C[G+q+8]=s.x,C[G+q+9]=s.y,C[G+q+10]=s.z,C[G+q+11]=k.itemSize===4?s.w:1)}}d={count:u,texture:P,size:new gt(M,I)},n.set(o,d),o.addEventListener("dispose",S)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)c.getUniforms().setValue(i,"morphTexture",a.morphTexture,e);else{let p=0;for(let v=0;v<l.length;v++)p+=l[v];let m=o.morphTargetsRelative?1:1-p;c.getUniforms().setValue(i,"morphTargetBaseInfluence",m),c.getUniforms().setValue(i,"morphTargetInfluences",l)}c.getUniforms().setValue(i,"morphTargetsTexture",d.texture,e),c.getUniforms().setValue(i,"morphTargetsTextureSize",d.size)}return{update:r}}function M1(i,t,e,n){let s=new WeakMap;function r(c){let l=n.render.frame,h=c.geometry,u=t.get(c,h);if(s.get(u)!==l&&(t.update(u),s.set(u,l)),c.isInstancedMesh&&(c.hasEventListener("dispose",o)===!1&&c.addEventListener("dispose",o),s.get(c)!==l&&(e.update(c.instanceMatrix,i.ARRAY_BUFFER),c.instanceColor!==null&&e.update(c.instanceColor,i.ARRAY_BUFFER),s.set(c,l))),c.isSkinnedMesh){let d=c.skeleton;s.get(d)!==l&&(d.update(),s.set(d,l))}return u}function a(){s=new WeakMap}function o(c){let l=c.target;l.removeEventListener("dispose",o),e.remove(l.instanceMatrix),l.instanceColor!==null&&e.remove(l.instanceColor)}return{update:r,dispose:a}}var Ih=new Me,dh=new ms(1,1),Ph=new os,Lh=new xr,Dh=new ds,fh=[],ph=[],mh=new Float32Array(16),gh=new Float32Array(9),_h=new Float32Array(4);function Xi(i,t,e){let n=i[0];if(n<=0||n>0)return i;let s=t*e,r=fh[s];if(r===void 0&&(r=new Float32Array(s),fh[s]=r),t!==0){n.toArray(r,0);for(let a=1,o=0;a!==t;++a)o+=e,i[a].toArray(r,o)}return r}function fe(i,t){if(i.length!==t.length)return!1;for(let e=0,n=i.length;e<n;e++)if(i[e]!==t[e])return!1;return!0}function pe(i,t){for(let e=0,n=t.length;e<n;e++)i[e]=t[e]}function Na(i,t){let e=ph[t];e===void 0&&(e=new Int32Array(t),ph[t]=e);for(let n=0;n!==t;++n)e[n]=i.allocateTextureUnit();return e}function S1(i,t){let e=this.cache;e[0]!==t&&(i.uniform1f(this.addr,t),e[0]=t)}function b1(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2f(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(fe(e,t))return;i.uniform2fv(this.addr,t),pe(e,t)}}function E1(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3f(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else if(t.r!==void 0)(e[0]!==t.r||e[1]!==t.g||e[2]!==t.b)&&(i.uniform3f(this.addr,t.r,t.g,t.b),e[0]=t.r,e[1]=t.g,e[2]=t.b);else{if(fe(e,t))return;i.uniform3fv(this.addr,t),pe(e,t)}}function T1(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4f(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(fe(e,t))return;i.uniform4fv(this.addr,t),pe(e,t)}}function w1(i,t){let e=this.cache,n=t.elements;if(n===void 0){if(fe(e,t))return;i.uniformMatrix2fv(this.addr,!1,t),pe(e,t)}else{if(fe(e,n))return;_h.set(n),i.uniformMatrix2fv(this.addr,!1,_h),pe(e,n)}}function A1(i,t){let e=this.cache,n=t.elements;if(n===void 0){if(fe(e,t))return;i.uniformMatrix3fv(this.addr,!1,t),pe(e,t)}else{if(fe(e,n))return;gh.set(n),i.uniformMatrix3fv(this.addr,!1,gh),pe(e,n)}}function C1(i,t){let e=this.cache,n=t.elements;if(n===void 0){if(fe(e,t))return;i.uniformMatrix4fv(this.addr,!1,t),pe(e,t)}else{if(fe(e,n))return;mh.set(n),i.uniformMatrix4fv(this.addr,!1,mh),pe(e,n)}}function R1(i,t){let e=this.cache;e[0]!==t&&(i.uniform1i(this.addr,t),e[0]=t)}function I1(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2i(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(fe(e,t))return;i.uniform2iv(this.addr,t),pe(e,t)}}function P1(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3i(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(fe(e,t))return;i.uniform3iv(this.addr,t),pe(e,t)}}function L1(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4i(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(fe(e,t))return;i.uniform4iv(this.addr,t),pe(e,t)}}function D1(i,t){let e=this.cache;e[0]!==t&&(i.uniform1ui(this.addr,t),e[0]=t)}function U1(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2ui(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(fe(e,t))return;i.uniform2uiv(this.addr,t),pe(e,t)}}function N1(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3ui(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(fe(e,t))return;i.uniform3uiv(this.addr,t),pe(e,t)}}function F1(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4ui(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(fe(e,t))return;i.uniform4uiv(this.addr,t),pe(e,t)}}function O1(i,t,e){let n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s);let r;this.type===i.SAMPLER_2D_SHADOW?(dh.compareFunction=Yo,r=dh):r=Ih,e.setTexture2D(t||r,s)}function B1(i,t,e){let n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),e.setTexture3D(t||Lh,s)}function z1(i,t,e){let n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),e.setTextureCube(t||Dh,s)}function k1(i,t,e){let n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),e.setTexture2DArray(t||Ph,s)}function V1(i){switch(i){case 5126:return S1;case 35664:return b1;case 35665:return E1;case 35666:return T1;case 35674:return w1;case 35675:return A1;case 35676:return C1;case 5124:case 35670:return R1;case 35667:case 35671:return I1;case 35668:case 35672:return P1;case 35669:case 35673:return L1;case 5125:return D1;case 36294:return U1;case 36295:return N1;case 36296:return F1;case 35678:case 36198:case 36298:case 36306:case 35682:return O1;case 35679:case 36299:case 36307:return B1;case 35680:case 36300:case 36308:case 36293:return z1;case 36289:case 36303:case 36311:case 36292:return k1}}function H1(i,t){i.uniform1fv(this.addr,t)}function G1(i,t){let e=Xi(t,this.size,2);i.uniform2fv(this.addr,e)}function W1(i,t){let e=Xi(t,this.size,3);i.uniform3fv(this.addr,e)}function X1(i,t){let e=Xi(t,this.size,4);i.uniform4fv(this.addr,e)}function q1(i,t){let e=Xi(t,this.size,4);i.uniformMatrix2fv(this.addr,!1,e)}function Y1(i,t){let e=Xi(t,this.size,9);i.uniformMatrix3fv(this.addr,!1,e)}function $1(i,t){let e=Xi(t,this.size,16);i.uniformMatrix4fv(this.addr,!1,e)}function Z1(i,t){i.uniform1iv(this.addr,t)}function J1(i,t){i.uniform2iv(this.addr,t)}function K1(i,t){i.uniform3iv(this.addr,t)}function Q1(i,t){i.uniform4iv(this.addr,t)}function j1(i,t){i.uniform1uiv(this.addr,t)}function tm(i,t){i.uniform2uiv(this.addr,t)}function em(i,t){i.uniform3uiv(this.addr,t)}function nm(i,t){i.uniform4uiv(this.addr,t)}function im(i,t,e){let n=this.cache,s=t.length,r=Na(e,s);fe(n,r)||(i.uniform1iv(this.addr,r),pe(n,r));for(let a=0;a!==s;++a)e.setTexture2D(t[a]||Ih,r[a])}function sm(i,t,e){let n=this.cache,s=t.length,r=Na(e,s);fe(n,r)||(i.uniform1iv(this.addr,r),pe(n,r));for(let a=0;a!==s;++a)e.setTexture3D(t[a]||Lh,r[a])}function rm(i,t,e){let n=this.cache,s=t.length,r=Na(e,s);fe(n,r)||(i.uniform1iv(this.addr,r),pe(n,r));for(let a=0;a!==s;++a)e.setTextureCube(t[a]||Dh,r[a])}function am(i,t,e){let n=this.cache,s=t.length,r=Na(e,s);fe(n,r)||(i.uniform1iv(this.addr,r),pe(n,r));for(let a=0;a!==s;++a)e.setTexture2DArray(t[a]||Ph,r[a])}function om(i){switch(i){case 5126:return H1;case 35664:return G1;case 35665:return W1;case 35666:return X1;case 35674:return q1;case 35675:return Y1;case 35676:return $1;case 5124:case 35670:return Z1;case 35667:case 35671:return J1;case 35668:case 35672:return K1;case 35669:case 35673:return Q1;case 5125:return j1;case 36294:return tm;case 36295:return em;case 36296:return nm;case 35678:case 36198:case 36298:case 36306:case 35682:return im;case 35679:case 36299:case 36307:return sm;case 35680:case 36300:case 36308:case 36293:return rm;case 36289:case 36303:case 36311:case 36292:return am}}var cc=class{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.setValue=V1(e.type)}},lc=class{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.size=e.size,this.setValue=om(e.type)}},hc=class{constructor(t){this.id=t,this.seq=[],this.map={}}setValue(t,e,n){let s=this.seq;for(let r=0,a=s.length;r!==a;++r){let o=s[r];o.setValue(t,e[o.id],n)}}},oc=/(\w+)(\])?(\[|\.)?/g;function xh(i,t){i.seq.push(t),i.map[t.id]=t}function cm(i,t,e){let n=i.name,s=n.length;for(oc.lastIndex=0;;){let r=oc.exec(n),a=oc.lastIndex,o=r[1],c=r[2]==="]",l=r[3];if(c&&(o=o|0),l===void 0||l==="["&&a+2===s){xh(e,l===void 0?new cc(o,i,t):new lc(o,i,t));break}else{let u=e.map[o];u===void 0&&(u=new hc(o),xh(e,u)),e=u}}}var Wi=class{constructor(t,e){this.seq=[],this.map={};let n=t.getProgramParameter(e,t.ACTIVE_UNIFORMS);for(let s=0;s<n;++s){let r=t.getActiveUniform(e,s),a=t.getUniformLocation(e,r.name);cm(r,a,this)}}setValue(t,e,n,s){let r=this.map[e];r!==void 0&&r.setValue(t,n,s)}setOptional(t,e,n){let s=e[n];s!==void 0&&this.setValue(t,n,s)}static upload(t,e,n,s){for(let r=0,a=e.length;r!==a;++r){let o=e[r],c=n[o.id];c.needsUpdate!==!1&&o.setValue(t,c.value,s)}}static seqWithValue(t,e){let n=[];for(let s=0,r=t.length;s!==r;++s){let a=t[s];a.id in e&&n.push(a)}return n}};function vh(i,t,e){let n=i.createShader(t);return i.shaderSource(n,e),i.compileShader(n),n}var lm=37297,hm=0;function um(i,t){let e=i.split(`
`),n=[],s=Math.max(t-6,0),r=Math.min(t+6,e.length);for(let a=s;a<r;a++){let o=a+1;n.push(`${o===t?">":" "} ${o}: ${e[a]}`)}return n.join(`
`)}var yh=new Wt;function dm(i){Jt._getMatrix(yh,Jt.workingColorSpace,i);let t=`mat3( ${yh.elements.map(e=>e.toFixed(4))} )`;switch(Jt.getTransfer(i)){case ss:return[t,"LinearTransferOETF"];case te:return[t,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space: ",i),[t,"LinearTransferOETF"]}}function Mh(i,t,e){let n=i.getShaderParameter(t,i.COMPILE_STATUS),r=(i.getShaderInfoLog(t)||"").trim();if(n&&r==="")return"";let a=/ERROR: 0:(\d+)/.exec(r);if(a){let o=parseInt(a[1]);return e.toUpperCase()+`

`+r+`

`+um(i.getShaderSource(t),o)}else return r}function fm(i,t){let e=dm(t);return[`vec4 ${i}( vec4 value ) {`,`	return ${e[1]}( vec4( value.rgb * ${e[0]}, value.a ) );`,"}"].join(`
`)}function pm(i,t){let e;switch(t){case Dl:e="Linear";break;case Ul:e="Reinhard";break;case Nl:e="Cineon";break;case Fl:e="ACESFilmic";break;case Bl:e="AgX";break;case zl:e="Neutral";break;case Ol:e="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",t),e="Linear"}return"vec3 "+i+"( vec3 color ) { return "+e+"ToneMapping( color ); }"}var La=new D;function mm(){Jt.getLuminanceCoefficients(La);let i=La.x.toFixed(4),t=La.y.toFixed(4),e=La.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${t}, ${e} );`,"	return dot( weights, rgb );","}"].join(`
`)}function gm(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Os).join(`
`)}function _m(i){let t=[];for(let e in i){let n=i[e];n!==!1&&t.push("#define "+e+" "+n)}return t.join(`
`)}function xm(i,t){let e={},n=i.getProgramParameter(t,i.ACTIVE_ATTRIBUTES);for(let s=0;s<n;s++){let r=i.getActiveAttrib(t,s),a=r.name,o=1;r.type===i.FLOAT_MAT2&&(o=2),r.type===i.FLOAT_MAT3&&(o=3),r.type===i.FLOAT_MAT4&&(o=4),e[a]={type:r.type,location:i.getAttribLocation(t,a),locationSize:o}}return e}function Os(i){return i!==""}function Sh(i,t){let e=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return i.replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,e).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function bh(i,t){return i.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}var vm=/^[ \t]*#include +<([\w\d./]+)>/gm;function uc(i){return i.replace(vm,Mm)}var ym=new Map;function Mm(i,t){let e=qt[t];if(e===void 0){let n=ym.get(t);if(n!==void 0)e=qt[n],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',t,n);else throw new Error("Can not resolve #include <"+t+">")}return uc(e)}var Sm=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Eh(i){return i.replace(Sm,bm)}function bm(i,t,e,n){let s="";for(let r=parseInt(t);r<parseInt(e);r++)s+=n.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return s}function Th(i){let t=`precision ${i.precision} float;
	precision ${i.precision} int;
	precision ${i.precision} sampler2D;
	precision ${i.precision} samplerCube;
	precision ${i.precision} sampler3D;
	precision ${i.precision} sampler2DArray;
	precision ${i.precision} sampler2DShadow;
	precision ${i.precision} samplerCubeShadow;
	precision ${i.precision} sampler2DArrayShadow;
	precision ${i.precision} isampler2D;
	precision ${i.precision} isampler3D;
	precision ${i.precision} isamplerCube;
	precision ${i.precision} isampler2DArray;
	precision ${i.precision} usampler2D;
	precision ${i.precision} usampler3D;
	precision ${i.precision} usamplerCube;
	precision ${i.precision} usampler2DArray;
	`;return i.precision==="highp"?t+=`
#define HIGH_PRECISION`:i.precision==="mediump"?t+=`
#define MEDIUM_PRECISION`:i.precision==="lowp"&&(t+=`
#define LOW_PRECISION`),t}function Em(i){let t="SHADOWMAP_TYPE_BASIC";return i.shadowMapType===Lo?t="SHADOWMAP_TYPE_PCF":i.shadowMapType===dl?t="SHADOWMAP_TYPE_PCF_SOFT":i.shadowMapType===en&&(t="SHADOWMAP_TYPE_VSM"),t}function Tm(i){let t="ENVMAP_TYPE_CUBE";if(i.envMap)switch(i.envMapMode){case ni:case ii:t="ENVMAP_TYPE_CUBE";break;case Ps:t="ENVMAP_TYPE_CUBE_UV";break}return t}function wm(i){let t="ENVMAP_MODE_REFLECTION";return i.envMap&&i.envMapMode===ii&&(t="ENVMAP_MODE_REFRACTION"),t}function Am(i){let t="ENVMAP_BLENDING_NONE";if(i.envMap)switch(i.combine){case Fo:t="ENVMAP_BLENDING_MULTIPLY";break;case Pl:t="ENVMAP_BLENDING_MIX";break;case Ll:t="ENVMAP_BLENDING_ADD";break}return t}function Cm(i){let t=i.envMapCubeUVHeight;if(t===null)return null;let e=Math.log2(t)-2,n=1/t;return{texelWidth:1/(3*Math.max(Math.pow(2,e),112)),texelHeight:n,maxMip:e}}function Rm(i,t,e,n){let s=i.getContext(),r=e.defines,a=e.vertexShader,o=e.fragmentShader,c=Em(e),l=Tm(e),h=wm(e),u=Am(e),d=Cm(e),p=gm(e),m=_m(r),v=s.createProgram(),g,f,w=e.glslVersion?"#version "+e.glslVersion+`
`:"";e.isRawShaderMaterial?(g=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,m].filter(Os).join(`
`),g.length>0&&(g+=`
`),f=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,m].filter(Os).join(`
`),f.length>0&&(f+=`
`)):(g=[Th(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,m,e.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",e.batching?"#define USE_BATCHING":"",e.batchingColor?"#define USE_BATCHING_COLOR":"",e.instancing?"#define USE_INSTANCING":"",e.instancingColor?"#define USE_INSTANCING_COLOR":"",e.instancingMorph?"#define USE_INSTANCING_MORPH":"",e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.map?"#define USE_MAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+h:"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.displacementMap?"#define USE_DISPLACEMENTMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.mapUv?"#define MAP_UV "+e.mapUv:"",e.alphaMapUv?"#define ALPHAMAP_UV "+e.alphaMapUv:"",e.lightMapUv?"#define LIGHTMAP_UV "+e.lightMapUv:"",e.aoMapUv?"#define AOMAP_UV "+e.aoMapUv:"",e.emissiveMapUv?"#define EMISSIVEMAP_UV "+e.emissiveMapUv:"",e.bumpMapUv?"#define BUMPMAP_UV "+e.bumpMapUv:"",e.normalMapUv?"#define NORMALMAP_UV "+e.normalMapUv:"",e.displacementMapUv?"#define DISPLACEMENTMAP_UV "+e.displacementMapUv:"",e.metalnessMapUv?"#define METALNESSMAP_UV "+e.metalnessMapUv:"",e.roughnessMapUv?"#define ROUGHNESSMAP_UV "+e.roughnessMapUv:"",e.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+e.anisotropyMapUv:"",e.clearcoatMapUv?"#define CLEARCOATMAP_UV "+e.clearcoatMapUv:"",e.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+e.clearcoatNormalMapUv:"",e.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+e.clearcoatRoughnessMapUv:"",e.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+e.iridescenceMapUv:"",e.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+e.iridescenceThicknessMapUv:"",e.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+e.sheenColorMapUv:"",e.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+e.sheenRoughnessMapUv:"",e.specularMapUv?"#define SPECULARMAP_UV "+e.specularMapUv:"",e.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+e.specularColorMapUv:"",e.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+e.specularIntensityMapUv:"",e.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+e.transmissionMapUv:"",e.thicknessMapUv?"#define THICKNESSMAP_UV "+e.thicknessMapUv:"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.flatShading?"#define FLAT_SHADED":"",e.skinning?"#define USE_SKINNING":"",e.morphTargets?"#define USE_MORPHTARGETS":"",e.morphNormals&&e.flatShading===!1?"#define USE_MORPHNORMALS":"",e.morphColors?"#define USE_MORPHCOLORS":"",e.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+e.morphTextureStride:"",e.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+e.morphTargetsCount:"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+c:"",e.sizeAttenuation?"#define USE_SIZEATTENUATION":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",e.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Os).join(`
`),f=[Th(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,m,e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",e.map?"#define USE_MAP":"",e.matcap?"#define USE_MATCAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+l:"",e.envMap?"#define "+h:"",e.envMap?"#define "+u:"",d?"#define CUBEUV_TEXEL_WIDTH "+d.texelWidth:"",d?"#define CUBEUV_TEXEL_HEIGHT "+d.texelHeight:"",d?"#define CUBEUV_MAX_MIP "+d.maxMip+".0":"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoat?"#define USE_CLEARCOAT":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.dispersion?"#define USE_DISPERSION":"",e.iridescence?"#define USE_IRIDESCENCE":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaTest?"#define USE_ALPHATEST":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.sheen?"#define USE_SHEEN":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors||e.instancingColor||e.batchingColor?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.gradientMap?"#define USE_GRADIENTMAP":"",e.flatShading?"#define FLAT_SHADED":"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+c:"",e.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",e.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",e.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",e.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",e.toneMapping!==vn?"#define TONE_MAPPING":"",e.toneMapping!==vn?qt.tonemapping_pars_fragment:"",e.toneMapping!==vn?pm("toneMapping",e.toneMapping):"",e.dithering?"#define DITHERING":"",e.opaque?"#define OPAQUE":"",qt.colorspace_pars_fragment,fm("linearToOutputTexel",e.outputColorSpace),mm(),e.useDepthPacking?"#define DEPTH_PACKING "+e.depthPacking:"",`
`].filter(Os).join(`
`)),a=uc(a),a=Sh(a,e),a=bh(a,e),o=uc(o),o=Sh(o,e),o=bh(o,e),a=Eh(a),o=Eh(o),e.isRawShaderMaterial!==!0&&(w=`#version 300 es
`,g=[p,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+g,f=["#define varying in",e.glslVersion===$o?"":"layout(location = 0) out highp vec4 pc_fragColor;",e.glslVersion===$o?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+f);let E=w+g+a,M=w+f+o,I=vh(s,s.VERTEX_SHADER,E),C=vh(s,s.FRAGMENT_SHADER,M);s.attachShader(v,I),s.attachShader(v,C),e.index0AttributeName!==void 0?s.bindAttribLocation(v,0,e.index0AttributeName):e.morphTargets===!0&&s.bindAttribLocation(v,0,"position"),s.linkProgram(v);function P(A){if(i.debug.checkShaderErrors){let N=s.getProgramInfoLog(v)||"",k=s.getShaderInfoLog(I)||"",G=s.getShaderInfoLog(C)||"",V=N.trim(),q=k.trim(),nt=G.trim(),X=!0,ot=!0;if(s.getProgramParameter(v,s.LINK_STATUS)===!1)if(X=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(s,v,I,C);else{let it=Mh(s,I,"vertex"),rt=Mh(s,C,"fragment");console.error("THREE.WebGLProgram: Shader Error "+s.getError()+" - VALIDATE_STATUS "+s.getProgramParameter(v,s.VALIDATE_STATUS)+`

Material Name: `+A.name+`
Material Type: `+A.type+`

Program Info Log: `+V+`
`+it+`
`+rt)}else V!==""?console.warn("THREE.WebGLProgram: Program Info Log:",V):(q===""||nt==="")&&(ot=!1);ot&&(A.diagnostics={runnable:X,programLog:V,vertexShader:{log:q,prefix:g},fragmentShader:{log:nt,prefix:f}})}s.deleteShader(I),s.deleteShader(C),U=new Wi(s,v),S=xm(s,v)}let U;this.getUniforms=function(){return U===void 0&&P(this),U};let S;this.getAttributes=function(){return S===void 0&&P(this),S};let x=e.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return x===!1&&(x=s.getProgramParameter(v,lm)),x},this.destroy=function(){n.releaseStatesOfProgram(this),s.deleteProgram(v),this.program=void 0},this.type=e.shaderType,this.name=e.shaderName,this.id=hm++,this.cacheKey=t,this.usedTimes=1,this.program=v,this.vertexShader=I,this.fragmentShader=C,this}var Im=0,dc=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(t){let e=t.vertexShader,n=t.fragmentShader,s=this._getShaderStage(e),r=this._getShaderStage(n),a=this._getShaderCacheForMaterial(t);return a.has(s)===!1&&(a.add(s),s.usedTimes++),a.has(r)===!1&&(a.add(r),r.usedTimes++),this}remove(t){let e=this.materialCache.get(t);for(let n of e)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(t),this}getVertexShaderID(t){return this._getShaderStage(t.vertexShader).id}getFragmentShaderID(t){return this._getShaderStage(t.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(t){let e=this.materialCache,n=e.get(t);return n===void 0&&(n=new Set,e.set(t,n)),n}_getShaderStage(t){let e=this.shaderCache,n=e.get(t);return n===void 0&&(n=new fc(t),e.set(t,n)),n}},fc=class{constructor(t){this.id=Im++,this.code=t,this.usedTimes=0}};function Pm(i,t,e,n,s,r,a){let o=new Pi,c=new dc,l=new Set,h=[],u=s.logarithmicDepthBuffer,d=s.vertexTextures,p=s.precision,m={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function v(S){return l.add(S),S===0?"uv":`uv${S}`}function g(S,x,A,N,k){let G=N.fog,V=k.geometry,q=S.isMeshStandardMaterial?N.environment:null,nt=(S.isMeshStandardMaterial?e:t).get(S.envMap||q),X=nt&&nt.mapping===Ps?nt.image.height:null,ot=m[S.type];S.precision!==null&&(p=s.getMaxPrecision(S.precision),p!==S.precision&&console.warn("THREE.WebGLProgram.getParameters:",S.precision,"not supported, using",p,"instead."));let it=V.morphAttributes.position||V.morphAttributes.normal||V.morphAttributes.color,rt=it!==void 0?it.length:0,_t=0;V.morphAttributes.position!==void 0&&(_t=1),V.morphAttributes.normal!==void 0&&(_t=2),V.morphAttributes.color!==void 0&&(_t=3);let bt,Dt,Ut,Z;if(ot){let Qt=an[ot];bt=Qt.vertexShader,Dt=Qt.fragmentShader}else bt=S.vertexShader,Dt=S.fragmentShader,c.update(S),Ut=c.getVertexShaderID(S),Z=c.getFragmentShaderID(S);let j=i.getRenderTarget(),pt=i.state.buffers.depth.getReversed(),vt=k.isInstancedMesh===!0,ht=k.isBatchedMesh===!0,Lt=!!S.map,Ot=!!S.matcap,T=!!nt,tt=!!S.aoMap,Q=!!S.lightMap,R=!!S.bumpMap,z=!!S.normalMap,$=!!S.displacementMap,K=!!S.emissiveMap,at=!!S.metalnessMap,Nt=!!S.roughnessMap,zt=S.anisotropy>0,b=S.clearcoat>0,_=S.dispersion>0,B=S.iridescence>0,Y=S.sheen>0,st=S.transmission>0,J=zt&&!!S.anisotropyMap,wt=b&&!!S.clearcoatMap,ft=b&&!!S.clearcoatNormalMap,Ct=b&&!!S.clearcoatRoughnessMap,Rt=B&&!!S.iridescenceMap,ct=B&&!!S.iridescenceThicknessMap,St=Y&&!!S.sheenColorMap,Vt=Y&&!!S.sheenRoughnessMap,Pt=!!S.specularMap,yt=!!S.specularColorMap,Xt=!!S.specularIntensityMap,L=st&&!!S.transmissionMap,dt=st&&!!S.thicknessMap,mt=!!S.gradientMap,Tt=!!S.alphaMap,lt=S.alphaTest>0,et=!!S.alphaHash,It=!!S.extensions,Gt=vn;S.toneMapped&&(j===null||j.isXRRenderTarget===!0)&&(Gt=i.toneMapping);let ie={shaderID:ot,shaderType:S.type,shaderName:S.name,vertexShader:bt,fragmentShader:Dt,defines:S.defines,customVertexShaderID:Ut,customFragmentShaderID:Z,isRawShaderMaterial:S.isRawShaderMaterial===!0,glslVersion:S.glslVersion,precision:p,batching:ht,batchingColor:ht&&k._colorsTexture!==null,instancing:vt,instancingColor:vt&&k.instanceColor!==null,instancingMorph:vt&&k.morphTexture!==null,supportsVertexTextures:d,outputColorSpace:j===null?i.outputColorSpace:j.isXRRenderTarget===!0?j.texture.colorSpace:Kn,alphaToCoverage:!!S.alphaToCoverage,map:Lt,matcap:Ot,envMap:T,envMapMode:T&&nt.mapping,envMapCubeUVHeight:X,aoMap:tt,lightMap:Q,bumpMap:R,normalMap:z,displacementMap:d&&$,emissiveMap:K,normalMapObjectSpace:z&&S.normalMapType===Gl,normalMapTangentSpace:z&&S.normalMapType===qo,metalnessMap:at,roughnessMap:Nt,anisotropy:zt,anisotropyMap:J,clearcoat:b,clearcoatMap:wt,clearcoatNormalMap:ft,clearcoatRoughnessMap:Ct,dispersion:_,iridescence:B,iridescenceMap:Rt,iridescenceThicknessMap:ct,sheen:Y,sheenColorMap:St,sheenRoughnessMap:Vt,specularMap:Pt,specularColorMap:yt,specularIntensityMap:Xt,transmission:st,transmissionMap:L,thicknessMap:dt,gradientMap:mt,opaque:S.transparent===!1&&S.blending===Zn&&S.alphaToCoverage===!1,alphaMap:Tt,alphaTest:lt,alphaHash:et,combine:S.combine,mapUv:Lt&&v(S.map.channel),aoMapUv:tt&&v(S.aoMap.channel),lightMapUv:Q&&v(S.lightMap.channel),bumpMapUv:R&&v(S.bumpMap.channel),normalMapUv:z&&v(S.normalMap.channel),displacementMapUv:$&&v(S.displacementMap.channel),emissiveMapUv:K&&v(S.emissiveMap.channel),metalnessMapUv:at&&v(S.metalnessMap.channel),roughnessMapUv:Nt&&v(S.roughnessMap.channel),anisotropyMapUv:J&&v(S.anisotropyMap.channel),clearcoatMapUv:wt&&v(S.clearcoatMap.channel),clearcoatNormalMapUv:ft&&v(S.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:Ct&&v(S.clearcoatRoughnessMap.channel),iridescenceMapUv:Rt&&v(S.iridescenceMap.channel),iridescenceThicknessMapUv:ct&&v(S.iridescenceThicknessMap.channel),sheenColorMapUv:St&&v(S.sheenColorMap.channel),sheenRoughnessMapUv:Vt&&v(S.sheenRoughnessMap.channel),specularMapUv:Pt&&v(S.specularMap.channel),specularColorMapUv:yt&&v(S.specularColorMap.channel),specularIntensityMapUv:Xt&&v(S.specularIntensityMap.channel),transmissionMapUv:L&&v(S.transmissionMap.channel),thicknessMapUv:dt&&v(S.thicknessMap.channel),alphaMapUv:Tt&&v(S.alphaMap.channel),vertexTangents:!!V.attributes.tangent&&(z||zt),vertexColors:S.vertexColors,vertexAlphas:S.vertexColors===!0&&!!V.attributes.color&&V.attributes.color.itemSize===4,pointsUvs:k.isPoints===!0&&!!V.attributes.uv&&(Lt||Tt),fog:!!G,useFog:S.fog===!0,fogExp2:!!G&&G.isFogExp2,flatShading:S.flatShading===!0&&S.wireframe===!1,sizeAttenuation:S.sizeAttenuation===!0,logarithmicDepthBuffer:u,reversedDepthBuffer:pt,skinning:k.isSkinnedMesh===!0,morphTargets:V.morphAttributes.position!==void 0,morphNormals:V.morphAttributes.normal!==void 0,morphColors:V.morphAttributes.color!==void 0,morphTargetsCount:rt,morphTextureStride:_t,numDirLights:x.directional.length,numPointLights:x.point.length,numSpotLights:x.spot.length,numSpotLightMaps:x.spotLightMap.length,numRectAreaLights:x.rectArea.length,numHemiLights:x.hemi.length,numDirLightShadows:x.directionalShadowMap.length,numPointLightShadows:x.pointShadowMap.length,numSpotLightShadows:x.spotShadowMap.length,numSpotLightShadowsWithMaps:x.numSpotLightShadowsWithMaps,numLightProbes:x.numLightProbes,numClippingPlanes:a.numPlanes,numClipIntersection:a.numIntersection,dithering:S.dithering,shadowMapEnabled:i.shadowMap.enabled&&A.length>0,shadowMapType:i.shadowMap.type,toneMapping:Gt,decodeVideoTexture:Lt&&S.map.isVideoTexture===!0&&Jt.getTransfer(S.map.colorSpace)===te,decodeVideoTextureEmissive:K&&S.emissiveMap.isVideoTexture===!0&&Jt.getTransfer(S.emissiveMap.colorSpace)===te,premultipliedAlpha:S.premultipliedAlpha,doubleSided:S.side===nn,flipSided:S.side===Ae,useDepthPacking:S.depthPacking>=0,depthPacking:S.depthPacking||0,index0AttributeName:S.index0AttributeName,extensionClipCullDistance:It&&S.extensions.clipCullDistance===!0&&n.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(It&&S.extensions.multiDraw===!0||ht)&&n.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:n.has("KHR_parallel_shader_compile"),customProgramCacheKey:S.customProgramCacheKey()};return ie.vertexUv1s=l.has(1),ie.vertexUv2s=l.has(2),ie.vertexUv3s=l.has(3),l.clear(),ie}function f(S){let x=[];if(S.shaderID?x.push(S.shaderID):(x.push(S.customVertexShaderID),x.push(S.customFragmentShaderID)),S.defines!==void 0)for(let A in S.defines)x.push(A),x.push(S.defines[A]);return S.isRawShaderMaterial===!1&&(w(x,S),E(x,S),x.push(i.outputColorSpace)),x.push(S.customProgramCacheKey),x.join()}function w(S,x){S.push(x.precision),S.push(x.outputColorSpace),S.push(x.envMapMode),S.push(x.envMapCubeUVHeight),S.push(x.mapUv),S.push(x.alphaMapUv),S.push(x.lightMapUv),S.push(x.aoMapUv),S.push(x.bumpMapUv),S.push(x.normalMapUv),S.push(x.displacementMapUv),S.push(x.emissiveMapUv),S.push(x.metalnessMapUv),S.push(x.roughnessMapUv),S.push(x.anisotropyMapUv),S.push(x.clearcoatMapUv),S.push(x.clearcoatNormalMapUv),S.push(x.clearcoatRoughnessMapUv),S.push(x.iridescenceMapUv),S.push(x.iridescenceThicknessMapUv),S.push(x.sheenColorMapUv),S.push(x.sheenRoughnessMapUv),S.push(x.specularMapUv),S.push(x.specularColorMapUv),S.push(x.specularIntensityMapUv),S.push(x.transmissionMapUv),S.push(x.thicknessMapUv),S.push(x.combine),S.push(x.fogExp2),S.push(x.sizeAttenuation),S.push(x.morphTargetsCount),S.push(x.morphAttributeCount),S.push(x.numDirLights),S.push(x.numPointLights),S.push(x.numSpotLights),S.push(x.numSpotLightMaps),S.push(x.numHemiLights),S.push(x.numRectAreaLights),S.push(x.numDirLightShadows),S.push(x.numPointLightShadows),S.push(x.numSpotLightShadows),S.push(x.numSpotLightShadowsWithMaps),S.push(x.numLightProbes),S.push(x.shadowMapType),S.push(x.toneMapping),S.push(x.numClippingPlanes),S.push(x.numClipIntersection),S.push(x.depthPacking)}function E(S,x){o.disableAll(),x.supportsVertexTextures&&o.enable(0),x.instancing&&o.enable(1),x.instancingColor&&o.enable(2),x.instancingMorph&&o.enable(3),x.matcap&&o.enable(4),x.envMap&&o.enable(5),x.normalMapObjectSpace&&o.enable(6),x.normalMapTangentSpace&&o.enable(7),x.clearcoat&&o.enable(8),x.iridescence&&o.enable(9),x.alphaTest&&o.enable(10),x.vertexColors&&o.enable(11),x.vertexAlphas&&o.enable(12),x.vertexUv1s&&o.enable(13),x.vertexUv2s&&o.enable(14),x.vertexUv3s&&o.enable(15),x.vertexTangents&&o.enable(16),x.anisotropy&&o.enable(17),x.alphaHash&&o.enable(18),x.batching&&o.enable(19),x.dispersion&&o.enable(20),x.batchingColor&&o.enable(21),x.gradientMap&&o.enable(22),S.push(o.mask),o.disableAll(),x.fog&&o.enable(0),x.useFog&&o.enable(1),x.flatShading&&o.enable(2),x.logarithmicDepthBuffer&&o.enable(3),x.reversedDepthBuffer&&o.enable(4),x.skinning&&o.enable(5),x.morphTargets&&o.enable(6),x.morphNormals&&o.enable(7),x.morphColors&&o.enable(8),x.premultipliedAlpha&&o.enable(9),x.shadowMapEnabled&&o.enable(10),x.doubleSided&&o.enable(11),x.flipSided&&o.enable(12),x.useDepthPacking&&o.enable(13),x.dithering&&o.enable(14),x.transmission&&o.enable(15),x.sheen&&o.enable(16),x.opaque&&o.enable(17),x.pointsUvs&&o.enable(18),x.decodeVideoTexture&&o.enable(19),x.decodeVideoTextureEmissive&&o.enable(20),x.alphaToCoverage&&o.enable(21),S.push(o.mask)}function M(S){let x=m[S.type],A;if(x){let N=an[x];A=th.clone(N.uniforms)}else A=S.uniforms;return A}function I(S,x){let A;for(let N=0,k=h.length;N<k;N++){let G=h[N];if(G.cacheKey===x){A=G,++A.usedTimes;break}}return A===void 0&&(A=new Rm(i,x,S,r),h.push(A)),A}function C(S){if(--S.usedTimes===0){let x=h.indexOf(S);h[x]=h[h.length-1],h.pop(),S.destroy()}}function P(S){c.remove(S)}function U(){c.dispose()}return{getParameters:g,getProgramCacheKey:f,getUniforms:M,acquireProgram:I,releaseProgram:C,releaseShaderCache:P,programs:h,dispose:U}}function Lm(){let i=new WeakMap;function t(a){return i.has(a)}function e(a){let o=i.get(a);return o===void 0&&(o={},i.set(a,o)),o}function n(a){i.delete(a)}function s(a,o,c){i.get(a)[o]=c}function r(){i=new WeakMap}return{has:t,get:e,remove:n,update:s,dispose:r}}function Dm(i,t){return i.groupOrder!==t.groupOrder?i.groupOrder-t.groupOrder:i.renderOrder!==t.renderOrder?i.renderOrder-t.renderOrder:i.material.id!==t.material.id?i.material.id-t.material.id:i.z!==t.z?i.z-t.z:i.id-t.id}function wh(i,t){return i.groupOrder!==t.groupOrder?i.groupOrder-t.groupOrder:i.renderOrder!==t.renderOrder?i.renderOrder-t.renderOrder:i.z!==t.z?t.z-i.z:i.id-t.id}function Ah(){let i=[],t=0,e=[],n=[],s=[];function r(){t=0,e.length=0,n.length=0,s.length=0}function a(u,d,p,m,v,g){let f=i[t];return f===void 0?(f={id:u.id,object:u,geometry:d,material:p,groupOrder:m,renderOrder:u.renderOrder,z:v,group:g},i[t]=f):(f.id=u.id,f.object=u,f.geometry=d,f.material=p,f.groupOrder=m,f.renderOrder=u.renderOrder,f.z=v,f.group=g),t++,f}function o(u,d,p,m,v,g){let f=a(u,d,p,m,v,g);p.transmission>0?n.push(f):p.transparent===!0?s.push(f):e.push(f)}function c(u,d,p,m,v,g){let f=a(u,d,p,m,v,g);p.transmission>0?n.unshift(f):p.transparent===!0?s.unshift(f):e.unshift(f)}function l(u,d){e.length>1&&e.sort(u||Dm),n.length>1&&n.sort(d||wh),s.length>1&&s.sort(d||wh)}function h(){for(let u=t,d=i.length;u<d;u++){let p=i[u];if(p.id===null)break;p.id=null,p.object=null,p.geometry=null,p.material=null,p.group=null}}return{opaque:e,transmissive:n,transparent:s,init:r,push:o,unshift:c,finish:h,sort:l}}function Um(){let i=new WeakMap;function t(n,s){let r=i.get(n),a;return r===void 0?(a=new Ah,i.set(n,[a])):s>=r.length?(a=new Ah,r.push(a)):a=r[s],a}function e(){i=new WeakMap}return{get:t,dispose:e}}function Nm(){let i={};return{get:function(t){if(i[t.id]!==void 0)return i[t.id];let e;switch(t.type){case"DirectionalLight":e={direction:new D,color:new $t};break;case"SpotLight":e={position:new D,direction:new D,color:new $t,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":e={position:new D,color:new $t,distance:0,decay:0};break;case"HemisphereLight":e={direction:new D,skyColor:new $t,groundColor:new $t};break;case"RectAreaLight":e={color:new $t,position:new D,halfWidth:new D,halfHeight:new D};break}return i[t.id]=e,e}}}function Fm(){let i={};return{get:function(t){if(i[t.id]!==void 0)return i[t.id];let e;switch(t.type){case"DirectionalLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new gt};break;case"SpotLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new gt};break;case"PointLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new gt,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[t.id]=e,e}}}var Om=0;function Bm(i,t){return(t.castShadow?2:0)-(i.castShadow?2:0)+(t.map?1:0)-(i.map?1:0)}function zm(i){let t=new Nm,e=Fm(),n={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let l=0;l<9;l++)n.probe.push(new D);let s=new D,r=new ae,a=new ae;function o(l){let h=0,u=0,d=0;for(let S=0;S<9;S++)n.probe[S].set(0,0,0);let p=0,m=0,v=0,g=0,f=0,w=0,E=0,M=0,I=0,C=0,P=0;l.sort(Bm);for(let S=0,x=l.length;S<x;S++){let A=l[S],N=A.color,k=A.intensity,G=A.distance,V=A.shadow&&A.shadow.map?A.shadow.map.texture:null;if(A.isAmbientLight)h+=N.r*k,u+=N.g*k,d+=N.b*k;else if(A.isLightProbe){for(let q=0;q<9;q++)n.probe[q].addScaledVector(A.sh.coefficients[q],k);P++}else if(A.isDirectionalLight){let q=t.get(A);if(q.color.copy(A.color).multiplyScalar(A.intensity),A.castShadow){let nt=A.shadow,X=e.get(A);X.shadowIntensity=nt.intensity,X.shadowBias=nt.bias,X.shadowNormalBias=nt.normalBias,X.shadowRadius=nt.radius,X.shadowMapSize=nt.mapSize,n.directionalShadow[p]=X,n.directionalShadowMap[p]=V,n.directionalShadowMatrix[p]=A.shadow.matrix,w++}n.directional[p]=q,p++}else if(A.isSpotLight){let q=t.get(A);q.position.setFromMatrixPosition(A.matrixWorld),q.color.copy(N).multiplyScalar(k),q.distance=G,q.coneCos=Math.cos(A.angle),q.penumbraCos=Math.cos(A.angle*(1-A.penumbra)),q.decay=A.decay,n.spot[v]=q;let nt=A.shadow;if(A.map&&(n.spotLightMap[I]=A.map,I++,nt.updateMatrices(A),A.castShadow&&C++),n.spotLightMatrix[v]=nt.matrix,A.castShadow){let X=e.get(A);X.shadowIntensity=nt.intensity,X.shadowBias=nt.bias,X.shadowNormalBias=nt.normalBias,X.shadowRadius=nt.radius,X.shadowMapSize=nt.mapSize,n.spotShadow[v]=X,n.spotShadowMap[v]=V,M++}v++}else if(A.isRectAreaLight){let q=t.get(A);q.color.copy(N).multiplyScalar(k),q.halfWidth.set(A.width*.5,0,0),q.halfHeight.set(0,A.height*.5,0),n.rectArea[g]=q,g++}else if(A.isPointLight){let q=t.get(A);if(q.color.copy(A.color).multiplyScalar(A.intensity),q.distance=A.distance,q.decay=A.decay,A.castShadow){let nt=A.shadow,X=e.get(A);X.shadowIntensity=nt.intensity,X.shadowBias=nt.bias,X.shadowNormalBias=nt.normalBias,X.shadowRadius=nt.radius,X.shadowMapSize=nt.mapSize,X.shadowCameraNear=nt.camera.near,X.shadowCameraFar=nt.camera.far,n.pointShadow[m]=X,n.pointShadowMap[m]=V,n.pointShadowMatrix[m]=A.shadow.matrix,E++}n.point[m]=q,m++}else if(A.isHemisphereLight){let q=t.get(A);q.skyColor.copy(A.color).multiplyScalar(k),q.groundColor.copy(A.groundColor).multiplyScalar(k),n.hemi[f]=q,f++}}g>0&&(i.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=xt.LTC_FLOAT_1,n.rectAreaLTC2=xt.LTC_FLOAT_2):(n.rectAreaLTC1=xt.LTC_HALF_1,n.rectAreaLTC2=xt.LTC_HALF_2)),n.ambient[0]=h,n.ambient[1]=u,n.ambient[2]=d;let U=n.hash;(U.directionalLength!==p||U.pointLength!==m||U.spotLength!==v||U.rectAreaLength!==g||U.hemiLength!==f||U.numDirectionalShadows!==w||U.numPointShadows!==E||U.numSpotShadows!==M||U.numSpotMaps!==I||U.numLightProbes!==P)&&(n.directional.length=p,n.spot.length=v,n.rectArea.length=g,n.point.length=m,n.hemi.length=f,n.directionalShadow.length=w,n.directionalShadowMap.length=w,n.pointShadow.length=E,n.pointShadowMap.length=E,n.spotShadow.length=M,n.spotShadowMap.length=M,n.directionalShadowMatrix.length=w,n.pointShadowMatrix.length=E,n.spotLightMatrix.length=M+I-C,n.spotLightMap.length=I,n.numSpotLightShadowsWithMaps=C,n.numLightProbes=P,U.directionalLength=p,U.pointLength=m,U.spotLength=v,U.rectAreaLength=g,U.hemiLength=f,U.numDirectionalShadows=w,U.numPointShadows=E,U.numSpotShadows=M,U.numSpotMaps=I,U.numLightProbes=P,n.version=Om++)}function c(l,h){let u=0,d=0,p=0,m=0,v=0,g=h.matrixWorldInverse;for(let f=0,w=l.length;f<w;f++){let E=l[f];if(E.isDirectionalLight){let M=n.directional[u];M.direction.setFromMatrixPosition(E.matrixWorld),s.setFromMatrixPosition(E.target.matrixWorld),M.direction.sub(s),M.direction.transformDirection(g),u++}else if(E.isSpotLight){let M=n.spot[p];M.position.setFromMatrixPosition(E.matrixWorld),M.position.applyMatrix4(g),M.direction.setFromMatrixPosition(E.matrixWorld),s.setFromMatrixPosition(E.target.matrixWorld),M.direction.sub(s),M.direction.transformDirection(g),p++}else if(E.isRectAreaLight){let M=n.rectArea[m];M.position.setFromMatrixPosition(E.matrixWorld),M.position.applyMatrix4(g),a.identity(),r.copy(E.matrixWorld),r.premultiply(g),a.extractRotation(r),M.halfWidth.set(E.width*.5,0,0),M.halfHeight.set(0,E.height*.5,0),M.halfWidth.applyMatrix4(a),M.halfHeight.applyMatrix4(a),m++}else if(E.isPointLight){let M=n.point[d];M.position.setFromMatrixPosition(E.matrixWorld),M.position.applyMatrix4(g),d++}else if(E.isHemisphereLight){let M=n.hemi[v];M.direction.setFromMatrixPosition(E.matrixWorld),M.direction.transformDirection(g),v++}}}return{setup:o,setupView:c,state:n}}function Ch(i){let t=new zm(i),e=[],n=[];function s(h){l.camera=h,e.length=0,n.length=0}function r(h){e.push(h)}function a(h){n.push(h)}function o(){t.setup(e)}function c(h){t.setupView(e,h)}let l={lightsArray:e,shadowsArray:n,camera:null,lights:t,transmissionRenderTarget:{}};return{init:s,state:l,setupLights:o,setupLightsView:c,pushLight:r,pushShadow:a}}function km(i){let t=new WeakMap;function e(s,r=0){let a=t.get(s),o;return a===void 0?(o=new Ch(i),t.set(s,[o])):r>=a.length?(o=new Ch(i),a.push(o)):o=a[r],o}function n(){t=new WeakMap}return{get:e,dispose:n}}var Vm=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,Hm=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
#include <packing>
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = unpackRGBATo2Half( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ) );
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = unpackRGBAToDepth( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ) );
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( squared_mean - mean * mean );
	gl_FragColor = pack2HalfToRGBA( vec2( mean, std_dev ) );
}`;function Gm(i,t,e){let n=new Di,s=new gt,r=new gt,a=new jt,o=new Ar({depthPacking:Hl}),c=new Cr,l={},h=e.maxTextureSize,u={[pn]:Ae,[Ae]:pn,[nn]:nn},d=new $e({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new gt},radius:{value:4}},vertexShader:Vm,fragmentShader:Hm}),p=d.clone();p.defines.HORIZONTAL_PASS=1;let m=new tn;m.setAttribute("position",new De(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let v=new ge(m,d),g=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Lo;let f=this.type;this.render=function(C,P,U){if(g.enabled===!1||g.autoUpdate===!1&&g.needsUpdate===!1||C.length===0)return;let S=i.getRenderTarget(),x=i.getActiveCubeFace(),A=i.getActiveMipmapLevel(),N=i.state;N.setBlending(xn),N.buffers.depth.getReversed()===!0?N.buffers.color.setClear(0,0,0,0):N.buffers.color.setClear(1,1,1,1),N.buffers.depth.setTest(!0),N.setScissorTest(!1);let k=f!==en&&this.type===en,G=f===en&&this.type!==en;for(let V=0,q=C.length;V<q;V++){let nt=C[V],X=nt.shadow;if(X===void 0){console.warn("THREE.WebGLShadowMap:",nt,"has no shadow.");continue}if(X.autoUpdate===!1&&X.needsUpdate===!1)continue;s.copy(X.mapSize);let ot=X.getFrameExtents();if(s.multiply(ot),r.copy(X.mapSize),(s.x>h||s.y>h)&&(s.x>h&&(r.x=Math.floor(h/ot.x),s.x=r.x*ot.x,X.mapSize.x=r.x),s.y>h&&(r.y=Math.floor(h/ot.y),s.y=r.y*ot.y,X.mapSize.y=r.y)),X.map===null||k===!0||G===!0){let rt=this.type!==en?{minFilter:ke,magFilter:ke}:{};X.map!==null&&X.map.dispose(),X.map=new je(s.x,s.y,rt),X.map.texture.name=nt.name+".shadowMap",X.camera.updateProjectionMatrix()}i.setRenderTarget(X.map),i.clear();let it=X.getViewportCount();for(let rt=0;rt<it;rt++){let _t=X.getViewport(rt);a.set(r.x*_t.x,r.y*_t.y,r.x*_t.z,r.y*_t.w),N.viewport(a),X.updateMatrices(nt,rt),n=X.getFrustum(),M(P,U,X.camera,nt,this.type)}X.isPointLightShadow!==!0&&this.type===en&&w(X,U),X.needsUpdate=!1}f=this.type,g.needsUpdate=!1,i.setRenderTarget(S,x,A)};function w(C,P){let U=t.update(v);d.defines.VSM_SAMPLES!==C.blurSamples&&(d.defines.VSM_SAMPLES=C.blurSamples,p.defines.VSM_SAMPLES=C.blurSamples,d.needsUpdate=!0,p.needsUpdate=!0),C.mapPass===null&&(C.mapPass=new je(s.x,s.y)),d.uniforms.shadow_pass.value=C.map.texture,d.uniforms.resolution.value=C.mapSize,d.uniforms.radius.value=C.radius,i.setRenderTarget(C.mapPass),i.clear(),i.renderBufferDirect(P,null,U,d,v,null),p.uniforms.shadow_pass.value=C.mapPass.texture,p.uniforms.resolution.value=C.mapSize,p.uniforms.radius.value=C.radius,i.setRenderTarget(C.map),i.clear(),i.renderBufferDirect(P,null,U,p,v,null)}function E(C,P,U,S){let x=null,A=U.isPointLight===!0?C.customDistanceMaterial:C.customDepthMaterial;if(A!==void 0)x=A;else if(x=U.isPointLight===!0?c:o,i.localClippingEnabled&&P.clipShadows===!0&&Array.isArray(P.clippingPlanes)&&P.clippingPlanes.length!==0||P.displacementMap&&P.displacementScale!==0||P.alphaMap&&P.alphaTest>0||P.map&&P.alphaTest>0||P.alphaToCoverage===!0){let N=x.uuid,k=P.uuid,G=l[N];G===void 0&&(G={},l[N]=G);let V=G[k];V===void 0&&(V=x.clone(),G[k]=V,P.addEventListener("dispose",I)),x=V}if(x.visible=P.visible,x.wireframe=P.wireframe,S===en?x.side=P.shadowSide!==null?P.shadowSide:P.side:x.side=P.shadowSide!==null?P.shadowSide:u[P.side],x.alphaMap=P.alphaMap,x.alphaTest=P.alphaToCoverage===!0?.5:P.alphaTest,x.map=P.map,x.clipShadows=P.clipShadows,x.clippingPlanes=P.clippingPlanes,x.clipIntersection=P.clipIntersection,x.displacementMap=P.displacementMap,x.displacementScale=P.displacementScale,x.displacementBias=P.displacementBias,x.wireframeLinewidth=P.wireframeLinewidth,x.linewidth=P.linewidth,U.isPointLight===!0&&x.isMeshDistanceMaterial===!0){let N=i.properties.get(x);N.light=U}return x}function M(C,P,U,S,x){if(C.visible===!1)return;if(C.layers.test(P.layers)&&(C.isMesh||C.isLine||C.isPoints)&&(C.castShadow||C.receiveShadow&&x===en)&&(!C.frustumCulled||n.intersectsObject(C))){C.modelViewMatrix.multiplyMatrices(U.matrixWorldInverse,C.matrixWorld);let k=t.update(C),G=C.material;if(Array.isArray(G)){let V=k.groups;for(let q=0,nt=V.length;q<nt;q++){let X=V[q],ot=G[X.materialIndex];if(ot&&ot.visible){let it=E(C,ot,S,x);C.onBeforeShadow(i,C,P,U,k,it,X),i.renderBufferDirect(U,null,k,it,C,X),C.onAfterShadow(i,C,P,U,k,it,X)}}}else if(G.visible){let V=E(C,G,S,x);C.onBeforeShadow(i,C,P,U,k,V,null),i.renderBufferDirect(U,null,k,V,C,null),C.onAfterShadow(i,C,P,U,k,V,null)}}let N=C.children;for(let k=0,G=N.length;k<G;k++)M(N[k],P,U,S,x)}function I(C){C.target.removeEventListener("dispose",I);for(let U in l){let S=l[U],x=C.target.uuid;x in S&&(S[x].dispose(),delete S[x])}}}var Wm={[kr]:Vr,[Hr]:Xr,[Gr]:qr,[Jn]:Wr,[Vr]:kr,[Xr]:Hr,[qr]:Gr,[Wr]:Jn};function Xm(i,t){function e(){let L=!1,dt=new jt,mt=null,Tt=new jt(0,0,0,0);return{setMask:function(lt){mt!==lt&&!L&&(i.colorMask(lt,lt,lt,lt),mt=lt)},setLocked:function(lt){L=lt},setClear:function(lt,et,It,Gt,ie){ie===!0&&(lt*=Gt,et*=Gt,It*=Gt),dt.set(lt,et,It,Gt),Tt.equals(dt)===!1&&(i.clearColor(lt,et,It,Gt),Tt.copy(dt))},reset:function(){L=!1,mt=null,Tt.set(-1,0,0,0)}}}function n(){let L=!1,dt=!1,mt=null,Tt=null,lt=null;return{setReversed:function(et){if(dt!==et){let It=t.get("EXT_clip_control");et?It.clipControlEXT(It.LOWER_LEFT_EXT,It.ZERO_TO_ONE_EXT):It.clipControlEXT(It.LOWER_LEFT_EXT,It.NEGATIVE_ONE_TO_ONE_EXT),dt=et;let Gt=lt;lt=null,this.setClear(Gt)}},getReversed:function(){return dt},setTest:function(et){et?j(i.DEPTH_TEST):pt(i.DEPTH_TEST)},setMask:function(et){mt!==et&&!L&&(i.depthMask(et),mt=et)},setFunc:function(et){if(dt&&(et=Wm[et]),Tt!==et){switch(et){case kr:i.depthFunc(i.NEVER);break;case Vr:i.depthFunc(i.ALWAYS);break;case Hr:i.depthFunc(i.LESS);break;case Jn:i.depthFunc(i.LEQUAL);break;case Gr:i.depthFunc(i.EQUAL);break;case Wr:i.depthFunc(i.GEQUAL);break;case Xr:i.depthFunc(i.GREATER);break;case qr:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}Tt=et}},setLocked:function(et){L=et},setClear:function(et){lt!==et&&(dt&&(et=1-et),i.clearDepth(et),lt=et)},reset:function(){L=!1,mt=null,Tt=null,lt=null,dt=!1}}}function s(){let L=!1,dt=null,mt=null,Tt=null,lt=null,et=null,It=null,Gt=null,ie=null;return{setTest:function(Qt){L||(Qt?j(i.STENCIL_TEST):pt(i.STENCIL_TEST))},setMask:function(Qt){dt!==Qt&&!L&&(i.stencilMask(Qt),dt=Qt)},setFunc:function(Qt,on,Ke){(mt!==Qt||Tt!==on||lt!==Ke)&&(i.stencilFunc(Qt,on,Ke),mt=Qt,Tt=on,lt=Ke)},setOp:function(Qt,on,Ke){(et!==Qt||It!==on||Gt!==Ke)&&(i.stencilOp(Qt,on,Ke),et=Qt,It=on,Gt=Ke)},setLocked:function(Qt){L=Qt},setClear:function(Qt){ie!==Qt&&(i.clearStencil(Qt),ie=Qt)},reset:function(){L=!1,dt=null,mt=null,Tt=null,lt=null,et=null,It=null,Gt=null,ie=null}}}let r=new e,a=new n,o=new s,c=new WeakMap,l=new WeakMap,h={},u={},d=new WeakMap,p=[],m=null,v=!1,g=null,f=null,w=null,E=null,M=null,I=null,C=null,P=new $t(0,0,0),U=0,S=!1,x=null,A=null,N=null,k=null,G=null,V=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS),q=!1,nt=0,X=i.getParameter(i.VERSION);X.indexOf("WebGL")!==-1?(nt=parseFloat(/^WebGL (\d)/.exec(X)[1]),q=nt>=1):X.indexOf("OpenGL ES")!==-1&&(nt=parseFloat(/^OpenGL ES (\d)/.exec(X)[1]),q=nt>=2);let ot=null,it={},rt=i.getParameter(i.SCISSOR_BOX),_t=i.getParameter(i.VIEWPORT),bt=new jt().fromArray(rt),Dt=new jt().fromArray(_t);function Ut(L,dt,mt,Tt){let lt=new Uint8Array(4),et=i.createTexture();i.bindTexture(L,et),i.texParameteri(L,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(L,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let It=0;It<mt;It++)L===i.TEXTURE_3D||L===i.TEXTURE_2D_ARRAY?i.texImage3D(dt,0,i.RGBA,1,1,Tt,0,i.RGBA,i.UNSIGNED_BYTE,lt):i.texImage2D(dt+It,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,lt);return et}let Z={};Z[i.TEXTURE_2D]=Ut(i.TEXTURE_2D,i.TEXTURE_2D,1),Z[i.TEXTURE_CUBE_MAP]=Ut(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),Z[i.TEXTURE_2D_ARRAY]=Ut(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),Z[i.TEXTURE_3D]=Ut(i.TEXTURE_3D,i.TEXTURE_3D,1,1),r.setClear(0,0,0,1),a.setClear(1),o.setClear(0),j(i.DEPTH_TEST),a.setFunc(Jn),R(!1),z(Po),j(i.CULL_FACE),tt(xn);function j(L){h[L]!==!0&&(i.enable(L),h[L]=!0)}function pt(L){h[L]!==!1&&(i.disable(L),h[L]=!1)}function vt(L,dt){return u[L]!==dt?(i.bindFramebuffer(L,dt),u[L]=dt,L===i.DRAW_FRAMEBUFFER&&(u[i.FRAMEBUFFER]=dt),L===i.FRAMEBUFFER&&(u[i.DRAW_FRAMEBUFFER]=dt),!0):!1}function ht(L,dt){let mt=p,Tt=!1;if(L){mt=d.get(dt),mt===void 0&&(mt=[],d.set(dt,mt));let lt=L.textures;if(mt.length!==lt.length||mt[0]!==i.COLOR_ATTACHMENT0){for(let et=0,It=lt.length;et<It;et++)mt[et]=i.COLOR_ATTACHMENT0+et;mt.length=lt.length,Tt=!0}}else mt[0]!==i.BACK&&(mt[0]=i.BACK,Tt=!0);Tt&&i.drawBuffers(mt)}function Lt(L){return m!==L?(i.useProgram(L),m=L,!0):!1}let Ot={[In]:i.FUNC_ADD,[pl]:i.FUNC_SUBTRACT,[ml]:i.FUNC_REVERSE_SUBTRACT};Ot[gl]=i.MIN,Ot[_l]=i.MAX;let T={[xl]:i.ZERO,[vl]:i.ONE,[yl]:i.SRC_COLOR,[ur]:i.SRC_ALPHA,[wl]:i.SRC_ALPHA_SATURATE,[El]:i.DST_COLOR,[Sl]:i.DST_ALPHA,[Ml]:i.ONE_MINUS_SRC_COLOR,[dr]:i.ONE_MINUS_SRC_ALPHA,[Tl]:i.ONE_MINUS_DST_COLOR,[bl]:i.ONE_MINUS_DST_ALPHA,[Al]:i.CONSTANT_COLOR,[Cl]:i.ONE_MINUS_CONSTANT_COLOR,[Rl]:i.CONSTANT_ALPHA,[Il]:i.ONE_MINUS_CONSTANT_ALPHA};function tt(L,dt,mt,Tt,lt,et,It,Gt,ie,Qt){if(L===xn){v===!0&&(pt(i.BLEND),v=!1);return}if(v===!1&&(j(i.BLEND),v=!0),L!==fl){if(L!==g||Qt!==S){if((f!==In||M!==In)&&(i.blendEquation(i.FUNC_ADD),f=In,M=In),Qt)switch(L){case Zn:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case Do:i.blendFunc(i.ONE,i.ONE);break;case Uo:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case No:i.blendFuncSeparate(i.DST_COLOR,i.ONE_MINUS_SRC_ALPHA,i.ZERO,i.ONE);break;default:console.error("THREE.WebGLState: Invalid blending: ",L);break}else switch(L){case Zn:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case Do:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE,i.ONE,i.ONE);break;case Uo:console.error("THREE.WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case No:console.error("THREE.WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:console.error("THREE.WebGLState: Invalid blending: ",L);break}w=null,E=null,I=null,C=null,P.set(0,0,0),U=0,g=L,S=Qt}return}lt=lt||dt,et=et||mt,It=It||Tt,(dt!==f||lt!==M)&&(i.blendEquationSeparate(Ot[dt],Ot[lt]),f=dt,M=lt),(mt!==w||Tt!==E||et!==I||It!==C)&&(i.blendFuncSeparate(T[mt],T[Tt],T[et],T[It]),w=mt,E=Tt,I=et,C=It),(Gt.equals(P)===!1||ie!==U)&&(i.blendColor(Gt.r,Gt.g,Gt.b,ie),P.copy(Gt),U=ie),g=L,S=!1}function Q(L,dt){L.side===nn?pt(i.CULL_FACE):j(i.CULL_FACE);let mt=L.side===Ae;dt&&(mt=!mt),R(mt),L.blending===Zn&&L.transparent===!1?tt(xn):tt(L.blending,L.blendEquation,L.blendSrc,L.blendDst,L.blendEquationAlpha,L.blendSrcAlpha,L.blendDstAlpha,L.blendColor,L.blendAlpha,L.premultipliedAlpha),a.setFunc(L.depthFunc),a.setTest(L.depthTest),a.setMask(L.depthWrite),r.setMask(L.colorWrite);let Tt=L.stencilWrite;o.setTest(Tt),Tt&&(o.setMask(L.stencilWriteMask),o.setFunc(L.stencilFunc,L.stencilRef,L.stencilFuncMask),o.setOp(L.stencilFail,L.stencilZFail,L.stencilZPass)),K(L.polygonOffset,L.polygonOffsetFactor,L.polygonOffsetUnits),L.alphaToCoverage===!0?j(i.SAMPLE_ALPHA_TO_COVERAGE):pt(i.SAMPLE_ALPHA_TO_COVERAGE)}function R(L){x!==L&&(L?i.frontFace(i.CW):i.frontFace(i.CCW),x=L)}function z(L){L!==hl?(j(i.CULL_FACE),L!==A&&(L===Po?i.cullFace(i.BACK):L===ul?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):pt(i.CULL_FACE),A=L}function $(L){L!==N&&(q&&i.lineWidth(L),N=L)}function K(L,dt,mt){L?(j(i.POLYGON_OFFSET_FILL),(k!==dt||G!==mt)&&(i.polygonOffset(dt,mt),k=dt,G=mt)):pt(i.POLYGON_OFFSET_FILL)}function at(L){L?j(i.SCISSOR_TEST):pt(i.SCISSOR_TEST)}function Nt(L){L===void 0&&(L=i.TEXTURE0+V-1),ot!==L&&(i.activeTexture(L),ot=L)}function zt(L,dt,mt){mt===void 0&&(ot===null?mt=i.TEXTURE0+V-1:mt=ot);let Tt=it[mt];Tt===void 0&&(Tt={type:void 0,texture:void 0},it[mt]=Tt),(Tt.type!==L||Tt.texture!==dt)&&(ot!==mt&&(i.activeTexture(mt),ot=mt),i.bindTexture(L,dt||Z[L]),Tt.type=L,Tt.texture=dt)}function b(){let L=it[ot];L!==void 0&&L.type!==void 0&&(i.bindTexture(L.type,null),L.type=void 0,L.texture=void 0)}function _(){try{i.compressedTexImage2D(...arguments)}catch(L){console.error("THREE.WebGLState:",L)}}function B(){try{i.compressedTexImage3D(...arguments)}catch(L){console.error("THREE.WebGLState:",L)}}function Y(){try{i.texSubImage2D(...arguments)}catch(L){console.error("THREE.WebGLState:",L)}}function st(){try{i.texSubImage3D(...arguments)}catch(L){console.error("THREE.WebGLState:",L)}}function J(){try{i.compressedTexSubImage2D(...arguments)}catch(L){console.error("THREE.WebGLState:",L)}}function wt(){try{i.compressedTexSubImage3D(...arguments)}catch(L){console.error("THREE.WebGLState:",L)}}function ft(){try{i.texStorage2D(...arguments)}catch(L){console.error("THREE.WebGLState:",L)}}function Ct(){try{i.texStorage3D(...arguments)}catch(L){console.error("THREE.WebGLState:",L)}}function Rt(){try{i.texImage2D(...arguments)}catch(L){console.error("THREE.WebGLState:",L)}}function ct(){try{i.texImage3D(...arguments)}catch(L){console.error("THREE.WebGLState:",L)}}function St(L){bt.equals(L)===!1&&(i.scissor(L.x,L.y,L.z,L.w),bt.copy(L))}function Vt(L){Dt.equals(L)===!1&&(i.viewport(L.x,L.y,L.z,L.w),Dt.copy(L))}function Pt(L,dt){let mt=l.get(dt);mt===void 0&&(mt=new WeakMap,l.set(dt,mt));let Tt=mt.get(L);Tt===void 0&&(Tt=i.getUniformBlockIndex(dt,L.name),mt.set(L,Tt))}function yt(L,dt){let Tt=l.get(dt).get(L);c.get(dt)!==Tt&&(i.uniformBlockBinding(dt,Tt,L.__bindingPointIndex),c.set(dt,Tt))}function Xt(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),a.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),h={},ot=null,it={},u={},d=new WeakMap,p=[],m=null,v=!1,g=null,f=null,w=null,E=null,M=null,I=null,C=null,P=new $t(0,0,0),U=0,S=!1,x=null,A=null,N=null,k=null,G=null,bt.set(0,0,i.canvas.width,i.canvas.height),Dt.set(0,0,i.canvas.width,i.canvas.height),r.reset(),a.reset(),o.reset()}return{buffers:{color:r,depth:a,stencil:o},enable:j,disable:pt,bindFramebuffer:vt,drawBuffers:ht,useProgram:Lt,setBlending:tt,setMaterial:Q,setFlipSided:R,setCullFace:z,setLineWidth:$,setPolygonOffset:K,setScissorTest:at,activeTexture:Nt,bindTexture:zt,unbindTexture:b,compressedTexImage2D:_,compressedTexImage3D:B,texImage2D:Rt,texImage3D:ct,updateUBOMapping:Pt,uniformBlockBinding:yt,texStorage2D:ft,texStorage3D:Ct,texSubImage2D:Y,texSubImage3D:st,compressedTexSubImage2D:J,compressedTexSubImage3D:wt,scissor:St,viewport:Vt,reset:Xt}}function qm(i,t,e,n,s,r,a){let o=t.has("WEBGL_multisampled_render_to_texture")?t.get("WEBGL_multisampled_render_to_texture"):null,c=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),l=new gt,h=new WeakMap,u,d=new WeakMap,p=!1;try{p=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function m(b,_){return p?new OffscreenCanvas(b,_):as("canvas")}function v(b,_,B){let Y=1,st=zt(b);if((st.width>B||st.height>B)&&(Y=B/Math.max(st.width,st.height)),Y<1)if(typeof HTMLImageElement<"u"&&b instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&b instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&b instanceof ImageBitmap||typeof VideoFrame<"u"&&b instanceof VideoFrame){let J=Math.floor(Y*st.width),wt=Math.floor(Y*st.height);u===void 0&&(u=m(J,wt));let ft=_?m(J,wt):u;return ft.width=J,ft.height=wt,ft.getContext("2d").drawImage(b,0,0,J,wt),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+st.width+"x"+st.height+") to ("+J+"x"+wt+")."),ft}else return"data"in b&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+st.width+"x"+st.height+")."),b;return b}function g(b){return b.generateMipmaps}function f(b){i.generateMipmap(b)}function w(b){return b.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:b.isWebGL3DRenderTarget?i.TEXTURE_3D:b.isWebGLArrayRenderTarget||b.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}function E(b,_,B,Y,st=!1){if(b!==null){if(i[b]!==void 0)return i[b];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+b+"'")}let J=_;if(_===i.RED&&(B===i.FLOAT&&(J=i.R32F),B===i.HALF_FLOAT&&(J=i.R16F),B===i.UNSIGNED_BYTE&&(J=i.R8)),_===i.RED_INTEGER&&(B===i.UNSIGNED_BYTE&&(J=i.R8UI),B===i.UNSIGNED_SHORT&&(J=i.R16UI),B===i.UNSIGNED_INT&&(J=i.R32UI),B===i.BYTE&&(J=i.R8I),B===i.SHORT&&(J=i.R16I),B===i.INT&&(J=i.R32I)),_===i.RG&&(B===i.FLOAT&&(J=i.RG32F),B===i.HALF_FLOAT&&(J=i.RG16F),B===i.UNSIGNED_BYTE&&(J=i.RG8)),_===i.RG_INTEGER&&(B===i.UNSIGNED_BYTE&&(J=i.RG8UI),B===i.UNSIGNED_SHORT&&(J=i.RG16UI),B===i.UNSIGNED_INT&&(J=i.RG32UI),B===i.BYTE&&(J=i.RG8I),B===i.SHORT&&(J=i.RG16I),B===i.INT&&(J=i.RG32I)),_===i.RGB_INTEGER&&(B===i.UNSIGNED_BYTE&&(J=i.RGB8UI),B===i.UNSIGNED_SHORT&&(J=i.RGB16UI),B===i.UNSIGNED_INT&&(J=i.RGB32UI),B===i.BYTE&&(J=i.RGB8I),B===i.SHORT&&(J=i.RGB16I),B===i.INT&&(J=i.RGB32I)),_===i.RGBA_INTEGER&&(B===i.UNSIGNED_BYTE&&(J=i.RGBA8UI),B===i.UNSIGNED_SHORT&&(J=i.RGBA16UI),B===i.UNSIGNED_INT&&(J=i.RGBA32UI),B===i.BYTE&&(J=i.RGBA8I),B===i.SHORT&&(J=i.RGBA16I),B===i.INT&&(J=i.RGBA32I)),_===i.RGB&&(B===i.UNSIGNED_INT_5_9_9_9_REV&&(J=i.RGB9_E5),B===i.UNSIGNED_INT_10F_11F_11F_REV&&(J=i.R11F_G11F_B10F)),_===i.RGBA){let wt=st?ss:Jt.getTransfer(Y);B===i.FLOAT&&(J=i.RGBA32F),B===i.HALF_FLOAT&&(J=i.RGBA16F),B===i.UNSIGNED_BYTE&&(J=wt===te?i.SRGB8_ALPHA8:i.RGBA8),B===i.UNSIGNED_SHORT_4_4_4_4&&(J=i.RGBA4),B===i.UNSIGNED_SHORT_5_5_5_1&&(J=i.RGB5_A1)}return(J===i.R16F||J===i.R32F||J===i.RG16F||J===i.RG32F||J===i.RGBA16F||J===i.RGBA32F)&&t.get("EXT_color_buffer_float"),J}function M(b,_){let B;return b?_===null||_===Bn||_===ki?B=i.DEPTH24_STENCIL8:_===rn?B=i.DEPTH32F_STENCIL8:_===Bi&&(B=i.DEPTH24_STENCIL8,console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):_===null||_===Bn||_===ki?B=i.DEPTH_COMPONENT24:_===rn?B=i.DEPTH_COMPONENT32F:_===Bi&&(B=i.DEPTH_COMPONENT16),B}function I(b,_){return g(b)===!0||b.isFramebufferTexture&&b.minFilter!==ke&&b.minFilter!==qe?Math.log2(Math.max(_.width,_.height))+1:b.mipmaps!==void 0&&b.mipmaps.length>0?b.mipmaps.length:b.isCompressedTexture&&Array.isArray(b.image)?_.mipmaps.length:1}function C(b){let _=b.target;_.removeEventListener("dispose",C),U(_),_.isVideoTexture&&h.delete(_)}function P(b){let _=b.target;_.removeEventListener("dispose",P),x(_)}function U(b){let _=n.get(b);if(_.__webglInit===void 0)return;let B=b.source,Y=d.get(B);if(Y){let st=Y[_.__cacheKey];st.usedTimes--,st.usedTimes===0&&S(b),Object.keys(Y).length===0&&d.delete(B)}n.remove(b)}function S(b){let _=n.get(b);i.deleteTexture(_.__webglTexture);let B=b.source,Y=d.get(B);delete Y[_.__cacheKey],a.memory.textures--}function x(b){let _=n.get(b);if(b.depthTexture&&(b.depthTexture.dispose(),n.remove(b.depthTexture)),b.isWebGLCubeRenderTarget)for(let Y=0;Y<6;Y++){if(Array.isArray(_.__webglFramebuffer[Y]))for(let st=0;st<_.__webglFramebuffer[Y].length;st++)i.deleteFramebuffer(_.__webglFramebuffer[Y][st]);else i.deleteFramebuffer(_.__webglFramebuffer[Y]);_.__webglDepthbuffer&&i.deleteRenderbuffer(_.__webglDepthbuffer[Y])}else{if(Array.isArray(_.__webglFramebuffer))for(let Y=0;Y<_.__webglFramebuffer.length;Y++)i.deleteFramebuffer(_.__webglFramebuffer[Y]);else i.deleteFramebuffer(_.__webglFramebuffer);if(_.__webglDepthbuffer&&i.deleteRenderbuffer(_.__webglDepthbuffer),_.__webglMultisampledFramebuffer&&i.deleteFramebuffer(_.__webglMultisampledFramebuffer),_.__webglColorRenderbuffer)for(let Y=0;Y<_.__webglColorRenderbuffer.length;Y++)_.__webglColorRenderbuffer[Y]&&i.deleteRenderbuffer(_.__webglColorRenderbuffer[Y]);_.__webglDepthRenderbuffer&&i.deleteRenderbuffer(_.__webglDepthRenderbuffer)}let B=b.textures;for(let Y=0,st=B.length;Y<st;Y++){let J=n.get(B[Y]);J.__webglTexture&&(i.deleteTexture(J.__webglTexture),a.memory.textures--),n.remove(B[Y])}n.remove(b)}let A=0;function N(){A=0}function k(){let b=A;return b>=s.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+b+" texture units while this GPU supports only "+s.maxTextures),A+=1,b}function G(b){let _=[];return _.push(b.wrapS),_.push(b.wrapT),_.push(b.wrapR||0),_.push(b.magFilter),_.push(b.minFilter),_.push(b.anisotropy),_.push(b.internalFormat),_.push(b.format),_.push(b.type),_.push(b.generateMipmaps),_.push(b.premultiplyAlpha),_.push(b.flipY),_.push(b.unpackAlignment),_.push(b.colorSpace),_.join()}function V(b,_){let B=n.get(b);if(b.isVideoTexture&&at(b),b.isRenderTargetTexture===!1&&b.isExternalTexture!==!0&&b.version>0&&B.__version!==b.version){let Y=b.image;if(Y===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(Y.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{Z(B,b,_);return}}else b.isExternalTexture&&(B.__webglTexture=b.sourceTexture?b.sourceTexture:null);e.bindTexture(i.TEXTURE_2D,B.__webglTexture,i.TEXTURE0+_)}function q(b,_){let B=n.get(b);if(b.isRenderTargetTexture===!1&&b.version>0&&B.__version!==b.version){Z(B,b,_);return}e.bindTexture(i.TEXTURE_2D_ARRAY,B.__webglTexture,i.TEXTURE0+_)}function nt(b,_){let B=n.get(b);if(b.isRenderTargetTexture===!1&&b.version>0&&B.__version!==b.version){Z(B,b,_);return}e.bindTexture(i.TEXTURE_3D,B.__webglTexture,i.TEXTURE0+_)}function X(b,_){let B=n.get(b);if(b.version>0&&B.__version!==b.version){j(B,b,_);return}e.bindTexture(i.TEXTURE_CUBE_MAP,B.__webglTexture,i.TEXTURE0+_)}let ot={[fr]:i.REPEAT,[Rn]:i.CLAMP_TO_EDGE,[pr]:i.MIRRORED_REPEAT},it={[ke]:i.NEAREST,[kl]:i.NEAREST_MIPMAP_NEAREST,[Ls]:i.NEAREST_MIPMAP_LINEAR,[qe]:i.LINEAR,[Zr]:i.LINEAR_MIPMAP_NEAREST,[sn]:i.LINEAR_MIPMAP_LINEAR},rt={[Wl]:i.NEVER,[Jl]:i.ALWAYS,[Xl]:i.LESS,[Yo]:i.LEQUAL,[ql]:i.EQUAL,[Zl]:i.GEQUAL,[Yl]:i.GREATER,[$l]:i.NOTEQUAL};function _t(b,_){if(_.type===rn&&t.has("OES_texture_float_linear")===!1&&(_.magFilter===qe||_.magFilter===Zr||_.magFilter===Ls||_.magFilter===sn||_.minFilter===qe||_.minFilter===Zr||_.minFilter===Ls||_.minFilter===sn)&&console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(b,i.TEXTURE_WRAP_S,ot[_.wrapS]),i.texParameteri(b,i.TEXTURE_WRAP_T,ot[_.wrapT]),(b===i.TEXTURE_3D||b===i.TEXTURE_2D_ARRAY)&&i.texParameteri(b,i.TEXTURE_WRAP_R,ot[_.wrapR]),i.texParameteri(b,i.TEXTURE_MAG_FILTER,it[_.magFilter]),i.texParameteri(b,i.TEXTURE_MIN_FILTER,it[_.minFilter]),_.compareFunction&&(i.texParameteri(b,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(b,i.TEXTURE_COMPARE_FUNC,rt[_.compareFunction])),t.has("EXT_texture_filter_anisotropic")===!0){if(_.magFilter===ke||_.minFilter!==Ls&&_.minFilter!==sn||_.type===rn&&t.has("OES_texture_float_linear")===!1)return;if(_.anisotropy>1||n.get(_).__currentAnisotropy){let B=t.get("EXT_texture_filter_anisotropic");i.texParameterf(b,B.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(_.anisotropy,s.getMaxAnisotropy())),n.get(_).__currentAnisotropy=_.anisotropy}}}function bt(b,_){let B=!1;b.__webglInit===void 0&&(b.__webglInit=!0,_.addEventListener("dispose",C));let Y=_.source,st=d.get(Y);st===void 0&&(st={},d.set(Y,st));let J=G(_);if(J!==b.__cacheKey){st[J]===void 0&&(st[J]={texture:i.createTexture(),usedTimes:0},a.memory.textures++,B=!0),st[J].usedTimes++;let wt=st[b.__cacheKey];wt!==void 0&&(st[b.__cacheKey].usedTimes--,wt.usedTimes===0&&S(_)),b.__cacheKey=J,b.__webglTexture=st[J].texture}return B}function Dt(b,_,B){return Math.floor(Math.floor(b/B)/_)}function Ut(b,_,B,Y){let J=b.updateRanges;if(J.length===0)e.texSubImage2D(i.TEXTURE_2D,0,0,0,_.width,_.height,B,Y,_.data);else{J.sort((ct,St)=>ct.start-St.start);let wt=0;for(let ct=1;ct<J.length;ct++){let St=J[wt],Vt=J[ct],Pt=St.start+St.count,yt=Dt(Vt.start,_.width,4),Xt=Dt(St.start,_.width,4);Vt.start<=Pt+1&&yt===Xt&&Dt(Vt.start+Vt.count-1,_.width,4)===yt?St.count=Math.max(St.count,Vt.start+Vt.count-St.start):(++wt,J[wt]=Vt)}J.length=wt+1;let ft=i.getParameter(i.UNPACK_ROW_LENGTH),Ct=i.getParameter(i.UNPACK_SKIP_PIXELS),Rt=i.getParameter(i.UNPACK_SKIP_ROWS);i.pixelStorei(i.UNPACK_ROW_LENGTH,_.width);for(let ct=0,St=J.length;ct<St;ct++){let Vt=J[ct],Pt=Math.floor(Vt.start/4),yt=Math.ceil(Vt.count/4),Xt=Pt%_.width,L=Math.floor(Pt/_.width),dt=yt,mt=1;i.pixelStorei(i.UNPACK_SKIP_PIXELS,Xt),i.pixelStorei(i.UNPACK_SKIP_ROWS,L),e.texSubImage2D(i.TEXTURE_2D,0,Xt,L,dt,mt,B,Y,_.data)}b.clearUpdateRanges(),i.pixelStorei(i.UNPACK_ROW_LENGTH,ft),i.pixelStorei(i.UNPACK_SKIP_PIXELS,Ct),i.pixelStorei(i.UNPACK_SKIP_ROWS,Rt)}}function Z(b,_,B){let Y=i.TEXTURE_2D;(_.isDataArrayTexture||_.isCompressedArrayTexture)&&(Y=i.TEXTURE_2D_ARRAY),_.isData3DTexture&&(Y=i.TEXTURE_3D);let st=bt(b,_),J=_.source;e.bindTexture(Y,b.__webglTexture,i.TEXTURE0+B);let wt=n.get(J);if(J.version!==wt.__version||st===!0){e.activeTexture(i.TEXTURE0+B);let ft=Jt.getPrimaries(Jt.workingColorSpace),Ct=_.colorSpace===yn?null:Jt.getPrimaries(_.colorSpace),Rt=_.colorSpace===yn||ft===Ct?i.NONE:i.BROWSER_DEFAULT_WEBGL;i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,_.flipY),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,_.premultiplyAlpha),i.pixelStorei(i.UNPACK_ALIGNMENT,_.unpackAlignment),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,Rt);let ct=v(_.image,!1,s.maxTextureSize);ct=Nt(_,ct);let St=r.convert(_.format,_.colorSpace),Vt=r.convert(_.type),Pt=E(_.internalFormat,St,Vt,_.colorSpace,_.isVideoTexture);_t(Y,_);let yt,Xt=_.mipmaps,L=_.isVideoTexture!==!0,dt=wt.__version===void 0||st===!0,mt=J.dataReady,Tt=I(_,ct);if(_.isDepthTexture)Pt=M(_.format===Vi,_.type),dt&&(L?e.texStorage2D(i.TEXTURE_2D,1,Pt,ct.width,ct.height):e.texImage2D(i.TEXTURE_2D,0,Pt,ct.width,ct.height,0,St,Vt,null));else if(_.isDataTexture)if(Xt.length>0){L&&dt&&e.texStorage2D(i.TEXTURE_2D,Tt,Pt,Xt[0].width,Xt[0].height);for(let lt=0,et=Xt.length;lt<et;lt++)yt=Xt[lt],L?mt&&e.texSubImage2D(i.TEXTURE_2D,lt,0,0,yt.width,yt.height,St,Vt,yt.data):e.texImage2D(i.TEXTURE_2D,lt,Pt,yt.width,yt.height,0,St,Vt,yt.data);_.generateMipmaps=!1}else L?(dt&&e.texStorage2D(i.TEXTURE_2D,Tt,Pt,ct.width,ct.height),mt&&Ut(_,ct,St,Vt)):e.texImage2D(i.TEXTURE_2D,0,Pt,ct.width,ct.height,0,St,Vt,ct.data);else if(_.isCompressedTexture)if(_.isCompressedArrayTexture){L&&dt&&e.texStorage3D(i.TEXTURE_2D_ARRAY,Tt,Pt,Xt[0].width,Xt[0].height,ct.depth);for(let lt=0,et=Xt.length;lt<et;lt++)if(yt=Xt[lt],_.format!==Ve)if(St!==null)if(L){if(mt)if(_.layerUpdates.size>0){let It=ec(yt.width,yt.height,_.format,_.type);for(let Gt of _.layerUpdates){let ie=yt.data.subarray(Gt*It/yt.data.BYTES_PER_ELEMENT,(Gt+1)*It/yt.data.BYTES_PER_ELEMENT);e.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,lt,0,0,Gt,yt.width,yt.height,1,St,ie)}_.clearLayerUpdates()}else e.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,lt,0,0,0,yt.width,yt.height,ct.depth,St,yt.data)}else e.compressedTexImage3D(i.TEXTURE_2D_ARRAY,lt,Pt,yt.width,yt.height,ct.depth,0,yt.data,0,0);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else L?mt&&e.texSubImage3D(i.TEXTURE_2D_ARRAY,lt,0,0,0,yt.width,yt.height,ct.depth,St,Vt,yt.data):e.texImage3D(i.TEXTURE_2D_ARRAY,lt,Pt,yt.width,yt.height,ct.depth,0,St,Vt,yt.data)}else{L&&dt&&e.texStorage2D(i.TEXTURE_2D,Tt,Pt,Xt[0].width,Xt[0].height);for(let lt=0,et=Xt.length;lt<et;lt++)yt=Xt[lt],_.format!==Ve?St!==null?L?mt&&e.compressedTexSubImage2D(i.TEXTURE_2D,lt,0,0,yt.width,yt.height,St,yt.data):e.compressedTexImage2D(i.TEXTURE_2D,lt,Pt,yt.width,yt.height,0,yt.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):L?mt&&e.texSubImage2D(i.TEXTURE_2D,lt,0,0,yt.width,yt.height,St,Vt,yt.data):e.texImage2D(i.TEXTURE_2D,lt,Pt,yt.width,yt.height,0,St,Vt,yt.data)}else if(_.isDataArrayTexture)if(L){if(dt&&e.texStorage3D(i.TEXTURE_2D_ARRAY,Tt,Pt,ct.width,ct.height,ct.depth),mt)if(_.layerUpdates.size>0){let lt=ec(ct.width,ct.height,_.format,_.type);for(let et of _.layerUpdates){let It=ct.data.subarray(et*lt/ct.data.BYTES_PER_ELEMENT,(et+1)*lt/ct.data.BYTES_PER_ELEMENT);e.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,et,ct.width,ct.height,1,St,Vt,It)}_.clearLayerUpdates()}else e.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,ct.width,ct.height,ct.depth,St,Vt,ct.data)}else e.texImage3D(i.TEXTURE_2D_ARRAY,0,Pt,ct.width,ct.height,ct.depth,0,St,Vt,ct.data);else if(_.isData3DTexture)L?(dt&&e.texStorage3D(i.TEXTURE_3D,Tt,Pt,ct.width,ct.height,ct.depth),mt&&e.texSubImage3D(i.TEXTURE_3D,0,0,0,0,ct.width,ct.height,ct.depth,St,Vt,ct.data)):e.texImage3D(i.TEXTURE_3D,0,Pt,ct.width,ct.height,ct.depth,0,St,Vt,ct.data);else if(_.isFramebufferTexture){if(dt)if(L)e.texStorage2D(i.TEXTURE_2D,Tt,Pt,ct.width,ct.height);else{let lt=ct.width,et=ct.height;for(let It=0;It<Tt;It++)e.texImage2D(i.TEXTURE_2D,It,Pt,lt,et,0,St,Vt,null),lt>>=1,et>>=1}}else if(Xt.length>0){if(L&&dt){let lt=zt(Xt[0]);e.texStorage2D(i.TEXTURE_2D,Tt,Pt,lt.width,lt.height)}for(let lt=0,et=Xt.length;lt<et;lt++)yt=Xt[lt],L?mt&&e.texSubImage2D(i.TEXTURE_2D,lt,0,0,St,Vt,yt):e.texImage2D(i.TEXTURE_2D,lt,Pt,St,Vt,yt);_.generateMipmaps=!1}else if(L){if(dt){let lt=zt(ct);e.texStorage2D(i.TEXTURE_2D,Tt,Pt,lt.width,lt.height)}mt&&e.texSubImage2D(i.TEXTURE_2D,0,0,0,St,Vt,ct)}else e.texImage2D(i.TEXTURE_2D,0,Pt,St,Vt,ct);g(_)&&f(Y),wt.__version=J.version,_.onUpdate&&_.onUpdate(_)}b.__version=_.version}function j(b,_,B){if(_.image.length!==6)return;let Y=bt(b,_),st=_.source;e.bindTexture(i.TEXTURE_CUBE_MAP,b.__webglTexture,i.TEXTURE0+B);let J=n.get(st);if(st.version!==J.__version||Y===!0){e.activeTexture(i.TEXTURE0+B);let wt=Jt.getPrimaries(Jt.workingColorSpace),ft=_.colorSpace===yn?null:Jt.getPrimaries(_.colorSpace),Ct=_.colorSpace===yn||wt===ft?i.NONE:i.BROWSER_DEFAULT_WEBGL;i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,_.flipY),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,_.premultiplyAlpha),i.pixelStorei(i.UNPACK_ALIGNMENT,_.unpackAlignment),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,Ct);let Rt=_.isCompressedTexture||_.image[0].isCompressedTexture,ct=_.image[0]&&_.image[0].isDataTexture,St=[];for(let et=0;et<6;et++)!Rt&&!ct?St[et]=v(_.image[et],!0,s.maxCubemapSize):St[et]=ct?_.image[et].image:_.image[et],St[et]=Nt(_,St[et]);let Vt=St[0],Pt=r.convert(_.format,_.colorSpace),yt=r.convert(_.type),Xt=E(_.internalFormat,Pt,yt,_.colorSpace),L=_.isVideoTexture!==!0,dt=J.__version===void 0||Y===!0,mt=st.dataReady,Tt=I(_,Vt);_t(i.TEXTURE_CUBE_MAP,_);let lt;if(Rt){L&&dt&&e.texStorage2D(i.TEXTURE_CUBE_MAP,Tt,Xt,Vt.width,Vt.height);for(let et=0;et<6;et++){lt=St[et].mipmaps;for(let It=0;It<lt.length;It++){let Gt=lt[It];_.format!==Ve?Pt!==null?L?mt&&e.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+et,It,0,0,Gt.width,Gt.height,Pt,Gt.data):e.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+et,It,Xt,Gt.width,Gt.height,0,Gt.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):L?mt&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+et,It,0,0,Gt.width,Gt.height,Pt,yt,Gt.data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+et,It,Xt,Gt.width,Gt.height,0,Pt,yt,Gt.data)}}}else{if(lt=_.mipmaps,L&&dt){lt.length>0&&Tt++;let et=zt(St[0]);e.texStorage2D(i.TEXTURE_CUBE_MAP,Tt,Xt,et.width,et.height)}for(let et=0;et<6;et++)if(ct){L?mt&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+et,0,0,0,St[et].width,St[et].height,Pt,yt,St[et].data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+et,0,Xt,St[et].width,St[et].height,0,Pt,yt,St[et].data);for(let It=0;It<lt.length;It++){let ie=lt[It].image[et].image;L?mt&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+et,It+1,0,0,ie.width,ie.height,Pt,yt,ie.data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+et,It+1,Xt,ie.width,ie.height,0,Pt,yt,ie.data)}}else{L?mt&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+et,0,0,0,Pt,yt,St[et]):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+et,0,Xt,Pt,yt,St[et]);for(let It=0;It<lt.length;It++){let Gt=lt[It];L?mt&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+et,It+1,0,0,Pt,yt,Gt.image[et]):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+et,It+1,Xt,Pt,yt,Gt.image[et])}}}g(_)&&f(i.TEXTURE_CUBE_MAP),J.__version=st.version,_.onUpdate&&_.onUpdate(_)}b.__version=_.version}function pt(b,_,B,Y,st,J){let wt=r.convert(B.format,B.colorSpace),ft=r.convert(B.type),Ct=E(B.internalFormat,wt,ft,B.colorSpace),Rt=n.get(_),ct=n.get(B);if(ct.__renderTarget=_,!Rt.__hasExternalTextures){let St=Math.max(1,_.width>>J),Vt=Math.max(1,_.height>>J);st===i.TEXTURE_3D||st===i.TEXTURE_2D_ARRAY?e.texImage3D(st,J,Ct,St,Vt,_.depth,0,wt,ft,null):e.texImage2D(st,J,Ct,St,Vt,0,wt,ft,null)}e.bindFramebuffer(i.FRAMEBUFFER,b),K(_)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,Y,st,ct.__webglTexture,0,$(_)):(st===i.TEXTURE_2D||st>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&st<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,Y,st,ct.__webglTexture,J),e.bindFramebuffer(i.FRAMEBUFFER,null)}function vt(b,_,B){if(i.bindRenderbuffer(i.RENDERBUFFER,b),_.depthBuffer){let Y=_.depthTexture,st=Y&&Y.isDepthTexture?Y.type:null,J=M(_.stencilBuffer,st),wt=_.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,ft=$(_);K(_)?o.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,ft,J,_.width,_.height):B?i.renderbufferStorageMultisample(i.RENDERBUFFER,ft,J,_.width,_.height):i.renderbufferStorage(i.RENDERBUFFER,J,_.width,_.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,wt,i.RENDERBUFFER,b)}else{let Y=_.textures;for(let st=0;st<Y.length;st++){let J=Y[st],wt=r.convert(J.format,J.colorSpace),ft=r.convert(J.type),Ct=E(J.internalFormat,wt,ft,J.colorSpace),Rt=$(_);B&&K(_)===!1?i.renderbufferStorageMultisample(i.RENDERBUFFER,Rt,Ct,_.width,_.height):K(_)?o.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,Rt,Ct,_.width,_.height):i.renderbufferStorage(i.RENDERBUFFER,Ct,_.width,_.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function ht(b,_){if(_&&_.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(e.bindFramebuffer(i.FRAMEBUFFER,b),!(_.depthTexture&&_.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");let Y=n.get(_.depthTexture);Y.__renderTarget=_,(!Y.__webglTexture||_.depthTexture.image.width!==_.width||_.depthTexture.image.height!==_.height)&&(_.depthTexture.image.width=_.width,_.depthTexture.image.height=_.height,_.depthTexture.needsUpdate=!0),V(_.depthTexture,0);let st=Y.__webglTexture,J=$(_);if(_.depthTexture.format===wi)K(_)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,i.DEPTH_ATTACHMENT,i.TEXTURE_2D,st,0,J):i.framebufferTexture2D(i.FRAMEBUFFER,i.DEPTH_ATTACHMENT,i.TEXTURE_2D,st,0);else if(_.depthTexture.format===Vi)K(_)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,i.DEPTH_STENCIL_ATTACHMENT,i.TEXTURE_2D,st,0,J):i.framebufferTexture2D(i.FRAMEBUFFER,i.DEPTH_STENCIL_ATTACHMENT,i.TEXTURE_2D,st,0);else throw new Error("Unknown depthTexture format")}function Lt(b){let _=n.get(b),B=b.isWebGLCubeRenderTarget===!0;if(_.__boundDepthTexture!==b.depthTexture){let Y=b.depthTexture;if(_.__depthDisposeCallback&&_.__depthDisposeCallback(),Y){let st=()=>{delete _.__boundDepthTexture,delete _.__depthDisposeCallback,Y.removeEventListener("dispose",st)};Y.addEventListener("dispose",st),_.__depthDisposeCallback=st}_.__boundDepthTexture=Y}if(b.depthTexture&&!_.__autoAllocateDepthBuffer){if(B)throw new Error("target.depthTexture not supported in Cube render targets");let Y=b.texture.mipmaps;Y&&Y.length>0?ht(_.__webglFramebuffer[0],b):ht(_.__webglFramebuffer,b)}else if(B){_.__webglDepthbuffer=[];for(let Y=0;Y<6;Y++)if(e.bindFramebuffer(i.FRAMEBUFFER,_.__webglFramebuffer[Y]),_.__webglDepthbuffer[Y]===void 0)_.__webglDepthbuffer[Y]=i.createRenderbuffer(),vt(_.__webglDepthbuffer[Y],b,!1);else{let st=b.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,J=_.__webglDepthbuffer[Y];i.bindRenderbuffer(i.RENDERBUFFER,J),i.framebufferRenderbuffer(i.FRAMEBUFFER,st,i.RENDERBUFFER,J)}}else{let Y=b.texture.mipmaps;if(Y&&Y.length>0?e.bindFramebuffer(i.FRAMEBUFFER,_.__webglFramebuffer[0]):e.bindFramebuffer(i.FRAMEBUFFER,_.__webglFramebuffer),_.__webglDepthbuffer===void 0)_.__webglDepthbuffer=i.createRenderbuffer(),vt(_.__webglDepthbuffer,b,!1);else{let st=b.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,J=_.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,J),i.framebufferRenderbuffer(i.FRAMEBUFFER,st,i.RENDERBUFFER,J)}}e.bindFramebuffer(i.FRAMEBUFFER,null)}function Ot(b,_,B){let Y=n.get(b);_!==void 0&&pt(Y.__webglFramebuffer,b,b.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),B!==void 0&&Lt(b)}function T(b){let _=b.texture,B=n.get(b),Y=n.get(_);b.addEventListener("dispose",P);let st=b.textures,J=b.isWebGLCubeRenderTarget===!0,wt=st.length>1;if(wt||(Y.__webglTexture===void 0&&(Y.__webglTexture=i.createTexture()),Y.__version=_.version,a.memory.textures++),J){B.__webglFramebuffer=[];for(let ft=0;ft<6;ft++)if(_.mipmaps&&_.mipmaps.length>0){B.__webglFramebuffer[ft]=[];for(let Ct=0;Ct<_.mipmaps.length;Ct++)B.__webglFramebuffer[ft][Ct]=i.createFramebuffer()}else B.__webglFramebuffer[ft]=i.createFramebuffer()}else{if(_.mipmaps&&_.mipmaps.length>0){B.__webglFramebuffer=[];for(let ft=0;ft<_.mipmaps.length;ft++)B.__webglFramebuffer[ft]=i.createFramebuffer()}else B.__webglFramebuffer=i.createFramebuffer();if(wt)for(let ft=0,Ct=st.length;ft<Ct;ft++){let Rt=n.get(st[ft]);Rt.__webglTexture===void 0&&(Rt.__webglTexture=i.createTexture(),a.memory.textures++)}if(b.samples>0&&K(b)===!1){B.__webglMultisampledFramebuffer=i.createFramebuffer(),B.__webglColorRenderbuffer=[],e.bindFramebuffer(i.FRAMEBUFFER,B.__webglMultisampledFramebuffer);for(let ft=0;ft<st.length;ft++){let Ct=st[ft];B.__webglColorRenderbuffer[ft]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,B.__webglColorRenderbuffer[ft]);let Rt=r.convert(Ct.format,Ct.colorSpace),ct=r.convert(Ct.type),St=E(Ct.internalFormat,Rt,ct,Ct.colorSpace,b.isXRRenderTarget===!0),Vt=$(b);i.renderbufferStorageMultisample(i.RENDERBUFFER,Vt,St,b.width,b.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+ft,i.RENDERBUFFER,B.__webglColorRenderbuffer[ft])}i.bindRenderbuffer(i.RENDERBUFFER,null),b.depthBuffer&&(B.__webglDepthRenderbuffer=i.createRenderbuffer(),vt(B.__webglDepthRenderbuffer,b,!0)),e.bindFramebuffer(i.FRAMEBUFFER,null)}}if(J){e.bindTexture(i.TEXTURE_CUBE_MAP,Y.__webglTexture),_t(i.TEXTURE_CUBE_MAP,_);for(let ft=0;ft<6;ft++)if(_.mipmaps&&_.mipmaps.length>0)for(let Ct=0;Ct<_.mipmaps.length;Ct++)pt(B.__webglFramebuffer[ft][Ct],b,_,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+ft,Ct);else pt(B.__webglFramebuffer[ft],b,_,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+ft,0);g(_)&&f(i.TEXTURE_CUBE_MAP),e.unbindTexture()}else if(wt){for(let ft=0,Ct=st.length;ft<Ct;ft++){let Rt=st[ft],ct=n.get(Rt),St=i.TEXTURE_2D;(b.isWebGL3DRenderTarget||b.isWebGLArrayRenderTarget)&&(St=b.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),e.bindTexture(St,ct.__webglTexture),_t(St,Rt),pt(B.__webglFramebuffer,b,Rt,i.COLOR_ATTACHMENT0+ft,St,0),g(Rt)&&f(St)}e.unbindTexture()}else{let ft=i.TEXTURE_2D;if((b.isWebGL3DRenderTarget||b.isWebGLArrayRenderTarget)&&(ft=b.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),e.bindTexture(ft,Y.__webglTexture),_t(ft,_),_.mipmaps&&_.mipmaps.length>0)for(let Ct=0;Ct<_.mipmaps.length;Ct++)pt(B.__webglFramebuffer[Ct],b,_,i.COLOR_ATTACHMENT0,ft,Ct);else pt(B.__webglFramebuffer,b,_,i.COLOR_ATTACHMENT0,ft,0);g(_)&&f(ft),e.unbindTexture()}b.depthBuffer&&Lt(b)}function tt(b){let _=b.textures;for(let B=0,Y=_.length;B<Y;B++){let st=_[B];if(g(st)){let J=w(b),wt=n.get(st).__webglTexture;e.bindTexture(J,wt),f(J),e.unbindTexture()}}}let Q=[],R=[];function z(b){if(b.samples>0){if(K(b)===!1){let _=b.textures,B=b.width,Y=b.height,st=i.COLOR_BUFFER_BIT,J=b.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,wt=n.get(b),ft=_.length>1;if(ft)for(let Rt=0;Rt<_.length;Rt++)e.bindFramebuffer(i.FRAMEBUFFER,wt.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+Rt,i.RENDERBUFFER,null),e.bindFramebuffer(i.FRAMEBUFFER,wt.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+Rt,i.TEXTURE_2D,null,0);e.bindFramebuffer(i.READ_FRAMEBUFFER,wt.__webglMultisampledFramebuffer);let Ct=b.texture.mipmaps;Ct&&Ct.length>0?e.bindFramebuffer(i.DRAW_FRAMEBUFFER,wt.__webglFramebuffer[0]):e.bindFramebuffer(i.DRAW_FRAMEBUFFER,wt.__webglFramebuffer);for(let Rt=0;Rt<_.length;Rt++){if(b.resolveDepthBuffer&&(b.depthBuffer&&(st|=i.DEPTH_BUFFER_BIT),b.stencilBuffer&&b.resolveStencilBuffer&&(st|=i.STENCIL_BUFFER_BIT)),ft){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,wt.__webglColorRenderbuffer[Rt]);let ct=n.get(_[Rt]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,ct,0)}i.blitFramebuffer(0,0,B,Y,0,0,B,Y,st,i.NEAREST),c===!0&&(Q.length=0,R.length=0,Q.push(i.COLOR_ATTACHMENT0+Rt),b.depthBuffer&&b.resolveDepthBuffer===!1&&(Q.push(J),R.push(J),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,R)),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,Q))}if(e.bindFramebuffer(i.READ_FRAMEBUFFER,null),e.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),ft)for(let Rt=0;Rt<_.length;Rt++){e.bindFramebuffer(i.FRAMEBUFFER,wt.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+Rt,i.RENDERBUFFER,wt.__webglColorRenderbuffer[Rt]);let ct=n.get(_[Rt]).__webglTexture;e.bindFramebuffer(i.FRAMEBUFFER,wt.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+Rt,i.TEXTURE_2D,ct,0)}e.bindFramebuffer(i.DRAW_FRAMEBUFFER,wt.__webglMultisampledFramebuffer)}else if(b.depthBuffer&&b.resolveDepthBuffer===!1&&c){let _=b.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[_])}}}function $(b){return Math.min(s.maxSamples,b.samples)}function K(b){let _=n.get(b);return b.samples>0&&t.has("WEBGL_multisampled_render_to_texture")===!0&&_.__useRenderToTexture!==!1}function at(b){let _=a.render.frame;h.get(b)!==_&&(h.set(b,_),b.update())}function Nt(b,_){let B=b.colorSpace,Y=b.format,st=b.type;return b.isCompressedTexture===!0||b.isVideoTexture===!0||B!==Kn&&B!==yn&&(Jt.getTransfer(B)===te?(Y!==Ve||st!==Ze)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",B)),_}function zt(b){return typeof HTMLImageElement<"u"&&b instanceof HTMLImageElement?(l.width=b.naturalWidth||b.width,l.height=b.naturalHeight||b.height):typeof VideoFrame<"u"&&b instanceof VideoFrame?(l.width=b.displayWidth,l.height=b.displayHeight):(l.width=b.width,l.height=b.height),l}this.allocateTextureUnit=k,this.resetTextureUnits=N,this.setTexture2D=V,this.setTexture2DArray=q,this.setTexture3D=nt,this.setTextureCube=X,this.rebindTextures=Ot,this.setupRenderTarget=T,this.updateRenderTargetMipmap=tt,this.updateMultisampleRenderTarget=z,this.setupDepthRenderbuffer=Lt,this.setupFrameBufferTexture=pt,this.useMultisampledRTT=K}function Ym(i,t){function e(n,s=yn){let r,a=Jt.getTransfer(s);if(n===Ze)return i.UNSIGNED_BYTE;if(n===Kr)return i.UNSIGNED_SHORT_4_4_4_4;if(n===Qr)return i.UNSIGNED_SHORT_5_5_5_1;if(n===ko)return i.UNSIGNED_INT_5_9_9_9_REV;if(n===Vo)return i.UNSIGNED_INT_10F_11F_11F_REV;if(n===Bo)return i.BYTE;if(n===zo)return i.SHORT;if(n===Bi)return i.UNSIGNED_SHORT;if(n===Jr)return i.INT;if(n===Bn)return i.UNSIGNED_INT;if(n===rn)return i.FLOAT;if(n===zi)return i.HALF_FLOAT;if(n===Ho)return i.ALPHA;if(n===Go)return i.RGB;if(n===Ve)return i.RGBA;if(n===wi)return i.DEPTH_COMPONENT;if(n===Vi)return i.DEPTH_STENCIL;if(n===Wo)return i.RED;if(n===jr)return i.RED_INTEGER;if(n===Xo)return i.RG;if(n===ta)return i.RG_INTEGER;if(n===ea)return i.RGBA_INTEGER;if(n===Ds||n===Us||n===Ns||n===Fs)if(a===te)if(r=t.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(n===Ds)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===Us)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===Ns)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===Fs)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=t.get("WEBGL_compressed_texture_s3tc"),r!==null){if(n===Ds)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===Us)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===Ns)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===Fs)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===na||n===ia||n===sa||n===ra)if(r=t.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(n===na)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===ia)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===sa)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===ra)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===aa||n===oa||n===ca)if(r=t.get("WEBGL_compressed_texture_etc"),r!==null){if(n===aa||n===oa)return a===te?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(n===ca)return a===te?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(n===la||n===ha||n===ua||n===da||n===fa||n===pa||n===ma||n===ga||n===_a||n===xa||n===va||n===ya||n===Ma||n===Sa)if(r=t.get("WEBGL_compressed_texture_astc"),r!==null){if(n===la)return a===te?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===ha)return a===te?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===ua)return a===te?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===da)return a===te?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===fa)return a===te?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===pa)return a===te?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===ma)return a===te?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===ga)return a===te?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===_a)return a===te?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===xa)return a===te?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===va)return a===te?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===ya)return a===te?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===Ma)return a===te?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===Sa)return a===te?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===ba||n===Ea||n===Ta)if(r=t.get("EXT_texture_compression_bptc"),r!==null){if(n===ba)return a===te?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===Ea)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===Ta)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===wa||n===Aa||n===Ca||n===Ra)if(r=t.get("EXT_texture_compression_rgtc"),r!==null){if(n===wa)return r.COMPRESSED_RED_RGTC1_EXT;if(n===Aa)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===Ca)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===Ra)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===ki?i.UNSIGNED_INT_24_8:i[n]!==void 0?i[n]:null}return{convert:e}}var $m=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,Zm=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`,pc=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(t,e){if(this.texture===null){let n=new gs(t.texture);(t.depthNear!==e.depthNear||t.depthFar!==e.depthFar)&&(this.depthNear=t.depthNear,this.depthFar=t.depthFar),this.texture=n}}getMesh(t){if(this.texture!==null&&this.mesh===null){let e=t.cameras[0].viewport,n=new $e({vertexShader:$m,fragmentShader:Zm,uniforms:{depthColor:{value:this.texture},depthWidth:{value:e.z},depthHeight:{value:e.w}}});this.mesh=new ge(new Nn(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},mc=class extends mn{constructor(t,e){super();let n=this,s=null,r=1,a=null,o="local-floor",c=1,l=null,h=null,u=null,d=null,p=null,m=null,v=typeof XRWebGLBinding<"u",g=new pc,f={},w=e.getContextAttributes(),E=null,M=null,I=[],C=[],P=new gt,U=null,S=new _e;S.viewport=new jt;let x=new _e;x.viewport=new jt;let A=[S,x],N=new zr,k=null,G=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(Z){let j=I[Z];return j===void 0&&(j=new Li,I[Z]=j),j.getTargetRaySpace()},this.getControllerGrip=function(Z){let j=I[Z];return j===void 0&&(j=new Li,I[Z]=j),j.getGripSpace()},this.getHand=function(Z){let j=I[Z];return j===void 0&&(j=new Li,I[Z]=j),j.getHandSpace()};function V(Z){let j=C.indexOf(Z.inputSource);if(j===-1)return;let pt=I[j];pt!==void 0&&(pt.update(Z.inputSource,Z.frame,l||a),pt.dispatchEvent({type:Z.type,data:Z.inputSource}))}function q(){s.removeEventListener("select",V),s.removeEventListener("selectstart",V),s.removeEventListener("selectend",V),s.removeEventListener("squeeze",V),s.removeEventListener("squeezestart",V),s.removeEventListener("squeezeend",V),s.removeEventListener("end",q),s.removeEventListener("inputsourceschange",nt);for(let Z=0;Z<I.length;Z++){let j=C[Z];j!==null&&(C[Z]=null,I[Z].disconnect(j))}k=null,G=null,g.reset();for(let Z in f)delete f[Z];t.setRenderTarget(E),p=null,d=null,u=null,s=null,M=null,Ut.stop(),n.isPresenting=!1,t.setPixelRatio(U),t.setSize(P.width,P.height,!1),n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(Z){r=Z,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(Z){o=Z,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return l||a},this.setReferenceSpace=function(Z){l=Z},this.getBaseLayer=function(){return d!==null?d:p},this.getBinding=function(){return u===null&&v&&(u=new XRWebGLBinding(s,e)),u},this.getFrame=function(){return m},this.getSession=function(){return s},this.setSession=async function(Z){if(s=Z,s!==null){if(E=t.getRenderTarget(),s.addEventListener("select",V),s.addEventListener("selectstart",V),s.addEventListener("selectend",V),s.addEventListener("squeeze",V),s.addEventListener("squeezestart",V),s.addEventListener("squeezeend",V),s.addEventListener("end",q),s.addEventListener("inputsourceschange",nt),w.xrCompatible!==!0&&await e.makeXRCompatible(),U=t.getPixelRatio(),t.getSize(P),v&&"createProjectionLayer"in XRWebGLBinding.prototype){let pt=null,vt=null,ht=null;w.depth&&(ht=w.stencil?e.DEPTH24_STENCIL8:e.DEPTH_COMPONENT24,pt=w.stencil?Vi:wi,vt=w.stencil?ki:Bn);let Lt={colorFormat:e.RGBA8,depthFormat:ht,scaleFactor:r};u=this.getBinding(),d=u.createProjectionLayer(Lt),s.updateRenderState({layers:[d]}),t.setPixelRatio(1),t.setSize(d.textureWidth,d.textureHeight,!1),M=new je(d.textureWidth,d.textureHeight,{format:Ve,type:Ze,depthTexture:new ms(d.textureWidth,d.textureHeight,vt,void 0,void 0,void 0,void 0,void 0,void 0,pt),stencilBuffer:w.stencil,colorSpace:t.outputColorSpace,samples:w.antialias?4:0,resolveDepthBuffer:d.ignoreDepthValues===!1,resolveStencilBuffer:d.ignoreDepthValues===!1})}else{let pt={antialias:w.antialias,alpha:!0,depth:w.depth,stencil:w.stencil,framebufferScaleFactor:r};p=new XRWebGLLayer(s,e,pt),s.updateRenderState({baseLayer:p}),t.setPixelRatio(1),t.setSize(p.framebufferWidth,p.framebufferHeight,!1),M=new je(p.framebufferWidth,p.framebufferHeight,{format:Ve,type:Ze,colorSpace:t.outputColorSpace,stencilBuffer:w.stencil,resolveDepthBuffer:p.ignoreDepthValues===!1,resolveStencilBuffer:p.ignoreDepthValues===!1})}M.isXRRenderTarget=!0,this.setFoveation(c),l=null,a=await s.requestReferenceSpace(o),Ut.setContext(s),Ut.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(s!==null)return s.environmentBlendMode},this.getDepthTexture=function(){return g.getDepthTexture()};function nt(Z){for(let j=0;j<Z.removed.length;j++){let pt=Z.removed[j],vt=C.indexOf(pt);vt>=0&&(C[vt]=null,I[vt].disconnect(pt))}for(let j=0;j<Z.added.length;j++){let pt=Z.added[j],vt=C.indexOf(pt);if(vt===-1){for(let Lt=0;Lt<I.length;Lt++)if(Lt>=C.length){C.push(pt),vt=Lt;break}else if(C[Lt]===null){C[Lt]=pt,vt=Lt;break}if(vt===-1)break}let ht=I[vt];ht&&ht.connect(pt)}}let X=new D,ot=new D;function it(Z,j,pt){X.setFromMatrixPosition(j.matrixWorld),ot.setFromMatrixPosition(pt.matrixWorld);let vt=X.distanceTo(ot),ht=j.projectionMatrix.elements,Lt=pt.projectionMatrix.elements,Ot=ht[14]/(ht[10]-1),T=ht[14]/(ht[10]+1),tt=(ht[9]+1)/ht[5],Q=(ht[9]-1)/ht[5],R=(ht[8]-1)/ht[0],z=(Lt[8]+1)/Lt[0],$=Ot*R,K=Ot*z,at=vt/(-R+z),Nt=at*-R;if(j.matrixWorld.decompose(Z.position,Z.quaternion,Z.scale),Z.translateX(Nt),Z.translateZ(at),Z.matrixWorld.compose(Z.position,Z.quaternion,Z.scale),Z.matrixWorldInverse.copy(Z.matrixWorld).invert(),ht[10]===-1)Z.projectionMatrix.copy(j.projectionMatrix),Z.projectionMatrixInverse.copy(j.projectionMatrixInverse);else{let zt=Ot+at,b=T+at,_=$-Nt,B=K+(vt-Nt),Y=tt*T/b*zt,st=Q*T/b*zt;Z.projectionMatrix.makePerspective(_,B,Y,st,zt,b),Z.projectionMatrixInverse.copy(Z.projectionMatrix).invert()}}function rt(Z,j){j===null?Z.matrixWorld.copy(Z.matrix):Z.matrixWorld.multiplyMatrices(j.matrixWorld,Z.matrix),Z.matrixWorldInverse.copy(Z.matrixWorld).invert()}this.updateCamera=function(Z){if(s===null)return;let j=Z.near,pt=Z.far;g.texture!==null&&(g.depthNear>0&&(j=g.depthNear),g.depthFar>0&&(pt=g.depthFar)),N.near=x.near=S.near=j,N.far=x.far=S.far=pt,(k!==N.near||G!==N.far)&&(s.updateRenderState({depthNear:N.near,depthFar:N.far}),k=N.near,G=N.far),N.layers.mask=Z.layers.mask|6,S.layers.mask=N.layers.mask&3,x.layers.mask=N.layers.mask&5;let vt=Z.parent,ht=N.cameras;rt(N,vt);for(let Lt=0;Lt<ht.length;Lt++)rt(ht[Lt],vt);ht.length===2?it(N,S,x):N.projectionMatrix.copy(S.projectionMatrix),_t(Z,N,vt)};function _t(Z,j,pt){pt===null?Z.matrix.copy(j.matrixWorld):(Z.matrix.copy(pt.matrixWorld),Z.matrix.invert(),Z.matrix.multiply(j.matrixWorld)),Z.matrix.decompose(Z.position,Z.quaternion,Z.scale),Z.updateMatrixWorld(!0),Z.projectionMatrix.copy(j.projectionMatrix),Z.projectionMatrixInverse.copy(j.projectionMatrixInverse),Z.isPerspectiveCamera&&(Z.fov=Ai*2*Math.atan(1/Z.projectionMatrix.elements[5]),Z.zoom=1)}this.getCamera=function(){return N},this.getFoveation=function(){if(!(d===null&&p===null))return c},this.setFoveation=function(Z){c=Z,d!==null&&(d.fixedFoveation=Z),p!==null&&p.fixedFoveation!==void 0&&(p.fixedFoveation=Z)},this.hasDepthSensing=function(){return g.texture!==null},this.getDepthSensingMesh=function(){return g.getMesh(N)},this.getCameraTexture=function(Z){return f[Z]};let bt=null;function Dt(Z,j){if(h=j.getViewerPose(l||a),m=j,h!==null){let pt=h.views;p!==null&&(t.setRenderTargetFramebuffer(M,p.framebuffer),t.setRenderTarget(M));let vt=!1;pt.length!==N.cameras.length&&(N.cameras.length=0,vt=!0);for(let T=0;T<pt.length;T++){let tt=pt[T],Q=null;if(p!==null)Q=p.getViewport(tt);else{let z=u.getViewSubImage(d,tt);Q=z.viewport,T===0&&(t.setRenderTargetTextures(M,z.colorTexture,z.depthStencilTexture),t.setRenderTarget(M))}let R=A[T];R===void 0&&(R=new _e,R.layers.enable(T),R.viewport=new jt,A[T]=R),R.matrix.fromArray(tt.transform.matrix),R.matrix.decompose(R.position,R.quaternion,R.scale),R.projectionMatrix.fromArray(tt.projectionMatrix),R.projectionMatrixInverse.copy(R.projectionMatrix).invert(),R.viewport.set(Q.x,Q.y,Q.width,Q.height),T===0&&(N.matrix.copy(R.matrix),N.matrix.decompose(N.position,N.quaternion,N.scale)),vt===!0&&N.cameras.push(R)}let ht=s.enabledFeatures;if(ht&&ht.includes("depth-sensing")&&s.depthUsage=="gpu-optimized"&&v){u=n.getBinding();let T=u.getDepthInformation(pt[0]);T&&T.isValid&&T.texture&&g.init(T,s.renderState)}if(ht&&ht.includes("camera-access")&&v){t.state.unbindTexture(),u=n.getBinding();for(let T=0;T<pt.length;T++){let tt=pt[T].camera;if(tt){let Q=f[tt];Q||(Q=new gs,f[tt]=Q);let R=u.getCameraImage(tt);Q.sourceTexture=R}}}}for(let pt=0;pt<I.length;pt++){let vt=C[pt],ht=I[pt];vt!==null&&ht!==void 0&&ht.update(vt,j,l||a)}bt&&bt(Z,j),j.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:j}),m=null}let Ut=new Rh;Ut.setAnimationLoop(Dt),this.setAnimationLoop=function(Z){bt=Z},this.dispose=function(){}}},oi=new Ye,Jm=new ae;function Km(i,t){function e(g,f){g.matrixAutoUpdate===!0&&g.updateMatrix(),f.value.copy(g.matrix)}function n(g,f){f.color.getRGB(g.fogColor.value,Ko(i)),f.isFog?(g.fogNear.value=f.near,g.fogFar.value=f.far):f.isFogExp2&&(g.fogDensity.value=f.density)}function s(g,f,w,E,M){f.isMeshBasicMaterial||f.isMeshLambertMaterial?r(g,f):f.isMeshToonMaterial?(r(g,f),u(g,f)):f.isMeshPhongMaterial?(r(g,f),h(g,f)):f.isMeshStandardMaterial?(r(g,f),d(g,f),f.isMeshPhysicalMaterial&&p(g,f,M)):f.isMeshMatcapMaterial?(r(g,f),m(g,f)):f.isMeshDepthMaterial?r(g,f):f.isMeshDistanceMaterial?(r(g,f),v(g,f)):f.isMeshNormalMaterial?r(g,f):f.isLineBasicMaterial?(a(g,f),f.isLineDashedMaterial&&o(g,f)):f.isPointsMaterial?c(g,f,w,E):f.isSpriteMaterial?l(g,f):f.isShadowMaterial?(g.color.value.copy(f.color),g.opacity.value=f.opacity):f.isShaderMaterial&&(f.uniformsNeedUpdate=!1)}function r(g,f){g.opacity.value=f.opacity,f.color&&g.diffuse.value.copy(f.color),f.emissive&&g.emissive.value.copy(f.emissive).multiplyScalar(f.emissiveIntensity),f.map&&(g.map.value=f.map,e(f.map,g.mapTransform)),f.alphaMap&&(g.alphaMap.value=f.alphaMap,e(f.alphaMap,g.alphaMapTransform)),f.bumpMap&&(g.bumpMap.value=f.bumpMap,e(f.bumpMap,g.bumpMapTransform),g.bumpScale.value=f.bumpScale,f.side===Ae&&(g.bumpScale.value*=-1)),f.normalMap&&(g.normalMap.value=f.normalMap,e(f.normalMap,g.normalMapTransform),g.normalScale.value.copy(f.normalScale),f.side===Ae&&g.normalScale.value.negate()),f.displacementMap&&(g.displacementMap.value=f.displacementMap,e(f.displacementMap,g.displacementMapTransform),g.displacementScale.value=f.displacementScale,g.displacementBias.value=f.displacementBias),f.emissiveMap&&(g.emissiveMap.value=f.emissiveMap,e(f.emissiveMap,g.emissiveMapTransform)),f.specularMap&&(g.specularMap.value=f.specularMap,e(f.specularMap,g.specularMapTransform)),f.alphaTest>0&&(g.alphaTest.value=f.alphaTest);let w=t.get(f),E=w.envMap,M=w.envMapRotation;E&&(g.envMap.value=E,oi.copy(M),oi.x*=-1,oi.y*=-1,oi.z*=-1,E.isCubeTexture&&E.isRenderTargetTexture===!1&&(oi.y*=-1,oi.z*=-1),g.envMapRotation.value.setFromMatrix4(Jm.makeRotationFromEuler(oi)),g.flipEnvMap.value=E.isCubeTexture&&E.isRenderTargetTexture===!1?-1:1,g.reflectivity.value=f.reflectivity,g.ior.value=f.ior,g.refractionRatio.value=f.refractionRatio),f.lightMap&&(g.lightMap.value=f.lightMap,g.lightMapIntensity.value=f.lightMapIntensity,e(f.lightMap,g.lightMapTransform)),f.aoMap&&(g.aoMap.value=f.aoMap,g.aoMapIntensity.value=f.aoMapIntensity,e(f.aoMap,g.aoMapTransform))}function a(g,f){g.diffuse.value.copy(f.color),g.opacity.value=f.opacity,f.map&&(g.map.value=f.map,e(f.map,g.mapTransform))}function o(g,f){g.dashSize.value=f.dashSize,g.totalSize.value=f.dashSize+f.gapSize,g.scale.value=f.scale}function c(g,f,w,E){g.diffuse.value.copy(f.color),g.opacity.value=f.opacity,g.size.value=f.size*w,g.scale.value=E*.5,f.map&&(g.map.value=f.map,e(f.map,g.uvTransform)),f.alphaMap&&(g.alphaMap.value=f.alphaMap,e(f.alphaMap,g.alphaMapTransform)),f.alphaTest>0&&(g.alphaTest.value=f.alphaTest)}function l(g,f){g.diffuse.value.copy(f.color),g.opacity.value=f.opacity,g.rotation.value=f.rotation,f.map&&(g.map.value=f.map,e(f.map,g.mapTransform)),f.alphaMap&&(g.alphaMap.value=f.alphaMap,e(f.alphaMap,g.alphaMapTransform)),f.alphaTest>0&&(g.alphaTest.value=f.alphaTest)}function h(g,f){g.specular.value.copy(f.specular),g.shininess.value=Math.max(f.shininess,1e-4)}function u(g,f){f.gradientMap&&(g.gradientMap.value=f.gradientMap)}function d(g,f){g.metalness.value=f.metalness,f.metalnessMap&&(g.metalnessMap.value=f.metalnessMap,e(f.metalnessMap,g.metalnessMapTransform)),g.roughness.value=f.roughness,f.roughnessMap&&(g.roughnessMap.value=f.roughnessMap,e(f.roughnessMap,g.roughnessMapTransform)),f.envMap&&(g.envMapIntensity.value=f.envMapIntensity)}function p(g,f,w){g.ior.value=f.ior,f.sheen>0&&(g.sheenColor.value.copy(f.sheenColor).multiplyScalar(f.sheen),g.sheenRoughness.value=f.sheenRoughness,f.sheenColorMap&&(g.sheenColorMap.value=f.sheenColorMap,e(f.sheenColorMap,g.sheenColorMapTransform)),f.sheenRoughnessMap&&(g.sheenRoughnessMap.value=f.sheenRoughnessMap,e(f.sheenRoughnessMap,g.sheenRoughnessMapTransform))),f.clearcoat>0&&(g.clearcoat.value=f.clearcoat,g.clearcoatRoughness.value=f.clearcoatRoughness,f.clearcoatMap&&(g.clearcoatMap.value=f.clearcoatMap,e(f.clearcoatMap,g.clearcoatMapTransform)),f.clearcoatRoughnessMap&&(g.clearcoatRoughnessMap.value=f.clearcoatRoughnessMap,e(f.clearcoatRoughnessMap,g.clearcoatRoughnessMapTransform)),f.clearcoatNormalMap&&(g.clearcoatNormalMap.value=f.clearcoatNormalMap,e(f.clearcoatNormalMap,g.clearcoatNormalMapTransform),g.clearcoatNormalScale.value.copy(f.clearcoatNormalScale),f.side===Ae&&g.clearcoatNormalScale.value.negate())),f.dispersion>0&&(g.dispersion.value=f.dispersion),f.iridescence>0&&(g.iridescence.value=f.iridescence,g.iridescenceIOR.value=f.iridescenceIOR,g.iridescenceThicknessMinimum.value=f.iridescenceThicknessRange[0],g.iridescenceThicknessMaximum.value=f.iridescenceThicknessRange[1],f.iridescenceMap&&(g.iridescenceMap.value=f.iridescenceMap,e(f.iridescenceMap,g.iridescenceMapTransform)),f.iridescenceThicknessMap&&(g.iridescenceThicknessMap.value=f.iridescenceThicknessMap,e(f.iridescenceThicknessMap,g.iridescenceThicknessMapTransform))),f.transmission>0&&(g.transmission.value=f.transmission,g.transmissionSamplerMap.value=w.texture,g.transmissionSamplerSize.value.set(w.width,w.height),f.transmissionMap&&(g.transmissionMap.value=f.transmissionMap,e(f.transmissionMap,g.transmissionMapTransform)),g.thickness.value=f.thickness,f.thicknessMap&&(g.thicknessMap.value=f.thicknessMap,e(f.thicknessMap,g.thicknessMapTransform)),g.attenuationDistance.value=f.attenuationDistance,g.attenuationColor.value.copy(f.attenuationColor)),f.anisotropy>0&&(g.anisotropyVector.value.set(f.anisotropy*Math.cos(f.anisotropyRotation),f.anisotropy*Math.sin(f.anisotropyRotation)),f.anisotropyMap&&(g.anisotropyMap.value=f.anisotropyMap,e(f.anisotropyMap,g.anisotropyMapTransform))),g.specularIntensity.value=f.specularIntensity,g.specularColor.value.copy(f.specularColor),f.specularColorMap&&(g.specularColorMap.value=f.specularColorMap,e(f.specularColorMap,g.specularColorMapTransform)),f.specularIntensityMap&&(g.specularIntensityMap.value=f.specularIntensityMap,e(f.specularIntensityMap,g.specularIntensityMapTransform))}function m(g,f){f.matcap&&(g.matcap.value=f.matcap)}function v(g,f){let w=t.get(f).light;g.referencePosition.value.setFromMatrixPosition(w.matrixWorld),g.nearDistance.value=w.shadow.camera.near,g.farDistance.value=w.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:s}}function Qm(i,t,e,n){let s={},r={},a=[],o=i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);function c(w,E){let M=E.program;n.uniformBlockBinding(w,M)}function l(w,E){let M=s[w.id];M===void 0&&(m(w),M=h(w),s[w.id]=M,w.addEventListener("dispose",g));let I=E.program;n.updateUBOMapping(w,I);let C=t.render.frame;r[w.id]!==C&&(d(w),r[w.id]=C)}function h(w){let E=u();w.__bindingPointIndex=E;let M=i.createBuffer(),I=w.__size,C=w.usage;return i.bindBuffer(i.UNIFORM_BUFFER,M),i.bufferData(i.UNIFORM_BUFFER,I,C),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,E,M),M}function u(){for(let w=0;w<o;w++)if(a.indexOf(w)===-1)return a.push(w),w;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function d(w){let E=s[w.id],M=w.uniforms,I=w.__cache;i.bindBuffer(i.UNIFORM_BUFFER,E);for(let C=0,P=M.length;C<P;C++){let U=Array.isArray(M[C])?M[C]:[M[C]];for(let S=0,x=U.length;S<x;S++){let A=U[S];if(p(A,C,S,I)===!0){let N=A.__offset,k=Array.isArray(A.value)?A.value:[A.value],G=0;for(let V=0;V<k.length;V++){let q=k[V],nt=v(q);typeof q=="number"||typeof q=="boolean"?(A.__data[0]=q,i.bufferSubData(i.UNIFORM_BUFFER,N+G,A.__data)):q.isMatrix3?(A.__data[0]=q.elements[0],A.__data[1]=q.elements[1],A.__data[2]=q.elements[2],A.__data[3]=0,A.__data[4]=q.elements[3],A.__data[5]=q.elements[4],A.__data[6]=q.elements[5],A.__data[7]=0,A.__data[8]=q.elements[6],A.__data[9]=q.elements[7],A.__data[10]=q.elements[8],A.__data[11]=0):(q.toArray(A.__data,G),G+=nt.storage/Float32Array.BYTES_PER_ELEMENT)}i.bufferSubData(i.UNIFORM_BUFFER,N,A.__data)}}}i.bindBuffer(i.UNIFORM_BUFFER,null)}function p(w,E,M,I){let C=w.value,P=E+"_"+M;if(I[P]===void 0)return typeof C=="number"||typeof C=="boolean"?I[P]=C:I[P]=C.clone(),!0;{let U=I[P];if(typeof C=="number"||typeof C=="boolean"){if(U!==C)return I[P]=C,!0}else if(U.equals(C)===!1)return U.copy(C),!0}return!1}function m(w){let E=w.uniforms,M=0,I=16;for(let P=0,U=E.length;P<U;P++){let S=Array.isArray(E[P])?E[P]:[E[P]];for(let x=0,A=S.length;x<A;x++){let N=S[x],k=Array.isArray(N.value)?N.value:[N.value];for(let G=0,V=k.length;G<V;G++){let q=k[G],nt=v(q),X=M%I,ot=X%nt.boundary,it=X+ot;M+=ot,it!==0&&I-it<nt.storage&&(M+=I-it),N.__data=new Float32Array(nt.storage/Float32Array.BYTES_PER_ELEMENT),N.__offset=M,M+=nt.storage}}}let C=M%I;return C>0&&(M+=I-C),w.__size=M,w.__cache={},this}function v(w){let E={boundary:0,storage:0};return typeof w=="number"||typeof w=="boolean"?(E.boundary=4,E.storage=4):w.isVector2?(E.boundary=8,E.storage=8):w.isVector3||w.isColor?(E.boundary=16,E.storage=12):w.isVector4?(E.boundary=16,E.storage=16):w.isMatrix3?(E.boundary=48,E.storage=48):w.isMatrix4?(E.boundary=64,E.storage=64):w.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",w),E}function g(w){let E=w.target;E.removeEventListener("dispose",g);let M=a.indexOf(E.__bindingPointIndex);a.splice(M,1),i.deleteBuffer(s[E.id]),delete s[E.id],delete r[E.id]}function f(){for(let w in s)i.deleteBuffer(s[w]);a=[],s={},r={}}return{bind:c,update:l,dispose:f}}var Ua=class{constructor(t={}){let{canvas:e=Kl(),context:n=null,depth:s=!0,stencil:r=!1,alpha:a=!1,antialias:o=!1,premultipliedAlpha:c=!0,preserveDrawingBuffer:l=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:u=!1,reversedDepthBuffer:d=!1}=t;this.isWebGLRenderer=!0;let p;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");p=n.getContextAttributes().alpha}else p=a;let m=new Uint32Array(4),v=new Int32Array(4),g=null,f=null,w=[],E=[];this.domElement=e,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=vn,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let M=this,I=!1;this._outputColorSpace=ye;let C=0,P=0,U=null,S=-1,x=null,A=new jt,N=new jt,k=null,G=new $t(0),V=0,q=e.width,nt=e.height,X=1,ot=null,it=null,rt=new jt(0,0,q,nt),_t=new jt(0,0,q,nt),bt=!1,Dt=new Di,Ut=!1,Z=!1,j=new ae,pt=new D,vt=new jt,ht={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},Lt=!1;function Ot(){return U===null?X:1}let T=n;function tt(y,F){return e.getContext(y,F)}try{let y={alpha:!0,depth:s,stencil:r,antialias:o,premultipliedAlpha:c,preserveDrawingBuffer:l,powerPreference:h,failIfMajorPerformanceCaveat:u};if("setAttribute"in e&&e.setAttribute("data-engine",`three.js r${"180"}`),e.addEventListener("webglcontextlost",mt,!1),e.addEventListener("webglcontextrestored",Tt,!1),e.addEventListener("webglcontextcreationerror",lt,!1),T===null){let F="webgl2";if(T=tt(F,y),T===null)throw tt(F)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(y){throw console.error("THREE.WebGLRenderer: "+y.message),y}let Q,R,z,$,K,at,Nt,zt,b,_,B,Y,st,J,wt,ft,Ct,Rt,ct,St,Vt,Pt,yt,Xt;function L(){Q=new g1(T),Q.init(),Pt=new Ym(T,Q),R=new l1(T,Q,t,Pt),z=new Xm(T,Q),R.reversedDepthBuffer&&d&&z.buffers.depth.setReversed(!0),$=new v1(T),K=new Lm,at=new qm(T,Q,z,K,R,Pt,$),Nt=new u1(M),zt=new m1(M),b=new Ed(T),yt=new o1(T,b),_=new _1(T,b,$,yt),B=new M1(T,_,b,$),ct=new y1(T,R,at),ft=new h1(K),Y=new Pm(M,Nt,zt,Q,R,yt,ft),st=new Km(M,K),J=new Um,wt=new km(Q),Rt=new a1(M,Nt,zt,z,B,p,c),Ct=new Gm(M,B,R),Xt=new Qm(T,$,R,z),St=new c1(T,Q,$),Vt=new x1(T,Q,$),$.programs=Y.programs,M.capabilities=R,M.extensions=Q,M.properties=K,M.renderLists=J,M.shadowMap=Ct,M.state=z,M.info=$}L();let dt=new mc(M,T);this.xr=dt,this.getContext=function(){return T},this.getContextAttributes=function(){return T.getContextAttributes()},this.forceContextLoss=function(){let y=Q.get("WEBGL_lose_context");y&&y.loseContext()},this.forceContextRestore=function(){let y=Q.get("WEBGL_lose_context");y&&y.restoreContext()},this.getPixelRatio=function(){return X},this.setPixelRatio=function(y){y!==void 0&&(X=y,this.setSize(q,nt,!1))},this.getSize=function(y){return y.set(q,nt)},this.setSize=function(y,F,H=!0){if(dt.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}q=y,nt=F,e.width=Math.floor(y*X),e.height=Math.floor(F*X),H===!0&&(e.style.width=y+"px",e.style.height=F+"px"),this.setViewport(0,0,y,F)},this.getDrawingBufferSize=function(y){return y.set(q*X,nt*X).floor()},this.setDrawingBufferSize=function(y,F,H){q=y,nt=F,X=H,e.width=Math.floor(y*H),e.height=Math.floor(F*H),this.setViewport(0,0,y,F)},this.getCurrentViewport=function(y){return y.copy(A)},this.getViewport=function(y){return y.copy(rt)},this.setViewport=function(y,F,H,W){y.isVector4?rt.set(y.x,y.y,y.z,y.w):rt.set(y,F,H,W),z.viewport(A.copy(rt).multiplyScalar(X).round())},this.getScissor=function(y){return y.copy(_t)},this.setScissor=function(y,F,H,W){y.isVector4?_t.set(y.x,y.y,y.z,y.w):_t.set(y,F,H,W),z.scissor(N.copy(_t).multiplyScalar(X).round())},this.getScissorTest=function(){return bt},this.setScissorTest=function(y){z.setScissorTest(bt=y)},this.setOpaqueSort=function(y){ot=y},this.setTransparentSort=function(y){it=y},this.getClearColor=function(y){return y.copy(Rt.getClearColor())},this.setClearColor=function(){Rt.setClearColor(...arguments)},this.getClearAlpha=function(){return Rt.getClearAlpha()},this.setClearAlpha=function(){Rt.setClearAlpha(...arguments)},this.clear=function(y=!0,F=!0,H=!0){let W=0;if(y){let O=!1;if(U!==null){let ut=U.texture.format;O=ut===ea||ut===ta||ut===jr}if(O){let ut=U.texture.type,Mt=ut===Ze||ut===Bn||ut===Bi||ut===ki||ut===Kr||ut===Qr,At=Rt.getClearColor(),Et=Rt.getClearAlpha(),kt=At.r,Ht=At.g,Ft=At.b;Mt?(m[0]=kt,m[1]=Ht,m[2]=Ft,m[3]=Et,T.clearBufferuiv(T.COLOR,0,m)):(v[0]=kt,v[1]=Ht,v[2]=Ft,v[3]=Et,T.clearBufferiv(T.COLOR,0,v))}else W|=T.COLOR_BUFFER_BIT}F&&(W|=T.DEPTH_BUFFER_BIT),H&&(W|=T.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),T.clear(W)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){e.removeEventListener("webglcontextlost",mt,!1),e.removeEventListener("webglcontextrestored",Tt,!1),e.removeEventListener("webglcontextcreationerror",lt,!1),Rt.dispose(),J.dispose(),wt.dispose(),K.dispose(),Nt.dispose(),zt.dispose(),B.dispose(),yt.dispose(),Xt.dispose(),Y.dispose(),dt.dispose(),dt.removeEventListener("sessionstart",Ke),dt.removeEventListener("sessionend",yc),zn.stop()};function mt(y){y.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),I=!0}function Tt(){console.log("THREE.WebGLRenderer: Context Restored."),I=!1;let y=$.autoReset,F=Ct.enabled,H=Ct.autoUpdate,W=Ct.needsUpdate,O=Ct.type;L(),$.autoReset=y,Ct.enabled=F,Ct.autoUpdate=H,Ct.needsUpdate=W,Ct.type=O}function lt(y){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",y.statusMessage)}function et(y){let F=y.target;F.removeEventListener("dispose",et),It(F)}function It(y){Gt(y),K.remove(y)}function Gt(y){let F=K.get(y).programs;F!==void 0&&(F.forEach(function(H){Y.releaseProgram(H)}),y.isShaderMaterial&&Y.releaseShaderCache(y))}this.renderBufferDirect=function(y,F,H,W,O,ut){F===null&&(F=ht);let Mt=O.isMesh&&O.matrixWorld.determinant()<0,At=Jh(y,F,H,W,O);z.setMaterial(W,Mt);let Et=H.index,kt=1;if(W.wireframe===!0){if(Et=_.getWireframeAttribute(H),Et===void 0)return;kt=2}let Ht=H.drawRange,Ft=H.attributes.position,Zt=Ht.start*kt,ee=(Ht.start+Ht.count)*kt;ut!==null&&(Zt=Math.max(Zt,ut.start*kt),ee=Math.min(ee,(ut.start+ut.count)*kt)),Et!==null?(Zt=Math.max(Zt,0),ee=Math.min(ee,Et.count)):Ft!=null&&(Zt=Math.max(Zt,0),ee=Math.min(ee,Ft.count));let he=ee-Zt;if(he<0||he===1/0)return;yt.setup(O,W,At,H,Et);let se,ne=St;if(Et!==null&&(se=b.get(Et),ne=Vt,ne.setIndex(se)),O.isMesh)W.wireframe===!0?(z.setLineWidth(W.wireframeLinewidth*Ot()),ne.setMode(T.LINES)):ne.setMode(T.TRIANGLES);else if(O.isLine){let Bt=W.linewidth;Bt===void 0&&(Bt=1),z.setLineWidth(Bt*Ot()),O.isLineSegments?ne.setMode(T.LINES):O.isLineLoop?ne.setMode(T.LINE_LOOP):ne.setMode(T.LINE_STRIP)}else O.isPoints?ne.setMode(T.POINTS):O.isSprite&&ne.setMode(T.TRIANGLES);if(O.isBatchedMesh)if(O._multiDrawInstances!==null)Ci("THREE.WebGLRenderer: renderMultiDrawInstances has been deprecated and will be removed in r184. Append to renderMultiDraw arguments and use indirection."),ne.renderMultiDrawInstances(O._multiDrawStarts,O._multiDrawCounts,O._multiDrawCount,O._multiDrawInstances);else if(Q.get("WEBGL_multi_draw"))ne.renderMultiDraw(O._multiDrawStarts,O._multiDrawCounts,O._multiDrawCount);else{let Bt=O._multiDrawStarts,oe=O._multiDrawCounts,Kt=O._multiDrawCount,Re=Et?b.get(Et).bytesPerElement:1,hi=K.get(W).currentProgram.getUniforms();for(let Ie=0;Ie<Kt;Ie++)hi.setValue(T,"_gl_DrawID",Ie),ne.render(Bt[Ie]/Re,oe[Ie])}else if(O.isInstancedMesh)ne.renderInstances(Zt,he,O.count);else if(H.isInstancedBufferGeometry){let Bt=H._maxInstanceCount!==void 0?H._maxInstanceCount:1/0,oe=Math.min(H.instanceCount,Bt);ne.renderInstances(Zt,he,oe)}else ne.render(Zt,he)};function ie(y,F,H){y.transparent===!0&&y.side===nn&&y.forceSinglePass===!1?(y.side=Ae,y.needsUpdate=!0,Vs(y,F,H),y.side=pn,y.needsUpdate=!0,Vs(y,F,H),y.side=nn):Vs(y,F,H)}this.compile=function(y,F,H=null){H===null&&(H=y),f=wt.get(H),f.init(F),E.push(f),H.traverseVisible(function(O){O.isLight&&O.layers.test(F.layers)&&(f.pushLight(O),O.castShadow&&f.pushShadow(O))}),y!==H&&y.traverseVisible(function(O){O.isLight&&O.layers.test(F.layers)&&(f.pushLight(O),O.castShadow&&f.pushShadow(O))}),f.setupLights();let W=new Set;return y.traverse(function(O){if(!(O.isMesh||O.isPoints||O.isLine||O.isSprite))return;let ut=O.material;if(ut)if(Array.isArray(ut))for(let Mt=0;Mt<ut.length;Mt++){let At=ut[Mt];ie(At,H,O),W.add(At)}else ie(ut,H,O),W.add(ut)}),f=E.pop(),W},this.compileAsync=function(y,F,H=null){let W=this.compile(y,F,H);return new Promise(O=>{function ut(){if(W.forEach(function(Mt){K.get(Mt).currentProgram.isReady()&&W.delete(Mt)}),W.size===0){O(y);return}setTimeout(ut,10)}Q.get("KHR_parallel_shader_compile")!==null?ut():setTimeout(ut,10)})};let Qt=null;function on(y){Qt&&Qt(y)}function Ke(){zn.stop()}function yc(){zn.start()}let zn=new Rh;zn.setAnimationLoop(on),typeof self<"u"&&zn.setContext(self),this.setAnimationLoop=function(y){Qt=y,dt.setAnimationLoop(y),y===null?zn.stop():zn.start()},dt.addEventListener("sessionstart",Ke),dt.addEventListener("sessionend",yc),this.render=function(y,F){if(F!==void 0&&F.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(I===!0)return;if(y.matrixWorldAutoUpdate===!0&&y.updateMatrixWorld(),F.parent===null&&F.matrixWorldAutoUpdate===!0&&F.updateMatrixWorld(),dt.enabled===!0&&dt.isPresenting===!0&&(dt.cameraAutoUpdate===!0&&dt.updateCamera(F),F=dt.getCamera()),y.isScene===!0&&y.onBeforeRender(M,y,F,U),f=wt.get(y,E.length),f.init(F),E.push(f),j.multiplyMatrices(F.projectionMatrix,F.matrixWorldInverse),Dt.setFromProjectionMatrix(j,Xe,F.reversedDepth),Z=this.localClippingEnabled,Ut=ft.init(this.clippingPlanes,Z),g=J.get(y,w.length),g.init(),w.push(g),dt.enabled===!0&&dt.isPresenting===!0){let ut=M.xr.getDepthSensingMesh();ut!==null&&Va(ut,F,-1/0,M.sortObjects)}Va(y,F,0,M.sortObjects),g.finish(),M.sortObjects===!0&&g.sort(ot,it),Lt=dt.enabled===!1||dt.isPresenting===!1||dt.hasDepthSensing()===!1,Lt&&Rt.addToRenderList(g,y),this.info.render.frame++,Ut===!0&&ft.beginShadows();let H=f.state.shadowsArray;Ct.render(H,y,F),Ut===!0&&ft.endShadows(),this.info.autoReset===!0&&this.info.reset();let W=g.opaque,O=g.transmissive;if(f.setupLights(),F.isArrayCamera){let ut=F.cameras;if(O.length>0)for(let Mt=0,At=ut.length;Mt<At;Mt++){let Et=ut[Mt];Sc(W,O,y,Et)}Lt&&Rt.render(y);for(let Mt=0,At=ut.length;Mt<At;Mt++){let Et=ut[Mt];Mc(g,y,Et,Et.viewport)}}else O.length>0&&Sc(W,O,y,F),Lt&&Rt.render(y),Mc(g,y,F);U!==null&&P===0&&(at.updateMultisampleRenderTarget(U),at.updateRenderTargetMipmap(U)),y.isScene===!0&&y.onAfterRender(M,y,F),yt.resetDefaultState(),S=-1,x=null,E.pop(),E.length>0?(f=E[E.length-1],Ut===!0&&ft.setGlobalState(M.clippingPlanes,f.state.camera)):f=null,w.pop(),w.length>0?g=w[w.length-1]:g=null};function Va(y,F,H,W){if(y.visible===!1)return;if(y.layers.test(F.layers)){if(y.isGroup)H=y.renderOrder;else if(y.isLOD)y.autoUpdate===!0&&y.update(F);else if(y.isLight)f.pushLight(y),y.castShadow&&f.pushShadow(y);else if(y.isSprite){if(!y.frustumCulled||Dt.intersectsSprite(y)){W&&vt.setFromMatrixPosition(y.matrixWorld).applyMatrix4(j);let Mt=B.update(y),At=y.material;At.visible&&g.push(y,Mt,At,H,vt.z,null)}}else if((y.isMesh||y.isLine||y.isPoints)&&(!y.frustumCulled||Dt.intersectsObject(y))){let Mt=B.update(y),At=y.material;if(W&&(y.boundingSphere!==void 0?(y.boundingSphere===null&&y.computeBoundingSphere(),vt.copy(y.boundingSphere.center)):(Mt.boundingSphere===null&&Mt.computeBoundingSphere(),vt.copy(Mt.boundingSphere.center)),vt.applyMatrix4(y.matrixWorld).applyMatrix4(j)),Array.isArray(At)){let Et=Mt.groups;for(let kt=0,Ht=Et.length;kt<Ht;kt++){let Ft=Et[kt],Zt=At[Ft.materialIndex];Zt&&Zt.visible&&g.push(y,Mt,Zt,H,vt.z,Ft)}}else At.visible&&g.push(y,Mt,At,H,vt.z,null)}}let ut=y.children;for(let Mt=0,At=ut.length;Mt<At;Mt++)Va(ut[Mt],F,H,W)}function Mc(y,F,H,W){let O=y.opaque,ut=y.transmissive,Mt=y.transparent;f.setupLightsView(H),Ut===!0&&ft.setGlobalState(M.clippingPlanes,H),W&&z.viewport(A.copy(W)),O.length>0&&ks(O,F,H),ut.length>0&&ks(ut,F,H),Mt.length>0&&ks(Mt,F,H),z.buffers.depth.setTest(!0),z.buffers.depth.setMask(!0),z.buffers.color.setMask(!0),z.setPolygonOffset(!1)}function Sc(y,F,H,W){if((H.isScene===!0?H.overrideMaterial:null)!==null)return;f.state.transmissionRenderTarget[W.id]===void 0&&(f.state.transmissionRenderTarget[W.id]=new je(1,1,{generateMipmaps:!0,type:Q.has("EXT_color_buffer_half_float")||Q.has("EXT_color_buffer_float")?zi:Ze,minFilter:sn,samples:4,stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:Jt.workingColorSpace}));let ut=f.state.transmissionRenderTarget[W.id],Mt=W.viewport||A;ut.setSize(Mt.z*M.transmissionResolutionScale,Mt.w*M.transmissionResolutionScale);let At=M.getRenderTarget(),Et=M.getActiveCubeFace(),kt=M.getActiveMipmapLevel();M.setRenderTarget(ut),M.getClearColor(G),V=M.getClearAlpha(),V<1&&M.setClearColor(16777215,.5),M.clear(),Lt&&Rt.render(H);let Ht=M.toneMapping;M.toneMapping=vn;let Ft=W.viewport;if(W.viewport!==void 0&&(W.viewport=void 0),f.setupLightsView(W),Ut===!0&&ft.setGlobalState(M.clippingPlanes,W),ks(y,H,W),at.updateMultisampleRenderTarget(ut),at.updateRenderTargetMipmap(ut),Q.has("WEBGL_multisampled_render_to_texture")===!1){let Zt=!1;for(let ee=0,he=F.length;ee<he;ee++){let se=F[ee],ne=se.object,Bt=se.geometry,oe=se.material,Kt=se.group;if(oe.side===nn&&ne.layers.test(W.layers)){let Re=oe.side;oe.side=Ae,oe.needsUpdate=!0,bc(ne,H,W,Bt,oe,Kt),oe.side=Re,oe.needsUpdate=!0,Zt=!0}}Zt===!0&&(at.updateMultisampleRenderTarget(ut),at.updateRenderTargetMipmap(ut))}M.setRenderTarget(At,Et,kt),M.setClearColor(G,V),Ft!==void 0&&(W.viewport=Ft),M.toneMapping=Ht}function ks(y,F,H){let W=F.isScene===!0?F.overrideMaterial:null;for(let O=0,ut=y.length;O<ut;O++){let Mt=y[O],At=Mt.object,Et=Mt.geometry,kt=Mt.group,Ht=Mt.material;Ht.allowOverride===!0&&W!==null&&(Ht=W),At.layers.test(H.layers)&&bc(At,F,H,Et,Ht,kt)}}function bc(y,F,H,W,O,ut){y.onBeforeRender(M,F,H,W,O,ut),y.modelViewMatrix.multiplyMatrices(H.matrixWorldInverse,y.matrixWorld),y.normalMatrix.getNormalMatrix(y.modelViewMatrix),O.onBeforeRender(M,F,H,W,y,ut),O.transparent===!0&&O.side===nn&&O.forceSinglePass===!1?(O.side=Ae,O.needsUpdate=!0,M.renderBufferDirect(H,F,W,O,y,ut),O.side=pn,O.needsUpdate=!0,M.renderBufferDirect(H,F,W,O,y,ut),O.side=nn):M.renderBufferDirect(H,F,W,O,y,ut),y.onAfterRender(M,F,H,W,O,ut)}function Vs(y,F,H){F.isScene!==!0&&(F=ht);let W=K.get(y),O=f.state.lights,ut=f.state.shadowsArray,Mt=O.state.version,At=Y.getParameters(y,O.state,ut,F,H),Et=Y.getProgramCacheKey(At),kt=W.programs;W.environment=y.isMeshStandardMaterial?F.environment:null,W.fog=F.fog,W.envMap=(y.isMeshStandardMaterial?zt:Nt).get(y.envMap||W.environment),W.envMapRotation=W.environment!==null&&y.envMap===null?F.environmentRotation:y.envMapRotation,kt===void 0&&(y.addEventListener("dispose",et),kt=new Map,W.programs=kt);let Ht=kt.get(Et);if(Ht!==void 0){if(W.currentProgram===Ht&&W.lightsStateVersion===Mt)return Tc(y,At),Ht}else At.uniforms=Y.getUniforms(y),y.onBeforeCompile(At,M),Ht=Y.acquireProgram(At,Et),kt.set(Et,Ht),W.uniforms=At.uniforms;let Ft=W.uniforms;return(!y.isShaderMaterial&&!y.isRawShaderMaterial||y.clipping===!0)&&(Ft.clippingPlanes=ft.uniform),Tc(y,At),W.needsLights=Qh(y),W.lightsStateVersion=Mt,W.needsLights&&(Ft.ambientLightColor.value=O.state.ambient,Ft.lightProbe.value=O.state.probe,Ft.directionalLights.value=O.state.directional,Ft.directionalLightShadows.value=O.state.directionalShadow,Ft.spotLights.value=O.state.spot,Ft.spotLightShadows.value=O.state.spotShadow,Ft.rectAreaLights.value=O.state.rectArea,Ft.ltc_1.value=O.state.rectAreaLTC1,Ft.ltc_2.value=O.state.rectAreaLTC2,Ft.pointLights.value=O.state.point,Ft.pointLightShadows.value=O.state.pointShadow,Ft.hemisphereLights.value=O.state.hemi,Ft.directionalShadowMap.value=O.state.directionalShadowMap,Ft.directionalShadowMatrix.value=O.state.directionalShadowMatrix,Ft.spotShadowMap.value=O.state.spotShadowMap,Ft.spotLightMatrix.value=O.state.spotLightMatrix,Ft.spotLightMap.value=O.state.spotLightMap,Ft.pointShadowMap.value=O.state.pointShadowMap,Ft.pointShadowMatrix.value=O.state.pointShadowMatrix),W.currentProgram=Ht,W.uniformsList=null,Ht}function Ec(y){if(y.uniformsList===null){let F=y.currentProgram.getUniforms();y.uniformsList=Wi.seqWithValue(F.seq,y.uniforms)}return y.uniformsList}function Tc(y,F){let H=K.get(y);H.outputColorSpace=F.outputColorSpace,H.batching=F.batching,H.batchingColor=F.batchingColor,H.instancing=F.instancing,H.instancingColor=F.instancingColor,H.instancingMorph=F.instancingMorph,H.skinning=F.skinning,H.morphTargets=F.morphTargets,H.morphNormals=F.morphNormals,H.morphColors=F.morphColors,H.morphTargetsCount=F.morphTargetsCount,H.numClippingPlanes=F.numClippingPlanes,H.numIntersection=F.numClipIntersection,H.vertexAlphas=F.vertexAlphas,H.vertexTangents=F.vertexTangents,H.toneMapping=F.toneMapping}function Jh(y,F,H,W,O){F.isScene!==!0&&(F=ht),at.resetTextureUnits();let ut=F.fog,Mt=W.isMeshStandardMaterial?F.environment:null,At=U===null?M.outputColorSpace:U.isXRRenderTarget===!0?U.texture.colorSpace:Kn,Et=(W.isMeshStandardMaterial?zt:Nt).get(W.envMap||Mt),kt=W.vertexColors===!0&&!!H.attributes.color&&H.attributes.color.itemSize===4,Ht=!!H.attributes.tangent&&(!!W.normalMap||W.anisotropy>0),Ft=!!H.morphAttributes.position,Zt=!!H.morphAttributes.normal,ee=!!H.morphAttributes.color,he=vn;W.toneMapped&&(U===null||U.isXRRenderTarget===!0)&&(he=M.toneMapping);let se=H.morphAttributes.position||H.morphAttributes.normal||H.morphAttributes.color,ne=se!==void 0?se.length:0,Bt=K.get(W),oe=f.state.lights;if(Ut===!0&&(Z===!0||y!==x)){let Ee=y===x&&W.id===S;ft.setState(W,y,Ee)}let Kt=!1;W.version===Bt.__version?(Bt.needsLights&&Bt.lightsStateVersion!==oe.state.version||Bt.outputColorSpace!==At||O.isBatchedMesh&&Bt.batching===!1||!O.isBatchedMesh&&Bt.batching===!0||O.isBatchedMesh&&Bt.batchingColor===!0&&O.colorTexture===null||O.isBatchedMesh&&Bt.batchingColor===!1&&O.colorTexture!==null||O.isInstancedMesh&&Bt.instancing===!1||!O.isInstancedMesh&&Bt.instancing===!0||O.isSkinnedMesh&&Bt.skinning===!1||!O.isSkinnedMesh&&Bt.skinning===!0||O.isInstancedMesh&&Bt.instancingColor===!0&&O.instanceColor===null||O.isInstancedMesh&&Bt.instancingColor===!1&&O.instanceColor!==null||O.isInstancedMesh&&Bt.instancingMorph===!0&&O.morphTexture===null||O.isInstancedMesh&&Bt.instancingMorph===!1&&O.morphTexture!==null||Bt.envMap!==Et||W.fog===!0&&Bt.fog!==ut||Bt.numClippingPlanes!==void 0&&(Bt.numClippingPlanes!==ft.numPlanes||Bt.numIntersection!==ft.numIntersection)||Bt.vertexAlphas!==kt||Bt.vertexTangents!==Ht||Bt.morphTargets!==Ft||Bt.morphNormals!==Zt||Bt.morphColors!==ee||Bt.toneMapping!==he||Bt.morphTargetsCount!==ne)&&(Kt=!0):(Kt=!0,Bt.__version=W.version);let Re=Bt.currentProgram;Kt===!0&&(Re=Vs(W,F,O));let hi=!1,Ie=!1,qi=!1,ce=Re.getUniforms(),Fe=Bt.uniforms;if(z.useProgram(Re.program)&&(hi=!0,Ie=!0,qi=!0),W.id!==S&&(S=W.id,Ie=!0),hi||x!==y){z.buffers.depth.getReversed()&&y.reversedDepth!==!0&&(y._reversedDepth=!0,y.updateProjectionMatrix()),ce.setValue(T,"projectionMatrix",y.projectionMatrix),ce.setValue(T,"viewMatrix",y.matrixWorldInverse);let Ce=ce.map.cameraPosition;Ce!==void 0&&Ce.setValue(T,pt.setFromMatrixPosition(y.matrixWorld)),R.logarithmicDepthBuffer&&ce.setValue(T,"logDepthBufFC",2/(Math.log(y.far+1)/Math.LN2)),(W.isMeshPhongMaterial||W.isMeshToonMaterial||W.isMeshLambertMaterial||W.isMeshBasicMaterial||W.isMeshStandardMaterial||W.isShaderMaterial)&&ce.setValue(T,"isOrthographic",y.isOrthographicCamera===!0),x!==y&&(x=y,Ie=!0,qi=!0)}if(O.isSkinnedMesh){ce.setOptional(T,O,"bindMatrix"),ce.setOptional(T,O,"bindMatrixInverse");let Ee=O.skeleton;Ee&&(Ee.boneTexture===null&&Ee.computeBoneTexture(),ce.setValue(T,"boneTexture",Ee.boneTexture,at))}O.isBatchedMesh&&(ce.setOptional(T,O,"batchingTexture"),ce.setValue(T,"batchingTexture",O._matricesTexture,at),ce.setOptional(T,O,"batchingIdTexture"),ce.setValue(T,"batchingIdTexture",O._indirectTexture,at),ce.setOptional(T,O,"batchingColorTexture"),O._colorsTexture!==null&&ce.setValue(T,"batchingColorTexture",O._colorsTexture,at));let Oe=H.morphAttributes;if((Oe.position!==void 0||Oe.normal!==void 0||Oe.color!==void 0)&&ct.update(O,H,Re),(Ie||Bt.receiveShadow!==O.receiveShadow)&&(Bt.receiveShadow=O.receiveShadow,ce.setValue(T,"receiveShadow",O.receiveShadow)),W.isMeshGouraudMaterial&&W.envMap!==null&&(Fe.envMap.value=Et,Fe.flipEnvMap.value=Et.isCubeTexture&&Et.isRenderTargetTexture===!1?-1:1),W.isMeshStandardMaterial&&W.envMap===null&&F.environment!==null&&(Fe.envMapIntensity.value=F.environmentIntensity),Ie&&(ce.setValue(T,"toneMappingExposure",M.toneMappingExposure),Bt.needsLights&&Kh(Fe,qi),ut&&W.fog===!0&&st.refreshFogUniforms(Fe,ut),st.refreshMaterialUniforms(Fe,W,X,nt,f.state.transmissionRenderTarget[y.id]),Wi.upload(T,Ec(Bt),Fe,at)),W.isShaderMaterial&&W.uniformsNeedUpdate===!0&&(Wi.upload(T,Ec(Bt),Fe,at),W.uniformsNeedUpdate=!1),W.isSpriteMaterial&&ce.setValue(T,"center",O.center),ce.setValue(T,"modelViewMatrix",O.modelViewMatrix),ce.setValue(T,"normalMatrix",O.normalMatrix),ce.setValue(T,"modelMatrix",O.matrixWorld),W.isShaderMaterial||W.isRawShaderMaterial){let Ee=W.uniformsGroups;for(let Ce=0,Ha=Ee.length;Ce<Ha;Ce++){let kn=Ee[Ce];Xt.update(kn,Re),Xt.bind(kn,Re)}}return Re}function Kh(y,F){y.ambientLightColor.needsUpdate=F,y.lightProbe.needsUpdate=F,y.directionalLights.needsUpdate=F,y.directionalLightShadows.needsUpdate=F,y.pointLights.needsUpdate=F,y.pointLightShadows.needsUpdate=F,y.spotLights.needsUpdate=F,y.spotLightShadows.needsUpdate=F,y.rectAreaLights.needsUpdate=F,y.hemisphereLights.needsUpdate=F}function Qh(y){return y.isMeshLambertMaterial||y.isMeshToonMaterial||y.isMeshPhongMaterial||y.isMeshStandardMaterial||y.isShadowMaterial||y.isShaderMaterial&&y.lights===!0}this.getActiveCubeFace=function(){return C},this.getActiveMipmapLevel=function(){return P},this.getRenderTarget=function(){return U},this.setRenderTargetTextures=function(y,F,H){let W=K.get(y);W.__autoAllocateDepthBuffer=y.resolveDepthBuffer===!1,W.__autoAllocateDepthBuffer===!1&&(W.__useRenderToTexture=!1),K.get(y.texture).__webglTexture=F,K.get(y.depthTexture).__webglTexture=W.__autoAllocateDepthBuffer?void 0:H,W.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(y,F){let H=K.get(y);H.__webglFramebuffer=F,H.__useDefaultFramebuffer=F===void 0};let jh=T.createFramebuffer();this.setRenderTarget=function(y,F=0,H=0){U=y,C=F,P=H;let W=!0,O=null,ut=!1,Mt=!1;if(y){let Et=K.get(y);if(Et.__useDefaultFramebuffer!==void 0)z.bindFramebuffer(T.FRAMEBUFFER,null),W=!1;else if(Et.__webglFramebuffer===void 0)at.setupRenderTarget(y);else if(Et.__hasExternalTextures)at.rebindTextures(y,K.get(y.texture).__webglTexture,K.get(y.depthTexture).__webglTexture);else if(y.depthBuffer){let Ft=y.depthTexture;if(Et.__boundDepthTexture!==Ft){if(Ft!==null&&K.has(Ft)&&(y.width!==Ft.image.width||y.height!==Ft.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");at.setupDepthRenderbuffer(y)}}let kt=y.texture;(kt.isData3DTexture||kt.isDataArrayTexture||kt.isCompressedArrayTexture)&&(Mt=!0);let Ht=K.get(y).__webglFramebuffer;y.isWebGLCubeRenderTarget?(Array.isArray(Ht[F])?O=Ht[F][H]:O=Ht[F],ut=!0):y.samples>0&&at.useMultisampledRTT(y)===!1?O=K.get(y).__webglMultisampledFramebuffer:Array.isArray(Ht)?O=Ht[H]:O=Ht,A.copy(y.viewport),N.copy(y.scissor),k=y.scissorTest}else A.copy(rt).multiplyScalar(X).floor(),N.copy(_t).multiplyScalar(X).floor(),k=bt;if(H!==0&&(O=jh),z.bindFramebuffer(T.FRAMEBUFFER,O)&&W&&z.drawBuffers(y,O),z.viewport(A),z.scissor(N),z.setScissorTest(k),ut){let Et=K.get(y.texture);T.framebufferTexture2D(T.FRAMEBUFFER,T.COLOR_ATTACHMENT0,T.TEXTURE_CUBE_MAP_POSITIVE_X+F,Et.__webglTexture,H)}else if(Mt){let Et=F;for(let kt=0;kt<y.textures.length;kt++){let Ht=K.get(y.textures[kt]);T.framebufferTextureLayer(T.FRAMEBUFFER,T.COLOR_ATTACHMENT0+kt,Ht.__webglTexture,H,Et)}}else if(y!==null&&H!==0){let Et=K.get(y.texture);T.framebufferTexture2D(T.FRAMEBUFFER,T.COLOR_ATTACHMENT0,T.TEXTURE_2D,Et.__webglTexture,H)}S=-1},this.readRenderTargetPixels=function(y,F,H,W,O,ut,Mt,At=0){if(!(y&&y.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Et=K.get(y).__webglFramebuffer;if(y.isWebGLCubeRenderTarget&&Mt!==void 0&&(Et=Et[Mt]),Et){z.bindFramebuffer(T.FRAMEBUFFER,Et);try{let kt=y.textures[At],Ht=kt.format,Ft=kt.type;if(!R.textureFormatReadable(Ht)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!R.textureTypeReadable(Ft)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}F>=0&&F<=y.width-W&&H>=0&&H<=y.height-O&&(y.textures.length>1&&T.readBuffer(T.COLOR_ATTACHMENT0+At),T.readPixels(F,H,W,O,Pt.convert(Ht),Pt.convert(Ft),ut))}finally{let kt=U!==null?K.get(U).__webglFramebuffer:null;z.bindFramebuffer(T.FRAMEBUFFER,kt)}}},this.readRenderTargetPixelsAsync=async function(y,F,H,W,O,ut,Mt,At=0){if(!(y&&y.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Et=K.get(y).__webglFramebuffer;if(y.isWebGLCubeRenderTarget&&Mt!==void 0&&(Et=Et[Mt]),Et)if(F>=0&&F<=y.width-W&&H>=0&&H<=y.height-O){z.bindFramebuffer(T.FRAMEBUFFER,Et);let kt=y.textures[At],Ht=kt.format,Ft=kt.type;if(!R.textureFormatReadable(Ht))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!R.textureTypeReadable(Ft))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");let Zt=T.createBuffer();T.bindBuffer(T.PIXEL_PACK_BUFFER,Zt),T.bufferData(T.PIXEL_PACK_BUFFER,ut.byteLength,T.STREAM_READ),y.textures.length>1&&T.readBuffer(T.COLOR_ATTACHMENT0+At),T.readPixels(F,H,W,O,Pt.convert(Ht),Pt.convert(Ft),0);let ee=U!==null?K.get(U).__webglFramebuffer:null;z.bindFramebuffer(T.FRAMEBUFFER,ee);let he=T.fenceSync(T.SYNC_GPU_COMMANDS_COMPLETE,0);return T.flush(),await Ql(T,he,4),T.bindBuffer(T.PIXEL_PACK_BUFFER,Zt),T.getBufferSubData(T.PIXEL_PACK_BUFFER,0,ut),T.deleteBuffer(Zt),T.deleteSync(he),ut}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(y,F=null,H=0){let W=Math.pow(2,-H),O=Math.floor(y.image.width*W),ut=Math.floor(y.image.height*W),Mt=F!==null?F.x:0,At=F!==null?F.y:0;at.setTexture2D(y,0),T.copyTexSubImage2D(T.TEXTURE_2D,H,0,0,Mt,At,O,ut),z.unbindTexture()};let tu=T.createFramebuffer(),eu=T.createFramebuffer();this.copyTextureToTexture=function(y,F,H=null,W=null,O=0,ut=null){ut===null&&(O!==0?(Ci("WebGLRenderer: copyTextureToTexture function signature has changed to support src and dst mipmap levels."),ut=O,O=0):ut=0);let Mt,At,Et,kt,Ht,Ft,Zt,ee,he,se=y.isCompressedTexture?y.mipmaps[ut]:y.image;if(H!==null)Mt=H.max.x-H.min.x,At=H.max.y-H.min.y,Et=H.isBox3?H.max.z-H.min.z:1,kt=H.min.x,Ht=H.min.y,Ft=H.isBox3?H.min.z:0;else{let Oe=Math.pow(2,-O);Mt=Math.floor(se.width*Oe),At=Math.floor(se.height*Oe),y.isDataArrayTexture?Et=se.depth:y.isData3DTexture?Et=Math.floor(se.depth*Oe):Et=1,kt=0,Ht=0,Ft=0}W!==null?(Zt=W.x,ee=W.y,he=W.z):(Zt=0,ee=0,he=0);let ne=Pt.convert(F.format),Bt=Pt.convert(F.type),oe;F.isData3DTexture?(at.setTexture3D(F,0),oe=T.TEXTURE_3D):F.isDataArrayTexture||F.isCompressedArrayTexture?(at.setTexture2DArray(F,0),oe=T.TEXTURE_2D_ARRAY):(at.setTexture2D(F,0),oe=T.TEXTURE_2D),T.pixelStorei(T.UNPACK_FLIP_Y_WEBGL,F.flipY),T.pixelStorei(T.UNPACK_PREMULTIPLY_ALPHA_WEBGL,F.premultiplyAlpha),T.pixelStorei(T.UNPACK_ALIGNMENT,F.unpackAlignment);let Kt=T.getParameter(T.UNPACK_ROW_LENGTH),Re=T.getParameter(T.UNPACK_IMAGE_HEIGHT),hi=T.getParameter(T.UNPACK_SKIP_PIXELS),Ie=T.getParameter(T.UNPACK_SKIP_ROWS),qi=T.getParameter(T.UNPACK_SKIP_IMAGES);T.pixelStorei(T.UNPACK_ROW_LENGTH,se.width),T.pixelStorei(T.UNPACK_IMAGE_HEIGHT,se.height),T.pixelStorei(T.UNPACK_SKIP_PIXELS,kt),T.pixelStorei(T.UNPACK_SKIP_ROWS,Ht),T.pixelStorei(T.UNPACK_SKIP_IMAGES,Ft);let ce=y.isDataArrayTexture||y.isData3DTexture,Fe=F.isDataArrayTexture||F.isData3DTexture;if(y.isDepthTexture){let Oe=K.get(y),Ee=K.get(F),Ce=K.get(Oe.__renderTarget),Ha=K.get(Ee.__renderTarget);z.bindFramebuffer(T.READ_FRAMEBUFFER,Ce.__webglFramebuffer),z.bindFramebuffer(T.DRAW_FRAMEBUFFER,Ha.__webglFramebuffer);for(let kn=0;kn<Et;kn++)ce&&(T.framebufferTextureLayer(T.READ_FRAMEBUFFER,T.COLOR_ATTACHMENT0,K.get(y).__webglTexture,O,Ft+kn),T.framebufferTextureLayer(T.DRAW_FRAMEBUFFER,T.COLOR_ATTACHMENT0,K.get(F).__webglTexture,ut,he+kn)),T.blitFramebuffer(kt,Ht,Mt,At,Zt,ee,Mt,At,T.DEPTH_BUFFER_BIT,T.NEAREST);z.bindFramebuffer(T.READ_FRAMEBUFFER,null),z.bindFramebuffer(T.DRAW_FRAMEBUFFER,null)}else if(O!==0||y.isRenderTargetTexture||K.has(y)){let Oe=K.get(y),Ee=K.get(F);z.bindFramebuffer(T.READ_FRAMEBUFFER,tu),z.bindFramebuffer(T.DRAW_FRAMEBUFFER,eu);for(let Ce=0;Ce<Et;Ce++)ce?T.framebufferTextureLayer(T.READ_FRAMEBUFFER,T.COLOR_ATTACHMENT0,Oe.__webglTexture,O,Ft+Ce):T.framebufferTexture2D(T.READ_FRAMEBUFFER,T.COLOR_ATTACHMENT0,T.TEXTURE_2D,Oe.__webglTexture,O),Fe?T.framebufferTextureLayer(T.DRAW_FRAMEBUFFER,T.COLOR_ATTACHMENT0,Ee.__webglTexture,ut,he+Ce):T.framebufferTexture2D(T.DRAW_FRAMEBUFFER,T.COLOR_ATTACHMENT0,T.TEXTURE_2D,Ee.__webglTexture,ut),O!==0?T.blitFramebuffer(kt,Ht,Mt,At,Zt,ee,Mt,At,T.COLOR_BUFFER_BIT,T.NEAREST):Fe?T.copyTexSubImage3D(oe,ut,Zt,ee,he+Ce,kt,Ht,Mt,At):T.copyTexSubImage2D(oe,ut,Zt,ee,kt,Ht,Mt,At);z.bindFramebuffer(T.READ_FRAMEBUFFER,null),z.bindFramebuffer(T.DRAW_FRAMEBUFFER,null)}else Fe?y.isDataTexture||y.isData3DTexture?T.texSubImage3D(oe,ut,Zt,ee,he,Mt,At,Et,ne,Bt,se.data):F.isCompressedArrayTexture?T.compressedTexSubImage3D(oe,ut,Zt,ee,he,Mt,At,Et,ne,se.data):T.texSubImage3D(oe,ut,Zt,ee,he,Mt,At,Et,ne,Bt,se):y.isDataTexture?T.texSubImage2D(T.TEXTURE_2D,ut,Zt,ee,Mt,At,ne,Bt,se.data):y.isCompressedTexture?T.compressedTexSubImage2D(T.TEXTURE_2D,ut,Zt,ee,se.width,se.height,ne,se.data):T.texSubImage2D(T.TEXTURE_2D,ut,Zt,ee,Mt,At,ne,Bt,se);T.pixelStorei(T.UNPACK_ROW_LENGTH,Kt),T.pixelStorei(T.UNPACK_IMAGE_HEIGHT,Re),T.pixelStorei(T.UNPACK_SKIP_PIXELS,hi),T.pixelStorei(T.UNPACK_SKIP_ROWS,Ie),T.pixelStorei(T.UNPACK_SKIP_IMAGES,qi),ut===0&&F.generateMipmaps&&T.generateMipmap(oe),z.unbindTexture()},this.initRenderTarget=function(y){K.get(y).__webglFramebuffer===void 0&&at.setupRenderTarget(y)},this.initTexture=function(y){y.isCubeTexture?at.setTextureCube(y,0):y.isData3DTexture?at.setTexture3D(y,0):y.isDataArrayTexture||y.isCompressedArrayTexture?at.setTexture2DArray(y,0):at.setTexture2D(y,0),z.unbindTexture()},this.resetState=function(){C=0,P=0,U=null,z.reset(),yt.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return Xe}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(t){this._outputColorSpace=t;let e=this.getContext();e.drawingBufferColorSpace=Jt._getDrawingBufferColorSpace(t),e.unpackColorSpace=Jt._getUnpackColorSpace()}};var Uh="12, 14, 20",Bs="'EB Garamond', Georgia, 'Times New Roman', serif",Fa="'JetBrains Mono', ui-monospace, 'SFMono-Regular', monospace",t0="'EB Garamond', 'Apple Symbols', 'Segoe UI Symbol', 'Noto Sans Symbols 2', serif";function Nh(i){let t=2166136261;for(let e=0;e<i.length;e+=1)t^=i.charCodeAt(e),t=Math.imul(t,16777619);return()=>{t+=1831565813;let e=t;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}}function Fh(i,t){let e=document.createElement("canvas");return e.width=i,e.height=t,e}function _c(i,t){let e=parseInt(i.slice(1),16),n=s=>Math.round(Math.max(0,Math.min(255,s*t)));return`rgb(${n(e>>16&255)}, ${n(e>>8&255)}, ${n(e&255)})`}async function Oh(){if(!document.fonts?.load)return;let i=[`500 46px ${Bs}`,`400 30px ${Bs}`,`italic 400 30px ${Bs}`,`400 20px ${Fa}`];try{await Promise.all(i.map(t=>document.fonts.load(t,"Sagittarius"))),await document.fonts.ready}catch{}}function zs(i,t,e,n,s){let r=i.textAlign;if(!("letterSpacing"in i))return i.fillText(t,e,n),i.measureText(t).width;let a=i.letterSpacing;i.letterSpacing=`${s}px`;let o=i.measureText(t).width;return i.textAlign="left",i.fillText(t,r==="center"?e-o/2+s/2:e,n),i.letterSpacing=a,i.textAlign=r,o}function Bh(i){let n=Fh(1024,128),s=n.getContext("2d"),r=Nh(`${i.slug}-plinth`),a=s.createLinearGradient(0,0,0,128);a.addColorStop(0,"#171B25"),a.addColorStop(.42,"#0F121A"),a.addColorStop(1,"#080A0F"),s.fillStyle=a,s.fillRect(0,0,1024,128),s.globalAlpha=.05,s.fillStyle="#EEF1F7";for(let o=0;o<900;o+=1)s.fillRect(r()*1024,r()*128,1,1);s.globalAlpha=1,s.fillStyle=`${i.hue}55`,s.fillRect(0,5,1024,1.5),s.fillStyle="rgba(198,204,218,0.10)",s.fillRect(0,125,1024,1.5),s.textAlign="center",s.textBaseline="middle";for(let o=0;o<4;o+=1){let c=128+o*256;s.fillStyle=i.hue,s.font=`400 21px ${Fa}`,zs(s,`LOT ${i.lot}`,c,52,5),s.fillStyle="rgba(198,204,218,0.62)",s.font=`400 25px ${Bs}`,zs(s,i.name.toUpperCase(),c,84,4)}return n}function zh(i,t){let s=Fh(768,768),r=s.getContext("2d"),a=Nh(`${i.slug}-reverse`),o=r.createLinearGradient(0,0,768*.7,768);o.addColorStop(0,_c(t,1.18)),o.addColorStop(.45,_c(t,.92)),o.addColorStop(1,_c(t,.58)),r.fillStyle=o,r.fillRect(0,0,768,768),r.globalAlpha=.06;for(let h=0;h<2600;h+=1){r.fillStyle=a()>.5?"#FFFFFF":"#000000";let u=a()*768,d=a()*768;r.fillRect(u,d,1+a()*3,1)}r.globalAlpha=1,r.save(),r.translate(768,0),r.scale(-1,1),r.textAlign="center",r.textBaseline="middle";let c=h=>{r.save(),r.translate(0,2.5),r.fillStyle="rgba(255,246,214,0.30)",h(),r.restore(),r.fillStyle=`rgba(${Uh}, 0.55)`,h()},l=768/2;return c(()=>{r.font=`400 232px ${t0}`,r.fillText(i.glyph,l,768*.4)}),c(()=>{r.font=`400 30px ${Fa}`,zs(r,`LOT ${i.lot} OF XII`,l,768*.6,7)}),c(()=>{r.font=`500 58px ${Bs}`,zs(r,i.name.toUpperCase(),l,768*.685,5)}),r.strokeStyle=`rgba(${Uh}, 0.34)`,r.lineWidth=1.5,r.beginPath(),r.moveTo(l-118,768*.745),r.lineTo(l+118,768*.745),r.stroke(),c(()=>{r.font=`400 22px ${Fa}`,zs(r,"ZODIACS \xB7 THE REGISTRY",l,768*.8,5)}),r.restore(),s}function kh(i,t){return new Promise(e=>{let n=new Image;n.decoding="async",n.onload=()=>e(n),n.onerror=()=>e(null),n.src=`/assets/sculptures/${t}/${i}.webp`})}var xc={version:1,generator:"scripts/build-figure-assets.mjs",quant:4096,heroSize:1024,rowSize:512,figures:{aries:{sign:"aries",aspect:.841607,edgeColor:"#88612c",textureBox:{u0:.128479,u1:.870659,v0:.059856,v1:.941836},shapes:[{outer:[811,4094,873,4096,937,4079,973,4078,987,4070,993,4057,1033,4036,1087,3978,1128,3898,1132,3858,1146,3838,1157,3786,1154,3698,1132,3630,1133,3594,1154,3566,1176,3501,1237,3451,1315,3365,1446,3189,1447,3085,1435,3021,1345,2931,1293,2911,1229,2914,1125,2970,1073,2980,1064,2977,1063,2969,1178,2833,1207,2753,1208,2709,1245,2645,1252,2565,1239,2529,1239,2501,1252,2452,1249,2407,1345,2423,1473,2462,1529,2466,1581,2447,1658,2364,1675,2332,1682,2296,1685,2060,1703,1932,1723,1852,1724,1800,1716,1772,1675,1700,1654,1616,1634,1576,1574,1520,1493,1426,1477,1423,1457,1430,1421,1480,1393,1584,1392,1676,1408,1728,1425,1746,1467,1764,1449,1796,1446,1828,1452,1860,1474,1900,1484,1936,1488,1980,1474,2156,1449,2189,1429,2185,1345,2135,1323,2108,1379,2016,1393,1984,1400,1936,1392,1892,1356,1808,1319,1684,1288,1532,1273,1415,1253,1372,1185,1303,1139,1219,1105,1183,1017,1131,957,1086,929,1078,903,1091,886,1127,875,1163,871,1255,900,1367,933,1398,973,1411,971,1468,987,1512,1055,1580,1083,1640,1122,1788,1122,1820,1109,1828,1017,1796,901,1737,877,1712,813,1615,759,1568,706,1508,641,1463,593,1438,480,1408,464,1387,396,1340,332,1319,212,1297,112,1234,-20,1205,-48,1192,-77,1159,-151,1027,-189,975,-252,909,-308,866,-500,772,-753,708,-856,655,-906,603,-956,535,-1006,439,-1062,290,-1093,236,-1145,190,-1217,87,-1374,6,-1425,0,-1444,14,-1456,46,-1457,173,-1501,136,-1533,125,-1654,45,-1674,40,-1694,48,-1712,74,-1724,122,-1724,218,-1710,286,-1678,354,-1658,371,-1614,387,-1619,431,-1615,467,-1581,510,-1537,537,-1511,567,-1457,663,-1393,815,-1330,1031,-1305,1062,-1269,1077,-1221,1078,-1219,1091,-1197,1109,-1149,1129,-1090,1167,-1092,1199,-1109,1237,-1161,1210,-1257,1179,-1337,1175,-1401,1186,-1461,1215,-1505,1251,-1530,1279,-1562,1335,-1587,1415,-1583,1508,-1559,1572,-1506,1640,-1461,1673,-1373,1705,-1293,1707,-1221,1686,-1207,1668,-1203,1648,-1225,1611,-1261,1588,-1309,1532,-1312,1524,-1297,1498,-1241,1482,-1173,1504,-1113,1539,-1051,1604,-1002,1700,-930,1800,-821,1909,-689,2009,-500,2120,-418,2188,-403,2212,-392,2252,-361,2292,-351,2356,-333,2396,-260,2472,-236,2529,-204,2567,-140,2603,-104,2637,-86,2685,-52,2726,-24,2743,44,2754,68,2769,98,2845,126,2893,120,2903,-32,2932,-112,2967,-184,3025,-224,3067,-293,3173,-336,3305,-340,3433,-329,3513,-305,3594,-251,3698,-218,3730,-192,3781,-40,3915,24,3948,52,3952,84,3972,116,3976,152,3991,284,4e3,292,4008,296,4e3,392,4001,420,3987,444,3991,476,3969,508,3969,541,3959,569,3982,601,4022,641,4050,705,4079,765,4092],holes:[]}]},taurus:{sign:"taurus",aspect:1.366765,edgeColor:"#865f29",textureBox:{u0:.058181,u1:.940135,v0:.178319,v1:.822266},shapes:[{outer:[928,4096,1141,4075,1350,4011,1431,3976,1565,3880,1652,3837,1884,3639,1988,3518,2078,3434,2141,3341,2159,3277,2273,3235,2366,3228,2441,3241,2523,3275,2590,3329,2641,3428,2662,3650,2679,3649,2711,3614,2762,3509,2792,3411,2799,3300,2792,3219,2764,3138,2705,3045,2645,2985,2587,2944,2468,2888,2621,2857,2668,2857,2682,2842,2669,2807,2624,2760,2591,2691,2531,2644,2506,2604,2476,2584,2401,2584,2377,2556,2343,2548,2279,2582,2227,2586,2205,2517,2149,2464,2153,2418,2136,2325,2055,2186,1998,2052,1986,1982,2007,1918,2007,1884,1949,1750,1907,1707,1878,1695,1820,1699,1779,1655,1704,1634,1675,1619,1665,1599,1673,1558,1735,1436,1800,1222,1898,1129,1938,1071,1956,1013,1958,908,1998,803,2091,670,2250,505,2281,403,2384,327,2399,292,2531,118,2548,78,2542,49,2517,35,2424,38,2395,7,2366,0,2256,7,2029,52,1919,117,1876,165,1866,236,1797,237,1749,275,1736,310,1748,426,1735,513,1705,594,1624,722,1556,780,1515,862,1489,886,1425,928,1222,1024,1187,1005,1141,917,1019,837,920,824,827,846,756,763,667,600,635,564,577,528,351,442,299,441,264,452,142,448,26,470,-90,461,-115,484,-111,554,-52,705,20,818,84,870,159,905,246,928,328,911,362,951,444,980,446,989,397,1011,310,1079,258,1102,206,1102,107,1063,61,1063,-21,1086,-131,1165,-288,1237,-572,1392,-706,1451,-747,1423,-761,1378,-749,1338,-703,1297,-703,1274,-741,1248,-770,1243,-840,1254,-880,1283,-932,1342,-972,1216,-1051,1094,-1056,1024,-1028,937,-958,832,-840,714,-706,603,-676,565,-654,504,-577,438,-563,397,-454,252,-442,211,-456,188,-503,179,-538,189,-578,157,-625,156,-851,191,-950,221,-991,243,-1026,287,-1041,345,-1072,375,-1124,360,-1176,383,-1195,420,-1208,507,-1284,618,-1356,689,-1513,807,-1609,902,-1620,989,-1552,1111,-1540,1152,-1541,1204,-1575,1274,-1690,1373,-1757,1480,-1815,1443,-1925,1318,-2094,1189,-2177,1105,-2265,972,-2311,862,-2323,711,-2275,501,-2245,461,-2178,409,-2164,362,-2085,234,-2065,153,-2100,134,-2193,146,-2204,122,-2239,105,-2332,110,-2529,150,-2649,229,-2694,292,-2679,397,-2683,432,-2715,463,-2721,484,-2738,486,-2773,464,-2791,471,-2799,490,-2793,531,-2708,716,-2666,873,-2661,989,-2689,1274,-2677,1314,-2638,1367,-2483,1462,-2428,1524,-2388,1622,-2375,1715,-2394,1913,-2443,2139,-2450,2238,-2428,2412,-2370,2598,-2524,2636,-2637,2714,-2722,2830,-2764,2981,-2764,3062,-2735,3184,-2694,3277,-2629,3370,-2518,3482,-2378,3575,-2169,3680,-1937,3750,-1804,3758,-1716,3749,-1624,3721,-1374,3606,-1322,3596,-1240,3606,-1182,3640,-1146,3690,-1145,3753,-1173,3800,-1165,3817,-1147,3819,-1083,3795,-1001,3719,-971,3649,-971,3562,-993,3504,-1006,3417,-1041,3353,-1112,3288,-1240,3213,-1194,3211,-1078,3228,-892,3287,-665,3385,-497,3479,-85,3738,357,3965,455,4005,560,4034,676,4048,775,4081],holes:[[-2158,3437,-2268,3401,-2344,3360,-2432,3277,-2491,3190,-2514,3103,-2509,3045,-2472,2969,-2419,2926,-2338,2908,-2222,2926,-1879,3112,-1661,3190,-1740,3235,-1804,3296,-1850,3235,-1902,3234,-1922,3248,-1911,3335,-1960,3396,-2013,3424,-2065,3437]]}]},gemini:{sign:"gemini",aspect:.669847,edgeColor:"#936123",textureBox:{u0:.204654,u1:.79449,v0:.059795,v1:.941406},shapes:[{outer:[-450,4096,-344,4092,-188,4044,-162,4020,-154,4004,-136,3998,-115,3976,-109,3940,-97,3920,-94,3888,-103,3864,-124,3839,-149,3836,-153,3808,-147,3768,-166,3740,-134,3627,-148,3610,-177,3599,-175,3571,-186,3559,-188,3535,-203,3519,-198,3491,-202,3463,-248,3436,-204,3417,-184,3423,-144,3420,-104,3391,-24,3405,0,3388,52,3385,104,3369,176,3325,224,3325,292,3309,340,3309,431,3343,433,3390,348,3405,331,3419,323,3435,330,3483,318,3503,320,3519,305,3535,311,3563,280,3574,267,3595,314,3703,302,3748,314,3804,276,3832,260,3880,273,3920,302,3952,328,3998,377,4019,393,4016,433,4038,481,4042,505,4054,621,4063,669,4047,713,4045,765,4014,801,4003,829,3982,852,3956,901,3868,916,3780,929,3756,930,3707,915,3671,879,3631,888,3607,888,3575,860,3535,866,3515,862,3487,841,3459,825,3451,801,3451,785,3425,763,3419,765,3375,773,3360,909,3369,961,3353,997,3331,1038,3291,1087,3227,1115,3175,1122,3119,1168,3035,1188,2906,1239,2802,1273,2674,1327,2518,1333,2478,1361,2410,1372,2350,1372,2229,1348,2033,1345,1929,1330,1877,1333,1761,1317,1617,1262,1546,1238,1542,1206,1518,1162,1505,1134,1482,1110,1492,1103,1508,1106,1537,1130,1565,1139,1593,1130,1590,1077,1544,1049,1504,1031,1460,1027,1412,1007,1392,937,1366,901,1362,853,1369,847,1360,851,1272,867,1228,983,1108,1027,1020,1059,844,1080,635,1097,543,1128,483,1128,443,1155,407,1176,351,1267,199,1267,167,1252,139,1246,103,1227,91,1218,69,1190,62,1166,44,1126,50,1093,37,1065,37,1037,48,1019,67,996,131,995,239,967,327,958,387,926,443,926,507,909,567,882,631,818,743,727,860,670,1040,611,1100,541,1220,512,1300,487,1420,473,1447,466,1440,459,1384,453,1224,440,1132,482,1e3,506,880,506,800,487,715,487,559,513,303,550,175,544,143,533,125,513,113,413,104,377,91,344,73,308,37,200,1,156,0,132,12,96,12,58,42,58,79,71,91,90,131,108,148,176,169,211,195,259,259,302,295,311,315,298,435,203,743,162,924,159,1052,166,1148,143,1320,99,1448,67,1649,39,1677,24,1711,8,1665,-22,1633,-65,1460,-118,1328,-150,1156,-150,1024,-172,880,-203,771,-302,491,-323,407,-326,319,-277,271,-248,223,-216,191,-122,147,-86,79,-96,39,-128,15,-164,16,-196,3,-236,5,-276,28,-340,48,-375,87,-417,116,-505,129,-541,141,-559,159,-566,179,-567,211,-528,323,-497,563,-487,739,-506,828,-506,888,-484,984,-411,1172,-422,1276,-412,1388,-417,1473,-453,1320,-484,1232,-538,1124,-595,1052,-616,912,-636,840,-667,783,-715,723,-778,579,-807,467,-810,403,-827,371,-828,303,-842,275,-879,243,-895,215,-916,155,-933,71,-985,21,-1021,9,-1073,25,-1130,25,-1142,43,-1170,55,-1191,95,-1188,123,-1195,151,-1184,179,-1091,279,-1046,351,-1012,391,-1011,439,-976,523,-967,884,-957,956,-1025,953,-1077,962,-1096,988,-1095,1024,-1182,1070,-1242,1144,-1269,1212,-1279,1276,-1276,1352,-1254,1492,-1257,1597,-1266,1611,-1314,1607,-1342,1619,-1368,1661,-1372,1697,-1348,1753,-1310,1782,-1266,1786,-1223,1769,-1223,1825,-1210,1881,-1216,1945,-1197,2065,-1188,2298,-1135,2486,-1093,2570,-1062,2790,-1027,2886,-1027,2982,-1020,3019,-999,3087,-980,3123,-987,3147,-986,3191,-931,3275,-905,3304,-881,3313,-869,3330,-753,3369,-653,3357,-627,3415,-625,3445,-669,3455,-687,3479,-689,3502,-729,3512,-746,3531,-755,3579,-740,3611,-744,3623,-777,3647,-791,3675,-794,3695,-776,3732,-791,3772,-777,3804,-752,3816,-752,3876,-742,3908,-691,4e3,-653,4034,-613,4047,-561,4079],holes:[[132,2899,100,2879,99,2870,140,2513,153,2550,154,2594,147,2622,143,2726,147,2830],[-837,2583,-888,2474,-907,2298,-932,2213,-1018,2041,-1036,1985,-1039,1925,-1021,1902,-999,1941,-973,1962,-949,1975,-900,1981,-926,2077,-898,2209,-895,2318,-844,2506],[1130,2204,1135,2053,1121,2017,1075,1953,1109,1850,1131,1881,1164,1909,1176,1933,1181,1981,1163,2105],[1130,1719,1116,1673,1150,1648,1156,1673,1151,1709],[-945,1617,-964,1593,-958,1561,-879,1240,-861,1234,-844,1260,-835,1304,-844,1404,-872,1476],[-1150,1610,-1150,1585,-1059,1224,-1049,1201,-1041,1199,-1027,1212,-1096,1480,-1125,1589],[-1110,1594,-1106,1561,-1015,1216,-997,1211,-992,1232,-1080,1565,-1090,1585],[-1033,1591,-958,1248,-937,1227,-935,1240,-1018,1577],[-981,1586,-1005,1581,-1002,1561,-923,1244,-913,1234,-895,1240,-895,1252],[-1057,1581,-1065,1580,-1068,1573,-983,1244,-975,1220,-961,1220,-964,1260,-1003,1384,-1030,1512,-1048,1577],[-1142,1507,-1144,1284,-1131,1244,-1112,1212,-1069,1182,-1065,1200]]}]},cancer:{sign:"cancer",aspect:1.371723,edgeColor:"#7b551f",textureBox:{u0:.060164,u1:.94093,v0:.178557,v1:.822266},shapes:[{outer:[-777,4096,-617,4093,-454,4054,-341,3987,-288,3927,-278,3890,-291,3875,-309,3876,-394,3905,-466,3916,-569,3893,-666,3845,-702,3846,-751,3780,-793,3792,-856,3715,-914,3692,-933,3673,-939,3624,-914,3590,-847,3574,-799,3602,-769,3597,-726,3614,-696,3649,-642,3638,-575,3667,-460,3748,-436,3746,-422,3721,-436,3655,-525,3497,-744,3263,-872,3162,-1017,3081,-1068,3007,-1113,2970,-1247,2897,-1301,2849,-1446,2797,-1496,2747,-1501,2728,-1398,2693,-1198,2521,-1144,2527,-1104,2560,-1096,2608,-1077,2640,-1053,2640,-993,2612,-914,2612,-872,2623,-847,2645,-838,2699,-817,2725,-744,2702,-642,2716,-621,2747,-622,2820,-608,2880,-569,2924,-521,2943,-466,2931,-391,2850,-345,2825,-273,2876,-194,2848,-158,2867,-25,2845,114,2865,193,2848,229,2877,272,2884,322,2832,350,2816,377,2826,408,2886,459,2930,526,2933,562,2917,604,2873,624,2814,615,2747,646,2735,660,2705,713,2692,804,2728,823,2717,837,2656,901,2617,973,2612,1052,2636,1066,2620,1085,2547,1113,2521,1155,2511,1209,2521,1299,2566,1409,2637,1451,2683,1524,2692,1530,2705,1518,2729,1379,2757,1119,2856,1064,2929,865,3041,665,3200,503,3382,429,3527,425,3576,435,3590,496,3571,617,3489,647,3488,707,3459,768,3457,804,3433,858,3427,877,3434,903,3467,897,3503,877,3523,810,3537,762,3615,731,3638,677,3640,647,3674,592,3677,556,3703,496,3700,459,3714,332,3664,308,3680,309,3715,341,3769,423,3843,502,3885,653,3923,816,3924,949,3905,1125,3845,1348,3728,1421,3733,1451,3724,1518,3648,1717,3499,1816,3388,1919,3213,1984,3032,2020,3031,2068,3058,2089,3037,2118,2941,2138,2783,2165,2777,2175,2759,2174,2687,2155,2608,2107,2499,1935,2287,1959,2272,2099,2335,2171,2350,2244,2349,2286,2316,2334,2301,2377,2248,2637,2054,2664,2027,2665,1985,2746,1852,2790,1737,2809,1658,2809,1561,2783,1477,2752,1452,2734,1453,2706,1598,2651,1695,2603,1749,2492,1823,2407,1829,2377,1867,2262,1898,2153,2013,1966,1888,1984,1868,2117,1836,2250,1756,2341,1682,2365,1627,2419,1592,2453,1537,2669,1283,2667,1247,2735,1132,2767,1047,2797,908,2797,805,2768,696,2716,626,2691,610,2673,611,2678,733,2661,823,2609,932,2546,1009,2480,1062,2395,1083,2365,1135,2310,1128,2286,1138,2226,1231,2183,1235,2145,1265,2132,1338,2062,1429,1996,1426,1917,1469,1823,1416,1927,1332,2056,1174,2204,908,2211,860,2264,787,2262,764,2236,739,2276,551,2273,418,2256,303,2197,152,2142,79,2080,22,2032,3,2016,25,2071,176,2078,291,2070,321,2042,352,2035,448,1975,594,1947,626,1887,638,1869,680,1832,679,1810,690,1795,763,1738,866,1690,902,1663,1005,1603,1069,1397,1016,1294,1011,1161,1033,1019,1084,1150,938,1231,823,1236,781,1216,757,1248,600,1248,436,1217,273,1161,152,1082,60,1034,23,979,0,955,8,953,31,993,86,1035,176,1050,291,1022,454,994,533,953,600,945,648,867,690,828,755,760,823,713,890,665,882,611,890,532,947,502,956,302,905,12,896,-315,906,-376,917,-478,959,-515,952,-593,901,-720,891,-747,848,-849,757,-869,721,-920,670,-974,658,-984,606,-1047,491,-1081,358,-1079,249,-1044,140,-971,31,-980,15,-999,11,-1053,29,-1151,104,-1230,225,-1266,340,-1280,491,-1273,630,-1239,769,-1260,793,-1259,823,-1160,957,-1048,1071,-1045,1084,-1059,1089,-1169,1041,-1307,1015,-1422,1023,-1531,1051,-1584,1029,-1616,999,-1632,890,-1676,859,-1716,775,-1743,759,-1773,759,-1790,715,-1833,669,-1851,663,-1889,672,-1904,636,-1965,563,-2032,454,-2049,346,-2076,291,-2080,213,-2064,128,-2018,19,-2039,2,-2069,11,-2118,41,-2170,98,-2240,237,-2265,406,-2253,582,-2203,739,-2223,763,-2225,793,-2141,890,-2155,920,-2148,950,-2049,1071,-1955,1229,-1870,1344,-1807,1392,-1858,1430,-1912,1454,-1942,1454,-1991,1426,-2051,1411,-2083,1362,-2121,1259,-2148,1228,-2227,1208,-2299,1122,-2329,1133,-2358,1126,-2384,1071,-2475,1057,-2547,1005,-2603,938,-2657,830,-2676,727,-2674,619,-2686,610,-2704,616,-2747,661,-2793,775,-2798,914,-2760,1078,-2674,1247,-2675,1313,-2571,1399,-2345,1634,-2333,1652,-2343,1676,-2311,1716,-2087,1842,-1949,1888,-2003,1928,-2075,2006,-2130,2002,-2269,1868,-2366,1865,-2402,1832,-2462,1819,-2529,1781,-2620,1716,-2693,1616,-2724,1555,-2746,1465,-2765,1458,-2803,1519,-2809,1664,-2768,1797,-2661,1967,-2657,2015,-2390,2227,-2335,2294,-2287,2310,-2227,2350,-2081,2341,-1978,2309,-1876,2254,-1809,2196,-1682,2120,-1567,2062,-1513,2052,-1509,2070,-1525,2104,-1761,2249,-1882,2356,-1936,2428,-2059,2638,-2082,2699,-2101,2808,-2102,2929,-2081,2950,-2042,2959,-1989,3122,-1972,3138,-1936,3140,-1901,3304,-1840,3431,-1771,3527,-1561,3741,-1501,3827,-1464,3845,-1410,3838,-1337,3901,-1259,3947,-1041,4044,-938,4073],holes:[]}]},leo:{sign:"leo",aspect:1.313364,edgeColor:"#765221",textureBox:{u0:.059115,u1:.940716,v0:.165549,v1:.835417},shapes:[{outer:[1555,4093,1593,4096,1640,4072,1624,4064,1617,4033,1735,3972,1776,3926,1847,3931,1868,3951,1871,3999,1889,4001,1991,3904,1987,3833,1995,3819,2090,3800,2126,3775,2155,3735,2220,3694,2268,3694,2312,3714,2305,3655,2234,3572,2291,3557,2352,3495,2383,3412,2367,3288,2472,3105,2505,2998,2534,2966,2571,2951,2522,2901,2444,2892,2528,2800,2560,2732,2547,2655,2484,2584,2466,2542,2466,2495,2495,2424,2497,2382,2490,2335,2461,2282,2511,2258,2474,2211,2392,2181,2390,2140,2413,2057,2400,1968,2348,1903,2293,1785,2256,1745,2197,1706,2169,1619,2118,1548,2117,1524,2132,1504,2155,1492,2183,1500,2186,1489,2143,1463,2078,1471,2058,1435,2115,1323,2116,1240,2078,1196,2061,1191,2046,1199,2062,1216,2057,1246,2031,1260,2020,1246,2050,1181,2130,932,2216,772,2266,612,2392,445,2434,421,2552,389,2655,311,2690,222,2682,161,2605,124,2534,127,2493,100,2339,114,2256,98,2220,112,2114,124,2053,174,2019,267,1918,320,1887,352,1874,393,1867,488,1834,524,1844,571,1838,607,1800,645,1569,776,1510,837,1480,827,1421,777,1374,771,1359,790,1377,814,1362,851,1332,855,1244,839,1167,888,1189,790,1305,595,1312,482,1324,447,1376,388,1398,340,1492,324,1611,222,1642,174,1654,133,1654,80,1635,50,1611,36,1551,39,1510,11,1415,26,1374,0,1315,11,1267,8,1214,24,1167,1,1019,30,971,60,935,103,922,133,920,222,908,257,835,358,828,399,838,506,818,577,736,713,563,931,474,993,379,965,332,984,291,1024,261,1010,249,987,231,984,214,1021,228,1056,154,1097,120,1157,95,1119,72,1155,12,1149,-65,1173,-177,1055,-325,970,-438,885,-458,861,-464,826,-440,766,-380,684,-294,601,-213,546,-82,538,36,502,86,435,122,358,121,334,107,320,77,320,42,292,-71,272,-278,278,-402,302,-515,364,-544,390,-602,482,-713,624,-810,722,-893,784,-920,820,-925,885,-908,920,-882,952,-787,1013,-754,1051,-731,1092,-719,1169,-737,1264,-864,1379,-902,1352,-1024,1220,-1189,1096,-1361,1007,-1491,963,-1586,917,-1706,766,-1772,636,-1784,559,-1777,500,-1754,453,-1692,388,-1662,322,-1661,269,-1681,238,-1823,202,-1882,207,-1912,192,-2018,209,-2101,202,-2202,249,-2222,275,-2246,364,-2251,447,-2234,518,-2129,654,-2086,731,-2029,867,-1972,1056,-1941,1083,-1805,1143,-1738,1210,-1631,1352,-1583,1471,-1506,1767,-1417,2004,-1450,1993,-1574,1912,-1688,1808,-1749,1714,-1880,1429,-1974,1305,-2024,1256,-2113,1197,-2184,1167,-2267,1149,-2385,1155,-2527,1208,-2595,1264,-2671,1388,-2690,1489,-2683,1643,-2637,1761,-2578,1844,-2462,1946,-2397,1971,-2273,1990,-2253,2027,-2254,2057,-2290,2072,-2299,2086,-2261,2120,-2202,2118,-2150,2086,-2111,2045,-2075,1956,-2068,1903,-2075,1838,-2111,1731,-2178,1659,-2243,1625,-2314,1613,-2338,1579,-2373,1552,-2427,1546,-2456,1569,-2483,1536,-2494,1500,-2481,1400,-2459,1364,-2415,1326,-2367,1303,-2296,1297,-2202,1327,-2131,1379,-2075,1453,-2007,1589,-1944,1755,-1836,1938,-1772,2015,-1633,2142,-1491,2237,-1361,2306,-911,2509,-757,2556,-515,2603,-106,2653,-71,2699,-35,2716,-5,2722,-5,2706,42,2699,67,2738,69,2791,100,2850,143,2882,202,2897,147,2974,139,3016,146,3051,166,3059,196,3013,225,3007,261,3005,296,3024,344,3081,324,3105,306,3164,306,3235,331,3282,385,3332,427,3349,504,3350,562,3336,573,3353,536,3395,519,3460,519,3495,544,3549,582,3584,616,3599,729,3598,748,3620,746,3635,697,3679,679,3720,675,3750,695,3791,717,3803,720,3768,735,3748,817,3736,847,3751,880,3809,936,3853,1039,3886,1034,3957,1052,3993,1084,4019,1107,3971,1137,3961,1179,3961,1196,3989,1267,4001,1350,4003,1427,3990,1448,4046,1475,4072],holes:[]}]},virgo:{sign:"virgo",aspect:.515258,edgeColor:"#825d23",textureBox:{u0:.271603,u1:.727103,v0:.059208,v1:.941406},shapes:[{outer:[4,4096,76,4093,139,4079,234,4032,271,3994,340,3941,351,3896,373,3869,382,3842,386,3764,335,3700,298,3685,276,3685,267,3693,253,3681,233,3628,224,3573,238,3542,228,3510,298,3484,339,3445,412,3433,427,3446,420,3451,430,3467,444,3464,455,3437,467,3435,505,3519,519,3523,545,3569,553,3572,566,3558,571,3540,594,3532,621,3540,628,3573,676,3630,688,3573,707,3540,716,3566,726,3578,736,3578,757,3617,762,3621,766,3608,776,3624,830,3660,839,3653,853,3661,868,3655,853,3605,828,3573,821,3536,871,3557,894,3551,898,3536,971,3580,1048,3580,1055,3573,1006,3514,1004,3501,953,3466,946,3451,966,3441,1003,3448,1027,3433,1032,3423,1025,3412,964,3383,1021,3365,1036,3346,1012,3322,943,3296,966,3259,948,3251,889,3262,855,3255,913,3201,930,3169,916,3158,871,3184,820,3192,854,3142,867,3096,862,3092,807,3133,776,3138,764,3124,789,3108,804,3083,804,3074,792,3069,782,3051,853,2998,882,2955,923,2787,918,2737,885,2660,896,2551,886,2356,863,2278,824,2210,842,1997,877,1801,877,1756,859,1715,769,1633,763,1551,772,1469,768,1410,684,1324,682,1238,696,1147,687,1083,569,942,495,774,438,711,433,665,444,597,427,552,350,483,275,397,278,379,358,293,373,243,368,220,348,192,243,120,276,56,274,34,244,13,180,0,162,8,112,0,12,31,-8,52,-35,102,-111,131,-138,171,-174,160,-201,164,-229,190,-297,186,-365,204,-406,249,-488,245,-520,255,-566,297,-571,333,-552,379,-556,386,-570,374,-594,324,-595,256,-620,228,-724,177,-810,192,-836,206,-848,229,-854,302,-865,321,-965,327,-1006,341,-1039,365,-1055,415,-1039,465,-976,542,-987,615,-985,642,-966,688,-741,920,-641,1133,-589,1306,-592,1326,-652,1379,-681,1447,-680,1483,-659,1556,-641,1669,-653,1692,-715,1742,-753,1806,-754,1983,-773,2137,-657,2569,-550,2778,-544,2915,-527,3064,-554,3142,-554,3174,-572,3214,-571,3255,-539,3310,-562,3346,-562,3387,-551,3404,-542,3405,-544,3392,-533,3377,-506,3375,-483,3410,-485,3442,-467,3478,-433,3506,-374,3516,-376,3546,-349,3601,-305,3646,-255,3682,-250,3701,-281,3728,-289,3746,-281,3792,-316,3842,-322,3896,-313,3923,-270,3966,-197,4012,-174,4021,-124,4019,-88,4062,-56,4084],holes:[[-306,2776,-401,2466,-368,2492,-345,2537,-339,2569,-277,2683,-294,2719,-299,2774],[-542,2268,-607,2192,-631,2151,-583,2054,-549,2133,-500,2187]]}]},libra:{sign:"libra",aspect:.906056,edgeColor:"#704c1a",textureBox:{u0:.099766,u1:.900212,v0:.059675,v1:.942133},shapes:[{outer:[-9,4093,-2,4096,28,4069,42,4046,54,3994,91,3961,82,3915,124,3904,156,3872,161,3839,152,3783,166,3745,151,3708,246,3669,278,3633,297,3595,302,3539,292,3511,265,3479,209,3455,200,3426,246,3424,279,3390,369,3466,401,3440,472,3453,603,3448,744,3410,899,3341,983,3313,989,3374,1016,3405,1054,3406,1076,3379,1068,3335,1096,3299,1163,3276,1218,3270,1255,3281,1242,3283,1196,3346,1196,3379,1211,3407,1265,3453,1326,3458,1378,3439,1423,3398,1442,3309,1486,3303,1513,3285,1513,3271,1475,3243,1415,3175,1359,3146,1251,3116,1251,3106,1287,3069,1292,3051,1286,3004,1254,2957,1264,2886,1319,2839,1330,2797,1330,2736,1385,2685,1387,2586,1436,2530,1439,2436,1448,2418,1467,2411,1503,2370,1508,2332,1500,2287,1509,2262,1542,2242,1564,2215,1574,2187,1565,2131,1570,2099,1620,2060,1635,2018,1626,1970,1640,1943,1669,1923,1691,1891,1700,1858,1701,1774,1748,1740,1770,1708,1772,1648,1833,1637,1856,1605,1814,1553,1808,1525,1780,1474,1730,1418,1645,1357,1542,1310,1354,1268,1199,1261,1068,1268,890,1301,777,1348,688,1409,620,1483,584,1565,548,1591,548,1610,570,1632,608,1646,645,1648,655,1660,651,1680,671,1736,721,1772,730,1769,739,1807,740,1887,764,1924,791,1944,792,2013,806,2056,857,2100,862,2206,878,2234,913,2256,922,2275,929,2295,923,2347,933,2379,983,2431,981,2492,989,2530,1010,2562,1040,2581,1046,2680,1065,2713,1101,2742,1098,2816,1112,2849,1148,2881,1150,2905,1171,2945,1171,2961,1154,2985,1139,3037,1144,3069,1168,3098,1171,3115,1035,3127,819,3168,645,3177,556,3163,551,3140,519,3099,486,3080,462,3080,421,3102,408,3140,414,3159,463,3187,458,3209,420,3234,369,3234,317,3201,345,3190,368,3168,376,3135,367,3112,326,3075,275,3084,242,3058,229,3027,248,2985,245,2957,214,2930,166,2933,175,2891,170,2853,119,2788,142,2741,128,2647,110,2609,129,2115,133,2088,156,2060,157,2010,175,1995,183,1971,152,1919,167,1877,232,1845,255,1807,255,1783,244,1765,228,1752,191,1746,173,1708,199,1642,270,1594,311,1549,335,1478,325,1422,305,1380,261,1330,190,1286,171,1262,170,1248,218,1233,239,1187,298,1162,338,1121,339,1093,293,1062,279,1028,289,995,350,918,392,928,434,913,455,896,448,844,472,830,537,814,599,771,619,769,655,792,683,791,715,751,714,727,697,694,739,684,819,642,879,596,889,549,870,488,1014,361,1094,248,1104,220,1095,169,1077,151,1021,128,946,128,857,155,782,156,711,193,561,183,500,160,485,122,462,94,401,62,350,59,271,84,242,85,195,52,149,42,106,16,42,14,-7,0,-35,10,-91,10,-148,43,-204,49,-246,85,-340,57,-411,63,-462,90,-489,117,-510,155,-584,183,-730,195,-781,161,-833,164,-950,127,-988,127,-1021,128,-1063,143,-1099,187,-1099,234,-1057,309,-988,392,-885,474,-897,511,-881,530,-889,572,-879,600,-763,679,-697,699,-710,727,-710,760,-692,787,-659,796,-618,769,-594,770,-533,814,-444,841,-452,896,-429,922,-387,932,-350,927,-336,938,-298,981,-279,1028,-291,1056,-340,1093,-346,1112,-338,1136,-298,1165,-251,1182,-218,1229,-175,1253,-181,1272,-270,1336,-306,1380,-330,1436,-332,1483,-311,1549,-284,1584,-204,1652,-176,1717,-187,1741,-240,1765,-251,1807,-245,1830,-228,1848,-162,1875,-152,1910,-177,1943,-185,1971,-184,1985,-158,2009,-160,2051,-138,2079,-129,2168,-111,2600,-115,2628,-133,2652,-144,2727,-137,2764,-117,2783,-124,2801,-152,2821,-174,2853,-171,2928,-209,2925,-245,2947,-249,2990,-225,3022,-237,3048,-268,3079,-284,3084,-336,3075,-370,3107,-380,3154,-359,3185,-325,3201,-340,3220,-368,3234,-406,3234,-454,3215,-468,3187,-444,3181,-420,3163,-412,3126,-439,3089,-462,3081,-519,3094,-570,3159,-702,3178,-824,3168,-1030,3127,-1162,3118,-1170,3098,-1144,3074,-1130,3046,-1144,2994,-1173,2966,-1162,2924,-1148,2882,-1103,2839,-1093,2802,-1098,2760,-1091,2736,-1055,2699,-1041,2666,-1040,2586,-985,2520,-988,2440,-980,2417,-938,2379,-929,2356,-923,2267,-887,2239,-858,2192,-857,2098,-820,2070,-797,2032,-796,1948,-757,1919,-740,1891,-731,1849,-737,1811,-725,1774,-683,1745,-656,1708,-651,1642,-598,1641,-561,1623,-553,1610,-554,1591,-584,1561,-595,1530,-637,1464,-697,1404,-749,1367,-828,1324,-899,1301,-1091,1268,-1237,1264,-1349,1273,-1523,1307,-1654,1367,-1751,1450,-1795,1516,-1809,1565,-1856,1600,-1855,1614,-1823,1641,-1777,1655,-1768,1708,-1701,1779,-1691,1807,-1690,1863,-1677,1905,-1622,1957,-1618,1976,-1629,1995,-1629,2023,-1614,2056,-1565,2101,-1561,2131,-1567,2163,-1559,2206,-1499,2286,-1494,2365,-1474,2398,-1448,2416,-1440,2440,-1437,2525,-1382,2594,-1375,2680,-1353,2717,-1325,2741,-1329,2797,-1320,2839,-1283,2882,-1267,2933,-1251,2959,-1252,2971,-1286,3013,-1290,3037,-1282,3074,-1255,3098,-1251,3117,-1307,3127,-1410,3174,-1476,3243,-1516,3271,-1515,3290,-1490,3308,-1448,3305,-1428,3393,-1387,3439,-1340,3458,-1279,3458,-1251,3448,-1200,3403,-1191,3374,-1196,3342,-1210,3313,-1243,3285,-1204,3271,-1135,3281,-1092,3304,-1072,3332,-1076,3389,-1049,3411,-1026,3413,-994,3393,-980,3356,-981,3323,-974,3321,-772,3401,-617,3448,-481,3453,-415,3439,-387,3454,-364,3453,-284,3398,-284,3390,-274,3398,-284,3403,-251,3425,-212,3426,-209,3446,-256,3475,-287,3511,-302,3586,-282,3633,-246,3669,-161,3708,-161,3727,-147,3745,-158,3755,-150,3797,-161,3825,-156,3863,-129,3900,-91,3922,-90,3961,-59,3999],holes:[[-1185,3056,-1204,3043,-1241,3048,-1256,3041,-1237,3008,-1218,3003,-1176,3021,-1171,3043],[1195,3056,1181,3050,1183,3018,1213,3003,1242,3005,1256,3046,1244,3055,1218,3047],[-1190,2798,-1195,2741,-1173,2708,-1162,2666,-1163,2638,-1184,2600,-1153,2511,-1154,2492,-1181,2436,-1144,2347,-1168,2257,-1144,2182,-1166,2102,-1134,2027,-1139,1995,-1157,1957,-1125,1872,-1130,1835,-1148,1797,-1123,1718,-1142,1657,-861,1656,-767,1647,-781,1675,-776,1746,-786,1788,-827,1826,-846,1868,-847,1943,-855,1957,-879,1971,-906,2018,-903,2088,-912,2117,-936,2127,-968,2168,-973,2267,-1005,2295,-1029,2337,-1030,2431,-1081,2487,-1091,2588,-1136,2642,-1138,2714,-1148,2742],[1246,2770,1230,2736,1249,2703,1253,2661,1232,2577,1249,2539,1250,2492,1223,2450,1222,2436,1244,2384,1250,2342,1245,2318,1222,2286,1220,2253,1240,2215,1246,2178,1217,2117,1218,2093,1235,2056,1237,2018,1231,1990,1209,1962,1231,1863,1226,1835,1202,1797,1222,1722,1203,1661,1657,1647,1637,1685,1632,1713,1642,1765,1636,1800,1595,1835,1585,1854,1576,1901,1579,1943,1519,2013,1516,2046,1525,2084,1519,2112,1477,2149,1460,2182,1465,2243,1458,2271,1407,2328,1396,2421,1342,2492,1345,2558,1336,2595,1295,2638,1284,2732],[-1265,2760,-1280,2727,-1275,2689,-1282,2642,-1341,2572,-1341,2501,-1356,2473,-1392,2436,-1397,2342,-1411,2314,-1457,2261,-1458,2173,-1514,2093,-1516,2013,-1533,1980,-1579,1940,-1581,1863,-1606,1821,-1636,1799,-1650,1761,-1631,1704,-1633,1680,-1650,1651,-1204,1661,-1225,1718,-1221,1746,-1200,1779,-1198,1807,-1217,1826,-1230,1858,-1221,1915,-1204,1943,-1204,1966,-1222,1980,-1236,2013,-1231,2060,-1210,2093,-1209,2112,-1241,2168,-1240,2210,-1217,2253,-1217,2286,-1241,2342,-1223,2451,-1245,2492,-1247,2516,-1229,2595,-1254,2670,-1237,2736,-1251,2760],[1176,2760,1148,2741,1142,2652,1116,2614,1096,2600,1086,2572,1085,2492,1035,2431,1025,2398,1033,2365,1028,2332,969,2271,968,2182,953,2149,912,2112,906,2009,884,1971,842,1934,845,1854,827,1821,786,1788,778,1746,785,1694,772,1651,1136,1661,1137,1675,1121,1708,1121,1736,1148,1807,1125,1868,1130,1905,1153,1938,1158,1966,1135,2023,1144,2065,1172,2102,1172,2121,1140,2178,1149,2225,1172,2257,1172,2286,1153,2323,1149,2361,1176,2426,1175,2464,1159,2497,1158,2520,1167,2562,1187,2595,1163,2661,1168,2703,1186,2741,1185,2760],[979,2380,959,2365,955,2327,969,2338,988,2328,998,2342,1002,2369],[-1518,2216,-1533,2168,-1518,2176,-1500,2163,-1486,2202],[913,2216,890,2193,890,2163,908,2172,927,2168,932,2178,937,2206],[-913,2211,-942,2201,-937,2168,-922,2155,-888,2178,-899,2206],[1176,2212,1176,2163,1204,2163,1213,2202,1204,2211],[847,2052,833,2036,831,2013,861,1994,877,2037],[1575,2047,1551,2037,1556,2011,1594,2004,1594,2038,1584,2049],[-1640,1897,-1659,1863,-1650,1853,-1640,1859,-1622,1848,-1609,1882,-1621,1896],[-1190,1896,-1200,1863,-1190,1844,-1162,1854,-1157,1868,-1166,1895],[-805,1896,-819,1881,-800,1844,-781,1858,-772,1856,-767,1868,-781,1897],[1631,1899,1611,1882,1617,1858,1631,1844,1660,1863,1654,1863,1655,1884],[782,1892,767,1874,766,1844,777,1858,800,1844,810,1855,814,1890],[-1711,1718,-1726,1708,-1730,1689,-1687,1679,-1669,1694,-1687,1719],[706,1718,683,1689,744,1680,749,1694,740,1713],[1702,1718,1670,1713,1673,1689,1704,1671,1730,1684,1734,1675,1735,1704,1720,1718],[-735,1713,-744,1708,-745,1694,-730,1670,-692,1688,-692,1700,-708,1713]]}]},scorpio:{sign:"scorpio",aspect:.837012,edgeColor:"#7c5d29",textureBox:{u0:.130476,u1:.867378,v0:.060357,v1:.940695},shapes:[{outer:[80,4094,143,4096,234,4063,275,4060,362,4024,456,3962,465,3946,467,3911,545,3853,609,3763,669,3630,678,3585,670,3544,710,3508,720,3483,740,3371,741,3223,723,3172,741,3157,740,3044,716,2927,669,2835,664,2749,626,2570,644,2530,650,2469,630,2346,634,2254,626,2178,653,2214,700,2316,783,2555,844,2642,902,2679,963,2700,1024,2710,1070,2700,1136,2644,1165,2596,1223,2543,1299,2563,1350,2546,1373,2519,1373,2469,1366,2464,1325,2485,1274,2471,1243,2447,1223,2446,1167,2467,1070,2536,1014,2497,958,2492,934,2412,882,2307,897,2308,958,2354,1024,2374,1101,2384,1228,2383,1294,2333,1437,2176,1554,2169,1575,2159,1603,2122,1607,2076,1597,2056,1580,2048,1567,2071,1549,2081,1478,2069,1401,2079,1223,2197,1182,2171,1131,2160,1080,2161,1024,2184,991,2117,947,2071,1075,2073,1141,2063,1223,2042,1299,2007,1383,1933,1524,1722,1549,1703,1666,1681,1698,1658,1714,1623,1709,1567,1692,1549,1666,1583,1636,1599,1529,1589,1452,1619,1422,1615,1383,1689,1233,1850,1172,1834,1121,1836,1070,1850,1009,1890,973,1839,880,1770,983,1757,1090,1711,1223,1630,1252,1572,1285,1536,1435,1296,1478,1269,1539,1252,1590,1222,1632,1169,1643,1118,1631,1093,1610,1081,1597,1118,1559,1146,1432,1152,1350,1191,1320,1192,1285,1271,1106,1477,1050,1489,907,1565,861,1523,797,1516,805,1503,876,1487,938,1433,1075,1350,1183,1245,1202,1189,1230,1154,1241,1118,1316,1031,1378,919,1404,817,1397,675,1403,634,1393,593,1359,537,1337,461,1301,394,1225,287,1126,190,1050,132,927,66,825,25,713,1,652,0,611,11,591,20,584,38,683,63,775,132,795,167,838,180,847,191,849,231,913,267,895,308,944,359,955,394,946,450,887,469,883,445,866,423,841,417,800,426,796,374,769,360,749,364,708,306,693,308,601,233,571,184,555,178,543,196,538,252,559,328,689,568,750,726,747,756,721,787,706,828,706,868,733,919,716,955,773,1052,818,1093,778,1138,734,1222,718,1225,657,1203,591,1201,549,1164,520,1156,474,1161,443,1122,362,1101,280,1116,250,1136,234,1161,188,1159,153,1178,97,1173,25,1194,-41,1145,-92,1092,-122,1079,-133,1082,-135,1133,-151,1169,-194,1186,-224,1182,-288,1123,-292,1072,-306,1060,-349,1108,-370,1189,-387,1217,-428,1203,-489,1223,-512,1194,-540,1177,-607,1167,-663,1173,-690,1200,-688,1229,-729,1214,-785,1218,-812,1251,-821,1288,-907,1324,-1014,1203,-1072,1169,-1077,1149,-1053,1123,-1061,1087,-1047,1052,-1059,960,-1084,899,-1120,848,-1137,826,-1177,801,-1194,772,-1190,690,-1135,456,-1134,384,-1145,354,-1167,345,-1200,425,-1225,440,-1242,486,-1259,507,-1279,504,-1300,514,-1315,541,-1338,552,-1349,603,-1383,619,-1389,664,-1417,682,-1443,598,-1440,537,-1415,512,-1430,491,-1429,471,-1389,379,-1315,285,-1225,231,-1233,209,-1300,204,-1391,234,-1473,286,-1572,379,-1622,450,-1659,527,-1679,614,-1679,670,-1709,756,-1699,807,-1714,868,-1709,945,-1684,1042,-1648,1118,-1603,1179,-1539,1232,-1473,1273,-1407,1300,-1368,1373,-1315,1433,-1264,1471,-1157,1527,-1046,1556,-994,1594,-943,1599,-729,1543,-632,1494,-607,1493,-589,1505,-612,1536,-668,1542,-790,1607,-912,1701,-1045,1651,-1131,1651,-1146,1612,-1259,1528,-1351,1422,-1447,1360,-1519,1360,-1549,1345,-1595,1284,-1618,1296,-1630,1347,-1618,1409,-1554,1462,-1463,1489,-1302,1699,-1198,1798,-1096,1849,-912,1894,-836,1885,-747,1847,-824,1974,-866,2027,-943,2003,-989,1998,-1055,2016,-1069,1984,-1116,1931,-1274,1809,-1320,1803,-1361,1782,-1463,1793,-1493,1779,-1519,1743,-1534,1742,-1546,1796,-1519,1849,-1483,1875,-1371,1892,-1172,2102,-1070,2188,-887,2215,-826,2211,-770,2191,-687,2107,-594,1918,-561,1901,-538,1918,-577,1954,-579,1979,-644,2091,-734,2290,-790,2294,-826,2308,-892,2364,-953,2293,-1024,2238,-1101,2213,-1203,2216,-1238,2176,-1250,2188,-1256,2229,-1236,2280,-1198,2303,-1116,2309,-1023,2397,-970,2484,-907,2556,-851,2562,-765,2524,-707,2586,-663,2656,-615,2703,-586,2715,-484,2689,-421,2647,-395,2581,-349,2249,-344,2234,-296,2195,-228,2254,-173,2355,-106,2412,-53,2499,36,2576,81,2638,224,2726,330,2897,392,2948,386,3014,405,3116,436,3167,477,3202,436,3248,416,3309,401,3442,426,3498,362,3556,321,3610,278,3697,271,3748,173,3826,153,3837,53,3799,27,3671,-9,3574,-87,3469,-168,3409,-229,3394,-255,3407,-192,3478,-176,3534,-197,3590,-277,3687,-298,3732,-303,3814,-276,3895,-229,3954,-133,4030,-15,4080],holes:[[-586,2531,-663,2484,-692,2479,-637,2445,-585,2397,-549,2331,-481,2117,-454,2079,-467,2188,-491,2244,-568,2514]]}]},sagittarius:{sign:"sagittarius",aspect:.64923,edgeColor:"#815e28",textureBox:{u0:.213427,u1:.786289,v0:.060001,v1:.940453},shapes:[{outer:[-141,4096,-128,4087,-118,4056,-98,4038,-84,4003,-33,3952,100,3877,362,3774,473,3698,519,3652,585,3564,616,3497,613,3444,637,3407,673,3407,735,3450,788,3463,790,3493,815,3512,1055,3528,934,3432,881,3376,832,3384,819,3402,748,3380,717,3385,690,3379,669,3364,705,3320,703,3289,737,3205,720,3147,758,3107,798,3018,803,2845,785,2734,750,2637,600,2402,551,2300,528,2198,534,2145,559,2082,557,2063,544,2058,511,2082,474,2158,446,2186,-104,2523,-114,2522,-124,2415,-163,2300,-163,2264,-144,2198,-115,2162,-104,2131,-71,2109,-31,2051,-26,2011,-50,1976,-47,1967,74,1863,154,1828,220,1814,278,1810,455,1827,540,1818,642,1783,735,1730,948,1753,1054,1734,1143,1685,1229,1599,1282,1510,1317,1399,1330,1284,1322,1235,1301,1178,1309,1120,1296,1076,1254,1030,1183,998,1134,997,1121,1027,1058,1011,1017,983,1004,951,1003,916,1012,889,1050,858,1112,856,1143,878,1147,889,1162,889,1171,858,1149,801,1112,768,1058,759,1036,709,996,671,943,657,921,664,912,676,946,708,930,701,921,709,918,734,899,770,885,779,854,773,819,781,791,801,816,725,816,672,785,619,724,561,640,415,618,317,619,224,571,196,544,166,535,170,502,153,514,95,496,42,473,27,406,6,313,0,225,6,167,24,160,51,178,100,231,171,256,195,291,213,331,260,334,317,347,348,479,472,537,566,554,610,572,747,568,770,503,907,456,1045,429,1091,413,1085,383,1036,374,1009,379,960,418,885,496,818,502,792,493,756,455,720,269,625,211,580,151,517,126,468,124,441,114,431,78,439,38,413,16,420,3,413,-3,401,0,331,-19,298,-126,267,-250,272,-291,299,-282,335,-247,401,-210,449,-146,504,-100,583,-59,616,29,644,118,697,177,747,213,801,205,823,145,870,94,925,62,996,1,1071,-21,1129,-33,1135,-130,1132,-250,1154,-316,1176,-418,1227,-565,1206,-614,1175,-663,1111,-700,1045,-717,987,-727,920,-714,872,-674,827,-674,801,-691,778,-700,747,-640,717,-612,681,-599,623,-603,592,-625,526,-658,483,-702,457,-742,453,-784,486,-855,588,-883,703,-930,770,-930,818,-884,925,-955,971,-1011,1040,-1066,1065,-1090,1089,-1140,1280,-1228,1435,-1223,1466,-1209,1488,-1177,1526,-1146,1547,-1017,1557,-924,1584,-891,1608,-904,1643,-896,1697,-915,1715,-927,1745,-920,1771,-892,1794,-943,1847,-977,1912,-996,1923,-1046,1985,-1051,2051,-1065,2074,-1133,2117,-1222,2215,-1206,2233,-1232,2295,-1231,2313,-1208,2318,-1177,2302,-1191,2371,-1181,2375,-1164,2365,-1119,2359,-1108,2366,-1108,2384,-1088,2412,-1050,2388,-1031,2365,-1004,2373,-994,2366,-970,2313,-945,2282,-927,2220,-930,2184,-871,2160,-853,2161,-831,2177,-789,2229,-772,2269,-811,2344,-836,2424,-844,2495,-840,2530,-942,2511,-1017,2506,-1141,2516,-1235,2533,-1270,2547,-1321,2597,-1330,2641,-1311,2672,-1230,2754,-1181,2789,-1115,2816,-1004,2844,-937,2874,-893,2879,-895,2885,-849,2917,-829,2947,-833,2992,-791,3003,-770,3040,-819,3138,-815,3169,-800,3193,-769,3215,-744,3284,-710,3333,-578,3393,-534,3394,-485,3408,-425,3400,-138,3972,-128,4003,-145,4021,-149,4043],holes:[[-112,3959,-124,3950,-295,3617,-402,3391,-359,3355,-328,3289,-329,3275,-349,3240,-350,3200,-323,3165,-342,3080,-334,3039,486,3341,519,3360,482,3443,460,3454,429,3456,405,3480,396,3519,417,3555,413,3582,373,3652,327,3701,260,3748,47,3846],[486,3308,-268,3029,-295,3009,-311,2956,-338,2938,-330,2932,-308,2937,-259,2967,-197,2980,-148,2980,-86,2964,7,2998,100,3016,176,3069,340,3129,446,3190,487,3236,501,3302],[588,3104,544,3073,420,2954,336,2893,234,2845,145,2824,52,2764,3,2741,-68,2727,-91,2703,-93,2624,-109,2566,-95,2550,464,2216,474,2229,511,2349,661,2628,684,2717,683,2801,669,2854,652,2885,600,2943,601,2992,634,3036,616,3089,602,3105],[841,1600,878,1493,887,1391,869,1284,837,1213,813,1182,819,1180,894,1218,893,1249,902,1266,990,1351,1011,1395,1007,1439,989,1484,890,1579],[-995,1356,-1001,1351,-1002,1320,-984,1284,-933,1229,-888,1204,-890,1151,-827,1127,-824,1244,-814,1271,-776,1315,-875,1318,-973,1357]]}]},capricorn:{sign:"capricorn",aspect:.898201,edgeColor:"#805e28",textureBox:{u0:.104107,u1:.894798,v0:.06019,v1:.941406},shapes:[{outer:[-196,4096,-177,4092,-166,4076,-156,3993,-171,3924,-191,3884,-228,3845,-222,3842,-34,3814,69,3823,143,3843,202,3877,258,3929,320,4047,337,4037,352,3997,352,3958,337,3899,297,3825,261,3783,192,3730,118,3695,39,3670,-39,3663,-286,3680,-419,3670,-493,3649,-561,3615,-707,3500,-675,3502,-611,3474,-566,3467,-527,3448,-443,3380,-404,3390,-396,3421,-384,3427,-367,3401,-362,3372,-372,3337,-397,3308,-386,3288,-286,3198,-250,3199,-262,3249,-251,3261,-236,3265,-204,3244,-185,3209,-181,3175,-190,3145,-219,3121,-133,3031,-111,2973,-111,2933,-133,2894,-153,2879,-155,2850,-109,2771,-84,2750,-44,2764,-34,2788,-25,2789,-5,2766,-13,2722,-49,2680,-123,2653,-77,2564,-78,2515,-101,2465,-133,2434,-172,2414,-192,2419,-214,2441,-219,2475,-212,2469,-189,2495,-191,2534,-207,2575,-263,2485,-253,2426,-227,2374,-202,2355,-182,2356,-158,2372,-142,2352,-152,2313,-172,2291,-202,2272,-266,2261,-268,2254,-254,2244,-217,2180,-182,2148,-148,2148,-123,2187,-103,2185,-96,2175,-91,2145,-98,2111,-155,2057,-134,2032,-132,1978,-106,1963,-80,1899,49,1833,537,1718,695,1659,744,1631,780,1687,800,1741,805,1825,786,1924,765,1978,723,2042,609,2160,545,2249,520,2308,505,2377,521,2475,564,2554,631,2620,670,2634,705,2635,754,2612,771,2589,771,2559,759,2543,744,2539,724,2566,705,2572,673,2539,663,2461,688,2387,808,2257,892,2231,985,2155,1035,2096,1081,1978,1104,1976,1143,1989,1237,1966,1335,1970,1404,1955,1463,1926,1485,1904,1493,1877,1591,1814,1690,1769,1729,1764,1761,1776,1781,1810,1773,1822,1759,1824,1751,1840,1773,1862,1818,1857,1840,1815,1839,1756,1815,1712,1778,1681,1714,1651,1640,1641,1517,1659,1473,1631,1394,1602,1345,1617,1343,1598,1365,1564,1364,1549,1345,1524,1330,1519,1276,1576,1222,1596,1158,1604,1059,1576,998,1520,977,1490,978,1475,1079,1389,1150,1303,1223,1170,1268,1047,1283,983,1293,855,1283,751,1244,594,1204,500,1159,421,1101,342,995,243,892,184,729,123,631,65,532,26,453,5,350,0,281,11,192,40,138,69,118,70,89,55,54,59,15,88,-22,145,-5,189,43,219,15,245,-54,256,-82,244,-98,217,-123,207,-158,212,-194,239,-209,293,-172,368,-202,372,-281,342,-320,350,-352,377,-367,406,-363,456,-419,453,-430,461,-448,497,-491,495,-496,465,-522,444,-566,444,-609,465,-641,505,-662,554,-657,589,-630,644,-660,636,-734,642,-778,661,-827,700,-872,646,-911,621,-946,615,-1e3,621,-1079,664,-1162,675,-1200,702,-1225,771,-1223,805,-1201,855,-1266,853,-1288,909,-1330,932,-1350,973,-1374,976,-1390,968,-1399,953,-1392,924,-1414,906,-1443,902,-1473,915,-1499,943,-1514,988,-1485,1086,-1438,1142,-1384,1162,-1325,1163,-1318,1180,-1365,1219,-1401,1268,-1437,1490,-1457,1534,-1519,1628,-1523,1677,-1512,1731,-1480,1781,-1436,1820,-1472,1845,-1502,1847,-1525,1835,-1553,1800,-1578,1741,-1577,1663,-1551,1613,-1549,1594,-1560,1564,-1588,1544,-1594,1515,-1581,1488,-1537,1477,-1511,1456,-1496,1411,-1495,1362,-1515,1293,-1539,1249,-1611,1178,-1630,1168,-1660,1172,-1692,1195,-1730,1239,-1800,1387,-1811,1500,-1840,1559,-1835,1643,-1772,1761,-1722,1879,-1711,2052,-1670,2118,-1611,2152,-1552,2152,-1448,2104,-1355,2075,-1323,2076,-1311,2101,-1317,2195,-1302,2234,-1274,2268,-1268,2293,-1277,2328,-1267,2377,-1287,2406,-1287,2465,-1256,2507,-1188,2544,-1183,2564,-1194,2638,-1160,2707,-1205,2731,-1248,2776,-1284,2869,-1220,3106,-1242,3190,-1220,3229,-1247,3293,-1259,3352,-1246,3369,-1207,3354,-1187,3367,-1194,3421,-1189,3461,-1197,3480,-1189,3534,-1175,3594,-1110,3722,-1054,3788,-980,3842,-926,3869,-827,3900,-744,3910,-645,3905,-438,3872,-394,3872,-335,3892,-276,3931,-239,3973,-211,4027],holes:[[-1266,1604,-1278,1584,-1253,1505,-1227,1474,-1162,1437,-1135,1397,-1136,1352,-1148,1317,-1079,1324,-1029,1315,-990,1295,-954,1239,-921,1153,-862,1153,-808,1170,-718,1145,-733,1195,-759,1211,-783,1212,-818,1267,-834,1234,-857,1216,-872,1213,-896,1224,-880,1244,-889,1283,-934,1357,-979,1411,-1077,1485,-1158,1584,-1217,1605],[-665,1197,-672,1170,-650,1132,-586,1131,-570,1121,-549,1081,-497,1033,-443,1083,-424,1087,-389,1077,-348,1037,-351,1017,-371,997,-355,991,-182,1002,0,995,69,985,177,954,235,1027,317,1111,39,1065,-153,1055,-364,1099,-576,1177],[744,1034,614,855,640,815,680,789,749,764,808,764,848,791,860,830,855,864,840,914,805,978]]}]},aquarius:{sign:"aquarius",aspect:.789277,edgeColor:"#83612a",textureBox:{u0:.151898,u1:.846892,v0:.06031,v1:.941406},shapes:[{outer:[72,4096,120,4092,201,4066,298,4027,364,3981,386,3949,402,3867,446,3842,463,3781,459,3750,467,3715,400,3613,379,3601,323,3595,298,3568,267,3573,247,3563,199,3496,179,3450,208,3399,203,3369,262,3345,289,3313,277,3242,344,3219,396,3176,442,3104,463,3038,462,2947,428,2820,437,2703,410,2560,432,2453,427,2403,399,2349,323,2303,317,2291,405,2231,486,2157,547,2145,649,2094,702,2047,766,1963,1035,1820,1289,1621,1383,1518,1483,1375,1565,1192,1606,1019,1616,846,1586,684,1556,602,1505,511,1401,387,1315,320,1198,260,1056,209,883,172,638,51,516,11,440,25,318,0,206,6,110,32,3,94,-58,111,-99,106,-101,73,-114,57,-150,61,-201,101,-241,96,-277,107,-303,134,-307,191,-389,209,-429,228,-470,213,-516,214,-587,267,-607,272,-643,263,-656,251,-662,221,-679,203,-729,198,-763,216,-786,246,-785,340,-943,341,-1045,377,-1126,426,-1152,421,-1192,392,-1218,392,-1249,414,-1267,470,-1284,489,-1304,487,-1345,452,-1377,440,-1426,458,-1458,506,-1463,587,-1480,643,-1543,647,-1571,679,-1566,724,-1531,780,-1515,836,-1482,889,-1431,920,-1370,941,-1304,995,-1152,1042,-1091,1128,-1045,1148,-984,1143,-956,1228,-958,1279,-1001,1370,-1021,1457,-1022,1675,-1e3,1996,-971,2082,-926,2138,-1004,2141,-1167,2197,-1289,2258,-1380,2339,-1452,2335,-1508,2354,-1574,2414,-1611,2509,-1616,2611,-1606,2667,-1576,2743,-1545,2789,-1462,2847,-1421,2857,-1360,2855,-1248,2959,-1125,3018,-1126,3024,-1167,3015,-1263,3022,-1370,3061,-1441,3113,-1463,3140,-1474,3186,-1464,3226,-1436,3263,-1284,3362,-872,3458,-765,3499,-714,3534,-663,3555,-613,3559,-541,3539,-514,3577,-490,3638,-478,3638,-460,3617,-424,3612,-402,3654,-396,3694,-380,3715,-353,3731,-328,3723,-315,3735,-301,3776,-315,3852,-294,3908,-272,3935,-241,3950,-190,3951,-160,4002,-114,4047,-79,4068,-33,4083],holes:[]}]},pisces:{sign:"pisces",aspect:1.029456,edgeColor:"#886431",textureBox:{u0:.059105,u1:.940077,v0:.071764,v1:.929054},shapes:[{outer:[19,4094,64,4096,112,4082,217,4011,272,3927,321,3779,312,3698,272,3626,238,3535,188,3480,155,3470,110,3439,50,3361,126,3375,174,3398,284,3385,351,3412,389,3384,523,3399,700,3379,982,3307,1226,3189,1326,3168,1512,3107,1651,3029,1799,2927,1857,2903,1890,2901,1897,2885,1891,2861,1833,2844,1831,2837,1996,2675,2069,2589,2103,2531,2081,2512,2033,2525,2031,2517,2092,2350,2093,2297,2068,2283,2102,2149,2108,2072,2097,2034,2076,2020,2060,2034,2059,2063,2043,2098,2029,2102,2010,2087,2036,1905,2031,1819,2011,1733,1978,1652,1943,1630,1934,1652,1950,1709,1917,1757,1921,1661,1892,1484,1844,1322,1801,1255,1775,1238,1760,1245,1771,1325,1761,1305,1732,1300,1708,1279,1679,1241,1647,1174,1559,1064,1500,916,1468,882,1433,877,1430,911,1422,918,1331,846,1254,838,1221,822,1140,736,1120,741,1097,770,1001,714,948,699,935,720,939,754,886,745,791,694,775,705,792,739,786,746,542,722,341,678,217,617,168,571,138,524,129,490,132,433,84,433,81,418,99,385,83,376,64,378,21,401,-15,337,-20,275,-14,227,20,165,55,130,102,114,145,127,153,184,143,213,150,225,177,218,218,165,224,103,209,65,160,20,93,0,45,2,-27,25,-103,63,-223,144,-354,261,-392,313,-411,356,-421,423,-440,442,-444,481,-433,551,-447,559,-591,570,-616,591,-622,605,-599,619,-607,638,-600,659,-696,671,-763,694,-805,724,-841,772,-837,796,-825,806,-782,770,-715,765,-668,791,-643,821,-806,847,-964,895,-1097,952,-1246,1032,-1389,1033,-1475,1053,-1532,1081,-1558,1107,-1553,1126,-1489,1113,-1451,1120,-1430,1140,-1437,1177,-1604,1268,-1724,1363,-1796,1446,-1811,1480,-1800,1491,-1743,1485,-1731,1494,-1771,1529,-1934,1616,-2025,1679,-2084,1752,-2108,1824,-2103,1886,-2077,1912,-2032,1838,-1996,1812,-1960,1805,-2074,2010,-2089,2111,-2064,2192,-2020,2213,-2009,2201,-2022,2115,-2008,2077,-1972,2042,-1924,2056,-1881,2108,-1850,2120,-1908,2211,-1945,2311,-1964,2416,-1959,2517,-1940,2589,-1910,2614,-1884,2603,-1889,2517,-1881,2496,-1857,2500,-1810,2560,-1755,2765,-1756,2837,-1783,2918,-1762,2919,-1704,2878,-1628,2907,-1598,2952,-1597,3024,-1575,3030,-1542,3007,-1498,3047,-1434,3138,-1402,3215,-1394,3261,-1379,3265,-1368,3258,-1341,3198,-1314,3200,-1244,3286,-1207,3387,-1193,3391,-1160,3343,-1131,3327,-1069,3428,-1054,3427,-1031,3405,-1007,3404,-987,3415,-895,3521,-858,3609,-849,3612,-832,3592,-818,3530,-792,3492,-753,3475,-677,3485,-605,3509,-251,3667,-170,3715,-70,3814,-32,3833,7,3815,21,3819,57,3850,81,3889,90,3917,91,3970,71,4032,10,4075,8,4085],holes:[[-443,3096,-538,3063,-605,3020,-664,2961,-726,2880,-732,2861,-596,2887,-557,2868,-462,2862,-414,2843,-361,2797,-341,2761,-340,2727,-357,2706,-380,2706,-401,2751,-447,2773,-476,2773,-533,2763,-603,2722,-605,2709,-572,2696,-561,2684,-561,2670,-658,2637,-701,2610,-774,2536,-817,2464,-831,2421,-832,2369,-808,2254,-782,2213,-725,2251,-715,2235,-726,2216,-715,2212,-660,2326,-631,2364,-586,2390,-543,2385,-527,2364,-569,2292,-574,2211,-555,2144,-522,2072,-455,1991,-436,1953,-418,1891,-406,1771,-392,1723,-366,1699,-223,1648,-132,1607,-32,1587,45,1559,83,1577,102,1577,137,1542,139,1513,174,1487,236,1468,308,1468,346,1458,372,1441,389,1406,470,1394,501,1355,506,1322,470,1273,432,1267,418,1254,375,1172,594,1288,642,1325,750,1437,821,1542,854,1609,859,1656,853,1666,791,1669,729,1688,702,1714,693,1733,696,1752,786,1765,831,1795,837,1833,912,1934,917,1996,908,2025,800,2171,792,2072,750,2005,709,1975,666,1965,623,1922,585,1904,556,1903,523,1917,508,1934,507,1958,518,1968,561,1977,577,1996,582,2053,563,2134,515,2235,490,2271,470,2256,462,2259,452,2326,436,2364,431,2431,463,2569,368,2660,313,2745,267,2775,152,2914,102,2959,59,2967,57,2938,88,2875,133,2842,133,2823,112,2802,78,2788,40,2792,-32,2830,-86,2890,-127,2969,-146,2945,-197,3014,-247,3058,-337,3096]]},{outer:[484,3592,528,3585,553,3549,549,3516,518,3480,466,3485,435,3525,445,3568],holes:[]},{outer:[673,3535,714,3528,733,3510,744,3482,739,3449,705,3418,657,3418,617,3463,626,3506,647,3527],holes:[]},{outer:[-454,2130,-414,2127,-399,2106,-397,2077,-428,2042,-452,2041,-483,2072,-478,2106],holes:[]},{outer:[410,2120,451,2116,481,2087,491,2063,477,2020,437,1994,408,1994,380,2009,360,2048,368,2091],holes:[]},{outer:[420,1656,451,1658,475,1648,501,1623,515,1590,506,1537,461,1507,427,1506,399,1521,368,1566,374,1623],holes:[]},{outer:[281,1580,313,1580,329,1566,339,1547,339,1518,313,1487,265,1473,235,1494,229,1537,241,1562],holes:[]}]}}};var{quant:Oa,rowSize:n0,heroSize:i0}=xc;function Ba(i,t){let e=new ps(i);return e.colorSpace=ye,e.anisotropy=Math.min(8,t.capabilities.getMaxAnisotropy()),e.needsUpdate=!0,e}function s0(i,t){let e=new Me(i);return e.colorSpace=ye,e.anisotropy=Math.min(8,t.capabilities.getMaxAnisotropy()),e.generateMipmaps=!0,e.minFilter=sn,e.needsUpdate=!0,e}function r0(){let i=document.createElement("canvas");i.width=128,i.height=128;let t=i.getContext("2d"),e=t.createRadialGradient(64,64,2,64,64,62);return e.addColorStop(0,"rgba(0,0,0,0.76)"),e.addColorStop(.45,"rgba(0,0,0,0.34)"),e.addColorStop(1,"rgba(0,0,0,0)"),t.fillStyle=e,t.fillRect(0,0,128,128),i}function a0(){let i=document.createElement("canvas");i.width=512,i.height=128;let t=i.getContext("2d"),e=t.createLinearGradient(0,0,0,128);e.addColorStop(0,"rgba(10,12,17,0)"),e.addColorStop(.42,"rgba(23,28,40,0.5)"),e.addColorStop(.62,"rgba(15,18,27,0.38)"),e.addColorStop(1,"rgba(6,7,9,0)"),t.fillStyle=e,t.fillRect(0,0,512,128);let n=t.createLinearGradient(0,0,512,0);return n.addColorStop(0,"rgba(6,7,9,1)"),n.addColorStop(.22,"rgba(6,7,9,0)"),n.addColorStop(.78,"rgba(6,7,9,0)"),n.addColorStop(1,"rgba(6,7,9,1)"),t.globalCompositeOperation="destination-out",t.fillStyle=n,t.fillRect(0,0,512,128),i}function Vh(i,t){let e=new t;e.moveTo(i[0]/Oa,i[1]/Oa);for(let n=2;n<i.length;n+=2)e.lineTo(i[n]/Oa,i[n+1]/Oa);return e.closePath(),e}function o0(i){let{u0:t,u1:e,v0:n,v1:s}=i.textureBox,r=i.aspect/2,a=(h,u)=>new gt(t+(h+r)/i.aspect*(e-t),n+u*(s-n)),o={generateTopUV(h,u,d,p,m){return[d,p,m].map(v=>a(u[v*3],u[v*3+1]))},generateSideWallUV(h,u,d,p,m,v){return[d,p,m,v].map(g=>new gt(u[g*3]+r,u[g*3+1]))}},c=i.shapes.map(({outer:h,holes:u})=>{let d=Vh(h,Ni);return d.holes=u.map(p=>Vh(p,Qn)),d}),l=new Ts(c,{depth:ue.depth,bevelEnabled:!1,curveSegments:1,steps:1,UVGenerator:o});return l.computeVertexNormals(),c0(l)}function c0(i){let t=i.getAttribute("position"),e=t.count/3,n=ue.depth*.01,s=o=>{let c=!0,l=!0;for(let h=0;h<3;h+=1){let u=t.getZ(o*3+h);Math.abs(u-ue.depth)>n&&(c=!1),Math.abs(u)>n&&(l=!1)}return c?0:l?1:2};i.clearGroups();let r=0,a=s(0);for(let o=1;o<=e;o+=1){let c=o<e?s(o):-1;c!==a&&(i.addGroup(r*3,(o-r)*3,a),r=o,a=c)}return i}function Hh(i,t){let e=new Ua({canvas:i,antialias:!0,alpha:!0,powerPreference:"high-performance"});e.setClearAlpha(0);let n=new fs,s=new _e(Je.radToDeg(Be.fov),1,.1,200);n.add(new As(4015969,395019,1.05));let r=new ei(15921380,.9);r.position.set(2.2,4.4,5.6),n.add(r);let a=new ei(9348815,.32);a.position.set(-4.6,1.2,2.8),n.add(a);let o=new ei(12374256,.28);o.position.set(-1.4,2.2,-5.2),n.add(o);let c=new Cs(15985366,7,9,2);n.add(c);let l=Ga(),h=new ge(new Nn(44,8),new Dn({map:Ba(a0(),e),transparent:!0,depthWrite:!1}));h.rotation.x=-Math.PI/2,h.position.set(0,l-.002,-.5),n.add(h);let u=Ba(r0(),e),d=new _s(ue.plinthRadius,ue.plinthRadius*1.06,ue.plinthHeight,40,1,!1),p=new Nn(2.3,2.3),m=new _n({color:1316900,roughness:.82,metalness:0,transparent:!0}),v=[d,p,u,m,h.geometry,h.material,h.material.map],g=t.map(it=>{let rt=xc.figures[it.slug],_t=wc(rt.aspect),bt=new $t(rt.edgeColor),Dt=new _n({color:bt,roughness:.62,metalness:.18,transparent:!0,alphaTest:.3}),Ut=new _n({map:Ba(zh(it,rt.edgeColor),e),roughness:.7,metalness:.14,transparent:!0}),Z=new _n({color:bt.clone().multiplyScalar(.045),roughness:.94,metalness:0,transparent:!0}),j=new ge(o0(rt),[Dt,Ut,Z]);j.scale.setScalar(_t),n.add(j);let pt=new ge(d,[new _n({map:Ba(Bh(it),e),roughness:.88,metalness:0,transparent:!0}),m,m]);n.add(pt);let vt=new ge(p,new Dn({map:u,transparent:!0,depthWrite:!1,opacity:.8}));vt.rotation.x=-Math.PI/2,n.add(vt);let ht=new Un(rt.aspect,1,ue.depth);ht.translate(0,.5,ue.depth/2);let Lt=new ge(ht,m);return Lt.scale.setScalar(_t),v.push(j.geometry,Dt,Ut,Ut.map,Z,pt.material[0],pt.material[0].map,vt.material,ht),{record:it,mesh:j,plinth:pt,shadow:vt,proxy:Lt,scale:_t,face:Dt,aspect:rt.aspect,materials:[Dt,Ut,Z],tier:0}}),f=new Is,w=new gt,E=new D(0,-Math.sin(Be.tilt),-Math.cos(Be.tilt)),M=new D(1,0,0),I=new D(0,Math.cos(Be.tilt),-Math.sin(Be.tilt)),C=new D,P={width:1,height:1},U={row:null,stage:null},S=it=>U[it]??{x:0,y:0,width:P.width,height:P.height};function x(it,rt){U={row:it,stage:rt}}function A(it,rt,_t){let bt=Uc(Lc(),Dc(rt.scale,rt.aspect),it),Dt=Nc(S("row"),S("stage"),it),Ut=Je.lerp(Be.rowMargin,Be.stageMargin,it)-_t*Be.zoomGain*it,Z=Fc({canvasWidth:P.width,canvasHeight:P.height,rect:Dt,content:bt,margin:Ut});C.set(0,bt.centerY,bt.centerZ).addScaledVector(M,Z.panX).addScaledVector(I,Z.panY),s.position.copy(C).addScaledVector(E,-Z.distance),s.lookAt(C)}function N(it){let{focus:rt,openIndex:_t,open:bt,yaw:Dt,pitch:Ut,zoom:Z}=it,j=g[_t]??g[Math.min(g.length-1,Math.max(0,Math.round(rt)))],pt={x:0,y:-j.scale/2,z:Be.stageZ},vt=1-bt*.94;for(let Lt=0;Lt<g.length;Lt+=1){let Ot=g[Lt],T=Wa(Lt,rt,ue),tt=Pc(Lt,rt)||bt>0&&Lt===_t;if(Ot.mesh.visible=tt,Ot.plinth.visible=tt,Ot.shadow.visible=tt,!tt)continue;let Q=Lt===_t?bt:0,R=Lt===_t?0:bt*.6,{scale:z}=Ot;Ot.mesh.position.set(Je.lerp(T.x,pt.x,Q),Je.lerp(T.y,pt.y,Q),Je.lerp(T.z-R,pt.z,Q)),Ot.mesh.rotation.set(Ut*Q,Je.lerp(T.rotationY,Dt,Q),0),Ot.mesh.scale.setScalar(z),Ot.proxy.position.copy(Ot.mesh.position),Ot.proxy.rotation.copy(Ot.mesh.rotation),Ot.proxy.scale.setScalar(z),Ot.proxy.updateMatrixWorld(!0);let $=Lt===_t?1:vt;for(let K of Ot.materials)K.opacity=$;Ot.plinth.position.set(T.x,T.y-ue.plinthHeight/2,T.z),Ot.plinth.rotation.y=T.rotationY,Ot.plinth.material[0].opacity=$*(1-Q*.75),m.opacity=vt,Ot.shadow.position.set(T.x,l+.004,T.z+.05),Ot.shadow.rotation.z=T.rotationY,Ot.shadow.material.opacity=.8*(1-Q*.7)*(Lt===_t?1:vt),Ot.shadow.scale.setScalar(1+T.prominence*.1)}let ht=Wa(Math.round(rt),rt,ue);c.position.set(Je.lerp(ht.x*.5,pt.x,bt),Je.lerp(ue.baseY+1.5,pt.y+j.scale*.9,bt),Je.lerp(ht.z+2.6,pt.z+1.8,bt)),c.intensity=7-bt*2.6,A(bt,j,Z)}async function k(it,rt){let _t=g[it];if(!_t||_t.tier>=rt)return!1;let bt=await kh(_t.record.slug,rt);if(!bt||_t.tier>=rt)return!1;let Dt=s0(bt,e),Ut=_t.face.map;return _t.face.map=Dt,_t.face.color.set(16777215),_t.face.needsUpdate=!0,_t.tier=rt,Ut?.dispose(),v.push(Dt),!0}async function G(it,rt){let _t=g.map((bt,Dt)=>Dt).sort((bt,Dt)=>Math.abs(bt-it)-Math.abs(Dt-it));for(let bt of _t)await k(bt,n0)&&rt?.()}let V=it=>k(it,i0);function q(it,rt,_t){P={width:it,height:rt},e.setPixelRatio(Math.min(2,_t)),e.setSize(it,rt,!1),s.aspect=it/rt,s.updateProjectionMatrix()}function nt(it,rt){let _t=e.domElement.getBoundingClientRect();w.x=(it-_t.left)/_t.width*2-1,w.y=-((rt-_t.top)/_t.height)*2+1,f.setFromCamera(w,s);let bt=g.filter(Ut=>Ut.mesh.visible).map(Ut=>Ut.proxy),Dt=f.intersectObjects(bt,!1)[0];return Dt?g.findIndex(Ut=>Ut.proxy===Dt.object):-1}function X(){e.render(n,s)}function ot(){for(let it of new Set(v))it?.dispose?.();e.dispose()}return{layout:N,render:X,resize:q,setBands:x,pick:nt,dressRow:G,refine:V,dispose:ot,renderer:e}}var l0="/registry/zodiacs.registry.json",h0="So11111111111111111111111111111111111111112",u0="https://api.dexscreener.com/latest/dex/pairs/";function vc(i,t,e){let n=new AbortController,s=window.setTimeout(()=>n.abort(),t);return fetch(i,{...e,signal:n.signal}).finally(()=>window.clearTimeout(s))}var za=null;function Gh(){return za||(za=vc(l0,12e3,{cache:"no-store"}).then(i=>{if(!i.ok)throw new Error(`registry ${i.status}`);return i.json()}).catch(i=>{throw za=null,i})),za}var ka=new Map;function qh(i,t){return ka.has(i)||ka.set(i,t().catch(e=>{throw ka.delete(i),e})),ka.get(i)}function d0(i){let t=u0+`${encodeURIComponent(i.chainId)}/${encodeURIComponent(i.pairId)}`;return qh(`${i.chainId}:${i.pairId}`,()=>vc(t,8e3).then(e=>{if(!e.ok)throw new Error(`market ${e.status}`);return e.json()}).then(e=>{let n=e&&e.pairs&&e.pairs[0];if(!n)throw new Error("market: pair not indexed");return n}))}function f0(i){let t=`https://api.dexscreener.com/tokens/v1/solana/${encodeURIComponent(i)}`;return qh(`tokens:solana:${i}`,()=>vc(t,8e3).then(e=>{if(!e.ok)throw new Error(`market ${e.status}`);return e.json()}).then(e=>{let n=Array.isArray(e)?e:e&&e.pairs;if(!Array.isArray(n))throw new Error("market: malformed");let s=null,r=-1;for(let a of n){if(!a||!a.pairAddress||!a.baseToken||a.baseToken.address!==i)continue;let o=Number(a.liquidity&&a.liquidity.usd)||0;o>r&&(r=o,s=a)}if(!s)throw new Error("market: token not indexed");return s}))}function p0(i){let t=Number(i);if(!Number.isFinite(t))return"\u2014";let e=Math.abs(t)<1e-4?8:Math.abs(t)<.01?6:4;return`$${t.toFixed(e).replace(/0+$/,"").replace(/\.$/,"")}`}function Wh(i){let t=Number(i);if(!Number.isFinite(t))return"\u2014";let e=Math.abs(t);return e>=1e9?`$${(t/1e9).toLocaleString(void 0,{maximumFractionDigits:1})}B`:e>=1e6?`$${(t/1e6).toLocaleString(void 0,{maximumFractionDigits:1})}M`:e>=1e3?`$${(t/1e3).toLocaleString(void 0,{maximumFractionDigits:1})}K`:`$${t.toLocaleString(void 0,{maximumFractionDigits:2})}`}function m0(i){let t=Number(i);return Number.isFinite(t)?`${t>0?"+":""}${t.toLocaleString(void 0,{minimumFractionDigits:2,maximumFractionDigits:2})}%`:"\u2014"}function Xh(i){return i.length>16?`${i.slice(0,6)}\u2026${i.slice(-6)}`:i}var g0={solana:{name:"Solana",role:"Native \xB7 SPL"},base:{name:"Base",role:"Official representation \xB7 ERC-20"}};function _0(i){let t=g0[i.chain]??{name:i.chain,role:i.tokenStandard},e=document.createElement("div");e.className="rec";let n=document.createElement("div");n.className="rec__head";let s=document.createElement("span");s.className="rec__chain",s.textContent=t.name;let r=document.createElement("span");r.className="rec__role",r.textContent=t.role,n.append(s,r);let a=document.createElement("button");a.type="button",a.className="rec__addr",a.title=i.address;let o=document.createElement("span");o.className="rec__value",o.textContent=Xh(i.address);let c=document.createElement("span");c.className="rec__copy",c.textContent="Copy",a.append(o,c),a.setAttribute("aria-label",`Copy the ${t.name} address, ${i.address}`);let l=0;return a.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(i.address),c.textContent="Copied"}catch{c.textContent="Press \u2318C";let h=document.createRange();h.selectNodeContents(o);let u=window.getSelection();u?.removeAllRanges(),u?.addRange(h),o.textContent=i.address}window.clearTimeout(l),l=window.setTimeout(()=>{c.textContent="Copy",o.textContent=Xh(i.address)},2200)}),e.append(n,a),e}function Yh(i,{onClose:t}){let e=i.querySelector("[data-gallery-card]"),n=e.querySelector("[data-card-lot]"),s=e.querySelector("[data-card-name]"),r=e.querySelector("[data-card-figure]"),a=e.querySelector("[data-card-facts]"),o=e.querySelector("[data-card-records]"),c=e.querySelector("[data-card-entry]"),l=e.querySelector("[data-gallery-close]"),h=e.querySelector("[data-market-state]"),u=e.querySelector("[data-market-price-row]"),d=e.querySelector("[data-market-price]"),p=e.querySelector("[data-market-change]"),m=e.querySelector("[data-market-cta]"),v=e.querySelector("[data-market-jupiter]"),g=e.querySelector("[data-market-dexscreener]"),f=e.querySelector("[data-market-grid]");l.addEventListener("click",()=>t());let w=0;function E(x,A){let N=document.createElement("dt");N.textContent=x;let k=document.createElement("dd");k.textContent=A,a.append(N,k)}function M(x,A){let N=document.createElement("dt");N.textContent=x;let k=document.createElement("dd");k.textContent=A,f.append(N,k)}async function I(x){let N=(await Gh()).assets.find(G=>G.sign===x),k=N&&N.native&&N.native.address;if(!k)throw new Error("registry: sign not found");return k}async function C(x,A){try{let N=x.market?await d0(x.market):await f0(await I(x.slug));if(A!==w)return;d.textContent=p0(N.priceUsd);let k=Number(N.priceChange&&N.priceChange.h24);p.textContent=m0(k),p.classList.toggle("card__price-change--up",Number.isFinite(k)&&k>0),p.classList.toggle("card__price-change--down",Number.isFinite(k)&&k<0),f.replaceChildren(),M("Liquidity",Wh(N.liquidity&&N.liquidity.usd)),M("Market cap",Wh(N.marketCap??N.fdv)),h.hidden=!0,u.hidden=!1,f.hidden=!1}catch{if(A!==w)return;h.textContent="Market context unavailable."}}async function P(x,A){o.replaceChildren();let N=document.createElement("p");N.className="rec__note",N.textContent="Reading the registry\u2026",o.append(N);try{let k=await Gh();if(A!==w)return;let G=k.assets.find(nt=>nt.sign===x.slug);if(!G)throw new Error("sign not in registry");let V=new Map;for(let nt of[G.native,...G.representations]){let X=`${nt.chain}:${nt.address}`;V.has(X)||V.set(X,nt)}o.replaceChildren(...[...V.values()].map(_0));let q=G.native.address;v.href=`https://jup.ag/swap/${h0}-${q}`,v.setAttribute("aria-label",`Open the Jupiter route for ${x.name} \u2014 independent third-party venue`),g.href=x.market?`https://dexscreener.com/${x.market.chainId}/${x.market.pairId}`:`https://dexscreener.com/search?q=${q}`,m.hidden=!1}catch{if(A!==w)return;N.textContent="Records unavailable offline.",o.replaceChildren(N)}}function U(x){w+=1,e.style.setProperty("--sign",x.hue),n.textContent=`Lot ${x.lot} of XII \xB7 N\xBA ${String(x.order).padStart(2,"0")} of 12`,s.textContent=x.name,r.textContent=x.epithet,h.hidden=!1,h.textContent="Loading market context.",u.hidden=!0,p.classList.remove("card__price-change--up","card__price-change--down"),f.hidden=!0,m.hidden=!0,v.removeAttribute("href"),g.removeAttribute("href"),a.replaceChildren(),E("Classification",`${x.modality} ${x.element.toLowerCase()}`),E("Ruling planet",x.ruler),E("Dates",x.dates),E("Archetype",x.archetype),E("Principal star",x.star),c.href=`/registry/${x.slug}/`,c.setAttribute("aria-label",`Open the ${x.name} catalogue entry`),e.hidden=!1,requestAnimationFrame(()=>e.classList.add("is-open")),C(x,w),P(x,w)}function S(){w+=1;let x=w;e.classList.remove("is-open"),window.setTimeout(()=>{x===w&&(e.hidden=!0)},420)}return{open:U,close:S,element:e,closer:l}}var $h=document.querySelector("[data-gallery-stage]"),Zh=document.getElementById("gallery-figures");$h&&Zh&&v0($h,JSON.parse(Zh.textContent));function x0(){try{let i=document.createElement("canvas");return!!(i.getContext("webgl2")||i.getContext("webgl"))}catch{return!1}}async function v0(i,t){if(!x0())return;let e=t.length,n=i.querySelector("[data-gallery-canvas]"),s=i.querySelector("[data-gallery-rail]"),r=i.querySelector("[data-gallery-open]"),a=i.querySelector("[data-gallery-hint]"),o=i.querySelector("[data-gallery-live]"),c=window.matchMedia("(prefers-reduced-motion: reduce)"),l="Drag or scroll along the row. Select a sculpture to draw it forward, then drag to turn it. Escape returns it.",h="Drag to turn the sculpture. The rail walks along the twelve; Escape returns it to the row.";await Oh();let u=document.createElement("canvas");u.className="stage__canvas",u.setAttribute("aria-hidden","true"),n.append(u);let d;try{d=Hh(u,t)}catch{u.remove();return}let p=Ic(window.location.hash,t.map(R=>R.slug)),m={focus:p>=0?p:c.matches?0:-1.4,targetFocus:p>=0?p:0,open:0,targetOpen:0,openIndex:-1,yaw:0,targetYaw:0,pitch:0,targetPitch:0,zoom:0,targetZoom:0},v=Yh(i,{onClose:()=>Z()}),g=document.querySelector(".wnav"),f=i.querySelector(".stage__head"),w=i.querySelector(".stage__chrome"),E=20,M=140;function I(){let R=n.offsetWidth,z=n.offsetHeight,$=g?g.getBoundingClientRect().bottom+window.scrollY:84,K=f?f.offsetTop+f.offsetHeight:$,at=w?w.offsetTop:z,Nt=(st,J,wt,ft)=>({x:wt,y:st,width:Math.max(M,ft-wt),height:Math.max(M,J-st)}),zt=Nt(K+E,at-E,0,R),b=v.element.hidden?null:v.element;if(!b||!b.offsetWidth)return{row:zt,stage:zt};let _=$+E,Y=b.offsetLeft>R*.4?Nt(_,at-E,0,b.offsetLeft-E):Nt(_,b.offsetTop-E,0,R);return{row:zt,stage:Y}}function C(){let{row:R,stage:z}=I();d.setBands(R,z)}let P=.22,U=!1,S=0,x=0,A=!1;function N(){return Math.abs(m.focus-m.targetFocus)<5e-4&&Math.abs(m.open-m.targetOpen)<5e-4&&Math.abs(m.yaw-m.targetYaw)<5e-4&&Math.abs(m.pitch-m.targetPitch)<5e-4&&Math.abs(m.zoom-m.targetZoom)<5e-4}function k(R){let z=c.matches?200:9,$=c.matches?200:12;return m.focus=ui(m.focus,m.targetFocus,z,R),m.open=ui(m.open,m.targetOpen,c.matches?200:7.5,R),m.yaw=ui(m.yaw,m.targetYaw,$,R),m.pitch=ui(m.pitch,m.targetPitch,$,R),m.zoom=ui(m.zoom,m.targetZoom,$,R),N()?(m.focus=m.targetFocus,m.open=m.targetOpen,m.yaw=m.targetYaw,m.pitch=m.targetPitch,m.zoom=m.targetZoom,!1):!0}function G(R){if(A)return;let z=Math.min(.05,x?(R-x)/1e3:.016);x=R;let $=m.targetOpen===1&&m.open>.98&&!U&&!c.matches&&!ht;$&&(m.yaw+=P*z,m.targetYaw=m.yaw);let K=k(z)||$;d.layout(m),d.render(),S=K?requestAnimationFrame(G):0,K||(x=0)}function V(){A||S||(x=0,S=requestAnimationFrame(G))}let q=0;function nt(){window.clearTimeout(q),q=window.setTimeout(()=>{m.targetFocus=Hs(m.targetFocus,e),bt(),V()},140)}function X(R,{announce:z=!0}={}){m.targetFocus=Vn(R,e),window.clearTimeout(q),bt(),z&&rt(`${t[ot()].name}, Lot ${t[ot()].lot}`),V()}function ot(){return Hs(m.targetFocus,e)}let it=0;function rt(R){o&&(window.clearTimeout(it),it=window.setTimeout(()=>{o.textContent=R},220))}let _t=t[p>=0?p:0]?.slug??null;function bt(){let R=ot(),z=t[R];z.slug!==_t&&window.history?.replaceState&&(window.history.replaceState(null,"",`#${z.slug}`),_t=z.slug);let $=m.openIndex>=0;if(r&&(r.textContent=$?"Return the sculpture":`View ${z.name}`,r.setAttribute("aria-label",$?"Return the sculpture to the row":`View the ${z.name} sculpture`)),a){let K=$?h:l;a.textContent!==K&&(a.textContent=K)}for(let[K,at]of pt.entries()){let Nt=K===R;at.tabIndex=Nt?0:-1,at.setAttribute("aria-current",Nt?"true":"false")}s.scrollWidth>s.clientWidth&&pt[R]?.scrollIntoView({block:"nearest",inline:"center"})}async function Dt(R,{takeFocus:z=!0}={}){let $=t[R];U=!1,m.openIndex=R,m.targetOpen=1,m.targetYaw=0,m.targetPitch=0,m.targetZoom=0,i.classList.add("is-open"),v.open($),C(),bt(),rt(`${$.name} drawn forward. Lot ${$.lot} of twelve.`),V(),z&&v.closer.focus({preventScroll:!0}),await d.refine(R)&&V()}function Ut(R){X(R,{announce:m.targetOpen===0}),m.targetOpen>0&&R!==m.openIndex&&Dt(R,{takeFocus:!1})}function Z(){if(m.openIndex<0)return;let R=m.openIndex;m.targetOpen=0,m.targetYaw=Ac(m.yaw,0),m.targetPitch=0,m.targetZoom=0,i.classList.remove("is-open"),v.close(),window.setTimeout(()=>{m.targetOpen===0&&(m.openIndex=-1)},700),bt(),rt(`${t[R].name} returned to the row.`),pt[R]?.focus({preventScroll:!0}),V()}function j(R){m.openIndex>=0&&m.targetOpen>0?Z():Dt(R)}let pt=t.map((R,z)=>{let $=document.createElement("button");return $.type="button",$.className="rail__tick",$.style.setProperty("--sign",R.hue),$.dataset.index=String(z),$.tabIndex=z===0?0:-1,$.innerHTML='<span class="rail__glyph" aria-hidden="true"></span>',$.querySelector(".rail__glyph").textContent=R.glyph,$.setAttribute("aria-label",`${R.name}, Lot ${R.lot} of twelve`),$.addEventListener("click",()=>{ot()===z&&m.targetOpen===0?Dt(z):Ut(z)}),s.append($),$});s.addEventListener("keydown",R=>{let z={ArrowRight:1,ArrowLeft:-1,ArrowDown:1,ArrowUp:-1},$=null;if(R.key in z?$=ot()+z[R.key]:R.key==="Home"?$=0:R.key==="End"&&($=e-1),$===null)return;R.preventDefault();let K=Vn($,e);Ut(K),pt[K].focus({preventScroll:!0})}),r?.addEventListener("click",()=>j(ot())),document.addEventListener("keydown",R=>{R.key==="Escape"&&m.targetOpen>0&&(R.preventDefault(),Z())});let vt=new Map,ht=null,Lt=0;u.addEventListener("pointerdown",R=>{if(u.setPointerCapture(R.pointerId),vt.set(R.pointerId,{x:R.clientX,y:R.clientY}),vt.size===2){let[z,$]=[...vt.values()];Lt=Math.hypot(z.x-$.x,z.y-$.y),ht=null;return}ht={id:R.pointerId,startX:R.clientX,startY:R.clientY,lastX:R.clientX,lastY:R.clientY,focus:m.targetFocus,yaw:m.targetYaw,pitch:m.targetPitch,velocity:0,time:R.timeStamp,moved:!1}}),u.addEventListener("pointermove",R=>{if(vt.has(R.pointerId)&&vt.set(R.pointerId,{x:R.clientX,y:R.clientY}),vt.size===2&&Lt>0){let[K,at]=[...vt.values()],Nt=Math.hypot(K.x-at.x,K.y-at.y);m.targetZoom=Math.min(1,Math.max(0,m.targetZoom+(Nt-Lt)/320)),Lt=Nt,V();return}if(!ht||ht.id!==R.pointerId)return;let z=R.clientX-ht.startX,$=R.clientY-ht.startY;if(!(!ht.moved&&Math.hypot(z,$)<5)){if(ht.moved=!0,m.targetOpen>0)U=!0,m.targetYaw=ht.yaw+z/190,m.targetPitch=Math.max(-.44,Math.min(.44,ht.pitch+$/300));else{let K=u.clientWidth;m.targetFocus=Vn(ht.focus+Rc(z,K),e);let at=Math.max(1,R.timeStamp-ht.time);ht.velocity=(R.clientX-ht.lastX)/at,bt()}ht.lastX=R.clientX,ht.lastY=R.clientY,ht.time=R.timeStamp,V()}});function Ot(R){if(vt.delete(R.pointerId),vt.size<2&&(Lt=0),!ht||ht.id!==R.pointerId)return;let z=ht;if(ht=null,!z.moved){let K=d.pick(R.clientX,R.clientY);K>=0?m.targetOpen>0?Z():K===ot()?Dt(K):X(K):m.targetOpen>0&&Z();return}if(m.targetOpen>0)return;let $=c.matches?0:-z.velocity*1.8;m.targetFocus=Hs(Vn(m.targetFocus+$,e),e),bt(),rt(`${t[ot()].name}, Lot ${t[ot()].lot}`),V()}u.addEventListener("pointerup",Ot),u.addEventListener("pointercancel",Ot),u.addEventListener("wheel",R=>{if(m.targetOpen>0){R.preventDefault(),m.targetZoom=Math.min(1,Math.max(0,m.targetZoom-R.deltaY/900)),V();return}let z=R.deltaMode===1?16:R.deltaMode===2?u.clientHeight:1,$=Cc(R.deltaX*z,R.deltaY*z);if(!$)return;let K=m.targetFocus<=.002&&$<0,at=m.targetFocus>=e-1.002&&$>0;K||at||(R.preventDefault(),m.targetFocus=Vn(m.targetFocus+$,e),bt(),nt(),V())},{passive:!1});function T(){let R=n.getBoundingClientRect();!R.width||!R.height||(d.resize(R.width,R.height,window.devicePixelRatio||1),C(),V())}let tt=new ResizeObserver(T);tt.observe(n),tt.observe(v.element),T(),c.addEventListener?.("change",V),document.addEventListener("visibilitychange",()=>{document.hidden&&S?(cancelAnimationFrame(S),S=0,x=0):document.hidden||V()}),u.addEventListener("webglcontextlost",R=>{R.preventDefault(),S&&cancelAnimationFrame(S),S=0,i.classList.remove("is-ready","is-open"),v.close()});function Q(){A||(A=!0,S&&cancelAnimationFrame(S),tt.disconnect(),d.dispose())}window.addEventListener("pagehide",Q,{once:!0}),i.classList.add("is-ready"),p>=0&&window.scrollTo({top:0,behavior:"instant"}),bt(),V(),d.dressRow(0,V)}})();
