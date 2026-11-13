import { TemplateNode, ArticleNode } from '../types';

/**
 * Converts a list of section title strings to Level 1 TemplateNode objects.
 */
export function stringSectionsToTemplateNodes(sections: string[]): TemplateNode[] {
  return sections.map((sec, index) => ({
    id: `tnode-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}-${index}`,
    title: sec,
    parentId: null,
    level: 1,
    order: index + 1,
    defaultValue: '',
    placeholder: `Please enter details for ${sec}...`,
    required: false,
    enabled: true,
    children: [],
  }));
}

/**
 * Extracts all titles recursively from TemplateNode[] for compact tag previews.
 */
export function extractTemplateSectionTitles(nodes: TemplateNode[]): string[] {
  const titles: string[] = [];
  function traverse(list: TemplateNode[]) {
    for (const n of list) {
      if (n.title) titles.push(n.title);
      if (n.children && n.children.length > 0) {
        traverse(n.children);
      }
    }
  }
  traverse(nodes || []);
  return titles;
}

/**
 * Deep copies TemplateNode[] into an ArticleNode[] snapshot.
 * defaultValue is automatically populated into node.value.
 */
export function copyTemplateStructureToArticle(
  nodes: TemplateNode[],
  parentId: string | null = null
): ArticleNode[] {
  return (nodes || []).map((node, index) => {
    const articleNodeId = `art-node-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}-${index}`;
    const articleNode: ArticleNode = {
      nodeId: articleNodeId,
      templateNodeId: node.id,
      key: node.title,
      value: node.defaultValue || '',
      parentId: parentId,
      level: node.level || 1,
      order: node.order ?? index + 1,
      required: !!node.required,
      placeholder: node.placeholder || `Enter ${node.title}...`,
      children: [],
    };

    if (node.children && node.children.length > 0) {
      articleNode.children = copyTemplateStructureToArticle(node.children, articleNodeId);
    }

    return articleNode;
  });
}

/**
 * Updates a node value by nodeId in the ArticleNode tree recursively.
 */
export function updateArticleNodeValue(
  nodes: ArticleNode[],
  targetNodeId: string,
  newValue: string
): ArticleNode[] {
  return nodes.map((node) => {
    if (node.nodeId === targetNodeId) {
      return { ...node, value: newValue };
    }
    if (node.children && node.children.length > 0) {
      return {
        ...node,
        children: updateArticleNodeValue(node.children, targetNodeId, newValue),
      };
    }
    return node;
  });
}

/**
 * Flattens an ArticleNode tree into an ordered array for outline & linear indexing.
 */
export function flattenArticleNodes(nodes: ArticleNode[]): ArticleNode[] {
  const flat: ArticleNode[] = [];
  function traverse(list: ArticleNode[]) {
    for (const node of list) {
      flat.push(node);
      if (node.children && node.children.length > 0) {
        traverse(node.children);
      }
    }
  }
  traverse(nodes || []);
  return flat;
}

/**
 * Converts ArticleNode[] into formatted HTML string for backward compatibility / review preview.
 */
export function articleStructureToHtml(nodes: ArticleNode[]): string {
  if (!nodes || nodes.length === 0) return '<p>No content specified.</p>';
  let html = '';
  for (const node of nodes) {
    const headingTag = node.level === 1 ? 'h2' : node.level === 2 ? 'h3' : 'h4';
    html += `<${headingTag} class="font-bold text-gray-900 mt-4 mb-2">${node.key}</${headingTag}>`;
    if (node.value && node.value.trim()) {
      html += `<div class="mb-3 text-gray-700 whitespace-pre-wrap">${node.value}</div>`;
    } else {
      html += `<p class="text-gray-400 italic mb-3">No details entered.</p>`;
    }
    if (node.children && node.children.length > 0) {
      html += `<div class="pl-4 border-l-2 border-blue-100 my-2">${articleStructureToHtml(node.children)}</div>`;
    }
  }
  return html;
}

/**
 * Validates that all required nodes in ArticleNode[] have non-empty value.
 */
export function validateRequiredStructureNodes(nodes: ArticleNode[]): {
  valid: boolean;
  missingNodes: { nodeId: string; key: string }[];
} {
  const missingNodes: { nodeId: string; key: string }[] = [];
  function check(list: ArticleNode[]) {
    for (const n of list) {
      if (n.required && (!n.value || !n.value.trim())) {
        missingNodes.push({ nodeId: n.nodeId || n.id || '', key: n.key || n.title || '' });
      }
      if (n.children && n.children.length > 0) {
        check(n.children);
      }
    }
  }
  check(nodes || []);
  return {
    valid: missingNodes.length === 0,
    missingNodes,
  };
}

