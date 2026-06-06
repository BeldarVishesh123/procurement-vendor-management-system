// db.js - Data Layer with LocalStorage Persistence

const DEFAULT_USERS = [
  { id: "u1", name: "Sarah Connor", email: "officer@erp.com", password: "officer123", role: "officer", company: "Acme Corp" },
  { id: "u2", name: "John Doe (Apex)", email: "vendorA@erp.com", password: "vendor123", role: "vendor", company: "Apex Solutions", vendorId: "v1" },
  { id: "u3", name: "Jane Smith (Summit)", email: "vendorB@erp.com", password: "vendor123", role: "vendor", company: "Summit Logistics", vendorId: "v2" },
  { id: "u4", name: "Robert Vance", email: "manager@erp.com", password: "manager123", role: "manager", company: "Acme Corp" },
  { id: "u5", name: "Alice Admin", email: "admin@erp.com", password: "admin123", role: "admin", company: "Acme Corp" }
];

const DEFAULT_VENDORS = [
  { id: "v1", name: "Apex Solutions", category: "IT Hardware", gstNumber: "27AAAAA1111A1Z1", contactEmail: "vendorA@erp.com", contactPhone: "+91 98765 43210", address: "Tech Park, Pune", status: "Active", rating: 4.8 },
  { id: "v2", name: "Summit Logistics", category: "Logistics & Services", gstNumber: "27BBBBB2222B2Z2", contactEmail: "vendorB@erp.com", contactPhone: "+91 98765 43211", address: "Industrial Area, Mumbai", status: "Active", rating: 4.5 },
  { id: "v3", name: "Horizon Industries", category: "Office Supplies", gstNumber: "27CCCCC3333C3Z3", contactEmail: "horizon@erp.com", contactPhone: "+91 98765 43212", address: "GIDC, Ahmedabad", status: "Pending", rating: 4.0 },
  { id: "v4", name: "Stellar Electrics", category: "Electronics", gstNumber: "27DDDDD4444D4Z4", contactEmail: "stellar@erp.com", contactPhone: "+91 98765 43213", address: "Oragadam, Chennai", status: "Inactive", rating: 3.9 }
];

const DEFAULT_RFQS = [
  {
    id: "rfq-001",
    rfqNumber: "RFQ-2026-001",
    title: "High-Performance Developer Laptops",
    description: "Procuring 10 units of Intel Core i7 Developer Laptops with 32GB RAM and 1TB SSD.",
    items: [
      { name: "Intel i7 Developer Laptops", qty: 10 }
    ],
    deadline: "2026-06-15",
    assignedVendors: ["v1", "v2"],
    status: "Active",
    createdBy: "Sarah Connor",
    createdAt: "2026-06-05T10:00:00Z"
  },
  {
    id: "rfq-002",
    rfqNumber: "RFQ-2026-002",
    title: "Annual Server Maintenance Contract",
    description: "Support and maintenance for 5 on-premises servers including backup automation.",
    items: [
      { name: "Server AMC (Per Server/Year)", qty: 5 }
    ],
    deadline: "2026-06-12",
    assignedVendors: ["v1", "v2"],
    status: "Quotations Received",
    createdBy: "Sarah Connor",
    createdAt: "2026-06-04T09:00:00Z"
  }
];

const DEFAULT_QUOTATIONS = [
  {
    id: "q-001",
    rfqId: "rfq-002",
    rfqNumber: "RFQ-2026-002",
    vendorId: "v1",
    vendorName: "Apex Solutions",
    items: [
      { name: "Server AMC (Per Server/Year)", qty: 5, unitPrice: 1200, total: 6000 }
    ],
    deliveryTimelineDays: 3,
    notes: "Includes 24/7 critical phone support and same-day on-site response.",
    status: "Pending Review",
    submittedAt: "2026-06-05T14:30:00Z"
  },
  {
    id: "q-002",
    rfqId: "rfq-002",
    rfqNumber: "RFQ-2026-002",
    vendorId: "v2",
    vendorName: "Summit Logistics",
    items: [
      { name: "Server AMC (Per Server/Year)", qty: 5, unitPrice: 1100, total: 5500 }
    ],
    deliveryTimelineDays: 5,
    notes: "Standard support with next-business-day response. Excludes replacement parts.",
    status: "Pending Review",
    submittedAt: "2026-06-05T16:00:00Z"
  }
];

