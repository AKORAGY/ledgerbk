const APP_CONFIG={lowStock:5,currency:"UGX"};
if ('serviceWorker' in navigator) {
  window.addEventListener('load', ()=>{ 
    navigator.serviceWorker.register('./sw.js'); 
  });
}
function save(k,d){localStorage.setItem(k,JSON.stringify(d))}
function get(k){try{return JSON.parse(localStorage.getItem(k)||"[]")}catch{return []}}

window.enterTransaction=function(type){
 let itemEl=document.getElementById('item'); let qtyEl=document.getElementById('qty'); let nameEl=document.getElementById('debtorName');
 if(!itemEl||!qtyEl) return alert("Form not found");
 let item=itemEl.value; let qty=parseInt(qtyEl.value);
 if(!item||!qty) return alert("Select Item & Qty");
 let stock=get('stock'); let p=stock.find(s=>s.name==item);
 if(!p) return alert("No stock! Add in Stock page");
 if(p.qty<qty) return alert("Only "+p.qty+" left");
 p.qty-=qty; save('stock',stock);
 let trans=get('transactions'); let amt=qty*p.sell;
 let cust=nameEl&&nameEl.value?nameEl.value.trim():"Cash";
 trans.push({name:type=='debit'?(cust||"Customer"):"Cash Sale",item,qty,unit:p.sell,amount:amt,date:new Date().toLocaleDateString(),type});
 save('transactions',trans);
 if(type=='debit'){let d=get('debts');d.push({name:cust||"Customer",item,qty,amount:amt,date:new Date().toLocaleDateString()});save('debts',d);}
 alert("Saved!"); location.reload();
}
window.updateStock=function(){
 let sel=document.getElementById('sItemSelect'); let inp=document.getElementById('sItemName');
 let name=inp.value.trim() || (sel?sel.value:"");
 let qty=parseInt(document.getElementById('sQty').value); let cost=parseFloat(document.getElementById('sCost').value);
 if(!name||!qty||!cost) return alert("Fill Item, Qty and Unit cost");
 let stock=get('stock'); let ex=stock.find(s=>s.name.toLowerCase()==name.toLowerCase());
 if(ex){ex.qty+=qty;ex.buy=cost;ex.sell=Math.round(cost*1.3);}else{stock.push({name,qty,buy:cost,sell:Math.round(cost*1.3)});}
 save('stock',stock); location.reload();
}
window.deleteStock=function(i){ let stock=get('stock'); stock.splice(i,1); save('stock',stock); location.reload(); }

function renderDebts(list){
 let el=document.getElementById('debtList'); if(!el) return;
 if(!list||list.length==0){ el.innerHTML='<tr><td colspan=5 style="text-align:center;padding:20px;">No debts</td></tr>'; return; }
 el.innerHTML=list.map(d=>{
   let isPaid=d.amount<=0; return `<tr class="${isPaid?'paid-row':''}"><td>${d.name} ${isPaid?'✅':''}</td><td>${d.item}</td><td>${d.qty}</td><td>${isPaid?'PAID':'UGX '+d.amount}</td><td>${d.date}</td></tr>`;
 }).join('');
}
window.filterDebts=function(){ let f=prompt("Filter by name (empty = all):")||""; let all=get('debts'); let filtered=f?all.filter(d=>d.name.toLowerCase().includes(f.toLowerCase())):all; renderDebts(filtered); }
window.updatePayPreview=function(){
 let nameEl=document.getElementById('payName'); let totalEl=document.getElementById('payTotal'); let balEl=document.getElementById('payBalance'); let amtEl=document.getElementById('payAmount');
 if(!nameEl||!totalEl) return; let name=nameEl.value; if(!name){totalEl.innerText='UGX 0'; if(balEl) balEl.innerText='0'; return;}
 let total=get('debts').filter(d=>d.name==name&&d.amount>0).reduce((s,d)=>s+d.amount,0); totalEl.innerText='UGX '+total;
 let paid=parseInt(amtEl?.value||0)||0; let left=total-paid;
 if(balEl){ if(paid==0){balEl.innerText='0';} else if(left==0){balEl.innerText='PAID ✅'; balEl.style.color='green';} else if(left<0){balEl.innerText='Change: UGX '+Math.abs(left); balEl.style.color='orange';} else {balEl.innerText='Balance: UGX '+left; balEl.style.color='#E10600';} }
}
window.makePayment=function(){
 let name=document.getElementById('payName')?.value; let pay=parseInt(document.getElementById('payAmount')?.value);
 if(!name||!pay) return alert("Select name & amount"); let debts=get('debts'); let remaining=pay;
 for(let d of debts){ if(d.name==name&&d.amount>0&&remaining>0){ if(remaining>=d.amount){remaining-=d.amount; d.amount=0;}else{d.amount-=remaining; remaining=0;} } }
 save('debts',debts); alert("Payment saved"); location.reload();
}

