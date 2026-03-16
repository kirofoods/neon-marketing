import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { PieChart as RechartsPieChart, Pie, Cell, BarChart as RechartsBarChart, Bar, LineChart as RechartsLineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { initSync, isSyncEnabled, pushToCloud, pullFromCloud, parseFirebaseConfig, getSyncStatus } from './utils/sync.js';
import {
  LayoutDashboard, Search, Settings, Menu, X, Check,
  AlertCircle, ExternalLink, Zap, TrendingUp, Clock, BarChart3,
  Globe, Lock, LogOut, Trash2, Download, Copy, Mail,
  MapPin, Phone, Building2, Users, FileSpreadsheet, Filter,
  ChevronRight, Star, RefreshCw, Crosshair, Database, ArrowRight,
  Activity, Target, Shield, FileText, Link, Eye, Radar,
  Hash, Layers, BarChart2, Gauge, Type, Bookmark, PieChart, Microscope, BookOpen,
  Megaphone, DollarSign, Newspaper, UserCheck, AlertTriangle, MessageSquare, Award,
  Feather, Mic, MicOff, Volume2, StopCircle, ImageIcon, Wand2, CheckCircle2, XCircle,
  Inbox, Send, Bell, Package, ShoppingCart, CreditCard, Truck,
  Instagram, Twitter, Linkedin, Facebook, Library, Heart, Share2, Repeat2
} from 'lucide-react';
import { callClaude, isApiKeySet, AI_PROVIDERS, getActiveProvider, setActiveProvider, SYSTEM_PROMPTS, KIRO_CONTEXT, MARKETING_SKILLS, getMarketingPrompt, getSkillsByCategory, detectSkill, getSkillListForAI } from './utils/api';
import {
  searchBusinesses, searchAllPages, extractEmailsFromDomain, batchExtractEmails,
  exportToCSV, exportToExcel, exportToPDF, verifyLeads, saveLeads, getAllLeads, deleteLeads,
  clearAllLeads, saveSearch, getSearchHistory, isGoogleKeySet
} from './utils/leads';
import {
  scrapeGoogleSERP, crawlWebsite, checkKeywordRankings, runSiteAudit,
  isApifyTokenSet,
  scrapeInstagramProfile, scrapeInstagramHashtag,
  scrapeFacebookPage, scrapeFacebookAdsLibrary,
  scrapeLinkedInProfile, scrapeLinkedInCompany,
  scrapeTwitterProfile, scrapeTwitterSearch
} from './utils/apify';
import {
  getKeywordSuggestions, expandKeyword, getQuestionKeywords,
  estimateKeywordDifficulty, estimateSearchVolume, clusterKeywords,
  analyzeOnPageSEO, getCoreWebVitals, getDomainRank, estimateBacklinks,
  getDomainOverview, analyzeKeywordGap, analyzeContent,
  saveRankSnapshot, getRankHistory, getAllTrackedDomains,
  getSEODashboardData, getTrafficInsights, getAdIntelligence,
  researchContent, getCompetitorKeywords
} from './utils/seo';
import {
  isShopifyConnected, getShopifyStoreName, auditShopifySEO, fixSEOIssue,
  getAllProductImages, updateProductImageAlt, batchUpdateAltText,
  getOrders, getOrderCount, getShopInfo, getProductCount, getCustomerCount, getCustomers, getProducts
} from './utils/shopify';
import {
  getCurrentUser, setCurrentUser, clearCurrentUser, isCurrentUserAdmin,
  authenticatePin, getUsers, saveUsers, getAllUsernames,
  getUserDataAs, getAggregatedData, migrateOldData, removeUserData
} from './utils/userStorage';

// ---- TOAST ----
function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return <div className={`toast toast-${type}`}>{message}</div>;
}

// ---- LOADING DOTS ----
function LoadingDots() {
  return <div className="loading-dots"><span /><span /><span /></div>;
}

// =============================================
// ANALYSIS SUMMARY — Reusable insights panel
// =============================================
const INSIGHT_STYLES = {
  strength: { bg: 'rgba(5,150,105,0.08)', border: '#059669', icon: '✓', label: 'Strength' },
  weakness: { bg: 'rgba(220,38,38,0.08)', border: '#dc2626', icon: '✕', label: 'Weakness' },
  opportunity: { bg: 'rgba(99,102,241,0.08)', border: '#6366f1', icon: '★', label: 'Opportunity' },
  gap: { bg: 'rgba(245,158,11,0.08)', border: '#f59e0b', icon: '⚠', label: 'Gap' },
  info: { bg: 'rgba(59,130,246,0.08)', border: '#3b82f6', icon: 'ℹ', label: 'Insight' },
};

function AnalysisSummary({ title, insights, summary }) {
  const [expanded, setExpanded] = useState(true);
  if (!insights || insights.length === 0) return null;

  const grouped = {};
  insights.forEach(i => {
    const t = i.type || 'info';
    if (!grouped[t]) grouped[t] = [];
    grouped[t].push(i);
  });

  const counts = Object.entries(grouped).map(([type, items]) => ({ type, count: items.length }));

  return (
    <div className="card" style={{ marginTop: 20, borderLeft: '3px solid var(--accent)' }}>
      <div className="card-header" style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        onClick={() => setExpanded(!expanded)}>
        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Microscope size={16} style={{ color: 'var(--accent)' }} />
          {title || 'Analysis Summary'}
        </h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {counts.map(({ type, count }) => (
            <span key={type} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: INSIGHT_STYLES[type]?.bg || INSIGHT_STYLES.info.bg, color: INSIGHT_STYLES[type]?.border || INSIGHT_STYLES.info.border, fontWeight: 700 }}>
              {count} {INSIGHT_STYLES[type]?.label || type}
            </span>
          ))}
          <ChevronRight size={14} style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--text-tertiary)' }} />
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '0 16px 16px' }}>
          {summary && (
            <div style={{ padding: '12px 16px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', marginBottom: 16, fontSize: 13, lineHeight: 1.7, color: 'var(--text-secondary)' }}>
              {summary}
            </div>
          )}

          {['strength', 'opportunity', 'gap', 'weakness', 'info'].filter(t => grouped[t]).map(type => (
            <div key={type} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: INSIGHT_STYLES[type].border, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{INSIGHT_STYLES[type].icon}</span> {INSIGHT_STYLES[type].label}s ({grouped[type].length})
              </div>
              {grouped[type].map((insight, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, padding: '10px 14px', background: INSIGHT_STYLES[type].bg, borderRadius: 'var(--radius-sm)', borderLeft: `3px solid ${INSIGHT_STYLES[type].border}` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{insight.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{insight.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Analysis generators for each tool
function generateKeywordInsights(results, keyword) {
  const insights = [];
  if (!results || results.length === 0) return insights;
  const easyCount = results.filter(r => r.difficulty === 'Easy').length;
  const hardCount = results.filter(r => r.difficulty === 'Hard').length;
  const questionCount = results.filter(r => r.type === 'QUERY' && /^(what|how|why|when|where|who|which|is|can|does|do)/i.test(r.keyword)).length;
  const longTail = results.filter(r => r.keyword.split(' ').length >= 4).length;

  if (easyCount > results.length * 0.3) insights.push({ type: 'opportunity', title: `${easyCount} low-competition keywords found`, detail: `${Math.round(easyCount / results.length * 100)}% of keywords have easy difficulty — these are quick wins for ranking. Prioritize creating content around these terms first.` });
  if (hardCount > results.length * 0.5) insights.push({ type: 'gap', title: `${hardCount} high-competition keywords`, detail: `Over half the keywords are competitive. Consider focusing on long-tail variations or question-based keywords to compete more effectively.` });
  if (longTail > 5) insights.push({ type: 'strength', title: `${longTail} long-tail keywords discovered`, detail: `Long-tail keywords (4+ words) have higher purchase intent and lower competition. These are ideal for blog posts and FAQ pages.` });
  if (questionCount > 3) insights.push({ type: 'opportunity', title: `${questionCount} question-based keywords`, detail: `Question keywords are perfect for FAQ sections, blog posts, and featured snippet optimization. Google's "People Also Ask" often surfaces these.` });
  if (results.length < 10) insights.push({ type: 'gap', title: 'Limited keyword pool', detail: `Only ${results.length} keywords found. Try broader seed terms, use the "Expand" feature for A-Z variations, or try "Questions" to uncover more opportunities.` });
  if (results.length >= 50) insights.push({ type: 'strength', title: `Strong keyword universe (${results.length} terms)`, detail: `You have a solid pool to build a content strategy around. Cluster these keywords by topic and create pillar content pages for each cluster.` });
  return insights;
}

function generateDomainInsights(overview) {
  const insights = [];
  if (!overview) return insights;
  const score = overview.onPage?.score || 0;
  const perf = overview.vitals?.scores?.performance || 0;
  const rank = overview.rank?.pageRank || 0;
  const indexed = overview.indexedPages || 0;
  const issues = overview.onPage?.issues || [];
  const critical = issues.filter(i => i.severity === 'critical').length;

  if (score >= 80) insights.push({ type: 'strength', title: `Strong SEO score (${score}/100)`, detail: 'The domain has solid on-page SEO fundamentals. Focus on maintaining this and building authority through backlinks and content.' });
  else if (score >= 50) insights.push({ type: 'gap', title: `Moderate SEO score (${score}/100)`, detail: `There's room for improvement. Address the ${critical} critical issue(s) first, then work on warnings. Each fix should bump the score by 5-15 points.` });
  else insights.push({ type: 'weakness', title: `Low SEO score (${score}/100)`, detail: `Significant SEO issues detected. The site needs immediate attention on fundamentals: meta tags, headings, content quality, and technical issues.` });

  if (perf >= 90) insights.push({ type: 'strength', title: `Excellent performance (${perf})`, detail: 'Page speed is a ranking factor. This domain loads fast, which improves user experience and search rankings.' });
  else if (perf < 50) insights.push({ type: 'weakness', title: `Poor performance score (${perf})`, detail: 'Slow loading pages hurt rankings and user experience. Optimize images, enable compression, reduce JavaScript, and consider a CDN.' });

  if (rank >= 5) insights.push({ type: 'strength', title: `High domain authority (${rank.toFixed(1)})`, detail: 'Strong domain authority signals trust to search engines. This domain has good link equity and should rank well for competitive terms.' });
  else if (rank < 2) insights.push({ type: 'gap', title: `Low domain authority (${rank.toFixed(1)})`, detail: 'Build authority through quality backlinks, guest posting, PR, and creating linkable assets (tools, research, infographics).' });

  if (indexed > 1000) insights.push({ type: 'strength', title: `${indexed.toLocaleString()} indexed pages`, detail: 'Large content footprint gives more ranking opportunities. Ensure there\'s no index bloat — check for thin content, duplicate pages, or parameter URLs.' });
  else if (indexed < 10) insights.push({ type: 'gap', title: `Only ${indexed} indexed pages`, detail: 'Very small content footprint. Increase content production — aim for at least 50 indexed pages covering your target keywords.' });

  if (critical > 3) insights.push({ type: 'weakness', title: `${critical} critical SEO issues`, detail: 'Fix these immediately: missing titles, meta descriptions, broken canonical tags, and mobile issues directly impact rankings.' });
  return insights;
}

function generateOnPageInsights(analysis) {
  const insights = [];
  if (!analysis) return insights;
  const score = analysis.score;
  const criticalIssues = (analysis.issues || []).filter(i => i.severity === 'critical');
  const warnings = (analysis.issues || []).filter(i => i.severity === 'warning');
  const kw = analysis.keywordAnalysis;

  if (score >= 85) insights.push({ type: 'strength', title: `Excellent on-page SEO (${score}/100)`, detail: 'This page is well-optimized. Focus on content freshness, internal linking, and building backlinks to this page.' });
  else if (score < 50) insights.push({ type: 'weakness', title: `Poor on-page SEO (${score}/100)`, detail: `Fix the ${criticalIssues.length} critical issues to see immediate improvement. Each fix typically improves the score by 5-15 points.` });

  if (analysis.content?.wordCount < 300) insights.push({ type: 'weakness', title: `Thin content (${analysis.content.wordCount} words)`, detail: 'Google prefers comprehensive content. Aim for 1,500+ words for blog posts, 800+ for product pages. Add sections addressing user questions.' });
  else if (analysis.content?.wordCount >= 2000) insights.push({ type: 'strength', title: `Comprehensive content (${analysis.content.wordCount} words)`, detail: 'Long-form content correlates with higher rankings. Ensure the content stays focused and valuable — don\'t pad for length.' });

  if (kw) {
    if (kw.inTitle && kw.inH1 && kw.inMetaDesc) insights.push({ type: 'strength', title: 'Keyword placement is optimal', detail: `"${kw.keyword}" appears in the title, H1, and meta description — exactly where search engines look first.` });
    else {
      const missing = [];
      if (!kw.inTitle) missing.push('title tag');
      if (!kw.inH1) missing.push('H1 heading');
      if (!kw.inMetaDesc) missing.push('meta description');
      insights.push({ type: 'gap', title: `Keyword missing from ${missing.join(', ')}`, detail: `Add "${kw.keyword}" to the ${missing.join(' and ')} for better relevance signals. These are the highest-impact placements.` });
    }
    if (kw.density > 3) insights.push({ type: 'weakness', title: `Keyword stuffing detected (${kw.density.toFixed(1)}%)`, detail: 'Density above 3% can trigger over-optimization penalties. Use synonyms, LSI keywords, and natural language variations instead.' });
    else if (kw.density < 0.5 && kw.density > 0) insights.push({ type: 'gap', title: `Low keyword density (${kw.density.toFixed(1)}%)`, detail: 'The keyword appears too few times. Aim for 1-2% density — mention it naturally in introductions, subheadings, and conclusions.' });
  }

  if (analysis.headings?.h1?.length === 0) insights.push({ type: 'weakness', title: 'Missing H1 tag', detail: 'Every page needs exactly one H1 heading. This is the most important heading for SEO — include your target keyword in it.' });
  if (criticalIssues.length === 0 && warnings.length <= 2) insights.push({ type: 'strength', title: 'Clean technical SEO', detail: `No critical issues and only ${warnings.length} warning(s). The page is technically sound.` });
  return insights;
}

function generateBacklinkInsights(results, domain) {
  const insights = [];
  if (!results) return insights;
  const rank = results.rank?.pageRank || 0;
  const links = results.backlinks?.estimatedLinks || 0;
  const pages = results.backlinks?.referringPages || [];
  const uniqueDomains = new Set(pages.map(r => r.domain)).size;

  if (rank >= 5) insights.push({ type: 'strength', title: `Strong domain authority (${rank.toFixed(1)})`, detail: 'High authority domains rank faster and more easily. This indicates a solid backlink foundation.' });
  else if (rank < 2) insights.push({ type: 'weakness', title: `Low domain authority (${rank.toFixed(1)})`, detail: 'Focus on earning links from high-authority sites in your niche — guest posts, PR, partnerships, and creating linkable content assets.' });

  if (uniqueDomains > 20) insights.push({ type: 'strength', title: `${uniqueDomains} unique referring domains`, detail: 'Diversity of linking domains is more valuable than total links. This signals broad trust from the web.' });
  else if (uniqueDomains < 5) insights.push({ type: 'gap', title: `Only ${uniqueDomains} unique referring domains`, detail: 'Link diversity is crucial. Even 10+ unique domains linking to you is better than 100 links from the same site. Pursue varied link sources.' });

  if (links > 100) insights.push({ type: 'strength', title: `${links}+ estimated backlinks`, detail: 'A healthy backlink count supports ranking for competitive keywords. Monitor for toxic links and disavow any spammy ones.' });
  else if (links < 10) insights.push({ type: 'weakness', title: `Very few backlinks (${links})`, detail: 'Backlinks remain the strongest ranking signal. Start with directories, citations, guest posts, and creating shareable content (research, tools, infographics).' });

  if (pages.length > 0) {
    const topDomains = [...new Set(pages.map(p => p.domain))].slice(0, 3);
    insights.push({ type: 'info', title: `Top referring domains: ${topDomains.join(', ')}`, detail: 'Analyze these sites for partnership opportunities. If they link to you, they may also accept guest posts or co-marketing proposals.' });
  }

  insights.push({ type: 'opportunity', title: 'Competitor backlink gap', detail: `Use the Keyword Gap tool to compare this domain's backlink profile against competitors. Target the sites that link to competitors but not to ${domain}.` });
  return insights;
}

function generateContentInsights(analysis) {
  const insights = [];
  if (!analysis) return insights;
  const score = analysis.score;
  const flesch = analysis.readability?.fleschScore || 0;
  const grade = analysis.readability?.fleschKincaid || 0;
  const wordCount = analysis.stats?.wordCount || 0;
  const diversity = analysis.readability?.lexicalDiversity || 0;

  if (score >= 80) insights.push({ type: 'strength', title: `High content quality (${score}/100)`, detail: 'This content scores well across readability, keyword usage, and structure. It should perform well in search results.' });
  else if (score < 50) insights.push({ type: 'weakness', title: `Low content score (${score}/100)`, detail: 'The content needs improvement in readability, keyword optimization, or length. Address the specific gaps below.' });

  if (flesch >= 60 && flesch <= 80) insights.push({ type: 'strength', title: `Good readability (Flesch ${flesch})`, detail: 'The content is accessible to a general audience, which is ideal for most web content. Google values content that users actually read and engage with.' });
  else if (flesch < 40) insights.push({ type: 'gap', title: `Difficult to read (Flesch ${flesch})`, detail: 'Content is too complex for most web readers. Shorten sentences, use simpler words, break up paragraphs, and add subheadings.' });
  else if (flesch > 80) insights.push({ type: 'info', title: `Very simple language (Flesch ${flesch})`, detail: 'Great for broad audiences but may lack depth for expert topics. Ensure it still provides substantive value.' });

  if (wordCount >= 1500 && wordCount <= 3000) insights.push({ type: 'strength', title: `Optimal length (${wordCount} words)`, detail: 'Studies show top-ranking pages average 1,500-2,500 words. This is in the sweet spot for comprehensive coverage.' });
  else if (wordCount < 500) insights.push({ type: 'weakness', title: `Too short (${wordCount} words)`, detail: 'Thin content rarely ranks well. Expand with more details, examples, case studies, FAQs, and actionable advice.' });

  if (diversity > 60) insights.push({ type: 'strength', title: `Rich vocabulary (${diversity}% diversity)`, detail: 'High lexical diversity indicates varied, engaging writing. This keeps readers engaged and signals topical expertise to search engines.' });
  else if (diversity < 30) insights.push({ type: 'gap', title: `Repetitive vocabulary (${diversity}% diversity)`, detail: 'The content reuses the same words too often. Use synonyms, related terms, and LSI keywords to enrich the text.' });

  if (analysis.keyword) {
    const kw = analysis.keyword;
    if (kw.density >= 1 && kw.density <= 2.5) insights.push({ type: 'strength', title: `Optimal keyword density (${kw.density.toFixed(1)}%)`, detail: `"${kw.keyword}" is used at the ideal frequency. This signals relevance without over-optimization.` });
    if (!kw.inFirstSentence) insights.push({ type: 'gap', title: 'Keyword not in first sentence', detail: 'Include the target keyword in the opening sentence or paragraph. This is a strong relevance signal for search engines.' });
  }
  return insights;
}

function generateKeywordGapInsights(results, domain1, domain2) {
  const insights = [];
  if (!results || results.length === 0) return insights;
  const onlyD1 = results.filter(r => r.gapType === 'only_domain1').length;
  const onlyD2 = results.filter(r => r.gapType === 'only_domain2').length;
  const shared = results.filter(r => r.gapType === 'shared').length;
  const d1Winning = results.filter(r => r.gapType === 'shared' && (r.domain1?.position || 999) < (r.domain2?.position || 999)).length;

  if (onlyD2 > 3) insights.push({ type: 'opportunity', title: `${onlyD2} keywords where only ${domain2} ranks`, detail: `These are direct content gaps — ${domain2} has visibility for these terms but ${domain1} doesn't. Create targeted content for each keyword to capture this traffic.` });
  if (onlyD1 > 3) insights.push({ type: 'strength', title: `${onlyD1} exclusive keywords for ${domain1}`, detail: `${domain1} ranks for terms that ${domain2} doesn't — this is unique positioning. Strengthen these pages with internal links and backlinks.` });
  if (shared > 0) insights.push({ type: 'info', title: `${shared} shared keywords (${d1Winning} won by ${domain1})`, detail: `Both domains compete for these terms. Focus on the ones where you're close to overtaking — positions #4-10 are the most impactful to improve.` });
  if (onlyD2 > onlyD1) insights.push({ type: 'gap', title: `${domain2} has broader keyword coverage`, detail: `The competitor covers ${onlyD2 - onlyD1} more unique keywords. Analyze their content strategy — what topics are they covering that you're not?` });
  if (results.length < 5) insights.push({ type: 'info', title: 'Limited overlap detected', detail: 'Few shared keywords suggest these domains target different niches or the keyword list is too narrow. Try adding more keywords for a deeper comparison.' });
  return insights;
}

function generateSERPInsights(results) {
  const insights = [];
  if (!results || results.length === 0) return insights;
  const r = results[0];
  const organics = r.organicResults || [];
  const hasFeatured = !!r.featuredSnippet;
  const hasPAA = (r.peopleAlsoAsk || []).length > 0;

  if (organics.length > 0) {
    const topDomains = organics.slice(0, 3).map(o => { try { return new URL(o.url).hostname; } catch { return o.url; } });
    insights.push({ type: 'info', title: `Top 3 domains: ${topDomains.join(', ')}`, detail: 'Analyze these pages to understand what Google rewards for this query: content depth, format, word count, and media usage.' });
    const avgTitleLen = Math.round(organics.slice(0, 10).reduce((s, o) => s + (o.title?.length || 0), 0) / Math.min(10, organics.length));
    insights.push({ type: 'info', title: `Average title length: ${avgTitleLen} chars`, detail: `The top-ranking pages use titles around ${avgTitleLen} characters. Match this range for your content targeting this query.` });
  }
  if (hasFeatured) insights.push({ type: 'opportunity', title: 'Featured snippet opportunity', detail: 'Google shows a featured snippet for this query. Structure your content with clear definitions, lists, or tables to win position zero.' });
  if (hasPAA) insights.push({ type: 'opportunity', title: `${r.peopleAlsoAsk.length} "People Also Ask" questions`, detail: 'Answer these questions directly in your content. Each PAA answer is a potential featured snippet and additional ranking opportunity.' });
  if ((r.relatedSearches || []).length > 0) insights.push({ type: 'opportunity', title: `${r.relatedSearches.length} related searches`, detail: 'These are additional keyword targets. Create sections or separate pages covering these related queries to capture more search traffic.' });
  return insights;
}

function generateRankInsights(results, history) {
  const insights = [];
  if (!results || results.length === 0) return insights;
  const top3 = results.filter(r => r.position && r.position <= 3).length;
  const top10 = results.filter(r => r.position && r.position <= 10).length;
  const notRanking = results.filter(r => !r.position).length;

  if (top3 > 0) insights.push({ type: 'strength', title: `${top3} keyword(s) in top 3`, detail: 'Top 3 positions capture ~60% of all clicks. Protect these rankings with fresh content updates, internal linking, and backlink building.' });
  if (top10 > 0) insights.push({ type: 'strength', title: `${top10} keyword(s) on page 1`, detail: 'First page rankings are crucial — 95% of traffic goes to page 1 results. Focus on moving close #4-10 positions higher.' });
  if (notRanking > 0) insights.push({ type: 'weakness', title: `${notRanking} keyword(s) not ranking`, detail: 'These keywords have no ranking position. Check if you have content targeting these terms — if not, create dedicated pages.' });
  const strikingDistance = results.filter(r => r.position && r.position >= 4 && r.position <= 20).length;
  if (strikingDistance > 0) insights.push({ type: 'opportunity', title: `${strikingDistance} keyword(s) in striking distance (#4-20)`, detail: 'These are your highest-ROI optimization targets. Improve on-page SEO, add internal links, and build 2-3 backlinks to move these to page 1.' });
  if (history && history.length > 1) {
    const latest = history[history.length - 1];
    const prev = history[history.length - 2];
    if (latest && prev) {
      const improved = (latest.rankings || []).filter(lr => { const pr = (prev.rankings || []).find(p => p.keyword === lr.keyword); return pr && lr.position < pr.position; }).length;
      const declined = (latest.rankings || []).filter(lr => { const pr = (prev.rankings || []).find(p => p.keyword === lr.keyword); return pr && lr.position > pr.position; }).length;
      if (improved > declined) insights.push({ type: 'strength', title: `${improved} ranking(s) improved since last check`, detail: 'Positive trend! Your SEO efforts are paying off. Continue the current strategy and double down on what\'s working.' });
      if (declined > improved) insights.push({ type: 'weakness', title: `${declined} ranking(s) dropped since last check`, detail: 'Rankings are declining. Check for algorithm updates, lost backlinks, technical issues, or competitors publishing better content.' });
    }
  }
  return insights;
}

function generateSiteAuditInsights(auditData, vitals) {
  const insights = [];
  if (!auditData) return insights;
  const health = auditData.healthScore || 0;
  const issues = auditData.issues || [];
  const critical = issues.filter(i => i.severity === 'critical' || i.severity === 'error').length;
  const warnings = issues.filter(i => i.severity === 'warning').length;
  const pages = auditData.pagesCrawled || 0;

  if (health >= 80) insights.push({ type: 'strength', title: `Healthy site (${health}% score)`, detail: 'The site has strong technical foundations. Focus on content quality and authority building.' });
  else if (health < 50) insights.push({ type: 'weakness', title: `Poor site health (${health}%)`, detail: `${critical} critical issues and ${warnings} warnings need attention. Fix critical issues first — they can block indexing and rankings.` });

  if (critical > 5) insights.push({ type: 'weakness', title: `${critical} critical issues found`, detail: 'Critical issues directly impact search visibility. Missing titles, broken pages, and crawl errors should be fixed immediately.' });
  if (auditData.avgWordsPerPage && auditData.avgWordsPerPage < 300) insights.push({ type: 'gap', title: `Thin content (avg ${Math.round(auditData.avgWordsPerPage)} words/page)`, detail: 'Most pages have thin content. Google prefers comprehensive pages. Audit low-word-count pages and either expand them or merge/remove them.' });

  if (vitals) {
    const perf = vitals.scores?.performance || 0;
    if (perf >= 90) insights.push({ type: 'strength', title: `Excellent Core Web Vitals (${perf})`, detail: 'Fast-loading pages improve user experience and get a ranking boost from Google\'s Page Experience signals.' });
    else if (perf < 50) insights.push({ type: 'weakness', title: `Poor Core Web Vitals (${perf})`, detail: 'Slow sites lose visitors and rankings. Optimize images, enable caching, minify CSS/JS, and consider lazy loading.' });
  }

  if (pages > 100) insights.push({ type: 'info', title: `${pages} pages crawled`, detail: 'Large sites should ensure consistent optimization across all pages. Use templates with proper meta tags and structured data.' });
  return insights;
}

function generateTrafficInsights(data) {
  const insights = [];
  if (!data) return insights;
  const { trafficTier, indexedPages, brandedResults, webMentions, topPages, mentionSources } = data;

  if (indexedPages > 500) insights.push({ type: 'strength', title: `${indexedPages.toLocaleString()} indexed pages`, detail: 'Large content footprint means more ranking opportunities. Monitor for index bloat — remove thin or duplicate pages.' });
  else if (indexedPages < 20) insights.push({ type: 'gap', title: `Only ${indexedPages} indexed pages`, detail: 'Too few pages to compete broadly. Create more content targeting your key topics and long-tail keywords.' });

  if (brandedResults > 5) insights.push({ type: 'strength', title: `Strong brand presence (${brandedResults} branded results)`, detail: 'Brand dominance in SERPs indicates good brand awareness. Ensure your brand SERP is clean — control the narrative with owned properties.' });
  else if (brandedResults < 2) insights.push({ type: 'gap', title: 'Weak brand SERP presence', detail: 'Few branded results means low brand awareness or poor owned-property optimization. Claim social profiles, directories, and knowledge panels.' });

  if (webMentions > 20) insights.push({ type: 'strength', title: `${webMentions} web mentions found`, detail: 'Active online presence. Check if these mentions include links — unlinked mentions are opportunities for backlink outreach.' });
  else insights.push({ type: 'opportunity', title: 'Build web mentions', detail: 'Increase brand mentions through PR, guest posting, podcast appearances, and social media engagement. Each mention is a potential backlink.' });

  if ((mentionSources || []).length > 0) insights.push({ type: 'info', title: `Mentioned on: ${mentionSources.slice(0, 5).map(s => s.domain).join(', ')}`, detail: 'Reach out to these sites for link building or partnership opportunities.' });
  return insights;
}

function generateAdIntelInsights(data) {
  const insights = [];
  if (!data || data.length === 0) return insights;
  const withAds = data.filter(d => d.hasAds).length;
  const noAds = data.filter(d => !d.hasAds).length;

  if (withAds > 0) insights.push({ type: 'info', title: `${withAds}/${data.length} keywords have paid ads`, detail: 'Advertisers spend money on these keywords — this validates they have commercial intent and are worth targeting organically too.' });
  if (noAds > 0) insights.push({ type: 'opportunity', title: `${noAds} keywords with no paid competition`, detail: 'No one is advertising on these terms. This could mean lower commercial intent, OR it\'s an untapped opportunity for cheap PPC traffic.' });

  const allAdvertisers = data.flatMap(d => (d.topAdvertisers || []).map(a => a.domain));
  const uniqueAdvertisers = [...new Set(allAdvertisers)];
  if (uniqueAdvertisers.length > 0) insights.push({ type: 'info', title: `${uniqueAdvertisers.length} unique advertisers found`, detail: `Top spenders: ${uniqueAdvertisers.slice(0, 5).join(', ')}. Analyze their landing pages for conversion optimization ideas.` });

  const heavilyContested = data.filter(d => (d.paidCount || 0) >= 4);
  if (heavilyContested.length > 0) insights.push({ type: 'gap', title: `${heavilyContested.length} highly contested keywords`, detail: 'These keywords have 4+ advertisers. Organic rankings here are extremely valuable because they bypass the ad clutter.' });
  return insights;
}

function generateContentResearchInsights(data) {
  const insights = [];
  if (!data) return insights;
  const { topPages, questions, relatedTopics, topDomains, featuredSnippets } = data;

  if ((topPages || []).length > 0) {
    const avgPos = topPages.slice(0, 5);
    insights.push({ type: 'info', title: `Top content competitors identified (${topPages.length} pages)`, detail: `Analyze these top-ranking pages for content length, format, and structure. Match or exceed their depth to compete.` });
  }
  if ((questions || []).length > 3) insights.push({ type: 'opportunity', title: `${questions.length} content questions discovered`, detail: 'Create FAQ sections or dedicated articles answering these questions. Each question is a potential featured snippet opportunity.' });
  if ((relatedTopics || []).length > 3) insights.push({ type: 'opportunity', title: `${relatedTopics.length} related topics to cover`, detail: 'Build a topic cluster: create a pillar page for the main topic, and supporting articles for each related topic, all interlinked.' });
  if ((topDomains || []).length > 0) {
    insights.push({ type: 'info', title: `Dominant publishers: ${topDomains.slice(0, 4).map(d => d.domain).join(', ')}`, detail: 'These sites dominate the SERPs for this topic. Study their content strategy, publication frequency, and backlink profiles.' });
  }
  if ((featuredSnippets || []).length > 0) insights.push({ type: 'opportunity', title: `${featuredSnippets.length} featured snippet(s) in this topic`, detail: 'Featured snippets drive massive CTR. Structure your content with clear answers, lists, and tables to capture these positions.' });
  return insights;
}

function generateOrganicResearchInsights(data) {
  const insights = [];
  if (!data) return insights;
  const { keywordsChecked, keywordsRanking, topKeywords, rankings, missingKeywords } = data;
  const rankingPct = keywordsChecked > 0 ? Math.round((keywordsRanking / keywordsChecked) * 100) : 0;

  if (rankingPct >= 70) insights.push({ type: 'strength', title: `Strong organic presence (${rankingPct}% keyword coverage)`, detail: `Ranking for ${keywordsRanking} out of ${keywordsChecked} checked keywords. This indicates solid topical authority.` });
  else if (rankingPct < 30) insights.push({ type: 'weakness', title: `Low keyword coverage (${rankingPct}%)`, detail: `Only ranking for ${keywordsRanking}/${keywordsChecked} keywords. Major content gaps exist — prioritize creating content for missing keywords.` });

  const top3 = (rankings || []).filter(r => r.position && r.position <= 3).length;
  const top10 = (rankings || []).filter(r => r.position && r.position <= 10).length;
  if (top3 > 0) insights.push({ type: 'strength', title: `${top3} keyword(s) dominating (top 3)`, detail: 'These are your crown jewels. Protect them with regular content updates, strong internal linking, and ongoing backlink building.' });
  if (top10 > top3) insights.push({ type: 'opportunity', title: `${top10 - top3} keywords close to top 3 (#4-10)`, detail: 'These are near the tipping point. Small improvements — better titles, more internal links, a few backlinks — can move them up significantly.' });

  if ((missingKeywords || []).length > 3) insights.push({ type: 'gap', title: `${missingKeywords.length} keywords with no ranking`, detail: `These represent the biggest content gaps: ${missingKeywords.slice(0, 5).join(', ')}${missingKeywords.length > 5 ? '...' : ''}. Create dedicated pages targeting each.` });
  return insights;
}

function generateBrandInsights(data) {
  const insights = [];
  if (!data) return insights;
  const { totalMentions, mentions, relatedSearches } = data;

  if (totalMentions > 20) insights.push({ type: 'strength', title: `${totalMentions} brand mentions found`, detail: 'Strong brand presence online. Check which mentions link back to your site — unlinked mentions are outreach opportunities for backlinks.' });
  else if (totalMentions < 5) insights.push({ type: 'gap', title: `Only ${totalMentions} brand mentions`, detail: 'Low brand visibility. Invest in PR, guest posting, social media, and content marketing to increase brand mentions across the web.' });

  const newsCount = (mentions || []).filter(m => m.type === 'News').length;
  const reviewCount = (mentions || []).filter(m => m.type === 'Review').length;
  if (newsCount > 3) insights.push({ type: 'strength', title: `${newsCount} news mentions`, detail: 'Media coverage builds authority and trust. Maintain press relationships and pitch newsworthy stories regularly.' });
  if (reviewCount > 0) insights.push({ type: 'info', title: `${reviewCount} review mentions`, detail: 'Reviews influence purchasing decisions. Monitor sentiment and respond to negative reviews promptly.' });

  if ((relatedSearches || []).length > 0) insights.push({ type: 'opportunity', title: `${relatedSearches.length} related brand searches`, detail: `People also search for: ${relatedSearches.slice(0, 5).join(', ')}. Create content addressing these related queries to capture more branded traffic.` });

  const unlinked = (mentions || []).filter(m => m.type !== 'Social');
  if (unlinked.length > 3) insights.push({ type: 'opportunity', title: `${unlinked.length} potential backlink opportunities`, detail: 'Reach out to sites mentioning your brand but not linking. A polite email requesting a link has a high success rate for brand mentions.' });
  return insights;
}

function generateShopifyInsights(audit) {
  const insights = [];
  if (!audit) return insights;
  const { totalIssues, fixable, critical, warnings, issues } = audit;

  if (totalIssues === 0) { insights.push({ type: 'strength', title: 'Clean store — no SEO issues!', detail: 'Your Shopify store has excellent SEO. Focus on content marketing, backlink building, and conversion rate optimization.' }); return insights; }

  if (critical > 5) insights.push({ type: 'weakness', title: `${critical} critical issues`, detail: 'Critical issues like missing titles and descriptions directly hurt rankings. Use "Fix All Critical" to resolve them instantly.' });
  if (fixable > 0) insights.push({ type: 'opportunity', title: `${fixable} auto-fixable issues`, detail: 'Click "Fix All" to instantly resolve these issues. This is the fastest way to improve your store\'s SEO.' });

  const imageIssues = (issues || []).filter(i => i.type?.includes('image'));
  if (imageIssues.length > 5) insights.push({ type: 'gap', title: `${imageIssues.length} image SEO issues`, detail: 'Missing alt text on product images hurts image search visibility and accessibility. Add descriptive alt text to all product images.' });

  const metaIssues = (issues || []).filter(i => i.type?.includes('meta'));
  if (metaIssues.length > 3) insights.push({ type: 'weakness', title: `${metaIssues.length} meta tag issues`, detail: 'Missing or thin meta descriptions reduce click-through rates from search results. Each product page needs a unique, compelling meta description.' });

  const titleIssues = (issues || []).filter(i => i.type?.includes('title'));
  if (titleIssues.length > 3) insights.push({ type: 'weakness', title: `${titleIssues.length} title tag issues`, detail: 'Title tags are the #1 on-page ranking factor. Ensure every product and page has a unique, keyword-rich title under 60 characters.' });

  insights.push({ type: 'info', title: 'Shopify SEO priority order', detail: '1) Fix critical title/meta issues → 2) Add missing image alt text → 3) Optimize product descriptions → 4) Build internal links → 5) Get backlinks to product pages.' });
  return insights;
}

function generateInstagramInsights(posts) {
  const insights = [];
  if (!posts || posts.length === 0) return insights;
  const totalLikes = posts.reduce((s, p) => s + (p.likes || p.likesCount || 0), 0);
  const totalComments = posts.reduce((s, p) => s + (p.comments || p.commentsCount || 0), 0);
  const totalViews = posts.reduce((s, p) => s + (p.videoViewCount || p.views || 0), 0);
  const avgLikes = Math.round(totalLikes / posts.length);
  const avgComments = Math.round(totalComments / posts.length);
  const followers = posts[0]?.ownerFollowers || posts[0]?.followersCount || 0;
  const engagement = followers > 0 ? ((totalLikes + totalComments) / posts.length / followers * 100).toFixed(2) : 'N/A';
  const videos = posts.filter(p => p.isVideo || p.type === 'Video' || p.type === 'Reel').length;
  const carousels = posts.filter(p => p.type === 'Sidecar' || p.type === 'Carousel').length;
  const images = posts.length - videos - carousels;
  const topPost = [...posts].sort((a, b) => ((b.likes || b.likesCount || 0) + (b.comments || b.commentsCount || 0)) - ((a.likes || a.likesCount || 0) + (a.comments || a.commentsCount || 0)))[0];

  // Core metrics
  insights.push({ type: 'info', title: `Performance Overview: ${posts.length} posts`, detail: `${followers > 0 ? `Followers: ${followers.toLocaleString()} | ` : ''}Avg likes: ${avgLikes.toLocaleString()} | Avg comments: ${avgComments.toLocaleString()} | Engagement rate: ${engagement}%${totalViews > 0 ? ` | Total views: ${totalViews.toLocaleString()}` : ''}` });

  // Engagement benchmarks (industry data for Indian FMCG/Food)
  const engFloat = parseFloat(engagement);
  if (engFloat > 0 && engFloat !== NaN) {
    if (engFloat > 3.5) insights.push({ type: 'strength', title: `Engagement rate (${engagement}%) — Above industry avg`, detail: `Indian food/FMCG avg is 1.5-3.5%. This account outperforms peers. Benchmark: Amul ~4.2%, Haldiram\'s ~2.8%, Too Yumm ~3.1%. Your engagement suggests strong audience loyalty.` });
    else if (engFloat > 1.5) insights.push({ type: 'info', title: `Engagement rate (${engagement}%) — Industry average`, detail: `Indian food/FMCG benchmark: 1.5-3.5%. Account is performing at par. To break out: increase Reels, run polls/quizzes in Stories, and post UGC.` });
    else if (engFloat < 1.0) insights.push({ type: 'weakness', title: `Low engagement rate (${engagement}%)`, detail: `Below Indian food industry avg of 1.5-3.5%. Possible causes: bought followers, content-audience mismatch, inconsistent posting. Benchmark: ITC ~1.8%, Nestlé India ~2.1%.` });
  }

  // Content format analysis
  insights.push({ type: 'info', title: `Content format breakdown`, detail: `Images: ${images} (${Math.round(images/posts.length*100)}%) | Videos/Reels: ${videos} (${Math.round(videos/posts.length*100)}%) | Carousels: ${carousels} (${Math.round(carousels/posts.length*100)}%). Instagram 2025 algo favors Reels (2.5x reach vs static), then Carousels (1.8x), then Images.` });

  if (videos < posts.length * 0.4) insights.push({ type: 'opportunity', title: `Reels are under-utilized (${Math.round(videos/posts.length*100)}%)`, detail: `Reels make up only ${videos} of ${posts.length} posts. Instagram Reels average 22% more reach than images and 33% more engagement. Indian food brands like Amul, Epigamia, and Slurrp Farm get 60-70% of their reach from Reels. Recommendation: Target 50%+ Reels content — recipe videos, behind-the-scenes, quick tips.` });

  if (carousels < posts.length * 0.15) insights.push({ type: 'opportunity', title: 'Carousel posts underused', detail: `Carousels average 1.4x more reach than static images and 3.1x more saves. Great for educational content (nutrition facts, ingredient stories, "did you know"), product comparisons, and step-by-step recipes.` });

  // Posting frequency & consistency
  const dates = posts.map(p => new Date(p.timestamp || p.date || p.takenAt)).filter(d => !isNaN(d.getTime())).sort((a, b) => b - a);
  if (dates.length >= 2) {
    const daySpan = Math.max(1, Math.round((dates[0] - dates[dates.length - 1]) / 86400000));
    const postsPerWeek = ((posts.length / daySpan) * 7).toFixed(1);
    insights.push({ type: postsPerWeek >= 3 ? 'strength' : 'weakness', title: `Posting frequency: ~${postsPerWeek} posts/week`, detail: postsPerWeek >= 5 ? `High-frequency posting. Indian food brands benchmark: 4-7 posts/week. Consistent high output builds algorithm favor and audience habit.` : postsPerWeek >= 3 ? `Decent frequency. Industry recommendation for Indian food brands: 4-7 posts/week. Sprout Social data shows 3-5 is the minimum for visibility.` : `Below recommended frequency. Indian food category leaders post 5-7x/week. Inconsistent posting tanks algorithmic reach by up to 40%. Recommendation: Create a content calendar with at least 4 posts/week.` });

    // Peak posting analysis
    const hourCounts = {};
    const dayCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    dates.forEach(d => { hourCounts[d.getHours()] = (hourCounts[d.getHours()] || 0) + 1; dayCounts[d.getDay()] = (dayCounts[d.getDay()] || 0) + 1; });
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const topHours = Object.entries(hourCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([h]) => `${h}:00`);
    const topDays = Object.entries(dayCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([d]) => dayNames[d]);
    if (topHours.length > 0) insights.push({ type: 'info', title: `Most active posting times`, detail: `Peak hours: ${topHours.join(', ')} IST | Peak days: ${topDays.join(', ')}. Indian Instagram peak engagement: 11AM-1PM and 7PM-9PM IST (Sprout Social India data). Best days: Wednesday, Thursday, Friday.` });
  }

  // Hashtag strategy deep-dive
  const allHashtags = posts.flatMap(p => p.hashtags || []);
  const hashFreq = {}; allHashtags.forEach(h => { hashFreq[h.toLowerCase()] = (hashFreq[h.toLowerCase()] || 0) + 1; });
  const topTags = Object.entries(hashFreq).sort((a, b) => b[1] - a[1]).slice(0, 10);
  if (topTags.length > 0) {
    insights.push({ type: 'info', title: `Hashtag strategy — ${Object.keys(hashFreq).length} unique tags used`, detail: `Top 10: ${topTags.map(([tag, count]) => `#${tag} (${count}x)`).join(', ')}. Optimal hashtag count per post: 8-15 (mix of broad 1M+, medium 100K-1M, and niche <100K). Over-relying on the same tags reduces reach.` });
    const avgTagsPerPost = allHashtags.length / posts.length;
    if (avgTagsPerPost < 5) insights.push({ type: 'gap', title: `Only ${avgTagsPerPost.toFixed(1)} hashtags/post avg`, detail: `Industry best practice is 8-15 hashtags per post. Use a 3-tier strategy: 5 broad (#food #healthy #india), 5 medium (#indianfood #healthysnacks), 5 niche (#cleanfoodindia #kiroeats).` });
  }

  // Top performing content analysis
  if (topPost) {
    const topEng = (topPost.likes || topPost.likesCount || 0) + (topPost.comments || topPost.commentsCount || 0);
    insights.push({ type: 'strength', title: `Best performing post: ${topEng.toLocaleString()} engagements`, detail: `${(topPost.likes || topPost.likesCount || 0).toLocaleString()} likes, ${(topPost.comments || topPost.commentsCount || 0).toLocaleString()} comments${topPost.isVideo ? `, ${(topPost.videoViewCount || 0).toLocaleString()} views` : ''}. Type: ${topPost.isVideo ? 'Video/Reel' : topPost.type || 'Image'}. Caption: "${(topPost.caption || '').substring(0, 120)}..."` });
  }

  // Likes-to-comments ratio analysis
  const lcRatio = avgComments > 0 ? (avgLikes / avgComments).toFixed(1) : 0;
  if (lcRatio > 50) insights.push({ type: 'weakness', title: `High like:comment ratio (${lcRatio}:1)`, detail: `A ratio above 30:1 means people passively like but don't engage. Fix: Use questions in captions, add polls/quizzes, respond to every comment within 1 hour, use "save this for later" CTAs.` });
  else if (lcRatio > 0 && lcRatio < 15) insights.push({ type: 'strength', title: `Healthy like:comment ratio (${lcRatio}:1)`, detail: `Ratios under 15:1 indicate genuine community engagement — people aren't just scrolling past, they're stopping to comment. This signals strong content-audience fit.` });

  // Actionable recommendations
  insights.push({ type: 'opportunity', title: 'Kiro Foods action items', detail: `Based on this analysis: 1) Create Reels showing recipe transformations using Kiro products 2) Run monthly UGC contests (#MyKiroMeal) 3) Post nutritional myth-busting carousels 4) Use local food influencers (₹5K-50K/post for micro-influencers) 5) Cross-promote Reels to YouTube Shorts for 2x visibility.` });

  return insights;
}

function generateFacebookInsights(posts) {
  const insights = [];
  if (!posts || posts.length === 0) return insights;
  const totalLikes = posts.reduce((s, p) => s + (p.likes || p.reactions || 0), 0);
  const totalShares = posts.reduce((s, p) => s + (p.shares || 0), 0);
  const totalComments = posts.reduce((s, p) => s + (p.comments || 0), 0);
  const totalEng = totalLikes + totalShares + totalComments;
  const avgEng = Math.round(totalEng / posts.length);
  const shareRatio = totalLikes > 0 ? (totalShares / totalLikes * 100).toFixed(1) : 0;

  // Core metrics
  insights.push({ type: 'info', title: `Performance: ${posts.length} posts analyzed`, detail: `Total reactions: ${totalLikes.toLocaleString()} | Shares: ${totalShares.toLocaleString()} | Comments: ${totalComments.toLocaleString()} | Avg engagement/post: ${avgEng.toLocaleString()} | Share ratio: ${shareRatio}% of reactions` });

  // Share virality analysis
  if (shareRatio > 30) insights.push({ type: 'strength', title: `Strong virality — ${shareRatio}% share ratio`, detail: `Share ratio above 20% is exceptional. Each share exposes content to ~150-300 new people. At ${totalShares} shares, estimated organic reach extension: ${(totalShares * 200).toLocaleString()} additional impressions. Indian food content benchmarks: Amul ~25%, Haldiram's ~18%, ITC ~12%.` });
  else if (shareRatio < 5) insights.push({ type: 'weakness', title: `Low share ratio (${shareRatio}%)`, detail: `People react but don't share. Share triggers for food brands: 1) Relatable food memes 2) Festival recipes 3) "Tag someone who..." posts 4) Shocking nutrition facts 5) Regional food pride content. Amul's topical posts achieve 40%+ share ratios.` });

  // Engagement quality assessment
  if (avgEng >= 100) insights.push({ type: 'strength', title: `Above-average engagement (${avgEng}/post)`, detail: `Indian FMCG brands on Facebook average 30-80 engagements/post organically. This is above benchmark. Facebook organic reach in India: ~2-5% of page followers (down from 16% in 2019).` });
  else if (avgEng < 20) insights.push({ type: 'weakness', title: `Below-benchmark engagement (${avgEng}/post)`, detail: `Indian food brands average 30-80 engagements/post. Low engagement reduces algorithmic distribution further. Facebook organic reach in India: only 2-5% of followers. Consider: 1) Boost top-performing posts (₹500-2000/day) 2) Use Facebook Groups for community 3) Go heavy on video (3x more reach than links).` });

  // Content type analysis
  const withImages = posts.filter(p => p.imageUrl || p.image || p.type === 'photo').length;
  const withVideos = posts.filter(p => p.videoUrl || p.type === 'video').length;
  const linkPosts = posts.filter(p => p.link || p.type === 'link').length;
  const textOnly = posts.length - withImages - withVideos - linkPosts;
  insights.push({ type: 'info', title: `Content mix breakdown`, detail: `Images: ${withImages} (${Math.round(withImages/posts.length*100)}%) | Videos: ${withVideos} (${Math.round(withVideos/posts.length*100)}%) | Links: ${linkPosts} (${Math.round(linkPosts/posts.length*100)}%) | Text: ${textOnly}. Facebook 2025 algorithm priority: Video > Image > Link. Video posts get 135% more organic reach than image posts.` });

  // Posting patterns
  const dates = posts.map(p => new Date(p.date || p.time || p.timestamp)).filter(d => !isNaN(d.getTime())).sort((a, b) => b - a);
  if (dates.length >= 2) {
    const daySpan = Math.max(1, Math.round((dates[0] - dates[dates.length - 1]) / 86400000));
    const postsPerWeek = ((posts.length / daySpan) * 7).toFixed(1);
    insights.push({ type: postsPerWeek >= 3 ? 'info' : 'gap', title: `Posting cadence: ~${postsPerWeek} posts/week`, detail: `Facebook recommendation for brands: 3-5 posts/week. Over-posting (>7/week) can reduce per-post reach by 30-50%. Best times for India: 1-4 PM IST (peak: Wednesday 1 PM). Weekend posts get 32% higher engagement.` });
  }

  // Top post deep-dive
  const topPost = [...posts].sort((a, b) => ((b.likes || 0) + (b.shares || 0) + (b.comments || 0)) - ((a.likes || 0) + (a.shares || 0) + (a.comments || 0)))[0];
  if (topPost) {
    const topEng = (topPost.likes || 0) + (topPost.shares || 0) + (topPost.comments || 0);
    insights.push({ type: 'strength', title: `Top post: ${topEng.toLocaleString()} total engagements`, detail: `${(topPost.likes || 0).toLocaleString()} reactions, ${(topPost.shares || 0).toLocaleString()} shares, ${(topPost.comments || 0).toLocaleString()} comments. Content: "${(topPost.text || topPost.message || '').substring(0, 150)}..."` });
  }

  // Comment sentiment indicator
  const commentRatio = totalComments > 0 && totalLikes > 0 ? (totalComments / totalLikes * 100).toFixed(1) : 0;
  if (commentRatio > 15) insights.push({ type: 'strength', title: `High conversation rate (${commentRatio}% comment-to-reaction)`, detail: `Above 10% comment ratio indicates real community discussion. This boosts Facebook's "meaningful interaction" signal, leading to 50-80% more distribution.` });

  // Competitive strategy
  insights.push({ type: 'opportunity', title: 'Facebook growth strategy for food brands', detail: `1) Facebook Groups: Create "Kiro Healthy Kitchen" community (Groups get 5x more reach than Pages) 2) Recipe videos under 3 min get max completion 3) Festive content calendar: Navratri, Diwali, Holi, Pongal recipes 4) Run ₹500-1000/day engagement campaigns during IPL for massive reach 5) Use Facebook Marketplace for D2C food delivery` });

  return insights;
}

function generateFBAdsInsights(ads) {
  const insights = [];
  if (!ads || ads.length === 0) return insights;
  const active = ads.filter(a => a.isActive || a.status === 'ACTIVE').length;
  const inactive = ads.length - active;
  const uniquePages = [...new Set(ads.map(a => a.pageName || a.page_name).filter(Boolean))].length;

  // Core metrics
  insights.push({ type: 'info', title: `Ad Library scan: ${ads.length} ads from ${uniquePages} advertisers`, detail: `Active: ${active} | Inactive/ended: ${inactive}. Active ads represent ongoing spend — these are the creatives competitors believe are profitable.` });

  // Market competitiveness
  if (active > 20) insights.push({ type: 'gap', title: `Highly competitive category (${active} active ads)`, detail: `${active}+ active ads indicates heavy paid investment in this space. Indian food/FMCG avg Facebook ad spend: ₹5-15 lakh/month for mid-size brands. Expected CPC: ₹3-8 for food keywords, CPM: ₹40-120. High competition = need strong creative differentiation.` });
  else if (active > 5) insights.push({ type: 'info', title: `Moderate competition (${active} active ads)`, detail: `Moderate ad activity. Opportunity to capture share with consistent spend. Indian food brand avg CPC: ₹3-8, CTR benchmark: 1.2-2.5%. Budget ₹1-3L/month for competitive visibility.` });
  else insights.push({ type: 'opportunity', title: `Low competition (${active} active ads)`, detail: `Few active advertisers in this space — strong first-mover opportunity. With ₹50K-1L/month you can dominate this keyword on Facebook/Instagram ads. Low CPCs expected: ₹1.5-4.` });

  // Longest-running ad analysis (proven performers)
  const withDates = ads.filter(a => a.startDate || a.ad_delivery_start_time);
  if (withDates.length > 0) {
    const sorted = [...withDates].sort((a, b) => new Date(a.startDate || a.ad_delivery_start_time) - new Date(b.startDate || b.ad_delivery_start_time));
    const longestRunning = sorted[0];
    const days = Math.round((Date.now() - new Date(longestRunning.startDate || longestRunning.ad_delivery_start_time)) / 86400000);
    insights.push({ type: 'strength', title: `Longest-running ad: ${days} days by ${longestRunning.pageName || longestRunning.page_name}`, detail: `Ads running 30+ days are almost certainly profitable (ROAS > 2x). Study this creative closely — it's their proven winner. Copy their: headline structure, CTA style, and visual format. Then differentiate with a better offer or unique angle.` });

    // Ad age distribution
    const ages = withDates.map(a => Math.round((Date.now() - new Date(a.startDate || a.ad_delivery_start_time)) / 86400000));
    const newAds = ages.filter(d => d < 7).length;
    const midAds = ages.filter(d => d >= 7 && d <= 30).length;
    const oldAds = ages.filter(d => d > 30).length;
    insights.push({ type: 'info', title: `Ad age distribution`, detail: `New (<7 days): ${newAds} | Testing (7-30 days): ${midAds} | Proven (30+ days): ${oldAds}. The ${oldAds} proven ads are your key competitive intelligence targets — their copy and visuals are battle-tested.` });
  }

  // Creative analysis
  const bodies = ads.map(a => a.adCreativeBody || a.ad_creative_body || '').filter(Boolean);
  if (bodies.length > 0) {
    const avgLen = Math.round(bodies.reduce((s, b) => s + b.length, 0) / bodies.length);
    const withEmoji = bodies.filter(b => /[\u{1F600}-\u{1F9FF}]/u.test(b)).length;
    const withCTA = bodies.filter(b => /shop now|order now|buy now|try now|click|link in bio|limited|offer|discount|free/i.test(b)).length;
    const withNumbers = bodies.filter(b => /\d+%|\₹\d+|rs\.?\s*\d+|\d+x|\d+\+/i.test(b)).length;
    insights.push({ type: 'info', title: `Creative copy analysis (${bodies.length} ads)`, detail: `Avg copy length: ${avgLen} chars | With emojis: ${Math.round(withEmoji/bodies.length*100)}% | With CTA: ${Math.round(withCTA/bodies.length*100)}% | With numbers/pricing: ${Math.round(withNumbers/bodies.length*100)}%. ${avgLen > 200 ? 'Long-form copy dominates — competitors are using benefit-stacking approach.' : 'Short punchy copy preferred — test concise offers with strong CTAs.'}` });
  }

  // Ad format breakdown
  const videoAds = ads.filter(a => a.adCreativeVideoUrl || a.ad_creative_link_caption?.includes('video')).length;
  const imageAds = ads.length - videoAds;
  insights.push({ type: 'info', title: `Ad format mix`, detail: `Image ads: ${imageAds} (${Math.round(imageAds/ads.length*100)}%) | Video ads: ${videoAds} (${Math.round(videoAds/ads.length*100)}%). Facebook video ads get 20-30% lower CPC and 2x more engagement than static images. For food brands, recipe/demo videos under 15 seconds perform best.` });

  // Strategic recommendations
  insights.push({ type: 'opportunity', title: 'Your Facebook Ads playbook', detail: `1) Model your first 3 ads after the longest-running competitor ads — proven formulas 2) Test: before/after recipe videos, UGC testimonials, ingredient close-ups, comparison ads 3) Start with ₹500-1000/day, broad targeting (25-45, food interests, metro cities) 4) Use Advantage+ campaigns for automated optimization 5) Retarget website visitors with ₹200/day budget for 10x ROAS. Expected metrics: CTR 1.5-3%, CPC ₹3-8, CPM ₹50-120.` });

  return insights;
}

function generateLinkedInInsights(profiles) {
  const insights = [];
  if (!profiles || profiles.length === 0) return insights;
  const totalFollowers = profiles.reduce((s, p) => s + (p.followerCount || p.followersCount || 0), 0);
  const totalConnections = profiles.reduce((s, p) => s + (p.connectionCount || p.connectionsCount || 0), 0);
  const avgFollowers = Math.round(totalFollowers / profiles.length);

  // Core metrics
  insights.push({ type: 'info', title: `LinkedIn scan: ${profiles.length} profiles`, detail: `Combined followers: ${totalFollowers.toLocaleString()} | Combined connections: ${totalConnections.toLocaleString()} | Avg followers: ${avgFollowers.toLocaleString()}. LinkedIn has 100M+ users in India (2nd largest market globally).` });

  // Profile ranking & top profiles
  const sortedByFollowers = [...profiles].sort((a, b) => (b.followerCount || b.followersCount || 0) - (a.followerCount || a.followersCount || 0));
  if (sortedByFollowers.length > 0) {
    const top = sortedByFollowers[0];
    insights.push({ type: 'strength', title: `Top profile: ${top.name || top.fullName}`, detail: `${(top.followerCount || top.followersCount || 0).toLocaleString()} followers. ${top.headline || top.title || ''}. ${top.location || ''}.` });
    if (sortedByFollowers.length >= 3) {
      const top3 = sortedByFollowers.slice(0, 3);
      insights.push({ type: 'info', title: 'Top 3 by reach', detail: top3.map((p, i) => `${i + 1}. ${p.name || p.fullName} — ${(p.followerCount || p.followersCount || 0).toLocaleString()} followers`).join(' | ') });
    }
  }

  // Profile completeness audit
  const withSummary = profiles.filter(p => (p.summary || p.about || '').length > 50).length;
  const withPhoto = profiles.filter(p => p.profilePicture || p.profileImageUrl).length;
  const withExperience = profiles.filter(p => (p.experience || p.positions || []).length > 0).length;
  insights.push({ type: withSummary > profiles.length * 0.7 ? 'strength' : 'gap', title: `Profile completeness: ${Math.round(withSummary/profiles.length*100)}% have detailed summaries`, detail: `With summary: ${withSummary}/${profiles.length} | With photo: ${withPhoto}/${profiles.length} | With experience: ${withExperience}/${profiles.length}. LinkedIn's algorithm gives 40% more visibility to complete profiles. All-star profiles get 21x more views.` });

  // Industry & keyword analysis
  const headlines = profiles.map(p => p.headline || p.title || '').filter(Boolean);
  if (headlines.length > 0) {
    const allWords = headlines.join(' ').toLowerCase().split(/\W+/).filter(w => w.length > 3 && !['with', 'from', 'that', 'this', 'have', 'been', 'their'].includes(w));
    const wordFreq = {}; allWords.forEach(w => { wordFreq[w] = (wordFreq[w] || 0) + 1; });
    const topWords = Object.entries(wordFreq).sort((a, b) => b[1] - a[1]).slice(0, 8);
    if (topWords.length > 0) insights.push({ type: 'info', title: 'Common headline keywords', detail: `${topWords.map(([w, c]) => `"${w}" (${c}x)`).join(', ')}. These keywords reveal how this industry positions itself. Use these insights for LinkedIn SEO — search algorithm heavily weights headline keywords.` });
  }

  // Location analysis
  const locations = profiles.map(p => p.location || p.geo || '').filter(Boolean);
  if (locations.length > 0) {
    const locFreq = {}; locations.forEach(l => { locFreq[l] = (locFreq[l] || 0) + 1; });
    const topLocs = Object.entries(locFreq).sort((a, b) => b[1] - a[1]).slice(0, 5);
    insights.push({ type: 'info', title: 'Geographic concentration', detail: `${topLocs.map(([l, c]) => `${l} (${c})`).join(', ')}. Knowing where key players are concentrated helps with: event targeting, regional campaigns, partnership outreach, and hiring strategy.` });
  }

  // Strategic recommendations
  insights.push({ type: 'opportunity', title: 'LinkedIn strategy for Kiro Foods', detail: `1) Founder should post 3-5x/week — LinkedIn organic reach is 5-10% (vs Facebook's 2%) 2) Build "Kiro Foods" company page with weekly posts about clean-label innovation 3) Target food industry decision-makers for B2B partnerships 4) Publish long-form articles on clean-label trends (gets 3x more LinkedIn visibility) 5) Employee advocacy: get 10 employees posting = equivalent of 50K followers reach. Indian LinkedIn engagement benchmarks: 2-4% for company pages, 5-10% for personal profiles.` });

  return insights;
}

function generateTwitterInsights(tweets) {
  const insights = [];
  if (!tweets || tweets.length === 0) return insights;
  const totalLikes = tweets.reduce((s, t) => s + (t.likes || t.likeCount || 0), 0);
  const totalRTs = tweets.reduce((s, t) => s + (t.retweets || t.retweetCount || 0), 0);
  const totalReplies = tweets.reduce((s, t) => s + (t.replyCount || 0), 0);
  const totalViews = tweets.reduce((s, t) => s + (t.views || t.viewCount || 0), 0);
  const totalBookmarks = tweets.reduce((s, t) => s + (t.bookmarks || t.bookmarkCount || 0), 0);
  const avgLikes = Math.round(totalLikes / tweets.length);
  const avgRTs = Math.round(totalRTs / tweets.length);

  // Core metrics
  insights.push({ type: 'info', title: `Twitter/X scan: ${tweets.length} tweets`, detail: `Likes: ${totalLikes.toLocaleString()} | Retweets: ${totalRTs.toLocaleString()} | Replies: ${totalReplies.toLocaleString()}${totalViews > 0 ? ` | Impressions: ${totalViews.toLocaleString()}` : ''}${totalBookmarks > 0 ? ` | Bookmarks: ${totalBookmarks.toLocaleString()}` : ''} | Avg likes: ${avgLikes}/tweet | Avg RTs: ${avgRTs}/tweet` });

  // Engagement-to-impressions ratio
  if (totalViews > 0) {
    const engRate = ((totalLikes + totalRTs + totalReplies) / totalViews * 100).toFixed(2);
    insights.push({ type: parseFloat(engRate) > 2 ? 'strength' : parseFloat(engRate) > 0.5 ? 'info' : 'weakness', title: `Engagement rate: ${engRate}% of impressions`, detail: `Twitter/X avg engagement rate is 0.5-2%. ${parseFloat(engRate) > 2 ? 'This account significantly outperforms the platform average.' : parseFloat(engRate) > 0.5 ? 'Performance is at industry standard.' : 'Below average — content isn\'t resonating enough to stop the scroll.'} Indian brand benchmarks: Amul ~3.5%, Zomato ~5.2%, Swiggy ~4.1%.` });
  }

  // Content type breakdown
  const originals = tweets.filter(t => !t.isRetweet && !t.isReply && !t.isQuote).length;
  const retweets = tweets.filter(t => t.isRetweet).length;
  const replies = tweets.filter(t => t.isReply).length;
  const quotes = tweets.filter(t => t.isQuote).length;
  const threads = tweets.filter(t => t.isThread || t.conversationCount > 1).length;
  insights.push({ type: 'info', title: `Content mix`, detail: `Original: ${originals} (${Math.round(originals/tweets.length*100)}%) | Retweets: ${retweets} (${Math.round(retweets/tweets.length*100)}%) | Replies: ${replies} (${Math.round(replies/tweets.length*100)}%) | Quotes: ${quotes} | Threads: ${threads}. X algorithm 2025 rewards: original tweets > replies > quotes > retweets. Threads get 200-500% more impressions than single tweets.` });

  // Virality analysis (RT-to-Like ratio)
  if (avgLikes > 0) {
    const rtRatio = (avgRTs / avgLikes * 100).toFixed(1);
    if (rtRatio > 30) insights.push({ type: 'strength', title: `High virality — ${rtRatio}% RT-to-like ratio`, detail: `Retweets over 30% of likes means content is genuinely shareable, not just passively liked. This amplification puts content in front of followers-of-followers — exponential reach.` });
    else if (rtRatio < 5) insights.push({ type: 'weakness', title: `Low virality — ${rtRatio}% RT-to-like ratio`, detail: `People like but don't share. Fix: Post controversial takes (respectfully), data-driven insights, templates/checklists, "this vs that" comparisons, or Twitter threads that provide frameworks.` });
  }

  // Posting frequency
  const dates = tweets.map(t => new Date(t.date || t.createdAt || t.timestamp)).filter(d => !isNaN(d.getTime())).sort((a, b) => b - a);
  if (dates.length >= 2) {
    const daySpan = Math.max(1, Math.round((dates[0] - dates[dates.length - 1]) / 86400000));
    const tweetsPerDay = (tweets.length / daySpan).toFixed(1);
    insights.push({ type: tweetsPerDay >= 2 ? 'strength' : 'gap', title: `Frequency: ~${tweetsPerDay} tweets/day`, detail: `${tweetsPerDay >= 3 ? 'High frequency — good for algorithm visibility. Power users tweet 3-8x/day.' : tweetsPerDay >= 1 ? 'Decent frequency. For growth, aim for 2-5 tweets/day + replies.' : 'Low frequency — X rewards consistent daily posting. The algorithm deprioritizes accounts that tweet < 1x/day.'}. Best times for Indian audience: 8-10 AM, 12-2 PM, 8-10 PM IST.` });
  }

  // Hashtag analysis
  const allHashtags = tweets.flatMap(t => t.hashtags || []);
  const hashFreq = {}; allHashtags.forEach(h => { hashFreq[h.toLowerCase()] = (hashFreq[h.toLowerCase()] || 0) + 1; });
  const topTags = Object.entries(hashFreq).sort((a, b) => b[1] - a[1]).slice(0, 8);
  if (topTags.length > 0) insights.push({ type: 'info', title: `Hashtags used: ${Object.keys(hashFreq).length} unique`, detail: `Top: ${topTags.map(([tag, count]) => `#${tag} (${count}x)`).join(', ')}. X 2025 note: hashtags have reduced impact on discovery vs 2023. Focus on SEO-rich tweet text instead. Use 1-2 hashtags max, not 5+.` });

  // Top tweet analysis
  const topTweet = [...tweets].sort((a, b) => ((b.likes || b.likeCount || 0) + (b.retweets || b.retweetCount || 0)) - ((a.likes || a.likeCount || 0) + (a.retweets || a.retweetCount || 0)))[0];
  if (topTweet) {
    const topEng = (topTweet.likes || topTweet.likeCount || 0) + (topTweet.retweets || topTweet.retweetCount || 0);
    insights.push({ type: 'strength', title: `Top tweet: ${topEng.toLocaleString()} engagements`, detail: `${(topTweet.likes || topTweet.likeCount || 0).toLocaleString()} likes, ${(topTweet.retweets || topTweet.retweetCount || 0).toLocaleString()} RTs${topTweet.views ? `, ${topTweet.views.toLocaleString()} views` : ''}. "${(topTweet.text || topTweet.fullText || '').substring(0, 150)}..."` });
  }

  // Strategic recommendations
  insights.push({ type: 'opportunity', title: 'X/Twitter growth strategy for food brands', detail: `1) Daily "food fact" tweets (high save rate) 2) React to trending food/health topics within 1 hour (newsjacking) 3) Build threads: "10 things about clean-label food" format 4) Engage with food influencers' tweets for visibility 5) Run Twitter Ads during IPL/cricket matches (₹2-5 CPC, massive reach) 6) Use Twitter Spaces for live cooking sessions. Indian food Twitter benchmarks: 1-3% engagement rate, ₹2-6 CPC for promoted tweets.` });

  return insights;
}

// =============================================
// VOICE INPUT (Speech-to-Text) — reusable component
// =============================================
function VoiceInput({ onResult, placeholder = 'Tap mic and speak...', value, onChange, style = {} }) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { setSupported(false); return; }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      if (onChange) onChange(transcript);
      if (event.results[0]?.isFinal && onResult) onResult(transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    return () => { try { recognition.abort(); } catch {} };
  }, []);

  const toggle = () => {
    if (!recognitionRef.current) return;
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      recognitionRef.current.start();
      setListening(true);
    }
  };

  if (!supported) return null;
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, ...style }}>
      <input
        type="text"
        className="input"
        placeholder={placeholder}
        value={value || ''}
        onChange={e => onChange && onChange(e.target.value)}
        style={{ flex: 1, paddingRight: 40 }}
      />
      <button
        onClick={toggle}
        className={`btn btn-sm ${listening ? 'btn-primary' : ''}`}
        style={{
          position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
          width: 32, height: 32, padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: listening ? 'var(--accent)' : 'transparent',
          border: listening ? 'none' : '1px solid var(--border)',
          animation: listening ? 'pulse 1.5s infinite' : 'none',
        }}
        title={listening ? 'Stop listening' : 'Voice input'}
      >
        {listening ? <MicOff size={14} color="#fff" /> : <Mic size={14} />}
      </button>
    </div>
  );
}

// Mic button only (no input, just the button for embedding)
function VoiceMicButton({ onResult, size = 16, style = {} }) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (onResult) onResult(transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    return () => { try { recognition.abort(); } catch {} };
  }, []);

  const toggle = () => {
    if (!recognitionRef.current) return;
    if (listening) { recognitionRef.current.stop(); setListening(false); }
    else { recognitionRef.current.start(); setListening(true); }
  };

  return (
    <button
      onClick={toggle}
      className="btn btn-sm"
      style={{
        width: 32, height: 32, padding: 0, borderRadius: '50%',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: listening ? 'var(--accent)' : 'var(--card-bg)',
        border: listening ? '2px solid var(--accent)' : '1px solid var(--border)',
        animation: listening ? 'pulse 1.5s infinite' : 'none',
        cursor: 'pointer', ...style,
      }}
      title={listening ? 'Listening...' : 'Voice input'}
    >
      {listening ? <MicOff size={size} color="#fff" /> : <Mic size={size} />}
    </button>
  );
}

// =============================================
// VOICE ASSISTANT (Voice-to-Voice AI Interaction)
// =============================================
function VoiceAssistant() {
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      let t = '';
      for (let i = 0; i < event.results.length; i++) t += event.results[i][0].transcript;
      setTranscript(t);
    };
    recognition.onend = () => { setListening(false); };
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    return () => { try { recognition.abort(); } catch {} };
  }, []);

  const startListening = () => {
    if (speaking) stopSpeaking();
    setTranscript('');
    try { recognitionRef.current?.start(); setListening(true); } catch {}
  };
  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const speak = (text) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    const voices = synthRef.current.getVoices();
    const preferred = voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) || voices.find(v => v.lang.startsWith('en'));
    if (preferred) utterance.voice = preferred;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    synthRef.current.speak(utterance);
  };
  const stopSpeaking = () => {
    synthRef.current?.cancel();
    setSpeaking(false);
  };

  const handleSend = async (text) => {
    const query = text || transcript;
    if (!query.trim()) return;
    stopListening();
    const userMsg = { role: 'user', text: query.trim(), time: new Date() };
    setHistory(prev => [...prev, userMsg]);
    setTranscript('');
    setLoading(true);
    try {
      const result = await callClaude(
        `You are Protocol, an AI marketing and SEO assistant. You give concise, helpful spoken responses. Keep responses under 3 sentences unless the user asks for detail. Be warm and professional.\n\nUser: ${query.trim()}`,
        'You are Protocol voice assistant.'
      );
      const aiMsg = { role: 'assistant', text: result, time: new Date() };
      setHistory(prev => [...prev, aiMsg]);
      setResponse(result);
      speak(result);
    } catch (e) {
      const errMsg = { role: 'assistant', text: 'Sorry, I had trouble processing that. Please try again.', time: new Date() };
      setHistory(prev => [...prev, errMsg]);
    }
    setLoading(false);
  };

  const isSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  return (
    <div className="card" style={{ marginTop: 16, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Volume2 size={18} style={{ color: 'var(--accent)' }} />
        <h3 className="card-title" style={{ margin: 0 }}>Protocol Voice Assistant</h3>
        {speaking && <span className="badge" style={{ background: '#059669', color: '#fff', fontSize: 10 }}>Speaking...</span>}
      </div>

      {!isSupported ? (
        <div className="empty-state" style={{ padding: 20 }}>
          <Mic size={24} />
          <p>Voice features require Chrome, Edge, or Safari.</p>
        </div>
      ) : (
        <>
          {/* Conversation History */}
          {history.length > 0 && (
            <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 16, padding: '12px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)' }}>
              {history.map((msg, i) => (
                <div key={i} style={{ marginBottom: 10, display: 'flex', gap: 8, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                  <div style={{
                    padding: '8px 14px', borderRadius: 16, maxWidth: '80%', fontSize: 13, lineHeight: 1.5,
                    background: msg.role === 'user' ? 'var(--accent)' : 'var(--card-bg)',
                    color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                    border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none'
                  }}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {loading && <div style={{ textAlign: 'center', padding: 8 }}><LoadingDots /></div>}
            </div>
          )}

          {/* Transcript Preview */}
          {transcript && (
            <div style={{ marginBottom: 12, padding: '8px 14px', background: 'var(--accent-light)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--accent)', fontStyle: 'italic' }}>
              {transcript}
            </div>
          )}

          {/* Controls */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center' }}>
            <button
              onClick={listening ? () => { stopListening(); handleSend(); } : startListening}
              className="btn btn-primary"
              style={{
                width: 64, height: 64, borderRadius: '50%', padding: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: listening ? '#ef4444' : 'var(--accent)',
                animation: listening ? 'pulse 1.5s infinite' : 'none',
                boxShadow: listening ? '0 0 20px rgba(239,68,68,0.4)' : '0 0 20px rgba(124,58,237,0.3)',
                transition: 'all 0.3s ease',
              }}
            >
              {listening ? <StopCircle size={28} color="#fff" /> : <Mic size={28} color="#fff" />}
            </button>
            {speaking && (
              <button onClick={stopSpeaking} className="btn btn-secondary" style={{ borderRadius: '50%', width: 44, height: 44, padding: 0 }}>
                <MicOff size={18} />
              </button>
            )}
          </div>
          <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8 }}>
            {listening ? 'Listening... tap to send' : 'Tap to start speaking'}
          </p>
        </>
      )}
    </div>
  );
}

// =============================================
// DASHBOARD
// =============================================
function Dashboard() {
  const [leads, setLeads] = useState(() => getAllLeads());
  const [history, setHistory] = useState(() => getSearchHistory());
  const [seoData] = useState(() => getSEODashboardData());

  const stats = {
    totalLeads: leads.length,
    withEmail: leads.filter(l => l.email).length,
    withPhone: leads.filter(l => l.phone).length,
    emailCoverage: leads.length > 0 ? Math.round((leads.filter(l => l.email).length / leads.length) * 100) : 0,
    conversionRate: leads.length > 0 ? Math.round((leads.filter(l => l.email && l.phone).length / leads.length) * 100) : 0,
    thisWeek: leads.filter(l => Date.now() - l.scrapedAt < 7 * 86400000).length,
  };

  // Lead sources for pie chart
  const leadSources = {};
  leads.forEach(l => { const src = l.source || l.type || 'Direct'; leadSources[src] = (leadSources[src] || 0) + 1; });
  const leadSourceData = Object.entries(leadSources).slice(0, 6).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }));

  // SEO health score
  const seoHealth = Math.min(100, (seoData.trackedDomains * 25) + (seoData.totalKeywords * 0.5));

  // Content stats
  const contentStats = {
    blogPosts: (() => { try { return JSON.parse(localStorage.getItem('protocol_blog_posts') || '[]').length; } catch { return 0; } })(),
    aiUsed: parseInt(localStorage.getItem('protocol_ai_skills_used') || '0'),
  };

  // Chart data
  const contentUsageData = [
    { week: 'W1', blog: Math.ceil(contentStats.blogPosts * 0.2), ai: Math.ceil(contentStats.aiUsed * 0.3) },
    { week: 'W2', blog: Math.ceil(contentStats.blogPosts * 0.4), ai: Math.ceil(contentStats.aiUsed * 0.5) },
    { week: 'W3', blog: Math.ceil(contentStats.blogPosts * 0.7), ai: Math.ceil(contentStats.aiUsed * 0.7) },
    { week: 'W4', blog: contentStats.blogPosts, ai: contentStats.aiUsed },
  ];

  const brandMentions = parseInt(localStorage.getItem('protocol_brand_mentions') || '0');
  const socialData = [
    { day: 'Mon', mentions: Math.ceil(brandMentions * 0.4), scrapes: Math.ceil(history.length * 0.3) },
    { day: 'Tue', mentions: Math.ceil(brandMentions * 0.5), scrapes: Math.ceil(history.length * 0.4) },
    { day: 'Wed', mentions: Math.ceil(brandMentions * 0.7), scrapes: Math.ceil(history.length * 0.6) },
    { day: 'Thu', mentions: Math.ceil(brandMentions * 0.8), scrapes: Math.ceil(history.length * 0.7) },
    { day: 'Fri', mentions: brandMentions, scrapes: history.length },
  ];

  const chartColors = ['#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="page-header-sub">Your complete marketing command center</p>
        </div>
      </div>
      <div className="page-body">
        <div className="grid-4" style={{ marginBottom: 28 }}>
          <div className="stat-card"><span className="stat-card-label">Total Leads</span><span className="stat-card-value">{stats.totalLeads}</span><span className="stat-card-change positive"><Database size={12} /> {stats.thisWeek} this week</span></div>
          <div className="stat-card"><span className="stat-card-label">Email Coverage</span><span className="stat-card-value">{stats.emailCoverage}%</span><span className="stat-card-change positive"><Mail size={12} /> {stats.withEmail} leads</span></div>
          <div className="stat-card"><span className="stat-card-label">Conversion Rate</span><span className="stat-card-value">{stats.conversionRate}%</span><span className="stat-card-change positive"><TrendingUp size={12} /> Complete data</span></div>
          <div className="stat-card"><span className="stat-card-label">SEO Health</span><span className="stat-card-value">{Math.round(seoHealth)}</span><span className="stat-card-change positive"><Globe size={12} /> {seoData.trackedDomains} domains</span></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          <div className="glass-card">
            <div style={{ padding: 16, borderBottom: '1px solid var(--border)' }}><h3 className="card-title">Lead Sources</h3></div>
            <div style={{ padding: 16, minHeight: 280 }}>
              {leadSourceData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <RechartsPieChart><Pie data={leadSourceData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                    {leadSourceData.map((_, i) => (<Cell key={`cell-${i}`} fill={chartColors[i % chartColors.length]} />))}
                  </Pie><RechartsTooltip contentStyle={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }} /><Legend wrapperStyle={{ paddingTop: 16, fontSize: 12 }} /></RechartsPieChart>
                </ResponsiveContainer>
              ) : (<div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>Search for leads to see source breakdown</div>)}
            </div>
          </div>

          <div className="glass-card">
            <div style={{ padding: 16, borderBottom: '1px solid var(--border)' }}><h3 className="card-title">SEO Performance</h3></div>
            <div style={{ padding: 16, minHeight: 280 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div style={{ background: 'var(--bg-tertiary)', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Tracked Domains</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#7c3aed' }}>{seoData.trackedDomains}</div>
                </div>
                <div style={{ background: 'var(--bg-tertiary)', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Total Keywords</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#06b6d4' }}>{seoData.totalKeywords}</div>
                </div>
              </div>
              <div style={{ padding: 12, background: 'var(--bg-tertiary)', borderRadius: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Health Score</div>
                <div className="score-bar"><div className="score-bar-fill" style={{ width: `${Math.min(100, seoHealth)}%`, background: 'linear-gradient(90deg, #7c3aed, #06b6d4)' }} /></div>
              </div>
            </div>
          </div>

          <div className="glass-card">
            <div style={{ padding: 16, borderBottom: '1px solid var(--border)' }}><h3 className="card-title">Content & AI Usage</h3></div>
            <div style={{ padding: 16, minHeight: 280 }}>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={contentUsageData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorBlog" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#7c3aed" stopOpacity={0.8} /><stop offset="95%" stopColor="#7c3aed" stopOpacity={0} /></linearGradient>
                    <linearGradient id="colorAI" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} /><stop offset="95%" stopColor="#06b6d4" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="week" stroke="#64748b" style={{ fontSize: 12 }} /><YAxis stroke="#64748b" style={{ fontSize: 12 }} />
                  <RechartsTooltip contentStyle={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8 }} />
                  <Area type="monotone" dataKey="blog" stackId="1" stroke="#7c3aed" fillOpacity={1} fill="url(#colorBlog)" name="Blog Posts" />
                  <Area type="monotone" dataKey="ai" stackId="1" stroke="#06b6d4" fillOpacity={1} fill="url(#colorAI)" name="AI Skills" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card">
            <div style={{ padding: 16, borderBottom: '1px solid var(--border)' }}><h3 className="card-title">Brand & Social</h3></div>
            <div style={{ padding: 16, minHeight: 280 }}>
              <ResponsiveContainer width="100%" height={240}>
                <RechartsLineChart data={socialData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="day" stroke="#64748b" style={{ fontSize: 12 }} /><YAxis stroke="#64748b" style={{ fontSize: 12 }} />
                  <RechartsTooltip contentStyle={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8 }} /><Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="mentions" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 4 }} name="Mentions" />
                  <Line type="monotone" dataKey="scrapes" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 4 }} name="Scrapes" />
                </RechartsLineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Recent Searches</h3>
          {history.length === 0 ? (
            <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>No searches yet. Start searching for leads!</p>
          ) : (
            history.slice(0, 5).map((h, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: i % 2 === 0 ? 'var(--bg-tertiary)' : 'transparent', borderRadius: 'var(--radius-sm)', marginBottom: 2 }}>
                <div><div style={{ fontSize: 13, fontWeight: 500 }}>{h.query}</div><div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{h.location || 'No location'} • {h.resultCount} results</div></div>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{new Date(h.date).toLocaleDateString()}</span>
              </div>
            ))
          )}
        </div>

        <VoiceAssistant />
      </div>
    </>
  );
}

// =============================================
// LEAD SEARCH (Google Maps / Places API)
// =============================================
function LeadSearch() {
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingAll, setFetchingAll] = useState(false);
  const [fetchProgress, setFetchProgress] = useState('');
  const [results, setResults] = useState([]);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [toast, setToast] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [enriching, setEnriching] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState('');
  const [incognito, setIncognito] = useState(false);

  const handleSearch = async (pageToken = null) => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await searchBusinesses({ query: query.trim(), location: location.trim(), pageToken });
      if (pageToken) {
        setResults(prev => [...prev, ...data.leads]);
      } else {
        setResults(data.leads);
        if (!incognito) saveSearch(query.trim(), location.trim(), data.totalFound);
      }
      setNextPageToken(data.nextPageToken);
      setToast({ message: `Found ${data.totalFound} businesses`, type: 'success' });
    } catch (e) {
      setToast({ message: e.message, type: 'error' });
    }
    setLoading(false);
  };

  // Fetch ALL available pages automatically
  const handleFetchAll = async () => {
    if (!query.trim()) return;
    setFetchingAll(true);
    setFetchProgress('Starting...');
    try {
      const data = await searchAllPages({
        query: query.trim(),
        location: location.trim(),
        onProgress: (page, count, detail) => setFetchProgress(detail || `Page ${page} — ${count} unique leads so far...`)
      });
      setResults(data.leads);
      setNextPageToken(null);
      if (!incognito) saveSearch(query.trim(), location.trim(), data.totalFound);
      setToast({ message: `Fetched ${data.totalFound} leads across ${data.pagesScraped} page(s)`, type: 'success' });
    } catch (e) {
      setToast({ message: e.message, type: 'error' });
    }
    setFetchingAll(false);
    setFetchProgress('');
  };

  const toggleSelect = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const selectAll = () => {
    if (selected.size === results.length) setSelected(new Set());
    else setSelected(new Set(results.map(r => r.id)));
  };

  const handleSave = () => {
    const toSave = selected.size > 0
      ? results.filter(r => selected.has(r.id))
      : results;
    const { total, added } = saveLeads(toSave);

    // Auto-create lead folder (date + name combo)
    if (added > 0 && query.trim()) {
      try {
        const folders = JSON.parse(localStorage.getItem('protocol_lead_folders') || '[]');
        const today = new Date().toISOString().split('T')[0];
        const folderName = query.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const newFolder = {
          id: `${today}-${folderName}-${Date.now()}`,
          name: folderName,
          date: today,
          query: query.trim(),
          location: location || 'No location',
          leadCount: toSave.length,
          leads: toSave,
        };
        folders.push(newFolder);
        localStorage.setItem('protocol_lead_folders', JSON.stringify(folders));
      } catch (e) { console.error('Folder save error:', e); }
    }

    setToast({ message: `${added} new leads saved (${total} total)`, type: 'success' });
  };

  const handleEnrichEmails = async () => {
    const toEnrich = selected.size > 0
      ? results.filter(r => selected.has(r.id))
      : results.filter(r => r.website && !r.email);
    if (toEnrich.length === 0) {
      setToast({ message: 'No leads with websites to enrich', type: 'error' });
      return;
    }
    setEnriching(true);
    try {
      const enriched = await batchExtractEmails(toEnrich, (current, total, name) => {
        setEnrichProgress(`Extracting ${current}/${total}: ${name}`);
      });
      // Merge enriched data back into results
      setResults(prev => prev.map(r => {
        const match = enriched.find(e => e.id === r.id);
        return match || r;
      }));
      const emailCount = enriched.filter(e => e.email).length;
      setToast({ message: `Found emails for ${emailCount}/${toEnrich.length} businesses`, type: 'success' });
    } catch (e) {
      setToast({ message: e.message, type: 'error' });
    }
    setEnriching(false);
    setEnrichProgress('');
  };

  const [verifying, setVerifying] = useState(false);
  const [verifyProgress, setVerifyProgress] = useState('');

  const handleVerify = async () => {
    const toVerify = selected.size > 0
      ? results.filter(r => selected.has(r.id))
      : results;
    if (toVerify.length === 0) return;
    setVerifying(true);
    try {
      const verified = await verifyLeads(toVerify, (current, total, name) => {
        setVerifyProgress(`Verifying ${current}/${total}: ${name}`);
      });
      setResults(prev => prev.map(r => {
        const match = verified.find(v => v.id === r.id);
        return match || r;
      }));
      const validCount = verified.filter(v => v.verification?.score >= 2).length;
      setToast({ message: `Verified ${verified.length} leads — ${validCount} high quality`, type: 'success' });
    } catch (e) {
      setToast({ message: e.message, type: 'error' });
    }
    setVerifying(false);
    setVerifyProgress('');
  };

  const handleExport = (format) => {
    const toExport = selected.size > 0 ? results.filter(r => selected.has(r.id)) : results;
    if (format === 'csv') exportToCSV(toExport, `leads-${query}`);
    else if (format === 'pdf') exportToPDF(toExport, `leads-${query}`);
    else exportToExcel(toExport, `leads-${query}`);
    setToast({ message: `Exported ${toExport.length} leads as ${format.toUpperCase()}`, type: 'success' });
  };

  return (
    <>
      <div className="page-header">
        <div><h1>Lead Search</h1><p className="page-header-sub">Find businesses from Google Maps — extract contacts automatically</p></div>
      </div>
      <div className="page-body">
        {/* Search Box */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 2, minWidth: 200 }}>
              <label className="label">Business / Industry</label>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input className="input" value={query} onChange={e => setQuery(e.target.value)}
                  placeholder="e.g., restaurants, dentists, gyms, hotels, CA firms"
                  onKeyDown={e => e.key === 'Enter' && handleSearch()} style={{ flex: 1 }} />
                <VoiceMicButton onResult={t => setQuery(t)} />
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 150 }}>
              <label className="label">Location</label>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input className="input" value={location} onChange={e => setLocation(e.target.value)}
                  placeholder="e.g., Mumbai, Pune, Delhi NCR"
                  onKeyDown={e => e.key === 'Enter' && handleSearch()} style={{ flex: 1 }} />
                <VoiceMicButton onResult={t => setLocation(t)} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
              <button className="btn btn-primary" onClick={() => handleSearch()} disabled={loading || fetchingAll || !query.trim()} style={{ height: 40 }}>
                {loading ? <LoadingDots /> : <><Search size={16} /> Search</>}
              </button>
              <button className="btn btn-secondary" onClick={handleFetchAll} disabled={loading || fetchingAll || !query.trim()} style={{ height: 40, whiteSpace: 'nowrap' }}
                title="Automatically fetches all available result pages">
                {fetchingAll ? <><LoadingDots /></> : <><Zap size={16} /> Fetch All Pages</>}
              </button>
            </div>
          </div>
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: incognito ? 'var(--warning)' : 'var(--text-tertiary)', cursor: 'pointer' }}>
              <input type="checkbox" checked={incognito} onChange={e => setIncognito(e.target.checked)} style={{ accentColor: 'var(--warning)' }} />
              <Eye size={13} /> Incognito — don't log this search in history
            </label>
          </div>
          {!isGoogleKeySet() && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--warning-bg)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={14} /> Google Places API key required. Go to Settings to add it.
            </div>
          )}
          {fetchingAll && fetchProgress && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--accent-light)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <RefreshCw size={14} className="spin" /> {fetchProgress}
            </div>
          )}
        </div>

        {/* Results */}
        {results.length > 0 && (
          <>
            {/* Action bar */}
            <div className="card" style={{ marginBottom: 12, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button className="btn btn-sm" onClick={selectAll} style={{ fontSize: 11 }}>
                  {selected.size === results.length ? 'Deselect All' : 'Select All'} ({results.length})
                </button>
                {selected.size > 0 && <span style={{ fontSize: 12, color: 'var(--accent)' }}>{selected.size} selected</span>}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-sm" onClick={handleEnrichEmails} disabled={enriching} style={{ background: 'var(--accent)', color: '#fff' }}>
                  {enriching ? <><LoadingDots /></> : <><Mail size={12} /> Extract Emails</>}
                </button>
                <button className="btn btn-sm" onClick={handleVerify} disabled={verifying} style={{ background: '#059669', color: '#fff' }}>
                  {verifying ? <><LoadingDots /></> : <><Shield size={12} /> Verify</>}
                </button>
                <button className="btn btn-sm" onClick={handleSave}><Database size={12} /> Save to DB</button>
                <button className="btn btn-sm" onClick={() => handleExport('csv')}><FileSpreadsheet size={12} /> CSV</button>
                <button className="btn btn-sm" onClick={() => handleExport('excel')}><FileSpreadsheet size={12} /> Excel</button>
                <button className="btn btn-sm" onClick={() => handleExport('pdf')} style={{ background: '#dc2626', color: '#fff' }}><FileText size={12} /> PDF</button>
              </div>
            </div>

            {enriching && enrichProgress && (
              <div style={{ marginBottom: 12, padding: '8px 16px', background: 'var(--accent-light)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--accent)' }}>
                {enrichProgress}
              </div>
            )}
            {verifying && verifyProgress && (
              <div style={{ marginBottom: 12, padding: '8px 16px', background: 'rgba(5,150,105,0.1)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: '#059669' }}>
                <Shield size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />{verifyProgress}
              </div>
            )}

            {/* Lead Table */}
            <div className="card" style={{ overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ padding: 10, width: 30 }}></th>
                    <th style={{ padding: 10, width: 36, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 11 }}>#</th>
                    <th style={{ textAlign: 'left', padding: 10 }}>Business</th>
                    <th style={{ textAlign: 'left', padding: 10 }}>Phone</th>
                    <th style={{ textAlign: 'left', padding: 10 }}>Email</th>
                    <th style={{ textAlign: 'left', padding: 10 }}>Website</th>
                    <th style={{ padding: 10 }}>Rating</th>
                    <th style={{ padding: 10 }}>Verified</th>
                    <th style={{ padding: 10 }}>Links</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((lead, i) => (
                    <tr key={lead.id || i} style={{ borderBottom: '1px solid var(--border)', background: selected.has(lead.id) ? 'var(--accent-light)' : 'transparent' }}>
                      <td style={{ padding: 10, textAlign: 'center' }}>
                        <input type="checkbox" checked={selected.has(lead.id)} onChange={() => toggleSelect(lead.id)}
                          style={{ accentColor: 'var(--accent)' }} />
                      </td>
                      <td style={{ padding: 10, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 12, fontWeight: 600 }}>{i + 1}</td>
                      <td style={{ padding: 10 }}>
                        <div style={{ fontWeight: 600 }}>{lead.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                          <MapPin size={10} style={{ display: 'inline', verticalAlign: 'middle' }} /> {lead.address?.substring(0, 50)}{lead.address?.length > 50 ? '...' : ''}
                        </div>
                        {lead.type && <span className="badge" style={{ fontSize: 9, marginTop: 4, textTransform: 'capitalize' }}>{lead.type.replace(/_/g, ' ')}</span>}
                      </td>
                      <td style={{ padding: 10 }}>
                        {lead.phone ? (
                          <div>
                            <a href={`tel:${lead.phone}`} style={{ color: 'var(--success)', textDecoration: 'none', fontSize: 12 }}>{lead.phone}</a>
                            {lead.verification?.phoneValid !== undefined && (
                              <span style={{ marginLeft: 4 }} title={lead.verification.phone.reason}>
                                {lead.verification.phoneValid ? <Check size={10} style={{ color: '#059669' }} /> : <X size={10} style={{ color: '#dc2626' }} />}
                              </span>
                            )}
                          </div>
                        ) : <span style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>—</span>}
                      </td>
                      <td style={{ padding: 10 }}>
                        {lead.email ? (
                          <div>
                            <a href={`mailto:${lead.email.split(',')[0]}`} style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: 12 }}>{lead.email.split(',')[0]}{lead.email.includes(',') ? ` +${lead.email.split(',').length - 1}` : ''}</a>
                            {lead.verification?.emailValid !== undefined && (
                              <span style={{ marginLeft: 4 }} title={lead.verification.emails?.[0]?.reason}>
                                {lead.verification.emailValid ? <Check size={10} style={{ color: '#059669' }} /> : <X size={10} style={{ color: '#dc2626' }} />}
                              </span>
                            )}
                          </div>
                        ) : <span style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>—</span>}
                      </td>
                      <td style={{ padding: 10 }}>
                        {lead.website ? (
                          <div>
                            <a href={lead.website} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--info)', textDecoration: 'none', fontSize: 11 }}>
                              {lead.website.replace(/^https?:\/\/(www\.)?/, '').substring(0, 25)}...
                            </a>
                            {lead.verification?.websiteValid !== undefined && (
                              <span style={{ marginLeft: 4 }} title={lead.verification.website.reason}>
                                {lead.verification.websiteValid ? <Check size={10} style={{ color: '#059669' }} /> : <X size={10} style={{ color: '#dc2626' }} />}
                              </span>
                            )}
                          </div>
                        ) : <span style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>—</span>}
                      </td>
                      <td style={{ padding: 10, textAlign: 'center' }}>
                        {lead.rating ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                            <Star size={12} style={{ color: '#f59e0b', fill: '#f59e0b' }} />
                            <span style={{ fontSize: 12 }}>{lead.rating}</span>
                            <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>({lead.reviewCount})</span>
                          </div>
                        ) : '—'}
                      </td>
                      <td style={{ padding: 10, textAlign: 'center' }}>
                        {lead.verification ? (
                          <div title={`Score: ${lead.verification.score}/3\nEmail: ${lead.verification.emailValid ? '✓' : '✗'}\nWebsite: ${lead.verification.websiteValid ? '✓' : '✗'}\nPhone: ${lead.verification.phoneValid ? '✓' : '✗'}`}>
                            <span style={{
                              display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700,
                              background: lead.verification.score >= 2 ? '#059669' : lead.verification.score === 1 ? '#f59e0b' : '#dc2626',
                              color: '#fff'
                            }}>
                              {lead.verification.score}/3
                            </span>
                          </div>
                        ) : <span style={{ color: 'var(--text-tertiary)', fontSize: 10 }}>—</span>}
                      </td>
                      <td style={{ padding: 10, textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                          {lead.mapsUrl && <a href={lead.mapsUrl} target="_blank" rel="noopener noreferrer" title="Google Maps"><MapPin size={14} style={{ color: 'var(--success)' }} /></a>}
                          {lead.socialLinks?.facebook && <a href={lead.socialLinks.facebook} target="_blank" rel="noopener noreferrer" title="Facebook"><Globe size={14} style={{ color: '#1877f2' }} /></a>}
                          {lead.socialLinks?.instagram && <a href={lead.socialLinks.instagram} target="_blank" rel="noopener noreferrer" title="Instagram"><Globe size={14} style={{ color: '#e4405f' }} /></a>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Load More */}
            {nextPageToken && (
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <button className="btn btn-secondary" onClick={() => handleSearch(nextPageToken)} disabled={loading}>
                  {loading ? <LoadingDots /> : <><ArrowRight size={14} /> Load More Results</>}
                </button>
              </div>
            )}
          </>
        )}

        {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      </div>
    </>
  );
}

// =============================================
// EMAIL EXTRACTOR (Domain-based)
// =============================================
function EmailExtractor() {
  const [domains, setDomains] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [toast, setToast] = useState(null);
  const [progress, setProgress] = useState('');

  const handleExtract = async () => {
    const domainList = domains.split('\n').map(d => d.trim()).filter(Boolean);
    if (domainList.length === 0) return;

    setLoading(true);
    setResults([]);
    const allResults = [];

    for (let i = 0; i < domainList.length; i++) {
      const domain = domainList[i];
      setProgress(`Scanning ${i + 1}/${domainList.length}: ${domain}`);
      try {
        const data = await extractEmailsFromDomain(domain);
        allResults.push({
          domain,
          emails: data.emails,
          socialLinks: data.socialLinks,
          errors: data.errors
        });
      } catch (e) {
        allResults.push({ domain, emails: [], socialLinks: {}, errors: [e.message] });
      }
      setResults([...allResults]);
    }

    const totalEmails = allResults.reduce((sum, r) => sum + r.emails.length, 0);
    setToast({ message: `Found ${totalEmails} emails across ${domainList.length} domains`, type: 'success' });
    setLoading(false);
    setProgress('');
  };

  const exportResults = () => {
    const rows = results.flatMap(r =>
      r.emails.length > 0
        ? r.emails.map(email => [r.domain, email, r.socialLinks?.facebook || '', r.socialLinks?.instagram || '', r.socialLinks?.linkedin || ''])
        : [[r.domain, 'No emails found', '', '', '']]
    );
    const csv = [['Domain', 'Email', 'Facebook', 'Instagram', 'LinkedIn'], ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `emails-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setToast({ message: 'Exported!', type: 'success' });
  };

  const copyAllEmails = () => {
    const allEmails = results.flatMap(r => r.emails);
    navigator.clipboard.writeText(allEmails.join('\n'));
    setToast({ message: `${allEmails.length} emails copied!`, type: 'success' });
  };

  const totalEmails = results.reduce((sum, r) => sum + r.emails.length, 0);

  return (
    <>
      <div className="page-header">
        <div><h1>Email Extractor</h1><p className="page-header-sub">Extract email addresses from any website domain</p></div>
      </div>
      <div className="page-body">
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label className="label">Domains (one per line)</label>
              <textarea className="input" value={domains} onChange={e => setDomains(e.target.value)}
                rows={6} placeholder={"example.com\nrestaurant-pune.com\nkirofoods.com\nyourbusiness.in"} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={handleExtract} disabled={loading || !domains.trim()} style={{ flex: 1 }}>
                {loading ? <LoadingDots /> : <><Mail size={16} /> Extract Emails</>}
              </button>
              {results.length > 0 && (
                <>
                  <button className="btn btn-secondary" onClick={copyAllEmails}><Copy size={14} /> Copy All ({totalEmails})</button>
                  <button className="btn btn-secondary" onClick={exportResults}><Download size={14} /> Export CSV</button>
                </>
              )}
            </div>
            {loading && progress && (
              <div style={{ padding: '8px 12px', background: 'var(--accent-light)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--accent)' }}>
                {progress}
              </div>
            )}
            <div style={{ padding: '8px 12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', fontSize: 11, color: 'var(--text-tertiary)' }}>
              Scans homepage, /contact, /about, /contact-us, /about-us for email addresses and social media links. Uses CORS proxy for cross-origin requests.
            </div>
          </div>
        </div>

        {results.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Results</h3>
              <span className="badge badge-accent">{totalEmails} emails found</span>
            </div>
            {results.map((r, i) => (
              <div key={i} style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                      <Globe size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
                      {r.domain}
                    </div>
                    {r.emails.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                        {r.emails.map((email, j) => (
                          <span key={j} className="badge" style={{ background: 'var(--accent-light)', color: 'var(--accent)', cursor: 'pointer', fontSize: 12, padding: '4px 10px' }}
                            onClick={() => { navigator.clipboard.writeText(email); setToast({ message: `Copied: ${email}`, type: 'success' }); }}>
                            <Mail size={10} style={{ marginRight: 4 }} /> {email}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>No emails found</span>
                    )}
                    {Object.keys(r.socialLinks).length > 0 && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        {Object.entries(r.socialLinks).map(([platform, url]) => (
                          <a key={platform} href={url} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: 11, color: 'var(--info)', textDecoration: 'none', textTransform: 'capitalize' }}>
                            {platform}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="badge" style={{ background: r.emails.length > 0 ? 'var(--success)' : 'var(--bg-tertiary)', color: r.emails.length > 0 ? '#fff' : 'var(--text-tertiary)' }}>
                    {r.emails.length} email{r.emails.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      </div>
    </>
  );
}

// =============================================
// MY LEADS (Database)
// =============================================
function MyLeads() {
  const [leads, setLeads] = useState(() => getAllLeads());
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterEmail, setFilterEmail] = useState('all');
  const [selected, setSelected] = useState(new Set());
  const [toast, setToast] = useState(null);

  const types = ['all', ...new Set(leads.map(l => l.type).filter(Boolean))];

  const filtered = leads.filter(l => {
    if (filterType !== 'all' && l.type !== filterType) return false;
    if (filterEmail === 'with-email' && !l.email) return false;
    if (filterEmail === 'no-email' && l.email) return false;
    if (search) {
      const s = search.toLowerCase();
      return (l.name || '').toLowerCase().includes(s) ||
             (l.email || '').toLowerCase().includes(s) ||
             (l.address || '').toLowerCase().includes(s) ||
             (l.phone || '').includes(s);
    }
    return true;
  });

  const toggleSelect = (key) => {
    const next = new Set(selected);
    next.has(key) ? next.delete(key) : next.add(key);
    setSelected(next);
  };

  const selectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(l => l.id + l.scrapedAt)));
  };

  const handleDelete = () => {
    if (selected.size === 0) return;
    const remaining = deleteLeads([...selected]);
    setLeads(remaining);
    setSelected(new Set());
    setToast({ message: `Deleted ${selected.size} leads`, type: 'info' });
  };

  const handleExport = (format) => {
    const toExport = selected.size > 0 ? filtered.filter(l => selected.has(l.id + l.scrapedAt)) : filtered;
    if (format === 'csv') exportToCSV(toExport);
    else if (format === 'pdf') exportToPDF(toExport);
    else exportToExcel(toExport);
    setToast({ message: `Exported ${toExport.length} leads`, type: 'success' });
  };

  const handleClearAll = () => {
    clearAllLeads();
    setLeads([]);
    setSelected(new Set());
    setToast({ message: 'All leads cleared', type: 'info' });
  };

  return (
    <>
      <div className="page-header">
        <div><h1>My Leads</h1><p className="page-header-sub">Browse, filter, and export your lead database</p></div>
        <span className="badge badge-accent" style={{ fontSize: 14, padding: '6px 14px' }}>{leads.length} total</span>
      </div>
      <div className="page-body">
        {/* Filters */}
        <div className="card" style={{ marginBottom: 16, padding: '12px 16px' }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <input className="input" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email, address, phone..." style={{ flex: 1, minWidth: 200 }} />
            <select className="input" value={filterType} onChange={e => setFilterType(e.target.value)} style={{ width: 'auto' }}>
              {types.map(t => <option key={t} value={t}>{t === 'all' ? 'All Types' : t.replace(/_/g, ' ')}</option>)}
            </select>
            <select className="input" value={filterEmail} onChange={e => setFilterEmail(e.target.value)} style={{ width: 'auto' }}>
              <option value="all">All Leads</option>
              <option value="with-email">With Email</option>
              <option value="no-email">No Email</option>
            </select>
          </div>
        </div>

        {/* Action Bar */}
        <div className="card" style={{ marginBottom: 12, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn btn-sm" onClick={selectAll} style={{ fontSize: 11 }}>
              {selected.size === filtered.length ? 'Deselect All' : 'Select All'} ({filtered.length})
            </button>
            {selected.size > 0 && (
              <>
                <span style={{ fontSize: 12, color: 'var(--accent)' }}>{selected.size} selected</span>
                <button className="btn btn-sm" onClick={handleDelete} style={{ color: 'var(--error)' }}><Trash2 size={12} /> Delete</button>
              </>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-sm" onClick={() => handleExport('csv')}><FileSpreadsheet size={12} /> CSV</button>
            <button className="btn btn-sm" onClick={() => handleExport('excel')}><FileSpreadsheet size={12} /> Excel</button>
            <button className="btn btn-sm" onClick={() => handleExport('pdf')} style={{ background: '#dc2626', color: '#fff' }}><FileText size={12} /> PDF</button>
            <button className="btn btn-sm" onClick={handleClearAll} style={{ color: 'var(--error)' }}><Trash2 size={12} /> Clear All</button>
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="card">
            <div className="empty-state"><Database /><h3>No leads yet</h3><p>Search for businesses or extract emails to build your lead database.</p></div>
          </div>
        ) : (
          <div className="card" style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: 10, width: 30 }}></th>
                  <th style={{ padding: 10, width: 36, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 11 }}>#</th>
                  <th style={{ textAlign: 'left', padding: 10 }}>Business</th>
                  <th style={{ textAlign: 'left', padding: 10 }}>Phone</th>
                  <th style={{ textAlign: 'left', padding: 10 }}>Email</th>
                  <th style={{ textAlign: 'left', padding: 10 }}>Website</th>
                  <th style={{ padding: 10 }}>Rating</th>
                  <th style={{ padding: 10 }}>Source</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead, i) => {
                  const key = lead.id + lead.scrapedAt;
                  return (
                    <tr key={key} style={{ borderBottom: '1px solid var(--border)', background: selected.has(key) ? 'var(--accent-light)' : 'transparent' }}>
                      <td style={{ padding: 10, textAlign: 'center' }}>
                        <input type="checkbox" checked={selected.has(key)} onChange={() => toggleSelect(key)} style={{ accentColor: 'var(--accent)' }} />
                      </td>
                      <td style={{ padding: 10, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 12, fontWeight: 600 }}>{i + 1}</td>
                      <td style={{ padding: 10 }}>
                        <div style={{ fontWeight: 600 }}>{lead.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{lead.address?.substring(0, 60)}</div>
                      </td>
                      <td style={{ padding: 10 }}>
                        {lead.phone ? <a href={`tel:${lead.phone}`} style={{ color: 'var(--success)', textDecoration: 'none', fontSize: 12 }}>{lead.phone}</a> : '—'}
                      </td>
                      <td style={{ padding: 10 }}>
                        {lead.email ? <span style={{ color: 'var(--accent)', fontSize: 12 }}>{lead.email.split(',')[0]}</span> : '—'}
                      </td>
                      <td style={{ padding: 10 }}>
                        {lead.website ? (
                          <a href={lead.website} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--info)', textDecoration: 'none', fontSize: 11 }}>
                            {lead.website.replace(/^https?:\/\/(www\.)?/, '').substring(0, 30)}
                          </a>
                        ) : '—'}
                      </td>
                      <td style={{ padding: 10, textAlign: 'center' }}>
                        {lead.rating ? <span style={{ fontSize: 12 }}><Star size={11} style={{ color: '#f59e0b', fill: '#f59e0b', verticalAlign: 'middle' }} /> {lead.rating}</span> : '—'}
                      </td>
                      <td style={{ padding: 10, textAlign: 'center' }}>
                        <span className="badge" style={{ fontSize: 10 }}>{lead.source}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      </div>
    </>
  );
}

// =============================================
// LEAD VERIFIER (Verify leads from DB or uploaded files)
// =============================================
function LeadVerifier() {
  const [source, setSource] = useState('database'); // 'database' or 'upload'
  const [uploadedLeads, setUploadedLeads] = useState([]);
  const [verifying, setVerifying] = useState(false);
  const [progress, setProgress] = useState('');
  const [results, setResults] = useState([]);
  const [toast, setToast] = useState(null);
  const fileInputRef = useRef(null);

  const dbLeads = getAllLeads();

  // Parse CSV text into leads array
  const parseCSV = (text) => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return [];
    // Parse header row
    const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());
    const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('business'));
    const phoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('tel') || h.includes('mobile'));
    const emailIdx = headers.findIndex(h => h.includes('email') || h.includes('mail'));
    const websiteIdx = headers.findIndex(h => h.includes('website') || h.includes('url') || h.includes('site'));
    const addressIdx = headers.findIndex(h => h.includes('address') || h.includes('location'));

    return lines.slice(1).map((line, i) => {
      // Handle quoted CSV fields
      const cols = [];
      let current = '';
      let inQuote = false;
      for (const ch of line) {
        if (ch === '"') { inQuote = !inQuote; continue; }
        if (ch === ',' && !inQuote) { cols.push(current.trim()); current = ''; continue; }
        current += ch;
      }
      cols.push(current.trim());

      return {
        id: `upload_${Date.now()}_${i}`,
        name: (nameIdx >= 0 ? cols[nameIdx] : cols[0]) || `Row ${i + 1}`,
        phone: phoneIdx >= 0 ? cols[phoneIdx] || '' : '',
        email: emailIdx >= 0 ? cols[emailIdx] || '' : '',
        website: websiteIdx >= 0 ? cols[websiteIdx] || '' : '',
        address: addressIdx >= 0 ? cols[addressIdx] || '' : '',
        type: '',
        rating: null,
        reviewCount: 0,
        source: 'Uploaded File',
        scrapedAt: Date.now()
      };
    }).filter(l => l.name || l.email || l.phone || l.website);
  };

  // Handle file upload (CSV, Excel/HTML-table, or text)
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    const ext = file.name.split('.').pop().toLowerCase();

    if (ext === 'csv' || ext === 'txt') {
      reader.onload = (ev) => {
        const leads = parseCSV(ev.target.result);
        setUploadedLeads(leads);
        setToast({ message: `Parsed ${leads.length} leads from ${file.name}`, type: 'success' });
      };
      reader.readAsText(file);
    } else if (ext === 'xls' || ext === 'xlsx') {
      // For Excel HTML tables (our export format), read as text and parse table
      reader.onload = (ev) => {
        const html = ev.target.result;
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const rows = doc.querySelectorAll('tr');
        if (rows.length < 2) {
          setToast({ message: 'No data rows found in file', type: 'error' });
          return;
        }
        const headers = [...rows[0].querySelectorAll('th,td')].map(c => c.textContent.trim().toLowerCase());
        const nameIdx = headers.findIndex(h => h.includes('name'));
        const phoneIdx = headers.findIndex(h => h.includes('phone'));
        const emailIdx = headers.findIndex(h => h.includes('email'));
        const websiteIdx = headers.findIndex(h => h.includes('website'));
        const addressIdx = headers.findIndex(h => h.includes('address'));

        const leads = [...rows].slice(1).map((row, i) => {
          const cols = [...row.querySelectorAll('td')].map(c => c.textContent.trim());
          return {
            id: `upload_${Date.now()}_${i}`,
            name: (nameIdx >= 0 ? cols[nameIdx] : cols[0]) || `Row ${i + 1}`,
            phone: phoneIdx >= 0 ? cols[phoneIdx] || '' : '',
            email: emailIdx >= 0 ? cols[emailIdx] || '' : '',
            website: websiteIdx >= 0 ? cols[websiteIdx] || '' : '',
            address: addressIdx >= 0 ? cols[addressIdx] || '' : '',
            type: '', rating: null, reviewCount: 0,
            source: 'Uploaded File', scrapedAt: Date.now()
          };
        }).filter(l => l.name || l.email || l.phone);

        setUploadedLeads(leads);
        setToast({ message: `Parsed ${leads.length} leads from ${file.name}`, type: 'success' });
      };
      reader.readAsText(file);
    } else if (ext === 'pdf') {
      // For PDF: extract text-like content. Browser can't natively parse PDFs deeply,
      // so we'll do a best-effort text extraction approach
      reader.onload = (ev) => {
        const text = ev.target.result;
        // Try to find email patterns and data in the PDF text
        const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
        const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g;
        const urlRegex = /https?:\/\/[^\s<>"']+|www\.[^\s<>"']+/g;

        const emails = [...new Set((text.match(emailRegex) || []))];
        const phones = [...new Set((text.match(phoneRegex) || []))];
        const urls = [...new Set((text.match(urlRegex) || []))];

        // Create leads from extracted data
        const maxLen = Math.max(emails.length, phones.length, urls.length, 1);
        const leads = [];
        for (let i = 0; i < maxLen; i++) {
          leads.push({
            id: `pdf_${Date.now()}_${i}`,
            name: `PDF Entry ${i + 1}`,
            phone: phones[i] || '',
            email: emails[i] || '',
            website: urls[i] || '',
            address: '', type: '', rating: null, reviewCount: 0,
            source: `PDF: ${file.name}`, scrapedAt: Date.now()
          });
        }
        setUploadedLeads(leads.filter(l => l.email || l.phone || l.website));
        setToast({ message: `Extracted ${emails.length} emails, ${phones.length} phones, ${urls.length} URLs from PDF`, type: 'success' });
      };
      reader.readAsText(file); // Best-effort text extraction
    } else {
      setToast({ message: 'Unsupported file type. Use CSV, XLS, XLSX, or PDF.', type: 'error' });
    }
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleVerify = async () => {
    const leadsToVerify = source === 'database' ? dbLeads : uploadedLeads;
    if (leadsToVerify.length === 0) {
      setToast({ message: source === 'database' ? 'No leads in database' : 'No uploaded leads to verify', type: 'error' });
      return;
    }
    setVerifying(true);
    setResults([]);
    try {
      const verified = await verifyLeads(leadsToVerify, (current, total, name) => {
        setProgress(`Verifying ${current}/${total}: ${name}`);
      });
      setResults(verified);
      const high = verified.filter(v => v.verification?.score >= 2).length;
      const medium = verified.filter(v => v.verification?.score === 1).length;
      const low = verified.filter(v => v.verification?.score === 0).length;
      setToast({ message: `Verified ${verified.length} leads — ${high} high, ${medium} medium, ${low} low quality`, type: 'success' });
    } catch (e) {
      setToast({ message: e.message, type: 'error' });
    }
    setVerifying(false);
    setProgress('');
  };

  const handleExportVerified = (format) => {
    if (results.length === 0) return;
    if (format === 'csv') exportToCSV(results, 'verified-leads');
    else if (format === 'pdf') exportToPDF(results, 'verified-leads');
    else exportToExcel(results, 'verified-leads');
  };

  const scoreColor = (score) => score >= 2 ? '#059669' : score === 1 ? '#f59e0b' : '#dc2626';
  const scoreLabel = (score) => score >= 2 ? 'High' : score === 1 ? 'Medium' : 'Low';

  return (
    <>
      <div className="page-header">
        <div><h1>Lead Verifier</h1><p className="page-header-sub">Verify emails, websites, and phone numbers — from your database or uploaded files</p></div>
      </div>
      <div className="page-body">
        {/* Source Selection */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <button className={`btn ${source === 'database' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSource('database')} style={{ flex: 1 }}>
              <Database size={16} /> From My Leads ({dbLeads.length})
            </button>
            <button className={`btn ${source === 'upload' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSource('upload')} style={{ flex: 1 }}>
              <FileText size={16} /> Upload File
            </button>
          </div>

          {source === 'upload' && (
            <div style={{ marginBottom: 16 }}>
              <label className="label">Upload CSV, Excel, or PDF file</label>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <input ref={fileInputRef} type="file" accept=".csv,.xls,.xlsx,.pdf,.txt"
                  onChange={handleFileUpload} className="input" style={{ flex: 1 }} />
              </div>
              {uploadedLeads.length > 0 && (
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--success)' }}>
                  <Check size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> {uploadedLeads.length} leads parsed from file
                </div>
              )}
              <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-tertiary)' }}>
                CSV/Excel: expects columns like Name, Phone, Email, Website, Address.
                PDF: extracts emails, phone numbers, and URLs automatically.
              </div>
            </div>
          )}

          <button className="btn btn-primary" onClick={handleVerify}
            disabled={verifying || (source === 'database' ? dbLeads.length === 0 : uploadedLeads.length === 0)}
            style={{ width: '100%' }}>
            {verifying ? <><LoadingDots /> Verifying...</> : <><Shield size={16} /> Verify {source === 'database' ? dbLeads.length : uploadedLeads.length} Leads</>}
          </button>

          {verifying && progress && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(5,150,105,0.1)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: '#059669' }}>
              <Shield size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />{progress}
            </div>
          )}
        </div>

        {/* Results */}
        {results.length > 0 && (
          <>
            {/* Summary Stats */}
            <div className="grid-4" style={{ marginBottom: 16 }}>
              <div className="stat-card">
                <span className="stat-card-label">Total Verified</span>
                <span className="stat-card-value">{results.length}</span>
              </div>
              <div className="stat-card">
                <span className="stat-card-label">High Quality</span>
                <span className="stat-card-value" style={{ color: '#059669' }}>{results.filter(r => r.verification?.score >= 2).length}</span>
                <span className="stat-card-change positive">Score 2-3/3</span>
              </div>
              <div className="stat-card">
                <span className="stat-card-label">Valid Emails</span>
                <span className="stat-card-value">{results.filter(r => r.verification?.emailValid).length}</span>
                <span className="stat-card-change positive">{results.length > 0 ? Math.round(results.filter(r => r.verification?.emailValid).length / results.length * 100) : 0}% verified</span>
              </div>
              <div className="stat-card">
                <span className="stat-card-label">Live Websites</span>
                <span className="stat-card-value">{results.filter(r => r.verification?.websiteValid).length}</span>
                <span className="stat-card-change positive">{results.length > 0 ? Math.round(results.filter(r => r.verification?.websiteValid).length / results.length * 100) : 0}% reachable</span>
              </div>
            </div>

            {/* Export bar */}
            <div className="card" style={{ marginBottom: 12, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{results.length} verified leads</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-sm" onClick={() => handleExportVerified('csv')}><FileSpreadsheet size={12} /> CSV</button>
                <button className="btn btn-sm" onClick={() => handleExportVerified('excel')}><FileSpreadsheet size={12} /> Excel</button>
                <button className="btn btn-sm" onClick={() => handleExportVerified('pdf')} style={{ background: '#dc2626', color: '#fff' }}><FileText size={12} /> PDF</button>
              </div>
            </div>

            {/* Verification Table */}
            <div className="card" style={{ overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ padding: 10, width: 36, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 11 }}>#</th>
                    <th style={{ textAlign: 'left', padding: 10 }}>Business</th>
                    <th style={{ textAlign: 'left', padding: 10 }}>Email</th>
                    <th style={{ textAlign: 'center', padding: 10 }}>Email Check</th>
                    <th style={{ textAlign: 'left', padding: 10 }}>Website</th>
                    <th style={{ textAlign: 'center', padding: 10 }}>Site Check</th>
                    <th style={{ textAlign: 'left', padding: 10 }}>Phone</th>
                    <th style={{ textAlign: 'center', padding: 10 }}>Phone Check</th>
                    <th style={{ textAlign: 'center', padding: 10 }}>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((lead, i) => (
                    <tr key={lead.id || i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: 10, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 12, fontWeight: 600 }}>{i + 1}</td>
                      <td style={{ padding: 10 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{lead.name}</div>
                        {lead.address && <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>{lead.address.substring(0, 40)}</div>}
                      </td>
                      <td style={{ padding: 10, fontSize: 12, color: 'var(--accent)' }}>{lead.email?.split(',')[0] || '—'}</td>
                      <td style={{ padding: 10, textAlign: 'center' }}>
                        {lead.verification?.emails?.length > 0 ? (
                          <span title={lead.verification.emails[0].reason} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600,
                            background: lead.verification.emailValid ? 'rgba(5,150,105,0.15)' : 'rgba(220,38,38,0.15)',
                            color: lead.verification.emailValid ? '#059669' : '#dc2626'
                          }}>
                            {lead.verification.emailValid ? <><Check size={10} /> Valid</> : <><X size={10} /> Invalid</>}
                          </span>
                        ) : <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>N/A</span>}
                      </td>
                      <td style={{ padding: 10, fontSize: 11, color: 'var(--info)' }}>
                        {lead.website ? lead.website.replace(/^https?:\/\/(www\.)?/, '').substring(0, 25) : '—'}
                      </td>
                      <td style={{ padding: 10, textAlign: 'center' }}>
                        <span title={lead.verification?.website?.reason} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600,
                          background: lead.verification?.websiteValid ? 'rgba(5,150,105,0.15)' : 'rgba(220,38,38,0.15)',
                          color: lead.verification?.websiteValid ? '#059669' : '#dc2626'
                        }}>
                          {lead.verification?.websiteValid ? <><Check size={10} /> Live</> : <><X size={10} /> Down</>}
                        </span>
                      </td>
                      <td style={{ padding: 10, fontSize: 12, color: 'var(--success)' }}>{lead.phone || '—'}</td>
                      <td style={{ padding: 10, textAlign: 'center' }}>
                        <span title={lead.verification?.phone?.reason} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600,
                          background: lead.verification?.phoneValid ? 'rgba(5,150,105,0.15)' : 'rgba(220,38,38,0.15)',
                          color: lead.verification?.phoneValid ? '#059669' : '#dc2626'
                        }}>
                          {lead.verification?.phoneValid ? <><Check size={10} /> Valid</> : <><X size={10} /> Invalid</>}
                        </span>
                      </td>
                      <td style={{ padding: 10, textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block', padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                          background: scoreColor(lead.verification?.score || 0), color: '#fff'
                        }}>
                          {scoreLabel(lead.verification?.score || 0)} ({lead.verification?.score || 0}/3)
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      </div>
    </>
  );
}

// =============================================
// SEO DASHBOARD
// =============================================
function SEODashboard() {
  const data = getSEODashboardData();
  const rankHistory = JSON.parse(localStorage.getItem('kj_rank_history') || '{}');
  const domainHistory = JSON.parse(localStorage.getItem('kj_domain_history') || '{}');

  const latestRankSnapshot = Object.values(rankHistory).flatMap(d => d).pop();
  const recentSnapshots = Object.values(domainHistory).flatMap(d => d).sort((a, b) => b.date - a.date).slice(0, 5);

  return (
    <>
      <div className="page-header">
        <div><h1>SEO Dashboard</h1><p className="page-header-sub">Aggregate SEO metrics across all tracked domains</p></div>
      </div>
      <div className="page-body">
        <div className="grid-4" style={{ marginBottom: 28 }}>
          <div className="stat-card">
            <span className="stat-card-label">Tracked Domains</span>
            <span className="stat-card-value">{data.trackedDomains}</span>
          </div>
          <div className="stat-card">
            <span className="stat-card-label">Tracked Keywords</span>
            <span className="stat-card-value">{data.totalKeywords}</span>
          </div>
          <div className="stat-card">
            <span className="stat-card-label">Analyzed Domains</span>
            <span className="stat-card-value">{data.analyzedDomains}</span>
          </div>
          <div className="stat-card">
            <span className="stat-card-label">Latest Snapshot</span>
            <span className="stat-card-value">{latestRankSnapshot ? new Date(latestRankSnapshot.date).toLocaleDateString() : '—'}</span>
          </div>
        </div>

        {Object.keys(data.latestRanks).length > 0 && (
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header"><h3 className="card-title">Recent Rank Snapshots</h3></div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: 10 }}>Domain</th>
                  <th style={{ padding: 10 }}>Date</th>
                  <th style={{ padding: 10 }}>Keywords</th>
                  <th style={{ textAlign: 'left', padding: 10 }}>Latest Rankings</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data.latestRanks).slice(0, 10).map(([domain, snapshot], i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: 10, fontWeight: 500 }}>{domain}</td>
                    <td style={{ padding: 10, textAlign: 'center', fontSize: 12 }}>{new Date(snapshot.date).toLocaleDateString()}</td>
                    <td style={{ padding: 10, textAlign: 'center' }}>{snapshot.rankings.length}</td>
                    <td style={{ padding: 10 }}>
                      {snapshot.rankings.slice(0, 3).map((r, j) => (
                        <span key={j} style={{ marginRight: 10, fontSize: 12, color: r.position <= 10 ? 'var(--success)' : 'var(--text-secondary)' }}>
                          {r.keyword} #{r.position || '—'}
                        </span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="card">
          <div className="card-header"><h3 className="card-title">Quick Links to SEO Tools</h3></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, padding: '16px' }}>
            <NavLink to="/keyword-research" style={{ textDecoration: 'none' }}>
              <div className="card" style={{ padding: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, hover: 'opacity(0.8)' }}>
                <Search size={20} style={{ color: 'var(--accent)' }} />
                <span style={{ fontWeight: 500 }}>Keyword Research</span>
              </div>
            </NavLink>
            <NavLink to="/domain-overview" style={{ textDecoration: 'none' }}>
              <div className="card" style={{ padding: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Globe size={20} style={{ color: 'var(--accent)' }} />
                <span style={{ fontWeight: 500 }}>Domain Overview</span>
              </div>
            </NavLink>
            <NavLink to="/on-page-seo" style={{ textDecoration: 'none' }}>
              <div className="card" style={{ padding: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                <FileText size={20} style={{ color: 'var(--accent)' }} />
                <span style={{ fontWeight: 500 }}>On-Page SEO</span>
              </div>
            </NavLink>
            <NavLink to="/backlinks" style={{ textDecoration: 'none' }}>
              <div className="card" style={{ padding: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Link size={20} style={{ color: 'var(--accent)' }} />
                <span style={{ fontWeight: 500 }}>Backlinks</span>
              </div>
            </NavLink>
            <NavLink to="/content-analyzer" style={{ textDecoration: 'none' }}>
              <div className="card" style={{ padding: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                <BookOpen size={20} style={{ color: 'var(--accent)' }} />
                <span style={{ fontWeight: 500 }}>Content Analyzer</span>
              </div>
            </NavLink>
            <NavLink to="/keyword-gap" style={{ textDecoration: 'none' }}>
              <div className="card" style={{ padding: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Target size={20} style={{ color: 'var(--accent)' }} />
                <span style={{ fontWeight: 500 }}>Keyword Gap</span>
              </div>
            </NavLink>
          </div>
        </div>
      </div>
    </>
  );
}

// =============================================
// KEYWORD RESEARCH
// =============================================
function KeywordResearch() {
  const [keyword, setKeyword] = useState('');
  const [country, setCountry] = useState('in');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [selectedForContent, setSelectedForContent] = useState(new Set());
  const [clusters, setClusters] = useState(null);
  const [toast, setToast] = useState(null);
  const [showClusters, setShowClusters] = useState(false);

  const handleGetSuggestions = async () => {
    if (!keyword.trim()) return;
    setLoading(true);
    try {
      const suggestions = await getKeywordSuggestions(keyword.trim(), 'en', country);
      if (suggestions.length === 0) {
        setToast({ message: 'No suggestions found. Try a different keyword.', type: 'error' });
        setLoading(false);
        return;
      }
      const withData = suggestions.map((s) => {
        const vol = estimateSearchVolume(s.relevance * 100000);
        return { ...s, volume: vol.volume, difficulty: s.relevance > 700 ? 'Hard' : s.relevance > 400 ? 'Medium' : 'Easy' };
      });
      setResults(withData);
      setShowClusters(false);
      setToast({ message: `Found ${withData.length} suggestions`, type: 'success' });
    } catch (e) { setToast({ message: `Keyword lookup failed: ${e.message}`, type: 'error' }); }
    setLoading(false);
  };

  const handleExpandKeyword = async () => {
    if (!keyword.trim()) return;
    setLoading(true);
    try {
      const expanded = await expandKeyword(keyword.trim());
      const withData = expanded.map(s => ({ ...s, volume: 'Variable', difficulty: 'Medium' }));
      setResults(withData);
      setShowClusters(false);
      setToast({ message: `Expanded to ${withData.length} variations`, type: 'success' });
    } catch (e) { setToast({ message: e.message, type: 'error' }); }
    setLoading(false);
  };

  const handleGetQuestions = async () => {
    if (!keyword.trim()) return;
    setLoading(true);
    try {
      const questions = await getQuestionKeywords(keyword.trim());
      const withData = questions.map(q => ({ ...q, volume: 'Question', difficulty: 'Easy' }));
      setResults(withData);
      setShowClusters(false);
      setToast({ message: `Found ${withData.length} question keywords`, type: 'success' });
    } catch (e) { setToast({ message: e.message, type: 'error' }); }
    setLoading(false);
  };

  const handleCluster = () => {
    const clustered = clusterKeywords(results);
    setClusters(clustered);
    setShowClusters(true);
  };

  const exportKeywords = () => {
    const rows = results.map(r => [r.keyword, r.volume, r.difficulty, r.type || 'QUERY']);
    const csv = [['Keyword', 'Est. Volume', 'Difficulty', 'Type'], ...rows]
      .map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `keywords-${keyword}-${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const copyAllKeywords = () => {
    const text = results.map(r => r.keyword).join('\n');
    navigator.clipboard.writeText(text);
    setToast({ message: 'Keywords copied to clipboard', type: 'success' });
  };

  const toggleKeywordSelect = (kw) => {
    setSelectedForContent(prev => {
      const next = new Set(prev);
      if (next.has(kw)) next.delete(kw); else next.add(kw);
      return next;
    });
  };

  const selectAllKeywords = () => {
    if (selectedForContent.size === results.length) setSelectedForContent(new Set());
    else setSelectedForContent(new Set(results.map(r => r.keyword)));
  };

  const handleCreateContent = () => {
    const kws = selectedForContent.size > 0
      ? results.filter(r => selectedForContent.has(r.keyword))
      : results.slice(0, 10);
    const payload = {
      source: 'keyword-research',
      seedKeyword: keyword,
      keywords: kws.map(r => ({ keyword: r.keyword, volume: r.volume, difficulty: r.difficulty, type: r.type || 'QUERY' })),
      timestamp: Date.now()
    };
    localStorage.setItem('protocol_seo_to_content', JSON.stringify(payload));
    window.location.hash = '#/blog';
  };

  const getDifficultyColor = (label) => {
    if (label === 'Easy') return '#059669';
    if (label === 'Medium') return '#f59e0b';
    if (label === 'Hard') return '#ef4444';
    return '#7c3aed';
  };

  return (
    <>
      <div className="page-header">
        <div><h1>Keyword Research</h1><p className="page-header-sub">Find high-volume, low-competition keywords</p></div>
      </div>
      <div className="page-body">
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: 250 }}>
              <label className="label">Seed Keyword</label>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input className="input" value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="healthy snacks india" style={{ flex: 1 }} />
                <VoiceMicButton onResult={t => setKeyword(t)} />
              </div>
            </div>
            <div style={{ width: 140 }}>
              <label className="label">Country</label>
              <select className="input" value={country} onChange={e => setCountry(e.target.value)}>
                <option value="in">India</option>
                <option value="us">United States</option>
                <option value="uk">United Kingdom</option>
                <option value="au">Australia</option>
                <option value="ca">Canada</option>
              </select>
            </div>
            <button className="btn btn-primary" onClick={handleGetSuggestions} disabled={loading || !keyword.trim()}>
              {loading ? <><LoadingDots /> Getting...</> : <><Search size={16} /> Suggestions</>}
            </button>
            <button className="btn btn-secondary" onClick={handleExpandKeyword} disabled={loading || !keyword.trim()}>
              {loading ? <>Expanding...</> : <>Expand</>}
            </button>
            <button className="btn btn-secondary" onClick={handleGetQuestions} disabled={loading || !keyword.trim()}>
              {loading ? <>Loading...</> : <>Questions</>}
            </button>
          </div>
        </div>

        {results.length > 0 && (
          <>
            <div className="card" style={{ marginBottom: 12, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {selectedForContent.size > 0 && (
                  <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>{selectedForContent.size} selected</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-sm" onClick={copyAllKeywords}><Copy size={12} /> Copy All</button>
                {!showClusters && <button className="btn btn-sm" onClick={handleCluster}><Layers size={12} /> Cluster</button>}
                <button className="btn btn-sm" onClick={exportKeywords}><Download size={12} /> Export CSV</button>
                <button className="btn btn-sm" onClick={handleCreateContent} style={{ background: 'var(--accent)', color: '#fff', fontWeight: 600 }}>
                  <Feather size={12} /> Create Content {selectedForContent.size > 0 ? `(${selectedForContent.size})` : ''}
                </button>
              </div>
            </div>

            {showClusters && clusters ? (
              <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-header"><h3 className="card-title">Keyword Clusters ({clusters.length})</h3></div>
                {clusters.map((cluster, i) => (
                  <div key={i} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 600, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Layers size={14} style={{ color: 'var(--accent)' }} />
                      {cluster.name} <span className="badge" style={{ background: 'var(--accent)', color: '#fff', fontSize: 10 }}>{cluster.count}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {cluster.keywords.slice(0, 5).map((kw, j) => (
                        <span key={j} style={{ background: 'var(--bg-tertiary)', padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}>
                          {kw.keyword}
                        </span>
                      ))}
                      {cluster.keywords.length > 5 && <span style={{ padding: '4px 8px' }}>+{cluster.keywords.length - 5} more</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card" style={{ overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)' }}>
                      <th style={{ textAlign: 'center', padding: 10, width: 36 }}>
                        <input type="checkbox" checked={selectedForContent.size === results.length && results.length > 0} onChange={selectAllKeywords} style={{ accentColor: 'var(--accent)', cursor: 'pointer' }} />
                      </th>
                      <th style={{ textAlign: 'center', padding: 10, width: 40 }}>#</th>
                      <th style={{ textAlign: 'left', padding: 10 }}>Keyword</th>
                      <th style={{ textAlign: 'center', padding: 10 }}>Est. Volume</th>
                      <th style={{ textAlign: 'center', padding: 10 }}>Difficulty</th>
                      <th style={{ textAlign: 'center', padding: 10 }}>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: selectedForContent.has(r.keyword) ? 'rgba(124,58,237,0.08)' : 'transparent', cursor: 'pointer' }} onClick={() => toggleKeywordSelect(r.keyword)}>
                        <td style={{ padding: 10, textAlign: 'center' }}>
                          <input type="checkbox" checked={selectedForContent.has(r.keyword)} onChange={() => toggleKeywordSelect(r.keyword)} onClick={e => e.stopPropagation()} style={{ accentColor: 'var(--accent)', cursor: 'pointer' }} />
                        </td>
                        <td style={{ padding: 10, textAlign: 'center', fontSize: 12, color: 'var(--text-tertiary)' }}>{i + 1}</td>
                        <td style={{ padding: 10, fontWeight: 500 }}>{r.keyword}</td>
                        <td style={{ padding: 10, textAlign: 'center', fontSize: 12 }}>{r.volume}</td>
                        <td style={{ padding: 10, textAlign: 'center' }}>
                          <span className="badge" style={{ background: getDifficultyColor(r.difficulty), color: '#fff', fontSize: 10 }}>
                            {r.difficulty}
                          </span>
                        </td>
                        <td style={{ padding: 10, textAlign: 'center', fontSize: 12, color: 'var(--text-tertiary)' }}>{r.type || 'QUERY'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {results.length > 0 && <AnalysisSummary title="Keyword Research Analysis" insights={generateKeywordInsights(results, keyword)} summary={`Found ${results.length} keywords for "${keyword}". ${results.filter(r => r.difficulty === 'Easy').length} are low-competition, ${results.filter(r => r.keyword.split(' ').length >= 4).length} are long-tail.`} />}
        {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      </div>
    </>
  );
}

// =============================================
// DOMAIN OVERVIEW
// =============================================
function DomainOverview() {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState(null);
  const [toast, setToast] = useState(null);
  const [progress, setProgress] = useState('');

  const handleAnalyze = async () => {
    if (!domain.trim()) return;
    setLoading(true);
    setProgress('Analyzing domain...');
    try {
      const data = await getDomainOverview(domain.trim(), localStorage.getItem('kj_apify_token'));
      setOverview(data);
      setProgress('');
      setToast({ message: 'Domain analysis complete', type: 'success' });
    } catch (e) {
      setProgress('');
      setToast({ message: e.message, type: 'error' });
    }
    setLoading(false);
  };

  const getScoreColor = (score) => score >= 80 ? 'var(--success)' : score >= 50 ? 'var(--warning)' : 'var(--error)';
  const getSevColor = (sev) => sev === 'critical' ? '#dc2626' : sev === 'warning' ? '#f59e0b' : '#3b82f6';

  return (
    <>
      <div className="page-header">
        <div><h1>Domain Overview</h1><p className="page-header-sub">Comprehensive SEO analysis of any domain</p></div>
      </div>
      <div className="page-body">
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 250 }}>
              <label className="label">Domain URL</label>
              <input className="input" value={domain} onChange={e => setDomain(e.target.value)} placeholder="example.com or https://example.com" />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn btn-primary" onClick={handleAnalyze} disabled={loading || !domain.trim()} style={{ height: 40 }}>
                {loading ? <><LoadingDots /> {progress || 'Analyzing...'}</> : <><Globe size={16} /> Analyze</>}
              </button>
            </div>
          </div>
        </div>

        {overview && (
          <>
            <div className="grid-4" style={{ marginBottom: 20 }}>
              <div className="stat-card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: getScoreColor(overview.onPage?.score || 50) }}>
                  {overview.onPage?.score || '—'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>SEO Score</div>
              </div>
              <div className="stat-card">
                <span className="stat-card-label">Page Rank</span>
                <span className="stat-card-value">{(overview.rank?.pageRank || 0).toFixed(2)}</span>
                <span className="stat-card-change positive">from OpenPageRank</span>
              </div>
              <div className="stat-card">
                <span className="stat-card-label">Performance</span>
                <span className="stat-card-value">{overview.vitals?.scores?.performance || '—'}</span>
                <span className="stat-card-change positive">Lighthouse</span>
              </div>
              <div className="stat-card">
                <span className="stat-card-label">Indexed Pages</span>
                <span className="stat-card-value">{overview.indexedPages || '—'}</span>
                <span className="stat-card-change positive">Site: query</span>
              </div>
            </div>

            {overview.vitals && (
              <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-header"><h3 className="card-title">Core Web Vitals</h3></div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, padding: '16px' }}>
                  {[['FCP', overview.vitals.metrics?.FCP], ['LCP', overview.vitals.metrics?.LCP], ['TBT', overview.vitals.metrics?.TBT], ['CLS', overview.vitals.metrics?.CLS]].map(([label, value], i) => (
                    <div key={i} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent)', marginBottom: 4 }}>{value || '—'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {overview.onPage?.issues && overview.onPage.issues.length > 0 && (
              <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-header"><h3 className="card-title">On-Page Issues</h3></div>
                {overview.onPage.issues.slice(0, 10).map((issue, i) => (
                  <div key={i} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <span className="badge" style={{ background: getSevColor(issue.severity), color: '#fff', fontSize: 10, flexShrink: 0 }}>
                      {issue.severity}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{issue.issue}</div>
                      {issue.fix && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{issue.fix}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {overview.topIndexedPages && overview.topIndexedPages.length > 0 && (
              <div className="card">
                <div className="card-header"><h3 className="card-title">Top Indexed Pages</h3></div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)' }}>
                      <th style={{ textAlign: 'left', padding: 10 }}>Page</th>
                      <th style={{ textAlign: 'left', padding: 10 }}>Title</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.topIndexedPages.slice(0, 10).map((page, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: 10 }}><a href={page.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--info)', textDecoration: 'none', fontSize: 11 }}>{page.url.substring(0, 60)}</a></td>
                        <td style={{ padding: 10, fontSize: 11 }}>{page.title?.substring(0, 50) || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {overview && <AnalysisSummary title="Domain Analysis" insights={generateDomainInsights(overview)} summary={`Domain scored ${overview.onPage?.score || '—'}/100 with PageRank ${(overview.rank?.pageRank || 0).toFixed(1)} and ${overview.indexedPages || 0} indexed pages. ${(overview.onPage?.issues || []).filter(i => i.severity === 'critical').length} critical issues found.`} />}
        {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      </div>
    </>
  );
}

// =============================================
// ON-PAGE SEO ANALYZER
// =============================================
function OnPageSEO() {
  const [url, setUrl] = useState('');
  const [targetKeyword, setTargetKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [toast, setToast] = useState(null);

  const handleAnalyze = async () => {
    if (!url.trim()) return;
    setLoading(true);
    try {
      const data = await analyzeOnPageSEO(url.trim(), targetKeyword.trim());
      setAnalysis(data);
      setToast({ message: `Analysis complete - Score: ${data.score}`, type: 'success' });
    } catch (e) { setToast({ message: e.message, type: 'error' }); }
    setLoading(false);
  };

  const getSevColor = (sev) => sev === 'critical' ? '#dc2626' : sev === 'warning' ? '#f59e0b' : sev === 'info' ? '#3b82f6' : '#059669';

  const issuesByCategory = analysis ? Object.groupBy(analysis.issues, i => i.category) : {};

  return (
    <>
      <div className="page-header">
        <div><h1>On-Page SEO</h1><p className="page-header-sub">Analyze page content, meta tags, and SEO elements</p></div>
      </div>
      <div className="page-body">
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 250 }}>
              <label className="label">Page URL</label>
              <input className="input" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com/page" />
            </div>
            <div style={{ flex: 1, minWidth: 250 }}>
              <label className="label">Target Keyword (Optional)</label>
              <input className="input" value={targetKeyword} onChange={e => setTargetKeyword(e.target.value)} placeholder="target keyword" />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn btn-primary" onClick={handleAnalyze} disabled={loading || !url.trim()} style={{ height: 40 }}>
                {loading ? <><LoadingDots /> Analyzing...</> : <><FileText size={16} /> Analyze</>}
              </button>
            </div>
          </div>
        </div>

        {analysis && (
          <>
            <div className="grid-4" style={{ marginBottom: 20 }}>
              <div className="stat-card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 700, color: analysis.score >= 80 ? 'var(--success)' : analysis.score >= 50 ? 'var(--warning)' : 'var(--error)' }}>
                  {analysis.score}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>Overall Score</div>
              </div>
              <div className="stat-card">
                <span className="stat-card-label">Title Length</span>
                <span className="stat-card-value">{analysis.title.length}</span>
                <span className="stat-card-change">{analysis.title.length < 30 ? 'Too short' : analysis.title.length > 60 ? 'Too long' : 'Good'}</span>
              </div>
              <div className="stat-card">
                <span className="stat-card-label">Word Count</span>
                <span className="stat-card-value">{analysis.content.wordCount}</span>
                <span className="stat-card-change positive">words</span>
              </div>
              <div className="stat-card">
                <span className="stat-card-label">H1 Tags</span>
                <span className="stat-card-value">{analysis.headings.h1.length}</span>
                <span className="stat-card-change">{analysis.headings.h1.length === 1 ? 'Perfect' : analysis.headings.h1.length === 0 ? 'Missing' : 'Multiple'}</span>
              </div>
            </div>

            {analysis.keywordAnalysis && (
              <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-header"><h3 className="card-title">Keyword Analysis: {analysis.keywordAnalysis.keyword}</h3></div>
                <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                  <div style={{ padding: 12, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>In Title</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: analysis.keywordAnalysis.inTitle ? 'var(--success)' : 'var(--error)', marginTop: 4 }}>
                      {analysis.keywordAnalysis.inTitle ? <Check size={16} /> : '✕'}
                    </div>
                  </div>
                  <div style={{ padding: 12, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>In Meta Desc</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: analysis.keywordAnalysis.inMetaDesc ? 'var(--success)' : 'var(--error)', marginTop: 4 }}>
                      {analysis.keywordAnalysis.inMetaDesc ? <Check size={16} /> : '✕'}
                    </div>
                  </div>
                  <div style={{ padding: 12, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>In H1</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: analysis.keywordAnalysis.inH1 ? 'var(--success)' : 'var(--error)', marginTop: 4 }}>
                      {analysis.keywordAnalysis.inH1 ? <Check size={16} /> : '✕'}
                    </div>
                  </div>
                  <div style={{ padding: 12, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Density</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)', marginTop: 4 }}>
                      {analysis.keywordAnalysis.density.toFixed(2)}%
                    </div>
                  </div>
                  <div style={{ padding: 12, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Count</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)', marginTop: 4 }}>
                      {analysis.keywordAnalysis.count}
                    </div>
                  </div>
                  <div style={{ padding: 12, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Keyword Score</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)', marginTop: 4 }}>
                      {analysis.keywordAnalysis.score}/100
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header"><h3 className="card-title">Issues by Category</h3></div>
              {Object.entries(issuesByCategory).map(([category, issues], i) => (
                <div key={i} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>{category}</div>
                  {issues.map((issue, j) => (
                    <div key={j} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8, fontSize: 12 }}>
                      <span className="badge" style={{ background: getSevColor(issue.severity), color: '#fff', fontSize: 9, flexShrink: 0 }}>
                        {issue.severity}
                      </span>
                      <div>
                        <div>{issue.issue}</div>
                        {issue.fix && <div style={{ color: 'var(--text-tertiary)', fontSize: 11, marginTop: 2 }}>Suggestion: {issue.fix}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="card">
              <div className="card-header"><h3 className="card-title">Page Details</h3></div>
              <div style={{ padding: '16px' }}>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>Title Tag</div>
                  <div style={{ fontSize: 13, fontWeight: 500, wordBreak: 'break-word' }}>{analysis.title.text || '(empty)'}</div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>Meta Description</div>
                  <div style={{ fontSize: 13, wordBreak: 'break-word' }}>{analysis.metaDescription.text || '(empty)'}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>H1 Tags ({analysis.headings.h1.length})</div>
                    {analysis.headings.h1.map((h, i) => (
                      <div key={i} style={{ fontSize: 11, color: 'var(--info)', marginBottom: 2 }}>{h}</div>
                    ))}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>Links ({analysis.links.internal} internal, {analysis.links.external} external)</div>
                    <div style={{ fontSize: 11 }}>Nofollow: {analysis.links.nofollow}</div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {analysis && <AnalysisSummary title="On-Page SEO Analysis" insights={generateOnPageInsights(analysis)} summary={`Page scored ${analysis.score}/100. ${(analysis.issues || []).filter(i => i.severity === 'critical').length} critical issues, ${(analysis.issues || []).filter(i => i.severity === 'warning').length} warnings. Word count: ${analysis.content?.wordCount || 0}. ${analysis.keywordAnalysis ? `Target keyword "${analysis.keywordAnalysis.keyword}" density: ${analysis.keywordAnalysis.density.toFixed(1)}%.` : ''}`} />}
        {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      </div>
    </>
  );
}

// =============================================
// BACKLINK CHECKER
// =============================================
function BacklinkChecker() {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [toast, setToast] = useState(null);

  const handleCheck = async () => {
    if (!domain.trim()) return;
    setLoading(true);
    try {
      const rank = await getDomainRank(domain.trim());
      const backlinks = await estimateBacklinks(domain.trim(), localStorage.getItem('kj_apify_token'));
      setResults({ rank, backlinks });
      setToast({ message: 'Backlink analysis complete', type: 'success' });
    } catch (e) { setToast({ message: e.message, type: 'error' }); }
    setLoading(false);
  };

  const exportBacklinks = () => {
    if (!results?.backlinks?.referringPages) return;
    const rows = results.backlinks.referringPages.map((r, i) => [i + 1, r.url, r.title, r.domain]);
    const csv = [['#', 'Referring Page', 'Title', 'Domain'], ...rows]
      .map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `backlinks-${domain}-${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="page-header">
        <div><h1>Backlink Checker</h1><p className="page-header-sub">Analyze backlink profile and domain authority</p></div>
      </div>
      <div className="page-body">
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 250 }}>
              <label className="label">Domain</label>
              <input className="input" value={domain} onChange={e => setDomain(e.target.value)} placeholder="example.com" />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn btn-primary" onClick={handleCheck} disabled={loading || !domain.trim()} style={{ height: 40 }}>
                {loading ? <><LoadingDots /> Checking...</> : <><Link size={16} /> Check</>}
              </button>
            </div>
          </div>
        </div>

        {results && (
          <>
            <div className="grid-4" style={{ marginBottom: 20 }}>
              <div className="stat-card">
                <span className="stat-card-label">Domain Rank</span>
                <span className="stat-card-value">{(results.rank.pageRank || 0).toFixed(2)}</span>
                <span className="stat-card-change positive">OpenPageRank</span>
              </div>
              <div className="stat-card">
                <span className="stat-card-label">Est. Backlinks</span>
                <span className="stat-card-value">{results.backlinks?.estimatedLinks || 0}</span>
                <span className="stat-card-change positive">mentions</span>
              </div>
              <div className="stat-card">
                <span className="stat-card-label">Referring Pages</span>
                <span className="stat-card-value">{results.backlinks?.referringPages?.length || 0}</span>
                <span className="stat-card-change positive">from analysis</span>
              </div>
              <div className="stat-card">
                <span className="stat-card-label">Unique Domains</span>
                <span className="stat-card-value">{new Set(results.backlinks?.referringPages?.map(r => r.domain)).size || 0}</span>
              </div>
            </div>

            {results.backlinks?.referringPages && results.backlinks.referringPages.length > 0 && (
              <>
                <div className="card" style={{ marginBottom: 12, padding: '10px 16px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn btn-sm" onClick={exportBacklinks}><Download size={12} /> Export CSV</button>
                </div>

                <div className="card" style={{ overflow: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border)' }}>
                        <th style={{ textAlign: 'center', padding: 10, width: 40 }}>#</th>
                        <th style={{ textAlign: 'left', padding: 10 }}>Referring Page</th>
                        <th style={{ textAlign: 'left', padding: 10 }}>Title</th>
                        <th style={{ textAlign: 'left', padding: 10 }}>Domain</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.backlinks.referringPages.slice(0, 50).map((page, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: 10, textAlign: 'center', fontSize: 11 }}>{i + 1}</td>
                          <td style={{ padding: 10 }}><a href={page.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--info)', textDecoration: 'none', fontSize: 11 }}>{page.url.substring(0, 50)}</a></td>
                          <td style={{ padding: 10, fontSize: 11 }}>{page.title?.substring(0, 40) || '—'}</td>
                          <td style={{ padding: 10, fontSize: 11 }}>{page.domain}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}

        {results && <AnalysisSummary title="Backlink Profile Analysis" insights={generateBacklinkInsights(results, domain)} summary={`Domain authority: ${(results.rank?.pageRank || 0).toFixed(1)}. Est. backlinks: ${results.backlinks?.estimatedLinks || 0}. ${new Set(results.backlinks?.referringPages?.map(r => r.domain)).size || 0} unique referring domains.`} />}
        {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      </div>
    </>
  );
}

// =============================================
// CONTENT ANALYZER
// =============================================
function ContentAnalyzer() {
  const [content, setContent] = useState('');
  const [targetKeyword, setTargetKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [toast, setToast] = useState(null);

  const handleAnalyze = async () => {
    if (!content.trim()) return;
    setLoading(true);
    try {
      const data = await analyzeContent(content.trim(), targetKeyword.trim());
      setAnalysis(data);
      setToast({ message: `Content analyzed - Score: ${data.score}`, type: 'success' });
    } catch (e) { setToast({ message: e.message, type: 'error' }); }
    setLoading(false);
  };

  const getFleschLabel = (score) => {
    if (score >= 90) return 'Very Easy';
    if (score >= 80) return 'Easy';
    if (score >= 70) return 'Fairly Easy';
    if (score >= 60) return 'Standard';
    if (score >= 50) return 'Fairly Difficult';
    if (score >= 30) return 'Difficult';
    return 'Very Difficult';
  };

  return (
    <>
      <div className="page-header">
        <div><h1>Content Analyzer</h1><p className="page-header-sub">Analyze content quality, readability, and keyword optimization</p></div>
      </div>
      <div className="page-body">
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label className="label">Content (Paste your text here)</label>
              <textarea className="input" value={content} onChange={e => setContent(e.target.value)} rows={6}
                placeholder="Paste your article, blog post, or web page content here..." style={{ minHeight: 180 }} />
            </div>
            <div>
              <label className="label">Target Keyword (Optional)</label>
              <input className="input" value={targetKeyword} onChange={e => setTargetKeyword(e.target.value)} placeholder="optional target keyword for optimization analysis" />
            </div>
            <button className="btn btn-primary" onClick={handleAnalyze} disabled={loading || !content.trim()}>
              {loading ? <><LoadingDots /> Analyzing...</> : <><BookOpen size={16} /> Analyze</>}
            </button>
          </div>
        </div>

        {analysis && (
          <>
            <div className="grid-4" style={{ marginBottom: 20 }}>
              <div className="stat-card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 700, color: analysis.score >= 75 ? 'var(--success)' : analysis.score >= 50 ? 'var(--warning)' : 'var(--error)' }}>
                  {analysis.score}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>Content Score</div>
              </div>
              <div className="stat-card">
                <span className="stat-card-label">Word Count</span>
                <span className="stat-card-value">{analysis.stats.wordCount}</span>
                <span className="stat-card-change positive">{analysis.stats.readingTime} min read</span>
              </div>
              <div className="stat-card">
                <span className="stat-card-label">Sentences</span>
                <span className="stat-card-value">{analysis.stats.sentences}</span>
                <span className="stat-card-change positive">{analysis.stats.paragraphs} paragraphs</span>
              </div>
              <div className="stat-card">
                <span className="stat-card-label">Unique Words</span>
                <span className="stat-card-value">{analysis.stats.uniqueWords}</span>
                <span className="stat-card-change positive">{analysis.readability.lexicalDiversity}% diversity</span>
              </div>
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header"><h3 className="card-title">Readability</h3></div>
              <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>Flesch Score</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent)', marginBottom: 4 }}>{analysis.readability.fleschScore}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{getFleschLabel(analysis.readability.fleschScore)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>Flesch-Kincaid Grade</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent)' }}>Grade {analysis.readability.fleschKincaid}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>education level</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>Avg Sentence Length</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent)' }}>{analysis.readability.avgSentenceLen}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>words per sentence</div>
                </div>
              </div>
            </div>

            {analysis.topWords && analysis.topWords.length > 0 && (
              <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-header"><h3 className="card-title">Top Keywords</h3></div>
                <div style={{ padding: '16px' }}>
                  {analysis.topWords.slice(0, 10).map((item, i) => (
                    <div key={i} style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                          <span style={{ fontWeight: 500 }}>{item.word}</span>
                          <span style={{ color: 'var(--text-tertiary)' }}>{item.count}x ({item.density}%)</span>
                        </div>
                        <div style={{ height: 6, background: 'var(--bg-tertiary)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: 'var(--accent)', width: `${Math.min(100, parseFloat(item.density) * 10)}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysis.keyword && (
              <div className="card">
                <div className="card-header"><h3 className="card-title">Keyword Optimization: {analysis.keyword.keyword}</h3></div>
                <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                  <div style={{ padding: 12, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Density</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)', marginTop: 4 }}>{analysis.keyword.density.toFixed(2)}%</div>
                    <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>{analysis.keyword.densityRating}</div>
                  </div>
                  <div style={{ padding: 12, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Count</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)', marginTop: 4 }}>{analysis.keyword.count}</div>
                  </div>
                  <div style={{ padding: 12, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Prominence</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: analysis.keyword.prominence > 50 ? 'var(--success)' : 'var(--warning)', marginTop: 4 }}>
                      {analysis.keyword.prominence}%
                    </div>
                  </div>
                  <div style={{ padding: 12, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>In First Sentence</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: analysis.keyword.inFirstSentence ? 'var(--success)' : 'var(--error)', marginTop: 4 }}>
                      {analysis.keyword.inFirstSentence ? 'Yes' : 'No'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {analysis && <AnalysisSummary title="Content Quality Analysis" insights={generateContentInsights(analysis)} summary={`Content scored ${analysis.score}/100. ${analysis.stats?.wordCount || 0} words, Flesch readability ${analysis.readability?.fleschScore || 0} (Grade ${analysis.readability?.fleschKincaid || 0}). Lexical diversity: ${analysis.readability?.lexicalDiversity || 0}%.`} />}
        {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      </div>
    </>
  );
}

// =============================================
// KEYWORD GAP ANALYZER
// =============================================
function KeywordGap() {
  const [domain1, setDomain1] = useState('');
  const [domain2, setDomain2] = useState('');
  const [keywords, setKeywords] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [toast, setToast] = useState(null);

  const handleAnalyze = async () => {
    if (!domain1.trim() || !domain2.trim() || !keywords.trim()) return;
    const kwList = keywords.split('\n').map(k => k.trim()).filter(Boolean);
    if (kwList.length === 0) return;
    setLoading(true);
    try {
      const data = await analyzeKeywordGap(domain1.trim(), domain2.trim(), kwList, localStorage.getItem('kj_apify_token'));
      setResults(data);
      setToast({ message: `Analyzed ${data.length} keywords`, type: 'success' });
    } catch (e) { setToast({ message: e.message, type: 'error' }); }
    setLoading(false);
  };

  const exportGap = () => {
    const rows = results.map(r => [
      r.keyword,
      r.domain1.position || 'N/A',
      r.domain2.position || 'N/A',
      r.gapType.replace(/_/g, ' ')
    ]);
    const csv = [['Keyword', 'Domain 1', 'Domain 2', 'Gap Type'], ...rows]
      .map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `gap-analysis-${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const getGapColor = (type) => {
    if (type === 'domain1_only') return '#059669';
    if (type === 'domain2_only') return '#f59e0b';
    if (type === 'domain1_leads') return '#3b82f6';
    if (type === 'domain2_leads') return '#ef4444';
    return '#6b7280';
  };

  const getGapLabel = (type) => {
    const labels = {
      'domain1_only': 'Only You',
      'domain2_only': 'Only Competitor',
      'domain1_leads': 'You Lead',
      'domain2_leads': 'They Lead',
      'neither': 'Neither'
    };
    return labels[type] || 'Unknown';
  };

  const summary = {
    onlyDomain1: results.filter(r => r.gapType === 'domain1_only').length,
    onlyDomain2: results.filter(r => r.gapType === 'domain2_only').length,
    domain1Leads: results.filter(r => r.gapType === 'domain1_leads').length,
    domain2Leads: results.filter(r => r.gapType === 'domain2_leads').length
  };

  return (
    <>
      <div className="page-header">
        <div><h1>Keyword Gap</h1><p className="page-header-sub">Find keyword opportunities between your domain and competitors</p></div>
      </div>
      <div className="page-body">
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 250 }}>
                <label className="label">Your Domain</label>
                <input className="input" value={domain1} onChange={e => setDomain1(e.target.value)} placeholder="yoursite.com" />
              </div>
              <div style={{ flex: 1, minWidth: 250 }}>
                <label className="label">Competitor Domain</label>
                <input className="input" value={domain2} onChange={e => setDomain2(e.target.value)} placeholder="competitor.com" />
              </div>
            </div>
            <div>
              <label className="label">Keywords to Check (one per line)</label>
              <textarea className="input" value={keywords} onChange={e => setKeywords(e.target.value)} rows={4}
                placeholder={'keyword 1\nkeyword 2\nkeyword 3'} />
            </div>
            <button className="btn btn-primary" onClick={handleAnalyze} disabled={loading || !domain1.trim() || !domain2.trim() || !keywords.trim()}>
              {loading ? <><LoadingDots /> Analyzing...</> : <><Target size={16} /> Analyze Gap</>}
            </button>
          </div>
        </div>

        {results.length > 0 && (
          <>
            <div className="grid-4" style={{ marginBottom: 20 }}>
              <div className="stat-card">
                <span className="stat-card-label">Total Keywords</span>
                <span className="stat-card-value">{results.length}</span>
              </div>
              <div className="stat-card" style={{ background: 'var(--success-bg)' }}>
                <span className="stat-card-label">Only You</span>
                <span className="stat-card-value">{summary.onlyDomain1}</span>
                <span className="stat-card-change positive">opportunities</span>
              </div>
              <div className="stat-card" style={{ background: 'var(--warning-bg)' }}>
                <span className="stat-card-label">Only Competitor</span>
                <span className="stat-card-value">{summary.onlyDomain2}</span>
                <span className="stat-card-change">watch them</span>
              </div>
              <div className="stat-card">
                <span className="stat-card-label">Shared Keywords</span>
                <span className="stat-card-value">{summary.domain1Leads + summary.domain2Leads}</span>
              </div>
            </div>

            <div className="card" style={{ marginBottom: 12, padding: '10px 16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-sm" onClick={exportGap}><Download size={12} /> Export CSV</button>
            </div>

            <div className="card" style={{ overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ textAlign: 'center', padding: 10, width: 40 }}>#</th>
                    <th style={{ textAlign: 'left', padding: 10 }}>Keyword</th>
                    <th style={{ textAlign: 'center', padding: 10, width: 100 }}>{domain1.split('.')[0]}</th>
                    <th style={{ textAlign: 'center', padding: 10, width: 100 }}>{domain2.split('.')[0]}</th>
                    <th style={{ textAlign: 'center', padding: 10 }}>Gap Type</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: 10, textAlign: 'center', fontSize: 11, color: 'var(--text-tertiary)' }}>{i + 1}</td>
                      <td style={{ padding: 10, fontWeight: 500 }}>{r.keyword}</td>
                      <td style={{ padding: 10, textAlign: 'center', fontSize: 13, fontWeight: 600, color: r.domain1.position ? 'var(--success)' : 'var(--text-tertiary)' }}>
                        {r.domain1.position ? `#${r.domain1.position}` : '—'}
                      </td>
                      <td style={{ padding: 10, textAlign: 'center', fontSize: 13, fontWeight: 600, color: r.domain2.position ? 'var(--warning)' : 'var(--text-tertiary)' }}>
                        {r.domain2.position ? `#${r.domain2.position}` : '—'}
                      </td>
                      <td style={{ padding: 10, textAlign: 'center' }}>
                        <span className="badge" style={{ background: getGapColor(r.gapType), color: '#fff', fontSize: 10 }}>
                          {getGapLabel(r.gapType)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {results.length > 0 && <AnalysisSummary title="Keyword Gap Analysis" insights={generateKeywordGapInsights(results, domain1, domain2)} summary={`Compared ${results.length} keywords between ${domain1} and ${domain2}. ${results.filter(r => r.gapType === 'only_domain2').length} gaps found where competitor ranks but you don't.`} />}
        {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      </div>
    </>
  );
}

// =============================================
// SERP SCRAPER (Real Google Rankings)
// =============================================
function SERPScraper() {
  const [queries, setQueries] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [expandedQuery, setExpandedQuery] = useState(null);
  const [toast, setToast] = useState(null);

  const handleScrape = async () => {
    const queryList = queries.split('\n').map(q => q.trim()).filter(Boolean);
    if (queryList.length === 0) return;
    setLoading(true);
    try {
      const data = await scrapeGoogleSERP({ queries: queryList, countryCode: 'in' });
      setResults(data);
      setToast({ message: `Scraped ${data.length} SERP(s) with ${data.reduce((s, r) => s + r.organicResults.length, 0)} results`, type: 'success' });
    } catch (e) { setToast({ message: e.message, type: 'error' }); }
    setLoading(false);
  };

  const exportSERP = () => {
    const rows = results.flatMap(serp =>
      serp.organicResults.map(r => [serp.query, r.position, r.title, r.url, r.description])
    );
    const csv = [['Query', 'Position', 'Title', 'URL', 'Description'], ...rows]
      .map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `serp-results-${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="page-header">
        <div><h1>SERP Scraper</h1><p className="page-header-sub">Scrape real Google search results — rankings, featured snippets, People Also Ask</p></div>
      </div>
      <div className="page-body">
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label className="label">Keywords (one per line)</label>
              <textarea className="input" value={queries} onChange={e => setQueries(e.target.value)} rows={5}
                placeholder={"best restaurants in mumbai\nhealthy ready to eat food india\nkiro foods review"} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={handleScrape} disabled={loading || !queries.trim()} style={{ flex: 1 }}>
                {loading ? <><LoadingDots /> Scraping (may take 30-60s)...</> : <><Search size={16} /> Scrape Google</>}
              </button>
              {results.length > 0 && <button className="btn btn-secondary" onClick={exportSERP}><Download size={14} /> Export CSV</button>}
            </div>
            {!isApifyTokenSet() && (
              <div style={{ padding: '10px 14px', background: 'var(--warning-bg)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={14} /> Apify API token required. Go to Settings. Free tier: 48 compute units/month.
              </div>
            )}
          </div>
        </div>

        {results.map((serp, i) => (
          <div key={i} className="card" style={{ marginBottom: 16 }}>
            <div style={{ padding: '14px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              onClick={() => setExpandedQuery(expandedQuery === i ? null : i)}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>"{serp.query}"</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                  {serp.organicResults.length} organic results • {serp.totalResults?.toLocaleString()} total
                  {serp.featuredSnippet && <span className="badge" style={{ marginLeft: 8, background: 'var(--success)', color: '#fff', fontSize: 10 }}>Featured Snippet</span>}
                  {serp.peopleAlsoAsk?.length > 0 && <span className="badge" style={{ marginLeft: 4, fontSize: 10 }}>PAA: {serp.peopleAlsoAsk.length}</span>}
                </div>
              </div>
              <ChevronRight size={16} style={{ transform: expandedQuery === i ? 'rotate(90deg)' : '', transition: 'transform 0.2s' }} />
            </div>

            {expandedQuery === i && (
              <div style={{ padding: '0 20px 16px' }}>
                {serp.featuredSnippet && (
                  <div style={{ padding: 12, background: 'var(--success-bg)', borderRadius: 'var(--radius-sm)', marginBottom: 12, borderLeft: '3px solid var(--success)' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--success)', marginBottom: 4 }}>FEATURED SNIPPET</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{serp.featuredSnippet.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{serp.featuredSnippet.text?.substring(0, 200)}...</div>
                    <a href={serp.featuredSnippet.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'var(--info)' }}>{serp.featuredSnippet.url}</a>
                  </div>
                )}

                {serp.organicResults.map((r, j) => (
                  <div key={j} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 700, color: r.position <= 3 ? 'var(--success)' : r.position <= 10 ? 'var(--accent)' : 'var(--text-tertiary)', minWidth: 28, textAlign: 'center', fontSize: 16 }}>
                      {r.position}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--info)' }}>{r.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--success)', marginTop: 2 }}>{r.displayUrl || r.url}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{r.description?.substring(0, 160)}</div>
                    </div>
                  </div>
                ))}

                {serp.peopleAlsoAsk?.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>People Also Ask:</div>
                    {serp.peopleAlsoAsk.map((q, j) => (
                      <div key={j} style={{ padding: '6px 12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', marginBottom: 4, fontSize: 13 }}>
                        {q}
                      </div>
                    ))}
                  </div>
                )}

                {serp.relatedSearches?.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Related Searches:</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {serp.relatedSearches.map((r, j) => (
                        <span key={j} className="badge" style={{ fontSize: 11 }}>{r}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {results.length > 0 && <AnalysisSummary title="SERP Analysis" insights={generateSERPInsights(results)} summary={`Analyzed SERP for "${results[0]?.query}". ${(results[0]?.organicResults || []).length} organic results. ${results[0]?.featuredSnippet ? 'Featured snippet present.' : 'No featured snippet.'} ${(results[0]?.peopleAlsoAsk || []).length} PAA questions.`} />}
        {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      </div>
    </>
  );
}

// =============================================
// RANK TRACKER (check your domain's rankings)
// =============================================
function RankTracker() {
  const [domain, setDomain] = useState('');
  const [keywords, setKeywords] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('current');
  const [history, setHistory] = useState([]);

  const handleTrack = async () => {
    const kwList = keywords.split('\n').map(k => k.trim()).filter(Boolean);
    if (!domain.trim() || kwList.length === 0) return;
    setLoading(true);
    try {
      const data = await checkKeywordRankings({ domain: domain.trim(), keywords: kwList, countryCode: 'in' });
      setResults(data);
      saveRankSnapshot(domain.trim(), data);
      const h = getRankHistory(domain.trim());
      setHistory(h);
      const ranking = data.filter(r => r.position !== null);
      setToast({ message: `Found ${ranking.length}/${data.length} keywords ranking. Saved to history.`, type: 'success' });
    } catch (e) { setToast({ message: e.message, type: 'error' }); }
    setLoading(false);
  };

  const handleDomainChange = (e) => {
    const newDomain = e.target.value;
    setDomain(newDomain);
    if (newDomain.trim()) {
      const h = getRankHistory(newDomain.trim());
      setHistory(h);
    } else {
      setHistory([]);
    }
  };

  const exportRankings = () => {
    const rows = results.map(r => [r.keyword, r.position || 'Not found', r.url || '', r.title || '', r.topResult?.title || '', r.topResult?.url || '']);
    const csv = [['Keyword', 'Your Position', 'Your URL', 'Your Title', '#1 Title', '#1 URL'], ...rows]
      .map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `rankings-${domain}-${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const avgPosition = results.filter(r => r.position).length > 0
    ? Math.round(results.filter(r => r.position).reduce((s, r) => s + r.position, 0) / results.filter(r => r.position).length * 10) / 10
    : null;

  return (
    <>
      <div className="page-header">
        <div><h1>Rank Tracker</h1><p className="page-header-sub">Check where your domain ranks on Google for any keyword</p></div>
      </div>
      <div className="page-body">
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label className="label">Your Domain</label>
              <input className="input" value={domain} onChange={handleDomainChange} placeholder="kirofoods.com" />
            </div>
            <div>
              <label className="label">Keywords to Track (one per line)</label>
              <textarea className="input" value={keywords} onChange={e => setKeywords(e.target.value)} rows={5}
                placeholder={"healthy ready to eat food\nclean label food india\nbest RTE brands india"} />
            </div>
            <button className="btn btn-primary" onClick={handleTrack} disabled={loading || !domain.trim() || !keywords.trim()}>
              {loading ? <><LoadingDots /> Checking rankings...</> : <><Target size={16} /> Check Rankings</>}
            </button>
          </div>
        </div>

        {(results.length > 0 || history.length > 0) && (
          <>
            <div className="card" style={{ marginBottom: 12, padding: '0 16px', display: 'flex', gap: 4, borderBottom: '2px solid var(--border)' }}>
              <button onClick={() => setActiveTab('current')} style={{ flex: 1, padding: '12px 16px', textAlign: 'left', background: activeTab === 'current' ? 'var(--accent)' : 'transparent', color: activeTab === 'current' ? '#fff' : 'var(--text-secondary)', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: 13, borderRadius: '4px 4px 0 0' }}>Current Rankings</button>
              {history.length > 0 && <button onClick={() => setActiveTab('history')} style={{ flex: 1, padding: '12px 16px', textAlign: 'left', background: activeTab === 'history' ? 'var(--accent)' : 'transparent', color: activeTab === 'history' ? '#fff' : 'var(--text-secondary)', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: 13, borderRadius: '4px 4px 0 0' }}>History ({history.length})</button>}
            </div>

            {activeTab === 'current' && results.length > 0 && (
            <>
            <div className="grid-4" style={{ marginBottom: 20 }}>
              <div className="stat-card">
                <span className="stat-card-label">Keywords Tracked</span>
                <span className="stat-card-value">{results.length}</span>
              </div>
              <div className="stat-card">
                <span className="stat-card-label">Ranking</span>
                <span className="stat-card-value">{results.filter(r => r.position).length}</span>
                <span className="stat-card-change positive">of {results.length}</span>
              </div>
              <div className="stat-card">
                <span className="stat-card-label">Top 10</span>
                <span className="stat-card-value">{results.filter(r => r.position && r.position <= 10).length}</span>
              </div>
              <div className="stat-card">
                <span className="stat-card-label">Avg Position</span>
                <span className="stat-card-value">{avgPosition || '—'}</span>
              </div>
            </div>

            <div className="card" style={{ marginBottom: 12, padding: '10px 16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-sm" onClick={exportRankings}><Download size={12} /> Export CSV</button>
            </div>

            <div className="card" style={{ overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ textAlign: 'left', padding: 10 }}>Keyword</th>
                    <th style={{ padding: 10 }}>Position</th>
                    <th style={{ textAlign: 'left', padding: 10 }}>Your URL</th>
                    <th style={{ textAlign: 'left', padding: 10 }}>#1 Result</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: 10, fontWeight: 500 }}>{r.keyword}</td>
                      <td style={{ padding: 10, textAlign: 'center' }}>
                        {r.position ? (
                          <span style={{
                            fontWeight: 700, fontSize: 16,
                            color: r.position <= 3 ? 'var(--success)' : r.position <= 10 ? 'var(--accent)' : r.position <= 30 ? 'var(--warning)' : 'var(--error)'
                          }}>#{r.position}</span>
                        ) : <span style={{ color: 'var(--text-tertiary)' }}>Not found</span>}
                      </td>
                      <td style={{ padding: 10, fontSize: 11 }}>
                        {r.url ? <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--info)', textDecoration: 'none' }}>{r.url.substring(0, 50)}</a> : '—'}
                      </td>
                      <td style={{ padding: 10 }}>
                        {r.topResult && (
                          <div>
                            <div style={{ fontSize: 12 }}>{r.topResult.title?.substring(0, 50)}</div>
                            <div style={{ fontSize: 10, color: 'var(--success)' }}>{r.topResult.url?.substring(0, 50)}</div>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
            )}

            {activeTab === 'history' && history.length > 0 && (
            <div className="card">
              <div className="card-header"><h3 className="card-title">Rank Snapshots History</h3></div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ textAlign: 'left', padding: 10 }}>Date</th>
                    <th style={{ textAlign: 'center', padding: 10 }}>Keywords</th>
                    <th style={{ textAlign: 'center', padding: 10 }}>Ranking</th>
                    <th style={{ textAlign: 'center', padding: 10 }}>Top 10</th>
                  </tr>
                </thead>
                <tbody>
                  {history.slice().reverse().map((snapshot, i) => {
                    const ranking = snapshot.rankings.filter(r => r.position !== null);
                    const top10 = ranking.filter(r => r.position <= 10);
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: 10 }}>{snapshot.dateStr}</td>
                        <td style={{ padding: 10, textAlign: 'center' }}>{snapshot.rankings.length}</td>
                        <td style={{ padding: 10, textAlign: 'center', fontWeight: 600, color: 'var(--accent)' }}>{ranking.length}/{snapshot.rankings.length}</td>
                        <td style={{ padding: 10, textAlign: 'center', fontWeight: 600, color: top10.length > 0 ? 'var(--success)' : 'var(--text-tertiary)' }}>{top10.length}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            )}
          </>
        )}
        {results.length > 0 && <AnalysisSummary title="Rank Tracking Analysis" insights={generateRankInsights(results, history)} summary={`Tracking ${results.length} keywords for ${domain}. ${results.filter(r => r.position && r.position <= 10).length} on page 1, ${results.filter(r => !r.position).length} not ranking.`} />}
        {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      </div>
    </>
  );
}

// =============================================
// SITE AUDIT (Real Crawl via Apify)
// =============================================
function SiteAudit() {
  const [url, setUrl] = useState('');
  const [maxPages, setMaxPages] = useState(30);
  const [loading, setLoading] = useState(false);
  const [auditData, setAuditData] = useState(null);
  const [toast, setToast] = useState(null);
  const [vitals, setVitals] = useState(null);
  const [loadingVitals, setLoadingVitals] = useState(false);
  const [aiReport, setAiReport] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);

  const handleAudit = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setAuditData(null);
    setAiReport(null);
    try {
      const data = await runSiteAudit({ url: url.trim(), maxPages });
      setAuditData(data);
      setToast({ message: `Crawled ${data.pagesCrawled} pages, found ${data.issues.length} issues`, type: 'success' });
      // Auto-trigger AI analysis if API key available
      if (isApiKeySet()) handleAIAnalysis(data);
    } catch (e) { setToast({ message: e.message, type: 'error' }); }
    setLoading(false);
  };

  const handleAIAnalysis = async (data) => {
    const d = data || auditData;
    if (!d || !isApiKeySet()) return;
    setLoadingAI(true);
    try {
      const issuesSummary = (d.issues || []).slice(0, 25).map(i => `[${i.type}] ${i.title}: ${i.description}`).join('\n');
      const pagesSummary = (d.pages || []).slice(0, 15).map(p => `${p.url} — Title: "${p.title || 'MISSING'}" — Words: ${p.wordCount} — Status: ${p.statusCode || '?'}`).join('\n');
      const result = await callClaude({
        system: `You are a senior SEO auditor (like Screaming Frog + Ahrefs Site Audit combined). Given crawl data, produce an actionable audit report. Be specific with recommendations — reference exact URLs, exact issues, and estimated impact. Prioritize by business impact, not just severity.

Return a JSON object with:
{
  "overallGrade": "A/B/C/D/F",
  "executiveSummary": "2-3 sentence overview for stakeholders",
  "criticalActions": [{"action": "specific fix", "impact": "High/Medium/Low", "effort": "Quick Win/Medium/Complex", "details": "how to fix"}],
  "quickWins": [{"action": "...", "expectedImprovement": "..."}],
  "technicalIssues": [{"issue": "...", "fix": "...", "priority": 1-5}],
  "contentGaps": ["areas where content needs improvement"],
  "competitiveInsights": ["things competitors likely do better"],
  "monthlyPlan": [{"month": 1, "focus": "...", "tasks": ["..."]}]
}
Return ONLY valid JSON.`,
        messages: [{ role: 'user', content: `Site: ${url}\nHealth Score: ${d.healthScore}/100\nPages Crawled: ${d.pagesCrawled}\nCritical Issues: ${d.summary?.criticalIssues || 0}\nWarnings: ${d.summary?.warnings || 0}\nMissing Titles: ${d.summary?.missingTitles || 0}\nMissing Descriptions: ${d.summary?.missingDescriptions || 0}\nMissing H1: ${d.summary?.missingH1 || 0}\nBroken Links: ${d.summary?.brokenLinks || 0}\nAvg Words/Page: ${d.avgWordsPerPage || 0}\n\nISSUES:\n${issuesSummary}\n\nPAGES:\n${pagesSummary}` }],
        maxTokens: 4000,
        temperature: 0.4
      });
      try {
        setAiReport(JSON.parse(result.content));
      } catch {
        const m = result.content.match(/\{[\s\S]*\}/);
        if (m) setAiReport(JSON.parse(m[0]));
      }
    } catch (e) { setToast({ message: `AI analysis failed: ${e.message}`, type: 'error' }); }
    setLoadingAI(false);
  };

  const handleGetVitals = async () => {
    if (!url.trim()) return;
    setLoadingVitals(true);
    try {
      const data = await getCoreWebVitals(url.trim(), 'mobile');
      setVitals(data);
      setToast({ message: 'Core Web Vitals fetched successfully', type: 'success' });
    } catch (e) { setToast({ message: e.message, type: 'error' }); }
    setLoadingVitals(false);
  };

  const getScoreColor = (s) => s >= 80 ? 'var(--success)' : s >= 50 ? 'var(--warning)' : 'var(--error)';
  const getSevColor = (t) => t === 'critical' ? 'var(--error)' : t === 'warning' ? 'var(--warning)' : 'var(--info)';

  return (
    <>
      <div className="page-header">
        <div><h1>Site Audit</h1><p className="page-header-sub">Real website crawl — find broken links, missing tags, thin content, SEO issues</p></div>
      </div>
      <div className="page-body">
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 250 }}>
              <label className="label">Website URL</label>
              <input className="input" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://yoursite.com"
                onKeyDown={e => e.key === 'Enter' && handleAudit()} />
            </div>
            <div style={{ width: 120 }}>
              <label className="label">Max Pages</label>
              <select className="input" value={maxPages} onChange={e => setMaxPages(Number(e.target.value))}>
                {[10, 20, 30, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
              <button className="btn btn-primary" onClick={handleAudit} disabled={loading || !url.trim()} style={{ height: 40 }}>
                {loading ? <><LoadingDots /> Crawling...</> : <><Activity size={16} /> Run Audit</>}
              </button>
              <button className="btn btn-secondary" onClick={handleGetVitals} disabled={loadingVitals || !url.trim()} style={{ height: 40 }}>
                {loadingVitals ? <><LoadingDots /> Getting...</> : <>Core Web Vitals</>}
              </button>
            </div>
          </div>
          {!isApifyTokenSet() && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--warning-bg)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={14} /> Apify API token required for real crawling. Go to Settings.
            </div>
          )}
        </div>

        {auditData && (
          <>
            {/* Score + Summary */}
            <div className="grid-4" style={{ marginBottom: 20 }}>
              <div className="stat-card" style={{ textAlign: 'center' }}>
                <svg viewBox="0 0 120 80" style={{ width: 120, height: 80 }}>
                  <path d="M 10 65 A 50 50 0 0 1 110 65" fill="none" stroke="var(--bg-tertiary)" strokeWidth="10" strokeLinecap="round" />
                  <path d="M 10 65 A 50 50 0 0 1 110 65" fill="none" stroke={getScoreColor(auditData.healthScore)} strokeWidth="10" strokeLinecap="round"
                    strokeDasharray={`${(auditData.healthScore / 100) * 157} 157`} />
                  <text x="60" y="58" textAnchor="middle" fill="var(--text-primary)" fontSize="22" fontWeight="700">{auditData.healthScore}</text>
                  <text x="60" y="73" textAnchor="middle" fill="var(--text-tertiary)" fontSize="8">Health</text>
                </svg>
              </div>
              <div className="stat-card">
                <span className="stat-card-label">Pages Crawled</span>
                <span className="stat-card-value">{auditData.pagesCrawled}</span>
              </div>
              <div className="stat-card">
                <span className="stat-card-label">Critical Issues</span>
                <span className="stat-card-value" style={{ color: 'var(--error)' }}>{auditData.summary.criticalIssues}</span>
              </div>
              <div className="stat-card">
                <span className="stat-card-label">Warnings</span>
                <span className="stat-card-value" style={{ color: 'var(--warning)' }}>{auditData.summary.warnings}</span>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="card" style={{ marginBottom: 16, padding: '14px 20px', display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 13 }}>
              <span>Avg words/page: <strong>{auditData.avgWordsPerPage}</strong></span>
              <span>Missing titles: <strong style={{ color: auditData.summary.missingTitles > 0 ? 'var(--error)' : 'var(--success)' }}>{auditData.summary.missingTitles}</strong></span>
              <span>Missing descriptions: <strong style={{ color: auditData.summary.missingDescriptions > 0 ? 'var(--warning)' : 'var(--success)' }}>{auditData.summary.missingDescriptions}</strong></span>
              <span>Missing H1: <strong style={{ color: auditData.summary.missingH1 > 0 ? 'var(--warning)' : 'var(--success)' }}>{auditData.summary.missingH1}</strong></span>
              <span>Broken pages: <strong style={{ color: auditData.summary.brokenLinks > 0 ? 'var(--error)' : 'var(--success)' }}>{auditData.summary.brokenLinks}</strong></span>
            </div>

            {vitals && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header"><h3 className="card-title">Core Web Vitals</h3></div>
              <div className="grid-4" style={{ padding: '16px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8 }}>Performance</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: vitals.scores?.performance >= 80 ? 'var(--success)' : vitals.scores?.performance >= 50 ? 'var(--warning)' : 'var(--error)' }}>
                    {vitals.scores?.performance || '—'}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8 }}>Accessibility</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: vitals.scores?.accessibility >= 80 ? 'var(--success)' : vitals.scores?.accessibility >= 50 ? 'var(--warning)' : 'var(--error)' }}>
                    {vitals.scores?.accessibility || '—'}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8 }}>Best Practices</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: vitals.scores?.bestPractices >= 80 ? 'var(--success)' : vitals.scores?.bestPractices >= 50 ? 'var(--warning)' : 'var(--error)' }}>
                    {vitals.scores?.bestPractices || '—'}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8 }}>SEO</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: vitals.scores?.seo >= 80 ? 'var(--success)' : vitals.scores?.seo >= 50 ? 'var(--warning)' : 'var(--error)' }}>
                    {vitals.scores?.seo || '—'}
                  </div>
                </div>
              </div>
              <div style={{ padding: '0 16px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
                {[['FCP', vitals.metrics?.FCP], ['LCP', vitals.metrics?.LCP], ['TBT', vitals.metrics?.TBT], ['CLS', vitals.metrics?.CLS]].map(([label, value], i) => (
                  <div key={i} style={{ padding: 12, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)', marginTop: 4 }}>{value || '—'}</div>
                  </div>
                ))}
              </div>
            </div>
            )}

            {/* Issues */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header"><h3 className="card-title">Issues ({auditData.issues.length})</h3></div>
              {auditData.issues.map((issue, i) => (
                <div key={i} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span className="badge" style={{ background: getSevColor(issue.type), color: '#fff', fontSize: 10, flexShrink: 0 }}>{issue.type}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{issue.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{issue.description}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pages */}
            <div className="card" style={{ overflow: 'auto' }}>
              <div className="card-header"><h3 className="card-title">Crawled Pages</h3></div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ textAlign: 'left', padding: 8 }}>URL</th>
                    <th style={{ textAlign: 'left', padding: 8 }}>Title</th>
                    <th style={{ padding: 8 }}>Words</th>
                    <th style={{ padding: 8 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {auditData.pages.map((p, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: 8 }}><a href={p.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--info)', textDecoration: 'none', fontSize: 11 }}>{p.url.substring(0, 60)}</a></td>
                      <td style={{ padding: 8 }}>{p.title?.substring(0, 40) || <span style={{ color: 'var(--error)' }}>Missing</span>}</td>
                      <td style={{ padding: 8, textAlign: 'center' }}><span style={{ color: p.wordCount < 300 ? 'var(--warning)' : 'var(--text-primary)' }}>{p.wordCount}</span></td>
                      <td style={{ padding: 8, textAlign: 'center' }}>{p.statusCode || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {/* AI-Powered Report */}
        {loadingAI && (
          <div className="card" style={{ marginBottom: 16, padding: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
            <RefreshCw size={16} className="spin" style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: 13, color: 'var(--accent)' }}>AI is analyzing your site audit data...</span>
          </div>
        )}
        {aiReport && (
          <>
            {/* Grade + Summary */}
            <div className="card" style={{ marginBottom: 16, borderLeft: `4px solid ${aiReport.overallGrade === 'A' ? '#059669' : aiReport.overallGrade === 'B' ? '#3b82f6' : aiReport.overallGrade === 'C' ? '#f59e0b' : '#ef4444'}` }}>
              <div style={{ padding: 20, display: 'flex', gap: 20, alignItems: 'center' }}>
                <div style={{ width: 64, height: 64, borderRadius: 12, background: aiReport.overallGrade === 'A' ? 'rgba(5,150,105,0.15)' : aiReport.overallGrade === 'B' ? 'rgba(59,130,246,0.15)' : aiReport.overallGrade === 'C' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 800, color: aiReport.overallGrade === 'A' ? '#059669' : aiReport.overallGrade === 'B' ? '#3b82f6' : aiReport.overallGrade === 'C' ? '#f59e0b' : '#ef4444', flexShrink: 0 }}>
                  {aiReport.overallGrade}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>AI Audit Report</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{aiReport.executiveSummary}</div>
                </div>
              </div>
            </div>

            {/* Critical Actions */}
            {(aiReport.criticalActions || []).length > 0 && (
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-header"><h3 className="card-title" style={{ color: 'var(--error)' }}>Critical Actions</h3></div>
                {aiReport.criticalActions.map((a, i) => (
                  <div key={i} style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--error)', minWidth: 22 }}>{i + 1}.</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{a.action}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>{a.details}</div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 8, background: a.impact === 'High' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)', color: a.impact === 'High' ? '#ef4444' : '#f59e0b', fontWeight: 600 }}>Impact: {a.impact}</span>
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 8, background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>Effort: {a.effort}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quick Wins */}
            {(aiReport.quickWins || []).length > 0 && (
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-header"><h3 className="card-title" style={{ color: '#059669' }}>Quick Wins</h3></div>
                {aiReport.quickWins.map((w, i) => (
                  <div key={i} style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                    <span style={{ fontWeight: 500 }}>✓ {w.action}</span>
                    <span style={{ fontSize: 10, color: '#059669', fontWeight: 600 }}>{w.expectedImprovement}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Monthly Plan */}
            {(aiReport.monthlyPlan || []).length > 0 && (
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-header"><h3 className="card-title">3-Month Action Plan</h3></div>
                {aiReport.monthlyPlan.map((m, i) => (
                  <div key={i} style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 8, background: 'var(--accent)', color: '#fff', fontWeight: 700 }}>Month {m.month}</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{m.focus}</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {(m.tasks || []).map((t, j) => (
                        <span key={j} style={{ fontSize: 10, padding: '4px 10px', background: 'var(--bg-tertiary)', borderRadius: 6, color: 'var(--text-secondary)' }}>{t}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loadingAI && auditData && (
              <button className="btn btn-secondary" onClick={() => handleAIAnalysis()} disabled={loadingAI} style={{ marginBottom: 16 }}>
                <RefreshCw size={14} /> Regenerate AI Report
              </button>
            )}
          </>
        )}
        {auditData && <AnalysisSummary title="Site Audit Analysis" insights={generateSiteAuditInsights(auditData, vitals)} summary={`Site health: ${auditData.healthScore || 0}%. ${auditData.pagesCrawled || 0} pages crawled. ${(auditData.issues || []).filter(i => i.severity === 'critical' || i.severity === 'error').length} critical issues, ${(auditData.issues || []).filter(i => i.severity === 'warning').length} warnings.`} />}
        {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      </div>
    </>
  );
}

// =============================================
// TRAFFIC INSIGHTS
// =============================================
function TrafficInsights() {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [toast, setToast] = useState(null);

  const handleAnalyze = async () => {
    if (!domain.trim()) return;
    setLoading(true);
    setData(null);
    try {
      const apifyToken = localStorage.getItem('kj_apify_token');
      const result = await getTrafficInsights(domain.trim(), apifyToken);
      setData(result);
      setToast({ message: `Traffic insights loaded for ${result.domain}`, type: 'success' });
    } catch (e) { setToast({ message: e.message, type: 'error' }); }
    setLoading(false);
  };

  const tierColor = (t) => ({ 'Very High': '#00d68f', 'High': '#00b4d8', 'Medium': '#ffa726', 'Low': '#ff7043', 'Very Low': '#ef5350' }[t] || 'var(--text-tertiary)');

  return (
    <>
      <div className="page-header">
        <div><h1>Traffic Insights</h1><p className="page-header-sub">Estimate website traffic, indexed pages, brand presence &amp; web mentions</p></div>
      </div>
      <div className="page-body">
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label className="label">Domain</label>
              <input className="input" value={domain} onChange={e => setDomain(e.target.value)} placeholder="example.com" onKeyDown={e => e.key === 'Enter' && handleAnalyze()} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn btn-primary" onClick={handleAnalyze} disabled={loading || !domain.trim()} style={{ height: 40 }}>
                {loading ? <><LoadingDots /> Analyzing...</> : <><BarChart3 size={16} /> Analyze Traffic</>}
              </button>
            </div>
          </div>
          {!isApifyTokenSet() && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--warning-bg)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={14} /> Apify token required for full traffic analysis. Go to Settings.
            </div>
          )}
        </div>

        {data && (
          <>
            <div className="grid-4" style={{ marginBottom: 20 }}>
              <div className="stat-card" style={{ textAlign: 'center' }}>
                <span className="stat-card-label">Traffic Tier</span>
                <span className="stat-card-value" style={{ color: tierColor(data.trafficTier), fontSize: 22 }}>{data.trafficTier}</span>
              </div>
              <div className="stat-card">
                <span className="stat-card-label">Indexed Pages</span>
                <span className="stat-card-value">{(data.indexedPages || 0).toLocaleString()}</span>
              </div>
              <div className="stat-card">
                <span className="stat-card-label">Branded Results</span>
                <span className="stat-card-value">{data.brandedResults || 0}<span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>/10</span></span>
              </div>
              <div className="stat-card">
                <span className="stat-card-label">Web Mentions</span>
                <span className="stat-card-value">{(data.webMentions || 0).toLocaleString()}</span>
              </div>
            </div>

            {data.topPages && data.topPages.length > 0 && (
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-header"><h3 className="card-title">Top Indexed Pages</h3></div>
                {data.topPages.map((p, i) => (
                  <div key={i} style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 13, minWidth: 24 }}>#{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--info)', textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>{p.title || p.url}</a>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.url}</div>
                      {p.description && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{p.description.substring(0, 150)}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {data.mentionSources && data.mentionSources.length > 0 && (
              <div className="card">
                <div className="card-header"><h3 className="card-title">Web Mentions (External Sites)</h3></div>
                {data.mentionSources.map((m, i) => (
                  <div key={i} style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
                    <a href={m.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--info)', textDecoration: 'none', fontSize: 13 }}>{m.title || m.url}</a>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{m.domain}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        {data && <AnalysisSummary title="Traffic & Visibility Analysis" insights={generateTrafficInsights(data)} summary={`${data.indexedPages || 0} indexed pages. ${data.brandedResults || 0} branded results. ${data.webMentions || 0} web mentions. Traffic tier: ${data.trafficTier || 'Unknown'}.`} />}
        {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      </div>
    </>
  );
}

// =============================================
// PAID ADS INTELLIGENCE
// =============================================
function AdIntelligence() {
  const [keywords, setKeywords] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [toast, setToast] = useState(null);

  const handleAnalyze = async () => {
    const kws = keywords.split('\n').map(k => k.trim()).filter(Boolean);
    if (kws.length === 0) return;
    setLoading(true);
    setData(null);
    try {
      const result = await getAdIntelligence(kws, localStorage.getItem('kj_apify_token'));
      setData(result);
      const totalAds = result.reduce((s, r) => s + r.paidCount, 0);
      setToast({ message: `Found ${totalAds} ads across ${kws.length} keyword(s)`, type: 'success' });
    } catch (e) { setToast({ message: e.message, type: 'error' }); }
    setLoading(false);
  };

  return (
    <>
      <div className="page-header">
        <div><h1>Paid Ads Intelligence</h1><p className="page-header-sub">Spy on competitor Google Ads — see who's bidding, their ad copy &amp; landing pages</p></div>
      </div>
      <div className="page-body">
        <div className="card" style={{ marginBottom: 20 }}>
          <label className="label">Keywords (one per line)</label>
          <textarea className="input" rows={4} value={keywords} onChange={e => setKeywords(e.target.value)} placeholder={"healthy noodles India\ninstant rice noodles\ngluten free snacks"} style={{ fontFamily: 'inherit', resize: 'vertical' }} />
          <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
            <button className="btn btn-primary" onClick={handleAnalyze} disabled={loading || !keywords.trim()}>
              {loading ? <><LoadingDots /> Scanning ads...</> : <><DollarSign size={16} /> Scan Ads</>}
            </button>
            {!isApifyTokenSet() && <span style={{ fontSize: 12, color: 'var(--warning)' }}><AlertCircle size={12} /> Apify token required</span>}
          </div>
        </div>

        {data && data.map((kw, ki) => (
          <div key={ki} className="card" style={{ marginBottom: 16 }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Hash size={16} /> {kw.keyword}
              </h3>
              <span className="badge" style={{ background: kw.hasAds ? 'var(--error)' : 'var(--success)', color: '#fff' }}>
                {kw.hasAds ? `${kw.paidCount} Ad(s)` : 'No Ads'}
              </span>
            </div>

            {kw.hasAds && (
              <div style={{ padding: '0 16px 12px' }}>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Advertisers</div>
                {kw.topAdvertisers.map((ad, ai) => (
                  <div key={ai} style={{ padding: '10px 14px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', marginBottom: 8, borderLeft: '3px solid var(--error)' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{ad.title}</div>
                    <a href={ad.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'var(--success)', textDecoration: 'none' }}>{ad.domain}</a>
                    {ad.description && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{ad.description}</div>}
                  </div>
                ))}
              </div>
            )}

            {/* Organic comparison */}
            {kw.organicTop3.length > 0 && (
              <div style={{ padding: '0 16px 12px' }}>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Organic Top 3</div>
                {kw.organicTop3.map((r, ri) => (
                  <div key={ri} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 0', fontSize: 12 }}>
                    <span style={{ color: 'var(--accent)', fontWeight: 700, minWidth: 20 }}>#{r.position}</span>
                    <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--info)', textDecoration: 'none' }}>{r.title}</a>
                  </div>
                ))}
              </div>
            )}

            {kw.featuredSnippet && (
              <div style={{ padding: '0 16px 12px' }}>
                <div style={{ padding: '10px 14px', background: 'rgba(0,180,216,0.1)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--info)' }}>
                  <div style={{ fontSize: 11, color: 'var(--info)', marginBottom: 4 }}>Featured Snippet</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{kw.featuredSnippet.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{kw.featuredSnippet.text?.substring(0, 200)}</div>
                </div>
              </div>
            )}
          </div>
        ))}
        {data && data.length > 0 && <AnalysisSummary title="Paid Ads Intelligence" insights={generateAdIntelInsights(data)} summary={`Analyzed ${data.length} keywords. ${data.filter(d => d.hasAds).length} have active ads. ${[...new Set(data.flatMap(d => (d.topAdvertisers || []).map(a => a.domain)))].length} unique advertisers found.`} />}
        {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      </div>
    </>
  );
}

// =============================================
// CONTENT RESEARCH (Topic Research equivalent)
// =============================================
function ContentResearch() {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [toast, setToast] = useState(null);
  const [tab, setTab] = useState('pages');

  const handleResearch = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setData(null);
    try {
      const result = await researchContent(topic.trim(), localStorage.getItem('kj_apify_token'));
      setData(result);
      setToast({ message: `Found ${result.totalPages} pages, ${result.questions.length} questions, ${result.relatedTopics.length} related topics`, type: 'success' });
    } catch (e) { setToast({ message: e.message, type: 'error' }); }
    setLoading(false);
  };

  const tabs = [
    { key: 'pages', label: 'Top Content', count: data?.topPages?.length },
    { key: 'questions', label: 'Questions', count: data?.questions?.length },
    { key: 'related', label: 'Related Topics', count: data?.relatedTopics?.length },
    { key: 'domains', label: 'Top Publishers', count: data?.topDomains?.length },
    { key: 'snippets', label: 'Featured Snippets', count: data?.featuredSnippets?.length },
  ];

  return (
    <>
      <div className="page-header">
        <div><h1>Content Research</h1><p className="page-header-sub">Discover top-performing content, trending questions &amp; content gaps for any topic</p></div>
      </div>
      <div className="page-body">
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label className="label">Topic / Keyword</label>
              <input className="input" value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. healthy instant noodles" onKeyDown={e => e.key === 'Enter' && handleResearch()} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn btn-primary" onClick={handleResearch} disabled={loading || !topic.trim()} style={{ height: 40 }}>
                {loading ? <><LoadingDots /> Researching...</> : <><Newspaper size={16} /> Research</>}
              </button>
            </div>
          </div>
          {!isApifyTokenSet() && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--warning-bg)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={14} /> Apify token required for content research.
            </div>
          )}
        </div>

        {data && (
          <>
            <div className="grid-4" style={{ marginBottom: 20 }}>
              <div className="stat-card"><span className="stat-card-label">Unique Pages</span><span className="stat-card-value">{data.totalPages}</span></div>
              <div className="stat-card"><span className="stat-card-label">Questions Found</span><span className="stat-card-value">{data.questions.length}</span></div>
              <div className="stat-card"><span className="stat-card-label">Related Topics</span><span className="stat-card-value">{data.relatedTopics.length}</span></div>
              <div className="stat-card"><span className="stat-card-label">Featured Snippets</span><span className="stat-card-value">{data.featuredSnippets.length}</span></div>
            </div>

            {/* Create Content CTA */}
            <div className="card" style={{ marginBottom: 16, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(168,85,247,0.05))', border: '1px solid rgba(124,58,237,0.2)' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Ready to create content from this research?</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>Auto-populate Blog Writer with topics, questions &amp; keywords from this analysis</div>
              </div>
              <button className="btn btn-primary" style={{ fontSize: 12, whiteSpace: 'nowrap' }} onClick={() => {
                const kws = [
                  ...(data.relatedTopics || []).slice(0, 8).map(t => ({ keyword: t, volume: 'N/A', difficulty: 'Medium', type: 'RELATED' })),
                  ...(data.questions || []).slice(0, 5).map(q => ({ keyword: q, volume: 'Question', difficulty: 'Easy', type: 'QUESTION' }))
                ];
                localStorage.setItem('protocol_seo_to_content', JSON.stringify({
                  source: 'content-research', seedKeyword: data.topic, keywords: kws,
                  questions: data.questions || [], timestamp: Date.now()
                }));
                window.location.hash = '#/blog';
              }}>
                <Feather size={14} /> Create Content
              </button>
            </div>

            {/* Tab bar */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
              {tabs.map(t => (
                <button key={t.key} className={`btn ${tab === t.key ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: 12, padding: '6px 14px', whiteSpace: 'nowrap' }} onClick={() => setTab(t.key)}>
                  {t.label} {t.count != null && <span style={{ opacity: 0.7 }}>({t.count})</span>}
                </button>
              ))}
            </div>

            {tab === 'pages' && (
              <div className="card">
                <div className="card-header"><h3 className="card-title">Top Content for "{data.topic}"</h3></div>
                {data.topPages.map((p, i) => (
                  <div key={i} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12 }}>
                    <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 13, minWidth: 28 }}>#{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--info)', textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>{p.title}</a>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{p.domain} • Query: "{p.query}" • Position #{p.position}</div>
                      {p.description && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{p.description.substring(0, 160)}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'questions' && (
              <div className="card">
                <div className="card-header"><h3 className="card-title">People Also Ask</h3></div>
                <div style={{ padding: 16 }}>
                  {data.questions.map((q, i) => (
                    <div key={i} style={{ padding: '10px 14px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                      <MessageSquare size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                      <span style={{ fontSize: 13 }}>{q}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'related' && (
              <div className="card">
                <div className="card-header"><h3 className="card-title">Related Topics &amp; Searches</h3></div>
                <div style={{ padding: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {data.relatedTopics.map((r, i) => (
                    <span key={i} className="badge" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', padding: '6px 12px', fontSize: 12, borderRadius: 20 }}>{r}</span>
                  ))}
                </div>
              </div>
            )}

            {tab === 'domains' && (
              <div className="card">
                <div className="card-header"><h3 className="card-title">Dominant Publishers</h3></div>
                {data.topDomains.map((d, i) => (
                  <div key={i} style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 13, minWidth: 24 }}>#{i + 1}</span>
                      <span style={{ fontSize: 13 }}>{d.domain}</span>
                    </div>
                    <span className="badge" style={{ background: 'var(--accent)', color: '#fff' }}>{d.count} pages</span>
                  </div>
                ))}
              </div>
            )}

            {tab === 'snippets' && (
              <div className="card">
                <div className="card-header"><h3 className="card-title">Featured Snippets</h3></div>
                {data.featuredSnippets.length === 0 ? (
                  <div className="empty-state" style={{ padding: 40 }}><Bookmark /><h3>No snippets found</h3></div>
                ) : data.featuredSnippets.map((s, i) => (
                  <div key={i} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', borderLeft: '3px solid var(--info)' }}>
                    <div style={{ fontSize: 11, color: 'var(--info)', marginBottom: 4 }}>Query: {s.query}</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{s.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{s.text?.substring(0, 200)}</div>
                    {s.url && <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'var(--info)', textDecoration: 'none', marginTop: 4, display: 'block' }}>{s.url}</a>}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        {data && <AnalysisSummary title="Content Research Analysis" insights={generateContentResearchInsights(data)} summary={`Researched "${data.topic}". Found ${data.totalPages || 0} top pages, ${(data.questions || []).length} questions, ${(data.relatedTopics || []).length} related topics, ${(data.featuredSnippets || []).length} featured snippets.`} />}
        {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      </div>
    </>
  );
}

// =============================================
// ORGANIC RESEARCH (Competitor Keyword Analysis)
// =============================================
function OrganicResearch() {
  const [domain, setDomain] = useState('');
  const [seedKeywords, setSeedKeywords] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [toast, setToast] = useState(null);

  const handleAnalyze = async () => {
    const kws = seedKeywords.split('\n').map(k => k.trim()).filter(Boolean);
    if (!domain.trim() || kws.length === 0) { setToast({ message: 'Enter a domain and at least one keyword', type: 'error' }); return; }
    setLoading(true);
    setData(null);
    try {
      const result = await getCompetitorKeywords(domain.trim(), kws, localStorage.getItem('kj_apify_token'));
      setData(result);
      setToast({ message: `${result.keywordsRanking}/${result.keywordsChecked} keywords found ranking`, type: 'success' });
    } catch (e) { setToast({ message: e.message, type: 'error' }); }
    setLoading(false);
  };

  const trafficColor = (t) => t === 'High' ? 'var(--success)' : t === 'Medium' ? 'var(--warning)' : 'var(--text-tertiary)';

  return (
    <>
      <div className="page-header">
        <div><h1>Organic Research</h1><p className="page-header-sub">Find what keywords any competitor ranks for — discover their SEO strategy</p></div>
      </div>
      <div className="page-body">
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="label">Competitor Domain</label>
              <input className="input" value={domain} onChange={e => setDomain(e.target.value)} placeholder="competitor.com" />
            </div>
            <div>
              <label className="label">Seed Keywords (one per line)</label>
              <textarea className="input" rows={4} value={seedKeywords} onChange={e => setSeedKeywords(e.target.value)}
                placeholder={"healthy noodles\ninstant rice noodles\ngluten free snacks\nRTE food India\nclean label food"} style={{ fontFamily: 'inherit', resize: 'vertical' }} />
            </div>
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
            <button className="btn btn-primary" onClick={handleAnalyze} disabled={loading || !domain.trim() || !seedKeywords.trim()}>
              {loading ? <><LoadingDots /> Scanning...</> : <><UserCheck size={16} /> Analyze Competitor</>}
            </button>
            {!isApifyTokenSet() && <span style={{ fontSize: 12, color: 'var(--warning)' }}><AlertCircle size={12} /> Apify token required</span>}
          </div>
        </div>

        {data && (
          <>
            <div className="grid-4" style={{ marginBottom: 20 }}>
              <div className="stat-card"><span className="stat-card-label">Domain</span><span className="stat-card-value" style={{ fontSize: 16 }}>{data.domain}</span></div>
              <div className="stat-card"><span className="stat-card-label">Keywords Checked</span><span className="stat-card-value">{data.keywordsChecked}</span></div>
              <div className="stat-card"><span className="stat-card-label">Keywords Ranking</span><span className="stat-card-value" style={{ color: 'var(--success)' }}>{data.keywordsRanking}</span></div>
              <div className="stat-card"><span className="stat-card-label">Top 10 Keywords</span><span className="stat-card-value" style={{ color: 'var(--accent)' }}>{data.topKeywords.length}</span></div>
            </div>

            {/* Rankings table */}
            {data.rankings.length > 0 && (
              <div className="card" style={{ marginBottom: 16, overflow: 'auto' }}>
                <div className="card-header"><h3 className="card-title">Keyword Rankings</h3></div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)' }}>
                      <th style={{ textAlign: 'left', padding: 8 }}>Keyword</th>
                      <th style={{ padding: 8 }}>Position</th>
                      <th style={{ textAlign: 'left', padding: 8 }}>Ranking URL</th>
                      <th style={{ padding: 8 }}>Est. Traffic</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rankings.map((r, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: 8, fontWeight: 500 }}>{r.keyword}</td>
                        <td style={{ padding: 8, textAlign: 'center' }}>
                          <span style={{ background: r.position <= 3 ? 'var(--success)' : r.position <= 10 ? 'var(--accent)' : 'var(--bg-tertiary)', color: r.position <= 10 ? '#fff' : 'var(--text-primary)', padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: 12 }}>
                            #{r.position}
                          </span>
                        </td>
                        <td style={{ padding: 8 }}>
                          <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--info)', textDecoration: 'none', fontSize: 11 }}>{r.url.substring(0, 50)}</a>
                        </td>
                        <td style={{ padding: 8, textAlign: 'center' }}>
                          <span style={{ color: trafficColor(r.estimatedTraffic), fontWeight: 600 }}>{r.estimatedTraffic}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Missing keywords */}
            {data.missingKeywords.length > 0 && (
              <div className="card">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 className="card-title">Not Ranking For ({data.missingKeywords.length})</h3>
                  <button className="btn btn-sm" style={{ background: 'var(--accent)', color: '#fff', fontSize: 11 }} onClick={() => {
                    const kws = data.missingKeywords.map(kw => ({ keyword: kw, volume: 'N/A', difficulty: 'Medium', type: 'GAP' }));
                    localStorage.setItem('protocol_seo_to_content', JSON.stringify({
                      source: 'organic-research-gaps', seedKeyword: data.missingKeywords[0],
                      keywords: kws, timestamp: Date.now()
                    }));
                    window.location.hash = '#/blog';
                  }}>
                    <Feather size={12} /> Create Content for Gaps
                  </button>
                </div>
                <div style={{ padding: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {data.missingKeywords.map((kw, i) => (
                    <span key={i} className="badge" style={{ background: 'rgba(239,83,80,0.15)', color: 'var(--error)', padding: '6px 12px', fontSize: 12, borderRadius: 20 }}>{kw}</span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        {data && <AnalysisSummary title="Organic Research Analysis" insights={generateOrganicResearchInsights(data)} summary={`Domain ${data.domain}: ${data.keywordsRanking || 0}/${data.keywordsChecked || 0} keywords ranking. ${(data.missingKeywords || []).length} keyword gaps identified.`} />}
        {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      </div>
    </>
  );
}

// =============================================
// WEBSITE ANALYSIS — Unified SEO + Research Workflow
// =============================================
function WebsiteAnalysis() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [toast, setToast] = useState(null);
  const [step, setStep] = useState(0); // 0=input, 1=running, 2=results
  const [results, setResults] = useState(null);
  const [aiReport, setAiReport] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);

  const runFullAnalysis = async () => {
    if (!url.trim()) return;
    const domain = url.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
    setLoading(true);
    setStep(1);
    setResults(null);
    setAiReport(null);

    const data = {
      domain,
      siteAudit: null,
      vitals: null,
      domainOverview: null,
      keywords: [],
      onPage: null,
      backlinks: null,
      traffic: null,
      competitors: [],
      contentGaps: [],
      rankData: null,
    };

    // Run all analyses in parallel batches
    try {
      // Batch 1: Site crawl + domain overview + vitals
      setProgress('Phase 1/4 — Crawling site & fetching domain data...');
      const [auditResult, vitalsResult, overviewResult] = await Promise.allSettled([
        runSiteAudit({ url: `https://${domain}`, maxPages: 30 }),
        getCoreWebVitals(`https://${domain}`, 'mobile'),
        getDomainOverview(domain),
      ]);
      if (auditResult.status === 'fulfilled') data.siteAudit = auditResult.value;
      if (vitalsResult.status === 'fulfilled') data.vitals = vitalsResult.value;
      if (overviewResult.status === 'fulfilled') data.domainOverview = overviewResult.value;

      // Batch 2: Keywords + On-Page + Backlinks
      setProgress('Phase 2/4 — Keywords, on-page SEO, backlinks...');
      const [kwResult, onPageResult, blResult, trafficResult] = await Promise.allSettled([
        getKeywordSuggestions(domain, 'en', 'in'),
        analyzeOnPageSEO(`https://${domain}`),
        estimateBacklinks(domain),
        getTrafficInsights(domain),
      ]);
      if (kwResult.status === 'fulfilled') data.keywords = kwResult.value || [];
      if (onPageResult.status === 'fulfilled') data.onPage = onPageResult.value;
      if (blResult.status === 'fulfilled') data.backlinks = blResult.value;
      if (trafficResult.status === 'fulfilled') data.traffic = trafficResult.value;

      // Batch 3: SERP + Competitor analysis
      setProgress('Phase 3/4 — Competition & SERP analysis...');
      const [serpResult, competitorKws] = await Promise.allSettled([
        scrapeGoogleSERP(domain, { maxResults: 10, countryCode: 'in' }),
        getCompetitorKeywords(domain),
      ]);
      if (serpResult.status === 'fulfilled' && serpResult.value?.[0]) {
        data.competitors = (serpResult.value[0].organicResults || []).slice(0, 10);
      }
      if (competitorKws.status === 'fulfilled') data.contentGaps = competitorKws.value || [];

      setResults(data);
      setStep(2);

      // Batch 4: AI comprehensive report
      if (isApiKeySet()) {
        setProgress('Phase 4/4 — AI generating strategic report...');
        await generateAIReport(data);
      }

      setProgress('');
      setToast({ message: 'Full website analysis complete!', type: 'success' });
    } catch (e) {
      setToast({ message: `Analysis error: ${e.message}`, type: 'error' });
      if (data.siteAudit || data.domainOverview) { setResults(data); setStep(2); }
    }
    setLoading(false);
  };

  const generateAIReport = async (data) => {
    setLoadingAI(true);
    try {
      const auditSummary = data.siteAudit ? `Health: ${data.siteAudit.healthScore}/100, Pages: ${data.siteAudit.pagesCrawled}, Critical: ${data.siteAudit.summary?.criticalIssues || 0}, Warnings: ${data.siteAudit.summary?.warnings || 0}, Missing titles: ${data.siteAudit.summary?.missingTitles || 0}, Missing descriptions: ${data.siteAudit.summary?.missingDescriptions || 0}, Avg words/page: ${data.siteAudit.avgWordsPerPage || 0}` : 'No crawl data';
      const vitalsSummary = data.vitals ? `Performance: ${data.vitals.scores?.performance || '?'}/100, Accessibility: ${data.vitals.scores?.accessibility || '?'}, SEO: ${data.vitals.scores?.seo || '?'}, FCP: ${data.vitals.metrics?.FCP || '?'}, LCP: ${data.vitals.metrics?.LCP || '?'}, CLS: ${data.vitals.metrics?.CLS || '?'}` : 'No vitals';
      const kwSummary = data.keywords.slice(0, 15).map(k => k.keyword).join(', ');
      const blSummary = data.backlinks ? `Est. backlinks: ${data.backlinks.estimatedBacklinks}, DR: ${data.backlinks.domainRank || '?'}` : 'No backlink data';
      const trafficSummary = data.traffic ? `Est. monthly traffic: ${data.traffic.estimatedTraffic || '?'}, Top pages: ${(data.traffic.topPages || []).slice(0, 3).map(p => p.url || p.page).join(', ')}` : 'No traffic data';
      const competitorSummary = data.competitors.slice(0, 5).map((c, i) => `${i + 1}. ${c.title} — ${c.url}`).join('\n');
      const issuesSummary = (data.siteAudit?.issues || []).slice(0, 15).map(i => `[${i.type}] ${i.title}`).join(', ');

      const result = await callClaude({
        system: `You are a world-class SEO consultant (equal to Ahrefs + SEMrush + Moz combined) analyzing a website. Powered by Protocol Marketing Skills Engine.

${KIRO_CONTEXT}

SEO AUDIT FRAMEWORK (Priority Order):
1. Crawlability & Indexation — robots.txt, XML sitemap, site architecture, crawl budget
2. Technical Foundations — Core Web Vitals (LCP <2.5s, INP <200ms, CLS <0.1), HTTPS, mobile-first
3. On-Page Optimization — Title tags (50-60 chars, keyword first), meta descriptions (150-160 chars + CTA), heading hierarchy
4. Content Quality — E-E-A-T signals, keyword targeting, internal linking, image optimization
5. Authority & Links — Backlink profile, domain authority, competitor comparison

CONTENT STRATEGY LENS: Is content SEARCHABLE (captures demand) or SHAREABLE (creates demand)?
AI SEO: Consider visibility in ChatGPT, Perplexity, Google AI Overviews.
PROGRAMMATIC OPPORTUNITIES: Recipe pages, ingredient pages, comparison pages, city-specific delivery pages.

Produce a comprehensive, actionable report. Include SPECIFIC numbers, benchmarks, and prioritized recommendations. Be harsh and honest — no generic advice.

Return JSON:
{
  "overallGrade": "A/B/C/D/F",
  "healthScore": 0-100,
  "executiveSummary": "3-4 sentence brutally honest assessment",
  "scores": { "technical": 0-100, "content": 0-100, "authority": 0-100, "ux": 0-100 },
  "topKeywords": [{"keyword": "", "volume": "", "difficulty": "", "currentRank": "", "opportunity": ""}],
  "criticalFixes": [{"issue": "", "impact": "High/Medium", "effort": "hours/days/weeks", "howToFix": ""}],
  "quickWins": [{"action": "", "expectedResult": "", "timeframe": ""}],
  "contentStrategy": {"gaps": [""], "topicClusters": [""], "contentCalendarIdeas": [""], "programmaticOpportunities": [""]},
  "competitiveAnalysis": {"mainCompetitors": [""], "whatTheyDoBetter": [""], "yourAdvantages": [""]},
  "technicalIssues": [{"issue": "", "severity": "", "fix": ""}],
  "monthlyRoadmap": [{"month": 1, "focus": "", "expectedResult": "", "tasks": [""]}],
  "estimatedImpact": "Expected traffic/ranking improvement in 3-6 months",
  "aiSearchVisibility": {"score": 0-100, "recommendations": [""]}
}`,
        messages: [{ role: 'user', content: `Full analysis for: ${data.domain}\n\nSITE AUDIT:\n${auditSummary}\n\nCORE WEB VITALS:\n${vitalsSummary}\n\nKEYWORDS:\n${kwSummary}\n\nBACKLINKS:\n${blSummary}\n\nTRAFFIC:\n${trafficSummary}\n\nTOP COMPETITORS:\n${competitorSummary}\n\nISSUES:\n${issuesSummary}\n\nContext: This is an Indian clean-label FMCG food brand. Target: Indian consumers interested in healthy, preservative-free ready-to-eat/cook food.` }],
        maxTokens: 5000,
        temperature: 0.4
      });
      try {
        setAiReport(JSON.parse(result.content));
      } catch {
        const m = result.content.match(/\{[\s\S]*\}/);
        if (m) setAiReport(JSON.parse(m[0]));
      }
    } catch (e) { console.error('AI report failed:', e); }
    setLoadingAI(false);
  };

  const getGradeColor = (g) => g === 'A' ? '#059669' : g === 'B' ? '#3b82f6' : g === 'C' ? '#f59e0b' : '#ef4444';
  const getScoreColor = (s) => s >= 80 ? '#059669' : s >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <>
      <div className="page-header">
        <div><h1>Website Analysis</h1><p className="page-header-sub">Complete SEO audit, keyword research, competitor analysis, and strategic roadmap — all in one</p></div>
      </div>
      <div className="page-body">
        {/* Input */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ padding: 20 }}>
            <label className="label">Enter your website URL</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" value={url} onChange={e => setUrl(e.target.value)} placeholder="kirofoods.com" style={{ flex: 1, fontSize: 15 }} onKeyDown={e => e.key === 'Enter' && !loading && runFullAnalysis()} />
              <button className="btn btn-primary" onClick={runFullAnalysis} disabled={loading || !url.trim()} style={{ height: 44, fontSize: 14, padding: '0 24px', whiteSpace: 'nowrap' }}>
                {loading ? <><LoadingDots /> Analyzing...</> : <><Radar size={16} /> Run Full Analysis</>}
              </button>
            </div>
            {!isApifyTokenSet() && <div style={{ marginTop: 10, fontSize: 11, color: 'var(--warning)' }}>Note: Apify token needed for SERP/crawl data. Some features use AI estimation without it.</div>}
          </div>
        </div>

        {/* Progress */}
        {loading && progress && (
          <div className="card" style={{ marginBottom: 16, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10, borderLeft: '3px solid var(--accent)' }}>
            <RefreshCw size={16} className="spin" style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>{progress}</span>
          </div>
        )}

        {/* Results */}
        {step === 2 && results && (
          <>
            {/* AI Report — Grade + Executive Summary */}
            {loadingAI && (
              <div className="card" style={{ marginBottom: 16, padding: 20, display: 'flex', alignItems: 'center', gap: 12, borderLeft: '3px solid var(--accent)' }}>
                <RefreshCw size={16} className="spin" style={{ color: 'var(--accent)' }} />
                <span style={{ fontSize: 13, color: 'var(--accent)' }}>AI is generating your strategic report...</span>
              </div>
            )}
            {aiReport && (
              <>
                <div className="card" style={{ marginBottom: 16, borderLeft: `4px solid ${getGradeColor(aiReport.overallGrade)}` }}>
                  <div style={{ padding: 20, display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ width: 80, height: 80, borderRadius: 16, background: `${getGradeColor(aiReport.overallGrade)}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 42, fontWeight: 800, color: getGradeColor(aiReport.overallGrade), flexShrink: 0 }}>
                      {aiReport.overallGrade}
                    </div>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{results.domain} — SEO Report</div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{aiReport.executiveSummary}</div>
                    </div>
                  </div>
                  {/* Score bars */}
                  {aiReport.scores && (
                    <div style={{ padding: '0 20px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                      {[['Technical', aiReport.scores.technical], ['Content', aiReport.scores.content], ['Authority', aiReport.scores.authority], ['UX', aiReport.scores.ux]].map(([label, score]) => (
                        <div key={label} style={{ padding: 14, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                          <div style={{ fontSize: 28, fontWeight: 700, color: getScoreColor(score || 0) }}>{score || '—'}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Top Keywords + Opportunities */}
                {(aiReport.topKeywords || []).length > 0 && (
                  <div className="card" style={{ marginBottom: 16 }}>
                    <div className="card-header"><h3 className="card-title">Target Keywords &amp; Opportunities</h3></div>
                    <div style={{ overflow: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead><tr style={{ borderBottom: '2px solid var(--border)' }}>
                          <th style={{ textAlign: 'left', padding: 10 }}>Keyword</th>
                          <th style={{ textAlign: 'center', padding: 10 }}>Volume</th>
                          <th style={{ textAlign: 'center', padding: 10 }}>Difficulty</th>
                          <th style={{ textAlign: 'center', padding: 10 }}>Current Rank</th>
                          <th style={{ textAlign: 'left', padding: 10 }}>Opportunity</th>
                        </tr></thead>
                        <tbody>
                          {aiReport.topKeywords.map((kw, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: 10, fontWeight: 500 }}>{kw.keyword}</td>
                              <td style={{ padding: 10, textAlign: 'center' }}>{kw.volume}</td>
                              <td style={{ padding: 10, textAlign: 'center' }}><span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 8, background: kw.difficulty === 'Easy' || kw.difficulty?.includes?.('Low') ? '#05966920' : kw.difficulty === 'Hard' || kw.difficulty?.includes?.('High') ? '#ef444420' : '#f59e0b20', color: kw.difficulty === 'Easy' || kw.difficulty?.includes?.('Low') ? '#059669' : kw.difficulty === 'Hard' || kw.difficulty?.includes?.('High') ? '#ef4444' : '#f59e0b', fontWeight: 600 }}>{kw.difficulty}</span></td>
                              <td style={{ padding: 10, textAlign: 'center', fontWeight: 600 }}>{kw.currentRank || '—'}</td>
                              <td style={{ padding: 10, fontSize: 11, color: 'var(--text-secondary)' }}>{kw.opportunity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Critical Fixes */}
                {(aiReport.criticalFixes || []).length > 0 && (
                  <div className="card" style={{ marginBottom: 16 }}>
                    <div className="card-header"><h3 className="card-title" style={{ color: 'var(--error)' }}>Critical Fixes (Do These First)</h3></div>
                    {aiReport.criticalFixes.map((f, i) => (
                      <div key={i} style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{i + 1}. {f.issue}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{f.howToFix}</div>
                          </div>
                          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: f.impact === 'High' ? '#ef444420' : '#f59e0b20', color: f.impact === 'High' ? '#ef4444' : '#f59e0b', fontWeight: 600 }}>{f.impact}</span>
                            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>{f.effort}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Quick Wins */}
                {(aiReport.quickWins || []).length > 0 && (
                  <div className="card" style={{ marginBottom: 16 }}>
                    <div className="card-header"><h3 className="card-title" style={{ color: '#059669' }}>Quick Wins</h3></div>
                    {aiReport.quickWins.map((w, i) => (
                      <div key={i} style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                        <span style={{ fontWeight: 500 }}>✓ {w.action}</span>
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                          <span style={{ fontSize: 10, color: '#059669', fontWeight: 600 }}>{w.expectedResult}</span>
                          <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{w.timeframe}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Content Strategy */}
                {aiReport.contentStrategy && (
                  <div className="card" style={{ marginBottom: 16 }}>
                    <div className="card-header"><h3 className="card-title">Content Strategy</h3></div>
                    <div style={{ padding: 20 }}>
                      {(aiReport.contentStrategy.gaps || []).length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--error)', marginBottom: 8 }}>Content Gaps</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {aiReport.contentStrategy.gaps.map((g, i) => <span key={i} style={{ fontSize: 11, padding: '4px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: 8, color: 'var(--text-secondary)' }}>{g}</span>)}
                          </div>
                        </div>
                      )}
                      {(aiReport.contentStrategy.topicClusters || []).length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', marginBottom: 8 }}>Topic Clusters to Build</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {aiReport.contentStrategy.topicClusters.map((t, i) => <span key={i} style={{ fontSize: 11, padding: '4px 12px', background: 'rgba(99,102,241,0.1)', borderRadius: 8, color: 'var(--accent)' }}>{t}</span>)}
                          </div>
                        </div>
                      )}
                      {(aiReport.contentStrategy.contentCalendarIdeas || []).length > 0 && (
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#059669', marginBottom: 8 }}>Content Calendar Ideas</div>
                          {aiReport.contentStrategy.contentCalendarIdeas.map((c, i) => <div key={i} style={{ fontSize: 12, padding: '6px 0', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>{i + 1}. {c}</div>)}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Competitive Analysis */}
                {aiReport.competitiveAnalysis && (
                  <div className="card" style={{ marginBottom: 16 }}>
                    <div className="card-header"><h3 className="card-title">Competitive Landscape</h3></div>
                    <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: 8 }}>MAIN COMPETITORS</div>
                        {(aiReport.competitiveAnalysis.mainCompetitors || []).map((c, i) => <div key={i} style={{ fontSize: 12, padding: '4px 0', color: 'var(--text-secondary)' }}>{i + 1}. {c}</div>)}
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--error)', marginBottom: 8 }}>WHAT THEY DO BETTER</div>
                        {(aiReport.competitiveAnalysis.whatTheyDoBetter || []).map((c, i) => <div key={i} style={{ fontSize: 12, padding: '4px 0', color: 'var(--text-secondary)' }}>• {c}</div>)}
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#059669', marginBottom: 8 }}>YOUR ADVANTAGES</div>
                        {(aiReport.competitiveAnalysis.yourAdvantages || []).map((c, i) => <div key={i} style={{ fontSize: 12, padding: '4px 0', color: 'var(--text-secondary)' }}>• {c}</div>)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Monthly Roadmap */}
                {(aiReport.monthlyRoadmap || []).length > 0 && (
                  <div className="card" style={{ marginBottom: 16 }}>
                    <div className="card-header"><h3 className="card-title">6-Month SEO Roadmap</h3></div>
                    {aiReport.monthlyRoadmap.map((m, i) => (
                      <div key={i} style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                          <span style={{ fontSize: 11, padding: '3px 12px', borderRadius: 8, background: 'var(--accent)', color: '#fff', fontWeight: 700 }}>Month {m.month}</span>
                          <span style={{ fontSize: 14, fontWeight: 600 }}>{m.focus}</span>
                          {m.expectedResult && <span style={{ fontSize: 10, color: '#059669', marginLeft: 'auto' }}>{m.expectedResult}</span>}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {(m.tasks || []).map((t, j) => <span key={j} style={{ fontSize: 10, padding: '4px 10px', background: 'var(--bg-tertiary)', borderRadius: 6, color: 'var(--text-secondary)' }}>{t}</span>)}
                        </div>
                      </div>
                    ))}
                    {aiReport.estimatedImpact && (
                      <div style={{ padding: '14px 20px', background: 'rgba(5,150,105,0.06)', borderTop: '2px solid #059669' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#059669' }}>ESTIMATED IMPACT</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{aiReport.estimatedImpact}</div>
                      </div>
                    )}
                  </div>
                )}

                <button className="btn btn-secondary" onClick={() => generateAIReport(results)} disabled={loadingAI} style={{ marginBottom: 16 }}>
                  <RefreshCw size={14} /> Regenerate AI Report
                </button>
              </>
            )}

            {/* Raw data cards — collapsible */}
            {results.siteAudit && (
              <details className="card" style={{ marginBottom: 16 }}>
                <summary style={{ padding: '14px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                  Site Crawl — {results.siteAudit.healthScore}/100 health, {results.siteAudit.pagesCrawled} pages, {results.siteAudit.issues?.length || 0} issues
                </summary>
                <div style={{ padding: '0 20px 16px' }}>
                  <div className="grid-4" style={{ marginBottom: 12 }}>
                    <div className="stat-card"><span className="stat-card-label">Health</span><span className="stat-card-value" style={{ color: getScoreColor(results.siteAudit.healthScore) }}>{results.siteAudit.healthScore}</span></div>
                    <div className="stat-card"><span className="stat-card-label">Pages</span><span className="stat-card-value">{results.siteAudit.pagesCrawled}</span></div>
                    <div className="stat-card"><span className="stat-card-label">Critical</span><span className="stat-card-value" style={{ color: 'var(--error)' }}>{results.siteAudit.summary?.criticalIssues || 0}</span></div>
                    <div className="stat-card"><span className="stat-card-label">Warnings</span><span className="stat-card-value" style={{ color: 'var(--warning)' }}>{results.siteAudit.summary?.warnings || 0}</span></div>
                  </div>
                  {(results.siteAudit.issues || []).slice(0, 10).map((issue, i) => (
                    <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 12, display: 'flex', gap: 8 }}>
                      <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: issue.type === 'critical' ? 'var(--error)' : issue.type === 'warning' ? 'var(--warning)' : 'var(--info)', color: '#fff', fontWeight: 600, flexShrink: 0 }}>{issue.type}</span>
                      <span>{issue.title}: {issue.description}</span>
                    </div>
                  ))}
                </div>
              </details>
            )}

            {results.vitals && (
              <details className="card" style={{ marginBottom: 16 }}>
                <summary style={{ padding: '14px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                  Core Web Vitals — Performance: {results.vitals.scores?.performance || '?'}/100
                </summary>
                <div style={{ padding: '0 20px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 10 }}>
                  {[['Perf', results.vitals.scores?.performance], ['A11y', results.vitals.scores?.accessibility], ['Best Practices', results.vitals.scores?.bestPractices], ['SEO', results.vitals.scores?.seo], ['FCP', results.vitals.metrics?.FCP], ['LCP', results.vitals.metrics?.LCP], ['CLS', results.vitals.metrics?.CLS], ['TBT', results.vitals.metrics?.TBT]].map(([label, val], i) => (
                    <div key={i} style={{ textAlign: 'center', padding: 10, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: typeof val === 'number' && val <= 100 ? getScoreColor(val) : 'var(--accent)' }}>{val || '—'}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{label}</div>
                    </div>
                  ))}
                </div>
              </details>
            )}

            {results.keywords.length > 0 && (
              <details className="card" style={{ marginBottom: 16 }}>
                <summary style={{ padding: '14px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                  Keywords Found — {results.keywords.length} suggestions
                </summary>
                <div style={{ padding: '0 16px 16px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {results.keywords.slice(0, 30).map((kw, i) => (
                    <span key={i} style={{ fontSize: 11, padding: '4px 10px', background: 'var(--bg-tertiary)', borderRadius: 12, color: 'var(--text-secondary)' }}>{kw.keyword}</span>
                  ))}
                </div>
              </details>
            )}

            {results.competitors.length > 0 && (
              <details className="card" style={{ marginBottom: 16 }}>
                <summary style={{ padding: '14px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                  Top SERP Competitors — {results.competitors.length} results
                </summary>
                <div style={{ padding: '0 16px 16px' }}>
                  {results.competitors.map((c, i) => (
                    <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                      <div style={{ fontWeight: 600, color: 'var(--info)' }}>#{c.position || i + 1} {c.title}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{c.url}</div>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </>
        )}

        {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      </div>
    </>
  );
}

// =============================================
// BRAND MONITORING
// =============================================
function BrandMonitoring() {
  const [brand, setBrand] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [toast, setToast] = useState(null);

  const handleMonitor = async () => {
    if (!brand.trim()) return;
    setLoading(true);
    setData(null);
    try {
      const apifyToken = localStorage.getItem('kj_apify_token');
      if (!apifyToken) throw new Error('Apify token required');
      const { scrapeGoogleSERP } = await import('./utils/apify.js');

      const queries = [
        `"${brand.trim()}"`,
        `"${brand.trim()}" review`,
        `"${brand.trim()}" news`,
      ];

      const results = await scrapeGoogleSERP({ queries, countryCode: 'in', resultsPerPage: 10 });

      const allMentions = [];
      const seenUrls = new Set();
      results.forEach(serp => {
        serp.organicResults.forEach(r => {
          if (!seenUrls.has(r.url)) {
            seenUrls.add(r.url);
            let mentionType = 'General';
            if (r.url.includes('news') || r.url.includes('article')) mentionType = 'News';
            else if (r.url.includes('review') || r.url.includes('rating')) mentionType = 'Review';
            else if (r.url.includes('reddit') || r.url.includes('quora') || r.url.includes('forum')) mentionType = 'Forum';
            else if (r.url.includes('youtube') || r.url.includes('video')) mentionType = 'Video';
            allMentions.push({ ...r, mentionType, query: serp.query, domain: (() => { try { return new URL(r.url).hostname; } catch { return ''; } })() });
          }
        });
      });

      const totalMentions = results.reduce((s, r) => s + (r.totalResults || 0), 0);
      const relatedSearches = results.flatMap(r => r.relatedSearches || []).filter((v, i, a) => a.indexOf(v) === i);

      setData({ brand: brand.trim(), mentions: allMentions, totalMentions, relatedSearches });
      setToast({ message: `Found ${allMentions.length} unique mentions`, type: 'success' });
    } catch (e) { setToast({ message: e.message, type: 'error' }); }
    setLoading(false);
  };

  const typeColor = (t) => ({ News: 'var(--info)', Review: 'var(--warning)', Forum: '#9c27b0', Video: 'var(--error)', General: 'var(--text-tertiary)' }[t] || 'var(--text-tertiary)');

  return (
    <>
      <div className="page-header">
        <div><h1>Brand Monitoring</h1><p className="page-header-sub">Track brand mentions, reviews &amp; news across the web</p></div>
      </div>
      <div className="page-body">
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label className="label">Brand Name</label>
              <input className="input" value={brand} onChange={e => setBrand(e.target.value)} placeholder="Your Brand Name" onKeyDown={e => e.key === 'Enter' && handleMonitor()} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn btn-primary" onClick={handleMonitor} disabled={loading || !brand.trim()} style={{ height: 40 }}>
                {loading ? <><LoadingDots /> Scanning...</> : <><Megaphone size={16} /> Monitor</>}
              </button>
            </div>
          </div>
        </div>

        {data && (
          <>
            <div className="grid-4" style={{ marginBottom: 20 }}>
              <div className="stat-card"><span className="stat-card-label">Brand</span><span className="stat-card-value" style={{ fontSize: 16 }}>{data.brand}</span></div>
              <div className="stat-card"><span className="stat-card-label">Est. Total Mentions</span><span className="stat-card-value">{(data.totalMentions || 0).toLocaleString()}</span></div>
              <div className="stat-card"><span className="stat-card-label">Unique Sources</span><span className="stat-card-value">{data.mentions.length}</span></div>
              <div className="stat-card"><span className="stat-card-label">Related Searches</span><span className="stat-card-value">{data.relatedSearches.length}</span></div>
            </div>

            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header"><h3 className="card-title">Mentions</h3></div>
              {data.mentions.map((m, i) => (
                <div key={i} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12 }}>
                  <span className="badge" style={{ background: typeColor(m.mentionType), color: '#fff', fontSize: 10, flexShrink: 0, alignSelf: 'flex-start' }}>{m.mentionType}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <a href={m.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--info)', textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>{m.title}</a>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{m.domain}</div>
                    {m.description && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{m.description.substring(0, 160)}</div>}
                  </div>
                </div>
              ))}
            </div>

            {data.relatedSearches.length > 0 && (
              <div className="card">
                <div className="card-header"><h3 className="card-title">Related Searches</h3></div>
                <div style={{ padding: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {data.relatedSearches.map((r, i) => (
                    <span key={i} className="badge" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', padding: '6px 12px', fontSize: 12, borderRadius: 20 }}>{r}</span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        {data && <AnalysisSummary title="Brand Monitoring & Strategy Analysis" insights={generateBrandInsights(data)} summary={`Brand "${data.brand}": ${data.totalMentions || 0} total mentions across ${[...new Set((data.mentions || []).map(m => m.source))].length} sources. ${(data.relatedSearches || []).length} related searches.`} />}
        {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      </div>
    </>
  );
}

// =============================================
// INSTAGRAM SCRAPER
// =============================================
function InstagramScraper() {
  const [mode, setMode] = useState('profile'); // profile, hashtag
  const [input, setInput] = useState('');
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [toast, setToast] = useState(null);
  const [insights, setInsights] = useState([]);

  const handleScrape = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setResults([]);
    setInsights([]);
    try {
      let data;
      if (mode === 'profile') {
        data = await scrapeInstagramProfile({ usernames: input.split(',').map(s => s.trim().replace('@', '')), resultsLimit: limit });
      } else {
        data = await scrapeInstagramHashtag({ hashtags: input.split(',').map(s => s.trim().replace('#', '')), resultsLimit: limit });
      }
      setResults(data);
      setInsights(generateInstagramInsights(data));
      setToast({ message: `Scraped ${data.length} Instagram posts`, type: 'success' });
    } catch (e) {
      setToast({ message: e.message, type: 'error' });
    }
    setLoading(false);
  };

  const exportCSV = () => {
    const headers = ['Username', 'Caption', 'Likes', 'Comments', 'Type', 'URL', 'Hashtags', 'Date'];
    const rows = results.map(r => [r.ownerUsername, `"${(r.caption || '').replace(/"/g, '""').substring(0, 200)}"`, r.likes, r.comments, r.isVideo ? 'Video' : 'Image', r.url, (r.hashtags || []).join(' '), r.timestamp]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `instagram_${mode}_${Date.now()}.csv`; a.click();
  };

  return (
    <>
      <div className="page-header">
        <div><h1>Instagram Scraper</h1><p className="page-header-sub">Scrape profiles and hashtags for posts, engagement, and content analysis</p></div>
      </div>
      <div className="page-body">
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button className={`btn btn-sm ${mode === 'profile' ? 'btn-primary' : ''}`} onClick={() => setMode('profile')}>Profile</button>
            <button className={`btn btn-sm ${mode === 'hashtag' ? 'btn-primary' : ''}`} onClick={() => setMode('hashtag')}>Hashtag</button>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 250 }}>
              <label className="label">{mode === 'profile' ? 'Username(s)' : 'Hashtag(s)'}</label>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input className="input" value={input} onChange={e => setInput(e.target.value)}
                  placeholder={mode === 'profile' ? 'e.g., kirofoods, tfresco_' : 'e.g., healthyfood, cleaneating'}
                  onKeyDown={e => e.key === 'Enter' && handleScrape()} style={{ flex: 1 }} />
                <VoiceMicButton onResult={t => setInput(t)} />
              </div>
            </div>
            <div style={{ width: 100 }}>
              <label className="label">Max Posts</label>
              <input className="input" type="number" value={limit} onChange={e => setLimit(parseInt(e.target.value) || 20)} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn btn-primary" onClick={handleScrape} disabled={loading || !input.trim()} style={{ height: 40 }}>
                {loading ? <LoadingDots /> : <><Instagram size={16} /> Scrape</>}
              </button>
            </div>
          </div>
        </div>

        {/* Profile Info */}
        {results.length > 0 && results[0]?.ownerUsername && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700 }}>@{results[0].ownerUsername}</div>
                {results[0].ownerIsVerified && <span className="badge" style={{ background: '#3b82f6', color: '#fff', fontSize: 10 }}>Verified</span>}
              </div>
              <div className="grid-4" style={{ flex: 1 }}>
                <div className="stat-card"><span className="stat-card-label">Followers</span><span className="stat-card-value">{(results[0].ownerFollowers || 0).toLocaleString()}</span></div>
                <div className="stat-card"><span className="stat-card-label">Following</span><span className="stat-card-value">{(results[0].ownerFollowing || 0).toLocaleString()}</span></div>
                <div className="stat-card"><span className="stat-card-label">Posts</span><span className="stat-card-value">{(results[0].ownerPosts || results.length).toLocaleString()}</span></div>
                <div className="stat-card"><span className="stat-card-label">Avg Likes</span><span className="stat-card-value">{Math.round(results.reduce((s, p) => s + p.likes, 0) / results.length).toLocaleString()}</span></div>
              </div>
            </div>
          </div>
        )}

        {results.length > 0 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{results.length} posts</span>
              <button className="btn btn-sm" onClick={exportCSV}><Download size={14} /> Export CSV</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
              {results.map((post, i) => (
                <div key={i} className="card" style={{ padding: 12 }}>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {post.imageUrl && <img src={post.imageUrl} alt="" style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover' }} loading="lazy" />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>@{post.ownerUsername}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                        {post.caption || '(no caption)'}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 11, color: 'var(--text-tertiary)' }}>
                    <span><Heart size={11} /> {post.likes.toLocaleString()}</span>
                    <span><MessageSquare size={11} /> {post.comments.toLocaleString()}</span>
                    <span>{post.isVideo ? '🎥 Video' : '📷 Image'}</span>
                    {post.timestamp && <span>{new Date(post.timestamp).toLocaleDateString()}</span>}
                  </div>
                  {(post.hashtags || []).length > 0 && (
                    <div style={{ marginTop: 6, fontSize: 10, color: 'var(--accent)' }}>{post.hashtags.slice(0, 8).map(h => `#${h}`).join(' ')}</div>
                  )}
                  <a href={post.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: 'var(--accent)', marginTop: 4, display: 'inline-block' }}>View on Instagram →</a>
                </div>
              ))}
            </div>
          </>
        )}
        {insights.length > 0 && <AnalysisSummary title="Instagram Analysis" insights={insights} />}
        {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      </div>
    </>
  );
}

// =============================================
// FACEBOOK / META SCRAPER
// =============================================
function FacebookScraper() {
  const [input, setInput] = useState('');
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [toast, setToast] = useState(null);
  const [insights, setInsights] = useState([]);

  const handleScrape = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setResults([]);
    setInsights([]);
    try {
      const urls = input.split('\n').map(s => s.trim()).filter(Boolean);
      const data = await scrapeFacebookPage({ urls, resultsLimit: limit });
      setResults(data);
      setInsights(generateFacebookInsights(data));
      setToast({ message: `Scraped ${data.length} Facebook posts`, type: 'success' });
    } catch (e) {
      setToast({ message: e.message, type: 'error' });
    }
    setLoading(false);
  };

  const exportCSV = () => {
    const headers = ['Page', 'Text', 'Likes', 'Comments', 'Shares', 'Type', 'URL', 'Date'];
    const rows = results.map(r => [r.pageTitle, `"${(r.text || '').replace(/"/g, '""').substring(0, 200)}"`, r.likes, r.comments, r.shares, r.type, r.url, r.timestamp]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `facebook_posts_${Date.now()}.csv`; a.click();
  };

  return (
    <>
      <div className="page-header">
        <div><h1>Facebook / Meta Scraper</h1><p className="page-header-sub">Scrape Facebook pages for posts, engagement metrics, and content analysis</p></div>
      </div>
      <div className="page-body">
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 250 }}>
              <label className="label">Facebook Page URL(s) — one per line</label>
              <textarea className="input" value={input} onChange={e => setInput(e.target.value)} rows={3}
                placeholder="https://www.facebook.com/kirofoods&#10;https://www.facebook.com/competitor" />
            </div>
            <div style={{ width: 100 }}>
              <label className="label">Max Posts</label>
              <input className="input" type="number" value={limit} onChange={e => setLimit(parseInt(e.target.value) || 20)} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn btn-primary" onClick={handleScrape} disabled={loading || !input.trim()} style={{ height: 40 }}>
                {loading ? <LoadingDots /> : <><Facebook size={16} /> Scrape</>}
              </button>
            </div>
          </div>
        </div>

        {results.length > 0 && (
          <>
            <div className="grid-4" style={{ marginBottom: 16 }}>
              <div className="stat-card"><span className="stat-card-label">Total Posts</span><span className="stat-card-value">{results.length}</span></div>
              <div className="stat-card"><span className="stat-card-label">Total Likes</span><span className="stat-card-value">{results.reduce((s, r) => s + r.likes, 0).toLocaleString()}</span></div>
              <div className="stat-card"><span className="stat-card-label">Total Shares</span><span className="stat-card-value">{results.reduce((s, r) => s + r.shares, 0).toLocaleString()}</span></div>
              <div className="stat-card"><span className="stat-card-label">Total Comments</span><span className="stat-card-value">{results.reduce((s, r) => s + r.comments, 0).toLocaleString()}</span></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <button className="btn btn-sm" onClick={exportCSV}><Download size={14} /> Export CSV</button>
            </div>
            <div className="card">
              <div className="table-container">
                <table className="table">
                  <thead><tr><th>Page</th><th>Post Text</th><th style={{ textAlign: 'center' }}>Likes</th><th style={{ textAlign: 'center' }}>Comments</th><th style={{ textAlign: 'center' }}>Shares</th><th>Date</th></tr></thead>
                  <tbody>
                    {results.map((r, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600, fontSize: 12 }}>{r.pageTitle || 'N/A'}</td>
                        <td style={{ fontSize: 11, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(r.text || '').substring(0, 150)}</td>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{r.likes.toLocaleString()}</td>
                        <td style={{ textAlign: 'center' }}>{r.comments.toLocaleString()}</td>
                        <td style={{ textAlign: 'center' }}>{r.shares.toLocaleString()}</td>
                        <td style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{r.timestamp ? new Date(r.timestamp).toLocaleDateString() : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
        {insights.length > 0 && <AnalysisSummary title="Facebook Analysis" insights={insights} />}
        {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      </div>
    </>
  );
}

// =============================================
// FACEBOOK ADS LIBRARY SCRAPER
// =============================================
function FBAdsLibraryScraper() {
  const [searchTerm, setSearchTerm] = useState('');
  const [country, setCountry] = useState('IN');
  const [limit, setLimit] = useState(30);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [toast, setToast] = useState(null);
  const [insights, setInsights] = useState([]);
  const [filterActive, setFilterActive] = useState('all');

  const handleScrape = async () => {
    if (!searchTerm.trim()) return;
    setLoading(true);
    setResults([]);
    setInsights([]);
    try {
      const data = await scrapeFacebookAdsLibrary({ searchTerms: searchTerm.trim(), country, limit });
      setResults(data);
      setInsights(generateFBAdsInsights(data));
      setToast({ message: `Found ${data.length} ads`, type: 'success' });
    } catch (e) {
      setToast({ message: e.message, type: 'error' });
    }
    setLoading(false);
  };

  const filtered = results.filter(a => {
    if (filterActive === 'active') return a.isActive;
    if (filterActive === 'inactive') return !a.isActive;
    return true;
  });

  const exportCSV = () => {
    const headers = ['Page', 'Title', 'Body', 'Active', 'Start Date', 'End Date', 'Platforms', 'URL'];
    const rows = filtered.map(r => [r.pageName, `"${(r.adCreativeTitle || '').replace(/"/g, '""')}"`, `"${(r.adCreativeBody || '').replace(/"/g, '""').substring(0, 200)}"`, r.isActive ? 'Yes' : 'No', r.startDate, r.endDate || '', (r.platforms || []).join(', '), r.adUrl]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `fb_ads_library_${Date.now()}.csv`; a.click();
  };

  return (
    <>
      <div className="page-header">
        <div><h1>Facebook Ads Library</h1><p className="page-header-sub">Search Facebook's Ad Library to spy on competitor ads, creatives, and strategies</p></div>
      </div>
      <div className="page-body">
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 250 }}>
              <label className="label">Search Term / Brand</label>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input className="input" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  placeholder="e.g., Kiro Foods, healthy snacks, protein bars"
                  onKeyDown={e => e.key === 'Enter' && handleScrape()} style={{ flex: 1 }} />
                <VoiceMicButton onResult={t => setSearchTerm(t)} />
              </div>
            </div>
            <div style={{ width: 100 }}>
              <label className="label">Country</label>
              <select className="input" value={country} onChange={e => setCountry(e.target.value)}>
                <option value="IN">India</option><option value="US">USA</option><option value="GB">UK</option><option value="AU">Australia</option><option value="ALL">All</option>
              </select>
            </div>
            <div style={{ width: 80 }}>
              <label className="label">Limit</label>
              <input className="input" type="number" value={limit} onChange={e => setLimit(parseInt(e.target.value) || 30)} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn btn-primary" onClick={handleScrape} disabled={loading || !searchTerm.trim()} style={{ height: 40 }}>
                {loading ? <LoadingDots /> : <><Search size={16} /> Search Ads</>}
              </button>
            </div>
          </div>
        </div>

        {results.length > 0 && (
          <>
            <div className="grid-4" style={{ marginBottom: 16 }}>
              <div className="stat-card"><span className="stat-card-label">Total Ads</span><span className="stat-card-value">{results.length}</span></div>
              <div className="stat-card"><span className="stat-card-label">Active</span><span className="stat-card-value" style={{ color: '#059669' }}>{results.filter(a => a.isActive).length}</span></div>
              <div className="stat-card"><span className="stat-card-label">Stopped</span><span className="stat-card-value" style={{ color: '#ef4444' }}>{results.filter(a => !a.isActive).length}</span></div>
              <div className="stat-card"><span className="stat-card-label">Advertisers</span><span className="stat-card-value">{[...new Set(results.map(a => a.pageName))].length}</span></div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {['all', 'active', 'inactive'].map(f => (
                  <button key={f} className={`btn btn-sm ${filterActive === f ? 'btn-primary' : ''}`} onClick={() => setFilterActive(f)} style={{ textTransform: 'capitalize' }}>{f}</button>
                ))}
              </div>
              <button className="btn btn-sm" onClick={exportCSV}><Download size={14} /> Export CSV</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
              {filtered.map((ad, i) => (
                <div key={i} className="card" style={{ padding: 12, borderLeft: `3px solid ${ad.isActive ? '#059669' : '#ef4444'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{ad.pageName}</span>
                    <span className="badge" style={{ background: ad.isActive ? '#059669' : '#ef4444', color: '#fff', fontSize: 9 }}>{ad.isActive ? 'Active' : 'Stopped'}</span>
                  </div>
                  {ad.adCreativeTitle && <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{ad.adCreativeTitle}</div>}
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' }}>
                    {ad.adCreativeBody || '(no copy)'}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-tertiary)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {ad.startDate && <span>Started: {new Date(ad.startDate).toLocaleDateString()}</span>}
                    {ad.endDate && <span>Ended: {new Date(ad.endDate).toLocaleDateString()}</span>}
                    {(ad.platforms || []).length > 0 && <span>Platforms: {ad.platforms.join(', ')}</span>}
                  </div>
                  {ad.adUrl && <a href={ad.adUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: 'var(--accent)', marginTop: 4, display: 'inline-block' }}>View Ad →</a>}
                </div>
              ))}
            </div>
          </>
        )}
        {insights.length > 0 && <AnalysisSummary title="Ad Intelligence Analysis" insights={insights} />}
        {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      </div>
    </>
  );
}

// =============================================
// LINKEDIN SCRAPER
// =============================================
function LinkedInScraper() {
  const [mode, setMode] = useState('profile'); // profile, company
  const [input, setInput] = useState('');
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [toast, setToast] = useState(null);
  const [insights, setInsights] = useState([]);

  const handleScrape = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setResults([]);
    setInsights([]);
    try {
      const urls = input.split('\n').map(s => s.trim()).filter(Boolean);
      let data;
      if (mode === 'profile') {
        data = await scrapeLinkedInProfile({ urls, resultsLimit: limit });
      } else {
        data = await scrapeLinkedInCompany({ urls, resultsLimit: limit });
      }
      setResults(data);
      setInsights(generateLinkedInInsights(data));
      setToast({ message: `Scraped ${data.length} LinkedIn ${mode}s`, type: 'success' });
    } catch (e) {
      setToast({ message: e.message, type: 'error' });
    }
    setLoading(false);
  };

  const exportCSV = () => {
    let headers, rows;
    if (mode === 'profile') {
      headers = ['Name', 'Headline', 'Location', 'Company', 'Title', 'Followers', 'Connections', 'Profile URL'];
      rows = results.map(r => [r.name, `"${(r.headline || '').replace(/"/g, '""')}"`, r.location, r.currentCompany, r.currentTitle, r.followerCount, r.connectionCount, r.profileUrl]);
    } else {
      headers = ['Company', 'Industry', 'Size', 'Headquarters', 'Website', 'Followers', 'Description'];
      rows = results.map(r => [r.name, r.industry, r.companySize, r.headquarters, r.website, r.followerCount, `"${(r.description || '').replace(/"/g, '""').substring(0, 200)}"`]);
    }
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `linkedin_${mode}_${Date.now()}.csv`; a.click();
  };

  return (
    <>
      <div className="page-header">
        <div><h1>LinkedIn Scraper</h1><p className="page-header-sub">Scrape LinkedIn profiles and companies for professional data and competitive intel</p></div>
      </div>
      <div className="page-body">
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button className={`btn btn-sm ${mode === 'profile' ? 'btn-primary' : ''}`} onClick={() => setMode('profile')}>People</button>
            <button className={`btn btn-sm ${mode === 'company' ? 'btn-primary' : ''}`} onClick={() => setMode('company')}>Companies</button>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 300 }}>
              <label className="label">{mode === 'profile' ? 'Profile URL(s)' : 'Company Page URL(s)'} — one per line</label>
              <textarea className="input" value={input} onChange={e => setInput(e.target.value)} rows={3}
                placeholder={mode === 'profile' ? 'https://www.linkedin.com/in/username/' : 'https://www.linkedin.com/company/kiro-foods/'} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={handleScrape} disabled={loading || !input.trim()} style={{ height: 40 }}>
                {loading ? <LoadingDots /> : <><Linkedin size={16} /> Scrape</>}
              </button>
            </div>
          </div>
        </div>

        {results.length > 0 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <button className="btn btn-sm" onClick={exportCSV}><Download size={14} /> Export CSV</button>
            </div>

            {mode === 'profile' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
                {results.map((p, i) => (
                  <div key={i} className="card" style={{ padding: 16 }}>
                    <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                      {p.profileImageUrl && <img src={p.profileImageUrl} alt="" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }} />}
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{p.headline}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{p.location}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 8 }}>
                      <span><strong>{(p.followerCount || 0).toLocaleString()}</strong> followers</span>
                      <span><strong>{(p.connectionCount || 0).toLocaleString()}</strong> connections</span>
                    </div>
                    {p.currentCompany && <div style={{ fontSize: 12 }}><strong>{p.currentTitle}</strong> at {p.currentCompany}</div>}
                    {p.summary && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>{p.summary}</div>}
                    {(p.skills || []).length > 0 && <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>{p.skills.slice(0, 8).map((s, j) => <span key={j} className="badge" style={{ fontSize: 9, padding: '1px 6px' }}>{s}</span>)}</div>}
                    {p.profileUrl && <a href={p.profileUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: 'var(--accent)', marginTop: 6, display: 'inline-block' }}>View Profile →</a>}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
                {results.map((c, i) => (
                  <div key={i} className="card" style={{ padding: 16 }}>
                    <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                      {c.logoUrl && <img src={c.logoUrl} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'contain' }} />}
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div>
                        {c.tagline && <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{c.tagline}</div>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 8, flexWrap: 'wrap' }}>
                      {c.industry && <span>{c.industry}</span>}
                      {c.companySize && <span>{c.companySize} employees</span>}
                      {c.headquarters && <span>{c.headquarters}</span>}
                    </div>
                    <div style={{ fontSize: 11, marginBottom: 8 }}>
                      <strong>{(c.followerCount || 0).toLocaleString()}</strong> followers
                      {c.employeeCount > 0 && <> • <strong>{c.employeeCount.toLocaleString()}</strong> on LinkedIn</>}
                    </div>
                    {c.description && <div style={{ fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>{c.description}</div>}
                    {c.website && <a href={c.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: 'var(--accent)', marginTop: 6, display: 'inline-block' }}>{c.website}</a>}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        {insights.length > 0 && <AnalysisSummary title="LinkedIn Analysis" insights={insights} />}
        {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      </div>
    </>
  );
}

// =============================================
// TWITTER / X SCRAPER
// =============================================
function TwitterScraper() {
  const [mode, setMode] = useState('profile'); // profile, search
  const [input, setInput] = useState('');
  const [limit, setLimit] = useState(30);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [toast, setToast] = useState(null);
  const [insights, setInsights] = useState([]);

  const handleScrape = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setResults([]);
    setInsights([]);
    try {
      let data;
      if (mode === 'profile') {
        const handles = input.split(',').map(s => s.trim().replace('@', '')).filter(Boolean);
        data = await scrapeTwitterProfile({ handles, resultsLimit: limit });
      } else {
        data = await scrapeTwitterSearch({ query: input.trim(), resultsLimit: limit });
      }
      setResults(data);
      setInsights(generateTwitterInsights(data));
      setToast({ message: `Scraped ${data.length} tweets`, type: 'success' });
    } catch (e) {
      setToast({ message: e.message, type: 'error' });
    }
    setLoading(false);
  };

  const exportCSV = () => {
    const headers = ['Author', 'Handle', 'Tweet', 'Likes', 'Retweets', 'Replies', 'Views', 'Hashtags', 'URL', 'Date'];
    const rows = results.map(r => [r.authorName, `@${r.authorHandle}`, `"${(r.text || '').replace(/"/g, '""').substring(0, 200)}"`, r.likes, r.retweets, r.replies, r.views, (r.hashtags || []).join(' '), r.url, r.timestamp]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `twitter_${mode}_${Date.now()}.csv`; a.click();
  };

  return (
    <>
      <div className="page-header">
        <div><h1>Twitter / X Scraper</h1><p className="page-header-sub">Scrape tweets from profiles or search terms for engagement and content analysis</p></div>
      </div>
      <div className="page-body">
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button className={`btn btn-sm ${mode === 'profile' ? 'btn-primary' : ''}`} onClick={() => setMode('profile')}>Profile</button>
            <button className={`btn btn-sm ${mode === 'search' ? 'btn-primary' : ''}`} onClick={() => setMode('search')}>Search</button>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 250 }}>
              <label className="label">{mode === 'profile' ? 'Handle(s) — comma-separated' : 'Search Query'}</label>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input className="input" value={input} onChange={e => setInput(e.target.value)}
                  placeholder={mode === 'profile' ? 'e.g., elonmusk, kirofoods' : 'e.g., healthy snacks India'}
                  onKeyDown={e => e.key === 'Enter' && handleScrape()} style={{ flex: 1 }} />
                <VoiceMicButton onResult={t => setInput(t)} />
              </div>
            </div>
            <div style={{ width: 100 }}>
              <label className="label">Max Tweets</label>
              <input className="input" type="number" value={limit} onChange={e => setLimit(parseInt(e.target.value) || 30)} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn btn-primary" onClick={handleScrape} disabled={loading || !input.trim()} style={{ height: 40 }}>
                {loading ? <LoadingDots /> : <><Twitter size={16} /> Scrape</>}
              </button>
            </div>
          </div>
        </div>

        {results.length > 0 && (
          <>
            <div className="grid-4" style={{ marginBottom: 16 }}>
              <div className="stat-card"><span className="stat-card-label">Tweets</span><span className="stat-card-value">{results.length}</span></div>
              <div className="stat-card"><span className="stat-card-label">Total Likes</span><span className="stat-card-value">{results.reduce((s, r) => s + r.likes, 0).toLocaleString()}</span></div>
              <div className="stat-card"><span className="stat-card-label">Total Retweets</span><span className="stat-card-value">{results.reduce((s, r) => s + r.retweets, 0).toLocaleString()}</span></div>
              <div className="stat-card"><span className="stat-card-label">Total Views</span><span className="stat-card-value">{results.reduce((s, r) => s + r.views, 0).toLocaleString()}</span></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <button className="btn btn-sm" onClick={exportCSV}><Download size={14} /> Export CSV</button>
            </div>

            {results.map((tweet, i) => (
              <div key={i} className="card" style={{ marginBottom: 8, padding: '12px 16px' }}>
                <div style={{ display: 'flex', gap: 10, marginBottom: 6 }}>
                  {tweet.authorProfileImage && <img src={tweet.authorProfileImage} alt="" style={{ width: 36, height: 36, borderRadius: '50%' }} />}
                  <div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{tweet.authorName}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>@{tweet.authorHandle}</span>
                      {tweet.authorVerified && <span style={{ color: '#3b82f6', fontSize: 12 }}>✓</span>}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{tweet.authorFollowers?.toLocaleString()} followers</div>
                  </div>
                  <div style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-tertiary)' }}>
                    {tweet.timestamp ? new Date(tweet.timestamp).toLocaleDateString() : ''}
                  </div>
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 8 }}>{tweet.text}</div>
                {(tweet.hashtags || []).length > 0 && (
                  <div style={{ marginBottom: 6, fontSize: 11, color: 'var(--accent)' }}>{tweet.hashtags.map(h => `#${h}`).join(' ')}</div>
                )}
                <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-tertiary)' }}>
                  <span><Heart size={11} /> {tweet.likes.toLocaleString()}</span>
                  <span><Repeat2 size={11} /> {tweet.retweets.toLocaleString()}</span>
                  <span><MessageSquare size={11} /> {tweet.replies.toLocaleString()}</span>
                  {tweet.views > 0 && <span><Eye size={11} /> {tweet.views.toLocaleString()}</span>}
                </div>
                <a href={tweet.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: 'var(--accent)', marginTop: 4, display: 'inline-block' }}>View on X →</a>
              </div>
            ))}
          </>
        )}
        {insights.length > 0 && <AnalysisSummary title="Twitter / X Analysis" insights={insights} />}
        {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      </div>
    </>
  );
}

// =============================================
// MARKETING SKILLS HUB — All 33 Skills
// =============================================
function MarketingSkillsHub() {
  const categories = getSkillsByCategory();
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [userInput, setUserInput] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const categoryIcons = {
    'Conversion Optimization': Target,
    'Content & Copy': Type,
    'SEO & Discovery': Globe,
    'Paid & Measurement': DollarSign,
    'Retention & Growth': TrendingUp,
    'Sales & GTM': Radar,
    'Strategy': Zap,
    'Research': Microscope,
  };

  const categoryColors = {
    'Conversion Optimization': '#ef4444',
    'Content & Copy': '#8b5cf6',
    'SEO & Discovery': '#22c55e',
    'Paid & Measurement': '#f59e0b',
    'Retention & Growth': '#06b6d4',
    'Sales & GTM': '#3b82f6',
    'Strategy': '#ec4899',
    'Research': '#64748b',
  };

  const handleRunSkill = async () => {
    if (!selectedSkill || !userInput.trim()) return;
    if (!isApiKeySet()) { alert('Set your AI API key in Settings first'); return; }
    setLoading(true);
    setResult('');
    try {
      const systemPrompt = getMarketingPrompt(selectedSkill.key, '');
      const res = await callClaude({
        messages: [{ role: 'user', content: userInput }],
        system: systemPrompt,
        maxTokens: 8192,
        temperature: 0.7,
      });
      setResult(res.content);
    } catch (err) {
      setResult(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Marketing Skills Hub</h2>
      <p style={{ color: '#94a3b8', marginBottom: 24, fontSize: 14 }}>
        33 AI marketing skills powered by coreyhaines31/marketingskills — each with expert-level frameworks, templates, and Kiro Foods context built in.
      </p>

      {!selectedSkill ? (
        <div>
          {Object.entries(categories).map(([category, skills]) => {
            const IconComp = categoryIcons[category] || Zap;
            const color = categoryColors[category] || '#7c3aed';
            return (
              <div key={category} style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <IconComp size={18} style={{ color }} />
                  <h3 style={{ fontSize: 16, fontWeight: 600, color }}>{category}</h3>
                  <span style={{ fontSize: 12, color: '#64748b', background: '#1e293b', padding: '2px 8px', borderRadius: 99 }}>{skills.length} skills</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                  {skills.map(skill => (
                    <button
                      key={skill.key}
                      onClick={() => setSelectedSkill(skill)}
                      style={{
                        background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: '14px 16px',
                        textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
                      }}
                      onMouseOver={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.background = '#1e293b'; }}
                      onMouseOut={e => { e.currentTarget.style.borderColor = '#1e293b'; e.currentTarget.style.background = '#0f172a'; }}
                    >
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{skill.name}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.4 }}>{skill.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div>
          <button onClick={() => { setSelectedSkill(null); setResult(''); setUserInput(''); }} style={{ background: 'none', border: 'none', color: '#7c3aed', cursor: 'pointer', marginBottom: 16, fontSize: 14, display: 'flex', alignItems: 'center', gap: 4 }}>
            ← Back to all skills
          </button>
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 24, marginBottom: 16 }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{selectedSkill.name}</h3>
            <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>{selectedSkill.description}</p>
            <textarea
              value={userInput}
              onChange={e => setUserInput(e.target.value)}
              placeholder={`Describe what you need from the ${selectedSkill.name} skill...\n\nExamples:\n- "Analyze our homepage for conversion optimization"\n- "Write ad copy for our new Paneer Butter Masala product"\n- "Create a 5-email welcome sequence for new subscribers"`}
              style={{ width: '100%', minHeight: 150, background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: 12, color: '#e2e8f0', fontSize: 14, resize: 'vertical' }}
            />
            <button
              onClick={handleRunSkill}
              disabled={loading || !userInput.trim()}
              style={{
                marginTop: 12, padding: '10px 24px', background: loading ? '#334155' : '#7c3aed', color: '#fff',
                border: 'none', borderRadius: 8, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontSize: 14,
              }}
            >
              {loading ? 'Running skill...' : `Run ${selectedSkill.name}`}
            </button>
          </div>
          {result && (
            <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h4 style={{ fontSize: 16, fontWeight: 600 }}>Result</h4>
                <button onClick={() => navigator.clipboard.writeText(result)} style={{ background: '#1e293b', border: 'none', color: '#94a3b8', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
                  Copy
                </button>
              </div>
              <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.6, color: '#e2e8f0' }}>{result}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================
// SKILL PANEL — Generic panel for individual marketing skills
// =============================================
function SkillPanel({ skillKey }) {
  const skill = MARKETING_SKILLS[skillKey];
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(scrollToBottom, [messages]);

  if (!skill) return <div style={{ padding: 40 }}>Skill not found: {skillKey}</div>;

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    if (!isApiKeySet()) { alert('Set your AI API key in Settings first'); return; }

    const userMsg = { role: 'user', content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const systemPrompt = getMarketingPrompt(skillKey, '');
      const res = await callClaude({
        messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        system: systemPrompt,
        maxTokens: 8192,
        temperature: 0.7,
      });
      setMessages([...newMessages, { role: 'assistant', content: res.content }]);
    } catch (err) {
      setMessages([...newMessages, { role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = {
    'copywriting': ['Write homepage hero copy', 'Create 5 headline options for our landing page', 'Write product description for Dal Makhani RTE'],
    'ad-creative': ['Generate Google RSA headlines for Kiro Foods', 'Create Meta ad copy for our launch campaign', 'Write 10 ad headline variations for clean-label positioning'],
    'email-sequence': ['Design a 5-email welcome sequence', 'Create a cart abandonment email flow', 'Write a re-engagement sequence for lapsed customers'],
    'launch-strategy': ['Create a full launch plan for Kiro Foods', 'Plan our Product Hunt launch', 'Design a 5-phase go-to-market strategy'],
    'pricing-strategy': ['Design subscription pricing tiers for Kiro Club', 'Recommend launch pricing strategy', 'Create a bundle pricing structure'],
    'page-cro': ['Audit our homepage for conversions', 'Optimize our product page layout', 'Improve our checkout flow conversion rate'],
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{skill.name}</h2>
        <p style={{ color: '#94a3b8', fontSize: 13 }}>{skill.description} • Powered by Protocol Marketing Skills Engine</p>
      </div>

      {messages.length === 0 && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
          <div style={{ textAlign: 'center', maxWidth: 500 }}>
            <Zap size={40} style={{ color: '#7c3aed', marginBottom: 12 }} />
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Start a conversation</h3>
            <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 20 }}>
              This skill has deep expertise in {skill.name.toLowerCase()} with Kiro Foods context built in. Ask anything.
            </p>
          </div>
          {quickPrompts[skillKey] && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 600 }}>
              {quickPrompts[skillKey].map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => { setInput(prompt); }}
                  style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '8px 14px', color: '#e2e8f0', fontSize: 13, cursor: 'pointer' }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {messages.length > 0 && (
        <div style={{ flex: 1, overflowY: 'auto', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '85%', padding: '12px 16px', borderRadius: 12,
                background: msg.role === 'user' ? '#7c3aed' : '#1e293b',
                color: '#e2e8f0', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap',
              }}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{ background: '#1e293b', padding: '12px 16px', borderRadius: 12, color: '#94a3b8', fontSize: 14 }}>
                Thinking...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder={`Ask ${skill.name} anything...`}
          style={{ flex: 1, background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '12px 16px', color: '#e2e8f0', fontSize: 14 }}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          style={{
            padding: '12px 20px', background: loading ? '#334155' : '#7c3aed', color: '#fff',
            border: 'none', borderRadius: 10, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}

// =============================================
// COMPANY EMAIL (IMAP Integration)
// =============================================
function CompanyEmail() {
  const [config, setConfig] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kj_email_config') || 'null') || { host: '', port: 993, user: '', password: '', tls: true }; } catch { return { host: '', port: 993, user: '', password: '', tls: true }; }
  });
  const [configured, setConfigured] = useState(() => {
    try { const c = JSON.parse(localStorage.getItem('kj_email_config') || 'null'); return !!(c?.host && c?.user && c?.password); } catch { return false; }
  });
  const [showConfig, setShowConfig] = useState(false);
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [readingEmail, setReadingEmail] = useState(false);
  const [toast, setToast] = useState(null);
  const [stats, setStats] = useState({ total: 0, unseen: 0 });
  const [folder, setFolder] = useState('INBOX');
  const [folders, setFolders] = useState([]);

  const siteUrl = window.location.origin;

  const saveConfig = () => {
    localStorage.setItem('kj_email_config', JSON.stringify(config));
    setConfigured(!!(config.host && config.user && config.password));
    setShowConfig(false);
    setToast({ message: 'Email configuration saved', type: 'success' });
  };

  const callEmailFn = async (payload) => {
    const res = await fetch(`${siteUrl}/.netlify/functions/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('text/html')) {
      throw new Error('Email function not deployed. Deploy via Netlify CLI: netlify deploy --prod --dir=dist --functions=netlify/functions');
    }
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  };

  const fetchEmails = async () => {
    if (!configured) return;
    setLoading(true);
    try {
      const data = await callEmailFn({ action: 'list', config, options: { folder, limit: 30 } });
      setEmails(data.messages || []);
      setStats({ total: data.total || 0, unseen: data.unseen || 0 });
      setToast({ message: `Loaded ${(data.messages || []).length} emails (${data.unseen} unread)`, type: 'success' });
    } catch (e) {
      setToast({ message: e.message, type: 'error' });
    }
    setLoading(false);
  };

  const fetchFolders = async () => {
    if (!configured) return;
    try {
      const data = await callEmailFn({ action: 'folders', config });
      if (data.folders) setFolders(data.folders);
    } catch {}
  };

  const readEmail = async (uid) => {
    setReadingEmail(true);
    try {
      const data = await callEmailFn({ action: 'read', config, options: { folder, uid } });
      setSelectedEmail(data);
      setEmails(prev => prev.map(e => e.uid === uid ? { ...e, seen: true } : e));
    } catch (e) {
      setToast({ message: `Failed to read email: ${e.message}`, type: 'error' });
    }
    setReadingEmail(false);
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Company Email</h1>
          <p className="page-header-sub">IMAP email integration — view and manage your company inbox</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {configured && <span className="badge" style={{ background: '#059669', color: '#fff', padding: '6px 14px', fontSize: 12 }}>{config.user}</span>}
          <button className="btn btn-sm" onClick={() => setShowConfig(!showConfig)}><Settings size={14} /> Configure</button>
        </div>
      </div>
      <div className="page-body">
        {/* Config Panel */}
        {(showConfig || !configured) && (
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 className="card-title" style={{ marginBottom: 12 }}>IMAP Email Configuration</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="label">IMAP Host</label>
                <input className="input" value={config.host} onChange={e => setConfig({ ...config, host: e.target.value })} placeholder="imap.gmail.com" />
              </div>
              <div>
                <label className="label">Port</label>
                <input className="input" type="number" value={config.port} onChange={e => setConfig({ ...config, port: parseInt(e.target.value) || 993 })} />
              </div>
              <div>
                <label className="label">Email / Username</label>
                <input className="input" value={config.user} onChange={e => setConfig({ ...config, user: e.target.value })} placeholder="you@company.com" />
              </div>
              <div>
                <label className="label">Password / App Password</label>
                <input className="input" type="password" value={config.password} onChange={e => setConfig({ ...config, password: e.target.value })} placeholder="app-specific password" />
              </div>
            </div>
            <p style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 8 }}>
              For Gmail: use an App Password (Settings → Security → 2FA → App Passwords). For Zoho/custom: use your IMAP credentials.
            </p>
            <button className="btn btn-primary" onClick={saveConfig} style={{ marginTop: 12 }}>Save Configuration</button>
          </div>
        )}

        {configured && !showConfig && (
          <>
            {/* Toolbar */}
            <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <select className="input" value={folder} onChange={e => setFolder(e.target.value)} style={{ width: 160 }}
                onFocus={fetchFolders}>
                <option value="INBOX">Inbox</option>
                {folders.filter(f => f.path !== 'INBOX').map(f => (
                  <option key={f.path} value={f.path}>{f.name}</option>
                ))}
              </select>
              <button className="btn btn-primary" onClick={fetchEmails} disabled={loading} style={{ flex: 1 }}>
                {loading ? <><LoadingDots /> Fetching...</> : <><RefreshCw size={16} /> Fetch Emails</>}
              </button>
              {stats.total > 0 && (
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{stats.total} total • {stats.unseen} unread</span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: selectedEmail ? '1fr 1.5fr' : '1fr', gap: 16 }}>
              {/* Email List */}
              <div className="card" style={{ maxHeight: 600, overflowY: 'auto' }}>
                {emails.length === 0 && !loading && (
                  <div className="empty-state"><Inbox /><h3>No emails loaded</h3><p>Click Fetch Emails to load your inbox.</p></div>
                )}
                {emails.map(e => (
                  <div key={e.uid} onClick={() => readEmail(e.uid)}
                    style={{
                      padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)',
                      background: selectedEmail?.uid === e.uid ? 'var(--accent-light)' : e.seen ? 'transparent' : 'rgba(124,58,237,0.04)',
                      transition: 'background 0.15s',
                    }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontSize: 12, fontWeight: e.seen ? 400 : 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                        {e.from?.name || e.from?.address || 'Unknown'}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--text-tertiary)', flexShrink: 0 }}>
                        {e.date ? new Date(e.date).toLocaleDateString() : ''}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: e.seen ? 'var(--text-secondary)' : 'var(--text-primary)', fontWeight: e.seen ? 400 : 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.subject}
                    </div>
                    {!e.seen && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', position: 'absolute', right: 12 }} />}
                  </div>
                ))}
              </div>

              {/* Email Reader */}
              {selectedEmail && (
                <div className="card" style={{ maxHeight: 600, overflowY: 'auto' }}>
                  {readingEmail ? (
                    <div style={{ textAlign: 'center', padding: 40 }}><LoadingDots /></div>
                  ) : (
                    <>
                      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{selectedEmail.subject}</h3>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                        <strong>From:</strong> {selectedEmail.from?.map(f => `${f.name || ''} <${f.address}>`).join(', ')}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                        <strong>To:</strong> {selectedEmail.to?.map(t => `${t.name || ''} <${t.address}>`).join(', ')}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 12 }}>
                        {selectedEmail.date ? new Date(selectedEmail.date).toLocaleString() : ''}
                      </div>
                      {selectedEmail.attachments?.length > 0 && (
                        <div style={{ marginBottom: 12, padding: '8px 12px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', fontSize: 11 }}>
                          <strong>Attachments:</strong> {selectedEmail.attachments.map(a => a.filename).join(', ')}
                        </div>
                      )}
                      <div style={{ fontSize: 13, lineHeight: 1.7, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                        {selectedEmail.html ? (
                          <div dangerouslySetInnerHTML={{ __html: selectedEmail.html }} style={{ maxWidth: '100%', overflow: 'hidden' }} />
                        ) : (
                          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{selectedEmail.text}</pre>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </>
  );
}

// =============================================
// NOTIFICATION PANEL
// =============================================
function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`kj_${getCurrentUser()}_notifications`) || '[]'); } catch { return []; }
  });
  const bellRef = useRef(null);

  // Auto-generate system notifications based on app state
  useEffect(() => {
    const sys = [];
    if (!isApiKeySet()) sys.push({ id: 'sys_ai', type: 'alert', title: 'AI provider not configured', body: 'Go to Settings → add Claude, OpenAI, or Gemini key', read: false, createdAt: new Date().toISOString(), system: true });
    if (!isApifyTokenSet()) sys.push({ id: 'sys_apify', type: 'info', title: 'Apify token missing', body: 'Scrapers need an Apify token. Add one in Settings.', read: false, createdAt: new Date().toISOString(), system: true });
    if (isShopifyConnected()) sys.push({ id: 'sys_shopify', type: 'update', title: 'Shopify connected', body: `Store: ${getShopifyStoreName()}`, read: true, createdAt: new Date().toISOString(), system: true });
    // Merge with existing, don't duplicate system ones
    setNotifications(prev => {
      const userNotes = prev.filter(n => !n.system);
      return [...sys, ...userNotes];
    });
  }, [open]);

  const save = (notes) => {
    const userNotes = notes.filter(n => !n.system);
    localStorage.setItem(`kj_${getCurrentUser()}_notifications`, JSON.stringify(userNotes));
    setNotifications(notes);
  };

  const markRead = (id) => save(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  const markAllRead = () => save(notifications.map(n => ({ ...n, read: true })));
  const deleteNote = (id) => save(notifications.filter(n => n.id !== id));

  const unread = notifications.filter(n => !n.read).length;
  const typeColors = { info: '#3b82f6', task: '#f59e0b', alert: '#ef4444', update: '#059669' };

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (bellRef.current && !bellRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={bellRef} style={{ position: 'fixed', top: 12, right: 16, zIndex: 9999 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: 38, height: 38, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: open ? 'var(--accent)' : 'var(--card-bg)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', transition: 'all 0.2s',
        }}
      >
        <Bell size={18} color={open ? '#fff' : 'var(--text-secondary)'} />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -2, right: -2, width: 18, height: 18, borderRadius: '50%',
            background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'pulse 2s infinite',
          }}>{unread}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 46, right: 0, width: 360, maxHeight: 480,
          background: 'var(--card-bg)', borderRadius: 12, border: '1px solid var(--border)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)', overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>Notifications</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {unread > 0 && <button onClick={markAllRead} style={{ border: 'none', background: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Mark all read</button>}
            </div>
          </div>

          {/* List */}
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>No notifications</div>
            ) : (
              notifications.slice(0, 20).map(n => (
                <div key={n.id} style={{
                  padding: '10px 16px', borderBottom: '1px solid var(--border)',
                  background: n.read ? 'transparent' : 'rgba(124,58,237,0.04)',
                  display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer',
                  transition: 'background 0.15s',
                }} onClick={() => !n.read && markRead(n.id)}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.read ? 'transparent' : typeColors[n.type] || '#3b82f6', marginTop: 5, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: n.read ? 400 : 700, marginBottom: 2 }}>{n.title}</div>
                    {n.body && <div style={{ fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.body}</div>}
                    <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>{new Date(n.createdAt).toLocaleString()}</div>
                  </div>
                  {!n.system && (
                    <button onClick={(e) => { e.stopPropagation(); deleteNote(n.id); }}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 2 }}>
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================
// BLOG WRITER — AI-powered SEO blog engine
// =============================================
function BlogWriter() {
  const [step, setStep] = useState(1); // 1=Topic, 2=Research, 3=Titles, 4=Outline, 5=Write
  const [topic, setTopic] = useState('');
  const [niche, setNiche] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [wordCount, setWordCount] = useState('1500');
  const [tone, setTone] = useState('Professional');
  const [country, setCountry] = useState('in');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [toast, setToast] = useState(null);

  // Research data
  const [keywords, setKeywords] = useState([]);
  const [serpData, setSerpData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [competitorPages, setCompetitorPages] = useState([]);
  const [selectedKeywords, setSelectedKeywords] = useState(new Set());

  // Title suggestions (NEW step between Research and Outline)
  const [titleSuggestions, setTitleSuggestions] = useState([]);
  const [selectedTitle, setSelectedTitle] = useState('');
  const [customTitle, setCustomTitle] = useState('');

  // Outline
  const [outline, setOutline] = useState(null);
  const [outlineEditing, setOutlineEditing] = useState(false);
  const [outlineText, setOutlineText] = useState('');

  // Article
  const [article, setArticle] = useState(null);
  const [articleHtml, setArticleHtml] = useState('');
  const [seoScore, setSeoScore] = useState(null);
  const [metaTags, setMetaTags] = useState(null);

  // Check for pre-loaded keywords from SEO tools
  useEffect(() => {
    try {
      const raw = localStorage.getItem('protocol_seo_to_content');
      if (raw) {
        const data = JSON.parse(raw);
        // Only use if less than 10 minutes old
        if (data.timestamp && Date.now() - data.timestamp < 600000) {
          setTopic(data.seedKeyword || data.keywords?.[0]?.keyword || '');
          const preloadedKws = (data.keywords || []).map(k => ({
            keyword: k.keyword, volume: k.volume || 'N/A', difficulty: k.difficulty || 'Medium',
            type: k.type || 'QUERY', source: 'seo-research'
          }));
          if (preloadedKws.length > 0) {
            setKeywords(preloadedKws);
            const autoSel = new Set(preloadedKws.slice(0, 8).map(k => k.keyword));
            if (data.seedKeyword) autoSel.add(data.seedKeyword);
            setSelectedKeywords(autoSel);
            setQuestions(data.questions || []);
            setStep(2);
            setToast({ message: `Loaded ${preloadedKws.length} keywords from ${data.source || 'SEO research'}. Review & continue to titles.`, type: 'success' });
          }
        }
        localStorage.removeItem('protocol_seo_to_content');
      }
    } catch (e) { console.error('Pre-load keywords error:', e); }
  }, []);

  // ---- Step 1→2: Research ----
  const handleResearch = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setStep(2);
    setProgress('Researching keywords...');
    try {
      // Parallel: keyword suggestions + questions + SERP analysis
      const [suggestions, questionKws] = await Promise.allSettled([
        getKeywordSuggestions(topic.trim(), 'en', country),
        getQuestionKeywords(topic.trim())
      ]);

      const rawSuggestions = suggestions.status === 'fulfilled' ? suggestions.value : [];
      const rawQuestions = questionKws.status === 'fulfilled' ? questionKws.value : [];

      // Enrich with difficulty and volume estimates
      const enrichedKws = rawSuggestions.map(s => {
        const vol = estimateSearchVolume(s.relevance * 100000);
        return { ...s, volume: vol.volume, difficulty: s.relevance > 700 ? 'Hard' : s.relevance > 400 ? 'Medium' : 'Easy' };
      });

      setKeywords(enrichedKws);
      setQuestions(rawQuestions.map(q => q.keyword));
      // Auto-select top 5 keywords
      const autoSelected = new Set(enrichedKws.slice(0, 5).map(k => k.keyword));
      autoSelected.add(topic.trim());
      setSelectedKeywords(autoSelected);

      // Now get AI-powered deep keyword analysis if API key is available
      setProgress('AI analyzing keyword landscape...');
      if (isApiKeySet()) {
        try {
          const aiKwResult = await callClaude({
            system: SYSTEM_PROMPTS.seoKeywords,
            messages: [{ role: 'user', content: `Topic: "${topic.trim()}"\nNiche: ${niche || 'general'}\nTarget market: India (${country === 'in' ? 'India' : country === 'us' ? 'United States' : country})\nTarget audience: ${targetAudience || 'general audience'}\n\nGenerate the most strategic keywords for a blog post on this topic. Include both short-tail and long-tail keywords. Focus on keywords that have the best chance of ranking on Google page 1.` }],
            maxTokens: 3000,
            temperature: 0.4
          });
          try {
            const aiKeywords = JSON.parse(aiKwResult.content);
            if (Array.isArray(aiKeywords)) {
              setKeywords(prev => {
                const existing = new Set(prev.map(k => k.keyword.toLowerCase()));
                const newKws = aiKeywords.filter(k => !existing.has(k.keyword.toLowerCase())).map(k => ({
                  keyword: k.keyword,
                  volume: k.volume || 'AI Est.',
                  difficulty: k.difficulty <= 30 ? 'Easy' : k.difficulty <= 60 ? 'Medium' : 'Hard',
                  difficultyScore: k.difficulty,
                  cpc: k.cpc || '',
                  intent: k.intent || '',
                  trend: k.trend || '',
                  suggestion: k.suggestion || '',
                  source: 'ai'
                }));
                return [...prev, ...newKws];
              });
            }
          } catch { /* AI response wasn't valid JSON, skip */ }
        } catch { /* AI not available, continue with organic data */ }
      }

      // SERP analysis
      setProgress('Analyzing top-ranking competitors...');
      try {
        const serp = await scrapeGoogleSERP(topic.trim(), { maxResults: 10, countryCode: country });
        if (serp && serp.length > 0) {
          setSerpData(serp[0]);
          setCompetitorPages((serp[0].organicResults || []).slice(0, 10).map(r => ({
            title: r.title,
            url: r.url,
            description: r.description || '',
            position: r.position
          })));
        }
      } catch { /* SERP not available */ }

      setProgress('');
      setToast({ message: `Research complete — ${enrichedKws.length}+ keywords found`, type: 'success' });
    } catch (e) {
      setToast({ message: `Research failed: ${e.message}`, type: 'error' });
    }
    setLoading(false);
  };

  // ---- Step 2→3: Generate Title Suggestions ----
  const handleGenerateTitles = async () => {
    if (!isApiKeySet()) { setToast({ message: 'AI API key required. Go to Settings.', type: 'error' }); return; }
    setLoading(true);
    setStep(3);
    setProgress('Generating title suggestions...');
    try {
      const selectedKwList = [...selectedKeywords].join(', ');
      const competitorTitles = competitorPages.map(c => `"${c.title}"`).join(', ');
      const result = await callClaude({
        system: `You are a senior SEO content strategist with 30 years of experience writing #1 ranking blog headlines. You understand Google's title tag best practices, emotional triggers, and click-through rate optimization.

Return a JSON array of 8-10 title objects. Each must be UNIQUE in angle, not just rewording of the same title.`,
        messages: [{ role: 'user', content: `Generate 8-10 blog title suggestions for:

TOPIC: "${topic}"
TARGET KEYWORDS: ${selectedKwList}
AUDIENCE: ${targetAudience || 'health-conscious Indian consumers'}
NICHE: ${niche || 'general'}
TONE: ${tone}

COMPETITOR TITLES TO BEAT:
${competitorTitles || 'None available'}

For each title, return:
{
  "title": "The actual title (50-65 chars, primary keyword in first 3 words)",
  "angle": "The content angle (e.g., 'Listicle', 'How-to', 'Data-driven', 'Myth-busting', 'Comparison', 'Guide', 'Case study')",
  "hook": "Why this title would get clicks — the psychology behind it",
  "estimatedCTR": "Low/Medium/High/Very High",
  "targetSnippet": "paragraph/list/table/none — what featured snippet this targets",
  "keyword": "Primary keyword this title optimizes for"
}

Return ONLY valid JSON array, no markdown fences.` }],
        maxTokens: 3000,
        temperature: 0.7
      });
      try {
        let parsed = JSON.parse(result.content);
        if (!Array.isArray(parsed)) parsed = parsed.titles || parsed.suggestions || [];
        setTitleSuggestions(parsed);
      } catch {
        const jsonMatch = result.content.match(/\[[\s\S]*\]/);
        if (jsonMatch) setTitleSuggestions(JSON.parse(jsonMatch[0]));
        else throw new Error('Failed to parse title suggestions');
      }
      setProgress('');
      setToast({ message: `${titleSuggestions.length || 'Multiple'} title options generated!`, type: 'success' });
    } catch (e) {
      setToast({ message: `Title generation failed: ${e.message}`, type: 'error' });
    }
    setLoading(false);
  };

  // ---- Step 3→4: Generate Outline ----
  const handleGenerateOutline = async () => {
    if (!isApiKeySet()) { setToast({ message: 'AI API key required for outline generation. Go to Settings.', type: 'error' }); return; }
    const chosenTitle = selectedTitle || customTitle || topic;
    setLoading(true);
    setStep(4);
    setProgress('Generating SEO-optimized outline...');
    try {
      const selectedKwList = [...selectedKeywords].join(', ');
      const questionList = questions.slice(0, 10).join('\n- ');
      const competitorTitles = competitorPages.map((c, i) => `${i + 1}. "${c.title}" - ${c.url}`).join('\n');

      const result = await callClaude({
        system: `You are a senior SEO content strategist with 30 years of experience writing #1 ranking blog posts for FMCG brands. You have deep expertise in Google's E-E-A-T guidelines, semantic SEO, and content architecture that wins featured snippets.

Your job: create a detailed, strategic blog post outline that is ENGINEERED to outrank the current top 10 results. Every section must serve a specific SEO purpose.`,
        messages: [{ role: 'user', content: `Create a comprehensive blog post outline for:

CHOSEN TITLE: "${chosenTitle}"
TOPIC: "${topic}"
TARGET KEYWORDS: ${selectedKwList}
WORD COUNT TARGET: ${wordCount} words
TONE: ${tone}
AUDIENCE: ${targetAudience || 'health-conscious Indian consumers'}
NICHE: ${niche || 'general'}

COMPETITOR ANALYSIS (current top results):
${competitorTitles || 'No SERP data available'}

QUESTIONS PEOPLE ASK:
- ${questionList || 'No question data'}

Return a JSON object with:
{
  "title": "SEO-optimized title (50-60 chars, keyword in first 3 words)",
  "metaDescription": "150-160 chars, compelling, includes primary keyword",
  "slug": "url-friendly-slug",
  "primaryKeyword": "main keyword to target",
  "secondaryKeywords": ["array", "of", "supporting", "keywords"],
  "estimatedWordCount": ${wordCount},
  "sections": [
    {
      "type": "intro|h2|h3|faq|conclusion|cta",
      "heading": "Section heading (keyword-rich)",
      "wordCount": 200,
      "keyPoints": ["Key point 1", "Key point 2"],
      "targetKeyword": "keyword this section targets",
      "serpFeature": "paragraph|list|table|faq|none (what featured snippet format to target)",
      "notes": "Strategic notes for the writer"
    }
  ],
  "internalLinks": ["suggested internal link topics"],
  "externalLinks": ["authoritative sources to cite"],
  "schemaType": "Article|FAQ|HowTo",
  "competitiveEdge": "What makes this outline BETTER than current top 10 results"
}

Return ONLY valid JSON, no markdown.` }],
        maxTokens: 4000,
        temperature: 0.5
      });

      try {
        const parsed = JSON.parse(result.content);
        setOutline(parsed);
        setOutlineText(JSON.stringify(parsed, null, 2));
      } catch {
        // If JSON parse fails, try to extract JSON from the response
        const jsonMatch = result.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          setOutline(parsed);
          setOutlineText(JSON.stringify(parsed, null, 2));
        } else {
          throw new Error('Failed to parse outline');
        }
      }
      setProgress('');
      setToast({ message: 'Outline generated', type: 'success' });
    } catch (e) {
      setToast({ message: `Outline generation failed: ${e.message}`, type: 'error' });
    }
    setLoading(false);
  };

  // ---- Step 3→4: Write Article ----
  const handleWriteArticle = async () => {
    if (!outline) return;
    setLoading(true);
    setStep(5);
    setProgress('Writing article (this takes 30-60 seconds)...');
    try {
      const outlineData = outlineEditing ? JSON.parse(outlineText) : outline;
      const sectionsGuide = (outlineData.sections || []).map((s, i) =>
        `${i + 1}. [${s.type.toUpperCase()}] ${s.heading} (~${s.wordCount} words)\n   Key points: ${(s.keyPoints || []).join('; ')}\n   Target keyword: ${s.targetKeyword || ''}\n   SERP format: ${s.serpFeature || 'paragraph'}\n   Notes: ${s.notes || ''}`
      ).join('\n\n');

      const result = await callClaude({
        system: `You are a legendary SEO blog writer with 30 years of experience ranking FMCG brand blogs #1 on Google. You've written for brands like Amul, ITC, Haldiram's, and Nestlé India.

${KIRO_CONTEXT}

CONTENT STRATEGY PRINCIPLES:
- Content must be SEARCHABLE (target specific keywords, match intent), SHAREABLE (novel insights, emotional hooks), or both
- Content pillars: Ingredient Transparency (40%), Recipe & Meal Inspiration (25%), Health Education (20%), Brand Story (15%)
- Map to buyer stage: Awareness → Consideration → Decision → Implementation

COPYWRITING PRINCIPLES:
1. Clarity over cleverness — choose clear
2. Benefits over features — "Know exactly what's in every bite" not "no preservatives"
3. Specificity over vagueness — "5 ingredients you can pronounce" not "clean ingredients"
4. Customer language — mirror how Indian families talk about food
5. One idea per section

WRITING STYLE:
- Every sentence earns its place — zero filler
- Authority backed by data (include specific numbers, statistics, percentages)
- Naturally weave keywords at 1-2% density — NEVER stuff
- Use Indian English (organised, favourite, colour)
- Mix short punchy sentences with flowing descriptive ones
- Include sensory language for food/health content
- Every H2 is optimized for featured snippets
- FAQs use exact "People Also Ask" phrasing
- Internal link placeholders: [LINK: topic]
- CTA at strategic points, not just the end
- Write to exceed the current #1 result in depth, accuracy, and readability
- Strong CTAs: "Join the Waitlist" / "Try Your First Meal" — never "Submit" / "Learn More"

OUTPUT FORMAT: Write the complete article in clean Markdown with proper heading hierarchy (## for H2, ### for H3). Include the meta description as a comment at the top.`,
        messages: [{ role: 'user', content: `Write the complete ${wordCount}-word blog post.

TITLE: ${outlineData.title}
PRIMARY KEYWORD: ${outlineData.primaryKeyword}
SECONDARY KEYWORDS: ${(outlineData.secondaryKeywords || []).join(', ')}
TONE: ${tone}
AUDIENCE: ${targetAudience || 'health-conscious Indian consumers'}

OUTLINE:
${sectionsGuide}

SCHEMA TYPE: ${outlineData.schemaType || 'Article'}
COMPETITIVE EDGE: ${outlineData.competitiveEdge || 'More comprehensive and actionable than existing content'}

Write the FULL article now. Every section must be complete, not summarized or truncated. Include real data points and actionable advice.` }],
        maxTokens: 8000,
        temperature: 0.7
      });

      setArticle(result.content);
      // Convert markdown to basic HTML for preview
      const html = result.content
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^# (.*$)/gm, '<h1>$1</h1>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^- (.*$)/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/^(?!<[hul])/gm, '<p>')
        .replace(/<p><\/p>/g, '');
      setArticleHtml(html);

      setProgress('Scoring SEO quality...');
      // Auto-score
      if (isApiKeySet()) {
        try {
          const scoreResult = await callClaude({
            system: SYSTEM_PROMPTS.seoScore,
            messages: [{ role: 'user', content: `Target keyword: "${outlineData.primaryKeyword}"\nSecondary keywords: ${(outlineData.secondaryKeywords || []).join(', ')}\n\nContent:\n${result.content}` }],
            maxTokens: 2000,
            temperature: 0.3
          });
          try {
            const parsed = JSON.parse(scoreResult.content);
            setSeoScore(parsed);
          } catch {
            const jsonMatch = scoreResult.content.match(/\{[\s\S]*\}/);
            if (jsonMatch) setSeoScore(JSON.parse(jsonMatch[0]));
          }
        } catch { /* Score not available */ }
      }

      // Generate meta tags
      setProgress('Generating meta tags...');
      if (isApiKeySet()) {
        try {
          const metaResult = await callClaude({
            system: SYSTEM_PROMPTS.seoMeta,
            messages: [{ role: 'user', content: `Topic: "${outlineData.title}"\nPrimary keyword: "${outlineData.primaryKeyword}"\nSecondary keywords: ${(outlineData.secondaryKeywords || []).join(', ')}\nContent summary: ${result.content.substring(0, 500)}` }],
            maxTokens: 1500,
            temperature: 0.3
          });
          try {
            const parsed = JSON.parse(metaResult.content);
            setMetaTags(parsed);
          } catch {
            const jsonMatch = metaResult.content.match(/\{[\s\S]*\}/);
            if (jsonMatch) setMetaTags(JSON.parse(jsonMatch[0]));
          }
        } catch { /* Meta not available */ }
      }

      setProgress('');
      setToast({ message: 'Article written and scored!', type: 'success' });
    } catch (e) {
      setToast({ message: `Writing failed: ${e.message}`, type: 'error' });
    }
    setLoading(false);
  };

  // Toggle keyword selection
  const toggleKeyword = (kw) => {
    const next = new Set(selectedKeywords);
    next.has(kw) ? next.delete(kw) : next.add(kw);
    setSelectedKeywords(next);
  };

  // Export article
  const exportArticle = (format) => {
    if (!article) return;
    if (format === 'markdown') {
      const blob = new Blob([article], { type: 'text/markdown;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${(outline?.slug || 'blog-post')}.md`; a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'html') {
      const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${outline?.title || 'Blog Post'}</title>${metaTags ? `<meta name="description" content="${metaTags.description}">` : ''}<style>body{max-width:760px;margin:40px auto;font-family:Georgia,serif;line-height:1.8;color:#333;padding:0 20px}h1{font-size:2em}h2{font-size:1.5em;margin-top:2em}h3{font-size:1.2em}ul{padding-left:1.5em}strong{color:#1a1a1a}</style></head><body>${articleHtml}</body></html>`;
      const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${(outline?.slug || 'blog-post')}.html`; a.click();
      URL.revokeObjectURL(url);
    } else {
      navigator.clipboard.writeText(article);
      setToast({ message: 'Article copied to clipboard', type: 'success' });
    }
  };

  // Copy meta tags
  const copyMetaTags = () => {
    if (!metaTags) return;
    const html = `<title>${metaTags.title}</title>\n<meta name="description" content="${metaTags.description}">\n<meta property="og:title" content="${metaTags.ogTitle || metaTags.title}">\n<meta property="og:description" content="${metaTags.ogDescription || metaTags.description}">\n<link rel="canonical" href="/${metaTags.urlSlug || ''}" />`;
    navigator.clipboard.writeText(html);
    setToast({ message: 'Meta tags copied', type: 'success' });
  };

  const getScoreColor = (s) => s >= 80 ? '#059669' : s >= 60 ? '#f59e0b' : '#dc2626';
  const getDiffColor = (d) => d === 'Easy' ? '#059669' : d === 'Medium' ? '#f59e0b' : '#ef4444';

  const steps = [
    { num: 1, label: 'Topic' },
    { num: 2, label: 'Research' },
    { num: 3, label: 'Title' },
    { num: 4, label: 'Outline' },
    { num: 5, label: 'Write' },
  ];

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Blog Writer</h1>
          <p className="page-header-sub">AI-powered SEO blog engine — research, outline, write, and optimize</p>
        </div>
        {!isApiKeySet() && (
          <span className="badge badge-error" style={{ fontSize: 11 }}>AI API key required — Go to Settings</span>
        )}
      </div>
      <div className="page-body">
        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
          {steps.map((s, i) => (
            <div key={s.num} style={{ flex: 1, cursor: step > s.num ? 'pointer' : 'default' }} onClick={() => step > s.num && setStep(s.num)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: step === s.num ? 'var(--accent)' : step > s.num ? 'rgba(99,102,241,0.15)' : 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', transition: 'all 0.2s' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: step >= s.num ? (step === s.num ? '#fff' : 'var(--accent)') : 'var(--bg-secondary)', color: step === s.num ? 'var(--accent)' : step > s.num ? '#fff' : 'var(--text-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                  {step > s.num ? <Check size={12} /> : s.num}
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: step === s.num ? '#fff' : step > s.num ? 'var(--accent)' : 'var(--text-tertiary)' }}>{s.label}</span>
              </div>
              {i < steps.length - 1 && <div style={{ height: 2, background: step > s.num ? 'var(--accent)' : 'var(--border)', margin: '0 8px' }} />}
            </div>
          ))}
        </div>

        {loading && progress && (
          <div style={{ marginBottom: 16, padding: '12px 16px', background: 'var(--accent-light)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <RefreshCw size={14} className="spin" /> {progress}
          </div>
        )}

        {/* STEP 1: Topic Input */}
        {step === 1 && (
          <div className="card">
            <div className="card-header"><h3 className="card-title">What do you want to write about?</h3></div>
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="label">Blog Topic / Title Idea</label>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input className="input" value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g., Best Healthy Snacks for Kids in India" style={{ fontSize: 15, flex: 1 }} />
                  <VoiceMicButton onResult={t => setTopic(t)} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label className="label">Niche / Industry</label>
                  <input className="input" value={niche} onChange={e => setNiche(e.target.value)} placeholder="e.g., Healthy food, FMCG, wellness" />
                </div>
                <div>
                  <label className="label">Target Audience</label>
                  <input className="input" value={targetAudience} onChange={e => setTargetAudience(e.target.value)} placeholder="e.g., Health-conscious Indian parents, 25-40" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <div>
                  <label className="label">Word Count</label>
                  <select className="input" value={wordCount} onChange={e => setWordCount(e.target.value)}>
                    <option value="800">800 (Short)</option>
                    <option value="1200">1,200 (Medium)</option>
                    <option value="1500">1,500 (Standard)</option>
                    <option value="2000">2,000 (Long)</option>
                    <option value="3000">3,000 (Comprehensive)</option>
                  </select>
                </div>
                <div>
                  <label className="label">Tone</label>
                  <select className="input" value={tone} onChange={e => setTone(e.target.value)}>
                    <option>Professional</option>
                    <option>Casual</option>
                    <option>Educational</option>
                    <option>Inspirational</option>
                    <option>Witty</option>
                    <option>Authoritative</option>
                  </select>
                </div>
                <div>
                  <label className="label">Country</label>
                  <select className="input" value={country} onChange={e => setCountry(e.target.value)}>
                    <option value="in">India</option>
                    <option value="us">United States</option>
                    <option value="uk">United Kingdom</option>
                    <option value="au">Australia</option>
                  </select>
                </div>
              </div>
              <button className="btn btn-primary" onClick={handleResearch} disabled={loading || !topic.trim()} style={{ alignSelf: 'flex-start', height: 44, fontSize: 14, padding: '0 24px' }}>
                {loading ? <><LoadingDots /> Researching...</> : <><Search size={16} /> Research Keywords &amp; Competitors</>}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Research Results */}
        {step === 2 && (
          <>
            {/* Keyword table */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="card-title">Keywords ({keywords.length}) — Select your targets</h3>
                <span style={{ fontSize: 11, color: 'var(--accent)' }}>{selectedKeywords.size} selected</span>
              </div>
              <div style={{ maxHeight: 400, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg-secondary)' }}>
                      <th style={{ padding: 8, width: 30 }}></th>
                      <th style={{ textAlign: 'left', padding: 8 }}>Keyword</th>
                      <th style={{ textAlign: 'center', padding: 8 }}>Volume</th>
                      <th style={{ textAlign: 'center', padding: 8 }}>Difficulty</th>
                      <th style={{ textAlign: 'center', padding: 8 }}>Intent</th>
                      <th style={{ textAlign: 'center', padding: 8 }}>Trend</th>
                      <th style={{ textAlign: 'left', padding: 8 }}>Suggestion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keywords.map((kw, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: selectedKeywords.has(kw.keyword) ? 'rgba(99,102,241,0.08)' : 'transparent', cursor: 'pointer' }} onClick={() => toggleKeyword(kw.keyword)}>
                        <td style={{ padding: 8, textAlign: 'center' }}>
                          <input type="checkbox" checked={selectedKeywords.has(kw.keyword)} onChange={() => toggleKeyword(kw.keyword)} style={{ accentColor: 'var(--accent)' }} />
                        </td>
                        <td style={{ padding: 8, fontWeight: 500 }}>
                          {kw.keyword}
                          {kw.source === 'ai' && <span style={{ marginLeft: 6, fontSize: 9, padding: '1px 4px', background: 'rgba(124,58,237,0.15)', color: '#7c3aed', borderRadius: 3 }}>AI</span>}
                        </td>
                        <td style={{ padding: 8, textAlign: 'center', fontSize: 11 }}>{kw.volume || '—'}</td>
                        <td style={{ padding: 8, textAlign: 'center' }}>
                          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 8, background: getDiffColor(kw.difficulty || 'Medium'), color: '#fff', fontWeight: 600 }}>
                            {kw.difficulty || 'Medium'}{kw.difficultyScore ? ` (${kw.difficultyScore})` : ''}
                          </span>
                        </td>
                        <td style={{ padding: 8, textAlign: 'center', fontSize: 10, color: 'var(--text-tertiary)' }}>{kw.intent || '—'}</td>
                        <td style={{ padding: 8, textAlign: 'center', fontSize: 10, color: kw.trend === 'Rising' ? '#059669' : kw.trend === 'Declining' ? '#dc2626' : 'var(--text-tertiary)' }}>{kw.trend || '—'}</td>
                        <td style={{ padding: 8, fontSize: 10, color: 'var(--text-secondary)', maxWidth: 200 }}>{kw.suggestion || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Questions */}
            {questions.length > 0 && (
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-header"><h3 className="card-title">People Also Ask ({questions.length})</h3></div>
                <div style={{ padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {questions.slice(0, 20).map((q, i) => (
                    <span key={i} style={{ fontSize: 11, padding: '6px 12px', background: selectedKeywords.has(q) ? 'rgba(99,102,241,0.2)' : 'var(--bg-tertiary)', borderRadius: 16, cursor: 'pointer', border: selectedKeywords.has(q) ? '1px solid var(--accent)' : '1px solid transparent' }}
                      onClick={() => toggleKeyword(q)}>
                      {q}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Competitor SERP */}
            {competitorPages.length > 0 && (
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-header"><h3 className="card-title">Top Competitors to Outrank</h3></div>
                {competitorPages.map((page, i) => (
                  <div key={i} style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-tertiary)', minWidth: 28 }}>#{page.position}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--info)' }}>{page.title}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>{page.url}</div>
                      {page.description && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>{page.description.substring(0, 150)}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setStep(1)}>Back to Topic</button>
              <button className="btn btn-primary" onClick={handleGenerateTitles} disabled={loading || selectedKeywords.size === 0} style={{ height: 44, fontSize: 14 }}>
                {loading ? <><LoadingDots /></> : <><Wand2 size={16} /> Suggest Titles ({selectedKeywords.size} keywords)</>}
              </button>
            </div>
          </>
        )}

        {/* STEP 3: Title Selection */}
        {step === 3 && (
          <>
            {titleSuggestions.length > 0 && (
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-header"><h3 className="card-title">Choose Your Title</h3></div>
                <div style={{ padding: '8px 0' }}>
                  {titleSuggestions.map((t, i) => {
                    const ctrColors = { 'Very High': '#059669', 'High': '#3b82f6', 'Medium': '#f59e0b', 'Low': '#6b7280' };
                    return (
                      <div key={i}
                        onClick={() => { setSelectedTitle(t.title); setCustomTitle(''); }}
                        style={{
                          padding: '14px 20px', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                          background: selectedTitle === t.title ? 'rgba(99,102,241,0.1)' : 'transparent',
                          borderLeft: selectedTitle === t.title ? '3px solid var(--accent)' : '3px solid transparent',
                          transition: 'all 0.15s',
                        }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: selectedTitle === t.title ? 'var(--accent)' : 'var(--text-primary)' }}>{t.title}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>{t.hook}</div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 8, background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>{t.angle}</span>
                              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 8, background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>Snippet: {t.targetSnippet || 'paragraph'}</span>
                              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 8, background: ctrColors[t.estimatedCTR] || '#6b7280', color: '#fff', fontWeight: 600 }}>CTR: {t.estimatedCTR}</span>
                            </div>
                          </div>
                          <div style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${selectedTitle === t.title ? 'var(--accent)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                            {selectedTitle === t.title && <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--accent)' }} />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Custom title option */}
                <div style={{ padding: '12px 20px', borderTop: '2px solid var(--border)', background: 'var(--bg-tertiary)' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 6 }}>OR write your own title:</div>
                  <input className="input" value={customTitle}
                    onChange={e => { setCustomTitle(e.target.value); setSelectedTitle(''); }}
                    placeholder="Type your custom blog title here..."
                    style={{ fontSize: 14 }} />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setStep(2)}>Back to Research</button>
              <button className="btn btn-secondary" onClick={handleGenerateTitles} disabled={loading}>Regenerate Titles</button>
              <button className="btn btn-primary" onClick={handleGenerateOutline} disabled={loading || (!selectedTitle && !customTitle)} style={{ height: 44, fontSize: 14 }}>
                {loading ? <><LoadingDots /></> : <><FileText size={16} /> Generate Outline</>}
              </button>
            </div>
          </>
        )}

        {/* STEP 4: Outline */}
        {step === 4 && outline && (
          <>
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="card-title">Blog Outline</h3>
                <button className="btn btn-sm" onClick={() => setOutlineEditing(!outlineEditing)} style={{ fontSize: 11 }}>
                  {outlineEditing ? 'Preview' : 'Edit JSON'}
                </button>
              </div>

              {outlineEditing ? (
                <div style={{ padding: '16px' }}>
                  <textarea className="input" value={outlineText} onChange={e => setOutlineText(e.target.value)} rows={20} style={{ fontFamily: 'monospace', fontSize: 11 }} />
                </div>
              ) : (
                <div style={{ padding: '16px' }}>
                  <div style={{ marginBottom: 16, padding: '12px 16px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{outline.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8 }}>{outline.metaDescription}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span className="badge" style={{ background: 'var(--accent)', color: '#fff', fontSize: 10 }}>{outline.primaryKeyword}</span>
                      {(outline.secondaryKeywords || []).map((kw, i) => (
                        <span key={i} className="badge" style={{ fontSize: 9 }}>{kw}</span>
                      ))}
                    </div>
                  </div>

                  {(outline.sections || []).map((section, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: section.type === 'intro' ? '#3b82f6' : section.type === 'conclusion' || section.type === 'cta' ? '#059669' : section.type === 'faq' ? '#f59e0b' : 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                        {section.type === 'intro' ? 'I' : section.type === 'conclusion' ? 'C' : section.type === 'faq' ? 'F' : section.type === 'cta' ? '!' : i}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                          <span style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{section.type} </span>
                          {section.heading}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
                          ~{section.wordCount} words • Target: {section.targetKeyword || '—'} • Format: {section.serpFeature || 'paragraph'}
                        </div>
                        {(section.keyPoints || []).length > 0 && (
                          <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                            {section.keyPoints.map((p, j) => <div key={j} style={{ marginBottom: 2 }}>• {p}</div>)}
                          </div>
                        )}
                        {section.notes && <div style={{ fontSize: 10, color: 'var(--accent)', marginTop: 4, fontStyle: 'italic' }}>{section.notes}</div>}
                      </div>
                    </div>
                  ))}

                  {outline.competitiveEdge && (
                    <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(5,150,105,0.08)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid #059669' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#059669', marginBottom: 4 }}>COMPETITIVE EDGE</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{outline.competitiveEdge}</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setStep(3)}>Back to Titles</button>
              <button className="btn btn-secondary" onClick={handleGenerateOutline} disabled={loading}>Regenerate Outline</button>
              <button className="btn btn-primary" onClick={handleWriteArticle} disabled={loading} style={{ height: 44, fontSize: 14 }}>
                {loading ? <><LoadingDots /></> : <><BookOpen size={16} /> Write Full Article</>}
              </button>
            </div>
          </>
        )}

        {/* STEP 5: Article + Score */}
        {step === 5 && article && (
          <>
            {/* SEO Score card */}
            {seoScore && (
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-header"><h3 className="card-title">SEO Score</h3></div>
                <div style={{ padding: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginBottom: 16 }}>
                    {[
                      { label: 'Overall', value: seoScore.overallScore },
                      { label: 'Readability', value: seoScore.readability },
                      { label: 'Keywords', value: seoScore.keywordUsage },
                      { label: 'Structure', value: seoScore.structure },
                      { label: 'Engagement', value: seoScore.engagement },
                      { label: 'E-E-A-T', value: seoScore.eeat },
                    ].map((item, i) => (
                      <div key={i} style={{ textAlign: 'center', padding: 12, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: getScoreColor(item.value || 0) }}>{item.value || '—'}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>{item.label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12 }}>
                    <div style={{ padding: 12, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ color: 'var(--text-tertiary)', fontSize: 10 }}>Word Count</div>
                      <div style={{ fontWeight: 600 }}>{seoScore.wordCount || '—'}</div>
                    </div>
                    <div style={{ padding: 12, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ color: 'var(--text-tertiary)', fontSize: 10 }}>Reading Time</div>
                      <div style={{ fontWeight: 600 }}>{seoScore.readingTime || '—'}</div>
                    </div>
                    <div style={{ padding: 12, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ color: 'var(--text-tertiary)', fontSize: 10 }}>Keyword Density</div>
                      <div style={{ fontWeight: 600 }}>{seoScore.keywordDensity || '—'}</div>
                    </div>
                    <div style={{ padding: 12, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ color: 'var(--text-tertiary)', fontSize: 10 }}>Passive Voice</div>
                      <div style={{ fontWeight: 600 }}>{seoScore.passiveVoicePercent || '—'}%</div>
                    </div>
                  </div>

                  {(seoScore.issues || []).length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--error)' }}>Issues to Fix</div>
                      {seoScore.issues.slice(0, 8).map((issue, i) => (
                        <div key={i} style={{ fontSize: 11, padding: '6px 0', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>• {issue}</div>
                      ))}
                    </div>
                  )}

                  {(seoScore.suggestions || []).length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--accent)' }}>Improvement Suggestions</div>
                      {seoScore.suggestions.slice(0, 8).map((sug, i) => (
                        <div key={i} style={{ fontSize: 11, padding: '6px 0', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>• {sug}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Meta Tags */}
            {metaTags && (
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 className="card-title">Meta Tags</h3>
                  <button className="btn btn-sm" onClick={copyMetaTags}><Copy size={12} /> Copy HTML</button>
                </div>
                <div style={{ padding: '16px', fontSize: 12 }}>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ color: 'var(--text-tertiary)', fontSize: 10, marginBottom: 2 }}>Title ({metaTags.titleLength || metaTags.title?.length} chars)</div>
                    <div style={{ fontWeight: 600, color: '#1a0dab' }}>{metaTags.title}</div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ color: 'var(--text-tertiary)', fontSize: 10, marginBottom: 2 }}>Description ({metaTags.descriptionLength || metaTags.description?.length} chars)</div>
                    <div style={{ color: 'var(--text-secondary)' }}>{metaTags.description}</div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ color: 'var(--text-tertiary)', fontSize: 10, marginBottom: 2 }}>URL Slug</div>
                    <div style={{ color: 'var(--info)' }}>/{metaTags.urlSlug}</div>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ color: 'var(--text-tertiary)', fontSize: 10, marginBottom: 2 }}>Schema</div>
                    <span className="badge" style={{ fontSize: 10 }}>{metaTags.schemaType || 'Article'}</span>
                  </div>
                  {metaTags.h1Suggestion && (
                    <div>
                      <div style={{ color: 'var(--text-tertiary)', fontSize: 10, marginBottom: 2 }}>H1 Suggestion</div>
                      <div style={{ fontWeight: 500 }}>{metaTags.h1Suggestion}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Article content */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="card-title">{outline?.title || 'Article'}</h3>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-sm" onClick={() => exportArticle('copy')}><Copy size={12} /> Copy</button>
                  <button className="btn btn-sm" onClick={() => exportArticle('markdown')}><Download size={12} /> .md</button>
                  <button className="btn btn-sm" onClick={() => exportArticle('html')}><Download size={12} /> .html</button>
                </div>
              </div>
              <div style={{ padding: '20px 24px', fontSize: 14, lineHeight: 1.8, color: 'var(--text-primary)', maxHeight: 600, overflow: 'auto' }}
                dangerouslySetInnerHTML={{ __html: articleHtml }} />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setStep(4)}>Back to Outline</button>
              <button className="btn btn-secondary" onClick={handleWriteArticle} disabled={loading}>Rewrite Article</button>
              <button className="btn btn-primary" onClick={() => { navigator.clipboard.writeText(article); setToast({ message: 'Full article copied!', type: 'success' }); }}>
                <Copy size={16} /> Copy Full Article
              </button>
            </div>
          </>
        )}

        {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      </div>
    </>
  );
}

// =============================================
// LEADS DASHBOARD — Analytics & Folder Organization
// =============================================
function LeadsDashboard() {
  const [folders, setFolders] = useState(() => {
    try { return JSON.parse(localStorage.getItem('protocol_lead_folders') || '[]'); } catch { return []; }
  });
  const [expandedFolder, setExpandedFolder] = useState(null);
  const [toast, setToast] = useState(null);

  const leads = getAllLeads();
  const totalLeads = leads.length;
  const emailCount = leads.filter(l => l.email).length;
  const phoneCount = leads.filter(l => l.phone).length;
  const thisWeek = leads.filter(l => Date.now() - l.scrapedAt < 7 * 86400000).length;

  const leadTypes = {};
  leads.forEach(l => { leadTypes[l.type || 'Other'] = (leadTypes[l.type || 'Other'] || 0) + 1; });
  const typeData = Object.entries(leadTypes).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }));

  const leadsOverTime = [
    { week: 'Week 1', count: Math.floor(leads.length * 0.15) },
    { week: 'Week 2', count: Math.floor(leads.length * 0.25) },
    { week: 'Week 3', count: Math.floor(leads.length * 0.35) },
    { week: 'Week 4', count: Math.floor(leads.length * 0.25) },
  ];

  const handleExportFolder = (folderId) => {
    const folder = folders.find(f => f.id === folderId);
    if (!folder || !folder.leads) return;
    exportToCSV(folder.leads, folder.name);
    setToast({ message: `Exported ${folder.leads.length} leads from ${folder.name}`, type: 'success' });
  };

  const handleDeleteFolder = (folderId) => {
    if (confirm('Delete this folder? Leads will not be removed.')) {
      const updated = folders.filter(f => f.id !== folderId);
      setFolders(updated);
      localStorage.setItem('protocol_lead_folders', JSON.stringify(updated));
    }
  };

  const chartColors = ['#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Leads Dashboard</h1>
          <p className="page-header-sub">Analytics and organization for your lead database</p>
        </div>
      </div>
      <div className="page-body">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        <div className="grid-4" style={{ marginBottom: 28 }}>
          <div className="stat-card"><span className="stat-card-label">Total Leads</span><span className="stat-card-value">{totalLeads}</span><span className="stat-card-change positive"><Database size={12} /> All time</span></div>
          <div className="stat-card"><span className="stat-card-label">Email Coverage</span><span className="stat-card-value">{totalLeads > 0 ? Math.round((emailCount / totalLeads) * 100) : 0}%</span><span className="stat-card-change positive"><Mail size={12} /> {emailCount} have email</span></div>
          <div className="stat-card"><span className="stat-card-label">Phone Coverage</span><span className="stat-card-value">{totalLeads > 0 ? Math.round((phoneCount / totalLeads) * 100) : 0}%</span><span className="stat-card-change positive"><Phone size={12} /> {phoneCount} have phone</span></div>
          <div className="stat-card"><span className="stat-card-label">This Week</span><span className="stat-card-value">{thisWeek}</span><span className="stat-card-change positive"><TrendingUp size={12} /> Last 7 days</span></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          <div className="glass-card">
            <div style={{ padding: 16, borderBottom: '1px solid var(--border)' }}><h3 className="card-title">Lead Types</h3></div>
            <div style={{ padding: 16, minHeight: 280 }}>
              {typeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <RechartsPieChart><Pie data={typeData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                    {typeData.map((entry, index) => (<Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />))}
                  </Pie><RechartsTooltip contentStyle={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8 }} /><Legend wrapperStyle={{ paddingTop: 12, fontSize: 12 }} /></RechartsPieChart>
                </ResponsiveContainer>
              ) : (<div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>No lead type data</div>)}
            </div>
          </div>
          <div className="glass-card">
            <div style={{ padding: 16, borderBottom: '1px solid var(--border)' }}><h3 className="card-title">Leads Over Time</h3></div>
            <div style={{ padding: 16, minHeight: 280 }}>
              <ResponsiveContainer width="100%" height={240}>
                <RechartsBarChart data={leadsOverTime} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="week" stroke="#64748b" style={{ fontSize: 12 }} /><YAxis stroke="#64748b" style={{ fontSize: 12 }} />
                  <RechartsTooltip contentStyle={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8 }} /><Bar dataKey="count" fill="#7c3aed" radius={[8, 8, 0, 0]} />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ padding: 16, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="card-title">Lead Folders</h3>
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{folders.length} folders</span>
          </div>
          {folders.length === 0 ? (
            <div className="empty-state" style={{ padding: 40 }}><Database size={40} style={{ color: 'var(--accent)', marginBottom: 12 }} /><h3>No folders yet</h3><p>Folders are created automatically when you search and save leads</p></div>
          ) : (
            <div>{folders.map(folder => (
              <div key={folder.id}>
                <div onClick={() => setExpandedFolder(expandedFolder === folder.id ? null : folder.id)} style={{ padding: 14, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: expandedFolder === folder.id ? 'var(--bg-tertiary)' : 'transparent', transition: 'background 0.2s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                    <Database size={18} style={{ color: 'var(--accent)' }} />
                    <div><div style={{ fontWeight: 600, fontSize: 13 }}>{folder.name}</div><div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{new Date(folder.date).toLocaleDateString()} • {folder.location} • {folder.leadCount} leads</div></div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); handleExportFolder(folder.id); }} style={{ fontSize: 11 }}><Download size={12} /> Export</button>
                    <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }} style={{ fontSize: 11, color: 'var(--error)' }}>×</button>
                  </div>
                </div>
                {expandedFolder === folder.id && folder.leads && (
                  <div style={{ background: 'var(--bg-primary)', padding: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
                      {folder.leads.slice(0, 6).map((lead, i) => (
                        <div key={i} style={{ background: 'var(--bg-tertiary)', padding: 8, borderRadius: 6, fontSize: 11 }}>
                          <div style={{ fontWeight: 600 }}>{lead.name}</div>
                          {lead.email && <div style={{ color: 'var(--accent)', marginTop: 2 }}>{lead.email.split(',')[0]}</div>}
                          {lead.phone && <div style={{ color: 'var(--success)', marginTop: 2 }}>{lead.phone}</div>}
                        </div>
                      ))}
                      {folder.leads.length > 6 && <div style={{ padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: 11 }}>+{folder.leads.length - 6} more</div>}
                    </div>
                  </div>
                )}
              </div>
            ))}</div>
          )}
        </div>
      </div>
    </>
  );
}

// =============================================
// STRATEGY BUILDER — AI-Powered Marketing Strategy Generator
// =============================================
function StrategyBuilder() {
  const [step, setStep] = useState(1);
  const [strategyType, setStrategyType] = useState(null);
  const [objective, setObjective] = useState('');
  const [timeline, setTimeline] = useState('');
  const [budget, setBudget] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [strategy, setStrategy] = useState('');
  const [progress, setProgress] = useState(0);

  const strategyTypes = [
    { id: 'gtm', name: 'GTM Launch', icon: Target, desc: 'Go-to-market strategy for product launch', color: '#7c3aed' },
    { id: 'leadgen', name: 'Lead Gen Playbook', icon: Crosshair, desc: 'Lead generation and nurturing campaigns', color: '#06b6d4' },
    { id: 'content-seo', name: 'Content & SEO', icon: Globe, desc: 'Content strategy and SEO roadmap', color: '#10b981' },
    { id: 'full-plan', name: 'Full Marketing Plan', icon: BarChart3, desc: 'Complete 12-month marketing strategy', color: '#f59e0b' },
  ];

  const leads = getAllLeads();
  const history = getSearchHistory();
  const seoData = getSEODashboardData();

  const handleGenerateStrategy = async () => {
    if (!strategyType || !objective.trim()) return;
    if (!isApiKeySet()) { alert('Set your AI API key in Settings first'); return; }
    setStep(3); setLoading(true); setProgress(10);
    try {
      const context = { objective, timeline: timeline || 'Not specified', budget: budget || 'Not specified', notes, leadCount: leads.length, emailCoverage: leads.length > 0 ? Math.round((leads.filter(l => l.email).length / leads.length) * 100) : 0, recentSearches: history.slice(0, 5).map(h => h.query), seoTracked: seoData.trackedDomains, keywords: seoData.totalKeywords };
      setProgress(30);
      const systemPrompt = `You are an expert marketing strategist at Protocol. Generate a comprehensive ${strategyType === 'gtm' ? 'Go-to-Market' : strategyType === 'leadgen' ? 'Lead Generation' : strategyType === 'content-seo' ? 'Content & SEO' : 'Full Marketing'} strategy.\n\nContext:\n- Objective: ${context.objective}\n- Timeline: ${context.timeline}\n- Budget: ${context.budget}\n- Notes: ${context.notes || 'None'}\n- Current leads: ${context.leadCount}\n- Email coverage: ${context.emailCoverage}%\n- SEO: ${context.seoTracked} domains, ${context.keywords} keywords\n\nFormat with clear sections:\n1. Executive Summary\n2. Key Objectives\n3. Strategy Pillars\n4. Timeline & Milestones\n5. Budget Allocation\n6. Success Metrics\n7. Next 30-Day Actions`;
      setProgress(50);
      const response = await callClaude({ messages: [{ role: 'user', content: `Generate a ${strategyType} strategy: ${context.objective}\nTimeline: ${context.timeline}\nBudget: ${context.budget}` }], system: systemPrompt, maxTokens: 4000, temperature: 0.7 });
      setProgress(85); setStrategy(response.content); setProgress(100);
      setTimeout(() => { setStep(4); setLoading(false); }, 500);
    } catch (err) { alert('Error: ' + err.message); setStep(2); setLoading(false); }
  };

  const handleExportPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      doc.setFontSize(20); doc.setTextColor(124, 58, 237); doc.text('PROTOCOL', 20, 20);
      doc.setFontSize(12); doc.setTextColor(100, 116, 139);
      const typeLabel = strategyTypes.find(t => t.id === strategyType)?.name || 'Strategy';
      doc.text(`${typeLabel} — ${new Date().toLocaleDateString()}`, 20, 30);
      doc.setDrawColor(124, 58, 237); doc.line(20, 34, 190, 34);
      doc.setFontSize(11); doc.setTextColor(30, 30, 30);
      const lines = doc.splitTextToSize(strategy, 170);
      let y = 42;
      lines.forEach(line => { if (y > 280) { doc.addPage(); y = 20; } doc.text(line, 20, y); y += 6; });
      doc.setFontSize(8); doc.setTextColor(100, 116, 139); doc.text('Generated by Protocol Strategy Builder', 20, doc.internal.pageSize.height - 10);
      doc.save(`protocol-strategy-${strategyType}-${Date.now()}.pdf`);
    } catch (err) { alert('PDF error: ' + err.message); }
  };

  return (
    <>
      <div className="page-header"><div><h1>Strategy Builder</h1><p className="page-header-sub">AI-powered marketing strategy generator with PDF export</p></div></div>
      <div className="page-body">
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Select Strategy Type</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
              {strategyTypes.map(type => { const IconComp = type.icon; return (
                <button key={type.id} onClick={() => { setStrategyType(type.id); setStep(2); }}
                  className="glass-card" style={{ padding: 24, cursor: 'pointer', textAlign: 'left', border: '2px solid var(--border)', transition: 'all 0.3s' }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = type.color; }} onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}>
                  <IconComp size={32} style={{ color: type.color, marginBottom: 12 }} />
                  <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{type.name}</h3>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{type.desc}</p>
                </button>
              ); })}
            </div>
          </div>
        )}
        {step === 2 && (
          <div style={{ maxWidth: 600 }}>
            <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', marginBottom: 16, fontSize: 14 }}>← Back</button>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>{strategyTypes.find(t => t.id === strategyType)?.name} Details</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="input-group"><label>What is your main objective?</label><textarea value={objective} onChange={e => setObjective(e.target.value)} placeholder="e.g., Launch new product line, increase leads by 50%" style={{ minHeight: 100 }} /></div>
              <div className="input-group"><label>Timeline</label><input type="text" value={timeline} onChange={e => setTimeline(e.target.value)} placeholder="e.g., 6 months, Q2-Q3 2026" /></div>
              <div className="input-group"><label>Budget</label><input type="text" value={budget} onChange={e => setBudget(e.target.value)} placeholder="e.g., ₹5L/month, $50k total" /></div>
              <div className="input-group"><label>Additional Notes (optional)</label><textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any additional context..." style={{ minHeight: 80 }} /></div>
              <button className="btn btn-primary" onClick={handleGenerateStrategy} disabled={!objective.trim()}>Generate Strategy</button>
            </div>
          </div>
        )}
        {step === 3 && (
          <div style={{ maxWidth: 500, margin: '0 auto', textAlign: 'center', padding: '60px 20px' }}>
            <Zap size={48} style={{ color: 'var(--accent)', marginBottom: 20 }} />
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Generating Your Strategy</h2>
            <p style={{ color: 'var(--text-tertiary)', marginBottom: 24 }}>Analyzing your brief and creating a customized plan...</p>
            <div className="score-bar" style={{ marginBottom: 12 }}><div className="score-bar-fill" style={{ width: `${progress}%`, background: 'var(--accent)', transition: 'width 0.5s ease' }} /></div>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{progress}% complete</p>
          </div>
        )}
        {step === 4 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600 }}>{strategyTypes.find(t => t.id === strategyType)?.name}</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" onClick={handleExportPDF}><Download size={14} /> Export PDF</button>
                <button className="btn" onClick={() => navigator.clipboard.writeText(strategy)}><Copy size={14} /> Copy</button>
              </div>
            </div>
            <div className="card" style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.7, color: 'var(--text-primary)', padding: 24 }}>{strategy}</div>
            <button className="btn" onClick={() => { setStep(1); setStrategy(''); setObjective(''); setTimeline(''); setBudget(''); setNotes(''); }} style={{ marginTop: 20 }}>Create New Strategy</button>
          </div>
        )}
      </div>
    </>
  );
}

// =============================================
// CONTENT HUB — Merged Content + Marketing AI
// =============================================
function ContentHub() {
  const [activeTab, setActiveTab] = useState('skills');

  const tabs = [
    { id: 'skills', name: 'AI Skills Hub', icon: Zap },
    { id: 'blog', name: 'Blog Writer', icon: BookOpen },
    { id: 'email', name: 'Email Writer', icon: Inbox },
    { id: 'copywriter', name: 'Copywriter', icon: Type },
    { id: 'ad-creative', name: 'Ad Creative', icon: Megaphone },
  ];

  return (
    <>
      <div className="page-header"><div><h1>Content Hub</h1><p className="page-header-sub">All your content creation and marketing AI tools in one place</p></div></div>
      <div className="page-body">
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap', background: 'var(--bg-secondary)', padding: 6, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          {tabs.map(tab => { const TabIcon = tab.icon; return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ padding: '10px 16px', background: activeTab === tab.id ? 'var(--accent)' : 'transparent', color: activeTab === tab.id ? '#fff' : 'var(--text-secondary)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 500, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' }}>
              <TabIcon size={14} /> {tab.name}
            </button>
          ); })}
        </div>
        {activeTab === 'skills' && <MarketingSkillsHub />}
        {activeTab === 'blog' && <BlogWriter />}
        {activeTab === 'email' && <CompanyEmail />}
        {activeTab === 'copywriter' && <SkillPanel skillKey="copywriting" />}
        {activeTab === 'ad-creative' && <SkillPanel skillKey="ad-creative" />}
      </div>
    </>
  );
}

// =============================================
// USER MANAGEMENT / ADMIN PANEL
// =============================================
const ALL_TOOLS = [
  { id: 'dashboard', label: 'Dashboard', section: 'Brimstone' },
  { id: 'leads-dashboard', label: 'Leads Analytics', section: 'Brimstone' },
  { id: 'strategy-builder', label: 'Strategy Builder', section: 'Brimstone' },
  { id: 'lead-search', label: 'Lead Search', section: 'Chamber' },
  { id: 'email-extractor', label: 'Email Extractor', section: 'Chamber' },
  { id: 'my-leads', label: 'My Leads', section: 'Chamber' },
  { id: 'lead-verifier', label: 'Lead Verifier', section: 'Chamber' },
  { id: 'instagram', label: 'Instagram Scraper', section: 'Cypher' },
  { id: 'facebook', label: 'Facebook / Meta', section: 'Cypher' },
  { id: 'fb-ads', label: 'FB Ads Library', section: 'Cypher' },
  { id: 'linkedin', label: 'LinkedIn Scraper', section: 'Cypher' },
  { id: 'twitter', label: 'Twitter / X Scraper', section: 'Cypher' },
  { id: 'website-analysis', label: 'Full Analysis', section: 'Killjoy' },
  { id: 'seo-dashboard', label: 'SEO Dashboard', section: 'Killjoy' },
  { id: 'site-audit', label: 'Site Audit', section: 'Killjoy' },
  { id: 'on-page-seo', label: 'On-Page SEO', section: 'Killjoy' },
  { id: 'backlinks', label: 'Backlinks', section: 'Killjoy' },
  { id: 'rank-tracker', label: 'Rank Tracker', section: 'Killjoy' },
  { id: 'keyword-research', label: 'Keyword Discovery', section: 'Sova' },
  { id: 'keyword-gap', label: 'Content Gaps', section: 'Sova' },
  { id: 'organic-research', label: 'Competitor Keywords', section: 'Sova' },
  { id: 'domain-overview', label: 'Domain Overview', section: 'Sova' },
  { id: 'content-research', label: 'Content Research', section: 'Sova' },
  { id: 'traffic-insights', label: 'Traffic Insights', section: 'Sova' },
  { id: 'content-analyzer', label: 'Content Analyzer', section: 'Sova' },
  { id: 'ad-intelligence', label: 'Ad Intelligence', section: 'Sova' },
  { id: 'brand-monitoring', label: 'Brand Monitor', section: 'Sova' },
  { id: 'serp-scraper', label: 'SERP Scraper', section: 'Sova' },
  { id: 'content-hub', label: 'Content Hub', section: 'Neon' },
  { id: 'blog', label: 'Blog Writer', section: 'Neon' },
  { id: 'email', label: 'Company Email', section: 'Neon' },
  { id: 'marketing-hub', label: 'Skills Hub', section: 'Neon' },
  { id: 'copywriter', label: 'Copywriter', section: 'Neon' },
  { id: 'ad-creative', label: 'Ad Creative', section: 'Neon' },
  { id: 'email-sequence', label: 'Email Sequences', section: 'Neon' },
  { id: 'launch-planner', label: 'Launch Planner', section: 'Neon' },
  { id: 'pricing-lab', label: 'Pricing Lab', section: 'Neon' },
  { id: 'cro-analyzer', label: 'CRO Analyzer', section: 'Neon' },
  { id: 'settings', label: 'Settings', section: 'Lobby' },
];

const ROLES = ['Admin', 'Manager', 'Analyst', 'Viewer'];

function UserManagement() {
  const [users, setUsers] = useState(() => getUsers());
  const [toast, setToast] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newUser, setNewUser] = useState({ username: '', pin: '', role: 'Viewer', allowedTools: ALL_TOOLS.map(t => t.id) });

  const handleAddUser = () => {
    if (!newUser.username.trim()) { setToast({ message: 'Username required', type: 'error' }); return; }
    if (!newUser.pin || newUser.pin.length < 4) { setToast({ message: 'PIN must be at least 4 digits', type: 'error' }); return; }
    if (users.some(u => u.username === newUser.username.trim())) { setToast({ message: 'Username already exists', type: 'error' }); return; }

    const updated = [...users, { ...newUser, username: newUser.username.trim(), createdAt: Date.now() }];
    setUsers(updated);
    saveUsers(updated);
    setNewUser({ username: '', pin: '', role: 'Viewer', allowedTools: ALL_TOOLS.map(t => t.id) });
    setShowAdd(false);
    setToast({ message: `User "${newUser.username.trim()}" added`, type: 'success' });
  };

  const handleRemoveUser = (username) => {
    const updated = users.filter(u => u.username !== username);
    setUsers(updated);
    saveUsers(updated);
    setToast({ message: `User "${username}" removed`, type: 'success' });
  };

  const handleUpdateUser = (username, changes) => {
    const updated = users.map(u => u.username === username ? { ...u, ...changes } : u);
    setUsers(updated);
    saveUsers(updated);
    setEditingUser(null);
    setToast({ message: `User "${username}" updated`, type: 'success' });
  };

  const toggleTool = (toolId, userObj, setter) => {
    const tools = userObj.allowedTools || [];
    const next = tools.includes(toolId) ? tools.filter(t => t !== toolId) : [...tools, toolId];
    setter({ ...userObj, allowedTools: next });
  };

  const toggleAllTools = (userObj, setter) => {
    const allIds = ALL_TOOLS.map(t => t.id);
    const next = (userObj.allowedTools || []).length === allIds.length ? [] : allIds;
    setter({ ...userObj, allowedTools: next });
  };

  const roleColor = (r) => ({ Admin: 'var(--error)', Manager: 'var(--accent)', Analyst: 'var(--info)', Viewer: 'var(--text-tertiary)' }[r] || 'var(--text-tertiary)');
  const sections = [...new Set(ALL_TOOLS.map(t => t.section))];

  return (
    <>
      <div className="page-header">
        <div><h1>User Management</h1><p className="page-header-sub">Add users, assign roles, and control tool access</p></div>
        <button className="btn btn-primary" onClick={() => setShowAdd(!showAdd)}>{showAdd ? 'Cancel' : <><Users size={16} /> Add User</>}</button>
      </div>
      <div className="page-body">
        {/* Add User Form */}
        {showAdd && (
          <div className="card" style={{ marginBottom: 20, padding: 20 }}>
            <h3 style={{ fontSize: 15, marginBottom: 16 }}>Add New User</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label className="label">Username</label>
                <input className="input" value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} placeholder="johndoe" />
              </div>
              <div>
                <label className="label">PIN (4+ digits)</label>
                <input className="input" type="password" value={newUser.pin} onChange={e => setNewUser({ ...newUser, pin: e.target.value })} placeholder="1234" />
              </div>
              <div>
                <label className="label">Role</label>
                <select className="input" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>

            {/* Tool access checkboxes */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <label className="label" style={{ margin: 0 }}>Tool Access</label>
                <button className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => toggleAllTools(newUser, setNewUser)}>
                  {(newUser.allowedTools || []).length === ALL_TOOLS.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              {sections.map(sec => (
                <div key={sec} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{sec}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {ALL_TOOLS.filter(t => t.section === sec).map(tool => (
                      <label key={tool.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '4px 10px', background: (newUser.allowedTools || []).includes(tool.id) ? 'rgba(99,102,241,0.15)' : 'var(--bg-tertiary)', borderRadius: 6, cursor: 'pointer', border: '1px solid ' + ((newUser.allowedTools || []).includes(tool.id) ? 'var(--accent)' : 'transparent') }}>
                        <input type="checkbox" checked={(newUser.allowedTools || []).includes(tool.id)} onChange={() => toggleTool(tool.id, newUser, setNewUser)} style={{ accentColor: 'var(--accent)' }} />
                        {tool.label}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button className="btn btn-primary" onClick={handleAddUser}>Create User</button>
          </div>
        )}

        {/* Admin card */}
        <div className="card" style={{ marginBottom: 16, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '3px solid var(--error)' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--error)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: 14 }}>A</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>admin</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Super Admin — Full access to all tools</div>
            </div>
          </div>
          <span className="badge" style={{ background: 'var(--error)', color: '#fff' }}>Admin</span>
        </div>

        {/* User list */}
        {users.length === 0 ? (
          <div className="card">
            <div className="empty-state" style={{ padding: 60 }}><Users /><h3>No users added</h3><p>Click "Add User" to create team members with specific access.</p></div>
          </div>
        ) : users.map((user, i) => (
          <div key={i} className="card" style={{ marginBottom: 12, borderLeft: `3px solid ${roleColor(user.role)}` }}>
            <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: roleColor(user.role), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: 14 }}>{user.username[0].toUpperCase()}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{user.username}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{(user.allowedTools || []).length}/{ALL_TOOLS.length} tools • Created {new Date(user.createdAt).toLocaleDateString()}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className="badge" style={{ background: roleColor(user.role), color: '#fff' }}>{user.role}</span>
                <button className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => setEditingUser(editingUser === user.username ? null : user.username)}>
                  {editingUser === user.username ? 'Close' : 'Edit'}
                </button>
                <button className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 10px', color: 'var(--error)' }} onClick={() => handleRemoveUser(user.username)}>
                  <Trash2 size={12} /> Remove
                </button>
              </div>
            </div>

            {editingUser === user.username && (
              <div style={{ padding: '0 20px 16px', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label className="label">Role</label>
                    <select className="input" value={user.role} onChange={e => handleUpdateUser(user.username, { role: e.target.value })}>
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">New PIN (leave empty to keep)</label>
                    <input className="input" type="password" placeholder="••••" onBlur={e => { if (e.target.value.length >= 4) handleUpdateUser(user.username, { pin: e.target.value }); }} />
                  </div>
                </div>
                <label className="label">Tool Access</label>
                {sections.map(sec => (
                  <div key={sec} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{sec}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {ALL_TOOLS.filter(t => t.section === sec).map(tool => (
                        <label key={tool.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '3px 8px', background: (user.allowedTools || []).includes(tool.id) ? 'rgba(99,102,241,0.15)' : 'var(--bg-tertiary)', borderRadius: 5, cursor: 'pointer' }}>
                          <input type="checkbox" checked={(user.allowedTools || []).includes(tool.id)} onChange={() => {
                            const tools = user.allowedTools || [];
                            const next = tools.includes(tool.id) ? tools.filter(t => t !== tool.id) : [...tools, tool.id];
                            handleUpdateUser(user.username, { allowedTools: next });
                          }} style={{ accentColor: 'var(--accent)' }} />
                          {tool.label}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      </div>
    </>
  );
}

// =============================================
// SETTINGS
// =============================================
// =============================================
// CLOUD SYNC PANEL
// =============================================
function SyncPanel({ toast }) {
  const [firebaseConfigStr, setFirebaseConfigStr] = useState(() => localStorage.getItem('protocol_firebase_config') || '');
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [connected, setConnected] = useState(isSyncEnabled());

  useEffect(() => {
    // Try to auto-connect if config exists
    const saved = localStorage.getItem('protocol_firebase_config');
    if (saved && !isSyncEnabled()) {
      const config = parseFirebaseConfig(saved);
      if (config) {
        const ok = initSync(config);
        setConnected(ok);
      }
    }
  }, []);

  useEffect(() => {
    if (connected) {
      const pin = sessionStorage.getItem('kj_current_user') || localStorage.getItem('kj_last_user');
      if (pin) {
        getSyncStatus(pin).then(s => setSyncStatus(s));
      }
    }
  }, [connected]);

  const handleConnect = () => {
    const config = parseFirebaseConfig(firebaseConfigStr);
    if (!config) {
      toast({ message: 'Invalid Firebase config. Paste the full JSON object with apiKey, projectId, and databaseURL.', type: 'error' });
      return;
    }
    localStorage.setItem('protocol_firebase_config', firebaseConfigStr.trim());
    const ok = initSync(config);
    setConnected(ok);
    if (ok) toast({ message: 'Firebase connected! You can now sync data across devices.', type: 'success' });
    else toast({ message: 'Failed to connect to Firebase. Check your config.', type: 'error' });
  };

  const handlePush = async () => {
    setSyncing(true);
    const pin = sessionStorage.getItem('kj_current_user') || localStorage.getItem('kj_last_user');
    if (!pin) { toast({ message: 'No user session found', type: 'error' }); setSyncing(false); return; }
    const result = await pushToCloud(pin);
    if (result.success) {
      localStorage.setItem('_protocol_last_local_sync', String(Date.now()));
      toast({ message: `Synced ${result.keys} items to cloud`, type: 'success' });
      getSyncStatus(pin).then(s => setSyncStatus(s));
    } else {
      toast({ message: `Sync failed: ${result.error}`, type: 'error' });
    }
    setSyncing(false);
  };

  const handlePull = async () => {
    setSyncing(true);
    const pin = sessionStorage.getItem('kj_current_user') || localStorage.getItem('kj_last_user');
    if (!pin) { toast({ message: 'No user session found', type: 'error' }); setSyncing(false); return; }
    const result = await pullFromCloud(pin);
    if (result.success) {
      toast({ message: result.keys > 0 ? `Pulled ${result.keys} items from cloud` : 'No cloud data found for this user', type: result.keys > 0 ? 'success' : 'info' });
    } else {
      toast({ message: `Pull failed: ${result.error}`, type: 'error' });
    }
    setSyncing(false);
  };

  return (
    <div>
      {!connected ? (
        <>
          <label className="label">Firebase Config (JSON)</label>
          <textarea className="input" rows={5} value={firebaseConfigStr} onChange={e => setFirebaseConfigStr(e.target.value)}
            placeholder={'{\n  "apiKey": "...",\n  "authDomain": "...",\n  "projectId": "...",\n  "databaseURL": "https://....firebaseio.com",\n  "storageBucket": "...",\n  "messagingSenderId": "...",\n  "appId": "..."\n}'}
            style={{ fontFamily: 'monospace', fontSize: 11, resize: 'vertical' }} />
          <button className="btn btn-primary" onClick={handleConnect} style={{ marginTop: 10 }}><Zap size={14} /> Connect Firebase</button>
        </>
      ) : (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button className="btn btn-primary" onClick={handlePush} disabled={syncing} style={{ flex: 1 }}>
              {syncing ? <><LoadingDots /> Syncing...</> : <><Send size={14} /> Push to Cloud</>}
            </button>
            <button className="btn btn-secondary" onClick={handlePull} disabled={syncing} style={{ flex: 1 }}>
              {syncing ? <><LoadingDots /> Pulling...</> : <><Download size={14} /> Pull from Cloud</>}
            </button>
          </div>
          {syncStatus && syncStatus.hasCloudData && (
            <div style={{ padding: '10px 14px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--text-secondary)' }}>
              <div>Last synced: <strong>{new Date(syncStatus.lastSync).toLocaleString()}</strong></div>
              <div>From: {syncStatus.device}</div>
              <div>Cloud items: {syncStatus.keyCount}</div>
            </div>
          )}
          <button className="btn btn-sm" onClick={() => { localStorage.removeItem('protocol_firebase_config'); setConnected(false); setFirebaseConfigStr(''); }}
            style={{ marginTop: 10, fontSize: 11, color: 'var(--text-tertiary)' }}>
            Disconnect Firebase
          </button>
        </div>
      )}
    </div>
  );
}

function SettingsPage() {
  const [toast, setToast] = useState(null);
  const [googleKey, setGoogleKey] = useState(() => localStorage.getItem('kj_google_key') || '');
  const [apifyToken, setApifyToken] = useState(() => localStorage.getItem('kj_apify_token') || '');
  const [corsProxy, setCorsProxy] = useState(() => localStorage.getItem('kj_cors_proxy') || 'https://corsproxy.io/?');
  const [shopifyStore, setShopifyStore] = useState(() => localStorage.getItem('kj_shopify_store') || '');
  const [shopifyToken, setShopifyToken] = useState(() => localStorage.getItem('kj_shopify_token') || '');
  const [claudeKey, setClaudeKey] = useState(() => localStorage.getItem('kj_claude_key') || '');
  const [openaiKey, setOpenaiKey] = useState(() => localStorage.getItem('kj_openai_key') || '');
  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem('kj_gemini_key') || '');
  const [showKeys, setShowKeys] = useState({});

  const saveKey = (storageKey, value, label) => {
    if (value.trim()) {
      localStorage.setItem(storageKey, value.trim());
      setToast({ message: `${label} saved!`, type: 'success' });
    } else {
      localStorage.removeItem(storageKey);
      setToast({ message: `${label} removed`, type: 'info' });
    }
  };

  const toggleShow = (key) => setShowKeys(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <>
      <div className="page-header">
        <div><h1>Settings</h1><p className="page-header-sub">Configure your API keys and integrations</p></div>
      </div>
      <div className="page-body">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 640 }}>

          {/* Google Places API Key */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <h3 className="card-title" style={{ color: '#4285f4' }}>Google Places API Key</h3>
              <span className="badge badge-error">Required for Lead Search</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 14 }}>
              Powers business search from Google Maps. Get yours at <a href="https://console.cloud.google.com/apis/library/places-backend.googleapis.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--info)' }}>Google Cloud Console</a>.
              Enable "Places API (New)" and create an API key.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input type={showKeys.google ? 'text' : 'password'} value={googleKey} onChange={e => setGoogleKey(e.target.value)} placeholder="AIza..." style={{ paddingRight: 40 }} />
                <button onClick={() => toggleShow('google')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 11 }}>{showKeys.google ? 'Hide' : 'Show'}</button>
              </div>
              <button className="btn btn-primary" onClick={() => saveKey('kj_google_key', googleKey, 'Google API key')}><Check size={14} /> Save</button>
            </div>
            {localStorage.getItem('kj_google_key') && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 6 }}><Check size={12} /> Key configured</div>}
          </div>

          {/* Apify API Token */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <h3 className="card-title" style={{ color: '#00d68f' }}>Apify API Token</h3>
              <span className="badge badge-error">Required for SEO Tools</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 14 }}>
              Powers SERP scraping, rank tracking, and site audit. Get yours at <a href="https://console.apify.com/account/integrations" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--info)' }}>console.apify.com</a>.
              Free tier: 48 compute units/month (enough for ~100 searches).
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input type={showKeys.apify ? 'text' : 'password'} value={apifyToken} onChange={e => setApifyToken(e.target.value)} placeholder="apify_api_..." style={{ paddingRight: 40 }} />
                <button onClick={() => toggleShow('apify')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 11 }}>{showKeys.apify ? 'Hide' : 'Show'}</button>
              </div>
              <button className="btn btn-primary" onClick={() => saveKey('kj_apify_token', apifyToken, 'Apify token')}><Check size={14} /> Save</button>
            </div>
            {localStorage.getItem('kj_apify_token') && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 6 }}><Check size={12} /> Token configured</div>}
          </div>

          {/* CORS Proxy */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <h3 className="card-title">CORS Proxy</h3>
              <span className="badge badge-info">Required for Email Extraction</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 14 }}>Used to fetch website HTML from the browser for email extraction. Default works for most cases.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" value={corsProxy} onChange={e => setCorsProxy(e.target.value)} placeholder="https://corsproxy.io/?" style={{ flex: 1 }} />
              <button className="btn btn-secondary" onClick={() => saveKey('kj_cors_proxy', corsProxy, 'CORS proxy')}><Check size={14} /> Save</button>
            </div>
          </div>

          {/* Shopify Store */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <h3 className="card-title" style={{ color: '#96bf48' }}>Shopify Store</h3>
              <span className="badge badge-info">For SEO Fixer</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 14 }}>
              Connect your Shopify store to enable the SEO Fixer. You'll need a Custom App with read/write access to Products, Pages, Blogs, Themes, and Redirects.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label className="label">Shopify Store URL</label>
                <input className="input" value={shopifyStore} onChange={e => setShopifyStore(e.target.value)} placeholder="mystore.myshopify.com" />
              </div>
              <div>
                <label className="label">Admin API Token</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <input type={showKeys.shopify ? 'text' : 'password'} value={shopifyToken} onChange={e => setShopifyToken(e.target.value)} placeholder="shpat_..." style={{ paddingRight: 40 }} />
                    <button onClick={() => setShowKeys(prev => ({ ...prev, shopify: !prev.shopify }))} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 11 }}>{showKeys.shopify ? 'Hide' : 'Show'}</button>
                  </div>
                  <button className="btn btn-primary" onClick={() => { saveKey('kj_shopify_store', shopifyStore, 'Shopify store'); saveKey('kj_shopify_token', shopifyToken, 'Shopify token'); }}><Check size={14} /> Save</button>
                </div>
              </div>
            </div>
            {localStorage.getItem('kj_shopify_store') && localStorage.getItem('kj_shopify_token') && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 6 }}><Check size={12} /> Store configured</div>}
          </div>

          {/* AI Keys (Optional — for future AI enrichment) */}
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 4 }}>AI Provider Keys</h3>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 14 }}>Optional — for AI-powered lead enrichment and analysis in future updates.</p>

            {[
              { id: 'claude', key: claudeKey, set: setClaudeKey, store: 'kj_claude_key', label: 'Claude (Anthropic)', placeholder: 'sk-ant-api03-...', color: '#7c3aed' },
              { id: 'openai', key: openaiKey, set: setOpenaiKey, store: 'kj_openai_key', label: 'OpenAI / ChatGPT', placeholder: 'sk-proj-...', color: '#10a37f' },
              { id: 'gemini', key: geminiKey, set: setGeminiKey, store: 'kj_gemini_key', label: 'Google Gemini', placeholder: 'AIza...', color: '#4285f4' },
            ].map(prov => (
              <div key={prov.id} style={{ marginBottom: 12 }}>
                <label className="label" style={{ color: prov.color }}>{prov.label}</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <input type={showKeys[prov.id] ? 'text' : 'password'} value={prov.key} onChange={e => prov.set(e.target.value)} placeholder={prov.placeholder} style={{ paddingRight: 40 }} />
                    <button onClick={() => toggleShow(prov.id)} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 11 }}>{showKeys[prov.id] ? 'Hide' : 'Show'}</button>
                  </div>
                  <button className="btn btn-secondary" onClick={() => saveKey(prov.store, prov.key, prov.label)}><Check size={14} /></button>
                </div>
                {localStorage.getItem(prov.store) && <div style={{ marginTop: 4, fontSize: 11, color: 'var(--success)' }}><Check size={10} /> Set</div>}
              </div>
            ))}
          </div>

          {/* Sound Settings */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 className="card-title">Agent Sounds</h3>
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
                  Valorant agent voice lines and sound effects when navigating sections
                </p>
              </div>
              <button
                onClick={() => {
                  const newVal = localStorage.getItem('protocol_sounds_muted') === 'true' ? 'false' : 'true';
                  localStorage.setItem('protocol_sounds_muted', newVal);
                  setToast({ message: newVal === 'true' ? 'Sounds muted' : 'Sounds enabled', type: 'info' });
                  // Force page refresh to update the mute state in the main App component
                  window.location.reload();
                }}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}
              >
                {localStorage.getItem('protocol_sounds_muted') === 'true'
                  ? <><MicOff size={14} /> Sounds Off</>
                  : <><Volume2 size={14} /> Sounds On</>
                }
              </button>
            </div>
          </div>

          {/* Cloud Sync */}
          <div className="card" style={{ border: '1px solid rgba(124,58,237,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <h3 className="card-title" style={{ color: 'var(--accent)' }}>Cloud Sync</h3>
              <span className="badge" style={{ background: isSyncEnabled() ? 'var(--success)' : 'var(--bg-tertiary)', color: isSyncEnabled() ? '#fff' : 'var(--text-tertiary)' }}>
                {isSyncEnabled() ? 'Connected' : 'Not Connected'}
              </span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 14 }}>
              Sync your data across devices using Firebase. Create a free Firebase project at{' '}
              <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--info)' }}>console.firebase.google.com</a>.
              Enable Realtime Database, then paste your Firebase config JSON below.
            </p>
            <SyncPanel toast={setToast} />
          </div>

          {/* Data Management */}
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 16 }}>Data Management</h3>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn btn-secondary" onClick={() => { clearAllLeads(); setToast({ message: 'All leads cleared', type: 'info' }); }}><Trash2 size={14} /> Clear All Leads</button>
              <button className="btn btn-secondary" onClick={() => { removeUserData('search_history'); setToast({ message: 'Search history cleared', type: 'info' }); }}><Trash2 size={14} /> Clear Search History</button>
              <button className="btn btn-secondary" onClick={() => {
                ['kj_google_key', 'kj_apify_token', 'kj_claude_key', 'kj_openai_key', 'kj_gemini_key', 'kj_cors_proxy', 'kj_shopify_store', 'kj_shopify_token'].forEach(k => localStorage.removeItem(k));
                setGoogleKey(''); setApifyToken(''); setClaudeKey(''); setOpenaiKey(''); setGeminiKey(''); setCorsProxy('https://corsproxy.io/?'); setShopifyStore(''); setShopifyToken('');
                setToast({ message: 'All API keys cleared', type: 'info' });
              }}><Trash2 size={14} /> Clear All API Keys</button>
            </div>
          </div>

          {/* About */}
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 8 }}>About Protocol</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Protocol v3.0 — AI Marketing & SEO Engine<br />
              Google Places API for business search &bull; Email extraction via CORS proxy<br />
              CSV &amp; Excel export &bull; All data stored in your browser (localStorage)<br />
              Built for personal use by Shreyansh
            </p>
          </div>
        </div>
        {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      </div>
    </>
  );
}

// =============================================
// PIN LOGIN (Multi-user aware)
// =============================================
function PinLogin({ onSuccess }) {
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const [welcomeUser, setWelcomeUser] = useState(null);
  const [lockedIn, setLockedIn] = useState(false);
  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  useEffect(() => {
    inputRefs[0].current?.focus();
    // Play "Choose your agent" voice line on load
    try {
      const audio = new Audio('./sounds/choose-agent.mp3');
      audio.volume = 0.4;
      audio.play().catch(() => {});
    } catch (e) {}
  }, []);

  const tryAuth = (fullPin) => {
    const result = authenticatePin(fullPin);
    if (result.success) {
      setCurrentUser(result.username);
      sessionStorage.setItem('kj_auth', 'true');
      setWelcomeUser(result.username);
      setLockedIn(true);
      // Play spike plant sound on successful login (like locking in)
      try {
        const audio = new Audio('./sounds/spike-plant.mp3');
        audio.volume = 0.3;
        audio.play().catch(() => {});
      } catch (e) {}
      setTimeout(() => onSuccess(result.username, result.role), 800);
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => { setShake(false); setPin(['', '', '', '']); inputRefs[0].current?.focus(); }, 600);
    }
  };

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);
    setError(false);

    // Play subtle click on each digit
    if (value) {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(1200 + index * 200, ctx.currentTime);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.06);
        setTimeout(() => ctx.close(), 200);
      } catch (e) {}
    }

    if (value && index < 3) inputRefs[index + 1].current?.focus();

    const fullPin = newPin.join('');
    if (fullPin.length === 4) tryAuth(fullPin);
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) inputRefs[index - 1].current?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pasted.length === 4) {
      setPin(pasted.split(''));
      setTimeout(() => tryAuth(pasted), 50);
    }
  };

  return (
    <div className="pin-login-page">
      {/* Decorative elements */}
      <div className="val-login-side-left" />
      <div className="val-login-side-right" />
      <div className="val-corner-tl" />
      <div className="val-corner-br" />
      <div className="val-version">PROTOCOL // V3.0 // KIRO FOODS</div>

      <div className={`pin-login-card ${shake ? 'shake' : ''} ${lockedIn ? 'locked-in' : ''}`}>
        {/* Valorant-style logo mark */}
        <div className="pin-login-logo">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <path d="M24 4 L44 14 L44 34 L24 44 L4 34 L4 14Z" fill="none" stroke="#ff4655" strokeWidth="1.5" opacity="0.6"/>
            <path d="M24 10 L38 17 L38 31 L24 38 L10 31 L10 17Z" fill="rgba(255,70,85,0.08)" stroke="#ff4655" strokeWidth="1"/>
            <text x="24" y="28" textAnchor="middle" fill="#ff4655" fontSize="18" fontWeight="900" fontFamily="Inter, sans-serif">P</text>
          </svg>
        </div>

        <h1 className="pin-login-title">PROTOCOL</h1>
        <p className="pin-login-subtitle">Tactical Marketing Engine</p>
        <div className="pin-login-divider" />

        <div className="pin-login-lock"><Lock size={18} /></div>
        <p className="pin-login-label">Enter Agent PIN</p>

        <div className="pin-input-row">
          {pin.map((digit, i) => (
            <input key={i} ref={inputRefs[i]} type="password" inputMode="numeric" maxLength={1}
              value={digit} onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)} onPaste={i === 0 ? handlePaste : undefined}
              className={`pin-input ${digit ? 'filled' : ''} ${error ? 'error' : ''}`} autoComplete="off" />
          ))}
        </div>

        {welcomeUser && (
          <p style={{
            color: '#ff4655', fontSize: 14, marginTop: 8, fontWeight: 800,
            letterSpacing: 4, textTransform: 'uppercase',
            textShadow: '0 0 20px rgba(255,70,85,0.5)'
          }}>
            Agent {welcomeUser} — Locked In
          </p>
        )}
        {error && <p className="pin-error">Access Denied — Invalid PIN</p>}
        <p className="pin-login-footer">Each agent has a unique access code</p>
      </div>
    </div>
  );
}

// =============================================
// ADMIN PANEL — View all users' data
// =============================================
function AdminPanel() {
  const [selectedUser, setSelectedUser] = useState(null);
  const [viewMode, setViewMode] = useState('leads'); // leads | searches | ranks
  const allUsers = getAllUsernames();

  const userLeads = selectedUser ? getUserDataAs(selectedUser, 'leads', []) : [];
  const userSearches = selectedUser ? getUserDataAs(selectedUser, 'search_history', []) : [];
  const userRanks = selectedUser ? getUserDataAs(selectedUser, 'rank_history', {}) : {};

  // Aggregate stats
  const aggregateStats = allUsers.map(username => {
    const leads = getUserDataAs(username, 'leads', []);
    const searches = getUserDataAs(username, 'search_history', []);
    const ranks = getUserDataAs(username, 'rank_history', {});
    return {
      username,
      leadsCount: leads.length,
      searchCount: searches.length,
      domainsTracked: Object.keys(ranks).length,
      lastActivity: Math.max(
        ...(leads.length ? [Math.max(...leads.map(l => l.scrapedAt || 0))] : [0]),
        ...(searches.length ? [Math.max(...searches.map(s => s.date || 0))] : [0])
      )
    };
  });

  return (
    <>
      <div className="page-header">
        <div><h1>Admin Panel</h1><p className="page-header-sub">View and manage all users' data</p></div>
      </div>
      <div className="page-body">
        {/* User Stats Overview */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h3 className="card-title">All Users Activity</h3></div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: 10 }}>User</th>
                <th style={{ textAlign: 'center', padding: 10 }}>Leads</th>
                <th style={{ textAlign: 'center', padding: 10 }}>Searches</th>
                <th style={{ textAlign: 'center', padding: 10 }}>Domains Tracked</th>
                <th style={{ textAlign: 'center', padding: 10 }}>Last Activity</th>
                <th style={{ padding: 10 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {aggregateStats.map(stat => (
                <tr key={stat.username} style={{ borderBottom: '1px solid var(--border)', background: selectedUser === stat.username ? 'var(--accent-light)' : 'transparent' }}>
                  <td style={{ padding: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: stat.username === 'admin' ? 'var(--error)' : 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: 12 }}>
                        {stat.username[0].toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 600 }}>{stat.username}</span>
                      {stat.username === 'admin' && <span className="badge" style={{ background: 'var(--error)', color: '#fff', fontSize: 9 }}>Admin</span>}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', padding: 10, fontWeight: 600 }}>{stat.leadsCount}</td>
                  <td style={{ textAlign: 'center', padding: 10, fontWeight: 600 }}>{stat.searchCount}</td>
                  <td style={{ textAlign: 'center', padding: 10, fontWeight: 600 }}>{stat.domainsTracked}</td>
                  <td style={{ textAlign: 'center', padding: 10, fontSize: 11, color: 'var(--text-tertiary)' }}>
                    {stat.lastActivity > 0 ? new Date(stat.lastActivity).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding: 10 }}>
                    <button className="btn btn-sm" onClick={() => setSelectedUser(selectedUser === stat.username ? null : stat.username)}
                      style={{ background: selectedUser === stat.username ? 'var(--accent)' : 'var(--bg-tertiary)', color: selectedUser === stat.username ? '#fff' : 'var(--text-secondary)', fontSize: 11 }}>
                      {selectedUser === stat.username ? 'Close' : 'View Data'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Selected User Detail */}
        {selectedUser && (
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <UserCheck size={16} /> {selectedUser}'s Data
              </h3>
              <div style={{ display: 'flex', gap: 6 }}>
                {['leads', 'searches', 'ranks'].map(mode => (
                  <button key={mode} className="btn btn-sm" onClick={() => setViewMode(mode)}
                    style={{ background: viewMode === mode ? 'var(--accent)' : 'var(--bg-tertiary)', color: viewMode === mode ? '#fff' : 'var(--text-secondary)', fontSize: 11, textTransform: 'capitalize' }}>
                    {mode === 'leads' ? `Leads (${userLeads.length})` : mode === 'searches' ? `Searches (${userSearches.length})` : `Ranks (${Object.keys(userRanks).length})`}
                  </button>
                ))}
              </div>
            </div>

            {viewMode === 'leads' && (
              userLeads.length === 0 ? (
                <div className="empty-state" style={{ padding: 40 }}><Database /><h3>No leads</h3><p>This user hasn't saved any leads yet.</p></div>
              ) : (
                <div style={{ maxHeight: 400, overflow: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border)' }}>
                        <th style={{ textAlign: 'left', padding: 8 }}>#</th>
                        <th style={{ textAlign: 'left', padding: 8 }}>Business</th>
                        <th style={{ textAlign: 'left', padding: 8 }}>Phone</th>
                        <th style={{ textAlign: 'left', padding: 8 }}>Email</th>
                        <th style={{ textAlign: 'left', padding: 8 }}>Type</th>
                        <th style={{ textAlign: 'left', padding: 8 }}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userLeads.slice(0, 100).map((lead, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: 8, color: 'var(--text-tertiary)' }}>{i + 1}</td>
                          <td style={{ padding: 8, fontWeight: 500 }}>{lead.name}</td>
                          <td style={{ padding: 8 }}>{lead.phone || '—'}</td>
                          <td style={{ padding: 8, color: 'var(--accent)' }}>{lead.email || '—'}</td>
                          <td style={{ padding: 8, textTransform: 'capitalize', fontSize: 11 }}>{(lead.type || '').replace(/_/g, ' ')}</td>
                          <td style={{ padding: 8, fontSize: 11, color: 'var(--text-tertiary)' }}>{lead.scrapedAt ? new Date(lead.scrapedAt).toLocaleDateString() : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {userLeads.length > 100 && <div style={{ padding: 12, textAlign: 'center', fontSize: 12, color: 'var(--text-tertiary)' }}>Showing first 100 of {userLeads.length} leads</div>}
                </div>
              )
            )}

            {viewMode === 'searches' && (
              userSearches.length === 0 ? (
                <div className="empty-state" style={{ padding: 40 }}><Search /><h3>No searches</h3><p>This user hasn't performed any searches yet.</p></div>
              ) : (
                <div style={{ maxHeight: 400, overflow: 'auto' }}>
                  {userSearches.map((s, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: i % 2 === 0 ? 'var(--bg-tertiary)' : 'transparent', borderRadius: 'var(--radius-sm)' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{s.query}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{s.location || 'No location'} — {s.resultCount} results</div>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{new Date(s.date).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )
            )}

            {viewMode === 'ranks' && (
              Object.keys(userRanks).length === 0 ? (
                <div className="empty-state" style={{ padding: 40 }}><TrendingUp /><h3>No rank tracking</h3><p>This user hasn't tracked any domain rankings.</p></div>
              ) : (
                <div style={{ maxHeight: 400, overflow: 'auto' }}>
                  {Object.entries(userRanks).map(([domain, snapshots]) => (
                    <div key={domain} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{domain}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{snapshots.length} snapshot(s)</div>
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                          Last: {snapshots.length > 0 ? new Date(snapshots[snapshots.length - 1].date).toLocaleDateString() : '—'}
                        </span>
                      </div>
                      {snapshots.length > 0 && (
                        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {(snapshots[snapshots.length - 1].rankings || []).slice(0, 5).map((r, j) => (
                            <span key={j} className="badge" style={{ fontSize: 10 }}>
                              {r.keyword}: #{r.position || '?'}
                            </span>
                          ))}
                          {(snapshots[snapshots.length - 1].rankings || []).length > 5 && (
                            <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>+{snapshots[snapshots.length - 1].rankings.length - 5} more</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        )}
      </div>
    </>
  );
}

// =============================================
// MAIN APP
// =============================================
// Collapsible sidebar section component
function SidebarSection({ title, icon: SectionIcon, items, currentPath, agentFaceEl, subtitle, onToggle }) {
  const hasActive = items.some(item => currentPath === item.path);
  const [open, setOpen] = useState(hasActive);

  // Auto-open when navigating to a child
  useEffect(() => { if (hasActive) setOpen(true); }, [hasActive]);

  const handleToggle = () => {
    const newState = !open;
    setOpen(newState);
    if (newState && onToggle) onToggle();
  };

  return (
    <div style={{ marginBottom: 2 }}>
      <button onClick={handleToggle} style={{
        display: 'flex', alignItems: 'center', gap: 8, width: '100%',
        padding: '8px 16px', border: 'none', cursor: 'pointer',
        background: hasActive ? 'rgba(124,58,237,0.08)' : 'transparent',
        color: hasActive ? 'var(--accent)' : 'var(--text-tertiary)',
        fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1,
        borderRadius: 'var(--radius-sm)', transition: 'all 0.15s'
      }}>
        {agentFaceEl || (SectionIcon && <SectionIcon size={13} />)}
        <span style={{ flex: 1, textAlign: 'left' }}>
          {title}
          {subtitle && <span style={{ display: 'block', fontSize: 8, fontWeight: 500, textTransform: 'none', letterSpacing: 0, opacity: 0.6, marginTop: 1 }}>{subtitle}</span>}
        </span>
        <ChevronRight size={12} style={{
          transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s', opacity: 0.6
        }} />
        <span style={{
          fontSize: 9, background: 'var(--bg-tertiary)', borderRadius: 8,
          padding: '1px 6px', color: 'var(--text-tertiary)', fontWeight: 600
        }}>{items.length}</span>
      </button>
      <div style={{
        maxHeight: open ? items.length * 42 + 10 : 0,
        overflow: 'hidden', transition: 'max-height 0.25s ease-in-out'
      }}>
        {items.map(item => {
          const Icon = item.icon;
          return (
            <NavLink key={item.path} to={item.path}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              end={item.path === '/'} style={{ paddingLeft: 28, fontSize: 13 }}>
              <Icon size={15} /> {item.label}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState(() => sessionStorage.getItem('kj_auth') === 'true');
  const [currentUser, setCurrentUserState] = useState(() => getCurrentUser());
  const [currentRole, setCurrentRole] = useState(() => {
    const u = getCurrentUser();
    if (u === 'admin') return 'Admin';
    const users = getUsers();
    return users.find(x => x.username === u)?.role || 'Viewer';
  });
  const [editingLayout, setEditingLayout] = useState(false);
  const [sectionOrder, setSectionOrder] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`kj_${getCurrentUser()}_nav_order`) || 'null'); } catch { return null; }
  });
  const [sectionLabels, setSectionLabels] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`kj_${getCurrentUser()}_nav_labels`) || '{}'); } catch { return {}; }
  });
  const [renamingSection, setRenamingSection] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const location = useLocation();

  // Migrate old data on first load
  useEffect(() => { migrateOldData(); }, []);

  useEffect(() => { setSidebarOpen(false); }, [location]);

  const handleLogout = () => { clearCurrentUser(); setAuthenticated(false); };

  const handleLoginSuccess = (username, role) => {
    setCurrentUserState(username);
    setCurrentRole(role);
    setAuthenticated(true);
  };

  if (!authenticated) return <PinLogin onSuccess={handleLoginSuccess} />;

  const isAdmin = currentUser === 'admin' || currentRole === 'Admin';

  // Sound mute state
  const [soundsMuted, setSoundsMuted] = useState(() => localStorage.getItem('protocol_sounds_muted') === 'true');

  // Agent select sound effects — tries real audio files first, falls back to synthesized
  const playAgentSound = (agent) => {
    if (soundsMuted) return;
    // Try real audio file first
    const audio = new Audio(`./sounds/${agent}.mp3`);
    audio.volume = 0.4;
    const playReal = audio.play();
    if (playReal) {
      playReal.catch(() => {
        // File doesn't exist or can't play — use synthesized fallback
        playSynthSound(agent);
      });
    }
  };

  const playSynthSound = (agent) => {
    if (soundsMuted) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const now = ctx.currentTime;

      const sounds = {
        cypher: () => {
          // Digital surveillance beep — short high-frequency chirps
          const osc = ctx.createOscillator(); const gain = ctx.createGain();
          osc.type = 'sine'; osc.frequency.setValueAtTime(1800, now);
          osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);
          gain.gain.setValueAtTime(0.12, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
          osc.connect(gain); gain.connect(ctx.destination);
          osc.start(now); osc.stop(now + 0.2);
          // Second chirp
          const osc2 = ctx.createOscillator(); const gain2 = ctx.createGain();
          osc2.type = 'square'; osc2.frequency.setValueAtTime(1200, now + 0.08);
          gain2.gain.setValueAtTime(0.06, now + 0.08); gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
          osc2.connect(gain2); gain2.connect(ctx.destination);
          osc2.start(now + 0.08); osc2.stop(now + 0.2);
        },
        brimstone: () => {
          // Deep military thud — low bass hit
          const osc = ctx.createOscillator(); const gain = ctx.createGain();
          osc.type = 'sine'; osc.frequency.setValueAtTime(120, now);
          osc.frequency.exponentialRampToValueAtTime(60, now + 0.3);
          gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
          osc.connect(gain); gain.connect(ctx.destination);
          osc.start(now); osc.stop(now + 0.35);
        },
        killjoy: () => {
          // Tech gadget activation — ascending tones
          [0, 0.06, 0.12].forEach((delay, i) => {
            const osc = ctx.createOscillator(); const gain = ctx.createGain();
            osc.type = 'sine'; osc.frequency.setValueAtTime(600 + i * 400, now + delay);
            gain.gain.setValueAtTime(0.1, now + delay); gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.1);
            osc.connect(gain); gain.connect(ctx.destination);
            osc.start(now + delay); osc.stop(now + delay + 0.1);
          });
        },
        neon: () => {
          // Electric sprint burst — fast ascending sweep
          const osc = ctx.createOscillator(); const gain = ctx.createGain();
          osc.type = 'sawtooth'; osc.frequency.setValueAtTime(200, now);
          osc.frequency.exponentialRampToValueAtTime(2000, now + 0.12);
          gain.gain.setValueAtTime(0.08, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
          osc.connect(gain); gain.connect(ctx.destination);
          osc.start(now); osc.stop(now + 0.18);
          // Crackle
          const osc2 = ctx.createOscillator(); const gain2 = ctx.createGain();
          osc2.type = 'square'; osc2.frequency.setValueAtTime(3000, now + 0.05);
          gain2.gain.setValueAtTime(0.04, now + 0.05); gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
          osc2.connect(gain2); gain2.connect(ctx.destination);
          osc2.start(now + 0.05); osc2.stop(now + 0.15);
        },
        harbor: () => {
          // Water surge — filtered noise sweep
          const osc = ctx.createOscillator(); const gain = ctx.createGain();
          osc.type = 'sine'; osc.frequency.setValueAtTime(300, now);
          osc.frequency.exponentialRampToValueAtTime(150, now + 0.25);
          gain.gain.setValueAtTime(0.1, now); gain.gain.linearRampToValueAtTime(0.15, now + 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          osc.connect(gain); gain.connect(ctx.destination);
          osc.start(now); osc.stop(now + 0.3);
        },
        chamber: () => {
          // Elegant snap — sharp, clean, sophisticated
          const osc = ctx.createOscillator(); const gain = ctx.createGain();
          osc.type = 'sine'; osc.frequency.setValueAtTime(1400, now);
          osc.frequency.exponentialRampToValueAtTime(600, now + 0.08);
          gain.gain.setValueAtTime(0.15, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
          osc.connect(gain); gain.connect(ctx.destination);
          osc.start(now); osc.stop(now + 0.12);
          // Gold shimmer
          const osc2 = ctx.createOscillator(); const gain2 = ctx.createGain();
          osc2.type = 'triangle'; osc2.frequency.setValueAtTime(2200, now + 0.04);
          gain2.gain.setValueAtTime(0.06, now + 0.04); gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
          osc2.connect(gain2); gain2.connect(ctx.destination);
          osc2.start(now + 0.04); osc2.stop(now + 0.15);
        },
        sova: () => {
          // Recon dart — ascending ping with echo
          const osc = ctx.createOscillator(); const gain = ctx.createGain();
          osc.type = 'sine'; osc.frequency.setValueAtTime(400, now);
          osc.frequency.exponentialRampToValueAtTime(1600, now + 0.15);
          gain.gain.setValueAtTime(0.12, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
          osc.connect(gain); gain.connect(ctx.destination);
          osc.start(now); osc.stop(now + 0.25);
          // Echo ping
          const osc2 = ctx.createOscillator(); const gain2 = ctx.createGain();
          osc2.type = 'sine'; osc2.frequency.setValueAtTime(1600, now + 0.2);
          osc2.frequency.exponentialRampToValueAtTime(1200, now + 0.35);
          gain2.gain.setValueAtTime(0.06, now + 0.2); gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
          osc2.connect(gain2); gain2.connect(ctx.destination);
          osc2.start(now + 0.2); osc2.stop(now + 0.4);
        },
        lobby: () => {
          // UI click — simple clean click
          const osc = ctx.createOscillator(); const gain = ctx.createGain();
          osc.type = 'sine'; osc.frequency.setValueAtTime(800, now);
          gain.gain.setValueAtTime(0.08, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
          osc.connect(gain); gain.connect(ctx.destination);
          osc.start(now); osc.stop(now + 0.08);
        },
      };

      if (sounds[agent]) sounds[agent]();
      setTimeout(() => ctx.close(), 500);
    } catch (e) { /* Audio not supported, silently fail */ }
  };

  // Valorant Agent face icons as inline SVG components
  const AgentFace = ({ agent, size = 16 }) => {
    const faces = {
      cypher: (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="11" fill="#1a1a2e"/><rect x="6" y="8" width="12" height="3" rx="1" fill="#00d4ff" opacity="0.9"/><circle cx="9" cy="9.5" r="1.2" fill="#fff"/><circle cx="15" cy="9.5" r="1.2" fill="#fff"/><path d="M8 15 Q12 18 16 15" stroke="#00d4ff" strokeWidth="1.5" fill="none"/><rect x="10" y="3" width="4" height="4" rx="1" fill="#00d4ff" opacity="0.6"/></svg>
      ),
      brimstone: (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="11" fill="#1a1a2e"/><rect x="5" y="7" width="14" height="4" rx="1" fill="#ff6b35" opacity="0.9"/><circle cx="9" cy="9" r="1.5" fill="#fff"/><circle cx="15" cy="9" r="1.5" fill="#fff"/><path d="M8 15 L12 17 L16 15" stroke="#ff6b35" strokeWidth="2" fill="none"/><path d="M6 4 L12 2 L18 4" stroke="#ff6b35" strokeWidth="1.5" fill="none"/></svg>
      ),
      killjoy: (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="11" fill="#1a1a2e"/><rect x="7" y="7" width="4" height="5" rx="2" fill="#ffd700" opacity="0.9"/><rect x="13" y="7" width="4" height="5" rx="2" fill="#ffd700" opacity="0.9"/><circle cx="9" cy="9.5" r="1" fill="#1a1a2e"/><circle cx="15" cy="9.5" r="1" fill="#1a1a2e"/><path d="M9 15 Q12 17 15 15" stroke="#ffd700" strokeWidth="1.5" fill="none"/><circle cx="12" cy="3" r="2" fill="#ffd700" opacity="0.5"/></svg>
      ),
      neon: (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="11" fill="#1a1a2e"/><path d="M7 8 L10 8 L10 12 L7 12Z" fill="#7c3aed" opacity="0.9"/><path d="M14 8 L17 8 L17 12 L14 12Z" fill="#7c3aed" opacity="0.9"/><circle cx="8.5" cy="10" r="1" fill="#00ffff"/><circle cx="15.5" cy="10" r="1" fill="#00ffff"/><path d="M9 15 Q12 18 15 15" stroke="#7c3aed" strokeWidth="1.5" fill="none"/><path d="M5 6 L12 3 L19 6" stroke="#00ffff" strokeWidth="1" fill="none" opacity="0.6"/></svg>
      ),
      harbor: (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="11" fill="#1a1a2e"/><path d="M6 8 Q12 5 18 8" stroke="#0ea5e9" strokeWidth="2" fill="none"/><circle cx="9" cy="10" r="1.5" fill="#0ea5e9"/><circle cx="15" cy="10" r="1.5" fill="#0ea5e9"/><path d="M8 15 Q12 17 16 15" stroke="#0ea5e9" strokeWidth="1.5" fill="none"/><path d="M5 19 Q9 17 12 18 Q15 19 19 17" stroke="#0ea5e9" strokeWidth="1" fill="none" opacity="0.5"/></svg>
      ),
      chamber: (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="11" fill="#1a1a2e"/><path d="M7 7 L10 7 L10 11 L7 11Z" fill="#c9a84c" opacity="0.9"/><path d="M14 7 L17 7 L17 11 L14 11Z" fill="#c9a84c" opacity="0.9"/><circle cx="8.5" cy="9" r="1" fill="#fff"/><circle cx="15.5" cy="9" r="1" fill="#fff"/><path d="M9 14 Q12 16 15 14" stroke="#c9a84c" strokeWidth="1.5" fill="none"/><path d="M10 3 L12 1 L14 3" stroke="#c9a84c" strokeWidth="1.5" fill="none"/><rect x="11" y="3" width="2" height="3" fill="#c9a84c" opacity="0.4"/></svg>
      ),
      sova: (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="11" fill="#1a1a2e"/><path d="M6 9 L9 7 L9 11Z" fill="#3b82f6" opacity="0.9"/><path d="M18 9 L15 7 L15 11Z" fill="#3b82f6" opacity="0.9"/><circle cx="9" cy="9" r="1.2" fill="#00e5ff"/><circle cx="15" cy="9" r="1.2" fill="#00e5ff"/><path d="M9 15 Q12 17 15 15" stroke="#3b82f6" strokeWidth="1.5" fill="none"/><path d="M4 5 L12 2 L20 5" stroke="#3b82f6" strokeWidth="1" fill="none" opacity="0.5"/><circle cx="12" cy="5" r="1.5" fill="#00e5ff" opacity="0.6"/></svg>
      ),
      lobby: (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="11" fill="#1a1a2e" stroke="#64748b" strokeWidth="1"/><circle cx="9" cy="10" r="1.5" fill="#64748b"/><circle cx="15" cy="10" r="1.5" fill="#64748b"/><path d="M9 15 L15 15" stroke="#64748b" strokeWidth="1.5"/><rect x="10" y="4" width="4" height="2" rx="1" fill="#64748b" opacity="0.6"/></svg>
      ),
    };
    return faces[agent] || null;
  };

  const navSections = [
    {
      title: 'Brimstone', icon: LayoutDashboard, agentFace: 'brimstone',
      subtitle: 'Commander — strategy, dashboards & overview',
      items: [
        { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/leads-dashboard', icon: PieChart, label: 'Leads Analytics' },
        { path: '/strategy-builder', icon: Zap, label: 'Strategy Builder' },
      ]
    },
    {
      title: 'Chamber', icon: Crosshair, agentFace: 'chamber',
      subtitle: 'Weapons dealer — lead acquisition & targeting',
      items: [
        { path: '/search', icon: Search, label: 'Lead Search' },
        { path: '/emails', icon: Mail, label: 'Email Extractor' },
        { path: '/leads', icon: Database, label: 'My Leads' },
        { path: '/verify', icon: Shield, label: 'Lead Verifier' },
      ]
    },
    {
      title: 'Cypher', icon: Instagram, agentFace: 'cypher',
      subtitle: 'Information broker — scrapes social intel',
      items: [
        { path: '/instagram', icon: Instagram, label: 'Instagram' },
        { path: '/facebook', icon: Facebook, label: 'Facebook / Meta' },
        { path: '/fb-ads', icon: DollarSign, label: 'FB Ads Library' },
        { path: '/linkedin', icon: Linkedin, label: 'LinkedIn' },
        { path: '/twitter', icon: Twitter, label: 'Twitter / X' },
      ]
    },
    {
      title: 'Killjoy', icon: Globe, agentFace: 'killjoy',
      subtitle: 'Sentinel — SEO defense, audits & rank protection',
      items: [
        { path: '/website-analysis', icon: Radar, label: 'Full Analysis' },
        { path: '/seo-dashboard', icon: BarChart3, label: 'SEO Dashboard' },
        { path: '/site-audit', icon: Activity, label: 'Site Audit' },
        { path: '/on-page-seo', icon: FileText, label: 'On-Page SEO' },
        { path: '/backlinks', icon: Link, label: 'Backlinks' },
        { path: '/rank-tracker', icon: TrendingUp, label: 'Rank Tracker' },
      ]
    },
    {
      title: 'Sova', icon: Microscope, agentFace: 'sova',
      subtitle: 'Hunter — recon, keyword tracking & competitor intel',
      items: [
        { path: '/keyword-research', icon: Hash, label: 'Keyword Discovery' },
        { path: '/keyword-gap', icon: Target, label: 'Content Gaps' },
        { path: '/organic-research', icon: UserCheck, label: 'Competitor Keywords' },
        { path: '/domain-overview', icon: Globe, label: 'Domain Overview' },
        { path: '/content-research', icon: Newspaper, label: 'Content Research' },
        { path: '/traffic-insights', icon: Eye, label: 'Traffic Insights' },
        { path: '/content-analyzer', icon: BookOpen, label: 'Content Analyzer' },
        { path: '/ad-intelligence', icon: DollarSign, label: 'Ad Intelligence' },
        { path: '/brand-monitoring', icon: Megaphone, label: 'Brand Monitor' },
        { path: '/serp', icon: Radar, label: 'SERP Scraper' },
      ]
    },
    {
      title: 'Neon', icon: Wand2, agentFace: 'neon',
      subtitle: 'Duelist — AI content creation & copywriting',
      items: [
        { path: '/content-hub', icon: Layers, label: 'Content Hub' },
        { path: '/blog', icon: BookOpen, label: 'Blog Writer' },
        { path: '/email', icon: Inbox, label: 'Company Email' },
        { path: '/marketing-hub', icon: Zap, label: 'Skills Hub' },
        { path: '/copywriter', icon: Type, label: 'Copywriter' },
        { path: '/ad-creative', icon: Megaphone, label: 'Ad Creative' },
        { path: '/email-sequence', icon: Send, label: 'Email Sequences' },
        { path: '/launch-planner', icon: Radar, label: 'Launch Planner' },
        { path: '/pricing-lab', icon: DollarSign, label: 'Pricing Lab' },
        { path: '/cro-analyzer', icon: Target, label: 'CRO Analyzer' },
      ]
    },
    {
      title: 'Lobby', icon: Settings, agentFace: 'lobby',
      subtitle: 'Home base — settings, sync & admin',
      items: [
        ...(isAdmin ? [
          { path: '/admin-panel', icon: Shield, label: 'Admin Panel' },
          { path: '/user-management', icon: Users, label: 'User Management' },
        ] : []),
        { path: '/settings', icon: Settings, label: 'Settings' },
      ]
    }
  ];

  return (
    <>
      <NotificationBell />
      <div className="mobile-header">
        <button className="hamburger" onClick={() => setSidebarOpen(true)}><Menu size={22} /></button>
        <span style={{ fontWeight: 700, fontSize: 16 }}>PROTOCOL</span>
      </div>

      <div className="app-layout">
        <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />

        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <div className="sidebar-logo">
              <div className="sidebar-logo-icon" style={{ background: 'transparent', border: '1.5px solid #ff4655', borderRadius: 2, clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))', color: '#ff4655' }}>P</div>
              <div>
                <div className="sidebar-logo-text" style={{ letterSpacing: 3 }}>PROTOCOL</div>
                <div className="sidebar-logo-badge" style={{ color: '#ff4655', opacity: 0.7 }}>TACTICAL MARKETING</div>
              </div>
            </div>
          </div>

          <nav className="sidebar-nav">
            {(() => {
              const orderedSections = sectionOrder
                ? sectionOrder.map(title => navSections.find(s => s.title === title)).filter(Boolean)
                  .concat(navSections.filter(s => !sectionOrder.includes(s.title)))
                : navSections;
              return orderedSections.map((section, i) => (
                <div key={section.title}>
                  {editingLayout && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 4, padding: '2px 0', alignItems: 'center' }}>
                      <button onClick={() => {
                        const titles = orderedSections.map(s => s.title);
                        if (i > 0) { [titles[i], titles[i - 1]] = [titles[i - 1], titles[i]]; }
                        setSectionOrder(titles);
                        localStorage.setItem(`kj_${currentUser}_nav_order`, JSON.stringify(titles));
                      }} disabled={i === 0} style={{ border: 'none', background: 'none', color: 'var(--text-tertiary)', cursor: i > 0 ? 'pointer' : 'default', fontSize: 11, opacity: i > 0 ? 1 : 0.3 }}>▲</button>
                      <button onClick={() => {
                        const titles = orderedSections.map(s => s.title);
                        if (i < titles.length - 1) { [titles[i], titles[i + 1]] = [titles[i + 1], titles[i]]; }
                        setSectionOrder(titles);
                        localStorage.setItem(`kj_${currentUser}_nav_order`, JSON.stringify(titles));
                      }} disabled={i === orderedSections.length - 1} style={{ border: 'none', background: 'none', color: 'var(--text-tertiary)', cursor: i < orderedSections.length - 1 ? 'pointer' : 'default', fontSize: 11, opacity: i < orderedSections.length - 1 ? 1 : 0.3 }}>▼</button>
                      {renamingSection === section.title ? (
                        <form onSubmit={(e) => { e.preventDefault(); const newLabels = { ...sectionLabels, [section.title]: renameValue.trim() || section.title }; setSectionLabels(newLabels); localStorage.setItem(`kj_${currentUser}_nav_labels`, JSON.stringify(newLabels)); setRenamingSection(null); }} style={{ display: 'flex', gap: 2, flex: 1 }}>
                          <input value={renameValue} onChange={e => setRenameValue(e.target.value)} autoFocus style={{ width: '100%', fontSize: 10, padding: '2px 6px', background: 'var(--bg-secondary)', border: '1px solid var(--accent)', borderRadius: 4, color: 'var(--text-primary)', outline: 'none' }} />
                          <button type="submit" style={{ border: 'none', background: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>✓</button>
                        </form>
                      ) : (
                        <button onClick={() => { setRenamingSection(section.title); setRenameValue(sectionLabels[section.title] || section.title); }} style={{ border: 'none', background: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 9, fontWeight: 600, textDecoration: 'underline', flex: 1, textAlign: 'center' }}>rename</button>
                      )}
                    </div>
                  )}
                  <SidebarSection title={sectionLabels[section.title] || section.title} icon={section.icon}
                    items={section.items} currentPath={location.pathname}
                    agentFaceEl={section.agentFace ? <AgentFace agent={section.agentFace} size={16} /> : null}
                    subtitle={section.subtitle}
                    onToggle={section.agentFace ? () => playAgentSound(section.agentFace) : null} />
                </div>
              ));
            })()}
            <button
              onClick={() => setEditingLayout(!editingLayout)}
              style={{
                width: '100%', padding: '6px 16px', border: 'none', cursor: 'pointer',
                background: editingLayout ? 'rgba(124,58,237,0.12)' : 'transparent',
                color: editingLayout ? 'var(--accent)' : 'var(--text-tertiary)',
                fontSize: 10, fontWeight: 600, textAlign: 'center', borderRadius: 'var(--radius-sm)',
                marginTop: 4,
              }}
            >
              {editingLayout ? '✓ Done Editing' : '⚙ Edit Layout'}
            </button>
          </nav>

          <div className="sidebar-footer">
            {/* Current user indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', marginBottom: 8, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: isAdmin ? 'var(--error)' : 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: 11, flexShrink: 0 }}>
                {currentUser[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentUser}</div>
                <div style={{ fontSize: 10, color: isAdmin ? 'var(--error)' : 'var(--text-tertiary)' }}>{currentRole}</div>
              </div>
            </div>
            <div className="sidebar-status">
              <div className="sidebar-status-dot" style={{ background: isGoogleKeySet() ? 'var(--success)' : 'var(--error)', boxShadow: isGoogleKeySet() ? '0 0 8px var(--success)' : '0 0 8px var(--error)' }} />
              {isGoogleKeySet() ? 'Google API Ready' : 'Google Key Missing'}
            </div>
            <div className="sidebar-status">
              <div className="sidebar-status-dot" style={{ background: isApifyTokenSet() ? '#00d68f' : 'var(--text-tertiary)', boxShadow: isApifyTokenSet() ? '0 0 8px #00d68f' : 'none' }} />
              {isApifyTokenSet() ? 'Apify Ready' : 'Apify Token Missing'}
            </div>
            <button className="sidebar-link" onClick={handleLogout} style={{ color: 'var(--text-tertiary)', marginTop: 4 }}>
              <LogOut size={16} /> Logout
            </button>
          </div>
        </aside>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/leads-dashboard" element={<LeadsDashboard />} />
            <Route path="/search" element={<LeadSearch />} />
            <Route path="/emails" element={<EmailExtractor />} />
            <Route path="/leads" element={<MyLeads />} />
            <Route path="/verify" element={<LeadVerifier />} />
            <Route path="/instagram" element={<InstagramScraper />} />
            <Route path="/facebook" element={<FacebookScraper />} />
            <Route path="/fb-ads" element={<FBAdsLibraryScraper />} />
            <Route path="/linkedin" element={<LinkedInScraper />} />
            <Route path="/twitter" element={<TwitterScraper />} />
            <Route path="/website-analysis" element={<WebsiteAnalysis />} />
            <Route path="/seo-dashboard" element={<SEODashboard />} />
            <Route path="/keyword-research" element={<KeywordResearch />} />
            <Route path="/domain-overview" element={<DomainOverview />} />
            <Route path="/on-page-seo" element={<OnPageSEO />} />
            <Route path="/backlinks" element={<BacklinkChecker />} />
            <Route path="/content-analyzer" element={<ContentAnalyzer />} />
            <Route path="/keyword-gap" element={<KeywordGap />} />
            <Route path="/serp" element={<SERPScraper />} />
            <Route path="/rank-tracker" element={<RankTracker />} />
            <Route path="/site-audit" element={<SiteAudit />} />
            <Route path="/traffic-insights" element={<TrafficInsights />} />
            <Route path="/ad-intelligence" element={<AdIntelligence />} />
            <Route path="/content-research" element={<ContentResearch />} />
            <Route path="/organic-research" element={<OrganicResearch />} />
            <Route path="/brand-monitoring" element={<BrandMonitoring />} />
            <Route path="/content-hub" element={<ContentHub />} />
            <Route path="/blog" element={<BlogWriter />} />
            <Route path="/email" element={<CompanyEmail />} />
            <Route path="/marketing-hub" element={<MarketingSkillsHub />} />
            <Route path="/copywriter" element={<SkillPanel skillKey="copywriting" />} />
            <Route path="/ad-creative" element={<SkillPanel skillKey="ad-creative" />} />
            <Route path="/email-sequence" element={<SkillPanel skillKey="email-sequence" />} />
            <Route path="/launch-planner" element={<SkillPanel skillKey="launch-strategy" />} />
            <Route path="/pricing-lab" element={<SkillPanel skillKey="pricing-strategy" />} />
            <Route path="/cro-analyzer" element={<SkillPanel skillKey="page-cro" />} />
            <Route path="/strategy-builder" element={<StrategyBuilder />} />
            {isAdmin && <Route path="/admin-panel" element={<AdminPanel />} />}
            {isAdmin && <Route path="/user-management" element={<UserManagement />} />}
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </>
  );
}
