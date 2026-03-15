// Killjoy Lead Scraper — Google Places API + Email Extraction + Export
import { getUserData, setUserData, removeUserData } from './userStorage';

const PLACES_API = 'https://places.googleapis.com/v1/places:searchText';
const PLACES_DETAILS = 'https://places.googleapis.com/v1/places';

// --- Google Places API Key ---
function getGoogleKey() {
  const key = localStorage.getItem('kj_google_key');
  if (!key) throw new Error('Google API key not set. Go to Settings.');
  return key;
}

export function isGoogleKeySet() {
  return !!localStorage.getItem('kj_google_key');
}

// --- Search businesses via Google Places API (New) — single page ---
export async function searchBusinesses({ query, location, radius = 50000, pageToken = null }) {
  const apiKey = getGoogleKey();

  const searchText = location ? `${query} in ${location}` : query;

  const requestBody = {
    textQuery: searchText,
    maxResultCount: 20,
    languageCode: 'en'
  };

  if (pageToken) {
    requestBody.pageToken = pageToken;
  }

  const response = await fetch(PLACES_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.googleMapsUri,places.businessStatus,places.types,places.rating,places.userRatingCount,places.primaryType,places.shortFormattedAddress,nextPageToken'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: `HTTP ${response.status}` } }));
    throw new Error(err.error?.message || `Google Places error: ${response.status}`);
  }

  const data = await response.json();

  const leads = (data.places || []).map(place => ({
    id: place.id,
    name: place.displayName?.text || '',
    address: place.formattedAddress || place.shortFormattedAddress || '',
    phone: place.internationalPhoneNumber || place.nationalPhoneNumber || '',
    website: place.websiteUri || '',
    mapsUrl: place.googleMapsUri || '',
    status: place.businessStatus || '',
    type: place.primaryType || place.types?.[0] || '',
    rating: place.rating || null,
    reviewCount: place.userRatingCount || 0,
    email: '', // Will be filled by email extractor
    socialLinks: {},
    source: 'Google Maps',
    scrapedAt: Date.now()
  }));

  return {
    leads,
    nextPageToken: data.nextPageToken || null,
    totalFound: leads.length
  };
}

// --- Search ALL pages automatically (fetches every available page) ---
// Google Places API caps at ~3 pages (60 results) per query.
// To get MORE leads, we split into sub-queries by appending area qualifiers.
export async function searchAllPages({ query, location, onProgress }) {
  const allLeads = [];
  const seenIds = new Set();

  // Build query variants to maximize coverage
  const queryVariants = [query];

  // If location is provided, add sub-area variations to get past the 60-result cap
  if (location) {
    const areas = ['near me', 'best', 'top rated', 'popular', 'new', 'cheap', 'premium', 'local', 'famous'];
    areas.forEach(a => queryVariants.push(`${a} ${query}`));
  }

  let totalPages = 0;

  for (let q = 0; q < queryVariants.length; q++) {
    const currentQuery = queryVariants[q];
    let pageToken = null;
    let pageNum = 0;
    const maxPagesPerQuery = 10;

    do {
      pageNum++;
      totalPages++;
      if (onProgress) onProgress(totalPages, allLeads.length, `Query ${q + 1}/${queryVariants.length}: "${currentQuery}" — page ${pageNum}`);

      try {
        const result = await searchBusinesses({ query: currentQuery, location, pageToken });

        // Deduplicate by ID
        for (const lead of result.leads) {
          if (!seenIds.has(lead.id)) {
            seenIds.add(lead.id);
            allLeads.push(lead);
          }
        }
        pageToken = result.nextPageToken;
      } catch (e) {
        // If a query variant fails, skip to next
        pageToken = null;
      }

      if (pageToken && pageNum < maxPagesPerQuery) {
        await new Promise(r => setTimeout(r, 1000));
      }
    } while (pageToken && pageNum < maxPagesPerQuery);

    // Stop if we have enough leads
    if (allLeads.length >= 500) break;

    // Delay between query variants
    if (q < queryVariants.length - 1) {
      await new Promise(r => setTimeout(r, 800));
    }
  }

  return {
    leads: allLeads,
    totalFound: allLeads.length,
    pagesScraped: totalPages
  };
}

