'use strict';

let bizType = '', streetMode = false, history = [], charts = {};
let currentAnalysisData = null, currentAnalysisScores = null, currentAnalysisIsStreet = false;
let chatMessages = [], chatBusy = false;
try { const s = localStorage.getItem('sip_history'); if (s) history = JSON.parse(s); updateHC(); } catch(e) { history = []; }

// benchmark percentiles by business type
const BENCHMARKS = {
  'Street Food':    { surv:58, prof:52, scal:41, ldom:62, comp:67 },
  'Tech Startup':   { surv:44, prof:38, scal:61, ldom:39, comp:52 },
  'SaaS':           { surv:48, prof:55, scal:72, ldom:35, comp:56 },
  'E-Commerce':     { surv:51, prof:46, scal:58, ldom:44, comp:53 },
  'Service':        { surv:60, prof:57, scal:44, ldom:55, comp:58 },
  'Local Shop':     { surv:62, prof:54, scal:38, ldom:60, comp:57 },
  'Franchise':      { surv:66, prof:61, scal:55, ldom:58, comp:62 },
  'Manufacturing':  { surv:55, prof:50, scal:48, ldom:47, comp:55 },
  'default':        { surv:52, prof:49, scal:52, ldom:49, comp:54 },
};

const g   = id => document.getElementById(id);
const gv  = id => (g(id) ? g(id).value.trim() : '');
const gn  = id => parseFloat(gv(id)) || 0;
function sl(map, key, def = 50) { return (key && map[key] !== undefined) ? map[key] : def; }
function cl(v, mn = 5, mx = 97)  { return Math.max(mn, Math.min(mx, Math.round(v))); }
function sc(s) { return s >= 70 ? '#22c55e' : s >= 50 ? '#f59e0b' : '#ef4444'; }

const FE = {'First-time founder':.62,'1 previous venture (failed)':.74,'1 previous venture (exited)':.88,'Serial entrepreneur (2+ ventures)':.95,'Ex-FAANG / Big Tech exec':.85,'Domain expert (10+ years)':.82,'Family business background':.76};
const TS = {'1 (solo founder)':38,'2–5':72,'6–15':84,'16–50':78,'50+':68};
const FS = {'Low (residential / quiet)':22,'Medium (mixed area)':55,'High (market / station)':82,'Very High (prime location)':96};
const LS = {'Railway Station':90,'College / University':85,'Office Hub / IT Park':80,'Shopping Mall':75,'Hospital':65,'School':70,'Market / Bazaar':85,'Multiple Landmarks':95};
const DS = {'Under 100m (walking distance)':95,'100m – 500m':80,'500m – 2km':55,'2km+':25};
const DC = {'Under 100m':90,'100m – 500m':75,'500m – 2km':50,'2km+':20};
const AC = {'None — first in area':90,'Low (1–3 competitors)':75,'Medium (4–10 competitors)':55,'High (10+ competitors)':35,'Saturated':18};
const FST = {'Self-funded / Bootstrapped':25,'Family & Friends':38,'Pre-seed':50,'Seed':65,'Series A':78,'Series B':88,'Series C+':95};
const FA  = {'Under ₹50K':20,'₹50K – ₹2L':38,'₹2L – ₹10L':55,'₹10L – ₹50L':68,'₹50L – ₹1Cr':82,'₹1Cr+':95};
const MS  = {'Hyper Local (1 area)':20,'City Level':45,'State Level':62,'National (India)':82,'International':96};
const RV  = {'No revenue yet':10,'First customers / Beta':30,'₹0–₹50K/month':45,'₹50K–₹2L/month':62,'₹2L–₹10L/month':80,'₹10L+/month':96};
const PS  = {'Idea only':12,'Building / In development':32,'Launched (basic)':55,'Product-market fit found':80,'Scaling':92};
const CM  = {'Blue ocean (no direct competitors)':72,'Few niche competitors':82,'Moderate — established players':62,'Highly competitive — giants present':40,'Saturated market':22};
const TR  = {'Dying / Declining':10,'Stable / Flat':40,'Growing steadily':65,'Trending (popular now)':85,'Viral / Explosive growth':97};
const SP  = {'None (year-round stable)':1.0,'Mild seasonal variation':.96,'Moderate (summer/winter effect)':.90,'High (monsoon/festival heavy)':.82,'Extreme (only 3–4 months busy)':.68};
const WP  = {'None (indoor/digital)':1.0,'Low':.96,'Medium (outdoor, some impact)':.88,'High (rain stops business)':.72};
const LC  = {'Fully Licensed (all docs)':95,'Partially Licensed':60,'No License':15,'In Process':45};
const PR  = {'No Risk (licensed, indoor)':90,'Low Risk':72,'Medium (occasional checks)':48,'High (unlicensed, outdoor)':15};
const HY  = {'Basic':40,'Moderate':70,'High':95};
const ON  = {'Yes — Active website + social':90,'Yes — Social media only':68,'Minimal (just WhatsApp)':40,'No online presence':10};
const AG  = {'Yes — Both platforms':90,'Yes — One platform':65,'No — Plan to list':30,'No — Not applicable':0};
const BK  = {'Already profitable':95,'Under 1 month':85,'1–3 months':72,'3–6 months':58,'6–12 months':42,'1–2 years':28,'2+ years':15};
const IT  = {'AI / ML':94,'Cybersecurity':88,'HealthTech':82,'FinTech':78,'CleanTech':76,'BioTech':74,'SaaS / B2B Software':72,'Logistics / Supply Chain':65,'EdTech':60,'Consumer App':55,'E-Commerce':52,'Web3 / Crypto':36,'Food & Beverage':70,'Retail':55,'Other':58};
const FD  = {'Pani Puri / Gol Gappa':95,'Vada Pav':90,'Chai / Tea':88,'Chaat':85,'Chinese (Noodles/Momos)':82,'Rolls / Wraps':80,'Juice / Shakes':78,'Bhel / Sev Puri':76,'Sandwich / Burger':72,'Dosa / South Indian':70,'Biryani / Rice':68,'Ice Cream / Kulfi':65,'Other Street Food':55};
const RM  = {'Stable (vegetable / grain based)':1.0,'Moderate (mixed ingredients)':.93,'High (seasonal / imported)':.83};

function toggleMode() {
  streetMode = !streetMode;
  const t = g('modetog'); if (t) t.classList.toggle('on', streetMode);
  g('mtitle').innerHTML = streetMode ? 'Street Business <span id="mspan">Intelligence</span>' : 'Startup Intelligence <span id="mspan">Platform</span>';
  g('mspan').style.color = 'var(--at)';
  g('msubtitle').textContent = streetMode
    ? 'Deep signal analysis for street food, local shops, and grassroots businesses.'
    : 'ML-adaptive scoring engine + Claude AI deep analysis. From SaaS startups to street food stalls.';
  g('btxt').textContent = streetMode ? 'ANALYZE MY BUSINESS' : 'ANALYZE & PREDICT';
}

function selBiz(el) {
  document.querySelectorAll('.biz-tile').forEach(t => t.classList.remove('on'));
  el.classList.add('on');
  bizType = el.dataset.v;
  g('biz-type').value = bizType;
  const sf = g('sf-fields');
  if (bizType === 'Street Food') { sf.classList.remove('hidden'); if (!streetMode) toggleMode(); }
  else { sf.classList.add('hidden'); if (streetMode) toggleMode(); }
}

function updateHC() { const e = g('hcnt'); if (e) e.textContent = history.length; }/*         <!-- Author
Yasir Shaikh GitHub: https://github.com/YasirShaikh03 -->*/
function toggleHist() { const p = g('hpanel'); p.classList.toggle('hidden'); renderHL(); }
function renderHL() {
  const el = g('hlist'); if (!el) return;
  if (!history.length) { el.innerHTML = '<div class="hist-empty">No analyses yet.</div>'; return; }
  el.innerHTML = `<div class="hist-list-wrap">${history.map(h => `
    <div class="hi">
      <div><div class="hi-name">${h.name} <span style="color:var(--mu);font-size:.7rem">(${h.bizType||'—'})</span></div>
      <div class="hi-meta">${h.city||'—'} · ${h.ts}</div></div>
      <div class="hi-score" style="color:${sc(h.score)}">${h.score}</div>
    </div>`).join('')}</div>`;
}
function clearHist() {
  if (!confirm('Clear all history?')) return;
  history = []; try { localStorage.removeItem('sip_history'); } catch(e) {}
  updateHC(); renderHL();
}
function exportAll() {
  const b = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(b);
  a.download = 'sip_history.json'; a.click();
}
function saveHistory(d, scores) {
  const entry = { id: Date.now(), name: d.name, bizType: d.bizType, city: d.city, score: scores.compositeScore, ts: new Date().toLocaleString('en-IN'), data: d, scores };
  history.unshift(entry);
  if (history.length > 20) history = history.slice(0, 20);
  try { localStorage.setItem('sip_history', JSON.stringify(history)); } catch(e) {}
  updateHC(); renderHL();
}

function collect() {
  return {
    name: gv('sname') || 'My Business', bizType: bizType || gv('biz-type'), isStreet: streetMode,
    city: gv('city'), state: gv('state'), area: gv('area'),
    footfall: gv('footfall'), landmarks: gv('landmarks'), rent: gn('rent'),
    areaComp: gv('area-comp'), distSta: gv('dist-sta'), distCol: gv('dist-col'), crowdType: gv('crowd-type'),
    industry: gv('industry'), fexp: gv('fexp'), tsize: gv('tsize'),
    targetAudience: gv('target-audience'), buyFreq: gv('buy-freq'),
    foodType: gv('food-type'), stallType: gv('stall-type'),
    dailyCust: gn('daily-cust'), avgPrice: gn('avg-price'), peakHours: gv('peak-hrs'),
    hygiene: gv('hygiene'), repeatRate: gn('repeat-rate'), tasteRating: gn('taste-rating'),
    dailyWaste: gn('daily-waste'), rmVar: gv('rm-var'), licSt: gv('license-st'), policeRisk: gv('police-risk'),
    rev: gv('rev'), pstage: gv('pstage'), fstage: gv('fstage'), famt: gv('famt'), msize: gv('msize'),
    dailyRev: gn('d-rev'), monthlyRev: gn('m-rev'), margin: gn('margin'), growthRate: gn('g-rate'),
    costUnit: gn('cost-unit'), sellPrice: gn('sell-price'), breakeven: gv('breakeven'),
    comp: gv('comp'), trend: gv('trend'), seasonal: gv('seasonal'), weather: gv('weather'),
    expansion: gv('expansion'), diff: gv('diff'),
    license: gv('license'), police: gv('police'), online: gv('online'), aggr: gv('aggr'),
    marketing: gv('marketing'), adSpend: gn('ad-spend'), bizAge: gv('biz-age'), employees: gn('employees'),
    description: gv('description'),
  };
}

function mlMult(d, base) {
  let m = 1.0;
  const fm = sl(FE, d.fexp, .68), tr = sl(TS, d.tsize, 45);
  if (fm >= .88 && tr >= 72) m *= 1.08;
  if (fm <= .62 && d.tsize === '1 (solo founder)') m *= .78;
  const ms = sl(MS, d.msize, 45), tn = sl(TR, d.trend, 50);
  if (ms >= 82 && tn >= 85) m *= 1.10;
  if (ms <= 20 && tn <= 40) m *= .80;
  if (d.growthRate >= 30) m *= 1.08; else if (d.growthRate >= 15) m *= 1.04;
  const rv = sl(RV, d.rev, 10), fs = sl(FST, d.fstage, 35);
  if (rv >= 80 && fs >= 78) m *= 1.10;
  if (rv <= 10 && fs <= 25) m *= .85;
  if (d.pstage === 'Product-market fit found') m *= 1.07;
  if (d.comp === 'Saturated market') m *= .90;
  if (d.license === 'No License' || d.licSt === 'No License') m *= .88;
  return Math.max(.65, Math.min(1.28, m));
}

function computeStartup(d) {
  const fm  = sl(FE, d.fexp, .68),  tr  = sl(TS, d.tsize, 45);
  const fs  = sl(FST, d.fstage, 35), fa  = sl(FA, d.famt, 30);
  const ms  = sl(MS, d.msize, 45),   rv  = sl(RV, d.rev, 10);
  const ps  = sl(PS, d.pstage, 20),  cm  = sl(CM, d.comp, 55);
  const tn  = sl(TR, d.trend, 50),   it  = sl(IT, d.industry, 58);
  const on  = sl(ON, d.online, 20),  ag  = sl(AG, d.aggr, 0);
  const fp  = sl(FS, d.footfall, 45), ac = sl(AC, d.areaComp, 50);
  const lc  = sl(LC, d.license, 40), sp = sl(SP, d.seasonal, .95);
  const wp  = sl(WP, d.weather, 1.0);
  const teamS  = cl(tr * fm * 1.05);
  const mktS   = cl(ms * .65 + cm * .25 + tn * .10);
  const tracS  = cl(rv * .60 + ps * .30 + on * .10);
  const funS   = cl(fs * .50 + fa * .50);
  const timS   = cl(it * .70 + tn * .30);
  const moatS  = cl(cm * .40 + ms * .30 + tr * fm * .30);
  const locS   = cl(fp * .50 + ac * .30 + sl(LS, d.landmarks, 45) * .20);
  const digS   = cl(on * .60 + ag * .40);
  const pen    = (d.tsize === '1 (solo founder)' ? .88 : 1.0) * (d.rev === 'No revenue yet' ? .84 : 1.0) * (d.comp === 'Saturated market' ? .80 : 1.0) * (d.msize === 'Hyper Local (1 area)' ? .82 : 1.0) * (d.industry === 'Web3 / Crypto' ? .88 : 1.0) * sp * wp;
  const raw    = (tracS*.24 + mktS*.20 + teamS*.18 + funS*.14 + timS*.10 + moatS*.08 + locS*.04 + digS*.02) * pen;
  const base   = cl(raw), ml = mlMult(d, base), comp = cl(base * ml);
  const surv   = cl(funS * .40 + tracS * .35 + teamS * .25);
  const prof   = cl(tracS * .45 + funS * .30 + moatS * .25);
  const scal   = cl(mktS * .40 + moatS * .30 + teamS * .30);
  const ldom   = cl(locS * .40 + ac * .35 + tracS * .25);
  return { compositeScore: comp, teamS, mktS, tracS, funS, timS, moatS, locS, digS, surv, prof, scal, ldom, fm, lc, mlAdj: Math.round((ml - 1) * 100) };
}

function computeStreet(d) {
  const fp = sl(FS, d.footfall, 50), ls = sl(LS, d.landmarks, 40);
  const ac = sl(AC, d.areaComp, 50), ds = sl(DS, d.distSta, 40), dc = sl(DC, d.distCol, 35);
  const locS  = cl(fp*.30 + ls*.20 + ac*.20 + ds*.12 + dc*.10 + 30*.08);
  const fd    = sl(FD, d.foodType, 60), hy = sl(HY, d.hygiene, 50);
  const ts    = d.tasteRating > 0 ? d.tasteRating * 10 : 60;
  const rs    = d.repeatRate > 0 ? Math.min(100, d.repeatRate * 1.1) : 50;
  const tn    = sl(TR, d.trend, 50);
  const prodS = cl(fd*.25 + hy*.20 + ts*.20 + rs*.20 + tn*.15);
  const lc    = sl(LC, d.licSt || d.license, 40), pr = sl(PR, d.policeRisk, 55);
  const rm    = sl(RM, d.rmVar, .92);
  const wp2   = d.dailyWaste > 0 ? Math.max(.60, 1 - d.dailyWaste / 100) : .90;
  const wt    = sl(WP, d.weather, .90);
  const opsS  = cl((lc*.35 + pr*.35 + 70*.30) * rm * wp2 * wt);
  const mg    = d.margin > 0 ? Math.min(100, d.margin * 1.2) : 50;
  const bk    = sl(BK, d.breakeven, 40);
  const dr    = d.dailyRev > 0 ? Math.min(100, (d.dailyRev / 5000) * 80 + 20) : 30;
  const rr    = (d.dailyRev > 0 && d.rent > 0) ? Math.min(100, Math.max(10, 100 - (d.rent / (d.dailyRev * 25)) * 100)) : 50;
  const finS  = cl(mg*.30 + bk*.25 + dr*.25 + rr*.20);
  const on    = sl(ON, d.online, 15), ag = sl(AG, d.aggr, 0);
  const grwS  = cl(on*.35 + ag*.30 + 50*.35);
  const sp    = sl(SP, d.seasonal, .92);
  const raw   = (locS*.28 + prodS*.25 + finS*.22 + opsS*.15 + grwS*.10) * sp;
  const base  = cl(raw), ml = mlMult(d, base), comp = cl(base * ml);
  const surv  = cl(lc*.30 + pr*.25 + opsS*.25 + finS*.20);
  const prof  = cl(mg*.35 + bk*.25 + (100 - d.dailyWaste)*.20 + rr*.20);
  const scal  = cl(grwS*.40 + prodS*.30 + locS*.30);
  const ldom  = cl(locS*.35 + ac*.30 + prodS*.20 + rs*.15);
  return { compositeScore: comp, locS, prodS, finS, opsS, grwS, surv, prof, scal, ldom, lc, mg, fd, hy, ts, rs, mlAdj: Math.round((ml - 1) * 100) };
}

function ring(score) {
  const c = sc(score), r = 64, cx = 74, cy = 74, ci = 2 * Math.PI * r, dash = (score / 100) * ci;
  return `<svg viewBox="0 0 148 148" fill="none"><circle cx="${cx}" cy="${cy}" r="${r}" stroke="#252836" stroke-width="8"/><circle cx="${cx}" cy="${cy}" r="${r}" stroke="${c}" stroke-width="8" stroke-dasharray="${dash.toFixed(2)} ${(ci-dash).toFixed(2)}" stroke-dashoffset="${(ci*.25).toFixed(2)}" stroke-linecap="round"/></svg>`;
}

function verdictStyle(s) {
  if (s >= 72) return { bg:'#0a1f12', bd:'#22c55e', co:'#22c55e', lb:'STRONG PASS ✓' };
  if (s >= 58) return { bg:'#0d1a2e', bd:'#60a5fa', co:'#93c5fd', lb:'CONDITIONAL PASS' };
  if (s >= 42) return { bg:'#2d1e08', bd:'#f59e0b', co:'#fbbf24', lb:'WATCH ◐' };
  return { bg:'#1f0a0a', bd:'#ef4444', co:'#fca5a5', lb:'HARD PASS ✗' };
}

function getPct(score) {
  if (score >= 85) return 95; if (score >= 75) return 85; if (score >= 65) return 72;
  if (score >= 55) return 55; if (score >= 45) return 38; if (score >= 35) return 22; return 12;
}

function fiItems(d, sc2, isS) {
  if (isS) return [
    { l:'Location Quality', v:Math.min(98, Math.round(sc2.locS*.95)),  w:`${d.footfall||'?'} footfall + ${d.landmarks||'landmark'} proximity — 28% of total score` },
    { l:'Product / Taste',  v:Math.min(98, Math.round(sc2.prodS*.92)), w:`${d.foodType||'?'} demand + hygiene ${sc2.hy||50}/100 + taste ${sc2.ts||60}/100` },
    { l:'Unit Economics',   v:Math.min(98, Math.round(sc2.finS*.90)),  w:`Margin ${d.margin||0}%, break-even ${d.breakeven||'?'}, daily revenue vs rent ratio` },
    { l:'Operations & Legal', v:Math.min(98, Math.round(sc2.opsS*.88)), w:`License ${d.licSt||d.license||'unknown'}, police risk, waste ${d.dailyWaste||0}%` },
    { l:'Digital & Growth', v:Math.min(98, Math.round(sc2.grwS*.85)),  w:`Online ${d.online||'none'}, aggregator ${d.aggr||'none'}` },
    { l:'Area Competition', v:Math.min(98, Math.round(sl(AC,d.areaComp,50)*.88)), w:'First-mover advantage in area — worth 18–32 score points' },
  ];
  return [
    { l:'Revenue Traction', v:Math.min(98, Math.round(sc2.tracS*.95+5)), w:`${d.rev||'No revenue'} — most predictive VC signal by research` },
    { l:'Market & Trend',   v:Math.min(98, Math.round(sc2.mktS*.90+8)),  w:`TAM ${d.msize||'?'}, competition ${d.comp||'?'}, trend ${d.trend||'?'}` },
    { l:'Founder & Team',   v:Math.min(98, Math.round(sc2.teamS*.95+4)), w:`${d.fexp||'?'} (${Math.round((sc2.fm||.68)*100)}% mult.), team ${d.tsize||'?'}` },
    { l:'Funding Runway',   v:Math.min(98, Math.round(sc2.funS*.85+10)), w:`Stage ${d.fstage||'?'} — runway determines iteration time` },
    { l:'Moat',             v:Math.min(98, Math.round(sc2.moatS*.88+6)), w:`Competition + market size — long-term defensibility factor` },
    { l:'Industry Timing',  v:Math.min(98, Math.round(sc2.timS*.88+5)),  w:`${d.industry||'?'} — timing is a ±34pt swing in investor appetite` },
  ];
}

