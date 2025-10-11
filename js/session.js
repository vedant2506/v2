// js/session.js

document.addEventListener('DOMContentLoaded', () => {
    // --- GLOBAL VARIABLES & STATE ---
    const sessionDetails = JSON.parse(sessionStorage.getItem('activeSession'));
    if (!sessionDetails || !sessionDetails.sessionId) {
        alert('No active session found. Redirecting to dashboard.');
        window.location.href = 'dashboard.html';
        return;
    }
    
    const CODE_REFRESH_INTERVAL = parseInt(sessionDetails.qrSpeed) || 15;
    let countdown = CODE_REFRESH_INTERVAL;
    let timerInterval;
    let qrCodeInstance = null;
    let realtimeChannel = null;

    // --- DOM ELEMENTS ---
    const sessionClassTitleEl = document.getElementById('session-class-title');
    const qrcodeEl = document.getElementById('qrcode');
    const manualCodeEl = document.getElementById('manual-code');
    const timerEl = document.getElementById('timer');
    const endSessionBtn = document.getElementById('end-session-btn');
    const presentCountEl = document.getElementById('present-count');
    const livePresentListEl = document.getElementById('live-present-list');
    
    // --- INITIALIZATION ---
    fetchSessionDetails();
    generateAndDisplayCodes(); // Generate the first code
    startTimer();
    listenForAttendance();
    
    // --- EVENT LISTENERS ---
    endSessionBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to end this session?')) {
            sessionStorage.removeItem('activeSession');
            if (realtimeChannel) {
                db.removeChannel(realtimeChannel);
            }
            // Clear the manual code from the database on session end
            db.from('sessions').update({ current_manual_code: null }).eq('id', sessionDetails.sessionId).then();
            window.location.href = 'dashboard.html';
        }
    });

    // --- FUNCTIONS ---
    async function fetchSessionDetails() {
        const { data, error } = await db
            .from('sessions')
            .select(`classes (subject_name, division, batch, class_type)`)
            .eq('id', sessionDetails.sessionId)
            .single();

        if (error || !data) {
            console.error('Error fetching session details:', error);
            sessionClassTitleEl.textContent = 'Error: Could not load session details.';
            return;
        }

        const classInfo = data.classes;
        sessionClassTitleEl.textContent = `Live Session: ${classInfo.subject_name} - ${classInfo.division} ${classInfo.batch ? `(${classInfo.batch})` : ''}`;
    }

     // Find this function...
    async function generateAndDisplayCodes() {
        // ...and replace it with this original, stable version.

        const timestamp = Date.now();
        const manualCode = timestamp.toString().slice(-6);
        
        const { error } = await db
            .from('sessions')
            .update({ current_manual_code: manualCode })
            .eq('id', sessionDetails.sessionId);

        if (error) {
            console.error("Failed to update manual code in DB", error);
            manualCodeEl.textContent = "ERROR";
            return;
        }

        manualCodeEl.textContent = manualCode;

        // --- THE ROLLBACK IS HERE ---
        // The QR code data is now back to the simple, raw format.
        const qrData = `${sessionDetails.sessionId}|${timestamp}`;

        qrcodeEl.innerHTML = ''; 
        qrCodeInstance = new QRCode(qrcodeEl, {
            text: qrData,
            width: 256,
            height: 256,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    }

    function startTimer() {
        timerInterval = setInterval(() => {
            countdown--;
            timerEl.textContent = `New code in ${countdown} seconds...`;
            if (countdown <= 0) {
                countdown = CODE_REFRESH_INTERVAL;
                generateAndDisplayCodes();
            }
        }, 1000);
    }
    
    async function listenForAttendance() {
        const { data: initialData, error } = await db
            .from('attendance_records')
            .select('roll_no')
            .eq('session_id', sessionDetails.sessionId)
            .order('marked_at');

        if (error) {
            console.error("Error fetching initial attendance:", error);
            return;
        }
        
        updateLiveList(initialData);

        realtimeChannel = db.channel(`session_${sessionDetails.sessionId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'attendance_records', filter: `session_id=eq.${sessionDetails.sessionId}` },
                (payload) => { addRollToList(payload.new.roll_no); }
            )
            .subscribe();
    }

    function updateLiveList(records) {
        livePresentListEl.innerHTML = '';
        records.forEach(record => {
            const li = document.createElement('li');
            li.textContent = `Roll No: ${record.roll_no}`;
            livePresentListEl.appendChild(li);
        });
        presentCountEl.textContent = records.length;
    }

    function addRollToList(rollNo) {
        const li = document.createElement('li');
        li.textContent = `Roll No: ${rollNo}`;
        livePresentListEl.prepend(li);
        presentCountEl.textContent = parseInt(presentCountEl.textContent) + 1;
    }
});