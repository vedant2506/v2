// js/student.js





document.addEventListener('DOMContentLoaded', () => {

 // --- NEW: CHECK URL FOR SCAN DATA ON PAGE LOAD ---
    function checkForScanData() {
        const urlParams = new URLSearchParams(window.location.search);
        const scanData = urlParams.get('scan');

        if (scanData) {
            // Data found in URL. Decode it.
            const decodedData = atob(scanData);
            // We need to wait for the user to log in before processing it.
            // So, we store it in sessionStorage.
            sessionStorage.setItem('pendingScanData', decodedData);

            // Clean the URL so it doesn't get reused on refresh
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }
    checkForScanData(); // Run this check as soon as the page loads
    // --- END OF NEW BLOCK ---

    // --- SIMPLE DEVICE FINGERPRINTING ---
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
    let videoStream, animationFrameId;
    const manualCodeStudentInfo = document.getElementById('manual-code-student-info');
    const manualCodeInput = document.getElementById('manual-code-input');
    const submitManualCodeBtn = document.getElementById('submit-manual-code-btn');
    const cancelManualCodeBtn = document.getElementById('cancel-manual-code-btn');
    const manualCodeResult = document.getElementById('manual-code-result');

    // --- INITIALIZATION & STATE ---
    let loggedInRollNo = sessionStorage.getItem('loggedInStudentRoll');
    if (loggedInRollNo) {
        showView('dashboard');
        updateStudentInfo(loggedInRollNo);
    } else { showView('login'); }

    function showView(viewName) {
        Object.values(views).forEach(view => view.style.display = 'none');
        views[viewName].style.display = 'block';
    }
    function updateStudentInfo(rollNo) {
        const infoText = `Logged in as Roll No: ${rollNo}`;
        loggedInStudentEl.textContent = infoText;
        scannerStudentInfo.textContent = infoText;
        manualCodeStudentInfo.textContent = infoText;
    }

    // --- EVENT LISTENERS ---
        loginBtn.addEventListener('click', () => {
        const rollNo = rollInput.value.trim();
        if (rollNo && !isNaN(rollNo)) {
            loggedInRollNo = rollNo;
            sessionStorage.setItem('loggedInStudentRoll', rollNo);
            updateStudentInfo(rollNo);
            
            // --- NEW LOGIC AFTER LOGIN ---
            const pendingData = sessionStorage.getItem('pendingScanData');
            if (pendingData) {
                sessionStorage.removeItem('pendingScanData'); // Use it once and remove it
                handleQrCodeData(pendingData); // Process the scanned data immediately
            } else {
                showView('dashboard'); // Normal login flow
            }
            // --- END OF NEW LOGIC ---

            loginError.textContent = '';
        } else {
            loginError.textContent = 'Please enter a valid Roll Number.';
        }
    });
    studentLogoutBtn.addEventListener('click', () => {
        loggedInRollNo = null;
        sessionStorage.removeItem('loggedInStudentRoll');
        rollInput.value = '';
        showView('login');
    });
    scanQrBtn.addEventListener('click', startScanner);
    cancelScanBtn.addEventListener('click', stopScanner);
    enterManualCodeBtn.addEventListener('click', () => {
        manualCodeInput.value = '';
        manualCodeResult.textContent = '';
        showView('manualCode');
    });
    cancelManualCodeBtn.addEventListener('click', () => showView('dashboard'));
    submitManualCodeBtn.addEventListener('click', handleManualCodeSubmit);

    // --- SCANNER LOGIC ---
    function startScanner() {
        showView('scanner');
        scannerStatus.textContent = 'Starting camera...';
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            .then(stream => {
                videoStream = stream;
                videoEl.srcObject = stream;
                videoEl.play();
                scannerStatus.textContent = 'Point camera at the QR code...';
                animationFrameId = requestAnimationFrame(tick);
            }).catch(err => {
                console.error("Camera Error:", err);
                scannerStatus.textContent = 'Could not access camera. Please grant permission.';
            });
    }
    function stopScanner() {
        if (videoStream) { videoStream.getTracks().forEach(track => track.stop()); }
        if (animationFrameId) { cancelAnimationFrame(animationFrameId); }
        showView('dashboard');
    }
    function tick() {
        if (videoEl.readyState === videoEl.HAVE_ENOUGH_DATA) {
            const canvas = document.createElement('canvas');
            canvas.width = videoEl.videoWidth; canvas.height = videoEl.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            if (code) {
                stopScanner();
                handleQrCodeData(code.data);
                return;
            }
        }
        animationFrameId = requestAnimationFrame(tick);
    }
    
    // --- MANUAL CODE LOGIC (REVISED) ---
    async function handleManualCodeSubmit() {
        const code = manualCodeInput.value.trim();
        if (code.length !== 6 || isNaN(code)) {
            manualCodeResult.textContent = 'Please enter a valid 6-digit code.';
            return;
        }

        submitManualCodeBtn.disabled = true;
        submitManualCodeBtn.textContent = 'Verifying...';
        manualCodeResult.textContent = '';

        const { data: activeSessions, error } = await db
            .from('sessions')
            .select(`id, current_manual_code, classes (start_roll_no, end_roll_no)`)
            .eq('status', 'Active')
            .eq('session_date', new Date().toISOString().slice(0, 10));
            
        // // --- DEBUGGING LOGS ---
        // console.log("Student's Roll Number:", loggedInRollNo, `(Type: ${typeof loggedInRollNo})`);
        // console.log("Manual code entered:", code);
        // console.log("Active sessions fetched from DB:", activeSessions);
        // // --- END DEBUGGING LOGS ---

        if (error || activeSessions.length === 0) {
            manualCodeResult.textContent = 'No active attendance session found.';
            resetSubmitButton();
            return;
        }
        
        // ** THE CRITICAL FIX IS HERE: Convert loggedInRollNo to a number **
        const studentRollNumber = parseInt(loggedInRollNo);

        const validSession = activeSessions.find(s => {
    

            return studentRollNumber >= s.classes.start_roll_no && 
                   studentRollNumber <= s.classes.end_roll_no &&
                   s.current_manual_code === code;
        });

        if (!validSession) {
            manualCodeResult.textContent = 'Invalid code or no active session for your roll number.';
            resetSubmitButton();
            return;
        }

        await markAttendance(validSession.id, 'Manual Entry');
        resetSubmitButton();
    }

    function resetSubmitButton() {
        submitManualCodeBtn.disabled = false;
        submitManualCodeBtn.textContent = 'Submit Attendance';
    }

    // --- CORE ATTENDANCE HANDLING ---
    async function handleQrCodeData(data) {
        const parts = data.split('|');
        const [sessionId, timestamp] = parts;

        if (parts.length !== 2 || !sessionId || !timestamp) {
            showResult('Invalid QR code format.', 'error', 'QR Scan');
            return;
        }
        
        const codeAgeMs = Date.now() - parseInt(timestamp);
        if (codeAgeMs > 20000) { // 20-second window
            showResult('Expired QR code. Please scan the new one.', 'error', 'QR Scan');
            return;
        }

        await markAttendance(parseInt(sessionId), 'QR Scan');
    }

    async function markAttendance(sessionId, method) {
        const { error: insertError } = await db
            .from('attendance_records')
            .insert({
                session_id: sessionId,
                roll_no: parseInt(loggedInRollNo),
                device_fingerprint: deviceFingerprint
            });
            
        if (insertError) {
            console.error('Insert Error:', insertError);
            if (insertError.message.includes('attendance_records_session_id_roll_no_key')) {
                showResult(`You are already marked present, Roll No: ${loggedInRollNo}.`, 'success', method);
            } else if (insertError.message.includes('attendance_records_session_id_device_fingerprint_key')) {
                showResult('This device has already been used for this session. Attempt flagged.', 'error', method);
            } else {
                showResult('An error occurred. The session may be inactive or your roll number is invalid for this class.', 'error', method);
            }
        } else {
            showResult(`Success, Roll No: ${loggedInRollNo}! You are marked present.`, 'success', method);
        }
    }
    
    function showResult(message, type, method) {
        let resultEl = (method === 'QR Scan') ? attendanceResultEl : manualCodeResult;
        
        if (method === 'QR Scan') {
            showView('dashboard');
        }
        
        resultEl.textContent = message;
        resultEl.className = type === 'success' ? 'result-success' : 'result-error';
    }
});