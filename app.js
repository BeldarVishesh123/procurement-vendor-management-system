// app.js - ERP Controller & Business Logic

// Global state tracking
let currentSignupRole = "officer";

// DOMContentLoaded Entry
document.addEventListener("DOMContentLoaded", () => {
  checkAuth();
  initApp();
  applyStoredTheme();
});

// ----------------------------------------------------
// THEME SWITCHER
// ----------------------------------------------------
function applyStoredTheme() {
  const isDark = localStorage.getItem("erp_theme") === "dark";
  if (isDark) {
    document.body.classList.add("dark-theme");
    document.getElementById("themeIconSun").style.display = "none";
    document.getElementById("themeIconMoon").style.display = "block";
  }
}

function toggleTheme() {
  const isDark = document.body.classList.toggle("dark-theme");
  localStorage.setItem("erp_theme", isDark ? "dark" : "light");
  const sun = document.getElementById("themeIconSun");
  const moon = document.getElementById("themeIconMoon");
  if (isDark) { sun.style.display = "none"; moon.style.display = "block"; }
  else { sun.style.display = "block"; moon.style.display = "none"; }
  showToast(isDark ? "Dark Mode activated" : "Light Mode activated", "info");
}

// Auth check and page setup
function checkAuth() {
  const user = DB.getCurrentUser();
  const loginOverlay = document.getElementById("loginOverlay");

  if (!user) {
    loginOverlay.style.display = "flex";
    return;
  }

  loginOverlay.style.display = "none";
  applyRolePermissions(user);
  updateSidebarProfile(user);
  
  // Set the quick switcher dropdown value to match current user role/id
  const quickSelect = document.getElementById("quickRoleSelect");
  if (quickSelect) {
    if (user.role === "officer") quickSelect.value = "officer";
    else if (user.role === "manager") quickSelect.value = "manager";
    else if (user.role === "admin") quickSelect.value = "admin";
    else if (user.role === "vendor") {
      quickSelect.value = user.id === "u2" ? "vendorA" : "vendorB";
    }
  }

  // Set workspace company name
  document.getElementById("headerWorkspace").innerText = `Workspace: ${user.company || 'Acme Corp'}`;
}

// Update profile details at the bottom of the sidebar
function updateSidebarProfile(user) {
  document.getElementById("sidebarUserName").innerText = user.name;
  document.getElementById("sidebarUserRole").innerText = user.role;
  
  // Get initials
  const initials = user.name.split(" ").map(n => n[0]).join("").toUpperCase();
  document.getElementById("sidebarUserAvatar").innerText = initials;
}

// Show/Hide navigation items based on User Role
function applyRolePermissions(user) {
  // Navigation elements
  const navItems = {
    dashboard: document.getElementById("nav-dashboard"),
    vendors: document.getElementById("nav-vendors"),
    rfqCreate: document.getElementById("nav-rfq-create"),
    vendorQuotes: document.getElementById("nav-vendor-quotes"),
    quoteCompare: document.getElementById("nav-quote-compare"),
    approvals: document.getElementById("nav-approvals"),
    poInvoice: document.getElementById("nav-po-invoice"),
    mailbox: document.getElementById("nav-mailbox"),
    logs: document.getElementById("nav-logs"),
    reports: document.getElementById("nav-reports")
  };

  // Default hide all except dashboard & logs
  Object.values(navItems).forEach(item => {
    if (item) item.style.display = "none";
  });

  if (navItems.dashboard) navItems.dashboard.style.display = "block";
  if (navItems.logs) navItems.logs.style.display = "block";
  if (navItems.poInvoice) navItems.poInvoice.style.display = "block";
  if (navItems.mailbox) navItems.mailbox.style.display = "block";
  updateMailboxBadge();

  switch (user.role) {
    case "officer":
      if (navItems.vendors) navItems.vendors.style.display = "block";
      if (navItems.rfqCreate) navItems.rfqCreate.style.display = "block";
      if (navItems.quoteCompare) navItems.quoteCompare.style.display = "block";
      if (navItems.reports) navItems.reports.style.display = "block";
      break;

    case "vendor":
      if (navItems.vendorQuotes) navItems.vendorQuotes.style.display = "block";
      break;

    case "manager":
      if (navItems.approvals) navItems.approvals.style.display = "block";
      break;

    case "admin":
      if (navItems.vendors) navItems.vendors.style.display = "block";
      if (navItems.reports) navItems.reports.style.display = "block";
      // Admin gets vendor creation button access
      const regBtn = document.getElementById("registerVendorBtn");
      if (regBtn) regBtn.style.display = "block";
      break;
  }
}

// Switch between SPA screens
function switchScreen(screenId) {
  // Deactivate all screens
  document.querySelectorAll(".screen").forEach(scr => {
    scr.classList.remove("active");
  });

  // Deactivate all nav items
  document.querySelectorAll(".nav-item").forEach(item => {
    item.classList.remove("active");
  });

  // Activate target
  const targetScreen = document.getElementById(`screen-${screenId}`);
  if (targetScreen) {
    targetScreen.classList.add("active");
  }

  const targetNav = document.getElementById(`nav-${screenId}`);
  if (targetNav) {
    targetNav.classList.add("active");
  }

  // Trigger page-specific loaders
  loadScreenData(screenId);
}

// Load dynamic data for each screen
function loadScreenData(screenId) {
  switch (screenId) {
    case "dashboard":
      renderDashboard();
      break;
    case "vendors":
      renderVendorDirectory();
      break;
    case "rfq-create":
      renderRFQVendorSelection();
      // Set default date to 10 days from today
      const dateVal = new Date();
      dateVal.setDate(dateVal.getDate() + 10);
      document.getElementById("rfqDeadline").value = dateVal.toISOString().split("T")[0];
      break;
    case "vendor-quotes":
      renderVendorRFQInvitations();
      break;
    case "quote-compare":
      loadComparisonRFQs();
      break;
    case "approvals":
      renderApprovalQueue();
      break;
    case "po-invoice":
      renderDocList();
      break;
    case "logs":
      renderAuditLogs();
      break;
    case "reports":
      renderReports();
      break;
    case "mailbox":
      renderMailbox();
      break;
  }
}

// ----------------------------------------------------
// AUTH & SESSION CONTROLS
// ----------------------------------------------------

function handleLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value.trim();
  const pass = document.getElementById("loginPassword").value;

  const users = DB.getUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === pass);

  if (!user) {
    showToast("Invalid credentials. Try officer@erp.com / officer123", "danger");
    return;
  }

  DB.setCurrentUser(user);
  DB.addLog("Login Success", `Logged in as ${user.name} (${user.role})`);
  showToast(`Welcome back, ${user.name}!`, "success");
  
  // Reset fields
  document.getElementById("loginEmail").value = "";
  document.getElementById("loginPassword").value = "";

  checkAuth();
  switchScreen("dashboard");
}

function handleSignupSubmit(e) {
  e.preventDefault();
  const name = document.getElementById("signupName").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const pass = document.getElementById("signupPassword").value;
  const users = DB.getUsers();

  if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    showToast("User with this email already exists", "danger");
    return;
  }

  const newUser = {
    id: "u-" + Date.now(),
    name: name,
    email: email,
    password: pass,
    role: currentSignupRole,
    company: "Acme Corp"
  };

  if (currentSignupRole === "vendor") {
    const vSelect = document.getElementById("signupVendorSelect");
    newUser.vendorId = vSelect.value;
    const vendor = DB.getVendors().find(v => v.id === vSelect.value);
    newUser.company = vendor ? vendor.name : "Vendor Workspace";
  }

  users.push(newUser);
  DB.saveUsers(users);
  
  showToast("Account created! Please sign in.", "success");
  toggleSignupView(false);
}

function handleForgotSubmit() {
  const email = document.getElementById("forgotEmail").value.trim();
  if (!email) {
    showToast("Please enter an email address", "warning");
    return;
  }
  showToast(`Password reset link simulated to: ${email}`, "info");
  toggleForgotView(false);
}

function handleLogout() {
  const user = DB.getCurrentUser();
  if (user) {
    DB.addLog("Logout", `${user.name} logged out.`);
  }
  DB.logout();
  checkAuth();
  showToast("Logged out successfully.", "info");
}

// Switch user context programmatically for demonstration
function handleQuickRoleChange(roleKey) {
  const users = DB.getUsers();
  let targetUser = null;

  switch (roleKey) {
    case "officer":
      targetUser = users.find(u => u.email === "officer@erp.com");
      break;
    case "vendorA":
      targetUser = users.find(u => u.email === "vendorA@erp.com");
      break;
    case "vendorB":
      targetUser = users.find(u => u.email === "vendorB@erp.com");
      break;
    case "manager":
      targetUser = users.find(u => u.email === "manager@erp.com");
      break;
    case "admin":
      targetUser = users.find(u => u.email === "admin@erp.com");
      break;
  }

  if (targetUser) {
    DB.setCurrentUser(targetUser);
    DB.addLog("Role Fast-Switch", `Switched acting role to ${targetUser.name} (${targetUser.role})`);
    showToast(`Switched workspace to: ${targetUser.name}`, "success");
    checkAuth();
    switchScreen("dashboard");
  }
}

function setSignupRole(role, element) {
  currentSignupRole = role;
  document.querySelectorAll(".role-pill").forEach(el => el.classList.remove("active"));
  element.classList.add("active");

  const vGroup = document.getElementById("signupVendorGroup");
  if (role === "vendor") {
    vGroup.style.display = "block";
    // Populate select
    const select = document.getElementById("signupVendorSelect");
    select.innerHTML = DB.getVendors()
      .map(v => `<option value="${v.id}">${v.name}</option>`)
      .join("");
  } else {
    vGroup.style.display = "none";
  }
}

