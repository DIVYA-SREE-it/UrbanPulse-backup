import { getANPRIncidents } from './api';

export const incidentApi = {
  getIncidents: async () => {
    return getANPRIncidents();
  },

  logHitAndRun: async (incidentPayload) => {
    const response = await fetch('http://127.0.0.1:8000/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(incidentPayload),
    });
    if (!response.ok) throw new Error(`logHitAndRun failed: ${response.status}`);
    return response.json();
  },

  broadcastPoliceAlert: async (incidentId, channel = 'GCTP_ALL_SECTORS') => {
    const response = await fetch(
      `http://127.0.0.1:8000/api/events/${incidentId}/status`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'VERIFIED', note: `Broadcast to ${channel}` }),
      }
    );
    if (!response.ok) throw new Error(`broadcastPoliceAlert failed: ${response.status}`);
    return response.json();
  },
};