function explItems(d, sc2, isS) {
  const items = [];
  items.push({ f:'Base ML Score', w:`Rule engine using ${isS?6:8} weighted dimensions`, im:`${cl(sc2.compositeScore / Math.max(.65, 1 + sc2.mlAdj / 100))}`, t:'u' });
  if (sc2.mlAdj !== 0) items.push({ f:'ML Adaptive Adj.', w:`Pattern-matching detected ${sc2.mlAdj>0?'positive':'negative'} signal cluster`, im:`${sc2.mlAdj>0?'+':''}${sc2.mlAdj}%`, t: sc2.mlAdj>0?'p':'n' });
  if (isS) {
    items.push({ f:'Location (28%)', w:`${d.footfall||'?'} footfall — single largest dimension`, im:`${sc2.locS}/100`, t:sc2.locS>=65?'p':'n' });
    items.push({ f:'Product (25%)', w:`${d.foodType||'?'} demand ${sc2.fd||60}/100 × hygiene ${sc2.hy||50}/100 × taste ${sc2.ts||60}/100`, im:`${sc2.prodS}/100`, t:sc2.prodS>=65?'p':'n' });
    items.push({ f:'License', w:`${d.licSt||d.license||'No license'} → ${sc2.lc||15}/100 — gating factor`, im:`${sc2.lc||15}/100`, t:(sc2.lc||15)>=60?'p':'n' });
  } else {
    items.push({ f:'Traction (24%)', w:`${d.rev||'No revenue'} → ${sl(RV,d.rev,10)}/100 ${d.rev==='No revenue yet'?'— applies ×0.84 penalty':'— revenue de-risks everything'}`, im:`${sc2.tracS}/100`, t:sc2.tracS>=60?'p':'n' });
    items.push({ f:'Founder (18%)', w:`${d.fexp||'Unknown'} → ${Math.round((sc2.fm||.68)*100)}% multiplier applied to team score`, im:`×${(sc2.fm||.68).toFixed(2)}`, t:(sc2.fm||.68)>=.80?'p':'n' });
    items.push({ f:'Market (20%)', w:`TAM + competition + trend → ${sc2.mktS}/100`, im:`${sc2.mktS}/100`, t:sc2.mktS>=60?'p':'n' });/*         <!-- Author
Yasir Shaikh GitHub: https://github.com/YasirShaikh03 -->*/
  }
  return items;
}

function locInsight(d, locScore) {
  const city = d.city || 'your city', area = d.area || 'your area', tags = [];
  if (d.footfall && d.footfall.includes('High'))  tags.push({ l:'HIGH FOOTFALL', t:'g' });
  if (d.footfall && d.footfall.includes('Low'))   tags.push({ l:'LOW FOOTFALL', t:'b' });
  if (d.distSta === 'Under 100m (walking distance)') tags.push({ l:'NEAR STATION', t:'g' });
  if (d.distCol === 'Under 100m') tags.push({ l:'NEAR COLLEGE', t:'g' });
  if (d.areaComp && d.areaComp.includes('None')) tags.push({ l:'FIRST IN AREA', t:'g' });
  if (d.areaComp && d.areaComp.includes('Saturated')) tags.push({ l:'SATURATED AREA', t:'b' });
  if (d.landmarks) tags.push({ l:d.landmarks.toUpperCase(), t:'n' });
  const txt = locScore >= 75 ? `${area}, ${city} is a high-opportunity location — ${d.footfall||'strong'} footfall + ${d.landmarks||'landmark'} proximity creates consistent walk-in volume.`
    : locScore >= 55 ? `${area}, ${city} is decent with optimization potential. Moving closer to ${d.landmarks||'nearest landmark'} could add 20–40% more customers.`
    : `${area}, ${city} has location challenges. Testing a higher-footfall spot for one week before committing is strongly recommended.`;
  return { tags, txt };
}

function scaleSteps(d, score, isS) {
  const n = d.name || 'Your Business';
  if (isS) return [
    { tag:'Week 1–2', txt:'Get FSSAI + trade license. List on Swiggy/Zomato. Set up WhatsApp Business. Start daily revenue tracking.' },
    { tag:'Month 1', txt:'Optimize location using footfall data. Test 2 peak hour variations. Launch loyalty program.' },
    { tag:'Month 2–3', txt:'Reduce waste below 10% with demand-batch production. Add 1 premium item at 40% higher margin.' },
    { tag:'Month 4–6', txt:`Scout a second high-footfall location (station exit or college gate) within 3km of ${d.city||'your city'}.` },
    { tag:'Month 6', txt:`${n} should target ₹5,000–₹8,000 daily from primary location. Use surplus to fund expansion.` },
    { tag:'Year 1', txt:'2-location operation. Standardize recipe, ops, and hygiene as a replicable franchise blueprint.' },
    { tag:'Year 2', txt:`Franchise Model: license brand to 5 operators for ₹50K–₹2L each + 5% royalty. ${n} becomes an asset.` },
    { tag:'Year 3', txt:'Target ₹10L+/month across 10+ outlets. Build central supply kitchen for cost efficiency.' },
    { tag:'Year 4–5', txt:'National franchise potential. Register trademark. Build cloud kitchen arm for delivery-only revenue.' },
    { tag:'Exit Path', txt:'50+ franchise networks have sold for ₹2–10Cr. A packaged product line creates 5–8x annual revenue FMCG asset.' },
  ];
  if (score >= 72) return [
    { tag:'Now', txt:`${n} is fundable. Prepare Series A data room: P&L, cohort retention, CAC/LTV, 3 customer case studies.` },
    { tag:'90 Days', txt:'Hire a sales/growth lead and senior engineer — these two hires compound every other metric.' },
    { tag:'6 Months', txt:'Build 3 enterprise case studies and a referral program. Target 40% of new ARR from referrals.' },
    { tag:'Year 1', txt:'Target 3–5x ARR growth with NRR > 110%. Existing customers driving growth is the PMF signal.' },
    { tag:'Series A', txt:'At ₹2–5Cr ARR with 3x growth, target ₹10–25Cr raise at ₹60–120Cr valuation.' },
    { tag:'Year 2', txt:'Expand into 2 adjacent segments — prioritize where existing customers have subsidiaries.' },
    { tag:'Year 3', txt:`${n} should reach ₹10–20Cr ARR. Platform strategy creates next step-change in valuation multiple.` },
    { tag:'Series B', txt:'₹15Cr+ ARR with international signals positions for ₹50–100Cr Series B from global funds.' },
    { tag:'Year 5', txt:'Target ₹50–100Cr ARR. Run secondary transaction to provide early team and investor liquidity.' },
    { tag:'Exit Path', txt:'Strategic acquisition (3–8x ARR) or IPO (8–15x ARR) are primary exit paths at this scale.' },
  ];
  return [
    { tag:'This Week', txt:'Find the single most critical unknown. Design the cheapest experiment to answer it in 7 days.' },
    { tag:'Month 1', txt:'Get 10 paying customers at any price — revenue validates the model more than any other signal.' },
    { tag:'Month 2–3', txt:'Document exactly why those 10 customers bought — job-to-be-done, pain, alternatives considered.' },
    { tag:'Month 4–6', txt:'Build 12-month financial model with weekly granularity. Know exact runway and burn rate.' },
    { tag:'6 Months', txt:'Aim for ₹25–50L ARR with 3+ months of consecutive growth to build a fundraising narrative.' },
    { tag:'Seed Round', txt:'With ₹50L ARR and growing, target ₹1–3Cr seed from angels or micro-VCs.' },
    { tag:'Year 1', txt:'Establish category leadership in one narrow vertical before expanding — depth before breadth always wins.' },
    { tag:'Year 2', txt:'Build moat deliberately — proprietary data, network effects, or integrations that create switching costs.' },
    { tag:'Year 3', txt:`${n} needs clear answers: ideal customer, CAC/LTV, net retention. These predict Series A fundability.` },
    { tag:'Long-term', txt:'The ₹1Cr to ₹10Cr ARR path is won by distribution advantages, not product advantages. Invest early.' },
  ];
}

function destroyCharts() { Object.values(charts).forEach(c => { try { c.destroy(); } catch(e) {} }); charts = {}; }

function drawCharts(sc2, fi, isS, d) {
  let attempts = 0;
  function tryDraw() {
    if (typeof Chart === 'undefined') {
      if (++attempts < 10) { setTimeout(tryDraw, 200); return; }
      return;
    }
    setTimeout(() => {
    const radarEl = g('ch-radar');
    if (radarEl) charts.radar = new Chart(radarEl, { type:'radar', data:{ labels:fi.map(i=>i.l.split(' ')[0]), datasets:[{ data:fi.map(i=>i.v), backgroundColor:'rgba(245,158,11,.12)', borderColor:'#f59e0b', borderWidth:2, pointBackgroundColor:fi.map(i=>sc(i.v)), pointRadius:4 }] }, options:{ responsive:true, maintainAspectRatio:false, scales:{ r:{ min:0, max:100, ticks:{display:false}, grid:{color:'rgba(255,255,255,.05)'}, angleLines:{color:'rgba(255,255,255,.05)'}, pointLabels:{color:'#5a6380',font:{size:9}} } }, plugins:{ legend:{display:false} } } });

    const barEl = g('ch-bar');
    if (barEl) charts.bar = new Chart(barEl, { type:'bar', data:{ labels:fi.map(i=>i.l.split(' ')[0]), datasets:[{ data:fi.map(i=>i.v), backgroundColor:fi.map(i=>i.v>=70?'rgba(34,197,94,.6)':i.v>=50?'rgba(245,158,11,.6)':'rgba(239,68,68,.6)'), borderRadius:4 }] }, options:{ responsive:true, maintainAspectRatio:false, indexAxis:'y', scales:{ x:{min:0,max:100,grid:{color:'rgba(255,255,255,.04)'},ticks:{color:'#5a6380',font:{size:8}}}, y:{grid:{display:false},ticks:{color:'#8892b0',font:{size:8}}} }, plugins:{legend:{display:false}} } });

    const lineEl = g('ch-line');
    if (lineEl) {
      const gr = d.growthRate > 0 ? d.growthRate / 100 : .10;
      const base = (d.dailyRev > 0 ? d.dailyRev * 26 : d.monthlyRev) || 50000;
      const lbl = ['Now','M1','M2','M3','M4','M5','M6','M7','M8','M9','M10','M11','M12'];
      charts.line = new Chart(lineEl, { type:'line', data:{ labels:lbl, datasets:[ { label:'Optimistic', data:lbl.map((_,i)=>Math.round(base*Math.pow(1+gr*1.5,i))), borderColor:'#22c55e', backgroundColor:'rgba(34,197,94,.04)', borderWidth:1.5, pointRadius:2, tension:.4 }, { label:'Base', data:lbl.map((_,i)=>Math.round(base*Math.pow(1+gr,i))), borderColor:'#f59e0b', backgroundColor:'rgba(245,158,11,.07)', borderWidth:2, pointRadius:3, tension:.4 }, { label:'Conservative', data:lbl.map((_,i)=>Math.round(base*Math.pow(1+gr*.5,i))), borderColor:'#ef4444', backgroundColor:'rgba(239,68,68,.04)', borderWidth:1.5, pointRadius:2, tension:.4 } ] }, options:{ responsive:true, maintainAspectRatio:false, scales:{ x:{grid:{color:'rgba(255,255,255,.04)'},ticks:{color:'#5a6380',font:{size:8}}}, y:{grid:{color:'rgba(255,255,255,.04)'},ticks:{color:'#5a6380',font:{size:8},callback:v=>'₹'+(v>=100000?(v/100000).toFixed(1)+'L':(v/1000).toFixed(0)+'K')}} }, plugins:{ legend:{labels:{color:'#8892b0',font:{size:8},boxWidth:10}}, tooltip:{callbacks:{label:ctx=>'₹'+ctx.raw.toLocaleString('en-IN')}} } } });
    }

    const doEl = g('ch-dough');
    if (doEl) charts.dough = new Chart(doEl, { type:'doughnut', data:{ labels:['Survival','Profit Stab.','Scalability','Local Dom.'], datasets:[{ data:[sc2.surv,sc2.prof,sc2.scal,sc2.ldom], backgroundColor:['rgba(34,197,94,.65)','rgba(245,158,11,.65)','rgba(96,165,250,.65)','rgba(167,139,250,.65)'], borderColor:['#22c55e','#f59e0b','#60a5fa','#a78bfa'], borderWidth:2 }] }, options:{ responsive:true, maintainAspectRatio:false, cutout:'62%', plugins:{ legend:{position:'bottom',labels:{color:'#8892b0',font:{size:9},boxWidth:10,padding:7}} } } });
    }, 200);
  }
  tryDraw();
}

function renderAI(ai, isOffline) {
  const aiScore = ai.gemini_score || ai.ai_score || 0;
  return `
    <div class="card ai-card fade-in" style="margin-bottom:.85rem">
      <div class="sec-title">🤖 AI Deep Analysis <span class="ai-badge">${isOffline ? '⚡ OFFLINE ENGINE' : 'CLAUDE SONNET'}</span></div>

      <div class="ai-summ-box">
        <div class="ai-summ-lbl">AI EXECUTIVE SUMMARY</div>
        <p class="ai-summ-txt">${ai.summary}</p>
      </div>

      ${aiScore ? `<div class="ai-score-box">
        <div class="ai-score-num" style="color:${sc(aiScore)}">${aiScore}</div>
        <div class="ai-score-info">
          <div class="ai-score-title">AI CONFIDENCE SCORE</div>
          <div class="ai-score-desc">Claude's independent assessment of overall business viability — ${aiScore>=70?'strong fundamentals detected':aiScore>=50?'moderate potential with addressable gaps':'significant challenges identified'}.</div>
        </div>
      </div>` : ''}

      ${ai.hidden_insight ? `<div class="ai-insight-box">
        <div class="ai-insight-lbl">💡 HIDDEN INSIGHT — What Most Analysts Miss</div>
        <p style="font-size:.85rem;color:var(--tx);line-height:1.7">${ai.hidden_insight}</p>
      </div>` : ''}

      <div class="ai-verdict-box">
        <div class="ai-verdict-lbl">⚖️ AI VERDICT</div>
        <p style="font-size:.85rem;color:var(--tx);line-height:1.6;font-style:italic">${ai.verdict}</p>
      </div>

      <div class="twocol" style="margin-bottom:.75rem">
        <div>
          <div class="ai-list-title" style="color:var(--gr)">✅ AI Strengths</div>
          <div class="list-sec">${(ai.strengths||[]).map((s,i)=>`<div class="li pos"><span class="li-ico" style="color:var(--gr)">▲${i+1}</span><span>${s}</span></div>`).join('')}</div>
        </div>
        <div>
          <div class="ai-list-title" style="color:var(--re)">⚠️ AI Risks</div>
          <div class="list-sec">${(ai.risks||[]).map((r,i)=>`<div class="li neg"><span class="li-ico" style="color:var(--re)">▼${i+1}</span><span>${r}</span></div>`).join('')}</div>
        </div>
      </div>

      <div style="margin-bottom:.75rem">
        <div class="ai-list-title" style="color:var(--bl)">🎯 AI Opportunities</div>
        <div class="list-sec">${(ai.opportunities||[]).map((o,i)=>`<div class="li info"><span class="li-ico" style="color:var(--bl)">◆${i+1}</span><span>${o}</span></div>`).join('')}</div>
      </div>

      <div style="margin-bottom:.75rem">
        <div class="ai-list-title" style="color:var(--at)">⚡ Priority Actions — This Week</div>
        <div class="list-sec">${(ai.actions||[]).map((a,i)=>`<div class="li warn"><span class="li-ico" style="color:var(--at)">→${i+1}</span><span>${a}</span></div>`).join('')}</div>
      </div>

      <div class="act-box">
        <div class="act-lbl">🚀 AI SCALING STRATEGY</div>
        <div class="act-txt">${ai.scaling}</div>
      </div>
    </div>`;
}

