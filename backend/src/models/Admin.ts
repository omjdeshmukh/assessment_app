import mongoose, { Document, Schema } from 'mongoose';

export interface IAdmin extends Document {
  username: string;
  email: string;
  passwordHash: string;
  role: 'superadmin' | 'admin';
  createdAt: Date;
}

const AdminSchema = new Schema<IAdmin>(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['superadmin', 'admin'], default: 'admin' },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: 'admins' }
);

export const Admin = mongoose.models.Admin || mongoose.model<IAdmin>('Admin', AdminSchema);
