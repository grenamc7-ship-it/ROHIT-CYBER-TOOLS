/**
 * ROHIT { CYBER TOOLS } - Backend Proxy & Auth Server
 * Node.js + Express
 */

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Upstream API endpoints
const OSINT_API_BASE = "https://aditya-osint-api.onrender.com/api/v1/info";
const ADMIN_MODZ_API_BASE = "https://admin-modz.onrender.com/osint";
const SEARCH_API_URL = "https://api-convicted-visit-proportion.trycloudflare.com/search";
const VEHICLE_API_URL = "https://all-api-by-nitin-developer-best1.binderdhaniya6.workers.dev/api";
const WEATHER_API_URL = "https://nitin-wather-check-api.vercel.app/api";

// Master Admin Secret Key for Rohit Bhai Admin Console
const DEFAULT_ADMIN_SECRET = "rohitadmin2025";

// Path to persistent users data file
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const STATS_FILE = path.join(DATA_DIR, 'stats.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial seed users if file doesn't exist
const INITIAL_USERS = [
  {
    username: "rohitbhai",
    password: "admin123",
    name: "Rohit Bhai (Admin)",
    role: "admin",
    status: "active",
    validity: "Lifetime",
    notes: "Master Admin Account",
    createdAt: new Date().toISOString(),
    lastLogin: null
  },
  {
    username: "vipuser",
    password: "pass123",
    name: "VIP Premium User",
    role: "user",
    status: "active",
    validity: "30 Days",
    notes: "Default VIP Client Account",
    createdAt: new Date().toISOString(),
    lastLogin: null
  }
];

// Helper to read users
function readUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const raw = fs.readFileSync(USERS_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading users file:', err);
  }
  // Initialize file
  fs.writeFileSync(USERS_FILE, JSON.stringify(INITIAL_USERS, null, 2), 'utf8');
  return INITIAL_USERS;
}

// Helper to save users
function saveUsers(users) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving users file:', err);
  }
}

// Helper to update search stats
function recordSearchStat(toolName = 'general') {
  try {
    let stats = { totalSearches: 0, toolBreakdown: {}, lastSearchTime: null };
    if (fs.existsSync(STATS_FILE)) {
      stats = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
    }
    stats.totalSearches = (stats.totalSearches || 0) + 1;
    stats.toolBreakdown = stats.toolBreakdown || {};
    stats.toolBreakdown[toolName] = (stats.toolBreakdown[toolName] || 0) + 1;
    stats.lastSearchTime = new Date().toISOString();
    fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2), 'utf8');
  } catch (e) {
    // Ignore stats error
  }
}

// Initialize users file on startup
readUsers();

// Middleware
app.use(express.json());

// CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-secret');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Serve static frontend from public folder
app.use(express.static(path.join(__dirname, 'public')));

// Admin route alias
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'ROHIT { CYBER TOOLS } Core Engine',
    timestamp: new Date().toISOString()
  });
});

/* ==========================================================================
   AUTHENTICATION ENDPOINTS
   ========================================================================== */

app.get('/api/auth/check', (req, res) => {
  res.json({ success: true, message: 'Auth service operational' });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: 'Username and password are required'
    });
  }

  const cleanUser = username.trim().toLowerCase();
  const cleanPass = password.trim();

  const users = readUsers();
  const user = users.find(u => u.username.toLowerCase() === cleanUser);

  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'ACCESS DENIED: Invalid Cyber Credentials'
    });
  }

  if (user.password !== cleanPass) {
    return res.status(401).json({
      success: false,
      error: 'ACCESS DENIED: Invalid Security Key / Password'
    });
  }

  if (user.status !== 'active') {
    return res.status(403).json({
      success: false,
      error: 'SECURITY LOCK: Account Suspended. Contact @NVR_ROHIT_BHAI'
    });
  }

  // Update last login
  user.lastLogin = new Date().toISOString();
  saveUsers(users);

  return res.json({
    success: true,
    message: 'Cyber Access Granted',
    user: {
      username: user.username,
      name: user.name,
      role: user.role || 'user',
      validity: user.validity || 'Active'
    }
  });
});

