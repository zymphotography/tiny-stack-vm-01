import{mkdirSync as M,readFileSync as R,readdirSync as D,writeFileSync as W}from'node:fs';
const T={0:[0,0,0],1:[1,0,1],2:[4,0,1],3:[0,1,0],4:[0,1,2],5:[0,2,2],6:[0,2,3],7:[0,3,3],16:[0,2,1],17:[0,2,1],18:[0,2,1],19:[0,2,1],20:[0,2,1],21:[0,2,1],22:[0,2,1],23:[0,1,1],24:[0,2,1],25:[0,2,1],26:[0,2,1],27:[0,1,1],28:[0,2,1],29:[0,2,1],30:[0,2,1],32:[0,2,1],33:[0,2,1],34:[0,2,1],48:[2,0,0],49:[2,1,0],50:[2,1,0],51:[2,0,0],52:[0,0,0],64:[0,1,1],65:[0,2,0],80:[0,1,0],81:[0,1,0],82:[0,0,1],83:[0,1,0]};
function V(p,g){
const n=p.length,s=new Int32Array(256);let t=0;
const c=new Int32Array(64);let u=0;
const m=new Int32Array(256),o=new Uint8Array(65536);let l=0,q=0,x=0,k=0;
const E=e=>[o.subarray(0,l),e];
for(;;){
if(k==1e6)return E(10);
if(x<0||x>=n)return E(9);
const y=p[x],z=T[y];
if(z===undefined)return E(5);
const f=z[0];
if(x+f>=n)return E(9);
k++;
const j=x+1+f;
if(t<z[1])return E(2);
if(t-z[1]+z[2]>256)return E(3);
x=j;
switch(y){
case 0:return E(0);
case 1:s[t++]=(p[j-1]<<24)>>24;break;
case 2:s[t++]=p[j-4]|p[j-3]<<8|p[j-2]<<16|p[j-1]<<24;break;
case 3:t--;break;
case 4:s[t]=s[t-1];t++;break;
case 5:{const a=s[t-1];s[t-1]=s[t-2];s[t-2]=a;break;}
case 6:s[t]=s[t-2];t++;break;
case 7:{const a=s[t-3];s[t-3]=s[t-2];s[t-2]=s[t-1];s[t-1]=a;break;}
case 23:s[t-1]=-s[t-1]|0;break;
case 27:s[t-1]=~s[t-1];break;
case 16:case 17:case 18:case 19:case 20:case 21:case 22:case 24:case 25:case 26:case 28:case 29:case 30:case 32:case 33:case 34:{
const b=s[t-1],a=s[t-2];let v;
if(y==16)v=a+b|0;else if(y==17)v=a-b|0;else if(y==18)v=Math.imul(a,b);
else if(y==19){if(!b)return E(4);v=a/b|0;}
else if(y==20){if(!b)return E(4);v=a%b|0;}
else if(y==21){if(!b)return E(4);v=(a>>>0)/(b>>>0)|0;}
else if(y==22){if(!b)return E(4);v=(a>>>0)%(b>>>0)|0;}
else if(y==24)v=a&b;else if(y==25)v=a|b;else if(y==26)v=a^b;
else if(y==28)v=a<<(b&31);else if(y==29)v=a>>(b&31);else if(y==30)v=(a>>>(b&31))|0;
else if(y==32)v=a==b?1:0;else if(y==33)v=a<b?1:0;else v=(a>>>0)<(b>>>0)?1:0;
t-=2;s[t++]=v;break;}
case 48:case 49:case 50:{
const r=(p[j-2]|p[j-1]<<8)<<16>>16;
if(y==48){x=j+r;break;}
const v=s[--t];
if((y==49)==(v==0))x=j+r;
break;}
case 51:if(u==64)return E(7);c[u++]=j;x=p[j-2]|p[j-1]<<8;break;
case 52:if(!u)return E(8);x=c[--u];break;
case 64:{const a=s[t-1];if(a<0||a>255)return E(6);s[t-1]=m[a];break;}
case 65:{const a=s[t-1];if(a<0||a>255)return E(6);m[a]=s[t-2];t-=2;break;}
case 80:{const a=String(s[t-1]);if(l+a.length>65536)return E(11);t--;for(let i=0;i<a.length;i++)o[l++]=a.charCodeAt(i);break;}
case 81:if(l+1>65536)return E(11);o[l++]=s[--t]&255;break;
case 82:s[t++]=q<g.length?g[q++]:-1;break;
case 83:return E(s[--t]&255);
}}
}
const I=process.env.MAKEFUN_INPUT_DIR||'/input',O=process.env.MAKEFUN_OUTPUT_DIR||'/output';
for(const d of D(I).sort()){
const A=I+'/'+d,[b,e]=V(R(A+'/program.bin'),R(A+'/input.bin')),Q=O+'/'+d;
M(Q,{recursive:true});W(Q+'/stdout.bin',b);W(Q+'/exit.txt',''+e);
}
