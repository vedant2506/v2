// js/dashboard.js

document.addEventListener('DOMContentLoaded', () => {
    // ... (keep all the existing code from the top down to the EVENT LISTENERS)
    const faculty = JSON.parse(sessionStorage.getItem('loggedInFaculty'));
    let currentClasses = []; // To store fetched classes

    // --- DOM ELEMENTS ---
    const welcomeMessage = document.getElementById('welcome-message');
    const logoutBtn = document.getElementById('logout-btn');
    const showCreateClassFormBtn = document.getElementById('show-create-class-form-btn');
    const createClassFormContainer = document.getElementById('create-class-form-container');
    const subjectNameInput = document.getElementById('subject-name');
    const divisionInput = document.getElementById('division');
    const classTypeSelect = document.getElementById('class-type');
    const batchInput = document.getElementById('batch');
    const startRollNoInput = document.getElementById('start-roll-no');
    const endRollNoInput = document.getElementById('end-roll-no');
    const defaultStartTimeInput = document.getElementById('default-start-time');
    const defaultEndTimeInput = document.getElementById('default-end-time');
    const saveClassBtn = document.getElementById('save-class-btn');
    const cancelCreateClassBtn = document.getElementById('cancel-create-class-btn');
    const showMarkOffFormBtn = document.getElementById('show-mark-off-form-btn');
    const markOffFormContainer = document.getElementById('mark-off-form-container');
    const markOffClassSelect = document.getElementById('mark-off-class-select');
    const markOffDateInput = document.getElementById('mark-off-date');
    const markOffReasonSelect = document.getElementById('mark-off-reason');
    const saveMarkOffBtn = document.getElementById('save-mark-off-btn');
    const cancelMarkOffBtn = document.getElementById('cancel-mark-off-btn');
    const classListContainer = document.getElementById('class-list-container');
    const loadingClassesMsg = document.getElementById('loading-classes-msg');
    const sessionModal = document.getElementById('session-modal');
    const modalClassTitle = document.getElementById('modal-class-title');
    const modalStartTimeInput = document.getElementById('modal-start-time');
    const modalEndTimeInput = document.getElementById('modal-end-time');
    const modalQrSpeedInput = document.getElementById('modal-qr-speed');
    const confirmStartSessionBtn = document.getElementById('confirm-start-session-btn');
    const cancelModalBtn = document.getElementById('cancel-modal-btn');
    const historyModal = document.getElementById('history-modal');
    const historyClassTitle = document.getElementById('history-class-title');
    const historyContent = document.getElementById('history-content');
    const closeHistoryModalBtn = document.getElementById('close-history-modal-btn');

    // --- INITIALIZATION ---
    if (faculty) {
        welcomeMessage.textContent = `Welcome, ${faculty.username}`;
        fetchClasses();
    }

    // --- EVENT LISTENERS ---
    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('loggedInFaculty');
        window.location.href = 'faculty.html';
    });

    showCreateClassFormBtn.addEventListener('click', () => {
        createClassFormContainer.style.display = 'block';
        showCreateClassFormBtn.style.display = 'none';
    });

    cancelCreateClassBtn.addEventListener('click', () => {
        createClassFormContainer.style.display = 'none';
        showCreateClassFormBtn.style.display = 'block';
    });

    classTypeSelect.addEventListener('change', () => {
        batchInput.style.display = classTypeSelect.value === 'Lab' ? 'block' : 'none';
    });

    saveClassBtn.addEventListener('click', saveClass);

    showMarkOffFormBtn.addEventListener('click', () => {
        populateMarkOffSelect();
        markOffFormContainer.style.display = 'block';
        showMarkOffFormBtn.style.display = 'none';
    });
    
    cancelMarkOffBtn.addEventListener('click', () => {
        markOffFormContainer.style.display = 'none';
        showMarkOffFormBtn.style.display = 'block';
    });

    saveMarkOffBtn.addEventListener('click', markSessionAsOff);

    cancelModalBtn.addEventListener('click', () => sessionModal.style.display = 'none');
    closeHistoryModalBtn.addEventListener('click', () => historyModal.style.display = 'none');
    confirmStartSessionBtn.addEventListener('click', startSession);

    // --- NEW: EVENT LISTENER FOR COPY BUTTON (using event delegation) ---
    historyContent.addEventListener('click', function(event) {
        if (event.target && event.target.classList.contains('copy-report-btn')) {
            const reportText = event.target.dataset.reportText;
            navigator.clipboard.writeText(reportText).then(() => {
                const originalText = event.target.textContent;
                event.target.textContent = 'Copied!';
                setTimeout(() => {
                    event.target.textContent = originalText;
                }, 2000); // Revert back after 2 seconds
            }).catch(err => {
                console.error('Failed to copy text: ', err);
                alert('Failed to copy report.');
            });
        }
    });

    // --- FUNCTIONS (Most are unchanged) ---

        // Find this function in your js/dashboard.js file...
    async function fetchClasses() {
        // ...and REPLACE it with this corrected version.

        const classListBody = document.getElementById('class-list-body');
        const loadingMsg = document.getElementById('loading-classes-msg');
        
        loadingMsg.textContent = 'Loading classes...';
        loadingMsg.style.display = 'block';
        classListBody.innerHTML = ''; // Clear only the table body

        const { data, error } = await db
            .from('classes')
            .select('*')
            .eq('faculty_id', faculty.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching classes:', error);
            loadingMsg.textContent = 'Error loading classes.';
            return;
        }

        currentClasses = data;
        
        if (data.length === 0) {
            loadingMsg.textContent = 'You have not created any classes yet.';
        } else {
            loadingMsg.style.display = 'none'; // Hide loading message only on success
            renderClasses(data);
        }
    }

  