app.post('/api/auth/verify-admin', (req, res) => {
  const { adminSecret } = req.body;
  if (!adminSecret || adminSecret.trim() !== DEFAULT_ADMIN_SECRET) {
    return res.status(401).json({
      success: false,
      error: 'Invalid Master Cyber Key'
    });
  }
  return res.json({
    success: true,
    message: 'Master Admin Access Granted'
  });
});

/* ==========================================================================
   ADMIN MANAGEMENT ENDPOINTS
   ========================================================================== */

function requireAdmin(req, res, next) {
  const secret = req.headers['x-admin-secret'] || req.query.adminSecret || (req.body && req.body.adminSecret);
  if (!secret || secret.trim() !== DEFAULT_ADMIN_SECRET) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Master Admin Secret required'
    });
  }
  next();
}

app.get('/api/admin/users', requireAdmin, (req, res) => {
  const users = readUsers();
  return res.json({
    success: true,
    users
  });
});

app.post('/api/admin/users', requireAdmin, (req, res) => {
  const { username, password, name, validity, notes, role } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: 'Username and password are required'
    });
  }

  const cleanUser = username.trim().toLowerCase().replace(/\s+/g, '');
  const cleanPass = password.trim();

  if (cleanUser.length < 3) {
    return res.status(400).json({
      success: false,
      error: 'Username must be at least 3 characters'
    });
  }

  const users = readUsers();
  if (users.some(u => u.username.toLowerCase() === cleanUser)) {
    return res.status(409).json({
      success: false,
      error: `User "${cleanUser}" already exists`
    });
  }

  const newUser = {
    username: cleanUser,
    password: cleanPass,
    name: (name && name.trim()) || cleanUser,
    role: role || 'user',
    status: 'active',
    validity: validity || '30 Days',
    notes: (notes && notes.trim()) || 'Created via Cyber Console',
    createdAt: new Date().toISOString(),
    lastLogin: null
  };

  users.unshift(newUser);
  saveUsers(users);

  return res.status(201).json({
    success: true,
    message: `User ${cleanUser} created successfully`,
    user: newUser
  });
});

app.put('/api/admin/users/:username/status', requireAdmin, (req, res) => {
  const targetUser = req.params.username.toLowerCase();
  const { status } = req.body;

  const users = readUsers();
  const user = users.find(u => u.username.toLowerCase() === targetUser);

  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  user.status = status === 'active' ? 'active' : 'inactive';
  saveUsers(users);

  return res.json({
    success: true,
    message: `User status changed to ${user.status}`,
    user
  });
});

app.delete('/api/admin/users/:username', requireAdmin, (req, res) => {
  const targetUser = req.params.username.toLowerCase();
  let users = readUsers();

  const initialLen = users.length;
  users = users.filter(u => u.username.toLowerCase() !== targetUser);

  if (users.length === initialLen) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  saveUsers(users);
  return res.json({
    success: true,
    message: `User ${targetUser} deleted successfully`
  });
});

app.get('/api/admin/stats', requireAdmin, (req, res) => {
  const users = readUsers();
  let stats = { totalSearches: 0, toolBreakdown: {}, lastSearchTime: null };
  try {
    if (fs.existsSync(STATS_FILE)) {
      stats = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
    }
  } catch (e) {}

  return res.json({
    success: true,
    totalUsers: users.length,
    activeUsers: users.filter(u => u.status === 'active').length,
    suspendedUsers: users.filter(u => u.status !== 'active').length,
    totalSearches: stats.totalSearches || 0,
    toolBreakdown: stats.toolBreakdown || {},
    lastSearchTime: stats.lastSearchTime
  });
});

/* ==========================================================================
   INTELLIGENCE DATA SANITIZER
   Strips third-party metadata, promotional credits, keys, and empty blocks
   ========================================================================== */

