import { store } from '../data/store.js';

export interface CreateReportInput {
  experience_id: string;
  reporter_session_id: string;
  reason: 'fraud' | 'inaccurate' | 'safety' | 'other';
  details: string;
}

export class ReportService {
  public createReport(input: CreateReportInput) {
    const exp = store.getExperienceById(input.experience_id);
    if (!exp) {
      throw new Error(`Experience ${input.experience_id} not found`);
    }

    const report = {
      id: `rep-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      experience_id: input.experience_id,
      reporter_session_id: input.reporter_session_id,
      reason: input.reason,
      details: input.details,
      status: 'pending' as const,
      created_at: new Date().toISOString()
    };

    store.reports.unshift(report);
    return report;
  }

  public getReports() {
    return store.reports.map(rep => {
      const exp = store.getExperienceById(rep.experience_id);
      return {
        ...rep,
        experience_title: exp?.title || 'Unknown Experience',
        experience_status: exp?.offering_status,
        provider_name: exp?.provider_name
      };
    });
  }

  public resolveReport(reportId: string, action: 'unpublish' | 'dismiss') {
    const rep = store.reports.find(r => r.id === reportId);
    if (!rep) {
      throw new Error(`Report ${reportId} not found`);
    }

    if (action === 'unpublish') {
      const exp = store.getExperienceById(rep.experience_id);
      if (exp) {
        exp.offering_status = 'draft';
      }
      rep.status = 'resolved';
    } else {
      rep.status = 'dismissed';
    }

    return rep;
  }
}

export const reportService = new ReportService();
