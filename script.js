import { initializeApp } from "[https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js](https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js)";
import { getAuth, signInAnonymously } from "[https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js](https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js)";
import { getFirestore, collection, addDoc, query, where, getDocs, doc, updateDoc, onSnapshot } from "[https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js](https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js)";

// ==========================================
// ส่วนตั้งค่า Firebase (สำคัญ: ต้องใส่ค่าของคุณเอง)
// ==========================================
const firebaseConfig = {
    // นำค่า Config จาก Firebase Console -> Project Settings มาใส่ตรงนี้
    apiKey: "AIzaSy...",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "...",
    appId: "..."
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ใช้ ID เดียวสำหรับเก็บข้อมูล (หรือเปลี่ยนตามต้องการ)
const appId = 'student-council-system';

let currentUserData = null;

// --- เริ่มการทำงาน ---
async function initApp() {
    try {
        await signInAnonymously(auth);
        
        const storedUser = localStorage.getItem('sc_user');
        if (storedUser) {
            currentUserData = JSON.parse(storedUser);
            showApp();
        } else {
            showAuth();
        }
    } catch (error) {
        console.error("Firebase Init Error:", error);
        alert("เกิดข้อผิดพลาดในการเชื่อมต่อระบบ");
    }
}

// --- การนำทาง (Navigation) ---
window.showAuth = () => {
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('app-screen').classList.add('hidden');
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('register-form').classList.add('hidden');
};

window.showRegister = () => {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-form').classList.remove('hidden');
};

window.showApp = () => {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app-screen').classList.remove('hidden');
    document.getElementById('user-display-name').textContent = currentUserData.fullname;
    
    if(currentUserData.studentId === '99999') {
        document.getElementById('admin-tab-btn').classList.remove('hidden');
    }
    window.switchTab('home');
};

window.logout = () => {
    localStorage.removeItem('sc_user');
    currentUserData = null;
    location.reload();
};

window.switchTab = (tabName) => {
    ['home', 'activity', 'report', 'admin'].forEach(t => {
        const el = document.getElementById(`page-${t}`);
        if(el) el.classList.add('hidden');
    });
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('text-blue-600', 'bg-blue-50');
        btn.classList.add('text-gray-500');
    });

    document.getElementById(`page-${tabName}`).classList.remove('hidden');
    
    const activeBtn = document.getElementById(`btn-${tabName}`);
    if(activeBtn) {
        activeBtn.classList.add('text-blue-600', 'bg-blue-50');
        activeBtn.classList.remove('text-gray-500');
    }

    if (tabName === 'home') loadAnnouncements();
    if (tabName === 'activity') loadWasteBankPoints();
};

window.switchActivitySubTab = (subTab) => {
    if(subTab === 'good-deeds') {
        document.getElementById('sub-good-deeds').classList.remove('hidden');
        document.getElementById('sub-waste-bank').classList.add('hidden');
        document.getElementById('tab-good').classList.add('border-blue-600', 'text-blue-600');
        document.getElementById('tab-waste').classList.remove('border-blue-600', 'text-blue-600');
    } else {
        document.getElementById('sub-good-deeds').classList.add('hidden');
        document.getElementById('sub-waste-bank').classList.remove('hidden');
        document.getElementById('tab-good').classList.remove('border-blue-600', 'text-blue-600');
        document.getElementById('tab-waste').classList.add('border-blue-600', 'text-blue-600');
    }
};

// --- Logic การทำงานหลัก ---
window.handleRegister = async (e) => {
    e.preventDefault();
    const fullname = document.getElementById('reg-fullname').value;
    const studentId = document.getElementById('reg-std-id').value;
    const classRoom = document.getElementById('reg-class').value;
    const number = document.getElementById('reg-number').value;
    const password = document.getElementById('reg-password').value;

    try {
        const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'), where("studentId", "==", studentId));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            alert("รหัสนักเรียนนี้มีในระบบแล้ว");
            return;
        }

        const userData = {
            fullname, studentId, classRoom, number, password,
            role: studentId === '99999' ? 'admin' : 'student',
            wastePoints: 0
        };

        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'users'), userData);
        alert("สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ");
        window.showAuth();
    } catch (err) {
        console.error(err);
        alert("เกิดข้อผิดพลาดในการสมัครสมาชิก");
    }
};

window.handleLogin = async (e) => {
    e.preventDefault();
    const studentId = document.getElementById('login-std-id').value;
    const password = document.getElementById('login-password').value;

    try {
        const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'), 
                        where("studentId", "==", studentId), 
                        where("password", "==", password));
        
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            const userData = { id: doc.id, ...doc.data() };
            localStorage.setItem('sc_user', JSON.stringify(userData));
            currentUserData = userData;
            window.showApp();
        } else {
            alert("รหัสนักเรียนหรือรหัสผ่านไม่ถูกต้อง");
        }
    } catch (err) {
        console.error(err);
        alert("เกิดข้อผิดพลาดในการเข้าสู่ระบบ");
    }
};

