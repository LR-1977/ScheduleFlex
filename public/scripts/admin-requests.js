let allRequests = [];
let activeFilter = "all";
let pendingDecision = null;

async function loadRequests() {
    const container = document.getElementById("requests-container");
    const loading = document.getElementById("loading-state");
    loading.style.display = "flex";

    try {
        const res = await fetch("/api/requests/pending");
        if (res.status === 401 || res.status === 403) {
            window.location.href = "/";
            return;
        }
        allRequests = await res.json();
        updateSummary();
        renderRequests();
    } catch (err) {
        loading.innerHTML = `<span class="error-state">Failed to load requests. Please refresh.</span>`;
        console.error(err);
    }
}

// Summary Bar
function updateSummary() {
    const swaps = allRequests.filter(r => r.type === "shift_swap").length;
    const offs  = allRequests.filter(r => r.type === "time_off").length;

    document.getElementById("count-total").textContent = allRequests.length;
    document.getElementById("count-swap").textContent  = swaps;
    document.getElementById("count-off").textContent   = offs;
}

// Render Requests
function renderRequests() {
    const container = document.getElementById("requests-container");
    const loading   = document.getElementById("loading-state");
    if (loading) loading.style.display = "none";

    const filtered = activeFilter === "all"
        ? allRequests
        : allRequests.filter(r => r.type === activeFilter);

    container.innerHTML = "";

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">✓</span>
                <p>No ${activeFilter === "all" ? "pending" : activeFilter === "shift_swap" ? "swap" : "time-off"} requests.</p>
            </div>`;
        return;
    }

    filtered.forEach(req => {
        container.appendChild(buildCard(req));
    });
}

function buildCard(req) {
    const isSwap = req.type === "shift_swap";
    const date   = new Date(req.createdAt).toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric"
    });

    const card = document.createElement("div");
    card.className = `request-card ${isSwap ? "card-swap" : "card-off"}`;
    card.dataset.id = req._id;

    // Badge
    const badge = isSwap
        ? `<span class="badge badge-swap">Swap Shifts</span>`
        : `<span class="badge badge-off">Time Off</span>`;

    // Body content differs by type
    let body = "";
    if (isSwap) {
        body = `
            <div class="card-detail-grid">
                <div class="detail-block">
                    <span class="detail-label">Requested by</span>
                    <span class="detail-value">${req.requestedBy}</span>
                </div>
                <div class="detail-block">
                    <span class="detail-label">Their shift</span>
                    <span class="detail-value mono">${req.shiftId}</span>
                </div>
                <div class="detail-block">
                    <span class="detail-label">Swap with</span>
                    <span class="detail-value">${req.targetUser}</span>
                </div>
                <div class="detail-block">
                    <span class="detail-label">Their shift</span>
                    <span class="detail-value mono">${req.targetShiftId}</span>
                </div>
            </div>`;
    } else {
        body = `
            <div class="card-detail-grid">
                <div class="detail-block">
                    <span class="detail-label">Requested by</span>
                    <span class="detail-value">${req.requestedBy}</span>
                </div>
                <div class="detail-block">
                    <span class="detail-label">Shift</span>
                    <span class="detail-value mono">${req.shiftId}</span>
                </div>
                <div class="detail-block detail-block--full">
                    <span class="detail-label">Reason</span>
                    <span class="detail-value">${req.reason}</span>
                </div>
            </div>`;
    }

    card.innerHTML = `
        <div class="card-header">
            ${badge}
            <span class="card-date">Submitted ${date}</span>
        </div>
        <div class="card-body">
            ${body}
        </div>
        <div class="card-actions">
            <button class="btn-approve" onclick="promptDecision('${req._id}', 'approved')">
                Approve
            </button>
            <button class="btn-deny" onclick="promptDecision('${req._id}', 'denied')">
                Deny
            </button>
        </div>`;

    return card;
}
document.addEventListener("DOMContentLoaded", () => {
    loadRequests();
    // Filter Tabs
    document.getElementById("filter-tabs").addEventListener("click", (e) => {
    const tab = e.target.closest(".tab");
    if (!tab) return;

    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    activeFilter = tab.dataset.filter;
    renderRequests();
    });

    // Decisions modal
    document.getElementById("modal-confirm").addEventListener("click", async () => {
        closeModal();
        if (!pendingDecision) return;
        await submitDecision(pendingDecision.requestId, pendingDecision.decision);
        pendingDecision = null;
    });

    document.getElementById("modal-cancel").addEventListener("click", () => {
        closeModal();
        pendingDecision = null;
    });

    document.getElementById("modal-overlay").addEventListener("click", (e) => {
        if (e.target === document.getElementById("modal-overlay")) {
            closeModal();
            pendingDecision = null;
        }
    });
});

function promptDecision(requestId, decision) {
    pendingDecision = { requestId, decision };
    const verb = decision === "approved" ? "approve" : "deny";
    document.getElementById("modal-message").textContent =
        `Are you sure you want to ${verb} this request?`;
    document.getElementById("modal-overlay").classList.add("visible");
}

function closeModal() {
    document.getElementById("modal-overlay").classList.remove("visible");
}

// Submit Decisions
async function submitDecision(requestId, decision) {
    // Optimistically remove the card from the UI
    const card = document.querySelector(`.request-card[data-id="${requestId}"]`);
    if (card) {
        card.classList.add("card-removing");
        setTimeout(() => card.remove(), 280);
    }

    // Remove from local array and refresh summary
    allRequests = allRequests.filter(r => String(r._id) !== String(requestId));
    updateSummary();

    // Re-render in case the list is now empty
    setTimeout(renderRequests, 300);

    try {
        const res = await fetch(`/api/requests/${requestId}/decision`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ decision }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
            // Roll back on failure — reload from server
            console.error("Decision failed:", data.message);
            await loadRequests();
        }
    } catch (err) {
        console.error("Network error:", err);
        await loadRequests();
    }
}
