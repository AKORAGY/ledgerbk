const APP_CONFIG={lowStock:5,currency:"UGX"};

if ('serviceWorker' in navigator) {
  window.addEventListener('load', ()=>{ 
    navigator.serviceWorker.register('./sw.js'); 
  });
}

function save(k,d){localStorage.setItem(k,JSON.stringify(d))}
function get(k){try{return JSON.parse(localStorage.getItem(k)||"[]")}catch{return []}}

// --- TRANSACTIONS ---
window.enterTransaction=function(type){
 let itemEl=document.getElementById('item');
 let qtyEl=document.getElementById('qty');
 let nameEl=document.getElementById('debtorName');
 if(!itemEl||!qtyEl) return alert("Form not found");
 let item=itemEl.value;
 let qty=parseInt(qtyEl.value);
 if(!item||!qty) return alert("Select Item & Qty"); // FIXED TYPO HERE
 let stock=get('stock');
 let p=stock.find(s=>s.name==item);
 if(!p) return alert("No stock! Add in Stock page");
 if(p.qty<qty) return alert("Only "+p.qty+" left");
 p.qty-=qty; save('stock',stock);
 let trans=get('transactions');
 let amt=qty*p.sell;
 let cust=nameEl&&nameEl.value?nameEl.value.trim():"Cash";
 trans.push({name:type=='debit'?(cust||"Customer"):"Cash Sale",item,qty,unit:p.sell,amount:amt,date:new Date().toLocaleDateString(),type});
 save('transactions',trans);
 if(type=='debit'){let d=get('debts');d.push({name:cust||"Customer",item,qty,amount:amt,date:new Date().toLocaleDateString()});save('debts',d);}
 alert("Saved!"); location.reload();
}

// --- STOCK ---
window.updateStock=function(){
 let sel=document.getElementById('sItemSelect');
 let inp=document.getElementById('sItemName');
 let name=inp.value.trim() || (sel?sel.value:"");
 let qty=parseInt(document.getElementById('sQty').value);
 let cost=parseFloat(document.getElementById('sCost').value);
 if(!name||!qty||!cost) return alert("Fill Item, Qty and Unit cost");
 let stock=get('stock');
 let ex=stock.find(s=>s.name.toLowerCase()==name.toLowerCase());
 if(ex){ex.qty+=qty;ex.buy=cost;ex.sell=Math.round(cost*1.3);}else{stock.push({name,qty,buy:cost,sell:Math.round(cost*1.3)});}
 save('stock',stock); location.reload();
}
window.deleteStock=function(i){
 let stock=get('stock'); stock.splice(i,1); save('stock',stock); location.reload();
}

// --- DEBTS ---
function renderDebts(list){
 let el=document.getElementById('debtList'); if(!el) return;
 if(!list||list.length==0){ el.innerHTML='<tr><td colspan=5 style="text-align:center;padding:20px;">No debts</td></tr>'; return; }
 el.innerHTML=list.map(d=>{
   let isPaid=d.amount<=0;
   return `<tr class="${isPaid?'paid-row':''}"><td>${d.name} ${isPaid?'✅':''}</td><td>${d.item}</td><td>${d.qty}</td><td>${isPaid?'PAID':'UGX '+d.amount}</td><td>${d.date}</td></tr>`;
 }).join('');
}
window.filterDebts=function(){
 let f=prompt("Filter by name (empty = all):")||"";
 let all=get('debts'); let filtered=f?all.filter(d=>d.name.toLowerCase().includes(f.toLowerCase())):all;
 renderDebts(filtered);
}
window.updatePayPreview=function(){
 let nameEl=document.getElementById('payName'); let totalEl=document.getElementById('payTotal');
 let balEl=document.getElementById('payBalance'); let amtEl=document.getElementById('payAmount');
 if(!nameEl||!totalEl) return; let name=nameEl.value;
 if(!name){totalEl.innerText='UGX 0'; if(balEl) balEl.innerText='0'; return;}
 let total=get('debts').filter(d=>d.name==name&&d.amount>0).reduce((s,d)=>s+d.amount,0);
 totalEl.innerText='UGX '+total;
 let paid=parseInt(amtEl?.value||0)||0; let left=total-paid;
 if(balEl){
   if(paid==0){balEl.innerText='0';}
   else if(left==0){balEl.innerText='PAID ✅'; balEl.style.color='green';}
   else if(left<0){balEl.innerText='Change: UGX '+Math.abs(left); balEl.style.color='orange';}
   else {balEl.innerText='Balance: UGX '+left; balEl.style.color='#E10600';}
 }
}
window.makePayment=function(){
 let name=document.getElementById('payName')?.value; let pay=parseInt(document.getElementById('payAmount')?.value);
 if(!name||!pay) return alert("Select name & amount");
 let debts=get('debts'); let remaining=pay;
 for(let d of debts){ if(d.name==name&&d.amount>0&&remaining>0){ if(remaining>=d.amount){remaining-=d.amount; d.amount=0;}else{d.amount-=remaining; remaining=0;} } }
 save('debts',debts); alert("Payment saved"); location.reload();
}

