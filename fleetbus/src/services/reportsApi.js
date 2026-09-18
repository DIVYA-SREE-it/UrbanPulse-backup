import { apiClient } from './api';

export const reportsApi = {
  getReports: async (filters = {}) => {
    return apiClient.get('/reports');
  },

  updateStatus: async (reportId, newStatus, resolutionNote = '') => {
    return apiClient.patch(`/reports/${reportId}`, {
      status: newStatus,
      resolutionNote,
      updatedAt: new Date().toISOString()
    });
  },

  assignDepartment: async (reportId, deptId, officer = '') => {
    return apiClient.patch(`/reports/${reportId}/assign`, {
      deptId,
      officer,
      assignedAt: new Date().toISOString()
    });
  }
};
