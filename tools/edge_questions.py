"""
Edge-Based Intuition Extraction for TFG v6
Questions about GABRIEL'S world — not about stocks.
His answers map to multiple stocks simultaneously.

The questions extract signal from Gabriel's actual life:
- AI developer experience (Hamming, building, shipping)
- Startup ecosystem (HC, UCL, YC-adjacent)
- Vibe-coding / no-code AI revolution
- SMB founder perspective (CallCatch)
- Personal AI usage patterns
- Student/young builder ecosystem

Usage:
  python3 edge_questions.py --generate
  python3 edge_questions.py --show-mappings
"""

import argparse
import json
import os
from datetime import datetime

QUESTIONS = [
    # === AI DEVELOPER EXPERIENCE ===
    {
        "id": "dev-switching-friction",
        "domain": "ai_developer",
        "question": "You're an ML engineer told to migrate your production inference from CUDA to a new stack next quarter. On a gut level — is your reaction closer to 'cool, new tech' or 'fuck, my whole workflow breaks'? Rate the pain 0-10.",
        "context": "You've worked across AI tooling at Hamming. You know what it's like when the underlying stack changes.",
        "scale": {"min": 0, "max": 10, "unit": "pain", "step": 1},
        "anchors": [
            {"value": 2, "desc": "Minor — frameworks abstract it, I barely touch GPU code directly"},
            {"value": 5, "desc": "Moderate — some things break, debugging is harder, 2-3 week disruption"},
            {"value": 8, "desc": "Severe — months of work. Custom kernels, profiling tools, CI pipelines all break"},
        ],
        "maps_to": [
            {"stock": "NVDA", "param": "cuda_lock_in", "direction": "higher pain = more NVDA bullish"},
            {"stock": "AMD", "param": "rocm_adoption_barrier", "direction": "higher pain = more AMD bearish"},
            {"stock": "GOOGL", "param": "tpu_switching_cost", "direction": "higher pain = TPU adoption slower"},
        ],
    },
    {
        "id": "dev-ai-dependency",
        "domain": "ai_developer",
        "question": "If Claude, GPT, and every AI coding assistant went down for a full week — how many productive hours per day do YOU personally lose? Not the industry average. Your actual day.",
        "context": "You use AI tools daily for Hamming work, personal projects, and this system.",
        "scale": {"min": 0, "max": 8, "unit": "hours/day lost", "step": 0.5},
        "anchors": [
            {"value": 1, "desc": "Minor hit — I coded fine before AI, just slower on boilerplate"},
            {"value": 3, "desc": "Real impact — debugging, research, and writing take 2x longer"},
            {"value": 6, "desc": "Crippling — AI is load-bearing for my workflow, can barely function without"},
        ],
        "maps_to": [
            {"stock": "NVDA", "param": "ai_compute_demand", "direction": "higher dependency = demand is real, capex justified"},
            {"stock": "GOOGL", "param": "ai_product_stickiness", "direction": "higher = users won't leave AI products"},
            {"stock": "META", "param": "ai_integration_value", "direction": "higher = AI features actually matter to users"},
        ],
    },
    {
        "id": "dev-rocm-reality",
        "domain": "ai_developer",
        "question": "AMD says ROCm hits 'ecosystem parity' with CUDA by end of 2026. Based on everything you've seen, heard, and experienced with ML frameworks — what percentage of the way there is ROCm TODAY for real production work?",
        "context": "You've worked with PyTorch, various inference engines, and seen what actually runs in production vs what demos well.",
        "scale": {"min": 0, "max": 100, "unit": "% parity", "step": 5},
        "anchors": [
            {"value": 15, "desc": "Demos work. Production breaks constantly. Years away."},
            {"value": 40, "desc": "Simple inference works. Training is painful. Libraries half-ported."},
            {"value": 70, "desc": "Actually usable for most workloads. Edge cases still need CUDA."},
        ],
        "maps_to": [
            {"stock": "NVDA", "param": "moat_durability", "direction": "lower parity = NVDA moat intact"},
            {"stock": "AMD", "param": "competitive_position", "direction": "higher parity = AMD competitive"},
        ],
    },

    # === STARTUP / HC ECOSYSTEM ===
    {
        "id": "ecosystem-gpu-vs-api",
        "domain": "startup_ecosystem",
        "question": "Of the AI startups and projects you've encountered through Hamming, HC, UCL, and your network in the last 6 months — what fraction are building directly on GPUs vs calling cloud APIs that abstract the hardware away?",
        "context": "You're in the HC community, UCL CS, and the London AI startup scene. You see what people are actually building.",
        "scale": {"min": 0, "max": 100, "unit": "% on GPUs directly", "step": 5},
        "anchors": [
            {"value": 10, "desc": "Almost nobody touches GPUs. Everyone uses OpenAI/Anthropic/Google APIs."},
            {"value": 35, "desc": "Training teams and infra companies need GPUs. App builders use APIs."},
            {"value": 60, "desc": "Lots of GPU work — fine-tuning, custom models, on-prem inference."},
        ],
        "maps_to": [
            {"stock": "NVDA", "param": "startup_demand_floor", "direction": "higher GPU % = stronger NVDA demand from startups"},
            {"stock": "GOOGL", "param": "cloud_api_growth", "direction": "lower GPU % = more API revenue for cloud providers"},
            {"stock": "MSFT", "param": "azure_ai_demand", "direction": "lower GPU % = Azure API usage growing"},
        ],
    },
    {
        "id": "ecosystem-vibe-coding",
        "domain": "startup_ecosystem",
        "question": "Vibe-coding is exploding — non-engineers building apps with AI. Of the projects you've seen come out of HC, UCL hackathons, or your social circle recently, what percentage were built by people who COULDN'T have built them 2 years ago without AI?",
        "context": "You're at the epicenter of this. HC members, UCL students, friends who aren't CS majors but are now shipping things.",
        "scale": {"min": 0, "max": 100, "unit": "%", "step": 5},
        "anchors": [
            {"value": 15, "desc": "Mostly still real engineers. AI helps speed but isn't enabling new builders."},
            {"value": 40, "desc": "Meaningful chunk of new builders. Hackathon projects that wouldn't have existed."},
            {"value": 70, "desc": "Majority. Non-technical people are actually shipping real things with AI."},
        ],
        "maps_to": [
            {"stock": "GOOGL", "param": "ai_user_expansion", "direction": "higher = AI market expanding beyond engineers (bullish distribution)"},
            {"stock": "META", "param": "ai_democratization", "direction": "higher = more people building on AI platforms"},
            {"stock": "NVDA", "param": "compute_demand_breadth", "direction": "higher = demand base widening beyond hyperscalers"},
        ],
    },
    {
        "id": "ecosystem-ai-startup-health",
        "domain": "startup_ecosystem",
        "question": "The AI startups you've seen recently — what fraction do you think will still exist in 18 months? Not the ones you WANT to survive. The ones that actually have retention, revenue, or a real moat.",
        "context": "You've seen pitches, talked to founders, watched HC projects evolve. You know which ones feel real vs demo-day theater.",
        "scale": {"min": 0, "max": 100, "unit": "% surviving", "step": 5},
        "anchors": [
            {"value": 15, "desc": "Bloodbath. Most are wrappers with no moat. Funding dries up."},
            {"value": 35, "desc": "Normal startup mortality + AI-specific shakeout. Strong ones survive."},
            {"value": 60, "desc": "Surprisingly resilient. AI is a real market and these companies have customers."},
        ],
        "maps_to": [
            {"stock": "NVDA", "param": "speculative_demand", "direction": "lower survival = VC-funded GPU demand disappears"},
            {"stock": "GOOGL", "param": "cloud_churn_risk", "direction": "lower survival = startup cloud spend evaporates"},
        ],
    },

    # === PERSONAL AI USAGE ===
    {
        "id": "usage-search-cannibalization",
        "domain": "personal_usage",
        "question": "Last 30 days — what percentage of questions you would have Googled 2 years ago do you now ask Claude/ChatGPT/Perplexity instead? YOUR actual behavior, not what you think average people do.",
        "context": "You're a power user of both Google and AI tools. Your behavior is a leading indicator of what tech-savvy users will do next year.",
        "scale": {"min": 0, "max": 100, "unit": "%", "step": 5},
        "anchors": [
            {"value": 20, "desc": "Mostly still Google. AI for coding, not general search."},
            {"value": 45, "desc": "Real shift. Factual Qs go to AI, navigation/shopping stays Google."},
            {"value": 75, "desc": "Google is just for links now. Everything else is AI first."},
        ],
        "maps_to": [
            {"stock": "GOOGL", "param": "search_cannibalization", "direction": "higher = search revenue at risk long-term"},
            {"stock": "MSFT", "param": "bing_copilot_growth", "direction": "higher = AI search is real market"},
        ],
    },
    {
        "id": "usage-gemini-vs-chatgpt",
        "domain": "personal_usage",
        "question": "Have you personally used Gemini in the last month? Not the API — the actual Gemini app or Gemini in Google Search. If yes, for what? If no, why not?",
        "context": "You have both Android exposure (through the ecosystem) and power user needs. Your non-usage is data.",
        "scale": {"min": 0, "max": 0, "unit": "text", "step": 0},
        "text_answer": True,
        "anchors": [],
        "maps_to": [
            {"stock": "GOOGL", "param": "gemini_engagement", "direction": "non-usage from power user = engagement problem is real"},
        ],
    },

    # === SMB / FOUNDER PERSPECTIVE ===
    {
        "id": "founder-ai-willingness",
        "domain": "smb_founder",
        "question": "You've talked to small business owners through CallCatch. If you offered a UK tradesman an AI phone answering service for £100/month that handles 80% of booking calls — what's the REAL reason most say no? Not price. The actual blocker.",
        "context": "You've had real conversations with these customers. You know the objections that don't show up in surveys.",
        "scale": {"min": 0, "max": 0, "unit": "text", "step": 0},
        "text_answer": True,
        "anchors": [],
        "maps_to": [
            {"stock": "GOOGL", "param": "smb_ai_penetration", "direction": "blockers reveal real adoption timeline"},
            {"stock": "META", "param": "whatsapp_business_ai", "direction": "same friction applies to Meta's SMB AI"},
        ],
    },
    {
        "id": "founder-ai-pricing-ceiling",
        "domain": "smb_founder",
        "question": "For AI tools targeting non-technical small businesses (not developers) — what's the maximum monthly price where adoption actually happens at scale? Think plumbers, accountants, estate agents. First number.",
        "context": "You've experimented with pricing at CallCatch. You know the psychological barriers.",
        "scale": {"min": 0, "max": 200, "unit": "£/month", "step": 10},
        "anchors": [
            {"value": 20, "desc": "Has to be almost free. SMBs won't pay real money for AI yet."},
            {"value": 50, "desc": "Under £50 works if the value is obvious and immediate."},
            {"value": 100, "desc": "£100 works if it replaces a part-time employee's function."},
        ],
        "maps_to": [
            {"stock": "GOOGL", "param": "workspace_ai_arpu", "direction": "ceiling affects Gemini enterprise monetization"},
            {"stock": "META", "param": "whatsapp_ai_revenue", "direction": "ceiling affects WhatsApp business AI pricing"},
        ],
    },

    # === AI CAPABILITY TRAJECTORY ===
    {
        "id": "trajectory-coding-18mo",
        "domain": "ai_trajectory",
        "question": "You use Claude/GPT for coding daily. Travel 18 months forward. What's the single thing about TODAY's AI coding that will feel most embarrassingly primitive?",
        "context": "You ship code with AI assistance every day. Your intuition about capability trajectory comes from lived experience.",
        "scale": {"min": 0, "max": 0, "unit": "text", "step": 0},
        "text_answer": True,
        "anchors": [],
        "maps_to": [
            {"stock": "NVDA", "param": "compute_demand_trajectory", "direction": "faster improvement = more compute needed = bullish NVDA"},
            {"stock": "GOOGL", "param": "ai_product_evolution", "direction": "trajectory affects which AI products win"},
        ],
    },
    {
        "id": "trajectory-ai-plateau",
        "domain": "ai_trajectory",
        "question": "Some people think AI capabilities are plateauing. Others think we're still early. Based on what you've seen the models do in the last 6 months vs the 6 months before that — is the rate of improvement accelerating, steady, or decelerating? One word.",
        "context": "You use frontier models daily and notice capability changes that benchmarks don't capture.",
        "scale": {"min": 1, "max": 5, "unit": "", "step": 1},
        "anchors": [
            {"value": 1, "desc": "Decelerating fast — diminishing returns, models feel same as 6mo ago"},
            {"value": 3, "desc": "Steady — consistent improvement, no acceleration or deceleration"},
            {"value": 5, "desc": "Accelerating — each new model is a bigger jump than the last"},
        ],
        "maps_to": [
            {"stock": "NVDA", "param": "capex_sustainability", "direction": "accelerating = capex justified, decelerating = capex peak coming"},
            {"stock": "GOOGL", "param": "ai_investment_roi", "direction": "accelerating = $175B capex is smart"},
            {"stock": "META", "param": "model_quality_gap", "direction": "accelerating = harder for Meta to catch up"},
        ],
    },
]