export interface HtmlHeadingItem {
  id: string;
  title: string;
  level: number;
  sectionNumber: string;
}

/**
 * Extracts headings (h1, h2, h3, h4) from rich HTML to build an interactive outline tree.
 */
export function extractHeadingsFromHtml(html: string): HtmlHeadingItem[] {
  if (!html) return [];
  const regex = /<(h[1-4])[^>]*>(.*?)<\/\1>/gi;
  const items: HtmlHeadingItem[] = [];
  let match;
  let l1Count = 0;
  let l2Count = 0;
  let l3Count = 0;

  while ((match = regex.exec(html)) !== null) {
    const tag = match[1].toLowerCase();
    const rawContent = match[2];
    const cleanTitle = rawContent.replace(/<[^>]*>/g, '').trim();
    if (!cleanTitle) continue;

    const level = tag === 'h1' ? 1 : tag === 'h2' ? 1 : tag === 'h3' ? 2 : 3;
    let sectionNumber = '';

    if (level === 1) {
      l1Count++;
      l2Count = 0;
      l3Count = 0;
      sectionNumber = `${l1Count}`;
    } else if (level === 2) {
      l2Count++;
      l3Count = 0;
      sectionNumber = `${l1Count || 1}.${l2Count}`;
    } else {
      l3Count++;
      sectionNumber = `${l1Count || 1}.${l2Count || 1}.${l3Count}`;
    }

    const safeId = `heading-${items.length}-${cleanTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 24)}`;

    items.push({
      id: safeId,
      title: cleanTitle,
      level,
      sectionNumber,
    });
  }

  return items;
}

/**
 * Extracts section titles from HTML headings for compact tag displays.
 */
export function extractSectionTitlesFromHtml(html: string): string[] {
  const headings = extractHeadingsFromHtml(html);
  if (headings.length > 0) {
    return headings.map((h) => h.title);
  }
  return ['Overview', 'Details'];
}

/**
 * Computes word count, character count, heading count and reading time.
 */
export function getRichTextStats(html: string): {
  wordCount: number;
  charCount: number;
  headingCount: number;
  readingTimeMinutes: number;
} {
  if (!html) return { wordCount: 0, charCount: 0, headingCount: 0, readingTimeMinutes: 0 };
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const words = text ? text.split(/\s+/).length : 0;
  const charCount = text.length;
  const headings = (html.match(/<h[1-4][^>]*>/gi) || []).length;
  const readingTimeMinutes = Math.max(1, Math.ceil(words / 200));

  return {
    wordCount: words,
    charCount,
    headingCount: headings,
    readingTimeMinutes,
  };
}

/**
 * Professional preset rich text templates for high-fidelity authoring.
 */
