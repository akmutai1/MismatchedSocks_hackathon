// upload.js - store uploaded files in IndexedDB per user (medsocks_user)
(function () {
    'use strict';

    const DB_NAME = 'medsocks_files_db';
    const STORE_NAME = 'files';
    const USER_KEY = 'medsocks_user';

    function openDb() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, 1);
            req.onupgradeneeded = function (e) {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    function getCurrentUser() {
        try { return JSON.parse(localStorage.getItem(USER_KEY)) || JSON.parse(sessionStorage.getItem(USER_KEY)); } catch (e) { return null; }
    }

    function addFileRecord(db, record) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.add(record);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    function listFilesForUser(db, userEmail) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const files = [];
            store.openCursor().onsuccess = function (e) {
                const cursor = e.target.result;
                if (cursor) {
                    const val = cursor.value;
                    if (val.user === userEmail) files.push(val);
                    cursor.continue();
                } else resolve(files);
            };
            tx.onerror = () => reject(tx.error);
        });
    }

    function deleteFile(db, id) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.delete(Number(id));
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }

    function blobToUrl(blob) {
        return URL.createObjectURL(blob);
    }

    // UI helpers
    async function refreshList() {
        const db = await openDb();
        const user = getCurrentUser();
        const listEl = document.getElementById('files-list');
        if (!user) return;
        listEl.innerHTML = '';
        const files = await listFilesForUser(db, user.email);
        if (!files.length) {
            listEl.innerHTML = '<li class="list-group-item">No files uploaded yet.</li>';
            return;
        }
        files.sort((a,b)=>b.uploadedAt - a.uploadedAt);
        for (const f of files) {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';
            const left = document.createElement('div');
            left.innerHTML = `<div><strong>${escapeHtml(f.name)}</strong> <small class="text-muted">(${new Date(f.uploadedAt).toLocaleString()})</small><div>${escapeHtml(f.notes||'')}</div></div>`;
            const right = document.createElement('div');
            const dl = document.createElement('a');
            dl.className = 'btn btn-sm btn-outline-primary me-2';
            dl.href = blobToUrl(f.blob);
            dl.download = f.name;
            dl.textContent = 'Download';
            const del = document.createElement('button');
            del.className = 'btn btn-sm btn-danger';
            del.textContent = 'Delete';
            del.addEventListener('click', async () => {
                await deleteFile(db, f.id);
                refreshList();
            });
            right.appendChild(dl);
            right.appendChild(del);
            li.appendChild(left);
            li.appendChild(right);
            listEl.appendChild(li);
        }
    }

    function escapeHtml(s) {
        return String(s||'').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
    }

    async function handleUpload(e) {
        e.preventDefault();
        const user = getCurrentUser();
        const warning = document.getElementById('upload-warning');
        if (!user) {
            // redirect to login
            window.location.href = 'login.html';
            return;
        }
        const input = document.getElementById('file-input');
        const notes = document.getElementById('notes').value || '';
        if (!input.files.length) {
            if (warning) { warning.style.display='block'; warning.textContent='Please select at least one file.'; }
            return;
        }
        const db = await openDb();
        for (const file of Array.from(input.files)) {
            // read as blob (already a File object) and store
            const rec = { user: user.email, name: file.name, blob: file, notes: notes, uploadedAt: Date.now() };
            await addFileRecord(db, rec);
        }
        input.value = '';
        document.getElementById('notes').value = '';
        if (warning) { warning.style.display='block'; warning.className='alert alert-success'; warning.textContent='Upload complete.'; }
        setTimeout(()=>{ if (warning) { warning.style.display='none'; warning.className='alert alert-warning'; } }, 2000);
        refreshList();
    }

    document.addEventListener('DOMContentLoaded', function () {
        const user = getCurrentUser();
        if (!user) {
            // not logged in, redirect to login
            // allow user to login and come back
            // store intended url
            localStorage.setItem('medsocks_intended', location.pathname + location.search);
            window.location.href = 'login.html';
            return;
        }
        document.getElementById('upload-form').addEventListener('submit', handleUpload);
        refreshList();
    });
})();
