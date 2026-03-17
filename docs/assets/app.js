
(function(){
  const $ = (sel, el=document)=>el.querySelector(sel);
  const $$ = (sel, el=document)=>Array.from(el.querySelectorAll(sel));

  const tabs = $$('.tab-btn');
  tabs.forEach(btn=>btn.addEventListener('click',()=>{
    tabs.forEach(b=>b.classList.remove('active'));
    $$('.tab').forEach(t=>t.classList.remove('active'));
    btn.classList.add('active');
    $('#'+btn.dataset.tab).classList.add('active');
  }));

  const levelSel = $('#level');
  const requireWhy = $('#require-why');
  const chBox = $('#ch-mode');
  const CH_KEY = 'kommaprofi_ch';

  const loadBtn = $('#load');
  const nextBtn = $('#next');
  const checkBtn = $('#check');
  const exerciseEl = $('#exercise');
  const scoreEl = $('#score');

  let RULES = {}; let BANK = []; let current = [];

  fetch('data/rules.json').then(r=>r.json()).then(d=>RULES=d);
  fetch('data/exercises.json').then(r=>r.json()).then(d=>{ BANK=d; });

  // Persist CH mode
  if (chBox){
    const saved = localStorage.getItem(CH_KEY);
    if (saved!==null) chBox.checked = (saved==='1');
    chBox.addEventListener('change', ()=>{
      localStorage.setItem(CH_KEY, chBox.checked ? '1' : '0');
    });
  }

  function normalizeSpaces(s){ return s.replace(/\s+/g,' ').trim(); }
  function tokenize(s){ return normalizeSpaces(s).split(' '); }

  // Build a plain sentence without '|' + compute mapping of slot boundaries → word boundaries
  function compileExercise(ex){
    const parts = ex.text.split('|');
    const plain = normalizeSpaces(parts.join(' '));

    // boundaryIndices: positions between tokens (0..tokens-2) that correspond to original slots
    const tokens = tokenize(plain);
    let boundaryIndices = [];
    let left = '';
    for(let i=0;i<parts.length-1;i++){
      left = normalizeSpaces((left + ' ' + parts[i]).trim());
      const leftTokens = left ? tokenize(left).length : 0;
      const idx = Math.max(0, leftTokens-1);
      boundaryIndices.push(idx);
    }

    // expected full comma vector for all word gaps (default no comma)
    const full = new Array(Math.max(0, tokens.length-1)).fill('—');
    ex.slots.forEach((sym, j)=>{ const b = boundaryIndices[j]; if(b!=null) full[b]=sym; });

    // also_ok expand
    const altFull = (ex.also_ok||[]).map(alt=>{
      const v = new Array(full.length).fill('—');
      alt.forEach((sym, j)=>{ const b = boundaryIndices[j]; if(b!=null) v[b]=sym; });
      return v;
    });

    // reasons full mapping
    const reasonsFull = new Array(full.length).fill('');
    (ex.reasons||[]).forEach((r,j)=>{ const b = boundaryIndices[j]; if(b!=null) reasonsFull[b]=r; });

    return { ...ex, plain, tokens, full, altFull, reasonsFull };
  }

  function pickLevel(lvl){
    const askWhy = requireWhy.checked || lvl==='Profi' || lvl==='Expert';
    const pool = BANK.filter(x=>x.level===lvl);
    const n = Math.min(5, pool.length);
    const shuffled = pool.sort(()=>Math.random()-0.5).slice(0,n)
                         .map(compileExercise);
    current = shuffled;
    render(current, askWhy);
  }

  function render(list, askWhy){
    exerciseEl.innerHTML='';
    list.forEach((ex)=>{
      const group = document.createElement('div');
      group.className='sentence';
      group.dataset.plain = ex.plain;
      // user comma vector: initially none
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
            // invisible clickable zone
            const zone = document.createElement('span');
            zone.className='comma-zone';
            zone.dataset.idx = i;
            zone.addEventListener('click', ()=>{
              arr[i] = (arr[i]==='—') ? ',' : '—';
              group.dataset.user = JSON.stringify(arr);
              rebuild();
            });
            group.appendChild(zone);

            if(arr[i] === ','){
              const comma = document.createElement('span');
              comma.className='comma-char';
              comma.textContent=',';
              group.appendChild(comma);

              // Rule picker only if this boundary is evaluable (has a target reason)
              if(askWhy && ex.reasonsFull[i]){
                const dd = document.createElement('select');
                dd.className='rule-picker';
                dd.innerHTML = '<option value="">Regel wählen…</option>' +
                  Object.entries(RULES).map(([k,v])=>`<option value="${k}">${k} – ${v}</option>`).join('');
                dd.dataset.idx = i;
                group.appendChild(dd);
              }
            }

            // space between words
            group.appendChild(document.createTextNode(' '));
          }
        }

        if(teacherMode){
          const fb = document.createElement('div');
          fb.className='feedback';
          const expected = ex.full.map((s,i)=> (ex.reasonsFull[i]? `${s}${ex.reasonsFull[i]?' · '+ex.reasonsFull[i]:''}` : s)).join(' | ');
          fb.textContent = 'Hinweis (nur Lehrkraft): erwartetes Muster → ' + expected;
          group.appendChild(fb);
        }
      }

      rebuild();
      exerciseEl.appendChild(group);
    });
    scoreEl.textContent='';
  }

  function arraysEqual(a,b){
    return a.length===b.length && a.every((v,i)=>v===b[i]);
  }

  function isAccepted(ex, guess){
    // baseline
    if(arraysEqual(guess, ex.full)) return true;
    if(ex.altFull && ex.altFull.some(alt=>arraysEqual(guess, alt))) return true;

    // Schweiz-Option D132: akzeptiere , und — bei D132-Grenzen
    const ch = !!(chBox && chBox.checked);
    if(ch){
      let ok = true;
      for(let i=0;i<guess.length;i++){
        const req = ex.reasonsFull[i] || '';
        if(req === 'D132'){
          if(!(guess[i] === ',' || guess[i] === '—')) { ok = false; break; }
        } else {
          if(guess[i] !== ex.full[i]) { ok = false; break; }
        }
      }
      if(ok) return true;
    }
    return false;
  }

  function check(){
    let correct=0, total=0;
    $$('.sentence', exerciseEl).forEach((group, idx)=>{
      const ex = current[idx];
      const user = JSON.parse(group.dataset.user);
      let ok = isAccepted(ex, user);

      // Rule check (only for positions that have a target reason and user set a comma)
      const askWhy = requireWhy.checked || ex.level==='Profi' || ex.level==='Expert';
      if(askWhy){
        const picks = $$('.rule-picker', group);
        picks.forEach(dd=>{
          const i = parseInt(dd.dataset.idx,10);
          const need = ex.reasonsFull[i] || '';
          if(need){ if(dd.value !== need) ok = false; }
        });
      }

      group.classList.remove('ok','bad');
      group.classList.add(ok? 'ok' : 'bad');
      if(ok) correct++;
      total++;
    });
    scoreEl.textContent = `Richtig: ${correct} / ${total}`;
  }

  loadBtn.addEventListener('click', ()=> pickLevel(levelSel.value));
  nextBtn.addEventListener('click', ()=> pickLevel(levelSel.value));
  checkBtn.addEventListener('click', check);

  // Default
  pickLevel(levelSel.value);
})();
