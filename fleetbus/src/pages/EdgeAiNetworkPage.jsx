import React from 'react';
import { Cpu, Wifi, HardDrive, Zap, ShieldCheck } from 'lucide-react';
import { StatCard } from '../components/common/StatCard';
import { EDGE_NETWORK_METRICS } from '../data/edgeNodesData';

export function EdgeAiNetworkPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-600" />
            <span>Edge AI Distributed Network & Hardware Architecture</span>
          </h1>
          <p className="text-xs text-slate-500">
            NVIDIA Jetson Orin Nano onboard architecture, 5G mesh uplink, and bandwidth-saving edge inference topology
          </p>
        </div>
      </div>

      {/* Top 4 KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="ACTIVE EDGE NODES"
          value={EDGE_NETWORK_METRICS.activeNodes}
          subtitle="Jetson Orin Nano units"
          variant="default"
          icon={Cpu}
        />
        <StatCard
          title="NETWORK HEALTH"
          value="98.2%"
          subtitle="Uptime SLA"
          variant="success"
          trend="ONLINE"
          trendType="up"
          icon={ShieldCheck}
        />
        <StatCard
          title="BANDWIDTH REDUCTION"
          value={`${EDGE_NETWORK_METRICS.bandwidthSavedPercent}%`}
          subtitle="Filtered metadata only"
          variant="default"
          icon={Zap}
        />
        <StatCard
          title="AVG INFERENCE"
          value={`${EDGE_NETWORK_METRICS.avgInferenceLatencyMs} ms`}
          subtitle="TensorRT FP16"
          variant="default"
          icon={HardDrive}
        />
      </div>

      {/* Edge Topology Visual Flow - Clean White Cards */}
      <div className="bg-white rounded-card border border-slate-200 p-5 shadow-subtle space-y-4">
        <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-900">
          End-to-End Edge-to-Cloud Intelligence Pipeline
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">1</span>
              <h4 className="font-bold text-xs text-slate-900">5-Camera Sensor Matrix</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              1080p 60 FPS wide-angle cameras capture continuous road surface, lane markings, traffic signals, and vehicle flow.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">2</span>
              <h4 className="font-bold text-xs text-slate-900">Onboard Jetson Edge AI</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Local YOLOv11 + DeepSORT inference extracts defects, calculates depth, recognizes number plates (36ms latency).
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">3</span>
              <h4 className="font-bold text-xs text-slate-900">5G Low-Bandwidth Uplink</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Non-event frames are discarded on device; only structured JSON telemetry + compressed evidence clips are transmitted.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">4</span>
              <h4 className="font-bold text-xs text-blue-950">Central GIS Command</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Autonomous ticket routing to Greater Chennai Corporation, Traffic Police, and Highways maintenance departments.
            </p>
          </div>
        </div>
      </div>

      {/* Hardware Specs Card */}
      <div className="bg-white rounded-card border border-slate-200 p-5 shadow-subtle space-y-3">
        <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-900">
          Onboard Mobile Sensing Hardware Specifications
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Processor</span>
            <strong className="text-slate-900 font-mono">NVIDIA Jetson Orin Nano (40 TOPS)</strong>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Memory & Storage</span>
            <strong className="text-slate-900 font-mono">8GB LPDDR5 + 512GB NVMe</strong>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Positioning</span>
            <strong className="text-slate-900 font-mono">Multi-GNSS RTK (0.2m Accuracy)</strong>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Cellular</span>
            <strong className="text-slate-900 font-mono">5G Dual SIM Active Failover</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
