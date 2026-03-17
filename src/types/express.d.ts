import { IUser } from '../models/user.model'

// Extend Express.User (used by Passport) with our IUser interface.
// This means req.user will have all IUser fields wherever Passport attaches it.
declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface User extends IUser {}
  }
}

export {}