function renderResult(d, sc2, isS) {
  destroyCharts();
  const score = sc2.compositeScore, v = verdictStyle(score), c = sc(score);
  const fi    = fiItems(d, sc2, isS);
  const expl  = explItems(d, sc2, isS);
  const loc   = locInsight(d, sc2.locS || 50);
  const steps = scaleSteps(d, score, isS);
  const pct   = getPct(score);

  const mlBadges = [];
  if (sc2.mlAdj > 5)  mlBadges.push({ c:'g', t:`+${sc2.mlAdj}% ML BOOST` });
  if (sc2.mlAdj < -5) mlBadges.push({ c:'b', t:`${sc2.mlAdj}% ML PENALTY` });
  if (d.growthRate >= 20) mlBadges.push({ c:'g', t:`${d.growthRate}% MOM GROWTH` });
  if (d.pstage === 'Product-market fit found') mlBadges.push({ c:'g', t:'PMF CONFIRMED' });
  if (d.trend === 'Viral / Explosive growth') mlBadges.push({ c:'g', t:'VIRAL TREND' });
  if (d.license === 'No License' || d.licSt === 'No License') mlBadges.push({ c:'b', t:'NO LICENSE ⚠️' });
  if (d.tsize === '1 (solo founder)') mlBadges.push({ c:'w', t:'SOLO FOUNDER' });
  if (d.rev === 'No revenue yet') mlBadges.push({ c:'w', t:'PRE-REVENUE' });

  let metL, metV;
  if (isS) { metL=['Location','Product','Financial','Ops','Growth','Legal']; metV=[sc2.locS,sc2.prodS,sc2.finS,sc2.opsS,sc2.grwS,sc2.lc||20]; }
  else      { metL=['Market','Team','Traction','Funding','Timing','Moat']; metV=[sc2.mktS,sc2.teamS,sc2.tracS,sc2.funS,sc2.timS,sc2.moatS]; }

  let ueHtml = '';
  if (isS) {
    const mg  = (d.costUnit > 0 && d.sellPrice > 0) ? Math.round(((d.sellPrice - d.costUnit) / d.sellPrice) * 100) : (d.margin || 0);
    const dr  = (d.dailyCust > 0 && d.avgPrice > 0) ? Math.round(d.dailyCust * d.avgPrice) : (d.dailyRev || 0);
    const mr  = dr > 0 ? dr * 26 : (d.monthlyRev || 0);
    const gr  = d.growthRate > 0 ? d.growthRate / 100 : .10;
    const r6  = mr > 0 ? Math.round(mr * Math.pow(1 + gr, 6)) : 0;
    ueHtml = `<div class="card" style="margin-bottom:.85rem">
      <div class="sec-title">💰 Unit Economics</div>
      <div class="ue-grid">
        <div class="uec"><div class="uev" style="color:${sc(mg)}">${mg}%</div><div class="uel">Gross Margin</div></div>
        <div class="uec"><div class="uev">₹${dr.toLocaleString('en-IN')}</div><div class="uel">Daily Revenue</div></div>
        <div class="uec"><div class="uev">₹${mr.toLocaleString('en-IN')}</div><div class="uel">Monthly Revenue</div></div>
        ${r6 > 0 ? `<div class="uec"><div class="uev" style="color:var(--bl)">₹${Math.round(r6/1000)}K</div><div class="uel">6-Month Proj.</div></div>` : ''}
      </div>
    </div>`;
  }

  const eId = Date.now();
  g('rv').innerHTML = `<div class="fade-in">

    ${d.description ? `<div class="desc-res"><div class="desc-res-lbl">📝 BUSINESS DESCRIPTION</div><p style="font-size:.85rem;color:var(--tx);line-height:1.72;white-space:pre-wrap">${d.description}</p></div>` : ''}

    <div class="card" style="text-align:center;margin-bottom:.85rem">
      <div class="sec-title center">${isS ? '🍜 Street Report' : '🚀 Intelligence Report'} — ${d.name}</div>
      <div class="ring-wrap">${ring(score)}<div class="ring-num"><div class="ring-pct" style="color:${c}">${score}</div><div class="ring-lbl">SUCCESS SCORE</div></div></div>
      <div class="verdict-badge" style="background:${v.bg};border:1px solid ${v.bd};color:${v.co}">${v.lb}</div>
      <p class="verdict-txt">${score>=72?'Strong fundamentals across key criteria — fundable, defensible, and scalable.':score>=58?'Solid signals with addressable gaps — good foundation, needs targeted improvements.':score>=42?'Mixed signals — potential exists but critical risks must be resolved first.':'Too many foundational gaps — significant restructuring needed before growth.'}</p>
      <div class="ml-badges">${mlBadges.map(b=>`<span class="mlb ${b.c}">${b.t}</span>`).join('')}</div>
      <div class="ptile-row"><span class="ptile-lbl">TOP ${100-pct}% OF SIMILAR</span><div class="ptile-trk"><div class="ptile-fil" style="width:${pct}%"></div><div class="ptile-dot" style="left:${pct}%"></div></div><span class="ptile-val">${pct}th %ile</span></div>
      <div class="exp-row">
        <button class="btn-exp" onclick="(function(){const b=new Blob([JSON.stringify({id:${eId},name:'${d.name.replace(/'/g,"\\'")}',score:${score}},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='${d.name.replace(/\s+/g,'_')}_analysis.json';a.click();})()">⬇ Export JSON</button>
        <button class="btn-exp" onclick="window.print()">🖨 Print Report</button>
        <button class="btn-exp btn-pdf" onclick="exportPDF()">📄 PDF Report</button>
        <button class="btn-exp btn-share" onclick="shareReport()">🔗 Share Report</button>
      </div>
    </div>

    <div class="quad">${['Survival','Profit Stability','Scalability','Local Dominance'].map((l,i)=>{const v2=[sc2.surv,sc2.prof,sc2.scal,sc2.ldom][i];return`<div class="qc"><div class="qv" style="color:${sc(v2)}">${v2}</div><div class="ql">${l}</div></div>`;}).join('')}</div>

    <div class="mrow">${metL.map((l,i)=>{const v2=metV[i]||0;return`<div class="mc"><div class="mv" style="color:${sc(v2)}">${v2}</div><div class="ml">${l}</div></div>`;}).join('')}</div>

    <div class="card" style="margin-bottom:.85rem">
      <div class="sec-title">🧠 Why Score = ${score} — Deep Explanation</div>
      <div class="expl-box"><div class="expl-hdr">Score Decomposition — Every Factor Explained</div>${expl.map(e=>`<div class="ei"><div class="ei-f">${e.f}</div><div class="ei-w">${e.w}</div><div class="ei-m ${e.t}">${e.im}</div></div>`).join('')}</div>
    </div>

    <div class="chart-grid">
      <div class="chart-card"><div class="chart-title">📊 Dimension Radar</div><div class="chart-wrap"><canvas id="ch-radar"></canvas></div></div>
      <div class="chart-card"><div class="chart-title">📈 Score Breakdown</div><div class="chart-wrap"><canvas id="ch-bar"></canvas></div></div>
      <div class="chart-card"><div class="chart-title">📉 12-Month Revenue Projection</div><div class="chart-wrap"><canvas id="ch-line"></canvas></div></div>
      <div class="chart-card"><div class="chart-title">🍩 Smart Score Distribution</div><div class="chart-wrap"><canvas id="ch-dough"></canvas></div></div>
    </div>

    <div class="loc-box">
      <div class="loc-title">📍 Location Intelligence — ${d.city || 'Location Analysis'}</div>
      <div class="loc-tags">${loc.tags.map(t=>`<span class="ltag ${t.t==='b'?'bad':t.t==='n'?'neu':''}">${t.l}</span>`).join('')}</div>
      <p style="font-size:.83rem;color:var(--tx);line-height:1.65">${loc.txt}</p>
    </div>

    ${ueHtml}

    <div class="card" style="margin-bottom:.85rem">
      <div class="sec-title">📊 Feature Importance — What's Driving the Score & Why</div>
      ${fi.map(({l,v,w})=>`<div class="bar-row"><span class="bar-lbl">${l}</span><div class="bar-trk"><div class="bar-fil" style="width:${v}%;background:${sc(v)}"></div></div><span class="bar-val">${v}</span><div class="bar-why">${w}</div></div>`).join('')}
    </div>

    <div class="card" style="margin-bottom:.85rem">
      <div class="sec-title">🚀 10-Step Scaling Roadmap</div>
      <div class="steps">${steps.map(s=>`<div class="step"><div class="step-tag">${s.tag}</div><div class="step-txt">${s.txt}</div></div>`).join('')}</div>
    </div>

    <div id="ai-ph">
      ${d.description && d.description.trim().length > 10
        ? `<div class="card ai-card" style="margin-bottom:.85rem;border-color:rgba(167,139,250,.28)"><div class="ai-spin-wrap"><div class="ai-spinner"></div><div><div class="ai-ld-title">🤖 CLAUDE AI ANALYZING YOUR BUSINESS...</div><div class="ai-ld-sub">Calling Claude API directly — no backend needed. Usually takes 5–10 seconds.</div></div></div></div>`
        : `<div class="card" style="margin-bottom:.85rem;border-style:dashed;opacity:.55"><div class="sec-title">🤖 Claude AI Deep Analysis</div><p style="color:var(--mu);font-size:.83rem;line-height:1.65">Fill in the <strong style="color:var(--tx)">Business Description</strong> field above to unlock personalised Claude AI analysis — works directly in your browser, no backend required.</p></div>`
      }
    </div>

    <div id="benchmark-section" class="card fade-in" style="margin-bottom:.85rem">
      <div class="sec-title">📊 Benchmark Comparison — How You Stack Up</div>
      <div id="benchmark-body"></div>
    </div>

    <div id="forecast-section" class="card fade-in" style="margin-bottom:.85rem">
      <div class="sec-title">📈 Advanced Revenue Forecast — 18-Month Model</div>
      <div id="forecast-controls" class="forecast-ctrl-row">
        <div class="fc-item"><label>Monthly Growth %</label><input type="range" id="fc-growth" min="1" max="50" value="10" oninput="updateForecast()" /><span id="fc-growth-val">10%</span></div>
        <div class="fc-item"><label>Seasonality</label><select id="fc-season" onchange="updateForecast()"><option value="1">None</option><option value="0.9">Mild</option><option value="0.75">Strong</option></select></div>
        <div class="fc-item"><label>Scenario</label><select id="fc-scenario" onchange="updateForecast()"><option value="base">Base Case</option><option value="bull">Bull Case</option><option value="bear">Bear Case</option></select></div>
      </div>
      <div class="chart-wrap" style="height:220px;margin-top:.8rem"><canvas id="ch-forecast"></canvas></div>
      <div id="forecast-summary" class="forecast-summary"></div>
    </div>

    <div id="ai-chat-section" class="card ai-card fade-in" style="margin-bottom:.85rem;border-color:rgba(96,165,250,.3)">
      <div class="sec-title">💬 Ask Claude — Business Q&A <span class="ai-badge" style="background:rgba(96,165,250,.15);border-color:rgba(96,165,250,.3);color:var(--bl)">MULTI-TURN CHAT</span></div>
      <div id="chat-msgs" class="chat-msgs"></div>
      <div class="chat-suggestions" id="chat-suggestions">
        <span class="chat-sug" onclick="askSuggestion(this)">What's my biggest risk?</span>
        <span class="chat-sug" onclick="askSuggestion(this)">How do I increase revenue 50%?</span>
        <span class="chat-sug" onclick="askSuggestion(this)">Am I ready for investment?</span>
        <span class="chat-sug" onclick="askSuggestion(this)">What should I do this week?</span>
      </div>
      <div class="chat-input-row">
        <input type="text" id="chat-input" class="chat-input" placeholder="Ask anything about your business..." onkeydown="if(event.key==='Enter')sendChat()" />
        <button class="chat-send" onclick="sendChat()" id="chat-send-btn">Send ↗</button>
      </div>
    </div>

    <div id="whatif-section" class="card fade-in" style="margin-bottom:.85rem">
      <div class="sec-title">🔮 What-If Scenario Engine</div>
      <div class="whatif-grid" id="whatif-grid"></div>
      <div id="whatif-result"></div>
    </div>

    <div id="breakeven-section" class="card fade-in" style="margin-bottom:.85rem">
      <div class="sec-title">⚖️ Break-Even Calculator</div>
      <div class="be-controls">
        <div class="fc-item"><label>Fixed Costs / Month (₹)</label><input type="number" id="be-fixed" placeholder="e.g. 25000" oninput="updateBreakeven()"/></div>
        <div class="fc-item"><label>Variable Cost / Unit (₹)</label><input type="number" id="be-var" placeholder="e.g. 15" oninput="updateBreakeven()"/></div>
        <div class="fc-item"><label>Selling Price / Unit (₹)</label><input type="number" id="be-price" placeholder="e.g. 40" oninput="updateBreakeven()"/></div>
      </div>
      <div id="be-result" class="be-result"></div>
      <div class="chart-wrap" style="height:180px;margin-top:.75rem"><canvas id="ch-breakeven"></canvas></div>
    </div>

    <div id="funding-section" class="card fade-in" style="margin-bottom:.85rem">
      <div class="sec-title">💼 Funding Readiness Meter</div>
      <div id="funding-body"></div>
    </div>

    <div id="scheme-section" class="card fade-in" style="margin-bottom:.85rem">
      <div class="sec-title">🇮🇳 Government Scheme Matcher</div>
      <div id="scheme-body"></div>
    </div>

    <div id="compliance-section" class="card fade-in" style="margin-bottom:.85rem">
      <div class="sec-title">📋 GST & Compliance Checklist</div>
      <div id="compliance-body"></div>
    </div>

    <div id="pitch-section" class="card fade-in" style="margin-bottom:.85rem;border-color:rgba(167,139,250,.3)">
      <div class="sec-title">🚀 Investor Pitch Deck Generator <span class="ai-badge">CLAUDE AI</span></div>
      <p style="font-size:.82rem;color:var(--mu);margin-bottom:.75rem;line-height:1.6">Generate a 10-slide investor pitch deck based on your analysis — ready to present or export.</p>
      <button class="btn btn-primary" id="pitch-btn" onclick="generatePitchDeck()" style="max-width:260px">✨ Generate Pitch Deck</button>
      <div id="pitch-result" style="margin-top:1rem"></div>
    </div>

    <div id="bizplan-section" class="card fade-in" style="margin-bottom:.85rem;border-color:rgba(34,211,238,.2)">
      <div class="sec-title">📄 AI Business Plan Writer <span class="ai-badge" style="background:rgba(34,211,238,.1);border-color:rgba(34,211,238,.3);color:var(--cy)">CLAUDE AI</span></div>
      <p style="font-size:.82rem;color:var(--mu);margin-bottom:.75rem;line-height:1.6">Generate a structured 5-section business plan: executive summary, market, financials, GTM strategy, and milestones.</p>
      <button class="btn btn-primary" id="bizplan-btn" onclick="generateBizPlan()" style="max-width:260px;background:var(--cy);color:#000">📝 Generate Business Plan</button>
      <div id="bizplan-result" style="margin-top:1rem"></div>
    </div>

    <div id="tracker-section" class="card fade-in" style="margin-bottom:.85rem">
      <div class="sec-title">📅 Monthly Score Tracker</div>
      <div id="tracker-body"></div>
      <div class="chart-wrap" style="height:180px;margin-top:.75rem"><canvas id="ch-tracker"></canvas></div>
    </div>

    <div id="share-toast" class="share-toast hidden">🔗 Shareable link copied to clipboard!</div>

    <div id="compare-section" class="card fade-in" style="margin-bottom:.85rem;border-color:rgba(34,197,94,.22)">
      <div class="sec-title">⚖️ Compare With Previous Analyses</div>
      <div id="cmp-body"></div>
    </div>

    <div class="reset-row">
      <button class="btn btn-outline" onclick="resetForm()" style="max-width:260px;margin:0 auto">← ANALYZE ANOTHER BUSINESS</button>
    </div>
  </div>`;

  g('rv').classList.remove('hidden');
  drawCharts(sc2, fi, isS, d);
  setTimeout(() => {
    renderBenchmark(d, sc2, isS);
    initForecast(d, sc2);
    initChat(d, sc2, isS);
    renderFundingMeter(d, sc2, isS);
    renderSchemes(d, isS);
    renderCompliance(d, isS);
    renderWhatIf(d, sc2, isS);
    initBreakevenDefaults(d);
    renderTracker(d, sc2);
    renderComparison();
    checkShareHash();
  }, 200);
}

const MSGS = ['RUNNING ML ENGINE','ANALYZING SIGNALS','COMPUTING SCORES','EVALUATING RISKS','BUILDING REPORT'];
let msgT = null, progT = null, progP = 0, msgI = 0;
function startLoader() {
  msgI = 0; progP = 0;
  function cy() { const e = g('lmsg'); if (e) e.textContent = MSGS[msgI++ % MSGS.length]; msgT = setTimeout(cy, 900); } cy();
  const subs = ['Analyzing location signals...','Computing ML weights...','Evaluating risks...','Generating report...'];
  let si = 0;
  function cs() { const e = g('lsub'); if (e) e.textContent = subs[si++ % subs.length]; setTimeout(cs, 1100); } cs();
  progT = setInterval(() => { progP = Math.min(92, progP + (Math.random() * 7 + 4)); const e = g('progfill'); if (e) e.style.width = progP + '%'; }, 280);
}
function stopLoader() {
  clearTimeout(msgT); clearInterval(progT);
  const e = g('progfill'); if (e) e.style.width = '100%';
}

// claude api call

