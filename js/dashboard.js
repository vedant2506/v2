// js/dashboard.js

document.addEventListener('DOMContentLoaded', () => {
    // --- GLOBAL STATE ---
    const faculty = JSON.parse(sessionStorage.getItem('loggedInFaculty'));
    let currentClasses = [];
    let historyState = {
        allSessions: [],
        filteredSessions: [],
        currentPage: 1,
        entriesPerPage: 10,
        selectedClass: null
    };

    // --- DOM ELEMENTS ---
    const welcomeMessage = document.getElementById('welcome-message');
    const classListBody = document.getElementById('class-list-body');
    const loadingClassesMsg = document.getElementById('loading-classes-msg');
    const historyModal = document.getElementById('history-modal');
    const historyClassTitle = document.getElementById('history-class-title');
    const historyContent = document.getElementById('history-content');
    const closeHistoryModalBtn = document.getElementById('close-history-modal-btn');
    const startDateFilter = document.getElementById('start-date-filter');
    const endDateFilter = document.getElementById('end-date-filter');
    const entriesPerPageSelect = document.getElementById('entries-per-page');
    const historyPagination = document.getElementById('history-pagination');
    
    // All other form/button elements are fetched as needed inside functions

    // --- INITIALIZATION ---
    if (faculty) {
        welcomeMessage.textContent = `Welcome, ${faculty.username}`;
        fetchClasses();
    }

    // --- EVENT LISTENERS ---
    document.getElementById('logout-btn').addEventListener('click', () => { sessionStorage.removeItem('loggedInFaculty'); window.location.href = 'faculty.html'; });
    document.getElementById('show-create-class-form-btn').addEventListener('click', toggleForm('create-class-form-container'));
    document.getElementById('cancel-create-class-btn').addEventListener('click', toggleForm('create-class-form-container'));
    document.getElementById('show-mark-off-form-btn').addEventListener('click', () => { populateMarkOffSelect(); toggleForm('mark-off-form-container')(); });
    document.getElementById('cancel-mark-off-btn').addEventListener('click', toggleForm('mark-off-form-container'));
    document.getElementById('class-type').addEventListener('change', () => { document.getElementById('batch').style.display = document.getElementById('class-type').value === 'Lab' ? 'block' : 'none'; });
    document.getElementById('save-class-btn').addEventListener('click', saveClass);
    document.getElementById('save-mark-off-btn').addEventListener('click', markSessionAsOff);
    document.getElementById('cancel-modal-btn').addEventListener('click', () => document.getElementById('session-modal').style.display = 'none');
    document.getElementById('confirm-start-session-btn').addEventListener('click', startSession);
    closeHistoryModalBtn.addEventListener('click', () => historyModal.style.display = 'none');

    // History filter event listeners
    startDateFilter.addEventListener('change', applyHistoryFilters);
    endDateFilter.addEventListener('change', applyHistoryFilters);
    entriesPerPageSelect.addEventListener('change', (e) => {
        historyState.entriesPerPage = parseInt(e.target.value);
        historyState.currentPage = 1;
        applyHistoryFilters();
    });

    historyContent.addEventListener('click', handleHistoryActions);
    historyPagination.addEventListener('click', handlePaginationClick);


    // --- UI HELPER FUNCTIONS ---
    function toggleForm(containerId) {
        return function() {
            const formContainer = document.getElementById(containerId);
            const isVisible = formContainer.style.display === 'block';
            formContainer.style.display = isVisible ? 'none' : 'block';
            document.getElementById('show-create-class-form-btn').style.display = isVisible ? 'inline-flex' : 'none';
            document.getElementById('show-mark-off-form-btn').style.display = isVisible ? 'inline-flex' : 'none';
        }
    }

    // --- CORE LOGIC: CLASSES ---
    async function fetchClasses() {
        loadingClassesMsg.textContent = 'Loading classes...';
        loadingClassesMsg.style.display = 'block';
        classListBody.innerHTML = '';
        const { data, error } = await db.from('classes').select('*').eq('faculty_id', faculty.id).order('created_at', { ascending: false });
        if (error) {
            console.error('Error fetching classes:', error);
            loadingClassesMsg.textContent = 'Error loading classes.';
            return;
        }
        currentClasses = data;
        if (data.length === 0) {
            loadingClassesMsg.textContent = 'You have not created any classes yet.';
        } else {
            loadingClassesMsg.style.display = 'none';
            renderClasses(data);
        }
    }

    function renderClasses(classes) {
        classListBody.innerHTML = '';
        classes.forEach(cls => {
            const row = document.createElement('tr');
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
        document.querySelectorAll('.start-session-btn').forEach(btn => btn.addEventListener('click', handleStartSessionClick));
        document.querySelectorAll('.view-history-btn').forEach(btn => btn.addEventListener('click', handleViewHistoryClick));
        document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', handleDeleteClassClick));
    }
    
    async function saveClass() {
        const subjectNameInput = document.getElementById('subject-name'),
            divisionInput = document.getElementById('division'),
            startRollNoInput = document.getElementById('start-roll-no'),
            endRollNoInput = document.getElementById('end-roll-no'),
            defaultStartTimeInput = document.getElementById('default-start-time'),
            defaultEndTimeInput = document.getElementById('default-end-time'),
            requiredFields = [subjectNameInput, divisionInput, startRollNoInput, endRollNoInput, defaultStartTimeInput, defaultEndTimeInput];
        if (requiredFields.some(input => !input.value)) {
            alert('Please fill all required fields.');
            return;
        }
        const saveClassBtn = document.getElementById('save-class-btn');
        saveClassBtn.disabled = true;
        saveClassBtn.textContent = 'Saving...';
        const classTypeSelect = document.getElementById('class-type'),
            batchInput = document.getElementById('batch'),
            newClass = {
                faculty_id: faculty.id, subject_name: subjectNameInput.value.trim(), division: divisionInput.value.trim(),
                class_type: classTypeSelect.value, batch: classTypeSelect.value === 'Lab' ? batchInput.value.trim() : null,
                start_roll_no: parseInt(startRollNoInput.value), end_roll_no: parseInt(endRollNoInput.value),
                default_start_time: defaultStartTimeInput.value, default_end_time: defaultEndTimeInput.value
            };
        const { error } = await db.from('classes').insert(newClass);
        if (error) {
            console.error('Error saving class:', error);
            alert('Could not save class. Please try again.');
        } else {
            document.getElementById('create-class-form-container').style.display = 'none';
            document.getElementById('show-create-class-form-btn').style.display = 'inline-flex';
            resetCreateClassForm();
            fetchClasses();
        }
        saveClassBtn.disabled = false;
        saveClassBtn.textContent = 'Save Class';
    }

    function resetCreateClassForm() {
        document.getElementById('subject-name').value = '';
        document.getElementById('division').value = '';
        document.getElementById('class-type').value = 'Lecture';
        const batchInput = document.getElementById('batch');
        batchInput.value = '';
        batchInput.style.display = 'none';
        document.getElementById('start-roll-no').value = '';
        document.getElementById('end-roll-no').value = '';
        document.getElementById('default-start-time').value = '';
        document.getElementById('default-end-time').value = '';
    }

    async function handleDeleteClassClick(event) {
        const classId = parseInt(event.target.dataset.id);
        const selectedClass = currentClasses.find(c => c.id === classId);
        if (confirm(`Are you sure you want to delete "${selectedClass.subject_name}"? This will also delete all associated attendance history.`)) {
            const { error } = await db.from('classes').delete().eq('id', classId);
            if (error) { console.error('Error deleting class:', error); alert('Could not delete class.'); }
            else { fetchClasses(); }
        }
    }

    // --- CORE LOGIC: SESSIONS ---
    function handleStartSessionClick(event) {
        const classId = parseInt(event.target.dataset.id);
        const selectedClass = currentClasses.find(c => c.id === classId);
        if (selectedClass) {
            document.getElementById('modal-class-title').textContent = `Start Session for ${selectedClass.subject_name}`;
            document.getElementById('modal-start-time').value = selectedClass.default_start_time;
            document.getElementById('modal-end-time').value = selectedClass.default_end_time;
            document.getElementById('confirm-start-session-btn').dataset.classId = classId;
            document.getElementById('session-modal').style.display = 'flex';
        }
    }

    async function startSession() {
        const confirmStartSessionBtn = document.getElementById('confirm-start-session-btn');
        const classId = parseInt(confirmStartSessionBtn.dataset.classId);
        const newSession = {
            class_id: classId,
            start_time: document.getElementById('modal-start-time').value,
            end_time: document.getElementById('modal-end-time').value,
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
            const sessionDetails = { sessionId: data.id, qrSpeed: document.getElementById('modal-qr-speed').value };
            sessionStorage.setItem('activeSession', JSON.stringify(sessionDetails));
            window.location.href = 'session.html';
        }
    }

    function populateMarkOffSelect() {
        const markOffClassSelect = document.getElementById('mark-off-class-select');
        markOffClassSelect.innerHTML = '<option value="">-- Select a Class --</option>';
        currentClasses.forEach(cls => {
            const option = document.createElement('option');
            option.value = cls.id;
            option.textContent = `${cls.subject_name} - ${cls.division} ${cls.batch ? `(${cls.batch})` : ''}`;
            markOffClassSelect.appendChild(option);
        });
        document.getElementById('mark-off-date').valueAsDate = new Date();
    }

    async function markSessionAsOff() {
        const classId = document.getElementById('mark-off-class-select').value;
        const date = document.getElementById('mark-off-date').value;
        const reason = document.getElementById('mark-off-reason').value;
        if (!classId || !date) { alert('Please select a class and a date.'); return; }
        const saveMarkOffBtn = document.getElementById('save-mark-off-btn');
        saveMarkOffBtn.disabled = true;
        saveMarkOffBtn.textContent = 'Saving...';
        const { data: existing, error: checkError } = await db.from('sessions').select('id').eq('class_id', classId).eq('session_date', date);
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
            class_id: classId, session_date: date, start_time: selectedClass.default_start_time,
            end_time: selectedClass.default_end_time, status: reason
        };
        const { error } = await db.from('sessions').insert(newOffSession);
        if (error) {
            console.error('Error marking session as off:', error);
            alert('Could not save the record.');
        } else {
            alert('Successfully marked as off.');
            document.getElementById('mark-off-form-container').style.display = 'none';
            document.getElementById('show-mark-off-form-btn').style.display = 'inline-flex';
        }
        saveMarkOffBtn.disabled = false;
        saveMarkOffBtn.textContent = 'Confirm';
    }

    // --- HISTORY MODAL LOGIC ---
    async function handleViewHistoryClick(event) {
        const classId = parseInt(event.target.dataset.id);
        historyState.selectedClass = currentClasses.find(c => c.id === classId);
        historyClassTitle.textContent = `History for ${historyState.selectedClass.subject_name}`;
        historyContent.innerHTML = '<p>Loading history...</p>';
        historyPagination.innerHTML = '';
        historyModal.style.display = 'flex';

        const { data, error } = await db.from('sessions')
            .select('id, session_date, status, start_time, end_time')
            .eq('class_id', classId)
            .order('session_date', { ascending: false });

        if (error) { historyContent.innerHTML = '<p class="result-error">Could not load history.</p>'; return; }
        
        historyState.allSessions = data;
        historyState.currentPage = 1;
        startDateFilter.value = '';
        endDateFilter.value = '';
        entriesPerPageSelect.value = '10';
        historyState.entriesPerPage = 10;
        
        applyHistoryFilters();
    }

    function applyHistoryFilters() {
        const startDate = startDateFilter.value;
        const endDate = endDateFilter.value;
        let filtered = historyState.allSessions;
        if (startDate) { filtered = filtered.filter(s => s.session_date >= startDate); }
        if (endDate) { filtered = filtered.filter(s => s.session_date <= endDate); }
        historyState.filteredSessions = filtered;
        historyState.currentPage = 1;
        renderHistoryPage();
    }

    function renderHistoryPage() {
        const start = (historyState.currentPage - 1) * historyState.entriesPerPage;
        const end = start + historyState.entriesPerPage;
        const paginatedSessions = historyState.filteredSessions.slice(start, end);
        renderHistoryTable(paginatedSessions);
        renderPagination();
    }

    async function renderHistoryTable(sessions) {
        if (sessions.length === 0) {
            historyContent.innerHTML = '<p>No records match the current filters.</p>';
            return;
        }
        const tableRows = await Promise.all(sessions.map(async (session) => {
            const sessionDate = new Date(session.session_date + 'T00:00:00');
            const formattedDate = sessionDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            
            if (session.status !== 'Active') {
                return `<tr><td data-label="Date">${formattedDate}</td><td data-label="Status" colspan="3">${session.status}</td><td data-label="Actions">-</td></tr>`;
            }

            const { data: records } = await db.from('attendance_records').select('roll_no').eq('session_id', session.id);
            const totalStudents = historyState.selectedClass.end_roll_no - historyState.selectedClass.start_roll_no + 1;
            const presentCount = records ? records.length : 0;
            const presentRolls = records ? records.map(r => r.roll_no) : [];
            const absentRolls = [];
            for (let i = historyState.selectedClass.start_roll_no; i <= historyState.selectedClass.end_roll_no; i++) { if (!presentRolls.includes(i)) absentRolls.push(i); }
            const reportText = `Attendance Report\nSubject: ${historyState.selectedClass.subject_name}\nDate: ${formattedDate}\nPresent: ${presentCount}/${totalStudents}\nAbsent (${absentRolls.length}): ${absentRolls.join(', ')}`;
            let actionsHTML = `<button class="history-action-btn copy-report-btn" data-report-text="${reportText.replace(/"/g, '&quot;')}">Copy</button>`;
            if (absentRolls.length > 0) { actionsHTML += `<button class="history-action-btn secondary modify-absentees-btn">Modify</button>`; }

            return `<tr>
                <td data-label="Date">${formattedDate}</td><td data-label="Status">${session.status}</td>
                <td data-label="Present">${presentCount} / ${totalStudents}</td><td data-label="Absentees">${absentRolls.length > 0 ? absentRolls.join(', ') : 'None'}</td>
                <td data-label="Actions">
                    ${actionsHTML}
                    <div class="modify-container" style="display: none;">
                        <p>Select students to mark as present:</p>
                        ${absentRolls.map(r => `<label><input type="checkbox" value="${r}"> ${r}</label>`).join('')}
                        <button class="action-btn confirm-modify-btn" data-session-id="${session.id}" data-class-id="${historyState.selectedClass.id}">Mark Present</button>
                    </div>
                </td></tr>`;
        }));
        historyContent.innerHTML = `<table class="class-list-table"><thead><tr><th>Date</th><th>Status</th><th>Present</th><th>Absentees</th><th>Actions</th></tr></thead><tbody>${tableRows.join('')}</tbody></table>`;
    }

    function renderPagination() {
        const totalPages = Math.ceil(historyState.filteredSessions.length / historyState.entriesPerPage);
        historyPagination.innerHTML = '';
        if (totalPages <= 1) return;
        for (let i = 1; i <= totalPages; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.textContent = i;
            pageBtn.dataset.page = i;
            if (i === historyState.currentPage) { pageBtn.classList.add('active'); }
            historyPagination.appendChild(pageBtn);
        }
    }

    function handlePaginationClick(event) {
        if (event.target.tagName === 'BUTTON') {
            historyState.currentPage = parseInt(event.target.dataset.page);
            renderHistoryPage();
        }
    }
    
    function handleHistoryActions(event) {
        if (event.target.classList.contains('copy-report-btn')) {
            const reportText = event.target.dataset.reportText;
            navigator.clipboard.writeText(reportText).then(() => {
                const originalText = event.target.textContent; event.target.textContent = 'Copied!';
                setTimeout(() => { event.target.textContent = originalText; }, 2000);
            }).catch(err => { console.error('Failed to copy text: ', err); alert('Failed to copy report.'); });
        }
        if (event.target.classList.contains('modify-absentees-btn')) {
            const modifyContainer = event.target.closest('td').querySelector('.modify-container');
            modifyContainer.style.display = modifyContainer.style.display === 'none' ? 'block' : 'none';
        }
        if (event.target.classList.contains('confirm-modify-btn')) {
            const sessionId = event.target.dataset.sessionId,
                classId = event.target.dataset.classId,
                container = event.target.closest('.modify-container'),
                checkboxes = container.querySelectorAll('input[type="checkbox"]:checked'),
                rollNumbersToMark = Array.from(checkboxes).map(cb => parseInt(cb.value));
            if (rollNumbersToMark.length > 0) {
                markAbsenteesAsPresent(sessionId, classId, rollNumbersToMark);
            }
        }
    }

    async function markAbsenteesAsPresent(sessionId, classId, rollNumbers) {
        const recordsToInsert = rollNumbers.map(rollNo => ({
            session_id: sessionId, roll_no: rollNo,
            device_fingerprint: `manual_override_by_teacher_${Date.now()}_${rollNo}`
        }));
        const { error } = await db.from('attendance_records').insert(recordsToInsert);
        if (error) {
            console.error('Error marking absentees as present:', error);
            alert('An error occurred while updating attendance.');
        } else {
            alert('Attendance updated successfully!');
            const event = { target: { dataset: { id: classId } } };
            handleViewHistoryClick(event);
        }
    }
});