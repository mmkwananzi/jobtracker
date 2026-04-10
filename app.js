(() => {
    const API_BASE = '/api/applications';

    // State
    let applications = [];
    let sortField = 'dateApplied';
    let sortDir = 'desc';
    let deleteTargetId = null;
    let detailViewId = null;
    let isSaving = false;

    // DOM refs
    const tableBody = document.getElementById('tableBody');
    const emptyState = document.getElementById('emptyState');
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modalTitle');
    const appForm = document.getElementById('appForm');
    const detailModal = document.getElementById('detailModal');
    const detailContent = document.getElementById('detailContent');
    const detailTitle = document.getElementById('detailTitle');
    const deleteModal = document.getElementById('deleteModal');
    const searchInput = document.getElementById('searchInput');
    const filterStatus = document.getElementById('filterStatus');
    const statsBar = document.getElementById('statsBar');
    const saveBtn = document.getElementById('saveBtn');

    // ---------- API helpers ----------

    async function apiGet() {
        const res = await fetch(API_BASE);
        if (!res.ok) throw new Error(`Failed to load: ${res.statusText}`);
        return res.json();
    }

    async function apiCreate(data) {
        const res = await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error(`Failed to save: ${res.statusText}`);
        return res.json();
    }

    async function apiUpdate(id, data) {
        const res = await fetch(`${API_BASE}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error(`Failed to update: ${res.statusText}`);
        return res.json();
    }

    async function apiDelete(id) {
        const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error(`Failed to delete: ${res.statusText}`);
        return res.json();
    }

    // ---------- Loading / Error feedback ----------

    function showToast(message, isError = false) {
        const toast = document.createElement('div');
        toast.className = `toast ${isError ? 'toast-error' : 'toast-success'}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('toast-visible'), 10);
        setTimeout(() => {
            toast.classList.remove('toast-visible');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // ---------- Render ----------

    function render() {
        renderStats();
        renderTable();
    }

    function renderStats() {
        const total = applications.length;
        const active = applications.filter(a =>
            !['Rejected', 'Withdrawn', 'Accepted', 'Unsuccessful'].includes(a.status)
        ).length;
        const offers = applications.filter(a =>
            ['Offer', 'Accepted'].includes(a.status)
        ).length;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const in3Days = new Date(today);
        in3Days.setDate(in3Days.getDate() + 3);
        const needsFollowUp = applications.filter(a => {
            if (!a.followUpDate) return false;
            const fd = new Date(a.followUpDate);
            return fd <= in3Days && !['Rejected', 'Withdrawn', 'Accepted', 'Unsuccessful'].includes(a.status);
        }).length;

        statsBar.innerHTML = `
            <div class="stat-card">
                <div class="stat-value">${total}</div>
                <div class="stat-label">Total</div>
            </div>
            <div class="stat-card active">
                <div class="stat-value">${active}</div>
                <div class="stat-label">Active</div>
            </div>
            <div class="stat-card offers">
                <div class="stat-value">${offers}</div>
                <div class="stat-label">Offers</div>
            </div>
            <div class="stat-card followup">
                <div class="stat-value">${needsFollowUp}</div>
                <div class="stat-label">Follow-ups Due</div>
            </div>
        `;
    }

    function getFilteredSorted() {
        const query = searchInput.value.toLowerCase().trim();
        const statusFilter = filterStatus.value;

        let filtered = applications.filter(app => {
            if (statusFilter && app.status !== statusFilter) return false;
            if (query) {
                const searchable = [
                    app.company, app.jobTitle, app.location,
                    app.source, app.contactPerson, app.notes
                ].filter(Boolean).join(' ').toLowerCase();
                if (!searchable.includes(query)) return false;
            }
            return true;
        });

        filtered.sort((a, b) => {
            let valA = a[sortField] || '';
            let valB = b[sortField] || '';
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();
            if (valA < valB) return sortDir === 'asc' ? -1 : 1;
            if (valA > valB) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });

        return filtered;
    }

    function formatDate(dateStr) {
        if (!dateStr) return '-';
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    function getFollowUpClass(dateStr) {
        if (!dateStr) return '';
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const fd = new Date(dateStr + 'T00:00:00');
        if (fd < today) return 'follow-up-overdue';
        const diff = (fd - today) / (1000 * 60 * 60 * 24);
        if (diff <= 3) return 'follow-up-soon';
        return '';
    }

    function statusClass(status) {
        return 'status-' + status.replace(/\s+/g, '-').toLowerCase();
    }

    function renderTable() {
        const data = getFilteredSorted();

        if (data.length === 0 && applications.length === 0) {
            emptyState.classList.remove('hidden');
            tableBody.innerHTML = '';
            return;
        }

        emptyState.classList.add('hidden');

        if (data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--gray-400)">No matching applications found.</td></tr>`;
            return;
        }

        tableBody.innerHTML = data.map(app => `
            <tr data-id="${app.id}">
                <td class="company-cell">${escapeHtml(app.company)}</td>
                <td>${escapeHtml(app.jobTitle)}</td>
                <td>${escapeHtml(app.locationType ? (app.locationType + (app.location ? ' - ' + app.location : '')) : (app.location || '-'))}</td>
                <td><span class="status-badge ${statusClass(app.status)}">${escapeHtml(app.status)}</span></td>
                <td>${formatDate(app.dateApplied)}</td>
                <td class="${getFollowUpClass(app.followUpDate)}">${formatDate(app.followUpDate)}</td>
                <td>
                    <div class="actions-cell">
                        ${app.jobUrl ? `<a href="${escapeHtml(app.jobUrl)}" target="_blank" rel="noopener" class="btn-icon" title="Open job advert" onclick="event.stopPropagation()">&#128279;</a>` : ''}
                        <button class="btn-icon edit-btn" data-id="${app.id}" title="Edit" onclick="event.stopPropagation()">&#9998;</button>
                        <button class="btn-icon delete-btn" data-id="${app.id}" title="Delete" onclick="event.stopPropagation()">&#128465;</button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Update sort icons
        document.querySelectorAll('thead th[data-sort]').forEach(th => {
            const icon = th.querySelector('.sort-icon');
            if (th.dataset.sort === sortField) {
                icon.textContent = sortDir === 'asc' ? '\u25B2' : '\u25BC';
            } else {
                icon.textContent = '';
            }
        });
    }

    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ---------- Modal helpers ----------

    function openAddModal() {
        modalTitle.textContent = 'Add Application';
        appForm.reset();
        document.getElementById('appId').value = '';
        document.getElementById('dateFound').value = new Date().toISOString().split('T')[0];
        modal.classList.remove('hidden');
    }

    function openEditModal(id) {
        const app = applications.find(a => a.id === id);
        if (!app) return;

        modalTitle.textContent = 'Edit Application';
        document.getElementById('appId').value = app.id;
        document.getElementById('company').value = app.company || '';
        document.getElementById('jobTitle').value = app.jobTitle || '';
        document.getElementById('locationType').value = app.locationType || '';
        document.getElementById('location').value = app.location || '';
        document.getElementById('salaryRange').value = app.salaryRange || '';
        document.getElementById('source').value = app.source || '';
        document.getElementById('contactPerson').value = app.contactPerson || '';
        document.getElementById('contactEmail').value = app.contactEmail || '';
        document.getElementById('resumeVersion').value = app.resumeVersion || '';
        document.getElementById('status').value = app.status || 'Bookmarked';
        document.getElementById('dateFound').value = app.dateFound || '';
        document.getElementById('dateApplied').value = app.dateApplied || '';
        document.getElementById('deadline').value = app.deadline || '';
        document.getElementById('followUpDate').value = app.followUpDate || '';
        document.getElementById('jobUrl').value = app.jobUrl || '';
        document.getElementById('notes').value = app.notes || '';

        modal.classList.remove('hidden');
    }

    function openDetailModal(id) {
        const app = applications.find(a => a.id === id);
        if (!app) return;

        detailViewId = id;
        detailTitle.textContent = `${app.company} - ${app.jobTitle}`;

        detailContent.innerHTML = `
            <div class="detail-field">
                <div class="detail-label">Company</div>
                <div class="detail-value">${escapeHtml(app.company)}</div>
            </div>
            <div class="detail-field">
                <div class="detail-label">Job Title</div>
                <div class="detail-value">${escapeHtml(app.jobTitle)}</div>
            </div>
            <div class="detail-field">
                <div class="detail-label">Location</div>
                <div class="detail-value">${escapeHtml(app.locationType ? (app.locationType + (app.location ? ' - ' + app.location : '')) : (app.location || '-'))}</div>
            </div>
            <div class="detail-field">
                <div class="detail-label">Status</div>
                <div class="detail-value"><span class="status-badge ${statusClass(app.status)}">${escapeHtml(app.status)}</span></div>
            </div>
            <div class="detail-field">
                <div class="detail-label">Salary Range</div>
                <div class="detail-value">${escapeHtml(app.salaryRange) || '-'}</div>
            </div>
            <div class="detail-field">
                <div class="detail-label">Source</div>
                <div class="detail-value">${escapeHtml(app.source) || '-'}</div>
            </div>
            <div class="detail-field">
                <div class="detail-label">Contact Person</div>
                <div class="detail-value">${escapeHtml(app.contactPerson) || '-'}</div>
            </div>
            <div class="detail-field">
                <div class="detail-label">Contact Email</div>
                <div class="detail-value">${app.contactEmail ? `<a href="mailto:${escapeHtml(app.contactEmail)}">${escapeHtml(app.contactEmail)}</a>` : '-'}</div>
            </div>
            <div class="detail-field">
                <div class="detail-label">Resume Version</div>
                <div class="detail-value">${escapeHtml(app.resumeVersion) || '-'}</div>
            </div>
            <div class="detail-field">
                <div class="detail-label">Job Advert</div>
                <div class="detail-value">${app.jobUrl ? `<a href="${escapeHtml(app.jobUrl)}" target="_blank" rel="noopener">Open Link</a>` : '-'}</div>
            </div>

            <div class="detail-section-title">Dates</div>
            <div class="detail-field">
                <div class="detail-label">Date Found</div>
                <div class="detail-value">${formatDate(app.dateFound)}</div>
            </div>
            <div class="detail-field">
                <div class="detail-label">Date Applied</div>
                <div class="detail-value">${formatDate(app.dateApplied)}</div>
            </div>
            <div class="detail-field">
                <div class="detail-label">Deadline</div>
                <div class="detail-value">${formatDate(app.deadline)}</div>
            </div>
            <div class="detail-field">
                <div class="detail-label">Follow-up Date</div>
                <div class="detail-value ${getFollowUpClass(app.followUpDate)}">${formatDate(app.followUpDate)}</div>
            </div>
            <div class="detail-field">
                <div class="detail-label">Last Updated</div>
                <div class="detail-value">${formatDate(app.updatedAt)}</div>
            </div>

            <div class="detail-section-title">Notes</div>
            <div class="detail-field full-width">
                <div class="detail-value notes-value">${escapeHtml(app.notes) || 'No notes added.'}</div>
            </div>
        `;

        detailModal.classList.remove('hidden');
    }

    function closeAllModals() {
        modal.classList.add('hidden');
        detailModal.classList.add('hidden');
        deleteModal.classList.add('hidden');
    }

    // ---------- Form helpers ----------

    function getFormData() {
        return {
            company: document.getElementById('company').value.trim(),
            jobTitle: document.getElementById('jobTitle').value.trim(),
            locationType: document.getElementById('locationType').value,
            location: document.getElementById('location').value.trim(),
            salaryRange: document.getElementById('salaryRange').value.trim(),
            source: document.getElementById('source').value,
            contactPerson: document.getElementById('contactPerson').value.trim(),
            contactEmail: document.getElementById('contactEmail').value.trim(),
            resumeVersion: document.getElementById('resumeVersion').value.trim(),
            status: document.getElementById('status').value,
            dateFound: document.getElementById('dateFound').value,
            dateApplied: document.getElementById('dateApplied').value,
            deadline: document.getElementById('deadline').value,
            followUpDate: document.getElementById('followUpDate').value,
            jobUrl: document.getElementById('jobUrl').value.trim(),
            notes: document.getElementById('notes').value,
        };
    }

    // ---------- Save (Create / Update) ----------

    appForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (isSaving) return;

        const id = document.getElementById('appId').value;
        const data = getFormData();

        isSaving = true;
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        try {
            if (id) {
                const updated = await apiUpdate(id, data);
                const idx = applications.findIndex(a => a.id === id);
                if (idx !== -1) applications[idx] = updated;
                showToast('Application updated');
            } else {
                const created = await apiCreate(data);
                applications.push(created);
                showToast('Application added');
            }
            closeAllModals();
            render();
        } catch (err) {
            showToast('Error: ' + err.message, true);
        } finally {
            isSaving = false;
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Application';
        }
    });

    // ---------- Delete ----------

    function confirmDelete(id) {
        deleteTargetId = id;
        deleteModal.classList.remove('hidden');
    }

    document.getElementById('deleteConfirmBtn').addEventListener('click', async () => {
        if (!deleteTargetId) return;

        const btn = document.getElementById('deleteConfirmBtn');
        btn.disabled = true;
        btn.textContent = 'Deleting...';

        try {
            await apiDelete(deleteTargetId);
            applications = applications.filter(a => a.id !== deleteTargetId);
            showToast('Application deleted');
            deleteTargetId = null;
            closeAllModals();
            render();
        } catch (err) {
            showToast('Error: ' + err.message, true);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Delete';
        }
    });

    // ---------- Export CSV ----------

    function exportCSV() {
        if (applications.length === 0) return;

        const headers = [
            'Company', 'Job Title', 'Location Type', 'City/Region', 'Salary Range',
            'Source', 'Contact Person', 'Contact Email', 'Resume Version', 'Status',
            'Date Found', 'Date Applied', 'Deadline', 'Follow-up Date', 'Job URL', 'Notes'
        ];
        const fields = [
            'company', 'jobTitle', 'locationType', 'location', 'salaryRange',
            'source', 'contactPerson', 'contactEmail', 'resumeVersion', 'status',
            'dateFound', 'dateApplied', 'deadline', 'followUpDate', 'jobUrl', 'notes'
        ];

        const csvRows = [headers.join(',')];
        for (const app of applications) {
            const row = fields.map(f => {
                let val = (app[f] || '').toString();
                val = val.replace(/"/g, '""');
                return `"${val}"`;
            });
            csvRows.push(row.join(','));
        }

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `job-applications-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // ---------- Event listeners ----------

    document.getElementById('addBtn').addEventListener('click', openAddModal);
    document.getElementById('cancelBtn').addEventListener('click', closeAllModals);
    document.getElementById('modalClose').addEventListener('click', closeAllModals);
    document.getElementById('detailClose').addEventListener('click', closeAllModals);
    document.getElementById('detailCloseBtn').addEventListener('click', closeAllModals);
    document.getElementById('deleteCancelBtn').addEventListener('click', closeAllModals);
    document.getElementById('exportBtn').addEventListener('click', exportCSV);

    document.getElementById('detailEditBtn').addEventListener('click', () => {
        closeAllModals();
        if (detailViewId) openEditModal(detailViewId);
    });

    // Close modals on overlay click
    [modal, detailModal, deleteModal].forEach(m => {
        m.addEventListener('click', (e) => {
            if (e.target === m) closeAllModals();
        });
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeAllModals();
    });

    // Table row click -> detail view; edit/delete buttons
    tableBody.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit-btn');
        const deleteBtn = e.target.closest('.delete-btn');
        const row = e.target.closest('tr');

        if (editBtn) {
            openEditModal(editBtn.dataset.id);
        } else if (deleteBtn) {
            confirmDelete(deleteBtn.dataset.id);
        } else if (row && row.dataset.id) {
            openDetailModal(row.dataset.id);
        }
    });

    // Sort
    document.querySelectorAll('thead th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const field = th.dataset.sort;
            if (sortField === field) {
                sortDir = sortDir === 'asc' ? 'desc' : 'asc';
            } else {
                sortField = field;
                sortDir = 'asc';
            }
            renderTable();
        });
    });

    // Search & Filter
    searchInput.addEventListener('input', renderTable);
    filterStatus.addEventListener('change', renderTable);

    // ---------- Initial load from Azure ----------

    async function init() {
        try {
            applications = await apiGet();
            render();
        } catch (err) {
            showToast('Failed to load data from Azure. Check server connection.', true);
            console.error('Init error:', err);
            render();
        }
    }

    init();
})();
