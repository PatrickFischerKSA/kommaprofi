
(function(){
  const $ = (sel, el=document)=>el.querySelector(sel);
  const $$ = (sel, el=document)=>Array.from(el.querySelectorAll(sel));

  const tabs = $$('.tab-btn');
  tabs.forEach(btn=>btn.addEventListener('click',()=>{
    tabs.forEach(b=>b.classList.remove('active'));
    $$('.tab').forEach(t=>t.classList.remove('active'));
    const id = btn.dataset.tab; $('#'+id).classList.add('active');
    btn.classList.add('active');
  }));

  const levelSel = $('#level');
  const requireWhy = $('#require-why');
  const chBox = $('#ch-mode');
  const CH_KEY = 'kommaprofi_ch';

  const loadBtn = $('#load');
  const nextBtn = $('#next');
  const checkBtn = $('#check');
  const resetBtn = $('#reset');
  const exerciseEl = $('#exercise');
  const scoreEl = $('#score');
  const qualityEl = $('#quality');

  let RULES = {}; let BANK = []; let current = [];

  // Load
  fetch('data/rules.json').then(r=>r.json()).then(d=>RULES=d);
  fetch('data/exercises.json').then(r=>r.json()).then(d=>{ 
    const q = applyMorphoFilter(d);
    BANK = q.filtered; 
    if(/[?&]quality=1/.test(location.search)) showQuality(q, d.length);
  });

  function showQuality(q, originalTotal){
    const {filtered, rejections} = q;
    qualityEl.style.display = 'block';
    const msg = document.createElement('div');
    msg.innerHTML = `<strong>Qualitätsbericht:</strong> akzeptiert ${filtered.length}/${originalTotal}, verworfen ${rejections.length}.`;
    const list = document.createElement('ol');
    rejections.forEach(r=>{ const li=document.createElement('li'); li.textContent = `${r.id}: ${r.text}`; list.appendChild(li); });
    qualityEl.innerHTML = ''; qualityEl.appendChild(msg); if(rejections.length) qualityEl.appendChild(list);
  }

  // Debug switch
  if(/[?&]debug=1/.test(location.search)) document.documentElement.classList.add('debug');

  // Persist CH mode
  if (chBox){
    const saved = localStorage.getItem(CH_KEY);
    if (saved!==null) chBox.checked = (saved==='1');
    chBox.addEventListener('change', ()=> localStorage.setItem(CH_KEY, chBox.checked ? '1' : '0'));
  }

  const normalizeSpaces = s => s.replace(/\s+/g,' ').trim();
  const tokenize = s => normalizeSpaces(s).split(' ');

  // =============== Morphology Filter =================
  const IRREG = {
    ich: new Set(['bin','habe','kann','will','soll','darf','mag','muss','gehe','komme','bleibe','spiele','lese','renne']),
    du: new Set(['bist','hast','kannst','willst','sollst','darfst','magst','musst']),
    er: new Set(['ist','hat','kann','will','soll','darf','mag','muss']),
    sie: new Set(['ist','hat','kann','will','soll','darf','mag','muss']),
    es: new Set(['ist','hat','kann','will','soll','darf','mag','muss']),
    wir: new Set(['sind','haben','können','wollen','sollen','dürfen','mögen','müssen']),
    ihr: new Set(['seid','habt','könnt','wollt','sollt','dürft','mögt','müsst']),
    Sie: new Set(['sind','haben','können','wollen','sollen','dürfen','mögen','müssen'])
  };

  function endingOK(pron, verb){
    const v = verb.toLowerCase();
    if(IRREG[pron] && IRREG[pron].has(v)) return true;
    const ends = {
      ich: ['e'],
      du: ['st'],
      er: ['t'], sie: ['t'], es: ['t'],
      wir: ['en'], ihr: ['t'], Sie: ['en']
    };
    const options = ends[pron] || [];
    return options.some(suf => v.endsWith(suf));
  }

  function pronounAgreementOK(firstToken, secondToken){
    const pron = firstToken; // preserve case for Sie
    return endingOK(pron, secondToken);
  }

  function reflexiveOK(tokens){
    const map = { ich:'mich', du:'dich', er:'sich', sie:'sich', es:'sich', wir:'uns', ihr:'euch', Sie:'sich' };
    const low = tokens.map(t=>t.toLowerCase());
    const first = low[0];
    if(!(first in map)) return true; // only check when sentence starts with pronoun
    const good = map[first];
    const bads = new Set(['mich','dich','sich','uns','euch']);
    // if any reflexive pronoun occurs and it's not the good one → fail
    for(let i=1;i<Math.min(low.length, 6); i++){
      const w = low[i];
      if(bads.has(w) && w!==good) return false;
    }
    return true;
  }

  function applyMorphoFilter(bank){
    const rejections=[];
    const filtered = bank.filter(ex=>{
      const plain = normalizeSpaces(ex.text.split('|').join(' ')).replace(/[!?\.]+$/,'');
      const tokens = tokenize(plain);
      if(tokens.length<2) return true;
      const first = tokens[0];
      const second = tokens[1] || '';
      let ok = true;
      if(['ich','du','er','sie','es','wir','ihr','Sie'].includes(first)){
        ok = pronounAgreementOK(first, second);
      }
      if(ok) ok = reflexiveOK(tokens);
      if(!ok) rejections.push({id: ex.id, text: plain});
      return ok;
    });
    return {filtered, rejections};
  }
  // ============ End Morpho Filter ================

  function compileExercise(ex){
    const parts = ex.text.split('|').map(p=>p.replace(/\s+/g,' ').trim());
    const plain = parts.join(' ');
    const tokens = tokenize(plain);
    const boundaryIndices = [];
    let acc='';
    for(let i=0;i<parts.length-1;i++){ acc = acc? (acc+' '+parts[i]) : parts[i]; boundaryIndices.push(tokenize(acc).length-1); }
    const full = new Array(Math.max(0,tokens.length-1)).fill('—');
    (ex.slots||[]).forEach((sym,j)=>{ const b = boundaryIndices[j]; if(b!=null) full[b]=sym; });
    const altFull = (ex.also_ok||[]).map(alt=>{ const v=new Array(full.length).fill('—'); alt.forEach((sym,j)=>{const b=boundaryIndices[j]; if(b!=null) v[b]=sym;}); return v; });
    const reasonsFull = new Array(full.length).fill('');
    (ex.reasons||[]).forEach((r,j)=>{ const b=boundaryIndices[j]; if(b!=null) reasonsFull[b]=r; });
    return { ...ex, plain, tokens, full, altFull, reasonsFull };
  }

  function pickLevel(lvl){
    const askWhy = requireWhy?.checked || lvl==='Profi' || lvl==='Expert';
    const pool = BANK.filter(x=>x.level===lvl);
    const n = Math.min(5, pool.length);
    const shuffled = pool.slice().sort(()=>Math.random()-0.5).slice(0,n).map(compileExercise);
    current = shuffled;
    render(current, askWhy);
  }

  function render(list, askWhy){
    exerciseEl.innerHTML='';
    list.forEach((ex)=>{
      const group = document.createElement('div');
      group.className='sentence';
      const user = new Array(Math.max(0, ex.tokens.length-1)).fill('—');
      group.dataset.user = JSON.stringify(user);
      const teacherMode = /[?&]teacher=1/.test(location.search);

      function rebuild(){
        group.innerHTML='';
        const arr = JSON.parse(group.dataset.user);
        for(let i=0;i<ex.tokens.length;i++){
          const w = document.createElement('span');
          w.textContent = ex.tokens[i];
          group.appendChild(w);
          if(i<ex.tokens.length-1){
            const zone = document.createElement('button');
            zone.type='button'; zone.className='comma-zone'; zone.dataset.idx=i;
            zone.addEventListener('click', ()=>{ arr[i] = (arr[i]==='—')? ',' : '—'; group.dataset.user = JSON.stringify(arr); rebuild(); });
            group.appendChild(zone);
            if(arr[i] === ','){
              const comma = document.createElement('span'); comma.className='comma-char'; comma.textContent=','; group.appendChild(comma);
              if(askWhy && ex.reasonsFull[i]){
                const dd=document.createElement('select'); dd.className='rule-picker';
                dd.innerHTML = '<option value="">Regel wählen…</option>' + Object.entries(RULES).map(([k,v])=>`<option value="${k}">${k} – ${v}</option>`).join('');
                dd.dataset.idx=i; group.appendChild(dd);
              }
            }
            group.appendChild(document.createTextNode(' '));
          }
        }
        if(teacherMode){
          const fb=document.createElement('div'); fb.className='feedback';
          const expected= ex.full.map((s,i)=> (ex.reasonsFull[i]? `${s} · ${ex.reasonsFull[i]}`: s)).join(' | ');
          fb.textContent='Hinweis (nur Lehrkraft): erwartetes Muster → '+expected; group.appendChild(fb);
        }
      }
      rebuild();
      exerciseEl.appendChild(group);
    });
    scoreEl.textContent='';
  }

  const arraysEqual=(a,b)=> a.length===b.length && a.every((v,i)=>v===b[i]);

  function isAccepted(ex, guess){
    if(arraysEqual(guess, ex.full)) return true;
    if(ex.altFull && ex.altFull.some(alt=>arraysEqual(guess, alt))) return true;
    const ch = !!(chBox && chBox.checked);
    if(ch){
      let ok=true; for(let i=0;i<guess.length;i++){ const req=ex.reasonsFull[i]||''; if(req==='D132'){ if(!(guess[i]===','||guess[i]==='—')){ok=false;break;} } else { if(guess[i]!==ex.full[i]){ok=false;break;} } } if(ok) return true;
    }
    return false;
  }

  function check(){
    let correct=0,total=0;
    $$('.sentence', exerciseEl).forEach((group, idx)=>{
      const ex = current[idx];
      const user = JSON.parse(group.dataset.user);
      let ok = isAccepted(ex, user);
      const askWhy = requireWhy?.checked || ex.level==='Profi' || ex.level==='Expert';
      if(askWhy){
        const picks = $$('.rule-picker', group);
        picks.forEach(dd=>{ const i=parseInt(dd.dataset.idx,10); const need=ex.reasonsFull[i]||''; if(need){ if(dd.value!==need) ok=false; } });
      }
      group.classList.remove('ok','bad'); group.classList.add(ok? 'ok':'bad'); if(ok) correct++; total++;
    });
    scoreEl.textContent = `Richtig: ${correct} / ${total}`;
  }

  function doReset(){
    const askWhy = requireWhy?.checked || levelSel.value==='Profi' || levelSel.value==='Expert';
    render(current, askWhy); scoreEl.textContent='';
  }

  loadBtn.addEventListener('click', ()=> pickLevel(levelSel.value));
  nextBtn.addEventListener('click', ()=> pickLevel(levelSel.value));
  checkBtn.addEventListener('click', check);
  resetBtn.addEventListener('click', doReset);

  pickLevel(levelSel.value);
})();