function sanitizeIntelligenceData(data) {
  if (!data || typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map(item => sanitizeIntelligenceData(item));
  }

  const bannedKeys = new Set([
    'metadata',
    'api_key',
    'apikey',
    'key_owner',
    'key_usage',
    'key_created',
    'key_expiry',
    'key_enabled',
    'owner',
    'channel',
    'timestamp',
    'Name',
    'Credit',
    'credit',
    'Telegram',
    'telegram',
    'developer',
    'Buy Premium API From',
    'Powered By',
    'key_details'
  ]);

  const cleaned = {};
  for (const [k, v] of Object.entries(data)) {
    if (bannedKeys.has(k)) {
      continue;
    }

    // Check if key is 'response'
    if (k === 'response') {
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        const nestedResp = sanitizeIntelligenceData(v);
        if (Object.keys(nestedResp).length === 0) {
          // Empty response block, omit completely
          continue;
        }
        cleaned[k] = nestedResp;
        continue;
      }
    }

    if (v && typeof v === 'object') {
      const sanitizedChild = sanitizeIntelligenceData(v);
      if (typeof sanitizedChild === 'object' && !Array.isArray(sanitizedChild) && Object.keys(sanitizedChild).length === 0) {
        continue;
      }
      cleaned[k] = sanitizedChild;
    } else {
      cleaned[k] = v;
    }
  }

  return cleaned;
}

/* ==========================================================================
   UNIFIED OSINT INTELLIGENCE ENGINE (ALL TOOLS)
   Supports:
   1. Number info (Num)
   2. Number info advance (Numad)
   3. Addhar info (Aadhar)
   4. Addhar info advance (Aadharad)
   5. Vehicle to owner number API (Veh2num)
   6. Vehicle info API (Veh)
   7. Email info API (Mail)
   8. Instagram info API (Insta)
   9. Truecaller info API (True)
   ========================================================================== */

async function fallbackVehicleSearch(cleanRc, res) {
  try {
    const clean = cleanRc.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const backupUrl = `${VEHICLE_API_URL}?type=vehicle&search=${encodeURIComponent(clean)}&api_key=NITIN`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const backupResp = await fetch(backupUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'Accept': 'application/json', 'User-Agent': 'RohitCyberTools/4.0' }
    });
    clearTimeout(timeoutId);
    const responseText = await backupResp.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      return res.status(502).json({
        success: false,
        error: 'Unable to parse response from fallback vehicle database'
      });
    }

    const sanitized = sanitizeIntelligenceData(data);
    const hasVehData = sanitized && (
      (sanitized.response && Object.keys(sanitized.response).length > 0) ||
      sanitized.vehicle ||
      sanitized.makerModel ||
      sanitized.engine ||
      sanitized.chassis
    );

    if (!hasVehData) {
      return res.status(404).json({
        success: false,
        error: `No vehicle registration records found for "${clean}"`
      });
    }

    return res.status(backupResp.status).json(sanitized);
  } catch (err) {
    return res.status(502).json({
      success: false,
      error: 'Vehicle database connection error'
    });
  }
}

async function queryAdminModz(cleanQuery) {
  const url = `${ADMIN_MODZ_API_BASE}?query=${encodeURIComponent(cleanQuery)}&apikey=Demo`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);
  try {
    const upstreamResponse = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'RohitCyberTools/4.0'
      }
    });
    clearTimeout(timeoutId);
    const responseText = await upstreamResponse.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      return { success: false, error: 'Invalid response from Admin Modz OSINT database' };
    }
    const sanitized = sanitizeIntelligenceData(data);
    return { success: true, status: upstreamResponse.status, data: sanitized };
  } catch (err) {
    clearTimeout(timeoutId);
    return { success: false, error: err.message || 'Admin Modz OSINT network error' };
  }
}

