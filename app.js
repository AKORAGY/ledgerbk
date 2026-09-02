const APP_CONFIG={lowStock:5,currency:"UGX"};
if ('serviceWorker' in navigator) {
  window.addEventListener('load', ()=>{ navigator.serviceWorker.register('./sw.js'); });
}

function save(k,d){localStorage.setItem(k,JSON.stringify(d))}
function get(k){try{return JSON.parse(localStorage.getItem(k)||"[]")}catch{return []}}

window.enterTransaction=function(type){
 let itemEl=document.getElementById('item');
 let qtyEl=document.getElementById('qty');
 let nameEl=document.getElementById('debtorName');
 if(!itemEl||!qtyEl) return alert("Form not found");
 let item=itemEl.value;
 let qty=parseInt(qtyEl.value);
 if(!item||!qty) ret7urn alert("Select Item & Qty");
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

window.filterDebts=function(){
 let f=prompt("Filter by name (empty = all):")||"";
 let all=get('debts');
 let filtered=f?all.filter(d=>d.name.toLowerCase().includes(f.toLowerCase())):all;
 renderDebts(filtered);
}

function renderDebts(list){
 let el=document.getElementById('debtList');
 if(!el) return;
 if(!list||list.length==0){
   el.innerHTML='<tr><td colspan="5" style="color:#999;text-align:center;padding:20px;">No items yet</td></tr>';
 }else{
   el.innerHTML=list.map(d=>{
     let isPaid=d.amount<=0;
     let cls=isPaid?'paid-row':'debt-row';
     return `<tr class="${cls}"><td>${d.name} ${isPaid?'✅':''}</td><td>${d.item}</td><td>${d.qty}</td><td>${isPaid?'PAID':('UGX '+d.amount)}</td><td>${d.date}</td></tr>`;
   }).join('');
 }
}

window.updatePayPreview=function(){
 let nameEl=document.getElementById('payName');
 let totalEl=document.getElementById('payTotal');
 let balEl=document.getElementById('payBalance');
 let amtEl=document.getElementById('payAmount');
 if(!nameEl||!totalEl) return;
 let name=nameEl.value;
 if(!name){totalEl.innerText='UGX 0'; if(balEl) balEl.innerText='0'; return;}
 let debts=get('debts').filter(d=>d.name==name&&d.amount>0);
 let total=debts.reduce((s,d)=>s+d.amount,0);
 totalEl.innerText='UGX '+total;
 let paid=parseInt(amtEl?.value||0)||0;
 let left=total-paid;
 if(balEl){
   if(paid==0){balEl.innerText='0'; balEl.style.color='#333';}
   else if(left==0){balEl.innerText='0 - PAID ✅ Row will turn GREEN'; balEl.style.color='green';}
   else if(left<0){balEl.innerText='Change to give: UGX '+Math.abs(left); balEl.style.color='orange';}
   else {balEl.innerText='Balance left: UGX '+left; balEl.style.color='#E10600';}
 }
}

window.makePayment=function(){
 let nameEl=document.getElementById('payName');
 let amtEl=document.getElementById('payAmount');
 let name=nameEl?.value;
 let pay=parseInt(amtEl?.value);
 if(!name||!pay) return alert("Select name & amount");
 let debts=get('debts');
 let total=debts.filter(d=>d.name==name&&d.amount>0).reduce((s,d)=>s+d.amount,0);
 if(total==0) return alert("No debt for "+name);
 let remaining=pay;
 for(let d of debts){
   if(d.name==name&&d.amount>0&&remaining>0){
     if(remaining>=d.amount){remaining-=d.amount; d.amount=0;}
     else {d.amount-=remaining; remaining=0;}
   }
 }
 save('debts',debts);
 let newTotal=debts.filter(d=>d.name==name).reduce((s,d)=>s+d.amount,0);
 if(newTotal==0){
   alert(name+" fully PAID! Row will turn GREEN");
   renderDebts(debts);
   setTimeout(()=>{save('debts',debts.filter(d=>d.amount>0)); location.reload();},1500);
 }else{
   alert("Payment ok. Balance left: UGX "+newTotal);
   location.reload();
 }
}

// ONE LOADER ONLY - FIXED
document.addEventListener('DOMContentLoaded',()=>{
 let stock=get('stock'), trans=get('transactions'), debts=get('debts');

 // Dashboard - NOT FIXED TO 10
 let c=document.getElementById('tCount'); if(c) c.innerText=trans.length;
 let a=document.getElementById('tAmount'); if(a) a.innerText="UGX "+trans.reduce((s,x)=>s+(x.amount||0),0);
 let n=document.getElementById('notices'); if(n){let low=stock.filter(s=>s.qty<=APP_CONFIG.lowStock); n.innerHTML=low.length?low.map(s=>`${s.name} low: ${s.qty} left`).join('<br>'):"All stock OK";}

 // Dropdowns
 let itemSel=document.getElementById('item');
 if(itemSel) itemSel.innerHTML=stock.length?stock.map(s=>`<option value="${s.name}">${s.name} (${s.qty} left)</option>`).join(''):'<option value="">No items yet - Add stock first</option>';
 let sSel=document.getElementById('sItemSelect');
 if(sSel) sSel.innerHTML='<option value="">-- Choose existing --</option>'+stock.map(s=>`<option value="${s.name}">${s.name}</option>`).join('');

 // Stock List - No more infinite Loading
 let sList=document.getElementById('stockList');
 if(sList) sList.innerHTML=stock.length?stock.map(s=>`<tr><td>${s.name}</td><td>${s.qty} ${s.qty<=APP_CONFIG.lowStock?'<span style="color:red">(LOW)</span>':''}</td></tr>`).join(''):'<tr><td colspan="2" style="color:#999;text-align:center;padding:20px;">No items yet</td></tr>';

 // Transactions
 let tList=document.getElementById('transList');
 if(tList) tList.innerHTML=trans.length?trans.map(t=>`<tr><td>${t.item}</td><td>${t.qty}</td><td>${t.unit}</td><td>UGX ${t.amount}</td><td>${t.date}</td></tr>`).join(''):'<tr><td colspan="5" style="text-align:center;color:#999;padding:20px;">No items yet</td></tr>';

 // Debts + Payment form
 let payName=document.getElementById('payName');
 if(payName){
   let unique=[...new Set(debts.filter(d=>d.amount>0).map(d=>d.name))];
   payName.innerHTML=unique.length?unique.map(n=>`<option value="${n}">${n}</option>`).join(''):'<option value="">No debtors yet</option>';
   payName.addEventListener('change', updatePayPreview);
   let payAmt=document.getElementById('payAmount');
   if(payAmt) payAmt.addEventListener('input', updatePayPreview);
   updatePayPreview();
 }
 let dList=document.getElementById('debtList');
 if(dList) renderDebts(debts);
});