function toggleSignupView(show) {
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");
  const footerLinks = document.getElementById("loginFooterLinks");
  const title = document.getElementById("loginFormTitle");
  const subtitle = document.getElementById("loginFormSubtitle");

  if (show) {
    loginForm.style.display = "none";
    signupForm.style.display = "block";
    title.innerText = "Register Workspace Account";
    subtitle.innerText = "Join Acme Corp's Procurement Portal";
    footerLinks.innerHTML = '<a class="login-link" onclick="toggleSignupView(false)">Already have an account? Sign In</a>';
  } else {
    loginForm.style.display = "block";
    signupForm.style.display = "none";
    title.innerText = "Sign In to AURA ERP";
    subtitle.innerText = "Access your role-based procurement workspace";
    footerLinks.innerHTML = `
      <a class="login-link" onclick="toggleSignupView(true)">Don't have an account? Sign Up</a>
      <a class="login-link" onclick="toggleForgotView(true)">Forgot Password?</a>
    `;
  }
}

function toggleForgotView(show) {
  const loginForm = document.getElementById("loginForm");
  const forgotView = document.getElementById("forgotPasswordView");
  const footerLinks = document.getElementById("loginFooterLinks");
  const title = document.getElementById("loginFormTitle");
  const subtitle = document.getElementById("loginFormSubtitle");

  if (show) {
    loginForm.style.display = "none";
    forgotView.style.display = "block";
    footerLinks.style.display = "none";
    title.innerText = "Recover Password";
    subtitle.innerText = "We'll send you recovery details";
  } else {
    loginForm.style.display = "block";
    forgotView.style.display = "none";
    footerLinks.style.display = "flex";
    title.innerText = "Sign In to AURA ERP";
    subtitle.innerText = "Access your role-based procurement workspace";
  }
}

// ----------------------------------------------------
// SCREEN RENDERING
// ----------------------------------------------------

