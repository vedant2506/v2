// js/dashboard.js

document.addEventListener('DOMContentLoaded', () => {
    // --- GLOBAL VARIABLES & STATE ---
    const faculty = JSON.parse(sessionStorage.getItem('loggedInFaculty'));
    let currentClasses = []; // To store fetched classes

    // --- DOM ELEMENTS ---
    const welcomeMessage = document.getElementById('welcome-message');
    const logoutBtn = document.getElementById('logout-btn');

    // Create Class Form Elements
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
    
    // Mark Off Form Elements
    const showMarkOffFormBtn = document.getElementById('show-mark-off-form-btn');
    const markOffFormContainer = document.getElementById('mark-off-form-container');
    const markOffClassSelect = document.getElementById('mark-off-class-select');
    const markOffDateInput = document.getElementById('mark-off-date');
    const markOffReasonSelect = document.getElementById('mark-off-reason');
    const saveMarkOffBtn = document.getElementById('save-mark-off-btn');
    const cancelMarkOffBtn = document.getElementById('cancel-mark-off-btn');

    // Class List
    const classListContainer = document.getElementById('class-list-container');
    const loadingClassesMsg = document.getElementById('loading-classes-msg');

    // Session Modal Elements
    const sessionModal = document.getElementById('session-modal');
    const modalClassTitle = document.getElementById('modal-class-title');
    const modalStartTimeInput = document.getElementById('modal-start-time');
    const modalEndTimeInput = document.getElementById('modal-end-time');
    const modalQrSpeedInput = document.getElementById('modal-qr-speed');
    const confirmStartSessionBtn = document.getElementById('confirm-start-session-btn');
    const cancelModalBtn = document.getElementById('cancel-modal-btn');
    
    // History Modal Elements
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

    // --- FUNCTIONS ---

    async function fetchClasses() {
        loadingClassesMsg.style.display = 'block';
        classListContainer.innerHTML = ''; // Clear existing list

        const { data, error } = await db
            .from('classes')
            .select('*')
            .eq('faculty_id', faculty.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching classes:', error);
            loadingClassesMsg.textContent = 'Error loading classes.';
            return;
        }

        currentClasses = data;
        loadingClassesMsg.style.display = 'none';
        
        if (data.length === 0) {
            classListContainer.innerHTML = '<p>You have not created any classes yet.</p>';
        } else {
            renderClasses(data);
        }
    }

    function renderClasses(classes) {
        classListContainer.innerHTML = ''; // Clear just in case
        classes.forEach(cls => {
            const classItem = document.createElement('div');
            classItem.className = 'class-item';
            classItem.innerHTML = `
                <div class="class-item-details">
                    <h4>${cls.subject_name} - ${cls.division} ${cls.class_type === 'Lab' ? `(${cls.batch})` : ''}</h4>
                    <p>Roll No: ${cls.start_roll_no} to ${cls.end_roll_no}</p>
                    <p>Time: ${cls.default_start_time} - ${cls.default_end_time}</p>
                </div>
                <div class="class-item-actions">
                    <button class="start-session-btn" data-id="${cls.id}">Start Session</button>
                    <button class="view-history-btn" data-id="${cls.id}">View History</button>
                    <button class="delete-btn" data-id="${cls.id}">Delete</button>
                </div>
            `;
            classListContainer.appendChild(classItem);
        });

        // Add event listeners to the new buttons
        document.querySelectorAll('.start-session-btn').forEach(btn => btn.addEventListener('click', handleStartSessionClick));
        document.querySelectorAll('.view-history-btn').forEach(btn => btn.addEventListener('click', handleViewHistoryClick));
        document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', handleDeleteClassClick));
    }

    async function saveClass() {
        // Simple validation
        const requiredFields = [subjectNameInput, divisionInput, startRollNoInput, endRollNoInput, defaultStartTimeInput, defaultEndTimeInput];
        if (requiredFields.some(input => !input.value)) {
            alert('Please fill all required fields.');
            return;
        }

        saveClassBtn.disabled = true;
        saveClassBtn.textContent = 'Saving...';

        const newClass = {
            faculty_id: faculty.id,
            subject_name: subjectNameInput.value.trim(),
            division: divisionInput.value.trim(),
            class_type: classTypeSelect.value,
            batch: classTypeSelect.value === 'Lab' ? batchInput.value.trim() : null,
            start_roll_no: parseInt(startRollNoInput.value),
            end_roll_no: parseInt(endRollNoInput.value),
            default_start_time: defaultStartTimeInput.value,
            default_end_time: defaultEndTimeInput.value,
        };

        const { error } = await db.from('classes').insert(newClass);

        if (error) {
            console.error('Error saving class:', error);
            alert('Could not save class. Please try again.');
        } else {
            // Success
            createClassFormContainer.style.display = 'none';
            showCreateClassFormBtn.style.display = 'block';
            resetCreateClassForm();
            fetchClasses(); // Refresh the list
        }
        
        saveClassBtn.disabled = false;
        saveClassBtn.textContent = 'Save Class';
    }

    function resetCreateClassForm() {
        subjectNameInput.value = '';
        divisionInput.value = '';
        classTypeSelect.value = 'Lecture';
        batchInput.value = '';
        batchInput.style.display = 'none';
        startRollNoInput.value = '';
        endRollNoInput.value = '';
        defaultStartTimeInput.value = '';
        defaultEndTimeInput.value = '';
    }

    function handleStartSessionClick(event) {
        const classId = parseInt(event.target.dataset.id);
        const selectedClass = currentClasses.find(c => c.id === classId);
        if (selectedClass) {
            modalClassTitle.textContent = `Start Session for ${selectedClass.subject_name}`;
            modalStartTimeInput.value = selectedClass.default_start_time;
            modalEndTimeInput.value = selectedClass.default_end_time;
            confirmStartSessionBtn.dataset.classId = classId;
            sessionModal.style.display = 'flex';
        }
    }

    async function startSession() {
        const classId = parseInt(confirmStartSessionBtn.dataset.classId);
        const newSession = {
            class_id: classId,
            start_time: modalStartTimeInput.value,
            end_time: modalEndTimeInput.value,
            status: 'Active'
        };

        confirmStartSessionBtn.disabled = true;
        confirmStartSessionBtn.textContent = 'Starting...';

        const { data, error } = await db.from('sessions').insert(newSession).select().single();

        if (error) {
            console.error('Error starting session:', error);
            alert('Could not start session.');
            confirmStartSessionBtn.disabled = false;
            confirmStartSessionBtn.textContent = 'Confirm & Begin Session';
        } else {
            // Success! Store session details and redirect
            const sessionDetails = {
                sessionId: data.id,
                qrSpeed: modalQrSpeedInput.value
            };
            sessionStorage.setItem('activeSession', JSON.stringify(sessionDetails));
            window.location.href = 'session.html';
        }
    }
    
    async function handleDeleteClassClick(event) {
        const classId = parseInt(event.target.dataset.id);
        const selectedClass = currentClasses.find(c => c.id === classId);
        
        if (confirm(`Are you sure you want to delete "${selectedClass.subject_name}"? This will also delete all associated attendance history.`)) {
            const { error } = await db.from('classes').delete().eq('id', classId);
            if (error) {
                console.error('Error deleting class:', error);
                alert('Could not delete class.');
            } else {
                fetchClasses(); // Refresh the list
            }
        }
    }

    function populateMarkOffSelect() {
        markOffClassSelect.innerHTML = '<option value="">-- Select a Class --</option>';
        currentClasses.forEach(cls => {
            const option = document.createElement('option');
            option.value = cls.id;
            option.textContent = `${cls.subject_name} - ${cls.division} ${cls.batch ? `(${cls.batch})` : ''}`;
            markOffClassSelect.appendChild(option);
        });
        markOffDateInput.valueAsDate = new Date(); // Default to today
    }

    async function markSessionAsOff() {
        const classId = markOffClassSelect.value;
        const date = markOffDateInput.value;
        const reason = markOffReasonSelect.value;

        if (!classId || !date) {
            alert('Please select a class and a date.');
            return;
        }
        
        saveMarkOffBtn.disabled = true;
        saveMarkOffBtn.textContent = 'Saving...';
        
        // Check if a session (active or off) already exists for this class on this date
        const { data: existing, error: checkError } = await db.from('sessions')
            .select('id')
            .eq('class_id', classId)
            .eq('session_date', date);

        if (checkError) {
             console.error('Error checking existing session:', checkError);
             alert('An error occurred. Please try again.');
             saveMarkOffBtn.disabled = false;
             saveMarkOffBtn.textContent = 'Confirm';
             return;
        }

        if (existing.length > 0) {
            alert('A session or an off-day record already exists for this class on the selected date.');
            saveMarkOffBtn.disabled = false;
            saveMarkOffBtn.textContent = 'Confirm';
            return;
        }

        const selectedClass = currentClasses.find(c => c.id == classId);
        const newOffSession = {
            class_id: classId,
            session_date: date,
            start_time: selectedClass.default_start_time,
            end_time: selectedClass.default_end_time,
            status: reason
        };

        const { error } = await db.from('sessions').insert(newOffSession);

        if (error) {
            console.error('Error marking session as off:', error);
            alert('Could not save the record.');
        } else {
            alert('Successfully marked as off.');
            markOffFormContainer.style.display = 'none';
            showMarkOffFormBtn.style.display = 'block';
        }

        saveMarkOffBtn.disabled = false;
        saveMarkOffBtn.textContent = 'Confirm';
    }

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

            if (session.status !== 'Active') {
                entryDiv.innerHTML = `<p><strong>${formattedDate}</strong></p><p>${session.status}</p>`;
            } else {
                const { data: records, error: recError } = await db.from('attendance_records')
                    .select('roll_no')
                    .eq('session_id', session.id);
                
                const totalStudents = selectedClass.end_roll_no - selectedClass.start_roll_no + 1;
                const presentCount = recError ? 'N/A' : records.length;
                
                let report = `<p><strong>${formattedDate}</strong> (${session.start_time} - ${session.end_time})</p>`;
                report += `<p>Present: ${presentCount} / ${totalStudents}</p>`;
                
                // Calculate and list absentees
                const presentRolls = records.map(r => r.roll_no);
                const absentRolls = [];
                for (let i = selectedClass.start_roll_no; i <= selectedClass.end_roll_no; i++) {
                    if (!presentRolls.includes(i)) {
                        absentRolls.push(i);
                    }
                }
                if (absentRolls.length > 0) {
                    report += `<p><strong>Absent (${absentRolls.length}):</strong> ${absentRolls.join(', ')}</p>`;
                } else {
                    report += `<p><strong>Full Attendance!</strong></p>`;
                }

                entryDiv.innerHTML = report;
            }
            historyContent.appendChild(entryDiv);
        }
    }
});