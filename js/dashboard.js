// js/dashboard.js
(async () => {
    const db = await window.dbReady; // Wait for config.js to finish

    console.log("Dashboard ready. Supabase client:", db);

    // Example: Fetch data
    const { data, error } = await db.from('sessions').select('*');
    console.log(data, error);

    if (db) {
        loadDashboard(db);
    }

})();

function loadDashboard(db) {

    // --- GLOBAL STATE ---
    const faculty = JSON.parse(sessionStorage.getItem('loggedInFaculty'));
    let currentClasses = [];
    let historyState = { allSessions: [], filteredSessions: [], currentPage: 1, entriesPerPage: 10, selectedClass: null };

    // --- DOM ELEMENTS ---
    const classListBody = document.getElementById('class-list-body');
    const fabMainBtn = document.getElementById('fab-main-btn');
    const fabOptions = document.querySelector('.fab-options');
    const historyModal = document.getElementById('history-modal');
    const historyClassTitle = document.getElementById('history-class-title');
    const historyContent = document.getElementById('history-content');
    const startDateFilter = document.getElementById('start-date-filter');
    const endDateFilter = document.getElementById('end-date-filter');
    const entriesPerPageSelect = document.getElementById('entries-per-page');
    const historyPagination = document.getElementById('history-pagination');

    // --- INITIALIZATION ---
    if (faculty) { document.getElementById('welcome-message').textContent = `Welcome, ${faculty.username}`; fetchClasses(); }

    // --- EVENT LISTENERS ---
    document.getElementById('logout-btn').addEventListener('click', () => { sessionStorage.removeItem('loggedInFaculty'); window.location.href = 'faculty.html'; });
    document.getElementById('show-create-class-form-btn').addEventListener('click', toggleForm('create-class-form-container', true));
    document.getElementById('show-mark-off-form-btn').addEventListener('click', () => { populateMarkOffSelect(); toggleForm('mark-off-form-container', true)(); });
    fabMainBtn.addEventListener('click', (e) => { e.stopPropagation(); fabMainBtn.classList.toggle('active'); fabOptions.classList.toggle('active'); });
    document.getElementById('mobile-create-class-btn').addEventListener('click', toggleForm('create-class-form-container', false));
    document.getElementById('mobile-mark-off-btn').addEventListener('click', () => { populateMarkOffSelect(); toggleForm('mark-off-form-container', false)(); });
    document.getElementById('cancel-create-class-btn').addEventListener('click', toggleForm('create-class-form-container', true));
    document.getElementById('cancel-mark-off-btn').addEventListener('click', toggleForm('mark-off-form-container', true));
    document.getElementById('class-type').addEventListener('change', () => { document.getElementById('batch').style.display = document.getElementById('class-type').value === 'Lab' ? 'block' : 'none'; });
    document.getElementById('save-class-btn').addEventListener('click', saveClass);
    document.getElementById('save-mark-off-btn').addEventListener('click', markSessionAsOff);
    document.getElementById('cancel-modal-btn').addEventListener('click', () => document.getElementById('session-modal').style.display = 'none');
    document.getElementById('confirm-start-session-btn').addEventListener('click', startSession);
    document.getElementById('close-history-modal-btn').addEventListener('click', () => historyModal.style.display = 'none');

    classListBody.addEventListener('click', (event) => {
        const target = event.target;
        const classRow = target.closest('tr');
        if (!classRow) return;
        const classId = classRow.dataset.id;
        if (!classId) return;
        event.stopPropagation();
        if (target.closest('.start-session-btn')) handleStartSessionClick({ target: { dataset: { id: classId } } });
        if (target.closest('.view-history-btn')) handleViewHistoryClick({ target: { dataset: { id: classId } } });
        if (target.closest('.delete-btn')) handleDeleteClassClick({ target: { dataset: { id: classId } } });
        if (target.closest('.card-menu-btn')) {
            const menu = target.closest('.menu-container').querySelector('.card-menu');
            document.querySelectorAll('.card-menu.show').forEach(m => { if (m !== menu) m.classList.remove('show'); });
            menu.classList.toggle('show');
        }
        if (target.classList.contains('color-swatch')) {
            const color = target.dataset.color;
            updateClassColor(classId, color);
        }
    });

    document.body.addEventListener('click', (e) => {
        if (!e.target.closest('.fab-container')) { fabMainBtn.classList.remove('active'); fabOptions.classList.remove('active'); }
        if (!e.target.closest('.menu-container')) { document.querySelectorAll('.card-menu.show').forEach(m => m.classList.remove('show')); }
    });

    startDateFilter.addEventListener('change', applyHistoryFilters);
    endDateFilter.addEventListener('change', applyHistoryFilters);
    entriesPerPageSelect.addEventListener('change', (e) => { historyState.entriesPerPage = parseInt(e.target.value); historyState.currentPage = 1; applyHistoryFilters(); });
    historyContent.addEventListener('click', handleHistoryActions);
    historyPagination.addEventListener('click', handlePaginationClick);

    // --- UI HELPER FUNCTIONS ---
    function toggleForm(containerId, isDesktop) {
        return function () {
            const formContainer = document.getElementById(containerId);
            const isVisible = formContainer.style.display === 'block';
            formContainer.style.display = isVisible ? 'none' : 'block';
            if (isDesktop) {
                document.getElementById('show-create-class-form-btn').style.display = isVisible ? 'flex' : 'none';
                document.getElementById('show-mark-off-form-btn').style.display = isVisible ? 'flex' : 'none';
            } else {
                fabMainBtn.classList.remove('active');
                fabOptions.classList.remove('active');
            }
        }
    }

    function getContrastColor(hex) {
        if (!hex) return '#FFFFFF';
        const r = parseInt(hex.substr(1, 2), 16), g = parseInt(hex.substr(3, 2), 16), b = parseInt(hex.substr(5, 2), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 128) ? '#343a40' : '#FFFFFF';
    }

    // --- CORE LOGIC: CLASSES ---
    async function fetchClasses() {
        const loadingMsg = document.getElementById('loading-classes-msg');
        loadingMsg.textContent = 'Loading classes...';
        loadingMsg.style.display = 'block';
        classListBody.innerHTML = '';
        const { data, error } = await db.from('classes').select('*').eq('faculty_id', faculty.id).order('created_at', { ascending: false });
        if (error) { console.error('Error fetching classes:', error); loadingMsg.textContent = 'Error loading classes.'; return; }
        currentClasses = data;
        if (data.length === 0) { loadingMsg.textContent = 'You have not created any classes yet.'; }
        else { loadingMsg.style.display = 'none'; renderClasses(data); }
    }

    function renderClasses(classes) {
        classListBody.innerHTML = '';
        const colors = ['#ffffff', '#ffadad', '#ffd6a5', '#fdffb6', '#caffbf', '#9bf6ff', '#a0c4ff', '#bdb2ff'];
        classes.forEach(cls => {
            const row = document.createElement('tr');
            row.dataset.id = cls.id;
            const bgColor = cls.color || 'transparent';
            const textColor = getContrastColor(bgColor);
            row.style.backgroundColor = bgColor;
            const colorSwatchesHTML = colors.map(color => `<div class="color-swatch" data-color="${color}" style="background-color: ${color};"></div>`).join('');
            row.innerHTML = `
                <td data-label="Subject" style="font-weight: 600; color: ${textColor};">${cls.subject_name}</td>
                <td data-label="Div/Batch" style="color: ${textColor};">${cls.division} ${cls.class_type === 'Lab' ? `(${cls.batch})` : ''}</td>
                <td data-label="Timings" style="color: ${textColor};">${cls.default_start_time} - ${cls.default_end_time}</td>
                <td data-label="Roster" style="color: ${textColor};">${cls.start_roll_no} - ${cls.end_roll_no}</td>
                <td data-label="Actions" class="actions-cell">
                    <button class="action-btn start-session-btn">Start</button>
                    <button class="action-btn secondary view-history-btn">History</button>
                    <div class="menu-container">
                        <button class="card-menu-btn" style="color: ${textColor};"><i class="fas fa-ellipsis-v"></i></button>
                        <div class="card-menu">
                            <button class="delete-btn">Delete Class</button>
                            <div class="color-picker">
                                <div class="color-swatches">${colorSwatchesHTML}</div>
                            </div>
                        </div>
                    </div>
                </td>
            `;
            classListBody.appendChild(row);
        });
    }

    async function updateClassColor(classId, color) {
        const newColor = color === '#ffffff' ? null : color;
        const { error } = await db.from('classes').update({ color: newColor }).eq('id', classId);
        if (error) { alert('Could not update color.'); console.error(error); }
        else {
            const classInState = currentClasses.find(c => c.id == classId);
            if (classInState) classInState.color = newColor;
            renderClasses(currentClasses);
        }
    }

    async function saveClass() {
        const subjectNameInput = document.getElementById('subject-name'), divisionInput = document.getElementById('division'), startRollNoInput = document.getElementById('start-roll-no'), endRollNoInput = document.getElementById('end-roll-no'), defaultStartTimeInput = document.getElementById('default-start-time'), defaultEndTimeInput = document.getElementById('default-end-time'), requiredFields = [subjectNameInput, divisionInput, startRollNoInput, endRollNoInput, defaultStartTimeInput, defaultEndTimeInput];
        if (requiredFields.some(input => !input.value)) { alert('Please fill all required fields.'); return; }
        const saveClassBtn = document.getElementById('save-class-btn'); saveClassBtn.disabled = true; saveClassBtn.textContent = 'Saving...';
        const classTypeSelect = document.getElementById('class-type'), batchInput = document.getElementById('batch'), newClass = { faculty_id: faculty.id, subject_name: subjectNameInput.value.trim(), division: divisionInput.value.trim(), class_type: classTypeSelect.value, batch: classTypeSelect.value === 'Lab' ? batchInput.value.trim() : null, start_roll_no: parseInt(startRollNoInput.value), end_roll_no: parseInt(endRollNoInput.value), default_start_time: defaultStartTimeInput.value, default_end_time: defaultEndTimeInput.value };
        const { error } = await db.from('classes').insert(newClass);
        if (error) { console.error('Error saving class:', error); alert('Could not save class. Please try again.'); }
        else { document.getElementById('create-class-form-container').style.display = 'none'; document.getElementById('show-create-class-form-btn').style.display = 'flex'; resetCreateClassForm(); fetchClasses(); }
        saveClassBtn.disabled = false; saveClassBtn.textContent = 'Save Class';
    }

    function resetCreateClassForm() {
        document.getElementById('subject-name').value = ''; document.getElementById('division').value = ''; document.getElementById('class-type').value = 'Lecture';
        const batchInput = document.getElementById('batch'); batchInput.value = ''; batchInput.style.display = 'none';
        document.getElementById('start-roll-no').value = ''; document.getElementById('end-roll-no').value = '';
        document.getElementById('default-start-time').value = ''; document.getElementById('default-end-time').value = '';
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
        const confirmStartSessionBtn = document.getElementById('confirm-start-session-btn'), classId = parseInt(confirmStartSessionBtn.dataset.classId);
        const newSession = { class_id: classId, start_time: document.getElementById('modal-start-time').value, end_time: document.getElementById('modal-end-time').value, status: 'Active', qrSpeed: document.getElementById('modal-qr-speed').value };
        confirmStartSessionBtn.disabled = true; confirmStartSessionBtn.textContent = 'Starting...';
        const { data, error } = await db.from('sessions').insert(newSession).select().single();
        if (error) { console.error('Error starting session:', error); alert('Could not start session.'); confirmStartSessionBtn.disabled = false; confirmStartSessionBtn.textContent = 'Confirm & Begin Session'; }
        else { const sessionDetails = { sessionId: data.id, qrSpeed: document.getElementById('modal-qr-speed').value }; sessionStorage.setItem('activeSession', JSON.stringify(sessionDetails)); window.location.href = 'session.html'; }
    }

    function populateMarkOffSelect() {
        const markOffClassSelect = document.getElementById('mark-off-class-select');
        markOffClassSelect.innerHTML = '<option value="">-- Select a Class --</option>';
        currentClasses.forEach(cls => { const option = document.createElement('option'); option.value = cls.id; option.textContent = `${cls.subject_name} - ${cls.division} ${cls.batch ? `(${cls.batch})` : ''}`; markOffClassSelect.appendChild(option); });
        document.getElementById('mark-off-date').valueAsDate = new Date();
    }

    async function markSessionAsOff() {
        const classId = document.getElementById('mark-off-class-select').value, date = document.getElementById('mark-off-date').value, reason = document.getElementById('mark-off-reason').value;
        if (!classId || !date) { alert('Please select a class and a date.'); return; }
        const saveMarkOffBtn = document.getElementById('save-mark-off-btn'); saveMarkOffBtn.disabled = true; saveMarkOffBtn.textContent = 'Saving...';
        const { data: existing, error: checkError } = await db.from('sessions').select('id').eq('class_id', classId).eq('session_date', date);
        if (checkError) { console.error('Error checking existing session:', checkError); alert('An error occurred. Please try again.'); saveMarkOffBtn.disabled = false; saveMarkOffBtn.textContent = 'Confirm'; return; }
        if (existing.length > 0) { alert('A session or an off-day record already exists for this class on the selected date.'); saveMarkOffBtn.disabled = false; saveMarkOffBtn.textContent = 'Confirm'; return; }
        const selectedClass = currentClasses.find(c => c.id == classId);
        const newOffSession = { class_id: classId, session_date: date, start_time: selectedClass.default_start_time, end_time: selectedClass.default_end_time, status: reason };
        const { error } = await db.from('sessions').insert(newOffSession);
        if (error) { console.error('Error marking session as off:', error); alert('Could not save the record.'); }
        else { alert('Successfully marked as off.'); document.getElementById('mark-off-form-container').style.display = 'none'; document.getElementById('show-mark-off-form-btn').style.display = 'flex'; }
        saveMarkOffBtn.disabled = false; saveMarkOffBtn.textContent = 'Confirm';
    }

    // --- HISTORY MODAL LOGIC ---
    async function handleViewHistoryClick(event) {
        const classId = parseInt(event.target.dataset.id);
        historyState.selectedClass = currentClasses.find(c => c.id === classId);
        historyClassTitle.textContent = `History for ${historyState.selectedClass.subject_name}`;
        historyContent.innerHTML = '<p>Loading history...</p>';
        historyPagination.innerHTML = '';
        historyModal.style.display = 'flex';
        const { data, error } = await db.from('sessions').select('id, session_date, status, start_time, end_time').eq('class_id', classId).order('session_date', { ascending: false });
        if (error) { historyContent.innerHTML = '<p class="result-error">Could not load history.</p>'; return; }
        historyState.allSessions = data;
        historyState.currentPage = 1;
        startDateFilter.value = ''; endDateFilter.value = '';
        entriesPerPageSelect.value = '10'; historyState.entriesPerPage = 10;
        applyHistoryFilters();
    }

    function applyHistoryFilters() {
        const startDate = startDateFilter.value, endDate = endDateFilter.value;
        let filtered = historyState.allSessions;
        if (startDate) { filtered = filtered.filter(s => s.session_date >= startDate); }
        if (endDate) { filtered = filtered.filter(s => s.session_date <= endDate); }
        historyState.filteredSessions = filtered;
        historyState.currentPage = 1;
        renderHistoryPage();
    }

    function renderHistoryPage() {
        const start = (historyState.currentPage - 1) * historyState.entriesPerPage, end = start + historyState.entriesPerPage;
        const paginatedSessions = historyState.filteredSessions.slice(start, end);
        renderHistoryTable(paginatedSessions);
        renderPagination();
    }

    async function renderHistoryTable(sessions) {
        if (sessions.length === 0) { historyContent.innerHTML = '<p>No records match the current filters.</p>'; return; }
        const tableRows = await Promise.all(sessions.map(async (session) => {
            const sessionDate = new Date(session.session_date + 'T00:00:00'), formattedDate = sessionDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            if (session.status !== 'Active') { return `<tr><td data-label="Date">${formattedDate}</td><td data-label="Status" colspan="3">${session.status}</td><td data-label="Actions">-</td></tr>`; }
            const { data: records } = await db.from('attendance_records').select('roll_no').eq('session_id', session.id);
            const totalStudents = historyState.selectedClass.end_roll_no - historyState.selectedClass.start_roll_no + 1;
            const presentCount = records ? records.length : 0;
            const presentRolls = records ? records.map(r => r.roll_no) : [];
            const absentRolls = [];
            for (let i = historyState.selectedClass.start_roll_no; i <= historyState.selectedClass.end_roll_no; i++) { if (!presentRolls.includes(i)) absentRolls.push(i); }
            const reportText = `Attendance Report\nSubject: ${historyState.selectedClass.subject_name}\nDate: ${formattedDate}\nPresent: ${presentCount}/${totalStudents}\nAbsent (${absentRolls.length}): ${absentRolls.join(', ')}`;
            let actionsHTML = `<button class="history-action-btn copy-report-btn" data-report-text="${reportText.replace(/"/g, '&quot;')}">Copy</button>`;
            if (absentRolls.length > 0) { actionsHTML += `<button class="history-action-btn secondary modify-absentees-btn">Modify</button>`; }
            return `<tr><td data-label="Date">${formattedDate}</td><td data-label="Status">${session.status}</td><td data-label="Present">${presentCount}/${totalStudents}</td><td data-label="Absentees">${absentRolls.length > 0 ? absentRolls.join(', ') : 'None'}</td><td data-label="Actions">${actionsHTML}<div class="modify-container" style="display: none;"><p>Select students to mark as present:</p>${absentRolls.map(r => `<label><input type="checkbox" value="${r}"> ${r}</label>`).join('')}<button class="action-btn confirm-modify-btn" data-session-id="${session.id}" data-class-id="${historyState.selectedClass.id}">Mark Present</button></div></td></tr>`;
        }));
        historyContent.innerHTML = `<table class="class-list-table"><thead><tr><th>Date</th><th>Status</th><th>Present</th><th>Absentees</th><th>Actions</th></tr></thead><tbody>${tableRows.join('')}</tbody></table>`;
    }

    function renderPagination() {
        const totalPages = Math.ceil(historyState.filteredSessions.length / historyState.entriesPerPage);
        historyPagination.innerHTML = '';
        if (totalPages <= 1) return;
        for (let i = 1; i <= totalPages; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.textContent = i; pageBtn.dataset.page = i;
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
            const sessionId = event.target.dataset.sessionId, classId = event.target.dataset.classId;
            const container = event.target.closest('.modify-container'), checkboxes = container.querySelectorAll('input[type="checkbox"]:checked');
            const rollNumbersToMark = Array.from(checkboxes).map(cb => parseInt(cb.value));
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

}