// --- Extract emails from a website ---
export async function extractEmailsFromDomain(domain, corsProxy = '') {
  if (!domain) return { emails: [], error: 'No domain provided' };

  // Normalize domain
  let url = domain.trim();
  if (!url.startsWith('http')) url = 'https://' + url;

  const proxy = corsProxy || localStorage.getItem('kj_cors_proxy') || 'https://corsproxy.io/?';

  const pages = ['', '/contact', '/about', '/contact-us', '/about-us'];
  const allEmails = new Set();
  const socialLinks = {};
  const errors = [];

  for (const page of pages) {
    try {
      const fetchUrl = proxy + encodeURIComponent(url + page);
      const response = await fetch(fetchUrl, {
        headers: { 'Accept': 'text/html' },
        signal: AbortSignal.timeout(8000)
      });

      if (!response.ok) continue;

      const html = await response.text();

      // Extract emails
      const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
      const found = html.match(emailRegex) || [];
      found.forEach(email => {
        // Filter out image files and common junk
        const lower = email.toLowerCase();
        if (!lower.endsWith('.png') && !lower.endsWith('.jpg') && !lower.endsWith('.gif') &&
            !lower.endsWith('.svg') && !lower.endsWith('.webp') && !lower.includes('example.com') &&
            !lower.includes('sentry.io') && !lower.includes('webpack') && !lower.startsWith('0x')) {
          allEmails.add(lower);
        }
      });

      // Extract social links
      const fbMatch = html.match(/https?:\/\/(www\.)?facebook\.com\/[a-zA-Z0-9._\-]+/gi);
      const igMatch = html.match(/https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9._\-]+/gi);
      const twMatch = html.match(/https?:\/\/(www\.)?(twitter|x)\.com\/[a-zA-Z0-9._\-]+/gi);
      const liMatch = html.match(/https?:\/\/(www\.)?linkedin\.com\/(company|in)\/[a-zA-Z0-9._\-]+/gi);
      const ytMatch = html.match(/https?:\/\/(www\.)?youtube\.com\/(channel|c|@)[a-zA-Z0-9._\-\/]+/gi);

      if (fbMatch) socialLinks.facebook = fbMatch[0];
      if (igMatch) socialLinks.instagram = igMatch[0];
      if (twMatch) socialLinks.twitter = twMatch[0];
      if (liMatch) socialLinks.linkedin = liMatch[0];
      if (ytMatch) socialLinks.youtube = ytMatch[0];
    } catch (err) {
      errors.push(`${page || '/'}: ${err.message}`);
    }
  }

  return {
    emails: [...allEmails],
    socialLinks,
    errors: errors.length > 0 ? errors : null
  };
}

// --- Batch email extraction for multiple leads ---
export async function batchExtractEmails(leads, onProgress) {
  const results = [];
  const corsProxy = localStorage.getItem('kj_cors_proxy') || 'https://corsproxy.io/?';

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    if (onProgress) onProgress(i + 1, leads.length, lead.name);

    if (!lead.website) {
      results.push({ ...lead });
      continue;
    }

    try {
      const { emails, socialLinks } = await extractEmailsFromDomain(lead.website, corsProxy);
      results.push({
        ...lead,
        email: emails.join(', '),
        socialLinks: { ...lead.socialLinks, ...socialLinks }
      });
    } catch {
      results.push({ ...lead });
    }

    // Small delay to avoid rate limiting
    if (i < leads.length - 1) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  return results;
}

