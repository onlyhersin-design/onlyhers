/* =========================================
   ONLYHERS — SUPABASE CONFIGURATION
========================================= */

const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_KEY = "YOUR_SUPABASE_PUBLISHABLE_KEY";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);


/* =========================================
   HELPERS
========================================= */

function escapeHTML(value) {
  if (value === null || value === undefined) return "";

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function formatPrice(price) {
  return "₹" + Number(price || 0).toLocaleString("en-IN");
}


/* =========================================
   NAVIGATION + AUTH STATE
========================================= */

async function updateNavigation() {
  const authArea = document.getElementById("authArea");

  if (!authArea) return;

  const {
    data: { session }
  } = await supabaseClient.auth.getSession();


  /* USER NOT LOGGED IN */

  if (!session) {
    authArea.innerHTML = `
      <a href="auth.html" class="login-link">
        LOGIN
      </a>

      <a href="auth.html?mode=signup" class="signup-link">
        SIGN UP
      </a>
    `;

    return;
  }


  /* USER LOGGED IN */

  const email = session.user.email;

  authArea.innerHTML = `
    <a href="account.html" class="account-link">
      👤 ${escapeHTML(email)}
    </a>

    <button class="logout-button" onclick="logoutUser()">
      LOGOUT
    </button>
  `;
}


/* =========================================
   LOGOUT
========================================= */

async function logoutUser() {

  const { error } =
    await supabaseClient.auth.signOut();

  if (error) {
    alert(error.message);
    return;
  }

  window.location.href = "index.html";
}


/* =========================================
   REQUIRE LOGIN
========================================= */

async function requireLogin() {

  const {
    data: { session }
  } = await supabaseClient.auth.getSession();

  if (!session) {
    window.location.href = "auth.html";
    return null;
  }

  return session;
}


/* =========================================
   UPDATE NAV ON EVERY PAGE
========================================= */

document.addEventListener("DOMContentLoaded", () => {
  updateNavigation();
});
