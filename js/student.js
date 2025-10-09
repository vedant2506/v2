// js/student.js

document.addEventListener('DOMContentLoaded', () => {

    // --- UTILITY 1: Generate a simple device fingerprint ---
    function getDeviceFingerprint() {
        const fingerprint = [
            navigator.userAgent, navigator.language, screen.width,
            screen.height, new Date().getTimezoneOffset(), navigator.hardwareConcurrency,
        ].join('|');
        let hash = 0;
        for (let i = 0; i < fingerprint.length; i++) {
            const char = fingerprint.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString();
    }
    const deviceFingerprint = getDeviceFingerprint();

    // --- UTILITY 2: Process any QR string (URL or raw data) and extract the payload ---
    function extractScanPayload(qrString) {
        try {
            // Check if it's a URL
            if (qrString.startsWith('http') || qrString.startsWith('index.html')) {
                const url = new URL(qrString, window.location.origin); // Use origin as a base for relative URLs
                const scanData = url.searchParams.get('scan');
                if (scanData) {
                    return atob(scanData); // Decode the Base64 payload
                }
            }
            // If it's not a URL with a scan param, maybe it's the raw data itself
            if (qrString.includes('|')) {
                return qrString;
            }
        } catch (e) {
            console.error("Could not process QR string:", e);
            return null;
        }
        return null; // Return null if no valid payload is found
    }
    
    // --- UTILITY 3: Check URL on initial page load ---
    function checkForInitialScan() {
        const urlParams = new URLSearchParams(window.location.search);
        const scanData = urlParams.get('scan');
        if (scanData) {
            try {
                const decodedData = atob(scanData);
                sessionStorage.setItem('pendingScanData', decodedData);
                window.history.replaceState({}, document.title, window.location.pathname);
            } catch (e) {
                console.error("Invalid scan data in URL:", e);
            }
        }
    }
    checkForInitialScan();

    // --- DOM ELEMENTS ---
    const views = { login: document.getElementById('student-login-view'), dashboard: document.getElementById('student-dashboard'), scanner: document.getElementById('scanner-view'), manualCode: document.getElementById('manual-code-view') };
    const rollInput = document.getElementById('student-roll-input');
    const loginBtn = document.getElementById('student-login-btn');
    const loginError = document.getElementById('student-login-error');
    const loggedInStudentEl = document.getElementById('logged-in-student');
    const scanQrBtn = document.getElementById('scan-qr-btn');
    const enterManualCodeBtn = document.getElementById('enter-manual-code-btn');
    const studentLogoutBtn = document.getElementById('student-logout-btn');
    const attendanceResultEl = document.getElementById('attendance-result');
    const scannerStudentInfo = document.getElementById('scanner-student-info');
    const videoEl = document.getElementById('scanner-video');
    const scannerStatus = document.getElementById('scanner-status');
    const cancelScanBtn = document.getElementById('cancel-scan-btn');
    const manualCodeStudentInfo = document.getElementById('manual-code-student-info');
    const manualCodeInput = document.getElementById('manual-code-input');
    const submitManualCodeBtn = document.getElementById('submit-manual-code-btn');
    const cancelManualCodeBtn = document.getElementById('cancel-manual-code-btn');
    const manualCodeResult = document.getElementById('manual-code-result');
    let videoStream, animationFrameId;

    // --- STATE & UI MANAGEMENT ---
    let loggedInRollNo = sessionStorage.getItem('loggedInStudentRoll');
    if (loggedInRollNo) { showView('dashboard'); updateStudentInfo(loggedInRollNo); } 
    else { showView('login'); }
    function showView(viewName) { Object.values(views).forEach(view => view.style.display = 'none'); views[viewName].style.display = 'block'; }
    function updateStudentInfo(rollNo) { const infoText = `Logged in as Roll No: ${rollNo}`; loggedInStudentEl.textContent = infoText; scannerStudentInfo.textContent = infoText; manualCodeStudentInfo.textContent = infoText; }

    // --- EVENT LISTENERS ---
    loginBtn.addEventListener('click', () => {
        const rollNo = rollInput.value.trim();
        if (rollNo && !isNaN(rollNo)) {
            loggedInRollNo = rollNo;
            sessionStorage.setItem('loggedInStudentRoll', rollNo);
            updateStudentInfo(rollNo);
            loginError.textContent = '';
            const pendingData = sessionStorage.getItem('pendingScanData');
            if (pendingData) {
                sessionStorage.removeItem('pendingScanData');
                handleAttendancePayload(pendingData, 'UrlScan');
            } else {
                showView('dashboard');
            }
        } else { loginError.textContent = 'Please enter a valid Roll Number.'; }
    });
    studentLogoutBtn.addEventListener('click', () => { loggedInRollNo = null; sessionStorage.removeItem('loggedInStudentRoll'); rollInput.value = ''; attendanceResultEl.textContent = ''; showView('login'); });
    scanQrBtn.addEventListener('click', startScanner);
    cancelScanBtn.addEventListener('click', stopScanner);
    enterManualCodeBtn.addEventListener('click', () => { manualCodeInput.value = ''; manualCodeResult.textContent = ''; showView('manualCode'); });
    cancelManualCodeBtn.addEventListener('click', () => showView('dashboard'));
    submitManualCodeBtn.addEventListener('click', handleManualCodeSubmit);

    // --- SCANNER LOGIC ---
    function startScanner() { /* ... unchanged ... */ }
    function stopScanner() { if (videoStream) { videoStream.getTracks().forEach(track => track.stop()); } if (animationFrameId) { cancelAnimationFrame(animationFrameId); } showView('dashboard'); }
    function tick() {
        if (videoEl.readyState === videoEl.HAVE_ENOUGH_DATA) {
            const canvas = document.createElement('canvas'); canvas.width = videoEl.videoWidth; canvas.height = videoEl.videoHeight;
            const ctx = canvas.getContext('2d'); ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            if (code) {
                stopScanner();
                const payload = extractScanPayload(code.data); // Use the new utility to get the payload
                if (payload) {
                    handleAttendancePayload(payload, 'InAppScan');
                } else {
                    showResult('Invalid QR Code. Not an attendance URL.', 'error', 'InAppScan');
                }
                return;
            }
        }
        animationFrameId = requestAnimationFrame(tick);
    }

    // --- MANUAL CODE LOGIC ---
    async function handleManualCodeSubmit() { /* ... unchanged ... */ }
    function resetSubmitButton() { submitManualCodeBtn.disabled = false; submitManualCodeBtn.textContent = 'Submit Attendance'; }

    // --- CORE ATTENDANCE HANDLING ---
    async function handleAttendancePayload(payload, method) {
        const parts = payload.split('|');
        const [sessionId, timestamp] = parts;
        if (parts.length !== 2 || !sessionId || !timestamp) {
            showResult('Invalid QR code format.', 'error', method);
            return;
        }
        const codeAgeMs = Date.now() - parseInt(timestamp);
        if (codeAgeMs > 20000) {
            showResult('Expired QR code. Please scan the new one.', 'error', method);
            return;
        }
        await markAttendance(parseInt(sessionId), method);
    }
    async function markAttendance(sessionId, method) { /* ... unchanged ... */ }

    function showResult(message, type, method) {
        let resultEl;
        switch (method) {
            case 'UrlScan': resultEl = loginError; break;
            case 'InAppScan': showView('dashboard'); resultEl = attendanceResultEl; break;
            case 'Manual Entry': resultEl = manualCodeResult; break;
            default: showView('dashboard'); resultEl = attendanceResultEl;
        }
        resultEl.textContent = message;
        resultEl.className = type === 'success' ? 'result-success' : 'result-error';
    }

    // --- UNCHANGED FUNCTIONS (for completeness) ---
    function startScanner() { showView('scanner'); scannerStatus.textContent = 'Starting camera...'; navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then(stream => { videoStream = stream; videoEl.srcObject = stream; videoEl.play(); scannerStatus.textContent = 'Point camera at the QR code...'; animationFrameId = requestAnimationFrame(tick); }).catch(err => { console.error("Camera Error:", err); scannerStatus.textContent = 'Could not access camera. Please grant permission.'; }); }
    async function handleManualCodeSubmit() { const code = manualCodeInput.value.trim(); if (code.length !== 6 || isNaN(code)) { manualCodeResult.textContent = 'Please enter a valid 6-digit code.'; return; } submitManualCodeBtn.disabled = true; submitManualCodeBtn.textContent = 'Verifying...'; manualCodeResult.textContent = ''; const { data: activeSessions, error } = await db.from('sessions').select(`id, current_manual_code, classes (start_roll_no, end_roll_no)`).eq('status', 'Active').eq('session_date', new Date().toISOString().slice(0, 10)); if (error || activeSessions.length === 0) { manualCodeResult.textContent = 'No active attendance session found.'; resetSubmitButton(); return; } const studentRollNumber = parseInt(loggedInRollNo); const validSession = activeSessions.find(s => studentRollNumber >= s.classes.start_roll_no && studentRollNumber <= s.classes.end_roll_no && s.current_manual_code === code); if (!validSession) { manualCodeResult.textContent = 'Invalid code or no active session for your roll number.'; resetSubmitButton(); return; } await markAttendance(validSession.id, 'Manual Entry'); resetSubmitButton(); }
    async function markAttendance(sessionId, method) { const { error: insertError } = await db.from('attendance_records').insert({ session_id: sessionId, roll_no: parseInt(loggedInRollNo), device_fingerprint: deviceFingerprint }); if (insertError) { console.error('Insert Error:', insertError); if (insertError.message.includes('attendance_records_session_id_roll_no_key')) { showResult(`You are already marked present, Roll No: ${loggedInRollNo}.`, 'success', method); } else if (insertError.message.includes('attendance_records_session_id_device_fingerprint_key')) { showResult('This device has already been used for this session. Attempt flagged.', 'error', method); } else { showResult('An error occurred. The session may be inactive or your roll number is invalid for this class.', 'error', method); } } else { showResult(`Success, Roll No: ${loggedInRollNo}! You are marked present.`, 'success', method); } }
});