// 2. Dashboard
function renderDashboard() {
  const rfqs = DB.getRFQs();
  const quotations = DB.getQuotations();
  const pos = DB.getPOs();
  const vendors = DB.getVendors();
  const user = DB.getCurrentUser();

  // 1. Stats Counter Math
  const activeCount = rfqs.filter(r => r.status === "Active" || r.status === "Quotations Received").length;
  document.getElementById("dashActiveRFQs").innerText = activeCount;

  // Pending Approvals
  const pendingApprovals = pos.filter(po => po.status === "Pending Approval");
  document.getElementById("dashPendingApprovals").innerText = pendingApprovals.length;

  // Spend value (sum of all approved POs)
  const totalSpend = pos.filter(po => po.status === "Approved" || po.status === "Invoice Generated")
    .reduce((sum, po) => sum + po.grandTotal, 0);
  document.getElementById("dashTotalSpend").innerText = `₹${totalSpend.toLocaleString('en-IN')}`;

  // Active Vendors count
  const activeVendors = vendors.filter(v => v.status === "Active").length;
  document.getElementById("dashActiveVendors").innerText = activeVendors;

  // 2. Render pending approvals table
  const tbody = document.getElementById("dashPendingApprovalsTableBody");
  if (pendingApprovals.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No approvals currently pending</td></tr>`;
  } else {
    tbody.innerHTML = pendingApprovals.map(po => {
      const vendorName = vendors.find(v => v.id === po.vendorId)?.name || "Unknown";
      return `
        <tr>
          <td style="font-weight: 700;">${po.poNumber}</td>
          <td>${vendorName}</td>
          <td>₹${po.grandTotal.toLocaleString('en-IN')}</td>
          <td>
            <button class="btn btn-secondary btn-sm" onclick="switchScreen('approvals'); loadPOForApproval('${po.id}');">Review</button>
          </td>
        </tr>
      `;
    }).join("");
  }

  // 3. Render recent activities logs
  const timeline = document.getElementById("dashLogsTimeline");
  const logs = DB.getLogs().slice(0, 4);
  if (logs.length === 0) {
    timeline.innerHTML = `<p style="font-size: 13px; color: var(--text-muted);">No activity recorded yet</p>`;
  } else {
    timeline.innerHTML = logs.map(l => {
      const timeStr = formatTimeAgo(l.timestamp);
      let typeClass = "info";
      if (l.action.includes("Create")) typeClass = "success";
      else if (l.action.includes("Approve")) typeClass = "success";
      else if (l.action.includes("Reject")) typeClass = "danger";
      else if (l.action.includes("Quotation")) typeClass = "warning";
      
      return `
        <div class="timeline-item ${typeClass}">
          <div class="timeline-marker"></div>
          <div class="timeline-content">
            <span class="timeline-time">${timeStr}</span>
            <span class="timeline-title">${l.action}</span>
            <span class="timeline-desc">${l.details} <strong style="font-size: 11px;">(${l.userName})</strong></span>
          </div>
        </div>
      `;
    }).join("");
  }
}

// Helper: Time Formatting
function formatTimeAgo(isoString) {
  const date = new Date(isoString);
  const diffMs = new Date() - date;
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// 3. Vendor Management
function renderVendorDirectory() {
  const vendors = DB.getVendors();
  const search = document.getElementById("vendorSearch").value.toLowerCase();
  const catFilter = document.getElementById("vendorCategoryFilter").value;
  const statFilter = document.getElementById("vendorStatusFilter").value;
  const tbody = document.getElementById("vendorTableBody");

  const filtered = vendors.filter(v => {
    const matchesSearch = v.name.toLowerCase().includes(search) || 
                          v.category.toLowerCase().includes(search) || 
                          v.contactEmail.toLowerCase().includes(search);
    const matchesCat = !catFilter || v.category === catFilter;
    const matchesStat = !statFilter || v.status === statFilter;
    return matchesSearch && matchesCat && matchesStat;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 32px;">No vendors found matching criteria.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(v => {
    let statClass = "badge-secondary";
    if (v.status === "Active") statClass = "badge-success";
    else if (v.status === "Pending") statClass = "badge-warning";
    else if (v.status === "Inactive") statClass = "badge-danger";

    const ratingStars = "★".repeat(Math.round(v.rating)) + "☆".repeat(5 - Math.round(v.rating));

    return `
      <tr>
        <td>
          <div style="font-weight: 700; color: var(--text-main);">${v.name}</div>
          <div style="font-size: 11px; color: var(--text-muted);">${v.contactEmail} | ${v.contactPhone}</div>
        </td>
        <td><span class="badge" style="background-color: var(--primary-light); color: var(--primary); font-size: 10px;">${v.category}</span></td>
        <td><span style="font-family: monospace; font-size: 12px; font-weight: 600;">${v.gstNumber}</span></td>
        <td>
          <span style="color: #f59e0b; font-weight: 700;">${v.rating}</span>
          <span style="color: #cbd5e1; font-size: 12px; margin-left: 2px;">${ratingStars}</span>
        </td>
        <td><span class="badge ${statClass}">${v.status}</span></td>
        <td style="text-align: right;">
          ${DB.getCurrentUser()?.role === 'admin' && v.status === 'Pending' ? 
            `<button class="btn btn-success btn-sm" onclick="approveVendor('${v.id}')">Approve</button>` : 
            `<button class="btn btn-secondary btn-sm" onclick="showVendorDetails('${v.id}')">View Details</button>`
          }
        </td>
      </tr>
    `;
  }).join("");
}

function approveVendor(vendorId) {
  const vendors = DB.getVendors();
  const vIndex = vendors.findIndex(v => v.id === vendorId);
  if (vIndex !== -1) {
    vendors[vIndex].status = "Active";
    DB.saveVendors(vendors);
    DB.addLog("Vendor Approval", `Approved vendor: ${vendors[vIndex].name}`);
    showToast(`Vendor ${vendors[vIndex].name} approved successfully!`, "success");
    renderVendorDirectory();
  }
}

function showVendorDetails(vendorId) {
  const vendor = DB.getVendors().find(v => v.id === vendorId);
  if (!vendor) return;
  document.getElementById("vendorDetailTitle").innerText = vendor.name;
  const ratingStars = "★".repeat(Math.round(vendor.rating)) + "☆".repeat(5 - Math.round(vendor.rating));
  let compBadge = `<span class="badge badge-success">High Compliance</span>`;
  if (vendor.rating < 4.2) compBadge = `<span class="badge badge-warning">Under Observation</span>`;
  if (vendor.status === "Inactive") compBadge = `<span class="badge badge-danger">Suspended</span>`;
  document.getElementById("vendorDetailBody").innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:13px;">
      <div><div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">Company</div><strong>${vendor.name}</strong></div>
      <div><div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">Category</div><span class="badge" style="background:var(--primary-light);color:var(--primary);">${vendor.category}</span></div>
      <div><div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">Email</div>${vendor.contactEmail}</div>
      <div><div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">Phone</div>${vendor.contactPhone}</div>
      <div style="grid-column:span 2;"><div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">Address</div>${vendor.address}</div>
      <div><div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">GSTIN</div><code style="font-size:12px;">${vendor.gstNumber}</code></div>
      <div><div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">Status</div><span class="badge ${vendor.status === 'Active' ? 'badge-success' : vendor.status === 'Pending' ? 'badge-warning' : 'badge-danger'}">${vendor.status}</span></div>
    </div>
    <div style="background:var(--bg-main);padding:14px;border-radius:var(--radius-sm);display:flex;justify-content:space-between;align-items:center;">
      <div><div style="font-size:11px;color:var(--text-muted);font-weight:600;">Performance Rating</div><div style="font-size:24px;font-weight:800;color:#f59e0b;">${vendor.rating} <span style="font-size:14px;">${ratingStars}</span></div></div>
      <div style="text-align:right;">${compBadge}</div>
    </div>
  `;
  document.getElementById("vendorDetailsModal").classList.add("active");
}

function closeVendorDetailsModal() {
  document.getElementById("vendorDetailsModal").classList.remove("active");
}

// Onboarding Modal Toggle
function openRegisterVendorModal() {
  document.getElementById("registerVendorModal").classList.add("active");
}
function closeRegisterVendorModal() {
  document.getElementById("registerVendorModal").classList.remove("active");
  document.getElementById("registerVendorForm").reset();
}

function handleRegisterVendorSubmit(e) {
  e.preventDefault();
  const name = document.getElementById("vRegName").value.trim();
  const cat = document.getElementById("vRegCategory").value;
  const gst = document.getElementById("vRegGst").value.trim().toUpperCase();
  const email = document.getElementById("vRegEmail").value.trim();
  const phone = document.getElementById("vRegPhone").value.trim();
  const addr = document.getElementById("vRegAddress").value.trim();

  // Basic GST Format Validation: 15 Chars (e.g. 27AAAAA1111A1Z1)
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (!gstRegex.test(gst)) {
    showToast("Invalid GSTIN format. E.g. 27AAAAA1111A1Z1", "danger");
    return;
  }

  const vendors = DB.getVendors();
  if (vendors.some(v => v.gstNumber === gst)) {
    showToast("Vendor with this GSTIN already registered", "danger");
    return;
  }

  const newVendor = {
    id: "v-" + Date.now(),
    name: name,
    category: cat,
    gstNumber: gst,
    contactEmail: email,
    contactPhone: phone,
    address: addr,
    status: DB.getCurrentUser()?.role === "admin" ? "Active" : "Pending", // Admin auto-approves
    rating: 5.0
  };

  vendors.push(newVendor);
  DB.saveVendors(vendors);
  
  DB.addLog("Vendor Onboard", `Registered new vendor: ${name} (${cat})`);
  showToast(`Vendor ${name} onboarding request saved.`, "success");
  closeRegisterVendorModal();
  renderVendorDirectory();
}

// 4. RFQ Creation
let rfqItemIndex = 1;

function addRFQItemRow() {
  const tbody = document.getElementById("rfqItemsTableBody");
  const newRow = document.createElement("tr");
  newRow.innerHTML = `
    <td><input type="text" class="form-input rfq-item-name" placeholder="Item/Service name" required></td>
    <td><input type="number" class="form-input rfq-item-qty" placeholder="Qty" min="1" required></td>
    <td style="text-align: center;"><button type="button" class="btn btn-danger btn-sm" onclick="this.closest('tr').remove()">×</button></td>
  `;
  tbody.appendChild(newRow);
}

function renderRFQVendorSelection() {
  const vendors = DB.getVendors().filter(v => v.status === "Active");
  const searchVal = document.getElementById("rfqVendorSearch").value.toLowerCase();
  const container = document.getElementById("rfqVendorSelectionList");

  const filtered = vendors.filter(v => 
    v.name.toLowerCase().includes(searchVal) || v.category.toLowerCase().includes(searchVal)
  );

  if (filtered.length === 0) {
    container.innerHTML = `<p style="font-size: 13px; color: var(--text-muted); text-align: center;">No active vendors found.</p>`;
    return;
  }

  container.innerHTML = filtered.map(v => `
    <label style="display: flex; align-items: center; gap: 10px; font-size: 13px; padding: 6px 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); cursor: pointer; background: white;">
      <input type="checkbox" name="rfqAssignedVendors" value="${v.id}" checked>
      <div style="flex: 1;">
        <span style="font-weight: 700;">${v.name}</span>
        <span style="font-size: 10px; color: var(--text-muted); background: var(--bg-main); padding: 2px 6px; border-radius: var(--radius-full); margin-left: 6px;">${v.category}</span>
      </div>
      <div style="color: #f59e0b; font-weight: 700; font-size: 12px;">★ ${v.rating}</div>
    </label>
  `).join("");
}

function handleRFQSubmit(e) {
  e.preventDefault();
  const title = document.getElementById("rfqTitle").value.trim();
  const desc = document.getElementById("rfqDescription").value.trim();
  const deadline = document.getElementById("rfqDeadline").value;
  
  // Collect line items
  const itemRows = document.querySelectorAll("#rfqItemsTableBody tr");
  const items = [];
  itemRows.forEach(row => {
    const name = row.querySelector(".rfq-item-name").value.trim();
    const qty = parseInt(row.querySelector(".rfq-item-qty").value);
    if (name && qty) {
      items.push({ name, qty });
    }
  });

  if (items.length === 0) {
    showToast("Please add at least one line item.", "warning");
    return;
  }

  // Collect assigned vendors
  const checkedVendors = document.querySelectorAll("input[name='rfqAssignedVendors']:checked");
  const assignedVendors = [];
  checkedVendors.forEach(cb => assignedVendors.push(cb.value));

  if (assignedVendors.length === 0) {
    showToast("Please assign at least one active vendor.", "warning");
    return;
  }

  const rfqs = DB.getRFQs();
  const rfqNum = `RFQ-2026-0${rfqs.length + 1}`;
  const currentUser = DB.getCurrentUser();

  const newRFQ = {
    id: "rfq-" + Date.now(),
    rfqNumber: rfqNum,
    title: title,
    description: desc,
    items: items,
    deadline: deadline,
    assignedVendors: assignedVendors,
    status: "Active",
    createdBy: currentUser.name,
    createdAt: new Date().toISOString()
  };

  rfqs.unshift(newRFQ);
  DB.saveRFQs(rfqs);

  DB.addLog("RFQ Creation", `Created RFQ: ${rfqNum} - ${title}`);
  showToast(`RFQ ${rfqNum} successfully created and vendors notified!`, "success");

  // Reset form
  document.getElementById("rfqCreateForm").reset();
  // Clear table rows except one
  document.getElementById("rfqItemsTableBody").innerHTML = `
    <tr>
      <td><input type="text" class="form-input rfq-item-name" placeholder="Item/Service name" required></td>
      <td><input type="number" class="form-input rfq-item-qty" placeholder="Qty" min="1" required></td>
      <td style="text-align: center;"><button type="button" class="btn btn-danger btn-sm" onclick="this.closest('tr').remove()">×</button></td>
    </tr>
  `;
  switchScreen("dashboard");
}

// 5. Vendor Quotation Submission Screen
function renderVendorRFQInvitations() {
  const user = DB.getCurrentUser();
  if (!user || user.role !== "vendor") return;

  const rfqs = DB.getRFQs();
  const quotations = DB.getQuotations();
  const tbody = document.getElementById("vendorRFQListTableBody");

  // Filter RFQs assigned to this vendor
  const assigned = rfqs.filter(r => r.assignedVendors.includes(user.vendorId));

  if (assigned.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 20px;">No RFQs assigned to you.</td></tr>`;
    return;
  }

  tbody.innerHTML = assigned.map(r => {
    // Check if vendor already submitted quotation
    const quote = quotations.find(q => q.rfqId === r.id && q.vendorId === user.vendorId);
    let quoteBadge = "";
    let btnText = "Compile Quote";
    let btnClass = "btn-primary";

    if (quote) {
      if (quote.status === "Draft") {
        quoteBadge = `<span class="badge badge-secondary" style="margin-left: 6px;">Draft</span>`;
        btnText = "Edit Quote";
        btnClass = "btn-secondary";
      } else {
        quoteBadge = `<span class="badge badge-success" style="margin-left: 6px;">Submitted</span>`;
        btnText = "View Submitted";
        btnClass = "btn-secondary";
      }
    }

    return `
      <tr>
        <td style="font-weight: 700;">${r.rfqNumber}${quoteBadge}</td>
        <td>${r.title}</td>
        <td>${new Date(r.deadline).toLocaleDateString('en-IN')}</td>
        <td>
          <button class="btn ${btnClass} btn-sm" onclick="loadRFQIntoWorkspace('${r.id}')">${btnText}</button>
        </td>
      </tr>
    `;
  }).join("");
}

function loadRFQIntoWorkspace(rfqId) {
  const rfq = DB.getRFQs().find(r => r.id === rfqId);
  const user = DB.getCurrentUser();
  const quotations = DB.getQuotations();
  const existingQuote = quotations.find(q => q.rfqId === rfqId && q.vendorId === user.vendorId);

  document.getElementById("quoteWorkspacePlaceholder").style.display = "none";
  const panel = document.getElementById("quoteWorkspacePanel");
  panel.style.display = "block";

  document.getElementById("quoteActiveRFQId").value = rfqId;
  document.getElementById("quoteWorkspaceTitle").innerText = `Compile Quotation for ${rfq.rfqNumber}`;

  // Description summary
  document.getElementById("quoteRFQSummary").innerHTML = `
    <div><strong>Title:</strong> ${rfq.title}</div>
    <div><strong>Details:</strong> ${rfq.description}</div>
    <div><strong>Deadline:</strong> ${new Date(rfq.deadline).toLocaleDateString('en-IN')}</div>
  `;

  // Item lines pricing inputs
  const pricingBody = document.getElementById("quoteItemsPricingBody");
  pricingBody.innerHTML = rfq.items.map((item, idx) => {
    let unitPrice = "";
    if (existingQuote) {
      const matchItem = existingQuote.items.find(i => i.name === item.name);
      if (matchItem) unitPrice = matchItem.unitPrice;
    }
    return `
      <tr>
        <td style="font-weight: 600;">${item.name}</td>
        <td>${item.qty} <input type="hidden" class="pricing-qty" value="${item.qty}"> <input type="hidden" class="pricing-name" value="${item.name}"></td>
        <td>
          <div style="position: relative; display: flex; align-items: center;">
            <span style="position: absolute; left: 10px; font-weight: 700; font-size: 13px; color: var(--text-muted);">₹</span>
            <input type="number" class="form-input pricing-unitprice" style="padding-left: 24px;" placeholder="0.00" value="${unitPrice}" min="1" required oninput="recalcQuoteTotals()" ${existingQuote && existingQuote.status === 'Submitted' ? 'readonly' : ''}>
          </div>
        </td>
        <td style="font-weight:700;color:var(--primary);" id="row-total-${idx}">₹${unitPrice ? (item.qty * parseFloat(unitPrice)).toLocaleString('en-IN') : '—'}</td>
      </tr>
    `;
  }).join("");

  // Add live totals footer row
  const tfoot = document.createElement('tfoot');
  tfoot.id = 'quoteTotalsFooter';
  tfoot.innerHTML = `<tr style="background:var(--bg-main);"><td colspan="3" style="text-align:right;font-weight:700;padding:10px 16px;">Subtotal / GST (18%) / Grand Total:</td><td style="font-weight:800;color:var(--primary);padding:10px 16px;" id="quoteLiveTotal">₹0 / ₹0 / ₹0</td></tr>`;
  pricingBody.closest('table').appendChild(tfoot);
  recalcQuoteTotals();

  // Prefill timeline & notes
  const timelineInput = document.getElementById("quoteDeliveryTimeline");
  const notesInput = document.getElementById("quoteNotes");
  const submitBtn = panel.querySelector("button[type='submit']");

  if (existingQuote) {
    timelineInput.value = existingQuote.deliveryTimelineDays;
    notesInput.value = existingQuote.notes;
    
    if (existingQuote.status === "Submitted") {
      timelineInput.readOnly = true;
      notesInput.readOnly = true;
      submitBtn.style.display = "none";
    } else {
      timelineInput.readOnly = false;
      notesInput.readOnly = false;
      submitBtn.style.display = "block";
      submitBtn.innerText = "Resubmit Official Quotation";
    }
  } else {
    timelineInput.value = "";
    notesInput.value = "";
    timelineInput.readOnly = false;
    notesInput.readOnly = false;
    submitBtn.style.display = "block";
    submitBtn.innerText = "Submit Official Quotation";
  }
}

function handleQuoteSubmit(e) {
  e.preventDefault();
  const rfqId = document.getElementById("quoteActiveRFQId").value;
  const user = DB.getCurrentUser();
  const rfq = DB.getRFQs().find(r => r.id === rfqId);

  // Collect prices
  const rows = document.querySelectorAll("#quoteItemsPricingBody tr");
  const items = [];
  rows.forEach(row => {
    const name = row.querySelector(".pricing-name").value;
    const qty = parseInt(row.querySelector(".pricing-qty").value);
    const unitPrice = parseFloat(row.querySelector(".pricing-unitprice").value);
    items.push({
      name, qty, unitPrice, total: qty * unitPrice
    });
  });

  const timeline = parseInt(document.getElementById("quoteDeliveryTimeline").value);
  const notes = document.getElementById("quoteNotes").value.trim();

  const quotations = DB.getQuotations();
  const existingIndex = quotations.findIndex(q => q.rfqId === rfqId && q.vendorId === user.vendorId);

  const newQuote = {
    id: existingIndex !== -1 ? quotations[existingIndex].id : "q-" + Date.now(),
    rfqId: rfqId,
    rfqNumber: rfq.rfqNumber,
    vendorId: user.vendorId,
    vendorName: user.company,
    items: items,
    deliveryTimelineDays: timeline,
    notes: notes,
    status: "Pending Review",
    submittedAt: new Date().toISOString()
  };

  if (existingIndex !== -1) {
    quotations[existingIndex] = newQuote;
  } else {
    quotations.push(newQuote);
  }

  DB.saveQuotations(quotations);
  
  // Set RFQ status to "Quotations Received"
  const rfqs = DB.getRFQs();
  const rfqIndex = rfqs.findIndex(r => r.id === rfqId);
  if (rfqIndex !== -1 && rfqs[rfqIndex].status === "Active") {
    rfqs[rfqIndex].status = "Quotations Received";
    DB.saveRFQs(rfqs);
  }

  DB.addLog("Quotation Submission", `Submitted quote for ${rfq.rfqNumber} by ${user.company}`);
  showToast("Quotation submitted successfully!", "success");

  // Reset workspace
  document.getElementById("quoteWorkspacePanel").style.display = "none";
  document.getElementById("quoteWorkspacePlaceholder").style.display = "flex";
  
  renderVendorRFQInvitations();
}

// 6. Quotation Comparison Screen
function loadComparisonRFQs() {
  const rfqs = DB.getRFQs();
  const quotations = DB.getQuotations();
  const select = document.getElementById("compareRFQSelect");

  // Show only RFQs that have at least one quotation submitted
  const rfqWithQuotes = rfqs.filter(r => quotations.some(q => q.rfqId === r.id));

  if (rfqWithQuotes.length === 0) {
    select.innerHTML = `<option value="">No RFQs with quotations yet</option>`;
    document.getElementById("quotationsComparisonGrid").innerHTML = "";
    document.getElementById("compareEmptyState").style.display = "flex";
    return;
  }

  document.getElementById("compareEmptyState").style.display = "none";
  
  select.innerHTML = rfqWithQuotes.map((r, idx) => `
    <option value="${r.id}" ${idx === 0 ? 'selected' : ''}>${r.rfqNumber} - ${r.title}</option>
  `).join("");

  // Auto trigger render for the first item
  renderQuotationComparison(rfqWithQuotes[0].id);
}

function renderQuotationComparison(rfqId) {
  if (!rfqId) {
    document.getElementById("quotationsComparisonGrid").innerHTML = "";
    return;
  }

  const quotes = DB.getQuotations().filter(q => q.rfqId === rfqId);
  const vendors = DB.getVendors();
  const grid = document.getElementById("quotationsComparisonGrid");

  if (quotes.length === 0) {
    grid.innerHTML = "";
    document.getElementById("compareEmptyState").style.display = "flex";
    return;
  }
  document.getElementById("compareEmptyState").style.display = "none";

  // Calculate totals and find the lowest price
  const quotesWithTotals = quotes.map(q => {
    const totalCost = q.items.reduce((sum, item) => sum + item.total, 0);
    const vendorRating = vendors.find(v => v.id === q.vendorId)?.rating || 0;
    return { ...q, totalCost, vendorRating };
  });

  // Sort to find the absolute lowest totalCost
  const lowestCost = Math.min(...quotesWithTotals.map(q => q.totalCost));

  // Sort quotes by cost
  quotesWithTotals.sort((a, b) => a.totalCost - b.totalCost);

  grid.innerHTML = quotesWithTotals.map(q => {
    const isLowest = q.totalCost === lowestCost;
    const itemsRows = q.items.map(item => `
      <tr>
        <td style="font-size: 12px; padding: 6px;">${item.name}</td>
        <td style="font-size: 12px; padding: 6px; text-align: center;">${item.qty}</td>
        <td style="font-size: 12px; padding: 6px; font-weight: 700;">₹${item.unitPrice}</td>
        <td style="font-size: 12px; padding: 6px; font-weight: 700;">₹${item.total.toLocaleString('en-IN')}</td>
      </tr>
    `).join("");

    return `
      <div class="card quote-comparison-card ${isLowest ? 'lowest-price' : ''}" style="border: 2px solid ${isLowest ? 'var(--success)' : 'var(--border)'}; background-color: ${isLowest ? 'rgba(16, 185, 129, 0.01)' : 'var(--bg-card)'};">
        <div class="quote-vendor-title">
          <span>${q.vendorName}</span>
          <span style="color: #f59e0b; font-size: 14px;">★ ${q.vendorRating.toFixed(1)}</span>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">
          <div class="quote-meta-row">
            <span style="color: var(--text-muted); font-weight: 600;">Delivery Timeline:</span>
            <span style="font-weight: 700; color: ${q.deliveryTimelineDays <= 3 ? 'var(--success)' : 'var(--text-main)'};">${q.deliveryTimelineDays} Days</span>
          </div>
          <div class="quote-meta-row">
            <span style="color: var(--text-muted); font-weight: 600;">Quoted Total Amount:</span>
            <span style="font-size: 16px; font-weight: 800; color: ${isLowest ? 'var(--success)' : 'var(--primary)'};">₹${q.totalCost.toLocaleString('en-IN')}</span>
          </div>
          <div class="quote-meta-row" style="flex-direction: column; gap: 4px; padding-bottom: 0; border: none;">
            <span style="color: var(--text-muted); font-weight: 600;">Vendor Notes:</span>
            <p style="font-size: 12px; font-style: italic; color: var(--text-muted); line-height: 1.4; margin-top: 2px;">"${q.notes || 'No remarks provided.'}"</p>
          </div>
        </div>

        <div style="margin-top: 10px;">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 6px;">Line Pricing Matrix</div>
          <div class="table-responsive" style="border-radius: var(--radius-sm); border-color: var(--border);">
            <table class="quote-items-table">
              <thead>
                <tr style="background: var(--bg-main);">
                  <th style="font-size: 10px; padding: 6px;">Item</th>
                  <th style="font-size: 10px; padding: 6px; text-align: center;">Qty</th>
                  <th style="font-size: 10px; padding: 6px;">Unit</th>
                  <th style="font-size: 10px; padding: 6px;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
              </tbody>
            </table>
          </div>
        </div>

        <div style="margin-top: auto; padding-top: 20px;">
          <button class="btn btn-primary" style="width: 100%;" onclick="submitForApproval('${q.id}')">Submit Request for PO Approval</button>
        </div>
      </div>
    `;
  }).join("");
}

function submitForApproval(quotationId) {
  const quote = DB.getQuotations().find(q => q.id === quotationId);
  const pos = DB.getPOs();

  // Check if PO already exists
  if (pos.some(po => po.quotationId === quotationId)) {
    showToast("This quotation has already been submitted for approval.", "warning");
    return;
  }

  const total = quote.items.reduce((sum, i) => sum + i.total, 0);
  const tax = total * 0.18; // 18% GST standard calculation
  const grandTotal = total + tax;
  const poNum = `PO-2026-0${pos.length + 1}`;

  const newPO = {
    id: "po-" + Date.now(),
    poNumber: poNum,
    rfqId: quote.rfqId,
    quotationId: quotationId,
    vendorId: quote.vendorId,
    items: quote.items,
    total: total,
    tax: tax,
    grandTotal: grandTotal,
    status: "Pending Approval",
    approvedBy: "",
    createdAt: new Date().toISOString()
  };

  pos.push(newPO);
  DB.savePOs(pos);

  // Set RFQ status to "Approved & Closed"
  const rfqs = DB.getRFQs();
  const rIdx = rfqs.findIndex(r => r.id === quote.rfqId);
  if (rIdx !== -1) {
    rfqs[rIdx].status = "Under Review";
    DB.saveRFQs(rfqs);
  }

  DB.addLog("PO Approval Subscribed", `Generated PO draft ${poNum} for ${quote.vendorName} & requested Manager approval.`);
  showToast(`PO request ${poNum} submitted for manager approval!`, "success");
  switchScreen("dashboard");
}

// 7. Approval Workflow
function renderApprovalQueue() {
  const pos = DB.getPOs();
  const vendors = DB.getVendors();
  const rfqs = DB.getRFQs();
  const tbody = document.getElementById("approvalsListTableBody");

  const pending = pos.filter(po => po.status === "Pending Approval");

  if (pending.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 32px;">No approval requests currently pending.</td></tr>`;
    document.getElementById("approvalActionPanel").style.display = "none";
    document.getElementById("approvalActionPlaceholder").style.display = "flex";
    return;
  }

  tbody.innerHTML = pending.map(po => {
    const vendor = vendors.find(v => v.id === po.vendorId)?.name || "Unknown";
    const rfqTitle = rfqs.find(r => r.id === po.rfqId)?.title || "Unknown RFQ";
    return `
      <tr>
        <td style="font-weight: 700;">${po.poNumber}</td>
        <td>${vendor}</td>
        <td>${rfqTitle}</td>
        <td>₹${po.grandTotal.toLocaleString('en-IN')}</td>
        <td>
          <button class="btn btn-primary btn-sm" onclick="loadPOForApproval('${po.id}')">Review Details</button>
        </td>
      </tr>
    `;
  }).join("");
}

function loadPOForApproval(poId) {
  const po = DB.getPOs().find(p => p.id === poId);
  const vendor = DB.getVendors().find(v => v.id === po.vendorId);
  const rfq = DB.getRFQs().find(r => r.id === po.rfqId);
  const user = DB.getCurrentUser();

  document.getElementById("approvalActionPlaceholder").style.display = "none";
  const panel = document.getElementById("approvalActionPanel");
  panel.style.display = "block";

  const rows = po.items.map(item => `
    <tr style="border-bottom: 1px solid var(--border);">
      <td style="padding: 6px 0;">${item.name}</td>
      <td style="padding: 6px 0; text-align: center;">${item.qty}</td>
      <td style="padding: 6px 0; font-weight: 700; text-align: right;">₹${item.unitPrice}</td>
      <td style="padding: 6px 0; font-weight: 700; text-align: right;">₹${item.total.toLocaleString('en-IN')}</td>
    </tr>
  `).join("");

  document.getElementById("approvalDetailsContainer").innerHTML = `
    <div style="background-color: var(--bg-main); padding: 16px; border-radius: var(--radius-sm); border-left: 4px solid var(--primary); display: flex; flex-direction: column; gap: 8px;">
      <div><strong>PO Reference:</strong> ${po.poNumber}</div>
      <div><strong>Origin RFQ:</strong> ${rfq?.rfqNumber} - ${rfq?.title}</div>
      <div><strong>Vendor:</strong> ${vendor?.name} (Rating: ${vendor?.rating} ★, Category: ${vendor?.category})</div>
    </div>
    
    <div>
      <div style="font-weight: 700; font-size: 12px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px;">Procurement Line Items</div>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <thead>
          <tr style="border-bottom: 2px solid var(--border); font-weight: 700; color: var(--text-muted); text-align: left;">
            <th style="background: none; padding: 4px 0; font-size: 11px;">Item</th>
            <th style="background: none; padding: 4px 0; font-size: 11px; text-align: center;">Qty</th>
            <th style="background: none; padding: 4px 0; font-size: 11px; text-align: right;">Unit Price</th>
            <th style="background: none; padding: 4px 0; font-size: 11px; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>

    <div style="border-top: 1px dashed var(--border); padding-top: 10px; display: flex; flex-direction: column; gap: 6px; font-size: 13px; align-self: flex-end; width: 250px;">
      <div style="display: flex; justify-content: space-between;"><span>Items Subtotal:</span><span>₹${po.total.toLocaleString('en-IN')}</span></div>
      <div style="display: flex; justify-content: space-between;"><span>Estimated Tax (18% GST):</span><span>₹${po.tax.toLocaleString('en-IN')}</span></div>
      <div style="display: flex; justify-content: space-between; font-weight: 800; font-size: 15px; color: var(--primary);"><span>Total Budget:</span><span>₹${po.grandTotal.toLocaleString('en-IN')}</span></div>
    </div>
  `;

  // Dynamic Event Attachment to buttons
  const btnApprove = document.getElementById("btnApproveApproval");
  const btnReject = document.getElementById("btnRejectApproval");
  
  // Clear existing event listeners
  btnApprove.replaceWith(btnApprove.cloneNode(true));
  btnReject.replaceWith(btnReject.cloneNode(true));

  document.getElementById("btnApproveApproval").addEventListener("click", () => handleExecuteApproval(po.id, true));
  document.getElementById("btnRejectApproval").addEventListener("click", () => handleExecuteApproval(po.id, false));
}

function handleExecuteApproval(poId, approve) {
  const remarks = document.getElementById("approvalRemarks").value.trim();
  if (!remarks) {
    showToast("Please provide review remarks for this action", "warning");
    return;
  }

  const pos = DB.getPOs();
  const poIndex = pos.findIndex(p => p.id === poId);
  const currentUser = DB.getCurrentUser();

  if (poIndex !== -1) {
    if (approve) {
      pos[poIndex].status = "Approved";
      pos[poIndex].approvedBy = currentUser.name;
      pos[poIndex].remarks = remarks;
      
      // Auto-generate corresponding Invoice in database
      const invoices = DB.getInvoices();
      const invoiceNum = `INV-2026-0${invoices.length + 1}`;
      
      const newInvoice = {
        id: "inv-" + Date.now(),
        invoiceNumber: invoiceNum,
        poId: poId,
        poNumber: pos[poIndex].poNumber,
        vendorId: pos[poIndex].vendorId,
        total: pos[poIndex].total,
        tax: pos[poIndex].tax,
        grandTotal: pos[poIndex].grandTotal,
        items: pos[poIndex].items,
        status: "Draft", // Starts as Draft invoice
        createdAt: new Date().toISOString()
      };
      
      invoices.push(newInvoice);
      DB.saveInvoices(invoices);

      // Close RFQ status
      const rfqs = DB.getRFQs();
      const rIndex = rfqs.findIndex(r => r.id === pos[poIndex].rfqId);
      if (rIndex !== -1) {
        rfqs[rIndex].status = "Completed";
        DB.saveRFQs(rfqs);
      }

      DB.addLog("PO Approved", `Approved Purchase Order ${pos[poIndex].poNumber} & Generated invoice draft ${invoiceNum}.`);
      showToast(`PO ${pos[poIndex].poNumber} approved! Invoice Generated.`, "success");
    } else {
      pos[poIndex].status = "Rejected";
      pos[poIndex].approvedBy = currentUser.name;
      pos[poIndex].remarks = remarks;

      DB.addLog("PO Rejected", `Rejected Purchase Order ${pos[poIndex].poNumber}. Remarks: "${remarks}"`);
      showToast(`PO ${pos[poIndex].poNumber} has been rejected.`, "danger");
    }

    DB.savePOs(pos);
    document.getElementById("approvalRemarks").value = "";
    document.getElementById("approvalActionPanel").style.display = "none";
    document.getElementById("approvalActionPlaceholder").style.display = "flex";
    
    renderApprovalQueue();
  }
}

// 8. Purchase Order & Invoice Generation Screen
function renderDocList() {
  const pos = DB.getPOs();
  const invoices = DB.getInvoices();
  const vendors = DB.getVendors();
  const user = DB.getCurrentUser();
  const container = document.getElementById("poInvoiceDocList");

  if (pos.length === 0) {
    container.innerHTML = `<p style="font-size: 13px; color: var(--text-muted); text-align: center;">No transactions found.</p>`;
    document.getElementById("poDocViewerPanel").style.display = "none";
    document.getElementById("invoiceDocViewerPanel").style.display = "none";
    document.getElementById("poInvoicePlaceholder").style.display = "flex";
    return;
  }

  // Filter based on vendor role (only see their own invoices/orders)
  let filteredPOs = pos;
  let filteredInvoices = invoices;
  if (user.role === "vendor") {
    filteredPOs = pos.filter(po => po.vendorId === user.vendorId);
    filteredInvoices = invoices.filter(inv => inv.vendorId === user.vendorId);
  }

  container.innerHTML = filteredPOs.map(po => {
    const matchingInv = filteredInvoices.find(inv => inv.poId === po.id);
    const vendorName = vendors.find(v => v.id === po.vendorId)?.name || "Vendor";

    let poBadge = "";
    if (po.status === "Pending Approval") poBadge = `<span class="badge badge-warning" style="font-size: 8px;">Pending</span>`;
    else if (po.status === "Approved") poBadge = `<span class="badge badge-success" style="font-size: 8px;">Approved</span>`;
    else if (po.status === "Rejected") poBadge = `<span class="badge badge-danger" style="font-size: 8px;">Rejected</span>`;
    else poBadge = `<span class="badge badge-info" style="font-size: 8px;">Completed</span>`;

    let invBadgeStr = "";
    if (matchingInv) {
      if (matchingInv.status === "Sent") invBadgeStr = `<span class="badge badge-success" style="font-size: 8px; margin-left: 4px;">Sent</span>`;
      else invBadgeStr = `<span class="badge badge-secondary" style="font-size: 8px; margin-left: 4px;">Draft</span>`;
    }

    return `
      <div onclick="selectDocument('${po.id}', ${matchingInv ? `'${matchingInv.id}'` : 'null'})" style="padding: 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); cursor: pointer; background: white; transition: var(--transition);" class="doc-list-item" id="doc-item-${po.id}">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <strong style="font-size: 13px; color: var(--text-main);">${po.poNumber}</strong>
          ${poBadge}
        </div>
        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 6px;">${vendorName}</div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
          <span>₹${po.grandTotal.toLocaleString('en-IN')}</span>
          ${matchingInv ? `<span style="font-weight: 700; color: var(--primary);">${matchingInv.invoiceNumber}${invBadgeStr}</span>` : `<span style="color: var(--text-light);">No Invoice</span>`}
        </div>
      </div>
    `;
  }).join("");
}

function selectDocument(poId, invoiceId) {
  // Highlight chosen element in side pane
  document.querySelectorAll(".doc-list-item").forEach(item => {
    item.style.borderColor = "var(--border)";
    item.style.backgroundColor = "white";
  });
  
  const chosenEl = document.getElementById(`doc-item-${poId}`);
  if (chosenEl) {
    chosenEl.style.borderColor = "var(--primary)";
    chosenEl.style.backgroundColor = "rgba(79, 70, 229, 0.02)";
  }

  document.getElementById("poInvoicePlaceholder").style.display = "none";
  loadPODoc(poId);
  loadInvoiceDoc(invoiceId, poId);
}

function loadPODoc(poId) {
  const po = DB.getPOs().find(p => p.id === poId);
  const vendor = DB.getVendors().find(v => v.id === po.vendorId);
  const panel = document.getElementById("poDocViewerPanel");
  panel.style.display = "block";

  // Set status badge
  const badge = document.getElementById("poDocStatus");
  badge.className = "badge";
  if (po.status === "Pending Approval") {
    badge.classList.add("badge-warning");
    badge.innerText = "Pending";
  } else if (po.status === "Approved") {
    badge.classList.add("badge-success");
    badge.innerText = "Approved";
  } else if (po.status === "Rejected") {
    badge.classList.add("badge-danger");
    badge.innerText = "Rejected";
  }

  const itemsRows = po.items.map(i => `
    <tr>
      <td style="padding: 6px 0;">${i.name}</td>
      <td style="text-align: center;">${i.qty}</td>
      <td style="text-align: right;">₹${i.unitPrice}</td>
      <td style="text-align: right;">₹${i.total.toLocaleString('en-IN')}</td>
    </tr>
  `).join("");

  document.getElementById("poDocViewContent").innerHTML = `
    <div style="background-color: var(--bg-main); padding: 12px; border-radius: var(--radius-sm); font-size: 13px;">
      <div><strong>PO Number:</strong> ${po.poNumber}</div>
      <div><strong>Date Created:</strong> ${new Date(po.createdAt).toLocaleDateString('en-IN')}</div>
      <div><strong>Vendor:</strong> ${vendor?.name}</div>
      <div><strong>Approved By:</strong> ${po.approvedBy || 'N/A'}</div>
      ${po.remarks ? `<div style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed var(--border); font-style: italic;">"Remarks: ${po.remarks}"</div>` : ''}
    </div>

    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
      <thead>
        <tr style="border-bottom: 2px solid var(--border); text-align: left; color: var(--text-muted);">
          <th style="background: none; padding: 4px 0; font-size: 11px;">Item</th>
          <th style="background: none; padding: 4px 0; font-size: 11px; text-align: center;">Qty</th>
          <th style="background: none; padding: 4px 0; font-size: 11px; text-align: right;">Price</th>
          <th style="background: none; padding: 4px 0; font-size: 11px; text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
    </table>

    <div style="border-top: 1px dashed var(--border); padding-top: 10px; display: flex; flex-direction: column; gap: 4px; align-self: flex-end; width: 100%;">
      <div style="display: flex; justify-content: space-between;"><span>Subtotal:</span><span>₹${po.total.toLocaleString('en-IN')}</span></div>
      <div style="display: flex; justify-content: space-between;"><span>GST (18%):</span><span>₹${po.tax.toLocaleString('en-IN')}</span></div>
      <div style="display: flex; justify-content: space-between; font-weight: 800; color: var(--primary);"><span>Grand Total:</span><span>₹${po.grandTotal.toLocaleString('en-IN')}</span></div>
    </div>
  `;
}

function loadInvoiceDoc(invoiceId, poId) {
  const panel = document.getElementById("invoiceDocViewerPanel");
  panel.style.display = "block";

  const statusBadge = document.getElementById("invoiceDocStatus");
  statusBadge.className = "badge";

  if (!invoiceId) {
    statusBadge.classList.add("badge-secondary");
    statusBadge.innerText = "Unavailable";
    
    document.getElementById("invoiceDocViewContent").innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 40px 10px;">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-light)" stroke-width="2" style="margin-bottom: 12px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <p style="font-size: 13px; font-weight: 600;">Invoice pending PO approval.</p>
        <p style="font-size: 11px; margin-top: 4px;">Once this purchase order is approved by the manager, the system will auto-generate the official invoice document.</p>
      </div>
    `;
    return;
  }

  const invoice = DB.getInvoices().find(i => i.id === invoiceId);
  const po = DB.getPOs().find(p => p.id === poId);
  const vendor = DB.getVendors().find(v => v.id === invoice.vendorId);

  if (invoice.status === "Sent") {
    statusBadge.classList.add("badge-success");
    statusBadge.innerText = "Sent via Email";
  } else {
    statusBadge.classList.add("badge-warning");
    statusBadge.innerText = "Draft Invoice";
  }

  document.getElementById("invoiceDocViewContent").innerHTML = `
    <div style="background-color: var(--bg-main); padding: 12px; border-radius: var(--radius-sm); font-size: 13px;">
      <div><strong>Invoice ID:</strong> ${invoice.invoiceNumber}</div>
      <div><strong>PO Link:</strong> ${po.poNumber}</div>
      <div><strong>Vendor:</strong> ${vendor?.name}</div>
      <div><strong>Total Amount:</strong> ₹${invoice.grandTotal.toLocaleString('en-IN')}</div>
    </div>

    <!-- Action Tools -->
    <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">
      <button class="btn btn-primary" onclick="triggerPrintInvoice('${invoice.id}')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        Print Invoice
      </button>
      <button class="btn btn-success" onclick="openEmailModal('${invoice.id}')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
        Send via Email
      </button>
      <button class="btn btn-secondary" onclick="triggerDownloadPDF('${invoice.id}')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Download invoice (PDF)
      </button>
    </div>
  `;
}