def print_questions():
    print(f"\n{'='*60}")
    print(f"  GABRIEL'S EDGE EXTRACTION — {len(QUESTIONS)} questions")
    print(f"  About YOUR world. Answers map to multiple stocks.")
    print(f"{'='*60}\n")

    by_domain = {}
    for q in QUESTIONS:
        d = q["domain"]
        if d not in by_domain:
            by_domain[d] = []
        by_domain[d].append(q)

    domain_names = {
        "ai_developer": "AI Developer Experience",
        "startup_ecosystem": "Startup / HC Ecosystem",
        "personal_usage": "Personal AI Usage",
        "smb_founder": "SMB / Founder Perspective",
        "ai_trajectory": "AI Capability Trajectory",
    }

    for domain, qs in by_domain.items():
        print(f"  --- {domain_names.get(domain, domain).upper()} ---\n")
        for q in qs:
            is_text = q.get("text_answer", False)
            print(f"  [{q['id']}]")
            print(f"  {q['question']}")
            if not is_text:
                sc = q["scale"]
                print(f"  Scale: {sc['min']}-{sc['max']} {sc['unit']}")
                for a in q.get("anchors", []):
                    print(f"    {a['value']}: {a['desc']}")
            else:
                print(f"  [Free text]")
            stocks = ", ".join([f"{m['stock']}({m['direction'][:30]})" for m in q["maps_to"]])
            print(f"  Maps to: {stocks}")
            print()


