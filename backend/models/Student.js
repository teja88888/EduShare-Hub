import { db } from '../config/db.js';

export class Student {
  static async create(studentData) {
    return db.students.create({
      name: studentData.name.trim(),
      college: studentData.college.trim(),
      rollNumber: studentData.rollNumber ? studentData.rollNumber.trim() : '',
      email: studentData.email.toLowerCase().trim(),
      passwordHash: studentData.passwordHash,
      department: studentData.department ? studentData.department.trim() : 'General',
      createdAt: new Date().toISOString()
    });
  }

  static async findByEmail(email) {
    if (!email) return null;
    return db.students.findOne({ email: email.toLowerCase().trim() });
  }

  static async findById(id) {
    if (!id) return null;
    return db.students.findById(id);
  }

  static async updateProfile(id, updates) {
    const allowed = {};
    if (updates.name) allowed.name = updates.name.trim();
    if (updates.department) allowed.department = updates.department.trim();
    if (updates.rollNumber) allowed.rollNumber = updates.rollNumber.trim();
    if (updates.college) allowed.college = updates.college.trim();
    if (updates.passwordHash) allowed.passwordHash = updates.passwordHash;

    return db.students.findByIdAndUpdate(id, allowed);
  }

  static async count() {
    return db.students.count();
  }

  // To safe client representation (strip password hash)
  static toSafeJSON(student) {
    if (!student) return null;
    const { passwordHash, ...safe } = student;
    return safe;
  }
}
