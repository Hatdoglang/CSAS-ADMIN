import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";
import { getDatabase, ref, get, set } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyDbNXaBjr2FVNN3nC4W8CUa9DlQwR2D87s",
    authDomain: "csas-158fc.firebaseapp.com",
    databaseURL: "https://csas-158fc-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "csas-158fc",
    storageBucket: "csas-158fc.firebasestorage.app",
    messagingSenderId: "763041820862",
    appId: "1:763041820862:web:c11981b07960e91ece6eef",
    measurementId: "G-26BMZST2LE"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const rtdb = getDatabase(app);

document.getElementById('role').addEventListener('change', async (e) => {
    const role = e.target.value;
    const resortSelection = document.getElementById('resort-selection');

    if (role === 'Resort Owner') {
        resortSelection.style.display = 'block';

        const resortsRef = ref(rtdb, 'reviews');
        const snapshot = await get(resortsRef);
        const resorts = snapshot.val();

        const resortSelect = document.getElementById('resort');
        resortSelect.innerHTML = '<option value="" disabled selected>Select a Resort</option>';
        for (const [key, data] of Object.entries(resorts)) {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = data.details.name;
            resortSelect.appendChild(option);
        }
    } else {
        resortSelection.style.display = 'none';
    }
});

document.getElementById('signup-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const role = document.getElementById('role').value;
    const resort = document.getElementById('resort').value;

    if (password !== confirmPassword) {
        alert('Passwords do not match!');
        return;
    }

    if (role === 'Resort Owner' && !resort) {
        alert('Please select a resort!');
        return;
    }

    try {
        // Create user in Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Save user profile data to Firestore (excluding password)
        const userData = {
            name,
            email,
            role,
            ...(role === 'Resort Owner' && { resort }), // Only include resort if the user is a Resort Owner
        };

        // Store user data in Firestore (Firestore handles data like name, email, and role)
        await setDoc(doc(db, "users", user.uid), userData);

        // Store user data in Realtime Database (password not included)
        const usersRef = ref(rtdb, 'users/' + user.uid);
        await set(usersRef, {
            name,
            email,
            role,
            resort: role === 'Resort Owner' ? resort : null,
        });

        // Send request to backend to set custom claims
        const response = await fetch('/set-role', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                uid: user.uid,
                role: role,
                resort: role === 'Resort Owner' ? resort : null
            })
        });

        if (response.ok) {
            document.getElementById('success-message').style.display = 'block';
            document.getElementById('signup-form').reset();
        } else {
            const errorData = await response.json();
            alert('Error setting user role: ' + errorData.error);
        }
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
});