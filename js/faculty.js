// js/faculty.js

const usernameInput = document.getElementById('faculty-username');
const passwordInput = document.getElementById('faculty-password');
const loginBtn = document.getElementById('faculty-login-btn');
const errorMsgEl = document.getElementById('login-error-msg');

async function handleLogin() {
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!username || !password) {
        errorMsgEl.textContent = 'Please enter both username and password.';
        return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = 'Logging In...';

    // Check credentials against the 'faculties' table
    const { data, error } = await db
        .from('faculties')
        .select('id, username')
        .eq('username', username)
        .eq('password', password) // Note: For production, passwords should be hashed!
        .single();

    if (error || !data) {
        console.error('Login error:', error);
        errorMsgEl.textContent = 'Invalid username or password.';
        passwordInput.value = '';
    } else {
        // Success! Save user info to sessionStorage
        sessionStorage.setItem('loggedInFaculty', JSON.stringify(data));
        // Redirect to the dashboard
        window.location.href = 'dashboard.html';
    }

    loginBtn.disabled = false;
    loginBtn.textContent = 'Log In';
}

loginBtn.addEventListener('click', handleLogin);
passwordInput.addEventListener('keyup', (event) => {
    if (event.key === 'Enter') {
        handleLogin();
    }
});