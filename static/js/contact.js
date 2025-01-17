import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getDatabase, ref, get, set } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-database.js";

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Fetch messages from Firebase
function fetchMessages() {
    const messagesRef = ref(database, 'messages');
    get(messagesRef).then((snapshot) => {
        if (snapshot.exists()) {
            const messages = snapshot.val();
            const tableBody = document.getElementById("messages-table").getElementsByTagName('tbody')[0];
            tableBody.innerHTML = ""; // Clear existing table rows

            for (let key in messages) {
                const message = messages[key];
                const row = tableBody.insertRow();

                row.insertCell(0).textContent = message.name;
                row.insertCell(1).textContent = message.email;

                // Message column: Link to view full message
                const messageCell = row.insertCell(2);
                messageCell.innerHTML = `
                    <a href="#" class="view-btn" data-message="${message.message}">
                        <i class="fa fa-eye"></i>
                    </a>`;

                row.insertCell(3).textContent = message.timestamp;

                // Status column: Checkmark toggle
                const statusCell = row.insertCell(4);
                const isChecked = message.status === "checked";
                statusCell.innerHTML = `
                    <button class="status-btn" data-key="${key}" data-status="${isChecked}">
                        <i class="fa ${isChecked ? 'fa-check-circle' : 'fa-circle'}"></i>
                    </button>`;
            }

            // Add event listeners to status buttons
            const statusButtons = document.querySelectorAll(".status-btn");
            statusButtons.forEach(button => {
                button.addEventListener("click", function() {
                    const key = button.getAttribute("data-key");
                    const currentStatus = button.getAttribute("data-status") === "true";
                    updateMessageStatus(key, !currentStatus);
                });
            });

            // Add event listeners to view buttons
            const viewButtons = document.querySelectorAll(".view-btn");
            viewButtons.forEach(button => {
                button.addEventListener("click", function(event) {
                    event.preventDefault();
                    const fullMessage = button.getAttribute("data-message");
                    showMessageModal(fullMessage);
                });
            });

        } else {
            console.log("No messages found.");
        }
    }).catch((error) => {
        console.error("Error fetching messages: ", error);
    });
}

// Function to update the status of a message
function updateMessageStatus(key, newStatus) {
    const messageRef = ref(database, `messages/${key}`);
    get(messageRef).then((snapshot) => {
        if (snapshot.exists()) {
            const updatedMessage = { ...snapshot.val(), status: newStatus ? "checked" : "unchecked" };
            set(messageRef, updatedMessage)
                .then(() => {
                    console.log(`Message status updated to ${newStatus ? "checked" : "unchecked"}`);
                    fetchMessages(); // Refresh table after update
                })
                .catch(error => console.error("Error updating status: ", error));
        }
    }).catch(error => console.error("Error fetching message to update: ", error));
}

// Function to display the message in the modal
function showMessageModal(message) {
    const modalMessageBody = document.getElementById("modalMessageBody");
    modalMessageBody.textContent = message; // Display the full message
    document.getElementById("messageModal").style.display = "block"; // Show the modal
}

// Close modal
function closeModal() {
    document.getElementById("messageModal").style.display = "none"; // Hide the modal
}

// Fetch messages when the page loads
window.onload = fetchMessages;

// Close modal when the close button is clicked
document.querySelector(".close").addEventListener("click", closeModal);