function loadAnnouncements() {
    const container = document.getElementById('announcement-list');
    // Mock Data (สามารถเปลี่ยนเป็นดึงจาก DB ได้)
    const announcements = [
        { title: "ยินดีต้อนรับเปิดเทอมใหม่!", date: "10 ม.ค. 67", content: "ขอให้นักเรียนทุกคนตั้งใจเรียน และรักษากฎระเบียบ", type: "info" },
        { title: "กิจกรรมวันวิทยาศาสตร์", date: "15 ม.ค. 67", content: "เชิญชวนนักเรียนเข้าร่วมกิจกรรมประกวดโครงงาน", type: "activity" }
    ];

    let html = '';
    announcements.forEach(news => {
        let iconColor = news.type === 'info' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600';
        let icon = news.type === 'info' ? 'fa-bullhorn' : 'fa-star';
        
        html += `
        <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-3 flex items-start gap-3">
            <div class="${iconColor} w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
                <i class="fas ${icon}"></i>
            </div>
            <div>
                <h3 class="font-bold text-gray-800">${news.title}</h3>
                <p class="text-xs text-gray-400 mb-1"><i class="far fa-clock"></i> ${news.date}</p>
                <p class="text-sm text-gray-600">${news.content}</p>
            </div>
        </div>`;
    });
    container.innerHTML = html;
}

function loadWasteBankPoints() {
    try {
        const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', currentUserData.id);
        onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                renderPointCard(data.wastePoints || 0);
            }
        });
    } catch (e) { console.error(e); }
}

function renderPointCard(points) {
    const container = document.getElementById('point-grid');
    let html = '';
    for (let i = 1; i <= 10; i++) {
        const isActive = i <= points;
        html += `
        <div class="aspect-square rounded-full border-2 ${isActive ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-200 bg-gray-50 text-gray-300'} flex items-center justify-center text-lg font-bold transition-all duration-300">
            ${isActive ? '<i class="fas fa-check"></i>' : i}
        </div>`;
    }
    container.innerHTML = html;
    
    const statusText = document.getElementById('point-status');
    if (points >= 10) statusText.innerHTML = '<span class="text-green-600 font-bold">🎉 ครบ 10 แต้มแล้ว! ติดต่อสภาฯ</span>';
    else statusText.innerHTML = `สะสมอีก <span class="text-blue-600 font-bold">${10 - points}</span> แต้ม เพื่อรับรางวัล`;
}

window.submitGoodDeed = async (e) => {
    e.preventDefault();
    alert("ส่งบันทึกความดีเรียบร้อย! (ระบบจำลอง)");
    e.target.reset();
};

window.submitReport = async (e) => {
    e.preventDefault();
    const title = document.getElementById('report-title').value;
    const desc = document.getElementById('report-desc').value;

    try {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'issues'), {
            title, description: desc,
            reporterId: currentUserData.studentId,
            reporterName: currentUserData.fullname,
            status: 'pending', timestamp: new Date().toISOString()
        });
        alert("แจ้งปัญหาเรียบร้อย");
        e.target.reset();
        window.switchTab('home');
    } catch (err) { alert("ส่งข้อมูลไม่สำเร็จ"); }
};

window.searchStudentForPoints = async () => {
    const id = document.getElementById('admin-std-search').value;
    const resultDiv = document.getElementById('admin-search-result');
    if(!id) return;

    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'), where("studentId", "==", id));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        resultDiv.innerHTML = '<p class="text-red-500">ไม่พบนักเรียนรหัสนี้</p>';
        return;
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();
    
    resultDiv.innerHTML = `
        <div class="p-3 bg-blue-50 rounded-lg border border-blue-100 mt-2">
            <p class="font-bold text-gray-800">${userData.fullname}</p>
            <p class="text-sm text-gray-600">แต้มปัจจุบัน: ${userData.wastePoints || 0}/10</p>
            <button onclick="addPointToUser('${userDoc.id}', ${userData.wastePoints || 0})" class="bg-green-500 text-white px-3 py-1 rounded shadow text-sm mt-2">
                + เพิ่ม 1 แต้ม
            </button>
        </div>`;
};

window.addPointToUser = async (docId, currentPoints) => {
    if (currentPoints >= 10) { alert("แต้มเต็มแล้ว"); return; }
    try {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', docId), {
            wastePoints: currentPoints + 1
        });
        alert("เพิ่มแต้มสำเร็จ");
        document.getElementById('admin-search-result').innerHTML = '';
        document.getElementById('admin-std-search').value = '';
    } catch (err) { alert("เกิดข้อผิดพลาด"); }
};

// เริ่มต้นแอป
initApp();

