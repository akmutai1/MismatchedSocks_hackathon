// Simple client-side auth for demo purposes only
(function () {
    'use strict';

    // Demo credential (in production use server-side auth)
    const DEMO_USER = { email: 'adams.tebes@gmail.com', password: 'soccerkid098', name: 'Adams Tebes' };
    const STORAGE_KEY = 'labsky_user';
    const ACCOUNTS_KEY = 'labsky_accounts';

    // Accounts stored as array [{ email, password, name }]
    function getAccounts() {
        try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY)) || []; } catch (e) { return []; }
    }

    function saveAccounts(accounts) {
        try { localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts)); } catch (e) { /* ignore */ }
    }

    function findAccountByEmail(email) {
        const accounts = getAccounts();
        return accounts.find(a => (a.email || '').trim().toLowerCase() === (email || '').trim().toLowerCase()) || null;
    }

    function createAccount(name, email, password) {
        const normalizedEmail = (email || '').trim().toLowerCase();
        if (findAccountByEmail(normalizedEmail)) return { success: false, message: 'Account already exists' };
        const accounts = getAccounts();
        accounts.push({ name: name || normalizedEmail, email: normalizedEmail, password: (password || '') });
        saveAccounts(accounts);
        return { success: true };
    }

    function getStoredUser() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch (e) { return null; }
    }

    function setStoredUser(user, remember) {
        if (remember) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
        } else {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
        }
    }

    function clearStoredUser() {
        localStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem(STORAGE_KEY);
    }

    function initNavbar() {
        const navAuth = document.getElementById('nav-auth');
        if (!navAuth) return;

        // clear existing auth content
        navAuth.innerHTML = '';

        const stored = getStoredUser() || (() => { try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY)); } catch (e) { return null; } })();

        if (stored) {
            const span = document.createElement('span');
            span.className = 'me-3 align-self-center';
            span.textContent = stored.name || stored.email;

            const logout = document.createElement('a');
            logout.className = 'btn btn-outline-primary ms-2';
            logout.href = '#';
            logout.id = 'logout-link';
            logout.textContent = 'Logout';
            logout.addEventListener('click', function (e) {
                e.preventDefault();
                clearStoredUser();
                // refresh to reflect change
                location.reload();
            });

            navAuth.appendChild(span);
            navAuth.appendChild(logout);
        } else {
            const login = document.createElement('a');
            login.className = 'btn btn-primary py-2 px-4';
            login.href = 'login.html';
            login.id = 'login-link';
            login.textContent = 'Login';
            navAuth.appendChild(login);
        }
    }

    function handleLoginForm() {
        const form = document.getElementById('login-form');
        if (!form) return;
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            const email = (document.getElementById('email').value || '').trim().toLowerCase();
            const password = (document.getElementById('password').value || '').trim();
            const remember = document.getElementById('remember').checked;
            const errEl = document.getElementById('login-error');
            // normalize demo email for comparison
            const demoEmail = (DEMO_USER.email || '').trim().toLowerCase();
            const demoPassword = (DEMO_USER.password || '').trim();

            console.log('Auth attempt', { email, passwordProvided: !!password, remember });

            // check saved accounts first
            const acct = findAccountByEmail(email);
            if (acct && acct.password === password) {
                setStoredUser({ email: acct.email, name: acct.name }, remember);
                window.location.href = 'index.html';
                return;
            }

            // fallback to demo user
            if (email === demoEmail && password === demoPassword) {
                setStoredUser({ email: demoEmail, name: DEMO_USER.name }, remember);
                window.location.href = 'index.html';
                return;
            }

            if (errEl) {
                errEl.style.display = 'block';
                errEl.textContent = 'Invalid credentials. Try: adams.tebes@gmail.com / soccerkid098';
            }
        });
    }

    function handleSignupForm() {
        const form = document.getElementById('signup-form');
        if (!form) return;
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            const name = (document.getElementById('signup-name').value || '').trim();
            const email = (document.getElementById('signup-email').value || '').trim().toLowerCase();
            const password = (document.getElementById('signup-password').value || '').trim();
            const confirm = (document.getElementById('signup-confirm').value || '').trim();
            const errEl = document.getElementById('signup-error');

            if (!email || !password) {
                if (errEl) { errEl.style.display = 'block'; errEl.textContent = 'Email and password are required.'; }
                return;
            }
            if (password !== confirm) {
                if (errEl) { errEl.style.display = 'block'; errEl.textContent = 'Passwords do not match.'; }
                return;
            }

            const res = createAccount(name, email, password);
            if (!res.success) {
                if (errEl) { errEl.style.display = 'block'; errEl.textContent = res.message; }
                return;
            }

            // auto-login after signup
            setStoredUser({ email: email, name: name || email }, true);
            window.location.href = 'index.html';
        });
    }

    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', function () {
        initNavbar();
        handleLoginForm();
        handleSignupForm();
    });
})();
