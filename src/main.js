import './style.css';
import { calculate } from './math.js';
const app = document.querySelector('#app');
app.innerHTML = `
<header><a class="brand" href="./"><span class="logo">◈</span> orbit<span class="brand-dot">.</span></a><span class="header-caption">A little space to think.</span><button id="theme" class="icon-button" aria-label="Toggle light theme">☼</button></header>
<main><div class="intro"><div class="eyebrow"><span></span> EVERYDAY MATH, ELEVATED</div><h1>Make room for<br><em>clear thinking.</em></h1><p>Big ideas. Small calculations.<br>Your everyday companion for the numbers in between.</p><div class="intro-bottom"><span class="mini-icon">⌘</span><div>Made for your flow.<small>Use your keyboard or take it one tap at a time.</small></div></div></div>
<section class="workspace" aria-label="Calculator"><div class="calc"><div class="calc-top"><span><i class="status-dot"></i> STANDARD</span><button id="scientific" aria-pressed="false">ƒx <span>Scientific</span></button></div><div class="display"><div id="expression" aria-label="Expression">0</div><div id="result" aria-live="polite">0</div><div class="display-bottom"><span id="message">Ready when you are</span><button id="copy" aria-label="Copy result">▢</button></div></div><div id="science" hidden><button data-fn="sqrt">√x</button><button data-fn="square">x²</button><button data-fn="sin">sin</button><button data-fn="cos">cos</button><button data-value="(">(</button><button data-value=")">)</button></div><div class="keys">${['AC','±','%','÷','7','8','9','×','4','5','6','−','1','2','3','+','⌫','0','.','='].map(k=>`<button data-key="${k}" class="${k==='='?'equals':['÷','×','−','+'].includes(k)?'operator':['AC','±','%'].includes(k)?'utility':''}" ${k==='⌫'?'aria-label="Backspace"':''}>${k}</button>`).join('')}</div><div class="calc-footer"><span><span class="keycap">↵</span> to calculate</span><span>Precision, without the noise.</span></div></div>
<aside class="history"><div class="history-top"><h2>Recent calculations</h2><button id="clear-history">Clear</button></div><div id="history-list"></div><div class="history-note">A fresh perspective, every time.</div></aside></section></main><footer><span>LESS FRICTION. MORE FOCUS.</span><span>Designed for everyday curiosity <span class="spark">✧</span></span></footer>`;
let expression = '', result = 0, done = false;
let history = [];
try { history = JSON.parse(localStorage.getItem('orbit-history') || '[]'); if (!Array.isArray(history)) history = []; } catch {}
const display = () => { document.querySelector('#expression').textContent = expression || '0'; document.querySelector('#result').textContent = String(result); };
function renderHistory() {
 const list = document.querySelector('#history-list'); list.replaceChildren();
 if (!history.length) { list.innerHTML = '<div class="empty-history"><span>↺</span><p>Your next idea starts here.</p><small>Calculations will appear as you go.</small></div>'; return; }
 history.slice(0,5).forEach(item=>{const button=document.createElement('button'); button.className='history-item'; const label=document.createElement('span');label.textContent=item.expression+' =';const answer=document.createElement('strong');answer.textContent=item.result;button.append(label,answer);button.onclick=()=>{expression=String(item.result);result=item.result;done=true;display();};list.append(button);});
}
function saveHistory() { try { localStorage.setItem('orbit-history',JSON.stringify(history)); } catch {} renderHistory(); }
function run() { try { result=calculate(expression); history.unshift({expression,result});history=history.slice(0,20);saveHistory();done=true;document.querySelector('#message').textContent='Looking good.'; } catch(err){document.querySelector('#message').textContent=err.message;} display(); }
function key(value) {
 if(value==='='){run();return;}
 if(value==='AC'){expression='';result=0;done=false;document.querySelector('#message').textContent='A clean slate.';}
 else if(value==='⌫'){expression=expression.slice(0,-1);done=false;}
 else if(value==='±'){expression=expression.startsWith('−(')&&expression.endsWith(')')?expression.slice(2,-1):expression?`−(${expression})`: '−';done=false;}
 else {if(done){expression=['+','−','×','÷','%'].includes(value)?String(result):'';done=false;}expression+=value;try{result=calculate(expression);}catch{}}
 display();
}
document.querySelectorAll('[data-key]').forEach(b=>b.onclick=()=>key(b.dataset.key));
document.querySelectorAll('[data-value]').forEach(b=>b.onclick=()=>key(b.dataset.value));
document.querySelectorAll('[data-fn]').forEach(b=>b.onclick=()=>{try{let n=calculate(expression || String(result));const functions={sqrt:Math.sqrt,square:x=>x*x,sin:x=>Math.sin(x*Math.PI/180),cos:x=>Math.cos(x*Math.PI/180)};let value=functions[b.dataset.fn](n);if(!Number.isFinite(value))throw new Error('Outside the real number range');result=Number(value.toPrecision(12));history.unshift({expression:`${b.textContent}(${n})`,result});history=history.slice(0,20);saveHistory();expression=String(result);done=true;display();document.querySelector('#message').textContent='Angles use degrees.';}catch(e){document.querySelector('#message').textContent=e.message;}});
document.querySelector('#scientific').onclick=e=>{const b=e.currentTarget;const open=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',String(open));document.querySelector('#science').hidden=!open;};
document.querySelector('#clear-history').onclick=()=>{history=[];saveHistory();};
document.querySelector('#theme').onclick=()=>document.body.classList.toggle('light');
document.querySelector('#copy').onclick=async()=>{try{await navigator.clipboard.writeText(String(result));document.querySelector('#message').textContent='Result copied.';}catch{document.querySelector('#message').textContent='Select the result to copy it.';}};
document.addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey||(e.key==='Enter'&&e.target.closest?.('button')))return;const map={'Enter':'=','=':'=','Escape':'AC','Backspace':'⌫','*':'×','/':'÷','-':'−'};if(/^[0-9.+%()]$/.test(e.key)||map[e.key]){e.preventDefault();key(map[e.key]||e.key);}});
renderHistory();display();
