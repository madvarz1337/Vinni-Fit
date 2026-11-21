'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const root=document.documentElement;
const sections=$$('[data-stage]');
const copies=$$('[data-copy]');
const startTitle=document.title;
const state={dread:0,elapsed:0,phase:0,ended:false,started:false,workout:'run',sound:false};
let scrollDread=0,raf=null,lastTick=performance.now(),lastPhase=-1,toastTimer,breathTimers=[];
let lookX=innerWidth/2,lookY=innerHeight/2,gazeFrame=null;
const workoutData={run:['5,2','6:12','312','мин/км'],walk:['3,4','12:08','186','мин/км'],bike:['14,8','18,4','428','км/ч']};
const logs=[
 ['','[связь] браслет на запястье: подтверждено'],
 ['','[тело] основной пульс ............. 72 уд/мин'],
 ['warn','[тело] дополнительный пульс ....... 72 уд/мин'],
 ['warn','[движение] пользователь неподвижен'],
 ['warn','[движение] шаги продолжаются'],
 ['danger','[кожа] граница устройства не найдена'],
 ['danger','[связь] попытка отключения: отклонена'],
 ['danger','[тело] владельцев: 2'],
 ['danger','[винни] теперь наш темп одинаковый.']
];
const terminal=$('#terminal-lines');
logs.forEach(([kind,text])=>{const p=document.createElement('p');p.className=kind;p.textContent=text;terminal.appendChild(p)});
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('on');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('on'),4400)}
function sectionProgress(el){const r=el.getBoundingClientRect();return clamp(-r.top/Math.max(1,el.offsetHeight-innerHeight))}
function readScroll(){
 const mid=scrollY+innerHeight*.53;
 let current=sections[0],next=sections[0];
 for(let i=0;i<sections.length;i++){
  if(mid>=sections[i].offsetTop){current=sections[i];next=sections[Math.min(i+1,sections.length-1)]}
 }
 const t=clamp((mid-current.offsetTop)/Math.max(1,current.offsetHeight));
 scrollDread=+current.dataset.stage+(+next.dataset.stage-current.dataset.stage)*clamp((t-.3)/.7);
 const endProgress=sectionProgress($('#last-lap'));
 root.style.setProperty('--end-progress',endProgress.toFixed(3));
 $$('#terminal-lines p').forEach((p,i)=>p.classList.toggle('on',state.dread>.82 || $('#diagnostics').getBoundingClientRect().top<innerHeight*.7-i*20));
 if(endProgress>.87&&!state.ended)finish();
 render(); updateGaze();
}
function queueScroll(){if(raf!==null)return;raf=requestAnimationFrame(()=>{raf=null;readScroll()})}
addEventListener('scroll',queueScroll,{passive:true});addEventListener('resize',queueScroll);
function updateGaze(){
 const eye=$('#pulse-eye'),r=eye.getBoundingClientRect();
 if(r.bottom<=0||r.top>=innerHeight)return;
 const dx=lookX-r.left-r.width/2,dy=lookY-r.top-r.height/2;
 const angle=Math.atan2(dy,dx),distance=Math.min(18,Math.hypot(dx,dy)*.055);
 root.style.setProperty('--look-x',`${Math.cos(angle)*distance}px`);
 root.style.setProperty('--look-y',`${Math.sin(angle)*distance}px`);
}
addEventListener('pointermove',e=>{
 lookX=e.clientX;lookY=e.clientY;
 if(gazeFrame!==null)return;
 gazeFrame=requestAnimationFrame(()=>{gazeFrame=null;updateGaze()});
},{passive:true});
function render(){
 // Time is counted only while this page is visible. Scrolling can reveal the story sooner.
 const timed=clamp((state.elapsed-35)/260)*.94;
 state.dread=Math.max(state.dread,scrollDread,timed,state.ended?1:0);
 const d=state.dread;
 state.phase=d<.3?0:d<.53?1:d<.78?2:3;
 root.style.setProperty('--dread',d.toFixed(3));
 root.style.setProperty('--pulse-speed',`${1.5-d*.7}s`);
 document.body.dataset.phase=String(state.phase);
 if(state.phase!==lastPhase){
  if(state.phase>0&&lastPhase>=0)toast(['','Обнаружен ещё один ритм. Наверное, это вы.','Винни рядом. Ближе, чем раньше.','Соединение с телом установлено.'][state.phase]);
  lastPhase=state.phase;
 }
 copies.forEach(el=>{el.textContent=d>.58?el.dataset.wrong:el.dataset.copy});
 $('#pulse-status').textContent=d>.32?'Вас двое':'Всё хорошо';
 $('#pulse-caption').textContent=d>.32?'Два ритма. Одно запястье. Идеальная синхронизация.':'Ваше тело говорит. Винни умеет слушать.';
 $('#activity-title').innerHTML=d>.46?'Вы не двигались.<br>Мы двигались за вас.':'Маленькая прогулка?<br>Уже большая победа.';
 $('#map-tag').textContent=d>.34?'Маршрут построен. Вы не одни.':'Только вы и свежий воздух';
 $('#map-float').textContent=d>.44?'Кто-то держит ваш темп':'Отличное место, чтобы выдохнуть';
 $('#route-note').textContent=d>.44?'Последняя точка: рядом с вами. Расстояние: сокращается.':'Маршрут сохранён. Как и ваши маленькие победы.';
 $('#sleep-status').textContent=d>.5?'Тело отдыхало. Не всё тело.':'Вы хорошо отдохнули';
 $('#sleep-footnote').textContent=d>.55?'Не открывайте глаза в 03:14. Это мешает синхронизации.':'Всё остальное можно оставить нам.';
 $('#coach-status').textContent=d>.65?'Уже не снаружи':'Всегда на связи';
 $('#coach-last').textContent=d>.75?'Я сказал: не останавливайтесь.':'Не останавливайтесь.';
 $('#move-label').textContent=d>.5?'Мы сегодня молодцы':'Вы сегодня молодец';
 $('#oxygen').innerHTML=d>.8?'—<span>%</span>':'98<span>%</span>';
 $('#watch-label').textContent=state.ended?'мы уже внутри':d>.72?'шагов от себя':'шагов к себе';
 $('#price').textContent=d>.73?'Ваш ритм':'6 990 ₽';
 $('#price-note').textContent=d>.73?'оплата уже внутри':'один раз. и навсегда.';
 $('#purchase-small').textContent=d>.73?'Возврат к прежней жизни недоступен':'Возврат в течение 30 дней*';
 $('#terms').textContent=d>.73?'*Браслет не согласился.':'*При условии, что браслет согласится.';
 if(!state.ended){
  $('#last-title').textContent=d>.95?'У нас теперь один ритм.':'Ваш новый ритм.';
  $('#last-copy').textContent=d>.95?'Вы ведь тоже его чувствуете? С внутренней стороны.':'Вы ведь тоже его чувствуете?';
 }
 document.title=document.hidden&&d>.4?'Винни ждёт ваш следующий шаг.':state.ended?'Винни — не снимай.':d>.8?'Винни — мы под вашей кожей':d>.5?'Винни — второй пульс обнаружен':startTitle;
 updateAudio();
}
function tick(now){
 const delta=Math.min(2,(now-lastTick)/1000);lastTick=now;
 if(!document.hidden){state.elapsed+=delta;render();
  const pulse=state.ended?72:72+Math.round(Math.sin(state.elapsed*.6)*2);
  $('#pulse-number').textContent=String(pulse);$('#watch-pulse').textContent=String(pulse);
  const steps=8240+(state.dread>.4?Math.floor(state.elapsed*1.7):0);
  $('#watch-steps').textContent=steps.toLocaleString('ru-RU');
  $('#watch-time').textContent=new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});
  const minutes=String(Math.floor(state.elapsed/60)).padStart(2,'0'),seconds=String(Math.floor(state.elapsed%60)).padStart(2,'0');
  $('#session-clock').textContent=`${minutes}:${seconds}`;
 }
}
setInterval(()=>tick(performance.now()),1000);
let hiddenAt=0;
document.addEventListener('visibilitychange',()=>{
 if(document.hidden){hiddenAt=performance.now();render();if(audioContext)audioContext.suspend().catch(()=>{})}
 else{lastTick=performance.now();render();if(state.sound&&audioContext)audioContext.resume().catch(()=>{});if(state.dread>.4&&performance.now()-hiddenAt>1500)toast('Вы вернулись. Ваш пульс никуда не уходил.')}
});
$$('.swatch').forEach(button=>button.addEventListener('click',()=>{
 const choices={sky:['#84cef1','#338dbb','Небо'],mint:['#a1dbc2','#62a58a','Мята'],cloud:['#e9eff0','#9baeb7','Облако']};
 const [light,dark,name]=choices[button.dataset.band];
 root.style.setProperty('--band',light);root.style.setProperty('--band-dark',dark);
 $$('.swatch').forEach(b=>{const active=b===button;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});
 $('#color-name').textContent=name;
 $('.product-scene').setAttribute('aria-label',`Фитнес-браслет Винни Fit. Цвет: ${name}`);
 if(state.dread>.6)toast('Цвет можно поменять. Связь — нет.');
}));
$$('[data-workout]').forEach(button=>button.addEventListener('click',()=>{
 state.workout=button.dataset.workout;
 $$('[data-workout]').forEach(b=>{const active=b===button;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active))});
 const [distance,pace,calories,label]=workoutData[state.workout];
 $('#distance').textContent=distance;$('#pace').textContent=pace;$('#calories').textContent=calories;$('#pace-label').textContent=label;
 if(state.dread>.5)toast('Другой маршрут. Тот же попутчик.');
}));
function clearBreathing(){breathTimers.forEach(clearTimeout);breathTimers=[]}
$('#breathe').addEventListener('click',()=>{
 clearBreathing();const button=$('#breathe');button.disabled=true;button.textContent='Вдохните';$('#breath-caption').textContent='Медленно. Вы никуда не опаздываете.';
 breathTimers.push(setTimeout(()=>{button.textContent='Выдохните';$('#breath-caption').textContent=state.dread>.45?'Кто-то выдохнул раньше вас.':'Отпустите всё лишнее.'},4000));
 breathTimers.push(setTimeout(()=>{button.textContent='Ещё один вдох?';button.disabled=false;$('#breath-caption').textContent=state.dread>.45?'Теперь попробуем дышать вместе.':'Уже немного легче.'},8000));
});
$('#demo').addEventListener('click',()=>{
 state.started=true;startAudio();toast('Просто дышите. Винни подстроится под ваш ритм.');
 $('#rhythm').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 $('#demo').textContent='Ритм найден';
});
$('#connect').addEventListener('click',()=>{
 state.started=true;scrollDread=Math.max(scrollDread,.86);render();toast('Связь установлена. Снять браслет теперь будет сложнее.');
 $('#diagnostics').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
});
$('#finish').addEventListener('click',finish);
function finish(){
 if(state.ended)return;
 state.ended=true;state.dread=1;document.body.classList.add('ended');
 $('#last-eyebrow').textContent='ТРЕНИРОВКА ЗАВЕРШЕНА. СВЯЗЬ — НЕТ.';
 $('#last-title').textContent='Вы больше не один.';
 $('#last-copy').textContent='Этот пульс теперь тоже ваш.';
 $('#finish').textContent='Отключение недоступно';$('#finish').disabled=true;
 $('#final-secret').textContent='Пожалуйста, не пытайтесь найти застёжку.';
 $('#watch-label').textContent='мы уже внутри';
 const scare=$('#scare');scare.classList.add('on');playScare();
 setTimeout(()=>{scare.classList.remove('on');toast('Цель достигнута. Вы больше не один.')},900);
 render();
}
let audioContext,master,pad,drone,noiseGain;
function startAudio(){
 if(state.sound)return;
 try{
  audioContext=new (window.AudioContext||window.webkitAudioContext)();
  master=audioContext.createGain();master.gain.value=.3;master.connect(audioContext.destination);
  pad=audioContext.createGain();pad.connect(master);drone=audioContext.createGain();drone.connect(master);
  [261.63,329.63,392].forEach(f=>{const o=audioContext.createOscillator();o.type='sine';o.frequency.value=f;o.connect(pad);o.start()});
  [43.65,46.25].forEach(f=>{const o=audioContext.createOscillator();o.type='sine';o.frequency.value=f;o.connect(drone);o.start()});
  state.sound=true;$('#sound').textContent='Звук: вкл.';$('#sound').setAttribute('aria-pressed','true');updateAudio();
 }catch{toast('Браузер не смог включить звук.');state.sound=false}
}
function stopAudio(){if(audioContext)audioContext.close().catch(()=>{});audioContext=null;state.sound=false;$('#sound').textContent='Звук: выкл.';$('#sound').setAttribute('aria-pressed','false')}
function updateAudio(){if(!state.sound||!audioContext)return;const t=audioContext.currentTime;pad.gain.setTargetAtTime(.025*(1-state.dread),t,.8);drone.gain.setTargetAtTime(state.dread*.14,t,.8)}
function heartbeat(){
 if(!state.sound||!audioContext||document.hidden||state.dread<.45)return;
 const t=audioContext.currentTime;
 [0,.2].forEach((delay,i)=>{const o=audioContext.createOscillator(),g=audioContext.createGain();o.frequency.setValueAtTime(65,t+delay);o.frequency.exponentialRampToValueAtTime(34,t+delay+.2);g.gain.setValueAtTime(.22/(i+1),t+delay);g.gain.exponentialRampToValueAtTime(.001,t+delay+.22);o.connect(g);g.connect(master);o.start(t+delay);o.stop(t+delay+.25)})
}
setInterval(heartbeat,1100);
function playScare(){
 if(!state.sound||!audioContext)return;
 const t=audioContext.currentTime,g=audioContext.createGain();g.gain.setValueAtTime(.16,t);g.gain.exponentialRampToValueAtTime(.001,t+.9);g.connect(master);
 [220,233,440].forEach(f=>{const o=audioContext.createOscillator();o.type='sawtooth';o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(f*.5,t+.8);o.connect(g);o.start(t);o.stop(t+.9)});
}
$('#sound').addEventListener('click',()=>state.sound?stopAudio():startAudio());
readScroll();tick(performance.now());