// --- AUTO RENDER ON EVERY PAGE ---
document.addEventListener('DOMContentLoaded', ()=>{
  let stock=get('stock');
  // Fill all item selects
  document.querySelectorAll('#item, #sItemSelect, #payName').forEach(el=>{
    if(!el) return;
    if(el.id==='payName'){
      let names=[...new Set(get('debts').map(d=>d.name))];
      el.innerHTML='<option value="">-- Select --</option>'+names.map(n=>`<option>${n}</option>`).join('');
      el.addEventListener('change', updatePayPreview);
      let amt=document.getElementById('payAmount'); if(amt) amt.addEventListener('input', updatePayPreview);
    } else {
      el.innerHTML = stock.length? stock.map(s=>`<option value="${s.name}">${s.name} (${s.qty} left)</option>`).join('') : '<option>No stock - add in Stock page</option>';
    }
  });
  // Render tables
  let stockList=document.getElementById('stockList');
  if(stockList){ stockList.innerHTML = stock.length? stock.map((s,i)=>`<tr><td>${s.name}</td><td>${s.qty}</td><td><button onclick="deleteStock(${i})">Del</button></td></tr>`).join('') : '<tr><td colspan=3>No stock yet</td></tr>'; }
  
  let transList=document.getElementById('transList');
  if(transList){ let trans=get('transactions'); transList.innerHTML = trans.length? trans.map(t=>`<tr><td>${t.item}</td><td>${t.qty}</td><td>${t.unit}</td><td>${t.amount}</td><td>${t.date}</td></tr>`).join('').split('').reverse().join('') : '<tr><td colspan=5>No transactions</td></tr>'; 
    // fix reverse properly
    transList.innerHTML = trans.length? trans.slice().reverse().map(t=>`<tr><td>${t.item}</td><td>${t.qty}</td><td>${t.unit}</td><td>${t.amount}</td><td>${t.date}</td></tr>`).join('') : '<tr><td colspan=5>No transactions</td></tr>';
  }

  let debtList=document.getElementById('debtList');
  if(debtList) renderDebts(get('debts'));

  // Dashboard counts
  let tCount=document.getElementById('tCount'); if(tCount) tCount.innerText=get('transactions').length;
  let tAmount=document.getElementById('tAmount'); if(tAmount){ let sum=get('transactions').reduce((s,t)=>s+t.amount,0); tAmount.innerText='UGX '+sum; }
  let notices=document.getElementById('notices'); if(notices){ let low=stock.filter(s=>s.qty<=APP_CONFIG.lowStock); notices.innerHTML=low.length? low.map(s=>`Low: ${s.name} (${s.qty})`).join('<br>') : 'All good'; }
});