// offline engine - runs locally, no internet needed
function offlineAnalysis(d, scores) {
  const n    = d.name || 'Your Business';
  const city = d.city || 'your city';
  const area = d.area || 'your area';
  const isS  = d.bizType === 'Street Food' || d.isStreet;
  const sc   = scores.compositeScore;
  const hi   = v => v >= 70;
  const lo   = v => v < 50;
  const loc  = (d.area && d.city) ? (area + ', ' + city) : city;/*         <!-- Author
Yasir Shaikh GitHub: https://github.com/YasirShaikh03 -->*/
  const mg   = d.margin > 0 ? d.margin + '%' : 'undefined';

  // summary
  let summary = '';
  if (isS) {
    summary = n + ' is a ' + (d.foodType||'street food') + ' business' + (d.stallType ? ' operating as a ' + d.stallType : '') + ' in ' + loc + ', targeting ' + (d.crowdType||'local customers') + ' near ' + (d.landmarks||'key landmarks') + '. ';
    summary += sc >= 70 ? 'With a strong success score of ' + sc + '/100, the business shows solid fundamentals in location, product demand, and unit economics. ' : sc >= 50 ? 'Scoring ' + sc + '/100, the business has promising potential with clear areas requiring improvement. ' : 'At ' + sc + '/100, the business faces meaningful challenges that need addressing before scaling. ';
    summary += d.description ? 'The founder\'s own assessment — "' + d.description.slice(0,110) + (d.description.length>110?'…':'') + '" — reflects strong self-awareness of the opportunity ahead.' : 'Focused execution on licensing, hygiene, and location optimization will be the key growth drivers.';
  } else {
    summary = n + ' is a ' + (d.bizType||'startup') + (d.industry ? ' in the ' + d.industry + ' space' : '') + ' based in ' + loc + ', currently at ' + (d.pstage||'an early stage') + ' with ' + (d.rev||'early revenue') + '. ';
    summary += sc >= 70 ? 'A score of ' + sc + '/100 signals strong investor-readiness across team, market, and traction dimensions. ' : sc >= 50 ? 'Scoring ' + sc + '/100 indicates a business with real potential but needing sharper execution and validation. ' : 'At ' + sc + '/100, foundational gaps — particularly around revenue and team — need resolution before meaningful fundraising. ';
    summary += d.description ? 'The founder frames it as: "' + d.description.slice(0,110) + (d.description.length>110?'…':'') + '" — which captures both the opportunity and the core challenge.' : 'The path forward centers on achieving product-market fit and building defensible revenue traction.';
  }

  // strengths
  var strengths = [];
  if (isS) {
    if (hi(scores.ldom)) strengths.push('Strong local dominance in ' + loc + ' — footfall near ' + (d.landmarks||'key landmark') + ' gives ' + n + ' a built-in customer pipeline that competitors cannot easily replicate');
    if (d.repeatRate >= 50) strengths.push('Exceptional repeat customer rate of ' + d.repeatRate + '% signals product quality that creates loyal regulars — the most capital-efficient growth engine for any street food business');
    if (d.tasteRating >= 7) strengths.push('High taste rating of ' + d.tasteRating + '/10 is a direct competitive moat — in street food, taste is the single most powerful word-of-mouth driver and cannot be bought with marketing spend');
    if (d.margin >= 40) strengths.push('Healthy gross margin of ' + mg + ' provides financial resilience and headroom for reinvestment without needing external capital');
    if (d.hygiene === 'High') strengths.push('High hygiene standards position ' + n + ' above the majority of competitors in ' + city + ', enabling Swiggy/Zomato listing and justifying a small premium price point');
    if (d.footfall && d.footfall.includes('High')) strengths.push('High footfall density at current location means ' + n + ' benefits from passive discovery — walk-in traffic that costs zero in customer acquisition');
    if (d.aggr && d.aggr.includes('Yes')) strengths.push('Active aggregator presence creates a second revenue channel beyond physical walk-ins, diversifying income and building online brand equity simultaneously');
    if (d.licSt && d.licSt.includes('Licensed')) strengths.push('Full FSSAI and municipal licensing eliminates the single biggest operational risk for street food — ' + n + ' can operate without fear of sudden shutdown');
    if (strengths.length < 4) strengths.push((d.foodType||'The product') + ' category has proven and growing demand in Indian urban markets — category tailwinds support ' + n + '\'s core revenue model');
    if (strengths.length < 5) strengths.push('Low capital intensity of the street food model means ' + n + ' can achieve profitability before needing any external investment, keeping the founder in full control');
    if (strengths.length < 6) strengths.push('Direct founder-operated model gives ' + n + ' quality control and customer relationship advantages over franchised or absentee-owner competitors in the same area');
  } else {
    if (hi(scores.tracS)) strengths.push('Revenue traction at ' + (d.rev||'current stage') + ' is the strongest de-risking signal — ' + n + ' has moved beyond theory into validated customer value creation');
    if (hi(scores.teamS)) strengths.push((d.fexp||'Founder experience') + ' combined with a ' + (d.tsize||'focused') + ' team creates execution credibility that investors weight heavily at this stage');
    if (hi(scores.mktS)) strengths.push('Operating in a ' + (d.trend||'growing') + ' market with ' + (d.msize||'significant') + ' TAM gives ' + n + ' room to capture meaningful share without displacing incumbents');
    if (d.pstage === 'Product-market fit found') strengths.push('Confirmed product-market fit is the rarest milestone in startups — ' + n + ' has passed the filter that eliminates over 80% of early-stage companies');
    if (hi(scores.moatS)) strengths.push((d.comp === 'Blue ocean (no direct competitors)' ? 'Blue ocean positioning' : 'Competitive differentiation') + ' gives ' + n + ' pricing power and time to build brand before well-funded competitors respond');
    if (d.growthRate >= 15) strengths.push(d.growthRate + '% monthly growth compounds dramatically — at this pace, ' + n + ' doubles revenue every ' + Math.round(70/d.growthRate) + ' months, which is a compelling trajectory for any investor');
    if (d.online && d.online.includes('Active')) strengths.push('Strong online presence reduces CAC and builds brand equity that compounds with every piece of content produced — a significant moat against offline-only competitors');
    if (d.breakeven === 'Already profitable') strengths.push('Profitability at current scale gives ' + n + ' the rarest startup advantage — optionality. Growth on your terms, not a VC\'s timeline');
    if (strengths.length < 4) strengths.push((d.industry||'The industry') + ' is experiencing structural tailwinds that lift all serious players — ' + n + ' is well-positioned to ride this wave from ' + city);
    if (strengths.length < 5) strengths.push(loc + ' provides access to a talent pool and customer base that will support ' + n + '\'s next growth phase without requiring relocation');
    if (strengths.length < 6) strengths.push('The founder\'s direct involvement in early sales creates institutional knowledge about customer psychology that no hired salesperson can replicate later');
  }

  // risks
  var risks = [];
  if (isS) {
    if (d.weather === 'High (rain stops business)') risks.push('Extreme weather dependency — rain directly halts revenue for ' + n + ', creating dangerous cash flow gaps during monsoon months in ' + city + ' without a covered or indoor contingency plan');
    if (!d.licSt || d.licSt.includes('No License') || d.licSt.includes('Partial')) risks.push('Incomplete licensing is the highest-severity risk — a single municipal inspection can shut ' + n + ' down overnight with zero recourse and total revenue loss');
    if (lo(scores.ldom)) risks.push('Weak local dominance in ' + loc + ' means ' + n + ' is vulnerable to any new competitor entering the same spot with a slightly better price or location');
    if (d.dailyWaste >= 20) risks.push(d.dailyWaste + '% daily waste is destroying margins — at current revenue levels this represents compounding monthly losses in unsold inventory that could be prevented with demand-based batching');
    if (d.repeatRate < 40) risks.push('Low repeat rate of ' + d.repeatRate + '% means ' + n + ' is on a constant customer acquisition treadmill instead of compounding on a loyal base — unit economics worsen at scale');
    if (!d.aggr || d.aggr.includes('No')) risks.push('No aggregator presence makes ' + n + ' invisible to the fast-growing segment of customers who discover and order food exclusively through Swiggy and Zomato');
    if (d.seasonal && d.seasonal.includes('High')) risks.push('High seasonal dependency creates feast-famine revenue cycles — ' + n + ' needs a counter-seasonal product or 3-month savings buffer to survive lean periods without distress');
    if (risks.length < 4) risks.push('Single-location concentration gives ' + n + ' zero revenue redundancy — any disruption to ' + loc + ' (construction, eviction, road changes) eliminates 100% of income simultaneously');
    if (risks.length < 5) risks.push('No documented systems or standardized recipes means ' + n + '\'s quality is entirely founder-dependent and cannot be reliably scaled, franchised, or handed to staff');
    if (risks.length < 6) risks.push('Growing competition from cloud kitchens and aggregator-native brands in ' + city + ' is systematically capturing delivery demand away from traditional street food operations');
  } else {
    if (lo(scores.tracS) || d.rev === 'No revenue yet') risks.push('Zero or minimal revenue means ' + n + ' is burning runway on an unvalidated hypothesis — every month without paying customers increases failure probability exponentially');
    if (d.tsize === '1 (solo founder)') risks.push('Solo founder structure creates critical single points of failure — illness, burnout, or a bad quarter affects every function simultaneously with no organizational redundancy');
    if (d.comp === 'Saturated market' || d.comp === 'Highly competitive — giants present') risks.push('Competing against well-funded incumbents means ' + n + ' needs a genuinely unfair advantage — distribution, data, or network effects — not just a better product');
    if (lo(scores.funS)) risks.push('Thin funding runway limits ' + n + '\'s ability to iterate — running out of cash before finding product-market fit is the most common and most preventable cause of startup failure');
    if (d.seasonal && d.seasonal.includes('High')) risks.push('High seasonal revenue dependency creates predictable cash crunches that can force premature pivots or layoffs at exactly the worst possible times');
    if (!d.online || d.online.includes('No online')) risks.push('No meaningful online presence in ' + new Date().getFullYear() + ' is a critical gap — ' + n + '\'s target customers validate vendors digitally before any purchase decision');
    if (d.msize === 'Hyper Local (1 area)') risks.push('Hyper-local market size caps ' + n + '\'s total addressable revenue — institutional investors will question the ceiling before any check is written');
    if (lo(scores.moatS)) risks.push('Weak competitive moat means any resourced player can replicate ' + n + '\'s offering — sustainable advantage requires proprietary data, network effects, or deep switching costs');
    if (risks.length < 5) risks.push((d.industry||'The sector') + ' in ' + city + ' is attracting increasing competition as VC attention grows — better-funded rivals will emerge within 12–18 months');
    if (risks.length < 6) risks.push('Early-stage hiring in ' + city + ' at affordable salaries is increasingly difficult — talent competition from larger tech companies creates structural cost pressure on the salary line');
  }

  // opportunities
  var opps = [];
  if (isS) {
    if (d.landmarks && (d.landmarks.includes('College') || d.landmarks.includes('Station') || d.landmarks.includes('Office'))) opps.push(d.landmarks + ' proximity is an untapped bulk revenue opportunity — corporate tiffin tie-ups, office catering, or college event partnerships can add Rs 15K–40K per month with zero extra footfall required');
    if (!d.aggr || d.aggr.includes('No') || d.aggr.includes('Plan')) opps.push('Listing ' + n + ' on Swiggy and Zomato opens a parallel revenue stream reaching customers in a 3–5km radius — evening delivery orders alone can add 30–50% revenue with no change to the core stall operation');
    opps.push('A WhatsApp Business account with daily menu broadcasts and a pre-order option converts regulars into a subscription-like revenue base — customers who pre-order reduce waste and guarantee minimum daily income');
    opps.push('Introducing one premium combo or add-on at Rs 10–20 higher than the base item can increase average ticket size by 25–35% with zero additional footfall — the highest-ROI pricing lever available');
    if (opps.length < 4) opps.push(city + '\'s growing food delivery market means a cloud kitchen version of ' + n + ' operating from home or a shared facility can reach delivery-only customers at minimal incremental setup cost');
  } else {
    opps.push((d.industry||'The sector') + ' in India is seeing increased institutional capital — a compelling ' + (scores.compositeScore >= 60 ? 'Series A' : 'seed') + ' pitch with ' + n + '\'s current traction could close Rs ' + (scores.compositeScore >= 65 ? '2–8Cr' : '50L–2Cr') + ' within 6 months with the right preparation');
    if (d.msize && !d.msize.includes('National') && !d.msize.includes('International')) opps.push(n + ' is currently scoped to ' + (d.msize||'local') + ' — the same core product with minor adaptation can address adjacent cities, multiplying TAM 5–10x without fundamental product changes');
    if (!d.online || !d.online.includes('Active')) opps.push('A content-led growth strategy — case studies, LinkedIn thought leadership, demo videos — can drive ' + n + '\'s CAC toward zero as inbound compounds; this consistently outperforms paid acquisition 3:1 on efficiency');
    opps.push((d.crowdType||'Target customers') + ' in ' + city + ' are underserved in the specific niche ' + n + ' occupies — each month of operation before well-funded competitors notice compounds the first-mover advantage significantly');
    if (opps.length < 4 && d.expansion && !d.expansion.includes('No expansion')) opps.push('The ' + d.expansion + ' model is the right path for ' + n + '\'s stage — but the first expansion must be the documented template for 10 more, so investing in systems now has 10x future ROI');
  }

  // actions
  var actions = [];
  if (isS) {
    if (!d.licSt || d.licSt.includes('No') || d.licSt.includes('Partial')) actions.push('Apply for FSSAI Basic Registration (Rs 100, at foscos.fssai.gov.in) and trade license from ' + city + ' municipal corporation this week — this is the single highest-ROI action available to ' + n);
    if (!d.aggr || d.aggr.includes('No') || d.aggr.includes('Plan')) actions.push('Register ' + n + ' on Swiggy and Zomato this week — onboarding takes 3–5 days and requires only an FSSAI license, bank account, and 3–5 food photos');
    actions.push('Set up WhatsApp Business for ' + n + ' today — share the menu, build a catalogue, and collect numbers from your next 20 customers to start a daily broadcast list');
    actions.push('Track daily revenue, customer count, and waste percentage in a Google Sheet starting tomorrow — 30 days of data reveals peak hours, best sellers, and waste patterns with precision');
    if (d.dailyWaste >= 15) actions.push('Switch to demand-based batch cooking immediately — prepare 70% of expected volume, then top up based on actual traffic. Target cutting waste from ' + d.dailyWaste + '% to below 10% within 2 weeks');
    actions.push('Ask your next 10 customers for a Google Maps review for ' + n + ' — a 4.5+ star rating with 20+ reviews is the most powerful digital signal for both walk-in and delivery discovery');
  } else {
    if (d.rev === 'No revenue yet' || d.rev === 'First customers / Beta') actions.push('Get 5 paying customers this week at any price — even Rs 1 of revenue is categorically different from zero and changes how investors, partners, and you yourself think about ' + n);
    actions.push('Write down your top 3 customer personas (job title, specific pain, budget, where they search for solutions) — every product, sales, and marketing decision for the next 6 months should reference this document');
    if (!d.online || !d.online.includes('Active')) actions.push('Create a simple landing page for ' + n + ' this week — a clear headline, 3 bullet benefits, and a contact form. Free tools like Carrd.co or Notion work perfectly at this stage');
    actions.push('Implement a weekly 30-minute metrics review — track revenue, active customers, churn, and burn rate weekly. What gets measured consistently gets managed, and ' + n + ' needs this discipline before scaling');
    if (d.fstage && (d.fstage.includes('Bootstrapped') || d.fstage.includes('Friends'))) actions.push('Prepare a one-page investment memo for ' + n + ' and send it to 20 angel investors in ' + city + ' this month — investor relationships take 6+ months to convert, so start the clock now');
    actions.push('Identify ' + n + '\'s single riskiest assumption — the one thing, if wrong, that ends the business — and design the cheapest possible experiment to test it within 7 days');
  }

  // scaling path
  var scaling = '';
  if (isS) {
    scaling = n + '\'s scaling path in ' + city + ' follows a proven playbook: dominate one location completely before opening a second. ';
    scaling += 'The first milestone is Rs ' + (d.dailyRev > 0 ? Math.round(d.dailyRev * 1.5).toLocaleString('en-IN') : '5,000') + '+ daily revenue with under 10% waste and above 60% repeat rate — these three metrics together prove the model is replicable elsewhere. ';
    scaling += 'Once the flagship ' + loc + ' unit is optimized, a second stall near ' + (d.landmarks && d.landmarks.includes('Station') ? 'a major college exit' : 'the nearest railway station') + ' in ' + city + ' should be the first expansion — same product, same systems, new location. ';
    scaling += 'Aggregator listing plus a WhatsApp broadcast list of 200+ regulars creates the distribution foundation for a cloud kitchen arm at minimal incremental cost, running in parallel. ';
    scaling += 'In 3 years, ' + n + ' should target a documented franchise model — standardized recipes, training manual, supply chain agreements — that can be licensed to 5–10 operators across ' + (d.state||'the state') + ' for a franchise fee plus royalty structure.';
  } else {
    scaling = n + '\'s scaling strategy must be sequenced carefully: the next 90 days are about proving unit economics at small scale, not growing headcount or marketing spend. ';
    scaling += (scores.compositeScore >= 65 ? 'With a ' + scores.compositeScore + '/100 score, ' + n + ' is approaching fundable territory — a seed or Series A raise in the next 6–12 months is realistic with 3 more months of strong revenue growth.' : 'At ' + scores.compositeScore + '/100, the priority is increasing the composite score to 65+ by addressing the weakest dimensions — specifically ' + (scores.tracS < 50 ? 'revenue traction' : scores.funS < 50 ? 'funding runway' : 'market positioning') + ' — before pitching.') + ' ';
    scaling += 'Geographic expansion from ' + city + ' should follow, not precede, evidence of repeatable customer acquisition — expansion amplifies both what works and what does not, so premature scaling of a broken model is fatal. ';
    scaling += 'Building a distribution moat — through integrations, partnerships, or network effects — is the Year 2 strategic priority, because ' + (d.industry||'this industry') + ' ultimately rewards whoever owns the customer relationship, not whoever has the best product.';
  }

  // verdict
  var verdict = '';
  if (sc >= 75) verdict = n + ' is a ' + (isS ? 'well-run, high-potential street business' : 'fundable, scalable startup') + ' with the right fundamentals in place — execute on the 5 priority actions above and the next 12 months will compound significantly.';
  else if (sc >= 60) verdict = n + ' has real potential currently constrained by ' + (isS ? (lo(scores.ldom) ? 'location and licensing gaps' : 'digital presence and aggregator absence') : (lo(scores.tracS) ? 'lack of revenue traction' : 'team and funding gaps')) + ' — fix these two levers and the score jumps 15–20 points within 90 days.';
  else if (sc >= 45) verdict = n + ' is at the critical inflection point where the next 60 days of focused execution will determine whether this becomes a real business or stays a side project — the fundamentals are present, the urgency is not.';
  else verdict = n + ' needs structural changes, not optimizations, before growth is meaningful — the specific gaps are clear and fixable within 3 months with the right prioritization and discipline.';/*         <!-- Author
Yasir Shaikh GitHub: https://github.com/YasirShaikh03 -->*/

  // hidden insight
  var hidden = '';
  if (isS) {
    if (d.repeatRate >= 60 && d.dailyCust > 0) hidden = n + '\'s ' + d.repeatRate + '% repeat rate at ' + d.dailyCust + ' daily customers means roughly ' + Math.round(d.dailyCust * d.repeatRate / 100) + ' customers return every day. This loyal core is more valuable than walk-in traffic because they are a free distribution network. Converting just 20 of them into WhatsApp pre-order subscribers eliminates your single biggest financial risk — waste — while guaranteeing a daily revenue floor.';
    else if (d.landmarks && (d.landmarks.includes('Station') || d.landmarks.includes('Office'))) hidden = 'Railway station and office adjacency is systematically undervalued by street food operators focused only on morning traffic. The untapped opportunity at ' + loc + ' is the evening return commute — tired workers between 6–9pm with discretionary spend and no time to cook. An evening-specific menu priced 15–20% above daytime items could double revenue-per-hour in the highest-traffic window.';
    else hidden = 'The real competitive moat for ' + n + ' is not the recipe — it is the relationship with the 20–30 regulars who come daily. These customers are the most credible source of Swiggy reviews, Google Maps ratings, and offline word-of-mouth. A simple loyalty card (buy 9, get 1 free) formalizes this relationship and converts casual regulars into brand advocates at zero cost.';
  } else {
    if (d.growthRate >= 20) hidden = n + '\'s ' + d.growthRate + '% monthly growth is impressive, but the question investors will probe is whether it is pull (customers finding you) or push (you finding customers). If it is push — paid ads, cold calls, founder sales — the business has not yet found distribution leverage. The hidden work for next quarter is identifying the one channel that scales without founder intervention.';
    else if (d.industry === 'SaaS / B2B Software' || d.bizType === 'SaaS') hidden = 'For B2B SaaS in India, the biggest hidden revenue opportunity is almost always existing customers, not new ones. Most early founders spend 80% of time on acquisition and 20% on retention — but data shows a 5% improvement in retention generates more revenue over 24 months than a 20% increase in new customer acquisition. ' + n + '\'s next hire should be customer success, not sales.';
    else hidden = 'The most overlooked asset ' + n + ' has is the specific knowledge of why the first paying customers bought — the exact job-to-be-done, the pain, the alternatives they considered. This insight is worth more than any market research report and should be the foundation of every pitch, landing page, and product decision for the next 12 months.';
  }

  // confidence score
  var aiScore = Math.round(sc * 0.85 + (d.description && d.description.length > 50 ? 8 : 0) + (d.city ? 3 : 0) + (d.margin > 30 ? 4 : 0));
  aiScore = Math.max(12, Math.min(96, aiScore));

  return { summary: summary, strengths: strengths.slice(0,6), risks: risks.slice(0,6), opportunities: opps.slice(0,4), actions: actions.slice(0,5), scaling: scaling, verdict: verdict, hidden_insight: hidden, gemini_score: aiScore };
}

async function runAnalysis() {
  const d = collect();
  const isS = d.bizType === 'Street Food' || streetMode;
  const btn = g('abtn');

  btn.disabled = true; g('btxt').textContent = '⏳ ANALYZING...';
  g('fv').classList.add('hidden');
  g('rv').classList.add('hidden');
  g('lv').classList.remove('hidden');
  startLoader();

  await new Promise(r => setTimeout(r, 3000));
  stopLoader();
  g('lv').classList.add('hidden');

  const scores = isS ? computeStreet(d) : computeStartup(d);
  currentAnalysisData = d; currentAnalysisScores = scores; currentAnalysisIsStreet = isS;
  chatMessages = [];
  saveHistory(d, scores);
  renderResult(d, scores, isS);

  btn.disabled = false;
  g('btxt').textContent = isS ? 'ANALYZE MY BUSINESS' : 'ANALYZE & PREDICT';
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (d.description && d.description.trim().length > 10) {
    const ph = g('ai-ph');
    const s  = { compositeScore: scores.compositeScore, surv: scores.surv, prof: scores.prof, scal: scores.scal, ldom: scores.ldom };

    // Always generate offline analysis instantly
    const offlineResult = offlineAnalysis(d, s);

    if (!navigator.onLine) {
      if (ph) ph.innerHTML = renderAI(offlineResult, true);
      return;
    }

    // Online: try Claude API, silently fall back to offline engine on any failure
    try {
      const prompt = 'You are an expert startup and business analyst. Return ONLY valid JSON, no markdown.\n\nBusiness: ' + d.name + ' | Type: ' + (d.bizType||'') + ' | Location: ' + loc(d) + ' | Score: ' + scores.compositeScore + '/100\nDescription: "' + d.description + '"\nML: Survival=' + scores.surv + ' Profit=' + scores.prof + ' Scale=' + scores.scal + ' Local=' + scores.ldom + '\n\nReturn exactly: {"summary":"...","strengths":["...x6"],"risks":["...x6"],"opportunities":["...x4"],"actions":["...x5"],"scaling":"...","verdict":"...","hidden_insight":"...","gemini_score":75}';

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 2000, messages: [{ role: 'user', content: prompt }] })
      });

      if (!res.ok) throw new Error('api');
      const data = await res.json();
      const text = data.content.map(b => b.type === 'text' ? b.text : '').join('');
      const clean = text.replace(/```json|```/gi, '').trim();
      let ai;
      try { ai = JSON.parse(clean); } catch(_) {
        const s2 = clean.indexOf('{'), e2 = clean.lastIndexOf('}');
        if (s2 !== -1 && e2 > s2) try { ai = JSON.parse(clean.slice(s2, e2+1)); } catch(_) {}
      }
      if (ph) ph.innerHTML = renderAI(ai || offlineResult, !ai);

    } catch(_) {
      // API unavailable — use offline engine silently, no error shown to user
      if (ph) ph.innerHTML = renderAI(offlineResult, true);
    }
  }
}

function loc(d) { return [d.area, d.city, d.state].filter(Boolean).join(', ') || 'Not specified'; }

