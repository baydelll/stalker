'use strict';
// All layout and typography are native HTML/CSS. The original full-page SVG is NOT displayed.
const screens=[...document.querySelectorAll('.screen')];let step=0,chatIndex=0,chat2Index=0,quizRound=0,quizErrors=0,darkRound=0,typing=false,typingDone=new Set(),cameraAsked=false,micAsked=false,clock=null,eyeClock=null,notifyClock=null;let audioContext;let panicClock=null,finalGlitchClock=null;let lastTick=0;
const $=s=>document.querySelector(s);const delay=ms=>new Promise(r=>setTimeout(r,ms));
const firstChat=[
 ['stalker','Ты сегодня прекрасно выглядишь.','10:23'],
 ['you','Кто вы?','10:23'],
 ['stalker','Неважно. Просто захотелось тебе написать.','10:24'],
 ['you','Откуда у вас мой номер?','10:24'],
 ['stalker','Не переживай. Я не чужой тебе человек. Просто ты меня пока не знаешь.','10:24'],
 ['you','Не пиши мне больше.','10:25'],
 ['stalker','Хорошо. Не хотел тебя пугать. Хорошего дня','10:25']
];
const secondChat=[
 ['stalker','Сегодня идёшь другой дорогой?','18:35'],
 ['stalker','Зря, там дольше','18:36'],
 ['stalker','Не бойся, я присмотрю за тобой','18:36']
];
const stalkerSound=new Audio('assets/stalker-notification.mp3');stalkerSound.preload='auto';
function chime(){if(stalkerSound.readyState>=2){try{stalkerSound.currentTime=0;stalkerSound.play().catch(()=>{});return}catch(e){}}try{audioContext??=new (window.AudioContext||window.webkitAudioContext)();if(audioContext.state==='suspended')audioContext.resume();const t=audioContext.currentTime;[1047,1318,1568].forEach((f,i)=>{let o=audioContext.createOscillator(),g=audioContext.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(.0001,t+i*.08);g.gain.exponentialRampToValueAtTime(.065,t+i*.08+.012);g.gain.exponentialRampToValueAtTime(.0001,t+i*.08+.25);o.connect(g).connect(audioContext.destination);o.start(t+i*.08);o.stop(t+i*.08+.26)})}catch(e){}}
function eyeStart(){clearInterval(eyeClock);let i=0;const imgs=['assets/eye_empty.png','assets/main_0.jpg','assets/eye_person.png'];eyeClock=setInterval(()=>{i=(i+1)%3;$('#eye').classList.remove('glitch');void $('#eye').offsetWidth;$('#eye').classList.add('glitch');$('#eyeImage').src=imgs[i]},620)}
function showStep(n){stopPhraseGlitch();if(n<0||n>=screens.length)return;clearInterval(clock);clearTimeout(notifyClock);clearInterval(panicClock);clearInterval(finalGlitchClock);$('#finalGlitch').textContent='найти его';screens[step].classList.remove('active');screens[11].classList.remove('door-time-over');step=n;screens[step].classList.add('active');if(step!==0)clearInterval(eyeClock);if(step===0)startIntro();if(step===1){chatIndex=0;$('#chatMessages').innerHTML='';$('#blockButton').classList.add('hidden')}if(step===4){chat2Index=0;$('#chatTwo').innerHTML='';$('#blockTwo').classList.add('hidden')}if(step===5){quizRound=0;quizErrors=0;renderQuiz()}if(step===14){darkRound=0;renderDark()}if(step===11)startDoorCountdown();if(step===16){startFinal();startFinalGlitch();}if(screens[step].classList.contains('prose'))beginTyping();}
function startIntro(){eyeStart();$('#notification').classList.add('hidden');notifyClock=setTimeout(()=>{$('#notification').classList.remove('hidden');chime()},3600)}
function addChat(where,item){let el=document.createElement('div');el.className='bubble '+(item[0]==='you'?'you':'stalker');const label=document.createElement('span');label.className='who';label.textContent=item[0]==='you'?'Вы':'Неизвестный';const line=document.createElement('span');line.className='bubble-line';const msg=document.createElement('span');msg.className='bubble-text';msg.textContent=item[1];const timestamp=document.createElement('span');timestamp.className='chat-time';timestamp.textContent=item[2]||'';line.append(msg,timestamp);el.append(label,line);$(where).append(el);if(item[0]==='stalker')chime()}
function advanceChat(){let idx=step===1?chatIndex:chat2Index;let arr=step===1?firstChat:secondChat;let target=step===1?'#chatMessages':'#chatTwo';if(idx<arr.length){addChat(target,arr[idx]);if(step===1)chatIndex++;else chat2Index++;if(idx===arr.length-1)$(step===1?'#blockButton':'#blockTwo').classList.remove('hidden')}}
// Preserve every character of the original text, including punctuation and spaces.
// Wrap words for scroll animation. Short Russian function words are joined to the
// following word by a non-breaking space, never deleted.
const proseStates=new Map();
const shortWords=new Set(['в','во','на','по','за','из','от','до','у','к','ко','с','со','о','об','обо','а','и','но','не','ни','же','бы','ли','для','при','под','над','без','про','как','что','то']);
function prepareWords(){
 document.querySelectorAll('.prose .story').forEach(root=>{
  // Text nodes belonging to emphasis elements stay under those elements.
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const nodes=[];
  while(walker.nextNode())nodes.push(walker.currentNode);
  nodes.forEach(node=>{
   const pieces=node.textContent.match(/\S+|\s+/gu)||[];
   const fragment=document.createDocumentFragment();
   pieces.forEach((part,i)=>{
    if(/^\s+$/u.test(part)){fragment.append(document.createTextNode(part));return;}
    const span=document.createElement('span');span.className='reveal-word';span.textContent=part;
    fragment.append(span);
   });node.replaceWith(fragment);
  });
  // Join short words to the next word even when separated by inline <em> tags.
  const words=[...root.querySelectorAll('.reveal-word')];
  words.forEach((span,i)=>{
   if(i===words.length-1)return;
   const clean=span.textContent.toLowerCase().replace(/^[«„"(]+|[,.!?;:»")]+$/gu,'');
   if(!shortWords.has(clean))return;
   const next=words[i+1];
   // Replace the actual first inter-word whitespace with a no-break space.
   // If a style boundary exists, append NBSP and remove a leading separator.
   let cursor=span.nextSibling;
   if(cursor?.nodeType===Node.TEXT_NODE && /\s/u.test(cursor.nodeValue||'')){
    cursor.nodeValue=cursor.nodeValue.replace(/\s/u,'\u00a0');
   }else if(next.parentElement!==span.parentElement){
    span.append(document.createTextNode('\u00a0'));
   }
  });
 });
}
prepareWords();
function beginTyping(){
 const section=screens[step];const blocks=[...section.querySelectorAll('.story')];
 blocks.forEach(b=>{b.classList.remove('story-current');b.querySelectorAll('.reveal-word').forEach(w=>w.classList.remove('shown'))});
 blocks[0]?.classList.add('story-current');
 proseStates.set(step,{block:0,word:0,hold:0});
}
function advanceProse(){
 const blocks=[...screens[step].querySelectorAll('.story')];
 const state=proseStates.get(step)||{block:0,word:0,hold:0};
 const block=blocks[state.block];if(!block)return false;
 const words=[...block.querySelectorAll('.reveal-word')];
 if(state.word<words.length){
  for(let n=0;n<3 && state.word<words.length;n++,state.word++)words[state.word].classList.add('shown');
  proseStates.set(step,state);return true;
 }
 // The completely visible paragraph stays for one extra scroll gesture.
 if(state.hold===0){state.hold=1;proseStates.set(step,state);return true;}
 if(state.block+1<blocks.length){
  block.classList.remove('story-current');
  state.block++;state.word=0;state.hold=0;
  blocks[state.block].classList.add('story-current');
  proseStates.set(step,state);return true;
 }
 return false;
}
function next(){
 if(step===1||step===4){advanceChat();return}
 if([5,9,11,14,15,16].includes(step))return;
 if(screens[step].classList.contains('prose')&&advanceProse())return;
 if(step===0){if(!$('#notification').classList.contains('hidden'))showStep(1);return}
 showStep(step+1);
}
let wheelBusy=false;window.addEventListener('wheel',e=>{e.preventDefault();if(e.deltaY<0||wheelBusy)return;wheelBusy=true;setTimeout(()=>wheelBusy=false,300);next()},{passive:false});let touchY=0;window.addEventListener('touchstart',e=>{touchY=e.touches[0].clientY},{passive:true});window.addEventListener('touchend',e=>{if(touchY-e.changedTouches[0].clientY>45)next()},{passive:true});window.addEventListener('keydown',e=>{if(['ArrowDown','PageDown',' '].includes(e.key)){e.preventDefault();next()}});
$('#notification').addEventListener('click',()=>{chime();showStep(1)});$('#blockButton').addEventListener('click',()=>showStep(2));$('#blockTwo').addEventListener('click',()=>showStep(5));document.querySelectorAll('[data-next]').forEach(b=>b.addEventListener('click',()=>showStep(4)));
const lots=[['main_1.jpg','main_2.jpg','main_3.jpg','main_4.jpg'],['lot2_0.jpg'],['lot3_0.jpg','lot3_1.jpg','lot3_2.jpg','lot3_3.jpg']];const correct=[[2],[0],[1,3]];
// main: first row uses 4 separately extracted photos. Second SVG contains a 2×2 mosaic.
function fourImages(round){if(round===0)return lots[0].map(x=>({src:'assets/'+x}));if(round===1)return [0,1,2,3].map(i=>({src:'assets/lot2_0.jpg',pos:i}));return lots[2].map(x=>({src:'assets/'+x}))}
function drawGrid(target,images,handler,dark=false){target.innerHTML='';images.forEach((ob,i)=>{let btn=document.createElement('button');btn.type='button';btn.setAttribute('aria-label',`Фотография ${i+1}`);let img=document.createElement('img');img.alt=`Вариант ${i+1}`;img.src=ob.src;if(ob.pos!==undefined){img.style.width='200%';img.style.height='200%';img.style.maxWidth='none';img.style.objectFit='fill';img.style.position='absolute';img.style.left=ob.pos%2===0?'0':'-100%';img.style.top=ob.pos<2?'0':'-100%'}btn.append(img);btn.addEventListener('click',()=>handler(i,btn));target.append(btn)})}
function renderQuiz(){$('#quizProgress').textContent=`${quizRound+1}/3`;$('#quizFeedback').textContent='';$('#retryQuiz').classList.add('hidden');drawGrid($('#photoGrid'),fourImages(quizRound),selectQuiz)}
const chosen=new Set();function selectQuiz(i,btn){btn.classList.add('selected');if(quizRound===1&&!micAsked){micAsked=true;requestMedia('audio')}if(correct[quizRound].includes(i)){chosen.add(i);if(quizRound===2&&![1,3].every(x=>chosen.has(x))){$('#quizFeedback').textContent='Ты нашёл одного. Найди второго.';return}setTimeout(()=>{chosen.clear();quizRound++;if(quizRound===3){showStep(6)}else renderQuiz()},700)}else{quizErrors++;$('#quizFeedback').textContent=quizErrors>=2?'Две ошибки. Придётся начать поиск заново.':'Не он. Посмотри внимательнее.';if(quizErrors>=2){$('#retryQuiz').classList.remove('hidden');[...$('#photoGrid').querySelectorAll('button')].forEach(b=>b.disabled=true)}else setTimeout(()=>btn.classList.remove('selected'),650)}}
$('#retryQuiz').addEventListener('click',()=>{quizErrors=0;quizRound=0;chosen.clear();renderQuiz()});
async function requestMedia(which){
 if(!navigator.mediaDevices?.getUserMedia){return;}
 try{
   const stream=await navigator.mediaDevices.getUserMedia(which==='video'?{video:true}:{audio:true});
   stream.getTracks().forEach(track=>track.stop());

 }catch(err){

   console.info('Доступ отклонён или недоступен:',err.name);
 }
}
for(const s of [9,11,15]){const node=document.querySelector(`[data-step="${s}"]`);node.querySelectorAll('[data-choice]').forEach(b=>b.addEventListener('click',()=>{if(s===9&&!cameraAsked){cameraAsked=true;requestMedia('video')}if(s===11){requestMediaOnce('audio','door-check')}if(s===15){requestMediaOnce('video','second-alone')}const c=node.querySelector('.confirm');c.innerHTML='';c.append(document.createTextNode('Точно?'));const yes=document.createElement('button');yes.textContent='Да, точно';yes.className='pill outline';const no=document.createElement('button');no.textContent='Выбрать снова';no.className='pill outline';yes.onclick=()=>{showStep(s+1)};no.onclick=()=>c.replaceChildren();c.append(document.createElement('br'),yes,no)}))}
function renderDark(){
 $('#darkProgress').textContent=`${darkRound+1}/3`;
 $('#darkFeedback').textContent='';
 const target=$('#darkGrid');target.replaceChildren();
 for(let i=0;i<4;i++){
   const b=document.createElement('button');b.type='button';b.className='dark-tile';
   b.setAttribute('aria-label',`Тёмный экран ${i+1}`);
   b.addEventListener('click',()=>{
     b.classList.add('selected');$('#darkFeedback').textContent='НЕВЕРНО';
     setTimeout(()=>{darkRound++;if(darkRound===3)showStep(15);else renderDark()},850);
   });target.append(b);
 }
}
function startDoorCountdown(){tick();let remaining=15;$('#doorTimer').textContent=remaining;clock=setInterval(()=>{remaining=Math.max(0,remaining-1);$('#doorTimer').textContent=remaining;tick();if(!remaining){clearInterval(clock);screens[11].classList.add('door-time-over')}},1000)}
function startFinal(){tick();let t=15;$('#timer').textContent=t;$('#restart').classList.add('hidden');$('#finalText').textContent='Не оборачивайся слишком резко.';clock=setInterval(()=>{t--;$('#timer').textContent=t;tick();if(t<=0){clearInterval(clock);$('#finalText').textContent='Время вышло.';$('#restart').classList.remove('hidden');chime()}},1000)}