const DEFAULT_LOGS = [
  { id: "log-1", userId: "u1", userName: "Sarah Connor", action: "RFQ Creation", timestamp: "2026-06-04T09:00:00Z", details: "Created RFQ-2026-002 for Annual Server Maintenance Contract" },
  { id: "log-2", userId: "u1", userName: "Sarah Connor", action: "RFQ Creation", timestamp: "2026-06-05T10:00:00Z", details: "Created RFQ-2026-001 for High-Performance Developer Laptops" },
  { id: "log-3", userId: "u2", userName: "John Doe (Apex)", action: "Quotation Submission", timestamp: "2026-06-05T14:30:00Z", details: "Submitted Quotation q-001 for RFQ-2026-002" },
  { id: "log-4", userId: "u3", userName: "Jane Smith (Summit)", action: "Quotation Submission", timestamp: "2026-06-05T16:00:00Z", details: "Submitted Quotation q-002 for RFQ-2026-002" }
];

const DEFAULT_POS = [
  {
    id: "po-hist-01",
    poNumber: "PO-2026-H01",
    rfqId: "rfq-002",
    quotationId: "q-002",
    vendorId: "v2",
    items: [{ name: "Server AMC (Per Server/Year)", qty: 5, unitPrice: 1100, total: 5500 }],
    total: 5500,
    tax: 990,
    grandTotal: 6490,
    status: "Approved",
    approvedBy: "Robert Vance",
    remarks: "Budget approved, best value quote selected.",
    createdAt: "2026-06-05T17:00:00Z"
  }
];

const DEFAULT_INVOICES = [
  {
    id: "inv-hist-01",
    invoiceNumber: "INV-2026-H01",
    poId: "po-hist-01",
    poNumber: "PO-2026-H01",
    vendorId: "v2",
    total: 5500,
    tax: 990,
    grandTotal: 6490,
    items: [{ name: "Server AMC (Per Server/Year)", qty: 5, unitPrice: 1100, total: 5500 }],
    status: "Sent",
    sentEmailAt: "2026-06-05T18:00:00Z",
    createdAt: "2026-06-05T17:30:00Z"
  }
];

const DEFAULT_EMAILS = [
  {
    id: "email-1",
    to: "vendorB@erp.com",
    toName: "Summit Logistics",
    from: "procurement@acmecorp.com",
    subject: "RFQ Invitation: Annual Server Maintenance Contract [RFQ-2026-002]",
    body: "Dear Summit Logistics Team,\n\nYou have been invited to submit a quotation for our RFQ: Annual Server Maintenance Contract (RFQ-2026-002).\n\nPlease log in to the AURA ERP portal and navigate to the Submit Quotations section.\n\nDeadline: 12 June 2026.\n\nBest regards,\nSarah Connor\nProcurement Department, Acme Corp",
    attachment: null,
    read: true,
    timestamp: "2026-06-04T09:05:00Z",
    type: "RFQ Invitation"
  },
  {
    id: "email-2",
    to: "vendorA@erp.com",
    toName: "Apex Solutions",
    from: "procurement@acmecorp.com",
    subject: "RFQ Invitation: Annual Server Maintenance Contract [RFQ-2026-002]",
    body: "Dear Apex Solutions Team,\n\nYou have been invited to submit a quotation for our RFQ: Annual Server Maintenance Contract (RFQ-2026-002).\n\nPlease log in to the AURA ERP portal and navigate to the Submit Quotations section.\n\nDeadline: 12 June 2026.\n\nBest regards,\nSarah Connor\nProcurement Department, Acme Corp",
    attachment: null,
    read: true,
    timestamp: "2026-06-04T09:05:30Z",
    type: "RFQ Invitation"
  },
  {
    id: "email-3",
    to: "vendorB@erp.com",
    toName: "Summit Logistics",
    from: "procurement@acmecorp.com",
    subject: "Official Invoice Document [INV-2026-H01] - Acme Corp",
    body: "Dear Team at Summit Logistics,\n\nPlease find attached the official invoice: INV-2026-H01 for Purchase Order: PO-2026-H01.\n\nTotal value: \u20b96,490 (Inclusive of standard GST).\n\nBest regards,\nProcurement Department\nAcme Corp.",
    attachment: "INV-2026-H01.pdf",
    read: false,
    timestamp: "2026-06-05T18:00:00Z",
    type: "Invoice"
  }
];

