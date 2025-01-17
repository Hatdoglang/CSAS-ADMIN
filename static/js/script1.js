



// Script to handle tab switching
function openTab(evt, tabName) {
    var i, tabcontent, tablinks;

    // Hide all tab content by default
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }

    // Remove the active class from all tab links
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].classList.remove("active");
    }

    // Show the current tab and add the active class to the clicked tab link
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.classList.add("active");
}

// Scroll event listener
window.addEventListener("scroll", function() {
    const header = document.querySelector("header");
    if (window.scrollY > 50) {
        header.classList.add("scrolled");
    } else {
        header.classList.remove("scrolled");
    }
});

// Set the default tab to be open
document.addEventListener("DOMContentLoaded", function() {
    document.querySelector(".tablinks.active").click();
});

// Add event listener for the "Download" button
document.getElementById('downloadBtn').addEventListener('click', function() {
    // Placeholder for download functionality
    alert('Download functionality to be implemented.');
});

// Add event listener for the "Delete" button
document.getElementById('deleteBtn').addEventListener('click', function() {
    var reviewsTable = document.getElementById('reviewsTable');
    reviewsTable.innerHTML = ''; // Clear the table
    document.getElementById('totalReviews').textContent = '0';
    alert('Reviews deleted.');
});



// Event listeners for next buttons
document.getElementById('nextBtn1').addEventListener('click', function() {
    document.querySelector('.tablinks[onclick="openTab(event, \'DataUpload\')"]').click();
});

document.getElementById('nextBtn2').addEventListener('click', function() {
    document.querySelector('.tablinks[onclick="openTab(event, \'Result\')"]').click();
});




// Function to update the tab's circle number to a check icon
function updateTabToCheck(tabId) {
    const tabButton = document.getElementById(tabId);
    const circle = tabButton.querySelector('.circle');
    circle.innerHTML = '<i class="fas fa-check"></i>'; // Set check icon
}

// Modify the next button actions to update tabs when clicked
document.getElementById('nextBtn1').addEventListener('click', function() {
    updateTabToCheck('tab1'); // Change circle to check on Data Extraction
    openTab(event, 'DataUpload'); // Go to Data Upload tab
});

document.getElementById('nextBtn2').addEventListener('click', function() {
    updateTabToCheck('tab2'); // Change circle to check on Data Upload
    openTab(event, 'Result'); // Go to Result tab
});
