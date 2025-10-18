// Attendance Animation System
// This file provides animation functionality for attendance processing
// It can be safely included without breaking existing functionality

class AttendanceAnimation {
    constructor() {
        this.container = null;
        this.isAnimating = false;
        this.autoCloseTimeout = null;
        this.init();
    }

    init() {
        // Create animation container if it doesn't exist
        if (!document.getElementById('attendance-animation-container')) {
            this.createAnimationContainer();
        }
        this.container = document.getElementById('attendance-animation-container');
    }

    createAnimationContainer() {
        const container = document.createElement('div');
        container.id = 'attendance-animation-container';
        container.className = 'attendance-animation-container';
        
        container.innerHTML = `
            <div class="attendance-animation-card">
                <button class="attendance-close-btn" onclick="attendanceAnimation.hide()">
                    <i class="fas fa-times"></i>
                </button>
                
                <!-- Processing Animation -->
                <div class="attendance-processing">
                    <div class="attendance-spinner"></div>
                    <div class="attendance-progress-bar">
                        <div class="attendance-progress-fill"></div>
                    </div>
                    <p class="attendance-processing-text">Processing attendance...</p>
                </div>
                
                <!-- Result Animation -->
                <div class="attendance-result">
                    <div class="attendance-result-icon" id="attendance-result-icon"></div>
                    <p class="attendance-result-text" id="attendance-result-text"></p>
                    <p class="attendance-result-details" id="attendance-result-details"></p>
                    <div class="attendance-info-panel" id="attendance-info-panel" style="display: none;">
                        <div class="attendance-info-row">
                            <span class="attendance-info-label">Student ID:</span>
                            <span class="attendance-info-value" id="attendance-student-id">--</span>
                        </div>
                        <div class="attendance-info-row">
                            <span class="attendance-info-label">Time:</span>
                            <span class="attendance-info-value" id="attendance-time">--</span>
                        </div>
                        <div class="attendance-info-row">
                            <span class="attendance-info-label">Date:</span>
                            <span class="attendance-info-value" id="attendance-date">--</span>
                        </div>
                        <div class="attendance-info-row">
                            <span class="attendance-info-label">Status:</span>
                            <span class="attendance-info-value" id="attendance-status">--</span>
                        </div>
                    </div>
                    <button class="attendance-manual-close" onclick="attendanceAnimation.hide()">
                        <i class="fas fa-check"></i> Close
                    </button>
                </div>
                
                <div class="attendance-auto-close" id="attendance-auto-close" style="display: none;">
                    Auto-closing in <span id="attendance-countdown">3</span>s
                </div>
            </div>
        `;
        
        document.body.appendChild(container);
    }

    showProcessing(message = 'Processing attendance...') {
        if (this.isAnimating) return;
        
        this.isAnimating = true;
        this.container.className = 'attendance-animation-container show processing';
        this.container.querySelector('.attendance-processing-text').textContent = message;
        
        // Reset progress bar animation
        const progressFill = this.container.querySelector('.attendance-progress-fill');
        progressFill.style.animation = 'none';
        progressFill.offsetHeight; // Trigger reflow
        progressFill.style.animation = 'attendanceProgressFill 2s ease-in-out';
    }

    showSuccess(message, details = '', showInfo = false, studentData = {}) {
        this.container.className = 'attendance-animation-container show success';
        
        const icon = this.container.querySelector('#attendance-result-icon');
        const text = this.container.querySelector('#attendance-result-text');
        const detailsEl = this.container.querySelector('#attendance-result-details');
        const infoPanel = this.container.querySelector('#attendance-info-panel');
        
        icon.className = 'attendance-result-icon attendance-success-icon fas fa-check-circle';
        text.className = 'attendance-result-text attendance-success-text';
        text.textContent = message;
        detailsEl.textContent = details;
        
        // Always hide the info panel
        infoPanel.style.display = 'none';
        
        // Don't auto-close, let user close manually
        this.hideAutoClose();
    }

    showFailure(message, details = '') {
        this.container.className = 'attendance-animation-container show failure';
        
        const icon = this.container.querySelector('#attendance-result-icon');
        const text = this.container.querySelector('#attendance-result-text');
        const detailsEl = this.container.querySelector('#attendance-result-details');
        const infoPanel = this.container.querySelector('#attendance-info-panel');
        
        icon.className = 'attendance-result-icon attendance-failure-icon fas fa-times-circle';
        text.className = 'attendance-result-text attendance-failure-text';
        text.textContent = message;
        detailsEl.textContent = details;
        infoPanel.style.display = 'none';
        
        // Don't auto-close, let user close manually
        this.hideAutoClose();
    }

    updateInfoPanel(studentData) {
        const studentId = this.container.querySelector('#attendance-student-id');
        const time = this.container.querySelector('#attendance-time');
        const date = this.container.querySelector('#attendance-date');
        const status = this.container.querySelector('#attendance-status');
        
        studentId.textContent = studentData.rollNo || '--';
        time.textContent = studentData.time || new Date().toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
        });
        date.textContent = studentData.date || new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
        status.textContent = studentData.status || 'Present';
    }

    hideAutoClose() {
        const autoCloseEl = this.container.querySelector('#attendance-auto-close');
        if (autoCloseEl) {
            autoCloseEl.style.display = 'none';
        }
        this.clearAutoClose();
    }

    scheduleAutoClose(delay) {
        this.clearAutoClose();
        
        const countdownEl = this.container.querySelector('#attendance-countdown');
        const autoCloseEl = this.container.querySelector('#attendance-auto-close');
        autoCloseEl.style.display = 'block';
        
        let remaining = Math.ceil(delay / 1000);
        countdownEl.textContent = remaining;
        
        const countdownInterval = setInterval(() => {
            remaining--;
            countdownEl.textContent = remaining;
            if (remaining <= 0) {
                clearInterval(countdownInterval);
                this.hide();
            }
        }, 1000);
        
        this.autoCloseTimeout = setTimeout(() => {
            clearInterval(countdownInterval);
            this.hide();
        }, delay);
    }

    clearAutoClose() {
        if (this.autoCloseTimeout) {
            clearTimeout(this.autoCloseTimeout);
            this.autoCloseTimeout = null;
        }
    }

    hide() {
        this.clearAutoClose();
        this.isAnimating = false;
        this.container.className = 'attendance-animation-container';
        this.container.querySelector('#attendance-auto-close').style.display = 'none';
    }

    // Method to simulate processing with automatic result
    simulateProcessing(duration = 2000, successRate = 0.8) {
        this.showProcessing();
        
        setTimeout(() => {
            const isSuccess = Math.random() < successRate;
            if (isSuccess) {
                this.showSuccess(
                    'Attendance Marked Successfully!',
                    'Your attendance has been recorded in the system.',
                    true,
                    {
                        rollNo: 'STU' + Math.floor(Math.random() * 1000).toString().padStart(3, '0'),
                        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
                        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                        status: 'Present'
                    }
                );
            } else {
                this.showFailure(
                    'Attendance Marking Failed!',
                    'Unable to process attendance. Please try again or contact support.'
                );
            }
        }, duration);
    }
}

// Create global instance
const attendanceAnimation = new AttendanceAnimation();

// Export for module systems if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AttendanceAnimation;
}
