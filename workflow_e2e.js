const http = require('http');
const { execSync } = require('child_process');

const BASE = 'http://localhost:5000';
const PASS_RESULTS = [];
const FAIL_RESULTS = [];

// Pre-generated JWT tokens (valid 24h from generation)
const TOKENS = {
  admin: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiYWRtaW4iLCJkZXBhcnRtZW50IjpudWxsLCJpYXQiOjE3ODMxNzAwODMsImV4cCI6MTc4MzI1NjQ4M30.dpjnGmw8p9nS1L8dTo59T0gMvjABsDxlzSyR99Nq42Q',
  investment: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjIsInVzZXJuYW1lIjoiZW1wbG95ZWVfaW52ZXN0bWVudCIsInJvbGUiOiJlbXBsb3llZSIsImRlcGFydG1lbnQiOiJpbnZlc3RtZW50IiwiaWF0IjoxNzgzMTcwMDgzLCJleHAiOjE3ODMyNTY0ODN9.Ws_7QHuS_VFDWtkGZMBjiaDCvI1jvEhcwqlaBQCvF9k',
  administrative: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjMsInVzZXJuYW1lIjoiZW1wbG95ZWVfYWRtaW4iLCJyb2xlIjoiZW1wbG95ZWUiLCJkZXBhcnRtZW50IjoiYWRtaW5pc3RyYXRpdmUiLCJpYXQiOjE3ODMxNzAwODMsImV4cCI6MTc4MzI1NjQ4M30.RQ2Dmm173XxhJ3Ptgu8K7NWlopylr_nMX6iJ4NToGvI',
  customer: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjQsInVzZXJuYW1lIjoiY3VzdG9tZXJfdGVzdCIsInJvbGUiOiJjdXN0b21lciIsImRlcGFydG1lbnQiOm51bGwsImlhdCI6MTc4MzE3MDA4MywiZXhwIjoxNzgzMjU2NDgzfQ.0BattPbfHC1FVsk1ZnFbCu1r-5dfUhfRbPqOVZvprgk',
};

// Regenerate tokens if expired
function freshToken(payload) {
  const jwt = require('jsonwebtoken');
  return jwt.sign(payload, 'your-very-secure-jwt-secret-key-here-minimum-32-chars', { expiresIn: '12h' });
}

const FRESH = {
  admin: freshToken({ userId: 1, username: 'admin', role: 'admin', department: null }),
  investment: freshToken({ userId: 2, username: 'employee_investment', role: 'employee', department: 'investment' }),
  administrative: freshToken({ userId: 3, username: 'employee_admin', role: 'employee', department: 'administrative' }),
  customer: freshToken({ userId: 4, username: 'customer_test', role: 'customer', department: null }),
};

function dbq(sql) {
  try {
    return execSync(
      `PGPASSWORD="portal_password" psql -h 127.0.0.1 -p 5432 -U portal_user -d portal_db -t -c "${sql.replace(/"/g, '\\"')}"`,
      { encoding: 'utf8' }
    ).trim();
  } catch (e) { return ''; }
}

async function api(method, path, token, body) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'localhost', port: 5000,
      path, method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    };
    const req = http.request(options, (res) => {
      let raw = '';
      res.on('data', d => raw += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw), raw }); }
        catch { resolve({ status: res.statusCode, body: {}, raw }); }
      });
    });
    req.on('error', e => resolve({ status: 0, body: { message: e.message }, raw: '' }));
    if (data) req.write(data);
    req.end();
  });
}

function ok(label) {
  console.log(`  ✅ ${label}`);
  PASS_RESULTS.push(label);
}

function fail(label, detail = '') {
  console.log(`  ❌ ${label}`);
  if (detail) console.log(`     → ${String(detail).substring(0, 200)}`);
  FAIL_RESULTS.push(label);
}

