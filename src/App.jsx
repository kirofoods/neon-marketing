import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { PieChart as RechartsPieChart, Pie, Cell, BarChart as RechartsBarChart, Bar, LineChart as RechartsLineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { initSync, isSyncEnabled, pushToCloud, pullFromCloud, parseFirebaseConfig, getSyncStatus, enableAutoSync, disableAutoSync, isAutoSyncEnabled, startRealtimeSync, autoInit } from './utils/sync.js';
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
  Instagram, Twitter, Linkedin, Facebook, Library, Heart, Share2, Repeat2,
  Flame, Swords, Skull, Crown, Sparkles, Orbit, Scan, Bot, Siren,
  Wallet, LineChart, MousePointerClick, SplitSquareVertical, Receipt,
  UserPlus, Gift, Handshake, CalendarDays, CircleDollarSign,
  Radio, Tv, MapPinned, Calculator, Megaphone as MegaphoneIcon2,
  Ratio, Waypoints, Binary, Fingerprint, FolderSearch, PlugZap,
  MessageCircle, SmartphoneNfc, QrCode, UsersRound, ThumbsUp,
  Anchor, Ship, ClipboardList, Route as RouteIcon, FileCheck, Scale, Boxes,
  Factory, Wrench, Beaker, FlaskConical, Barcode, PackageCheck, Leaf,
  BadgeDollarSign, PiggyBank, ArrowUpDown, FileBarChart, Banknote, TrendingDown, Percent,
  Ghost, TreePine, Bird, FolderKanban, Milestone, BriefcaseBusiness, StickyNote, GitBranch,
  Code, TerminalSquare, FolderGit2, Upload, AtSign, MailOpen, Reply, Forward, Archive, Paperclip,
  Terminal, Code2, GitCommit, GitPullRequest, Rocket
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

// ---- ERROR BOUNDARY — catches render errors in dashboard after login ----
class AppErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('[PROTOCOL] Render error caught:', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#0f1923', color: '#ece8e1', fontFamily: 'Inter, sans-serif', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 48, fontWeight: 900, color: '#ff4655', letterSpacing: 4 }}>PROTOCOL</div>
          <div style={{ fontSize: 14, opacity: 0.7, letterSpacing: 2, textTransform: 'uppercase' }}>System Error — Reloading</div>
          <div style={{ fontSize: 11, opacity: 0.4, maxWidth: 400, textAlign: 'center' }}>
            {this.state.error?.message || 'Unknown render error'}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

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
  const [leads] = useState(() => getAllLeads());
  const [history] = useState(() => getSearchHistory());
  const [seoData] = useState(() => getSEODashboardData());

  // Cross-agent data aggregation
  const safeJSON = (key) => { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } };

  // Core metrics
  const totalLeads = leads.length;
  const tasks = safeJSON('protocol_omen_tasks');
  const projects = safeJSON('protocol_omen_projects');
  const partners = safeJSON('protocol_harbor_partners');
  const orders = safeJSON('protocol_harbor_orders');
  const inventory = safeJSON('protocol_deadlock_inventory');
  const plans = safeJSON('protocol_deadlock_plans');
  const batches = safeJSON('protocol_deadlock_batches');
  const qcChecks = safeJSON('protocol_deadlock_qc');
  const vendors = safeJSON('protocol_deadlock_vendors');
  const influencers = safeJSON('protocol_skye_influencers');
  const pnl = safeJSON('protocol_kayo_pnl');
  const expenses = safeJSON('protocol_kayo_expenses');
  const payments = safeJSON('protocol_kayo_payments');
  const customers = safeJSON('protocol_sage_customers');
  const campaigns = safeJSON('protocol_skye_campaigns');

  const revenue = pnl.filter(e => e.type === 'Revenue').reduce((s, e) => s + (e.amount || 0), 0);
  const totalExpenses = pnl.filter(e => e.type === 'Expense').reduce((s, e) => s + (e.amount || 0), 0) + expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const netPnL = revenue - totalExpenses;
  const totalOrderValue = orders.reduce((s, o) => s + (Number(o.amount) || 0), 0);
  const inventoryValue = inventory.reduce((s, i) => s + ((i.quantity || 0) * (i.costPerUnit || 0)), 0);
  const lowStock = inventory.filter(i => i.quantity <= i.reorderLevel).length;
  const receivables = payments.filter(p => p.type === 'Receivable' && p.status !== 'Paid').reduce((s, p) => s + (p.amount || 0), 0);
  const payables = payments.filter(p => p.type === 'Payable' && p.status !== 'Paid').reduce((s, p) => s + (p.amount || 0), 0);
  const totalInfluencerReach = influencers.reduce((s, i) => s + (i.followers || 0), 0);
  const tasksDone = tasks.filter(t => t.status === 'Done').length;
  const tasksTotal = tasks.length;

  // Agent activity data for bar chart
  const agentData = [
    { name: 'Leads', count: totalLeads, color: '#ff4655' },
    { name: 'Tasks', count: tasksTotal, color: '#47b5ff' },
    { name: 'Partners', count: partners.length, color: '#0ac18e' },
    { name: 'Inventory', count: inventory.length, color: '#f5a623' },
    { name: 'Influencers', count: influencers.length, color: '#a855f7' },
    { name: 'Orders', count: orders.length, color: '#ec4899' },
  ];

  // Financial trend data
  const financeData = [
    { label: 'Revenue', value: revenue, color: '#0ac18e' },
    { label: 'Expenses', value: totalExpenses, color: '#ff4655' },
    { label: 'Orders', value: totalOrderValue, color: '#47b5ff' },
    { label: 'Receivable', value: receivables, color: '#f5a623' },
  ];

  const chartColors = ['#ff4655', '#47b5ff', '#0ac18e', '#f5a623', '#a855f7', '#ec4899'];

  const seoHealth = Math.min(100, (seoData.trackedDomains * 25) + (seoData.totalKeywords * 0.5));
  const tooltipStyle = { background: '#0f1923', border: '1px solid rgba(255,70,85,0.2)', borderRadius: 2, color: '#ece8e1' };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 style={{ letterSpacing: 3, textTransform: 'uppercase', fontSize: 22 }}>// COMMAND CENTER</h1>
          <p className="page-header-sub" style={{ color: '#ff4655', letterSpacing: 2, fontSize: 10, textTransform: 'uppercase' }}>Protocol Tactical Overview — All Agents</p>
        </div>
      </div>
      <div className="page-body">
        {/* TOP METRICS — 6 key cards */}
        <div className="stats-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: 24 }}>
          {[
            ['LEADS', totalLeads, '#ff4655', Database],
            ['REVENUE', '₹' + revenue.toLocaleString(), '#0ac18e', TrendingUp],
            ['PARTNERS', partners.length, '#47b5ff', Building2],
            ['INVENTORY', inventory.length + ' items', '#f5a623', Package],
            ['TASKS', tasksDone + '/' + tasksTotal, '#a855f7', CheckCircle2],
            ['INFLUENCERS', influencers.length, '#ec4899', Users],
          ].map(([label, val, color, Icon]) => (
            <div key={label} className="stat-card" style={{ borderColor: 'rgba(255,70,85,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: '#5e7382', textTransform: 'uppercase' }}>{label}</div>
                <Icon size={14} color={color} />
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color, letterSpacing: -0.5 }}>{val}</div>
            </div>
          ))}
        </div>

        {/* FINANCIAL OVERVIEW BAR */}
        <div className="card" style={{ padding: 20, marginBottom: 20, background: 'rgba(15,25,35,0.8)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#ff4655' }}>// Financial Status</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: netPnL >= 0 ? '#0ac18e' : '#ff4655' }}>Net: {netPnL >= 0 ? '+' : ''}₹{netPnL.toLocaleString()}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
            {financeData.map(f => (
              <div key={f.label} style={{ textAlign: 'center', padding: 12, background: 'rgba(255,255,255,0.02)', borderRadius: 2, border: '1px solid rgba(255,70,85,0.06)' }}>
                <div style={{ fontSize: 10, letterSpacing: 1.5, color: '#5e7382', textTransform: 'uppercase', marginBottom: 6 }}>{f.label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: f.color }}>₹{f.value.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CHARTS GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 20 }}>
          {/* Agent Activity Bar Chart */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#ff4655', marginBottom: 16 }}>// Agent Data Counts</div>
            <ResponsiveContainer width="100%" height={220}>
              <RechartsBarChart data={agentData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,70,85,0.08)" />
                <XAxis dataKey="name" stroke="#5e7382" style={{ fontSize: 11 }} />
                <YAxis stroke="#5e7382" style={{ fontSize: 11 }} />
                <RechartsTooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                  {agentData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>

          {/* Operations Status */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#ff4655', marginBottom: 16 }}>// Operations Status</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                ['Production Plans', plans.length, plans.filter(p=>p.status==='Completed').length, '#0ac18e'],
                ['QC Checks', qcChecks.length, qcChecks.filter(c=>c.status==='Pass').length, '#47b5ff'],
                ['Batches', batches.length, batches.filter(b=>b.status==='Released').length, '#f5a623'],
                ['Vendors', vendors.length, vendors.filter(v=>v.status==='Active').length, '#a855f7'],
                ['Customers (CRM)', customers.length, customers.length, '#ec4899'],
                ['Active Campaigns', campaigns.length, campaigns.filter(c=>c.status==='Live').length, '#ff4655'],
              ].map(([label, total, done, color]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 8, height: 8, background: color, borderRadius: 1, flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: 12, color: '#8b9eab' }}>{label}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#ece8e1' }}>{done}/{total}</div>
                  <div style={{ width: 80, height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: total ? `${(done/total)*100}%` : '0%', height: '100%', background: color, borderRadius: 2, transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SEO & Content */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#ff4655', marginBottom: 16 }}>// SEO & Content Intel</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div style={{ textAlign: 'center', padding: 12, background: 'rgba(255,70,85,0.04)', borderRadius: 2 }}>
                <div style={{ fontSize: 10, color: '#5e7382', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Domains</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#ff4655' }}>{seoData.trackedDomains}</div>
              </div>
              <div style={{ textAlign: 'center', padding: 12, background: 'rgba(71,181,255,0.04)', borderRadius: 2 }}>
                <div style={{ fontSize: 10, color: '#5e7382', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Keywords</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#47b5ff' }}>{seoData.totalKeywords}</div>
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                <span style={{ color: '#5e7382' }}>SEO Health</span><span style={{ color: '#0ac18e', fontWeight: 600 }}>{Math.round(seoHealth)}%</span>
              </div>
              <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, seoHealth)}%`, height: '100%', background: 'linear-gradient(90deg, #ff4655, #0ac18e)', borderRadius: 2 }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '8px 0', borderTop: '1px solid rgba(255,70,85,0.06)' }}>
              <span style={{ color: '#5e7382' }}>Influencer Reach</span>
              <span style={{ color: '#ec4899', fontWeight: 600 }}>{totalInfluencerReach > 1000000 ? (totalInfluencerReach/1000000).toFixed(1)+'M' : totalInfluencerReach > 1000 ? (totalInfluencerReach/1000).toFixed(0)+'K' : totalInfluencerReach}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '8px 0', borderTop: '1px solid rgba(255,70,85,0.06)' }}>
              <span style={{ color: '#5e7382' }}>Low Stock Alerts</span>
              <span style={{ color: lowStock > 0 ? '#ff4655' : '#0ac18e', fontWeight: 600 }}>{lowStock}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '8px 0', borderTop: '1px solid rgba(255,70,85,0.06)' }}>
              <span style={{ color: '#5e7382' }}>Outstanding (Recv - Pay)</span>
              <span style={{ color: '#f5a623', fontWeight: 600 }}>₹{(receivables - payables).toLocaleString()}</span>
            </div>
          </div>

          {/* Active Projects */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#ff4655', marginBottom: 16 }}>// Active Projects</div>
            {projects.length === 0 ? (
              <div style={{ color: '#5e7382', fontSize: 12, textAlign: 'center', padding: 20 }}>No projects yet. Create one in Omen.</div>
            ) : projects.slice(0, 5).map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,70,85,0.06)', fontSize: 12 }}>
                <div><div style={{ fontWeight: 600, color: '#ece8e1' }}>{p.name}</div><div style={{ fontSize: 10, color: '#5e7382' }}>{p.department}</div></div>
                <span style={{ padding: '2px 8px', fontSize: 10, borderRadius: 2, background: p.status==='Active' ? 'rgba(10,193,142,0.15)' : 'rgba(255,70,85,0.1)', color: p.status==='Active' ? '#0ac18e' : '#ff4655' }}>{p.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RECENT SEARCHES */}
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#ff4655', marginBottom: 12 }}>// Recent Searches</div>
          {history.length === 0 ? (
            <p style={{ color: '#5e7382', fontSize: 12 }}>No searches yet. Use Cypher to start acquiring leads.</p>
          ) : (
            history.slice(0, 5).map((h, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: i % 2 === 0 ? 'rgba(255,70,85,0.02)' : 'transparent', borderRadius: 2, marginBottom: 2 }}>
                <div><div style={{ fontSize: 13, fontWeight: 500 }}>{h.query}</div><div style={{ fontSize: 11, color: '#5e7382' }}>{h.location || 'No location'} • {h.resultCount} results</div></div>
                <span style={{ fontSize: 11, color: '#5e7382' }}>{new Date(h.date).toLocaleDateString()}</span>
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
  const [viewLead, setViewLead] = useState(null); // Lead profile card

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
                    <tr key={key} style={{ borderBottom: '1px solid var(--border)', background: selected.has(key) ? 'var(--accent-light)' : 'transparent', cursor: 'pointer' }} onClick={(e) => { if (e.target.type !== 'checkbox' && e.target.tagName !== 'A') setViewLead(lead); }}>
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

        {/* Lead Profile Card Modal */}
        {viewLead && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setViewLead(null)}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#1a2634', borderRadius: 12, width: '100%', maxWidth: 480, border: '1px solid #2a3a4a', overflow: 'hidden' }}>
              {/* Header with name and close */}
              <div style={{ background: '#0f1923', padding: '20px 24px', borderBottom: '2px solid #ff4655', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 11, color: '#ff4655', letterSpacing: 2, fontWeight: 600, marginBottom: 4 }}>LEAD PROFILE</div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: '#ece8e1' }}>{viewLead.name}</h3>
                  {viewLead.type && <span style={{ fontSize: 11, color: '#8b9eb7', marginTop: 4, display: 'inline-block', background: '#0f1923', border: '1px solid #2a3a4a', padding: '2px 8px', borderRadius: 4 }}>{viewLead.type?.replace(/_/g, ' ')}</span>}
                </div>
                <button onClick={() => setViewLead(null)} style={{ background: 'none', border: 'none', color: '#8b9eb7', cursor: 'pointer', fontSize: 18 }}>✕</button>
              </div>

              {/* Body */}
              <div style={{ padding: '20px 24px' }}>
                {/* Call + Actions row */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                  {viewLead.phone ? (
                    <a href={`tel:${viewLead.phone}`} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 16px', background: '#16a34a', color: '#fff', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>
                      <Phone size={18} /> Call {viewLead.phone}
                    </a>
                  ) : (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 16px', background: '#1e293b', color: '#8b9eb7', borderRadius: 8, fontSize: 14 }}>
                      <Phone size={18} /> No phone number
                    </div>
                  )}
                </div>

                {/* Quick actions */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                  {viewLead.email && (
                    <a href={`mailto:${viewLead.email.split(',')[0]}`} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 12px', background: '#1e293b', color: '#06b6d4', borderRadius: 8, textDecoration: 'none', fontSize: 12, border: '1px solid #2a3a4a' }}>
                      <Mail size={14} /> Email
                    </a>
                  )}
                  {viewLead.website && (
                    <a href={viewLead.website} target="_blank" rel="noopener noreferrer" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 12px', background: '#1e293b', color: '#a78bfa', borderRadius: 8, textDecoration: 'none', fontSize: 12, border: '1px solid #2a3a4a' }}>
                      <Globe size={14} /> Website
                    </a>
                  )}
                  {viewLead.mapsUrl && (
                    <a href={viewLead.mapsUrl} target="_blank" rel="noopener noreferrer" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 12px', background: '#1e293b', color: '#4ade80', borderRadius: 8, textDecoration: 'none', fontSize: 12, border: '1px solid #2a3a4a' }}>
                      <MapPin size={14} /> Maps
                    </a>
                  )}
                </div>

                {/* Details grid */}
                <div style={{ display: 'grid', gap: 12 }}>
                  {viewLead.address && (
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <MapPin size={16} style={{ color: '#8b9eb7', marginTop: 2, flexShrink: 0 }} />
                      <div><div style={{ fontSize: 11, color: '#8b9eb7' }}>Address</div><div style={{ fontSize: 13, color: '#ece8e1' }}>{viewLead.address}</div></div>
                    </div>
                  )}
                  {viewLead.email && (
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <Mail size={16} style={{ color: '#8b9eb7', marginTop: 2, flexShrink: 0 }} />
                      <div><div style={{ fontSize: 11, color: '#8b9eb7' }}>Email</div><div style={{ fontSize: 13, color: '#06b6d4' }}>{viewLead.email}</div></div>
                    </div>
                  )}
                  {viewLead.rating && (
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <Star size={16} style={{ color: '#f59e0b', marginTop: 2, flexShrink: 0 }} />
                      <div><div style={{ fontSize: 11, color: '#8b9eb7' }}>Rating</div><div style={{ fontSize: 13, color: '#ece8e1' }}>{viewLead.rating} / 5 ({viewLead.reviewCount || 0} reviews)</div></div>
                    </div>
                  )}
                  {viewLead.status && (
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <Building2 size={16} style={{ color: '#8b9eb7', marginTop: 2, flexShrink: 0 }} />
                      <div><div style={{ fontSize: 11, color: '#8b9eb7' }}>Status</div><div style={{ fontSize: 13, color: viewLead.status === 'OPERATIONAL' ? '#4ade80' : '#f59e0b' }}>{viewLead.status}</div></div>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <Clock size={16} style={{ color: '#8b9eb7', marginTop: 2, flexShrink: 0 }} />
                    <div><div style={{ fontSize: 11, color: '#8b9eb7' }}>Scraped</div><div style={{ fontSize: 13, color: '#ece8e1' }}>{new Date(viewLead.scrapedAt).toLocaleDateString()}</div></div>
                  </div>
                </div>

                {/* WhatsApp quick action */}
                {viewLead.phone && (
                  <a href={`https://wa.me/${viewLead.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20, padding: '12px 16px', background: '#25d36622', color: '#25d366', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 13, border: '1px solid #25d36644' }}>
                    <MessageSquare size={16} /> WhatsApp this lead
                  </a>
                )}
              </div>
            </div>
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

// ========= JETT — Paid Ads & Performance Marketing =========
function JettCampaignManager() {
  const [campaigns, setCampaigns] = useState(() => JSON.parse(localStorage.getItem('protocol_jett_campaigns') || '[]'));
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', platform: 'google', objective: 'conversions', budget: '', startDate: '', endDate: '' });
  const saveCampaigns = (c) => { setCampaigns(c); localStorage.setItem('protocol_jett_campaigns', JSON.stringify(c)); };
  const createCampaign = () => {
    if (!form.name || !form.budget) return;
    saveCampaigns([...campaigns, { ...form, id: Date.now(), status: 'draft', spent: 0, impressions: 0, clicks: 0, conversions: 0, roas: 0, createdAt: Date.now() }]);
    setForm({ name: '', platform: 'google', objective: 'conversions', budget: '', startDate: '', endDate: '' }); setShowCreate(false);
  };
  return (<><div className="tool-header"><Flame size={20} style={{ color: '#ff4655' }} /><h2>Campaign Manager</h2></div>
    <p style={{ color: '#8b9eb7', marginBottom: 16 }}>Create and manage paid ad campaigns across Google, Meta, and Amazon.</p>
    <button className="btn" onClick={() => setShowCreate(!showCreate)} style={{ marginBottom: 16 }}>+ New Campaign</button>
    {showCreate && (<div className="card" style={{ marginBottom: 16, display: 'grid', gap: 10 }}>
      <input className="input" placeholder="Campaign name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <select className="input" value={form.platform} onChange={e => setForm({...form, platform: e.target.value})}><option value="google">Google Ads</option><option value="meta">Meta Ads</option><option value="amazon">Amazon Ads</option><option value="flipkart">Flipkart Ads</option></select>
        <select className="input" value={form.objective} onChange={e => setForm({...form, objective: e.target.value})}><option value="awareness">Awareness</option><option value="traffic">Traffic</option><option value="conversions">Conversions</option><option value="roas">ROAS Target</option></select>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <input className="input" placeholder="Daily budget (₹)" type="number" value={form.budget} onChange={e => setForm({...form, budget: e.target.value})} />
        <input className="input" type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} />
        <input className="input" type="date" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} />
      </div>
      <button className="btn" onClick={createCampaign}>Create Campaign</button>
    </div>)}
    {campaigns.length === 0 ? <div className="card" style={{ textAlign: 'center', color: '#8b9eb7', padding: 40 }}>No campaigns yet. Create your first campaign above.</div> :
    <div style={{ display: 'grid', gap: 12 }}>{campaigns.map(c => (
      <div key={c.id} className="card" style={{ borderLeft: `3px solid ${c.platform === 'google' ? '#4285f4' : c.platform === 'meta' ? '#1877f2' : '#ff9900'}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><strong>{c.name}</strong><span style={{ color: '#8b9eb7', marginLeft: 8, fontSize: 12 }}>{c.platform.toUpperCase()} · {c.objective}</span></div>
          <span style={{ padding: '2px 10px', borderRadius: 4, fontSize: 11, background: c.status === 'active' ? '#16a34a22' : '#ff465522', color: c.status === 'active' ? '#4ade80' : '#ff4655' }}>{c.status.toUpperCase()}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 12 }}>
          <div><div style={{ fontSize: 11, color: '#8b9eb7' }}>Budget</div><div style={{ fontWeight: 600 }}>₹{c.budget}/day</div></div>
          <div><div style={{ fontSize: 11, color: '#8b9eb7' }}>Spent</div><div style={{ fontWeight: 600 }}>₹{c.spent}</div></div>
          <div><div style={{ fontSize: 11, color: '#8b9eb7' }}>Clicks</div><div style={{ fontWeight: 600 }}>{c.clicks}</div></div>
          <div><div style={{ fontSize: 11, color: '#8b9eb7' }}>ROAS</div><div style={{ fontWeight: 600 }}>{c.roas}x</div></div>
        </div>
      </div>
    ))}</div>}
  </>);
}

function JettBudgetOptimizer() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const run = async () => {
    if (!input) return; setLoading(true);
    try { const r = await callClaude(`As a paid media budget optimization expert for Kiro Foods India (clean-label RTE brand), analyse this budget/campaign data and provide optimization recommendations:\n\n${input}\n\nProvide: optimal budget allocation across channels, bid strategy recommendations, dayparting suggestions, audience refinement, and projected ROAS improvements.`, SYSTEM_PROMPTS.strategy); setResult(r.content); }
    catch (e) { setResult('Error: ' + e.message); } setLoading(false);
  };
  return (<><div className="tool-header"><Wallet size={20} style={{ color: '#ff4655' }} /><h2>Budget Optimizer</h2></div>
    <p style={{ color: '#8b9eb7', marginBottom: 12 }}>AI-powered budget allocation and bid optimization across all paid channels.</p>
    <textarea className="input" rows={5} placeholder="Paste your current budget breakdown, campaign performance data, or describe your ad spend goals..." value={input} onChange={e => setInput(e.target.value)} style={{ width: '100%', marginBottom: 12 }} />
    <button className="btn" onClick={run} disabled={loading}>{loading ? 'Optimizing...' : 'Optimize Budget'}</button>
    {result && <div className="card" style={{ marginTop: 16, whiteSpace: 'pre-wrap' }}>{result}</div>}
  </>);
}

function JettROASTracker() {
  const [campaigns] = useState(() => JSON.parse(localStorage.getItem('protocol_jett_campaigns') || '[]'));
  const totalSpent = campaigns.reduce((s, c) => s + (Number(c.spent) || 0), 0);
  const totalBudget = campaigns.reduce((s, c) => s + (Number(c.budget) * 30 || 0), 0);
  return (<><div className="tool-header"><LineChart size={20} style={{ color: '#ff4655' }} /><h2>ROAS Tracker</h2></div>
    <p style={{ color: '#8b9eb7', marginBottom: 16 }}>Track return on ad spend across all campaigns and channels.</p>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
      {[{ label: 'Total Budget', value: `₹${totalBudget.toLocaleString()}`, color: '#8b9eb7' }, { label: 'Total Spent', value: `₹${totalSpent.toLocaleString()}`, color: '#06b6d4' }, { label: 'Active Campaigns', value: campaigns.filter(c => c.status === 'active').length, color: '#4ade80' }, { label: 'Avg ROAS', value: campaigns.length ? (campaigns.reduce((s, c) => s + (Number(c.roas) || 0), 0) / campaigns.length).toFixed(1) + 'x' : '0x', color: '#ff4655' }].map((m, i) => (
        <div key={i} className="card" style={{ textAlign: 'center' }}><div style={{ fontSize: 11, color: m.color }}>{m.label}</div><div style={{ fontSize: 24, fontWeight: 700 }}>{m.value}</div></div>
      ))}
    </div>
    {campaigns.length === 0 ? <div className="card" style={{ textAlign: 'center', color: '#8b9eb7', padding: 30 }}>No campaign data yet. Create campaigns in Campaign Manager.</div> :
    <div style={{ display: 'grid', gap: 10 }}>{campaigns.map(c => (
      <div key={c.id} className="card"><div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>{c.name}</strong><span style={{ color: c.roas >= 3 ? '#4ade80' : c.roas >= 1 ? '#f5a623' : '#ff4655', fontWeight: 600 }}>{c.roas}x ROAS</span></div></div>
    ))}</div>}
  </>);
}

function JettABTests() {
  const [tests, setTests] = useState(() => JSON.parse(localStorage.getItem('protocol_jett_abtests') || '[]'));
  const [form, setForm] = useState({ name: '', variantA: '', variantB: '', metric: 'ctr' });
  const saveTests = (t) => { setTests(t); localStorage.setItem('protocol_jett_abtests', JSON.stringify(t)); };
  return (<><div className="tool-header"><SplitSquareVertical size={20} style={{ color: '#ff4655' }} /><h2>A/B Tests</h2></div>
    <p style={{ color: '#8b9eb7', marginBottom: 12 }}>Create and track A/B tests for ad creatives, copy, and landing pages.</p>
    <div className="card" style={{ marginBottom: 16, display: 'grid', gap: 8 }}>
      <input className="input" placeholder="Test name (e.g. Homepage Hero CTA)" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <input className="input" placeholder="Variant A description" value={form.variantA} onChange={e => setForm({...form, variantA: e.target.value})} />
        <input className="input" placeholder="Variant B description" value={form.variantB} onChange={e => setForm({...form, variantB: e.target.value})} />
      </div>
      <button className="btn" onClick={() => { if (!form.name) return; saveTests([...tests, { ...form, id: Date.now(), status: 'running', winner: null }]); setForm({ name: '', variantA: '', variantB: '', metric: 'ctr' }); }}>Create Test</button>
    </div>
    {tests.map(t => (<div key={t.id} className="card" style={{ marginBottom: 8 }}><strong>{t.name}</strong><span style={{ marginLeft: 8, fontSize: 12, color: '#8b9eb7' }}>{t.status}</span><div style={{ fontSize: 13, color: '#8b9eb7', marginTop: 4 }}>A: {t.variantA} vs B: {t.variantB}</div></div>))}
  </>);
}

// ========= SAGE — CRM & Customer Relationships =========
function SageCustomerDB() {
  const [customers, setCustomers] = useState(() => JSON.parse(localStorage.getItem('protocol_sage_customers') || '[]'));
  const [form, setForm] = useState({ name: '', email: '', phone: '', segment: 'prospect', source: '', notes: '' });
  const save = (c) => { setCustomers(c); localStorage.setItem('protocol_sage_customers', JSON.stringify(c)); };
  return (<><div className="tool-header"><Users size={20} style={{ color: '#ff4655' }} /><h2>Customer Database</h2></div>
    <p style={{ color: '#8b9eb7', marginBottom: 12 }}>Central CRM for all customer and prospect data.</p>
    <div className="card" style={{ marginBottom: 16, display: 'grid', gap: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <input className="input" placeholder="Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
        <input className="input" placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
        <input className="input" placeholder="Phone" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <select className="input" value={form.segment} onChange={e => setForm({...form, segment: e.target.value})}><option value="prospect">Prospect</option><option value="lead">Lead</option><option value="customer">Customer</option><option value="vip">VIP</option><option value="churned">Churned</option></select>
        <input className="input" placeholder="Source (e.g. Instagram, Google)" value={form.source} onChange={e => setForm({...form, source: e.target.value})} />
        <input className="input" placeholder="Notes" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
      </div>
      <button className="btn" onClick={() => { if (!form.name) return; save([...customers, { ...form, id: Date.now(), createdAt: Date.now(), ltv: 0, orders: 0 }]); setForm({ name: '', email: '', phone: '', segment: 'prospect', source: '', notes: '' }); }}>Add Customer</button>
    </div>
    <div style={{ marginBottom: 12, display: 'flex', gap: 12 }}>{['all','prospect','lead','customer','vip','churned'].map(s => <span key={s} style={{ fontSize: 12, color: '#8b9eb7', cursor: 'pointer' }}>{s.toUpperCase()} ({customers.filter(c => s === 'all' || c.segment === s).length})</span>)}</div>
    {customers.length === 0 ? <div className="card" style={{ textAlign: 'center', color: '#8b9eb7', padding: 30 }}>No customers yet.</div> :
    <div style={{ display: 'grid', gap: 8 }}>{customers.map(c => (<div key={c.id} className="card"><div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>{c.name}</strong><span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: '#ff465522', color: '#ff4655' }}>{c.segment}</span></div><div style={{ fontSize: 12, color: '#8b9eb7' }}>{c.email} · {c.phone}</div></div>))}</div>}
  </>);
}

function SageLifecycle() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const run = async () => {
    if (!input) return; setLoading(true);
    try { const r = await callClaude(`As a customer lifecycle marketing expert for Kiro Foods India, analyse this customer data and create lifecycle strategies:\n\n${input}\n\nProvide: lifecycle stage mapping, automated trigger campaigns for each stage, retention tactics, churn prediction signals, win-back strategies, and LTV optimization recommendations.`, SYSTEM_PROMPTS.strategy); setResult(r.content); }
    catch (e) { setResult('Error: ' + e.message); } setLoading(false);
  };
  return (<><div className="tool-header"><Repeat2 size={20} style={{ color: '#ff4655' }} /><h2>Lifecycle Tracker</h2></div>
    <p style={{ color: '#8b9eb7', marginBottom: 12 }}>Map and optimize the customer journey from awareness to advocacy.</p>
    <textarea className="input" rows={5} placeholder="Describe your customer segments, purchase patterns, or paste customer data..." value={input} onChange={e => setInput(e.target.value)} style={{ width: '100%', marginBottom: 12 }} />
    <button className="btn" onClick={run} disabled={loading}>{loading ? 'Analyzing...' : 'Analyze Lifecycle'}</button>
    {result && <div className="card" style={{ marginTop: 16, whiteSpace: 'pre-wrap' }}>{result}</div>}
  </>);
}

function SageRetention() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const run = async () => {
    setLoading(true);
    try { const r = await callClaude(`As a retention marketing expert for Kiro Foods India (clean-label RTE/RTC brand), create a comprehensive retention strategy:\n\n${input || 'Create a full retention playbook for a pre-launch FMCG D2C brand.'}\n\nInclude: loyalty program design, subscription model, re-engagement triggers, churn prediction indicators, win-back sequences, referral program, NPS tracking, and repeat purchase optimization.`, SYSTEM_PROMPTS.strategy); setResult(r.content); }
    catch (e) { setResult('Error: ' + e.message); } setLoading(false);
  };
  return (<><div className="tool-header"><Heart size={20} style={{ color: '#ff4655' }} /><h2>Retention Engine</h2></div>
    <p style={{ color: '#8b9eb7', marginBottom: 12 }}>Build loyalty programs, reduce churn, and maximize customer lifetime value.</p>
    <textarea className="input" rows={4} placeholder="Describe your retention challenge or leave blank for a full playbook..." value={input} onChange={e => setInput(e.target.value)} style={{ width: '100%', marginBottom: 12 }} />
    <button className="btn" onClick={run} disabled={loading}>{loading ? 'Building...' : 'Build Retention Strategy'}</button>
    {result && <div className="card" style={{ marginTop: 16, whiteSpace: 'pre-wrap' }}>{result}</div>}
  </>);
}

function SageChurnPredictor() {
  const customers = JSON.parse(localStorage.getItem('protocol_sage_customers') || '[]');
  const churned = customers.filter(c => c.segment === 'churned').length;
  const atRisk = customers.filter(c => c.segment === 'customer' && c.orders < 2).length;
  return (<><div className="tool-header"><AlertTriangle size={20} style={{ color: '#ff4655' }} /><h2>Churn Predictor</h2></div>
    <p style={{ color: '#8b9eb7', marginBottom: 16 }}>Identify at-risk customers before they leave.</p>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
      <div className="card" style={{ textAlign: 'center' }}><div style={{ fontSize: 11, color: '#4ade80' }}>Active</div><div style={{ fontSize: 28, fontWeight: 700 }}>{customers.filter(c => c.segment === 'customer' || c.segment === 'vip').length}</div></div>
      <div className="card" style={{ textAlign: 'center' }}><div style={{ fontSize: 11, color: '#f5a623' }}>At Risk</div><div style={{ fontSize: 28, fontWeight: 700 }}>{atRisk}</div></div>
      <div className="card" style={{ textAlign: 'center' }}><div style={{ fontSize: 11, color: '#ff4655' }}>Churned</div><div style={{ fontSize: 28, fontWeight: 700 }}>{churned}</div></div>
    </div>
    <div className="card" style={{ color: '#8b9eb7' }}>Add customers to the Customer Database to start tracking churn signals. The predictor analyses purchase frequency, recency, and engagement patterns.</div>
  </>);
}

// ========= VIPER — Email & Drip Marketing =========
function ViperDripBuilder() {
  const [sequences, setSequences] = useState(() => JSON.parse(localStorage.getItem('protocol_viper_sequences') || '[]'));
  const [form, setForm] = useState({ name: '', type: 'welcome', emails: 5 });
  const [aiResult, setAiResult] = useState('');
  const [loading, setLoading] = useState(false);
  const save = (s) => { setSequences(s); localStorage.setItem('protocol_viper_sequences', JSON.stringify(s)); };
  const generate = async () => {
    setLoading(true);
    try { const r = await callClaude(`As an email marketing automation expert for Kiro Foods India, create a ${form.type} email sequence with ${form.emails} emails called "${form.name}".\n\nFor each email provide: subject line, preview text, send timing (delay from trigger), email body copy, primary CTA, and A/B test suggestion.\n\nFollowing Indian FMCG best practices: WhatsApp opt-in mentions, ₹ pricing, festival timing awareness, mobile-first design.`, SYSTEM_PROMPTS.creative); setAiResult(r.content); }
    catch (e) { setAiResult('Error: ' + e.message); } setLoading(false);
  };
  return (<><div className="tool-header"><Send size={20} style={{ color: '#ff4655' }} /><h2>Drip Campaign Builder</h2></div>
    <p style={{ color: '#8b9eb7', marginBottom: 12 }}>Create automated email sequences for every stage of the customer journey.</p>
    <div className="card" style={{ marginBottom: 16, display: 'grid', gap: 8 }}>
      <input className="input" placeholder="Sequence name (e.g. Welcome Series)" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <select className="input" value={form.type} onChange={e => setForm({...form, type: e.target.value})}><option value="welcome">Welcome / Onboarding</option><option value="nurture">Lead Nurture</option><option value="post-purchase">Post-Purchase</option><option value="re-engagement">Re-Engagement</option><option value="winback">Win-Back</option><option value="launch">Product Launch</option></select>
        <select className="input" value={form.emails} onChange={e => setForm({...form, emails: Number(e.target.value)})}><option value={3}>3 Emails</option><option value={5}>5 Emails</option><option value={7}>7 Emails</option><option value={10}>10 Emails</option></select>
      </div>
      <button className="btn" onClick={generate} disabled={loading}>{loading ? 'Generating...' : 'Generate Sequence with AI'}</button>
    </div>
    {aiResult && <div className="card" style={{ whiteSpace: 'pre-wrap' }}>{aiResult}</div>}
    {sequences.map(s => (<div key={s.id} className="card" style={{ marginTop: 8 }}><strong>{s.name}</strong><span style={{ marginLeft: 8, fontSize: 12, color: '#8b9eb7' }}>{s.type} · {s.emails} emails</span></div>))}
  </>);
}

function ViperNewsletter() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const run = async () => {
    setLoading(true);
    try { const r = await callClaude(`As a newsletter editor for Kiro Foods India, create a compelling email newsletter:\n\nTopic/Brief: ${input || 'Weekly clean-label food newsletter'}\n\nProvide: subject line (3 options), preview text, full email body with sections (hero, main story, secondary content, CTA), and design notes. Follow brand voice: warm, honest, conversational.`, SYSTEM_PROMPTS.creative); setResult(r.content); }
    catch (e) { setResult('Error: ' + e.message); } setLoading(false);
  };
  return (<><div className="tool-header"><Mail size={20} style={{ color: '#ff4655' }} /><h2>Newsletter Editor</h2></div>
    <p style={{ color: '#8b9eb7', marginBottom: 12 }}>AI-powered newsletter creation with brand voice enforcement.</p>
    <textarea className="input" rows={4} placeholder="Newsletter topic, key updates, or content brief..." value={input} onChange={e => setInput(e.target.value)} style={{ width: '100%', marginBottom: 12 }} />
    <button className="btn" onClick={run} disabled={loading}>{loading ? 'Writing...' : 'Generate Newsletter'}</button>
    {result && <div className="card" style={{ marginTop: 16, whiteSpace: 'pre-wrap' }}>{result}</div>}
  </>);
}

function ViperSegmentation() {
  const customers = JSON.parse(localStorage.getItem('protocol_sage_customers') || '[]');
  const segments = { prospect: customers.filter(c => c.segment === 'prospect'), lead: customers.filter(c => c.segment === 'lead'), customer: customers.filter(c => c.segment === 'customer'), vip: customers.filter(c => c.segment === 'vip'), churned: customers.filter(c => c.segment === 'churned') };
  return (<><div className="tool-header"><Filter size={20} style={{ color: '#ff4655' }} /><h2>Audience Segmentation</h2></div>
    <p style={{ color: '#8b9eb7', marginBottom: 16 }}>Segment your audience for targeted email campaigns.</p>
    <div style={{ display: 'grid', gap: 12 }}>{Object.entries(segments).map(([key, list]) => (
      <div key={key} className="card"><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><strong style={{ textTransform: 'capitalize' }}>{key}</strong><span style={{ marginLeft: 8, color: '#8b9eb7', fontSize: 12 }}>{list.length} contacts</span></div><button className="btn" style={{ fontSize: 11, padding: '4px 12px' }}>Create Campaign →</button></div></div>
    ))}</div>
    {customers.length === 0 && <div className="card" style={{ marginTop: 12, textAlign: 'center', color: '#8b9eb7' }}>Add customers via Sage's Customer Database to segment them here.</div>}
  </>);
}

// ========= REYNA — Influencer Marketing =========
function ReynaDiscovery() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const run = async () => {
    setLoading(true);
    try { const r = await callClaude(`As an influencer marketing expert for Kiro Foods India (clean-label RTE/RTC brand), find and recommend influencers:\n\nBrief: ${input || 'Find food influencers for clean-label brand launch in India'}\n\nProvide: 15 influencer recommendations with name, platform, follower range, engagement rate estimate, content style, relevance score (1-10), estimated cost per post, and why they fit Kiro Foods. Include micro (10K-50K), mid (50K-500K), and macro (500K+) tiers. Focus on food, health, family, and lifestyle niches in India.`, SYSTEM_PROMPTS.social); setResult(r.content); }
    catch (e) { setResult('Error: ' + e.message); } setLoading(false);
  };
  return (<><div className="tool-header"><Crown size={20} style={{ color: '#ff4655' }} /><h2>Influencer Discovery</h2></div>
    <p style={{ color: '#8b9eb7', marginBottom: 12 }}>Find and evaluate influencers for brand partnerships.</p>
    <textarea className="input" rows={3} placeholder="Describe your campaign, target audience, budget range, or specific niches..." value={input} onChange={e => setInput(e.target.value)} style={{ width: '100%', marginBottom: 12 }} />
    <button className="btn" onClick={run} disabled={loading}>{loading ? 'Searching...' : 'Find Influencers'}</button>
    {result && <div className="card" style={{ marginTop: 16, whiteSpace: 'pre-wrap' }}>{result}</div>}
  </>);
}

function ReynaOutreach() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const run = async () => {
    setLoading(true);
    try { const r = await callClaude(`As an influencer outreach specialist for Kiro Foods India, create outreach templates and strategy:\n\n${input || 'Create outreach templates for food influencer partnerships'}\n\nProvide: 3 DM templates (cold, warm, collaboration), 2 email templates, negotiation talking points, contract must-haves, content brief template, and follow-up sequence. Include Indian market norms for pricing and deliverables.`, SYSTEM_PROMPTS.creative); setResult(r.content); }
    catch (e) { setResult('Error: ' + e.message); } setLoading(false);
  };
  return (<><div className="tool-header"><Handshake size={20} style={{ color: '#ff4655' }} /><h2>Outreach Manager</h2></div>
    <p style={{ color: '#8b9eb7', marginBottom: 12 }}>Generate personalized outreach templates and manage influencer communications.</p>
    <textarea className="input" rows={3} placeholder="Describe the influencer, campaign, or outreach context..." value={input} onChange={e => setInput(e.target.value)} style={{ width: '100%', marginBottom: 12 }} />
    <button className="btn" onClick={run} disabled={loading}>{loading ? 'Generating...' : 'Generate Outreach'}</button>
    {result && <div className="card" style={{ marginTop: 16, whiteSpace: 'pre-wrap' }}>{result}</div>}
  </>);
}

function ReynaCampaignTracker() {
  const [campaigns, setCampaigns] = useState(() => JSON.parse(localStorage.getItem('protocol_reyna_campaigns') || '[]'));
  const [form, setForm] = useState({ influencer: '', platform: 'instagram', deliverables: '', budget: '', status: 'outreach' });
  const save = (c) => { setCampaigns(c); localStorage.setItem('protocol_reyna_campaigns', JSON.stringify(c)); };
  return (<><div className="tool-header"><Target size={20} style={{ color: '#ff4655' }} /><h2>Campaign Tracker</h2></div>
    <p style={{ color: '#8b9eb7', marginBottom: 12 }}>Track influencer campaigns from outreach to ROI measurement.</p>
    <div className="card" style={{ marginBottom: 16, display: 'grid', gap: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <input className="input" placeholder="Influencer name" value={form.influencer} onChange={e => setForm({...form, influencer: e.target.value})} />
        <select className="input" value={form.platform} onChange={e => setForm({...form, platform: e.target.value})}><option value="instagram">Instagram</option><option value="youtube">YouTube</option><option value="twitter">Twitter</option><option value="linkedin">LinkedIn</option></select>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8 }}>
        <input className="input" placeholder="Deliverables (e.g. 2 Reels + 3 Stories)" value={form.deliverables} onChange={e => setForm({...form, deliverables: e.target.value})} />
        <input className="input" placeholder="Budget (₹)" type="number" value={form.budget} onChange={e => setForm({...form, budget: e.target.value})} />
        <select className="input" value={form.status} onChange={e => setForm({...form, status: e.target.value})}><option value="outreach">Outreach</option><option value="negotiation">Negotiation</option><option value="contracted">Contracted</option><option value="content-review">Content Review</option><option value="live">Live</option><option value="completed">Completed</option></select>
      </div>
      <button className="btn" onClick={() => { if (!form.influencer) return; save([...campaigns, { ...form, id: Date.now() }]); setForm({ influencer: '', platform: 'instagram', deliverables: '', budget: '', status: 'outreach' }); }}>Add Campaign</button>
    </div>
    {campaigns.map(c => (<div key={c.id} className="card" style={{ marginBottom: 8, borderLeft: '3px solid #ff4655' }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>{c.influencer}</strong><span style={{ fontSize: 11, color: '#8b9eb7' }}>{c.status.toUpperCase()}</span></div><div style={{ fontSize: 12, color: '#8b9eb7' }}>{c.platform} · {c.deliverables} · ₹{c.budget}</div></div>))}
  </>);
}

function ReynaUGCHub() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const run = async () => {
    setLoading(true);
    try { const r = await callClaude(`As a UGC (User-Generated Content) strategy expert for Kiro Foods India, create a UGC collection and amplification plan:\n\n${input || 'Build a complete UGC strategy for clean-label food brand launch'}\n\nProvide: UGC campaign ideas, content prompts for customers, hashtag strategy, rights management template, best practices for repurposing UGC, incentive structure, and content moderation guidelines.`, SYSTEM_PROMPTS.creative); setResult(r.content); }
    catch (e) { setResult('Error: ' + e.message); } setLoading(false);
  };
  return (<><div className="tool-header"><Heart size={20} style={{ color: '#ff4655' }} /><h2>UGC Hub</h2></div>
    <p style={{ color: '#8b9eb7', marginBottom: 12 }}>Collect, curate, and amplify user-generated content.</p>
    <textarea className="input" rows={3} placeholder="Describe your UGC goals or campaign..." value={input} onChange={e => setInput(e.target.value)} style={{ width: '100%', marginBottom: 12 }} />
    <button className="btn" onClick={run} disabled={loading}>{loading ? 'Building...' : 'Build UGC Strategy'}</button>
    {result && <div className="card" style={{ marginTop: 16, whiteSpace: 'pre-wrap' }}>{result}</div>}
  </>);
}

// ========= PHOENIX — Social Media Management =========
function PhoenixCalendar() {
  const [posts, setPosts] = useState(() => JSON.parse(localStorage.getItem('protocol_phoenix_posts') || '[]'));
  const [form, setForm] = useState({ content: '', platform: 'instagram', date: '', time: '10:00', status: 'draft' });
  const save = (p) => { setPosts(p); localStorage.setItem('protocol_phoenix_posts', JSON.stringify(p)); };
  return (<><div className="tool-header"><CalendarDays size={20} style={{ color: '#ff4655' }} /><h2>Content Calendar</h2></div>
    <p style={{ color: '#8b9eb7', marginBottom: 12 }}>Plan and schedule social media content across all platforms.</p>
    <div className="card" style={{ marginBottom: 16, display: 'grid', gap: 8 }}>
      <textarea className="input" rows={3} placeholder="Post content..." value={form.content} onChange={e => setForm({...form, content: e.target.value})} style={{ width: '100%' }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
        <select className="input" value={form.platform} onChange={e => setForm({...form, platform: e.target.value})}><option value="instagram">Instagram</option><option value="facebook">Facebook</option><option value="twitter">Twitter</option><option value="linkedin">LinkedIn</option><option value="youtube">YouTube</option></select>
        <input className="input" type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
        <input className="input" type="time" value={form.time} onChange={e => setForm({...form, time: e.target.value})} />
        <select className="input" value={form.status} onChange={e => setForm({...form, status: e.target.value})}><option value="draft">Draft</option><option value="scheduled">Scheduled</option><option value="published">Published</option></select>
      </div>
      <button className="btn" onClick={() => { if (!form.content) return; save([...posts, { ...form, id: Date.now() }]); setForm({ content: '', platform: 'instagram', date: '', time: '10:00', status: 'draft' }); }}>Add to Calendar</button>
    </div>
    {posts.length === 0 ? <div className="card" style={{ textAlign: 'center', color: '#8b9eb7', padding: 30 }}>No scheduled posts yet.</div> :
    <div style={{ display: 'grid', gap: 8 }}>{posts.sort((a, b) => new Date(a.date) - new Date(b.date)).map(p => (
      <div key={p.id} className="card"><div style={{ display: 'flex', justifyContent: 'space-between' }}><div><strong>{p.platform}</strong><span style={{ marginLeft: 8, fontSize: 12, color: '#8b9eb7' }}>{p.date} {p.time}</span></div><span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: p.status === 'published' ? '#16a34a22' : p.status === 'scheduled' ? '#06b6d422' : '#8b9eb722', color: p.status === 'published' ? '#4ade80' : p.status === 'scheduled' ? '#06b6d4' : '#8b9eb7' }}>{p.status}</span></div><div style={{ fontSize: 13, color: '#c0c8d4', marginTop: 6 }}>{p.content.slice(0, 120)}{p.content.length > 120 ? '...' : ''}</div></div>
    ))}</div>}
  </>);
}

function PhoenixScheduler() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const run = async () => {
    setLoading(true);
    try { const r = await callClaude(`As a social media scheduling expert for Kiro Foods India, create an optimal posting schedule:\n\n${input || 'Create a weekly social media posting schedule for a clean-label food brand launching in India'}\n\nProvide: platform-specific optimal posting times for Indian audiences, content type per slot (Reel/Carousel/Story/Post/Thread), content pillar rotation, frequency recommendations, and a 7-day template calendar with specific post ideas.`, SYSTEM_PROMPTS.social); setResult(r.content); }
    catch (e) { setResult('Error: ' + e.message); } setLoading(false);
  };
  return (<><div className="tool-header"><Clock size={20} style={{ color: '#ff4655' }} /><h2>Smart Scheduler</h2></div>
    <p style={{ color: '#8b9eb7', marginBottom: 12 }}>AI-optimized posting schedule based on audience behavior and platform algorithms.</p>
    <textarea className="input" rows={3} placeholder="Describe your social media goals, target audience, or content themes..." value={input} onChange={e => setInput(e.target.value)} style={{ width: '100%', marginBottom: 12 }} />
    <button className="btn" onClick={run} disabled={loading}>{loading ? 'Planning...' : 'Generate Schedule'}</button>
    {result && <div className="card" style={{ marginTop: 16, whiteSpace: 'pre-wrap' }}>{result}</div>}
  </>);
}

function PhoenixEngagement() {
  const posts = JSON.parse(localStorage.getItem('protocol_phoenix_posts') || '[]');
  const published = posts.filter(p => p.status === 'published').length;
  const scheduled = posts.filter(p => p.status === 'scheduled').length;
  return (<><div className="tool-header"><ThumbsUp size={20} style={{ color: '#ff4655' }} /><h2>Engagement Tracker</h2></div>
    <p style={{ color: '#8b9eb7', marginBottom: 16 }}>Monitor engagement metrics across all social platforms.</p>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
      {[{ label: 'Published', value: published, color: '#4ade80' }, { label: 'Scheduled', value: scheduled, color: '#06b6d4' }, { label: 'Drafts', value: posts.filter(p => p.status === 'draft').length, color: '#8b9eb7' }, { label: 'Total Posts', value: posts.length, color: '#ff4655' }].map((m, i) => (
        <div key={i} className="card" style={{ textAlign: 'center' }}><div style={{ fontSize: 11, color: m.color }}>{m.label}</div><div style={{ fontSize: 24, fontWeight: 700 }}>{m.value}</div></div>
      ))}
    </div>
    <div className="card" style={{ color: '#8b9eb7' }}>Connect your social media accounts to start tracking real engagement data. Currently showing content calendar metrics.</div>
  </>);
}

function PhoenixCommunity() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const run = async () => {
    setLoading(true);
    try { const r = await callClaude(`As a community management expert for Kiro Foods India, create community engagement strategies:\n\n${input || 'Build a community engagement playbook for clean-label food brand on social media'}\n\nProvide: response templates for common comments (positive, negative, questions, complaints), community guidelines, engagement tactics, UGC encouragement strategies, crisis response protocols, and metrics to track.`, SYSTEM_PROMPTS.social); setResult(r.content); }
    catch (e) { setResult('Error: ' + e.message); } setLoading(false);
  };
  return (<><div className="tool-header"><UsersRound size={20} style={{ color: '#ff4655' }} /><h2>Community Inbox</h2></div>
    <p style={{ color: '#8b9eb7', marginBottom: 12 }}>Manage community interactions and build brand advocates.</p>
    <textarea className="input" rows={3} placeholder="Describe your community management needs or paste comments to respond to..." value={input} onChange={e => setInput(e.target.value)} style={{ width: '100%', marginBottom: 12 }} />
    <button className="btn" onClick={run} disabled={loading}>{loading ? 'Generating...' : 'Generate Community Playbook'}</button>
    {result && <div className="card" style={{ marginTop: 16, whiteSpace: 'pre-wrap' }}>{result}</div>}
  </>);
}

// ========= ASTRA — Media Planning & Buying =========
function AstraMediaPlanner() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const run = async () => {
    setLoading(true);
    try { const r = await callClaude(`As a media planning director for Kiro Foods India with deep expertise in Indian media landscape, create a comprehensive media plan:\n\n${input || 'Create a launch media plan for a clean-label RTE brand targeting urban India'}\n\nProvide: media mix recommendation (TV, digital, print, OOH, radio, cinema), channel-specific plans with specific properties/shows/publications, reach & frequency estimates, GRP targets, budget allocation %, flight plan (timeline), and rationale for each channel. Use real Indian media properties and current rates.`, SYSTEM_PROMPTS.strategy); setResult(r.content); }
    catch (e) { setResult('Error: ' + e.message); } setLoading(false);
  };
  return (<><div className="tool-header"><Tv size={20} style={{ color: '#ff4655' }} /><h2>Media Planner</h2></div>
    <p style={{ color: '#8b9eb7', marginBottom: 12 }}>AI-powered media planning across TV, print, digital, OOH, and radio.</p>
    <textarea className="input" rows={4} placeholder="Describe your media objectives, target audience, budget, and timeline..." value={input} onChange={e => setInput(e.target.value)} style={{ width: '100%', marginBottom: 12 }} />
    <button className="btn" onClick={run} disabled={loading}>{loading ? 'Planning...' : 'Generate Media Plan'}</button>
    {result && <div className="card" style={{ marginTop: 16, whiteSpace: 'pre-wrap' }}>{result}</div>}
  </>);
}

function AstraGRPCalculator() {
  const [reach, setReach] = useState('');
  const [frequency, setFrequency] = useState('');
  const [spots, setSpots] = useState('');
  const [tvr, setTvr] = useState('');
  const grp = reach && frequency ? (parseFloat(reach) * parseFloat(frequency)).toFixed(0) : spots && tvr ? (parseInt(spots) * parseFloat(tvr)).toFixed(0) : '';
  return (<><div className="tool-header"><Calculator size={20} style={{ color: '#ff4655' }} /><h2>GRP Calculator</h2></div>
    <p style={{ color: '#8b9eb7', marginBottom: 16 }}>Calculate Gross Rating Points, reach, frequency, and CPRP for media buys.</p>
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ fontWeight: 600, marginBottom: 12 }}>Method 1: Reach × Frequency</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        <input className="input" placeholder="Reach % (e.g. 65)" type="number" value={reach} onChange={e => setReach(e.target.value)} />
        <input className="input" placeholder="Frequency (e.g. 4.5)" type="number" step="0.1" value={frequency} onChange={e => setFrequency(e.target.value)} />
      </div>
      <div style={{ fontWeight: 600, marginBottom: 12 }}>Method 2: Spots × TVR</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <input className="input" placeholder="Number of spots" type="number" value={spots} onChange={e => setSpots(e.target.value)} />
        <input className="input" placeholder="TVR per spot" type="number" step="0.1" value={tvr} onChange={e => setTvr(e.target.value)} />
      </div>
    </div>
    {grp && <div className="card" style={{ textAlign: 'center', padding: 30 }}><div style={{ fontSize: 14, color: '#8b9eb7' }}>Gross Rating Points</div><div style={{ fontSize: 48, fontWeight: 700, color: '#ff4655' }}>{grp} GRPs</div></div>}
  </>);
}

function AstraMediaMix() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const run = async () => {
    setLoading(true);
    try { const r = await callClaude(`As a media mix optimization expert for Indian FMCG brands, analyse and optimize this media mix:\n\n${input || 'Optimize media mix for ₹2 Cr launch budget: TV (40%), Digital (30%), Print (15%), OOH (10%), Radio (5%)'}\n\nProvide: recommended allocation with rationale, channel synergy analysis, seasonality adjustments (IPL, Diwali, etc.), regional split recommendations, expected reach and frequency by channel, and ROI projections.`, SYSTEM_PROMPTS.strategy); setResult(r.content); }
    catch (e) { setResult('Error: ' + e.message); } setLoading(false);
  };
  return (<><div className="tool-header"><Orbit size={20} style={{ color: '#ff4655' }} /><h2>Media Mix Optimizer</h2></div>
    <p style={{ color: '#8b9eb7', marginBottom: 12 }}>Optimize budget allocation across media channels for maximum impact.</p>
    <textarea className="input" rows={4} placeholder="Enter your current media mix, budget, objectives, and any constraints..." value={input} onChange={e => setInput(e.target.value)} style={{ width: '100%', marginBottom: 12 }} />
    <button className="btn" onClick={run} disabled={loading}>{loading ? 'Optimizing...' : 'Optimize Mix'}</button>
    {result && <div className="card" style={{ marginTop: 16, whiteSpace: 'pre-wrap' }}>{result}</div>}
  </>);
}

// ========= FADE — Attribution & Analytics =========
function FadeUTMBuilder() {
  const [base, setBase] = useState('');
  const [source, setSource] = useState('');
  const [medium, setMedium] = useState('');
  const [campaign, setCampaign] = useState('');
  const [content, setContent] = useState('');
  const [term, setTerm] = useState('');
  const [history, setHistory] = useState(() => JSON.parse(localStorage.getItem('protocol_fade_utms') || '[]'));
  const url = base ? `${base}${base.includes('?') ? '&' : '?'}${[source && `utm_source=${encodeURIComponent(source)}`, medium && `utm_medium=${encodeURIComponent(medium)}`, campaign && `utm_campaign=${encodeURIComponent(campaign)}`, content && `utm_content=${encodeURIComponent(content)}`, term && `utm_term=${encodeURIComponent(term)}`].filter(Boolean).join('&')}` : '';
  const saveUTM = () => { if (!url) return; const h = [{ url, source, medium, campaign, content, term, createdAt: Date.now() }, ...history]; setHistory(h); localStorage.setItem('protocol_fade_utms', JSON.stringify(h)); navigator.clipboard.writeText(url); };
  return (<><div className="tool-header"><Link size={20} style={{ color: '#ff4655' }} /><h2>UTM Builder</h2></div>
    <p style={{ color: '#8b9eb7', marginBottom: 12 }}>Build tracked URLs for campaign attribution.</p>
    <div className="card" style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
      <input className="input" placeholder="Base URL (e.g. https://kirofoods.com/products)" value={base} onChange={e => setBase(e.target.value)} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <input className="input" placeholder="Source (e.g. instagram)" value={source} onChange={e => setSource(e.target.value)} />
        <input className="input" placeholder="Medium (e.g. social)" value={medium} onChange={e => setMedium(e.target.value)} />
        <input className="input" placeholder="Campaign (e.g. launch-q1)" value={campaign} onChange={e => setCampaign(e.target.value)} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <input className="input" placeholder="Content (optional)" value={content} onChange={e => setContent(e.target.value)} />
        <input className="input" placeholder="Term (optional)" value={term} onChange={e => setTerm(e.target.value)} />
      </div>
      {url && <div style={{ background: '#0f1923', padding: 10, borderRadius: 6, fontSize: 12, wordBreak: 'break-all', color: '#06b6d4' }}>{url}</div>}
      <button className="btn" onClick={saveUTM}>Copy & Save UTM</button>
    </div>
    {history.length > 0 && <div><div style={{ fontWeight: 600, marginBottom: 8 }}>Recent UTMs</div>{history.slice(0, 10).map((h, i) => (<div key={i} className="card" style={{ marginBottom: 6, fontSize: 12 }}><div style={{ color: '#06b6d4', wordBreak: 'break-all' }}>{h.url}</div><div style={{ color: '#8b9eb7', marginTop: 4 }}>{h.source}/{h.medium}/{h.campaign}</div></div>))}</div>}
  </>);
}

function FadeAttribution() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const run = async () => {
    setLoading(true);
    try { const r = await callClaude(`As a marketing attribution expert, analyse this data and build an attribution model:\n\n${input || 'Design a multi-touch attribution model for a D2C FMCG brand selling through website, Amazon, and quick commerce'}\n\nProvide: recommended attribution model (last-click, first-click, linear, time-decay, data-driven), channel contribution analysis, customer journey mapping, touchpoint weighting, and implementation guide using Google Analytics 4 and UTM parameters.`, SYSTEM_PROMPTS.strategy); setResult(r.content); }
    catch (e) { setResult('Error: ' + e.message); } setLoading(false);
  };
  return (<><div className="tool-header"><Waypoints size={20} style={{ color: '#ff4655' }} /><h2>Attribution Model</h2></div>
    <p style={{ color: '#8b9eb7', marginBottom: 12 }}>Build multi-touch attribution models to understand what drives conversions.</p>
    <textarea className="input" rows={4} placeholder="Describe your marketing channels, conversion events, and customer journey data..." value={input} onChange={e => setInput(e.target.value)} style={{ width: '100%', marginBottom: 12 }} />
    <button className="btn" onClick={run} disabled={loading}>{loading ? 'Modeling...' : 'Build Attribution Model'}</button>
    {result && <div className="card" style={{ marginTop: 16, whiteSpace: 'pre-wrap' }}>{result}</div>}
  </>);
}

function FadeFunnelAnalyzer() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const run = async () => {
    setLoading(true);
    try { const r = await callClaude(`As a conversion funnel expert for Kiro Foods India, analyse this funnel data and find leaks:\n\n${input || 'Analyse a typical D2C FMCG funnel: Awareness (ads) → Landing page → Product page → Add to cart → Checkout → Purchase → Repeat'}\n\nProvide: stage-by-stage drop-off analysis, benchmarks for each stage, specific leak identification, fix recommendations prioritised by impact, and A/B test suggestions for each funnel stage.`, SYSTEM_PROMPTS.strategy); setResult(r.content); }
    catch (e) { setResult('Error: ' + e.message); } setLoading(false);
  };
  return (<><div className="tool-header"><Scan size={20} style={{ color: '#ff4655' }} /><h2>Funnel Analyzer</h2></div>
    <p style={{ color: '#8b9eb7', marginBottom: 12 }}>Find and fix conversion funnel leaks across your customer journey.</p>
    <textarea className="input" rows={4} placeholder="Paste your funnel data (stage → visitors → conversions) or describe your funnel..." value={input} onChange={e => setInput(e.target.value)} style={{ width: '100%', marginBottom: 12 }} />
    <button className="btn" onClick={run} disabled={loading}>{loading ? 'Analyzing...' : 'Analyze Funnel'}</button>
    {result && <div className="card" style={{ marginTop: 16, whiteSpace: 'pre-wrap' }}>{result}</div>}
  </>);
}

// ========= GEKKO — Community & WhatsApp Marketing =========
function GekkoBroadcast() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const run = async () => {
    setLoading(true);
    try { const r = await callClaude(`As a WhatsApp marketing expert for Kiro Foods India, create broadcast campaign content:\n\n${input || 'Create a WhatsApp broadcast campaign for clean-label food brand launch'}\n\nProvide: 5 broadcast messages for different occasions (launch, offer, new product, festival, re-engagement), each with: message text (under 160 chars), CTA button text, media suggestion (image/video), send timing, and expected engagement rate. Follow WhatsApp Business API best practices and Indian FMCG norms.`, SYSTEM_PROMPTS.creative); setResult(r.content); }
    catch (e) { setResult('Error: ' + e.message); } setLoading(false);
  };
  return (<><div className="tool-header"><SmartphoneNfc size={20} style={{ color: '#ff4655' }} /><h2>WhatsApp Broadcast</h2></div>
    <p style={{ color: '#8b9eb7', marginBottom: 12 }}>Create WhatsApp broadcast campaigns with templates and scheduling.</p>
    <textarea className="input" rows={3} placeholder="Describe your broadcast campaign goal, audience segment, or offer..." value={input} onChange={e => setInput(e.target.value)} style={{ width: '100%', marginBottom: 12 }} />
    <button className="btn" onClick={run} disabled={loading}>{loading ? 'Creating...' : 'Generate Broadcast Campaign'}</button>
    {result && <div className="card" style={{ marginTop: 16, whiteSpace: 'pre-wrap' }}>{result}</div>}
  </>);
}

function GekkoChatbot() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const run = async () => {
    setLoading(true);
    try { const r = await callClaude(`As a chatbot design expert for Kiro Foods India, create a WhatsApp/website chatbot flow:\n\n${input || 'Design a customer support chatbot for a clean-label food delivery brand'}\n\nProvide: conversation flow diagram (text-based), main menu options, sub-flows for order tracking/product info/complaints/FAQ, escalation triggers to human agent, quick reply buttons for each step, and natural language fallback responses. Use Kiro's brand voice: warm, honest, helpful.`, SYSTEM_PROMPTS.creative); setResult(r.content); }
    catch (e) { setResult('Error: ' + e.message); } setLoading(false);
  };
  return (<><div className="tool-header"><Bot size={20} style={{ color: '#ff4655' }} /><h2>Chatbot Builder</h2></div>
    <p style={{ color: '#8b9eb7', marginBottom: 12 }}>Design conversational chatbot flows for WhatsApp and website.</p>
    <textarea className="input" rows={3} placeholder="Describe the chatbot's purpose, key flows, and target platform..." value={input} onChange={e => setInput(e.target.value)} style={{ width: '100%', marginBottom: 12 }} />
    <button className="btn" onClick={run} disabled={loading}>{loading ? 'Designing...' : 'Design Chatbot Flow'}</button>
    {result && <div className="card" style={{ marginTop: 16, whiteSpace: 'pre-wrap' }}>{result}</div>}
  </>);
}

function GekkoReferral() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const run = async () => {
    setLoading(true);
    try { const r = await callClaude(`As a growth marketing expert specialising in referral programs for Indian D2C brands, create a referral program for Kiro Foods:\n\n${input || 'Design a viral referral program for clean-label food brand launch in India'}\n\nProvide: program mechanics (give ₹X, get ₹X), reward structure, referral flow (how it works step by step), sharing mechanisms (WhatsApp, SMS, social, QR code), fraud prevention, tier system for top referrers, tracking implementation, and projected viral coefficient.`, SYSTEM_PROMPTS.strategy); setResult(r.content); }
    catch (e) { setResult('Error: ' + e.message); } setLoading(false);
  };
  return (<><div className="tool-header"><Gift size={20} style={{ color: '#ff4655' }} /><h2>Referral Program</h2></div>
    <p style={{ color: '#8b9eb7', marginBottom: 12 }}>Design and manage viral referral programs.</p>
    <textarea className="input" rows={3} placeholder="Describe your referral program goals, budget per referral, or existing program to optimize..." value={input} onChange={e => setInput(e.target.value)} style={{ width: '100%', marginBottom: 12 }} />
    <button className="btn" onClick={run} disabled={loading}>{loading ? 'Designing...' : 'Design Referral Program'}</button>
    {result && <div className="card" style={{ marginTop: 16, whiteSpace: 'pre-wrap' }}>{result}</div>}
  </>);
}

// ========= BREACH — PR & Crisis Management =========
function BreachPressRelease() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const run = async () => {
    setLoading(true);
    try { const r = await callClaude(`As a PR expert for Kiro Foods India, write a professional press release:\n\n${input || 'Write a press release announcing the launch of Kiro Foods, India\'s first clean-label RTE brand'}\n\nProvide: headline, subheadline, dateline (city, date), lead paragraph (who, what, when, where, why), body with quotes from founder, boilerplate about Kiro Foods, media contact info placeholder, and notes-to-editor with key facts. Follow Indian PR format standards.`, SYSTEM_PROMPTS.creative); setResult(r.content); }
    catch (e) { setResult('Error: ' + e.message); } setLoading(false);
  };
  return (<><div className="tool-header"><Newspaper size={20} style={{ color: '#ff4655' }} /><h2>Press Release Generator</h2></div>
    <p style={{ color: '#8b9eb7', marginBottom: 12 }}>Generate professional press releases for launches, announcements, and milestones.</p>
    <textarea className="input" rows={4} placeholder="Describe the announcement: what's happening, why it matters, key quotes, and target media..." value={input} onChange={e => setInput(e.target.value)} style={{ width: '100%', marginBottom: 12 }} />
    <button className="btn" onClick={run} disabled={loading}>{loading ? 'Writing...' : 'Generate Press Release'}</button>
    {result && <div className="card" style={{ marginTop: 16, whiteSpace: 'pre-wrap' }}>{result}</div>}
  </>);
}

function BreachMediaList() {
  const [lists, setLists] = useState(() => JSON.parse(localStorage.getItem('protocol_breach_medialist') || '[]'));
  const [form, setForm] = useState({ name: '', outlet: '', beat: '', email: '', phone: '', tier: 'tier1' });
  const save = (l) => { setLists(l); localStorage.setItem('protocol_breach_medialist', JSON.stringify(l)); };
  return (<><div className="tool-header"><Users size={20} style={{ color: '#ff4655' }} /><h2>Media List Manager</h2></div>
    <p style={{ color: '#8b9eb7', marginBottom: 12 }}>Build and manage journalist and media contact database.</p>
    <div className="card" style={{ marginBottom: 16, display: 'grid', gap: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <input className="input" placeholder="Journalist name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
        <input className="input" placeholder="Publication/Outlet" value={form.outlet} onChange={e => setForm({...form, outlet: e.target.value})} />
        <input className="input" placeholder="Beat (e.g. Food & FMCG)" value={form.beat} onChange={e => setForm({...form, beat: e.target.value})} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <input className="input" placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
        <input className="input" placeholder="Phone" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
        <select className="input" value={form.tier} onChange={e => setForm({...form, tier: e.target.value})}><option value="tier1">Tier 1 (National)</option><option value="tier2">Tier 2 (Regional)</option><option value="tier3">Tier 3 (Trade/Niche)</option><option value="blogger">Blogger/Creator</option></select>
      </div>
      <button className="btn" onClick={() => { if (!form.name) return; save([...lists, { ...form, id: Date.now() }]); setForm({ name: '', outlet: '', beat: '', email: '', phone: '', tier: 'tier1' }); }}>Add Contact</button>
    </div>
    {lists.length === 0 ? <div className="card" style={{ textAlign: 'center', color: '#8b9eb7', padding: 30 }}>No media contacts yet.</div> :
    <div style={{ display: 'grid', gap: 8 }}>{lists.map(c => (<div key={c.id} className="card"><div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>{c.name}</strong><span style={{ fontSize: 11, color: '#8b9eb7' }}>{c.tier.toUpperCase()}</span></div><div style={{ fontSize: 12, color: '#8b9eb7' }}>{c.outlet} · {c.beat} · {c.email}</div></div>))}</div>}
  </>);
}

function BreachCrisisPlaybook() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const run = async () => {
    setLoading(true);
    try { const r = await callClaude(`As a crisis communications expert for Kiro Foods India (FMCG food brand), create a crisis response plan:\n\n${input || 'Create a comprehensive crisis communication playbook for a food brand'}\n\nProvide: crisis severity classification (Level 1-3), response timelines for each level, holding statement templates, spokesperson guidelines, social media response protocols, media statement templates, internal communication flow, stakeholder notification order, and post-crisis recovery plan. Cover scenarios: product recall, food safety allegation, social media controversy, negative press, and competitor attack.`, SYSTEM_PROMPTS.strategy); setResult(r.content); }
    catch (e) { setResult('Error: ' + e.message); } setLoading(false);
  };
  return (<><div className="tool-header"><Siren size={20} style={{ color: '#ff4655' }} /><h2>Crisis Playbook</h2></div>
    <p style={{ color: '#8b9eb7', marginBottom: 12 }}>Pre-built crisis response protocols and communication templates.</p>
    <textarea className="input" rows={4} placeholder="Describe the crisis scenario or leave blank for a complete playbook..." value={input} onChange={e => setInput(e.target.value)} style={{ width: '100%', marginBottom: 12 }} />
    <button className="btn" onClick={run} disabled={loading}>{loading ? 'Building...' : 'Generate Crisis Playbook'}</button>
    {result && <div className="card" style={{ marginTop: 16, whiteSpace: 'pre-wrap' }}>{result}</div>}
  </>);
}

function BreachSentimentMonitor() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const run = async () => {
    setLoading(true);
    try { const r = await callClaude(`As a brand sentiment analysis expert, analyse these brand mentions/reviews/comments for Kiro Foods India:\n\n${input || 'Analyse sentiment for: "clean label food brand in India, ready to eat meals, no preservatives"'}\n\nProvide: overall sentiment score (positive/neutral/negative %), key themes identified, potential reputation risks, positive narratives to amplify, negative narratives to address, recommended response strategy, and monitoring keywords to track.`, SYSTEM_PROMPTS.strategy); setResult(r.content); }
    catch (e) { setResult('Error: ' + e.message); } setLoading(false);
  };
  return (<><div className="tool-header"><Activity size={20} style={{ color: '#ff4655' }} /><h2>Sentiment Monitor</h2></div>
    <p style={{ color: '#8b9eb7', marginBottom: 12 }}>Track and analyse brand sentiment across all channels.</p>
    <textarea className="input" rows={4} placeholder="Paste brand mentions, reviews, social comments, or keywords to monitor..." value={input} onChange={e => setInput(e.target.value)} style={{ width: '100%', marginBottom: 12 }} />
    <button className="btn" onClick={run} disabled={loading}>{loading ? 'Analyzing...' : 'Analyze Sentiment'}</button>
    {result && <div className="card" style={{ marginTop: 16, whiteSpace: 'pre-wrap' }}>{result}</div>}
  </>);
}

// ========= HARBOR — Distribution & Trade Management =========
function HarborDistributorDB() {
  const [partners, setPartners] = useState(() => JSON.parse(localStorage.getItem('protocol_harbor_partners') || '[]'));
  const [showAdd, setShowAdd] = useState(false);
  const [viewPartner, setViewPartner] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', type: 'distributor', territory: '', city: '', state: '', phone: '', email: '', contactPerson: '', gstNo: '', panNo: '', creditLimit: '', creditDays: '30', godownSize: '', vehicleCount: '', retailerCount: '', grade: 'B', status: 'prospect', bankName: '', accountNo: '', ifsc: '', notes: '' });
  const save = (p) => { setPartners(p); localStorage.setItem('protocol_harbor_partners', JSON.stringify(p)); };

  const filtered = partners.filter(p => {
    if (filterType !== 'all' && p.type !== filterType) return false;
    if (search) { const s = search.toLowerCase(); return (p.name || '').toLowerCase().includes(s) || (p.city || '').toLowerCase().includes(s) || (p.territory || '').toLowerCase().includes(s) || (p.contactPerson || '').toLowerCase().includes(s); }
    return true;
  });

  const stats = { total: partners.length, cnf: partners.filter(p => p.type === 'cnf').length, ss: partners.filter(p => p.type === 'superstockist').length, dist: partners.filter(p => p.type === 'distributor').length, active: partners.filter(p => p.status === 'active').length };

  return (<><div className="tool-header"><Truck size={20} style={{ color: '#ff4655' }} /><h2>Distribution Network</h2></div>
    <p style={{ color: '#8b9eb7', marginBottom: 16 }}>Manage your C&F agents, super stockists, and distributors.</p>

    {/* Stats row */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 16 }}>
      {[{ label: 'Total Partners', value: stats.total, color: '#ece8e1' }, { label: 'C&F Agents', value: stats.cnf, color: '#a78bfa' }, { label: 'Super Stockists', value: stats.ss, color: '#06b6d4' }, { label: 'Distributors', value: stats.dist, color: '#f5a623' }, { label: 'Active', value: stats.active, color: '#4ade80' }].map((m, i) => (
        <div key={i} className="card" style={{ textAlign: 'center', padding: '12px 8px' }}><div style={{ fontSize: 10, color: m.color, fontWeight: 600, letterSpacing: 1 }}>{m.label.toUpperCase()}</div><div style={{ fontSize: 22, fontWeight: 700 }}>{m.value}</div></div>
      ))}
    </div>

    {/* Filters + Add */}
    <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
      <input className="input" placeholder="Search by name, city, territory..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
      <select className="input" value={filterType} onChange={e => setFilterType(e.target.value)} style={{ width: 'auto' }}>
        <option value="all">All Types</option><option value="cnf">C&F Agent</option><option value="superstockist">Super Stockist</option><option value="distributor">Distributor</option><option value="retailer">Key Retailer</option>
      </select>
      <button className="btn" onClick={() => setShowAdd(!showAdd)}>+ Add Partner</button>
    </div>

    {/* Add form */}
    {showAdd && (<div className="card" style={{ marginBottom: 16, padding: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#ff4655', marginBottom: 12, letterSpacing: 1 }}>NEW CHANNEL PARTNER</div>
      <div style={{ display: 'grid', gap: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
          <input className="input" placeholder="Company / Firm name *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          <select className="input" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
            <option value="cnf">C&F Agent</option><option value="superstockist">Super Stockist</option><option value="distributor">Distributor</option><option value="retailer">Key Retailer</option>
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <input className="input" placeholder="Territory / Area" value={form.territory} onChange={e => setForm({...form, territory: e.target.value})} />
          <input className="input" placeholder="City" value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
          <input className="input" placeholder="State" value={form.state} onChange={e => setForm({...form, state: e.target.value})} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <input className="input" placeholder="Contact person name" value={form.contactPerson} onChange={e => setForm({...form, contactPerson: e.target.value})} />
          <input className="input" placeholder="Phone" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
          <input className="input" placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
          <input className="input" placeholder="GST No." value={form.gstNo} onChange={e => setForm({...form, gstNo: e.target.value})} />
          <input className="input" placeholder="PAN No." value={form.panNo} onChange={e => setForm({...form, panNo: e.target.value})} />
          <input className="input" placeholder="Credit limit (₹)" type="number" value={form.creditLimit} onChange={e => setForm({...form, creditLimit: e.target.value})} />
          <select className="input" value={form.creditDays} onChange={e => setForm({...form, creditDays: e.target.value})}>
            <option value="0">Cash & Carry</option><option value="7">7 Days</option><option value="15">15 Days</option><option value="21">21 Days</option><option value="30">30 Days</option><option value="45">45 Days</option><option value="60">60 Days</option>
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
          <input className="input" placeholder="Godown size (sq ft)" value={form.godownSize} onChange={e => setForm({...form, godownSize: e.target.value})} />
          <input className="input" placeholder="Vehicles" type="number" value={form.vehicleCount} onChange={e => setForm({...form, vehicleCount: e.target.value})} />
          <input className="input" placeholder="Retailer reach" type="number" value={form.retailerCount} onChange={e => setForm({...form, retailerCount: e.target.value})} />
          <select className="input" value={form.grade} onChange={e => setForm({...form, grade: e.target.value})}>
            <option value="A">Grade A (Premium)</option><option value="B">Grade B (Standard)</option><option value="C">Grade C (Development)</option>
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <input className="input" placeholder="Bank name" value={form.bankName} onChange={e => setForm({...form, bankName: e.target.value})} />
          <input className="input" placeholder="Account number" value={form.accountNo} onChange={e => setForm({...form, accountNo: e.target.value})} />
          <input className="input" placeholder="IFSC code" value={form.ifsc} onChange={e => setForm({...form, ifsc: e.target.value})} />
        </div>
        <textarea className="input" placeholder="Notes (existing brands, infrastructure, references...)" rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} style={{ width: '100%' }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={() => { if (!form.name) return; save([...partners, { ...form, id: Date.now(), createdAt: Date.now(), status: 'prospect', monthlyTarget: 0, monthlySales: 0, outstanding: 0, lastOrder: null }]); setForm({ name: '', type: 'distributor', territory: '', city: '', state: '', phone: '', email: '', contactPerson: '', gstNo: '', panNo: '', creditLimit: '', creditDays: '30', godownSize: '', vehicleCount: '', retailerCount: '', grade: 'B', status: 'prospect', bankName: '', accountNo: '', ifsc: '', notes: '' }); setShowAdd(false); }}>Save Partner</button>
          <button className="btn" onClick={() => setShowAdd(false)} style={{ background: 'transparent', border: '1px solid #2a3a4a' }}>Cancel</button>
        </div>
      </div>
    </div>)}

    {/* Partner list */}
    {filtered.length === 0 ? <div className="card" style={{ textAlign: 'center', color: '#8b9eb7', padding: 40 }}>No channel partners yet. Add your first distributor, super stockist, or C&F agent above.</div> :
    <div style={{ display: 'grid', gap: 10 }}>{filtered.map(p => (
      <div key={p.id} className="card" style={{ cursor: 'pointer', borderLeft: `3px solid ${p.type === 'cnf' ? '#a78bfa' : p.type === 'superstockist' ? '#06b6d4' : p.type === 'distributor' ? '#f5a623' : '#4ade80'}` }} onClick={() => setViewPartner(p)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong>{p.name}</strong>
            <span style={{ marginLeft: 8, fontSize: 11, padding: '2px 8px', borderRadius: 4, background: p.type === 'cnf' ? '#a78bfa22' : p.type === 'superstockist' ? '#06b6d422' : '#f5a62322', color: p.type === 'cnf' ? '#a78bfa' : p.type === 'superstockist' ? '#06b6d4' : '#f5a623' }}>{p.type === 'cnf' ? 'C&F' : p.type === 'superstockist' ? 'SS' : p.type === 'distributor' ? 'DIST' : 'RETAIL'}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: p.status === 'active' ? '#16a34a22' : p.status === 'onboarding' ? '#06b6d422' : '#ff465522', color: p.status === 'active' ? '#4ade80' : p.status === 'onboarding' ? '#06b6d4' : '#ff4655' }}>{p.status.toUpperCase()}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: p.grade === 'A' ? '#4ade80' : p.grade === 'B' ? '#f5a623' : '#ff4655' }}>Grade {p.grade}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12, color: '#8b9eb7' }}>
          <span>{p.territory || p.city}{p.state ? `, ${p.state}` : ''}</span>
          <span>{p.contactPerson}</span>
          {p.phone && <span>{p.phone}</span>}
          {p.retailerCount && <span>{p.retailerCount} retailers</span>}
        </div>
      </div>
    ))}</div>}

    {/* Partner Profile Modal */}
    {viewPartner && (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, overflow: 'auto' }} onClick={() => setViewPartner(null)}>
        <div onClick={e => e.stopPropagation()} style={{ background: '#1a2634', borderRadius: 12, width: '100%', maxWidth: 560, border: '1px solid #2a3a4a', overflow: 'hidden', maxHeight: '90vh', overflowY: 'auto' }}>
          <div style={{ background: '#0f1923', padding: '20px 24px', borderBottom: `2px solid ${viewPartner.type === 'cnf' ? '#a78bfa' : viewPartner.type === 'superstockist' ? '#06b6d4' : '#f5a623'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 11, color: '#ff4655', letterSpacing: 2, fontWeight: 600, marginBottom: 4 }}>CHANNEL PARTNER</div>
              <h3 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: '#ece8e1' }}>{viewPartner.name}</h3>
              <span style={{ fontSize: 12, color: '#8b9eb7' }}>{viewPartner.type === 'cnf' ? 'C&F Agent' : viewPartner.type === 'superstockist' ? 'Super Stockist' : viewPartner.type === 'distributor' ? 'Distributor' : 'Key Retailer'} · Grade {viewPartner.grade}</span>
            </div>
            <button onClick={() => setViewPartner(null)} style={{ background: 'none', border: 'none', color: '#8b9eb7', cursor: 'pointer', fontSize: 18 }}>✕</button>
          </div>
          <div style={{ padding: '20px 24px' }}>
            {/* Quick actions */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {viewPartner.phone && <a href={`tel:${viewPartner.phone}`} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', background: '#16a34a', color: '#fff', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 13 }}><Phone size={16} /> Call</a>}
              {viewPartner.phone && <a href={`https://wa.me/${viewPartner.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', background: '#25d36622', color: '#25d366', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 13, border: '1px solid #25d36644' }}><MessageSquare size={16} /> WhatsApp</a>}
              {viewPartner.email && <a href={`mailto:${viewPartner.email}`} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', background: '#1e293b', color: '#06b6d4', borderRadius: 8, textDecoration: 'none', fontSize: 13, border: '1px solid #2a3a4a' }}><Mail size={14} /> Email</a>}
            </div>
            {/* Status toggle */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
              {['prospect', 'onboarding', 'active', 'inactive'].map(s => (
                <button key={s} className="btn" style={{ fontSize: 11, padding: '4px 10px', background: viewPartner.status === s ? '#ff465533' : 'transparent', color: viewPartner.status === s ? '#ff4655' : '#8b9eb7', border: '1px solid #2a3a4a' }} onClick={() => { const updated = partners.map(p => p.id === viewPartner.id ? { ...p, status: s } : p); save(updated); setViewPartner({ ...viewPartner, status: s }); }}>{s.toUpperCase()}</button>
              ))}
            </div>
            {/* Details */}
            <div style={{ display: 'grid', gap: 10 }}>
              {[['Territory', viewPartner.territory], ['Location', `${viewPartner.city}${viewPartner.state ? ', ' + viewPartner.state : ''}`], ['Contact', viewPartner.contactPerson], ['GST', viewPartner.gstNo], ['PAN', viewPartner.panNo], ['Credit Limit', viewPartner.creditLimit ? `₹${Number(viewPartner.creditLimit).toLocaleString()}` : '—'], ['Credit Days', `${viewPartner.creditDays} days`], ['Godown', viewPartner.godownSize ? `${viewPartner.godownSize} sq ft` : '—'], ['Vehicles', viewPartner.vehicleCount || '—'], ['Retailer Reach', viewPartner.retailerCount || '—'], ['Bank', viewPartner.bankName], ['Account', viewPartner.accountNo], ['IFSC', viewPartner.ifsc]].filter(([, v]) => v && v !== '—' && v !== ', ').map(([label, value], i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', padding: '6px 0' }}>
                  <span style={{ fontSize: 12, color: '#8b9eb7' }}>{label}</span>
                  <span style={{ fontSize: 13, color: '#ece8e1' }}>{value}</span>
                </div>
              ))}
            </div>
            {viewPartner.notes && <div style={{ marginTop: 12, padding: 10, background: '#0f1923', borderRadius: 6, fontSize: 12, color: '#8b9eb7' }}>{viewPartner.notes}</div>}
          </div>
        </div>
      </div>
    )}
  </>);
}

function HarborOnboarding() {
  const [partners] = useState(() => JSON.parse(localStorage.getItem('protocol_harbor_partners') || '[]'));
  const [checklists, setChecklists] = useState(() => JSON.parse(localStorage.getItem('protocol_harbor_onboarding') || '{}'));
  const prospects = partners.filter(p => p.status === 'prospect' || p.status === 'onboarding');
  const steps = [
    { id: 'kyc', label: 'KYC Documents (GST, PAN, Address Proof, ID)', icon: '📋' },
    { id: 'agreement', label: 'Distribution Agreement Signed', icon: '📝' },
    { id: 'bank', label: 'Bank Details Verified', icon: '🏦' },
    { id: 'godown', label: 'Godown/Warehouse Inspection', icon: '🏭' },
    { id: 'vehicle', label: 'Vehicle & Logistics Verified', icon: '🚛' },
    { id: 'credit', label: 'Credit Limit Approved', icon: '💳' },
    { id: 'erp', label: 'Added to ERP/Billing System', icon: '💻' },
    { id: 'training', label: 'Product Training Completed', icon: '📚' },
    { id: 'scheme', label: 'Trade Scheme Communication', icon: '📊' },
    { id: 'launch', label: 'Launch Stock Dispatched', icon: '📦' },
  ];
  const toggleStep = (partnerId, stepId) => {
    const key = String(partnerId);
    const current = checklists[key] || {};
    const updated = { ...checklists, [key]: { ...current, [stepId]: !current[stepId] } };
    setChecklists(updated); localStorage.setItem('protocol_harbor_onboarding', JSON.stringify(updated));
  };
  return (<><div className="tool-header"><CheckCircle2 size={20} style={{ color: '#ff4655' }} /><h2>Partner Onboarding</h2></div>
    <p style={{ color: '#8b9eb7', marginBottom: 16 }}>Step-by-step onboarding checklist for new channel partners.</p>
    {prospects.length === 0 ? <div className="card" style={{ textAlign: 'center', color: '#8b9eb7', padding: 30 }}>No prospects or onboarding partners. Add partners in Distribution Network first.</div> :
    <div style={{ display: 'grid', gap: 16 }}>{prospects.map(p => {
      const checks = checklists[String(p.id)] || {};
      const completed = steps.filter(s => checks[s.id]).length;
      const pct = Math.round((completed / steps.length) * 100);
      return (
        <div key={p.id} className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div><strong>{p.name}</strong><span style={{ marginLeft: 8, fontSize: 12, color: '#8b9eb7' }}>{p.type === 'cnf' ? 'C&F' : p.type === 'superstockist' ? 'SS' : 'Distributor'} · {p.city}</span></div>
            <span style={{ fontSize: 13, fontWeight: 700, color: pct === 100 ? '#4ade80' : pct > 50 ? '#f5a623' : '#ff4655' }}>{pct}%</span>
          </div>
          <div style={{ background: '#0f1923', borderRadius: 4, height: 6, marginBottom: 12 }}><div style={{ background: pct === 100 ? '#4ade80' : '#ff4655', height: '100%', borderRadius: 4, width: `${pct}%`, transition: 'width 0.3s' }} /></div>
          <div style={{ display: 'grid', gap: 4 }}>{steps.map(s => (
            <div key={s.id} onClick={() => toggleStep(p.id, s.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', borderRadius: 4, cursor: 'pointer', background: checks[s.id] ? '#16a34a11' : 'transparent' }}>
              <div style={{ width: 20, height: 20, borderRadius: 4, border: checks[s.id] ? '2px solid #4ade80' : '2px solid #2a3a4a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#4ade80' }}>{checks[s.id] ? '✓' : ''}</div>
              <span style={{ fontSize: 13, color: checks[s.id] ? '#4ade80' : '#ece8e1', textDecoration: checks[s.id] ? 'line-through' : 'none', opacity: checks[s.id] ? 0.7 : 1 }}>{s.icon} {s.label}</span>
            </div>
          ))}</div>
        </div>
      );
    })}</div>}
  </>);
}

function HarborTradeSchemes() {
  const [schemes, setSchemes] = useState(() => JSON.parse(localStorage.getItem('protocol_harbor_schemes') || '[]'));
  const [aiResult, setAiResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'quantity', target: '', reward: '', validFrom: '', validTo: '', applicableTo: 'all' });
  const save = (s) => { setSchemes(s); localStorage.setItem('protocol_harbor_schemes', JSON.stringify(s)); };
  const generateScheme = async () => {
    setLoading(true);
    try { const r = await callClaude(`As an FMCG trade marketing expert for Kiro Foods India (clean-label RTE/RTC brand), create trade schemes:\n\nContext: Pre-launch/early-launch phase. Distribution via C&F → Super Stockist → Distributor → Retailer. Products: Ready-to-eat meals, price range ₹79-249 per unit.\n\nGenerate 8-10 trade schemes covering:\n1. Launch loading schemes (initial stock push)\n2. Quantity discount slabs for distributors\n3. Display/visibility incentives for retailers\n4. Seasonal push schemes (Diwali, summer)\n5. Counter display/POSM placement rewards\n6. Bill-cutting incentives (monthly billing targets)\n7. Window display schemes for modern trade\n8. Super stockist bulk purchase incentives\n9. Rate difference / margin structure for each channel level\n\nFor each scheme provide: name, type, mechanism, targets, rewards, validity, applicable channel, estimated ROI, and terms & conditions. Use Indian FMCG industry standard practices.`, SYSTEM_PROMPTS.strategy); setAiResult(r.content); }
    catch (e) { setAiResult('Error: ' + e.message); } setLoading(false);
  };
  return (<><div className="tool-header"><Receipt size={20} style={{ color: '#ff4655' }} /><h2>Trade Schemes</h2></div>
    <p style={{ color: '#8b9eb7', marginBottom: 12 }}>Create and manage trade schemes for distributors, stockists, and retailers.</p>

    <div className="card" style={{ marginBottom: 16, display: 'grid', gap: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8 }}>
        <input className="input" placeholder="Scheme name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
        <select className="input" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
          <option value="quantity">Quantity Slab</option><option value="display">Display Incentive</option><option value="billing">Billing Target</option><option value="launch">Launch Loading</option><option value="seasonal">Seasonal Push</option><option value="loyalty">Loyalty Bonus</option>
        </select>
        <select className="input" value={form.applicableTo} onChange={e => setForm({...form, applicableTo: e.target.value})}>
          <option value="all">All Partners</option><option value="cnf">C&F Only</option><option value="superstockist">SS Only</option><option value="distributor">Distributors</option><option value="retailer">Retailers</option>
        </select>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
        <input className="input" placeholder="Target (e.g. 100 cases)" value={form.target} onChange={e => setForm({...form, target: e.target.value})} />
        <input className="input" placeholder="Reward (e.g. ₹50/case)" value={form.reward} onChange={e => setForm({...form, reward: e.target.value})} />
        <input className="input" type="date" value={form.validFrom} onChange={e => setForm({...form, validFrom: e.target.value})} />
        <input className="input" type="date" value={form.validTo} onChange={e => setForm({...form, validTo: e.target.value})} />
      </div>
      <button className="btn" onClick={() => { if (!form.name) return; save([...schemes, { ...form, id: Date.now(), status: 'active' }]); setForm({ name: '', type: 'quantity', target: '', reward: '', validFrom: '', validTo: '', applicableTo: 'all' }); }}>Add Scheme</button>
    </div>

    <button className="btn" onClick={generateScheme} disabled={loading} style={{ marginBottom: 16, background: '#0f1923', border: '1px solid #ff4655', color: '#ff4655' }}>{loading ? 'Generating...' : '🤖 AI: Generate Complete Trade Scheme Package'}</button>

    {schemes.length > 0 && <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>{schemes.map(s => (
      <div key={s.id} className="card"><div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>{s.name}</strong><span style={{ fontSize: 11, color: '#8b9eb7' }}>{s.type.toUpperCase()} · {s.applicableTo}</span></div><div style={{ fontSize: 12, color: '#8b9eb7', marginTop: 4 }}>Target: {s.target} → Reward: {s.reward} | {s.validFrom} to {s.validTo}</div></div>
    ))}</div>}

    {aiResult && <div className="card" style={{ whiteSpace: 'pre-wrap' }}>{aiResult}</div>}
  </>);
}

function HarborOrderTracker() {
  const [orders, setOrders] = useState(() => JSON.parse(localStorage.getItem('protocol_harbor_orders') || '[]'));
  const partners = JSON.parse(localStorage.getItem('protocol_harbor_partners') || '[]');
  const [form, setForm] = useState({ partnerId: '', type: 'primary', items: '', amount: '', status: 'pending' });
  const save = (o) => { setOrders(o); localStorage.setItem('protocol_harbor_orders', JSON.stringify(o)); };

  const totalPrimary = orders.filter(o => o.type === 'primary').reduce((s, o) => s + (Number(o.amount) || 0), 0);
  const totalPending = orders.filter(o => o.status === 'pending' || o.status === 'dispatched').reduce((s, o) => s + (Number(o.amount) || 0), 0);

  return (<><div className="tool-header"><Package size={20} style={{ color: '#ff4655' }} /><h2>Order Tracker</h2></div>
    <p style={{ color: '#8b9eb7', marginBottom: 16 }}>Track primary and secondary sales, dispatch status, and outstanding payments.</p>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
      {[{ label: 'Total Orders', value: orders.length, color: '#ece8e1' }, { label: 'Primary Sales', value: `₹${(totalPrimary / 100000).toFixed(1)}L`, color: '#4ade80' }, { label: 'Outstanding', value: `₹${(totalPending / 100000).toFixed(1)}L`, color: '#f5a623' }, { label: 'This Month', value: orders.filter(o => new Date(o.date).getMonth() === new Date().getMonth()).length, color: '#06b6d4' }].map((m, i) => (
        <div key={i} className="card" style={{ textAlign: 'center' }}><div style={{ fontSize: 10, color: m.color, fontWeight: 600 }}>{m.label.toUpperCase()}</div><div style={{ fontSize: 22, fontWeight: 700 }}>{m.value}</div></div>
      ))}
    </div>

    <div className="card" style={{ marginBottom: 16, display: 'grid', gap: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8 }}>
        <select className="input" value={form.partnerId} onChange={e => setForm({...form, partnerId: e.target.value})}>
          <option value="">Select partner</option>
          {partners.map(p => <option key={p.id} value={p.id}>{p.name} ({p.type === 'cnf' ? 'C&F' : p.type === 'superstockist' ? 'SS' : 'Dist'})</option>)}
        </select>
        <select className="input" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
          <option value="primary">Primary (Company→C&F/SS)</option><option value="secondary">Secondary (Dist→Retailer)</option>
        </select>
        <input className="input" placeholder="Order amount (₹)" type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
        <input className="input" placeholder="Items (e.g. 50 cases Dal Makhani + 30 cases Paneer)" value={form.items} onChange={e => setForm({...form, items: e.target.value})} />
        <select className="input" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
          <option value="pending">Pending</option><option value="dispatched">Dispatched</option><option value="delivered">Delivered</option><option value="paid">Paid</option>
        </select>
      </div>
      <button className="btn" onClick={() => { if (!form.partnerId || !form.amount) return; const partner = partners.find(p => String(p.id) === form.partnerId); save([...orders, { ...form, id: Date.now(), date: new Date().toISOString(), partnerName: partner?.name || 'Unknown' }]); setForm({ partnerId: '', type: 'primary', items: '', amount: '', status: 'pending' }); }}>Log Order</button>
    </div>

    {orders.length === 0 ? <div className="card" style={{ textAlign: 'center', color: '#8b9eb7', padding: 30 }}>No orders logged yet.</div> :
    <div style={{ display: 'grid', gap: 8 }}>{orders.sort((a, b) => b.date?.localeCompare(a.date)).map(o => (
      <div key={o.id} className="card" style={{ borderLeft: `3px solid ${o.status === 'paid' ? '#4ade80' : o.status === 'delivered' ? '#06b6d4' : o.status === 'dispatched' ? '#f5a623' : '#ff4655'}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>{o.partnerName}</strong><span style={{ fontWeight: 600, color: '#ece8e1' }}>₹{Number(o.amount).toLocaleString()}</span></div>
        <div style={{ fontSize: 12, color: '#8b9eb7', marginTop: 4 }}>{o.type.toUpperCase()} · {o.items} · <span style={{ color: o.status === 'paid' ? '#4ade80' : '#f5a623' }}>{o.status.toUpperCase()}</span> · {new Date(o.date).toLocaleDateString()}</div>
      </div>
    ))}</div>}
  </>);
}

function HarborTerritory() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const partners = JSON.parse(localStorage.getItem('protocol_harbor_partners') || '[]');
  const run = async () => {
    setLoading(true);
    const partnerSummary = partners.length > 0 ? `\nExisting partners:\n${partners.map(p => `- ${p.name} (${p.type}) — ${p.territory || p.city}, ${p.state} — Grade ${p.grade} — ${p.retailerCount || '?'} retailers`).join('\n')}` : '';
    try { const r = await callClaude(`As an FMCG distribution strategy expert for Kiro Foods India, create a territory and coverage plan:\n\n${input || 'Create a distribution territory plan for clean-label RTE brand launching in urban India'}${partnerSummary}\n\nProvide:\n1. Territory mapping: state → zone → city → area divisions\n2. Channel hierarchy: Company → C&F → Super Stockist → Distributor → Retailer coverage norms\n3. Numeric distribution targets: how many outlets per territory per phase\n4. Weighted distribution: focus SKUs per region based on food preferences\n5. Beat planning norms: retailers per beat, visit frequency, order booking cycle\n6. Coverage expansion roadmap: Phase 1 (metros) → Phase 2 (Tier 1) → Phase 3 (Tier 2)\n7. ROI per territory: investment vs expected monthly billing\n8. Margin structure: Company → C&F (3-5%) → SS (2-3%) → Distributor (8-12%) → Retailer (15-20%)\n\nUse real Indian market data and geography.`, SYSTEM_PROMPTS.strategy); setResult(r.content); }
    catch (e) { setResult('Error: ' + e.message); } setLoading(false);
  };
  return (<><div className="tool-header"><MapPinned size={20} style={{ color: '#ff4655' }} /><h2>Territory Planner</h2></div>
    <p style={{ color: '#8b9eb7', marginBottom: 12 }}>Plan territory coverage, distribution hierarchy, and expansion roadmap.</p>
    <div className="card" style={{ marginBottom: 12, padding: 12, fontSize: 12, color: '#8b9eb7' }}>Currently tracking {partners.length} channel partners across {new Set(partners.map(p => p.state).filter(Boolean)).size} states and {new Set(partners.map(p => p.city).filter(Boolean)).size} cities.</div>
    <textarea className="input" rows={4} placeholder="Describe your distribution goals, target markets, budget, or specific territory questions..." value={input} onChange={e => setInput(e.target.value)} style={{ width: '100%', marginBottom: 12 }} />
    <button className="btn" onClick={run} disabled={loading}>{loading ? 'Planning...' : 'Generate Territory Plan'}</button>
    {result && <div className="card" style={{ marginTop: 16, whiteSpace: 'pre-wrap' }}>{result}</div>}
  </>);
}

function HarborScorecard() {
  const partners = JSON.parse(localStorage.getItem('protocol_harbor_partners') || '[]');
  const orders = JSON.parse(localStorage.getItem('protocol_harbor_orders') || '[]');
  const active = partners.filter(p => p.status === 'active');
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const partnerPerformance = active.map(p => {
    const partnerOrders = orders.filter(o => String(o.partnerId) === String(p.id));
    const totalBilling = partnerOrders.reduce((s, o) => s + (Number(o.amount) || 0), 0);
    const paidOrders = partnerOrders.filter(o => o.status === 'paid');
    const collectionRate = partnerOrders.length > 0 ? Math.round((paidOrders.length / partnerOrders.length) * 100) : 0;
    return { ...p, totalBilling, orderCount: partnerOrders.length, collectionRate };
  }).sort((a, b) => b.totalBilling - a.totalBilling);

  const analyzePerformance = async () => {
    setLoading(true);
    const data = partnerPerformance.map(p => `${p.name} (${p.type}): ₹${p.totalBilling.toLocaleString()} billing, ${p.orderCount} orders, ${p.collectionRate}% collection, Grade ${p.grade}, ${p.retailerCount || '?'} retailers, ${p.territory || p.city}`).join('\n');
    try { const r = await callClaude(`As an FMCG distribution analyst for Kiro Foods India, analyse this distributor performance data and provide actionable recommendations:\n\n${data || 'No partner data yet — provide a template scorecard for a new FMCG distribution network'}\n\n${input ? `Additional context: ${input}` : ''}\n\nProvide: performance ranking, grade recommendations (upgrade/downgrade), territory optimization suggestions, collection improvement strategies, underperforming partner action plan, and ROI analysis per partner.`, SYSTEM_PROMPTS.strategy); setResult(r.content); }
    catch (e) { setResult('Error: ' + e.message); } setLoading(false);
  };

  return (<><div className="tool-header"><Award size={20} style={{ color: '#ff4655' }} /><h2>Performance Scorecard</h2></div>
    <p style={{ color: '#8b9eb7', marginBottom: 16 }}>Grade and analyse distributor performance with AI-powered insights.</p>

    {partnerPerformance.length === 0 ? <div className="card" style={{ textAlign: 'center', color: '#8b9eb7', padding: 30 }}>No active partners with order data yet.</div> :
    <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>{partnerPerformance.map((p, i) => (
      <div key={p.id} className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><span style={{ color: '#8b9eb7', fontSize: 12, marginRight: 8 }}>#{i + 1}</span><strong>{p.name}</strong><span style={{ marginLeft: 8, fontSize: 11, color: '#8b9eb7' }}>{p.type === 'cnf' ? 'C&F' : p.type === 'superstockist' ? 'SS' : 'Dist'}</span></div>
          <span style={{ fontWeight: 700, color: p.grade === 'A' ? '#4ade80' : p.grade === 'B' ? '#f5a623' : '#ff4655' }}>Grade {p.grade}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 8 }}>
          <div><div style={{ fontSize: 10, color: '#8b9eb7' }}>BILLING</div><div style={{ fontWeight: 600 }}>₹{(p.totalBilling / 1000).toFixed(0)}K</div></div>
          <div><div style={{ fontSize: 10, color: '#8b9eb7' }}>ORDERS</div><div style={{ fontWeight: 600 }}>{p.orderCount}</div></div>
          <div><div style={{ fontSize: 10, color: '#8b9eb7' }}>COLLECTION</div><div style={{ fontWeight: 600, color: p.collectionRate >= 80 ? '#4ade80' : '#f5a623' }}>{p.collectionRate}%</div></div>
          <div><div style={{ fontSize: 10, color: '#8b9eb7' }}>RETAILERS</div><div style={{ fontWeight: 600 }}>{p.retailerCount || '—'}</div></div>
        </div>
      </div>
    ))}</div>}

    <textarea className="input" rows={3} placeholder="Additional context for AI analysis (e.g. specific concerns, target adjustments)..." value={input} onChange={e => setInput(e.target.value)} style={{ width: '100%', marginBottom: 12 }} />
    <button className="btn" onClick={analyzePerformance} disabled={loading}>{loading ? 'Analyzing...' : '🤖 AI: Analyze Performance & Recommend'}</button>
    {result && <div className="card" style={{ marginTop: 16, whiteSpace: 'pre-wrap' }}>{result}</div>}
  </>);
}

function HarborAgreementGen() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const run = async () => {
    setLoading(true);
    try { const r = await callClaude(`As a legal and trade agreements expert for FMCG distribution in India, generate a distribution agreement:\n\n${input || 'Generate a standard distribution agreement template for Kiro Foods India appointing a distributor'}\n\nProvide a complete agreement including:\n1. Parties (Company and Distributor details placeholders)\n2. Territory definition and exclusivity terms\n3. Products covered and minimum order quantity\n4. Pricing, margins, and payment terms\n5. Credit limit and security deposit\n6. Performance targets (monthly/quarterly billing, outlet coverage)\n7. Responsibilities of both parties\n8. Stock management and return policy\n9. Scheme and promotional support\n10. Termination clause (performance-based, 30/60/90 day notice)\n11. Confidentiality and non-compete\n12. Dispute resolution (arbitration in India)\n13. Force majeure\n14. Signatures block\n\nUse Indian legal standards and FMCG industry norms. Include specific clauses for food products (FSSAI compliance, expiry management, cold chain if applicable).`, SYSTEM_PROMPTS.strategy); setResult(r.content); }
    catch (e) { setResult('Error: ' + e.message); } setLoading(false);
  };
  return (<><div className="tool-header"><FileText size={20} style={{ color: '#ff4655' }} /><h2>Agreement Generator</h2></div>
    <p style={{ color: '#8b9eb7', marginBottom: 12 }}>Generate distribution agreements, appointment letters, and trade contracts.</p>
    <textarea className="input" rows={4} placeholder="Describe the agreement type, partner details, territory, terms, or special conditions..." value={input} onChange={e => setInput(e.target.value)} style={{ width: '100%', marginBottom: 12 }} />
    <button className="btn" onClick={run} disabled={loading}>{loading ? 'Generating...' : 'Generate Agreement'}</button>
    {result && <div className="card" style={{ marginTop: 16, whiteSpace: 'pre-wrap' }}>{result}</div>}
  </>);
}

function HarborClaimsTracker() {
  const [claims, setClaims] = useState(() => JSON.parse(localStorage.getItem('protocol_harbor_claims') || '[]'));
  const partners = JSON.parse(localStorage.getItem('protocol_harbor_partners') || '[]');
  const [form, setForm] = useState({ partnerId: '', type: 'scheme', description: '', amount: '', status: 'pending' });
  const save = (c) => { setClaims(c); localStorage.setItem('protocol_harbor_claims', JSON.stringify(c)); };
  const totalPending = claims.filter(c => c.status === 'pending').reduce((s, c) => s + (Number(c.amount) || 0), 0);
  return (<><div className="tool-header"><CircleDollarSign size={20} style={{ color: '#ff4655' }} /><h2>Claims & Settlements</h2></div>
    <p style={{ color: '#8b9eb7', marginBottom: 16 }}>Track scheme claims, damage claims, returns, and credit notes.</p>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
      {[{ label: 'Total Claims', value: claims.length, color: '#ece8e1' }, { label: 'Pending Amount', value: `₹${(totalPending / 1000).toFixed(0)}K`, color: '#f5a623' }, { label: 'Settled', value: claims.filter(c => c.status === 'settled').length, color: '#4ade80' }].map((m, i) => (
        <div key={i} className="card" style={{ textAlign: 'center' }}><div style={{ fontSize: 10, color: m.color, fontWeight: 600 }}>{m.label.toUpperCase()}</div><div style={{ fontSize: 22, fontWeight: 700 }}>{m.value}</div></div>
      ))}
    </div>
    <div className="card" style={{ marginBottom: 16, display: 'grid', gap: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8 }}>
        <select className="input" value={form.partnerId} onChange={e => setForm({...form, partnerId: e.target.value})}>
          <option value="">Select partner</option>
          {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="input" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
          <option value="scheme">Scheme Claim</option><option value="damage">Damage/Breakage</option><option value="expiry">Expiry Return</option><option value="rate-diff">Rate Difference</option><option value="credit-note">Credit Note</option>
        </select>
        <input className="input" placeholder="Amount (₹)" type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
      </div>
      <input className="input" placeholder="Description (e.g. Q1 billing target scheme claim for 150 cases)" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
      <button className="btn" onClick={() => { if (!form.partnerId || !form.amount) return; const partner = partners.find(p => String(p.id) === form.partnerId); save([...claims, { ...form, id: Date.now(), date: new Date().toISOString(), partnerName: partner?.name || 'Unknown' }]); setForm({ partnerId: '', type: 'scheme', description: '', amount: '', status: 'pending' }); }}>Log Claim</button>
    </div>
    {claims.map(c => (
      <div key={c.id} className="card" style={{ marginBottom: 8, borderLeft: `3px solid ${c.status === 'settled' ? '#4ade80' : c.status === 'approved' ? '#06b6d4' : '#f5a623'}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>{c.partnerName}</strong><span style={{ fontWeight: 600 }}>₹{Number(c.amount).toLocaleString()}</span></div>
        <div style={{ fontSize: 12, color: '#8b9eb7', marginTop: 4 }}>{c.type.toUpperCase()} · {c.description} · <span style={{ color: c.status === 'settled' ? '#4ade80' : '#f5a623' }}>{c.status.toUpperCase()}</span></div>
      </div>
    ))}
  </>);
}

// =============================================
// DEADLOCK — Production & Raw Material Management
// =============================================

function DeadlockProductionPlanner() {
  const [plans, setPlans] = useState(() => JSON.parse(localStorage.getItem('protocol_deadlock_plans') || '[]'));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ product: '', batchSize: '', unit: 'kg', startDate: '', endDate: '', priority: 'Normal', status: 'Planned', line: '', shift: '', notes: '' });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const save = (d) => { setPlans(d); localStorage.setItem('protocol_deadlock_plans', JSON.stringify(d)); };
  const addPlan = () => { if (!form.product || !form.batchSize) return; save([...plans, { ...form, id: Date.now(), createdAt: new Date().toISOString() }]); setForm({ product: '', batchSize: '', unit: 'kg', startDate: '', endDate: '', priority: 'Normal', status: 'Planned', line: '', shift: '', notes: '' }); setShowForm(false); };
  const updateStatus = (id, status) => save(plans.map(p => p.id === id ? { ...p, status } : p));
  const deletePlan = (id) => save(plans.filter(p => p.id !== id));
  const generatePlan = async () => {
    setAiLoading(true);
    try {
      const inventory = JSON.parse(localStorage.getItem('protocol_deadlock_inventory') || '[]');
      const res = await callClaude(`You are a production planning expert for an FMCG food brand. Current raw material inventory: ${JSON.stringify(inventory.slice(0, 20))}. Current production plans: ${JSON.stringify(plans.slice(0, 10))}. Generate an optimized weekly production schedule considering: batch sequencing, line utilization, raw material availability, shelf life priorities, shift planning, cleaning/changeover time. Format as actionable production calendar.`, SYSTEM_PROMPTS.strategy);
      setAiResult(res);
    } catch(e) { setAiResult('Error: ' + e.message); }
    setAiLoading(false);
  };
  const stats = { total: plans.length, planned: plans.filter(p => p.status === 'Planned').length, inProgress: plans.filter(p => p.status === 'In Progress').length, completed: plans.filter(p => p.status === 'Completed').length };
  return (
    <div className="tool-page"><h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Factory size={22} /> Production Planner</h2>
      <div className="stats-row">{[['Total Plans', stats.total, '#a855f7'], ['Planned', stats.planned, '#3b82f6'], ['In Progress', stats.inProgress, '#f59e0b'], ['Completed', stats.completed, '#10b981']].map(([l,v,c]) => <div key={l} className="stat-card"><div style={{fontSize:12,opacity:0.6}}>{l}</div><div style={{fontSize:24,fontWeight:700,color:c}}>{v}</div></div>)}</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>+ New Production Run</button>
        <button className="btn-secondary" onClick={generatePlan} disabled={aiLoading}>{aiLoading ? 'Generating...' : '✦ AI Schedule'}</button>
      </div>
      {showForm && <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <input className="input" placeholder="Product name *" value={form.product} onChange={e => setForm({...form, product: e.target.value})} />
          <input className="input" placeholder="Batch size *" type="number" value={form.batchSize} onChange={e => setForm({...form, batchSize: e.target.value})} />
          <select className="input" value={form.unit} onChange={e => setForm({...form, unit: e.target.value})}><option>kg</option><option>litres</option><option>units</option><option>packs</option></select>
          <input className="input" type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} />
          <input className="input" type="date" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} />
          <select className="input" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}><option>Low</option><option>Normal</option><option>High</option><option>Urgent</option></select>
          <input className="input" placeholder="Production line" value={form.line} onChange={e => setForm({...form, line: e.target.value})} />
          <input className="input" placeholder="Shift (Morning/Evening/Night)" value={form.shift} onChange={e => setForm({...form, shift: e.target.value})} />
          <input className="input" placeholder="Notes" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
        </div>
        <button className="btn-primary" style={{ marginTop: 10 }} onClick={addPlan}>Save Plan</button>
      </div>}
      {aiResult && <div className="card" style={{ padding: 16, marginBottom: 16, maxHeight: 400, overflow: 'auto' }}><ReactMarkdown>{aiResult}</ReactMarkdown></div>}
      <div className="table-wrapper"><table className="data-table"><thead><tr><th>Product</th><th>Batch</th><th>Dates</th><th>Line</th><th>Priority</th><th>Status</th><th>Actions</th></tr></thead><tbody>
        {plans.map(p => <tr key={p.id}><td style={{fontWeight:600}}>{p.product}</td><td>{p.batchSize} {p.unit}</td><td>{p.startDate} → {p.endDate}</td><td>{p.line || '—'}</td>
          <td><span style={{padding:'2px 8px',borderRadius:4,fontSize:11,background: p.priority==='Urgent'?'#ef4444':p.priority==='High'?'#f59e0b':'#333',color:'#fff'}}>{p.priority}</span></td>
          <td><select className="input" style={{fontSize:11,padding:'2px 6px'}} value={p.status} onChange={e => updateStatus(p.id, e.target.value)}><option>Planned</option><option>In Progress</option><option>Completed</option><option>On Hold</option><option>Cancelled</option></select></td>
          <td><button onClick={() => deletePlan(p.id)} style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer'}}><Trash2 size={14}/></button></td></tr>)}
      </tbody></table></div>
    </div>
  );
}

function DeadlockInventory() {
  const [items, setItems] = useState(() => JSON.parse(localStorage.getItem('protocol_deadlock_inventory') || '[]'));
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const [form, setForm] = useState({ name: '', category: 'Grain', quantity: '', unit: 'kg', reorderLevel: '', costPerUnit: '', supplier: '', location: '', expiryDate: '', batchNo: '', fssaiCompliant: true, notes: '' });
  const save = (d) => { setItems(d); localStorage.setItem('protocol_deadlock_inventory', JSON.stringify(d)); };
  const addItem = () => { if (!form.name || !form.quantity) return; save([...items, { ...form, id: Date.now(), quantity: Number(form.quantity), reorderLevel: Number(form.reorderLevel) || 0, costPerUnit: Number(form.costPerUnit) || 0, lastUpdated: new Date().toISOString() }]); setForm({ name: '', category: 'Grain', quantity: '', unit: 'kg', reorderLevel: '', costPerUnit: '', supplier: '', location: '', expiryDate: '', batchNo: '', fssaiCompliant: true, notes: '' }); setShowForm(false); };
  const deleteItem = (id) => save(items.filter(i => i.id !== id));
  const categories = ['All', ...new Set(items.map(i => i.category))];
  const filtered = items.filter(i => (filterCat === 'All' || i.category === filterCat) && (!search || i.name.toLowerCase().includes(search.toLowerCase())));
  const lowStock = items.filter(i => i.quantity <= i.reorderLevel);
  const totalValue = items.reduce((s, i) => s + (i.quantity * i.costPerUnit), 0);
  return (
    <div className="tool-page"><h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Boxes size={22} /> Raw Material Inventory</h2>
      <div className="stats-row">{[['Total Items', items.length, '#a855f7'], ['Low Stock', lowStock.length, '#ef4444'], ['Inventory Value', '₹' + totalValue.toLocaleString(), '#10b981'], ['Categories', new Set(items.map(i=>i.category)).size, '#3b82f6']].map(([l,v,c]) => <div key={l} className="stat-card"><div style={{fontSize:12,opacity:0.6}}>{l}</div><div style={{fontSize:24,fontWeight:700,color:c}}>{v}</div></div>)}</div>
      {lowStock.length > 0 && <div className="card" style={{ padding: 12, marginBottom: 16, borderLeft: '3px solid #ef4444' }}>
        <div style={{ fontWeight: 600, color: '#ef4444', marginBottom: 4 }}>⚠ Low Stock Alert</div>
        {lowStock.map(i => <div key={i.id} style={{ fontSize: 12, opacity: 0.8 }}>{i.name}: {i.quantity} {i.unit} (reorder at {i.reorderLevel})</div>)}
      </div>}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input className="input" placeholder="Search materials..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1 }} />
        <select className="input" value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ width: 140 }}>{categories.map(c => <option key={c}>{c}</option>)}</select>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>+ Add Material</button>
      </div>
      {showForm && <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <input className="input" placeholder="Material name *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          <select className="input" value={form.category} onChange={e => setForm({...form, category: e.target.value})}><option>Grain</option><option>Spice</option><option>Oil</option><option>Vegetable</option><option>Dairy</option><option>Packaging</option><option>Additive</option><option>Other</option></select>
          <input className="input" placeholder="Quantity *" type="number" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} />
          <select className="input" value={form.unit} onChange={e => setForm({...form, unit: e.target.value})}><option>kg</option><option>litres</option><option>units</option><option>packs</option><option>tonnes</option></select>
          <input className="input" placeholder="Reorder level" type="number" value={form.reorderLevel} onChange={e => setForm({...form, reorderLevel: e.target.value})} />
          <input className="input" placeholder="Cost/unit (₹)" type="number" value={form.costPerUnit} onChange={e => setForm({...form, costPerUnit: e.target.value})} />
          <input className="input" placeholder="Supplier" value={form.supplier} onChange={e => setForm({...form, supplier: e.target.value})} />
          <input className="input" placeholder="Storage location" value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
          <input className="input" type="date" placeholder="Expiry date" value={form.expiryDate} onChange={e => setForm({...form, expiryDate: e.target.value})} />
          <input className="input" placeholder="Batch no." value={form.batchNo} onChange={e => setForm({...form, batchNo: e.target.value})} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}><input type="checkbox" checked={form.fssaiCompliant} onChange={e => setForm({...form, fssaiCompliant: e.target.checked})} /> FSSAI Compliant</label>
        </div>
        <button className="btn-primary" style={{ marginTop: 10 }} onClick={addItem}>Save Material</button>
      </div>}
      <div className="table-wrapper"><table className="data-table"><thead><tr><th>Material</th><th>Category</th><th>Stock</th><th>Reorder</th><th>Cost/Unit</th><th>Supplier</th><th>Expiry</th><th>FSSAI</th><th>Actions</th></tr></thead><tbody>
        {filtered.map(i => <tr key={i.id} style={{ background: i.quantity <= i.reorderLevel ? 'rgba(239,68,68,0.1)' : 'transparent' }}>
          <td style={{fontWeight:600}}>{i.name}</td><td>{i.category}</td><td>{i.quantity} {i.unit}</td><td>{i.reorderLevel} {i.unit}</td>
          <td>₹{i.costPerUnit}</td><td>{i.supplier || '—'}</td><td>{i.expiryDate || '—'}</td>
          <td>{i.fssaiCompliant ? <CheckCircle2 size={14} color="#10b981"/> : <XCircle size={14} color="#ef4444"/>}</td>
          <td><button onClick={() => deleteItem(i.id)} style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer'}}><Trash2 size={14}/></button></td></tr>)}
      </tbody></table></div>
    </div>
  );
}

function DeadlockVendorManager() {
  const [vendors, setVendors] = useState(() => JSON.parse(localStorage.getItem('protocol_deadlock_vendors') || '[]'));
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [viewVendor, setViewVendor] = useState(null);
  const [form, setForm] = useState({ name: '', type: 'Raw Material', contactPerson: '', phone: '', email: '', gst: '', pan: '', address: '', city: '', state: '', materials: '', paymentTerms: '30 days', rating: 'A', bankName: '', accountNo: '', ifsc: '', notes: '' });
  const save = (d) => { setVendors(d); localStorage.setItem('protocol_deadlock_vendors', JSON.stringify(d)); };
  const addVendor = () => { if (!form.name || !form.phone) return; save([...vendors, { ...form, id: Date.now(), status: 'Active', createdAt: new Date().toISOString() }]); setForm({ name: '', type: 'Raw Material', contactPerson: '', phone: '', email: '', gst: '', pan: '', address: '', city: '', state: '', materials: '', paymentTerms: '30 days', rating: 'A', bankName: '', accountNo: '', ifsc: '', notes: '' }); setShowForm(false); };
  const toggleStatus = (id) => save(vendors.map(v => v.id === id ? { ...v, status: v.status === 'Active' ? 'Inactive' : 'Active' } : v));
  const deleteVendor = (id) => save(vendors.filter(v => v.id !== id));
  const filtered = vendors.filter(v => !search || v.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="tool-page"><h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Truck size={22} /> Vendor Management</h2>
      <div className="stats-row">{[['Total Vendors', vendors.length, '#a855f7'], ['Active', vendors.filter(v=>v.status==='Active').length, '#10b981'], ['Inactive', vendors.filter(v=>v.status==='Inactive').length, '#ef4444']].map(([l,v,c]) => <div key={l} className="stat-card"><div style={{fontSize:12,opacity:0.6}}>{l}</div><div style={{fontSize:24,fontWeight:700,color:c}}>{v}</div></div>)}</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input className="input" placeholder="Search vendors..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1 }} />
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>+ Add Vendor</button>
      </div>
      {showForm && <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <input className="input" placeholder="Vendor name *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          <select className="input" value={form.type} onChange={e => setForm({...form, type: e.target.value})}><option>Raw Material</option><option>Packaging</option><option>Equipment</option><option>Logistics</option><option>Lab/Testing</option><option>Other</option></select>
          <input className="input" placeholder="Contact person" value={form.contactPerson} onChange={e => setForm({...form, contactPerson: e.target.value})} />
          <input className="input" placeholder="Phone *" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
          <input className="input" placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
          <input className="input" placeholder="GST No." value={form.gst} onChange={e => setForm({...form, gst: e.target.value})} />
          <input className="input" placeholder="PAN" value={form.pan} onChange={e => setForm({...form, pan: e.target.value})} />
          <input className="input" placeholder="City" value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
          <input className="input" placeholder="State" value={form.state} onChange={e => setForm({...form, state: e.target.value})} />
          <input className="input" placeholder="Materials supplied" value={form.materials} onChange={e => setForm({...form, materials: e.target.value})} style={{ gridColumn: 'span 2' }} />
          <select className="input" value={form.rating} onChange={e => setForm({...form, rating: e.target.value})}><option>A</option><option>B</option><option>C</option></select>
        </div>
        <button className="btn-primary" style={{ marginTop: 10 }} onClick={addVendor}>Save Vendor</button>
      </div>}
      {viewVendor && <div className="modal-overlay" onClick={() => setViewVendor(null)}><div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <h3 style={{ marginBottom: 8 }}>{viewVendor.name}</h3>
        <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 12 }}>{viewVendor.type} • {viewVendor.city}, {viewVendor.state}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13, marginBottom: 16 }}>
          <div><span style={{opacity:0.5}}>Contact:</span> {viewVendor.contactPerson}</div>
          <div><span style={{opacity:0.5}}>Phone:</span> {viewVendor.phone}</div>
          <div><span style={{opacity:0.5}}>Email:</span> {viewVendor.email || '—'}</div>
          <div><span style={{opacity:0.5}}>GST:</span> {viewVendor.gst || '—'}</div>
          <div><span style={{opacity:0.5}}>Materials:</span> {viewVendor.materials || '—'}</div>
          <div><span style={{opacity:0.5}}>Rating:</span> {viewVendor.rating}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href={`tel:${viewVendor.phone}`} className="btn-primary" style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}><Phone size={14}/> Call</a>
          <a href={`https://wa.me/91${viewVendor.phone.replace(/\D/g,'')}`} target="_blank" className="btn-secondary" style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}>WhatsApp</a>
          {viewVendor.email && <a href={`mailto:${viewVendor.email}`} className="btn-secondary" style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}><Mail size={14}/> Email</a>}
        </div>
      </div></div>}
      <div className="table-wrapper"><table className="data-table"><thead><tr><th>Vendor</th><th>Type</th><th>Contact</th><th>City</th><th>Materials</th><th>Rating</th><th>Status</th><th>Actions</th></tr></thead><tbody>
        {filtered.map(v => <tr key={v.id} onClick={() => setViewVendor(v)} style={{ cursor: 'pointer' }}>
          <td style={{fontWeight:600}}>{v.name}</td><td>{v.type}</td><td>{v.contactPerson}</td><td>{v.city}</td><td style={{maxWidth:150,overflow:'hidden',textOverflow:'ellipsis'}}>{v.materials || '—'}</td>
          <td><span style={{padding:'2px 8px',borderRadius:4,fontSize:11,background:v.rating==='A'?'#10b981':v.rating==='B'?'#f59e0b':'#ef4444',color:'#fff'}}>{v.rating}</span></td>
          <td><span style={{color:v.status==='Active'?'#10b981':'#ef4444',fontSize:12}}>{v.status}</span></td>
          <td><button onClick={e => { e.stopPropagation(); deleteVendor(v.id); }} style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer'}}><Trash2 size={14}/></button></td></tr>)}
      </tbody></table></div>
    </div>
  );
}

function DeadlockQualityControl() {
  const [checks, setChecks] = useState(() => JSON.parse(localStorage.getItem('protocol_deadlock_qc') || '[]'));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ product: '', batchNo: '', type: 'Incoming', parameter: '', result: '', standard: '', status: 'Pass', inspector: '', notes: '' });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const save = (d) => { setChecks(d); localStorage.setItem('protocol_deadlock_qc', JSON.stringify(d)); };
  const addCheck = () => { if (!form.product || !form.batchNo) return; save([...checks, { ...form, id: Date.now(), date: new Date().toISOString() }]); setForm({ product: '', batchNo: '', type: 'Incoming', parameter: '', result: '', standard: '', status: 'Pass', inspector: '', notes: '' }); setShowForm(false); };
  const generateSOPs = async () => {
    setAiLoading(true);
    try {
      const res = await callClaude(`You are a food safety & quality expert for an FMCG RTE/RTC brand. Generate comprehensive QC SOPs covering: incoming raw material inspection, in-process checks, finished product testing, microbiological standards, FSSAI compliance parameters, shelf-life testing, packaging integrity, sensory evaluation panels. Include specific test parameters, acceptable ranges, sampling plans, and corrective actions. Format with clear sections.`, SYSTEM_PROMPTS.strategy);
      setAiResult(res);
    } catch(e) { setAiResult('Error: ' + e.message); }
    setAiLoading(false);
  };
  const stats = { total: checks.length, pass: checks.filter(c => c.status === 'Pass').length, fail: checks.filter(c => c.status === 'Fail').length, hold: checks.filter(c => c.status === 'On Hold').length };
  return (
    <div className="tool-page"><h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><FlaskConical size={22} /> Quality Control</h2>
      <div className="stats-row">{[['Total Checks', stats.total, '#a855f7'], ['Passed', stats.pass, '#10b981'], ['Failed', stats.fail, '#ef4444'], ['On Hold', stats.hold, '#f59e0b']].map(([l,v,c]) => <div key={l} className="stat-card"><div style={{fontSize:12,opacity:0.6}}>{l}</div><div style={{fontSize:24,fontWeight:700,color:c}}>{v}</div></div>)}</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>+ Log QC Check</button>
        <button className="btn-secondary" onClick={generateSOPs} disabled={aiLoading}>{aiLoading ? 'Generating...' : '✦ AI Generate SOPs'}</button>
      </div>
      {showForm && <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <input className="input" placeholder="Product *" value={form.product} onChange={e => setForm({...form, product: e.target.value})} />
          <input className="input" placeholder="Batch No. *" value={form.batchNo} onChange={e => setForm({...form, batchNo: e.target.value})} />
          <select className="input" value={form.type} onChange={e => setForm({...form, type: e.target.value})}><option>Incoming</option><option>In-Process</option><option>Finished Product</option><option>Packaging</option><option>Microbiological</option></select>
          <input className="input" placeholder="Parameter tested" value={form.parameter} onChange={e => setForm({...form, parameter: e.target.value})} />
          <input className="input" placeholder="Result" value={form.result} onChange={e => setForm({...form, result: e.target.value})} />
          <input className="input" placeholder="Standard/acceptable range" value={form.standard} onChange={e => setForm({...form, standard: e.target.value})} />
          <select className="input" value={form.status} onChange={e => setForm({...form, status: e.target.value})}><option>Pass</option><option>Fail</option><option>On Hold</option></select>
          <input className="input" placeholder="Inspector" value={form.inspector} onChange={e => setForm({...form, inspector: e.target.value})} />
          <input className="input" placeholder="Notes" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
        </div>
        <button className="btn-primary" style={{ marginTop: 10 }} onClick={addCheck}>Save Check</button>
      </div>}
      {aiResult && <div className="card" style={{ padding: 16, marginBottom: 16, maxHeight: 400, overflow: 'auto' }}><ReactMarkdown>{aiResult}</ReactMarkdown></div>}
      <div className="table-wrapper"><table className="data-table"><thead><tr><th>Product</th><th>Batch</th><th>Type</th><th>Parameter</th><th>Result</th><th>Standard</th><th>Status</th><th>Inspector</th></tr></thead><tbody>
        {checks.map(c => <tr key={c.id}><td style={{fontWeight:600}}>{c.product}</td><td>{c.batchNo}</td><td>{c.type}</td><td>{c.parameter}</td><td>{c.result}</td><td>{c.standard}</td>
          <td><span style={{padding:'2px 8px',borderRadius:4,fontSize:11,background:c.status==='Pass'?'#10b981':c.status==='Fail'?'#ef4444':'#f59e0b',color:'#fff'}}>{c.status}</span></td>
          <td>{c.inspector}</td></tr>)}
      </tbody></table></div>
    </div>
  );
}

function DeadlockBatchTracker() {
  const [batches, setBatches] = useState(() => JSON.parse(localStorage.getItem('protocol_deadlock_batches') || '[]'));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ batchNo: '', product: '', rawMaterials: '', startDate: '', endDate: '', quantity: '', unit: 'kg', mfgDate: '', expiryDate: '', status: 'In Production', line: '' });
  const save = (d) => { setBatches(d); localStorage.setItem('protocol_deadlock_batches', JSON.stringify(d)); };
  const addBatch = () => { if (!form.batchNo || !form.product) return; save([...batches, { ...form, id: Date.now() }]); setForm({ batchNo: '', product: '', rawMaterials: '', startDate: '', endDate: '', quantity: '', unit: 'kg', mfgDate: '', expiryDate: '', status: 'In Production', line: '' }); setShowForm(false); };
  const updateStatus = (id, status) => save(batches.map(b => b.id === id ? { ...b, status } : b));
  return (
    <div className="tool-page"><h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Barcode size={22} /> Batch Tracker</h2>
      <div className="stats-row">{[['Total Batches', batches.length, '#a855f7'], ['In Production', batches.filter(b=>b.status==='In Production').length, '#f59e0b'], ['Completed', batches.filter(b=>b.status==='Completed').length, '#10b981'], ['Released', batches.filter(b=>b.status==='Released').length, '#3b82f6']].map(([l,v,c]) => <div key={l} className="stat-card"><div style={{fontSize:12,opacity:0.6}}>{l}</div><div style={{fontSize:24,fontWeight:700,color:c}}>{v}</div></div>)}</div>
      <button className="btn-primary" onClick={() => setShowForm(!showForm)} style={{ marginBottom: 16 }}>+ New Batch</button>
      {showForm && <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <input className="input" placeholder="Batch No. *" value={form.batchNo} onChange={e => setForm({...form, batchNo: e.target.value})} />
          <input className="input" placeholder="Product *" value={form.product} onChange={e => setForm({...form, product: e.target.value})} />
          <input className="input" placeholder="Production line" value={form.line} onChange={e => setForm({...form, line: e.target.value})} />
          <input className="input" placeholder="Raw materials used" value={form.rawMaterials} onChange={e => setForm({...form, rawMaterials: e.target.value})} style={{ gridColumn: 'span 2' }} />
          <input className="input" type="number" placeholder="Quantity" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} />
          <input className="input" type="date" value={form.mfgDate} onChange={e => setForm({...form, mfgDate: e.target.value})} title="Mfg date" />
          <input className="input" type="date" value={form.expiryDate} onChange={e => setForm({...form, expiryDate: e.target.value})} title="Expiry date" />
        </div>
        <button className="btn-primary" style={{ marginTop: 10 }} onClick={addBatch}>Save Batch</button>
      </div>}
      <div className="table-wrapper"><table className="data-table"><thead><tr><th>Batch No</th><th>Product</th><th>Line</th><th>Quantity</th><th>Mfg Date</th><th>Expiry</th><th>Status</th></tr></thead><tbody>
        {batches.map(b => <tr key={b.id}><td style={{fontWeight:600,fontFamily:'monospace'}}>{b.batchNo}</td><td>{b.product}</td><td>{b.line || '—'}</td><td>{b.quantity} {b.unit}</td><td>{b.mfgDate || '—'}</td><td>{b.expiryDate || '—'}</td>
          <td><select className="input" style={{fontSize:11,padding:'2px 6px'}} value={b.status} onChange={e => updateStatus(b.id, e.target.value)}><option>In Production</option><option>QC Pending</option><option>QC Passed</option><option>Completed</option><option>Released</option><option>Rejected</option></select></td></tr>)}
      </tbody></table></div>
    </div>
  );
}

function DeadlockCOGS() {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const [product, setProduct] = useState('');
  const [batchSize, setBatchSize] = useState('');
  const generateCOGS = async () => {
    setAiLoading(true);
    try {
      const inventory = JSON.parse(localStorage.getItem('protocol_deadlock_inventory') || '[]');
      const vendors = JSON.parse(localStorage.getItem('protocol_deadlock_vendors') || '[]');
      const res = await callClaude(`You are a cost accountant for an FMCG food company. Product: "${product}". Batch size: ${batchSize || '1000'} units. Raw material inventory with costs: ${JSON.stringify(inventory.slice(0, 20))}. Vendors: ${JSON.stringify(vendors.map(v => ({ name: v.name, materials: v.materials })).slice(0, 10))}. Calculate detailed COGS breakdown including: raw material cost per unit, packaging cost, direct labor, manufacturing overhead, quality testing, utilities, depreciation. Show per-unit cost, per-batch cost, suggested MRP with margins (retailer 20%, distributor 10%, company 30%). Format as clear cost sheet with totals.`, SYSTEM_PROMPTS.strategy);
      setAiResult(res);
    } catch(e) { setAiResult('Error: ' + e.message); }
    setAiLoading(false);
  };
  return (
    <div className="tool-page"><h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Calculator size={22} /> COGS Calculator</h2>
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 12 }}>AI-powered Cost of Goods Sold calculator. Uses your raw material inventory data to compute per-unit production costs and recommend pricing.</p>
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <input className="input" placeholder="Product name" value={product} onChange={e => setProduct(e.target.value)} style={{ flex: 1 }} />
          <input className="input" placeholder="Batch size (units)" type="number" value={batchSize} onChange={e => setBatchSize(e.target.value)} style={{ width: 180 }} />
          <button className="btn-primary" onClick={generateCOGS} disabled={aiLoading || !product}>{aiLoading ? 'Calculating...' : '✦ Calculate COGS'}</button>
        </div>
      </div>
      {aiResult && <div className="card" style={{ padding: 20, maxHeight: 500, overflow: 'auto' }}><ReactMarkdown>{aiResult}</ReactMarkdown></div>}
    </div>
  );
}

function DeadlockFSSAI() {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const [query, setQuery] = useState('');
  const [checklist, setChecklist] = useState(() => JSON.parse(localStorage.getItem('protocol_deadlock_fssai') || '[]'));
  const defaultChecklist = [
    { item: 'FSSAI License (Central/State)', done: false },
    { item: 'Product Standards compliance (FSS Regulations)', done: false },
    { item: 'Labelling requirements (FSSR 2011)', done: false },
    { item: 'Nutritional information panel', done: false },
    { item: 'Allergen declarations', done: false },
    { item: 'Best before / Use by dates', done: false },
    { item: 'Batch coding system', done: false },
    { item: 'HACCP plan documentation', done: false },
    { item: 'Water testing reports', done: false },
    { item: 'Pest control records', done: false },
    { item: 'Employee health records', done: false },
    { item: 'Traceability system (1-up, 1-back)', done: false },
    { item: 'Recall plan documentation', done: false },
    { item: 'GMP certification', done: false },
    { item: 'Lab testing reports (microbiology, heavy metals)', done: false },
  ];
  useEffect(() => { if (checklist.length === 0) { setChecklist(defaultChecklist); localStorage.setItem('protocol_deadlock_fssai', JSON.stringify(defaultChecklist)); } }, []);
  const toggleItem = (idx) => { const updated = [...checklist]; updated[idx] = { ...updated[idx], done: !updated[idx].done }; setChecklist(updated); localStorage.setItem('protocol_deadlock_fssai', JSON.stringify(updated)); };
  const askCompliance = async () => {
    setAiLoading(true);
    try {
      const res = await callClaude(`You are an FSSAI compliance expert and food safety consultant in India. Query: "${query}". Provide detailed, actionable guidance covering relevant FSSAI regulations, required documentation, testing parameters, labelling requirements, and penalties for non-compliance. Reference specific FSSAI regulation numbers where applicable.`, SYSTEM_PROMPTS.strategy);
      setAiResult(res);
    } catch(e) { setAiResult('Error: ' + e.message); }
    setAiLoading(false);
  };
  const completed = checklist.filter(c => c.done).length;
  return (
    <div className="tool-page"><h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Leaf size={22} /> FSSAI Compliance</h2>
      <div className="stats-row">{[['Total Items', checklist.length, '#a855f7'], ['Completed', completed, '#10b981'], ['Pending', checklist.length - completed, '#f59e0b'], ['Progress', Math.round(completed/checklist.length*100) + '%', '#3b82f6']].map(([l,v,c]) => <div key={l} className="stat-card"><div style={{fontSize:12,opacity:0.6}}>{l}</div><div style={{fontSize:24,fontWeight:700,color:c}}>{v}</div></div>)}</div>
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <h3 style={{ marginBottom: 12, fontSize: 14 }}>Compliance Checklist</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {checklist.map((c, i) => <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', opacity: c.done ? 0.5 : 1, textDecoration: c.done ? 'line-through' : 'none' }}>
            <input type="checkbox" checked={c.done} onChange={() => toggleItem(i)} /> {c.item}
          </label>)}
        </div>
      </div>
      <div className="card" style={{ padding: 16 }}>
        <h3 style={{ marginBottom: 8, fontSize: 14 }}>✦ AI Compliance Assistant</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="input" placeholder="Ask about FSSAI regulations, labelling, testing..." value={query} onChange={e => setQuery(e.target.value)} style={{ flex: 1 }} />
          <button className="btn-primary" onClick={askCompliance} disabled={aiLoading || !query}>{aiLoading ? 'Thinking...' : 'Ask'}</button>
        </div>
        {aiResult && <div style={{ marginTop: 12, maxHeight: 400, overflow: 'auto' }}><ReactMarkdown>{aiResult}</ReactMarkdown></div>}
      </div>
    </div>
  );
}

function DeadlockRecipeManager() {
  const [recipes, setRecipes] = useState(() => JSON.parse(localStorage.getItem('protocol_deadlock_recipes') || '[]'));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', category: 'RTE', ingredients: '', process: '', batchYield: '', shelfLife: '', storageTemp: '', allergens: '', notes: '' });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const save = (d) => { setRecipes(d); localStorage.setItem('protocol_deadlock_recipes', JSON.stringify(d)); };
  const addRecipe = () => { if (!form.name) return; save([...recipes, { ...form, id: Date.now(), version: 1, createdAt: new Date().toISOString() }]); setForm({ name: '', category: 'RTE', ingredients: '', process: '', batchYield: '', shelfLife: '', storageTemp: '', allergens: '', notes: '' }); setShowForm(false); };
  const deleteRecipe = (id) => save(recipes.filter(r => r.id !== id));
  const optimizeRecipe = async (recipe) => {
    setAiLoading(true);
    try {
      const inventory = JSON.parse(localStorage.getItem('protocol_deadlock_inventory') || '[]');
      const res = await callClaude(`You are a food technologist for a clean-label RTE/RTC brand. Recipe: ${JSON.stringify(recipe)}. Available raw materials: ${JSON.stringify(inventory.map(i => ({ name: i.name, stock: i.quantity, unit: i.unit, cost: i.costPerUnit })).slice(0, 20))}. Optimize this recipe for: cost efficiency, clean-label ingredients, shelf life extension, nutritional improvement, scalability. Suggest alternatives for expensive ingredients, calculate approximate cost per unit, and flag any FSSAI concerns.`, SYSTEM_PROMPTS.strategy);
      setAiResult(res);
    } catch(e) { setAiResult('Error: ' + e.message); }
    setAiLoading(false);
  };
  return (
    <div className="tool-page"><h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><PackageCheck size={22} /> Recipe Manager</h2>
      <button className="btn-primary" onClick={() => setShowForm(!showForm)} style={{ marginBottom: 16 }}>+ New Recipe</button>
      {showForm && <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <input className="input" placeholder="Recipe name *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          <select className="input" value={form.category} onChange={e => setForm({...form, category: e.target.value})}><option>RTE</option><option>RTC</option><option>Snack</option><option>Beverage</option><option>Sauce/Paste</option></select>
          <textarea className="input" placeholder="Ingredients (one per line)" rows={3} value={form.ingredients} onChange={e => setForm({...form, ingredients: e.target.value})} style={{ gridColumn: 'span 2' }} />
          <textarea className="input" placeholder="Process steps" rows={3} value={form.process} onChange={e => setForm({...form, process: e.target.value})} style={{ gridColumn: 'span 2' }} />
          <input className="input" placeholder="Batch yield" value={form.batchYield} onChange={e => setForm({...form, batchYield: e.target.value})} />
          <input className="input" placeholder="Shelf life" value={form.shelfLife} onChange={e => setForm({...form, shelfLife: e.target.value})} />
          <input className="input" placeholder="Storage temp" value={form.storageTemp} onChange={e => setForm({...form, storageTemp: e.target.value})} />
          <input className="input" placeholder="Allergens" value={form.allergens} onChange={e => setForm({...form, allergens: e.target.value})} />
        </div>
        <button className="btn-primary" style={{ marginTop: 10 }} onClick={addRecipe}>Save Recipe</button>
      </div>}
      {aiResult && <div className="card" style={{ padding: 16, marginBottom: 16, maxHeight: 400, overflow: 'auto' }}><ReactMarkdown>{aiResult}</ReactMarkdown></div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
        {recipes.map(r => <div key={r.id} className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div><div style={{ fontWeight: 700 }}>{r.name}</div><div style={{ fontSize: 12, opacity: 0.6 }}>{r.category} • v{r.version}</div></div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => optimizeRecipe(r)} disabled={aiLoading} style={{ background: 'none', border: '1px solid #a855f7', color: '#a855f7', borderRadius: 4, padding: '2px 8px', fontSize: 11, cursor: 'pointer' }}>✦ Optimize</button>
              <button onClick={() => deleteRecipe(r.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={14}/></button>
            </div>
          </div>
          {r.shelfLife && <div style={{ fontSize: 12, marginTop: 8, opacity: 0.7 }}>Shelf life: {r.shelfLife}</div>}
          {r.allergens && <div style={{ fontSize: 12, opacity: 0.7 }}>Allergens: {r.allergens}</div>}
        </div>)}
      </div>
    </div>
  );
}

// =============================================
// KAY/O — Finance & Accounts Management
// =============================================

function KayoPnL() {
  const [entries, setEntries] = useState(() => JSON.parse(localStorage.getItem('protocol_kayo_pnl') || '[]'));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ description: '', type: 'Revenue', category: 'Product Sales', amount: '', month: new Date().toISOString().slice(0,7), notes: '' });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const save = (d) => { setEntries(d); localStorage.setItem('protocol_kayo_pnl', JSON.stringify(d)); };
  const addEntry = () => { if (!form.description || !form.amount) return; save([...entries, { ...form, id: Date.now(), amount: Number(form.amount), createdAt: new Date().toISOString() }]); setForm({ description: '', type: 'Revenue', category: 'Product Sales', amount: '', month: new Date().toISOString().slice(0,7), notes: '' }); setShowForm(false); };
  const deleteEntry = (id) => save(entries.filter(e => e.id !== id));
  const revenue = entries.filter(e => e.type === 'Revenue').reduce((s, e) => s + e.amount, 0);
  const expenses = entries.filter(e => e.type === 'Expense').reduce((s, e) => s + e.amount, 0);
  const profit = revenue - expenses;
  const analyzePnL = async () => {
    setAiLoading(true);
    try {
      const res = await callClaude(`You are a financial analyst for a pre-launch FMCG food brand. P&L data: Revenue entries: ${JSON.stringify(entries.filter(e=>e.type==='Revenue'))}. Expense entries: ${JSON.stringify(entries.filter(e=>e.type==='Expense'))}. Total revenue: ₹${revenue}, Total expenses: ₹${expenses}, Net: ₹${profit}. Analyze: profitability trends, expense optimization opportunities, category-wise breakdown, margin analysis, cash burn rate, runway estimation, suggestions to improve unit economics. Format as executive P&L summary.`, SYSTEM_PROMPTS.strategy);
      setAiResult(res);
    } catch(e) { setAiResult('Error: ' + e.message); }
    setAiLoading(false);
  };
  return (
    <div className="tool-page"><h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><FileBarChart size={22} /> Profit & Loss</h2>
      <div className="stats-row">{[['Revenue', '₹' + revenue.toLocaleString(), '#10b981'], ['Expenses', '₹' + expenses.toLocaleString(), '#ef4444'], ['Net P&L', '₹' + profit.toLocaleString(), profit >= 0 ? '#10b981' : '#ef4444'], ['Entries', entries.length, '#a855f7']].map(([l,v,c]) => <div key={l} className="stat-card"><div style={{fontSize:12,opacity:0.6}}>{l}</div><div style={{fontSize:24,fontWeight:700,color:c}}>{v}</div></div>)}</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>+ Add Entry</button>
        <button className="btn-secondary" onClick={analyzePnL} disabled={aiLoading}>{aiLoading ? 'Analyzing...' : '✦ AI Analysis'}</button>
      </div>
      {showForm && <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <input className="input" placeholder="Description *" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
          <select className="input" value={form.type} onChange={e => setForm({...form, type: e.target.value})}><option>Revenue</option><option>Expense</option></select>
          <select className="input" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
            {form.type === 'Revenue' ? <><option>Product Sales</option><option>Online Sales</option><option>Export</option><option>Other Revenue</option></> : <><option>Raw Materials</option><option>Production</option><option>Packaging</option><option>Logistics</option><option>Marketing</option><option>Salaries</option><option>Rent</option><option>Utilities</option><option>Equipment</option><option>Legal/Compliance</option><option>Other Expense</option></>}
          </select>
          <input className="input" type="number" placeholder="Amount (₹) *" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
          <input className="input" type="month" value={form.month} onChange={e => setForm({...form, month: e.target.value})} />
          <input className="input" placeholder="Notes" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
        </div>
        <button className="btn-primary" style={{ marginTop: 10 }} onClick={addEntry}>Save Entry</button>
      </div>}
      {aiResult && <div className="card" style={{ padding: 16, marginBottom: 16, maxHeight: 400, overflow: 'auto' }}><ReactMarkdown>{aiResult}</ReactMarkdown></div>}
      <div className="table-wrapper"><table className="data-table"><thead><tr><th>Description</th><th>Type</th><th>Category</th><th>Amount</th><th>Month</th><th>Actions</th></tr></thead><tbody>
        {entries.map(e => <tr key={e.id}><td style={{fontWeight:600}}>{e.description}</td>
          <td><span style={{color:e.type==='Revenue'?'#10b981':'#ef4444'}}>{e.type}</span></td><td>{e.category}</td>
          <td style={{fontWeight:600,color:e.type==='Revenue'?'#10b981':'#ef4444'}}>{e.type==='Expense'?'-':''}₹{e.amount.toLocaleString()}</td><td>{e.month}</td>
          <td><button onClick={() => deleteEntry(e.id)} style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer'}}><Trash2 size={14}/></button></td></tr>)}
      </tbody></table></div>
    </div>
  );
}

function KayoExpenseTracker() {
  const [expenses, setExpenses] = useState(() => JSON.parse(localStorage.getItem('protocol_kayo_expenses') || '[]'));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ description: '', category: 'Operations', amount: '', date: new Date().toISOString().slice(0,10), paidTo: '', paymentMode: 'Bank Transfer', invoiceNo: '', approved: false, notes: '' });
  const save = (d) => { setExpenses(d); localStorage.setItem('protocol_kayo_expenses', JSON.stringify(d)); };
  const addExpense = () => { if (!form.description || !form.amount) return; save([...expenses, { ...form, id: Date.now(), amount: Number(form.amount) }]); setForm({ description: '', category: 'Operations', amount: '', date: new Date().toISOString().slice(0,10), paidTo: '', paymentMode: 'Bank Transfer', invoiceNo: '', approved: false, notes: '' }); setShowForm(false); };
  const deleteExpense = (id) => save(expenses.filter(e => e.id !== id));
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const byCategory = {};
  expenses.forEach(e => { byCategory[e.category] = (byCategory[e.category] || 0) + e.amount; });
  return (
    <div className="tool-page"><h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Wallet size={22} /> Expense Tracker</h2>
      <div className="stats-row">{[['Total Expenses', '₹' + total.toLocaleString(), '#ef4444'], ['This Month', '₹' + expenses.filter(e => e.date?.startsWith(new Date().toISOString().slice(0,7))).reduce((s,e)=>s+e.amount,0).toLocaleString(), '#f59e0b'], ['Entries', expenses.length, '#a855f7']].map(([l,v,c]) => <div key={l} className="stat-card"><div style={{fontSize:12,opacity:0.6}}>{l}</div><div style={{fontSize:24,fontWeight:700,color:c}}>{v}</div></div>)}</div>
      <button className="btn-primary" onClick={() => setShowForm(!showForm)} style={{ marginBottom: 16 }}>+ Log Expense</button>
      {showForm && <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <input className="input" placeholder="Description *" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
          <select className="input" value={form.category} onChange={e => setForm({...form, category: e.target.value})}><option>Operations</option><option>Raw Materials</option><option>Production</option><option>Marketing</option><option>Logistics</option><option>Salaries</option><option>Rent</option><option>Equipment</option><option>Travel</option><option>Legal</option><option>Miscellaneous</option></select>
          <input className="input" type="number" placeholder="Amount (₹) *" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
          <input className="input" type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
          <input className="input" placeholder="Paid to" value={form.paidTo} onChange={e => setForm({...form, paidTo: e.target.value})} />
          <select className="input" value={form.paymentMode} onChange={e => setForm({...form, paymentMode: e.target.value})}><option>Bank Transfer</option><option>UPI</option><option>Cash</option><option>Cheque</option><option>Credit Card</option></select>
          <input className="input" placeholder="Invoice no." value={form.invoiceNo} onChange={e => setForm({...form, invoiceNo: e.target.value})} />
        </div>
        <button className="btn-primary" style={{ marginTop: 10 }} onClick={addExpense}>Save Expense</button>
      </div>}
      {Object.keys(byCategory).length > 0 && <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <h4 style={{ marginBottom: 8, fontSize: 13 }}>Category Breakdown</h4>
        {Object.entries(byCategory).sort((a,b) => b[1]-a[1]).map(([cat, amt]) => <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}><span>{cat}</span><span style={{ fontWeight: 600 }}>₹{amt.toLocaleString()} ({Math.round(amt/total*100)}%)</span></div>)}
      </div>}
      <div className="table-wrapper"><table className="data-table"><thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th><th>Paid To</th><th>Mode</th><th>Actions</th></tr></thead><tbody>
        {expenses.sort((a,b) => b.date?.localeCompare(a.date)).map(e => <tr key={e.id}><td>{e.date}</td><td style={{fontWeight:600}}>{e.description}</td><td>{e.category}</td>
          <td style={{fontWeight:600,color:'#ef4444'}}>₹{e.amount.toLocaleString()}</td><td>{e.paidTo || '—'}</td><td>{e.paymentMode}</td>
          <td><button onClick={() => deleteExpense(e.id)} style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer'}}><Trash2 size={14}/></button></td></tr>)}
      </tbody></table></div>
    </div>
  );
}

function KayoInvoiceGen() {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const [form, setForm] = useState({ clientName: '', clientGST: '', clientAddress: '', items: '', invoiceNo: '', date: new Date().toISOString().slice(0,10), dueDate: '', gstRate: '18' });
  const generateInvoice = async () => {
    setAiLoading(true);
    try {
      const res = await callClaude(`You are an accountant for Kiro Foods India. Generate a professional GST-compliant invoice in markdown table format. Details: Invoice No: ${form.invoiceNo || 'KF-' + Date.now().toString().slice(-6)}, Date: ${form.date}, Due: ${form.dueDate || '30 days'}, Client: ${form.clientName}, Client GST: ${form.clientGST}, Client Address: ${form.clientAddress}, Items: ${form.items}, GST Rate: ${form.gstRate}%. Include: company header (Kiro Foods India), itemized table with HSN codes, quantity, rate, amount, CGST, SGST/IGST, total, bank details section, terms & conditions, authorized signatory. Make it print-ready.`, SYSTEM_PROMPTS.strategy);
      setAiResult(res);
    } catch(e) { setAiResult('Error: ' + e.message); }
    setAiLoading(false);
  };
  return (
    <div className="tool-page"><h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Receipt size={22} /> Invoice Generator</h2>
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <input className="input" placeholder="Client name *" value={form.clientName} onChange={e => setForm({...form, clientName: e.target.value})} />
          <input className="input" placeholder="Client GST" value={form.clientGST} onChange={e => setForm({...form, clientGST: e.target.value})} />
          <input className="input" placeholder="Client address" value={form.clientAddress} onChange={e => setForm({...form, clientAddress: e.target.value})} style={{ gridColumn: 'span 2' }} />
          <input className="input" placeholder="Invoice no." value={form.invoiceNo} onChange={e => setForm({...form, invoiceNo: e.target.value})} />
          <input className="input" type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
          <input className="input" type="date" placeholder="Due date" value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})} />
          <select className="input" value={form.gstRate} onChange={e => setForm({...form, gstRate: e.target.value})}><option value="5">GST 5%</option><option value="12">GST 12%</option><option value="18">GST 18%</option><option value="28">GST 28%</option></select>
          <textarea className="input" placeholder="Items (product, qty, rate — one per line)" rows={4} value={form.items} onChange={e => setForm({...form, items: e.target.value})} style={{ gridColumn: 'span 2' }} />
        </div>
        <button className="btn-primary" style={{ marginTop: 12 }} onClick={generateInvoice} disabled={aiLoading || !form.clientName}>{aiLoading ? 'Generating...' : '✦ Generate Invoice'}</button>
      </div>
      {aiResult && <div className="card" style={{ padding: 20, maxHeight: 500, overflow: 'auto' }}><ReactMarkdown>{aiResult}</ReactMarkdown></div>}
    </div>
  );
}

function KayoPaymentTracker() {
  const [payments, setPayments] = useState(() => JSON.parse(localStorage.getItem('protocol_kayo_payments') || '[]'));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ party: '', type: 'Receivable', amount: '', dueDate: '', status: 'Pending', invoiceNo: '', notes: '' });
  const save = (d) => { setPayments(d); localStorage.setItem('protocol_kayo_payments', JSON.stringify(d)); };
  const addPayment = () => { if (!form.party || !form.amount) return; save([...payments, { ...form, id: Date.now(), amount: Number(form.amount), createdAt: new Date().toISOString() }]); setForm({ party: '', type: 'Receivable', amount: '', dueDate: '', status: 'Pending', invoiceNo: '', notes: '' }); setShowForm(false); };
  const updateStatus = (id, status) => save(payments.map(p => p.id === id ? { ...p, status } : p));
  const deletePayment = (id) => save(payments.filter(p => p.id !== id));
  const receivable = payments.filter(p => p.type === 'Receivable' && p.status !== 'Paid').reduce((s,p) => s + p.amount, 0);
  const payable = payments.filter(p => p.type === 'Payable' && p.status !== 'Paid').reduce((s,p) => s + p.amount, 0);
  const overdue = payments.filter(p => p.status !== 'Paid' && p.dueDate && new Date(p.dueDate) < new Date());
  return (
    <div className="tool-page"><h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><ArrowUpDown size={22} /> Payment Tracker</h2>
      <div className="stats-row">{[['Receivable', '₹' + receivable.toLocaleString(), '#10b981'], ['Payable', '₹' + payable.toLocaleString(), '#ef4444'], ['Overdue', overdue.length, '#f59e0b'], ['Total Entries', payments.length, '#a855f7']].map(([l,v,c]) => <div key={l} className="stat-card"><div style={{fontSize:12,opacity:0.6}}>{l}</div><div style={{fontSize:24,fontWeight:700,color:c}}>{v}</div></div>)}</div>
      <button className="btn-primary" onClick={() => setShowForm(!showForm)} style={{ marginBottom: 16 }}>+ Add Payment</button>
      {showForm && <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <input className="input" placeholder="Party name *" value={form.party} onChange={e => setForm({...form, party: e.target.value})} />
          <select className="input" value={form.type} onChange={e => setForm({...form, type: e.target.value})}><option>Receivable</option><option>Payable</option></select>
          <input className="input" type="number" placeholder="Amount (₹) *" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
          <input className="input" type="date" value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})} title="Due date" />
          <input className="input" placeholder="Invoice no." value={form.invoiceNo} onChange={e => setForm({...form, invoiceNo: e.target.value})} />
          <input className="input" placeholder="Notes" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
        </div>
        <button className="btn-primary" style={{ marginTop: 10 }} onClick={addPayment}>Save Payment</button>
      </div>}
      {overdue.length > 0 && <div className="card" style={{ padding: 12, marginBottom: 16, borderLeft: '3px solid #f59e0b' }}>
        <div style={{ fontWeight: 600, color: '#f59e0b', marginBottom: 4 }}>⚠ Overdue Payments</div>
        {overdue.map(p => <div key={p.id} style={{ fontSize: 12, opacity: 0.8 }}>{p.party}: ₹{p.amount.toLocaleString()} ({p.type}) — due {p.dueDate}</div>)}
      </div>}
      <div className="table-wrapper"><table className="data-table"><thead><tr><th>Party</th><th>Type</th><th>Amount</th><th>Due Date</th><th>Invoice</th><th>Status</th><th>Actions</th></tr></thead><tbody>
        {payments.map(p => <tr key={p.id} style={{ background: p.status !== 'Paid' && p.dueDate && new Date(p.dueDate) < new Date() ? 'rgba(245,158,11,0.1)' : 'transparent' }}>
          <td style={{fontWeight:600}}>{p.party}</td><td><span style={{color:p.type==='Receivable'?'#10b981':'#ef4444'}}>{p.type}</span></td>
          <td style={{fontWeight:600}}>₹{p.amount.toLocaleString()}</td><td>{p.dueDate || '—'}</td><td>{p.invoiceNo || '—'}</td>
          <td><select className="input" style={{fontSize:11,padding:'2px 6px'}} value={p.status} onChange={e => updateStatus(p.id, e.target.value)}><option>Pending</option><option>Partial</option><option>Paid</option><option>Overdue</option></select></td>
          <td><button onClick={() => deletePayment(p.id)} style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer'}}><Trash2 size={14}/></button></td></tr>)}
      </tbody></table></div>
    </div>
  );
}

function KayoCashFlow() {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const generateCashFlow = async () => {
    setAiLoading(true);
    try {
      const pnl = JSON.parse(localStorage.getItem('protocol_kayo_pnl') || '[]');
      const expenses = JSON.parse(localStorage.getItem('protocol_kayo_expenses') || '[]');
      const payments = JSON.parse(localStorage.getItem('protocol_kayo_payments') || '[]');
      const orders = JSON.parse(localStorage.getItem('protocol_harbor_orders') || '[]');
      const res = await callClaude(`You are a CFO/financial controller for a pre-launch FMCG food brand (Kiro Foods India). Generate a comprehensive cash flow analysis. Data: P&L entries: ${JSON.stringify(pnl.slice(0,30))}. Expenses: ${JSON.stringify(expenses.slice(0,30))}. Payments (receivable/payable): ${JSON.stringify(payments.slice(0,20))}. Distribution orders: ${JSON.stringify(orders.slice(0,20))}. Analyze: operating cash flow, investing cash flow, financing cash flow, net cash position, weekly/monthly projections, burn rate, runway, working capital cycle, DSO/DPO, cash conversion cycle. Flag risks and recommend actions. Format as executive cash flow statement.`, SYSTEM_PROMPTS.strategy);
      setAiResult(res);
    } catch(e) { setAiResult('Error: ' + e.message); }
    setAiLoading(false);
  };
  return (
    <div className="tool-page"><h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><TrendingDown size={22} /> Cash Flow Analysis</h2>
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 12 }}>AI-powered cash flow analysis using your P&L, expenses, payments, and distribution order data. Generates operating/investing/financing cash flows, projections, and runway estimates.</p>
        <button className="btn-primary" onClick={generateCashFlow} disabled={aiLoading}>{aiLoading ? 'Analyzing...' : '✦ Generate Cash Flow Analysis'}</button>
      </div>
      {aiResult && <div className="card" style={{ padding: 20, maxHeight: 600, overflow: 'auto' }}><ReactMarkdown>{aiResult}</ReactMarkdown></div>}
    </div>
  );
}

function KayoBudgetTracker() {
  const [budgets, setBudgets] = useState(() => JSON.parse(localStorage.getItem('protocol_kayo_budgets') || '[]'));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ department: 'Marketing', budgeted: '', actual: '', month: new Date().toISOString().slice(0,7), notes: '' });
  const save = (d) => { setBudgets(d); localStorage.setItem('protocol_kayo_budgets', JSON.stringify(d)); };
  const addBudget = () => { if (!form.budgeted) return; save([...budgets, { ...form, id: Date.now(), budgeted: Number(form.budgeted), actual: Number(form.actual) || 0 }]); setForm({ department: 'Marketing', budgeted: '', actual: '', month: new Date().toISOString().slice(0,7), notes: '' }); setShowForm(false); };
  const deleteBudget = (id) => save(budgets.filter(b => b.id !== id));
  const totalBudgeted = budgets.reduce((s, b) => s + b.budgeted, 0);
  const totalActual = budgets.reduce((s, b) => s + b.actual, 0);
  const variance = totalBudgeted - totalActual;
  return (
    <div className="tool-page"><h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><PiggyBank size={22} /> Budget vs Actuals</h2>
      <div className="stats-row">{[['Total Budget', '₹' + totalBudgeted.toLocaleString(), '#3b82f6'], ['Actual Spend', '₹' + totalActual.toLocaleString(), '#f59e0b'], ['Variance', (variance>=0?'+':'') + '₹' + variance.toLocaleString(), variance >= 0 ? '#10b981' : '#ef4444'], ['Utilization', totalBudgeted ? Math.round(totalActual/totalBudgeted*100) + '%' : '0%', '#a855f7']].map(([l,v,c]) => <div key={l} className="stat-card"><div style={{fontSize:12,opacity:0.6}}>{l}</div><div style={{fontSize:24,fontWeight:700,color:c}}>{v}</div></div>)}</div>
      <button className="btn-primary" onClick={() => setShowForm(!showForm)} style={{ marginBottom: 16 }}>+ Add Budget Line</button>
      {showForm && <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <select className="input" value={form.department} onChange={e => setForm({...form, department: e.target.value})}><option>Marketing</option><option>Production</option><option>Sales</option><option>Distribution</option><option>R&D</option><option>Admin</option><option>HR</option><option>IT</option><option>Legal</option></select>
          <input className="input" type="number" placeholder="Budgeted (₹) *" value={form.budgeted} onChange={e => setForm({...form, budgeted: e.target.value})} />
          <input className="input" type="number" placeholder="Actual (₹)" value={form.actual} onChange={e => setForm({...form, actual: e.target.value})} />
          <input className="input" type="month" value={form.month} onChange={e => setForm({...form, month: e.target.value})} />
          <input className="input" placeholder="Notes" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} style={{ gridColumn: 'span 2' }} />
        </div>
        <button className="btn-primary" style={{ marginTop: 10 }} onClick={addBudget}>Save</button>
      </div>}
      <div className="table-wrapper"><table className="data-table"><thead><tr><th>Department</th><th>Month</th><th>Budgeted</th><th>Actual</th><th>Variance</th><th>%</th><th>Actions</th></tr></thead><tbody>
        {budgets.map(b => { const v = b.budgeted - b.actual; return <tr key={b.id}><td style={{fontWeight:600}}>{b.department}</td><td>{b.month}</td>
          <td>₹{b.budgeted.toLocaleString()}</td><td>₹{b.actual.toLocaleString()}</td>
          <td style={{color:v>=0?'#10b981':'#ef4444',fontWeight:600}}>{v>=0?'+':''}₹{v.toLocaleString()}</td>
          <td>{b.budgeted ? Math.round(b.actual/b.budgeted*100) + '%' : '—'}</td>
          <td><button onClick={() => deleteBudget(b.id)} style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer'}}><Trash2 size={14}/></button></td></tr>; })}
      </tbody></table></div>
    </div>
  );
}

function KayoMarginAnalysis() {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const analyze = async () => {
    setAiLoading(true);
    try {
      const pnl = JSON.parse(localStorage.getItem('protocol_kayo_pnl') || '[]');
      const expenses = JSON.parse(localStorage.getItem('protocol_kayo_expenses') || '[]');
      const partners = JSON.parse(localStorage.getItem('protocol_harbor_partners') || '[]');
      const orders = JSON.parse(localStorage.getItem('protocol_harbor_orders') || '[]');
      const inventory = JSON.parse(localStorage.getItem('protocol_deadlock_inventory') || '[]');
      const res = await callClaude(`You are a financial strategist for Kiro Foods India (pre-launch FMCG). Analyze margins across the entire value chain. Data: P&L: ${JSON.stringify(pnl.slice(0,20))}. Expenses: ${JSON.stringify(expenses.slice(0,20))}. Distribution partners: ${JSON.stringify(partners.slice(0,10))}. Orders: ${JSON.stringify(orders.slice(0,15))}. Raw material costs: ${JSON.stringify(inventory.map(i=>({name:i.name,cost:i.costPerUnit,unit:i.unit})).slice(0,15))}. Calculate and analyze: gross margin, EBITDA margin, contribution margin per product, channel-wise margins (retail vs D2C vs marketplace), distributor margin structure (C&F 3-5%, SS 2-3%, distributor 8-10%, retailer 15-20%), break-even analysis, margin improvement recommendations. Format as detailed margin analysis report.`, SYSTEM_PROMPTS.strategy);
      setAiResult(res);
    } catch(e) { setAiResult('Error: ' + e.message); }
    setAiLoading(false);
  };
  return (
    <div className="tool-page"><h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Percent size={22} /> Margin Analysis</h2>
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 12 }}>AI-powered margin analysis across the entire value chain — from raw materials to retailer shelves. Cross-references data from Production (Deadlock), Distribution (Harbor), and Finance (KAY/O) agents.</p>
        <button className="btn-primary" onClick={analyze} disabled={aiLoading}>{aiLoading ? 'Analyzing...' : '✦ Run Margin Analysis'}</button>
      </div>
      {aiResult && <div className="card" style={{ padding: 20, maxHeight: 600, overflow: 'auto' }}><ReactMarkdown>{aiResult}</ReactMarkdown></div>}
    </div>
  );
}

// =============================================
// OMEN — Task & Project Management
// =============================================

function OmenTaskBoard() {
  const [tasks, setTasks] = useState(() => JSON.parse(localStorage.getItem('protocol_omen_tasks') || '[]'));
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ title: '', description: '', priority: 'Medium', status: 'To Do', assignee: '', department: 'Marketing', dueDate: '', tags: '', effort: 'Medium' });
  const save = (d) => { setTasks(d); localStorage.setItem('protocol_omen_tasks', JSON.stringify(d)); };
  const addTask = () => { if (!form.title) return; save([...tasks, { ...form, id: Date.now(), createdAt: new Date().toISOString(), comments: [] }]); setForm({ title: '', description: '', priority: 'Medium', status: 'To Do', assignee: '', department: 'Marketing', dueDate: '', tags: '', effort: 'Medium' }); setShowForm(false); };
  const updateStatus = (id, status) => save(tasks.map(t => t.id === id ? { ...t, status, ...(status === 'Done' ? { completedAt: new Date().toISOString() } : {}) } : t));
  const deleteTask = (id) => save(tasks.filter(t => t.id !== id));
  const statuses = ['To Do', 'In Progress', 'In Review', 'Done'];
  const filtered = tasks.filter(t => (filter === 'All' || t.status === filter) && (!search || t.title.toLowerCase().includes(search.toLowerCase()) || t.assignee?.toLowerCase().includes(search.toLowerCase())));
  const stats = { total: tasks.length, todo: tasks.filter(t=>t.status==='To Do').length, inProgress: tasks.filter(t=>t.status==='In Progress').length, done: tasks.filter(t=>t.status==='Done').length };
  return (
    <div className="tool-page"><h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><LayoutDashboard size={22} /> Task Board</h2>
      <div className="stats-row">{[['Total', stats.total, '#a855f7'], ['To Do', stats.todo, '#3b82f6'], ['In Progress', stats.inProgress, '#f59e0b'], ['Done', stats.done, '#10b981']].map(([l,v,c]) => <div key={l} className="stat-card"><div style={{fontSize:12,opacity:0.6}}>{l}</div><div style={{fontSize:24,fontWeight:700,color:c}}>{v}</div></div>)}</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input className="input" placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 150 }} />
        <select className="input" value={filter} onChange={e => setFilter(e.target.value)} style={{ width: 130 }}><option>All</option>{statuses.map(s => <option key={s}>{s}</option>)}</select>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>+ New Task</button>
      </div>
      {showForm && <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <input className="input" placeholder="Task title *" value={form.title} onChange={e => setForm({...form, title: e.target.value})} style={{ gridColumn: 'span 2' }} />
          <select className="input" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}><option>Low</option><option>Medium</option><option>High</option><option>Urgent</option></select>
          <textarea className="input" placeholder="Description" rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})} style={{ gridColumn: 'span 3' }} />
          <input className="input" placeholder="Assignee" value={form.assignee} onChange={e => setForm({...form, assignee: e.target.value})} />
          <select className="input" value={form.department} onChange={e => setForm({...form, department: e.target.value})}><option>Marketing</option><option>Production</option><option>Sales</option><option>Distribution</option><option>Finance</option><option>Creative</option><option>Digital</option><option>PR</option><option>R&D</option></select>
          <input className="input" type="date" value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})} />
          <input className="input" placeholder="Tags (comma separated)" value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} />
          <select className="input" value={form.effort} onChange={e => setForm({...form, effort: e.target.value})}><option>Small</option><option>Medium</option><option>Large</option><option>Epic</option></select>
        </div>
        <button className="btn-primary" style={{ marginTop: 10 }} onClick={addTask}>Create Task</button>
      </div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, minHeight: 200 }}>
        {statuses.map(status => <div key={status} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}><span>{status}</span><span style={{ opacity: 0.4 }}>{filtered.filter(t=>t.status===status).length}</span></div>
          {filtered.filter(t => t.status === status).map(t => <div key={t.id} className="card" style={{ padding: 10, marginBottom: 8, cursor: 'pointer' }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{t.title}</div>
            <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 6 }}>{t.department} {t.assignee ? '• ' + t.assignee : ''}</div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ padding: '1px 6px', borderRadius: 3, fontSize: 10, background: t.priority==='Urgent'?'#ef4444':t.priority==='High'?'#f59e0b':t.priority==='Medium'?'#3b82f6':'#6b7280', color: '#fff' }}>{t.priority}</span>
              {t.dueDate && <span style={{ fontSize: 10, opacity: 0.5 }}>{t.dueDate}</span>}
              <select className="input" style={{ fontSize: 10, padding: '1px 4px', marginLeft: 'auto', width: 90 }} value={t.status} onChange={e => updateStatus(t.id, e.target.value)}>{statuses.map(s => <option key={s}>{s}</option>)}</select>
              <button onClick={() => deleteTask(t.id)} style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer',padding:0}}><Trash2 size={12}/></button>
            </div>
          </div>)}
        </div>)}
      </div>
    </div>
  );
}

function OmenProjectTracker() {
  const [projects, setProjects] = useState(() => JSON.parse(localStorage.getItem('protocol_omen_projects') || '[]'));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', status: 'Planning', owner: '', startDate: '', endDate: '', budget: '', department: 'Marketing' });
  const save = (d) => { setProjects(d); localStorage.setItem('protocol_omen_projects', JSON.stringify(d)); };
  const addProject = () => { if (!form.name) return; save([...projects, { ...form, id: Date.now(), budget: Number(form.budget) || 0, milestones: [], createdAt: new Date().toISOString() }]); setForm({ name: '', description: '', status: 'Planning', owner: '', startDate: '', endDate: '', budget: '', department: 'Marketing' }); setShowForm(false); };
  const updateStatus = (id, status) => save(projects.map(p => p.id === id ? { ...p, status } : p));
  const deleteProject = (id) => save(projects.filter(p => p.id !== id));
  const tasks = JSON.parse(localStorage.getItem('protocol_omen_tasks') || '[]');
  return (
    <div className="tool-page"><h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Layers size={22} /> Project Tracker</h2>
      <div className="stats-row">{[['Total Projects', projects.length, '#a855f7'], ['Active', projects.filter(p=>p.status==='Active').length, '#10b981'], ['Planning', projects.filter(p=>p.status==='Planning').length, '#3b82f6'], ['Tasks', tasks.length, '#f59e0b']].map(([l,v,c]) => <div key={l} className="stat-card"><div style={{fontSize:12,opacity:0.6}}>{l}</div><div style={{fontSize:24,fontWeight:700,color:c}}>{v}</div></div>)}</div>
      <button className="btn-primary" onClick={() => setShowForm(!showForm)} style={{ marginBottom: 16 }}>+ New Project</button>
      {showForm && <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <input className="input" placeholder="Project name *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          <select className="input" value={form.department} onChange={e => setForm({...form, department: e.target.value})}><option>Marketing</option><option>Production</option><option>Sales</option><option>Distribution</option><option>Finance</option><option>Creative</option><option>Digital</option><option>PR</option><option>R&D</option><option>Cross-functional</option></select>
          <textarea className="input" placeholder="Description" rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})} style={{ gridColumn: 'span 2' }} />
          <input className="input" placeholder="Owner" value={form.owner} onChange={e => setForm({...form, owner: e.target.value})} />
          <input className="input" type="number" placeholder="Budget (₹)" value={form.budget} onChange={e => setForm({...form, budget: e.target.value})} />
          <input className="input" type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} />
          <input className="input" type="date" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} />
        </div>
        <button className="btn-primary" style={{ marginTop: 10 }} onClick={addProject}>Create Project</button>
      </div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
        {projects.map(p => <div key={p.id} className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
            <div><div style={{ fontWeight: 700, fontSize: 15 }}>{p.name}</div><div style={{ fontSize: 12, opacity: 0.5 }}>{p.department} • {p.owner || 'Unassigned'}</div></div>
            <button onClick={() => deleteProject(p.id)} style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer'}}><Trash2 size={14}/></button>
          </div>
          {p.description && <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>{p.description}</div>}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 }}>
            <select className="input" style={{ fontSize: 11, padding: '2px 6px' }} value={p.status} onChange={e => updateStatus(p.id, e.target.value)}><option>Planning</option><option>Active</option><option>On Hold</option><option>Completed</option><option>Cancelled</option></select>
            {p.budget > 0 && <span style={{ opacity: 0.5 }}>₹{p.budget.toLocaleString()}</span>}
            {p.startDate && <span style={{ opacity: 0.5 }}>{p.startDate} → {p.endDate || '?'}</span>}
          </div>
        </div>)}
      </div>
    </div>
  );
}

function OmenTimeline() {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const [goal, setGoal] = useState('');
  const generateTimeline = async () => {
    setAiLoading(true);
    try {
      const projects = JSON.parse(localStorage.getItem('protocol_omen_projects') || '[]');
      const tasks = JSON.parse(localStorage.getItem('protocol_omen_tasks') || '[]');
      const res = await callClaude(`You are a project management expert for an FMCG food brand (Kiro Foods India, pre-launch). Goal: "${goal || 'Full brand launch'}". Current projects: ${JSON.stringify(projects.slice(0,10))}. Current tasks: ${JSON.stringify(tasks.slice(0,20))}. Generate a comprehensive project timeline with: Gantt-style breakdown (in markdown table), critical path identification, dependencies between tasks, milestone markers, resource allocation suggestions, risk flags, weekly sprint breakdown for next 4 weeks. Include cross-departmental dependencies (Marketing, Production, Distribution, Finance).`, SYSTEM_PROMPTS.strategy);
      setAiResult(res);
    } catch(e) { setAiResult('Error: ' + e.message); }
    setAiLoading(false);
  };
  return (
    <div className="tool-page"><h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><CalendarDays size={22} /> Timeline Generator</h2>
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 12 }}>AI-powered project timeline generator. Uses your projects and tasks data to create Gantt-style breakdowns with dependencies and critical paths.</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <input className="input" placeholder="Goal (e.g., Product launch in Q3, Marketing campaign)" value={goal} onChange={e => setGoal(e.target.value)} style={{ flex: 1 }} />
          <button className="btn-primary" onClick={generateTimeline} disabled={aiLoading}>{aiLoading ? 'Generating...' : '✦ Generate Timeline'}</button>
        </div>
      </div>
      {aiResult && <div className="card" style={{ padding: 20, maxHeight: 600, overflow: 'auto' }}><ReactMarkdown>{aiResult}</ReactMarkdown></div>}
    </div>
  );
}

function OmenMeetingNotes() {
  const [meetings, setMeetings] = useState(() => JSON.parse(localStorage.getItem('protocol_omen_meetings') || '[]'));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', date: new Date().toISOString().slice(0,10), attendees: '', agenda: '', notes: '', actionItems: '', department: 'Cross-functional' });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const save = (d) => { setMeetings(d); localStorage.setItem('protocol_omen_meetings', JSON.stringify(d)); };
  const addMeeting = () => { if (!form.title) return; save([...meetings, { ...form, id: Date.now() }]); setForm({ title: '', date: new Date().toISOString().slice(0,10), attendees: '', agenda: '', notes: '', actionItems: '', department: 'Cross-functional' }); setShowForm(false); };
  const deleteMeeting = (id) => save(meetings.filter(m => m.id !== id));
  const generateMOM = async (meeting) => {
    setAiLoading(true);
    try {
      const res = await callClaude(`You are an executive assistant for Kiro Foods India. Generate professional Minutes of Meeting (MOM) from these details: Title: ${meeting.title}, Date: ${meeting.date}, Attendees: ${meeting.attendees}, Agenda: ${meeting.agenda}, Notes: ${meeting.notes}. Format with: header, attendees list, agenda items discussed, key decisions, action items with owners and deadlines, next meeting date suggestion. Make it professional and actionable.`, SYSTEM_PROMPTS.strategy);
      setAiResult(res);
    } catch(e) { setAiResult('Error: ' + e.message); }
    setAiLoading(false);
  };
  return (
    <div className="tool-page"><h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><FileText size={22} /> Meeting Notes</h2>
      <button className="btn-primary" onClick={() => setShowForm(!showForm)} style={{ marginBottom: 16 }}>+ New Meeting</button>
      {showForm && <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <input className="input" placeholder="Meeting title *" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
          <input className="input" type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
          <input className="input" placeholder="Attendees" value={form.attendees} onChange={e => setForm({...form, attendees: e.target.value})} style={{ gridColumn: 'span 2' }} />
          <textarea className="input" placeholder="Agenda" rows={2} value={form.agenda} onChange={e => setForm({...form, agenda: e.target.value})} style={{ gridColumn: 'span 2' }} />
          <textarea className="input" placeholder="Notes" rows={3} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} style={{ gridColumn: 'span 2' }} />
          <textarea className="input" placeholder="Action items" rows={2} value={form.actionItems} onChange={e => setForm({...form, actionItems: e.target.value})} style={{ gridColumn: 'span 2' }} />
        </div>
        <button className="btn-primary" style={{ marginTop: 10 }} onClick={addMeeting}>Save Meeting</button>
      </div>}
      {aiResult && <div className="card" style={{ padding: 16, marginBottom: 16, maxHeight: 400, overflow: 'auto' }}><ReactMarkdown>{aiResult}</ReactMarkdown></div>}
      <div style={{ display: 'grid', gap: 12 }}>
        {meetings.sort((a,b) => b.date?.localeCompare(a.date)).map(m => <div key={m.id} className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div><div style={{ fontWeight: 700 }}>{m.title}</div><div style={{ fontSize: 12, opacity: 0.5 }}>{m.date} • {m.attendees}</div></div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => generateMOM(m)} disabled={aiLoading} style={{ background: 'none', border: '1px solid #a855f7', color: '#a855f7', borderRadius: 4, padding: '2px 8px', fontSize: 11, cursor: 'pointer' }}>✦ MOM</button>
              <button onClick={() => deleteMeeting(m.id)} style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer'}}><Trash2 size={14}/></button>
            </div>
          </div>
          {m.notes && <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>{m.notes.slice(0, 200)}{m.notes.length > 200 ? '...' : ''}</div>}
          {m.actionItems && <div style={{ fontSize: 12, marginTop: 6, padding: '6px 8px', background: 'rgba(168,85,247,0.1)', borderRadius: 4 }}><strong>Actions:</strong> {m.actionItems}</div>}
        </div>)}
      </div>
    </div>
  );
}

function OmenBriefBuilder() {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const [form, setForm] = useState({ type: 'Campaign Brief', objective: '', audience: '', budget: '', timeline: '', channels: '', notes: '' });
  const generateBrief = async () => {
    setAiLoading(true);
    try {
      const res = await callClaude(`You are a senior account manager at an FMCG marketing agency for Kiro Foods India (pre-launch clean-label RTE/RTC brand). Generate a professional ${form.type}. Details — Objective: ${form.objective}, Target Audience: ${form.audience}, Budget: ${form.budget || 'TBD'}, Timeline: ${form.timeline || 'TBD'}, Channels: ${form.channels || 'All'}, Additional Notes: ${form.notes}. Include: background, objective, target audience, key message, deliverables, KPIs, timeline, budget allocation, approval workflow. Make it agency-ready.`, SYSTEM_PROMPTS.strategy);
      setAiResult(res);
    } catch(e) { setAiResult('Error: ' + e.message); }
    setAiLoading(false);
  };
  return (
    <div className="tool-page"><h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Feather size={22} /> Brief Builder</h2>
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <select className="input" value={form.type} onChange={e => setForm({...form, type: e.target.value})}><option>Campaign Brief</option><option>Creative Brief</option><option>Media Brief</option><option>PR Brief</option><option>Digital Brief</option><option>Production Brief</option><option>Research Brief</option></select>
          <input className="input" placeholder="Budget" value={form.budget} onChange={e => setForm({...form, budget: e.target.value})} />
          <input className="input" placeholder="Objective *" value={form.objective} onChange={e => setForm({...form, objective: e.target.value})} style={{ gridColumn: 'span 2' }} />
          <input className="input" placeholder="Target audience" value={form.audience} onChange={e => setForm({...form, audience: e.target.value})} />
          <input className="input" placeholder="Timeline" value={form.timeline} onChange={e => setForm({...form, timeline: e.target.value})} />
          <input className="input" placeholder="Channels" value={form.channels} onChange={e => setForm({...form, channels: e.target.value})} />
          <input className="input" placeholder="Additional notes" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
        </div>
        <button className="btn-primary" style={{ marginTop: 12 }} onClick={generateBrief} disabled={aiLoading || !form.objective}>{aiLoading ? 'Generating...' : '✦ Generate Brief'}</button>
      </div>
      {aiResult && <div className="card" style={{ padding: 20, maxHeight: 600, overflow: 'auto' }}><ReactMarkdown>{aiResult}</ReactMarkdown></div>}
    </div>
  );
}

function OmenDependencyMap() {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const generateMap = async () => {
    setAiLoading(true);
    try {
      const projects = JSON.parse(localStorage.getItem('protocol_omen_projects') || '[]');
      const tasks = JSON.parse(localStorage.getItem('protocol_omen_tasks') || '[]');
      const partners = JSON.parse(localStorage.getItem('protocol_harbor_partners') || '[]');
      const plans = JSON.parse(localStorage.getItem('protocol_deadlock_plans') || '[]');
      const res = await callClaude(`You are a project management expert for Kiro Foods India. Map all cross-functional dependencies. Data: Projects: ${JSON.stringify(projects.slice(0,10))}. Tasks: ${JSON.stringify(tasks.slice(0,20))}. Distribution partners: ${partners.length} total. Production plans: ${JSON.stringify(plans.slice(0,10))}. Generate: dependency matrix between departments, critical blockers, bottleneck analysis, resource conflicts, recommended sequencing, risk register with probability and impact scores. Identify which tasks block others across Marketing, Production, Distribution, Finance. Format as actionable dependency report.`, SYSTEM_PROMPTS.strategy);
      setAiResult(res);
    } catch(e) { setAiResult('Error: ' + e.message); }
    setAiLoading(false);
  };
  return (
    <div className="tool-page"><h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Waypoints size={22} /> Dependency Map</h2>
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 12 }}>AI-powered cross-functional dependency analysis. Maps blockers between Marketing, Production, Distribution, and Finance using all agent data.</p>
        <button className="btn-primary" onClick={generateMap} disabled={aiLoading}>{aiLoading ? 'Mapping...' : '✦ Generate Dependency Map'}</button>
      </div>
      {aiResult && <div className="card" style={{ padding: 20, maxHeight: 600, overflow: 'auto' }}><ReactMarkdown>{aiResult}</ReactMarkdown></div>}
    </div>
  );
}

function OmenSOWGenerator() {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const [form, setForm] = useState({ vendorName: '', scope: '', deliverables: '', timeline: '', budget: '', paymentTerms: '' });
  const generateSOW = async () => {
    setAiLoading(true);
    try {
      const res = await callClaude(`You are a procurement and project management expert for Kiro Foods India. Generate a professional Statement of Work (SOW). Vendor: ${form.vendorName}, Scope: ${form.scope}, Deliverables: ${form.deliverables}, Timeline: ${form.timeline || 'TBD'}, Budget: ${form.budget || 'TBD'}, Payment Terms: ${form.paymentTerms || 'milestone-based'}. Include: project overview, scope of work, deliverables with acceptance criteria, timeline/milestones, payment schedule, roles & responsibilities, assumptions, change management process, confidentiality, termination clause. Indian contract standards.`, SYSTEM_PROMPTS.strategy);
      setAiResult(res);
    } catch(e) { setAiResult('Error: ' + e.message); }
    setAiLoading(false);
  };
  return (
    <div className="tool-page"><h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><FileCheck size={22} /> SOW Generator</h2>
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <input className="input" placeholder="Vendor name *" value={form.vendorName} onChange={e => setForm({...form, vendorName: e.target.value})} />
          <input className="input" placeholder="Budget" value={form.budget} onChange={e => setForm({...form, budget: e.target.value})} />
          <textarea className="input" placeholder="Scope of work *" rows={2} value={form.scope} onChange={e => setForm({...form, scope: e.target.value})} style={{ gridColumn: 'span 2' }} />
          <textarea className="input" placeholder="Deliverables" rows={2} value={form.deliverables} onChange={e => setForm({...form, deliverables: e.target.value})} style={{ gridColumn: 'span 2' }} />
          <input className="input" placeholder="Timeline" value={form.timeline} onChange={e => setForm({...form, timeline: e.target.value})} />
          <input className="input" placeholder="Payment terms" value={form.paymentTerms} onChange={e => setForm({...form, paymentTerms: e.target.value})} />
        </div>
        <button className="btn-primary" style={{ marginTop: 12 }} onClick={generateSOW} disabled={aiLoading || !form.vendorName}>{aiLoading ? 'Generating...' : '✦ Generate SOW'}</button>
      </div>
      {aiResult && <div className="card" style={{ padding: 20, maxHeight: 600, overflow: 'auto' }}><ReactMarkdown>{aiResult}</ReactMarkdown></div>}
    </div>
  );
}

// =============================================
// SKYE — Influencer Management
// =============================================

function SkyeInfluencerDB() {
  const [influencers, setInfluencers] = useState(() => JSON.parse(localStorage.getItem('protocol_skye_influencers') || '[]'));
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [filterTier, setFilterTier] = useState('All');
  const [viewInfluencer, setViewInfluencer] = useState(null);
  const [form, setForm] = useState({ name: '', handle: '', platform: 'Instagram', tier: 'Micro', niche: 'Food', followers: '', engagement: '', city: '', state: '', language: '', phone: '', email: '', rate: '', pastBrands: '', notes: '' });
  const save = (d) => { setInfluencers(d); localStorage.setItem('protocol_skye_influencers', JSON.stringify(d)); };
  const addInfluencer = () => { if (!form.name || !form.handle) return; save([...influencers, { ...form, id: Date.now(), followers: Number(form.followers) || 0, engagement: Number(form.engagement) || 0, rate: Number(form.rate) || 0, status: 'Prospect', createdAt: new Date().toISOString() }]); setForm({ name: '', handle: '', platform: 'Instagram', tier: 'Micro', niche: 'Food', followers: '', engagement: '', city: '', state: '', language: '', phone: '', email: '', rate: '', pastBrands: '', notes: '' }); setShowForm(false); };
  const deleteInfluencer = (id) => save(influencers.filter(i => i.id !== id));
  const tiers = ['All', 'Nano', 'Micro', 'Mid', 'Macro', 'Mega', 'Celebrity'];
  const filtered = influencers.filter(i => (filterTier === 'All' || i.tier === filterTier) && (!search || i.name.toLowerCase().includes(search.toLowerCase()) || i.handle.toLowerCase().includes(search.toLowerCase())));
  const totalReach = influencers.reduce((s, i) => s + i.followers, 0);
  return (
    <div className="tool-page"><h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Users size={22} /> Influencer Database</h2>
      <div className="stats-row">{[['Total Influencers', influencers.length, '#a855f7'], ['Total Reach', totalReach > 1000000 ? (totalReach/1000000).toFixed(1) + 'M' : totalReach > 1000 ? (totalReach/1000).toFixed(0) + 'K' : totalReach, '#3b82f6'], ['Avg Engagement', influencers.length ? (influencers.reduce((s,i)=>s+i.engagement,0)/influencers.length).toFixed(1) + '%' : '0%', '#10b981'], ['Active', influencers.filter(i=>i.status==='Active').length, '#f59e0b']].map(([l,v,c]) => <div key={l} className="stat-card"><div style={{fontSize:12,opacity:0.6}}>{l}</div><div style={{fontSize:24,fontWeight:700,color:c}}>{v}</div></div>)}</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input className="input" placeholder="Search influencers..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1 }} />
        <select className="input" value={filterTier} onChange={e => setFilterTier(e.target.value)} style={{ width: 120 }}>{tiers.map(t => <option key={t}>{t}</option>)}</select>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>+ Add Influencer</button>
      </div>
      {showForm && <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <input className="input" placeholder="Name *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          <input className="input" placeholder="@handle *" value={form.handle} onChange={e => setForm({...form, handle: e.target.value})} />
          <select className="input" value={form.platform} onChange={e => setForm({...form, platform: e.target.value})}><option>Instagram</option><option>YouTube</option><option>Twitter/X</option><option>LinkedIn</option><option>Facebook</option><option>Moj/Josh</option><option>Multiple</option></select>
          <select className="input" value={form.tier} onChange={e => setForm({...form, tier: e.target.value})}><option>Nano</option><option>Micro</option><option>Mid</option><option>Macro</option><option>Mega</option><option>Celebrity</option></select>
          <select className="input" value={form.niche} onChange={e => setForm({...form, niche: e.target.value})}><option>Food</option><option>Health/Fitness</option><option>Lifestyle</option><option>Cooking</option><option>Mom/Parenting</option><option>Regional Food</option><option>Nutrition</option><option>Entertainment</option><option>Tech</option></select>
          <input className="input" type="number" placeholder="Followers" value={form.followers} onChange={e => setForm({...form, followers: e.target.value})} />
          <input className="input" type="number" placeholder="Engagement %" value={form.engagement} onChange={e => setForm({...form, engagement: e.target.value})} />
          <input className="input" placeholder="City" value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
          <input className="input" placeholder="Language" value={form.language} onChange={e => setForm({...form, language: e.target.value})} />
          <input className="input" placeholder="Phone" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
          <input className="input" placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
          <input className="input" type="number" placeholder="Rate per post (₹)" value={form.rate} onChange={e => setForm({...form, rate: e.target.value})} />
          <input className="input" placeholder="Past brand collabs" value={form.pastBrands} onChange={e => setForm({...form, pastBrands: e.target.value})} style={{ gridColumn: 'span 2' }} />
        </div>
        <button className="btn-primary" style={{ marginTop: 10 }} onClick={addInfluencer}>Save Influencer</button>
      </div>}
      {viewInfluencer && <div className="modal-overlay" onClick={() => setViewInfluencer(null)}><div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <h3>{viewInfluencer.name}</h3>
        <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 12 }}>@{viewInfluencer.handle} • {viewInfluencer.platform} • {viewInfluencer.tier}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13, marginBottom: 16 }}>
          <div><span style={{opacity:0.5}}>Followers:</span> {viewInfluencer.followers?.toLocaleString()}</div>
          <div><span style={{opacity:0.5}}>Engagement:</span> {viewInfluencer.engagement}%</div>
          <div><span style={{opacity:0.5}}>Niche:</span> {viewInfluencer.niche}</div>
          <div><span style={{opacity:0.5}}>City:</span> {viewInfluencer.city || '—'}</div>
          <div><span style={{opacity:0.5}}>Language:</span> {viewInfluencer.language || '—'}</div>
          <div><span style={{opacity:0.5}}>Rate:</span> ₹{viewInfluencer.rate?.toLocaleString() || '—'}/post</div>
          <div style={{gridColumn:'span 2'}}><span style={{opacity:0.5}}>Past Brands:</span> {viewInfluencer.pastBrands || '—'}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {viewInfluencer.phone && <a href={`tel:${viewInfluencer.phone}`} className="btn-primary" style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}><Phone size={14}/> Call</a>}
          {viewInfluencer.phone && <a href={`https://wa.me/91${viewInfluencer.phone.replace(/\D/g,'')}`} target="_blank" className="btn-secondary" style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}>WhatsApp</a>}
          {viewInfluencer.email && <a href={`mailto:${viewInfluencer.email}`} className="btn-secondary" style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}><Mail size={14}/> Email</a>}
          <a href={`https://instagram.com/${viewInfluencer.handle.replace('@','')}`} target="_blank" className="btn-secondary" style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}><Instagram size={14}/> Profile</a>
        </div>
      </div></div>}
      <div className="table-wrapper"><table className="data-table"><thead><tr><th>Name</th><th>Handle</th><th>Platform</th><th>Tier</th><th>Followers</th><th>ER%</th><th>Niche</th><th>Rate</th><th>Actions</th></tr></thead><tbody>
        {filtered.map(i => <tr key={i.id} onClick={() => setViewInfluencer(i)} style={{ cursor: 'pointer' }}>
          <td style={{fontWeight:600}}>{i.name}</td><td style={{opacity:0.7}}>@{i.handle}</td><td>{i.platform}</td>
          <td><span style={{padding:'2px 6px',borderRadius:3,fontSize:10,background:i.tier==='Celebrity'?'#a855f7':i.tier==='Mega'?'#ef4444':i.tier==='Macro'?'#f59e0b':'#3b82f6',color:'#fff'}}>{i.tier}</span></td>
          <td>{i.followers?.toLocaleString()}</td><td>{i.engagement}%</td><td>{i.niche}</td><td>₹{i.rate?.toLocaleString()}</td>
          <td><button onClick={e => { e.stopPropagation(); deleteInfluencer(i.id); }} style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer'}}><Trash2 size={14}/></button></td></tr>)}
      </tbody></table></div>
    </div>
  );
}

function SkyeCampaignManager() {
  const [campaigns, setCampaigns] = useState(() => JSON.parse(localStorage.getItem('protocol_skye_campaigns') || '[]'));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', objective: '', platform: 'Instagram', type: 'Product Review', budget: '', startDate: '', endDate: '', hashtag: '', deliverables: '', status: 'Draft' });
  const save = (d) => { setCampaigns(d); localStorage.setItem('protocol_skye_campaigns', JSON.stringify(d)); };
  const addCampaign = () => { if (!form.name) return; save([...campaigns, { ...form, id: Date.now(), budget: Number(form.budget) || 0, influencers: [], createdAt: new Date().toISOString() }]); setForm({ name: '', objective: '', platform: 'Instagram', type: 'Product Review', budget: '', startDate: '', endDate: '', hashtag: '', deliverables: '', status: 'Draft' }); setShowForm(false); };
  const updateStatus = (id, status) => save(campaigns.map(c => c.id === id ? { ...c, status } : c));
  const deleteCampaign = (id) => save(campaigns.filter(c => c.id !== id));
  const totalBudget = campaigns.reduce((s, c) => s + c.budget, 0);
  return (
    <div className="tool-page"><h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Megaphone size={22} /> Campaign Manager</h2>
      <div className="stats-row">{[['Campaigns', campaigns.length, '#a855f7'], ['Active', campaigns.filter(c=>c.status==='Live').length, '#10b981'], ['Total Budget', '₹' + totalBudget.toLocaleString(), '#3b82f6']].map(([l,v,c]) => <div key={l} className="stat-card"><div style={{fontSize:12,opacity:0.6}}>{l}</div><div style={{fontSize:24,fontWeight:700,color:c}}>{v}</div></div>)}</div>
      <button className="btn-primary" onClick={() => setShowForm(!showForm)} style={{ marginBottom: 16 }}>+ New Campaign</button>
      {showForm && <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <input className="input" placeholder="Campaign name *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} style={{ gridColumn: 'span 2' }} />
          <select className="input" value={form.type} onChange={e => setForm({...form, type: e.target.value})}><option>Product Review</option><option>Brand Awareness</option><option>Recipe Creation</option><option>Unboxing</option><option>Giveaway</option><option>Event Coverage</option><option>Long-term Ambassador</option></select>
          <input className="input" placeholder="Objective" value={form.objective} onChange={e => setForm({...form, objective: e.target.value})} style={{ gridColumn: 'span 2' }} />
          <select className="input" value={form.platform} onChange={e => setForm({...form, platform: e.target.value})}><option>Instagram</option><option>YouTube</option><option>Twitter/X</option><option>Multi-platform</option></select>
          <input className="input" type="number" placeholder="Budget (₹)" value={form.budget} onChange={e => setForm({...form, budget: e.target.value})} />
          <input className="input" type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} />
          <input className="input" type="date" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} />
          <input className="input" placeholder="#hashtag" value={form.hashtag} onChange={e => setForm({...form, hashtag: e.target.value})} />
          <input className="input" placeholder="Deliverables (e.g., 2 reels + 3 stories)" value={form.deliverables} onChange={e => setForm({...form, deliverables: e.target.value})} style={{ gridColumn: 'span 2' }} />
        </div>
        <button className="btn-primary" style={{ marginTop: 10 }} onClick={addCampaign}>Create Campaign</button>
      </div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
        {campaigns.map(c => <div key={c.id} className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div><div style={{ fontWeight: 700 }}>{c.name}</div><div style={{ fontSize: 12, opacity: 0.5 }}>{c.type} • {c.platform} {c.hashtag ? '• ' + c.hashtag : ''}</div></div>
            <button onClick={() => deleteCampaign(c.id)} style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer'}}><Trash2 size={14}/></button>
          </div>
          {c.objective && <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>{c.objective}</div>}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, fontSize: 12 }}>
            <select className="input" style={{ fontSize: 11, padding: '2px 6px' }} value={c.status} onChange={e => updateStatus(c.id, e.target.value)}><option>Draft</option><option>Outreach</option><option>Negotiation</option><option>Live</option><option>Completed</option><option>Cancelled</option></select>
            {c.budget > 0 && <span style={{ opacity: 0.5 }}>₹{c.budget.toLocaleString()}</span>}
            {c.startDate && <span style={{ opacity: 0.5 }}>{c.startDate} → {c.endDate || '?'}</span>}
          </div>
        </div>)}
      </div>
    </div>
  );
}

function SkyeOutreach() {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const [form, setForm] = useState({ influencerName: '', platform: 'Instagram', campaignType: 'Product Review', product: '', budget: '', tone: 'Professional' });
  const generateOutreach = async () => {
    setAiLoading(true);
    try {
      const res = await callClaude(`You are an influencer marketing manager for Kiro Foods India (clean-label RTE/RTC brand). Generate personalized outreach messages for influencer: ${form.influencerName}. Platform: ${form.platform}. Campaign: ${form.campaignType}. Product: ${form.product || 'Kiro Foods range'}. Budget: ${form.budget || 'negotiable'}. Tone: ${form.tone}. Generate: 1) Initial DM (short, catchy, personalized), 2) Formal email pitch, 3) Follow-up message, 4) Negotiation template, 5) Contract terms template. Include talking points about clean-label, health-conscious, Indian flavors. Make each message feel genuine, not templated.`, SYSTEM_PROMPTS.creative);
      setAiResult(res);
    } catch(e) { setAiResult('Error: ' + e.message); }
    setAiLoading(false);
  };
  return (
    <div className="tool-page"><h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Send size={22} /> Outreach Templates</h2>
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <input className="input" placeholder="Influencer name *" value={form.influencerName} onChange={e => setForm({...form, influencerName: e.target.value})} />
          <select className="input" value={form.platform} onChange={e => setForm({...form, platform: e.target.value})}><option>Instagram</option><option>YouTube</option><option>Twitter/X</option></select>
          <select className="input" value={form.campaignType} onChange={e => setForm({...form, campaignType: e.target.value})}><option>Product Review</option><option>Recipe Creation</option><option>Brand Ambassador</option><option>Unboxing</option><option>Giveaway</option><option>Event</option></select>
          <input className="input" placeholder="Product" value={form.product} onChange={e => setForm({...form, product: e.target.value})} />
          <input className="input" placeholder="Budget per post (₹)" value={form.budget} onChange={e => setForm({...form, budget: e.target.value})} />
          <select className="input" value={form.tone} onChange={e => setForm({...form, tone: e.target.value})}><option>Professional</option><option>Casual</option><option>Enthusiastic</option><option>Premium</option></select>
        </div>
        <button className="btn-primary" style={{ marginTop: 12 }} onClick={generateOutreach} disabled={aiLoading || !form.influencerName}>{aiLoading ? 'Generating...' : '✦ Generate Outreach Pack'}</button>
      </div>
      {aiResult && <div className="card" style={{ padding: 20, maxHeight: 600, overflow: 'auto' }}><ReactMarkdown>{aiResult}</ReactMarkdown></div>}
    </div>
  );
}

function SkyeROITracker() {
  const [entries, setEntries] = useState(() => JSON.parse(localStorage.getItem('protocol_skye_roi') || '[]'));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ influencer: '', campaign: '', amountPaid: '', impressions: '', reach: '', likes: '', comments: '', shares: '', saves: '', clicks: '', conversions: '', revenue: '' });
  const save = (d) => { setEntries(d); localStorage.setItem('protocol_skye_roi', JSON.stringify(d)); };
  const addEntry = () => { if (!form.influencer || !form.amountPaid) return; save([...entries, { ...form, id: Date.now(), amountPaid: Number(form.amountPaid), impressions: Number(form.impressions) || 0, reach: Number(form.reach) || 0, likes: Number(form.likes) || 0, comments: Number(form.comments) || 0, shares: Number(form.shares) || 0, saves: Number(form.saves) || 0, clicks: Number(form.clicks) || 0, conversions: Number(form.conversions) || 0, revenue: Number(form.revenue) || 0, date: new Date().toISOString() }]); setForm({ influencer: '', campaign: '', amountPaid: '', impressions: '', reach: '', likes: '', comments: '', shares: '', saves: '', clicks: '', conversions: '', revenue: '' }); setShowForm(false); };
  const deleteEntry = (id) => save(entries.filter(e => e.id !== id));
  const totalSpend = entries.reduce((s, e) => s + e.amountPaid, 0);
  const totalRevenue = entries.reduce((s, e) => s + e.revenue, 0);
  const totalImpressions = entries.reduce((s, e) => s + e.impressions, 0);
  const cpm = totalImpressions ? ((totalSpend / totalImpressions) * 1000).toFixed(2) : 0;
  return (
    <div className="tool-page"><h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><TrendingUp size={22} /> ROI Tracker</h2>
      <div className="stats-row">{[['Total Spend', '₹' + totalSpend.toLocaleString(), '#ef4444'], ['Revenue', '₹' + totalRevenue.toLocaleString(), '#10b981'], ['ROI', totalSpend ? ((totalRevenue - totalSpend) / totalSpend * 100).toFixed(0) + '%' : '0%', totalRevenue > totalSpend ? '#10b981' : '#ef4444'], ['CPM', '₹' + cpm, '#3b82f6']].map(([l,v,c]) => <div key={l} className="stat-card"><div style={{fontSize:12,opacity:0.6}}>{l}</div><div style={{fontSize:24,fontWeight:700,color:c}}>{v}</div></div>)}</div>
      <button className="btn-primary" onClick={() => setShowForm(!showForm)} style={{ marginBottom: 16 }}>+ Log Performance</button>
      {showForm && <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <input className="input" placeholder="Influencer *" value={form.influencer} onChange={e => setForm({...form, influencer: e.target.value})} />
          <input className="input" placeholder="Campaign" value={form.campaign} onChange={e => setForm({...form, campaign: e.target.value})} />
          <input className="input" type="number" placeholder="Amount paid (₹) *" value={form.amountPaid} onChange={e => setForm({...form, amountPaid: e.target.value})} />
          <input className="input" type="number" placeholder="Impressions" value={form.impressions} onChange={e => setForm({...form, impressions: e.target.value})} />
          <input className="input" type="number" placeholder="Reach" value={form.reach} onChange={e => setForm({...form, reach: e.target.value})} />
          <input className="input" type="number" placeholder="Likes" value={form.likes} onChange={e => setForm({...form, likes: e.target.value})} />
          <input className="input" type="number" placeholder="Comments" value={form.comments} onChange={e => setForm({...form, comments: e.target.value})} />
          <input className="input" type="number" placeholder="Shares" value={form.shares} onChange={e => setForm({...form, shares: e.target.value})} />
          <input className="input" type="number" placeholder="Link clicks" value={form.clicks} onChange={e => setForm({...form, clicks: e.target.value})} />
          <input className="input" type="number" placeholder="Conversions" value={form.conversions} onChange={e => setForm({...form, conversions: e.target.value})} />
          <input className="input" type="number" placeholder="Revenue (₹)" value={form.revenue} onChange={e => setForm({...form, revenue: e.target.value})} />
        </div>
        <button className="btn-primary" style={{ marginTop: 10 }} onClick={addEntry}>Save</button>
      </div>}
      <div className="table-wrapper"><table className="data-table"><thead><tr><th>Influencer</th><th>Campaign</th><th>Paid</th><th>Impressions</th><th>Engagement</th><th>Clicks</th><th>Revenue</th><th>ROI</th><th>Del</th></tr></thead><tbody>
        {entries.map(e => { const eng = e.likes + e.comments + e.shares + e.saves; const roi = e.amountPaid ? ((e.revenue - e.amountPaid) / e.amountPaid * 100).toFixed(0) : 0; return <tr key={e.id}>
          <td style={{fontWeight:600}}>{e.influencer}</td><td>{e.campaign || '—'}</td><td>₹{e.amountPaid.toLocaleString()}</td><td>{e.impressions.toLocaleString()}</td>
          <td>{eng.toLocaleString()}</td><td>{e.clicks}</td><td>₹{e.revenue.toLocaleString()}</td>
          <td style={{color: Number(roi) >= 0 ? '#10b981' : '#ef4444', fontWeight: 600}}>{roi}%</td>
          <td><button onClick={() => deleteEntry(e.id)} style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer'}}><Trash2 size={14}/></button></td></tr>; })}
      </tbody></table></div>
    </div>
  );
}

function SkyeContentApproval() {
  const [posts, setPosts] = useState(() => JSON.parse(localStorage.getItem('protocol_skye_approvals') || '[]'));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ influencer: '', campaign: '', contentType: 'Reel', caption: '', hashtags: '', status: 'Pending Review', feedback: '' });
  const save = (d) => { setPosts(d); localStorage.setItem('protocol_skye_approvals', JSON.stringify(d)); };
  const addPost = () => { if (!form.influencer) return; save([...posts, { ...form, id: Date.now(), submittedAt: new Date().toISOString() }]); setForm({ influencer: '', campaign: '', contentType: 'Reel', caption: '', hashtags: '', status: 'Pending Review', feedback: '' }); setShowForm(false); };
  const updateStatus = (id, status) => save(posts.map(p => p.id === id ? { ...p, status } : p));
  const deletePost = (id) => save(posts.filter(p => p.id !== id));
  return (
    <div className="tool-page"><h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Eye size={22} /> Content Approval</h2>
      <div className="stats-row">{[['Total', posts.length, '#a855f7'], ['Pending', posts.filter(p=>p.status==='Pending Review').length, '#f59e0b'], ['Approved', posts.filter(p=>p.status==='Approved').length, '#10b981'], ['Revision', posts.filter(p=>p.status==='Needs Revision').length, '#ef4444']].map(([l,v,c]) => <div key={l} className="stat-card"><div style={{fontSize:12,opacity:0.6}}>{l}</div><div style={{fontSize:24,fontWeight:700,color:c}}>{v}</div></div>)}</div>
      <button className="btn-primary" onClick={() => setShowForm(!showForm)} style={{ marginBottom: 16 }}>+ Submit Content</button>
      {showForm && <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <input className="input" placeholder="Influencer *" value={form.influencer} onChange={e => setForm({...form, influencer: e.target.value})} />
          <input className="input" placeholder="Campaign" value={form.campaign} onChange={e => setForm({...form, campaign: e.target.value})} />
          <select className="input" value={form.contentType} onChange={e => setForm({...form, contentType: e.target.value})}><option>Reel</option><option>Story</option><option>Post</option><option>Video</option><option>Blog</option><option>Tweet</option></select>
          <textarea className="input" placeholder="Caption / script" rows={3} value={form.caption} onChange={e => setForm({...form, caption: e.target.value})} style={{ gridColumn: 'span 2' }} />
          <input className="input" placeholder="#hashtags" value={form.hashtags} onChange={e => setForm({...form, hashtags: e.target.value})} />
        </div>
        <button className="btn-primary" style={{ marginTop: 10 }} onClick={addPost}>Submit for Review</button>
      </div>}
      <div style={{ display: 'grid', gap: 12 }}>
        {posts.sort((a,b) => b.submittedAt?.localeCompare(a.submittedAt)).map(p => <div key={p.id} className="card" style={{ padding: 16, borderLeft: `3px solid ${p.status==='Approved'?'#10b981':p.status==='Needs Revision'?'#ef4444':'#f59e0b'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div><div style={{ fontWeight: 600 }}>{p.influencer} — {p.contentType}</div><div style={{ fontSize: 12, opacity: 0.5 }}>{p.campaign} • {new Date(p.submittedAt).toLocaleDateString()}</div></div>
            <div style={{ display: 'flex', gap: 6 }}>
              <select className="input" style={{ fontSize: 11, padding: '2px 6px' }} value={p.status} onChange={e => updateStatus(p.id, e.target.value)}><option>Pending Review</option><option>Approved</option><option>Needs Revision</option><option>Published</option></select>
              <button onClick={() => deletePost(p.id)} style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer'}}><Trash2 size={14}/></button>
            </div>
          </div>
          {p.caption && <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6, background: 'rgba(255,255,255,0.03)', padding: 8, borderRadius: 4 }}>{p.caption}</div>}
          {p.hashtags && <div style={{ fontSize: 11, color: '#3b82f6', marginTop: 4 }}>{p.hashtags}</div>}
        </div>)}
      </div>
    </div>
  );
}

function SkyeDiscovery() {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const [form, setForm] = useState({ niche: 'Food', platform: 'Instagram', tier: 'Micro', region: '', budget: '', objective: '' });
  const discover = async () => {
    setAiLoading(true);
    try {
      const existing = JSON.parse(localStorage.getItem('protocol_skye_influencers') || '[]');
      const res = await callClaude(`You are an influencer marketing strategist for Kiro Foods India (clean-label RTE/RTC food brand). Find and recommend influencers matching: Niche: ${form.niche}, Platform: ${form.platform}, Tier: ${form.tier}, Region: ${form.region || 'Pan-India'}, Budget: ${form.budget || 'Flexible'}, Objective: ${form.objective || 'Brand awareness'}. Already working with: ${existing.map(e=>e.handle).join(', ') || 'None'}. For each recommendation provide: suggested search criteria, type of content creator to look for, engagement benchmarks for the tier, rate card expectations in India, outreach approach, content format suggestions, and how they fit into Kiro Foods' brand positioning. Also suggest emerging platforms (Moj, Josh, ShareChat) for regional reach. Recommend 10-15 profile types.`, SYSTEM_PROMPTS.creative);
      setAiResult(res);
    } catch(e) { setAiResult('Error: ' + e.message); }
    setAiLoading(false);
  };
  return (
    <div className="tool-page"><h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Search size={22} /> Influencer Discovery</h2>
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <select className="input" value={form.niche} onChange={e => setForm({...form, niche: e.target.value})}><option>Food</option><option>Health/Fitness</option><option>Cooking</option><option>Lifestyle</option><option>Mom/Parenting</option><option>Regional Food</option><option>Nutrition</option></select>
          <select className="input" value={form.platform} onChange={e => setForm({...form, platform: e.target.value})}><option>Instagram</option><option>YouTube</option><option>Twitter/X</option><option>Moj/Josh</option><option>ShareChat</option><option>Multi-platform</option></select>
          <select className="input" value={form.tier} onChange={e => setForm({...form, tier: e.target.value})}><option>Nano</option><option>Micro</option><option>Mid</option><option>Macro</option><option>Mega</option><option>Mix</option></select>
          <input className="input" placeholder="Region (e.g., Mumbai, South India)" value={form.region} onChange={e => setForm({...form, region: e.target.value})} />
          <input className="input" placeholder="Budget per influencer (₹)" value={form.budget} onChange={e => setForm({...form, budget: e.target.value})} />
          <input className="input" placeholder="Objective" value={form.objective} onChange={e => setForm({...form, objective: e.target.value})} />
        </div>
        <button className="btn-primary" style={{ marginTop: 12 }} onClick={discover} disabled={aiLoading}>{aiLoading ? 'Discovering...' : '✦ Discover Influencers'}</button>
      </div>
      {aiResult && <div className="card" style={{ padding: 20, maxHeight: 600, overflow: 'auto' }}><ReactMarkdown>{aiResult}</ReactMarkdown></div>}
    </div>
  );
}

function SkyeContractGen() {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const [form, setForm] = useState({ influencerName: '', platform: 'Instagram', deliverables: '', compensation: '', duration: '', exclusivity: 'Non-exclusive', usageRights: '6 months' });
  const generateContract = async () => {
    setAiLoading(true);
    try {
      const res = await callClaude(`You are a legal expert specializing in influencer marketing contracts in India. Generate a professional influencer collaboration agreement. Brand: Kiro Foods India Pvt Ltd. Influencer: ${form.influencerName}. Platform: ${form.platform}. Deliverables: ${form.deliverables}. Compensation: ₹${form.compensation}. Duration: ${form.duration || '30 days'}. Exclusivity: ${form.exclusivity}. Content usage rights: ${form.usageRights}. Include: parties, scope of work, content guidelines, approval process, payment terms, content ownership & usage rights, exclusivity clause, FTC/ASCI disclosure requirements, confidentiality, termination, dispute resolution (Indian Arbitration Act), governing law. Make it legally sound for Indian jurisdiction.`, SYSTEM_PROMPTS.strategy);
      setAiResult(res);
    } catch(e) { setAiResult('Error: ' + e.message); }
    setAiLoading(false);
  };
  return (
    <div className="tool-page"><h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><FileText size={22} /> Contract Generator</h2>
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <input className="input" placeholder="Influencer name *" value={form.influencerName} onChange={e => setForm({...form, influencerName: e.target.value})} />
          <select className="input" value={form.platform} onChange={e => setForm({...form, platform: e.target.value})}><option>Instagram</option><option>YouTube</option><option>Twitter/X</option><option>Multi-platform</option></select>
          <input className="input" placeholder="Deliverables (e.g., 3 reels + 5 stories)" value={form.deliverables} onChange={e => setForm({...form, deliverables: e.target.value})} style={{ gridColumn: 'span 2' }} />
          <input className="input" placeholder="Compensation (₹)" value={form.compensation} onChange={e => setForm({...form, compensation: e.target.value})} />
          <input className="input" placeholder="Duration (e.g., 30 days, 3 months)" value={form.duration} onChange={e => setForm({...form, duration: e.target.value})} />
          <select className="input" value={form.exclusivity} onChange={e => setForm({...form, exclusivity: e.target.value})}><option>Non-exclusive</option><option>Category exclusive (food)</option><option>Full exclusive</option></select>
          <select className="input" value={form.usageRights} onChange={e => setForm({...form, usageRights: e.target.value})}><option>Campaign only</option><option>3 months</option><option>6 months</option><option>1 year</option><option>Perpetual</option></select>
        </div>
        <button className="btn-primary" style={{ marginTop: 12 }} onClick={generateContract} disabled={aiLoading || !form.influencerName}>{aiLoading ? 'Generating...' : '✦ Generate Contract'}</button>
      </div>
      {aiResult && <div className="card" style={{ padding: 20, maxHeight: 600, overflow: 'auto' }}><ReactMarkdown>{aiResult}</ReactMarkdown></div>}
    </div>
  );
}

// =============================================
// USER MANAGEMENT / ADMIN PANEL
// =============================================
const ALL_TOOLS = [
  { id: 'dashboard', label: 'Dashboard', section: 'Brimstone' },
  { id: 'leads-dashboard', label: 'Leads Analytics', section: 'Brimstone' },
  { id: 'strategy-builder', label: 'Strategy Builder', section: 'Brimstone' },
  { id: 'lead-search', label: 'Lead Search', section: 'Cypher' },
  { id: 'email-extractor', label: 'Email Extractor', section: 'Cypher' },
  { id: 'my-leads', label: 'My Leads', section: 'Cypher' },
  { id: 'lead-verifier', label: 'Lead Verifier', section: 'Cypher' },
  { id: 'instagram', label: 'Instagram Scraper', section: 'Chamber' },
  { id: 'facebook', label: 'Facebook / Meta', section: 'Chamber' },
  { id: 'fb-ads', label: 'FB Ads Library', section: 'Chamber' },
  { id: 'linkedin', label: 'LinkedIn Scraper', section: 'Chamber' },
  { id: 'twitter', label: 'Twitter / X Scraper', section: 'Chamber' },
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
  // Jett — Paid Ads
  { id: 'jett-campaigns', label: 'Campaign Manager', section: 'Jett' },
  { id: 'jett-budget', label: 'Budget Optimizer', section: 'Jett' },
  { id: 'jett-roas', label: 'ROAS Tracker', section: 'Jett' },
  { id: 'jett-abtests', label: 'A/B Tests', section: 'Jett' },
  // Sage — CRM
  { id: 'sage-customers', label: 'Customer Database', section: 'Sage' },
  { id: 'sage-lifecycle', label: 'Lifecycle Tracker', section: 'Sage' },
  { id: 'sage-retention', label: 'Retention Engine', section: 'Sage' },
  { id: 'sage-churn', label: 'Churn Predictor', section: 'Sage' },
  // Viper — Email
  { id: 'viper-drip', label: 'Drip Campaigns', section: 'Viper' },
  { id: 'viper-newsletter', label: 'Newsletter Editor', section: 'Viper' },
  { id: 'viper-segments', label: 'Segmentation', section: 'Viper' },
  // Reyna — Influencer
  { id: 'reyna-discover', label: 'Influencer Discovery', section: 'Reyna' },
  { id: 'reyna-outreach', label: 'Outreach Manager', section: 'Reyna' },
  { id: 'reyna-tracker', label: 'Campaign Tracker', section: 'Reyna' },
  { id: 'reyna-ugc', label: 'UGC Hub', section: 'Reyna' },
  // Phoenix — Social Media
  { id: 'phoenix-calendar', label: 'Content Calendar', section: 'Phoenix' },
  { id: 'phoenix-scheduler', label: 'Smart Scheduler', section: 'Phoenix' },
  { id: 'phoenix-engagement', label: 'Engagement Tracker', section: 'Phoenix' },
  { id: 'phoenix-community', label: 'Community Inbox', section: 'Phoenix' },
  // Astra — Media Planning
  { id: 'astra-planner', label: 'Media Planner', section: 'Astra' },
  { id: 'astra-grp', label: 'GRP Calculator', section: 'Astra' },
  { id: 'astra-mix', label: 'Media Mix Optimizer', section: 'Astra' },
  // Fade — Attribution
  { id: 'fade-utm', label: 'UTM Builder', section: 'Fade' },
  { id: 'fade-attribution', label: 'Attribution Model', section: 'Fade' },
  { id: 'fade-funnel', label: 'Funnel Analyzer', section: 'Fade' },
  // Gekko — Community
  { id: 'gekko-broadcast', label: 'WhatsApp Broadcast', section: 'Gekko' },
  { id: 'gekko-chatbot', label: 'Chatbot Builder', section: 'Gekko' },
  { id: 'gekko-referral', label: 'Referral Program', section: 'Gekko' },
  // Breach — PR
  { id: 'breach-press', label: 'Press Releases', section: 'Breach' },
  { id: 'breach-medialist', label: 'Media List', section: 'Breach' },
  { id: 'breach-crisis', label: 'Crisis Playbook', section: 'Breach' },
  { id: 'breach-sentiment', label: 'Sentiment Monitor', section: 'Breach' },
  { id: 'harbor-distributors', label: 'Distributor DB', section: 'Harbor' },
  { id: 'harbor-onboarding', label: 'Onboarding', section: 'Harbor' },
  { id: 'harbor-schemes', label: 'Trade Schemes', section: 'Harbor' },
  { id: 'harbor-orders', label: 'Order Tracker', section: 'Harbor' },
  { id: 'harbor-territory', label: 'Territory Plan', section: 'Harbor' },
  { id: 'harbor-scorecard', label: 'Scorecard', section: 'Harbor' },
  { id: 'harbor-agreements', label: 'Agreements', section: 'Harbor' },
  { id: 'harbor-claims', label: 'Claims Tracker', section: 'Harbor' },
  { id: 'deadlock-production', label: 'Production Planner', section: 'Deadlock' },
  { id: 'deadlock-inventory', label: 'Raw Materials', section: 'Deadlock' },
  { id: 'deadlock-vendors', label: 'Vendor Manager', section: 'Deadlock' },
  { id: 'deadlock-qc', label: 'Quality Control', section: 'Deadlock' },
  { id: 'deadlock-batches', label: 'Batch Tracker', section: 'Deadlock' },
  { id: 'deadlock-cogs', label: 'COGS Calculator', section: 'Deadlock' },
  { id: 'deadlock-fssai', label: 'FSSAI Compliance', section: 'Deadlock' },
  { id: 'deadlock-recipes', label: 'Recipe Manager', section: 'Deadlock' },
  { id: 'clove-pnl', label: 'Profit & Loss', section: 'Clove' },
  { id: 'clove-expenses', label: 'Expense Tracker', section: 'Clove' },
  { id: 'clove-invoices', label: 'Invoice Generator', section: 'Clove' },
  { id: 'clove-payments', label: 'Payment Tracker', section: 'Clove' },
  { id: 'clove-cashflow', label: 'Cash Flow', section: 'Clove' },
  { id: 'clove-budgets', label: 'Budget Tracker', section: 'Clove' },
  { id: 'clove-margins', label: 'Margin Analysis', section: 'Clove' },
  { id: 'omen-tasks', label: 'Task Board', section: 'Omen' },
  { id: 'omen-projects', label: 'Project Tracker', section: 'Omen' },
  { id: 'omen-timeline', label: 'Timeline', section: 'Omen' },
  { id: 'omen-meetings', label: 'Meeting Notes', section: 'Omen' },
  { id: 'omen-briefs', label: 'Brief Builder', section: 'Omen' },
  { id: 'omen-dependencies', label: 'Dependencies', section: 'Omen' },
  { id: 'omen-sow', label: 'SOW Generator', section: 'Omen' },
  { id: 'skye-influencers', label: 'Influencer DB', section: 'Skye' },
  { id: 'skye-campaigns', label: 'Campaigns', section: 'Skye' },
  { id: 'skye-outreach', label: 'Outreach', section: 'Skye' },
  { id: 'skye-roi', label: 'ROI Tracker', section: 'Skye' },
  { id: 'skye-approvals', label: 'Content Approval', section: 'Skye' },
  { id: 'skye-discovery', label: 'Discovery', section: 'Skye' },
  { id: 'skye-contracts', label: 'Contracts', section: 'Skye' },
  { id: 'lobby-email', label: 'Protocol Mail', section: 'Lobby' },
  { id: 'settings', label: 'Settings', section: 'Lobby' },
  // Yoru — Automation
  { id: 'yoru-workflow', label: 'Rift Engine', section: 'Yoru' },
  { id: 'yoru-automations', label: 'Saved Rifts', section: 'Yoru' },
  { id: 'yoru-history', label: 'Rift History', section: 'Yoru' },
  { id: 'kayo-chat', label: 'KAY/O Chat', section: 'KAY/O' },
  { id: 'kayo-code-review', label: 'Code Review', section: 'KAY/O' },
  { id: 'kayo-git', label: 'Git Dashboard', section: 'KAY/O' },
  { id: 'kayo-deploy', label: 'Deploy Manager', section: 'KAY/O' },
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
  const [autoSync, setAutoSync] = useState(() => isAutoSyncEnabled());
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    // Auto-connect with built-in config (zero-setup)
    if (!isSyncEnabled()) {
      const ok = autoInit();
      setConnected(ok);
    }
  }, []);

  useEffect(() => {
    if (connected) {
      const pin = sessionStorage.getItem('kj_current_user') || localStorage.getItem('kj_last_user');
      if (pin) {
        getSyncStatus(pin).then(s => setSyncStatus(s));
      }
      setAutoSync(isAutoSyncEnabled());
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
    if (ok) {
      toast({ message: 'Firebase connected! Auto-sync is now active.', type: 'success' });
      // Enable auto-sync automatically on connect
      const pin = sessionStorage.getItem('kj_current_user') || localStorage.getItem('kj_last_user');
      if (pin) {
        enableAutoSync(pin);
        startRealtimeSync(pin, (update) => {
          console.log(`[PROTOCOL Sync] Received ${update.keys} updates from ${update.from}`);
        });
        setAutoSync(true);
      }
    } else {
      toast({ message: 'Failed to connect to Firebase. Check your config.', type: 'error' });
    }
  };

  const handleToggleAutoSync = () => {
    const pin = sessionStorage.getItem('kj_current_user') || localStorage.getItem('kj_last_user');
    if (!pin) { toast({ message: 'No user session found', type: 'error' }); return; }
    if (autoSync) {
      disableAutoSync();
      setAutoSync(false);
      toast({ message: 'Auto-sync disabled. Use manual push/pull.', type: 'info' });
    } else {
      enableAutoSync(pin);
      startRealtimeSync(pin, (update) => {
        console.log(`[PROTOCOL Sync] Received ${update.keys} updates from ${update.from}`);
      });
      setAutoSync(true);
      toast({ message: 'Auto-sync enabled! Changes sync automatically across devices.', type: 'success' });
    }
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
      toast({ message: result.keys > 0 ? `Pulled ${result.keys} items — reloading...` : 'No cloud data found for this user', type: result.keys > 0 ? 'success' : 'info' });
      if (result.keys > 0) setTimeout(() => window.location.reload(), 1500);
    } else {
      toast({ message: `Pull failed: ${result.error}`, type: 'error' });
    }
    setSyncing(false);
  };

  return (
    <div>
      {!connected ? (
        <>
          {/* Setup Guide */}
          <button className="btn btn-sm" onClick={() => setShowSetup(!showSetup)}
            style={{ marginBottom: 12, fontSize: 11, color: 'var(--info)', background: 'transparent', border: '1px solid rgba(56,189,248,0.3)' }}>
            <BookOpen size={12} /> {showSetup ? 'Hide' : 'Show'} Setup Guide
          </button>
          {showSetup && (
            <div style={{ padding: '12px 14px', background: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.15)', borderRadius: 'var(--radius-sm)', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.7 }}>
              <div style={{ fontWeight: 700, color: 'var(--info)', marginBottom: 6, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Quick Setup (2 min)</div>
              <div>1. Go to <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--info)' }}>console.firebase.google.com</a> → Create Project</div>
              <div>2. Go to <strong>Build → Realtime Database → Create Database</strong></div>
              <div>3. Choose any region → Start in <strong>test mode</strong></div>
              <div>4. Go to <strong>Project Settings (gear icon) → General → Your apps → Web app (&lt;/&gt;)</strong></div>
              <div>5. Register app (any name) → Copy the <strong>firebaseConfig</strong> JSON object</div>
              <div>6. Paste it below and click Connect</div>
              <div style={{ marginTop: 8, padding: '6px 10px', background: 'rgba(255,70,85,0.1)', borderRadius: 4, color: 'var(--accent)' }}>
                <strong>Same config on all devices</strong> — paste the same Firebase config on every device to sync between them. Data is linked to your PIN.
              </div>
            </div>
          )}
          <label className="label">Firebase Config (JSON)</label>
          <textarea className="input" rows={5} value={firebaseConfigStr} onChange={e => setFirebaseConfigStr(e.target.value)}
            placeholder={'{\n  "apiKey": "...",\n  "authDomain": "...",\n  "projectId": "...",\n  "databaseURL": "https://....firebaseio.com",\n  "storageBucket": "...",\n  "messagingSenderId": "...",\n  "appId": "..."\n}'}
            style={{ fontFamily: 'monospace', fontSize: 11, resize: 'vertical' }} />
          <button className="btn btn-primary" onClick={handleConnect} style={{ marginTop: 10 }}><Zap size={14} /> Connect Firebase</button>
        </>
      ) : (
        <div>
          {/* Auto-Sync Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', marginBottom: 12,
            background: autoSync ? 'rgba(34,197,94,0.08)' : 'var(--bg-tertiary)', border: `1px solid ${autoSync ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.05)'}`,
            borderRadius: 'var(--radius-sm)', transition: 'all 0.3s ease' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: autoSync ? 'var(--success)' : 'var(--text-secondary)' }}>
                <RefreshCw size={13} style={{ marginRight: 6, verticalAlign: -2 }} />
                Auto-Sync {autoSync ? 'Active' : 'Off'}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>
                {autoSync ? 'Changes sync to cloud automatically (3s debounce)' : 'Enable to sync data across all devices in real-time'}
              </div>
            </div>
            <button onClick={handleToggleAutoSync}
              style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.3s',
                background: autoSync ? 'var(--success)' : 'rgba(255,255,255,0.15)' }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3,
                left: autoSync ? 23 : 3, transition: 'left 0.3s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
            </button>
          </div>

          {/* Manual Sync Buttons */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button className="btn btn-primary" onClick={handlePush} disabled={syncing} style={{ flex: 1 }}>
              {syncing ? <><LoadingDots /> Syncing...</> : <><Send size={14} /> Push to Cloud</>}
            </button>
            <button className="btn btn-secondary" onClick={handlePull} disabled={syncing} style={{ flex: 1 }}>
              {syncing ? <><LoadingDots /> Pulling...</> : <><Download size={14} /> Pull from Cloud</>}
            </button>
          </div>

          {/* Sync Status */}
          {syncStatus && syncStatus.hasCloudData && (
            <div style={{ padding: '10px 14px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', animation: autoSync ? 'pulse 2s infinite' : 'none' }} />
                <span style={{ fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>Cloud Status</span>
              </div>
              <div>Last synced: <strong>{new Date(syncStatus.lastSync).toLocaleString()}</strong></div>
              <div>From: {syncStatus.device}</div>
              <div>Cloud items: <strong>{syncStatus.keyCount}</strong></div>
            </div>
          )}

          {/* What Syncs */}
          <div style={{ padding: '8px 12px', background: 'rgba(124,58,237,0.05)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: 'var(--radius-sm)', fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 10, lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--accent)', fontSize: 11 }}>What syncs:</strong> API keys, leads, all agent data (Jett, Sage, Viper, Reyna, Phoenix, Fade, Breach, Harbor, Deadlock, Clove, Omen, Skye, Yoru, KAY/O), email accounts, sound preferences, and more — linked to your PIN.
          </div>

          <button className="btn btn-sm" onClick={() => { localStorage.removeItem('protocol_firebase_config'); disableAutoSync(); setConnected(false); setFirebaseConfigStr(''); setAutoSync(false); }}
            style={{ marginTop: 4, fontSize: 11, color: 'var(--text-tertiary)' }}>
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

          {/* Theme Settings */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 className="card-title">Theme</h3>
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
                  Switch between dark tactical mode and light mode
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {['dark', 'light'].map(t => {
                  const current = localStorage.getItem('protocol_theme') || 'dark';
                  const isActive = current === t;
                  return (
                    <button key={t}
                      onClick={() => {
                        localStorage.setItem('protocol_theme', t);
                        document.documentElement.setAttribute('data-theme', t === 'dark' ? '' : t);
                        setToast({ message: t === 'dark' ? 'Dark mode activated' : 'Light mode activated', type: 'info' });
                        // Force re-render
                        window.location.reload();
                      }}
                      className={`btn ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
                        ...(isActive ? {} : { opacity: 0.6 }) }}
                    >
                      {t === 'dark' ? <><Flame size={14} /> Dark</> : <><Sparkles size={14} /> Light</>}
                    </button>
                  );
                })}
              </div>
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
              Access your data from any device, anywhere. All agent data syncs automatically via Firebase — just use the same PIN on each device.
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

// ========= LOBBY EMAIL — IMAP Email Client =========
function LobbyEmail() {
  const [accounts, setAccounts] = useState(() => JSON.parse(localStorage.getItem('protocol_email_accounts') || '[]'));
  const [activeAccount, setActiveAccount] = useState(null);
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [showCompose, setShowCompose] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [folder, setFolder] = useState('INBOX');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [compose, setCompose] = useState({ to: '', subject: '', body: '', cc: '', bcc: '' });
  const [showReply, setShowReply] = useState(false);
  const [newAccount, setNewAccount] = useState({ email: '', password: '', imapHost: '', imapPort: '993', smtpHost: '', smtpPort: '587', name: '' });

  const PRESET_PROVIDERS = {
    gmail: { imapHost: 'imap.gmail.com', imapPort: '993', smtpHost: 'smtp.gmail.com', smtpPort: '587' },
    outlook: { imapHost: 'outlook.office365.com', imapPort: '993', smtpHost: 'smtp.office365.com', smtpPort: '587' },
    yahoo: { imapHost: 'imap.mail.yahoo.com', imapPort: '993', smtpHost: 'smtp.mail.yahoo.com', smtpPort: '587' },
    zoho: { imapHost: 'imap.zoho.com', imapPort: '993', smtpHost: 'smtp.zoho.com', smtpPort: '587' },
    custom: { imapHost: '', imapPort: '993', smtpHost: '', smtpPort: '587' }
  };

  const folders = ['INBOX', 'Sent', 'Drafts', 'Starred', 'Archive', 'Trash'];

  const saveAccounts = (accs) => { setAccounts(accs); localStorage.setItem('protocol_email_accounts', JSON.stringify(accs)); };

  const addAccount = () => {
    if (!newAccount.email || !newAccount.password || !newAccount.imapHost) { setToast({ type: 'error', message: 'Fill required fields' }); return; }
    const acc = { ...newAccount, id: Date.now().toString(), addedAt: new Date().toISOString() };
    saveAccounts([...accounts, acc]);
    setActiveAccount(acc);
    setShowAddAccount(false);
    setNewAccount({ email: '', password: '', imapHost: '', imapPort: '993', smtpHost: '', smtpPort: '587', name: '' });
    setToast({ type: 'success', message: 'Account added' });
    // Load demo emails for this account
    loadDemoEmails(acc);
  };

  const loadDemoEmails = (acc) => {
    setLoading(true);
    // Since IMAP requires a backend proxy (browser can't do raw TCP/TLS), we simulate
    // In production, this would call a serverless function or IMAP-to-REST proxy
    setTimeout(() => {
      const demoEmails = [
        { id: '1', from: 'team@kirofoods.com', to: acc.email, subject: 'Q1 Marketing Report Ready', body: 'Hi team,\n\nThe Q1 marketing performance report is ready for review. Key highlights:\n\n- Social media engagement up 34%\n- Lead generation exceeded targets by 22%\n- Brand awareness metrics showing positive trends\n\nPlease review and share feedback by Friday.\n\nBest,\nMarketing Team', date: new Date(Date.now() - 3600000).toISOString(), read: false, starred: false, folder: 'INBOX', attachments: ['Q1_Report.pdf'] },
        { id: '2', from: 'shreyansh@kirofoods.com', to: acc.email, subject: 'Product Launch Timeline Update', body: 'Hi,\n\nUpdating the launch timeline:\n\n- Packaging finalized: March 20\n- First production batch: March 25\n- Distribution setup: April 1-5\n- Soft launch: April 10\n- Full launch: April 20\n\nLet me know if any concerns.\n\nShreyansh', date: new Date(Date.now() - 7200000).toISOString(), read: false, starred: true, folder: 'INBOX', attachments: [] },
        { id: '3', from: 'vendor@packagingco.in', to: acc.email, subject: 'RE: Packaging Proofs Approved', body: 'Dear Kiro Foods Team,\n\nThank you for approving the packaging proofs. We will begin production immediately.\n\nEstimated delivery: 5000 units by March 22.\n\nRegards,\nPackaging Co.', date: new Date(Date.now() - 86400000).toISOString(), read: true, starred: false, folder: 'INBOX', attachments: ['proof_v3.pdf', 'invoice.pdf'] },
        { id: '4', from: 'analytics@google.com', to: acc.email, subject: 'Your weekly Search Console report', body: 'Your site kirofoods.com received 1,234 clicks in the past week, up 15% from the previous period. Top queries: "healthy rte food india", "clean label ready to eat", "kiro foods".', date: new Date(Date.now() - 172800000).toISOString(), read: true, starred: false, folder: 'INBOX', attachments: [] },
        { id: '5', from: acc.email, to: 'distributor@metro.in', subject: 'Distribution Partnership Proposal', body: 'Dear Metro Team,\n\nI am writing to propose a distribution partnership for Kiro Foods products in the Western region.\n\nAttached is our product catalog and proposed terms.\n\nLooking forward to discussing.\n\nBest regards', date: new Date(Date.now() - 259200000).toISOString(), read: true, starred: false, folder: 'Sent', attachments: ['catalog.pdf'] },
        { id: '6', from: acc.email, to: 'creative@agency.com', subject: 'Draft: Campaign Brief - Summer Launch', body: 'Subject to review...', date: new Date(Date.now() - 345600000).toISOString(), read: true, starred: false, folder: 'Drafts', attachments: [] },
      ];
      setEmails(demoEmails);
      setLoading(false);
    }, 800);
  };

  const filteredEmails = emails.filter(e => {
    const inFolder = folder === 'Starred' ? e.starred : e.folder === folder;
    const matchesSearch = !searchQuery || e.subject.toLowerCase().includes(searchQuery.toLowerCase()) || e.from.toLowerCase().includes(searchQuery.toLowerCase());
    return inFolder && matchesSearch;
  });

  const removeAccount = (id) => {
    const updated = accounts.filter(a => a.id !== id);
    saveAccounts(updated);
    if (activeAccount?.id === id) { setActiveAccount(null); setEmails([]); }
  };

  const toggleStar = (id) => { setEmails(prev => prev.map(e => e.id === id ? { ...e, starred: !e.starred } : e)); };
  const markRead = (id) => { setEmails(prev => prev.map(e => e.id === id ? { ...e, read: true } : e)); };
  const moveToTrash = (id) => { setEmails(prev => prev.map(e => e.id === id ? { ...e, folder: 'Trash' } : e)); setSelectedEmail(null); };
  const archiveEmail = (id) => { setEmails(prev => prev.map(e => e.id === id ? { ...e, folder: 'Archive' } : e)); setSelectedEmail(null); };

  const sendEmail = () => {
    if (!compose.to || !compose.subject) { setToast({ type: 'error', message: 'Fill To and Subject' }); return; }
    const sent = { id: Date.now().toString(), from: activeAccount.email, to: compose.to, subject: compose.subject, body: compose.body, date: new Date().toISOString(), read: true, starred: false, folder: 'Sent', attachments: [] };
    setEmails(prev => [...prev, sent]);
    setCompose({ to: '', subject: '', body: '', cc: '', bcc: '' });
    setShowCompose(false);
    setShowReply(false);
    setToast({ type: 'success', message: 'Email sent (demo mode)' });
  };

  const replyToEmail = (email) => {
    setCompose({ to: email.from, subject: `Re: ${email.subject}`, body: `\n\n--- Original Message ---\nFrom: ${email.from}\nDate: ${new Date(email.date).toLocaleString()}\n\n${email.body}`, cc: '', bcc: '' });
    setShowReply(true);
    setShowCompose(true);
  };

  const forwardEmail = (email) => {
    setCompose({ to: '', subject: `Fwd: ${email.subject}`, body: `\n\n--- Forwarded Message ---\nFrom: ${email.from}\nTo: ${email.to}\nDate: ${new Date(email.date).toLocaleString()}\nSubject: ${email.subject}\n\n${email.body}`, cc: '', bcc: '' });
    setShowCompose(true);
  };

  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); }}, [toast]);

  return (
    <div className="tool-page">
      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
      <div className="page-header"><h1><Mail size={22} /> Protocol Mail</h1><p>Secure email client — connect IMAP/SMTP accounts</p></div>

      {!activeAccount ? (
        <div className="page-body">
          <div className="stats-row">
            {accounts.map(acc => (
              <div key={acc.id} className="stat-card" style={{cursor:'pointer'}} onClick={() => { setActiveAccount(acc); loadDemoEmails(acc); }}>
                <AtSign size={18} style={{color:'var(--accent)'}} />
                <div style={{fontSize:'14px',fontWeight:600,color:'var(--text-primary)',marginTop:8}}>{acc.name || acc.email}</div>
                <div style={{fontSize:'11px',color:'var(--text-secondary)'}}>{acc.email}</div>
                <button className="btn-secondary" style={{marginTop:8,fontSize:'11px',padding:'4px 8px'}} onClick={(e) => { e.stopPropagation(); removeAccount(acc.id); }}>Remove</button>
              </div>
            ))}
            <div className="stat-card" style={{cursor:'pointer',border:'1px dashed var(--accent)',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:8}} onClick={() => setShowAddAccount(true)}>
              <UserPlus size={24} style={{color:'var(--accent)'}} />
              <span style={{fontSize:'13px',color:'var(--text-secondary)'}}>Add Account</span>
            </div>
          </div>
          <div style={{marginTop:24,padding:16,background:'var(--bg-secondary)',borderRadius:4}}>
            <h3 style={{color:'var(--accent)',marginBottom:8}}>Setup Guide</h3>
            <p style={{fontSize:'13px',color:'var(--text-secondary)',lineHeight:1.6}}>
              <strong>Gmail:</strong> Enable "Less secure app access" or use an App Password (Settings → Security → 2-Step Verification → App Passwords).<br/>
              <strong>Outlook:</strong> Use your regular password. IMAP is enabled by default.<br/>
              <strong>Note:</strong> Browser-based IMAP requires a backend proxy for production use. Currently running in demo mode with simulated emails.
            </p>
          </div>
        </div>
      ) : (
        <div className="page-body" style={{display:'grid',gridTemplateColumns:'200px 300px 1fr',gap:0,height:'calc(100vh - 140px)',overflow:'hidden'}}>
          {/* Sidebar - Folders */}
          <div style={{borderRight:'1px solid var(--border)',padding:'12px 0',overflowY:'auto'}}>
            <div style={{padding:'0 12px',marginBottom:12}}>
              <button className="btn-primary" style={{width:'100%',fontSize:'13px'}} onClick={() => { setCompose({ to:'', subject:'', body:'', cc:'', bcc:'' }); setShowCompose(true); }}>
                <Send size={14} /> Compose
              </button>
            </div>
            {folders.map(f => (
              <div key={f} onClick={() => setFolder(f)} style={{padding:'8px 16px',cursor:'pointer',fontSize:'13px',color: folder === f ? 'var(--accent)' : 'var(--text-secondary)',background: folder === f ? 'var(--accent)11' : 'transparent',borderLeft: folder === f ? '2px solid var(--accent)' : '2px solid transparent',display:'flex',alignItems:'center',gap:8}}>
                {f === 'INBOX' ? <Inbox size={14}/> : f === 'Sent' ? <Send size={14}/> : f === 'Drafts' ? <FileText size={14}/> : f === 'Starred' ? <Star size={14}/> : f === 'Archive' ? <Archive size={14}/> : <Trash2 size={14}/>}
                {f}
                {f === 'INBOX' && <span style={{marginLeft:'auto',background:'var(--accent)',color:'#fff',borderRadius:8,padding:'1px 6px',fontSize:'10px'}}>{emails.filter(e => e.folder === 'INBOX' && !e.read).length}</span>}
              </div>
            ))}
            <div style={{borderTop:'1px solid var(--border)',margin:'12px 0',padding:'12px 16px'}}>
              <div style={{fontSize:'11px',color:'var(--text-secondary)',marginBottom:4}}>{activeAccount.email}</div>
              <button className="btn-secondary" style={{fontSize:'11px',padding:'4px 8px',width:'100%'}} onClick={() => { setActiveAccount(null); setEmails([]); setSelectedEmail(null); }}>Switch Account</button>
            </div>
          </div>

          {/* Email List */}
          <div style={{borderRight:'1px solid var(--border)',overflowY:'auto'}}>
            <div style={{padding:12,borderBottom:'1px solid var(--border)'}}>
              <input type="text" placeholder="Search emails..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="input" style={{fontSize:'12px',padding:'6px 10px'}} />
            </div>
            {loading ? <div style={{padding:24,textAlign:'center',color:'var(--text-secondary)'}}>Loading...</div> :
              filteredEmails.length === 0 ? <div style={{padding:24,textAlign:'center',color:'var(--text-secondary)',fontSize:'13px'}}>No emails in {folder}</div> :
              filteredEmails.sort((a,b) => new Date(b.date) - new Date(a.date)).map(email => (
                <div key={email.id} onClick={() => { setSelectedEmail(email); markRead(email.id); }} style={{padding:'10px 12px',borderBottom:'1px solid var(--border)',cursor:'pointer',background: selectedEmail?.id === email.id ? 'var(--accent)11' : !email.read ? 'var(--bg-tertiary)' : 'transparent'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                    <span style={{fontSize:'12px',fontWeight: !email.read ? 700 : 400,color:'var(--text-primary)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:180}}>{email.from === activeAccount.email ? `To: ${email.to}` : email.from.split('@')[0]}</span>
                    <Star size={12} style={{cursor:'pointer',color: email.starred ? '#fbbf24' : 'var(--text-secondary)',fill: email.starred ? '#fbbf24' : 'none'}} onClick={(e) => { e.stopPropagation(); toggleStar(email.id); }} />
                  </div>
                  <div style={{fontSize:'12px',fontWeight: !email.read ? 600 : 400,color:'var(--text-primary)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{email.subject}</div>
                  <div style={{display:'flex',justifyContent:'space-between',marginTop:4}}>
                    <span style={{fontSize:'10px',color:'var(--text-secondary)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:180}}>{email.body.substring(0,60)}...</span>
                    <span style={{fontSize:'10px',color:'var(--text-secondary)',whiteSpace:'nowrap'}}>{new Date(email.date).toLocaleDateString()}</span>
                  </div>
                  {email.attachments?.length > 0 && <div style={{marginTop:4}}><Paperclip size={10} style={{color:'var(--text-secondary)'}} /> <span style={{fontSize:'10px',color:'var(--text-secondary)'}}>{email.attachments.length}</span></div>}
                </div>
              ))
            }
          </div>

          {/* Email Detail / Compose */}
          <div style={{overflowY:'auto',padding:16}}>
            {showCompose ? (
              <div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                  <h3 style={{color:'var(--text-primary)',fontSize:'16px'}}>{showReply ? 'Reply' : 'New Email'}</h3>
                  <button className="btn-secondary" onClick={() => { setShowCompose(false); setShowReply(false); }}>Cancel</button>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:10}}>
                  <input className="input" placeholder="To" value={compose.to} onChange={e => setCompose({...compose, to: e.target.value})} />
                  <input className="input" placeholder="CC" value={compose.cc} onChange={e => setCompose({...compose, cc: e.target.value})} />
                  <input className="input" placeholder="Subject" value={compose.subject} onChange={e => setCompose({...compose, subject: e.target.value})} />
                  <textarea className="input" rows={12} placeholder="Write your message..." value={compose.body} onChange={e => setCompose({...compose, body: e.target.value})} style={{fontFamily:'inherit',resize:'vertical'}} />
                  <div style={{display:'flex',gap:8}}>
                    <button className="btn-primary" onClick={sendEmail}><Send size={14} /> Send</button>
                    <button className="btn-secondary"><Paperclip size={14} /> Attach</button>
                  </div>
                </div>
              </div>
            ) : selectedEmail ? (
              <div>
                <div style={{marginBottom:16}}>
                  <h2 style={{color:'var(--text-primary)',fontSize:'18px',marginBottom:8}}>{selectedEmail.subject}</h2>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div>
                      <div style={{fontSize:'13px',color:'var(--text-primary)',fontWeight:600}}>{selectedEmail.from}</div>
                      <div style={{fontSize:'11px',color:'var(--text-secondary)'}}>To: {selectedEmail.to} · {new Date(selectedEmail.date).toLocaleString()}</div>
                    </div>
                    <div style={{display:'flex',gap:6}}>
                      <button className="btn-secondary" style={{padding:'4px 8px',fontSize:'11px'}} onClick={() => replyToEmail(selectedEmail)}><Reply size={12}/> Reply</button>
                      <button className="btn-secondary" style={{padding:'4px 8px',fontSize:'11px'}} onClick={() => forwardEmail(selectedEmail)}><Forward size={12}/> Fwd</button>
                      <button className="btn-secondary" style={{padding:'4px 8px',fontSize:'11px'}} onClick={() => archiveEmail(selectedEmail.id)}><Archive size={12}/></button>
                      <button className="btn-secondary" style={{padding:'4px 8px',fontSize:'11px'}} onClick={() => moveToTrash(selectedEmail.id)}><Trash2 size={12}/></button>
                    </div>
                  </div>
                </div>
                {selectedEmail.attachments?.length > 0 && (
                  <div style={{padding:10,background:'var(--bg-secondary)',borderRadius:4,marginBottom:16,display:'flex',gap:8,flexWrap:'wrap'}}>
                    {selectedEmail.attachments.map((a,i) => (
                      <div key={i} style={{display:'flex',alignItems:'center',gap:4,padding:'4px 10px',background:'var(--bg-tertiary)',borderRadius:4,fontSize:'12px',color:'var(--text-secondary)'}}><Paperclip size={12}/> {a}</div>
                    ))}
                  </div>
                )}
                <div style={{whiteSpace:'pre-wrap',fontSize:'14px',color:'var(--text-primary)',lineHeight:1.7}}>{selectedEmail.body}</div>
              </div>
            ) : (
              <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'var(--text-secondary)',fontSize:'14px'}}>
                <div style={{textAlign:'center'}}><MailOpen size={48} style={{opacity:0.3,marginBottom:12}} /><br/>Select an email to read</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Account Modal */}
      {showAddAccount && (
        <div className="modal-overlay" onClick={() => setShowAddAccount(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{maxWidth:480}}>
            <h3 style={{color:'var(--accent)',marginBottom:16}}>Add Email Account</h3>
            <div style={{display:'flex',gap:6,marginBottom:16,flexWrap:'wrap'}}>
              {Object.keys(PRESET_PROVIDERS).map(p => (
                <button key={p} className="btn-secondary" style={{fontSize:'11px',padding:'4px 10px',textTransform:'capitalize'}} onClick={() => setNewAccount({...newAccount, ...PRESET_PROVIDERS[p]})}>{p}</button>
              ))}
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              <input className="input" placeholder="Display Name" value={newAccount.name} onChange={e => setNewAccount({...newAccount, name: e.target.value})} />
              <input className="input" placeholder="Email Address *" value={newAccount.email} onChange={e => setNewAccount({...newAccount, email: e.target.value})} />
              <input className="input" type="password" placeholder="Password / App Password *" value={newAccount.password} onChange={e => setNewAccount({...newAccount, password: e.target.value})} />
              <div style={{display:'grid',gridTemplateColumns:'1fr 100px',gap:8}}>
                <input className="input" placeholder="IMAP Host *" value={newAccount.imapHost} onChange={e => setNewAccount({...newAccount, imapHost: e.target.value})} />
                <input className="input" placeholder="Port" value={newAccount.imapPort} onChange={e => setNewAccount({...newAccount, imapPort: e.target.value})} />
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 100px',gap:8}}>
                <input className="input" placeholder="SMTP Host" value={newAccount.smtpHost} onChange={e => setNewAccount({...newAccount, smtpHost: e.target.value})} />
                <input className="input" placeholder="Port" value={newAccount.smtpPort} onChange={e => setNewAccount({...newAccount, smtpPort: e.target.value})} />
              </div>
            </div>
            <div style={{display:'flex',gap:8,marginTop:16,justifyContent:'flex-end'}}>
              <button className="btn-secondary" onClick={() => setShowAddAccount(false)}>Cancel</button>
              <button className="btn-primary" onClick={addAccount}>Add Account</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ========= YORU — Autonomous Workflow Agent (Dimensional Rift) =========
// Yoru rifts between agents, chaining their abilities autonomously to complete complex tasks.

const YORU_AGENTS = [
  { name: 'Brimstone', role: 'Strategy & Dashboard', tools: ['Dashboard overview', 'Leads analytics', 'Strategy builder'] },
  { name: 'Cypher', role: 'Lead Generation', tools: ['Lead search (Google Maps)', 'Email extraction', 'Lead verification', 'Lead management'] },
  { name: 'Chamber', role: 'Social Intelligence', tools: ['Instagram scraping', 'Facebook/Meta scraping', 'LinkedIn scraping', 'Twitter/X scraping', 'FB Ads Library'] },
  { name: 'Killjoy', role: 'SEO & Website', tools: ['Full site analysis', 'SEO dashboard', 'Site audit', 'On-page SEO', 'Backlinks', 'Rank tracking'] },
  { name: 'Sova', role: 'Research & Intel', tools: ['Keyword research', 'Keyword gap', 'Competitor keywords', 'Domain overview', 'Content research', 'Traffic insights', 'Ad intelligence', 'Brand monitoring', 'SERP scraping'] },
  { name: 'Neon', role: 'Content & Copy', tools: ['Blog writer', 'Copywriter', 'Ad creative', 'Email sequences', 'Launch planner', 'Pricing strategy', 'CRO analysis'] },
  { name: 'Jett', role: 'Paid Advertising', tools: ['Campaign manager', 'Budget optimizer', 'ROAS tracker', 'A/B tests'] },
  { name: 'Sage', role: 'CRM & Customers', tools: ['Customer database', 'Lifecycle tracker', 'Retention engine', 'Churn predictor'] },
  { name: 'Viper', role: 'Email Marketing', tools: ['Drip campaigns', 'Newsletter editor', 'Segmentation'] },
  { name: 'Reyna', role: 'Influencer Marketing', tools: ['Influencer discovery', 'Outreach', 'Campaign tracking', 'UGC hub'] },
  { name: 'Phoenix', role: 'Social Media Mgmt', tools: ['Content calendar', 'Scheduler', 'Engagement tracking', 'Community inbox'] },
  { name: 'Astra', role: 'Media Planning', tools: ['Media planner', 'GRP calculator', 'Media mix optimizer'] },
  { name: 'Fade', role: 'Analytics & Attribution', tools: ['UTM builder', 'Attribution model', 'Funnel analyzer'] },
  { name: 'Gekko', role: 'Community & Growth', tools: ['WhatsApp broadcast', 'Chatbot builder', 'Referral program'] },
  { name: 'Breach', role: 'PR & Comms', tools: ['Press releases', 'Media list', 'Crisis playbook', 'Sentiment monitor'] },
  { name: 'Harbor', role: 'Distribution', tools: ['Distributor DB', 'Trade schemes', 'Order tracking', 'Territory planning'] },
  { name: 'Deadlock', role: 'Production & Supply', tools: ['Production planner', 'Inventory', 'Vendor management', 'QC', 'FSSAI compliance'] },
  { name: 'Clove', role: 'Finance', tools: ['P&L', 'Expenses', 'Invoices', 'Payments', 'Cash flow', 'Budgets', 'Margins'] },
  { name: 'Omen', role: 'Task & Project Mgmt', tools: ['Task board', 'Projects', 'Timeline', 'Meeting notes', 'Brief builder', 'SOW generator'] },
  { name: 'Skye', role: 'Influencer Relations', tools: ['Influencer DB', 'Campaigns', 'Outreach', 'ROI tracking', 'Content approval', 'Contracts'] },
];

const YORU_SYSTEM = `You are YORU, the autonomous workflow orchestrator inside PROTOCOL — the Valorant-themed marketing platform for Kiro Foods India. Named after the Valorant agent Yoru, you rift between dimensions — meaning you seamlessly move between ALL other agents and their tools to complete complex tasks.

YOUR CORE ABILITY: When a user describes a task, you break it into steps, identify which agents to invoke, and execute the workflow. You think in terms of agent chains.

AVAILABLE AGENTS AND THEIR TOOLS:
${YORU_AGENTS.map(a => `• ${a.name} (${a.role}): ${a.tools.join(', ')}`).join('\n')}

KIRO FOODS CONTEXT: Pre-launch clean-label healthy Ready-to-Eat/Ready-to-Cook brand targeting health-conscious Indian consumers aged 22-40 in metro/Tier 1 cities.

WHEN A USER GIVES YOU A TASK:
1. Analyze the task and identify ALL agents needed
2. Create a step-by-step execution plan showing which agent handles each step
3. For each step, explain what data flows to the next step
4. Present your plan in this exact format:

## RIFT PLAN
**Mission:** [one-line summary]

### Step 1: [Agent Name] → [Tool]
[What this step does and what output it produces]

### Step 2: [Agent Name] → [Tool]
[What this step does, referencing output from Step 1]

[...continue for all steps...]

## DATA FLOW
[How data passes between agents]

## EXPECTED OUTPUT
[What the final deliverable looks like]

After presenting the plan, execute each step by generating the actual output/content for that step. Mark each step with ✅ when complete.

PERSONALITY: You're a dimensional rifter. You speak with cool confidence. You slip between agents like you're tearing through reality. Short sentences. Tactical. You see connections others miss. Use phrases like "rifting to...", "dimensional link established", "tearing through to [Agent]..."`;

function YoruWorkflow() {
  const [messages, setMessages] = useState(() => JSON.parse(localStorage.getItem('protocol_yoru_messages') || '[]'));
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeRift, setActiveRift] = useState(null); // which agent is currently "active"
  const [workflows, setWorkflows] = useState(() => JSON.parse(localStorage.getItem('protocol_yoru_workflows') || '[]'));
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const saveMessages = (msgs) => { setMessages(msgs); localStorage.setItem('protocol_yoru_messages', JSON.stringify(msgs.slice(-80))); };

  const sendTask = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', content: input, timestamp: new Date().toISOString() };
    const updated = [...messages, userMsg];
    saveMessages(updated);
    setInput('');
    setLoading(true);
    setActiveRift('analyzing');

    try {
      // Build conversation history for context
      const history = updated.slice(-10).map(m => `${m.role === 'user' ? 'USER' : 'YORU'}: ${m.content}`).join('\n\n');
      const fullPrompt = `CONVERSATION HISTORY:\n${history}\n\nUSER'S LATEST REQUEST: ${userMsg.content}\n\nAnalyze this task, create a rift plan identifying which agents to use, then execute each step providing real output.`;

      const response = await callClaude(fullPrompt, YORU_SYSTEM);

      // Extract agent names mentioned in the response to show rift animation
      const mentionedAgents = YORU_AGENTS.filter(a => response.includes(a.name));
      if (mentionedAgents.length > 0) {
        for (const agent of mentionedAgents) {
          setActiveRift(agent.name);
          await new Promise(r => setTimeout(r, 400));
        }
      }

      const assistantMsg = {
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
        agents: mentionedAgents.map(a => a.name)
      };
      saveMessages([...updated, assistantMsg]);

      // Auto-save as workflow if it contains a rift plan
      if (response.includes('RIFT PLAN') || response.includes('Step 1')) {
        const wf = {
          id: Date.now(),
          title: userMsg.content.slice(0, 60),
          task: userMsg.content,
          plan: response,
          agents: mentionedAgents.map(a => a.name),
          timestamp: new Date().toISOString()
        };
        const newWfs = [wf, ...workflows].slice(0, 30);
        setWorkflows(newWfs);
        localStorage.setItem('protocol_yoru_workflows', JSON.stringify(newWfs));
      }
    } catch (err) {
      const errMsg = { role: 'assistant', content: `⚠ RIFT FAILED: ${err.message}. Check your AI API key in Settings.`, timestamp: new Date().toISOString() };
      saveMessages([...updated, errMsg]);
    }
    setLoading(false);
    setActiveRift(null);
  };

  return (
    <div className="page-body" style={{ maxWidth: 900, margin: '0 auto' }}>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="page-header" style={{ borderBottom: '1px solid rgba(255,70,85,0.15)' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Waypoints size={22} style={{ color: '#ff4655' }} /> // YORU RIFT ENGINE
          </h1>
          <p className="page-header-sub">Describe a mission. Yoru chains agents autonomously.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-sm" onClick={() => { saveMessages([]); }} style={{ fontSize: 11, opacity: 0.6 }}>
            <Trash2 size={12} /> Clear
          </button>
        </div>
      </div>

      {/* Agent Rift Status Bar */}
      {activeRift && (
        <div style={{
          background: 'rgba(255,70,85,0.06)', border: '1px solid rgba(255,70,85,0.2)',
          borderRadius: 4, padding: '8px 14px', margin: '12px 0', display: 'flex',
          alignItems: 'center', gap: 10, fontSize: 12, color: '#ff4655',
          animation: 'pulse 1.5s ease-in-out infinite'
        }}>
          <Waypoints size={14} style={{ animation: 'spin 2s linear infinite' }} />
          {activeRift === 'analyzing'
            ? <span style={{ letterSpacing: 1 }}>ANALYZING DIMENSIONAL PATHS...</span>
            : <span style={{ letterSpacing: 1 }}>RIFTING TO <strong>{activeRift.toUpperCase()}</strong>...</span>
          }
        </div>
      )}

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '16px 0',
        display: 'flex', flexDirection: 'column', gap: 14,
        minHeight: 400, maxHeight: 'calc(100vh - 320px)'
      }}>
        {messages.length === 0 && (
          <div style={{ padding: '20px 0' }}>
            {/* Feature Summary */}
            <div style={{
              background: 'rgba(255,70,85,0.04)', border: '1px solid rgba(255,70,85,0.12)',
              borderRadius: 4, padding: '16px 20px', marginBottom: 16
            }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#ff4655', letterSpacing: 1.5, marginBottom: 8 }}>// WHAT IS THE RIFT ENGINE?</div>
              <div style={{ fontSize: 12, lineHeight: 1.8, color: 'var(--text-secondary)' }}>
                Yoru is your autonomous workflow agent. Describe any complex task in plain language and Yoru will
                analyze it, identify which Protocol agents are needed, create a step-by-step rift plan, and execute
                each step — chaining outputs between agents automatically. Think of it as your AI project manager
                that coordinates Cypher, Neon, Killjoy, Sage, and all other agents behind the scenes.
              </div>
            </div>

            {/* How it works */}
            <div style={{
              background: 'rgba(139,158,171,0.04)', border: '1px solid rgba(139,158,171,0.1)',
              borderRadius: 4, padding: '16px 20px', marginBottom: 16
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, marginBottom: 10, color: 'var(--text-primary)' }}>HOW IT WORKS</div>
              <div style={{ fontSize: 12, lineHeight: 1.8, color: 'var(--text-secondary)' }}>
                <strong style={{ color: 'var(--text-primary)' }}>1. Describe your mission</strong> — Write what you need done in plain language. Be as detailed as you want.<br/>
                <strong style={{ color: 'var(--text-primary)' }}>2. Yoru creates a Rift Plan</strong> — AI analyzes which agents and tools are needed, in what order.<br/>
                <strong style={{ color: 'var(--text-primary)' }}>3. Autonomous execution</strong> — Each step is executed, with data flowing from one agent to the next.<br/>
                <strong style={{ color: 'var(--text-primary)' }}>4. Auto-saved</strong> — Every workflow is saved to Saved Rifts so you can reference or re-run it later.
              </div>
            </div>

            {/* Example prompts */}
            <div style={{
              background: 'rgba(139,158,171,0.04)', border: '1px solid rgba(139,158,171,0.1)',
              borderRadius: 4, padding: '16px 20px'
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, marginBottom: 10, color: 'var(--text-primary)' }}>TRY THESE MISSIONS</div>
              <div style={{ fontSize: 12, lineHeight: 2, color: 'var(--text-tertiary)' }}>
                <span style={{ color: '#ff4655', fontWeight: 600 }}>→</span> "Find 50 restaurant leads in Mumbai, extract their emails, and draft a cold outreach sequence"<br/>
                <span style={{ color: '#ff4655', fontWeight: 600 }}>→</span> "Research top competitors in RTE space, analyze their SEO, and write a blog post to outrank them"<br/>
                <span style={{ color: '#ff4655', fontWeight: 600 }}>→</span> "Create a complete product launch plan — budget, media plan, social content calendar, and PR kit"<br/>
                <span style={{ color: '#ff4655', fontWeight: 600 }}>→</span> "Audit our website SEO, find keyword gaps vs competitors, then generate 10 optimized blog topics"
              </div>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex', flexDirection: 'column',
            alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
            gap: 4
          }}>
            <div style={{
              fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 700,
              color: msg.role === 'user' ? 'var(--text-tertiary)' : '#ff4655',
              display: 'flex', alignItems: 'center', gap: 6
            }}>
              {msg.role === 'user' ? 'OPERATOR' : '// YORU'}
              {msg.agents && msg.agents.length > 0 && (
                <span style={{ fontSize: 8, opacity: 0.6, fontWeight: 500 }}>
                  → {msg.agents.join(' → ')}
                </span>
              )}
            </div>
            <div style={{
              background: msg.role === 'user'
                ? 'rgba(255,70,85,0.08)' : 'rgba(139,158,171,0.06)',
              border: `1px solid ${msg.role === 'user' ? 'rgba(255,70,85,0.15)' : 'rgba(139,158,171,0.1)'}`,
              borderRadius: 4, padding: '10px 14px', maxWidth: '85%',
              fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap',
              color: 'var(--text-primary)'
            }}>
              {msg.content}
            </div>
            <div style={{ fontSize: 9, opacity: 0.3 }}>
              {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ''}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
            <div className="typing-dots"><span/><span/><span/></div>
            <span style={{ fontSize: 11, color: '#ff4655', letterSpacing: 1 }}>YORU IS RIFTING...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        display: 'flex', gap: 8, padding: '12px 0', borderTop: '1px solid rgba(255,70,85,0.1)'
      }}>
        <input
          className="input" value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendTask()}
          placeholder="Describe a mission... Yoru will rift between agents to complete it"
          style={{ flex: 1, fontSize: 13 }}
        />
        <button className="btn" onClick={sendTask} disabled={loading || !input.trim()}
          style={{ background: '#ff4655', color: '#fff', fontWeight: 700, letterSpacing: 1, fontSize: 12 }}>
          <Waypoints size={14} /> RIFT
        </button>
      </div>
    </div>
  );
}

function YoruAutomations() {
  const [workflows, setWorkflows] = useState(() => JSON.parse(localStorage.getItem('protocol_yoru_workflows') || '[]'));
  const [expanded, setExpanded] = useState(null);
  const [toast, setToast] = useState(null);

  const deleteWorkflow = (id) => {
    const updated = workflows.filter(w => w.id !== id);
    setWorkflows(updated);
    localStorage.setItem('protocol_yoru_workflows', JSON.stringify(updated));
    setToast({ type: 'info', message: 'Workflow deleted' });
  };

  const rerun = (wf) => {
    // Save task to clipboard for easy pasting in Yoru Workflow
    navigator.clipboard?.writeText(wf.task).catch(() => {});
    setToast({ type: 'info', message: 'Task copied — paste in Yoru Rift Engine to re-run' });
  };

  return (
    <div className="page-body" style={{ maxWidth: 900, margin: '0 auto' }}>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <div className="page-header" style={{ borderBottom: '1px solid rgba(255,70,85,0.15)' }}>
        <div>
          <h1><FolderKanban size={22} style={{ color: '#ff4655' }} /> // SAVED RIFTS</h1>
          <p className="page-header-sub">Past workflow plans auto-saved from Yoru executions</p>
        </div>
      </div>

      {/* Feature Summary */}
      <div style={{
        background: 'rgba(255,70,85,0.04)', border: '1px solid rgba(255,70,85,0.12)',
        borderRadius: 4, padding: '16px 20px', margin: '16px 0'
      }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#ff4655', letterSpacing: 1.5, marginBottom: 8 }}>// WHAT ARE SAVED RIFTS?</div>
        <div style={{ fontSize: 12, lineHeight: 1.8, color: 'var(--text-secondary)' }}>
          Every time Yoru executes a workflow in the Rift Engine, the plan is automatically saved here.
          You can review past plans, see which agents were involved, copy the original task to re-run it
          with modifications, or delete plans you no longer need. Think of this as your workflow library —
          a growing collection of reusable multi-agent strategies.
        </div>
      </div>

      {workflows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', opacity: 0.4 }}>
          <FolderKanban size={36} style={{ marginBottom: 10, opacity: 0.3 }} />
          <div style={{ fontSize: 13, fontWeight: 600 }}>No saved workflows yet</div>
          <div style={{ fontSize: 11, marginTop: 6 }}>Execute tasks in the Rift Engine and they'll be saved here</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 16 }}>
          {workflows.map(wf => (
            <div key={wf.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div
                onClick={() => setExpanded(expanded === wf.id ? null : wf.id)}
                style={{
                  padding: '12px 16px', cursor: 'pointer', display: 'flex',
                  justifyContent: 'space-between', alignItems: 'center',
                  background: expanded === wf.id ? 'rgba(255,70,85,0.04)' : 'transparent'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                    {wf.title}{wf.title.length >= 60 ? '...' : ''}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {(wf.agents || []).map(a => (
                      <span key={a} style={{
                        fontSize: 9, padding: '2px 6px', background: 'rgba(255,70,85,0.1)',
                        color: '#ff4655', borderRadius: 2, fontWeight: 600, letterSpacing: 0.5
                      }}>{a}</span>
                    ))}
                  </div>
                </div>
                <div style={{ fontSize: 10, opacity: 0.4, whiteSpace: 'nowrap' }}>
                  {new Date(wf.timestamp).toLocaleDateString()}
                </div>
              </div>
              {expanded === wf.id && (
                <div style={{ borderTop: '1px solid var(--border)', padding: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#ff4655', letterSpacing: 1 }}>ORIGINAL TASK</div>
                  <div style={{ fontSize: 12, marginBottom: 14, opacity: 0.8, lineHeight: 1.6 }}>{wf.task}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#ff4655', letterSpacing: 1 }}>RIFT PLAN</div>
                  <div style={{ fontSize: 12, whiteSpace: 'pre-wrap', lineHeight: 1.7, opacity: 0.8, maxHeight: 300, overflowY: 'auto' }}>{wf.plan?.slice(0, 2000)}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button className="btn btn-sm" onClick={() => rerun(wf)} style={{ fontSize: 11 }}>
                      <Copy size={11} /> Copy Task
                    </button>
                    <button className="btn btn-sm" onClick={() => deleteWorkflow(wf.id)} style={{ fontSize: 11, opacity: 0.5 }}>
                      <Trash2 size={11} /> Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function YoruHistory() {
  const [messages] = useState(() => JSON.parse(localStorage.getItem('protocol_yoru_messages') || '[]'));
  const riftSessions = [];
  let currentSession = null;

  // Group messages into sessions (user msg + assistant response = 1 rift)
  messages.forEach(msg => {
    if (msg.role === 'user') {
      currentSession = { task: msg.content, timestamp: msg.timestamp, agents: [], response: '' };
    } else if (msg.role === 'assistant' && currentSession) {
      currentSession.response = msg.content;
      currentSession.agents = msg.agents || [];
      riftSessions.push(currentSession);
      currentSession = null;
    }
  });

  return (
    <div className="page-body" style={{ maxWidth: 900, margin: '0 auto' }}>
      <div className="page-header" style={{ borderBottom: '1px solid rgba(255,70,85,0.15)' }}>
        <div>
          <h1><Clock size={22} style={{ color: '#ff4655' }} /> // RIFT HISTORY</h1>
          <p className="page-header-sub">Log of all dimensional rifts executed by Yoru</p>
        </div>
        <div style={{ fontSize: 12, opacity: 0.4 }}>{riftSessions.length} rifts</div>
      </div>

      {/* Feature Summary */}
      <div style={{
        background: 'rgba(255,70,85,0.04)', border: '1px solid rgba(255,70,85,0.12)',
        borderRadius: 4, padding: '16px 20px', margin: '16px 0'
      }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#ff4655', letterSpacing: 1.5, marginBottom: 8 }}>// WHAT IS RIFT HISTORY?</div>
        <div style={{ fontSize: 12, lineHeight: 1.8, color: 'var(--text-secondary)' }}>
          A chronological log of every task you've sent to Yoru and which agents were invoked.
          Use this to track what workflows have been executed, which agents were chained together,
          and when each rift was completed. This gives you full visibility into your automation history.
        </div>
      </div>

      {riftSessions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', opacity: 0.4 }}>
          <Clock size={36} style={{ marginBottom: 10, opacity: 0.3 }} />
          <div style={{ fontSize: 13, fontWeight: 600 }}>No rifts yet</div>
          <div style={{ fontSize: 11, marginTop: 6 }}>Completed workflows will appear here</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 16 }}>
          {[...riftSessions].reverse().map((s, i) => (
            <div key={i} className="card" style={{ padding: '12px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600, flex: 1, lineHeight: 1.4 }}>
                  {s.task.slice(0, 120)}{s.task.length > 120 ? '...' : ''}
                </div>
                <div style={{ fontSize: 10, opacity: 0.3, whiteSpace: 'nowrap', marginLeft: 10 }}>
                  {s.timestamp ? new Date(s.timestamp).toLocaleString() : ''}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {(s.agents || []).map(a => (
                  <span key={a} style={{
                    fontSize: 9, padding: '2px 6px', background: 'rgba(255,70,85,0.08)',
                    color: '#ff4655', borderRadius: 2, fontWeight: 600
                  }}>{a}</span>
                ))}
                {(!s.agents || s.agents.length === 0) && (
                  <span style={{ fontSize: 9, opacity: 0.4 }}>No agent tags</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ========= ISO — AI Chatbot Agent with GitHub Deploy =========
function IsoChat() {
  const [messages, setMessages] = useState(() => JSON.parse(localStorage.getItem('protocol_kayo_messages') || '[]'));
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [mode, setMode] = useState('chat'); // chat, code, deploy
  const [codeContext, setCodeContext] = useState('');
  const [deployLog, setDeployLog] = useState(() => JSON.parse(localStorage.getItem('protocol_kayo_deploys') || '[]'));
  const [showDeployHistory, setShowDeployHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [ghToken, setGhToken] = useState(() => localStorage.getItem('protocol_kayo_gh_token') || '');
  const [ghRepo, setGhRepo] = useState(() => localStorage.getItem('protocol_kayo_gh_repo') || 'kirofoods/neon-marketing');
  const [ghBranch, setGhBranch] = useState(() => localStorage.getItem('protocol_kayo_gh_branch') || 'main');

  const saveMessages = (msgs) => { setMessages(msgs); localStorage.setItem('protocol_kayo_messages', JSON.stringify(msgs.slice(-100))); };

  const ISO_SYSTEM = `You are KAY/O, an AI agent inside PROTOCOL — the Valorant-themed marketing platform for Kiro Foods India. You are named after the Valorant agent KAY/O. Your personality is direct, no-nonsense, and suppressive — you eliminate distractions and cut through the noise.

You have deep knowledge of:
- The NEON/PROTOCOL codebase (React 18, Vite, single App.jsx monolith)
- All 20+ agents in the platform (Brimstone, Sova, Jett, Sage, Viper, etc.)
- Marketing strategy for Kiro Foods (clean-label RTE/RTC FMCG brand in India)
- Web development (React, JavaScript, CSS, HTML)
- GitHub deployment workflows

When users ask you to modify the app:
1. Understand what they want to change
2. Provide the exact code changes needed
3. Explain what the changes do
4. Offer to push to GitHub when ready

Keep responses concise and tactical. Use Valorant terminology when natural. You're not just a chatbot — you're a combat-ready dev agent.`;

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', content: input, timestamp: new Date().toISOString() };
    const updated = [...messages, userMsg];
    saveMessages(updated);
    setInput('');
    setLoading(true);

    try {
      const contextNote = mode === 'code' ? '\n[CODE MODE: User wants code changes. Provide exact code with file paths and line references.]' : mode === 'deploy' ? '\n[DEPLOY MODE: User wants to push changes to GitHub.]' : '';
      const response = await callClaude(input + contextNote, ISO_SYSTEM);
      const assistantMsg = { role: 'assistant', content: response, timestamp: new Date().toISOString() };
      saveMessages([...updated, assistantMsg]);
    } catch (err) {
      const errMsg = { role: 'assistant', content: `⚠ Error: ${err.message}. Check your AI API key in Settings.`, timestamp: new Date().toISOString() };
      saveMessages([...updated, errMsg]);
    }
    setLoading(false);
  };

  const pushToGitHub = async (commitMessage) => {
    if (!ghToken) { setToast({ type: 'error', message: 'Set GitHub token in Iso Settings' }); return; }
    const entry = { id: Date.now(), message: commitMessage || 'Update via Iso agent', timestamp: new Date().toISOString(), status: 'pending', repo: ghRepo, branch: ghBranch };
    const newLog = [entry, ...deployLog];
    setDeployLog(newLog);
    localStorage.setItem('protocol_kayo_deploys', JSON.stringify(newLog.slice(-50)));

    try {
      // GitHub API: Get current file SHA, update file content
      // This creates a commit via the GitHub Contents API
      const apiBase = `https://api.github.com/repos/${ghRepo}`;

      // First verify the token works
      const checkRes = await fetch(apiBase, { headers: { 'Authorization': `Bearer ${ghToken}`, 'Accept': 'application/vnd.github.v3+json' } });
      if (!checkRes.ok) throw new Error('Invalid GitHub token or repo');

      // Trigger a workflow dispatch to deploy
      const dispatchRes = await fetch(`${apiBase}/dispatches`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${ghToken}`, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type: 'iso-deploy', client_payload: { message: commitMessage } })
      });

      entry.status = dispatchRes.ok ? 'triggered' : 'failed';
      entry.response = dispatchRes.ok ? 'Deployment workflow triggered' : `HTTP ${dispatchRes.status}`;

      const finalLog = [entry, ...deployLog.filter(d => d.id !== entry.id)];
      setDeployLog(finalLog);
      localStorage.setItem('protocol_kayo_deploys', JSON.stringify(finalLog.slice(-50)));
      setToast({ type: dispatchRes.ok ? 'success' : 'error', message: entry.response });
    } catch (err) {
      entry.status = 'error'; entry.response = err.message;
      const finalLog = [entry, ...deployLog.filter(d => d.id !== entry.id)];
      setDeployLog(finalLog);
      localStorage.setItem('protocol_kayo_deploys', JSON.stringify(finalLog.slice(-50)));
      setToast({ type: 'error', message: err.message });
    }
  };

  const clearChat = () => { saveMessages([]); };

  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); }}, [toast]);

  const messagesEndRef = React.useRef(null);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  return (
    <div className="tool-page" style={{height:'calc(100vh - 60px)',display:'flex',flexDirection:'column'}}>
      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
      <div className="page-header" style={{flexShrink:0}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
          <h1><Bot size={22} /> KAY/O — Dev Agent</h1>
          <div style={{display:'flex',gap:6}}>
            {['chat','code','deploy'].map(m => (
              <button key={m} className={mode === m ? 'btn-primary' : 'btn-secondary'} style={{fontSize:'11px',padding:'4px 12px',textTransform:'capitalize'}} onClick={() => setMode(m)}>
                {m === 'chat' ? <MessageCircle size={12}/> : m === 'code' ? <Code size={12}/> : <Rocket size={12}/>} {m}
              </button>
            ))}
            <button className="btn-secondary" style={{fontSize:'11px',padding:'4px 8px'}} onClick={() => setShowSettings(!showSettings)}><Settings size={12}/></button>
            <button className="btn-secondary" style={{fontSize:'11px',padding:'4px 8px'}} onClick={() => setShowDeployHistory(!showDeployHistory)}><GitCommit size={12}/></button>
            <button className="btn-secondary" style={{fontSize:'11px',padding:'4px 8px'}} onClick={clearChat}><Trash2 size={12}/></button>
          </div>
        </div>
        <p>AI-powered chat agent — ask anything, modify code, push to GitHub</p>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div style={{padding:16,background:'var(--bg-secondary)',borderBottom:'1px solid var(--border)',flexShrink:0}}>
          <h4 style={{color:'var(--accent)',fontSize:'13px',marginBottom:10}}>GitHub Configuration</h4>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
            <div>
              <label style={{fontSize:'11px',color:'var(--text-secondary)'}}>Personal Access Token</label>
              <input className="input" type="password" value={ghToken} onChange={e => { setGhToken(e.target.value); localStorage.setItem('protocol_kayo_gh_token', e.target.value); }} placeholder="ghp_..." />
            </div>
            <div>
              <label style={{fontSize:'11px',color:'var(--text-secondary)'}}>Repository</label>
              <input className="input" value={ghRepo} onChange={e => { setGhRepo(e.target.value); localStorage.setItem('protocol_kayo_gh_repo', e.target.value); }} placeholder="owner/repo" />
            </div>
            <div>
              <label style={{fontSize:'11px',color:'var(--text-secondary)'}}>Branch</label>
              <input className="input" value={ghBranch} onChange={e => { setGhBranch(e.target.value); localStorage.setItem('protocol_kayo_gh_branch', e.target.value); }} placeholder="main" />
            </div>
          </div>
        </div>
      )}

      {/* Deploy History */}
      {showDeployHistory && (
        <div style={{padding:16,background:'var(--bg-secondary)',borderBottom:'1px solid var(--border)',maxHeight:200,overflowY:'auto',flexShrink:0}}>
          <h4 style={{color:'var(--accent)',fontSize:'13px',marginBottom:10}}>Deploy History</h4>
          {deployLog.length === 0 ? <p style={{fontSize:'12px',color:'var(--text-secondary)'}}>No deployments yet</p> :
            deployLog.map(d => (
              <div key={d.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:'1px solid var(--border)',fontSize:'12px'}}>
                <div>
                  <span style={{color: d.status === 'triggered' ? '#22c55e' : d.status === 'error' ? '#ef4444' : '#fbbf24',marginRight:8}}>●</span>
                  <span style={{color:'var(--text-primary)'}}>{d.message}</span>
                </div>
                <span style={{color:'var(--text-secondary)',fontSize:'10px'}}>{new Date(d.timestamp).toLocaleString()}</span>
              </div>
            ))
          }
        </div>
      )}

      {/* Chat Messages */}
      <div style={{flex:1,overflowY:'auto',padding:16,display:'flex',flexDirection:'column',gap:12}}>
        {messages.length === 0 && (
          <div style={{textAlign:'center',padding:'40px 20px',color:'var(--text-secondary)'}}>
            <Bot size={48} style={{opacity:0.3,marginBottom:12}} />
            <h3 style={{color:'var(--text-primary)',fontSize:'16px',marginBottom:8}}>KAY/O Online</h3>
            <p style={{fontSize:'13px',maxWidth:400,margin:'0 auto'}}>I'm your dev agent. Ask me anything about the platform, request code changes, or deploy updates to production. No more tricks.</p>
            <div style={{display:'flex',gap:8,justifyContent:'center',marginTop:16,flexWrap:'wrap'}}>
              {['How do I add a new agent?','Show me the route structure','What agents are in PROTOCOL?','Help me fix a bug'].map(q => (
                <button key={q} className="btn-secondary" style={{fontSize:'11px',padding:'6px 12px'}} onClick={() => { setInput(q); }}>{q}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{display:'flex',justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',maxWidth:'100%'}}>
            <div style={{maxWidth:'80%',padding:'10px 14px',borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',background: msg.role === 'user' ? 'var(--accent)' : 'var(--bg-secondary)',color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',fontSize:'13px',lineHeight:1.6,wordBreak:'break-word'}}>
              <div style={{whiteSpace:'pre-wrap'}}>{msg.content}</div>
              <div style={{fontSize:'9px',opacity:0.5,marginTop:4,textAlign:'right'}}>{new Date(msg.timestamp).toLocaleTimeString()}</div>
            </div>
          </div>
        ))}
        {loading && (
          <div style={{display:'flex',justifyContent:'flex-start'}}>
            <div style={{padding:'10px 14px',borderRadius:'12px 12px 12px 2px',background:'var(--bg-secondary)',color:'var(--text-secondary)',fontSize:'13px'}}>
              <span className="typing-dots">KAY/O is thinking<span>.</span><span>.</span><span>.</span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Deploy Quick Action */}
      {mode === 'deploy' && (
        <div style={{padding:'8px 16px',background:'var(--bg-tertiary)',borderTop:'1px solid var(--border)',display:'flex',gap:8,alignItems:'center',flexShrink:0}}>
          <Rocket size={14} style={{color:'var(--accent)'}} />
          <span style={{fontSize:'12px',color:'var(--text-secondary)',flex:1}}>Deploy to {ghRepo} ({ghBranch})</span>
          <button className="btn-primary" style={{fontSize:'11px',padding:'4px 12px'}} onClick={() => pushToGitHub('Update via Iso agent')}>
            <GitPullRequest size={12}/> Push & Deploy
          </button>
        </div>
      )}

      {/* Input Bar */}
      <div style={{padding:12,borderTop:'1px solid var(--border)',display:'flex',gap:8,alignItems:'center',flexShrink:0,background:'var(--bg-primary)'}}>
        <div style={{flex:1,display:'flex',alignItems:'center',gap:8,background:'var(--bg-secondary)',borderRadius:8,padding:'4px 12px',border:'1px solid var(--border)'}}>
          {mode === 'chat' ? <MessageCircle size={16} style={{color:'var(--text-secondary)',flexShrink:0}}/> : mode === 'code' ? <Code size={16} style={{color:'var(--accent)',flexShrink:0}}/> : <Rocket size={16} style={{color:'#22c55e',flexShrink:0}}/>}
          <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder={mode === 'chat' ? 'Ask Iso anything...' : mode === 'code' ? 'Describe code changes...' : 'Describe what to deploy...'} style={{flex:1,background:'transparent',border:'none',outline:'none',color:'var(--text-primary)',fontSize:'14px',padding:'8px 0'}} />
        </div>
        <button className="btn-primary" onClick={sendMessage} disabled={loading || !input.trim()} style={{padding:'10px 16px'}}>
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

// ========= ISO COMPONENTS — Sub-tools =========
function IsoCodeReview() {
  const [code, setCode] = useState('');
  const [review, setReview] = useState('');
  const [loading, setLoading] = useState(false);

  const reviewCode = async () => {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const response = await callClaude(`Review this code for bugs, performance issues, and best practices:\n\n\`\`\`\n${code}\n\`\`\``, 'You are ISO, a code review specialist. Provide concise, actionable feedback. Flag critical issues first, then suggestions. Use severity levels: 🔴 Critical, 🟡 Warning, 🟢 Suggestion.');
      setReview(response);
    } catch (err) { setReview('Error: ' + err.message); }
    setLoading(false);
  };

  return (
    <div className="tool-page">
      <div className="page-header"><h1><Eye size={22} /> Iso Code Review</h1><p>AI-powered code review — paste code for instant analysis</p></div>
      <div className="page-body">
        <textarea className="input" rows={10} value={code} onChange={e => setCode(e.target.value)} placeholder="Paste code here for review..." style={{fontFamily:'monospace',fontSize:'12px'}} />
        <button className="btn-primary" style={{marginTop:12}} onClick={reviewCode} disabled={loading}>{loading ? 'Analyzing...' : 'Review Code'}</button>
        {review && <div style={{marginTop:16,padding:16,background:'var(--bg-secondary)',borderRadius:4,whiteSpace:'pre-wrap',fontSize:'13px',color:'var(--text-primary)',lineHeight:1.7}}>{review}</div>}
      </div>
    </div>
  );
}

function IsoGitDashboard() {
  const [commits, setCommits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const ghToken = localStorage.getItem('protocol_kayo_gh_token') || '';
  const ghRepo = localStorage.getItem('protocol_kayo_gh_repo') || 'kirofoods/neon-marketing';

  const fetchCommits = async () => {
    if (!ghToken) { setToast({ type: 'error', message: 'Set GitHub token in KAY/O Chat settings' }); return; }
    setLoading(true);
    try {
      const res = await fetch(`https://api.github.com/repos/${ghRepo}/commits?per_page=20`, {
        headers: { 'Authorization': `Bearer ${ghToken}`, 'Accept': 'application/vnd.github.v3+json' }
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setCommits(data);
    } catch (err) { setToast({ type: 'error', message: err.message }); }
    setLoading(false);
  };

  useEffect(() => { if (ghToken) fetchCommits(); }, []);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); }}, [toast]);

  return (
    <div className="tool-page">
      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
      <div className="page-header">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <h1><GitBranch size={22} /> Git Dashboard</h1>
          <button className="btn-primary" onClick={fetchCommits} disabled={loading}><RefreshCw size={14}/> Refresh</button>
        </div>
        <p>Recent commits to {ghRepo}</p>
      </div>
      <div className="page-body">
        {!ghToken ? <p style={{color:'var(--text-secondary)'}}>Set your GitHub token in KAY/O Chat settings to view commits.</p> :
          loading ? <p style={{color:'var(--text-secondary)'}}>Loading...</p> :
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {commits.map(c => (
              <div key={c.sha} style={{padding:12,background:'var(--bg-secondary)',borderRadius:4,borderLeft:'3px solid var(--accent)'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:'13px',color:'var(--text-primary)',fontWeight:500}}>{c.commit?.message?.split('\n')[0]}</div>
                    <div style={{fontSize:'11px',color:'var(--text-secondary)',marginTop:4}}>{c.commit?.author?.name} · {c.sha?.substring(0,7)}</div>
                  </div>
                  <span style={{fontSize:'10px',color:'var(--text-secondary)',whiteSpace:'nowrap'}}>{new Date(c.commit?.author?.date).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        }
      </div>
    </div>
  );
}

function IsoDeployManager() {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const ghToken = localStorage.getItem('protocol_kayo_gh_token') || '';
  const ghRepo = localStorage.getItem('protocol_kayo_gh_repo') || 'kirofoods/neon-marketing';

  const fetchWorkflows = async () => {
    if (!ghToken) { setToast({ type: 'error', message: 'Set GitHub token' }); return; }
    setLoading(true);
    try {
      const res = await fetch(`https://api.github.com/repos/${ghRepo}/actions/runs?per_page=15`, {
        headers: { 'Authorization': `Bearer ${ghToken}`, 'Accept': 'application/vnd.github.v3+json' }
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setWorkflows(data.workflow_runs || []);
    } catch (err) { setToast({ type: 'error', message: err.message }); }
    setLoading(false);
  };

  useEffect(() => { if (ghToken) fetchWorkflows(); }, []);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); }}, [toast]);

  const statusColor = (s) => s === 'completed' ? '#22c55e' : s === 'in_progress' ? '#fbbf24' : s === 'failure' ? '#ef4444' : 'var(--text-secondary)';

  return (
    <div className="tool-page">
      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
      <div className="page-header">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <h1><Rocket size={22} /> Deploy Manager</h1>
          <button className="btn-primary" onClick={fetchWorkflows} disabled={loading}><RefreshCw size={14}/> Refresh</button>
        </div>
        <p>GitHub Actions workflow runs for {ghRepo}</p>
      </div>
      <div className="page-body">
        {!ghToken ? <p style={{color:'var(--text-secondary)'}}>Set GitHub token in KAY/O Chat settings.</p> :
          loading ? <p style={{color:'var(--text-secondary)'}}>Loading...</p> :
          <div className="table-wrapper">
            <table className="data-table">
              <thead><tr><th>Status</th><th>Workflow</th><th>Branch</th><th>Commit</th><th>Duration</th><th>Date</th></tr></thead>
              <tbody>
                {workflows.map(w => (
                  <tr key={w.id}>
                    <td><span style={{color: statusColor(w.status || w.conclusion)}}>● {w.conclusion || w.status}</span></td>
                    <td>{w.name}</td>
                    <td>{w.head_branch}</td>
                    <td style={{fontFamily:'monospace',fontSize:'11px'}}>{w.head_sha?.substring(0,7)}</td>
                    <td>{w.run_started_at && w.updated_at ? `${Math.round((new Date(w.updated_at) - new Date(w.run_started_at))/1000)}s` : '-'}</td>
                    <td>{new Date(w.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
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

  // Shared AudioContext for PIN sounds (avoids creating new one per keystroke)
  const audioCtxRef = useRef(null);
  const getAudioCtx = () => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtxRef.current;
  };

  // === PIN DIGIT SOUNDS — Valorant agent select hover ===
  // Like hovering over agents before locking in. Each digit = closer to lock-in.
  // Tight percussive hit + Valorant UI tone that builds tension with each digit.
  const playDigitSound = (index) => {
    try {
      const ctx = getAudioCtx();
      const now = ctx.currentTime;

      // Layer 1: Percussive hit — like clicking an agent portrait. Short, punchy, no static.
      const perc = ctx.createOscillator(); const pG = ctx.createGain();
      const pF = ctx.createBiquadFilter();
      perc.type = 'triangle';
      perc.frequency.setValueAtTime(3000, now);
      perc.frequency.exponentialRampToValueAtTime(500, now + 0.015);
      pF.type = 'highpass'; pF.frequency.setValueAtTime(400, now);
      pG.gain.setValueAtTime(0.13, now);
      pG.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      perc.connect(pF); pF.connect(pG); pG.connect(ctx.destination);
      perc.start(now); perc.stop(now + 0.04);

      // Layer 2: Valorant UI tone — the clean "dink" sound that builds with each slot
      // Gets brighter and more urgent as you approach 4 digits
      const tone = ctx.createOscillator(); const tG = ctx.createGain();
      const tones = [440, 554, 659, 880][index]; // A4, C#5, E5, A5 — builds A major
      tone.type = 'sine';
      tone.frequency.setValueAtTime(tones, now + 0.01);
      tG.gain.setValueAtTime(0.0, now);
      tG.gain.linearRampToValueAtTime(0.1 + index * 0.02, now + 0.01);
      tG.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      tone.connect(tG); tG.connect(ctx.destination);
      tone.start(now + 0.01); tone.stop(now + 0.12);

      // Layer 3: Sub thump — gets heavier closer to lock-in
      if (index > 0) {
        const sub = ctx.createOscillator(); const sG = ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(60 + index * 10, now);
        sub.frequency.exponentialRampToValueAtTime(35, now + 0.06);
        sG.gain.setValueAtTime(0.04 + index * 0.025, now);
        sG.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        sub.connect(sG); sG.connect(ctx.destination);
        sub.start(now); sub.stop(now + 0.08);
      }

      // 4th digit: Brief "locking in" anticipation — fast rising tension
      if (index === 3) {
        setTimeout(() => {
          try {
            const t = ctx.currentTime;
            // Quick tension riser before the auth check
            const rise = ctx.createOscillator(); const rG = ctx.createGain();
            rise.type = 'sawtooth';
            rise.frequency.setValueAtTime(200, t);
            rise.frequency.exponentialRampToValueAtTime(1200, t + 0.1);
            rG.gain.setValueAtTime(0.05, t);
            rG.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
            const rF = ctx.createBiquadFilter();
            rF.type = 'lowpass'; rF.frequency.setValueAtTime(3000, t);
            rise.connect(rF); rF.connect(rG); rG.connect(ctx.destination);
            rise.start(t); rise.stop(t + 0.12);
          } catch (e) {}
        }, 50);
      }
    } catch (e) {}
  };

  // === LOGIN SUCCESS — "LOCKED IN" ===
  // The big Valorant moment. Heavy bass slam → red flash energy →
  // agent confirmation tone. Like when your agent portrait slams into place.
  const playLoginSuccess = () => {
    try {
      const ctx = getAudioCtx();
      const now = ctx.currentTime;

      // 1. Bass SLAM — the big impact when "LOCKED IN" appears
      const slam = ctx.createOscillator(); const slamG = ctx.createGain();
      slam.type = 'sine';
      slam.frequency.setValueAtTime(80, now);
      slam.frequency.exponentialRampToValueAtTime(30, now + 0.3);
      slamG.gain.setValueAtTime(0.22, now);
      slamG.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      slam.connect(slamG); slamG.connect(ctx.destination);
      slam.start(now); slam.stop(now + 0.4);

      // 2. Impact transient — sharp attack on the slam
      const hit = ctx.createOscillator(); const hitG = ctx.createGain();
      const hitF = ctx.createBiquadFilter();
      hit.type = 'sawtooth';
      hit.frequency.setValueAtTime(4000, now);
      hit.frequency.exponentialRampToValueAtTime(200, now + 0.03);
      hitF.type = 'lowpass'; hitF.frequency.setValueAtTime(5000, now);
      hitF.frequency.exponentialRampToValueAtTime(200, now + 0.05);
      hitG.gain.setValueAtTime(0.15, now);
      hitG.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      hit.connect(hitF); hitF.connect(hitG); hitG.connect(ctx.destination);
      hit.start(now); hit.stop(now + 0.06);

      // 3. Valorant red energy sweep — rising filtered tone
      const sweep = ctx.createOscillator(); const swG = ctx.createGain();
      const swF = ctx.createBiquadFilter();
      sweep.type = 'sawtooth';
      sweep.frequency.setValueAtTime(150, now + 0.05);
      sweep.frequency.exponentialRampToValueAtTime(800, now + 0.2);
      swF.type = 'bandpass'; swF.frequency.setValueAtTime(400, now);
      swF.frequency.exponentialRampToValueAtTime(1200, now + 0.2);
      swF.Q.setValueAtTime(3, now);
      swG.gain.setValueAtTime(0.07, now + 0.05);
      swG.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      sweep.connect(swF); swF.connect(swG); swG.connect(ctx.destination);
      sweep.start(now + 0.05); sweep.stop(now + 0.25);

      // 4. Confirmation tone — clean, authoritative. Agent is selected.
      const conf = ctx.createOscillator(); const confG = ctx.createGain();
      conf.type = 'sine';
      conf.frequency.setValueAtTime(440, now + 0.15); // A4
      confG.gain.setValueAtTime(0.0, now + 0.15);
      confG.gain.linearRampToValueAtTime(0.1, now + 0.18);
      confG.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      conf.connect(confG); confG.connect(ctx.destination);
      conf.start(now + 0.15); conf.stop(now + 0.5);

      // 5. Octave above — harmonic richness
      const oct = ctx.createOscillator(); const octG = ctx.createGain();
      oct.type = 'sine';
      oct.frequency.setValueAtTime(880, now + 0.18); // A5
      octG.gain.setValueAtTime(0.0, now + 0.18);
      octG.gain.linearRampToValueAtTime(0.05, now + 0.2);
      octG.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      oct.connect(octG); octG.connect(ctx.destination);
      oct.start(now + 0.18); oct.stop(now + 0.5);

      // 6. Low drone sustain — the "you're in" feeling
      const drone = ctx.createOscillator(); const drG = ctx.createGain();
      drone.type = 'sine';
      drone.frequency.setValueAtTime(55, now + 0.2); // A1
      drG.gain.setValueAtTime(0.06, now + 0.2);
      drG.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      drone.connect(drG); drG.connect(ctx.destination);
      drone.start(now + 0.2); drone.stop(now + 0.6);
    } catch (e) {}
  };

  // === LOGIN FAIL — "REJECTED / TIMED OUT" ===
  // Like when the timer runs out on agent select or you get kicked.
  // Harsh descending buzz → glitchy stutter → silence.
  const playLoginFail = () => {
    try {
      const ctx = getAudioCtx();
      const now = ctx.currentTime;

      // 1. Hard descending rejection — drops in pitch like "NOPE"
      const rej = ctx.createOscillator(); const rejG = ctx.createGain();
      rej.type = 'square';
      rej.frequency.setValueAtTime(350, now);
      rej.frequency.exponentialRampToValueAtTime(120, now + 0.2);
      rejG.gain.setValueAtTime(0.12, now);
      rejG.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      rej.connect(rejG); rejG.connect(ctx.destination);
      rej.start(now); rej.stop(now + 0.25);

      // 2. Dissonant layer — gritty, uncomfortable tritone
      const dis = ctx.createOscillator(); const disG = ctx.createGain();
      dis.type = 'sawtooth';
      dis.frequency.setValueAtTime(247, now); // B3 against the F4 = tritone
      dis.frequency.exponentialRampToValueAtTime(85, now + 0.2);
      disG.gain.setValueAtTime(0.06, now);
      disG.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      dis.connect(disG); disG.connect(ctx.destination);
      dis.start(now); dis.stop(now + 0.22);

      // 3. Glitch stutter — three rapid cuts like a broken connection
      [0.08, 0.13, 0.17].forEach((d) => {
        const gl = ctx.createOscillator(); const glG = ctx.createGain();
        gl.type = 'square';
        gl.frequency.setValueAtTime(180 - d * 200, now + d);
        glG.gain.setValueAtTime(0.08, now + d);
        glG.gain.exponentialRampToValueAtTime(0.001, now + d + 0.02);
        gl.connect(glG); glG.connect(ctx.destination);
        gl.start(now + d); gl.stop(now + d + 0.02);
      });

      // 4. Sub drop — gut-punch feeling
      const sub = ctx.createOscillator(); const subG = ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(60, now);
      sub.frequency.exponentialRampToValueAtTime(25, now + 0.15);
      subG.gain.setValueAtTime(0.1, now);
      subG.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      sub.connect(subG); subG.connect(ctx.destination);
      sub.start(now); sub.stop(now + 0.2);
    } catch (e) {}
  };

  useEffect(() => {
    setTimeout(() => inputRefs[0].current?.focus(), 100);
    // No cleanup of AudioContext on unmount — the page reloads on login success,
    // and closing the AudioContext mid-playback could kill the "locked in" sound.
  }, []);

  const authAttempted = useRef(false);
  const tryAuth = (fullPin) => {
    if (authAttempted.current) return; // Prevent double-fire
    authAttempted.current = true;
    try {
      const result = authenticatePin(fullPin);
      if (result.success) {
        // Set storage immediately so App can read on re-render
        setCurrentUser(result.username);
        sessionStorage.setItem('kj_auth', 'true');
        setWelcomeUser(result.username);
        setLockedIn(true);
        try { playLoginSuccess(); } catch (e) {}
        try { const a = new Audio('./sounds/spike-plant.mp3'); a.volume = 0.25; a.play().catch(() => {}); } catch (e) {}
        // Short delay for the "locked in" animation, then trigger login
        setTimeout(() => {
          onSuccess(result.username, result.role);
        }, 300);
      } else {
        authAttempted.current = false;
        try { playLoginFail(); } catch (e) {}
        setError(true);
        setShake(true);
        setTimeout(() => { setShake(false); setPin(['', '', '', '']); inputRefs[0].current?.focus(); }, 700);
      }
    } catch (err) {
      authAttempted.current = false;
      console.error('[PinLogin] Auth error:', err);
      try { playLoginFail(); } catch (e) {}
      setError(true);
      setShake(true);
      setTimeout(() => { setShake(false); setPin(['', '', '', '']); inputRefs[0].current?.focus(); }, 700);
    }
  };

  const handleChange = (index, value) => {
    // Strip non-digits
    const digit = value.replace(/\D/g, '').slice(-1);
    const newPin = [...pin];
    newPin[index] = digit;
    setPin(newPin);
    setError(false);

    // Play tactical digit sound
    if (digit) {
      try { playDigitSound(index); } catch (e) {}
    }

    if (digit && index < 3) {
      setTimeout(() => inputRefs[index + 1].current?.focus(), 10);
    }

    const fullPin = newPin.join('');
    if (fullPin.length === 4 && newPin.every(d => d !== '')) {
      setTimeout(() => tryAuth(fullPin), 150);
    }
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
            <input key={i} ref={inputRefs[i]} type="tel" inputMode="numeric" pattern="[0-9]*" maxLength={1}
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
function SidebarSection({ title, icon: SectionIcon, items, currentPath, onToggle }) {
  const hasActive = items.some(item => currentPath === item.path);
  const [open, setOpen] = useState(hasActive);

  useEffect(() => { if (hasActive) setOpen(true); }, [hasActive]);

  const handleToggle = () => {
    const newState = !open;
    setOpen(newState);
    if (newState && onToggle) onToggle();
  };

  // Split title into agent name and function: "AgentName (Function)"
  const titleMatch = title.match(/^(.+?)(\s*\(.+\))?$/);
  const agentName = titleMatch ? titleMatch[1] : title;
  const funcLabel = titleMatch && titleMatch[2] ? titleMatch[2] : '';

  return (
    <div style={{ marginBottom: 2 }}>
      <button onClick={handleToggle} style={{
        display: 'flex', alignItems: 'center', gap: 8, width: '100%',
        padding: '8px 14px', border: 'none', cursor: 'pointer',
        background: hasActive ? 'rgba(255,70,85,0.08)' : 'transparent',
        color: hasActive ? 'var(--accent)' : 'var(--text-secondary)',
        borderRadius: 2, transition: 'all 0.15s',
        borderLeft: hasActive ? '2px solid var(--accent)' : '2px solid transparent',
      }}>
        {SectionIcon && <SectionIcon size={14} style={{ opacity: 0.7, flexShrink: 0 }} />}
        <span style={{ flex: 1, textAlign: 'left' }}>
          <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase' }}>{agentName}</span>
          {funcLabel && <span style={{ fontSize: 10, fontWeight: 500, opacity: 0.5, textTransform: 'none', letterSpacing: 0 }}>{funcLabel}</span>}
        </span>
        <ChevronRight size={11} style={{
          transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s', opacity: 0.4
        }} />
      </button>
      <div style={{
        maxHeight: open ? items.length * 36 + 6 : 0,
        overflow: 'hidden', transition: 'max-height 0.2s ease-in-out'
      }}>
        {items.map(item => {
          const Icon = item.icon;
          return (
            <NavLink key={item.path} to={item.path}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              end={item.path === '/'} style={{ paddingLeft: 26, fontSize: 12, padding: '5px 12px 5px 26px' }}>
              <Icon size={13} /> {item.label}
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

  // Auto-sync: connect Firebase and enable auto-sync on login (zero-setup — built-in config)
  useEffect(() => {
    if (!authenticated) return;
    // Auto-initialize Firebase with built-in config (no manual setup needed)
    autoInit();
    if (!isSyncEnabled()) return;
    const pin = sessionStorage.getItem('kj_current_user') || localStorage.getItem('kj_last_user');
    if (!pin) return;
    // Enable auto-sync (debounced push on every localStorage write)
    enableAutoSync(pin);
    // Start real-time listener (receive updates from other devices)
    startRealtimeSync(pin, (update) => {
      console.log(`[PROTOCOL Sync] Received ${update.keys} updates from another device`);
    });
    // Pull latest data from cloud on login
    pullFromCloud(pin).then(result => {
      if (result.success && result.keys > 0) {
        console.log(`[PROTOCOL Sync] Pulled ${result.keys} items from cloud on login`);
      }
    });
    console.log('[PROTOCOL Sync] Auto-sync activated on login');
  }, [authenticated]);

  useEffect(() => { setSidebarOpen(false); }, [location]);

  // Sound mute state — MUST be before early return to obey React hooks rules
  const [soundsMuted, setSoundsMuted] = useState(() => localStorage.getItem('protocol_sounds_muted') === 'true');

  // Global audio context for UI sounds (shared ref — must be before early return)
  const uiAudioCtxRef = useRef(null);

  // Play "Choose your agent" on dashboard load (after login) — MP3 first, TTS fallback
  const hasPlayedChooseAgent = useRef(false);
  useEffect(() => {
    if (authenticated && !hasPlayedChooseAgent.current && !soundsMuted) {
      hasPlayedChooseAgent.current = true;
      // Delay slightly so the dashboard renders first
      setTimeout(() => {
        try {
          const audio = new Audio('./voicelines/lobby.mp3');
          audio.volume = 0.85;
          audio.play().catch(() => {
            // Fallback to speech synthesis
            try {
              window.speechSynthesis.cancel();
              const u = new SpeechSynthesisUtterance("Choose your agent.");
              u.rate = 0.82; u.pitch = 0.5; u.volume = 0.95;
              const voices = window.speechSynthesis.getVoices();
              const pick = voices.find(v => /male|daniel|james|google uk english male/i.test(v.name))
                || voices.find(v => /english/i.test(v.lang || v.name));
              if (pick) u.voice = pick;
              window.speechSynthesis.speak(u);
            } catch (e) {}
          });
        } catch (e) {}
      }, 300);
    }
  }, [authenticated]);

  // Play navigate sound on route changes (after initial load)
  const isFirstRoute = useRef(true);
  useEffect(() => {
    if (isFirstRoute.current) { isFirstRoute.current = false; return; }
    if (!authenticated || soundsMuted) return;
    try {
      const ctx = uiAudioCtxRef.current && uiAudioCtxRef.current.state !== 'closed'
        ? uiAudioCtxRef.current
        : new (window.AudioContext || window.webkitAudioContext)();
      uiAudioCtxRef.current = ctx;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      osc.type = 'sawtooth'; osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
      filter.type = 'lowpass'; filter.frequency.setValueAtTime(2000, now);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
      osc.start(now); osc.stop(now + 0.15);
    } catch (e) {}
  }, [location.pathname]);

  const handleLogout = () => { clearCurrentUser(); sessionStorage.removeItem('kj_user_role'); window.location.reload(); };

  const handleLoginSuccess = (username, role) => {
    // Persist auth to sessionStorage so the fresh page load picks it up
    setCurrentUser(username);
    sessionStorage.setItem('kj_auth', 'true');
    sessionStorage.setItem('kj_user_role', role || 'Viewer');
    // Reload the page — this is the most reliable transition for a large SPA.
    // On reload, useState initializers read sessionStorage → authenticated=true
    // → dashboard renders directly without any React state transition issues.
    window.location.reload();
  };

  if (!authenticated) return <PinLogin onSuccess={handleLoginSuccess} />;

  const isAdmin = currentUser === 'admin' || currentRole === 'Admin';

  // === VALORANT UI SOUND EFFECTS SYSTEM ===
  const getUICtx = () => {
    if (!uiAudioCtxRef.current || uiAudioCtxRef.current.state === 'closed') {
      uiAudioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return uiAudioCtxRef.current;
  };

  // playValoSound(type) — Valorant UI sound effects for common actions
  const playValoSound = (type) => {
    if (soundsMuted) return;
    try {
      // Try real audio file first for major sounds
      const fileMap = { ace: 'ace', kill: 'kill', defuse: 'defuse', spike: 'spike-plant' };
      if (fileMap[type]) {
        const audio = new Audio(`./sounds/${fileMap[type]}.mp3`);
        audio.volume = 0.35;
        audio.play().catch(() => playValoSynth(type));
        return;
      }
      playValoSynth(type);
    } catch (e) { playValoSynth(type); }
  };

  const playValoSynth = (type) => {
    if (soundsMuted) return;
    try {
      const ctx = getUICtx();
      const now = ctx.currentTime;

      const effects = {
        // WEAPON BUY — like buying from the Valorant store. Click.
        click: () => {
          // Sharp metallic transient + brief tonal confirmation
          const hit = ctx.createOscillator(); const hG = ctx.createGain();
          hit.type = 'square'; hit.frequency.setValueAtTime(2500, now);
          hit.frequency.exponentialRampToValueAtTime(800, now + 0.02);
          hG.gain.setValueAtTime(0.07, now);
          hG.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
          hit.connect(hG); hG.connect(ctx.destination);
          hit.start(now); hit.stop(now + 0.04);
          const tone = ctx.createOscillator(); const tG = ctx.createGain();
          tone.type = 'sine'; tone.frequency.setValueAtTime(880, now + 0.015);
          tG.gain.setValueAtTime(0.05, now + 0.015);
          tG.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
          tone.connect(tG); tG.connect(ctx.destination);
          tone.start(now + 0.015); tone.stop(now + 0.06);
        },

        // TACTICAL MAP TRANSITION — switching sites on the map
        navigate: () => {
          // Filtered whoosh + map ping at destination
          const whoosh = ctx.createOscillator(); const wG = ctx.createGain();
          const wF = ctx.createBiquadFilter();
          whoosh.type = 'sawtooth';
          whoosh.frequency.setValueAtTime(200, now);
          whoosh.frequency.exponentialRampToValueAtTime(1500, now + 0.1);
          wF.type = 'bandpass'; wF.frequency.setValueAtTime(800, now);
          wF.frequency.exponentialRampToValueAtTime(2000, now + 0.1);
          wF.Q.setValueAtTime(2, now);
          wG.gain.setValueAtTime(0.06, now);
          wG.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
          whoosh.connect(wF); wF.connect(wG); wG.connect(ctx.destination);
          whoosh.start(now); whoosh.stop(now + 0.13);
          // Arrival ping
          const ping = ctx.createOscillator(); const pG = ctx.createGain();
          ping.type = 'sine'; ping.frequency.setValueAtTime(1200, now + 0.1);
          ping.frequency.exponentialRampToValueAtTime(900, now + 0.16);
          pG.gain.setValueAtTime(0.06, now + 0.1);
          pG.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
          ping.connect(pG); pG.connect(ctx.destination);
          ping.start(now + 0.1); ping.stop(now + 0.18);
        },

        // ROUND WIN — ascending triumphant stinger
        success: () => {
          // Victory triad: C5 → E5 → G5 with sustain
          [523, 659, 784].forEach((f, i) => {
            const d = i * 0.09;
            const osc = ctx.createOscillator(); const g = ctx.createGain();
            osc.type = 'sine'; osc.frequency.setValueAtTime(f, now + d);
            g.gain.setValueAtTime(0.0, now + d);
            g.gain.linearRampToValueAtTime(0.1, now + d + 0.02);
            g.gain.exponentialRampToValueAtTime(0.001, now + d + 0.2);
            osc.connect(g); g.connect(ctx.destination);
            osc.start(now + d); osc.stop(now + d + 0.2);
          });
          // Harmonic shimmer on top
          const shim = ctx.createOscillator(); const sG = ctx.createGain();
          shim.type = 'triangle'; shim.frequency.setValueAtTime(1568, now + 0.2);
          sG.gain.setValueAtTime(0.04, now + 0.2);
          sG.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
          shim.connect(sG); sG.connect(ctx.destination);
          shim.start(now + 0.2); shim.stop(now + 0.4);
        },

        // ECONOMY ROUND DENIED — can't afford, harsh rejection
        error: () => {
          // Double buzz — dissonant minor second
          [0, 0.12].forEach((d) => {
            const osc = ctx.createOscillator(); const g = ctx.createGain();
            osc.type = 'square'; osc.frequency.setValueAtTime(185, now + d);
            g.gain.setValueAtTime(0.09, now + d);
            g.gain.exponentialRampToValueAtTime(0.001, now + d + 0.1);
            osc.connect(g); g.connect(ctx.destination);
            osc.start(now + d); osc.stop(now + d + 0.1);
            const dis = ctx.createOscillator(); const dG = ctx.createGain();
            dis.type = 'sawtooth'; dis.frequency.setValueAtTime(196, now + d);
            dG.gain.setValueAtTime(0.04, now + d);
            dG.gain.exponentialRampToValueAtTime(0.001, now + d + 0.1);
            dis.connect(dG); dG.connect(ctx.destination);
            dis.start(now + d); dis.stop(now + d + 0.1);
          });
        },

        // COMMS INCOMING — teammate callout notification
        notify: () => {
          // Quick radio blip + attention tone
          const blip = ctx.createOscillator(); const bG = ctx.createGain();
          blip.type = 'square'; blip.frequency.setValueAtTime(3000, now);
          bG.gain.setValueAtTime(0.04, now);
          bG.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
          blip.connect(bG); bG.connect(ctx.destination);
          blip.start(now); blip.stop(now + 0.015);
          const tone = ctx.createOscillator(); const tG = ctx.createGain();
          tone.type = 'sine'; tone.frequency.setValueAtTime(1200, now + 0.02);
          tone.frequency.exponentialRampToValueAtTime(880, now + 0.08);
          tG.gain.setValueAtTime(0.08, now + 0.02);
          tG.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
          tone.connect(tG); tG.connect(ctx.destination);
          tone.start(now + 0.02); tone.stop(now + 0.1);
        },

        // INTEL DOWNLOADED — data transfer confirmation (like Cypher's trap data)
        copy: () => {
          // Quick data chirps ascending → confirmation beep
          [0, 0.03, 0.06].forEach((d, i) => {
            const c = ctx.createOscillator(); const cG = ctx.createGain();
            c.type = 'square'; c.frequency.setValueAtTime(1400 + i * 500, now + d);
            cG.gain.setValueAtTime(0.05, now + d);
            cG.gain.exponentialRampToValueAtTime(0.001, now + d + 0.025);
            c.connect(cG); cG.connect(ctx.destination);
            c.start(now + d); c.stop(now + d + 0.025);
          });
          const conf = ctx.createOscillator(); const confG = ctx.createGain();
          conf.type = 'sine'; conf.frequency.setValueAtTime(1047, now + 0.1);
          confG.gain.setValueAtTime(0.08, now + 0.1);
          confG.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
          conf.connect(confG); confG.connect(ctx.destination);
          conf.start(now + 0.1); conf.stop(now + 0.18);
        },

        // OWL DRONE SCAN — Sova's recon sonar sweep
        scan: () => {
          // Sonar sweep — rising pulse
          const pulse = ctx.createOscillator(); const pG = ctx.createGain();
          pulse.type = 'sine'; pulse.frequency.setValueAtTime(400, now);
          pulse.frequency.exponentialRampToValueAtTime(2200, now + 0.15);
          pG.gain.setValueAtTime(0.1, now);
          pG.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
          pulse.connect(pG); pG.connect(ctx.destination);
          pulse.start(now); pulse.stop(now + 0.2);
          // Radar ring-out
          const ring = ctx.createOscillator(); const rG = ctx.createGain();
          ring.type = 'sine'; ring.frequency.setValueAtTime(1800, now + 0.18);
          ring.frequency.exponentialRampToValueAtTime(1200, now + 0.35);
          rG.gain.setValueAtTime(0.06, now + 0.18);
          rG.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
          ring.connect(rG); rG.connect(ctx.destination);
          ring.start(now + 0.18); ring.stop(now + 0.4);
          // Ghost echo
          const ghost = ctx.createOscillator(); const gG = ctx.createGain();
          ghost.type = 'sine'; ghost.frequency.setValueAtTime(1500, now + 0.32);
          gG.gain.setValueAtTime(0.025, now + 0.32);
          gG.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
          ghost.connect(gG); gG.connect(ctx.destination);
          ghost.start(now + 0.32); ghost.stop(now + 0.45);
        },

        // SPIKE DEFUSE — descending countdown tick (danger)
        delete: () => {
          // Descending alarm tone + static crunch
          const alarm = ctx.createOscillator(); const aG = ctx.createGain();
          alarm.type = 'sawtooth'; alarm.frequency.setValueAtTime(800, now);
          alarm.frequency.exponentialRampToValueAtTime(150, now + 0.18);
          aG.gain.setValueAtTime(0.08, now);
          aG.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
          alarm.connect(aG); aG.connect(ctx.destination);
          alarm.start(now); alarm.stop(now + 0.22);
          // Static crunch at end
          const st = ctx.createOscillator(); const st2 = ctx.createOscillator();
          const stG = ctx.createGain();
          st.type = 'sawtooth'; st2.type = 'square';
          st.frequency.setValueAtTime(4000, now + 0.15); st2.frequency.setValueAtTime(4015, now + 0.15);
          stG.gain.setValueAtTime(0.04, now + 0.15);
          stG.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
          st.connect(stG); st2.connect(stG); stG.connect(ctx.destination);
          st.start(now + 0.15); st2.start(now + 0.15);
          st.stop(now + 0.2); st2.stop(now + 0.2);
        },

        // ABILITY SWAP — quick tactical switch
        toggle: () => {
          // Two-note swap: high→low like switching abilities
          const n1 = ctx.createOscillator(); const g1 = ctx.createGain();
          n1.type = 'sine'; n1.frequency.setValueAtTime(1200, now);
          g1.gain.setValueAtTime(0.07, now);
          g1.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
          n1.connect(g1); g1.connect(ctx.destination);
          n1.start(now); n1.stop(now + 0.04);
          const n2 = ctx.createOscillator(); const g2 = ctx.createGain();
          n2.type = 'sine'; n2.frequency.setValueAtTime(800, now + 0.04);
          g2.gain.setValueAtTime(0.06, now + 0.04);
          g2.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
          n2.connect(g2); g2.connect(ctx.destination);
          n2.start(now + 0.04); n2.stop(now + 0.08);
        },

        // CROSSHAIR HOVER — subtle aim presence
        hover: () => {
          const osc = ctx.createOscillator(); const g = ctx.createGain();
          osc.type = 'sine'; osc.frequency.setValueAtTime(1100, now);
          osc.frequency.exponentialRampToValueAtTime(1000, now + 0.03);
          g.gain.setValueAtTime(0.025, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
          osc.connect(g); g.connect(ctx.destination);
          osc.start(now); osc.stop(now + 0.04);
        },
      };

      if (effects[type]) effects[type]();
    } catch (e) {}
  };

  // Agent ult voicelines — MP3/OGG audio file playback
  // Place real Valorant agent voice files in public/voicelines/{agent}.mp3 or .ogg
  const voicelineAudioRef = React.useRef(null);
  const playUltVoiceline = (agent) => {
    try {
      // Stop any currently playing voiceline
      if (voicelineAudioRef.current) {
        voicelineAudioRef.current.pause();
        voicelineAudioRef.current.currentTime = 0;
      }

      // Try MP3 first, then OGG
      const audio = new Audio(`./voicelines/${agent}.mp3`);
      audio.volume = 0.85;
      voicelineAudioRef.current = audio;

      audio.play().catch(() => {
        // Try OGG format
        const ogg = new Audio(`./voicelines/${agent}.ogg`);
        ogg.volume = 0.85;
        voicelineAudioRef.current = ogg;
        ogg.play().catch(() => {
          // No audio file found — silent (no TTS fallback, user wants real voices only)
        });
      });
    } catch (e) {}
  };

  // Agent select sound effects — synth + ult voiceline
  const playAgentSound = (agent) => {
    if (soundsMuted) return;
    playSynthSound(agent);
    playUltVoiceline(agent);
  };

  const playSynthSound = (agent) => {
    if (soundsMuted) return;
    try {
      const ctx = getUICtx();
      const now = ctx.currentTime;

      const sounds = {
        brimstone: () => {
          // COMMANDER: Military radio click → deep "orders confirmed" bass drop → authority tone
          // Radio click
          const click = ctx.createOscillator(); const cG = ctx.createGain();
          click.type = 'square'; click.frequency.setValueAtTime(4000, now);
          cG.gain.setValueAtTime(0.08, now); cG.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
          click.connect(cG); cG.connect(ctx.destination);
          click.start(now); click.stop(now + 0.02);
          // Deep bass impact — like orbital strike incoming
          const bass = ctx.createOscillator(); const bG = ctx.createGain();
          bass.type = 'sine'; bass.frequency.setValueAtTime(90, now + 0.03);
          bass.frequency.exponentialRampToValueAtTime(45, now + 0.35);
          bG.gain.setValueAtTime(0.18, now + 0.03);
          bG.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
          bass.connect(bG); bG.connect(ctx.destination);
          bass.start(now + 0.03); bass.stop(now + 0.4);
          // Authority confirmation tone (low G)
          const auth = ctx.createOscillator(); const aG = ctx.createGain();
          auth.type = 'sine'; auth.frequency.setValueAtTime(196, now + 0.08);
          aG.gain.setValueAtTime(0.08, now + 0.08);
          aG.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          auth.connect(aG); aG.connect(ctx.destination);
          auth.start(now + 0.08); auth.stop(now + 0.3);
        },

        chamber: () => {
          // WEAPONS DEALER: Elegant weapon cock → gold coin shimmer → precise headshot snap
          // Weapon cock — sharp metallic transient
          const cock = ctx.createOscillator(); const cockG = ctx.createGain();
          const cockF = ctx.createBiquadFilter();
          cock.type = 'sawtooth'; cock.frequency.setValueAtTime(2200, now);
          cock.frequency.exponentialRampToValueAtTime(800, now + 0.03);
          cockF.type = 'highpass'; cockF.frequency.setValueAtTime(600, now);
          cockG.gain.setValueAtTime(0.12, now);
          cockG.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
          cock.connect(cockF); cockF.connect(cockG); cockG.connect(ctx.destination);
          cock.start(now); cock.stop(now + 0.05);
          // Gold shimmer — high harmonics like Tour De Force
          const shim = ctx.createOscillator(); const shim2 = ctx.createOscillator();
          const sG = ctx.createGain();
          shim.type = 'sine'; shim.frequency.setValueAtTime(2637, now + 0.05); // E7
          shim2.type = 'sine'; shim2.frequency.setValueAtTime(3520, now + 0.05); // A7
          sG.gain.setValueAtTime(0.07, now + 0.05);
          sG.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
          shim.connect(sG); shim2.connect(sG); sG.connect(ctx.destination);
          shim.start(now + 0.05); shim2.start(now + 0.05);
          shim.stop(now + 0.25); shim2.stop(now + 0.25);
          // Precision snap
          const snap = ctx.createOscillator(); const snapG = ctx.createGain();
          snap.type = 'sine'; snap.frequency.setValueAtTime(1400, now + 0.04);
          snap.frequency.exponentialRampToValueAtTime(700, now + 0.08);
          snapG.gain.setValueAtTime(0.1, now + 0.04);
          snapG.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
          snap.connect(snapG); snapG.connect(ctx.destination);
          snap.start(now + 0.04); snap.stop(now + 0.1);
        },

        cypher: () => {
          // INFORMATION BROKER: Surveillance camera whirr → encrypted data chirps → "I know exactly where you are"
          // Camera servo whirr
          const servo = ctx.createOscillator(); const servoG = ctx.createGain();
          const servoF = ctx.createBiquadFilter();
          servo.type = 'sawtooth'; servo.frequency.setValueAtTime(150, now);
          servo.frequency.linearRampToValueAtTime(400, now + 0.12);
          servo.frequency.linearRampToValueAtTime(350, now + 0.15);
          servoF.type = 'bandpass'; servoF.frequency.setValueAtTime(300, now); servoF.Q.setValueAtTime(3, now);
          servoG.gain.setValueAtTime(0.06, now);
          servoG.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
          servo.connect(servoF); servoF.connect(servoG); servoG.connect(ctx.destination);
          servo.start(now); servo.stop(now + 0.18);
          // Encrypted data chirps — rapid staccato
          [0.08, 0.13, 0.16, 0.18].forEach((d, i) => {
            const chirp = ctx.createOscillator(); const cG = ctx.createGain();
            chirp.type = 'square';
            chirp.frequency.setValueAtTime(1800 + i * 600, now + d);
            cG.gain.setValueAtTime(0.06, now + d);
            cG.gain.exponentialRampToValueAtTime(0.001, now + d + 0.025);
            chirp.connect(cG); cG.connect(ctx.destination);
            chirp.start(now + d); chirp.stop(now + d + 0.025);
          });
          // Spycam "locked on" tone
          const lock = ctx.createOscillator(); const lG = ctx.createGain();
          lock.type = 'sine'; lock.frequency.setValueAtTime(1200, now + 0.2);
          lG.gain.setValueAtTime(0.08, now + 0.2);
          lG.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
          lock.connect(lG); lG.connect(ctx.destination);
          lock.start(now + 0.2); lock.stop(now + 0.35);
        },

        sova: () => {
          // HUNTER/RECON: Bow draw tension → recon dart launch whoosh → sonar radar ping + echo
          // Bow string tension
          const bow = ctx.createOscillator(); const bowG = ctx.createGain();
          bow.type = 'sine'; bow.frequency.setValueAtTime(120, now);
          bow.frequency.exponentialRampToValueAtTime(350, now + 0.15);
          bowG.gain.setValueAtTime(0.06, now);
          bowG.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
          bow.connect(bowG); bowG.connect(ctx.destination);
          bow.start(now); bow.stop(now + 0.15);
          // Dart launch — fast ascending whoosh
          const dart = ctx.createOscillator(); const dG = ctx.createGain();
          const dF = ctx.createBiquadFilter();
          dart.type = 'sawtooth'; dart.frequency.setValueAtTime(300, now + 0.1);
          dart.frequency.exponentialRampToValueAtTime(3000, now + 0.18);
          dF.type = 'bandpass'; dF.frequency.setValueAtTime(1500, now); dF.Q.setValueAtTime(2, now);
          dG.gain.setValueAtTime(0.07, now + 0.1);
          dG.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
          dart.connect(dF); dF.connect(dG); dG.connect(ctx.destination);
          dart.start(now + 0.1); dart.stop(now + 0.22);
          // Sonar ping
          const ping = ctx.createOscillator(); const pG = ctx.createGain();
          ping.type = 'sine'; ping.frequency.setValueAtTime(1800, now + 0.22);
          ping.frequency.exponentialRampToValueAtTime(1400, now + 0.35);
          pG.gain.setValueAtTime(0.12, now + 0.22);
          pG.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
          ping.connect(pG); pG.connect(ctx.destination);
          ping.start(now + 0.22); ping.stop(now + 0.4);
          // Radar echo (quieter repeat)
          const echo = ctx.createOscillator(); const eG = ctx.createGain();
          echo.type = 'sine'; echo.frequency.setValueAtTime(1600, now + 0.38);
          echo.frequency.exponentialRampToValueAtTime(1300, now + 0.48);
          eG.gain.setValueAtTime(0.04, now + 0.38);
          eG.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
          echo.connect(eG); eG.connect(ctx.destination);
          echo.start(now + 0.38); echo.stop(now + 0.5);
        },

        killjoy: () => {
          // SENTINEL/TECH: Turret deployment beep-beep-beep → lockdown alarm → "defending this site"
          // Turret boot sequence — rapid ascending triple beep
          [0, 0.07, 0.14].forEach((d, i) => {
            const beep = ctx.createOscillator(); const bG = ctx.createGain();
            beep.type = 'sine';
            beep.frequency.setValueAtTime(800 + i * 400, now + d);
            bG.gain.setValueAtTime(0.1, now + d);
            bG.gain.exponentialRampToValueAtTime(0.001, now + d + 0.05);
            beep.connect(bG); bG.connect(ctx.destination);
            beep.start(now + d); beep.stop(now + d + 0.05);
          });
          // Lockdown activation — descending alarm tone
          const alarm = ctx.createOscillator(); const aG = ctx.createGain();
          alarm.type = 'square'; alarm.frequency.setValueAtTime(1200, now + 0.22);
          alarm.frequency.exponentialRampToValueAtTime(600, now + 0.35);
          aG.gain.setValueAtTime(0.06, now + 0.22);
          aG.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
          alarm.connect(aG); aG.connect(ctx.destination);
          alarm.start(now + 0.22); alarm.stop(now + 0.38);
          // System online hum
          const hum = ctx.createOscillator(); const hG = ctx.createGain();
          hum.type = 'sine'; hum.frequency.setValueAtTime(220, now + 0.2);
          hG.gain.setValueAtTime(0.05, now + 0.2);
          hG.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
          hum.connect(hG); hG.connect(ctx.destination);
          hum.start(now + 0.2); hum.stop(now + 0.4);
        },

        neon: () => {
          // DUELIST/ELECTRIC: Sprint charge-up → crackling energy burst → overdrive impact
          // Electric charge buildup
          const charge = ctx.createOscillator(); const chG = ctx.createGain();
          charge.type = 'sawtooth'; charge.frequency.setValueAtTime(100, now);
          charge.frequency.exponentialRampToValueAtTime(2500, now + 0.15);
          chG.gain.setValueAtTime(0.08, now);
          chG.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
          charge.connect(chG); chG.connect(ctx.destination);
          charge.start(now); charge.stop(now + 0.18);
          // Electric crackle — multiple short bursts
          [0.06, 0.1, 0.14].forEach((d) => {
            const crk = ctx.createOscillator(); const crkG = ctx.createGain();
            crk.type = 'square';
            crk.frequency.setValueAtTime(3000 + Math.random() * 2000, now + d);
            crkG.gain.setValueAtTime(0.05, now + d);
            crkG.gain.exponentialRampToValueAtTime(0.001, now + d + 0.02);
            crk.connect(crkG); crkG.connect(ctx.destination);
            crk.start(now + d); crk.stop(now + d + 0.02);
          });
          // Overdrive bass impact
          const od = ctx.createOscillator(); const odG = ctx.createGain();
          od.type = 'sine'; od.frequency.setValueAtTime(80, now + 0.12);
          od.frequency.exponentialRampToValueAtTime(40, now + 0.25);
          odG.gain.setValueAtTime(0.12, now + 0.12);
          odG.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
          od.connect(odG); odG.connect(ctx.destination);
          od.start(now + 0.12); od.stop(now + 0.28);
          // Blue energy shimmer
          const blue = ctx.createOscillator(); const blG = ctx.createGain();
          blue.type = 'triangle'; blue.frequency.setValueAtTime(2400, now + 0.15);
          blue.frequency.exponentialRampToValueAtTime(1800, now + 0.3);
          blG.gain.setValueAtTime(0.04, now + 0.15);
          blG.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          blue.connect(blG); blG.connect(ctx.destination);
          blue.start(now + 0.15); blue.stop(now + 0.3);
        },

        harbor: () => {
          // WATER CONTROLLER: Tidal surge → cascading wave → deep oceanic rumble
          const wave = ctx.createOscillator(); const wG = ctx.createGain();
          wave.type = 'sine'; wave.frequency.setValueAtTime(180, now);
          wave.frequency.exponentialRampToValueAtTime(350, now + 0.15);
          wave.frequency.exponentialRampToValueAtTime(100, now + 0.35);
          wG.gain.setValueAtTime(0.06, now);
          wG.gain.linearRampToValueAtTime(0.12, now + 0.1);
          wG.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
          wave.connect(wG); wG.connect(ctx.destination);
          wave.start(now); wave.stop(now + 0.4);
          // Cascade overtone
          const cas = ctx.createOscillator(); const casG = ctx.createGain();
          cas.type = 'triangle'; cas.frequency.setValueAtTime(600, now + 0.08);
          cas.frequency.exponentialRampToValueAtTime(300, now + 0.3);
          casG.gain.setValueAtTime(0.05, now + 0.08);
          casG.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
          cas.connect(casG); casG.connect(ctx.destination);
          cas.start(now + 0.08); cas.stop(now + 0.35);
        },

        jett: () => {
          // SPEED DUELIST: Dash whoosh → sharp updraft → tailwind shimmer
          const dash = ctx.createOscillator(); const dG = ctx.createGain();
          const dF = ctx.createBiquadFilter();
          dash.type = 'sawtooth'; dash.frequency.setValueAtTime(200, now);
          dash.frequency.exponentialRampToValueAtTime(4000, now + 0.1);
          dF.type = 'bandpass'; dF.frequency.setValueAtTime(2000, now); dF.Q.setValueAtTime(1.5, now);
          dG.gain.setValueAtTime(0.1, now); dG.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
          dash.connect(dF); dF.connect(dG); dG.connect(ctx.destination);
          dash.start(now); dash.stop(now + 0.15);
          const up = ctx.createOscillator(); const uG = ctx.createGain();
          up.type = 'sine'; up.frequency.setValueAtTime(800, now + 0.08);
          up.frequency.exponentialRampToValueAtTime(1600, now + 0.2);
          uG.gain.setValueAtTime(0.08, now + 0.08); uG.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
          up.connect(uG); uG.connect(ctx.destination);
          up.start(now + 0.08); up.stop(now + 0.25);
        },

        sage: () => {
          // HEALER: Warm healing chime → resurrection glow → protective barrier hum
          const heal = ctx.createOscillator(); const hG = ctx.createGain();
          heal.type = 'sine'; heal.frequency.setValueAtTime(523, now); // C5
          hG.gain.setValueAtTime(0.1, now); hG.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          heal.connect(hG); hG.connect(ctx.destination);
          heal.start(now); heal.stop(now + 0.3);
          const glow = ctx.createOscillator(); const gG = ctx.createGain();
          glow.type = 'sine'; glow.frequency.setValueAtTime(659, now + 0.1); // E5
          gG.gain.setValueAtTime(0.08, now + 0.1); gG.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
          glow.connect(gG); gG.connect(ctx.destination);
          glow.start(now + 0.1); glow.stop(now + 0.35);
          const wall = ctx.createOscillator(); const wG = ctx.createGain();
          wall.type = 'triangle'; wall.frequency.setValueAtTime(220, now + 0.15);
          wG.gain.setValueAtTime(0.05, now + 0.15); wG.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
          wall.connect(wG); wG.connect(ctx.destination);
          wall.start(now + 0.15); wall.stop(now + 0.4);
        },

        viper: () => {
          // TOXIC: Acid hiss → poison bubble → area denial alarm
          const hiss = ctx.createOscillator(); const hG = ctx.createGain();
          const hF = ctx.createBiquadFilter();
          hiss.type = 'sawtooth'; hiss.frequency.setValueAtTime(6000, now);
          hiss.frequency.exponentialRampToValueAtTime(2000, now + 0.15);
          hF.type = 'highpass'; hF.frequency.setValueAtTime(3000, now);
          hG.gain.setValueAtTime(0.04, now); hG.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
          hiss.connect(hF); hF.connect(hG); hG.connect(ctx.destination);
          hiss.start(now); hiss.stop(now + 0.18);
          [0.06, 0.11, 0.15].forEach((d) => {
            const bub = ctx.createOscillator(); const bG = ctx.createGain();
            bub.type = 'sine'; bub.frequency.setValueAtTime(200 + Math.random() * 300, now + d);
            bG.gain.setValueAtTime(0.06, now + d); bG.gain.exponentialRampToValueAtTime(0.001, now + d + 0.04);
            bub.connect(bG); bG.connect(ctx.destination);
            bub.start(now + d); bub.stop(now + d + 0.04);
          });
        },

        reyna: () => {
          // SOUL EATER: Soul orb collect → empress activation → devour pulse
          const soul = ctx.createOscillator(); const sG = ctx.createGain();
          soul.type = 'sine'; soul.frequency.setValueAtTime(400, now);
          soul.frequency.exponentialRampToValueAtTime(1200, now + 0.12);
          sG.gain.setValueAtTime(0.1, now); sG.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
          soul.connect(sG); sG.connect(ctx.destination);
          soul.start(now); soul.stop(now + 0.2);
          const empress = ctx.createOscillator(); const eG = ctx.createGain();
          empress.type = 'sawtooth'; empress.frequency.setValueAtTime(150, now + 0.1);
          empress.frequency.exponentialRampToValueAtTime(80, now + 0.3);
          eG.gain.setValueAtTime(0.08, now + 0.1); eG.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
          empress.connect(eG); eG.connect(ctx.destination);
          empress.start(now + 0.1); empress.stop(now + 0.35);
        },

        phoenix: () => {
          // FIRE: Ignition burst → flame crackle → blaze roar
          const ign = ctx.createOscillator(); const iG = ctx.createGain();
          ign.type = 'sawtooth'; ign.frequency.setValueAtTime(300, now);
          ign.frequency.exponentialRampToValueAtTime(1500, now + 0.08);
          iG.gain.setValueAtTime(0.1, now); iG.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
          ign.connect(iG); iG.connect(ctx.destination);
          ign.start(now); ign.stop(now + 0.12);
          [0.05, 0.09, 0.13, 0.16].forEach((d) => {
            const crk = ctx.createOscillator(); const cG = ctx.createGain();
            crk.type = 'square'; crk.frequency.setValueAtTime(2000 + Math.random() * 3000, now + d);
            cG.gain.setValueAtTime(0.04, now + d); cG.gain.exponentialRampToValueAtTime(0.001, now + d + 0.02);
            crk.connect(cG); cG.connect(ctx.destination);
            crk.start(now + d); crk.stop(now + d + 0.02);
          });
          const blaze = ctx.createOscillator(); const bG = ctx.createGain();
          blaze.type = 'sine'; blaze.frequency.setValueAtTime(120, now + 0.1);
          bG.gain.setValueAtTime(0.08, now + 0.1); bG.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          blaze.connect(bG); bG.connect(ctx.destination);
          blaze.start(now + 0.1); blaze.stop(now + 0.3);
        },

        astra: () => {
          // COSMIC: Star collapse → gravity well → cosmic resonance
          const star = ctx.createOscillator(); const sG = ctx.createGain();
          star.type = 'sine'; star.frequency.setValueAtTime(2000, now);
          star.frequency.exponentialRampToValueAtTime(100, now + 0.2);
          sG.gain.setValueAtTime(0.08, now); sG.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
          star.connect(sG); sG.connect(ctx.destination);
          star.start(now); star.stop(now + 0.25);
          const grav = ctx.createOscillator(); const gG = ctx.createGain();
          grav.type = 'triangle'; grav.frequency.setValueAtTime(80, now + 0.12);
          grav.frequency.exponentialRampToValueAtTime(40, now + 0.35);
          gG.gain.setValueAtTime(0.1, now + 0.12); gG.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
          grav.connect(gG); gG.connect(ctx.destination);
          grav.start(now + 0.12); grav.stop(now + 0.4);
        },

        fade: () => {
          // NIGHTMARE: Prowler growl → haunt whisper → terror pulse
          const growl = ctx.createOscillator(); const grG = ctx.createGain();
          growl.type = 'sawtooth'; growl.frequency.setValueAtTime(80, now);
          growl.frequency.linearRampToValueAtTime(60, now + 0.2);
          grG.gain.setValueAtTime(0.08, now); grG.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
          growl.connect(grG); grG.connect(ctx.destination);
          growl.start(now); growl.stop(now + 0.25);
          const whisp = ctx.createOscillator(); const wG = ctx.createGain();
          const wF = ctx.createBiquadFilter();
          whisp.type = 'sine'; whisp.frequency.setValueAtTime(3000, now + 0.08);
          whisp.frequency.exponentialRampToValueAtTime(1500, now + 0.2);
          wF.type = 'bandpass'; wF.frequency.setValueAtTime(2000, now); wF.Q.setValueAtTime(5, now);
          wG.gain.setValueAtTime(0.04, now + 0.08); wG.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
          whisp.connect(wF); wF.connect(wG); wG.connect(ctx.destination);
          whisp.start(now + 0.08); whisp.stop(now + 0.22);
        },

        gekko: () => {
          // CREATURES: Dizzy bounce → mosh pit rumble → thrash pop
          const bounce = ctx.createOscillator(); const boG = ctx.createGain();
          bounce.type = 'sine'; bounce.frequency.setValueAtTime(600, now);
          bounce.frequency.exponentialRampToValueAtTime(1200, now + 0.06);
          bounce.frequency.exponentialRampToValueAtTime(400, now + 0.15);
          boG.gain.setValueAtTime(0.1, now); boG.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
          bounce.connect(boG); boG.connect(ctx.destination);
          bounce.start(now); bounce.stop(now + 0.18);
          const pop = ctx.createOscillator(); const pG = ctx.createGain();
          pop.type = 'square'; pop.frequency.setValueAtTime(1400, now + 0.1);
          pop.frequency.exponentialRampToValueAtTime(800, now + 0.16);
          pG.gain.setValueAtTime(0.06, now + 0.1); pG.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
          pop.connect(pG); pG.connect(ctx.destination);
          pop.start(now + 0.1); pop.stop(now + 0.2);
        },

        breach: () => {
          // BREAKER: Fault line crack → aftershock tremor → seismic slam
          const crack = ctx.createOscillator(); const crG = ctx.createGain();
          crack.type = 'square'; crack.frequency.setValueAtTime(3000, now);
          crack.frequency.exponentialRampToValueAtTime(200, now + 0.06);
          crG.gain.setValueAtTime(0.12, now); crG.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
          crack.connect(crG); crG.connect(ctx.destination);
          crack.start(now); crack.stop(now + 0.1);
          const quake = ctx.createOscillator(); const qG = ctx.createGain();
          quake.type = 'sine'; quake.frequency.setValueAtTime(60, now + 0.05);
          quake.frequency.linearRampToValueAtTime(30, now + 0.3);
          qG.gain.setValueAtTime(0.15, now + 0.05); qG.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
          quake.connect(qG); qG.connect(ctx.destination);
          quake.start(now + 0.05); quake.stop(now + 0.35);
        },

        deadlock: () => {
          // SENTINEL: Heavy mechanical lock → industrial grind → trap deploy clank
          // Mechanical lock engaging
          const lock = ctx.createOscillator(); const lG = ctx.createGain();
          const lF = ctx.createBiquadFilter();
          lock.type = 'sawtooth'; lock.frequency.setValueAtTime(300, now);
          lock.frequency.exponentialRampToValueAtTime(80, now + 0.1);
          lF.type = 'lowpass'; lF.frequency.setValueAtTime(400, now);
          lG.gain.setValueAtTime(0.12, now);
          lG.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
          lock.connect(lF); lF.connect(lG); lG.connect(ctx.destination);
          lock.start(now); lock.stop(now + 0.12);
          // Industrial grind — gritty texture
          const grind = ctx.createOscillator(); const gG = ctx.createGain();
          const gF = ctx.createBiquadFilter();
          grind.type = 'sawtooth'; grind.frequency.setValueAtTime(100, now + 0.08);
          grind.frequency.linearRampToValueAtTime(200, now + 0.2);
          gF.type = 'bandpass'; gF.frequency.setValueAtTime(180, now); gF.Q.setValueAtTime(5, now);
          gG.gain.setValueAtTime(0.08, now + 0.08);
          gG.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
          grind.connect(gF); gF.connect(gG); gG.connect(ctx.destination);
          grind.start(now + 0.08); grind.stop(now + 0.25);
          // Trap deploy — heavy metallic clank
          const clank = ctx.createOscillator(); const clG = ctx.createGain();
          clank.type = 'square'; clank.frequency.setValueAtTime(600, now + 0.15);
          clank.frequency.exponentialRampToValueAtTime(120, now + 0.22);
          clG.gain.setValueAtTime(0.1, now + 0.15);
          clG.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          clank.connect(clG); clG.connect(ctx.destination);
          clank.start(now + 0.15); clank.stop(now + 0.3);
        },

        kayo: () => {
          // SUPPRESSOR: EMP charge up → flash/suppress pulse → system neutralized confirmation
          // EMP charge up — rising whine
          const charge = ctx.createOscillator(); const chG = ctx.createGain();
          charge.type = 'sine'; charge.frequency.setValueAtTime(200, now);
          charge.frequency.exponentialRampToValueAtTime(2000, now + 0.15);
          chG.gain.setValueAtTime(0.06, now);
          chG.gain.linearRampToValueAtTime(0.12, now + 0.12);
          chG.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
          charge.connect(chG); chG.connect(ctx.destination);
          charge.start(now); charge.stop(now + 0.18);
          // Suppress pulse — short burst
          const pulse = ctx.createOscillator(); const pG = ctx.createGain();
          const pF = ctx.createBiquadFilter();
          pulse.type = 'square'; pulse.frequency.setValueAtTime(800, now + 0.15);
          pulse.frequency.exponentialRampToValueAtTime(200, now + 0.22);
          pF.type = 'lowpass'; pF.frequency.setValueAtTime(1200, now);
          pG.gain.setValueAtTime(0.14, now + 0.15);
          pG.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
          pulse.connect(pF); pF.connect(pG); pG.connect(ctx.destination);
          pulse.start(now + 0.15); pulse.stop(now + 0.25);
          // Neutralized tone — low confirmation beep
          const tone = ctx.createOscillator(); const tG = ctx.createGain();
          tone.type = 'sine'; tone.frequency.setValueAtTime(440, now + 0.22);
          tG.gain.setValueAtTime(0.08, now + 0.22);
          tG.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
          tone.connect(tG); tG.connect(ctx.destination);
          tone.start(now + 0.22); tone.stop(now + 0.35);
        },

        omen: () => {
          // SHADOW CONTROLLER: Dark portal whoosh → eerie whisper tone → void echo
          // Dark portal — descending filtered noise
          const portal = ctx.createOscillator(); const pG = ctx.createGain();
          const pF = ctx.createBiquadFilter();
          portal.type = 'sawtooth'; portal.frequency.setValueAtTime(800, now);
          portal.frequency.exponentialRampToValueAtTime(100, now + 0.2);
          pF.type = 'lowpass'; pF.frequency.setValueAtTime(600, now);
          pF.frequency.exponentialRampToValueAtTime(150, now + 0.2);
          pG.gain.setValueAtTime(0.08, now);
          pG.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
          portal.connect(pF); pF.connect(pG); pG.connect(ctx.destination);
          portal.start(now); portal.stop(now + 0.25);
          // Eerie whisper — high sine with tremolo
          const whisp = ctx.createOscillator(); const wG = ctx.createGain();
          whisp.type = 'sine'; whisp.frequency.setValueAtTime(1600, now + 0.1);
          whisp.frequency.linearRampToValueAtTime(1200, now + 0.3);
          wG.gain.setValueAtTime(0.04, now + 0.1);
          wG.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
          whisp.connect(wG); wG.connect(ctx.destination);
          whisp.start(now + 0.1); whisp.stop(now + 0.35);
          // Void echo — deep reverb hit
          const echo = ctx.createOscillator(); const eG = ctx.createGain();
          echo.type = 'sine'; echo.frequency.setValueAtTime(80, now + 0.05);
          eG.gain.setValueAtTime(0.1, now + 0.05);
          eG.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          echo.connect(eG); eG.connect(ctx.destination);
          echo.start(now + 0.05); echo.stop(now + 0.3);
        },

        skye: () => {
          // NATURE INITIATOR: Bird call chirp → forest wind whoosh → hawk screech
          // Bird chirp — quick ascending trill
          const chirp = ctx.createOscillator(); const cG = ctx.createGain();
          chirp.type = 'sine'; chirp.frequency.setValueAtTime(2000, now);
          chirp.frequency.exponentialRampToValueAtTime(3500, now + 0.06);
          chirp.frequency.exponentialRampToValueAtTime(2200, now + 0.1);
          cG.gain.setValueAtTime(0.1, now);
          cG.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
          chirp.connect(cG); cG.connect(ctx.destination);
          chirp.start(now); chirp.stop(now + 0.12);
          // Second chirp
          const chirp2 = ctx.createOscillator(); const c2G = ctx.createGain();
          chirp2.type = 'sine'; chirp2.frequency.setValueAtTime(2400, now + 0.08);
          chirp2.frequency.exponentialRampToValueAtTime(3800, now + 0.14);
          c2G.gain.setValueAtTime(0.08, now + 0.08);
          c2G.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
          chirp2.connect(c2G); c2G.connect(ctx.destination);
          chirp2.start(now + 0.08); chirp2.stop(now + 0.16);
          // Nature wind — filtered noise texture
          const wind = ctx.createOscillator(); const wG = ctx.createGain();
          const wF = ctx.createBiquadFilter();
          wind.type = 'sawtooth'; wind.frequency.setValueAtTime(200, now + 0.12);
          wF.type = 'bandpass'; wF.frequency.setValueAtTime(800, now); wF.Q.setValueAtTime(1, now);
          wG.gain.setValueAtTime(0.04, now + 0.12);
          wG.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          wind.connect(wF); wF.connect(wG); wG.connect(ctx.destination);
          wind.start(now + 0.12); wind.stop(now + 0.3);
        },

        lobby: () => {
          // HOME BASE: Clean menu open → ambient system hum → ready indicator
          // Menu open — two-note chime (like Valorant main menu)
          const n1 = ctx.createOscillator(); const n1G = ctx.createGain();
          n1.type = 'sine'; n1.frequency.setValueAtTime(784, now); // G5
          n1G.gain.setValueAtTime(0.08, now);
          n1G.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
          n1.connect(n1G); n1G.connect(ctx.destination);
          n1.start(now); n1.stop(now + 0.12);
          const n2 = ctx.createOscillator(); const n2G = ctx.createGain();
          n2.type = 'sine'; n2.frequency.setValueAtTime(1047, now + 0.06); // C6
          n2G.gain.setValueAtTime(0.06, now + 0.06);
          n2G.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
          n2.connect(n2G); n2G.connect(ctx.destination);
          n2.start(now + 0.06); n2.stop(now + 0.18);
          // Ambient hum
          const hum = ctx.createOscillator(); const hG = ctx.createGain();
          hum.type = 'sine'; hum.frequency.setValueAtTime(110, now + 0.1);
          hG.gain.setValueAtTime(0.03, now + 0.1);
          hG.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          hum.connect(hG); hG.connect(ctx.destination);
          hum.start(now + 0.1); hum.stop(now + 0.3);
        },
        yoru: () => {
          // DUELIST: Dimensional rift tear — reality split → warp through → arrival impact
          // Rift tear — quick descending warp
          const tear = ctx.createOscillator(); const tG = ctx.createGain();
          const tF = ctx.createBiquadFilter();
          tear.type = 'sawtooth'; tear.frequency.setValueAtTime(2000, now);
          tear.frequency.exponentialRampToValueAtTime(100, now + 0.12);
          tF.type = 'bandpass'; tF.frequency.setValueAtTime(800, now); tF.Q.setValueAtTime(5, now);
          tG.gain.setValueAtTime(0.1, now);
          tG.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
          tear.connect(tF); tF.connect(tG); tG.connect(ctx.destination);
          tear.start(now); tear.stop(now + 0.15);
          // Dimensional warp — mid-range phasing tone
          const warp = ctx.createOscillator(); const wG = ctx.createGain();
          warp.type = 'sine'; warp.frequency.setValueAtTime(300, now + 0.08);
          warp.frequency.exponentialRampToValueAtTime(600, now + 0.18);
          warp.frequency.exponentialRampToValueAtTime(150, now + 0.28);
          wG.gain.setValueAtTime(0.07, now + 0.08);
          wG.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          warp.connect(wG); wG.connect(ctx.destination);
          warp.start(now + 0.08); warp.stop(now + 0.3);
          // Arrival thump — you've emerged
          const thump = ctx.createOscillator(); const thG = ctx.createGain();
          thump.type = 'sine'; thump.frequency.setValueAtTime(60, now + 0.2);
          thump.frequency.exponentialRampToValueAtTime(30, now + 0.35);
          thG.gain.setValueAtTime(0.12, now + 0.2);
          thG.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
          thump.connect(thG); thG.connect(ctx.destination);
          thump.start(now + 0.2); thump.stop(now + 0.38);
        },

        clove: () => {
          // CONTROLLER: Ethereal, ghostly presence — life manipulation
          const ghost = ctx.createOscillator(); const ghostG = ctx.createGain();
          ghost.type = 'sine'; ghost.frequency.setValueAtTime(600, now);
          ghost.frequency.exponentialRampToValueAtTime(400, now + 0.2);
          ghostG.gain.setValueAtTime(0.08, now);
          ghostG.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
          ghost.connect(ghostG); ghostG.connect(ctx.destination);
          ghost.start(now); ghost.stop(now + 0.25);
          // Ethereal shimmer
          const eth = ctx.createOscillator(); const ethG = ctx.createGain();
          eth.type = 'triangle'; eth.frequency.setValueAtTime(1800, now + 0.05);
          eth.frequency.exponentialRampToValueAtTime(1200, now + 0.2);
          ethG.gain.setValueAtTime(0.05, now + 0.05);
          ethG.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
          eth.connect(ethG); ethG.connect(ctx.destination);
          eth.start(now + 0.05); eth.stop(now + 0.22);
        },
      };

      if (sounds[agent]) sounds[agent]();
    } catch (e) { /* Audio not supported */ }
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
      title: 'Brimstone (Strategy)', icon: LayoutDashboard, agent: 'brimstone',
      items: [
        { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/leads-dashboard', icon: PieChart, label: 'Leads Analytics' },
        { path: '/strategy-builder', icon: Zap, label: 'Strategy Builder' },
      ]
    },
    {
      title: 'Cypher (Leads)', icon: Crosshair, agent: 'cypher',
      items: [
        { path: '/search', icon: Search, label: 'Lead Search' },
        { path: '/emails', icon: Mail, label: 'Email Extractor' },
        { path: '/leads', icon: Database, label: 'My Leads' },
        { path: '/verify', icon: Shield, label: 'Lead Verifier' },
      ]
    },
    {
      title: 'Chamber (Social Intel)', icon: Instagram, agent: 'chamber',
      items: [
        { path: '/instagram', icon: Instagram, label: 'Instagram' },
        { path: '/facebook', icon: Facebook, label: 'Facebook / Meta' },
        { path: '/fb-ads', icon: DollarSign, label: 'FB Ads Library' },
        { path: '/linkedin', icon: Linkedin, label: 'LinkedIn' },
        { path: '/twitter', icon: Twitter, label: 'Twitter / X' },
      ]
    },
    {
      title: 'Killjoy (SEO)', icon: Globe, agent: 'killjoy',
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
      title: 'Sova (Research)', icon: Microscope, agent: 'sova',
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
      title: 'Neon (Content)', icon: Wand2, agent: 'neon',
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
      title: 'Jett (Ads)', icon: Flame, agent: 'jett',
      items: [
        { path: '/jett-campaigns', icon: Flame, label: 'Campaign Manager' },
        { path: '/jett-budget', icon: Wallet, label: 'Budget Optimizer' },
        { path: '/jett-roas', icon: LineChart, label: 'ROAS Tracker' },
        { path: '/jett-abtests', icon: SplitSquareVertical, label: 'A/B Tests' },
      ]
    },
    {
      title: 'Sage (CRM)', icon: Heart, agent: 'sage',
      items: [
        { path: '/sage-customers', icon: Users, label: 'Customer Database' },
        { path: '/sage-lifecycle', icon: Repeat2, label: 'Lifecycle Tracker' },
        { path: '/sage-retention', icon: Heart, label: 'Retention Engine' },
        { path: '/sage-churn', icon: AlertTriangle, label: 'Churn Predictor' },
      ]
    },
    {
      title: 'Viper (Email)', icon: Send, agent: 'viper',
      items: [
        { path: '/viper-drip', icon: Send, label: 'Drip Campaigns' },
        { path: '/viper-newsletter', icon: Mail, label: 'Newsletter Editor' },
        { path: '/viper-segments', icon: Filter, label: 'Segmentation' },
      ]
    },
    {
      title: 'Reyna (Influencers)', icon: Crown, agent: 'reyna',
      items: [
        { path: '/reyna-discover', icon: Crown, label: 'Influencer Discovery' },
        { path: '/reyna-outreach', icon: Handshake, label: 'Outreach Manager' },
        { path: '/reyna-tracker', icon: Target, label: 'Campaign Tracker' },
        { path: '/reyna-ugc', icon: Heart, label: 'UGC Hub' },
      ]
    },
    {
      title: 'Phoenix (Social)', icon: CalendarDays, agent: 'phoenix',
      items: [
        { path: '/phoenix-calendar', icon: CalendarDays, label: 'Content Calendar' },
        { path: '/phoenix-scheduler', icon: Clock, label: 'Smart Scheduler' },
        { path: '/phoenix-engagement', icon: ThumbsUp, label: 'Engagement Tracker' },
        { path: '/phoenix-community', icon: UsersRound, label: 'Community Inbox' },
      ]
    },
    {
      title: 'Astra (Media)', icon: Orbit, agent: 'astra',
      items: [
        { path: '/astra-planner', icon: Tv, label: 'Media Planner' },
        { path: '/astra-grp', icon: Calculator, label: 'GRP Calculator' },
        { path: '/astra-mix', icon: Orbit, label: 'Media Mix Optimizer' },
      ]
    },
    {
      title: 'Fade (Analytics)', icon: Waypoints, agent: 'fade',
      items: [
        { path: '/fade-utm', icon: Link, label: 'UTM Builder' },
        { path: '/fade-attribution', icon: Waypoints, label: 'Attribution Model' },
        { path: '/fade-funnel', icon: Scan, label: 'Funnel Analyzer' },
      ]
    },
    {
      title: 'Gekko (Community)', icon: Bot, agent: 'gekko',
      items: [
        { path: '/gekko-broadcast', icon: SmartphoneNfc, label: 'WhatsApp Broadcast' },
        { path: '/gekko-chatbot', icon: Bot, label: 'Chatbot Builder' },
        { path: '/gekko-referral', icon: Gift, label: 'Referral Program' },
      ]
    },
    {
      title: 'Breach (PR)', icon: Siren, agent: 'breach',
      items: [
        { path: '/breach-press', icon: Newspaper, label: 'Press Releases' },
        { path: '/breach-medialist', icon: Users, label: 'Media List' },
        { path: '/breach-crisis', icon: Siren, label: 'Crisis Playbook' },
        { path: '/breach-sentiment', icon: Activity, label: 'Sentiment Monitor' },
      ]
    },
    {
      title: 'Harbor (Distribution)', icon: Anchor, agent: 'harbor',
      items: [
        { path: '/harbor-distributors', icon: Building2, label: 'Distributor DB' },
        { path: '/harbor-onboarding', icon: ClipboardList, label: 'Onboarding' },
        { path: '/harbor-schemes', icon: Gift, label: 'Trade Schemes' },
        { path: '/harbor-orders', icon: Package, label: 'Order Tracker' },
        { path: '/harbor-territory', icon: MapPinned, label: 'Territory Plan' },
        { path: '/harbor-scorecard', icon: Gauge, label: 'Scorecard' },
        { path: '/harbor-agreements', icon: FileCheck, label: 'Agreements' },
        { path: '/harbor-claims', icon: Scale, label: 'Claims Tracker' },
      ]
    },
    {
      title: 'Deadlock (Production)', icon: Factory, agent: 'deadlock',
      items: [
        { path: '/deadlock-production', icon: Factory, label: 'Production Planner' },
        { path: '/deadlock-inventory', icon: Boxes, label: 'Raw Materials' },
        { path: '/deadlock-vendors', icon: Truck, label: 'Vendor Manager' },
        { path: '/deadlock-qc', icon: FlaskConical, label: 'Quality Control' },
        { path: '/deadlock-batches', icon: Barcode, label: 'Batch Tracker' },
        { path: '/deadlock-cogs', icon: Calculator, label: 'COGS Calculator' },
        { path: '/deadlock-fssai', icon: Leaf, label: 'FSSAI Compliance' },
        { path: '/deadlock-recipes', icon: PackageCheck, label: 'Recipe Manager' },
      ]
    },
    {
      title: 'Clove (Finance)', icon: BadgeDollarSign, agent: 'clove',
      items: [
        { path: '/clove-pnl', icon: FileBarChart, label: 'Profit & Loss' },
        { path: '/clove-expenses', icon: Wallet, label: 'Expense Tracker' },
        { path: '/clove-invoices', icon: Receipt, label: 'Invoice Generator' },
        { path: '/clove-payments', icon: ArrowUpDown, label: 'Payment Tracker' },
        { path: '/clove-cashflow', icon: TrendingDown, label: 'Cash Flow' },
        { path: '/clove-budgets', icon: PiggyBank, label: 'Budget Tracker' },
        { path: '/clove-margins', icon: Percent, label: 'Margin Analysis' },
      ]
    },
    {
      title: 'Omen (Tasks)', icon: Ghost, agent: 'omen',
      items: [
        { path: '/omen-tasks', icon: FolderKanban, label: 'Task Board' },
        { path: '/omen-projects', icon: Layers, label: 'Project Tracker' },
        { path: '/omen-timeline', icon: CalendarDays, label: 'Timeline' },
        { path: '/omen-meetings', icon: StickyNote, label: 'Meeting Notes' },
        { path: '/omen-briefs', icon: Feather, label: 'Brief Builder' },
        { path: '/omen-dependencies', icon: Waypoints, label: 'Dependencies' },
        { path: '/omen-sow', icon: FileCheck, label: 'SOW Generator' },
      ]
    },
    {
      title: 'Skye (Influencers)', icon: Bird, agent: 'skye',
      items: [
        { path: '/skye-influencers', icon: Users, label: 'Influencer DB' },
        { path: '/skye-campaigns', icon: Megaphone, label: 'Campaigns' },
        { path: '/skye-outreach', icon: Send, label: 'Outreach' },
        { path: '/skye-roi', icon: TrendingUp, label: 'ROI Tracker' },
        { path: '/skye-approvals', icon: Eye, label: 'Content Approval' },
        { path: '/skye-discovery', icon: Search, label: 'Discovery' },
        { path: '/skye-contracts', icon: FileText, label: 'Contracts' },
      ]
    },
    {
      title: 'Lobby (Settings)', icon: Settings, agent: 'lobby',
      items: [
        ...(isAdmin ? [
          { path: '/admin-panel', icon: Shield, label: 'Admin Panel' },
          { path: '/user-management', icon: Users, label: 'User Management' },
        ] : []),
        { path: '/lobby-email', icon: Mail, label: 'Protocol Mail' },
        { path: '/settings', icon: Settings, label: 'Settings' },
      ]
    },
    {
      title: 'Yoru (Automation)', icon: Waypoints, agent: 'yoru',
      items: [
        { path: '/yoru-workflow', icon: Waypoints, label: 'Rift Engine' },
        { path: '/yoru-automations', icon: FolderKanban, label: 'Saved Rifts' },
        { path: '/yoru-history', icon: Clock, label: 'Rift History' },
      ]
    },
    {
      title: 'KAY/O (Dev Agent)', icon: Terminal, agent: 'kayo',
      items: [
        { path: '/kayo-chat', icon: MessageCircle, label: 'KAY/O Chat' },
        { path: '/kayo-code-review', icon: Eye, label: 'Code Review' },
        { path: '/kayo-git', icon: GitBranch, label: 'Git Dashboard' },
        { path: '/kayo-deploy', icon: Rocket, label: 'Deploy Manager' },
      ]
    }
  ];

  return (
    <AppErrorBoundary>
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
                    onToggle={section.agent ? () => playAgentSound(section.agent) : null} />
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
            {/* Jett — Paid Ads */}
            <Route path="/jett-campaigns" element={<JettCampaignManager />} />
            <Route path="/jett-budget" element={<JettBudgetOptimizer />} />
            <Route path="/jett-roas" element={<JettROASTracker />} />
            <Route path="/jett-abtests" element={<JettABTests />} />
            {/* Sage — CRM */}
            <Route path="/sage-customers" element={<SageCustomerDB />} />
            <Route path="/sage-lifecycle" element={<SageLifecycle />} />
            <Route path="/sage-retention" element={<SageRetention />} />
            <Route path="/sage-churn" element={<SageChurnPredictor />} />
            {/* Viper — Email */}
            <Route path="/viper-drip" element={<ViperDripBuilder />} />
            <Route path="/viper-newsletter" element={<ViperNewsletter />} />
            <Route path="/viper-segments" element={<ViperSegmentation />} />
            {/* Reyna — Influencer */}
            <Route path="/reyna-discover" element={<ReynaDiscovery />} />
            <Route path="/reyna-outreach" element={<ReynaOutreach />} />
            <Route path="/reyna-tracker" element={<ReynaCampaignTracker />} />
            <Route path="/reyna-ugc" element={<ReynaUGCHub />} />
            {/* Phoenix — Social Media */}
            <Route path="/phoenix-calendar" element={<PhoenixCalendar />} />
            <Route path="/phoenix-scheduler" element={<PhoenixScheduler />} />
            <Route path="/phoenix-engagement" element={<PhoenixEngagement />} />
            <Route path="/phoenix-community" element={<PhoenixCommunity />} />
            {/* Astra — Media Planning */}
            <Route path="/astra-planner" element={<AstraMediaPlanner />} />
            <Route path="/astra-grp" element={<AstraGRPCalculator />} />
            <Route path="/astra-mix" element={<AstraMediaMix />} />
            {/* Fade — Attribution */}
            <Route path="/fade-utm" element={<FadeUTMBuilder />} />
            <Route path="/fade-attribution" element={<FadeAttribution />} />
            <Route path="/fade-funnel" element={<FadeFunnelAnalyzer />} />
            {/* Gekko — Community */}
            <Route path="/gekko-broadcast" element={<GekkoBroadcast />} />
            <Route path="/gekko-chatbot" element={<GekkoChatbot />} />
            <Route path="/gekko-referral" element={<GekkoReferral />} />
            {/* Breach — PR */}
            <Route path="/breach-press" element={<BreachPressRelease />} />
            <Route path="/breach-medialist" element={<BreachMediaList />} />
            <Route path="/breach-crisis" element={<BreachCrisisPlaybook />} />
            <Route path="/breach-sentiment" element={<BreachSentimentMonitor />} />
            <Route path="/harbor-distributors" element={<HarborDistributorDB />} />
            <Route path="/harbor-onboarding" element={<HarborOnboarding />} />
            <Route path="/harbor-schemes" element={<HarborTradeSchemes />} />
            <Route path="/harbor-orders" element={<HarborOrderTracker />} />
            <Route path="/harbor-territory" element={<HarborTerritory />} />
            <Route path="/harbor-scorecard" element={<HarborScorecard />} />
            <Route path="/harbor-agreements" element={<HarborAgreementGen />} />
            <Route path="/harbor-claims" element={<HarborClaimsTracker />} />
            <Route path="/deadlock-production" element={<DeadlockProductionPlanner />} />
            <Route path="/deadlock-inventory" element={<DeadlockInventory />} />
            <Route path="/deadlock-vendors" element={<DeadlockVendorManager />} />
            <Route path="/deadlock-qc" element={<DeadlockQualityControl />} />
            <Route path="/deadlock-batches" element={<DeadlockBatchTracker />} />
            <Route path="/deadlock-cogs" element={<DeadlockCOGS />} />
            <Route path="/deadlock-fssai" element={<DeadlockFSSAI />} />
            <Route path="/deadlock-recipes" element={<DeadlockRecipeManager />} />
            <Route path="/clove-pnl" element={<KayoPnL />} />
            <Route path="/clove-expenses" element={<KayoExpenseTracker />} />
            <Route path="/clove-invoices" element={<KayoInvoiceGen />} />
            <Route path="/clove-payments" element={<KayoPaymentTracker />} />
            <Route path="/clove-cashflow" element={<KayoCashFlow />} />
            <Route path="/clove-budgets" element={<KayoBudgetTracker />} />
            <Route path="/clove-margins" element={<KayoMarginAnalysis />} />
            <Route path="/omen-tasks" element={<OmenTaskBoard />} />
            <Route path="/omen-projects" element={<OmenProjectTracker />} />
            <Route path="/omen-timeline" element={<OmenTimeline />} />
            <Route path="/omen-meetings" element={<OmenMeetingNotes />} />
            <Route path="/omen-briefs" element={<OmenBriefBuilder />} />
            <Route path="/omen-dependencies" element={<OmenDependencyMap />} />
            <Route path="/omen-sow" element={<OmenSOWGenerator />} />
            <Route path="/skye-influencers" element={<SkyeInfluencerDB />} />
            <Route path="/skye-campaigns" element={<SkyeCampaignManager />} />
            <Route path="/skye-outreach" element={<SkyeOutreach />} />
            <Route path="/skye-roi" element={<SkyeROITracker />} />
            <Route path="/skye-approvals" element={<SkyeContentApproval />} />
            <Route path="/skye-discovery" element={<SkyeDiscovery />} />
            <Route path="/skye-contracts" element={<SkyeContractGen />} />
            {isAdmin && <Route path="/admin-panel" element={<AdminPanel />} />}
            {isAdmin && <Route path="/user-management" element={<UserManagement />} />}
            <Route path="/lobby-email" element={<LobbyEmail />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/yoru-workflow" element={<YoruWorkflow />} />
            <Route path="/yoru-automations" element={<YoruAutomations />} />
            <Route path="/yoru-history" element={<YoruHistory />} />
            <Route path="/kayo-chat" element={<IsoChat />} />
            <Route path="/kayo-code-review" element={<IsoCodeReview />} />
            <Route path="/kayo-git" element={<IsoGitDashboard />} />
            <Route path="/kayo-deploy" element={<IsoDeployManager />} />
          </Routes>
        </main>
      </div>
    </>
    </AppErrorBoundary>
  );
}
