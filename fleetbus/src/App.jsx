import React from 'react';
import { UrbanPulseProvider, useUrbanPulse } from './context/UrbanPulseContext';
import { Sidebar } from './components/common/Sidebar';
import { Header } from './components/common/Header';
import { ReportModal } from './components/common/ReportModal';
import { GlobalSearchModal } from './components/common/GlobalSearchModal';
import { NotificationDrawer } from './components/common/NotificationDrawer';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { LiveCityPage } from './pages/LiveCityPage';
import { FleetMonitoringPage } from './pages/FleetMonitoringPage';
import { RoadIntelligencePage } from './pages/RoadIntelligencePage';
import { TrafficIntelligencePage } from './pages/TrafficIntelligencePage';
import { IncidentCenterPage } from './pages/IncidentCenterPage';
import { PotholeReportsPage } from './pages/PotholeReportsPage';
import { WaterloggingReportsPage } from './pages/WaterloggingReportsPage';
import { TrafficSignalReportsPage } from './pages/TrafficSignalReportsPage';
import { SchoolZoneViolationsPage } from './pages/SchoolZoneViolationsPage';
import { AllDetectionLogsPage } from './pages/AllDetectionLogsPage';
import { DepartmentResponsePage } from './pages/DepartmentResponsePage';
import { MaintenanceTrackingPage } from './pages/MaintenanceTrackingPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { LiveCameraPage } from './pages/LiveCameraPage';
import { EdgeAiNetworkPage } from './pages/EdgeAiNetworkPage';
import { CameraMonitoringPage } from './pages/CameraMonitoringPage';
import { SettingsPage } from './pages/SettingsPage';

function AppContent() {
  const { activeRoute } = useUrbanPulse();

  const renderActivePage = () => {
    switch (activeRoute) {
      case 'dashboard':
        return <DashboardPage />;
      case 'live-city':
        return <LiveCityPage />;
      case 'fleet':
        return <FleetMonitoringPage />;
      case 'road-intel':
        return <RoadIntelligencePage />;
      case 'traffic-intel':
        return <TrafficIntelligencePage />;
      case 'incident-center':
        return <IncidentCenterPage />;
      case 'potholes':
        return <PotholeReportsPage />;
      case 'waterlogging':
        return <WaterloggingReportsPage />;
      case 'traffic-signals':
        return <TrafficSignalReportsPage />;
      case 'school-violations':
        return <SchoolZoneViolationsPage />;
      case 'all-logs':
        return <AllDetectionLogsPage />;
      case 'department-response':
        return <DepartmentResponsePage />;
      case 'maintenance-tracking':
        return <MaintenanceTrackingPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'live-camera':
        return <LiveCameraPage />;
      case 'edge-network':
        return <EdgeAiNetworkPage />;
      case 'camera-monitoring':
        return <CameraMonitoringPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* 240px Dark Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Sticky Header */}
        <Header />

        <div className="px-6 py-2 text-xs text-amber-800 bg-amber-50 border-b border-amber-100">
          Prototype: legacy charts, fleet telemetry and scenarios contain sample data. Camera events identify their source; route GPS is simulated.
        </div>
        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-[1600px] mx-auto">
            {renderActivePage()}
          </div>
        </main>
      </div>

      {/* Modals & Overlays */}
      <ReportModal />
      <GlobalSearchModal />
      <NotificationDrawer />
    </div>
  );
}

export default function App() {
  return (
    <UrbanPulseProvider>
      <AppContent />
    </UrbanPulseProvider>
  );
}
