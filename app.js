/* =========================================================
   SHOP MANAGER APP
========================================================= */

const APP_CONFIG = {
    lowStock: 5,
    currency: "UGX"
};


/* =========================================================
   LOCAL STORAGE
========================================================= */

function save(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function get(key) {
    try {
        return JSON.parse(localStorage.getItem(key) || "[]");
    } catch {
        return [];
    }
}


/* =========================================================
   DATE HELPERS
========================================================= */

function todayISO() {
    return new Date().toISOString().split("T")[0];
}

function formatDate(date) {
    return new Date(date).toLocaleDateString();
}

function dateOnly(value) {

    if (!value) return "";

    if (value.includes("-")) {
        return value;
    }

    const d = new Date(value);

    if (isNaN(d)) return "";

    return d.toISOString().split("T")[0];
}


/* =========================================================
   TRANSACTIONS
========================================================= */

function addTransaction(transaction) {

    let transactions = get("transactions");

    transactions.push({
        id: Date.now() + Math.random(),
        name: transaction.name || "Unknown",
        item: transaction.item || "",
        qty: Number(transaction.qty || 0),
        unit: Number(transaction.unit || 0),
        amount: Number(transaction.amount || 0),
        type: transaction.type || "cash",
        date: transaction.date || todayISO(),
        orgId: transaction.orgId || null
    });

    save("transactions", transactions);
}


/* =========================================================
   NORMAL CASH / DEBT SALE
========================================================= */

window.enterTransaction = function(type) {

    const itemEl = document.getElementById("item");
    const qtyEl = document.getElementById("qty");
    const nameEl = document.getElementById("debtorName");

    if (!itemEl || !qtyEl) {
        alert("Transaction form not found");
        return;
    }

    const item = itemEl.value;
    const qty = parseInt(qtyEl.value);

    if (!item || !qty || qty <= 0) {
        alert("Select Item & enter Qty");
        return;
    }

    const stock = get("stock");

    const product = stock.find(s => s.name === item);

    if (!product) {
        alert("No stock! Add item in Stock page");
        return;
    }

    if (product.qty < qty) {
        alert("Only " + product.qty + " left");
        return;
    }

    const customer =
        nameEl && nameEl.value.trim()
            ? nameEl.value.trim()
            : "Cash Customer";

    const amount = qty * Number(product.sell);

    /* reduce stock */

    product.qty -= qty;

    save("stock", stock);

    /* save transaction */

    addTransaction({

        name: type === "debit"
            ? customer
            : "Cash Customer",

        item: item,

        qty: qty,

        unit: product.sell,

        amount: amount,

        type: type === "debit"
            ? "debt"
            : "cash",

        date: todayISO()

    });


    /* save debt */

    if (type === "debit") {

        const debts = get("debts");

        debts.push({

            id: Date.now(),

            name: customer,

            item: item,

            qty: qty,

            amount: amount,

            date: todayISO()

        });

        save("debts", debts);

    }


    alert(
        type === "debit"
            ? "Debt transaction saved!"
            : "Cash transaction saved!"
    );

    location.reload();
};


/* =========================================================
   TRANSACTION FILTER
========================================================= */

window.filterTransactions = function() {

    const nameInput =
        document.getElementById("transactionNameFilter");

    const dateFilter =
        document.getElementById("transactionDateFilter");

    const customDate =
        document.getElementById("transactionCustomDate");

    let transactions = get("transactions");

    const name =
        nameInput
            ? nameInput.value.trim().toLowerCase()
            : "";

    const dateType =
        dateFilter
            ? dateFilter.value
            : "all";

    const today = todayISO();

    const yesterdayDate = new Date();

    yesterdayDate.setDate(
        yesterdayDate.getDate() - 1
    );

    const yesterday =
        yesterdayDate.toISOString().split("T")[0];

    transactions = transactions.filter(t => {

        /* NAME FILTER */

        if (
            name &&
            !(t.name || "").toLowerCase().includes(name)
        ) {
            return false;
        }


        /* DATE FILTER */

        if (dateType === "today") {

            if (dateOnly(t.date) !== today) {
                return false;
            }

        }


        if (dateType === "yesterday") {

            if (dateOnly(t.date) !== yesterday) {
                return false;
            }

        }


        if (dateType === "custom") {

            if (!customDate || !customDate.value) {
                return true;
            }

            if (
                dateOnly(t.date) !==
                customDate.value
            ) {
                return false;
            }

        }

        return true;

    });

    renderTransactions(transactions);
};


/* =========================================================
   RENDER TRANSACTIONS
========================================================= */

function renderTransactions(transactions) {

    const list =
        document.getElementById("transList");

    if (!list) return;

    if (!transactions.length) {

        list.innerHTML =
            `<tr>
                <td colspan="7" style="text-align:center;padding:20px">
                    No transactions found
                </td>
             </tr>`;

        return;
    }


    list.innerHTML =
        transactions
            .slice()
            .reverse()
            .map(t => {

                let rowClass = "cash-row";

                let typeText = "CASH";

                let badgeClass = "type-cash";


                if (
                    t.type === "debt" ||
                    t.type === "org_debt"
                ) {

                    rowClass = "debt-row";

                    typeText = "DEBT";

                    badgeClass = "type-debt";

                }


                if (
                    t.type === "debt_payment" ||
                    t.type === "org_payment"
                ) {

                    rowClass = "payment-row";

                    typeText = "DEBT PAYMENT";

                    badgeClass = "type-payment";

                }


                return `
                <tr class="${rowClass}">

                    <td>${t.name || "-"}</td>

                    <td>${t.item || "-"}</td>

                    <td>${t.qty || "-"}</td>

                    <td>
                        UGX ${Number(t.unit || 0).toLocaleString()}
                    </td>

                    <td>
                        UGX ${Number(t.amount || 0).toLocaleString()}
                    </td>

                    <td>
                        <span class="type-badge ${badgeClass}">
                            ${typeText}
                        </span>
                    </td>

                    <td>
                        ${formatDate(t.date)}
                    </td>

                </tr>
                `;

            })
            .join("");
}


/* =========================================================
   STOCK
========================================================= */

window.updateStock = function() {

    const sel =
        document.getElementById("sItemSelect");

    const inp =
        document.getElementById("sItemName");

    const qty =
        parseInt(
            document.getElementById("sQty").value
        );

    const cost =
        parseFloat(
            document.getElementById("sCost").value
        );


    const name =
        inp.value.trim() ||
        (sel ? sel.value : "");


    if (!name || !qty || !cost) {

        alert(
            "Fill Item, Qty and Unit cost"
        );

        return;
    }


    let stock = get("stock");

    const existing =
        stock.find(
            s =>
                s.name.toLowerCase() ===
                name.toLowerCase()
        );


    if (existing) {

        existing.qty += qty;

        existing.buy = cost;

        existing.sell =
            Math.round(cost * 1.3);

    } else {

        stock.push({

            name: name,

            qty: qty,

            buy: cost,

            sell: Math.round(cost * 1.3)

        });

    }


    save("stock", stock);

    location.reload();

};


window.deleteStock = function(index) {

    let stock = get("stock");

    stock.splice(index, 1);

    save("stock", stock);

    location.reload();

};


/* =========================================================
   DEBTS
========================================================= */

function renderDebts(list) {

    const el =
        document.getElementById("debtList");

    if (!el) return;


    if (!list.length) {

        el.innerHTML =
            `<tr>
                <td colspan="5"
                    style="text-align:center;padding:20px">
                    No debts
                </td>
             </tr>`;

        return;
    }


    el.innerHTML =
        list.map(d => {

            const paid =
                Number(d.amount) <= 0;

            return `
            <tr class="${paid ? "paid-row" : "debt-row"}">

                <td>
                    ${d.name}
                    ${paid ? " ✅" : ""}
                </td>

                <td>${d.item}</td>

                <td>${d.qty}</td>

                <td>
                    ${
                        paid
                            ? "PAID"
                            : "UGX " +
                              Number(d.amount)
                                .toLocaleString()
                    }
                </td>

                <td>${formatDate(d.date)}</td>

            </tr>
            `;

        }).join("");

}


window.filterDebts = function() {

    const filter =
        prompt(
            "Filter by name (empty = all):"
        ) || "";

    const all =
        get("debts");

    const filtered =
        filter
            ? all.filter(
                d =>
                    d.name
                        .toLowerCase()
                        .includes(
                            filter.toLowerCase()
                        )
              )
            : all;

    renderDebts(filtered);

};


/* =========================================================
   PAYMENT PREVIEW
========================================================= */

window.updatePayPreview = function() {

    const nameEl =
        document.getElementById("payName");

    const totalEl =
        document.getElementById("payTotal");

    const balanceEl =
        document.getElementById("payBalance");

    const amountEl =
        document.getElementById("payAmount");


    if (!nameEl || !totalEl) return;


    const name = nameEl.value;


    if (!name) {

        totalEl.innerText = "UGX 0";

        if (balanceEl)
            balanceEl.innerText = "0";

        return;

    }


    const total =
        get("debts")
            .filter(
                d =>
                    d.name === name &&
                    Number(d.amount) > 0
            )
            .reduce(
                (sum, d) =>
                    sum + Number(d.amount),
                0
            );


    totalEl.innerText =
        "UGX " +
        total.toLocaleString();


    const paid =
        parseInt(
            amountEl?.value || 0
        ) || 0;


    const left =
        total - paid;


    if (!balanceEl) return;


    if (paid === 0) {

        balanceEl.innerText = "0";

    } else if (left === 0) {

        balanceEl.innerText =
            "PAID ✅";

        balanceEl.style.color =
            "green";

    } else if (left < 0) {

        balanceEl.innerText =
            "Change: UGX " +
            Math.abs(left)
                .toLocaleString();

        balanceEl.style.color =
            "orange";

    } else {

        balanceEl.innerText =
            "Balance: UGX " +
            left.toLocaleString();

        balanceEl.style.color =
            "#E10600";

    }

};


/* =========================================================
   MAKE CUSTOMER DEBT PAYMENT
========================================================= */

window.makePayment = function() {

    const name =
        document.getElementById("payName")?.value;

    const pay =
        parseFloat(
            document.getElementById("payAmount")?.value
        );


    if (!name || !pay || pay <= 0) {

        alert(
            "Select name & enter amount"
        );

        return;

    }


    const debts =
        get("debts");


    let remaining = pay;


    for (const d of debts) {

        if (
            d.name === name &&
            Number(d.amount) > 0 &&
            remaining > 0
        ) {

            const oldAmount =
                Number(d.amount);


            if (remaining >= oldAmount) {

                remaining -= oldAmount;

                d.amount = 0;

            } else {

                d.amount -= remaining;

                remaining = 0;

            }

        }

    }


    save("debts", debts);


    /* ADD PAYMENT TO MAIN TRANSACTIONS */

    addTransaction({

        name: name,

        item: "Debt Payment",

        qty: 0,

        unit: 0,

        amount: pay,

        type: "debt_payment",

        date: todayISO()

    });


    alert("Payment saved!");

    location.reload();

};


/* =========================================================
   ORGANISATIONS
========================================================= */

function getOrgs() {
    return get("bk_orgs");
}

function saveOrgs(orgs) {
    save("bk_orgs", orgs);
}

function getOrgTrans() {
    return get("bk_org_trans");
}

function saveOrgTrans(trans) {
    save("bk_org_trans", trans);
}


/* =========================================================
   ADD ORGANISATION
========================================================= */

window.addOrganisation = function() {

    const name =
        document.getElementById("orgName")
            .value.trim();

    const contact =
        document.getElementById("orgContact")
            .value.trim();

    const term =
        document.getElementById("orgTerm")
            .value;


    if (!name) {

        alert("Enter organisation name");

        return;

    }


    const orgs =
        getOrgs();


    const id =
        Date.now();


    orgs.push({

        id: id,

        name: name,

        contact: contact,

        term: term,

        created: todayISO()

    });


    saveOrgs(orgs);


    /*
       Opening balance removed.
       After saving, open organisation ledger.
    */


    localStorage.setItem(
        "bk_current_org",
        id
    );


    window.location =
        "org-ledger.html";

};


/* =========================================================
   LOAD ORGANISATIONS
========================================================= */

window.loadOrgs = function() {

    const filter =
        document.getElementById("orgFilter")
            ?.value || "all";


    const orgs =
        getOrgs();

    const trans =
        getOrgTrans();


    const list =
        document.getElementById("orgsList");


    if (!list) return;


    if (!orgs.length) {

        list.innerHTML =
            `<p style="text-align:center;padding:20px;color:#666">
                No organisations yet.
             </p>`;

        return;

    }


    let html = "";


    orgs.forEach(org => {

        const orgTrans =
            trans.filter(
                t => t.orgId === org.id
            );


        const purchases =
            orgTrans
                .filter(
                    t => t.type === "purchase"
                )
                .reduce(
                    (s, t) =>
                        s + Number(t.amount),
                    0
                );


        const payments =
            orgTrans
                .filter(
                    t => t.type === "payment"
                )
                .reduce(
                    (s, t) =>
                        s + Number(t.amount),
                    0
                );


        const balance =
            purchases - payments;


        const status =
            balance <= 0
                ? "paid"
                : isOrgOverdue(org)
                    ? "overdue"
                    : "due";


        if (
            filter === "weekly" &&
            org.term !== "weekly"
        ) return;


        if (
            filter === "monthly" &&
            org.term !== "monthly"
        ) return;


        if (
            filter === "due" &&
            balance <= 0
        ) return;


        html += `

        <div
            class="org-card ${org.term} ${
                status === "overdue"
                    ? "overdue"
                    : ""
            }"
            onclick="openOrg(${org.id})"
        >

            <div style="
                display:flex;
                justify-content:space-between
            ">

                <b>${org.name}</b>

                <span class="badge ${org.term}">
                    ${org.term.toUpperCase()}
                </span>

            </div>


            <div style="
                font-size:12px;
                color:#666;
                margin:4px 0
            ">

                ${org.contact || "-"}
                •
                ${formatDate(org.created)}

            </div>


            <div style="
                display:flex;
                justify-content:space-between;
                margin-top:6px
            ">

                <span style="
                    font-weight:800;
                    color:${
                        balance <= 0
                            ? "green"
                            : "#E10600"
                    }
                ">

                    UGX ${balance.toLocaleString()}

                </span>


                <span class="badge ${status}">
                    ${status.toUpperCase()}
                </span>

            </div>

        </div>

        `;

    });


    list.innerHTML =
        html ||
        "<p>No matching organisations</p>";

};


/* =========================================================
   ORGANISATION OVERDUE
========================================================= */

function isOrgOverdue(org) {

    const trans =
        getOrgTrans()
            .filter(
                t =>
                    t.orgId === org.id &&
                    t.type === "purchase"
            );


    if (!trans.length)
        return false;


    const purchases =
        trans.reduce(
            (s, t) =>
                s + Number(t.amount),
            0
        );


    const payments =
        getOrgTrans()
            .filter(
                t =>
                    t.orgId === org.id &&
                    t.type === "payment"
            )
            .reduce(
                (s, t) =>
                    s + Number(t.amount),
                0
            );


    if (purchases - payments <= 0)
        return false;


    const last =
        new Date(
            trans[trans.length - 1].date
        );


    const days =
        (new Date() - last) /
        (1000 * 60 * 60 * 24);


    return org.term === "weekly"
        ? days > 7
        : days > 30;

}


/* =========================================================
   OPEN ORGANISATION
========================================================= */

window.openOrg = function(id) {

    localStorage.setItem(
        "bk_current_org",
        id
    );

    window.location =
        "org-ledger.html";

};


/* =========================================================
   DELETE ORGANISATION
========================================================= */

window.deleteOrganisation = function() {

    const orgId =
        parseInt(
            localStorage.getItem(
                "bk_current_org"
            )
        );


    const org =
        getOrgs().find(
            o => o.id === orgId
        );


    if (!org) return;


    const confirmDelete =
        confirm(
            `Delete ${org.name} and all its records?`
        );


    if (!confirmDelete)
        return;


    let orgs =
        getOrgs()
            .filter(
                o => o.id !== orgId
            );


    saveOrgs(orgs);


    let orgTrans =
        getOrgTrans()
            .filter(
                t => t.orgId !== orgId
            );


    saveOrgTrans(orgTrans);


    localStorage.removeItem(
        "bk_current_org"
    );


    alert("Organisation deleted.");

    window.location =
        "orgs.html";

};


/* =========================================================
   ORGANISATION LEDGER
========================================================= */

window.loadOrgLedger = function() {

    const orgId =
        parseInt(
            localStorage.getItem(
                "bk_current_org"
            )
        );


    const org =
        getOrgs()
            .find(
                o => o.id === orgId
            );


    if (!org) {

        const title =
            document.getElementById(
                "orgTitle"
            );

        if (title)
            title.innerText =
                "Org not found";

        return;

    }


    const trans =
        getOrgTrans()
            .filter(
                t => t.orgId === orgId
            );


    const purchases =
        trans
            .filter(
                t => t.type === "purchase"
            )
            .reduce(
                (s, t) =>
                    s + Number(t.amount),
                0
            );


    const payments =
        trans
            .filter(
                t => t.type === "payment"
            )
            .reduce(
                (s, t) =>
                    s + Number(t.amount),
                0
            );


    const balance =
        purchases - payments;


    document.getElementById(
        "orgTitle"
    ).innerText =
        org.name;


    document.getElementById(
        "orgMeta"
    ).innerText =
        `${org.contact || "-"} | ${org.term} | Joined ${formatDate(org.created)}`;


    document.getElementById(
        "orgTotalPurch"
    ).innerText =
        "UGX " +
        purchases.toLocaleString();


    document.getElementById(
        "orgTotalPaid"
    ).innerText =
        "UGX " +
        payments.toLocaleString();


    document.getElementById(
        "orgBalance"
    ).innerText =
        "UGX " +
        balance.toLocaleString();


    const statusEl =
        document.getElementById(
            "orgStatus"
        );


    if (statusEl) {

        const status =
            balance <= 0
                ? "paid"
                : isOrgOverdue(org)
                    ? "overdue"
                    : "due";


        statusEl.innerText =
            status.toUpperCase();


        statusEl.className =
            "badge " + status;

    }


    /* PURCHASE HISTORY */

    const pList =
        document.getElementById(
            "orgPurchList"
        );


    if (pList) {

        const purchasesList =
            trans.filter(
                t =>
                    t.type === "purchase"
            );


        pList.innerHTML =
            purchasesList.length

                ? purchasesList.map(
                    t => `

                    <tr>

                        <td>
                            ${formatDate(t.date)}
                        </td>

                        <td>
                            ${t.item}
                        </td>

                        <td>
                            ${t.qty || "-"}
                        </td>

                        <td>
                            UGX ${Number(t.amount)
                                .toLocaleString()}
                        </td>

                    </tr>

                    `
                  ).join("")

                : `
                    <tr>
                        <td colspan="4">
                            No purchases
                        </td>
                    </tr>
                  `;

    }


    /* PAYMENT HISTORY */

    const payList =
        document.getElementById(
            "orgPayList"
        );


    if (payList) {

        const pays =
            trans.filter(
                t =>
                    t.type === "payment"
            );


        payList.innerHTML =
            pays.length

                ? pays.map(
                    t => `

                    <tr>

                        <td>
                            ${formatDate(t.date)}
                        </td>

                        <td>
                            UGX ${Number(t.amount)
                                .toLocaleString()}
                        </td>

                        <td>
                            ${t.method || "Cash"}
                        </td>

                    </tr>

                    `
                  ).join("")

                : `
                    <tr>
                        <td colspan="3">
                            No payments yet
                        </td>
                    </tr>
                  `;

    }

};


/* =========================================================
   TOGGLE ORG FORMS
========================================================= */

window.toggleOrgForm = function(type) {

    document.getElementById(
        "orgPurchaseForm"
    ).style.display =
        type === "purchase"
            ? "block"
            : "none";


    document.getElementById(
        "orgPaymentForm"
    ).style.display =
        type === "payment"
            ? "block"
            : "none";

};


/* =========================================================
   ORGANISATION PURCHASE
========================================================= */

window.addOrgPurchase = function() {

    const orgId =
        parseInt(
            localStorage.getItem(
                "bk_current_org"
            )
        );


    const itemEl =
        document.getElementById(
            "orgItem"
        );


    const qty =
        parseInt(
            document.getElementById(
                "orgQty"
            ).value
        );


    const date =
        document.getElementById(
            "orgDate"
        ).value ||
        todayISO();


    if (!itemEl || !qty || qty <= 0) {

        alert(
            "Select item and enter quantity"
        );

        return;

    }


    const item =
        itemEl.value;


    const stock =
        get("stock");


    const product =
        stock.find(
            s => s.name === item
        );


    if (!product) {

        alert(
            "Item not found in stock"
        );

        return;

    }


    if (product.qty < qty) {

        alert(
            "Only " +
            product.qty +
            " units available"
        );

        return;

    }


    const amount =
        qty *
        Number(product.sell);


    /* REDUCE STOCK */

    product.qty -= qty;

    save("stock", stock);


    /* ORG LEDGER */

    const orgTrans =
        getOrgTrans();


    orgTrans.push({

        id: Date.now(),

        orgId: orgId,

        type: "purchase",

        item: item,

        qty: qty,

        unit: product.sell,

        amount: amount,

        date: date

    });


    saveOrgTrans(orgTrans);


    /* MAIN TRANSACTION TABLE */

    const org =
        getOrgs()
            .find(
                o => o.id === orgId
            );


    addTransaction({

        name:
            org?.name ||
            "Organisation",

        item: item,

        qty: qty,

        unit: product.sell,

        amount: amount,

        type: "org_debt",

        date: date,

        orgId: orgId

    });


    alert(
        "Organisation purchase recorded!"
    );


    loadOrgLedger();

};


/* =========================================================
   ORGANISATION PAYMENT
========================================================= */

window.addOrgPayment = function() {

    const orgId =
        parseInt(
            localStorage.getItem(
                "bk_current_org"
            )
        );


    const amount =
        parseFloat(
            document.getElementById(
                "orgPayAmount"
            ).value
        );


    const method =
        document.getElementById(
            "orgPayMethod"
        ).value;


    const date =
        document.getElementById(
            "orgPayDate"
        ).value ||
        todayISO();


    if (!amount || amount <= 0) {

        alert(
            "Enter amount"
        );

        return;

    }


    const orgTrans =
        getOrgTrans();


    orgTrans.push({

        id: Date.now(),

        orgId: orgId,

        type: "payment",

        item: "Debt Payment",

        qty: 0,

        amount: amount,

        method: method,

        date: date

    });


    saveOrgTrans(orgTrans);


    /* MAIN TRANSACTION TABLE */

    const org =
        getOrgs()
            .find(
                o => o.id === orgId
            );


    addTransaction({

        name:
            org?.name ||
            "Organisation",

        item:
            "Debt Payment",

        qty: 0,

        unit: 0,

        amount: amount,

        type: "org_payment",

        date: date,

        orgId: orgId

    });


    alert(
        "Organisation payment recorded!"
    );


    loadOrgLedger();

};


/* =========================================================
   PRINT ORGANISATION STATEMENT
========================================================= */

window.printOrgStatement = function() {

    const orgId =
        parseInt(
            localStorage.getItem(
                "bk_current_org"
            )
        );


    const org =
        getOrgs()
            .find(
                o => o.id === orgId
            );


    const trans =
        getOrgTrans()
            .filter(
                t => t.orgId === orgId
            );


    if (!org) return;


    const totalPurch =
        trans
            .filter(
                t => t.type === "purchase"
            )
            .reduce(
                (s, t) =>
                    s + Number(t.amount),
                0
            );


    const totalPaid =
        trans
            .filter(
                t => t.type === "payment"
            )
            .reduce(
                (s, t) =>
                    s + Number(t.amount),
                0
            );


    const w =
        window.open(
            "",
            "_blank"
        );


    w.document.write(`
        <h2>${org.name} - Statement</h2>

        <p>
            ${org.contact || ""}
            |
            ${org.term}
        </p>

        <p>
            Total Purchases:
            UGX ${totalPurch.toLocaleString()}
        </p>

        <p>
            Total Paid:
            UGX ${totalPaid.toLocaleString()}
        </p>

        <p>
            Balance:
            UGX ${(totalPurch-totalPaid)
                .toLocaleString()}
        </p>

        <hr>
    `);


    trans.forEach(t => {

        w.document.write(`
            <p>
                ${formatDate(t.date)}
                -
                ${t.type}
                -
                ${t.item || t.method || ""}
                -
                UGX ${Number(t.amount)
                    .toLocaleString()}
            </p>
        `);

    });


    w.document.write(
        "<script>window.print()<\/script>"
    );

    w.document.close();

};


/* =========================================================
   PAGE INITIALIZATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const stock =
            get("stock");


        /* STOCK DROPDOWNS */

        document
            .querySelectorAll(
                "#item, #sItemSelect, #payName"
            )
            .forEach(el => {

                if (!el) return;


                if (el.id === "payName") {

                    const names =
                        [
                            ...new Set(
                                get("debts")
                                    .map(
                                        d => d.name
                                    )
                            )
                        ];


                    el.innerHTML =
                        `<option value="">
                            -- Select --
                         </option>` +

                        names.map(
                            n =>
                                `<option value="${n}">
                                    ${n}
                                 </option>`
                        ).join("");


                    el.addEventListener(
                        "change",
                        () => {

                            if (
                                window.updatePayPreview
                            ) {

                                updatePayPreview();

                            }

                        }
                    );


                    const amount =
                        document.getElementById(
                            "payAmount"
                        );


                    if (amount) {

                        amount.addEventListener(
                            "input",
                            updatePayPreview
                        );

                    }


                } else {

                    el.innerHTML =
                        stock.length

                            ? stock.map(
                                s =>
                                    `<option value="${s.name}">
                                        ${s.name}
                                        (${s.qty} left)
                                     </option>`
                              ).join("")

                            : `
                                <option>
                                    No stock - add in Stock page
                                </option>
                              `;

                }

            });


        /* ORGANISATION ITEM DROPDOWN */

        const orgItem =
            document.getElementById(
                "orgItem"
            );


        if (orgItem) {

            orgItem.innerHTML =
                stock.length

                    ? `
                        <option value="">
                            -- Select item --
                        </option>
                      ` +

                      stock.map(
                        s =>
                            `<option value="${s.name}">
                                ${s.name}
                                (${s.qty} left)
                             </option>`
                      ).join("")

                    : `
                        <option>
                            No stock available
                        </option>
                      `;

        }


        /* STOCK LIST */

        const stockList =
            document.getElementById(
                "stockList"
            );


        if (stockList) {

            stockList.innerHTML =
                stock.length

                    ? stock.map(
                        (s, i) =>
                            `<tr>
                                <td>${s.name}</td>
                                <td>${s.qty}</td>
                                <td>
                                    <button
                                        onclick="deleteStock(${i})"
                                    >
                                        Del
                                    </button>
                                </td>
                             </tr>`
                      ).join("")

                    : `
                        <tr>
                            <td colspan="3">
                                No stock yet
                            </td>
                        </tr>
                      `;

        }


        /* TRANSACTIONS */

        const transList =
            document.getElementById(
                "transList"
            );


        if (transList) {

            filterTransactions();

        }


        /* DEBTS */

        const debtList =
            document.getElementById(
                "debtList"
            );


        if (debtList) {

            renderDebts(
                get("debts")
            );

        }


        /* DASHBOARD */

        const tCount =
            document.getElementById(
                "tCount"
            );


        if (tCount) {

            tCount.innerText =
                get("transactions")
                    .length;

        }


        const tAmount =
            document.getElementById(
                "tAmount"
            );


        if (tAmount) {

            const total =
                get("transactions")
                    .reduce(
                        (s, t) =>
                            s +
                            Number(t.amount || 0),
                        0
                    );


            tAmount.innerText =
                "UGX " +
                total.toLocaleString();

        }


        /* NOTICES */

        const notices =
            document.getElementById(
                "notices"
            );


        if (notices) {

            const low =
                stock.filter(
                    s =>
                        s.qty <=
                        APP_CONFIG.lowStock
                );


            notices.innerHTML =
                low.length

                    ? low.map(
                        s =>
                            `Low: ${s.name} (${s.qty})`
                      ).join("<br>")

                    : "All good";

        }


        /* ORGS */

        const orgsList =
            document.getElementById(
                "orgsList"
            );


        if (orgsList) {

            loadOrgs();

        }


        /* ORG LEDGER */

        const orgTitle =
            document.getElementById(
                "orgTitle"
            );


        if (orgTitle) {

            loadOrgLedger();

        }

    }
);