/* ===== ORGANISATIONS - WEEKLY/MONTHLY ===== */
function getOrgs(){ return get('bk_orgs'); } function saveOrgs(o){ save('bk_orgs',o); }
function getOrgTrans(){ return get('bk_org_trans'); } function saveOrgTrans(t){ save('bk_org_trans',t); }

window.addOrganisation=function(){
  let name=document.getElementById('orgName').value.trim(); let contact=document.getElementById('orgContact').value.trim();
  let term=document.getElementById('orgTerm').value; let opening=parseFloat(document.getElementById('orgOpening').value)||0;
  if(!name){alert('Enter org name');return;}
  let orgs=getOrgs(); let id=Date.now();
  orgs.push({id,name,contact,term,created:new Date().toLocaleDateString()}); saveOrgs(orgs);
  if(opening>0){ let trans=getOrgTrans(); trans.push({id:Date.now(),orgId:id,type:'purchase',item:'Opening Balance',amount:opening,date:new Date().toLocaleDateString()}); saveOrgTrans(trans); }
  alert(name+' saved!'); document.getElementById('orgName').value='';document.getElementById('orgContact').value='';document.getElementById('orgOpening').value=''; loadOrgs();
}
window.loadOrgs=function(){
  let filter=document.getElementById('orgFilter')?.value||'all'; let orgs=getOrgs(); let trans=getOrgTrans();
  let list=document.getElementById('orgsList'); if(!list) return;
  if(orgs.length===0){list.innerHTML='<p style="text-align:center;padding:20px;color:#666">No organisations yet.</p>';return;}
  let html=''; orgs.forEach(org=>{
    let orgTrans=trans.filter(t=>t.orgId===org.id); let totalPurch=orgTrans.filter(t=>t.type==='purchase').reduce((s,t)=>s+t.amount,0);
    let totalPaid=orgTrans.filter(t=>t.type==='payment').reduce((s,t)=>s+t.amount,0); let bal=totalPurch-totalPaid;
    let status=bal<=0?'paid':(isOrgOverdue(org)?'overdue':'due');
    if(filter==='weekly' && org.term!=='weekly') return; if(filter==='monthly' && org.term!=='monthly') return; if(filter==='due' && bal<=0) return;
    html+=`<div class="org-card ${org.term} ${status==='overdue'?'overdue':''}" onclick="openOrg(${org.id})">
      <div style="display:flex;justify-content:space-between"><b>${org.name}</b><span class="badge ${org.term}">${org.term.toUpperCase()}</span></div>
      <div style="font-size:12px;color:#666;margin:4px 0">${org.contact} • ${org.created}</div>
      <div style="display:flex;justify-content:space-between;margin-top:6px"><span style="font-weight:800;color:${bal<=0?'green':'#E10600'}">UGX ${bal.toLocaleString()}</span><span class="badge ${status}">${status.toUpperCase()}</span></div></div>`;
  }); list.innerHTML=html||'<p>No matching orgs</p>';
}
function isOrgOverdue(org){
  let trans=getOrgTrans().filter(t=>t.orgId===org.id && t.type==='purchase'); if(trans.length===0) return false;
  let bal=trans.reduce((s,t)=>s+t.amount,0)-getOrgTrans().filter(t=>t.orgId===org.id && t.type==='payment').reduce((s,t)=>s+t.amount,0);
  if(bal<=0) return false; try{ let lastDate=new Date(trans[trans.length-1].date); let diffDays=(new Date()-lastDate)/(1000*60*60*24); return org.term==='weekly'?diffDays>7:diffDays>30; }catch{return false;}
}
window.openOrg=function(id){ localStorage.setItem('bk_current_org', id); window.location='org-ledger.html'; }
window.loadOrgLedger=function(){
  let orgId=parseInt(localStorage.getItem('bk_current_org')); let orgs=getOrgs(); let org=orgs.find(o=>o.id===orgId);
  if(!org){let el=document.getElementById('orgTitle'); if(el) el.innerText='Org not found';return;}
  let trans=getOrgTrans().filter(t=>t.orgId===orgId); let totalPurch=trans.filter(t=>t.type==='purchase').reduce((s,t)=>s+t.amount,0);
  let totalPaid=trans.filter(t=>t.type==='payment').reduce((s,t)=>s+t.amount,0); let bal=totalPurch-totalPaid;
  document.getElementById('orgTitle').innerText=org.name; document.getElementById('orgMeta').innerText=`${org.contact} | ${org.term} | Joined ${org.created}`;
  document.getElementById('orgTotalPurch').innerText='UGX '+totalPurch.toLocaleString(); document.getElementById('orgTotalPaid').innerText='UGX '+totalPaid.toLocaleString();
  document.getElementById('orgBalance').innerText='UGX '+bal.toLocaleString();
  let statusEl=document.getElementById('orgStatus'); if(statusEl){ statusEl.innerText=bal<=0?'PAID':(isOrgOverdue(org)?'OVERDUE':'DUE'); statusEl.className='badge '+(bal<=0?'paid':(isOrgOverdue(org)?'overdue':'due')); }
  let pList=document.getElementById('orgPurchList'); if(pList){ let purch=trans.filter(t=>t.type==='purchase'); pList.innerHTML=purch.length?purch.map(t=>`<tr><td>${t.date}</td><td>${t.item}</td><td>UGX ${t.amount.toLocaleString()}</td></tr>`).join(''):'<tr><td colspan=3>No purchases</td></tr>'; }
  let payList=document.getElementById('orgPayList'); if(payList){ let pays=trans.filter(t=>t.type==='payment'); payList.innerHTML=pays.length?pays.map(t=>`<tr><td>${t.date}</td><td>UGX ${t.amount.toLocaleString()}</td><td>${t.method||'Cash'}</td></tr>`).join(''):'<tr><td colspan=3>No payments yet</td></tr>'; }
}
window.toggleOrgForm=function(type){ document.getElementById('orgPurchaseForm').style.display=type==='purchase'?'block':'none'; document.getElementById('orgPaymentForm').style.display=type==='payment'?'block':'none'; }
window.addOrgPurchase=function(){
  let orgId=parseInt(localStorage.getItem('bk_current_org')); let item=document.getElementById('orgItem').value.trim(); let amount=parseFloat(document.getElementById('orgAmount').value); let date=document.getElementById('orgDate').value||new Date().toLocaleDateString();
  if(!item||!amount){alert('Enter item and amount');return;} let trans=getOrgTrans(); trans.push({id:Date.now(),orgId,type:'purchase',item,amount,date}); saveOrgTrans(trans); alert('Purchase added'); loadOrgLedger();
}
window.addOrgPayment=function(){
  let orgId=parseInt(localStorage.getItem('bk_current_org')); let amount=parseFloat(document.getElementById('orgPayAmount').value); let method=document.getElementById('orgPayMethod').value; let date=document.getElementById('orgPayDate').value||new Date().toLocaleDateString();
  if(!amount){alert('Enter amount');return;} let trans=getOrgTrans(); trans.push({id:Date.now(),orgId,type:'payment',amount,method,date}); saveOrgTrans(trans); alert('Payment recorded'); loadOrgLedger();
}
window.printOrgStatement=function(){
  let orgId=parseInt(localStorage.getItem('bk_current_org')); let org=getOrgs().find(o=>o.id===orgId); let trans=getOrgTrans().filter(t=>t.orgId===orgId);
  let totalPurch=trans.filter(t=>t.type==='purchase').reduce((s,t)=>s+t.amount,0); let totalPaid=trans.filter(t=>t.type==='payment').reduce((s,t)=>s+t.amount,0);
  let w=window.open('','_blank'); w.document.write(`<h2>${org.name} - Statement</h2><p>${org.contact} | ${org.term}</p><p>Total Purch: ${totalPurch} | Paid: ${totalPaid} | Bal: ${totalPurch-totalPaid}</p><hr>`);
  trans.forEach(t=>{w.document.write(`<p>${t.date} - ${t.type} - ${t.item||t.method} - UGX ${t.amount}</p>`);}); w.document.write('<script>window.print()<\/script>'); w.document.close();
}