// Initialize Storage
function initDatabase() {
  if (!localStorage.getItem("erp_users")) {
    localStorage.setItem("erp_users", JSON.stringify(DEFAULT_USERS));
  }
  if (!localStorage.getItem("erp_vendors")) {
    localStorage.setItem("erp_vendors", JSON.stringify(DEFAULT_VENDORS));
  }
  if (!localStorage.getItem("erp_rfqs")) {
    localStorage.setItem("erp_rfqs", JSON.stringify(DEFAULT_RFQS));
  }
  if (!localStorage.getItem("erp_quotations")) {
    localStorage.setItem("erp_quotations", JSON.stringify(DEFAULT_QUOTATIONS));
  }
  if (!localStorage.getItem("erp_pos")) {
    localStorage.setItem("erp_pos", JSON.stringify(DEFAULT_POS));
  }
  if (!localStorage.getItem("erp_invoices")) {
    localStorage.setItem("erp_invoices", JSON.stringify(DEFAULT_INVOICES));
  }
  if (!localStorage.getItem("erp_emails")) {
    localStorage.setItem("erp_emails", JSON.stringify(DEFAULT_EMAILS));
  }
  if (!localStorage.getItem("erp_logs")) {
    localStorage.setItem("erp_logs", JSON.stringify(DEFAULT_LOGS));
  }
  if (!localStorage.getItem("erp_currentUser")) {
    // Default logged-in user is Sarah Connor (Procurement Officer) for immediate access
    localStorage.setItem("erp_currentUser", JSON.stringify(DEFAULT_USERS[0]));
  }
}

// Getters and Setters
const DB = {
  getUsers: () => JSON.parse(localStorage.getItem("erp_users") || "[]"),
  saveUsers: (users) => localStorage.setItem("erp_users", JSON.stringify(users)),

  getVendors: () => JSON.parse(localStorage.getItem("erp_vendors") || "[]"),
  saveVendors: (vendors) => localStorage.setItem("erp_vendors", JSON.stringify(vendors)),

  getRFQs: () => JSON.parse(localStorage.getItem("erp_rfqs") || "[]"),
  saveRFQs: (rfqs) => localStorage.setItem("erp_rfqs", JSON.stringify(rfqs)),

  getQuotations: () => JSON.parse(localStorage.getItem("erp_quotations") || "[]"),
  saveQuotations: (quotes) => localStorage.setItem("erp_quotations", JSON.stringify(quotes)),

  getPOs: () => JSON.parse(localStorage.getItem("erp_pos") || "[]"),
  savePOs: (pos) => localStorage.setItem("erp_pos", JSON.stringify(pos)),

  getInvoices: () => JSON.parse(localStorage.getItem("erp_invoices") || "[]"),
  saveInvoices: (invoices) => localStorage.setItem("erp_invoices", JSON.stringify(invoices)),

  getLogs: () => JSON.parse(localStorage.getItem("erp_logs") || "[]"),
  addLog: (action, details) => {
    const logs = DB.getLogs();
    const currentUser = DB.getCurrentUser();
    const newLog = {
      id: "log-" + Date.now(),
      userId: currentUser ? currentUser.id : "system",
      userName: currentUser ? currentUser.name : "System",
      action: action,
      timestamp: new Date().toISOString(),
      details: details
    };
    logs.unshift(newLog);
    localStorage.setItem("erp_logs", JSON.stringify(logs));
  },

  getCurrentUser: () => JSON.parse(localStorage.getItem("erp_currentUser") || "null"),
  setCurrentUser: (user) => localStorage.setItem("erp_currentUser", JSON.stringify(user)),
  logout: () => localStorage.removeItem("erp_currentUser"),

  getEmails: () => JSON.parse(localStorage.getItem("erp_emails") || "[]"),
  saveEmails: (emails) => localStorage.setItem("erp_emails", JSON.stringify(emails)),
  addEmail: (emailObj) => {
    const emails = DB.getEmails();
    emails.unshift({ id: "email-" + Date.now(), read: false, timestamp: new Date().toISOString(), ...emailObj });
    localStorage.setItem("erp_emails", JSON.stringify(emails));
  },
  markEmailRead: (emailId) => {
    const emails = DB.getEmails();
    const idx = emails.findIndex(e => e.id === emailId);
    if (idx !== -1) { emails[idx].read = true; localStorage.setItem("erp_emails", JSON.stringify(emails)); }
  }
};

// Initialize DB on file load
initDatabase();
window.DB = DB;