// 8. Real PDF Download via html2pdf.js
function triggerDownloadPDF(invoiceId) {
  const inv = DB.getInvoices().find(i => i.id === invoiceId);
  const vendor = DB.getVendors().find(v => v.id === inv.vendorId);

  const rows = inv.items.map(item => `
    <tr>
      <td style="padding:10px;border-bottom:1px solid #e2e8f0;">${item.name}</td>
      <td style="padding:10px;border-bottom:1px solid #e2e8f0;text-align:center;">${item.qty}</td>
      <td style="padding:10px;border-bottom:1px solid #e2e8f0;text-align:right;">&#8377;${item.unitPrice.toLocaleString('en-IN')}</td>
      <td style="padding:10px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700;">&#8377;${item.total.toLocaleString('en-IN')}</td>
    </tr>`).join("");

  const pdfContent = document.createElement("div");
  pdfContent.style.cssText = "font-family:Arial,sans-serif;padding:40px;color:#0f172a;";
  pdfContent.innerHTML = `
    <div style="display:flex;justify-content:space-between;margin-bottom:32px;">
      <div>
        <div style="font-size:28px;font-weight:900;color:#4f46e5;letter-spacing:-1px;">AURA ERP</div>
        <div style="font-size:12px;color:#64748b;margin-top:2px;">Acme Corp &bull; Procurement HQ</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:32px;font-weight:900;color:#94a3b8;letter-spacing:-2px;">INVOICE</div>
        <div style="font-size:20px;font-weight:800;color:#4f46e5;">${inv.invoiceNumber}</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:32px;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;padding:20px 0;margin-bottom:24px;">
      <div><div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:8px;">Billed To</div><strong>Acme Corporate Services</strong><br>Plot No 14, Hinjawadi Tech Park<br>Pune, Maharashtra - 411057<br>GSTIN: 27ACME1234A1Z9</div>
      <div><div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:8px;">Vendor</div><strong>${vendor.name}</strong><br>${vendor.address}<br>${vendor.contactPhone}<br>GSTIN: ${vendor.gstNumber}</div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;background:#f8fafc;padding:14px;border-radius:6px;font-size:12px;margin-bottom:24px;">
      <div><strong>Invoice Date</strong><br>${new Date(inv.createdAt).toLocaleDateString('en-IN')}</div>
      <div><strong>PO Reference</strong><br>${inv.poNumber}</div>
      <div><strong>Due Date</strong><br>30 Days Net</div>
      <div><strong>Payment</strong><br>Bank Transfer</div>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px;">
      <thead><tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0;text-align:left;">
        <th style="padding:10px;font-size:11px;">Description</th>
        <th style="padding:10px;font-size:11px;text-align:center;">Qty</th>
        <th style="padding:10px;font-size:11px;text-align:right;">Unit Price</th>
        <th style="padding:10px;font-size:11px;text-align:right;">Total</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="width:280px;margin-left:auto;border-top:1px solid #e2e8f0;padding-top:14px;font-size:13px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>Subtotal</span><span>&#8377;${inv.total.toLocaleString('en-IN')}</span></div>
      <div style="display:flex;justify-content:space-between;margin-bottom:10px;"><span>GST 18%</span><span>&#8377;${inv.tax.toLocaleString('en-IN')}</span></div>
      <div style="display:flex;justify-content:space-between;font-size:17px;font-weight:900;color:#4f46e5;border-top:2px solid #e2e8f0;padding-top:10px;"><span>Grand Total</span><span>&#8377;${inv.grandTotal.toLocaleString('en-IN')}</span></div>
    </div>
    <div style="margin-top:40px;border-top:1px dashed #e2e8f0;padding-top:12px;font-size:10px;color:#94a3b8;text-align:center;">Computer-generated invoice via AURA ERP &bull; Acme Corp Procurement</div>
  `;

  const opt = { margin: 0, filename: `${inv.invoiceNumber}.pdf`, image: { type: "jpeg", quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: "mm", format: "a4" } };
  html2pdf().set(opt).from(pdfContent).save();

  DB.addLog("PDF Export", `Downloaded PDF for ${inv.invoiceNumber}.`);
  showToast(`Downloading ${inv.invoiceNumber}.pdf...`, "success");
}