def show_mappings():
    """Show how questions map to stocks."""
    stock_map = {}
    for q in QUESTIONS:
        for m in q["maps_to"]:
            s = m["stock"]
            if s not in stock_map:
                stock_map[s] = []
            stock_map[s].append({
                "question": q["id"],
                "param": m["param"],
                "direction": m["direction"],
            })

    print(f"\n{'='*60}")
    print(f"  QUESTION → STOCK MAPPINGS")
    print(f"{'='*60}\n")

    for stock, mappings in sorted(stock_map.items()):
        print(f"  {stock} ({len(mappings)} inputs from Gabriel's intuition)")
        for m in mappings:
            print(f"    {m['question']:<30} → {m['param']}")
            print(f"      {m['direction']}")
        print()


def generate_html():
    """Generate the Vercel page."""
    domain_names = {
        "ai_developer": "AI Developer Experience",
        "startup_ecosystem": "Startup / HC / Vibe-Coding",
        "personal_usage": "Your AI Usage",
        "smb_founder": "SMB / Founder Perspective",
        "ai_trajectory": "AI Capability Trajectory",
    }

    by_domain = {}
    for q in QUESTIONS:
        d = q["domain"]
        if d not in by_domain:
            by_domain[d] = []
        by_domain[d].append(q)

    sections = ""
    for domain, qs in by_domain.items():
        q_html = ""
        for q in qs:
            is_text = q.get("text_answer", False)
            stocks = ", ".join([m["stock"] for m in q["maps_to"]])

            if is_text:
                input_html = '<textarea class="ans-text" placeholder="First thought. Don\'t overthink." style="width:100%;min-height:70px;font-family:inherit;font-size:12px;padding:8px;border:1px solid #e0e0e0;border-radius:4px;margin:8px 0;resize:vertical"></textarea>'
            else:
                sc = q["scale"]
                mid = (sc["min"] + sc["max"]) // 2
                anc = "".join([f'<div style="font-size:10px;color:#555;padding:2px 0">{a["value"]}: {a["desc"]}</div>' for a in q.get("anchors", [])])
                input_html = f'''<div style="margin:8px 0">
<div style="display:flex;justify-content:space-between;font-size:10px;color:#888"><span>{sc["min"]}</span><span>{sc["max"]} {sc["unit"]}</span></div>
<input type="range" class="ans-slider" min="{sc["min"]}" max="{sc["max"]}" step="{sc["step"]}" value="{mid}" oninput="this.parentElement.querySelector('.sv').textContent=this.value+' {sc["unit"]}'">
<div class="sv" style="text-align:center;font-family:'Bodoni Moda',serif;font-size:24px;font-weight:800">{mid} {sc["unit"]}</div>
{anc}</div>'''

            cert_html = '''<div style="margin-top:10px;padding-top:10px;border-top:1px solid #f0f0f0">
<div style="font-size:10px;color:#888">How confident are you in this gut answer?</div>
<input type="range" class="cert" min="10" max="95" step="5" value="50" style="background:linear-gradient(to right,#dc2626,#d97706,#16a34a)" oninput="this.nextElementSibling.textContent=this.value+'%'">
<div style="text-align:center;font-size:13px;font-weight:600">50%</div></div>'''

            q_html += f'''<div class="qc" data-id="{q["id"]}" data-domain="{domain}">
<div style="font-size:9px;color:#2563eb;font-family:'Bodoni Moda',serif;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px">maps to: {stocks}</div>
<div style="font-size:13px;font-weight:600;color:#000;margin-bottom:8px;line-height:1.5">{q["question"]}</div>
<div style="font-size:10px;color:#555;margin-bottom:8px;border-left:2px solid #e0e0e0;padding-left:10px">{q["context"]}</div>
{input_html}{cert_html}</div>'''

        sections += f'<div class="s"><h2>{domain_names.get(domain, domain)}</h2>{q_html}</div>'

    html = f'''<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0"><title>TFG Edge Extraction</title>
<style>@import url('https://fonts.googleapis.com/css2?family=Bodoni+Moda:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@300;400;500;600&display=swap');*{{margin:0;padding:0;box-sizing:border-box}}body{{background:#fafafa;color:#1a1a1a;font-family:'JetBrains Mono',monospace;font-size:13px;line-height:1.7;padding:20px 16px;max-width:480px;margin:0 auto}}body.unauthorized{{display:none}}h1,h2{{font-family:'Bodoni Moda',Georgia,serif;font-weight:700;text-transform:uppercase;letter-spacing:.06em}}h1{{font-size:22px;color:#000}}h2{{font-size:13px;color:#000;margin-bottom:8px;letter-spacing:.1em}}.header{{padding:24px 0 16px;border-bottom:2px solid #000}}.header .sub{{color:#888;font-size:10px;margin-top:4px;text-transform:uppercase;letter-spacing:2.5px}}.s{{padding:16px 0;border-bottom:1px solid #e0e0e0}}.s:last-child{{border-bottom:none}}p{{margin-bottom:6px;color:#333;font-size:12px}}.qc{{background:#fff;border:1px solid #e0e0e0;border-radius:8px;padding:14px;margin:12px 0}}input[type=range]{{-webkit-appearance:none;width:100%;height:6px;border-radius:3px;background:#e0e0e0;outline:none;margin:6px 0}}input[type=range]::-webkit-slider-thumb{{-webkit-appearance:none;width:22px;height:22px;border-radius:50%;background:#000;cursor:pointer;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.3)}}.submit-btn{{display:block;width:100%;padding:14px;background:#000;color:#fff;border:none;font-family:'Bodoni Moda',serif;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:2px;cursor:pointer;margin-top:16px;border-radius:4px}}.result{{display:none;background:#f0fdf4;border:1px solid #16a34a;border-radius:8px;padding:14px;margin:14px 0;font-size:11px;line-height:1.8}}.result.show{{display:block}}.footer{{text-align:center;padding:24px 0 12px;color:#444;font-size:9px;letter-spacing:1.5px;text-transform:uppercase}}</style></head>
<body class="unauthorized">
<script>(function(){{if(!window.location.search.includes('token=b1c9a74d5aed49b5bd85bad8208b011d')){{document.body.innerHTML='';return}}document.body.classList.remove('unauthorized')}})();</script>
<div class="header"><h1>Your Edge</h1><div class="sub">Questions about your world. Answers map to stocks.</div></div>
<div class="s"><p>These are about <strong>you</strong> — your experience, your ecosystem, your gut. Not analyst questions. Don't look anything up. First reaction. The system maps your answers to NVDA, GOOGL, META, and the broader AI sector automatically.</p></div>
{sections}
<div class="s"><button class="submit-btn" onclick="submit()">Submit</button><div class="result" id="result"></div></div>
<div class="footer">TFG v6.0.0 &middot; gabriel-centric intuition extraction</div>
<script>
function submit(){{var cards=document.querySelectorAll('.qc');var a=[];cards.forEach(function(c){{var id=c.dataset.id;var cert=parseInt(c.querySelector('.cert').value);var slider=c.querySelector('.ans-slider');var text=c.querySelector('.ans-text');var v=slider?parseFloat(slider.value):(text?text.value:'');a.push({{id:id,value:v,certainty:cert}})}});localStorage.setItem('tfg_edge',JSON.stringify(a));var r=document.getElementById('result');r.classList.add('show');r.innerHTML='<strong style="color:#16a34a">Recorded.</strong><br><br>'+a.map(function(x){{return'<strong>'+x.id+':</strong> '+JSON.stringify(x.value)+' cert='+x.certainty+'%'}}).join('<br>')+'<br><br>Paste to Claude:<br><code style="font-size:9px;word-break:break-all">edge '+JSON.stringify(a)+'</code>'}}
</script></body></html>'''

    output_path = os.path.join(os.path.dirname(__file__), "..", "..", "briefing-images", "output", "edge-questions.html")
    with open(output_path, "w") as f:
        f.write(html)
    return output_path


def main():
    parser = argparse.ArgumentParser(description="Edge Extraction for TFG")
    parser.add_argument("--generate", action="store_true")
    parser.add_argument("--show-mappings", action="store_true")
    parser.add_argument("--build-page", action="store_true")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    if args.generate:
        if args.json:
            print(json.dumps(QUESTIONS, indent=2))
        else:
            print_questions()
    elif args.show_mappings:
        show_mappings()
    elif args.build_page:
        path = generate_html()
        print(f"Page written to {path}")
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
