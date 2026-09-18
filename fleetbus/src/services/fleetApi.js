import { apiClient } from './api';
import { CHENNAI_FLEET } from '../data/busesData';

export const fleetApi = {
  getBuses: async () => {
    // In prototype, returns rich initial fleet
    return { data: CHENNAI_FLEET };
  },

  getBusById: async (busId) => {
    const bus = CHENNAI_FLEET.find(b => b.id === busId);
    return { data: bus };
  },

  updateBusTelemetry: async (busId, telemetry) => {
    return apiClient.patch(`/fleet/${busId}`, telemetry);
  }
};