// 8. Invoice Print System
function triggerPrintInvoice(invoiceId) {
  const inv = DB.getInvoices().find(i => i.id === invoiceId);
  const vendor = DB.getVendors().find(v => v.id === inv.vendorId);

  const rows = inv.items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${item.name}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${item.qty}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">₹${item.unitPrice.toLocaleString('en-IN')}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700;">₹${item.total.toLocaleString('en-IN')}</td>
    </tr>
  `).join("");

  const printBlock = document.getElementById("printableInvoiceBlock");
  printBlock.style.display = "block";
  printBlock.innerHTML = `
    <div class="invoice-print-container">
      <div class="invoice-header">
        <div class="invoice-logo-name">
          <div class="brand-icon">A</div>
          <div>
            <h1 style="font-size: 24px; font-weight: 800; color: #0f172a; margin: 0;">ACME CORP</h1>
            <p style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">Procurement Headquarters</p>
          </div>
        </div>
        <div class="invoice-title-block">
          <h2 style="font-size: 28px; font-weight: 800; text-transform: uppercase; color: #64748b; margin: 0; letter-spacing: -1px;">INVOICE</h2>
          <div class="invoice-number-large">${inv.invoiceNumber}</div>
        </div>
      </div>

      <div class="invoice-addresses">
        <div class="address-block">
          <span class="address-title">Billing To:</span>
          <strong>Acme Corporate Services</strong>
          <span>Plot No 14, Hinjawadi Tech Park</span>
          <span>Pune, Maharashtra - 411057</span>
          <span>GSTIN: 27ACME1234A1Z9</span>
        </div>
        <div class="address-block">
          <span class="address-title">Vendor Billing From:</span>
          <strong>${vendor.name}</strong>
          <span>${vendor.address}</span>
          <span>Phone: ${vendor.contactPhone}</span>
          <span>GSTIN: ${vendor.gstNumber}</span>
        </div>
      </div>

      <div class="invoice-details-grid">
        <div><strong>Invoice Date:</strong><br>${new Date(inv.createdAt).toLocaleDateString('en-IN')}</div>
        <div><strong>PO Reference:</strong><br>${inv.poNumber}</div>
        <div><strong>Due Date:</strong><br>30 Days Net</div>
        <div><strong>Payment Term:</strong><br>Bank Transfer</div>
      </div>

      <div>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <thead>
            <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0; text-align: left;">
              <th style="padding: 12px; font-size: 11px;">Item Description</th>
              <th style="padding: 12px; font-size: 11px; text-align: center;">Qty</th>
              <th style="padding: 12px; font-size: 11px; text-align: right;">Unit Price</th>
              <th style="padding: 12px; font-size: 11px; text-align: right;">Total Price</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>

      <div class="invoice-totals-block">
        <div class="totals-row"><span>Items Subtotal:</span><span>₹${inv.total.toLocaleString('en-IN')}</span></div>
        <div class="totals-row"><span>Estimated GST (18%):</span><span>₹${inv.tax.toLocaleString('en-IN')}</span></div>
        <div class="totals-row grand-total"><span>Grand Total:</span><span>₹${inv.grandTotal.toLocaleString('en-IN')}</span></div>
      </div>

      <div style="border-top: 1px dashed #e2e8f0; padding-top: 16px; margin-top: 32px; font-size: 11px; text-align: center; color: var(--text-muted);">
        * This is a simulated computer-generated procurement invoice under AURA ERP systems.
      </div>
    </div>
  `;

  // Trigger print dialog
  window.print();

  // Hide container after rendering
  setTimeout(() => {
    printBlock.style.display = "none";
    printBlock.innerHTML = "";
  }, 1000);

  DB.addLog("Print Invoice", `Triggered invoice printing for ${inv.invoiceNumber}.`);
}

// 8. Email Invoice Modal Toggles
let currentActiveMailInvoiceId = null;

function openEmailModal(invoiceId) {
  const inv = DB.getInvoices().find(i => i.id === invoiceId);
  const vendor = DB.getVendors().find(v => v.id === inv.vendorId);
  
  currentActiveMailInvoiceId = invoiceId;
  document.getElementById("emailModal").classList.add("active");

  document.getElementById("emailToAddress").value = vendor.contactEmail;
  document.getElementById("emailSubject").value = `Official Invoice Document [${inv.invoiceNumber}] - Acme Corp`;
  document.getElementById("emailAttachmentName").innerText = `${inv.invoiceNumber}.pdf (Attached)`;
  
  document.getElementById("emailBodyText").value = `Dear Team at ${vendor.name},\n\nPlease find attached the official invoice: ${inv.invoiceNumber} for Purchase Order: ${inv.poNumber}.\n\nTotal value: ₹${inv.grandTotal.toLocaleString('en-IN')} (Inclusive of standard GST).\n\nBest regards,\nProcurement Department\nAcme Corp.`;
}

function closeEmailModal() {
  document.getElementById("emailModal").classList.remove("active");
  currentActiveMailInvoiceId = null;
}

function submitEmailInvoice() {
  const invoices = DB.getInvoices();
  const idx = invoices.findIndex(i => i.id === currentActiveMailInvoiceId);
  if (idx !== -1) {
    invoices[idx].status = "Sent";
    invoices[idx].sentEmailAt = new Date().toISOString();
    DB.saveInvoices(invoices);
    const toAddr = document.getElementById("emailToAddress").value;
    const subject = document.getElementById("emailSubject").value;
    const body = document.getElementById("emailBodyText").value;
    const vendor = DB.getVendors().find(v => v.contactEmail === toAddr);
    // Store email in mailbox DB
    DB.addEmail({
      to: toAddr,
      toName: vendor ? vendor.name : toAddr,
      from: "procurement@acmecorp.com",
      subject: subject,
      body: body,
      attachment: `${invoices[idx].invoiceNumber}.pdf`,
      type: "Invoice"
    });
    updateMailboxBadge();
    DB.addLog("Email Invoice", `Sent email notification for ${invoices[idx].invoiceNumber} to ${toAddr}`);
    showToast(`Invoice ${invoices[idx].invoiceNumber} successfully emailed! Check Mailbox.`, "success");
    closeEmailModal();
    selectDocument(invoices[idx].poId, invoices[idx].id);
  }
}

// 9. Activity Logs Screen
function renderAuditLogs() {
  const logs = DB.getLogs();
  const search = document.getElementById("logSearch").value.toLowerCase();
  const container = document.getElementById("auditLogsTimeline");

  const filtered = logs.filter(l => 
    l.action.toLowerCase().includes(search) || 
    l.userName.toLowerCase().includes(search) || 
    l.details.toLowerCase().includes(search)
  );

  if (filtered.length === 0) {
    container.innerHTML = `<p style="font-size: 13px; color: var(--text-muted); text-align: center; padding: 24px;">No audit records found.</p>`;
    return;
  }

  container.innerHTML = filtered.map(l => {
    let statClass = "info";
    if (l.action.includes("Create") || l.action.includes("Approved") || l.action.includes("Onboard")) statClass = "success";
    else if (l.action.includes("Reject")) statClass = "danger";
    else if (l.action.includes("Quotation")) statClass = "warning";

    return `
      <div class="timeline-item ${statClass}">
        <div class="timeline-marker"></div>
        <div class="timeline-content">
          <span class="timeline-time">${new Date(l.timestamp).toLocaleString('en-IN')}</span>
          <span class="timeline-title">${l.action}</span>
          <span class="timeline-desc">${l.details} (Performed by: <strong>${l.userName}</strong>)</span>
        </div>
      </div>
    `;
  }).join("");
}

function clearAuditLogs() {
  if (confirm("Are you sure you want to purge all procurement audit records? This action is irreversible.")) {
    localStorage.setItem("erp_logs", JSON.stringify([]));
    DB.addLog("Clear Logs", "Audit logs cleared by user request.");
    renderAuditLogs();
    showToast("Audit logs cleared", "info");
  }
}

// 10. Reports & Analytics Screen — Chart.js powered
let chartSpendInst = null, chartDonutInst = null, chartRatingInst = null;

function renderReports() {
  const pos = DB.getPOs();
  const quotes = DB.getQuotations();
  const rfqs = DB.getRFQs();
  const vendors = DB.getVendors();

  const totalApprovedSpend = pos.filter(po => po.status === "Approved" || po.status === "Invoice Generated")
    .reduce((sum, po) => sum + po.grandTotal, 0);
  document.getElementById("repTotalSpend").innerText = `₹${totalApprovedSpend.toLocaleString('en-IN')}`;

  let totalSavings = 0;
  pos.filter(po => po.status === "Approved" || po.status === "Invoice Generated").forEach(po => {
    const rfqQuotes = quotes.filter(q => q.rfqId === po.rfqId);
    if (rfqQuotes.length > 1) {
      const costs = rfqQuotes.map(q => q.items.reduce((s, i) => s + i.total, 0));
      const maxCost = Math.max(...costs);
      const sel = quotes.find(q => q.id === po.quotationId);
      const selCost = sel ? sel.items.reduce((s, i) => s + i.total, 0) : po.total;
      const diff = maxCost - selCost;
      if (diff > 0) totalSavings += diff;
    }
  });
  document.getElementById("repTotalSavings").innerText = `₹${totalSavings.toLocaleString('en-IN')}`;

  const activeVendors = vendors.filter(v => v.status === "Active");
  const avgRating = activeVendors.reduce((s, v) => s + v.rating, 0) / (activeVendors.length || 1);
  document.getElementById("repAvgRating").innerText = avgRating.toFixed(2);

  const completedRfqs = rfqs.filter(r => r.status === "Completed").length;
  const convRate = rfqs.length > 0 ? Math.round((completedRfqs / rfqs.length) * 100) : 0;
  document.getElementById("repConversionRate").innerText = `${convRate}%`;

  // --- Chart 1: Monthly Spend Bar ---
  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const spendData = [520000, 780000, 610000, 940000, 1150000, Math.max(totalApprovedSpend, 50000)];
  const ctx1 = document.getElementById("chartSpendTrend");
  if (chartSpendInst) chartSpendInst.destroy();
  chartSpendInst = new Chart(ctx1, {
    type: "bar",
    data: {
      labels: monthLabels,
      datasets: [{ label: "Spend (₹)", data: spendData,
        backgroundColor: ["rgba(79,70,229,0.7)","rgba(79,70,229,0.7)","rgba(79,70,229,0.7)","rgba(79,70,229,0.7)","rgba(79,70,229,0.7)","rgba(16,185,129,0.85)"],
        borderColor: ["#4f46e5","#4f46e5","#4f46e5","#4f46e5","#4f46e5","#10b981"],
        borderWidth: 2, borderRadius: 6 }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false },
      tooltip: { callbacks: { label: ctx => ` ₹${ctx.parsed.y.toLocaleString('en-IN')}` } } },
      scales: { y: { ticks: { callback: v => `₹${(v/100000).toFixed(0)}L` }, grid: { color: "rgba(0,0,0,0.05)" } }, x: { grid: { display: false } } } }
  });

  // --- Chart 2: Category Donut ---
  const catMap = {};
  pos.filter(p => p.status === "Approved").forEach(po => {
    const v = vendors.find(v => v.id === po.vendorId);
    const cat = v ? v.category : "Other";
    catMap[cat] = (catMap[cat] || 0) + po.grandTotal;
  });
  if (Object.keys(catMap).length === 0) { catMap["IT Hardware"] = 65000; catMap["Logistics & Services"] = 6490; }
  const ctx2 = document.getElementById("chartCategoryDonut");
  if (chartDonutInst) chartDonutInst.destroy();
  chartDonutInst = new Chart(ctx2, {
    type: "doughnut",
    data: {
      labels: Object.keys(catMap),
      datasets: [{ data: Object.values(catMap),
        backgroundColor: ["#4f46e5","#10b981","#f59e0b","#ef4444","#06b6d4"],
        borderWidth: 2, borderColor: "var(--bg-card)" }]
    },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: "right", labels: { boxWidth: 12, font: { size: 11 } } },
      tooltip: { callbacks: { label: ctx => ` ₹${ctx.parsed.toLocaleString('en-IN')}` } } } }
  });

  // --- Chart 3: Vendor Rating Bar ---
  const ctx3 = document.getElementById("chartVendorRating");
  if (chartRatingInst) chartRatingInst.destroy();
  chartRatingInst = new Chart(ctx3, {
    type: "bar",
    data: {
      labels: vendors.map(v => v.name),
      datasets: [{ label: "Rating", data: vendors.map(v => v.rating),
        backgroundColor: vendors.map(v => v.rating >= 4.5 ? "rgba(16,185,129,0.7)" : v.rating >= 4.0 ? "rgba(245,158,11,0.7)" : "rgba(239,68,68,0.7)"),
        borderRadius: 4, borderWidth: 0 }]
    },
    options: { indexAxis: "y", responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { min: 0, max: 5, ticks: { callback: v => `${v}★` }, grid: { color: "rgba(0,0,0,0.04)" } }, y: { grid: { display: false } } } }
  });

  // Vendor compliance table
  const tbody = document.getElementById("reportsVendorTableBody");
  tbody.innerHTML = vendors.map(v => {
    let compliance = `<span class="badge badge-success">High Compliance</span>`;
    if (v.rating < 4.2) compliance = `<span class="badge badge-warning">Under Observation</span>`;
    if (v.status === "Inactive") compliance = `<span class="badge badge-danger">Suspended</span>`;
    return `<tr><td style="font-weight:700;">${v.name}</td><td>${v.category}</td><td><strong style="color:#f59e0b;">${v.rating.toFixed(1)} ★</strong></td><td>${compliance}</td></tr>`;
  }).join("");
}

function exportDataDump() {
  const data = {
    users: DB.getUsers(),
    vendors: DB.getVendors(),
    rfqs: DB.getRFQs(),
    quotations: DB.getQuotations(),
    purchaseOrders: DB.getPOs(),
    invoices: DB.getInvoices(),
    logs: DB.getLogs()
  };

  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", jsonString);
  downloadAnchor.setAttribute("download", `AURA_ERP_Procurement_Data_${new Date().toISOString().split("T")[0]}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();

  DB.addLog("Report Exported", "Exported complete procurement dataset.");
  showToast("Procurement database successfully exported!", "success");
}

