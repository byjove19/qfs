// src/utils/logger.ts
import AdminLog, { IAdminLog, AdminAction } from '../models/AdminLog';

class Logger {
  async logAdminAction(
    adminId: string,
    action: AdminAction,
    targetModel: string,
    targetId: string,
    previousData: any,
    newData: any,
    description: string,
    ipAddress: string,
    userAgent: string
  ): Promise<IAdminLog> {
    const adminLog = new AdminLog({
      admin: adminId,
      action,
      targetModel,
      targetId,
      previousData,
      newData,
      description,
      ipAddress,
      userAgent
    });

    return await adminLog.save();
  }

  async getAdminLogs(
    adminId?: string,
    action?: AdminAction,
    targetModel?: string,
    startDate?: Date,
    endDate?: Date,
    page: number = 1,
    limit: number = 50
  ) {
    const filter: any = {};

    if (adminId) filter.admin = adminId;
    if (action) filter.action = action;
    if (targetModel) filter.targetModel = targetModel;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = startDate;
      if (endDate) filter.createdAt.$lte = endDate;
    }

    const logs = await AdminLog.find(filter)
      .populate('admin', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await AdminLog.countDocuments(filter);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
}

export default new Logger();