app.get('/api/osint', async (req, res) => {
  const { key, query } = req.query;

  if (!key || !query || typeof query !== 'string' || query.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'Both "key" and "query" parameters are required'
    });
  }

  const cleanKey = key.trim();
  const cleanQuery = query.trim();
  recordSearchStat(cleanKey.toLowerCase());

  // Direct handling for Admin Modz OSINT
  if (cleanKey.toLowerCase() === 'adminmodz' || cleanKey.toLowerCase() === 'admin' || cleanKey.toLowerCase() === 'modz') {
    const modzResult = await queryAdminModz(cleanQuery);
    if (!modzResult.success) {
      return res.status(502).json({
        success: false,
        error: modzResult.error || 'Admin Modz OSINT network error'
      });
    }
    return res.status(modzResult.status || 200).json(modzResult.data);
  }

  const upstreamUrl = `${OSINT_API_BASE}?key=${encodeURIComponent(cleanKey)}&query=${encodeURIComponent(cleanQuery)}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    const upstreamResponse = await fetch(upstreamUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'RohitCyberTools/4.0'
      }
    });

    clearTimeout(timeoutId);
    const responseText = await upstreamResponse.text();

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseErr) {
      if (cleanKey === 'Veh') {
        return fallbackVehicleSearch(cleanQuery, res);
      }
      // Attempt fallback to Admin Modz for telecom / citizen queries
      if (cleanKey === 'Aadhar' || cleanKey === 'Aadharad' || cleanKey === 'Num' || cleanKey === 'Numad') {
        const modzFallback = await queryAdminModz(cleanQuery);
        if (modzFallback.success && modzFallback.data && Array.isArray(modzFallback.data.records) && modzFallback.data.records.length > 0) {
          return res.json(modzFallback.data);
        }
      }
      return res.status(502).json({
        success: false,
        error: 'Invalid response from intelligence node. Please try again in a few seconds.'
      });
    }

    // Check if upstream returned a timed-out connection error on a cold-starting microservice
    if (responseData && responseData.error && typeof responseData.error === 'string') {
      if (cleanKey === 'Veh' && (responseData.error.includes('Connection error') || responseData.error.includes('Read timed out') || responseData.error.includes('timeout') || responseData.error.includes('Down'))) {
        return fallbackVehicleSearch(cleanQuery, res);
      }
      // If Aditya API is down ("Original API Down."), fallback to Admin Modz!
      if (cleanKey === 'Aadhar' || cleanKey === 'Aadharad' || cleanKey === 'Num' || cleanKey === 'Numad') {
        const modzFallback = await queryAdminModz(cleanQuery);
        if (modzFallback.success && modzFallback.data && Array.isArray(modzFallback.data.records) && modzFallback.data.records.length > 0) {
          return res.json(modzFallback.data);
        }
      }
      return res.status(upstreamResponse.status).json({
        success: false,
        error: responseData.error
      });
    }

    const sanitized = sanitizeIntelligenceData(responseData);

    if (cleanKey === 'Veh') {
      const hasVehData = sanitized && (
        (sanitized.response && Object.keys(sanitized.response).length > 0) ||
        sanitized.vehicle ||
        sanitized.makerModel ||
        sanitized.engine ||
        sanitized.chassis
      );
      if (!hasVehData && !sanitized.error) {
        return fallbackVehicleSearch(cleanQuery, res);
      }
    }

    return res.status(upstreamResponse.status).json(sanitized);

  } catch (error) {
    if (cleanKey === 'Veh') {
      return fallbackVehicleSearch(cleanQuery, res);
    }

    // Attempt fallback to Admin Modz for citizen / telecom queries
    if (cleanKey === 'Aadhar' || cleanKey === 'Aadharad' || cleanKey === 'Num' || cleanKey === 'Numad') {
      const modzFallback = await queryAdminModz(cleanQuery);
      if (modzFallback.success && modzFallback.data && Array.isArray(modzFallback.data.records) && modzFallback.data.records.length > 0) {
        return res.json(modzFallback.data);
      }
    }

    if (error.name === 'AbortError') {
      return res.status(504).json({
        success: false,
        error: 'Intelligence query timed out (Upstream cloud microservice is warming up, please retry shortly)'
      });
    }

    return res.status(502).json({
      success: false,
      error: 'Unable to connect to intelligence network'
    });
  }
});

/* ==========================================================================
   TOOL: ADMIN MODZ OSINT DEDICATED PROXY
   https://admin-modz.onrender.com/osint?query=user input &apikey=Demo
   ========================================================================== */

app.get('/api/admin-modz', async (req, res) => {
  const query = req.query.query || req.query.q;

  if (!query || typeof query !== 'string' || query.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'Query parameter is required'
    });
  }

  const cleanQuery = query.trim();
  recordSearchStat('adminmodz');

  const result = await queryAdminModz(cleanQuery);
  if (!result.success) {
    return res.status(502).json({
      success: false,
      error: result.error || 'Admin Modz OSINT service error'
    });
  }

  return res.status(result.status || 200).json(result.data);
});

/* ==========================================================================
   TOOL 1 & 2: NUMBER INFO & AADHAR INFO (SEARCH PROXY)
   ========================================================================== */

app.get('/api/search', async (req, res) => {
  const query = req.query.query;

  if (!query || typeof query !== 'string' || query.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'Query parameter is required'
    });
  }

  const encodedQuery = encodeURIComponent(query.trim());
  const upstreamUrl = `${SEARCH_API_URL}?q=${encodedQuery}`;

  recordSearchStat('number_aadhar');

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const upstreamResponse = await fetch(upstreamUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'RohitCyberTools/3.0'
      }
    });

    clearTimeout(timeoutId);
    const responseText = await upstreamResponse.text();

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      return res.status(502).json({
        success: false,
        error: 'Invalid response received from Search Engine'
      });
    }

    return res.status(upstreamResponse.status).json(responseData);

  } catch (error) {
    if (error.name === 'AbortError') {
      return res.status(504).json({
        success: false,
        error: 'Search request timed out (15s limit)'
      });
    }

    return res.status(502).json({
      success: false,
      error: 'Unable to connect to Search Engine'
    });
  }
});

/* ==========================================================================
   TOOL 3: VEHICLE INFO TOOL PROXY
   ========================================================================== */

app.get('/api/vehicle', async (req, res) => {
  const search = req.query.search;

  if (!search || typeof search !== 'string' || search.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'Vehicle registration number (RC) is required'
    });
  }

  const cleanRc = search.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const upstreamUrl = `${VEHICLE_API_URL}?type=vehicle&search=${encodeURIComponent(cleanRc)}&api_key=NITIN`;

  recordSearchStat('vehicle');

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const upstreamResponse = await fetch(upstreamUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'RohitCyberTools/3.0'
      }
    });

    clearTimeout(timeoutId);
    const responseText = await upstreamResponse.text();

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      return res.status(502).json({
        success: false,
        error: 'Invalid response from Vehicle Database'
      });
    }

    const sanitized = sanitizeIntelligenceData(responseData);
    const hasVehData = sanitized && (
      (sanitized.response && Object.keys(sanitized.response).length > 0) ||
      sanitized.vehicle ||
      sanitized.makerModel ||
      sanitized.engine ||
      sanitized.chassis
    );

    if (!hasVehData) {
      return res.status(404).json({
        success: false,
        error: `No vehicle registration records found for "${cleanRc}"`
      });
    }

    return res.status(upstreamResponse.status).json(sanitized);

  } catch (error) {
    if (error.name === 'AbortError') {
      return res.status(504).json({
        success: false,
        error: 'Vehicle database request timed out'
      });
    }

    return res.status(502).json({
      success: false,
      error: 'Unable to connect to Vehicle Database'
    });
  }
});

/* ==========================================================================
   TOOL 4: WEATHER INFO TOOL PROXY
   ========================================================================== */

app.get('/api/weather', async (req, res) => {
  const search = req.query.search || 'Delhi';

  const cleanCity = search.trim();
  const upstreamUrl = `${WEATHER_API_URL}?type=weather&search=${encodeURIComponent(cleanCity)}`;

  recordSearchStat('weather');

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const upstreamResponse = await fetch(upstreamUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'RohitCyberTools/3.0'
      }
    });

    clearTimeout(timeoutId);
    const responseText = await upstreamResponse.text();

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      return res.status(502).json({
        success: false,
        error: 'Invalid response from Weather Intelligence'
      });
    }

    return res.status(upstreamResponse.status).json(responseData);

  } catch (error) {
    if (error.name === 'AbortError') {
      return res.status(504).json({
        success: false,
        error: 'Weather service request timed out'
      });
    }

    return res.status(502).json({
      success: false,
      error: 'Unable to connect to Weather Intelligence'
    });
  }
});

// Fallback to public/index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start Express server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`ROHIT { CYBER TOOLS } server active on port ${PORT}`);
});