// ----------------------------------------------------
// REAL-TIME QUOTE CALCULATION
// ----------------------------------------------------
function recalcQuoteTotals() {
  const rows = document.querySelectorAll("#quoteItemsPricingBody tr");
  let subtotal = 0;
  rows.forEach((row, idx) => {
    const qty = parseInt(row.querySelector(".pricing-qty")?.value || "0");
    const up = parseFloat(row.querySelector(".pricing-unitprice")?.value || "0");
    const rowTotal = qty * up;
    subtotal += isNaN(rowTotal) ? 0 : rowTotal;
    const cell = document.getElementById(`row-total-${idx}`);
    if (cell) cell.innerText = `₹${(isNaN(rowTotal) ? 0 : rowTotal).toLocaleString('en-IN')}`;
  });
  const gst = subtotal * 0.18;
  const grand = subtotal + gst;
  const liveEl = document.getElementById("quoteLiveTotal");
  if (liveEl) liveEl.innerText = `₹${subtotal.toLocaleString('en-IN')} / ₹${gst.toLocaleString('en-IN')} / ₹${grand.toLocaleString('en-IN')}`;
}

// ----------------------------------------------------
// MAILBOX
// ----------------------------------------------------
function updateMailboxBadge() {
  const emails = DB.getEmails();
  const unread = emails.filter(e => !e.read).length;
  const badge = document.getElementById("mailboxNavBadge");
  if (badge) {
    if (unread > 0) { badge.innerText = unread; badge.style.display = "inline"; }
    else badge.style.display = "none";
  }
}