document.addEventListener('DOMContentLoaded', ()=>{
  let stock=get('stock');
  document.querySelectorAll('#item, #sItemSelect, #payName').forEach(el=>{
    if(!el) return;
    if(el.id==='payName'){
      let names=[...new Set(get('debts').map(d=>d.name))]; el.innerHTML='<option value="">-- Select --</option>'+names.map(n=>`<option>${n}</option>`).join('');
      el.addEventListener('change', ()=>{ if(window.updatePayPreview) updatePayPreview(); }); let amt=document.getElementById('payAmount'); if(amt) amt.addEventListener('input', ()=>{ if(window.updatePayPreview) updatePayPreview(); });
    } else { el.innerHTML = stock.length? stock.map(s=>`<option value="${s.name}">${s.name} (${s.qty} left)</option>`).join('') : '<option>No stock - add in Stock page</option>'; }
  });
  let stockList=document.getElementById('stockList'); if(stockList){ stockList.innerHTML = stock.length? stock.map((s,i)=>`<tr><td>${s.name}</td><td>${s.qty}</td><td><button onclick="deleteStock(${i})">Del</button></td></tr>`).join('') : '<tr><td colspan=3>No stock yet</td></tr>'; }
  let transList=document.getElementById('transList'); if(transList){ let trans=get('transactions'); transList.innerHTML = trans.length? trans.slice().reverse().map(t=>`<tr><td>${t.item}</td><td>${t.qty}</td><td>${t.unit}</td><td>${t.amount}</td><td>${t.date}</td></tr>`).join('') : '<tr><td colspan=5>No transactions</td></tr>'; }
  let debtList=document.getElementById('debtList'); if(debtList) renderDebts(get('debts'));
  let tCount=document.getElementById('tCount'); if(tCount) tCount.innerText=get('transactions').length;
  let tAmount=document.getElementById('tAmount'); if(tAmount){ let sum=get('transactions').reduce((s,t)=>s+t.amount,0); tAmount.innerText='UGX '+sum; }
  let notices=document.getElementById('notices'); if(notices){ let low=stock.filter(s=>s.qty<=APP_CONFIG.lowStock); notices.innerHTML=low.length? low.map(s=>`Low: ${s.name} (${s.qty})`).join('<br>') : 'All good'; }
  let orgsList=document.getElementById('orgsList'); if(orgsList) loadOrgs();
  let orgTitle=document.getElementById('orgTitle'); if(orgTitle) loadOrgLedger();
});
