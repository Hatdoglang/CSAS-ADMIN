import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";  // Ensure this import is correct
import { getDatabase, ref, set, get } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-database.js";


// Firebase configuration
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
const db = getDatabase(app);

// Handle Login Form Submission
document.getElementById('login-form').addEventListener('submit', function(e) {
    e.preventDefault();  // Prevent the default form submission

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Basic form validation
    if (!email || !password) {
        alert('Please fill out both fields.');
        return;
    }

    // Firebase Authentication: Sign in user with email and password
    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            console.log("Logged in as:", user.email);

            // Check if the user is an admin
            const userRef = ref(db, 'users/' + user.uid);  // Access the user's role in Firebase
            get(userRef)
                .then((snapshot) => {
                    if (snapshot.exists()) {
                        const userData = snapshot.val();
                        const userRole = userData.role;
                        
                        // If the user is not an admin, show an error message
                        if (userRole !== 'admin') {
                            alert("You are not authorized to access this page.");
                            signOut(auth);  // Sign out the user immediately
                            return;
                        }

                        // If the user is an admin, set the session
                        fetch('/set-session', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                user_id: user.uid,
                            })
                        })
                        .then(response => response.json())
                        .then(data => {
                            if (data.status === 'success') {
                                // Redirect to index page after session is set
                                window.location.href = "/index";
                            } else {
                                console.error("Error setting session:", data.message);
                                alert('Failed to set session. Please try again.');
                            }
                        })
                        .catch(error => {
                            console.error("Error setting session:", error);
                            alert("Error setting session. Please try again.");
                        });
                    } else {
                        alert("User not found in database.");
                        signOut(auth);  // Sign out the user immediately
                    }
                })
                .catch((error) => {
                    console.error("Error fetching user data:", error);
                    alert("Error fetching user data. Please try again.");
                    signOut(auth);  // Sign out the user immediately
                });

        })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            console.error("Login error:", errorMessage);
            alert("Error: " + errorMessage);
        });
});

// Open Admin Registration Modal
document.getElementById('registerAdminLink').addEventListener('click', function(e) {
    e.preventDefault();
    document.getElementById('adminRegisterModal').style.display = 'block';
});

// Close Admin Registration Modal
document.getElementById('closeModal').addEventListener('click', function() {
    document.getElementById('adminRegisterModal').style.display = 'none';
});

// Handle Admin Registration Form Submission
document.getElementById('adminRegisterForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const name = document.getElementById('admin-name').value;
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;
    const role = document.getElementById('admin-role').value;

    // Basic form validation
    if (!name || !email || !password || !role) {
        alert('Please fill out all fields.');
        return;
    }

    // Firebase Authentication: Register user with email and password
    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;

            // Store user role in Firebase Database
            set(ref(db, 'users/' + user.uid), {
                name: name,
                email: email,
                role: role
            })
            .then(() => {
                alert("Admin registered successfully!");
                document.getElementById('adminRegisterModal').style.display = 'none';
            })
            .catch((error) => {
                console.error("Error storing user data:", error);
                alert("Error storing user data: " + error.message);
            });
        })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            console.error("Error registering user:", errorMessage);
            alert("Error registering user: " + errorMessage);
        });
});