function renderMailbox() {
  const emails = DB.getEmails();
  const list = document.getElementById("mailboxList");
  if (!list) return;

  if (emails.length === 0) {
    list.innerHTML = `<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px;">No messages yet.</div>`;
    return;
  }

  list.innerHTML = emails.map(email => {
    const date = new Date(email.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    const typeBadge = email.type === "Invoice" ? `<span class="badge badge-success" style="font-size:9px;">Invoice</span>` : `<span class="badge badge-info" style="font-size:9px;">RFQ</span>`;
    return `
      <div onclick="openMailDetail('${email.id}')" style="
        padding:14px 16px;border-bottom:1px solid var(--border);cursor:pointer;
        background:${email.read ? 'transparent' : 'rgba(79,70,229,0.04)'};
        transition:var(--transition);
      " class="mail-list-item" id="mail-item-${email.id}" onmouseenter="this.style.background='rgba(79,70,229,0.06)'" onmouseleave="this.style.background='${email.read ? 'transparent' : 'rgba(79,70,229,0.04)'}'">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <span style="font-size:12px;font-weight:${email.read ? '500' : '700'};color:var(--text-main);">${email.toName || email.to}</span>
          <span style="font-size:10px;color:var(--text-light);">${date}</span>
        </div>
        <div style="font-size:12px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${email.subject}</div>
        <div style="margin-top:4px;">${typeBadge} ${!email.read ? '<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--primary);margin-left:4px;vertical-align:middle;"></span>' : ''}</div>
      </div>
    `;
  }).join('');
}

function openMailDetail(emailId) {
  DB.markEmailRead(emailId);
  updateMailboxBadge();
  const email = DB.getEmails().find(e => e.id === emailId);
  if (!email) return;
  const date = new Date(email.timestamp).toLocaleString('en-IN');
  const panel = document.getElementById("mailboxDetailPanel");
  const placeholder = document.getElementById("mailboxDetailPlaceholder");
  placeholder.style.display = "none";
  panel.style.display = "flex";
  panel.innerHTML = `
    <div style="border-bottom:1px solid var(--border);padding-bottom:16px;">
      <div style="font-size:18px;font-weight:700;margin-bottom:8px;">${email.subject}</div>
      <div style="display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--text-muted);">
        <div><strong>From:</strong> ${email.from}</div>
        <div><strong>To:</strong> ${email.to} (${email.toName})</div>
        <div><strong>Date:</strong> ${date}</div>
        ${email.attachment ? `<div style="margin-top:6px;"><span style="background:var(--bg-main);padding:4px 10px;border-radius:var(--radius-sm);border:1px solid var(--border);font-size:11px;font-weight:600;">📎 ${email.attachment}</span></div>` : ''}
      </div>
    </div>
    <div style="white-space:pre-wrap;font-size:14px;line-height:1.7;color:var(--text-main);">${email.body}</div>
  `;
  // Re-render list to show read state
  renderMailbox();
}

function markAllMailRead() {
  const emails = DB.getEmails();
  emails.forEach(e => e.read = true);
  DB.saveEmails(emails);
  updateMailboxBadge();
  renderMailbox();
  showToast("All messages marked as read", "info");
}


// ----------------------------------------------------
// UI TOAST ALERTS & UTILS
// ----------------------------------------------------
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  
  toast.style.padding = "12px 20px";
  toast.style.borderRadius = "var(--radius-sm)";
  toast.style.fontSize = "13px";
  toast.style.fontWeight = "600";
  toast.style.color = "white";
  toast.style.boxShadow = "var(--shadow-md)";
  toast.style.display = "flex";
  toast.style.alignItems = "center";
  toast.style.gap = "8px";
  toast.style.animation = "slideInRight 0.2s ease-out";
  toast.style.minWidth = "250px";

  let bg = "var(--primary)";
  if (type === "success") bg = "var(--success)";
  else if (type === "warning") bg = "var(--warning)";
  else if (type === "danger") bg = "var(--danger)";
  toast.style.backgroundColor = bg;

  toast.innerHTML = `
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "slideOutRight 0.2s ease-in";
    setTimeout(() => toast.remove(), 200);
  }, 4000);
}

// Add CSS keyframes dynamically for toast sliding
const style = document.createElement('style');
style.innerHTML = `
  @keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOutRight {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);

// ----------------------------------------------------
// BOOTSTRAP INITIALIZATION
// ----------------------------------------------------
function initApp() {
  // Clear select values to avoid browser caching issues
  const quickSelect = document.getElementById("quickRoleSelect");
  if (quickSelect) {
    const user = DB.getCurrentUser();
    if (user) {
      if (user.role === "officer") quickSelect.value = "officer";
      else if (user.role === "manager") quickSelect.value = "manager";
      else if (user.role === "admin") quickSelect.value = "admin";
      else if (user.role === "vendor") {
        quickSelect.value = user.id === "u2" ? "vendorA" : "vendorB";
      }
    }
  }

  // Load first screen
  switchScreen("dashboard");
}
