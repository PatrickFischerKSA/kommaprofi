
(function(){
  const $ = (sel, el=document)=>el.querySelector(sel);
  const $$ = (sel, el=document)=>Array.from(el.querySelectorAll(sel));

  const tabs = $$('.tab-btn');
  tabs.forEach(btn=>btn.addEventListener('click',()=>{
    tabs.forEach(b=>b.classList.remove('active'));
    $$('.tab').forEach(t=>t.classList.remove('active'));
    btn.classList.add('active');
    const id = btn.dataset.tab; $('#'+id).classList.add('active');
  }));

  const levelSel = $('#level');
  const requireWhy = $('#require-why');
  const chBox = $('#ch-mode');
  const CH_KEY = 'kommaprofi_ch';
  const chMode = () => !!(chBox && chBox.checked);

  const loadBtn = $('#load');
  const nextBtn = $('#next');
  const checkBtn = $('#check');
  const exerciseEl = $('#exercise');
  const scoreEl = $('#score');

  let RULES = {}; let BANK = []; let current = [];

  fetch('data/rules.json').then(r=>r.json()).then(d=>RULES=d);
  fetch('data/exercises.json').then(r=>r.json()).then(d=>{ BANK=d; });

  // Init CH toggle from localStorage
  if (chBox){
    const saved = localStorage.getItem(CH_KEY);
    if (saved!==null) chBox.checked = (saved==='1');
    chBox.addEventListener('change', ()=>{
      localStorage.setItem(CH_KEY, chBox.checked ? '1' : '0');
    });
  }

  function pickLevel(lvl){
    const askWhy = requireWhy.checked || lvl==='Profi' || lvl==='Expert';
    const pool = BANK.filter(x=>x.level===lvl);
    const n = Math.min(5, pool.length);
    const shuffled = pool.sort(()=>Math.random()-0.5).slice(0,n);
    current = shuffled.map(s=>({ ...s }));
    render(current, askWhy);
  }

  function render(list, askWhy){
    exerciseEl.innerHTML='';
    list.forEach((ex)=>{
      const group = document.createElement('div');
      group.className='sentence';
      const parts = ex.text.split('|');
      for(let k=0;k<parts.length;k++){
        group.appendChild(document.createTextNode(parts[k]));
        if(k < parts.length-1){
          const slot = document.createElement('span');
          slot.className='slot';
          const sel = document.createElement('select');
          sel.innerHTML = '<option value="—">—</option><option value=",">,</option>';
          sel.dataset.idx = k;
          slot.appendChild(sel);
          if(askWhy){
            const why = document.createElement('select');
            why.className='why';
            let opts = '<option value="">Regel wählen …</option>';
            Object.entries(RULES).forEach(([k,v])=>opts += `<option value="${k}">${k} – ${v}</option>`);
            why.innerHTML = opts;
            slot.appendChild(why);
          }
          if(/[?&]teacher=1/.test(location.search)){
            const fb = document.createElement('div');
            fb.className='feedback';
            fb.textContent = `Soll: ${ex.slots[k]}${ex.reasons[k]?' • '+ex.reasons[k]:''}` + (ex.note?` • ${ex.note}`:'');
            slot.appendChild(fb);
          }
          group.appendChild(slot);
        }
      }
      exerciseEl.appendChild(group);
    });
    scoreEl.textContent='';
  }

  function arraysEqual(a,b){
    return a.length===b.length && a.every((v,i)=>v===b[i]);
  }

  function isAccepted(ex, guess){
    if(arraysEqual(guess, ex.slots)) return true;
    if(ex.also_ok){ if(ex.also_ok.some(alt=>arraysEqual(guess, alt))) return true; }
    // Schweiz-Option: D132 (Briefanrede) – sowohl Komma als auch kein Zeichen zulässig
    if(chMode()){
      let ok = true;
      for(let i=0;i<guess.length;i++){
        const req = (ex.reasons && ex.reasons[i]) || '';
        if(req === 'D132'){
          if(!(guess[i] === ',' || guess[i] === '—')){ ok = false; break; }
        } else {
          if(guess[i] !== ex.slots[i]){ ok = false; break; }
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
      const sels = $$('select:not(.why)', group);
      const whys = $$('.why', group);
      const guess = sels.map(s=>s.value);
      const ok = isAccepted(ex, guess);
      sels.forEach(s=>s.classList.remove('ok','bad'));
      whys.forEach(w=>w.classList.remove('ok','bad'));
      if(ok){
        correct++;
        sels.forEach(s=>s.classList.add('ok'));
        if(whys.length){
          whys.forEach((w,i)=>{
            const need = ex.reasons[i] || '';
            if(need){ (w.value===need? w.classList.add('ok') : w.classList.add('bad')); }
          });
        }
      } else {
        sels.forEach(s=>s.classList.add('bad'));
      }
      total++;
    });
    scoreEl.textContent = `Richtig: ${correct} / ${total}`;
  }

  loadBtn.addEventListener('click', ()=> pickLevel(levelSel.value));
  nextBtn.addEventListener('click', ()=> pickLevel(levelSel.value));
  checkBtn.addEventListener('click', check);

  pickLevel(levelSel.value);
})();