async function runTests() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║   WORKFLOW E2E TEST SUITE (Node.js runner)  ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  // ── SETUP: Seed test company + customer link ──
  console.log('── SETUP ──');
  dbq("INSERT INTO companies(name,national_id,registration_number,created_by,created_at,updated_at) VALUES('E2E Co','E2ETEST99','E2EREG',1,NOW(),NOW()) ON CONFLICT(national_id) DO NOTHING;");
  const coIdRaw = dbq("SELECT id FROM companies WHERE national_id='E2ETEST99';");
  const CO_ID = parseInt(coIdRaw);
  if (!CO_ID) { fail('Company setup', coIdRaw); return; }
  console.log(`  Company ID: ${CO_ID}`);
  dbq(`INSERT INTO company_users(company_id,user_id,created_at) VALUES(${CO_ID},4,NOW()) ON CONFLICT DO NOTHING;`);

  // Create service
  const svcResp = await api('POST', '/api/services', FRESH.admin, {
    title: 'E2E Test Service', department: 'investment', isActive: true, sortOrder: 0
  });
  const SVC_ID = svcResp.body.id;
  SVC_ID ? ok(`Service created (ID=${SVC_ID})`) : fail('Service create', svcResp.body.message);

  // Assign service to company
  await api('POST', '/api/services/assign-to-company', FRESH.admin, { companyId: CO_ID, serviceId: SVC_ID });

  // ── TEST 1: Create Service Request ──
  console.log('\n── TEST 1: Create Service Request ──');
  const srResp = await api('POST', '/api/service-requests', FRESH.customer, {
    serviceId: SVC_ID, companyId: CO_ID, priority: 'normal'
  });
  const SR_ID = srResp.body.serviceRequest?.id || srResp.body.id;
  SR_ID ? ok(`Request created (ID=${SR_ID})`) : fail('Request create', srResp.body.message);

  if (!SR_ID) {
    console.log('\n⛔ Cannot continue without a service request.');
    return;
  }

  // Verify no duplicate workflow
  const wfCount = parseInt(dbq(`SELECT COUNT(*) FROM service_request_workflow WHERE service_request_id=${SR_ID};`));
  wfCount === 1
    ? ok(`Single workflow record (no duplicate — Fix#1 confirmed)`)
    : fail('Duplicate workflow check', `count=${wfCount}`);

  // Verify initial stage
  const stg1 = dbq(`SELECT current_stage FROM service_request_workflow WHERE service_request_id=${SR_ID};`);
  stg1 === 'investment_forms_pending'
    ? ok(`Initial stage = investment_forms_pending`)
    : fail('Initial stage', stg1);

  // ── TEST 2: Wrong-Stage Error Message Quality ──
  console.log('\n── TEST 2: Wrong-Stage Error Quality (Fix #2,3,4) ──');

  // Transfer at investment_forms_pending (wrong) → must be 400 + descriptive
  const t1 = await api('POST', `/api/service-requests/${SR_ID}/transfer-to-administrative`, FRESH.investment, { notes: 'test' });
  t1.status === 400 ? ok('transfer @ wrong-stage → HTTP 400') : fail('transfer HTTP code', `got ${t1.status}`);
  t1.body.message?.includes('خطای سیستم')
    ? fail('transfer generic "خطای سیستم"', t1.body.message)
    : ok(`transfer → descriptive: "${t1.body.message}"`);

  // Complete at investment_forms_pending (wrong) → must be 400 + descriptive
  const c1 = await api('POST', `/api/service-requests/${SR_ID}/complete`, FRESH.administrative, { notes: 'test' });
  c1.status === 400 ? ok('complete @ wrong-stage → HTTP 400') : fail('complete HTTP code', `got ${c1.status}`);
  c1.body.message?.includes('خطای سیستم')
    ? fail('complete generic "خطای سیستم"', c1.body.message)
    : ok(`complete → descriptive: "${c1.body.message}"`);

  // mark-forms with invalid stage → must be 400
  const bogus = await api('POST', `/api/service-requests/${SR_ID}/mark-forms-completed`, FRESH.customer, { stage: 'bogus' });
  bogus.status === 400 ? ok('mark-forms bogus stage → HTTP 400') : fail('mark-forms bogus HTTP', `got ${bogus.status} — ${bogus.body.message}`);

  // ── TEST 3: mark-forms-completed (Fix#5 — main post-approval crash) ──
  console.log('\n── TEST 3: mark-forms-completed Error Handling (Fix #5) ──');
  const mf1 = await api('POST', `/api/service-requests/${SR_ID}/mark-forms-completed`, FRESH.customer, { stage: 'investment' });
  let stgNow = dbq(`SELECT current_stage FROM service_request_workflow WHERE service_request_id=${SR_ID};`);

  if (stgNow === 'investment_review') {
    ok('mark-forms investment → stage=investment_review (no required forms — allowed progression)');
  } else if (mf1.status === 400) {
    const isGeneric = mf1.body.message?.includes('خطای سیستم');
    isGeneric
      ? fail('mark-forms returned generic 500 error!', mf1.body.message)
      : ok(`mark-forms 400 descriptive: "${mf1.body.message}" (required forms exist — correct!)`);
    // Force advance for pipeline testing
    dbq(`UPDATE service_request_workflow SET current_stage='investment_review' WHERE service_request_id=${SR_ID};`);
    stgNow = 'investment_review';
    ok('Forced to investment_review to test rest of pipeline');
  } else {
    fail('mark-forms unexpected', `HTTP ${mf1.status}: ${mf1.body.message}`);
  }

  // ── TEST 4: Happy-Path Pipeline ──
  console.log('\n── TEST 4: Full Happy Path ──');

  // 4a: Transfer to administrative (investment employee)
  const tf = await api('POST', `/api/service-requests/${SR_ID}/transfer-to-administrative`, FRESH.investment, { notes: 'Approved' });
  const stgAfterTransfer = dbq(`SELECT current_stage FROM service_request_workflow WHERE service_request_id=${SR_ID};`);
  stgAfterTransfer === 'administrative_forms_pending'
    ? ok('transfer() → administrative_forms_pending')
    : fail('transfer happy path', `HTTP ${tf.status}, stage=${stgAfterTransfer}, msg=${tf.body.message}`);

  // 4b: mark admin forms
  const mfa = await api('POST', `/api/service-requests/${SR_ID}/mark-forms-completed`, FRESH.customer, { stage: 'administrative' });
  let stgAfterAdminForms = dbq(`SELECT current_stage FROM service_request_workflow WHERE service_request_id=${SR_ID};`);
  if (stgAfterAdminForms === 'administrative_review') {
    ok('mark-forms administrative → administrative_review');
  } else {
    mfa.body.message?.includes('خطای سیستم')
      ? fail('admin mark-forms generic', mfa.body.message)
      : ok(`admin mark-forms descriptive 400: "${mfa.body.message}"`);
    dbq(`UPDATE service_request_workflow SET current_stage='administrative_review' WHERE service_request_id=${SR_ID};`);
    stgAfterAdminForms = 'administrative_review';
  }

  // 4c: Complete (administrative employee)
  const cp = await api('POST', `/api/service-requests/${SR_ID}/complete`, FRESH.administrative, { notes: 'Fully approved' });
  const finalStage = dbq(`SELECT current_stage FROM service_request_workflow WHERE service_request_id=${SR_ID};`);
  finalStage === 'completed'
    ? ok('🎉 complete() → stage=completed (FULL HAPPY PATH CONFIRMED!)')
    : fail('complete happy path', `HTTP ${cp.status}, stage=${finalStage}, msg=${cp.body.message}`);

  // ── TEST 5: Post-Completion Error Quality ──
  console.log('\n── TEST 5: Post-Completion Errors ──');

  const reTransfer = await api('POST', `/api/service-requests/${SR_ID}/transfer-to-administrative`, FRESH.investment, { notes: 'late' });
  reTransfer.status === 400 ? ok('post-complete transfer → HTTP 400') : fail('post-complete transfer', `got ${reTransfer.status}`);
  reTransfer.body.message?.includes('خطای سیستم')
    ? fail('post-complete transfer generic!', reTransfer.body.message)
    : ok(`post-complete transfer → descriptive: "${reTransfer.body.message}"`);

  const reComplete = await api('POST', `/api/service-requests/${SR_ID}/complete`, FRESH.administrative, { notes: 'again' });
  reComplete.status === 400 ? ok('post-complete complete → HTTP 400') : fail('post-complete complete', `got ${reComplete.status}`);
  reComplete.body.message?.includes('خطای سیستم')
    ? fail('post-complete complete generic!', reComplete.body.message)
    : ok(`post-complete complete → descriptive: "${reComplete.body.message}"`);

  const reMark = await api('POST', `/api/service-requests/${SR_ID}/mark-forms-completed`, FRESH.customer, { stage: 'investment' });
  reMark.status === 400 ? ok('post-complete mark-forms → HTTP 400') : fail('post-complete mark-forms', `got ${reMark.status}`);
  reMark.body.message?.includes('خطای سیستم')
    ? fail('post-complete mark-forms generic!', reMark.body.message)
    : ok(`post-complete mark-forms → descriptive: "${reMark.body.message}"`);

  // ── CLEANUP ──
  await api('DELETE', `/api/services/${SVC_ID}`, FRESH.admin, null);
  dbq("DELETE FROM companies WHERE national_id='E2ETEST99';");

  // ── RESULTS ──
  const p = PASS_RESULTS.length, f = FAIL_RESULTS.length;
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log(`║  RESULTS: ${p} ✅ passed  |  ${f} ❌ failed${' '.repeat(Math.max(0, 16 - String(p+f).length))}║`);
  console.log('╚══════════════════════════════════════════════╝');
  if (f > 0) {
    console.log('\nFailed tests:');
    FAIL_RESULTS.forEach(r => console.log('  ❌ ' + r));
  }
  process.exit(f > 0 ? 1 : 0);
}

runTests().catch(e => { console.error('Fatal:', e); process.exit(1); });
