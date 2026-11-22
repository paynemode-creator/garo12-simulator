/*
 * GARO XII SIM v1.1 — independent fan prototype, original SVG/CSS visuals.
 * Probability model (published reference specs):
 * Normal: symbols 1/437.49, GARO Charge 1/1749.97 (exclusive outcomes).
 * Symbol: 1500 balls, first battle 50% -> Extreme 7500 battle.
 * Extreme 7500: 50% +7500 and LT / 50% +1500 and normal.
 * LT: 25% +7500 and loop, 51% +1500 and loop, 24% +1500 and normal.
 * 7500 = five 10R payouts (not an extra 1500 on top of 7500).
 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const KEY = 'garo12-simulator-v1';
  const $el = {
    display:$('display'), reels:$('reels'), focusKicker:$('focusKicker'), focusSub:$('focusSub'),
    banner:$('bannerText'), screenMessage:$('screenMessage'), screenPhase:$('screenPhase'),
    onScreenSpin:$('onScreenSpin'), battleOverlay:$('battleOverlay'), battleEyebrow:$('battleEyebrow'),
    battleTitle:$('battleTitle'), battleSub:$('battleSub'), screenFocus:$('screenFocus'),
    spinLabel:$('spinLabel'), spinSublabel:$('spinSublabel'), spinButton:$('spinButton'),
    soundToggle:$('soundToggle'), soundLabel:$('soundLabel'), spinRate:$('spinRate'),
    probSelect:$('probSelect'), autoToggle:$('autoToggle'), autoText:$('autoText'),
    autoIcon:$('autoIcon'), autoStatus:$('autoStatus'), sparkLayer:$('sparkLayer'),
    machinePayout:$('machinePayout'), impactFlash:$('impactFlash'), toast:$('toast'),
    statusText:$('statusText'), lastReward:$('lastReward'), modeMini:$('modeMini'),
    chart:$('profitChart'), historyList:$('historyList'), historyCount:$('historyCount'),
    netBalls:$('netBalls'), profitDirection:$('profitDirection'), paidBalls:$('paidBalls'),
    spentBalls:$('spentBalls'), totalSpins:$('totalSpins'), currentDry:$('currentDry'),
    totalHits:$('totalHits'), chargeHits:$('chargeHits'), battleEntries:$('battleEntries'),
    ltEntries:$('ltEntries'), currentChain:$('currentChain'), bestChain:$('bestChain'),
    chartMin:$('chartMin'),chartMax:$('chartMax')
  };
  const fresh = () => ({
    totalSpins:0,currentDry:0,totalHits:0,chargeHits:0,battleEntries:0,ltEntries:0,
    currentChain:0,bestChain:0,payout:0,spent:0,mode:'normal',labChain:false,
    speed:'1',rate:17,multiplier:1,sound:false,volume:.7,auto:false,busy:false,
    history:[],points:[{x:0,y:0}],lastPayout:0,testEvents:0
  });
  const s = fresh();
  try {
    const stored = JSON.parse(localStorage.getItem(KEY)||'null');
    if (stored && typeof stored==='object') {
      for(const k of Object.keys(fresh())) if(Object.hasOwn(stored,k) && !['auto','busy'].includes(k)) s[k] = stored[k];
    }
  } catch(e){ /* storage unavailable; simulation still works */ }
  if(!['normal','battle','lt'].includes(s.mode)) s.mode='normal';
  if(!Number.isFinite(s.rate)||s.rate<5||s.rate>40) s.rate=17;
  if(![1,2,5,10].includes(+s.multiplier)) s.multiplier=1;
  if(!['1','2','4','fast'].includes(String(s.speed))) s.speed='1';
  if(!Array.isArray(s.history)) s.history=[];
  if(!Array.isArray(s.points)) s.points=[{x:0,y:0}];
  if(s.points.length<1) s.points=[{x:0,y:0}];
  s.volume=Number.isFinite(s.volume)?Math.min(1,Math.max(0,s.volume)):.7;
  s.auto=false;s.busy=false;
  let interval=null,autoTimer=null,toastTimer=null,audioCtx=null;
  let chartRAF=0;
  const fmt = n => Math.round(n).toLocaleString('ko-KR');
  const randInt = (min,max) => Math.floor(Math.random()*(max-min+1))+min;
  const wait = time => new Promise(r=>setTimeout(r,time));
  const tempo = ms => s.speed==='fast' ? Math.max(14,Math.min(35,ms/40)) : ms/Number(s.speed);
  const storage = () => {
    try {const obj={...s,busy:false,auto:false,points:s.points.slice(-220),history:s.history.slice(0,70)};localStorage.setItem(KEY,JSON.stringify(obj));}catch(e){}
  };
  function toast(message){
    $el.toast.textContent=message;$el.toast.classList.add('show');clearTimeout(toastTimer);
    toastTimer=setTimeout(()=>$el.toast.classList.remove('show'),2400);
  }
  // Each asset has an original demo fallback. Licensed official sounds are user-supplied;
  // no third-party audio is included in this project.
  const SOUND_KEYS=['prewin_gold','cfog_red','battle_victory','god7500'];
  const SOUND_LABELS={prewin_gold:'선축하음(금색)',cfog_red:'C.F.O.G. 빨강',battle_victory:'7500 배틀 승리',god7500:'GOD OF GARO 7500'};
  const soundFiles={},soundPlayers={},soundOrigin={},soundObjectUrls={};
  let soundDb=null;
  const storeName='audio_files';
  function soundStatus(key,message){
    const target=$('status_'+key);if(target)target.textContent=message;
    const count=SOUND_KEYS.filter(k=>['official','uploaded'].includes(soundOrigin[k])).length;
    if($('soundCount'))$('soundCount').textContent=count+'/4';
  }
  function setSoundTrack(key,src,kind){
    const player=new Audio(); player.preload='auto'; player.volume=s.volume;
    soundPlayers[key]=player;soundOrigin[key]=kind;
    player.addEventListener('canplay',()=>{
      if(soundPlayers[key]!==player)return;
      soundStatus(key,kind==='demo'?'기본 효과음 · 자체 제작':kind==='official'?'공식 파일 · 자동 연결':'내 음원 · 브라우저에 연결');
    },{once:true});
    player.addEventListener('error',()=>{
      if(soundPlayers[key]!==player)return;
      if(kind==='official')loadDefaultSound(key,'demo');
      else soundStatus(key,'음원 로딩 실패 · 임시 소리 사용');
    },{once:true});
    player.src=src; player.load();
  }
  function loadDefaultSound(key,stage='official'){
    const src=stage==='official'?`assets/sfx/${key}.mp3`:(window.GARO_INLINE_SFX?.[key]||`assets/sfx/demo_${key}.mp3`);
    setSoundTrack(key,src,stage);
  }
  function playSoundEffect(key){
    if(!s.sound)return;
    const player=soundPlayers[key];
    if(player && player.readyState>=2){
      try {player.pause();player.currentTime=0;player.volume=s.volume;
        const p=player.play();if(p&&p.catch)p.catch(()=>audio('win'));
      }catch(e){audio('win');}
    }else audio('win');
  }
  function openSoundDialog(){
    const dialog=$('soundDialog');
    if(dialog.showModal){if(!dialog.open)dialog.showModal();}
    else dialog.setAttribute('open','');
    $('soundVolume').value=Math.round(s.volume*100);
    $('volumeText').textContent=Math.round(s.volume*100)+'%';
  }
  function closeSoundDialog(){const d=$('soundDialog');if(d.close)d.close();else d.removeAttribute('open');}
  function connectSoundFile(key,file,persist=true){
    if(!SOUND_KEYS.includes(key)||!file)return;
    if(!file.type.startsWith('audio/') && !/\.(mp3|ogg|wav|m4a)$/i.test(file.name)){toast('오디오 파일을 선택해주세요.');return;}
    if(soundObjectUrls[key])URL.revokeObjectURL(soundObjectUrls[key]);
    const url=URL.createObjectURL(file);soundObjectUrls[key]=url;
    setSoundTrack(key,url,'uploaded');
    soundStatus(key,'내 음원 연결 중: '+file.name);
    if(persist)saveSoundToDB(key,file);
  }
  function soundStore(mode,key,value){
    if(!soundDb)return;
    try {const tx=soundDb.transaction(storeName,'readwrite');const store=tx.objectStore(storeName);
      if(mode==='put')store.put(value,key);else store.delete(key);
    }catch(e){}
  }
  function saveSoundToDB(key,file){soundStore('put',key,file);}
  function removeSoundFromDB(key){soundStore('delete',key);}
  function initializeSoundDB(){
    if(!('indexedDB'in window))return;
    try {const request=indexedDB.open('garo12-sound-pack-v1',1);
      request.onupgradeneeded=()=>request.result.createObjectStore(storeName);
      request.onsuccess=()=>{
        soundDb=request.result;const tx=soundDb.transaction(storeName,'readonly');
        SOUND_KEYS.forEach(key=>{
          const get=tx.objectStore(storeName).get(key);
          get.onsuccess=()=>{if(get.result instanceof Blob)connectSoundFile(key,get.result,false);};
        });
      };
    }catch(e){}
  }
  SOUND_KEYS.forEach(key=>loadDefaultSound(key));
  initializeSoundDB();
  ['soundSetup','soundSettings'].forEach(id=>$(id).addEventListener('click',openSoundDialog));
  ['soundClose','soundDone'].forEach(id=>$(id).addEventListener('click',closeSoundDialog));
  $('soundDialog').addEventListener('click',e=>{if(e.target.id==='soundDialog')closeSoundDialog();});
  $('soundVolume').addEventListener('input',e=>{
    s.volume=Number(e.target.value)/100;
    $('volumeText').textContent=e.target.value+'%';
    Object.values(soundPlayers).forEach(player=>player.volume=s.volume);
    storage();
  });
  document.querySelectorAll('[data-sfx-preview]').forEach(btn=>btn.addEventListener('click',()=>{
    s.sound=true;render();playSoundEffect(btn.dataset.sfxPreview);
  }));
  document.querySelectorAll('[data-sfx-file]').forEach(input=>input.addEventListener('change',e=>{
    if(e.target.files?.[0]){connectSoundFile(e.target.dataset.sfxFile,e.target.files[0]);toast('효과음 연결 완료');}
    e.target.value='';
  }));
  document.querySelectorAll('[data-sfx-reset]').forEach(btn=>btn.addEventListener('click',()=>{
    const key=btn.dataset.sfxReset;
    if(soundObjectUrls[key]){URL.revokeObjectURL(soundObjectUrls[key]);delete soundObjectUrls[key];}
    removeSoundFromDB(key);loadDefaultSound(key);toast('기본 음향으로 복원');
  }));
  function audio(type='tap'){
    if(!s.sound)return;
    try{
      const Ctx=window.AudioContext||window.webkitAudioContext;
      if(!Ctx)return;
      audioCtx ||= new Ctx();
      if(audioCtx.state==='suspended') audioCtx.resume();
      const now=audioCtx.currentTime;
      const notes = type==='win'?[[523,.0,.11],[659,.10,.11],[784,.22,.13],[1047,.39,.30]]:type==='loss'?[[320,0,.10],[220,.13,.19]]:type==='battle'?[[220,0,.12],[330,.13,.14],[440,.29,.20]]:[[610,0,.04],[760,.065,.035]];
      notes.forEach(([freq,offset,dur],idx)=>{
        const osc=audioCtx.createOscillator();const gain=audioCtx.createGain();
        osc.type=type==='loss'?'sawtooth':type==='win'?'triangle':'sine';osc.frequency.setValueAtTime(freq,now+offset);
        gain.gain.setValueAtTime(0,now+offset);gain.gain.linearRampToValueAtTime(type==='win'?.14:.055,now+offset+.014);
        gain.gain.exponentialRampToValueAtTime(.001,now+offset+dur);
        osc.connect(gain);gain.connect(audioCtx.destination);osc.start(now+offset);osc.stop(now+offset+dur+.02);
      });
    }catch(e){}
  }
  function vibrate(pattern){try{if(navigator.vibrate)navigator.vibrate(pattern)}catch(e){}}
  function burst(count=50){
    if(s.speed==='fast')return;
    const fragment=document.createDocumentFragment();
    for(let i=0;i<count;i++){
      const star=document.createElement('i');star.className='spark';
      star.style.setProperty('--a',`${Math.round(Math.random()*360)}deg`);
      star.style.setProperty('--d',`${randInt(80,250)}px`);
      star.style.background=['#fff6ce','#ffdc6f','#d7863b','#7bffdb'][randInt(0,3)];
      star.style.animationDelay=`${(Math.random()*.15).toFixed(2)}s`;
      fragment.appendChild(star);
    }
    $el.sparkLayer.appendChild(fragment);
    setTimeout(()=>$el.sparkLayer.replaceChildren(),1300);
  }
  function flash(){
    $el.impactFlash.classList.remove('flash');void $el.impactFlash.offsetHeight;$el.impactFlash.classList.add('flash');
  }
  function setReels(a,b,c){
    [...$el.reels.children].forEach((node,i)=>node.textContent=[a,b,c][i]);
  }
  function randomReels(){
    let a=randInt(1,9),b=randInt(1,9),c=randInt(1,9);
    if(a===b&&b===c)c=(c%9)+1;
    setReels(a,b,c);
  }
  function phaseView(){
    const names={normal:'NORMAL MODE',battle:'極限 7500 BATTLE',lt:'魔戒 CHANCE LT'};
    $el.display.dataset.phase=s.mode;
    $el.screenPhase.textContent=names[s.mode];
    $el.modeMini.textContent=s.mode==='normal'?'NORMAL':s.mode==='battle'?'BATTLE':'MAKAI LT';
    ['Normal','Battle','LT'].forEach((key)=>{
      const phase=$(`phase${key}`),id=key.toLowerCase();phase.className='phase';
      if((key==='Normal'&&s.mode==='normal')||(key==='Battle'&&s.mode==='battle')||(key==='LT'&&s.mode==='lt'))phase.classList.add('phase-active'); if(key==='Battle') phase.classList.add('phase-battle'); if(key==='LT') phase.classList.add('phase-lt');
    });
    $el.spinLabel.textContent=s.busy?'연출 진행 중':s.mode==='normal'?'회전 시작':s.mode==='battle'?'7500 결전': '마계 LT 결전';
    $el.spinSublabel.textContent=s.busy?'RESULT IN PROGRESS':s.mode==='normal'?'SPACE · TAP TO SPIN':'SPACE · RESOLVE BATTLE';
    $el.spinButton.disabled=s.busy;
    if(!s.busy){
      $el.screenFocus.style.opacity=s.mode==='normal'?'1':'0';
      $el.battleOverlay.hidden=s.mode==='normal';
      if(s.mode==='battle'){
        $el.battleOverlay.dataset.kind='battle';$el.battleEyebrow.textContent='EXTREME CHALLENGE';$el.battleTitle.innerHTML='極限<br>7500';
        $el.battleSub.textContent='50% · 검을 뽑아 승리를 쟁취하라';$el.banner.textContent='運命の一撃';
        $el.screenMessage.textContent='다음 결전에서 50% 판정';
      }else if(s.mode==='lt'){
        $el.battleOverlay.dataset.kind='lt';$el.battleEyebrow.textContent='LUCKY TRIGGER · LOOP';$el.battleTitle.innerHTML='魔戒<br>CHANCE';
        $el.battleSub.textContent='25% 7500 / 51% 1500 / 24% 종료';$el.banner.textContent='MAKAI CHANCE LT';
        $el.screenMessage.textContent='다음 결전에서 출구슬 결정';
      }
    }
    $el.onScreenSpin.textContent=String(s.currentDry).padStart(4,'0')+' G';
  }
  function addPoint(force=false){
    const p={x:s.totalSpins,y:Math.round(s.payout-s.spent)};
    if(force||s.totalSpins%4===0||s.points.length===1)s.points.push(p);
    if(s.points.length>240)s.points=[s.points[0],...s.points.filter((_,i)=>i%2===0).slice(-190)];
  }
  function record(type,title,balls,test=false){
    s.lastPayout=balls;
    if(test)s.testEvents++;
    s.history.unshift({type,title,balls,test,spin:s.totalSpins,time:Date.now()});
    s.history=s.history.slice(0,70);
    addPoint(true);
  }
  function addPayout(amount,count=1){
    s.payout+=amount;s.totalHits+=count;
    s.currentChain+=count;
    s.bestChain=Math.max(s.bestChain,s.currentChain);
  }
  function finishChain(){
    s.currentChain=0;s.labChain=false;s.mode='normal';
  }
  function setInfo(msg,tag){$el.screenMessage.textContent=msg;$el.banner.textContent=tag||msg;}
  function render(){
    const net=Math.round(s.payout-s.spent);
    $el.netBalls.innerHTML=`${net>0?'+':''}${fmt(net)} <small>발</small>`;
    $el.netBalls.classList.toggle('negative',net<0);
    $el.profitDirection.textContent=net>0?'▲ PLUS':net<0?'▼ MINUS':'— ZERO';
    $el.profitDirection.style.color=net>=0?'#5be6b4':'#ff8888';
    $el.paidBalls.textContent=fmt(s.payout);$el.spentBalls.textContent=fmt(s.spent);
    $el.totalSpins.textContent=fmt(s.totalSpins);$el.currentDry.textContent=fmt(s.currentDry);
    $el.totalHits.textContent=fmt(s.totalHits);$el.chargeHits.textContent=fmt(s.chargeHits);
    $el.battleEntries.textContent=fmt(s.battleEntries);$el.ltEntries.textContent=fmt(s.ltEntries);
    $el.currentChain.textContent=fmt(s.currentChain);$el.bestChain.textContent=fmt(s.bestChain);
    $el.machinePayout.textContent=String(Math.round(s.payout)).padStart(6,'0').slice(-8);
    $el.lastReward.innerHTML=`LAST PAYOUT <b>${s.lastPayout?fmt(s.lastPayout)+' BALLS':'—'}</b>`;
    $el.onScreenSpin.textContent=String(s.currentDry).padStart(4,'0')+' G';
    $el.historyCount.textContent=`${s.history.length} EVENTS`;
    if(s.history.length){$el.historyList.innerHTML=s.history.slice(0,30).map(h=>
      `<div class="history-row"><span class="history-icon ${h.type==='charge'?'charge':h.type==='lt'?'lt':''}">${h.type==='charge'?'✧':h.type==='lt'?'♛':'✦'}</span><span class="history-details"><b>${escapeHtml(h.title)}${h.test?'<span class="test-tag">TEST</span>':''}</b><small>${fmt(h.spin)} G · ${new Date(h.time).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})}</small></span><span class="history-payout">+${fmt(h.balls)}<small>발</small></span></div>`).join('');}
    else $el.historyList.innerHTML='<div class="history-empty">아직 기록이 없습니다.<br>첫 회전을 시작해보세요.</div>';
    $el.autoToggle.classList.toggle('running',s.auto);
    $el.autoText.textContent=s.auto?'자동 회전 중 · 정지':'자동 회전 시작';
    $el.autoIcon.textContent=s.auto?'■':'▶';$el.autoStatus.textContent=s.auto?'ON':'OFF';
    $el.spinRate.value=s.rate;$el.probSelect.value=s.multiplier;
    $el.soundLabel.textContent=s.sound?'ON':'OFF';
    document.querySelectorAll('[data-speed]').forEach(el=>el.classList.toggle('active',el.dataset.speed===String(s.speed)));
    phaseView();
    $el.statusText.textContent=`${s.busy?'연출 진행 중':s.auto?'자동 회전 중':'대기 중'} · ${s.multiplier===1?'실제 스펙':'테스트 확률'} ×${s.multiplier}`;
    drawChart();storage();
  }
  function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function drawChart(){
    cancelAnimationFrame(chartRAF);
    chartRAF=requestAnimationFrame(()=>{
      const canvas=$el.chart;const area=canvas.getBoundingClientRect();
      if(area.width<1||area.height<1)return;
      const dpr=Math.min(window.devicePixelRatio||1,2),w=area.width,h=area.height;
      canvas.width=Math.floor(w*dpr);canvas.height=Math.floor(h*dpr);
      const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);ctx.clearRect(0,0,w,h);
      const series=s.points.length?s.points:[{x:0,y:0}];
      let min=Math.min(0,...series.map(p=>p.y)),max=Math.max(0,...series.map(p=>p.y));
      if(min===max){min-=500;max+=500;}
      const margin=(max-min)*.14;min-=margin;max+=margin;
      $el.chartMin.textContent=`MIN ${fmt(min)}`;$el.chartMax.textContent=`MAX ${fmt(max)}`;
      const px=10,py=20,pw=w-20,ph=h-32;
      ctx.strokeStyle='#ffffff11';ctx.lineWidth=1;
      for(let i=0;i<=4;i++){const y=py+i*ph/4;ctx.beginPath();ctx.moveTo(px,y);ctx.lineTo(w-10,y);ctx.stroke();}
      const coord=(p,i)=>({x:px+pw*(series.length<2?0:i/(series.length-1)),y:py+ph*(1-(p.y-min)/(max-min))});
      const zero=py+ph*(1-(0-min)/(max-min));
      ctx.setLineDash([3,4]);ctx.strokeStyle='#c4b19c5c';ctx.beginPath();ctx.moveTo(px,zero);ctx.lineTo(w-10,zero);ctx.stroke();ctx.setLineDash([]);
      const gradient=ctx.createLinearGradient(0,py,0,h);
      const net=s.payout-s.spent,plus=net>=0;
      gradient.addColorStop(0,plus?'#63e8b64a':'#ff6c6a48');gradient.addColorStop(1,'#00000000');
      ctx.beginPath();series.forEach((p,i)=>{let c=coord(p,i);if(i===0)ctx.moveTo(c.x,c.y);else ctx.lineTo(c.x,c.y)});
      const last=coord(series[series.length-1],series.length-1);
      ctx.lineTo(last.x,h-10);ctx.lineTo(px,h-10);ctx.closePath();ctx.fillStyle=gradient;ctx.fill();
      ctx.beginPath();series.forEach((p,i)=>{let c=coord(p,i);if(i===0)ctx.moveTo(c.x,c.y);else ctx.lineTo(c.x,c.y)});
      ctx.strokeStyle=plus?'#6af4b9':'#ff7176';ctx.lineWidth=2.6;ctx.lineJoin='round';ctx.stroke();
      ctx.beginPath();ctx.arc(last.x,last.y,3.6,0,2*Math.PI);ctx.fillStyle=plus?'#8bffca':'#ff8589';ctx.fill();
    });
  }
  function clearShow(){
    $el.reels.classList.remove('spinning');$el.display.classList.remove('is-win','is-ready');
    $el.screenFocus.style.opacity='1';$el.battleOverlay.hidden=true;
  }
  async function showSpinning(){
    clearShow();$el.reels.classList.add('spinning');
    $el.focusKicker.textContent='FATE IS IN MOTION';$el.focusSub.textContent='運命を切り拓け';
    setInfo('숫자 변동 중...', 'SPINNING');
    audio('tap');
    let spinTicks=0;clearInterval(interval);
    interval=setInterval(()=>{randomReels();spinTicks++},s.speed==='fast'?16:Math.max(35,85/Number(s.speed)));
    await wait(tempo(1050));clearInterval(interval);interval=null;$el.reels.classList.remove('spinning');
  }
  async function showBigWinner(amount,title='大当り',lab=false){
    $el.display.classList.add('is-win','is-ready');$el.battleOverlay.hidden=true;$el.screenFocus.style.opacity='1';setReels(7,7,7);
    $el.focusKicker.textContent=title;$el.focusSub.textContent=`+ ${fmt(amount)} BALLS`;
    $el.banner.textContent=amount===7500?'7500 EXTREME BONUS':amount===300?'GARO CHARGE':'BIG BONUS';
    $el.screenMessage.textContent=lab?'TEST 당첨 · 기록 반영':`축하합니다 · ${fmt(amount)}발 당첨`;
    burst(amount===7500?85:55);flash();if(amount===7500)playSoundEffect('god7500');else audio('win');vibrate([35,45,75]);
    render();await wait(tempo(amount===7500?1450:1050));
    $el.display.classList.remove('is-win','is-ready');
  }
  async function showConfrontation(isFirst=true){
    $el.screenFocus.style.opacity='0';$el.battleOverlay.hidden=false;
    $el.battleOverlay.dataset.kind=isFirst?'first':'battle';$el.battleEyebrow.textContent=isFirst?'1ST ROUND · JUDGEMENT':'EXTREME BATTLE';
    $el.battleTitle.innerHTML=isFirst?'初戦<br>BATTLE':'極限<br>7500';
    $el.battleSub.textContent='勝利の扉が開くか';$el.banner.textContent='運命を賭けた戦い';
    if(isFirst){playSoundEffect('cfog_red');}else audio('battle');await wait(tempo(1100));
  }
  async function showBattleResult(success,message,effect=null){
    $el.battleEyebrow.textContent=success?'VICTORY · BREAKTHROUGH':'DEFEAT · RETURN TO NORMAL';
    $el.battleTitle.innerHTML=success?'勝<br>利':'敗<br>北';
    $el.battleSub.textContent=message;$el.banner.textContent=success?'GOLDEN VICTORY':'CHALLENGE FAILED';
    if(success){flash();burst(70);if(effect)playSoundEffect(effect);else audio('win')}else audio('loss');
    await wait(tempo(success?1150:900));
  }
  const normalRoll = (force=false) => {
    if(force)return 'symbol';
    const p=Math.random();let symbol=1/437.49*s.multiplier,charge=1/1749.97*s.multiplier;
    if(p<symbol)return 'symbol';if(p<symbol+charge)return 'charge';return 'miss';
  };
  async function normalTurn(force){
    s.totalSpins++;s.currentDry++;s.spent+=250/s.rate;
    const roll=normalRoll(force);phaseView();
    await showSpinning();
    if(roll==='miss'){
      randomReels();$el.focusKicker.textContent='THE GOLDEN KNIGHT';$el.focusSub.textContent='まだ、終わらない。';
      setInfo(`${fmt(s.currentDry)}회전 · 미당첨`, 'NEXT SPIN');
      addPoint();return;
    }
    s.currentDry=0;
    if(roll==='charge'){
      s.chargeHits++;s.currentChain=0;s.payout+=300;s.totalHits++;
      record('charge','GARO CHARGE · 2R',300,false);
      await showBigWinner(300,'GARO CHARGE');
      $el.focusKicker.textContent='GARO CHARGE';$el.focusSub.textContent='2R · 300 BALLS';
      finishChain();setInfo('GARO CHARGE 당첨 · 통상 복귀','CHARGE COMPLETE');
      return;
    }
    s.labChain=Boolean(force);
    addPayout(1500,1);record('normal','액정 도안 당첨 · 10R',1500,force);
    playSoundEffect('prewin_gold');
    await showBigWinner(1500,'図柄揃い',force);
    await showConfrontation(true);
    const firstWin=Math.random()<.5;
    await showBattleResult(firstWin,firstWin?'극한 7500 배틀 진입':'1,500발 획득 후 통상 복귀');
    if(firstWin){
      s.mode='battle';s.battleEntries++;setInfo('7500 배틀 준비 · 다시 회전하세요','極限 7500 BATTLE');
      toast('1차 배틀 승리! 극한 7500 배틀 진입');
    }else{
      finishChain();setInfo('1차 배틀 패배 · 통상 복귀','NORMAL RETURN');
    }
  }
  async function battleTurn(force){
    clearShow();s.busy=true;
    await showConfrontation(false);
    const success=force||Math.random()<.5,test=force||s.labChain;
    if(success){
      addPayout(7500,5);s.ltEntries++;s.mode='lt';record('lt','극한 7500 승리 · LT 진입',7500,test);
      await showBattleResult(true,'7,500발 + 魔戒 CHANCE LT','battle_victory');
      await showBigWinner(7500,'極限 7500',test);
      setInfo('마계 CHANCE LT 돌입 · 결전을 진행하세요','MAKAI CHANCE LT');
      toast('극한 7500 돌파! 마계 CHANCE LT 진입');
    }else{
      addPayout(1500,1);record('battle','극한 7500 배틀 종료',1500,test);
      await showBattleResult(false,'1,500발 획득 후 통상 복귀');
      finishChain();setInfo('배틀 종료 · 통상 복귀','RETURN TO NORMAL');
    }
  }
  async function ltTurn(force){
    clearShow();$el.screenFocus.style.opacity='0';$el.battleOverlay.hidden=false;
    $el.battleOverlay.dataset.kind='lt';$el.battleEyebrow.textContent='MAKAI CHANCE · LUCKY TRIGGER';$el.battleTitle.innerHTML='魔戒<br>CHANCE';
    $el.battleSub.textContent='継続率 約76% · 7500 約25%';$el.banner.textContent='LT JUDGEMENT';
    audio('battle');await wait(tempo(1050));
    const roll=force?0:Math.random(),test=force||s.labChain;
    if(roll<.25){
      addPayout(7500,5);record('lt','마계 CHANCE · 7,500발 연속',7500,test);
      await showBattleResult(true,'7,500발 · LT 계속');
      await showBigWinner(7500,'MAKAI 7500',test);
      setInfo('7,500발! 마계 LT 지속','MAKAI LOOP CONTINUES');
    }else if(roll<.76){
      addPayout(1500,1);record('lt','마계 CHANCE · 1,500발 지속',1500,test);
      await showBattleResult(true,'1,500발 · LT 계속');
      await showBigWinner(1500,'MAKAI BONUS',test);
      setInfo('1,500발 · 마계 LT 지속','MAKAI LOOP CONTINUES');
    }else{
      addPayout(1500,1);record('lt','마계 CHANCE · 1,500발 종료',1500,test);
      await showBattleResult(false,'1,500발 · LT 종료');
      finishChain();setInfo('마계 CHANCE 종료 · 통상 복귀','MAKAI CHANCE END');
    }
  }
  function scheduleAuto(){
    clearTimeout(autoTimer);
    if(!s.auto||s.busy)return;
    autoTimer=setTimeout(()=>{if(s.auto&&!s.busy)executeTurn(false)},s.speed==='fast'?35:130);
  }
  async function executeTurn(force=false){
    if(s.busy)return;
    s.busy=true;
    const mode=s.mode;
    try{
      render();
      if(mode==='normal')await normalTurn(force);
      else if(mode==='battle')await battleTurn(force);
      else await ltTurn(force);
    }catch(e){console.error('GARO simulation error',e);toast('일시적 오류가 발생했습니다. 다시 회전하세요.');clearInterval(interval);interval=null;}
    finally{
      s.busy=false;$el.display.classList.remove('is-win','is-ready');
      if(s.mode!=='normal')$el.screenFocus.style.opacity='0';else $el.screenFocus.style.opacity='1';
      render();scheduleAuto();
    }
  }
  function simulateBatch(){
    if(s.busy||s.mode!=='normal'){toast('통상 상태에서만 1,000회 실험할 수 있습니다.');return;}
    if(s.auto)toggleAuto(false);
    s.busy=true;const before=s.payout;
    for(let i=1;i<=1000;i++){
      s.totalSpins++;s.currentDry++;s.spent+=250/s.rate;
      const roll=normalRoll(false);
      if(roll==='charge'){
        s.currentDry=0;s.payout+=300;s.chargeHits++;s.totalHits++;s.lastPayout=300;
        record('charge','GARO CHARGE · 2R',300);
      }else if(roll==='symbol'){
        s.currentDry=0;addPayout(1500,1);record('normal','액정 도안 당첨 · 10R',1500);
        if(Math.random()<.5){
          s.battleEntries++;
          if(Math.random()<.5){
            addPayout(7500,5);s.ltEntries++;record('lt','극한 7500 승리 · LT 진입',7500);
            let keep=true,guard=0;
            while(keep&&guard++<10000){
              const lt=Math.random();
              if(lt<.25){addPayout(7500,5);record('lt','마계 CHANCE · 7,500발 연속',7500)}
              else if(lt<.76){addPayout(1500,1);record('lt','마계 CHANCE · 1,500발 지속',1500)}
              else {addPayout(1500,1);record('lt','마계 CHANCE · 1,500발 종료',1500);keep=false}
            }
          }else{addPayout(1500,1);record('battle','극한 7500 배틀 종료',1500)}
        }
        finishChain();
      }
      if(i%8===0)addPoint(true);
    }
    s.busy=false;s.mode='normal';s.labChain=false;
    randomReels();$el.focusKicker.textContent='FAST SIMULATION';$el.focusSub.textContent='1000 SPINS COMPLETED';
    setInfo('1,000회 통계 실험 완료','SIMULATION COMPLETE');
    addPoint(true);render();toast(`1,000회 완료 · 총 출구슬 +${fmt(s.payout-before)}발`);
  }
  function toggleAuto(value=!s.auto){
    s.auto=value;if(!s.auto)clearTimeout(autoTimer);
    render();
    if(s.auto&&!s.busy)scheduleAuto();
  }
  function reset(){
    if(s.busy){toast('연출 종료 후 초기화할 수 있습니다.');return;}
    if(!confirm('모든 회전 기록·출구슬·수지 그래프를 초기화할까요?'))return;
    const settings={speed:s.speed,rate:s.rate,multiplier:s.multiplier,sound:s.sound,volume:s.volume};
    Object.assign(s,fresh(),settings);clearTimeout(autoTimer);clearShow();randomReels();
    $el.focusKicker.textContent='THE GOLDEN KNIGHT';$el.focusSub.textContent='黄金の運命を切り拓け';
    setInfo('중앙 버튼 또는 SPACE로 시작','READY TO SPIN');
    render();toast('기록을 초기화했습니다.');
  }
  $('spinButton').addEventListener('click',()=>executeTurn());
  $('swordButton').addEventListener('click',()=>{if(s.busy){audio('tap');flash();return;}executeTurn();});
  $('forceWin').addEventListener('click',()=>{if(s.busy){toast('연출이 끝난 뒤 테스트하세요.');return;}toast('TEST · 이번 판정은 강제 성공으로 처리합니다.');executeTurn(true);});
  $('rushDirect').addEventListener('click',()=>{
    if(s.busy){toast('연출 종료 후 LT 직행할 수 있습니다.');return;}
    s.mode='lt';s.labChain=true;s.ltEntries++;s.currentChain=0;s.testEvents++;
    setInfo('TEST · LT 직행 · 지급구슬 없음','MAKAI CHANCE LT');
    render();toast('TEST · LT 직행 (당첨 구슬은 부여되지 않습니다)');
  });
  $('batchTest').addEventListener('click',simulateBatch);
  $('autoToggle').addEventListener('click',()=>toggleAuto());
  $('resetStats').addEventListener('click',reset);
  $('spinRate').addEventListener('change',e=>{
    const n=Number(e.target.value);s.rate=Number.isFinite(n)?Math.min(40,Math.max(5,n)):17;render();toast('회전율 설정이 저장되었습니다.');
  });
  $('probSelect').addEventListener('change',e=>{s.multiplier=Number(e.target.value);render();toast(s.multiplier===1?'실제 확률로 변경':'테스트 확률 배수가 적용되었습니다.');});
  document.querySelectorAll('[data-speed]').forEach(btn=>btn.addEventListener('click',()=>{s.speed=btn.dataset.speed;render();}));
  $('soundToggle').addEventListener('click',()=>{s.sound=!s.sound;render();audio('tap');if(s.sound)toast('효과음 ON · 음향 설정에서 테스트할 수 있습니다.');});
  $('viewToggle').addEventListener('click',()=>{
    document.body.classList.toggle('zoom-mode');
    $('viewToggle').querySelector('small').textContent=document.body.classList.contains('zoom-mode')?'축소':'확대';
    setTimeout(drawChart,120);
  });
  document.addEventListener('keydown',e=>{
    if(e.code!=='Space'||e.repeat||e.ctrlKey||e.metaKey||e.altKey)return;
    if(['INPUT','SELECT','TEXTAREA','BUTTON'].includes(document.activeElement?.tagName))return;
    e.preventDefault();executeTurn();
  });
  window.addEventListener('resize',drawChart);
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&s.auto)toggleAuto(false)});
  // Open browser bookmarks with their stored state but do not resume autoplay.
  $el.spinRate.value=s.rate;$el.probSelect.value=s.multiplier;
  if(s.mode==='normal'){
    randomReels();$el.focusKicker.textContent='THE GOLDEN KNIGHT';$el.focusSub.textContent='黄金の運命を切り拓け';
  }
  render();
})();