function resetForm() {
  destroyCharts();
  g('rv').classList.add('hidden'); g('rv').innerHTML = '';
  g('fv').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// benchmark comparison
function renderBenchmark(d, sc2, isS) {
  const el = g('benchmark-body');
  if (!el) return;
  const cat = d.bizType || (isS ? 'Street Food' : 'Tech Startup');
  const avg = BENCHMARKS[cat] || BENCHMARKS['default'];
  const dims = [
    { label: 'Survival',        user: sc2.surv,  bench: avg.surv  },
    { label: 'Profitability',   user: sc2.prof,  bench: avg.prof  },
    { label: 'Scalability',     user: sc2.scal,  bench: avg.scal  },
    { label: 'Local Dominance', user: sc2.ldom,  bench: avg.ldom  },
    { label: 'Overall Score',   user: sc2.compositeScore, bench: avg.comp },/*         <!-- Author
Yasir Shaikh GitHub: https://github.com/YasirShaikh03 -->*/
  ];

  const rows = dims.map(dim => {
    const diff = dim.user - dim.bench;
    const sign = diff >= 0 ? '+' : '';
    const col  = diff >= 5 ? 'var(--gr)' : diff <= -5 ? 'var(--re)' : 'var(--at)';
    const pct  = Math.round((dim.user / 100) * 100);
    const bpct = Math.round((dim.bench / 100) * 100);
    return `<div class="bm-row">
      <div class="bm-label">${dim.label}</div>
      <div class="bm-bars">
        <div class="bm-bar-wrap">
          <div class="bm-bar-fill" style="width:${pct}%;background:${col}"></div>
          <div class="bm-bar-bench" style="left:${bpct}%"></div>
        </div>
        <div class="bm-vals">
          <span style="color:${col};font-family:var(--mono);font-size:.8rem;font-weight:700">${dim.user}</span>
          <span style="color:var(--mu);font-size:.75rem"> vs avg </span>
          <span style="color:var(--mu);font-family:var(--mono);font-size:.78rem">${dim.bench}</span>
          <span style="color:${col};font-family:var(--mono);font-size:.75rem;margin-left:4px">(${sign}${diff})</span>
        </div>
      </div>
    </div>`;
  }).join('');

  const better = dims.filter(d => d.user > d.bench).length;
  const summary = better >= 4 ? '🟢 You outperform the average ' + cat + ' on most dimensions — strong competitive position.'
    : better >= 3 ? '🟡 Mixed results vs the category — targeted improvements in weaker areas will lift your rank significantly.'
    : '🔴 You are below category average on most dimensions — addressing the gaps is the highest-ROI activity right now.';

  el.innerHTML = `
    <div class="bm-legend"><span class="bm-leg-item"><span class="bm-dot" style="background:var(--bl)"></span> Your Score</span><span class="bm-leg-item"><span class="bm-line-mark"></span> Category Avg (${cat})</span></div>
    ${rows}
    <div class="bm-summary">${summary}</div>
  `;
}

// 18-month revenue forecast
let forecastChart = null;
function initForecast(d, sc2) {
  const gr = d.growthRate > 0 ? d.growthRate : 10;
  const fc = g('fc-growth');
  if (fc) { fc.value = gr; }
  const fv = g('fc-growth-val');
  if (fv) fv.textContent = gr + '%';
  updateForecast();
}

function updateForecast() {
  const d  = currentAnalysisData;
  if (!d) return;
  const gr     = parseFloat((g('fc-growth') || {value:'10'}).value) / 100;/*         <!-- Author
Yasir Shaikh GitHub: https://github.com/YasirShaikh03 -->*/
  const seasMult = parseFloat((g('fc-season') || {value:'1'}).value);
  const scenario = (g('fc-scenario') || {value:'base'}).value;
  const fv = g('fc-growth-val');
  if (fv) fv.textContent = Math.round(gr * 100) + '%';

  const scenarioMult = scenario === 'bull' ? 1.35 : scenario === 'bear' ? 0.65 : 1.0;
  const baseRev = (d.dailyCust > 0 && d.avgPrice > 0)
    ? d.dailyCust * d.avgPrice * 26
    : d.monthlyRev > 0 ? d.monthlyRev : d.dailyRev > 0 ? d.dailyRev * 26 : 50000;

  const labels = ['Now','M1','M2','M3','M4','M5','M6','M7','M8','M9','M10','M11','M12','M13','M14','M15','M16','M17','M18'];
  const seasonFactors = [1,1.02,1.05,1.08,0.95,0.90,0.92,0.95,1.10,1.12,1.08,1.05,1.03,1.02,1.05,1.08,0.95,0.90,0.92];

  const projData = labels.map((_, i) => {
    const raw = baseRev * Math.pow(1 + gr * scenarioMult, i);
    return Math.round(raw * (seasMult < 1 ? (1 - (1 - seasMult) * (1 - seasonFactors[i] * 0.9)) : 1));
  });

  const breakeven12 = projData[12];
  const growth12m   = baseRev > 0 ? Math.round(((breakeven12 - baseRev) / baseRev) * 100) : 0;
  const cumRev      = projData.reduce((a, b) => a + b, 0);

  const el = g('ch-forecast');
  if (!el) return;
  if (forecastChart) { forecastChart.destroy(); forecastChart = null; }

  const scColor = scenario === 'bull' ? '#22c55e' : scenario === 'bear' ? '#ef4444' : '#60a5fa';
  forecastChart = new Chart(el, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: scenario.charAt(0).toUpperCase() + scenario.slice(1) + ' Case',
        data: projData,
        borderColor: scColor,
        backgroundColor: scColor.replace(')', ', .08)').replace('rgb', 'rgba').replace('#22c55e','rgba(34,197,94,.08)').replace('#ef4444','rgba(239,68,68,.08)').replace('#60a5fa','rgba(96,165,250,.08)'),
        borderWidth: 2.5,
        pointBackgroundColor: scColor,
        pointRadius: 3,
        tension: 0.4,
        fill: true,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: {
        x: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#5a6380', font: { size: 8 } } },
        y: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#5a6380', font: { size: 8 }, callback: v => '₹' + (v >= 100000 ? (v / 100000).toFixed(1) + 'L' : (v / 1000).toFixed(0) + 'K') } }
      },
      plugins: {
        legend: { labels: { color: '#8892b0', font: { size: 9 }, boxWidth: 10 } },
        tooltip: { callbacks: { label: ctx => '₹' + ctx.raw.toLocaleString('en-IN') } }
      }
    }
  });

  const sumEl = g('forecast-summary');
  if (sumEl) {
    sumEl.innerHTML = `
      <div class="fc-summary-grid">
        <div class="fc-sum-item"><div class="fc-sum-val" style="color:${scColor}">₹${(projData[6]/1000).toFixed(0)}K</div><div class="fc-sum-lbl">Month 6 Revenue</div></div>
        <div class="fc-sum-item"><div class="fc-sum-val" style="color:${scColor}">₹${(breakeven12/1000).toFixed(0)}K</div><div class="fc-sum-lbl">Month 12 Revenue</div></div>
        <div class="fc-sum-item"><div class="fc-sum-val" style="color:${scColor}">${growth12m}%</div><div class="fc-sum-lbl">12-Month Growth</div></div>
        <div class="fc-sum-item"><div class="fc-sum-val" style="color:${scColor}">₹${(cumRev/100000).toFixed(1)}L</div><div class="fc-sum-lbl">18-Month Cumulative</div></div>
      </div>
    `;
  }
}

// multi-turn chat with claude
function initChat(d, sc2, isS) {
  chatMessages = [];
  const el = g('chat-msgs');
  if (el) el.innerHTML = `<div class="chat-msg chat-assistant"><div class="chat-bubble">👋 Hi! I've analyzed <strong>${d.name}</strong> and scored it <strong style="color:${sc(sc2.compositeScore)}">${sc2.compositeScore}/100</strong>. Ask me anything — risks, strategy, funding, next steps, or what you should do this week.</div></div>`;
}

function askSuggestion(el) {
  const q = el.textContent;
  const inp = g('chat-input');
  if (inp) { inp.value = q; }
  sendChat();
}

async function sendChat() {
  if (chatBusy) return;
  const inp   = g('chat-input');
  const msgsEl = g('chat-msgs');
  const btn   = g('chat-send-btn');
  if (!inp || !msgsEl) return;
  const q = inp.value.trim();
  if (!q) return;

  inp.value = '';
  chatBusy = true;
  if (btn) { btn.textContent = '...'; btn.disabled = true; }

  // hide the suggestion chips after first message
  const sug = g('chat-suggestions');
  if (sug) sug.style.display = 'none';

  // add user message to chat
  msgsEl.innerHTML += `<div class="chat-msg chat-user"><div class="chat-bubble">${q}</div></div>`;

  // show a thinking animation while waiting
  const thinkId = 'think-' + Date.now();
  msgsEl.innerHTML += `<div class="chat-msg chat-assistant" id="${thinkId}"><div class="chat-bubble chat-thinking"><span class="dot-pulse"></span><span class="dot-pulse"></span><span class="dot-pulse"></span></div></div>`;
  msgsEl.scrollTop = msgsEl.scrollHeight;

  const d  = currentAnalysisData;
  const sc2 = currentAnalysisScores;
  const isS = currentAnalysisIsStreet;

  chatMessages.push({ role: 'user', content: q });

  const systemPrompt = `You are an expert business analyst advisor for ${d ? d.name : 'this business'}.
Business type: ${d ? (d.bizType || 'Startup') : 'unknown'} | Location: ${d ? loc(d) : 'unknown'}
ML Score: ${sc2 ? sc2.compositeScore : '?'}/100 | Survival: ${sc2 ? sc2.surv : '?'} | Profit: ${sc2 ? sc2.prof : '?'} | Scale: ${sc2 ? sc2.scal : '?'} | Local: ${sc2 ? sc2.ldom : '?'}
${d && d.description ? 'Description: ' + d.description : ''}
${d && d.margin ? 'Margin: ' + d.margin + '%' : ''} ${d && d.monthlyRev ? '| Monthly Rev: ₹' + d.monthlyRev : ''} ${d && d.city ? '| City: ' + d.city : ''}
Give direct, actionable, India-specific advice. Be concise (3-5 sentences max). No bullet points — conversational prose only.`;

  const messages = [{ role: 'user', content: systemPrompt + '\n\nUser question: ' + chatMessages[0].content }];
  for (let i = 1; i < chatMessages.length; i++) messages.push(chatMessages[i]);

  let reply = '';
  try {
    if (!navigator.onLine) throw new Error('offline');
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 350, messages })
    });
    if (!res.ok) throw new Error('api');
    const data = await res.json();
    reply = data.content.map(b => b.type === 'text' ? b.text : '').join('').trim();
  } catch(_) {
    reply = getChatOfflineReply(q, d, sc2, isS);
  }

  chatMessages.push({ role: 'assistant', content: reply });

  const thinkEl = document.getElementById(thinkId);
  if (thinkEl) thinkEl.remove();

  msgsEl.innerHTML += `<div class="chat-msg chat-assistant"><div class="chat-bubble">${reply}</div></div>`;
  msgsEl.scrollTop = msgsEl.scrollHeight;

  chatBusy = false;
  if (btn) { btn.textContent = 'Send ↗'; btn.disabled = false; }
  if (inp) inp.focus();
}

function getChatOfflineReply(q, d, sc2, isS) {
  const ql = q.toLowerCase();
  const n  = d ? d.name : 'your business';
  const s  = sc2 ? sc2.compositeScore : 50;

  if (ql.includes('risk') || ql.includes('danger') || ql.includes('threat')) {
    if (isS) return `The biggest risk for ${n} right now is operational — specifically licensing gaps and weather dependency. A single municipal inspection without proper FSSAI documentation can shut the business down overnight. Building a 2-month cash buffer and getting fully licensed within 30 days eliminates both your highest-severity risks simultaneously.`;
    return `For ${n} at ${s}/100, the primary risk is runway — every month without paid customers is a compounding bet on an unvalidated hypothesis. The second risk is solo dependency: if you're the only person who knows how everything works, the business has a single point of failure. Address revenue first, then document and delegate.`;
  }
  if (ql.includes('revenue') || ql.includes('money') || ql.includes('increase') || ql.includes('grow')) {
    if (isS) return `The fastest revenue lever for ${n} is aggregator listing — Swiggy and Zomato registration takes under a week and immediately opens a 3-5km delivery radius to customers who will never walk past your stall. Alongside that, a WhatsApp Business broadcast to 50 regulars with a daily menu and pre-order option can add a guaranteed revenue floor within 2 weeks.`;
    return `The fastest path to 50% revenue growth for ${n} is finding the one acquisition channel that works without paid spend — usually SEO, content, or a partnership — and doubling down on it exclusively for 90 days. Most early businesses grow faster by saying no to everything except their best-performing channel.`;
  }
  if (ql.includes('invest') || ql.includes('fund') || ql.includes('raise') || ql.includes('vc')) {
    return s >= 65
      ? `At ${s}/100, ${n} is approaching fundable territory. The key investor ask at your stage is three months of consecutive revenue growth — not one good month. Prepare a one-page memo with your current MRR, growth rate, CAC, and a clear ask, then warm-email 20 angels in your city this month.`
      : `At ${s}/100, ${n} isn't quite ready for institutional investors — the score needs to hit 65+ first. Focus on revenue traction above everything else: ₹2-5L MRR for 3 consecutive months changes the fundraising conversation completely. Government schemes like Startup India Seed Fund (up to ₹20L) are available now with no equity dilution.`;
  }
  if (ql.includes('week') || ql.includes('today') || ql.includes('first') || ql.includes('start') || ql.includes('action')) {
    if (isS) return `This week for ${n}: Day 1 — apply for FSSAI Basic Registration online (₹100, 15 minutes). Day 2 — set up WhatsApp Business and share your number with every customer. Day 3 — message your top 10 regulars asking for a Google Maps review. Day 5 — open a dedicated business bank account if you don't have one. That's more high-ROI work than most owners do in a month.`;
    return `This week for ${n}: Write down your three ideal customer profiles with job titles, pains, and budgets. Cold-email 10 potential customers with a one-line problem hypothesis and ask for a 15-minute call — not a sale. Set up a weekly 30-minute metrics review every Monday. These three actions cost nothing and compound every week you do them.`;
  }
  return `Based on ${n}'s score of ${s}/100, the most impactful next move is addressing your weakest dimension — ${sc2 && sc2.surv < 50 ? 'survival fundamentals like licensing and cash flow' : sc2 && sc2.scal < 50 ? 'scalability by building repeatable systems' : sc2 && sc2.ldom < 50 ? 'local dominance through digital presence and aggregators' : 'maintaining momentum and pushing toward the next milestone'}. What specific aspect would you like to dig into?`;
}

