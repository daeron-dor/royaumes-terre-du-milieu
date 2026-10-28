import {writeFileSync,mkdirSync} from 'node:fs';
import {scryptSync} from 'node:crypto';
import {FACTIONS,UNITS,roster,type Faction} from '../frontend/app/catalog.ts';
import {createCampaign,addPlayer,settle,act,rates,upgradeCost,BUILDINGS} from '../frontend/app/game.ts';
import {constructionMinutes} from '../frontend/app/building-progression.ts';
const now=1700000000000, fixtures:any[]=[];
for(const [f,data] of Object.entries(FACTIONS)){
 const [age,year]=data.windows[0];const names={1:'Premier',2:'Deuxième',3:'Troisième',4:'Quatrième'};
 const s=createCampaign('gm','GM',f as Faction,'Parité',`${names[age]} Âge · ${year}`,now);
 fixtures.push({kind:'create',faction:f,era:s.era,expected:structuredClone(s)});
 for(const level of [1,5,19,39]){const city=s.cities[0];for(const b of Object.keys(BUILDINGS))city.levels[b]=level;
 fixtures.push({kind:'rates',state:structuredClone(s),expected:rates(city,f as Faction)});
 for(const b of Object.keys(BUILDINGS))fixtures.push({kind:'cost',level,building:b,expected:upgradeCost(city,b),duration:constructionMinutes(level,b)*60000});}
 for(const unit of roster(f as Faction,s.period))fixtures.push({kind:'unit',id:unit.id,faction:f,expected:unit});
}
let s=createCampaign('gm','GM','gondor','Parité','Troisième Âge · 3018',now);addPlayer(s,'player','Joueur','rohan');Object.values(s.players).forEach(p=>Object.keys(p.wallet).forEach(k=>p.wallet[k]=1000000));
function step(user:string,a:any,time=now){const before=structuredClone(s);act(s,user,a,time);fixtures.push({kind:'action',user,action:a,now:time,state:before,expected:structuredClone(s)});}
const city=s.cities.find(c=>c.owner==='player')!,to=s.cities.filter(c=>c.owner==='player')[1];
step('player',{type:'upgrade',city:city.id,building:'barracks'});step('player',{type:'upgrade',city:city.id,building:'barracks'});step('player',{type:'cancelQueuedBuild',city:city.id,id:city.queue!.at(-1)!.id});step('player',{type:'upgrade',city:city.id,building:'barracks'});
const before=structuredClone(s);settle(s,now+86400000);fixtures.push({kind:'settle',now:now+86400000,state:before,expected:structuredClone(s)});
const time=now+86400000;
step('player',{type:'recruit',city:city.id,unit:'militia',count:3},time);step('gm',{type:'deliver',id:s.orders[0].id},time);
step('player',{type:'recruit',city:city.id,unit:'militia',count:2},time);step('gm',{type:'rejectOrder',id:s.orders[0].id},time);
step('player',{type:'transfer',city:city.id,to:to.id,unit:'militia',count:1},time);step('gm',{type:'loss',city:to.id,unit:'militia',count:1},time);
step('player',{type:'deposit',resource:'stone',amount:500},time);step('gm',{type:'reviewDeposit',id:s.deposits[0].id,accept:true},time);
step('player',{type:'deposit',resource:'gold',amount:50},time);step('gm',{type:'reviewDeposit',id:s.deposits[0].id,accept:false},time);
step('gm',{type:'legendary',enabled:true},time);step('gm',{type:'encounter',unit:'durins_bane',location:'Moria'},time);step('gm',{type:'defeatEncounter',id:s.encounters[0].id},time);
step('gm',{type:'period',age:3,year:3019},time);step('player',{type:'found',name:'Nouvelle cité'},time);
step('gm',{type:'balanceBuilding',id:'barracks',revision:0,value:{cost:{gold:123,wood:45,stone:23,iron:7,food:9},timePercent:175}},time);
step('gm',{type:'balanceUnit',id:'militia',revision:1,value:{cost:{gold:42,wood:2,stone:3,iron:4,food:5},stats:{attack:37,defense:22,hp:88,range:2,speed:6,morale:77}}},time);
step('gm',{type:'balanceFaction',id:'rohan',revision:2,value:{production:{gold:25,wood:10,stone:15,iron:20,food:30},stats:{attack:12,defense:5,hp:10,range:10,speed:20,morale:10},recruitGold:-10,upkeepFood:-15}},time);
step('player',{type:'recruit',city:city.id,unit:'militia',count:1},time);step('gm',{type:'rejectOrder',id:s.orders[0].id},time);
const beforeCustom=structuredClone(s);settle(s,time+12345678);fixtures.push({kind:'settle',now:time+12345678,state:beforeCustom,expected:structuredClone(s)});
for(const f of Object.keys(FACTIONS)){for(const u of UNITS)fixtures.push({kind:'unit',id:u.id,faction:f,balance:s.balance,expected:(await import('../frontend/app/faction-rules.ts')).factionUnit(u,f as Faction,s.balance)});}
for(const invalid of [{type:'legendary',enabled:true},{type:'deliver',id:s.orders[0].id},{type:'upgrade',city:s.cities[0].id,building:'farm'},{type:'recruit',city:city.id,unit:'militia',count:1.5},{type:'recruit',city:city.id,unit:'militia',count:-1},{type:'balanceBuilding',id:'keep',revision:3,value:null}])fixtures.push({kind:'invalid',state:s,user:'player',action:invalid,now:time});
mkdirSync('backend/src/test/resources',{recursive:true});writeFileSync('backend/src/test/resources/parity.json',JSON.stringify(fixtures));
const salt='0123456789abcdef0123456789abcdef',password='Mot de passe ﬁctif 123!';writeFileSync('backend/src/test/resources/scrypt.json',JSON.stringify({password,hash:salt+':'+scryptSync(password.normalize('NFKC'),salt,64,{N:16384,r:16,p:1,maxmem:67108864}).toString('hex')}));
console.log(`${fixtures.length} comparaisons générées depuis le moteur TypeScript.`);
