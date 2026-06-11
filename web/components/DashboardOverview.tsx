'use client';

import { Icon } from "@iconify/react";

export default function DashboardOverview() {
  return (
    <section className="relative z-20 w-full flex flex-col items-center justify-center bg-[#030303] pb-24 px-4 sm:px-6 mt-[-40px] md:mt-0">
      <div className="reveal-element font-geist w-full max-w-6xl relative">
        <div className="md:px-6 w-full mx-auto" style={{ maskImage: 'linear-gradient(transparent 0%, black 15%, black 100%, transparent)' }}>
          <div className="relative w-full overflow-hidden bg-[#131315]/80 border border-[#27272a] rounded-2xl shadow-2xl backdrop-blur-xl mt-12 mb-8">
            <div className="flex border-[#27272a] border-b pt-3 pr-4 pb-3 pl-4 items-center justify-between bg-[#000000]/50">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-500/80 border border-red-500"></span>
                <span className="h-3 w-3 rounded-full bg-yellow-400/80 border border-yellow-400"></span>
                <span className="h-3 w-3 rounded-full bg-green-500/80 border border-green-500"></span>
              </div>
              <div className="flex items-center gap-3">
                <button className="hidden sm:inline-flex rounded-md border border-[#27272a] bg-[#18181b] p-1.5 text-zinc-400 hover:text-white hover:bg-[#27272a] transition-colors">
                  <Icon height="16" icon="solar:history-linear" width="16" />
                </button>
                <button className="hidden sm:inline-flex rounded-md border border-[#27272a] bg-[#18181b] p-1.5 text-zinc-400 hover:text-white hover:bg-[#27272a] transition-colors">
                  <Icon height="16" icon="solar:menu-dots-circle-linear" width="16" />
                </button>
                <button className="rounded-md px-4 py-1.5 text-xs font-medium text-white bg-[#2563eb] hover:bg-blue-500 transition-colors shadow-[0_0_12px_rgba(37,99,235,0.4)] flex items-center gap-2">
                  <Icon height="14" icon="solar:play-circle-linear" width="14" />
                  Investigate
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-12 bg-[#000000]/20">
              <aside className="hidden md:block md:col-span-3 border-r border-[#27272a] p-4 bg-[#131315]/50">
                <div className="mb-4 flex items-center justify-between">
                  <div className="inline-flex items-center gap-2 rounded-md border border-[#27272a] bg-[#18181b] px-2.5 py-1 text-xs font-medium text-zinc-300">
                    <Icon height="14" icon="solar:eye-scan-linear" width="14" />
                    Investigation
                  </div>
                  <button className="rounded-md border border-[#27272a] bg-[#18181b] p-1.5 text-zinc-400 hover:text-white hover:bg-[#27272a] transition-colors">
                    <Icon height="14" icon="solar:refresh-linear" width="14" />
                  </button>
                </div>
                <div className="space-y-4 text-zinc-300 h-[520px] flex flex-col">
                  <div className="flex gap-1.5">
                    <button className="px-3 py-1.5 text-xs text-white rounded bg-[#2563eb] font-medium">Cloud</button>
                    <button className="px-3 py-1.5 text-xs rounded bg-[#18181b] text-zinc-400 hover:bg-[#27272a] hover:text-white transition-colors border border-[#27272a]">Auth</button>
                    <button className="px-3 py-1.5 text-xs rounded bg-[#18181b] text-zinc-400 hover:bg-[#27272a] hover:text-white transition-colors border border-[#27272a]">Network</button>
                  </div>
                  <div className="bg-[#18181b] border border-[#27272a] rounded-lg p-3">
                    <div className="text-xs text-zinc-500 mb-3 font-medium uppercase tracking-wider">Alert</div>
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-400">Source IP</span>
                        <span className="text-xs font-semibold text-red-400">139.198.18.205</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-400">Identity</span>
                        <span className="text-xs font-semibold text-[#2563eb]">web_admin</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-400">Action</span>
                        <span className="text-xs font-semibold text-yellow-500">637× RunInstances</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 bg-[#18181b] border border-[#27272a] rounded-lg p-2.5 flex flex-col">
                    <div className="text-xs text-zinc-500 mb-3 font-medium uppercase tracking-wider pl-1">Hypothesis ledger</div>
                    <ul className="space-y-1.5 overflow-y-auto flex-1 pr-1">
                      <li className="flex items-center gap-3 rounded-md px-2 py-1.5 bg-[#2563eb]/10 border border-[#2563eb]/20 cursor-pointer">
                        <div className="w-7 h-7 rounded bg-[#2563eb]/20 border border-[#2563eb]/30 flex items-center justify-center">
                          <Icon className="text-[#2563eb] text-sm" icon="solar:key-minimalistic-linear" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm text-zinc-200">Compromised IAM credentials</div>
                          <div className="text-[11px] text-zinc-500">web_admin · valid account</div>
                        </div>
                        <span className="text-xs text-emerald-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          Confirmed
                        </span>
                      </li>
                      <li className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-[#27272a]/50 border border-transparent hover:border-[#27272a] cursor-pointer transition-colors">
                        <div className="w-7 h-7 rounded bg-[#27272a] border border-[#3f3f46] flex items-center justify-center">
                          <Icon className="text-cyan-400 text-sm" icon="solar:cloud-linear" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm text-zinc-300">RunInstances spray to mine</div>
                          <div className="text-[11px] text-zinc-500">637 calls · all denied</div>
                        </div>
                        <span className="text-xs text-emerald-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Confirmed
                        </span>
                      </li>
                      <li className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-[#27272a]/50 border border-transparent hover:border-[#27272a] cursor-pointer transition-colors">
                        <div className="w-7 h-7 rounded bg-[#27272a] border border-[#3f3f46] flex items-center justify-center">
                          <Icon className="text-zinc-400 text-sm" icon="solar:user-linear" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm text-zinc-300">Legitimate admin activity</div>
                          <div className="text-[11px] text-zinc-500">ruled out</div>
                        </div>
                        <span className="text-xs text-zinc-400">Refuted</span>
                      </li>
                      <li className="flex items-center gap-3 rounded-md px-2 py-1.5 bg-red-500/5 border border-red-500/10 cursor-pointer transition-colors">
                        <div className="w-7 h-7 rounded bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                          <Icon className="text-red-400 text-sm" icon="solar:server-path-linear" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm text-zinc-300">Benign service account</div>
                          <div className="text-[11px] text-zinc-500">ruled out</div>
                        </div>
                        <span className="text-xs text-red-400">Refuted</span>
                      </li>
                    </ul>
                  </div>
                  <div className="bg-[#18181b] border border-[#27272a] rounded-lg p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="text-[#2563eb] text-sm" icon="solar:pie-chart-2-linear" />
                        <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Risk factors</span>
                      </div>
                    </div>
                    <div className="space-y-2 mt-3">
                      <div className="flex items-center gap-2 text-xs hover:bg-[#27272a]/50 p-1 rounded transition-colors cursor-pointer">
                        <div className="w-2 h-2 rounded-full bg-[#2563eb]"></div>
                        <span className="text-zinc-300 flex-1">Verdict &amp; confidence</span>
                        <div className="text-zinc-400">40%</div>
                      </div>
                      <div className="flex items-center gap-2 text-xs hover:bg-[#27272a]/50 p-1 rounded transition-colors cursor-pointer">
                        <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                        <span className="text-zinc-300 flex-1">Kill-chain breadth</span>
                        <div className="text-zinc-400">25%</div>
                      </div>
                      <div className="flex items-center gap-2 text-xs hover:bg-[#27272a]/50 p-1 rounded transition-colors cursor-pointer">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <span className="text-zinc-300 flex-1">Threat-intel signal</span>
                        <div className="text-zinc-400">20%</div>
                      </div>
                      <div className="flex items-center gap-2 text-xs hover:bg-[#27272a]/50 p-1 rounded transition-colors cursor-pointer">
                        <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                        <span className="text-zinc-300 flex-1">Case history</span>
                        <div className="text-zinc-400">15%</div>
                      </div>
                    </div>
                  </div>
                </div>
              </aside>
              <main className="relative md:col-span-6 bg-black/40">
                <div className="flex items-center gap-2 border-b border-[#27272a] px-5 py-3 text-xs text-zinc-300 bg-[#131315]/80">
                  <Icon className="text-[#2563eb] text-base" icon="solar:document-text-linear" />
                  <span className="font-medium text-zinc-200">Incident Report</span>
                  <span className="text-zinc-600">•</span>
                  <span className="text-zinc-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                    True Positive · High
                  </span>
                  <div className="ml-auto">
                    <button className="inline-flex items-center gap-1.5 rounded-md border border-[#27272a] bg-[#18181b] px-2.5 py-1 hover:bg-[#27272a] text-[11px] text-zinc-300 transition-colors">
                      <Icon height="12" icon="solar:download-square-linear" width="12" />
                      Export report
                    </button>
                  </div>
                </div>
                <div className="p-4 sm:p-6">
                  <div className="border border-[#27272a] overflow-hidden rounded-xl mb-5 p-6 bg-gradient-to-br from-[#18181b] via-[#131315] to-[#18181b] relative">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#2563eb]/5 rounded-full blur-[60px] pointer-events-none"></div>
                    <div className="flex items-start justify-between mb-5 relative z-10">
                      <div>
                        <div className="text-sm text-zinc-400 mb-1 font-medium">Verdict</div>
                        <div className="text-3xl font-light tracking-tight text-white font-geist">
                          True Positive
                        </div>
                        <div className="text-xs mt-1 text-amber-400 flex items-center gap-1">
                          <Icon icon="solar:danger-triangle-linear" />
                          High severity · IAM credential abuse
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-zinc-400 mb-1 font-medium">Confidence</div>
                        <div className="text-xl font-light text-zinc-300 font-geist">
                          0.94
                          <span className="text-sm text-zinc-500"> / 1.0</span>
                        </div>
                        <div className="text-xs text-zinc-500 mt-1">high confidence</div>
                      </div>
                    </div>
                    <div className="relative h-2 bg-[#27272a] rounded-full overflow-hidden z-10">
                      <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#172554] via-[#2563eb] to-[#60a5fa] rounded-full shadow-[0_0_10px_rgba(37,99,235,0.5)]" style={{ width: '94%' }}></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-zinc-500 mt-2 uppercase tracking-wide z-10 relative">
                      <span>0.0</span>
                      <span>0.5</span>
                      <span>1.0</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-5">
                    <div className="col-span-2 sm:col-span-1 rounded-xl p-5 border border-[#27272a] bg-gradient-to-br from-[#18181b] via-[#131315] to-[#18181b]">
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-sm font-medium text-zinc-200">Risk factors</div>
                        <button className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                          <Icon icon="solar:menu-dots-linear" />
                        </button>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-full bg-[#27272a] rounded-full h-1.5">
                            <div className="h-1.5 rounded-full bg-[#2563eb]" style={{ width: '90%' }}></div>
                          </div>
                          <span className="text-[11px] text-zinc-400 whitespace-nowrap w-16 text-right">Verdict</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-full bg-[#27272a] rounded-full h-1.5">
                            <div className="h-1.5 rounded-full bg-purple-500" style={{ width: '60%' }}></div>
                          </div>
                          <span className="text-[11px] text-zinc-400 whitespace-nowrap w-16 text-right">Chain</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-full bg-[#27272a] rounded-full h-1.5">
                            <div className="h-1.5 rounded-full bg-red-500" style={{ width: '80%' }}></div>
                          </div>
                          <span className="text-[11px] text-zinc-400 whitespace-nowrap w-16 text-right">Intel</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-full bg-[#27272a] rounded-full h-1.5">
                            <div className="h-1.5 rounded-full bg-cyan-500" style={{ width: '35%' }}></div>
                          </div>
                          <span className="text-[11px] text-zinc-400 whitespace-nowrap w-16 text-right">Memory</span>
                        </div>
                      </div>
                    </div>
                    <div className="col-span-2 sm:col-span-1 rounded-xl p-5 border border-[#27272a] bg-gradient-to-br from-[#18181b] via-[#131315] to-[#18181b] flex flex-col items-center justify-center relative overflow-hidden">
                      <div className="absolute top-4 left-5 right-5 flex items-center justify-between z-10">
                        <div className="text-sm font-medium text-zinc-200">Risk score</div>
                        <span className="text-xs text-amber-400 font-medium">High</span>
                      </div>
                      <div className="relative w-28 h-28 mx-auto mt-6 mb-2">
                        <svg className="-rotate-90 w-full h-full" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" fill="none" r="40" stroke="#27272a" strokeWidth="8"></circle>
                          <circle className="text-amber-500" cx="50" cy="50" fill="none" r="40" stroke="currentColor" strokeDasharray="251.2" strokeDashoffset="32.66" strokeLinecap="round" strokeWidth="8"></circle>
                        </svg>
                        <div className="absolute inset-0 grid place-items-center text-center">
                          <div>
                            <div className="text-2xl font-light text-white font-geist">
                              87
                              <span className="text-sm">/100</span>
                            </div>
                            <div className="text-[10px] text-zinc-500 uppercase tracking-wide">Risk</div>
                          </div>
                        </div>
                      </div>
                      <button className="w-full px-3 py-2 mt-auto text-zinc-300 text-xs font-medium rounded-lg bg-[#27272a]/50 hover:bg-[#27272a] transition-colors border border-[#3f3f46]">View rationale</button>
                    </div>
                  </div>
                  <div className="rounded-xl p-5 border border-[#27272a] bg-gradient-to-br from-[#18181b] via-[#131315] to-[#18181b]">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-sm font-medium text-zinc-200">Attack timeline</div>
                      <button className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1">
                        View evidence
                        <Icon icon="solar:alt-arrow-right-linear" />
                      </button>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-4 p-2.5 rounded-lg hover:bg-[#27272a]/50 transition-colors border border-transparent hover:border-[#27272a] cursor-pointer">
                        <div className="w-8 h-8 rounded-lg grid place-items-center bg-[#2563eb]/10 border border-[#2563eb]/20">
                          <Icon className="text-[#2563eb] text-sm" icon="solar:login-3-linear" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm text-zinc-200 font-medium">
                            web_admin used from
                            <span className="text-[#2563eb]"> 139.198.18.205</span>
                          </div>
                          <div className="text-[11px] text-zinc-500 mt-0.5">Valid cloud credentials from a China-based IP · T1078</div>
                        </div>
                        <div className="text-[11px] text-zinc-500 text-right whitespace-nowrap">09:14</div>
                      </div>
                      <div className="flex items-center gap-4 p-2.5 rounded-lg hover:bg-[#27272a]/50 transition-colors border border-transparent hover:border-[#27272a] cursor-pointer">
                        <div className="w-8 h-8 rounded-lg grid place-items-center bg-purple-500/10 border border-purple-500/20">
                          <Icon className="text-purple-400 text-sm" icon="solar:server-square-linear" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm text-zinc-200 font-medium">637× RunInstances — all denied</div>
                          <div className="text-[11px] text-zinc-500 mt-0.5">Mass EC2 spin-up blocked by IAM policy · T1580</div>
                        </div>
                        <div className="text-[11px] text-zinc-500 text-right whitespace-nowrap">09:15</div>
                      </div>
                      <div className="flex items-center gap-4 p-2.5 rounded-lg hover:bg-[#27272a]/50 transition-colors border border-transparent hover:border-[#27272a] cursor-pointer">
                        <div className="w-8 h-8 rounded-lg grid place-items-center bg-red-500/10 border border-red-500/20">
                          <Icon className="text-red-400 text-sm" icon="solar:fire-linear" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm text-zinc-200 font-medium">Cryptomining pattern confirmed</div>
                          <div className="text-[11px] text-zinc-500 mt-0.5">Resource hijacking via EC2 · T1496</div>
                        </div>
                        <div className="text-[11px] text-zinc-500 text-right whitespace-nowrap">09:17</div>
                      </div>
                    </div>
                  </div>
                </div>
              </main>
              <aside className="hidden md:block md:col-span-3 border-l border-[#27272a] p-4 bg-[#131315]/50">
                <div className="mb-4 flex items-center justify-between">
                  <div className="inline-flex items-center gap-2 rounded-md border border-[#27272a] bg-[#18181b] px-2.5 py-1 text-xs font-medium text-zinc-300">
                    <Icon height="14" icon="solar:shield-check-linear" width="14" />
                    Response
                  </div>
                  <button className="rounded-md border border-[#27272a] bg-[#18181b] p-1.5 text-zinc-400 hover:text-white hover:bg-[#27272a] transition-colors">
                    <Icon height="14" icon="solar:settings-linear" width="14" />
                  </button>
                </div>
                <div className="space-y-4 h-[480px] overflow-y-auto pr-1">
                  <div className="rounded-lg p-3 border border-[#2563eb]/20 bg-[#2563eb]/5 relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 w-16 h-16 bg-[#2563eb]/10 rounded-full blur-xl pointer-events-none"></div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full grid place-items-center bg-[#2563eb]/20">
                        <Icon className="text-[#2563eb] text-[10px]" icon="solar:history-linear" />
                      </div>
                      <span className="text-xs font-medium text-[#2563eb] uppercase tracking-wider">Recalled from memory</span>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed mb-3">139.198.18.205 matches 1 prior case in Argus's memory — last verdict true positive. The indicator is already on the active blocklist.</p>
                    <button className="text-[11px] text-[#2563eb] hover:text-blue-400 font-medium transition-colors flex items-center gap-1">
                      View linked case
                      <Icon icon="solar:arrow-right-linear" />
                    </button>
                  </div>
                  <div className="bg-[#18181b] border border-[#27272a] rounded-lg p-3">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">ATT&amp;CK techniques</span>
                      <span className="text-[10px] text-zinc-500 uppercase">Validated</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 bg-[#27272a]/30 rounded border border-transparent hover:border-[#27272a] transition-colors cursor-pointer">
                        <div className="flex items-center gap-2.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#2563eb]"></div>
                          <div>
                            <div className="text-xs text-zinc-300">T1078 · Valid Accounts</div>
                            <div className="text-[10px] text-zinc-500">Initial Access</div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-[#27272a]/30 rounded border border-transparent hover:border-[#27272a] transition-colors cursor-pointer">
                        <div className="flex items-center gap-2.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                          <div>
                            <div className="text-xs text-zinc-300">T1580 · Cloud Infra Discovery</div>
                            <div className="text-[10px] text-zinc-500">Discovery</div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-[#27272a]/30 rounded border border-transparent hover:border-[#27272a] transition-colors cursor-pointer">
                        <div className="flex items-center gap-2.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                          <div>
                            <div className="text-xs text-zinc-300">T1496 · Resource Hijacking</div>
                            <div className="text-[10px] text-zinc-500">Impact</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-[#18181b] border border-[#27272a] rounded-lg p-3">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Recommended actions</span>
                      <span className="px-1.5 py-0.5 rounded flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                        3 auto
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="p-2.5 border border-yellow-500/20 rounded bg-yellow-500/5">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="text-yellow-500 text-sm" icon="solar:shield-keyhole-linear" />
                          <span className="text-xs text-yellow-500 font-medium">Block 139.198.18.205</span>
                        </div>
                        <p className="text-[11px] text-zinc-400">Write the indicator to the KV-store blocklist enforced by a live correlation search.</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-[#18181b] border border-[#27272a] rounded-lg p-3">
                    <div className="mb-2 text-xs font-medium text-zinc-400 uppercase tracking-wider">Response actions</div>
                    <div className="space-y-1.5">
                      <button className="w-full flex items-center gap-2.5 p-2 bg-[#27272a]/30 hover:bg-[#27272a] border border-transparent hover:border-[#3f3f46] rounded text-left transition-colors">
                        <Icon className="text-[#2563eb] text-sm" icon="solar:shield-cross-linear" />
                        <span className="text-xs text-zinc-300">Block indicator</span>
                      </button>
                      <button className="w-full flex items-center gap-2.5 p-2 bg-[#27272a]/30 hover:bg-[#27272a] border border-transparent hover:border-[#3f3f46] rounded text-left transition-colors">
                        <Icon className="text-[#2563eb] text-sm" icon="solar:document-add-linear" />
                        <span className="text-xs text-zinc-300">Open Jira ticket</span>
                      </button>
                      <button className="w-full flex items-center gap-2.5 p-2 bg-[#27272a]/30 hover:bg-[#27272a] border border-transparent hover:border-[#3f3f46] rounded text-left transition-colors">
                        <Icon className="text-purple-400 text-sm" icon="solar:code-square-linear" />
                        <span className="text-xs text-zinc-300">Deploy detection</span>
                      </button>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