export const RICH_TEXT_TEMPLATE_PRESETS = [
  {
    id: 'preset-known-issue',
    name: 'Known Issue & Workaround Advisory',
    description: 'Engineering bulletin for known hardware/firmware defects with symptom box, affected matrix, and resolution',
    category: 'Known Issue',
    html: `<h2>1. Defect Advisory & Symptom Overview</h2>
<div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; margin-bottom: 16px; border-radius: 4px;">
  <strong style="color: #b45309;">⚠️ Advisory Notice:</strong>
  <p style="color: #92400e; margin: 4px 0 0 0;">This document identifies an engineering defect confirmed under specific firmware revisions. Field technicians should follow the temporary workaround pending the scheduled UEFI/driver update.</p>
</div>
<p><strong>Observed Symptom:</strong> Systems intermittently experience display flickering or complete video dropout when connected to external Thunderbolt 4 / USB-C docks following cold boots or resumption from Modern Standby (S0ix).</p>

<h2>2. Applicable Products & Configurations</h2>
<p>The following platform configurations are within the scope of this advisory:</p>
<table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 13px;">
  <thead>
    <tr style="background-color: #f3f4f6; border-bottom: 2px solid #e5e7eb;">
      <th style="padding: 8px 12px; text-align: left;">Product Family</th>
      <th style="padding: 8px 12px; text-align: left;">Machine Type (MTM)</th>
      <th style="padding: 8px 12px; text-align: left;">Affected BIOS / Driver</th>
      <th style="padding: 8px 12px; text-align: left;">Severity</th>
    </tr>
  </thead>
  <tbody>
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 8px 12px;">ThinkPad T14s Gen 4 / P14s Gen 4</td>
      <td style="padding: 8px 12px;">21F8, 21F9, 21HF</td>
      <td style="padding: 8px 12px;">BIOS v1.24 ~ v1.28</td>
      <td style="padding: 8px 12px;"><span style="background: #fee2e2; color: #dc2626; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 11px;">High</span></td>
    </tr>
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 8px 12px;">ThinkPad X13 Gen 4</td>
      <td style="padding: 8px 12px;">21EX, 21EY</td>
      <td style="padding: 8px 12px;">Thunderbolt Retimer NVM &lt; v38</td>
      <td style="padding: 8px 12px;"><span style="background: #fef3c7; color: #d97706; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 11px;">Medium</span></td>
    </tr>
  </tbody>
</table>

<h2>3. Root Cause Investigation</h2>
<p>Root cause analysis indicates a race condition between the Intel Thunderbolt Retimer power state handshake and the Type-C PD controller during PCIe link training. When the dock negotiates DisplayPort Alt Mode at 40Gbps, signal integrity attenuation triggers an LTTPR link drop.</p>

<h2>4. Resolution & Engineering Workaround</h2>
<p>Execute the following multi-phase recovery procedure:</p>
<ol>
  <li><strong>Step 1 (Immediate Workaround):</strong> Disconnect AC power and external peripherals. Press and hold the emergency reset pinhole on the bottom cover for 10 seconds.</li>
  <li><strong>Step 2 (Firmware Flash):</strong> Download and install Thunderbolt Retimer Firmware update package <em>v39.02</em> or higher from the Lenovo Support Portal.</li>
  <li><strong>Step 3 (BIOS Configuration):</strong> Enter BIOS Setup (F1) &rarr; <em>Config</em> &rarr; <em>Display</em> &rarr; Set <strong>Boot Display Device</strong> to <code>ThinkPad LCD</code> rather than <code>Auto</code>.</li>
</ol>

<div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
  <strong style="color: #047857;">💡 Permanent Fix Status:</strong>
  <p style="color: #065f46; margin: 4px 0 0 0;">An integrated BIOS release (v1.30+) is slated for Worldwide deployment in the upcoming engineering cycle. Hardware board replacement is NOT recommended for this symptom.</p>
</div>

<h2>5. Field Dispatch & Warranty Guidance</h2>
<p>Do not replace the system board (FRU) or dock unit unless diagnostic LED code <code>0284</code> persists after flashing Retimer NVM v39.02. Escalate recurring failures with full Lenovo Diagnostics HTML log attached.</p>`,
  },
  {
    id: 'preset-standard-howto',
    name: 'Interactive Technical How-To Guide',
    description: 'Structured procedural guide with prerequisites, step cards, callouts, and verification checklist',
    category: 'How-To',
    html: `<h2>1. Objective & Scope</h2>
<div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; margin-bottom: 16px; border-radius: 4px;">
  <strong style="color: #1d4ed8;">📘 Guide Objective:</strong>
  <p style="color: #1e40af; margin: 4px 0 0 0;">This standard how-to document provides step-by-step instructions for enterprise deployment, operating system provisioning, and firmware configuration on Lenovo commercial client devices.</p>
</div>

<h2>2. Prerequisites & Tools Required</h2>
<p>Ensure the following items and credentials are prepared prior to beginning:</p>
<ul>
  <li>Target system running Windows 11 Enterprise (22H2 / 23H2) or Ubuntu 22.04 LTS</li>
  <li>Lenovo Commercial Vantage deployed via Intune / SCCM</li>
  <li>Administrator privileges on the local host</li>
  <li>High-speed Internet access with firewall allowance for <code>download.lenovo.com</code></li>
</ul>

<h2>3. Step-by-Step Procedure</h2>
<h3>Step 3.1: Hardware Preparation</h3>
<p>Connect the target device to its authorized OEM USB-C / Slim-Tip AC power adapter. Ensure battery capacity is at or above 50% before initiating firmware updates.</p>

<h3>Step 3.2: Configuration & Deployment</h3>
<p>Run the Lenovo System Update utility via PowerShell command line:</p>
<pre style="background-color: #1f2937; color: #f9fafb; padding: 12px 16px; border-radius: 6px; font-family: monospace; font-size: 12px; overflow-x: auto;"><code># Execute automated Lenovo driver scan and silent installation
Start-Process -FilePath "C:\\Program Files (x86)\\Lenovo\\System Update\\tvsu.exe" -ArgumentList "/CM -search A -action INSTALL -includereboot" -Wait</code></pre>

<h3>Step 3.3: Peripheral Verification</h3>
<p>Verify all Thunderbolt / USB-C docks, monitors, and audio peripherals are recognized in Windows Device Manager with zero error codes (Code 10 / Code 43).</p>

<h2>4. Verification & Validation Checklist</h2>
<table style="width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px;">
  <thead>
    <tr style="background-color: #f3f4f6; border-bottom: 2px solid #e5e7eb;">
      <th style="padding: 8px 12px; text-align: left;">Check Item</th>
      <th style="padding: 8px 12px; text-align: left;">Expected Result</th>
      <th style="padding: 8px 12px; text-align: center;">Status</th>
    </tr>
  </thead>
  <tbody>
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 8px 12px;">BIOS / EC Firmware Version</td>
      <td style="padding: 8px 12px;">Matches latest support portal baseline</td>
      <td style="padding: 8px 12px; text-align: center;"><span style="color: #10b981; font-weight: bold;">✔ Pass</span></td>
    </tr>
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 8px 12px;">Lenovo Diagnostics Quick Test</td>
      <td style="padding: 8px 12px;">0 errors across CPU, RAM, NVMe storage</td>
      <td style="padding: 8px 12px; text-align: center;"><span style="color: #10b981; font-weight: bold;">✔ Pass</span></td>
    </tr>
  </tbody>
</table>`,
  },
  {
    id: 'preset-field-sop',
    name: 'Field Service & Component Replacement SOP',
    description: 'Technician standard operating procedure with safety protocols, replacement table, and quality checks',
    category: 'SOP',
    html: `<h2>1. Safety Warning & ESD Precautions</h2>
<div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; margin-bottom: 16px; border-radius: 4px;">
  <strong style="color: #b91c1c;">🛑 DANGER — HIGH VOLTAGE & SENSITIVE COMPONENTS:</strong>
  <p style="color: #991b1b; margin: 4px 0 0 0;">Always disconnect the AC power cord and disable the internal battery via BIOS Setup (Config &rarr; Power &rarr; Disable Built-in Battery) prior to removing any service access cover. Wear a certified ESD wrist strap connected to an unpainted grounded earth point.</p>
</div>

<h2>2. Required Tools & Spare Parts Matrix</h2>
<table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 13px;">
  <thead>
    <tr style="background-color: #f3f4f6; border-bottom: 2px solid #e5e7eb;">
      <th style="padding: 8px 12px; text-align: left;">Component</th>
      <th style="padding: 8px 12px; text-align: left;">FRU Part Number</th>
      <th style="padding: 8px 12px; text-align: left;">Required Screwdriver / Tool</th>
      <th style="padding: 8px 12px; text-align: left;">Torque Spec</th>
    </tr>
  </thead>
  <tbody>
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 8px 12px;">Base Cover Assembly</td>
      <td style="padding: 8px 12px;">5M11H12345</td>
      <td style="padding: 8px 12px;">Philips PH0 screwdriver, nylon pry tool</td>
      <td style="padding: 8px 12px;">0.25 ± 0.03 N·m</td>
    </tr>
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 8px 12px;">Thermal Fan & Heat Pipe</td>
      <td style="padding: 8px 12px;">5H41D67890</td>
      <td style="padding: 8px 12px;">Philips PH0, thermal paste syringe</td>
      <td style="padding: 8px 12px;">0.20 ± 0.02 N·m</td>
    </tr>
  </tbody>
</table>

<h2>3. Teardown & Replacement Sequence</h2>
<ol>
  <li>Loosen the captive screws securing the base cover in diagonal sequence (1 &rarr; 4 &rarr; 2 &rarr; 3).</li>
  <li>Use a non-marring nylon pry tool along the rear hinge gap to release the internal retention clips.</li>
  <li>Disconnect the thermal fan PWM harness from the mainboard socket.</li>
  <li>Clean residual thermal interface material (TIM) from CPU/GPU dies with 99% isopropyl alcohol wipes before applying fresh phase-change TIM.</li>
</ol>

<h2>4. Post-Assembly Quality Assurance (QA)</h2>
<p>Perform the following post-repair bench verification:</p>
<ul>
  <li>Attach AC adapter to disengage the internal battery shipping lock.</li>
  <li>Power on and press F10 to launch Lenovo Diagnostics UEFI Embedded Edition.</li>
  <li>Run the <em>Fan Diagnostic Test</em> to verify PWM tachometer reporting between 1200 RPM and 4800 RPM.</li>
</ul>`,
  },
];