// --- Export to CSV ---
export function exportToCSV(leads, filename = 'killjoy-leads') {
  const headers = ['Name', 'Phone', 'Email', 'Website', 'Address', 'Rating', 'Reviews', 'Type', 'Google Maps', 'Facebook', 'Instagram', 'Twitter', 'LinkedIn', 'Source', 'Date'];

  const rows = leads.map(l => [
    l.name,
    l.phone,
    l.email,
    l.website,
    l.address,
    l.rating || '',
    l.reviewCount || '',
    l.type,
    l.mapsUrl,
    l.socialLinks?.facebook || '',
    l.socialLinks?.instagram || '',
    l.socialLinks?.twitter || '',
    l.socialLinks?.linkedin || '',
    l.source,
    new Date(l.scrapedAt).toLocaleDateString()
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// --- Export to Excel (simple HTML table that Excel opens) ---
export function exportToExcel(leads, filename = 'killjoy-leads') {
  const headers = ['Name', 'Phone', 'Email', 'Website', 'Address', 'Rating', 'Reviews', 'Type', 'Google Maps', 'Facebook', 'Instagram', 'Twitter', 'LinkedIn', 'Source', 'Date'];

  let html = '<html><head><meta charset="utf-8"><style>td,th{border:1px solid #ccc;padding:6px 10px;font-family:Segoe UI,sans-serif;font-size:12px}th{background:#7c3aed;color:white;font-weight:bold}tr:nth-child(even){background:#f5f5f5}</style></head><body><table>';
  html += '<tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr>';

  leads.forEach(l => {
    html += '<tr>' + [
      l.name, l.phone, l.email, l.website, l.address,
      l.rating || '', l.reviewCount || '', l.type, l.mapsUrl,
      l.socialLinks?.facebook || '', l.socialLinks?.instagram || '',
      l.socialLinks?.twitter || '', l.socialLinks?.linkedin || '',
      l.source, new Date(l.scrapedAt).toLocaleDateString()
    ].map(cell => `<td>${String(cell).replace(/</g, '&lt;')}</td>`).join('') + '</tr>';
  });

  html += '</table></body></html>';

  const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().split('T')[0]}.xls`;
  a.click();
  URL.revokeObjectURL(url);
}

// --- Export to PDF (printable HTML in new window) ---
export function exportToPDF(leads, filename = 'killjoy-leads') {
  const now = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });

  let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${filename}</title><style>
    @page { size: landscape; margin: 12mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, sans-serif; font-size: 11px; color: #1a1a2e; padding: 20px; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 3px solid #7c3aed; padding-bottom: 10px; }
    .header h1 { font-size: 20px; color: #7c3aed; }
    .header .meta { font-size: 11px; color: #666; text-align: right; }
    .stats { display: flex; gap: 20px; margin-bottom: 14px; }
    .stats span { background: #f3f0ff; padding: 4px 10px; border-radius: 4px; font-size: 10px; color: #7c3aed; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th { background: #7c3aed; color: white; padding: 7px 6px; text-align: left; font-weight: 600; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; }
    td { padding: 6px; border-bottom: 1px solid #e5e5e5; vertical-align: top; word-break: break-word; }
    tr:nth-child(even) { background: #fafafa; }
    tr:hover { background: #f3f0ff; }
    .sr { color: #999; font-weight: 600; text-align: center; }
    .name { font-weight: 600; color: #1a1a2e; }
    .email { color: #7c3aed; }
    .phone { color: #059669; }
    .url { color: #2563eb; font-size: 9px; }
    .footer { margin-top: 14px; text-align: center; font-size: 9px; color: #999; border-top: 1px solid #eee; padding-top: 8px; }
    @media print { body { padding: 0; } .no-print { display: none; } }
  </style></head><body>`;

  html += `<div class="header"><h1>Killjoy Lead Report</h1><div class="meta">Generated: ${now}<br>${leads.length} leads</div></div>`;

  const withEmail = leads.filter(l => l.email).length;
  const withPhone = leads.filter(l => l.phone).length;
  html += `<div class="stats"><span>Total: ${leads.length}</span><span>With Email: ${withEmail}</span><span>With Phone: ${withPhone}</span></div>`;

  html += `<button class="no-print" onclick="window.print()" style="margin-bottom:12px;background:#7c3aed;color:#fff;border:none;padding:8px 20px;border-radius:6px;cursor:pointer;font-size:12px;">Print / Save as PDF</button>`;

  html += `<table><thead><tr><th style="width:30px">#</th><th>Business Name</th><th>Phone</th><th>Email</th><th>Website</th><th>Address</th><th>Rating</th><th>Type</th></tr></thead><tbody>`;

  leads.forEach((l, i) => {
    html += `<tr>
      <td class="sr">${i + 1}</td>
      <td class="name">${esc(l.name)}</td>
      <td class="phone">${esc(l.phone || '—')}</td>
      <td class="email">${esc(l.email || '—')}</td>
      <td class="url">${l.website ? esc(l.website.replace(/^https?:\/\/(www\.)?/, '').substring(0, 30)) : '—'}</td>
      <td>${esc((l.address || '').substring(0, 50))}</td>
      <td style="text-align:center">${l.rating ? l.rating + ' ★' : '—'}</td>
      <td>${esc((l.type || '').replace(/_/g, ' '))}</td>
    </tr>`;
  });

  html += `</tbody></table>`;
  html += `<div class="footer">Killjoy Lead Engine — ${now}</div>`;
  html += `</body></html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  // Auto-trigger print dialog after a short delay
  setTimeout(() => win.print(), 600);
}

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// --- Lead Verification ---
// Verifies emails (MX record check), websites (reachability), and phone format

// Check if email domain has valid MX records via DNS-over-HTTPS (Google)
async function verifyEmailDomain(email) {
  if (!email) return { valid: false, reason: 'No email' };
  const domain = email.split('@')[1];
  if (!domain) return { valid: false, reason: 'Invalid format' };
  try {
    const res = await fetch(`https://dns.google/resolve?name=${domain}&type=MX`, {
      signal: AbortSignal.timeout(5000)
    });
    const data = await res.json();
    if (data.Answer && data.Answer.length > 0) {
      return { valid: true, reason: 'MX records found', mxRecords: data.Answer.length };
    }
    // Fallback: check A record (some domains receive mail without explicit MX)
    const aRes = await fetch(`https://dns.google/resolve?name=${domain}&type=A`, {
      signal: AbortSignal.timeout(5000)
    });
    const aData = await aRes.json();
    if (aData.Answer && aData.Answer.length > 0) {
      return { valid: true, reason: 'A record found (may accept mail)', mxRecords: 0 };
    }
    return { valid: false, reason: 'No MX/A records — domain cannot receive email' };
  } catch {
    return { valid: false, reason: 'DNS lookup failed' };
  }
}

