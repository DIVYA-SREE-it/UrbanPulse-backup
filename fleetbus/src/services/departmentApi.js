import { apiClient } from './api';
import { DEPARTMENTS } from '../data/departmentsData';

export const departmentApi = {
  getDepartments: async () => {
    return { data: DEPARTMENTS };
  },

  getDepartmentCases: async (deptId) => {
    return apiClient.get(`/departments/${deptId}/cases`);
  }
};