// Quiet synthesized clock click; unlike message alerts, this sound plays on each second.
function tick(){try{const a=$('#tickAudio');a.pause();a.currentTime=0;a.volume=.8;const p=a.play();if(p)p.catch(()=>{});}catch(e){}}
// Keep a running tick after the first real user gesture so timer sounds can play.
function unlockTick(){const a=$('#tickAudio');if(!a)return;try{a.muted=true;const p=a.play();if(p)p.then(()=>{a.pause();a.currentTime=0;a.muted=false}).catch(()=>{a.muted=false})}catch(e){a.muted=false}}
document.addEventListener('pointerdown',unlockTick,{once:true});
document.addEventListener('keydown',unlockTick,{once:true});
function startFinalGlitch(){let i=0;const el=$('#finalGlitch');const names=['найти его','ПРЯЧЬСЯ','найти его','БЫСТРЕЕ','найти его'];finalGlitchClock=setInterval(()=>{el.textContent=names[i++%names.length];el.classList.remove('jitter');void el.offsetWidth;el.classList.add('jitter')},460)}
$('#restart').addEventListener('click',()=>{typingDone.clear();showStep(0)});startIntro();

// Permissions are requested only after a deliberate story choice.
// Browsers may remember a previous permission decision and suppress repeat prompts.
const mediaMoments=new Set();
function requestMediaOnce(kind,key){if(mediaMoments.has(key))return;mediaMoments.add(key);requestMedia(kind)}
// Red-only glitch replaces the phrase, with no badge/background.
const finalWords=['найти его','ПРЯЧЬСЯ','БЫСТРЕЕ'];let finalGlitchTimer=null;
function startPhraseGlitch(){stopPhraseGlitch();let i=0;const el=$('#finalGlitch');if(!el)return;el.textContent=finalWords[0];finalGlitchTimer=setInterval(()=>{if(step!==16)return;i=(i+1)%finalWords.length;el.textContent=finalWords[i];el.classList.remove('glitch-hit');void el.offsetWidth;el.classList.add('glitch-hit')},680)}
function stopPhraseGlitch(){clearInterval(finalGlitchTimer);finalGlitchTimer=null}