// Check if website is reachable
async function verifyWebsite(url) {
  if (!url) return { valid: false, reason: 'No website' };
  const proxy = localStorage.getItem('kj_cors_proxy') || 'https://corsproxy.io/?';
  let cleanUrl = url.trim();
  if (!cleanUrl.startsWith('http')) cleanUrl = 'https://' + cleanUrl;
  try {
    const res = await fetch(proxy + encodeURIComponent(cleanUrl), {
      method: 'HEAD',
      signal: AbortSignal.timeout(8000)
    });
    if (res.ok || res.status === 301 || res.status === 302) {
      return { valid: true, reason: `HTTP ${res.status}`, statusCode: res.status };
    }
    return { valid: false, reason: `HTTP ${res.status}`, statusCode: res.status };
  } catch {
    return { valid: false, reason: 'Unreachable' };
  }
}

// Validate phone number format (basic checks)
function verifyPhone(phone) {
  if (!phone) return { valid: false, reason: 'No phone' };
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.length < 7) return { valid: false, reason: 'Too short' };
  if (digits.length > 15) return { valid: false, reason: 'Too long' };
  return { valid: true, reason: `${digits.length} digits` };
}

// Batch verify leads — checks email domain, website, and phone for each lead
export async function verifyLeads(leads, onProgress) {
  const results = [];
  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    if (onProgress) onProgress(i + 1, leads.length, lead.name);

    const emailResults = [];
    if (lead.email) {
      const emails = lead.email.split(',').map(e => e.trim()).filter(Boolean);
      for (const em of emails) {
        const result = await verifyEmailDomain(em);
        emailResults.push({ email: em, ...result });
      }
    }

    const websiteResult = await verifyWebsite(lead.website);
    const phoneResult = verifyPhone(lead.phone);

    const emailValid = emailResults.length > 0 && emailResults.some(e => e.valid);
    const overallScore =
      (emailValid ? 1 : 0) +
      (websiteResult.valid ? 1 : 0) +
      (phoneResult.valid ? 1 : 0);

    results.push({
      ...lead,
      verification: {
        emails: emailResults,
        website: websiteResult,
        phone: phoneResult,
        emailValid,
        websiteValid: websiteResult.valid,
        phoneValid: phoneResult.valid,
        score: overallScore, // 0-3
        verifiedAt: Date.now()
      }
    });

    // Small delay to avoid rate limiting on DNS
    if (i < leads.length - 1) {
      await new Promise(r => setTimeout(r, 300));
    }
  }
  return results;
}

// --- Lead storage (user-scoped) ---
export function saveLeads(newLeads) {
  const existing = getUserData('leads', []);
  const deduped = [...existing];
  let added = 0;
  for (const lead of newLeads) {
    const exists = deduped.some(e =>
      e.name === lead.name && e.phone === lead.phone && e.address === lead.address
    );
    if (!exists) {
      deduped.push(lead);
      added++;
    }
  }
  setUserData('leads', deduped);
  return { total: deduped.length, added };
}

export function getAllLeads() {
  return getUserData('leads', []);
}

export function deleteLeads(ids) {
  const leads = getAllLeads().filter(l => !ids.includes(l.id + l.scrapedAt));
  setUserData('leads', leads);
  return leads;
}

export function clearAllLeads() {
  removeUserData('leads');
}

// --- Search history (user-scoped) ---
export function saveSearch(query, location, resultCount) {
  const history = getUserData('search_history', []);
  history.unshift({ query, location, resultCount, date: Date.now() });
  setUserData('search_history', history.slice(0, 50));
}

export function getSearchHistory() {
  return getUserData('search_history', []);
}
