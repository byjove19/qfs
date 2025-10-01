import { IUser } from '../models/User';

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      flash?: (type: string, message?: string) => any;
    }
  }
}