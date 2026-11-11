import { db } from '../config/db.js';

export class Material {
  static async create(materialData) {
    return db.materials.create({
      title: materialData.title.trim(),
      subject: materialData.subject.trim(),
      semester: materialData.semester.trim(),
      department: materialData.department.trim(),
      collegeName: materialData.collegeName.trim(),
      filePath: materialData.filePath,
      fileName: materialData.fileName,
      originalFileName: materialData.originalFileName,
      fileSize: materialData.fileSize || 0,
      uploadedBy: materialData.uploadedBy, // strictly private internal reference
      isDemo: materialData.isDemo || false,
      downloads: 0,
      uploadDate: new Date().toISOString()
    });
  }

  static async find(filter = {}, options = {}) {
    return db.materials.find(filter, options);
  }

  static async findById(id) {
    return db.materials.findById(id);
  }

  static async incrementDownload(id) {
    const mat = db.materials.findById(id);
    if (mat) {
      db.materials.findByIdAndUpdate(id, { downloads: (mat.downloads || 0) + 1 });
    }
    return mat;
  }

  static async deleteByIdAndOwner(id, studentId) {
    // Only delete if belongs to this student
    const mat = db.materials.findById(id);
    if (!mat) return { success: false, reason: 'not_found' };
    if (mat.uploadedBy !== studentId) {
      return { success: false, reason: 'unauthorized' };
    }
    const deleted = db.materials.deleteOne({ _id: id, uploadedBy: studentId });
    return { success: deleted, material: mat };
  }

  static async count(filter = {}) {
    return db.materials.count(filter);
  }

  static async distinct(field) {
    return db.materials.distinct(field);
  }

  /**
   * CRITICAL PRIVACY REQUIREMENT:
   * Public material representations MUST NEVER include student identity,
   * uploader name, email, roll number, or internal uploadedBy identifier.
   * Only the collegeName is exposed.
   */
  static toPublicJSON(material) {
    if (!material) return null;
    return {
      _id: material._id,
      title: material.title,
      subject: material.subject,
      semester: material.semester,
      department: material.department,
      collegeName: material.collegeName,
      originalFileName: material.originalFileName,
      fileSize: material.fileSize,
      downloads: material.downloads || 0,
      uploadDate: material.uploadDate,
      isDemo: material.isDemo || false
    };
  }

  /**
   * For the student's own profile page, they can see their own uploads
   * and delete button.
   */
  static toOwnerJSON(material) {
    if (!material) return null;
    return {
      _id: material._id,
      title: material.title,
      subject: material.subject,
      semester: material.semester,
      department: material.department,
      collegeName: material.collegeName,
      originalFileName: material.originalFileName,
      fileSize: material.fileSize,
      downloads: material.downloads || 0,
      uploadDate: material.uploadDate,
      isOwner: true
    };
  }
}
