document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

    const loginBtn = document.getElementById("login-btn");
    const logoutBtn = document.getElementById("logout-btn");
    const userInfoDiv = document.getElementById("user-info");
    const welcomeUser = document.getElementById("welcome-user");
    const loginModal = document.getElementById("login-modal");
    const loginForm = document.getElementById("login-form");
    const loginError = document.getElementById("login-error");
    const adminActions = document.getElementById("admin-actions");
    const createActivityForm = document.getElementById("create-activity-form");
    const adminMessage = document.getElementById("admin-message");
  // Function to fetch activities from API
    // User state
    let currentUser = null;
    let currentRole = null;
  async function fetchActivities() {
    // Helpers
    function setUser(user, role) {
      currentUser = user;
      currentRole = role;
      if (user) {
        userInfoDiv.classList.remove("hidden");
        welcomeUser.textContent = `Welcome, ${user}`;
        loginBtn.classList.add("hidden");
        if (role === "admin" || role === "staff") {
          adminActions.classList.remove("hidden");
        } else {
          adminActions.classList.add("hidden");
        }
      } else {
        userInfoDiv.classList.add("hidden");
        loginBtn.classList.remove("hidden");
        adminActions.classList.add("hidden");
      }
      // Hide signup if not logged in
      document.getElementById("signup-container").style.display = user ? "block" : "none";
      // Hide unregister buttons if not logged in
      document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.style.display = user ? 'inline-block' : 'none';
      });
    }
    try {
    function saveUserToStorage(name, role) {
      localStorage.setItem("userName", name);
      localStorage.setItem("userRole", role);
    }
    function clearUserFromStorage() {
      localStorage.removeItem("userName");
      localStorage.removeItem("userRole");
    }
    function loadUserFromStorage() {
      const name = localStorage.getItem("userName");
      const role = localStorage.getItem("userRole");
      if (name && role) setUser(name, role);
    }
      const response = await fetch("/activities");
    // Show login modal
    loginBtn.addEventListener("click", () => {
      loginModal.classList.remove("hidden");
      loginError.classList.add("hidden");
      loginForm.reset();
    });
    // Hide modal on outside click
    loginModal.addEventListener("click", (e) => {
      if (e.target === loginModal) loginModal.classList.add("hidden");
    });
    // Logout
    logoutBtn.addEventListener("click", async () => {
      await fetch("/logout", { method: "POST", credentials: "include" });
      setUser(null, null);
      clearUserFromStorage();
      messageDiv.textContent = "Logged out.";
      messageDiv.className = "info";
      messageDiv.classList.remove("hidden");
      setTimeout(() => messageDiv.classList.add("hidden"), 3000);
      fetchActivities();
    });
      const activities = await response.json();
    // Login form submit
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("login-email").value;
      const password = document.getElementById("login-password").value;
      try {
        const response = await fetch("/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email, password })
        });
        const result = await response.json();
        if (response.ok) {
          setUser(result.name, result.role);
          saveUserToStorage(result.name, result.role);
          loginModal.classList.add("hidden");
          messageDiv.textContent = result.message;
          messageDiv.className = "success";
          messageDiv.classList.remove("hidden");
          setTimeout(() => messageDiv.classList.add("hidden"), 3000);
          fetchActivities();
        } else {
          loginError.textContent = result.detail || "Login failed.";
          loginError.classList.remove("hidden");
        }
      } catch (err) {
        loginError.textContent = "Login error.";
        loginError.classList.remove("hidden");
      }
    });

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