// pdf export
function exportPDF() {
  const d   = currentAnalysisData;
  const sc2 = currentAnalysisScores;
  if (!d || !sc2) { alert('Run an analysis first.'); return; }

  const score = sc2.compositeScore;
  const col   = score >= 70 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';
  const verdict = score >= 72 ? 'STRONG PASS ✓' : score >= 58 ? 'CONDITIONAL PASS' : score >= 42 ? 'WATCH ◐' : 'HARD PASS ✗';
  const cat = d.bizType || 'Business';
  const avg = BENCHMARKS[cat] || BENCHMARKS['default'];

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>${d.name} — Intelligence Report</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',system-ui,sans-serif;background:#fff;color:#1a1a2e;font-size:13px;padding:32px;max-width:800px;margin:0 auto}
  .cover{text-align:center;padding:32px 0 28px;border-bottom:3px solid #f59e0b;margin-bottom:28px}
  .cover h1{font-size:1.8rem;font-weight:800;color:#0f0f1a;margin-bottom:4px}
  .cover .sub{color:#666;font-size:.85rem;margin-bottom:16px}
  .score-ring{display:inline-flex;align-items:center;justify-content:center;width:100px;height:100px;border-radius:50%;border:8px solid ${col};font-size:2rem;font-weight:900;color:${col};margin:12px 0}
  .verdict{display:inline-block;background:${col}22;border:2px solid ${col};color:${col};font-weight:700;padding:4px 16px;border-radius:4px;font-size:.8rem;letter-spacing:.06em;margin:8px 0}
  .section{margin-bottom:20px}
  .sec-hdr{font-size:.7rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#f59e0b;border-bottom:1px solid #f0e0c0;padding-bottom:4px;margin-bottom:10px}
  .quad{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px}
  .qbox{background:#f8f8ff;border:1px solid #e0e0f0;border-radius:6px;padding:10px;text-align:center}
  .qval{font-size:1.5rem;font-weight:800;color:#333}
  .qlbl{font-size:.65rem;color:#888;text-transform:uppercase;letter-spacing:.04em;margin-top:2px}
  .bm-row{display:flex;align-items:center;gap:10px;margin-bottom:8px}
  .bm-lbl{font-size:.7rem;color:#555;width:110px;flex-shrink:0}
  .bm-bar{flex:1;height:8px;background:#eee;border-radius:4px;position:relative;overflow:visible}
  .bm-fill{height:100%;border-radius:4px;background:${col}}
  .bm-num{font-size:.7rem;font-family:monospace;color:#333;width:40px;text-align:right}
  .list-item{font-size:.8rem;line-height:1.55;padding:5px 8px;border-left:3px solid #22c55e;background:#f0fff4;margin-bottom:4px;border-radius:2px}
  .list-item.risk{border-left-color:#ef4444;background:#fff0f0}
  .list-item.action{border-left-color:#f59e0b;background:#fffbf0}
  .desc-box{background:#fffaf0;border:1px solid #f0e0c0;border-radius:5px;padding:10px;font-size:.82rem;line-height:1.65;color:#333;margin-bottom:16px;font-style:italic}
  .footer{text-align:center;margin-top:28px;padding-top:14px;border-top:1px solid #eee;font-size:.68rem;color:#aaa}
  .meta-row{display:flex;gap:16px;justify-content:center;flex-wrap:wrap;font-size:.75rem;color:#888;margin-top:8px}
  .meta-row span{background:#f5f5f5;padding:3px 10px;border-radius:3px}
  @media print{body{padding:16px}.cover{padding:16px 0}}
</style>
</head>
<body>
<div class="cover">
  <h1>${d.name}</h1>
  <div class="sub">${cat}${d.city ? ' · ' + d.city : ''}${d.state ? ', ' + d.state : ''}</div>
  <div class="score-ring">${score}</div>
  <br/>
  <div class="verdict">${verdict}</div>
  <div class="meta-row">
    ${d.bizType ? '<span>📦 ' + d.bizType + '</span>' : ''}
    ${d.industry ? '<span>🏭 ' + d.industry + '</span>' : ''}
    ${d.monthlyRev ? '<span>💰 ₹' + d.monthlyRev.toLocaleString('en-IN') + '/mo</span>' : ''}
    ${d.margin ? '<span>📊 ' + d.margin + '% margin</span>' : ''}
    <span>📅 Generated ${new Date().toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'})}</span>
  </div>
</div>

${d.description ? '<div class="section"><div class="sec-hdr">Business Description</div><div class="desc-box">' + d.description + '</div></div>' : ''}

<div class="section">
  <div class="sec-hdr">Core Scores</div>
  <div class="quad">
    <div class="qbox"><div class="qval" style="color:#22c55e">${sc2.surv}</div><div class="qlbl">Survival</div></div>
    <div class="qbox"><div class="qval" style="color:#f59e0b">${sc2.prof}</div><div class="qlbl">Profitability</div></div>
    <div class="qbox"><div class="qval" style="color:#60a5fa">${sc2.scal}</div><div class="qlbl">Scalability</div></div>
    <div class="qbox"><div class="qval" style="color:#a78bfa">${sc2.ldom}</div><div class="qlbl">Local Dom.</div></div>
  </div>
</div>

<div class="section">
  <div class="sec-hdr">Benchmark vs ${cat} Average</div>
  ${[['Survival', sc2.surv, avg.surv],['Profitability', sc2.prof, avg.prof],['Scalability', sc2.scal, avg.scal],['Local Dominance', sc2.ldom, avg.ldom],['Overall', score, avg.comp]].map(([l,u,b])=>`
  <div class="bm-row">
    <span class="bm-lbl">${l}</span>
    <div class="bm-bar"><div class="bm-fill" style="width:${u}%"></div></div>
    <div class="bm-num">${u} <span style="color:#aaa;font-size:.65rem">/ ${b}</span></div>
  </div>`).join('')}
</div>

<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
  <div class="section" style="margin-bottom:0">
    <div class="sec-hdr">✅ Key Strengths</div>
    ${(currentAnalysisScores._aiStrengths || generateQuickStrengths(d, sc2, currentAnalysisIsStreet)).slice(0,4).map(s=>`<div class="list-item">${s}</div>`).join('')}
  </div>
  <div class="section" style="margin-bottom:0">
    <div class="sec-hdr">⚠️ Key Risks</div>
    ${generateQuickRisks(d, sc2, currentAnalysisIsStreet).slice(0,4).map(r=>`<div class="list-item risk">${r}</div>`).join('')}
  </div>
</div>

<div class="section">
  <div class="sec-hdr">⚡ Priority Actions</div>
  ${generateQuickActions(d, sc2, currentAnalysisIsStreet).slice(0,5).map(a=>`<div class="list-item action">${a}</div>`).join('')}
</div>

<div class="footer">
  Startup Intelligence Platform — Pro Edition &nbsp;·&nbsp; ML Engine + Claude AI &nbsp;·&nbsp;
  Report ID: SIP-${Date.now().toString(36).toUpperCase()}
</div>
</body></html>`;

  const win = window.open('', '_blank');
  if (!win) { alert('Allow popups to open the PDF report.'); return; }
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 600);
}

function generateQuickStrengths(d, sc2, isS) {
  const out = [];
  if (sc2.surv >= 65) out.push('Strong survival fundamentals — financially resilient');
  if (sc2.prof >= 65) out.push('High profitability signals — solid unit economics');
  if (sc2.scal >= 65) out.push('Good scalability potential — model can grow');
  if (sc2.ldom >= 65) out.push('Local market dominance — first-mover advantage');
  if (d.margin >= 40) out.push('Healthy gross margin of ' + d.margin + '%');
  if (d.growthRate >= 15) out.push(d.growthRate + '% monthly growth rate');
  if (out.length < 3) out.push('Business has clear monetization model');
  if (out.length < 4) out.push('Founder-operated with hands-on quality control');
  return out;
}

function generateQuickRisks(d, sc2, isS) {
  const out = [];
  if (sc2.surv < 50) out.push('Survival score below average — address cash flow gaps');
  if (sc2.scal < 50) out.push('Scalability limited — systems need strengthening');
  if (!d.license || d.license.includes('No License')) out.push('No legal license — high regulatory risk');
  if (d.tsize === '1 (solo founder)') out.push('Solo founder — single point of failure risk');
  if (!d.online || d.online.includes('No')) out.push('Minimal online presence hurts discoverability');
  if (out.length < 3) out.push('Market competition may intensify in 12-18 months');
  if (out.length < 4) out.push('Revenue concentration risk if primary channel weakens');
  return out;
}

function generateQuickActions(d, sc2, isS) {
  const out = [];
  if (isS) {
    out.push('Get FSSAI Basic Registration (₹100 at foscos.fssai.gov.in) this week');
    out.push('Set up WhatsApp Business and collect numbers from 20+ customers');
    out.push('Register on Swiggy and Zomato — takes 3-5 days with FSSAI + bank account');
    out.push('Track daily revenue in a Google Sheet for 30 days to find patterns');
    out.push('Ask 10 regulars for a Google Maps review — target 4.5+ stars');
  } else {
    out.push('Get 5 paying customers this week at any price point');
    out.push('Write your top 3 customer personas with pains and budgets');
    out.push('Create a simple landing page with a clear headline and contact form');
    out.push('Run weekly 30-minute metrics reviews — revenue, churn, burn rate');
    out.push('Send investment memo to 20 angel investors in your city this month');
  }
  return out;
}

// shareable report link
function shareReport() {
  const d   = currentAnalysisData;
  const sc2 = currentAnalysisScores;
  if (!d || !sc2) { alert('Run an analysis first.'); return; }

  const payload = {
    n: d.name,
    bt: d.bizType || '',
    ci: d.city || '',
    st: d.state || '',
    sc: sc2.compositeScore,
    sv: sc2.surv,
    pr: sc2.prof,
    sk: sc2.scal,
    ld: sc2.ldom,
    mg: d.margin || 0,
    gr: d.growthRate || 0,
    ts: new Date().toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'}),
  };

  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  const shareUrl = window.location.href.split('#')[0] + '#share=' + encoded;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(shareUrl).then(() => showShareToast()).catch(() => fallbackCopy(shareUrl));
  } else {
    fallbackCopy(shareUrl);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
  showShareToast();
}

function showShareToast() {
  const t = g('share-toast');
  if (!t) return;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 3000);
}

function checkShareHash() {
  try {
    const hash = window.location.hash;
    if (!hash.startsWith('#share=')) return;
    const encoded = hash.slice(7);
    const payload = JSON.parse(decodeURIComponent(escape(atob(encoded))));
    if (!payload || !payload.sc) return;

    const col = payload.sc >= 70 ? '#22c55e' : payload.sc >= 50 ? '#f59e0b' : '#ef4444';
    const shareInfo = document.createElement('div');
    shareInfo.style.cssText = 'background:rgba(96,165,250,.08);border:1px solid rgba(96,165,250,.25);border-radius:6px;padding:.75rem 1rem;margin-bottom:.8rem;display:flex;align-items:center;gap:12px;flex-wrap:wrap';
    shareInfo.innerHTML = `
      <span style="font-family:var(--mono);font-size:9px;color:var(--bl);letter-spacing:.07em">🔗 SHARED REPORT</span>
      <span style="font-size:.82rem;color:var(--tx)"><strong>${payload.n}</strong> — ${payload.bt || 'Business'}${payload.ci ? ', ' + payload.ci : ''}</span>
      <span style="font-family:var(--mono);font-size:1rem;font-weight:700;color:${col}">${payload.sc}/100</span>
      <span style="font-size:.75rem;color:var(--mu)">Shared on ${payload.ts || 'recently'}</span>
    `;
    const rv = g('rv');
    if (rv && rv.firstChild) rv.insertBefore(shareInfo, rv.firstChild);
  } catch(_) {}
}

// what-if scenario engine
const WHATIF_SCENARIOS = [
  { id:'price',    label:'Double my price',         icon:'💰', fn:(d,s)=>({ surv:cl(s.surv+2),  prof:cl(s.prof+18), scal:cl(s.scal-5),  ldom:cl(s.ldom+3),  comp:cl(s.compositeScore+8),  note:'Higher price boosts margin & profit score but may reduce volume — net positive if demand is inelastic.' }) },
  { id:'delivery', label:'Add Swiggy/Zomato',        icon:'🛵', fn:(d,s)=>({ surv:cl(s.surv+5),  prof:cl(s.prof+10), scal:cl(s.scal+15), ldom:cl(s.ldom+12), comp:cl(s.compositeScore+10), note:'Aggregators add a parallel revenue channel, expand reach to 5km radius, and improve digital score significantly.' }) },
  { id:'staff',    label:'Hire 2 more staff',        icon:'👥', fn:(d,s)=>({ surv:cl(s.surv+8),  prof:cl(s.prof-6),  scal:cl(s.scal+14), ldom:cl(s.ldom+5),  comp:cl(s.compositeScore+5),  note:'More staff reduces single-point-of-failure risk and enables scaling, but hurts short-term profitability.' }) },
  { id:'location', label:'Open a 2nd location',      icon:'📍', fn:(d,s)=>({ surv:cl(s.surv-3),  prof:cl(s.prof-8),  scal:cl(s.scal+22), ldom:cl(s.ldom+18), comp:cl(s.compositeScore+8),  note:'Second location dramatically improves scale & dominance scores but strains cash flow — only viable after optimising Unit 1.' }) },
  { id:'digital',  label:'Full digital presence',    icon:'📱', fn:(d,s)=>({ surv:cl(s.surv+4),  prof:cl(s.prof+6),  scal:cl(s.scal+12), ldom:cl(s.ldom+8),  comp:cl(s.compositeScore+7),  note:'Active website + social media + Google Maps listing reduces CAC and builds brand equity that compounds over time.' }) },
  { id:'license',  label:'Get fully licensed',       icon:'📜', fn:(d,s)=>({ surv:cl(s.surv+14), prof:cl(s.prof+5),  scal:cl(s.scal+8),  ldom:cl(s.ldom+6),  comp:cl(s.compositeScore+10), note:'Full licensing (FSSAI + municipal) is the highest-ROI single action — eliminates shutdown risk and enables aggregator listing.' }) },
  { id:'waste',    label:'Cut waste to under 5%',    icon:'♻️', fn:(d,s)=>({ surv:cl(s.surv+6),  prof:cl(s.prof+14), scal:cl(s.scal+4),  ldom:cl(s.ldom+2),  comp:cl(s.compositeScore+7),  note:'Reducing waste directly compounds margins — every ₹1 of saved waste is ₹1 straight to profit with zero extra revenue needed.' }) },
  { id:'funding',  label:'Raise ₹10L seed funding',  icon:'💼', fn:(d,s)=>({ surv:cl(s.surv+18), prof:cl(s.prof+4),  scal:cl(s.scal+16), ldom:cl(s.ldom+4),  comp:cl(s.compositeScore+12), note:'External capital extends runway, enables hiring, and unlocks paid marketing — the multiplier effect on growth is significant.' }) },
];

function renderWhatIf(d, sc2, isS) {
  const el = g('whatif-grid');
  if (!el) return;
  el.innerHTML = WHATIF_SCENARIOS.map(s => `
    <div class="wi-card" onclick="applyWhatIf('${s.id}')">
      <span class="wi-icon">${s.icon}</span>
      <span class="wi-label">${s.label}</span>
      <span class="wi-arrow">→</span>
    </div>`).join('');
}

function applyWhatIf(id) {
  const sc2 = currentAnalysisScores;
  const d   = currentAnalysisData;
  if (!sc2) return;
  const scenario = WHATIF_SCENARIOS.find(s => s.id === id);
  if (!scenario) return;
  const proj = scenario.fn(d, sc2);
  const diff = proj.comp - sc2.compositeScore;
  const col  = diff >= 0 ? 'var(--gr)' : 'var(--re)';
  const sign = diff >= 0 ? '+' : '';
  const dims = [
    ['Survival',      sc2.surv,  proj.surv],
    ['Profit',        sc2.prof,  proj.prof],
    ['Scalability',   sc2.scal,  proj.scal],
    ['Local Dom.',    sc2.ldom,  proj.ldom],
  ];
  const el = g('whatif-result');
  if (!el) return;
  el.innerHTML = `
    <div class="wi-result">
      <div class="wi-res-header">
        <span class="wi-res-label">${scenario.icon} ${scenario.label}</span>
        <span class="wi-res-delta" style="color:${col}">Score: ${sc2.compositeScore} → <strong>${proj.comp}</strong> (${sign}${diff})</span>
      </div>
      <div class="wi-res-dims">
        ${dims.map(([l,before,after])=>{
          const d2=after-before, c2=d2>=0?'var(--gr)':'var(--re)', s2=d2>=0?'+':'';
          return `<div class="wi-dim"><span class="wi-dim-l">${l}</span><span class="wi-dim-v">${before}</span><span class="wi-dim-arr" style="color:${c2}">→ ${after} <small>(${s2}${d2})</small></span></div>`;
        }).join('')}
      </div>
      <div class="wi-note">${scenario.note}</div>
    </div>`;
  document.querySelectorAll('.wi-card').forEach(c => c.classList.remove('active'));
  const card = document.querySelector('.wi-card[onclick*="' + id + '"]');
  if (card) card.classList.add('active');
}

// break-even calculator
let beChart = null;
function initBreakevenDefaults(d) {
  const fixedEl = g('be-fixed'), varEl = g('be-var'), priceEl = g('be-price');
  if (fixedEl && d.rent) fixedEl.value = d.rent > 0 ? Math.round(d.rent * 1.4) : '';
  if (varEl && d.costUnit) varEl.value = d.costUnit || '';
  if (priceEl && d.sellPrice) priceEl.value = d.sellPrice || (d.avgPrice || '');
  updateBreakeven();
}

function updateBreakeven() {
  const fixed = parseFloat((g('be-fixed')||{value:0}).value) || 0;
  const varC  = parseFloat((g('be-var')||{value:0}).value) || 0;
  const price = parseFloat((g('be-price')||{value:0}).value) || 0;
  const el    = g('be-result');
  const cEl   = g('ch-breakeven');
  if (!el) return;
  if (price <= varC || price === 0) {
    el.innerHTML = '<div class="be-warn">⚠️ Selling price must be higher than variable cost.</div>';
    return;
  }
  const contrib    = price - varC;
  const beUnits    = Math.ceil(fixed / contrib);
  const beRevenue  = Math.round(beUnits * price);
  const marginPct  = Math.round((contrib / price) * 100);
  const daysToBreak = fixed > 0 && currentAnalysisData ? Math.ceil(beUnits / Math.max(1, (currentAnalysisData.dailyCust || 50))) : null;
  el.innerHTML = `
    <div class="be-grid">
      <div class="be-box"><div class="be-val" style="color:var(--gr)">${beUnits.toLocaleString('en-IN')}</div><div class="be-lbl">Units to Break Even</div></div>
      <div class="be-box"><div class="be-val" style="color:var(--at)">₹${beRevenue.toLocaleString('en-IN')}</div><div class="be-lbl">Break-Even Revenue</div></div>
      <div class="be-box"><div class="be-val" style="color:var(--bl)">${marginPct}%</div><div class="be-lbl">Contribution Margin</div></div>
      ${daysToBreak ? `<div class="be-box"><div class="be-val" style="color:var(--pu)">${daysToBreak} days</div><div class="be-lbl">Days to Break Even</div></div>` : ''}
    </div>`;
  if (!cEl || typeof Chart === 'undefined') return;
  if (beChart) { beChart.destroy(); beChart = null; }
  const units = Array.from({length:11}, (_,i) => Math.round(beUnits * i * 0.2));
  beChart = new Chart(cEl, {
    type: 'line',
    data: {
      labels: units.map(u => u.toLocaleString('en-IN')),
      datasets: [
        { label:'Revenue', data: units.map(u => u * price), borderColor:'#22c55e', borderWidth:2, tension:.4, pointRadius:2 },
        { label:'Total Cost', data: units.map(u => fixed + u * varC), borderColor:'#ef4444', borderWidth:2, tension:.4, pointRadius:2 },
      ]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      scales: {
        x:{ticks:{color:'#5a6380',font:{size:7}},grid:{color:'rgba(255,255,255,.04)'}},
        y:{ticks:{color:'#5a6380',font:{size:7},callback:v=>'₹'+(v>=1000?(v/1000).toFixed(0)+'K':v)},grid:{color:'rgba(255,255,255,.04)'}}
      },
      plugins:{legend:{labels:{color:'#8892b0',font:{size:8},boxWidth:8}},
        annotation:{annotations:{line1:{type:'line',xMin:5,xMax:5,borderColor:'#f59e0b',borderWidth:1.5,borderDash:[4,4]}}}}
    }
  });
}

// funding readiness meter
function renderFundingMeter(d, sc2, isS) {
  const el = g('funding-body');
  if (!el) return;
  if (isS) { el.innerHTML = '<p style="color:var(--mu);font-size:.82rem">Funding readiness is primarily relevant for startups. For street food businesses, focus on Mudra loan eligibility in the Government Scheme Matcher below.</p>'; return; }

  const criteria = [
    { label:'Revenue Traction',    score: sc2.tracS||0,  weight:25, tip:'Investors want 3+ months of consistent MRR growth. Pre-revenue = 0 points.' },
    { label:'Team Strength',       score: sc2.teamS||0,  weight:20, tip:'Solo founders score low. 2-3 co-founders with complementary skills scores highest.' },
    { label:'Market Size',         score: sc2.mktS||0,   weight:18, tip:'TAM must be large enough to justify VC returns. Hyper-local = penalty.' },
    { label:'Product Stage',       score: sl(PS,d.pstage,20), weight:15, tip:'PMF confirmed is the gold standard. Idea-only = very low score.' },
    { label:'Funding Stage',       score: sc2.funS||0,   weight:12, tip:'Having some funding already signals validation and reduces investor risk.' },
    { label:'Competitive Moat',    score: sc2.moatS||0,  weight:10, tip:'Proprietary tech, network effects, or data moats are what VCs look for.' },
  ];

  const fundScore = Math.round(criteria.reduce((acc,c) => acc + (c.score * c.weight / 100), 0));
  const fundCol   = fundScore >= 65 ? 'var(--gr)' : fundScore >= 45 ? 'var(--at)' : 'var(--re)';
  const readiness = fundScore >= 70 ? 'INVESTOR READY 🟢' : fundScore >= 55 ? 'NEARLY READY 🟡' : fundScore >= 40 ? 'GETTING THERE 🟠' : 'NOT YET READY 🔴';
  const stage     = fundScore >= 70 ? 'Seed / Series A' : fundScore >= 50 ? 'Angel / Pre-Seed' : fundScore >= 35 ? 'Friends & Family' : 'Bootstrap First';

  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:1.2rem;margin-bottom:1rem;flex-wrap:wrap">
      <div style="text-align:center">
        <div style="font-family:var(--mono);font-size:2.5rem;font-weight:800;color:${fundCol};line-height:1">${fundScore}</div>
        <div style="font-family:var(--mono);font-size:8px;color:var(--mu);letter-spacing:.07em">/ 100</div>
      </div>
      <div>
        <div style="font-family:var(--mono);font-size:.75rem;color:${fundCol};margin-bottom:4px">${readiness}</div>
        <div style="font-size:.8rem;color:var(--tx)">Recommended Stage: <strong style="color:${fundCol}">${stage}</strong></div>
      </div>
    </div>
    ${criteria.map(c => {
      const w = Math.round(c.score * c.weight / 100);
      return `<div class="fund-row">
        <div class="fund-label">${c.label} <span style="color:var(--mu);font-size:.7rem">(×${c.weight}%)</span></div>
        <div class="fund-bar-wrap"><div class="fund-bar-fill" style="width:${c.score}%;background:${c.score>=65?'var(--gr)':c.score>=45?'var(--at)':'var(--re)'}"></div></div>
        <div class="fund-score">${c.score}</div>
        <div class="fund-tip">${c.tip}</div>
      </div>`;
    }).join('')}
    <div class="fund-action">💡 To raise your funding score: focus on <strong>${criteria.sort((a,b)=>a.score-b.score)[0].label}</strong> first — it's your biggest gap weighted by investor priority.</div>
  `;
}

// government scheme matcher
const SCHEMES = [
  { name:'Pradhan Mantri Mudra Yojana (PMMY)', amount:'Up to ₹10L', type:['Street Food','Local Shop','Service','Manufacturing','Franchise'], desc:'Micro loans for non-farm enterprises. Shishu (up to ₹50K), Kishore (₹50K–5L), Tarun (₹5L–10L). No collateral required.', link:'https://www.mudra.org.in', badge:'🟢 LIKELY ELIGIBLE' },
  { name:'Startup India Seed Fund', amount:'Up to ₹20L', type:['Tech Startup','SaaS','E-Commerce'], desc:'For DPIIT-recognized startups at ideation/validation stage. Non-dilutive grant + soft loan through SEBI-registered incubators.', link:'https://seedfund.startupindia.gov.in', badge:'🟢 ELIGIBLE' },
  { name:'CGTMSE (Credit Guarantee)', amount:'Up to ₹2Cr', type:['Tech Startup','SaaS','Service','Manufacturing','E-Commerce','Local Shop'], desc:'Collateral-free loans for MSMEs through member lending institutions. Government guarantees 75–85% of the loan.', link:'https://www.cgtmse.in', badge:'🟢 ELIGIBLE' },
  { name:'PM SVANidhi (Street Vendor Loan)', amount:'₹10K–₹50K', type:['Street Food'], desc:'Micro-credit for street vendors affected by COVID. ₹10K first loan, up to ₹50K on repayment. Digital transaction incentive included.', link:'https://pmsvanidhi.mohua.gov.in', badge:'🟢 HIGHLY ELIGIBLE' },
  { name:'Standup India', amount:'₹10L–₹1Cr', type:['Manufacturing','Service','Local Shop'], desc:'Bank loans for SC/ST and women entrepreneurs for greenfield enterprises. At least one loan per bank branch mandated.', link:'https://www.standupmitra.in', badge:'🟡 CHECK ELIGIBILITY' },
  { name:'MSME Udyam Registration', amount:'Benefits', type:['Street Food','Local Shop','Service','Manufacturing','Franchise','E-Commerce'], desc:'Free registration that unlocks: priority lending, lower power tariffs, GST exemptions, tender priority, and collateral-free loan access.', link:'https://udyamregistration.gov.in', badge:'🟢 REGISTER FREE' },
  { name:'Atal Innovation Mission (AIM)', amount:'₹50L–₹1Cr', type:['Tech Startup','SaaS'], desc:'For deeptech/innovation-led startups. ATL Tinkering Labs + Atal Incubation Centres provide funding, mentorship, and infrastructure.', link:'https://aim.gov.in', badge:'🟡 APPLY' },
  { name:'FSSAI Basic Registration', amount:'₹100', type:['Street Food','Local Shop'], desc:'Mandatory food safety license for businesses with under ₹12L annual turnover. Apply at foscos.fssai.gov.in in 15 minutes.', link:'https://foscos.fssai.gov.in', badge:'⚠️ REQUIRED' },
];

function renderSchemes(d, isS) {
  const el = g('scheme-body');
  if (!el) return;
  const cat = d.bizType || (isS ? 'Street Food' : 'Tech Startup');
  const matched = SCHEMES.filter(s => s.type.includes(cat));
  const others  = SCHEMES.filter(s => !s.type.includes(cat)).slice(0,2);
  el.innerHTML = `
    <div class="scheme-note">Showing schemes for <strong style="color:var(--at)">${cat}</strong> in India. Always verify eligibility directly with the scheme portal.</div>
    ${matched.map(s => `
      <div class="scheme-card">
        <div class="scheme-header">
          <div>
            <div class="scheme-name">${s.name}</div>
            <div class="scheme-amount">${s.amount}</div>
          </div>
          <span class="scheme-badge">${s.badge}</span>
        </div>
        <div class="scheme-desc">${s.desc}</div>
        <a href="${s.link}" target="_blank" class="scheme-link">Visit Portal →</a>
      </div>`).join('')}
    ${others.length ? `<div style="margin-top:.6rem;font-family:var(--mono);font-size:8px;color:var(--mu);letter-spacing:.06em">ALSO EXPLORE →</div>
    ${others.map(s=>`<div class="scheme-card scheme-other"><div class="scheme-name" style="font-size:.8rem">${s.name}</div><div class="scheme-amount" style="font-size:.75rem">${s.amount} · ${s.type.join(', ')}</div></div>`).join('')}` : ''}
  `;
}

// compliance checklist
function renderCompliance(d, isS) {
  const el = g('compliance-body');
  if (!el) return;
  const cat = d.bizType || (isS ? 'Street Food' : 'Tech Startup');
  const rev = d.monthlyRev || (d.dailyRev * 26) || 0;
  const annualRev = rev * 12;

  const allItems = [
    { label:'FSSAI Basic Registration',       req: isS || cat==='Local Shop',                   done: d.licSt && d.licSt.includes('Licensed'),          urgent:isS,           link:'https://foscos.fssai.gov.in',              desc:'Mandatory for any food business. ₹100, 15 mins online.' },
    { label:'Municipal Trade License',        req: isS || cat==='Local Shop' || cat==='Service', done: d.license && d.license.includes('Fully'),         urgent:true,          link:'https://your-city-municipal.gov.in',       desc:'Required to legally operate from a fixed premises in your city.' },
    { label:'GST Registration',               req: annualRev > 2000000,                          done: false,                                             urgent:annualRev>1500000, link:'https://www.gst.gov.in',               desc:'Mandatory above ₹20L/year turnover. Voluntary below threshold.' },
    { label:'MSME / Udyam Registration',      req: true,                                         done: false,                                             urgent:false,         link:'https://udyamregistration.gov.in',         desc:'Free registration. Unlocks loans, subsidies & government benefits.' },
    { label:'Shops & Establishment Act',      req: d.employees > 0,                              done: false,                                             urgent:d.employees>0, link:'https://labour.gov.in',                   desc:'Required if you employ staff. Register with local labour office.' },
    { label:'Professional Tax Registration',  req: d.employees > 0,                              done: false,                                             urgent:false,         link:'https://www.mahagst.gov.in/en/profession-tax', desc:'State-level tax on employment. Varies by state.' },
    { label:'PAN Card (Business)',            req: true,                                          done: false,                                             urgent:true,          link:'https://www.incometaxindia.gov.in',         desc:'Required for any business bank account and GST registration.' },
    { label:'Current Bank Account',           req: true,                                          done: false,                                             urgent:true,          link:'',                                         desc:'Separate business account required for Swiggy/Zomato and GST.' },
    { label:'DPIIT Startup Recognition',      req: cat==='Tech Startup'||cat==='SaaS',            done: false,                                             urgent:false,         link:'https://www.startupindia.gov.in',          desc:'Unlocks tax exemptions, faster patent processing, and seed fund access.' },
    { label:'IPR / Trademark Registration',   req: cat==='Tech Startup'||cat==='SaaS'||cat==='E-Commerce', done:false,                                   urgent:false,         link:'https://ipindia.gov.in',                   desc:'Protect your brand name and logo. ₹4,500 for individuals.' },
    { label:'Import Export Code (IEC)',       req: cat==='Manufacturing'||cat==='E-Commerce',     done: false,                                             urgent:false,         link:'https://www.dgft.gov.in',                  desc:'Required if you import/export goods. Free, instant online.' },
  ];

  const required = allItems.filter(i => i.req);
  const urgent   = required.filter(i => i.urgent && !i.done);
  const normal   = required.filter(i => !i.urgent || i.done);

  el.innerHTML = `
    ${urgent.length ? `<div class="comp-urgent-hdr">🚨 URGENT — Do These First</div>
    ${urgent.map(i=>`<div class="comp-item comp-urgent">
      <div class="comp-check">⬜</div>
      <div class="comp-info"><div class="comp-label">${i.label}</div><div class="comp-desc">${i.desc}</div></div>
      ${i.link ? `<a href="${i.link}" target="_blank" class="comp-link">Apply →</a>` : ''}
    </div>`).join('')}` : ''}
    <div class="comp-normal-hdr" style="margin-top:${urgent.length?'.75rem':'0'}">📋 Full Checklist for ${cat}</div>
    ${normal.map(i=>`<div class="comp-item ${i.done?'comp-done':''}">
      <div class="comp-check">${i.done?'✅':'⬜'}</div>
      <div class="comp-info"><div class="comp-label">${i.label}</div><div class="comp-desc">${i.desc}</div></div>
      ${i.link && !i.done ? `<a href="${i.link}" target="_blank" class="comp-link">Apply →</a>` : ''}
    </div>`).join('')}
  `;
}

// pitch deck generator
async function generatePitchDeck() {
  const d   = currentAnalysisData;
  const sc2 = currentAnalysisScores;
  if (!d) return;
  const btn = g('pitch-btn');
  const res = g('pitch-result');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Generating...'; }
  if (res) res.innerHTML = '<div class="ai-spin-wrap"><div class="ai-spinner"></div><div><div class="ai-ld-title">🤖 CLAUDE WRITING YOUR PITCH DECK...</div><div class="ai-ld-sub">Building 10 slides — usually takes 10–15 seconds.</div></div></div>';

  const prompt = `You are an expert startup pitch deck consultant. Create a compelling 10-slide investor pitch deck for this business.
Business: ${d.name} | Type: ${d.bizType||'Startup'} | Industry: ${d.industry||'?'} | Location: ${loc(d)}
Score: ${sc2.compositeScore}/100 | Monthly Revenue: ₹${d.monthlyRev||0} | Margin: ${d.margin||0}% | Growth: ${d.growthRate||0}%/mo
Description: "${d.description||'Not provided'}"
Team: ${d.tsize||'?'} | Stage: ${d.pstage||'?'} | Funding: ${d.fstage||'?'}

Return ONLY valid JSON, no markdown:
{"slides":[
  {"num":1,"title":"Cover","heading":"[Company Name]","content":"[One-line tagline]","note":"[Presenter note]"},
  {"num":2,"title":"Problem","heading":"The Problem","content":"[3 bullet points describing the problem]","note":"..."},
  {"num":3,"title":"Solution","heading":"Our Solution","content":"[How you solve it]","note":"..."},
  {"num":4,"title":"Market","heading":"Market Opportunity","content":"[TAM/SAM/SOM with numbers]","note":"..."},
  {"num":5,"title":"Product","heading":"How It Works","content":"[3 key features/steps]","note":"..."},
  {"num":6,"title":"Traction","heading":"Traction & Validation","content":"[Revenue, customers, growth metrics]","note":"..."},
  {"num":7,"title":"Business Model","heading":"How We Make Money","content":"[Revenue streams and unit economics]","note":"..."},
  {"num":8,"title":"Competition","heading":"Competitive Advantage","content":"[Why you win vs alternatives]","note":"..."},
  {"num":9,"title":"Team","heading":"The Team","content":"[Key members and why they can win this]","note":"..."},
  {"num":10,"title":"Ask","heading":"The Ask","content":"[Funding amount, use of funds, milestones]","note":"..."}
]}`;

  let slides = null;
  try {
    if (!navigator.onLine) throw new Error('offline');
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:2000, messages:[{role:'user',content:prompt}] })
    });
    if (!r.ok) throw new Error('api');
    const data = await r.json();
    const text = data.content.map(b=>b.type==='text'?b.text:'').join('');
    const clean = text.replace(/```json|```/gi,'').trim();
    try { slides = JSON.parse(clean).slides; } catch(_) {
      const s2=clean.indexOf('{'),e2=clean.lastIndexOf('}');
      if(s2!==-1&&e2>s2) try{slides=JSON.parse(clean.slice(s2,e2+1)).slides;}catch(_){}
    }
  } catch(_) {}

  if (!slides) slides = getOfflinePitchSlides(d, sc2);

  if (res) res.innerHTML = `
    <div class="pitch-deck">
      <div class="pitch-header">
        <span class="pitch-title-lbl">${d.name} — Investor Pitch Deck</span>
        <button class="btn-sm btn-exp-all" onclick="exportPitchHTML()">⬇ Export HTML</button>
      </div>
      <div class="pitch-slides">
        ${slides.map((s,i) => `
          <div class="pitch-slide slide-${(i%5)+1}">
            <div class="slide-num">${s.num}/10</div>
            <div class="slide-category">${s.title}</div>
            <div class="slide-heading">${s.heading}</div>
            <div class="slide-content">${s.content.split('\n').map(l=>`<div class="slide-line">${l}</div>`).join('')}</div>
            <div class="slide-note">💡 ${s.note}</div>
          </div>`).join('')}
      </div>
    </div>`;
  window._pitchSlides = slides;
  if (btn) { btn.disabled=false; btn.textContent='✨ Regenerate Pitch Deck'; }
}

function getOfflinePitchSlides(d, sc2) {
  const n=d.name||'Our Company', city=d.city||'India';
  return [
    {num:1,title:'Cover',heading:n,content:`"${d.description||'Building the future of '+d.industry+' in India'}"\n${d.bizType||'Startup'} · ${city} · ${new Date().getFullYear()}`,note:'Open with energy. Say the company name and tagline clearly.'},
    {num:2,title:'Problem',heading:'The Problem',content:`• Customers in ${city} struggle with ${d.industry||'this space'} daily\n• Current solutions are expensive, slow, or inaccessible\n• This gap represents millions in unserved demand`,note:'Make the audience feel the pain. Use a real customer story.'},
    {num:3,title:'Solution',heading:'Our Solution',content:`${n} solves this by providing ${d.bizType==='Street Food'?'affordable, accessible food at the right location':'a focused product that directly addresses the core pain'}\n\nKey advantage: ${d.diff||'First-mover with superior execution'}`,note:'Show a demo or photo if possible. Keep it simple.'},
    {num:4,title:'Market',heading:'Market Opportunity',content:`TAM: ${d.msize||'National'} opportunity\nSAM: ${city} and surrounding areas\nSOM: ${d.area||'Target locality'} in Year 1\n\nMarket is ${d.trend||'growing steadily'} — ideal entry timing`,note:'Use a bottom-up calculation, not just a top-down number.'},
    {num:5,title:'Product',heading:'How It Works',content:`1. Customer discovers ${n}\n2. Experiences ${d.diff||'unique value proposition'}\n3. Becomes a repeat customer (${d.repeatRate||60}% repeat rate)\n\nCurrent stage: ${d.pstage||'Launched'}`,note:'Walk through the customer journey in 60 seconds.'},
    {num:6,title:'Traction',heading:'Traction & Validation',content:`• Revenue: ₹${(d.monthlyRev||0).toLocaleString('en-IN')}/month\n• Growth: ${d.growthRate||0}% month-on-month\n• Score: ${sc2.compositeScore}/100 on ML viability engine\n• Customers: ${d.dailyCust||'Growing'} daily`,note:'Show the trend, not just the number. A chart is best here.'},
    {num:7,title:'Business Model',heading:'How We Make Money',content:`Primary: Direct sales at ${d.avgPrice||0>0?'₹'+d.avgPrice+' avg':'competitive price points'}\nMargin: ${d.margin||50}% gross margin\nBreak-even: ${d.breakeven||'Within 6 months'}\nExpansion: ${d.expansion||'Multiple outlets + online'}`,note:'Investors want to see a path to unit economics profitability.'},
    {num:8,title:'Competition',heading:'Why We Win',content:`Competitive position: ${d.comp||'Growing market'}\nOur moat: ${d.diff||'Execution + location + quality'}\nKey advantage vs alternatives: Speed, accessibility, and trust\nDefensibility: ${sc2.ldom>=60?'Strong local dominance':'Building brand loyalty'}`,note:'Acknowledge competition honestly. Show you understand the landscape.'},
    {num:9,title:'Team',heading:'The Team',content:`Founder experience: ${d.fexp||'Domain expert'}\nTeam size: ${d.tsize||'Lean and focused'}\nLocation: ${city}, ${d.state||'India'}\n\nWe have the right team for this market at this time.`,note:'Investors bet on people first. Be specific about why YOU can win this.'},
    {num:10,title:'Ask',heading:'The Ask',content:`Raising: ₹${sc2.compositeScore>=65?'1–3Cr':sc2.compositeScore>=50?'25–75L':'10–25L'} ${sc2.compositeScore>=65?'Seed':'Pre-Seed'}\n\nUse of funds:\n• 40% Product & Operations\n• 35% Growth & Marketing\n• 25% Team expansion\n\nMilestone: ${sc2.compositeScore>=60?'₹10L MRR in 12 months':'Prove unit economics in 6 months'}`,note:'Be specific about the ask and what you will do with it.'},
  ];
}

function exportPitchHTML() {
  const slides = window._pitchSlides;
  const d = currentAnalysisData;
  if (!slides || !d) return;
  const colors = ['#f59e0b','#22c55e','#60a5fa','#a78bfa','#22d3ee'];
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>${d.name} Pitch Deck</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',sans-serif;background:#0a0a0f;color:#fff}
.slide{min-height:100vh;display:flex;flex-direction:column;justify-content:center;padding:60px 80px;border-bottom:1px solid #222;page-break-after:always}
.s-num{font-size:.7rem;color:#555;letter-spacing:.1em;margin-bottom:12px}
.s-cat{font-size:.75rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;margin-bottom:16px}
.s-head{font-size:2.4rem;font-weight:800;line-height:1.15;margin-bottom:24px}
.s-body{font-size:1rem;line-height:1.8;color:#ccc;white-space:pre-line;max-width:700px}
.s-note{margin-top:32px;font-size:.8rem;color:#555;border-top:1px solid #222;padding-top:12px}
@media print{.slide{min-height:auto;padding:40px}}
</style></head><body>
${slides.map((s,i)=>`<div class="slide"><div class="s-num">${s.num} / 10</div><div class="s-cat" style="color:${colors[i%5]}">${s.title}</div><div class="s-head">${s.heading}</div><div class="s-body">${s.content}</div><div class="s-note">📝 ${s.note}</div></div>`).join('')}
</body></html>`;
  const win = window.open('','_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  setTimeout(()=>win.print(),500);
}

// business plan writer
async function generateBizPlan() {
  const d   = currentAnalysisData;
  const sc2 = currentAnalysisScores;
  if (!d) return;
  const btn = g('bizplan-btn');
  const res = g('bizplan-result');
  if (btn) { btn.disabled=true; btn.textContent='⏳ Writing Plan...'; }
  if (res) res.innerHTML = '<div class="ai-spin-wrap"><div class="ai-spinner"></div><div><div class="ai-ld-title" style="color:var(--cy)">📝 CLAUDE WRITING BUSINESS PLAN...</div><div class="ai-ld-sub">Building 5 sections — usually takes 15–20 seconds.</div></div></div>';

  const prompt = `You are a senior business consultant. Write a concise, India-specific business plan for this business.
Business: ${d.name} | Type: ${d.bizType} | City: ${loc(d)} | Score: ${sc2.compositeScore}/100
Revenue: ₹${d.monthlyRev||0}/month | Margin: ${d.margin||0}% | Growth: ${d.growthRate||0}%/month
Description: "${d.description||''}"

Return ONLY valid JSON:
{"sections":[
  {"title":"Executive Summary","icon":"📋","content":"2-3 paragraph executive summary of the business, opportunity, and vision"},
  {"title":"Market Analysis","icon":"📊","content":"Market size, customer segments, trends, and competitive landscape specific to ${d.city||'India'}"},
  {"title":"Financial Projections","icon":"💰","content":"12-month revenue projections, cost structure, break-even analysis, and funding requirements"},
  {"title":"Go-to-Market Strategy","icon":"🚀","content":"Customer acquisition strategy, channels, pricing, and 90-day action plan"},
  {"title":"Milestones & Roadmap","icon":"🗓️","content":"Key milestones for 3, 6, 12, and 24 months with measurable targets"}
]}`;

  let sections = null;
  try {
    if (!navigator.onLine) throw new Error('offline');
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:2500, messages:[{role:'user',content:prompt}] })
    });
    if (!r.ok) throw new Error('api');
    const data = await r.json();
    const text = data.content.map(b=>b.type==='text'?b.text:'').join('');
    const clean = text.replace(/```json|```/gi,'').trim();
    try { sections = JSON.parse(clean).sections; } catch(_) {
      const s2=clean.indexOf('{'),e2=clean.lastIndexOf('}');
      if(s2!==-1&&e2>s2) try{sections=JSON.parse(clean.slice(s2,e2+1)).sections;}catch(_){}
    }
  } catch(_) {}

  if (!sections) sections = getOfflineBizPlanSections(d, sc2);

  if (res) res.innerHTML = `
    <div class="bizplan-wrap">
      <div class="bizplan-cover">
        <div class="bizplan-title">${d.name}</div>
        <div class="bizplan-subtitle">Business Plan · ${new Date().toLocaleDateString('en-IN',{month:'long',year:'numeric'})}</div>
        <div class="bizplan-meta">${d.bizType||'Business'} · ${loc(d)} · Score ${sc2.compositeScore}/100</div>
        <button class="btn-sm btn-exp-all" style="margin-top:.75rem" onclick="exportBizPlanHTML()">⬇ Export PDF</button>
      </div>
      ${sections.map((s,i) => `
        <div class="bizplan-section">
          <div class="bizplan-sec-hdr">${s.icon} ${s.title}</div>
          <div class="bizplan-sec-body">${s.content.split('\n').filter(l=>l.trim()).map(l=>`<p>${l}</p>`).join('')}</div>
        </div>`).join('')}
    </div>`;
  window._bizPlanSections = sections;
  if (btn) { btn.disabled=false; btn.textContent='📝 Regenerate Business Plan'; }
}

function getOfflineBizPlanSections(d, sc2) {
  const n=d.name||'The Business', city=d.city||'India', mr=d.monthlyRev||0;
  return [
    {title:'Executive Summary',icon:'📋',content:`${n} is a ${d.bizType||'business'} operating in ${city}, ${d.state||'India'}. The business targets ${d.crowdType||'local customers'} and currently operates at ${d.pstage||'early stage'} with ${d.rev||'growing revenue'}.\n\nWith a viability score of ${sc2.compositeScore}/100, ${n} demonstrates ${sc2.compositeScore>=65?'strong':'moderate'} fundamentals across survival, profitability, and scalability dimensions. The business has clear market demand and a defined customer base.\n\nThe 12-month vision is to achieve ₹${Math.round(mr*Math.pow(1+(d.growthRate||10)/100,12)/1000)}K monthly revenue by executing on digital expansion, operational excellence, and ${d.expansion||'strategic scaling'}.`},
    {title:'Market Analysis',icon:'📊',content:`The ${d.industry||d.bizType||'target'} market in ${city} is ${d.trend||'growing steadily'}. The total addressable market spans ${d.msize||'city level'} with increasing demand driven by urbanization and changing consumer patterns.\n\nTarget customer: ${d.crowdType||'Local consumers'} with purchase frequency of ${d.buyFreq||'regular'}. Area competition is ${d.areaComp||'moderate'} with ${n} positioned around ${d.diff||'quality and location advantage'}.\n\nKey market insight: ${d.landmarks||'Location'} adjacency creates a built-in customer pipeline. The primary competitive risk is ${d.comp||'growing competition from organized players'} over the next 18 months.`},
    {title:'Financial Projections',icon:'💰',content:`Current monthly revenue: ₹${mr.toLocaleString('en-IN')} | Gross margin: ${d.margin||50}% | Monthly growth rate: ${d.growthRate||10}%\n\n12-Month Projections:\n• Month 3: ₹${Math.round(mr*Math.pow(1+(d.growthRate||10)/100,3)/1000)}K/month\n• Month 6: ₹${Math.round(mr*Math.pow(1+(d.growthRate||10)/100,6)/1000)}K/month\n• Month 12: ₹${Math.round(mr*Math.pow(1+(d.growthRate||10)/100,12)/1000)}K/month\n\nBreak-even: ${d.breakeven||'Within 6 months'}. Key cost drivers: ${d.rent?'Rent ₹'+d.rent.toLocaleString('en-IN')+'/month, ':''}staff, raw materials. Funding requirement: ${sc2.funS<40?'External capital needed to accelerate':'Bootstrappable to next milestone'}.`},
    {title:'Go-to-Market Strategy',icon:'🚀',content:`Primary channel: ${d.online&&d.online.includes('Active')?'Digital + Physical presence':'Direct customer acquisition at '+city+' location'}\nSecondary: ${d.aggr&&d.aggr.includes('Yes')?'Swiggy/Zomato delivery':'Aggregator listing (priority action)'}\nMarketing: ${d.marketing||'Word of mouth + social media'} with ₹${d.adSpend||0}/month spend\n\n90-Day Sprint:\nWeek 1-2: ${d.licSt&&!d.licSt.includes('Licensed')?'Complete licensing + FSSAI':'Optimize digital presence'}\nWeek 3-4: Launch WhatsApp Business broadcast to regulars\nMonth 2: ${d.aggr&&d.aggr.includes('No')?'Swiggy/Zomato listing':'Paid social media campaign'}\nMonth 3: Review unit economics and double down on best-performing channel`},
    {title:'Milestones & Roadmap',icon:'🗓️',content:`3 Months: Achieve ₹${Math.round(mr*Math.pow(1+(d.growthRate||10)/100,3)/1000)}K/month, get fully licensed, 100+ WhatsApp subscribers\n\n6 Months: ₹${Math.round(mr*Math.pow(1+(d.growthRate||10)/100,6)/1000)}K/month, ${d.aggr&&d.aggr.includes('No')?'live on Swiggy/Zomato':'3+ months consistent growth'}, documented systems for scale\n\n12 Months: ₹${Math.round(mr*Math.pow(1+(d.growthRate||10)/100,12)/1000)}K/month, ${d.expansion||'expansion plan finalized'}, team of ${Math.max(3,(d.employees||1)+2)}\n\n24 Months: ${d.msize==='City Level'||d.msize==='State Level'?'Multi-location presence in '+city:'National market entry planned'}, ${sc2.compositeScore>=60?'Series A ready':'seed round closed'}, recurring revenue model established`},
  ];
}

function exportBizPlanHTML() {
  const sections = window._bizPlanSections;
  const d = currentAnalysisData;
  if (!sections || !d) return;
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>${d.name} Business Plan</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',sans-serif;background:#fff;color:#1a1a2e;font-size:13px;padding:48px;max-width:820px;margin:0 auto}
h1{font-size:2rem;font-weight:800;color:#0f0f1a;margin-bottom:8px}.meta{color:#888;font-size:.82rem;margin-bottom:32px;padding-bottom:16px;border-bottom:3px solid #f59e0b}
.sec{margin-bottom:28px}.sec-hdr{font-size:.7rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#f59e0b;border-bottom:1px solid #f0e0c0;padding-bottom:5px;margin-bottom:12px}
p{font-size:.88rem;line-height:1.75;color:#333;margin-bottom:8px}
footer{text-align:center;margin-top:32px;font-size:.68rem;color:#aaa;border-top:1px solid #eee;padding-top:12px}
@media print{body{padding:24px}}</style></head><body>
<h1>${d.name}</h1><div class="meta">Business Plan · ${d.bizType||'Business'} · ${loc(d)} · ${new Date().toLocaleDateString('en-IN',{month:'long',year:'numeric'})}</div>
${sections.map(s=>`<div class="sec"><div class="sec-hdr">${s.icon} ${s.title}</div>${s.content.split('\n').filter(l=>l.trim()).map(l=>`<p>${l}</p>`).join('')}</div>`).join('')}
<footer>Startup Intelligence Platform — Pro Edition · Generated ${new Date().toLocaleDateString('en-IN')}</footer>
</body></html>`;
  const win = window.open('','_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  setTimeout(()=>win.print(),500);
}

// monthly score tracker
let trackerChart = null;
function renderTracker(d, sc2) {
  const el = g('tracker-body');
  if (!el) return;
  let tData = [];
  try { const s = localStorage.getItem('sip_tracker'); if(s) tData = JSON.parse(s); } catch(_) {}

  // auto-save this analysis to tracker
  const month = new Date().toLocaleDateString('en-IN',{month:'short',year:'numeric'});
  const existing = tData.findIndex(t => t.name===d.name && t.month===month);
  const entry = { name:d.name, month, score:sc2.compositeScore, surv:sc2.surv, prof:sc2.prof, scal:sc2.scal, ldom:sc2.ldom, ts:Date.now() };
  if (existing >= 0) tData[existing] = entry; else tData.push(entry);
  tData.sort((a,b)=>a.ts-b.ts);
  if (tData.length > 24) tData = tData.slice(-24);
  try { localStorage.setItem('sip_tracker', JSON.stringify(tData)); } catch(_) {}

  const myData = tData.filter(t=>t.name===d.name);

  if (myData.length < 2) {
    el.innerHTML = `<div style="background:var(--card2);border-radius:5px;padding:.8rem;font-size:.82rem;color:var(--mu);border-left:3px solid var(--bl)">
      ✅ Current score <strong style="color:${sc(sc2.compositeScore)}">${sc2.compositeScore}</strong> saved for <strong style="color:var(--tx)">${month}</strong>.
      Re-analyze next month to start tracking your progress over time — the chart will appear automatically.
    </div>`;
    return;
  }

  const trend = myData[myData.length-1].score - myData[myData.length-2].score;
  const trendCol = trend>0?'var(--gr)':trend<0?'var(--re)':'var(--at)';
  const trendIcon = trend>0?'↑':trend<0?'↓':'→';
  el.innerHTML = `
    <div style="display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:.75rem">
      <div class="qc" style="flex:1;min-width:80px"><div class="qv" style="color:${sc(sc2.compositeScore)}">${sc2.compositeScore}</div><div class="ql">Current</div></div>
      <div class="qc" style="flex:1;min-width:80px"><div class="qv" style="color:${trendCol}">${trendIcon}${Math.abs(trend)}</div><div class="ql">vs Last Month</div></div>
      <div class="qc" style="flex:1;min-width:80px"><div class="qv">${myData.length}</div><div class="ql">Months Tracked</div></div>
      <div class="qc" style="flex:1;min-width:80px"><div class="qv" style="color:var(--bl)">${Math.max(...myData.map(t=>t.score))}</div><div class="ql">Best Score</div></div>
    </div>`;

  const cEl = g('ch-tracker');
  if (!cEl || typeof Chart === 'undefined') return;
  if (trackerChart) { trackerChart.destroy(); trackerChart = null; }
  trackerChart = new Chart(cEl, {
    type:'line',
    data:{
      labels: myData.map(t=>t.month),
      datasets:[
        {label:'Overall Score',data:myData.map(t=>t.score),borderColor:'#f59e0b',backgroundColor:'rgba(245,158,11,.08)',borderWidth:2.5,pointRadius:5,pointBackgroundColor:myData.map(t=>sc(t.score)),tension:.4,fill:true},
        {label:'Survival',data:myData.map(t=>t.surv),borderColor:'#22c55e',borderWidth:1.5,pointRadius:3,tension:.4},
        {label:'Profitability',data:myData.map(t=>t.prof),borderColor:'#60a5fa',borderWidth:1.5,pointRadius:3,tension:.4},
        {label:'Scalability',data:myData.map(t=>t.scal),borderColor:'#a78bfa',borderWidth:1.5,pointRadius:3,tension:.4},
      ]
    },
    options:{
      responsive:true,maintainAspectRatio:false,
      scales:{
        x:{ticks:{color:'#5a6380',font:{size:8}},grid:{color:'rgba(255,255,255,.04)'}},
        y:{min:0,max:100,ticks:{color:'#5a6380',font:{size:8}},grid:{color:'rgba(255,255,255,.04)'}}
      },
      plugins:{legend:{labels:{color:'#8892b0',font:{size:8},boxWidth:8}}}
    }
  });
}

// comparison engine (pick 2–5 from history)

let cmpSelected = new Set();   // indices into history[]
let cmpChart    = null;
const CMP_COLORS = ['#f59e0b','#22c55e','#60a5fa','#a78bfa','#fb7185'];

// show all history entries as selectable cards
function renderComparison() {
  const el = g('cmp-body');
  if (!el) return;

  if (!history.length) {
    el.innerHTML = `<div class="cmp-empty">No analyses in history yet. Run at least 2 analyses to use comparison.</div>`;
    return;
  }

  if (history.length < 2) {
    el.innerHTML = `<div class="cmp-empty">Only 1 analysis saved. Run one more to unlock comparison.</div>`;
    return;
  }

  cmpSelected.clear();

  el.innerHTML = `
    <div class="cmp-hint">
      <span id="cmp-counter" class="cmp-counter">0 / 5 selected</span>
      <span class="cmp-hint-txt">Pick <strong>2–5</strong> analyses from your history to compare side-by-side</span>
    </div>
    <div class="cmp-pick-grid" id="cmp-pick-grid">
      ${history.map((h, i) => `
        <div class="cmp-pick" id="cmp-pick-${i}" onclick="toggleCmp(${i})">
          <div class="cmp-pick-chk" id="cmp-chk-${i}">✓</div>
          <div class="cmp-pick-info">
            <div class="cmp-pick-name">${h.name}</div>
            <div class="cmp-pick-meta">${h.bizType || '—'} · ${h.city || '—'}</div>
            <div class="cmp-pick-ts">${h.ts}</div>
          </div>
          <div class="cmp-pick-score" style="color:${sc(h.score)}">${h.score}</div>
        </div>`).join('')}
    </div>
    <div id="cmp-need-more" class="cmp-need-more">← Select at least 2 analyses above to see comparison</div>
    <div id="cmp-result"></div>`;
}

function toggleCmp(idx) {
  if (cmpSelected.has(idx)) {
    cmpSelected.delete(idx);
    const el = g('cmp-pick-' + idx);
    if (el) el.classList.remove('on');
  } else {
    if (cmpSelected.size >= 5) return;   // hard cap at 5
    cmpSelected.add(idx);
    const el = g('cmp-pick-' + idx);
    if (el) el.classList.add('on');
  }

  // update the selection counter
  const counter = g('cmp-counter');
  if (counter) {
    counter.textContent = `${cmpSelected.size} / 5 selected`;
    counter.className = 'cmp-counter' + (cmpSelected.size >= 5 ? ' full' : cmpSelected.size >= 2 ? ' ready' : '');
  }

  // gray out the rest once 5 are selected
  document.querySelectorAll('.cmp-pick').forEach((el, i) => {
    if (!cmpSelected.has(i) && cmpSelected.size >= 5) el.classList.add('cmp-disabled');
    else el.classList.remove('cmp-disabled');
  });

  const needMore = g('cmp-need-more');
  const resultEl = g('cmp-result');

  if (cmpSelected.size < 2) {
    if (needMore) needMore.style.display = 'block';
    if (resultEl) resultEl.innerHTML = '';
    if (cmpChart) { try { cmpChart.destroy(); } catch(_) {} cmpChart = null; }
    return;
  }

  if (needMore) needMore.style.display = 'none';
  buildCmpResult();
}

function buildCmpResult() {
  const el = g('cmp-result');
  if (!el) return;

  const entries = [...cmpSelected].sort((a,b) => a - b).map(i => history[i]);

  const dims = [
    { key:'compositeScore', label:'🏆 Overall Score' },
    { key:'surv',           label:'🛡 Survival'      },
    { key:'prof',           label:'💰 Profit Stab.'  },
    { key:'scal',           label:'📈 Scalability'   },
    { key:'ldom',           label:'📍 Local Dom.'    },
  ];

  const getV = (entry, key) => key === 'compositeScore'
    ? (entry.scores?.compositeScore || entry.score || 0)
    : (entry.scores?.[key] || 0);

  // find best and worst per dimension
  const best = {}, worst = {};
  dims.forEach(d => {
    const vals = entries.map(e => getV(e, d.key));
    best[d.key]  = Math.max(...vals);
    worst[d.key] = Math.min(...vals);
  });

  const radarKeys   = ['surv','prof','scal','ldom','compositeScore'];
  const radarLabels = ['Survival','Profit','Scale','Local Dom.','Overall'];

  el.innerHTML = `
    <div class="cmp-table-wrap">
      <div class="cmp-table">

        <!-- HEADER ROW -->
        <div class="cmp-row cmp-hdr-row">
          <div class="cmp-cell cmp-dim-cell"></div>
          ${entries.map((e, i) => `
            <div class="cmp-cell cmp-head-cell" style="border-top:3px solid ${CMP_COLORS[i]}">
              <div class="cmp-head-dot" style="background:${CMP_COLORS[i]}"></div>
              <div class="cmp-head-name" style="color:${CMP_COLORS[i]}">${e.name}</div>
              <div class="cmp-head-meta">${e.bizType || '—'} · ${e.city || '—'}</div>
              <div class="cmp-head-ts">${e.ts}</div>
            </div>`).join('')}
        </div>

        <!-- SCORE ROWS -->
        ${dims.map((dim, di) => `
          <div class="cmp-row ${di === 0 ? 'cmp-total-row' : ''}">
            <div class="cmp-cell cmp-dim-cell">${dim.label}</div>
            ${entries.map((e, i) => {
              const val      = getV(e, dim.key);
              const isBest   = val === best[dim.key]  && best[dim.key] !== worst[dim.key];
              const isWorst  = val === worst[dim.key] && best[dim.key] !== worst[dim.key];
              // delta vs best
              const delta    = val - best[dim.key];
              const dHtml    = delta === 0
                ? `<span class="cmp-delta pos">BEST</span>`
                : `<span class="cmp-delta neg">▼ ${Math.abs(delta)}</span>`;
              return `
                <div class="cmp-cell cmp-val-cell ${isBest?'cmp-best':''} ${isWorst?'cmp-worst':''}">
                  <span class="cmp-score" style="color:${sc(val)}">${val}</span>
                  ${dHtml}
                </div>`;
            }).join('')}
          </div>`).join('')}

        <!-- INFO ROWS -->
        <div class="cmp-row cmp-info-row">
          <div class="cmp-cell cmp-dim-cell">🏢 Type</div>
          ${entries.map(e => `<div class="cmp-cell cmp-info-cell">${e.bizType || '—'}</div>`).join('')}
        </div>
        <div class="cmp-row cmp-info-row">
          <div class="cmp-cell cmp-dim-cell">📍 City</div>
          ${entries.map(e => `<div class="cmp-cell cmp-info-cell">${e.data?.city || '—'}</div>`).join('')}
        </div>
        <div class="cmp-row cmp-info-row">
          <div class="cmp-cell cmp-dim-cell">💹 Monthly Rev</div>
          ${entries.map(e => {
            const mr = (e.data?.monthlyRev) || (e.data?.dailyRev > 0 ? e.data.dailyRev * 26 : 0);
            return `<div class="cmp-cell cmp-info-cell">${mr > 0 ? '₹' + mr.toLocaleString('en-IN') : '—'}</div>`;
          }).join('')}
        </div>
        <div class="cmp-row cmp-info-row">
          <div class="cmp-cell cmp-dim-cell">📊 Margin %</div>
          ${entries.map(e => `<div class="cmp-cell cmp-info-cell">${e.data?.margin > 0 ? e.data.margin + '%' : '—'}</div>`).join('')}
        </div>
        <div class="cmp-row cmp-info-row">
          <div class="cmp-cell cmp-dim-cell">🚀 Growth / Mo</div>
          ${entries.map(e => `<div class="cmp-cell cmp-info-cell">${e.data?.growthRate > 0 ? e.data.growthRate + '%' : '—'}</div>`).join('')}
        </div>
      </div>
    </div>

    <!-- RADAR OVERLAY -->
    <div class="cmp-radar-wrap">
      <div class="cmp-radar-title">📡 RADAR OVERLAY</div>
      <div style="position:relative;height:260px"><canvas id="ch-cmp-radar"></canvas></div>
    </div>

    <!-- WINNER SUMMARY -->
    ${buildWinnerSummary(entries, dims, best, getV)}`;

  // Draw radar
  setTimeout(() => {
    if (typeof Chart === 'undefined') return;
    if (cmpChart) { try { cmpChart.destroy(); } catch(_) {} cmpChart = null; }
    const cEl = g('ch-cmp-radar');
    if (!cEl) return;
    cmpChart = new Chart(cEl, {
      type: 'radar',
      data: {
        labels: radarLabels,
        datasets: entries.map((e, i) => ({
          label: e.name,
          data: radarKeys.map(k => getV(e, k)),
          backgroundColor: hexAlpha(CMP_COLORS[i], 0.08),
          borderColor: CMP_COLORS[i],
          borderWidth: 2,
          pointBackgroundColor: CMP_COLORS[i],
          pointRadius: 4,
        }))
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: { r: { min: 0, max: 100, ticks: { display: false }, grid: { color: 'rgba(255,255,255,.05)' }, angleLines: { color: 'rgba(255,255,255,.05)' }, pointLabels: { color: '#8892b0', font: { size: 9 } } } },
        plugins: { legend: { position: 'bottom', labels: { color: '#8892b0', font: { size: 9 }, boxWidth: 10, padding: 8 } } }
      }
    });
  }, 120);
}

function buildWinnerSummary(entries, dims, best, getV) {
  const wins = Object.fromEntries(entries.map(e => [e.name, 0]));
  dims.forEach(dim => {
    entries.filter(e => getV(e, dim.key) === best[dim.key])
           .forEach(e => wins[e.name] = (wins[e.name] || 0) + 1);
  });
  const overall = entries.reduce((a, b) => (a.scores?.compositeScore || a.score || 0) >= (b.scores?.compositeScore || b.score || 0) ? a : b);
  const sorted  = Object.entries(wins).sort((a, b) => b[1] - a[1]);
  return `
    <div class="cmp-winner-box">
      <div class="cmp-winner-lbl">📊 COMPARISON SUMMARY</div>
      <div class="cmp-winner-main">
        <span style="color:var(--gr)">🏆 Overall Winner:</span>
        <strong style="color:var(--br)">${overall.name}</strong>
        <span class="cmp-score" style="color:${sc(overall.scores?.compositeScore || overall.score)}">${overall.scores?.compositeScore || overall.score}/100</span>
      </div>
      <div class="cmp-win-grid">
        ${sorted.map(([name, w], i) => `
          <div class="cmp-win-item">
            <span class="cmp-win-dot" style="background:${CMP_COLORS[entries.findIndex(e=>e.name===name)%5]}"></span>
            <span class="cmp-win-name">${name}</span>
            <span class="cmp-win-count" style="color:${w>=4?'var(--gr)':w>=2?'var(--at)':'var(--mu)'}">${w} best</span>
          </div>`).join('')}
      </div>
    </div>`;
}

function hexAlpha(hex, alpha) {
  const r = parseInt(hex.slice(1,3),16), g2 = parseInt(hex.slice(3,5),16), b2 = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g2},${b2},${alpha})`;
}