function renderClasses(classes) {
  

    const classListBody = document.getElementById('class-list-body');
    classListBody.innerHTML = ''; // Clear the table body

    if (classes.length === 0) {
        loadingClassesMsg.textContent = 'You have not created any classes yet.';
        loadingClassesMsg.style.display = 'block';
        return;
    }
    loadingClassesMsg.style.display = 'none';

    classes.forEach(cls => {
        const row = document.createElement('tr');

        // Note the `data-label` attribute. This is used by the CSS for the mobile view.
        row.innerHTML = `
            <td data-label="Subject">${cls.subject_name}</td>
            <td data-label="Div/Batch">${cls.division} ${cls.class_type === 'Lab' ? `(${cls.batch})` : ''}</td>
            <td data-label="Timings">${cls.default_start_time} - ${cls.default_end_time}</td>
            <td data-label="Roster">${cls.start_roll_no} - ${cls.end_roll_no}</td>
            <td data-label="Actions" class="actions-cell">
                <button class="action-btn start-session-btn" data-id="${cls.id}">Start</button>
                <button class="action-btn secondary view-history-btn" data-id="${cls.id}">History</button>
                <button class="action-btn danger delete-btn" data-id="${cls.id}"><i class="fas fa-trash"></i></button>
            </td>
        `;
        classListBody.appendChild(row);
    });

    // Re-attach event listeners to the new buttons
    document.querySelectorAll('.start-session-btn').forEach(btn => btn.addEventListener('click', handleStartSessionClick));
    document.querySelectorAll('.view-history-btn').forEach(btn => btn.addEventListener('click', handleViewHistoryClick));
    document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', handleDeleteClassClick));
}

    async function saveClass() {
        // ... (this function is unchanged)
        const requiredFields = [subjectNameInput, divisionInput, startRollNoInput, endRollNoInput, defaultStartTimeInput, defaultEndTimeInput];
        if (requiredFields.some(input => !input.value)) {
            alert('Please fill all required fields.');
            return;
        }
        saveClassBtn.disabled = true;
        saveClassBtn.textContent = 'Saving...';
        const newClass = { faculty_id: faculty.id, subject_name: subjectNameInput.value.trim(), division: divisionInput.value.trim(), class_type: classTypeSelect.value, batch: classTypeSelect.value === 'Lab' ? batchInput.value.trim() : null, start_roll_no: parseInt(startRollNoInput.value), end_roll_no: parseInt(endRollNoInput.value), default_start_time: defaultStartTimeInput.value, default_end_time: defaultEndTimeInput.value };
        const { error } = await db.from('classes').insert(newClass);
        if (error) { console.error('Error saving class:', error); alert('Could not save class. Please try again.'); } else { createClassFormContainer.style.display = 'none'; showCreateClassFormBtn.style.display = 'block'; resetCreateClassForm(); fetchClasses(); }
        saveClassBtn.disabled = false;
        saveClassBtn.textContent = 'Save Class';
    }
    
    function resetCreateClassForm() {
        // ... (this function is unchanged)
        subjectNameInput.value = ''; divisionInput.value = ''; classTypeSelect.value = 'Lecture'; batchInput.value = ''; batchInput.style.display = 'none'; startRollNoInput.value = ''; endRollNoInput.value = ''; defaultStartTimeInput.value = ''; defaultEndTimeInput.value = '';
    }

    function handleStartSessionClick(event) {
        // ... (this function is unchanged)
        const classId = parseInt(event.target.dataset.id);
        const selectedClass = currentClasses.find(c => c.id === classId);
        if (selectedClass) { modalClassTitle.textContent = `Start Session for ${selectedClass.subject_name}`; modalStartTimeInput.value = selectedClass.default_start_time; modalEndTimeInput.value = selectedClass.default_end_time; confirmStartSessionBtn.dataset.classId = classId; sessionModal.style.display = 'flex'; }
    }

    async function startSession() {
        // ... (this function is unchanged)
        const classId = parseInt(confirmStartSessionBtn.dataset.classId);
        const newSession = { class_id: classId, start_time: modalStartTimeInput.value, end_time: modalEndTimeInput.value, status: 'Active' };
        confirmStartSessionBtn.disabled = true;
        confirmStartSessionBtn.textContent = 'Starting...';
        const { data, error } = await db.from('sessions').insert(newSession).select().single();
        if (error) { console.error('Error starting session:', error); alert('Could not start session.'); confirmStartSessionBtn.disabled = false; confirmStartSessionBtn.textContent = 'Confirm & Begin Session'; } else { const sessionDetails = { sessionId: data.id, qrSpeed: modalQrSpeedInput.value }; sessionStorage.setItem('activeSession', JSON.stringify(sessionDetails)); window.location.href = 'session.html'; }
    }
    
    async function handleDeleteClassClick(event) {
        // ... (this function is unchanged)
        const classId = parseInt(event.target.dataset.id);
        const selectedClass = currentClasses.find(c => c.id === classId);
        if (confirm(`Are you sure you want to delete "${selectedClass.subject_name}"? This will also delete all associated attendance history.`)) { const { error } = await db.from('classes').delete().eq('id', classId); if (error) { console.error('Error deleting class:', error); alert('Could not delete class.'); } else { fetchClasses(); } }
    }

    function populateMarkOffSelect() {
        // ... (this function is unchanged)
        markOffClassSelect.innerHTML = '<option value="">-- Select a Class --</option>';
        currentClasses.forEach(cls => { const option = document.createElement('option'); option.value = cls.id; option.textContent = `${cls.subject_name} - ${cls.division} ${cls.batch ? `(${cls.batch})` : ''}`; markOffClassSelect.appendChild(option); });
        markOffDateInput.valueAsDate = new Date();
    }

    async function markSessionAsOff() {
        // ... (this function is unchanged)
        const classId = markOffClassSelect.value; const date = markOffDateInput.value; const reason = markOffReasonSelect.value;
        if (!classId || !date) { alert('Please select a class and a date.'); return; }
        saveMarkOffBtn.disabled = true; saveMarkOffBtn.textContent = 'Saving...';
        const { data: existing, error: checkError } = await db.from('sessions').select('id').eq('class_id', classId).eq('session_date', date);
        if (checkError) { console.error('Error checking existing session:', checkError); alert('An error occurred. Please try again.'); saveMarkOffBtn.disabled = false; saveMarkOffBtn.textContent = 'Confirm'; return; }
        if (existing.length > 0) { alert('A session or an off-day record already exists for this class on the selected date.'); saveMarkOffBtn.disabled = false; saveMarkOffBtn.textContent = 'Confirm'; return; }
        const selectedClass = currentClasses.find(c => c.id == classId);
        const newOffSession = { class_id: classId, session_date: date, start_time: selectedClass.default_start_time, end_time: selectedClass.default_end_time, status: reason };
        const { error } = await db.from('sessions').insert(newOffSession);
        if (error) { console.error('Error marking session as off:', error); alert('Could not save the record.'); } else { alert('Successfully marked as off.'); markOffFormContainer.style.display = 'none'; showMarkOffFormBtn.style.display = 'block'; }
        saveMarkOffBtn.disabled = false; saveMarkOffBtn.textContent = 'Confirm';
    }

    // --- REVISED handleViewHistoryClick function ---
    async function handleViewHistoryClick(event) {
        const classId = parseInt(event.target.dataset.id);
        const selectedClass = currentClasses.find(c => c.id === classId);
        
        historyClassTitle.textContent = `History for ${selectedClass.subject_name}`;
        historyContent.innerHTML = '<p>Loading history...</p>';
        historyModal.style.display = 'flex';

        const { data: sessions, error } = await db.from('sessions')
            .select('id, session_date, status, start_time, end_time')
            .eq('class_id', classId)
            .order('session_date', { ascending: false });

        if (error) {
            historyContent.innerHTML = '<p class="result-error">Could not load history.</p>';
            return;
        }
        if (sessions.length === 0) {
            historyContent.innerHTML = '<p>No history found for this class.</p>';
            return;
        }

        historyContent.innerHTML = ''; // Clear loading message

        for (const session of sessions) {
            const entryDiv = document.createElement('div');
            entryDiv.className = 'history-entry';
            const sessionDate = new Date(session.session_date + 'T00:00:00'); // Avoid timezone issues
            const formattedDate = sessionDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric'});

            let reportHTML = '';
            let reportTextForClipboard = ''; // Variable for the clipboard text

            if (session.status !== 'Active') {
                reportHTML = `<p><strong>${formattedDate}</strong></p><p>${session.status}</p>`;
                reportTextForClipboard = `Attendance Report\nDate: ${formattedDate}\nStatus: ${session.status}`;
            } else {
                const { data: records, error: recError } = await db.from('attendance_records')
                    .select('roll_no')
                    .eq('session_id', session.id);
                
                const totalStudents = selectedClass.end_roll_no - selectedClass.start_roll_no + 1;
                const presentCount = recError ? 0 : records.length;
                
                const presentRolls = records ? records.map(r => r.roll_no) : [];
                const absentRolls = [];
                for (let i = selectedClass.start_roll_no; i <= selectedClass.end_roll_no; i++) {
                    if (!presentRolls.includes(i)) {
                        absentRolls.push(i);
                    }
                }
                
                reportHTML = `<p><strong>${formattedDate}</strong> (${session.start_time} - ${session.end_time})</p>`;
                reportHTML += `<p>Present: ${presentCount} / ${totalStudents}</p>`;
                if (absentRolls.length > 0) {
                    reportHTML += `<p><strong>Absent (${absentRolls.length}):</strong> ${absentRolls.join(', ')}</p>`;
                } else {
                    reportHTML += `<p><strong>Full Attendance!</strong></p>`;
                }

                // Prepare text for clipboard
                reportTextForClipboard = `Attendance Report\n`;
                reportTextForClipboard += `Subject: ${selectedClass.subject_name} - ${selectedClass.division}\n`;
                reportTextForClipboard += `Date: ${formattedDate} (${session.start_time} - ${session.end_time})\n`;
                reportTextForClipboard += `Total Students: ${totalStudents}\n`;
                reportTextForClipboard += `Present: ${presentCount}\n`;
                reportTextForClipboard += `Absent (${absentRolls.length}): ${absentRolls.join(', ')}`;
            }
            
            // Add the button to the HTML, embedding the clipboard text in a data attribute
            entryDiv.innerHTML = reportHTML;
            entryDiv.innerHTML += `<button class="copy-report-btn" data-report-text="${reportTextForClipboard}">Copy Report</button>`;
            
            historyContent.appendChild(entryDiv);
        }
    }
});