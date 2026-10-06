#!/usr/bin/env bash
# Canonical CLI invocations used as the behaviour-preservation golden master.
# Each line: <name>|<tool>|<args...>
cat <<'CASES'
monte_carlo_ev|monte_carlo_ev.py|--ticker NVDA --current-mcap 4400 --revenue-scenarios 365,300,240,180 --revenue-probs 0.20,0.40,0.25,0.15 --revenue-stds 40,30,25,30 --multiple-scenarios 30,22,15 --multiple-probs 0.20,0.50,0.30 --margin 0.65 --n 100000
monte_carlo_ev_small|monte_carlo_ev.py|--ticker TEST --current-mcap 1000 --revenue-scenarios 120,90 --revenue-probs 0.6,0.4 --revenue-stds 15,10 --multiple-scenarios 25,12 --multiple-probs 0.5,0.5 --margin 0.5 --n 20000
sensitivity_tornado|sensitivity_tornado.py|--ticker NVDA --current-mcap 4400 --revenue-scenarios 365,300,240,180 --revenue-probs 0.20,0.40,0.25,0.15 --revenue-stds 40,30,25,30 --multiple-scenarios 30,22,15 --multiple-probs 0.20,0.50,0.30 --margin 0.65
options_implied_prob|options_implied_prob.py|--ticker NVDA --spot 178 --iv 0.39 --rf 0.045 --expiry-years 1.0 --scenarios 130,155,250,360 --labels worst,bear,base_top,bull_top
options_implied_prob_short|options_implied_prob.py|--ticker TEST --spot 100 --iv 0.25 --rf 0.03 --expiry-years 0.5 --scenarios 80,120
ci_propagation|ci_propagation.py|--prior 0.40 --prior-std 0.08 --updates STRONG_FOR:0.9,STRONG_AGAINST:0.85,MODERATE_FOR:0.7,MODERATE_AGAINST:0.75,MODERATE_AGAINST:0.7
ci_propagation_nobias|ci_propagation.py|--prior 0.35 --prior-std 0.10 --updates WEAK_FOR:0.5,AMBIGUOUS:0.5,STRONG_AGAINST:0.9 --no-bias-correction
piotroski_fscore|piotroski_fscore.py|--ticker NVDA --roa-current 0.65 --roa-prior 0.55 --cfo-current 97 --net-income-current 73 --ltd-ratio-current 0.07 --ltd-ratio-prior 0.08 --current-ratio-current 3.91 --current-ratio-prior 3.50 --shares-current 24400 --shares-prior 24500 --gross-margin-current 0.75 --gross-margin-prior 0.73 --asset-turnover-current 0.85 --asset-turnover-prior 0.80
piotroski_fscore_weak|piotroski_fscore.py|--ticker WEAK --roa-current -0.02 --roa-prior 0.01 --cfo-current -5 --net-income-current 2 --ltd-ratio-current 0.42 --ltd-ratio-prior 0.30 --current-ratio-current 0.90 --current-ratio-prior 1.40 --shares-current 5200 --shares-prior 4800 --gross-margin-current 0.21 --gross-margin-prior 0.29 --asset-turnover-current 0.40 --asset-turnover-prior 0.55
CASES
